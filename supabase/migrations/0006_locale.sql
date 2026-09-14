-- 0006: taalvoorkeur per profiel (nl | en).
alter table profiles add column if not exists locale text not null default 'nl' check (locale in ('nl', 'en'));
