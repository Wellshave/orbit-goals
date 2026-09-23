// Lichte endpoint voor de warmhoud-ping (netlify/functions/keep-warm.mjs) en om te controleren
// in welke regio de serverfunctie draait (hoort eu-central-1 te zijn, naast Supabase).
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, region: process.env.AWS_REGION ?? null }, { headers: { "cache-control": "no-store" } });
}
