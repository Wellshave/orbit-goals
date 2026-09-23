-- Een check-in moet je kunnen terugdraaien: eigen check-ins verwijderbaar, met punten en stand die meelopen.
drop policy if exists kc_delete on kpi_checkins;
create policy kc_delete on kpi_checkins for delete to authenticated
  using (profile_id = (select auth.uid()));

create or replace function kpi_checkins_after_delete() returns trigger
language plpgsql security definer set search_path = public as $$
declare k kpis; latest_start date; v numeric;
begin
  -- Punten en het tijdlijn-item horen bij de verwijderde check-in en verdwijnen mee.
  delete from contributions where ref_table = 'kpi_checkins' and ref_id = old.id;
  delete from activity_events
   where kpi_id = old.kpi_id and kind = 'kpi_checkin' and actor_id = old.profile_id
     and payload->>'period_start' = old.period_start::text;

  select * into k from kpis where id = old.kpi_id;
  if k.id is null then return old; end if;
  select max(period_start) into latest_start from kpi_checkins where kpi_id = k.id;
  if latest_start is null then
    update kpis set current_value = null, status = 'not_started' where id = k.id;
  else
    select case when k.scope = 'personal' then max(value) else sum(value) end into v
      from kpi_checkins where kpi_id = k.id and period_start = latest_start;
    update kpis set current_value = v, status = kpi_status_for(k, v) where id = k.id;
  end if;
  return old;
end $$;
revoke execute on function kpi_checkins_after_delete() from public, anon, authenticated;

drop trigger if exists kpi_checkins_after_delete on kpi_checkins;
create trigger kpi_checkins_after_delete after delete on kpi_checkins
  for each row execute function kpi_checkins_after_delete();
