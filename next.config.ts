import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co").hostname;
  } catch {
    return "placeholder.supabase.co";
  }
})();


// Orbit is sinds november 2026 het menu Doelen in Production Lab (zelfde gegevens, zelfde login).
// Elke oude link gaat naar dezelfde plek daar; tijdelijk (307), zodat terugdraaien kan.
const PL = "https://productionlab.wellshave.com";
const MOVED: [string, string][] = [
  ["/", "/doelen"],
  ["/dashboard", "/doelen"],
  ["/me", "/doelen/mijn"],
  ["/company", "/doelen/bedrijf"],
  ["/goals", "/doelen/lijst"],
  ["/goals/new", "/doelen/nieuw"],
  ["/goals/:id/edit", "/doelen/:id/bewerken"],
  ["/goals/:id", "/doelen/:id"],
  ["/kpis", "/doelen/kpis"],
  ["/kpis/new", "/doelen/kpis/nieuw"],
  ["/kpis/:id/edit", "/doelen/kpis/:id/bewerken"],
  ["/kpis/:id", "/doelen/kpis/:id"],
  ["/checkin", "/doelen/check-in"],
  ["/teams", "/doelen/teams"],
  ["/teams/new", "/doelen/teams/nieuw"],
  ["/teams/:id", "/doelen/teams/:id"],
  ["/scoreboard", "/dashboards"],
  ["/people", "/team"],
  ["/people/:id", "/doelen/mensen/:id"],
  ["/notifications", "/meldingen"],
  ["/settings", "/instellingen/profiel"],
  ["/login", "/login"],
  ["/:path*", "/doelen"],
];

const nextConfig: NextConfig = {
  async redirects() {
    return MOVED.map(([source, to]) => ({ source, destination: PL + to, permanent: false }));
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: supabaseHost }, { protocol: "https", hostname: "*.supabase.co" }],
  },
  experimental: {
    // Een pagina die je net bezocht (of via hover al ophaalde) mag 30 s uit de routercache komen:
    // terug- en heen-klikken voelt direct. Server actions met revalidatePath legen deze cache.
    staleTimes: { dynamic: 30, static: 30 },
    // Menulinks met unstable_dynamicOnHover halen de volledige pagina al op zodra je erover beweegt.
    dynamicOnHover: true,
  },
};

export default nextConfig;
