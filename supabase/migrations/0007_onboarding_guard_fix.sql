-- 0007: onboarding-RPC's mogen de rolguard passeren (organisatie aanmaken / uitnodiging accepteren).
create or replace function create_organization(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  oid uuid; s text;
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  if (select org_id from profiles where id = auth.uid()) is not null then
    raise exception 'Je zit al in een organisatie';
  end if;
  s := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 6);
  insert into organizations (name, slug) values (p_name, s) returning id into oid;
  perform set_config('orbit.bypass_guard', 'on', true);
  update profiles set org_id = oid, role = 'owner' where id = auth.uid();
  return oid;
end $$;

create or replace function accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv invitations; p profiles;
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  select * into inv from invitations where token = p_token;
  if inv.id is null then raise exception 'Uitnodiging niet gevonden'; end if;
  if inv.accepted_at is not null then raise exception 'Uitnodiging is al gebruikt'; end if;
  if inv.expires_at < now() then raise exception 'Uitnodiging is verlopen'; end if;
  select * into p from profiles where id = auth.uid();
  if p.org_id is not null and p.org_id <> inv.org_id then raise exception 'Je zit al in een andere organisatie'; end if;
  perform set_config('orbit.bypass_guard', 'on', true);
  update profiles set org_id = inv.org_id, role = inv.role where id = auth.uid();
  update invitations set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  return inv.org_id;
end $$;

revoke execute on function create_organization(text), accept_invitation(text) from public, anon;
