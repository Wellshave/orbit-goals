// Orbit is sinds november 2026 het menu Doelen in Production Lab (zelfde gegevens, zelfde login).
// Elke oude link gaat naar dezelfde plek daar. Dit gebeurt in de proxy (src/proxy.ts) als allereerste stap:
// op Netlify draait die vóór de redirects uit next.config, dus anders kwam je eerst op /login van Orbit.
export const PRODUCTION_LAB = "https://productionlab.wellshave.com";

const MOVED: [RegExp, string][] = [
  [/^\/$/, "/doelen"],
  [/^\/dashboard$/, "/doelen"],
  [/^\/me$/, "/doelen/mijn"],
  [/^\/company$/, "/doelen/bedrijf"],
  [/^\/goals$/, "/doelen/lijst"],
  [/^\/goals\/new$/, "/doelen/nieuw"],
  [/^\/goals\/([^/]+)\/edit$/, "/doelen/$1/bewerken"],
  [/^\/goals\/([^/]+)$/, "/doelen/$1"],
  [/^\/kpis$/, "/doelen/kpis"],
  [/^\/kpis\/new$/, "/doelen/kpis/nieuw"],
  [/^\/kpis\/([^/]+)\/edit$/, "/doelen/kpis/$1/bewerken"],
  [/^\/kpis\/([^/]+)$/, "/doelen/kpis/$1"],
  [/^\/checkin$/, "/doelen/check-in"],
  [/^\/teams$/, "/doelen/teams"],
  [/^\/teams\/new$/, "/doelen/teams/nieuw"],
  [/^\/teams\/([^/]+)$/, "/doelen/teams/$1"],
  [/^\/scoreboard$/, "/dashboards"],
  [/^\/people$/, "/team"],
  [/^\/people\/([^/]+)$/, "/doelen/mensen/$1"],
  [/^\/notifications$/, "/meldingen"],
  [/^\/settings$/, "/instellingen/profiel"],
  [/^\/login$/, "/login"],
];

/** Adres in Production Lab voor een oud Orbit-pad (met de oorspronkelijke query); alles wat onbekend is → /doelen. */
export function movedTo(pathname: string, search = ""): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  for (const [re, to] of MOVED) {
    if (re.test(path)) return PRODUCTION_LAB + path.replace(re, to) + search;
  }
  return PRODUCTION_LAB + "/doelen";
}
