-- Directe berichten tussen collega's. Alleen afzender en ontvanger kunnen lezen (ook admins niet).
alter type notification_kind add value if not exists 'message';

create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists dm_recipient_unread_idx on direct_messages(recipient_id) where read_at is null;
create index if not exists dm_pair_idx on direct_messages(sender_id, recipient_id, created_at desc);
create index if not exists dm_pair_rev_idx on direct_messages(recipient_id, sender_id, created_at desc);

alter table direct_messages enable row level security;

drop policy if exists dm_select on direct_messages;
create policy dm_select on direct_messages for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));

drop policy if exists dm_insert on direct_messages;
create policy dm_insert on direct_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and org_id = my_org_id()
    and exists (select 1 from profiles p where p.id = recipient_id and p.org_id = my_org_id())
  );
-- Geen update/delete-policies: gelezen-status loopt via mark_dm_read().

create or replace function mark_dm_read(p_other uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  update direct_messages set read_at = now()
   where recipient_id = auth.uid() and sender_id = p_other and read_at is null;
  update notifications set read_at = now()
   where recipient_id = auth.uid() and dedupe_key = 'dm:' || p_other::text and read_at is null;
end $$;
revoke execute on function mark_dm_read(uuid) from public, anon;
grant execute on function mark_dm_read(uuid) to authenticated;

-- Eén melding per afzender: een nieuw bericht ververst de bestaande melding.
create or replace function dm_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare sender_name text;
begin
  select full_name into sender_name from profiles where id = new.sender_id;
  insert into notifications (org_id, recipient_id, actor_id, kind, title, body, href, dedupe_key)
  values (new.org_id, new.recipient_id, new.sender_id, 'message',
          coalesce(nullif(sender_name, ''), 'Een collega') || ' stuurde je een bericht',
          left(new.body, 140), '/messages/' || new.sender_id::text, 'dm:' || new.sender_id::text)
  on conflict (recipient_id, dedupe_key) where dedupe_key is not null
  do update set title = excluded.title, body = excluded.body, actor_id = excluded.actor_id,
                created_at = now(), read_at = null;
  return new;
end $$;
revoke execute on function dm_after_insert() from public, anon, authenticated;

drop trigger if exists dm_after_insert_trg on direct_messages;
create trigger dm_after_insert_trg after insert on direct_messages
  for each row execute function dm_after_insert();

alter publication supabase_realtime add table direct_messages;
