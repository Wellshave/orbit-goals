# Orbit — vriendelijke progress workspace

Licht, kleurrijk dashboard waarin company goals, teamdoelen en persoonlijke doelen samenkomen: KPI's, milestones, rewards, check-ins, een activity feed met @-vermeldingen, notificaties en een transparant scorebord. Privédoelen zijn technisch afgeschermd via row-level security.

De productnaam staat in `src/lib/product.ts` (`NEXT_PUBLIC_PRODUCT_NAME`) en per organisatie in de database (`organizations.product_name`, aanpasbaar via Instellingen).

## Stack

- Next.js 16 (App Router, Server Actions, `proxy.ts`) + TypeScript
- Supabase: Auth (e-mail/wachtwoord), Postgres met RLS, Realtime, Storage (profielfoto's)
- Tailwind v4 met eigen tokens, Framer Motion, Recharts, lucide-react, date-fns

## Starten

1. **Supabase-project** — maak een project aan (of gebruik een bestaand leeg project) en voer de SQL uit in deze volgorde, via de SQL-editor of `supabase db push`:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_logic.sql`
   - `supabase/migrations/0004_hardening.sql`
   - `supabase/migrations/0005_kudos.sql`
   - `supabase/migrations/0006_locale.sql`
   - `supabase/migrations/0007_onboarding_guard_fix.sql`
   - `supabase/migrations/0008_goals_select_inline.sql`
   - `supabase/seed.sql` (optioneel, demo-inhoud)
2. **Auth-instellingen** in het Supabase-dashboard (Authentication → Providers → Email): zet *Confirm email* uit als je zonder mailserver wilt testen. Voeg onder *URL configuration* `http://localhost:3000/auth/callback` toe aan de redirect-URL's.
3. **Env** — kopieer `.env.example` naar `.env.local` en vul `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY` in (Project Settings → API).
4. Installeren en draaien:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Demo-accounts (na `seed.sql`)

> Alleen voor lokale ontwikkeling. In productie zijn de demo-accounts en demodata op 14-09-2026 verwijderd; echte collega's komen binnen via uitnodigingslinks (Instellingen → Mensen uitnodigen) en kiezen hun eigen wachtwoord.


Wachtwoord voor allemaal: `Orbit2026!`

| E-mail | Rol | Functie |
|---|---|---|
| dustin@orbit-demo.nl | Owner | Founder & CEO |
| willem@orbit-demo.nl | Admin | Operations Lead |
| lex@orbit-demo.nl | Teamlid | Bol.com Ads |
| kevin@orbit-demo.nl | Teamlid | Shopify Operator |
| jhelarie@orbit-demo.nl | Teamlid | Social Content |
| jeremy@orbit-demo.nl | Teamlid | Influencers & Editing |
| napoleon@orbit-demo.nl | Teamlid | Media Buying |
| song@orbit-demo.nl | Teamlid | Creative Strategist |

Het privédoel "Tien leessessies per week" van Dustin is voor geen enkel ander account zichtbaar, ook niet voor admin Willem.

## Structuur

```
supabase/migrations   schema, RLS-policies + helperfuncties, triggers/RPC's
supabase/seed.sql     Nederlandse demo-inhoud
src/proxy.ts          sessie-refresh + redirect naar /login
src/app/(auth)        inloggen, account aanmaken, e-mailcallback, uitnodiging
src/app/onboarding    organisatie aanmaken/aansluiten + profiel
src/app/(app)         dashboard, company, teams, goals, kpis, checkin, scoreboard,
                      notifications, people, settings
src/app/actions       server actions (auth, org, goals, kpis, comments, misc)
src/lib               types, periodes, status/voortgangslogica, scoreregels, data-helpers
src/components        ui-primitieven, iconenfamilie (clay), shell, Progress Path, instrumenten, celebration, formulieren
```

## Rechten en zichtbaarheid

| Zichtbaarheid | Wie ziet het |
|---|---|
| Privé | alleen de eigenaar (ook admins/owner niet) |
| Gedeeld | eigenaar + geselecteerde personen + verantwoordelijken |
| Team | teamleden, verantwoordelijken, admins/owner |
| Company | iedereen in de organisatie |

De regels staan in `can_view_goal()` (`0002_rls.sql`) en gelden voor de UI, de API (PostgREST) en Realtime. Updates, milestones, rewards, reacties en activiteit erven de zichtbaarheid van het doel.

## Eerste login: even voorstellen

Na het accepteren van een uitnodiging (of het aanmaken van een organisatie) beantwoordt iedereen vijf korte vragen: naam en foto, functie, afdeling/teams, sinds wanneer je hier werkt, en waar je je mee bezighoudt. De antwoorden vullen het profiel (`profiles.job_title`, `started_at`, `focus`) en de teamlidmaatschappen (RPC `set_my_teams`, migratie 0009). Alles is later aan te passen op je eigen profielpagina of in Instellingen.

## Berichten (DM)

Collega's sturen elkaar directe berichten via **Berichten** in het menu of de knop "Bericht sturen" op een profiel. Tabel `direct_messages` (migratie 0010): alleen afzender en ontvanger kunnen lezen, ook owners/admins niet; vervalsen van de afzender, berichten aan jezelf en achteraf aanpassen zijn door RLS geblokkeerd. Een nieuw bericht maakt één melding per afzender (`dedupe_key = dm:<afzender>`), het openen van het gesprek markeert berichten en melding als gelezen (`mark_dm_read`). Nieuwe berichten komen live binnen via realtime.

## Taal (NL / EN)

De interface is beschikbaar in het Nederlands (standaard) en Engels. De keuze staat in de zijbalk, op de loginpagina en onder Instellingen → Taal; hij wordt bewaard in een cookie en, na inloggen, in `profiles.locale` (migratie 0006). Alle teksten staan in `src/lib/i18n/nl.ts` en `src/lib/i18n/en.ts` (zelfde sleutels); server-componenten gebruiken `getT()`/`getSession().t`, client-componenten `useT()`. Help en walkthroughs zijn bewust Engels.

## Help en walkthroughs

Elke pagina, sectie en pop-up heeft een vraagteken-knop. Die opent een Engelse uitleg met een visuele demo en, waar zinvol, een **walkthrough**: een cursor beweegt over de echte pagina, licht onderdelen uit, klikt en typt (visueel) en toont uitleg in beeld. Bediening: Esc sluit, ← → springt, spatie pauzeert. Inhoud staat in `src/lib/help/content.ts`; anker-elementen krijgen een `data-tour`-attribuut. Het overzicht van alle onderwerpen zit onderin de zijbalk onder **Help**.

## Scorebord en waardering

Naast punten kun je collega's een high-five geven, bedanken of een milestone meevieren (tabel `kudos`, migratie 0005). Dat levert de ontvanger een melding op, geen punten.

## Puntentabel

Punten per soort bijdrage staan in `src/lib/score.ts` en worden in de database toegekend (`0003_logic.sql`): check-in 10, tijdig 5, target gehaald 25, streak ≥3 10, voortgangsupdate 5, milestone 40, doel behaald 60, erkenning 15. Elke score is uitklapbaar op het scorebord.

## Deploy (Netlify)

Productie draait op Netlify als project `wellshave-orbit` → https://wellshave-orbit.netlify.app.
`netlify.toml` gebruikt de officiële Next.js-runtime (`@netlify/plugin-nextjs`).

Omgevingsvariabelen in Netlify (Site configuration → Environment variables):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (= de productie-URL).

Handmatig deployen zonder GitHub-koppeling (upload een schone export, anders gaan `.next` en `.env.local` mee):

```bash
rm -rf /tmp/orbit-deploy && mkdir -p /tmp/orbit-deploy && git archive HEAD | tar -x -C /tmp/orbit-deploy
```

Vraag daarna in Claude Code de Netlify-deploy-opdracht op (`deploy-site` met site-id `0e80d344-bac1-4481-aaa5-81761738a516`) en voer die uit in `/tmp/orbit-deploy`.
Broncode: https://github.com/Wellshave/orbit-goals. Gekoppeld aan Netlify via Site configuration → Build & deploy → Link repository; daarna deployt elke push naar `main` automatisch.

In Supabase Auth moet voor productie staan: Site URL = productie-URL, Redirect URL `https://wellshave-orbit.netlify.app/auth/callback`, e-mailbevestiging uit (of SMTP gekoppeld) en leaked-password-protection aan.

## Scripts

```bash
npm run dev      # ontwikkelserver
npm run build    # productiebuild
npm run lint
npx tsc --noEmit # typecheck
```
