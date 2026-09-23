import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Aangeroepen vanuit een Server Component: cookies worden door de proxy ververst.
          }
        },
      },
    }
  );
}

/**
 * Ingelogde gebruiker uit de sessie-JWT. Het project tekent tokens met een asymmetrische sleutel (ES256),
 * dus de handtekening wordt lokaal gecontroleerd tegen de gecachte publieke sleutel: geen extra verzoek
 * naar Supabase Auth. De database controleert daarna met dezelfde JWT via RLS.
 */
export async function currentUser(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return claims?.sub ? { id: claims.sub, email: claims.email ?? null } : null;
}
