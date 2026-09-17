-- Orbit demo-seed. Realistische Nederlandse inhoud voor Wellshave.
-- Alle demo-accounts loggen in met wachtwoord: Orbit2026!
-- Idempotent genoeg om één keer te draaien op een lege database.

-- ---------------------------------------------------------------------------
-- Auth-gebruikers (rechtstreeks in auth.users; de trigger maakt profielen aan)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  crypt('Orbit2026!', gen_salt('bf')), now() - interval '120 days',
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', full_name),
  now() - interval '120 days', now() - interval '120 days',
  '', '', '', '', '', '', '', ''
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'dustin@orbit-demo.nl',   'Dustin Gibson'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'willem@orbit-demo.nl',   'Willem de Groot'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'jhelarie@orbit-demo.nl', 'Jhelarie Gandia'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'lex@orbit-demo.nl',      'Lex van Dissel'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'jeremy@orbit-demo.nl',   'Jeremy Rosadio'),
  ('a0000000-0000-4000-8000-000000000006'::uuid, 'napoleon@orbit-demo.nl', 'Napoleon-Andrei Combei'),
  ('a0000000-0000-4000-8000-000000000007'::uuid, 'kevin@orbit-demo.nl',    'Kevin Gaviola'),
  ('a0000000-0000-4000-8000-000000000008'::uuid, 'song@orbit-demo.nl',     'Song Zou')
) as u(id, email, full_name)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now() - interval '1 day', now() - interval '120 days', now() - interval '120 days'
from auth.users u
where u.email like '%@orbit-demo.nl'
  and not exists (select 1 from auth.identities i where i.user_id = u.id);

-- ---------------------------------------------------------------------------
-- Organisatie, profielen, teams
-- ---------------------------------------------------------------------------
insert into organizations (id, name, slug, product_name)
values ('b0000000-0000-4000-8000-000000000001', 'Wellshave', 'wellshave', 'Orbit')
on conflict (id) do nothing;

update profiles set org_id = 'b0000000-0000-4000-8000-000000000001', onboarded = true,
  role = v.role::org_role, job_title = v.job, full_name = v.name
from (values
  ('a0000000-0000-4000-8000-000000000001', 'owner',  'Founder & CEO',                'Dustin Gibson'),
  ('a0000000-0000-4000-8000-000000000002', 'admin',  'Operations Lead',              'Willem de Groot'),
  ('a0000000-0000-4000-8000-000000000003', 'member', 'Social Content Creator',       'Jhelarie Gandia'),
  ('a0000000-0000-4000-8000-000000000004', 'member', 'Bol.com Ads Specialist',       'Lex van Dissel'),
  ('a0000000-0000-4000-8000-000000000005', 'member', 'Influencer Manager & Editor',  'Jeremy Rosadio'),
  ('a0000000-0000-4000-8000-000000000006', 'member', 'Media Buyer (Meta & TikTok)',  'Napoleon-Andrei Combei'),
  ('a0000000-0000-4000-8000-000000000007', 'member', 'Shopify Operator',             'Kevin Gaviola'),
  ('a0000000-0000-4000-8000-000000000008', 'member', 'Creative Strategist',          'Song Zou')
) as v(id, role, job, name)
where profiles.id = v.id::uuid;

update profiles set started_at = v.since::date, focus = v.focus
from (values
  ('a0000000-0000-4000-8000-000000000001', '2019-03-01', 'Strategie, productontwikkeling en groei van het merk.'),
  ('a0000000-0000-4000-8000-000000000002', '2021-09-01', 'Klantenservice, logistiek en bol.com-operatie.'),
  ('a0000000-0000-4000-8000-000000000003', '2024-02-01', 'Social content, shorts en community.'),
  ('a0000000-0000-4000-8000-000000000004', '2023-05-01', 'Bol.com-advertenties, TACoS en listingkwaliteit.'),
  ('a0000000-0000-4000-8000-000000000005', '2023-11-01', 'Creators, UGC-productie en video-edits.'),
  ('a0000000-0000-4000-8000-000000000006', '2024-06-01', 'Meta- en TikTok-campagnes, testcellen en ROAS.'),
  ('a0000000-0000-4000-8000-000000000007', '2022-08-01', 'Shopify, e-mailflows en orderafhandeling.'),
  ('a0000000-0000-4000-8000-000000000008', '2024-01-01', 'Creatieve concepten, hooks en ad-scripts.')
) as v(id, since, focus)
where profiles.id = v.id::uuid;

insert into teams (id, org_id, name, description, color, created_by) values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Marketing', 'Content, creators, paid social en merkgroei.', '#9B72F2', 'a0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Sales & Marketplaces', 'Shopify, bol.com en omzetgroei.', '#5B6CFF', 'a0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Operations', 'Klantenservice, logistiek en kwaliteit.', '#FF7B6B', 'a0000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into team_memberships (team_id, profile_id, is_lead) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000008', true),
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', false),
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005', false),
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000006', false),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', true),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004', false),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000007', false),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', true),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000007', false)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Doelen
-- ---------------------------------------------------------------------------
-- Company: €3.000.000 jaaromzet
insert into goals (id, org_id, title, description, goal_type, owner_id, team_id, start_date, deadline, measure, unit, start_value, target_value, current_value, frequency, visibility, category, is_featured, created_by, created_at)
values ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
  '€3.000.000 jaaromzet in 2026',
  'Totale netto-omzet over alle kanalen (Shopify, bol.com, Amazon). Gemeten cumulatief per maand op basis van de boekhouding.',
  'company', 'a0000000-0000-4000-8000-000000000001', null,
  date_trunc('year', current_date)::date, (date_trunc('year', current_date) + interval '1 year - 1 day')::date,
  'numeric', '€', 0, 3000000, 0, 'monthly', 'company', 'Omzet', true,
  'a0000000-0000-4000-8000-000000000001', date_trunc('year', current_date));

insert into milestones (id, goal_id, name, description, target_value, target_date, is_ultimate, sort_order) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Eerste miljoen', 'Eerste €1.000.000 omzet van het jaar.', 1000000, (date_trunc('year', current_date) + interval '4 months')::date, false, 1),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Twee miljoen', 'Halverwege het jaar op koers.', 2000000, (date_trunc('year', current_date) + interval '8 months')::date, false, 2),
  ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'Tweeënhalf miljoen', 'Het Q4-startsein.', 2500000, (date_trunc('year', current_date) + interval '10 months')::date, false, 3),
  ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'Drie miljoen', 'Ultimate goal: €3.000.000.', 3000000, (date_trunc('year', current_date) + interval '1 year - 1 day')::date, true, 4);

insert into rewards (milestone_id, title, kind, description, granted_at) values
  ('e0000000-0000-4000-8000-000000000001', 'Teamdiner in Utrecht', 'dinner', 'Dinner met het hele team, drankjes inbegrepen.', now() - interval '130 days'),
  ('e0000000-0000-4000-8000-000000000002', 'Extra vrije dag voor iedereen', 'day_off', 'Een vrije dag naar keuze in Q4.', null),
  ('e0000000-0000-4000-8000-000000000003', 'Teamuitje: karten + BBQ', 'team_outing', 'Middag karten en aansluitend barbecue.', null),
  ('e0000000-0000-4000-8000-000000000004', 'Winterweekend Ardennen + bonus', 'bonus', 'Teamweekend in de Ardennen en een jaarbonus voor iedereen.', null);

insert into goal_assignments (goal_id, profile_id, is_responsible) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', true),
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', true),
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000007', true),
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000006', false);

-- Cumulatieve maandomzet (historie). Eerste miljoen in april, twee miljoen in augustus.
insert into goal_updates (goal_id, profile_id, previous_value, new_value, note, created_at)
select 'd0000000-0000-4000-8000-000000000001', p::uuid, prev, val, note,
       (date_trunc('year', current_date) + make_interval(months => m, days => dd))::timestamptz + interval '3 days 10 hours'
from (values
  (1, 0, 'a0000000-0000-4000-8000-000000000002', 0,       262000,  'Januari afgesloten. Sterke start dankzij de nieuwjaarsactie.'),
  (2, 0, 'a0000000-0000-4000-8000-000000000002', 262000,  541000,  'Februari: Valentijnsbundels deden het goed, bol.com groeit.'),
  (3, 0, 'a0000000-0000-4000-8000-000000000004', 541000,  838000,  'Maart: bol.com boven de €40k, Shopify stabiel.'),
  (4, 0, 'a0000000-0000-4000-8000-000000000002', 838000,  1104000, 'April: eerste miljoen gepasseerd. Dinner geregeld!'),
  (5, 0, 'a0000000-0000-4000-8000-000000000007', 1104000, 1358000, 'Mei: Moederdag-campagne boven verwachting.'),
  (6, 0, 'a0000000-0000-4000-8000-000000000002', 1358000, 1631000, 'Juni: Vaderdag was het sterkste weekend van het jaar.'),
  (7, 0, 'a0000000-0000-4000-8000-000000000004', 1631000, 1867000, 'Juli: zomerdip op Shopify, bol.com compenseert.'),
  (8, 0, 'a0000000-0000-4000-8000-000000000002', 1867000, 2074000, 'Augustus: twee miljoen! Back-to-work-bundels liepen goed.'),
  (9, -21, 'a0000000-0000-4000-8000-000000000007', 2074000, 2183000, 'Eerste helft september: vroege verkoop Wellshine pre-orders.')
) as v(m, dd, p, prev, val, note)
where (date_trunc('year', current_date) + make_interval(months => m, days => dd) + interval '3 days 10 hours') <= now();

-- Company: herhaalaankopen
insert into goals (id, org_id, title, description, goal_type, owner_id, start_date, deadline, measure, unit, start_value, target_value, current_value, frequency, visibility, category, created_by, created_at)
values ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001',
  'Herhaalaankooppercentage naar 32%',
  'Aandeel klanten dat binnen 12 maanden een tweede bestelling plaatst. Bron: Shopify + Klaviyo cohortrapport.',
  'company', 'a0000000-0000-4000-8000-000000000002',
  date_trunc('year', current_date)::date, (date_trunc('year', current_date) + interval '1 year - 1 day')::date,
  'numeric', '%', 24, 32, 24, 'monthly', 'company', 'Retentie', 'a0000000-0000-4000-8000-000000000001', date_trunc('year', current_date));
insert into milestones (goal_id, name, description, target_value, target_date, is_ultimate, sort_order) values
  ('d0000000-0000-4000-8000-000000000002', '28%', 'Eerste stap via e-mailflows.', 28, (date_trunc('year', current_date) + interval '6 months')::date, false, 1),
  ('d0000000-0000-4000-8000-000000000002', '32%', 'Ultimate goal.', 32, (date_trunc('year', current_date) + interval '1 year - 1 day')::date, true, 2);
insert into goal_assignments (goal_id, profile_id, is_responsible) values
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000007', true);
insert into goal_updates (goal_id, profile_id, previous_value, new_value, note, created_at) values
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 24, 25.5, 'Q1-cohort: welkomstflow verhoogd naar 3 mails.', now() - interval '150 days'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000007', 25.5, 26.8, 'Replenishment-flow voor scheermesjes live.', now() - interval '80 days'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000007', 26.8, 27.1, 'Augustus-cohort licht omhoog, nog niet op tempo.', now() - interval '12 days');

-- Company binair: productlancering
insert into goals (id, org_id, title, description, goal_type, owner_id, start_date, deadline, measure, visibility, category, created_by, created_at)
values ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001',
  'Wellshine haardroger WS-HD1 lanceren',
  'Volledige lancering: productpagina live, voorraad in NL, eerste 50 reviews, campagne actief.',
  'company', 'a0000000-0000-4000-8000-000000000001',
  current_date - 60, current_date + 62, 'binary', 'company', 'Product', 'a0000000-0000-4000-8000-000000000001', now() - interval '60 days');
insert into goal_assignments (goal_id, profile_id, is_responsible) values
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', true),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000008', true);

-- Team Marketing: UGC-video's Q3
insert into goals (id, org_id, title, description, goal_type, owner_id, team_id, start_date, deadline, measure, unit, start_value, target_value, current_value, frequency, visibility, category, created_by, created_at)
values ('d0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001',
  '120 UGC-video''s geleverd in Q3',
  'Bruikbare UGC-video''s van creators en eigen productie, klaar voor Meta en TikTok.',
  'team', 'a0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000001',
  (date_trunc('quarter', current_date))::date, (date_trunc('quarter', current_date) + interval '3 months - 1 day')::date,
  'numeric', 'video''s', 0, 120, 0, 'weekly', 'team', 'Content', 'a0000000-0000-4000-8000-000000000002', date_trunc('quarter', current_date));
insert into milestones (goal_id, name, description, target_value, target_date, is_ultimate, sort_order) values
  ('d0000000-0000-4000-8000-000000000004', '40 video''s', 'Eerste maand van het kwartaal.', 40, (date_trunc('quarter', current_date) + interval '1 month')::date, false, 1),
  ('d0000000-0000-4000-8000-000000000004', '80 video''s', 'Tweede maand.', 80, (date_trunc('quarter', current_date) + interval '2 months')::date, false, 2),
  ('d0000000-0000-4000-8000-000000000004', '120 video''s', 'Ultimate goal voor Q3.', 120, (date_trunc('quarter', current_date) + interval '3 months - 1 day')::date, true, 3);
insert into rewards (milestone_id, title, kind, description) 
select id, 'Marketing-lunch bij de Italiaan', 'dinner', 'Lunch met het marketingteam.' from milestones where goal_id = 'd0000000-0000-4000-8000-000000000004' and sort_order = 2;
insert into rewards (milestone_id, title, kind, description)
select id, 'Creatorbudget +€500 p.p.', 'bonus', 'Extra creatorbudget voor het team in Q4.' from milestones where goal_id = 'd0000000-0000-4000-8000-000000000004' and is_ultimate;
insert into goal_assignments (goal_id, profile_id, is_responsible) values
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003', true),
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000005', true),
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000006', false);
insert into goal_updates (goal_id, profile_id, previous_value, new_value, note, created_at)
select 'd0000000-0000-4000-8000-000000000004', p::uuid, prev, val, note, (date_trunc('quarter', current_date) + make_interval(days => d))::timestamptz + interval '17 hours'
from (values
  (7,  'a0000000-0000-4000-8000-000000000003', 0,  9,  'Eerste week: 9 video''s van de zomershoot.'),
  (14, 'a0000000-0000-4000-8000-000000000005', 9,  21, '12 creatorvideo''s binnen, 3 afgekeurd op licht.'),
  (21, 'a0000000-0000-4000-8000-000000000003', 21, 32, 'Studio-dag geleverd.'),
  (30, 'a0000000-0000-4000-8000-000000000008', 32, 44, 'Eerste milestone gehaald, 4 dagen later dan gepland.'),
  (44, 'a0000000-0000-4000-8000-000000000005', 44, 61, 'Batch van 5 nieuwe creators.'),
  (58, 'a0000000-0000-4000-8000-000000000003', 61, 79, 'Net onder de 80.'),
  (63, 'a0000000-0000-4000-8000-000000000008', 79, 84, 'Tweede milestone binnen.'),
  (72, 'a0000000-0000-4000-8000-000000000005', 84, 98, 'Wellshine-teasers meegeteld.')
) as v(d, p, prev, val, note)
where (date_trunc('quarter', current_date) + make_interval(days => d)) <= now();

-- Team Sales: bol.com maandomzet
insert into goals (id, org_id, title, description, goal_type, owner_id, team_id, start_date, deadline, measure, unit, start_value, target_value, current_value, frequency, visibility, category, created_by, created_at)
values ('d0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001',
  'Bol.com maandomzet naar €45.000',
  'Maandelijkse netto-omzet via bol.com (excl. retouren). Gemeten op de laatste dag van de maand.',
  'team', 'a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002',
  (date_trunc('year', current_date) + interval '6 months')::date, (date_trunc('year', current_date) + interval '1 year - 1 day')::date,
  'numeric', '€', 28000, 45000, 28000, 'monthly', 'team', 'Omzet', 'a0000000-0000-4000-8000-000000000002', now() - interval '75 days');
insert into milestones (goal_id, name, description, target_value, target_date, is_ultimate, sort_order) values
  ('d0000000-0000-4000-8000-000000000005', '€35.000', 'Eerste sprong via nieuwe listings.', 35000, (date_trunc('year', current_date) + interval '9 months')::date, false, 1),
  ('d0000000-0000-4000-8000-000000000005', '€45.000', 'Ultimate goal.', 45000, (date_trunc('year', current_date) + interval '1 year - 1 day')::date, true, 2);
insert into goal_assignments (goal_id, profile_id, is_responsible) values
  ('d0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000004', true),
  ('d0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000007', false);
insert into goal_updates (goal_id, profile_id, previous_value, new_value, note, created_at) values
  ('d0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000004', 28000, 30100, 'Juli: nieuwe A+ content op de Flex Guard-listing.', now() - interval '45 days'),
  ('d0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000004', 30100, 33500, 'Augustus: ads-budget verschoven naar bestsellers.', now() - interval '14 days');

-- Team Operations: klanttevredenheid
insert into goals (id, org_id, title, description, goal_type, owner_id, team_id, start_date, deadline, measure, unit, start_value, target_value, current_value, frequency, visibility, category, created_by, created_at)
values ('d0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001',
  'Klanttevredenheid naar 90%',
  'Percentage klanten dat de service met 4 of 5 sterren beoordeelt (Trustpilot + eigen enquête).',
  'team', 'a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000003',
  date_trunc('year', current_date)::date, (date_trunc('year', current_date) + interval '1 year - 1 day')::date,
  'numeric', '%', 82, 90, 82, 'monthly', 'company', 'Service', 'a0000000-0000-4000-8000-000000000001', date_trunc('year', current_date));
insert into milestones (goal_id, name, description, target_value, target_date, is_ultimate, sort_order) values
  ('d0000000-0000-4000-8000-000000000006', '86%', 'Reactietijd onder 4 uur.', 86, (date_trunc('year', current_date) + interval '6 months')::date, false, 1),
  ('d0000000-0000-4000-8000-000000000006', '90%', 'Ultimate goal.', 90, (date_trunc('year', current_date) + interval '1 year - 1 day')::date, true, 2);
insert into rewards (milestone_id, title, kind, description, granted_at)
select id, 'Escape room met Operations', 'team_outing', 'Middag escape room.', now() - interval '40 days' from milestones where goal_id = 'd0000000-0000-4000-8000-000000000006' and sort_order = 1;
insert into goal_assignments (goal_id, profile_id, is_responsible) values
  ('d0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000007', true);
insert into goal_updates (goal_id, profile_id, previous_value, new_value, note, created_at) values
  ('d0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002', 82, 84, 'Q1: garantieformulier vernieuwd.', now() - interval '170 days'),
  ('d0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000007', 84, 86.4, 'Juni: reactietijd nu gemiddeld 3,2 uur.', now() - interval '80 days'),
  ('d0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000007', 86.4, 86, 'Augustus: iets terug door leveringsvertraging bij PostNL.', now() - interval '10 days');

-- Persoonlijk (teamzichtbaar): Lex TACoS
insert into goals (id, org_id, title, description, goal_type, owner_id, team_id, start_date, deadline, measure, unit, start_value, target_value, current_value, frequency, visibility, category, parent_goal_id, created_by, created_at)
values ('d0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001',
  'TACoS bol.com onder 12%',
  'Totale advertentiekosten als percentage van de totale bol.com-omzet. Lager is beter.',
  'personal', 'a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002',
  (date_trunc('year', current_date) + interval '6 months')::date, (date_trunc('year', current_date) + interval '1 year - 1 day')::date,
  'numeric', '%', 18, 12, 18, 'weekly', 'team', 'Advertising', 'd0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000004', now() - interval '75 days');
insert into milestones (goal_id, name, description, target_value, target_date, is_ultimate, sort_order) values
  ('d0000000-0000-4000-8000-000000000007', '15%', 'Slechte zoektermen uitgesloten.', 15, (date_trunc('year', current_date) + interval '9 months')::date, false, 1),
  ('d0000000-0000-4000-8000-000000000007', '12%', 'Ultimate goal.', 12, (date_trunc('year', current_date) + interval '1 year - 1 day')::date, true, 2);
insert into goal_updates (goal_id, profile_id, previous_value, new_value, note, created_at) values
  ('d0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000004', 18, 16.9, 'Negatieve zoektermen toegevoegd.', now() - interval '40 days'),
  ('d0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000004', 16.9, 15.5, 'Biedingen verlaagd op merkloze termen.', now() - interval '9 days');

-- Persoonlijk (teamzichtbaar): Jeremy influencers, loopt achter
insert into goals (id, org_id, title, description, goal_type, owner_id, team_id, start_date, deadline, measure, unit, start_value, target_value, current_value, frequency, visibility, category, parent_goal_id, created_by, created_at)
values ('d0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000001',
  '25 actieve influencers',
  'Creators die minimaal één keer per maand content leveren.',
  'personal', 'a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001',
  (date_trunc('year', current_date) + interval '3 months')::date, (date_trunc('year', current_date) + interval '9 months - 1 day')::date,
  'numeric', 'creators', 9, 25, 9, 'weekly', 'team', 'Influencers', 'd0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000005', now() - interval '160 days');
insert into goal_updates (goal_id, profile_id, previous_value, new_value, note, created_at) values
  ('d0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000005', 9, 11, 'Twee nieuwe uit de outreach van april.', now() - interval '120 days'),
  ('d0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000005', 11, 13, 'Twee micro-creators erbij, drie afgehaakt na de zomer.', now() - interval '20 days');

-- Persoonlijk privé: Dustin leessessies (alleen zichtbaar voor Dustin)
insert into goals (id, org_id, title, description, goal_type, owner_id, start_date, deadline, measure, unit, start_value, target_value, current_value, frequency, visibility, category, created_by, created_at)
values ('d0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000001',
  'Tien leessessies per week',
  'Minimaal 25 minuten lezen per sessie. Boek van deze week: "Alchemy" van Rory Sutherland.',
  'personal', 'a0000000-0000-4000-8000-000000000001',
  date_trunc('week', current_date)::date, (date_trunc('week', current_date) + interval '6 days')::date,
  'numeric', 'sessies', 0, 10, 0, 'daily', 'private', 'Persoonlijk', 'a0000000-0000-4000-8000-000000000001', date_trunc('week', current_date));
insert into goal_updates (goal_id, profile_id, previous_value, new_value, note, created_at) values
  ('d0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 0, 2, 'Maandagochtend en -avond.', date_trunc('week', current_date) + interval '21 hours'),
  ('d0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 2, 4, 'Twee sessies in de trein.', greatest(date_trunc('week', current_date) + interval '21 hours', now() - interval '1 hour'));

-- Persoonlijk gedeeld: Willem statusupdates, gedeeld met Dustin
insert into goals (id, org_id, title, description, goal_type, owner_id, start_date, deadline, measure, unit, start_value, target_value, current_value, frequency, visibility, category, created_by, created_at)
values ('d0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000001',
  '12 vrijdagse statusupdates op rij',
  'Elke vrijdag vóór 16:00 een korte statusupdate in Slack voor het hele team.',
  'personal', 'a0000000-0000-4000-8000-000000000002',
  current_date - 63, current_date + 21, 'numeric', 'updates', 0, 12, 0, 'weekly', 'shared', 'Discipline', 'a0000000-0000-4000-8000-000000000002', now() - interval '63 days');
insert into goal_shares (goal_id, profile_id, can_edit) values ('d0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', false);
insert into goal_updates (goal_id, profile_id, previous_value, new_value, note, created_at)
select 'd0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000002', n - 1, n, 'Statusupdate week ' || n || ' verstuurd.', now() - make_interval(days => (9 - n) * 7 + 3)
from generate_series(1, 9) as n;

-- Persoonlijk (teamzichtbaar): Jhelarie posts live per week
insert into goals (id, org_id, title, description, goal_type, owner_id, team_id, start_date, deadline, measure, unit, start_value, target_value, current_value, frequency, visibility, category, parent_goal_id, created_by, created_at)
values ('d0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001',
  '90 posts live in Q3',
  'Instagram + TikTok posts die daadwerkelijk gepubliceerd zijn.',
  'personal', 'a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001',
  (date_trunc('quarter', current_date))::date, (date_trunc('quarter', current_date) + interval '3 months - 1 day')::date,
  'numeric', 'posts', 0, 90, 0, 'weekly', 'team', 'Content', 'd0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003', date_trunc('quarter', current_date));
insert into goal_updates (goal_id, profile_id, previous_value, new_value, note, created_at)
select 'd0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000003', prev, val, '', (date_trunc('quarter', current_date) + make_interval(days => d))::timestamptz + interval '18 hours'
from (values (7, 0, 8), (14, 8, 15), (21, 15, 22), (28, 22, 30), (35, 30, 37), (42, 37, 45), (49, 45, 52), (56, 52, 58), (63, 58, 66), (70, 66, 72)) as v(d, prev, val)
where (date_trunc('quarter', current_date) + make_interval(days => d)) <= now();

-- ---------------------------------------------------------------------------
-- KPI's (wekelijkse sales, maandelijkse marketing) + check-ins
-- ---------------------------------------------------------------------------
insert into kpis (id, org_id, name, description, category, scope, owner_id, team_id, frequency, direction, target_value, unit, period_start, source_note, created_by) values
  ('f0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Bol.com omzet per week', 'Netto-omzet via bol.com per ISO-week.', 'Sales', 'personal', 'a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'weekly', 'higher_better', 10000, '€', current_date - 70, 'Bol.com Verkoopdashboard, elke maandagochtend.', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Shopify-bestellingen per week', 'Aantal betaalde orders in Shopify.', 'Sales', 'personal', 'a0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000002', 'weekly', 'higher_better', 350, 'orders', current_date - 70, 'Shopify Analytics.', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Gemiddelde orderwaarde', 'AOV in Shopify, incl. btw.', 'Sales', 'personal', 'a0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000002', 'weekly', 'higher_better', 60, '€', current_date - 70, 'Shopify Analytics.', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'Dagelijkse campagnecheck', 'Aantal werkdagen waarop alle bol.com-campagnes gecontroleerd zijn.', 'Sales', 'personal', 'a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'weekly', 'higher_better', 5, 'dagen', current_date - 70, '', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'Influencer-outreaches', 'Aantal verstuurde outreach-berichten aan creators.', 'Marketing', 'personal', 'a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', 'weekly', 'higher_better', 20, 'berichten', current_date - 70, 'Outreach-sheet.', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', 'Video-edits geleverd', 'Afgeronde edits die klaar zijn voor publicatie.', 'Marketing', 'personal', 'a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', 'weekly', 'higher_better', 5, 'edits', current_date - 70, '', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'Content geleverd', 'Aantal contentstukken (foto/video) opgeleverd aan het team.', 'Marketing', 'personal', 'a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'weekly', 'higher_better', 10, 'stuks', current_date - 70, '', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000001', 'Posts live', 'Gepubliceerde posts op Instagram en TikTok.', 'Marketing', 'personal', 'a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'weekly', 'higher_better', 7, 'posts', current_date - 70, '', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000001', 'TikTok 7-daagse ROAS', 'Return on ad spend over de laatste 7 dagen.', 'Marketing', 'personal', 'a0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001', 'weekly', 'higher_better', 4, 'x', current_date - 70, 'TikTok Ads Manager.', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000001', 'Meta ROAS (maand)', 'Blended ROAS over alle Meta-campagnes.', 'Marketing', 'personal', 'a0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001', 'monthly', 'higher_better', 3, 'x', current_date - 180, 'Meta Ads Manager.', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'Nieuwe creators geboekt', 'Creators met een getekende samenwerking.', 'Marketing', 'personal', 'a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', 'monthly', 'higher_better', 8, 'creators', current_date - 180, '', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000001', 'E-mailaandeel in omzet', 'Percentage van de Shopify-omzet dat uit Klaviyo-flows en -campagnes komt.', 'Marketing', 'personal', 'a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'monthly', 'higher_better', 25, '%', current_date - 180, 'Klaviyo.', 'a0000000-0000-4000-8000-000000000001'),
  ('f0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000001', 'Creatieve concepten opgeleverd', 'Nieuwe advertentieconcepten (statisch + video) per maand.', 'Marketing', 'personal', 'a0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000001', 'monthly', 'higher_better', 12, 'concepten', current_date - 60, '', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000001', 'Reactietijd klantenservice', 'Gemiddelde eerste reactietijd in uren. Lager is beter.', 'Service', 'team', 'a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000003', 'weekly', 'lower_better', 4, 'uur', current_date - 70, 'Helpdesk-rapport.', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000001', 'Nieuwe reviews (alle kanalen)', 'Nieuwe productreviews op Shopify, bol.com en Trustpilot.', 'Service', 'company', 'a0000000-0000-4000-8000-000000000002', null, 'monthly', 'higher_better', 120, 'reviews', current_date - 180, 'Judge.me + bol.com + Trustpilot.', 'a0000000-0000-4000-8000-000000000001');

insert into kpi_assignments (kpi_id, profile_id, assigned_by) values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001'),
  ('f0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001');

-- Wekelijkse check-ins: laatste 8 afgesloten weken (k = weken geleden). Ingecheckt op maandag erna, 09:00.
create temp table seed_weekly (kpi uuid, profile uuid, vals numeric[], notes text[]);
insert into seed_weekly values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', array[8400, 9100, 9800, 10250, 9600, 10900, 11400, 10150], array['Zomerdip','','','Actie op Flex Guard','','Nieuwe listing live','Beste week tot nu toe','']),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000007', array[310, 342, 355, 368, 331, 372, 389, 361], array['','','','','Checkout-bug op dinsdag','','','']),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000007', array[51.2, 52.8, 54.1, 55.0, 53.6, 57.2, 58.9, 57.5], array['','','Bundelkorting getest','','','Bundels standaard in cart','','']),
  ('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', array[4, 5, 4, 3, 5, 5, 5, 4], array['','','','Vakantie','','','','']),
  ('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000005', array[14, 17, 19, 12, 22, 21, 24, 18], array['','','','Ziek geweest','','','','']),
  ('f0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000005', array[3, 4, 5, 4, 5, 6, 5, 5], array['','','','','','','','']),
  ('f0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000003', array[7, 9, 10, 8, 11, 10, 12, 10], array['','','','','','','','']),
  ('f0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000003', array[4, 6, 7, 5, 7, 8, 7, 7], array['','','','','','','','']),
  ('f0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000006', array[2.1, 3.0, 4.2, 4.0, 3.4, 4.6, 4.8, 4.1], array['Nieuwe creatives in learning','','','','Creative fatigue','Wellshine-teaser knalt','','']),
  ('f0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000007', array[6.2, 5.1, 4.4, 3.8, 3.5, 3.9, 3.2, 3.6], array['','','','','','','','']);

insert into kpi_checkins (kpi_id, profile_id, period_start, period_end, value, note, created_at)
select s.kpi, s.profile, w.ws, w.ws + 6, s.vals[9 - k], s.notes[9 - k],
       (w.ws + 7)::timestamp + interval '9 hours' + (case when k = 5 then interval '3 days' else interval '0' end)
from seed_weekly s
cross join generate_series(1, 8) as k
cross join lateral (select (date_trunc('week', current_date)::date - k * 7) as ws) w
order by w.ws;

-- Maandelijkse check-ins: laatste 5 afgesloten maanden.
create temp table seed_monthly (kpi uuid, profile uuid, vals numeric[]);
insert into seed_monthly values
  ('f0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000006', array[2.4, 2.7, 3.1, 2.9, 3.3]),
  ('f0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000005', array[4, 6, 5, 7, 6]),
  ('f0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000002', array[19, 21, 22, 24, 26]),
  ('f0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000002', array[92, 104, 131, 118, 126]);
insert into kpi_checkins (kpi_id, profile_id, period_start, period_end, value, note, created_at)
select s.kpi, s.profile, m.ms, (m.ms + interval '1 month - 1 day')::date, s.vals[6 - k], '',
       (m.ms + interval '1 month 2 days 9 hours')
from seed_monthly s
cross join generate_series(1, 5) as k
cross join lateral (select (date_trunc('month', current_date) - make_interval(months => k))::date as ms) m
order by m.ms;
insert into kpi_checkins (kpi_id, profile_id, period_start, period_end, value, note, created_at) values
  ('f0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000008', (date_trunc('month', current_date) - interval '1 month')::date, (date_trunc('month', current_date) - interval '1 day')::date, 10, 'Eerste volledige maand.', date_trunc('month', current_date) + interval '1 day 9 hours');

drop table seed_weekly; drop table seed_monthly;

-- ---------------------------------------------------------------------------
-- Reacties, vermeldingen, reacties op reacties, erkenning
-- ---------------------------------------------------------------------------
insert into comments (id, org_id, goal_id, author_id, body, created_at) values
  ('10000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Twee miljoen binnen. Dank aan iedereen, en @Lex van Dissel: de bol.com-groei in augustus was precies wat we nodig hadden.', now() - interval '13 days'),
  ('10000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'Voor de €2,5M-milestone rekenen we op de Wellshine pre-orders in oktober. @Kevin Gaviola kun jij de pre-orderpagina vóór 1 oktober live hebben?', now() - interval '6 days'),
  ('10000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'We zitten onder tempo voor de €45k. @Lex van Dissel wat is je plan voor september?', now() - interval '5 days'),
  ('10000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000008', 'Nog 22 video''s te gaan voor het kwartaal. @Jhelarie Gandia en @Jeremy Rosadio: haalbaar voor 30 september?', now() - interval '2 days');

insert into comments (id, org_id, goal_id, parent_comment_id, author_id, body, created_at) values
  ('10000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000007', 'Ja, de pagina staat in concept. Ik verwacht 26 september live, dan hebben we marge.', now() - interval '5 days 20 hours'),
  ('10000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 'Twee dingen: A+ content voor de Trimmer Pro en 20% van het budget naar de bestseller-campagne. Ik verwacht €36k in september.', now() - interval '4 days 18 hours'),
  ('10000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003', 'Ik heb er 12 in de planning voor volgende week, dus ja.', now() - interval '1 day 22 hours');

insert into mentions (comment_id, profile_id) values
  ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004'),
  ('10000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000007'),
  ('10000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004'),
  ('10000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000005');

insert into reactions (comment_id, profile_id, kind) values
  ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'like'),
  ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'like'),
  ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000007', 'like'),
  ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'ack'),
  ('10000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002', 'ack'),
  ('10000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000008', 'like');

-- Erkenning door goal owner van de augustus-omzetupdate en de bol.com-update
insert into recognitions (goal_update_id, recognized_by, created_at)
select id, 'a0000000-0000-4000-8000-000000000001', now() - interval '12 days' from goal_updates where goal_id = 'd0000000-0000-4000-8000-000000000001' and new_value = 2074000;
insert into recognitions (goal_update_id, recognized_by, created_at)
select id, 'a0000000-0000-4000-8000-000000000002', now() - interval '13 days' from goal_updates where goal_id = 'd0000000-0000-4000-8000-000000000005' and new_value = 33500;

-- Opgeslagen filterweergaven
insert into saved_filters (org_id, profile_id, name, route, query) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Mijn week', '/dashboard', 'period=week'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Sales deze maand', '/kpis', 'period=month&team=c0000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Company goals Q3', '/goals', 'period=quarter&type=company'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'KPI''s die aandacht nodig hebben', '/kpis', 'status=needs_attention,behind'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'Sales deze maand', '/kpis', 'period=month&team=c0000000-0000-4000-8000-000000000002');

-- Een paar notificaties als gelezen markeren voor realisme
update notifications set read_at = created_at + interval '2 hours'
where recipient_id = 'a0000000-0000-4000-8000-000000000001' and kind in ('milestone_achieved') and created_at < now() - interval '30 days';

-- Doelvorm afleiden voor de demodoelen (zelfde regel als migratie 0011).
update goals set format = (case
    when measure = 'binary' then 'achievement'
    when target_value < start_value then 'improvement'
    else 'numeric_target' end)::goal_format
where details = '{}'::jsonb and format = 'numeric_target';
