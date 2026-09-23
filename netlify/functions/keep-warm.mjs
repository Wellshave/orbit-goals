// Houdt de Next.js-serverfunctie warm: zonder verkeer valt die na een paar minuten stil en kost
// het eerste verzoek daarna seconden (koude start). /login is licht (geen sessie, geen database).
export default async function keepWarm() {
  const base = process.env.URL || "https://wellshave-orbit.netlify.app";
  try {
    await fetch(`${base}/login`, { headers: { "user-agent": "orbit-keep-warm" } });
  } catch {
    // Volgende ronde gewoon opnieuw.
  }
  return new Response("ok");
}

export const config = { schedule: "*/5 * * * *" };
