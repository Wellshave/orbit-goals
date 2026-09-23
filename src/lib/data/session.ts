import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient, currentUser } from "@/lib/supabase/server";
import type { Organization, Profile, Team, TeamMembership } from "@/lib/types";
import { getLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";

type Bootstrap = {
  profile: Profile | null;
  org: Organization | null;
  unread: number;
  unread_dm: number;
  members: Profile[];
  teams: Team[];
  memberships: TeamMembership[];
};

/** Supabase-client + ingelogde gebruiker; de JWT wordt lokaal gecontroleerd (zie currentUser). */
export const getAuth = cache(async () => {
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) redirect("/login");
  return { supabase, user };
});

/**
 * Profiel, organisatie, ongelezen-tellers en de ledenlijst met teams in één databaseverzoek
 * (orbit_bootstrap, 0013_speed.sql). Layout, pagina en getDirectory delen dit resultaat per request.
 */
const getBootstrap = cache(async () => {
  const { supabase } = await getAuth();
  const { data, error } = await supabase.rpc("orbit_bootstrap");
  if (error) throw new Error(error.message);
  return data as Bootstrap;
});

export const getSession = cache(async () => {
  const { supabase, user } = await getAuth();
  const [boot, locale] = await Promise.all([getBootstrap(), getLocale()]);
  const profile = boot.profile;
  if (!profile) redirect("/login");
  if (!profile.org_id || !profile.onboarded) redirect("/onboarding");
  const org = boot.org;
  if (!org) redirect("/onboarding");

  return {
    supabase,
    user,
    profile,
    org,
    isAdmin: profile.role === "owner" || profile.role === "admin",
    locale,
    t: makeT(locale),
    unread: boot.unread,
    unreadDm: boot.unread_dm,
  };
});

/** Alle leden + teams van de organisatie (voor pickers, avatars, teamlabels). Komt mee met de bootstrap. */
export const getDirectory = cache(async () => {
  await getSession();
  const { members, teams, memberships: ms } = await getBootstrap();
  const byId = new Map<string, Profile>();
  for (const m of members) byId.set(m.id, m);
  const teamById = new Map<string, Team>();
  for (const t of teams) teamById.set(t.id, t);
  const teamsOf = (profileId: string) => ms.filter((m) => m.profile_id === profileId).map((m) => teamById.get(m.team_id)).filter(Boolean) as Team[];
  const membersOf = (teamId: string) => ms.filter((m) => m.team_id === teamId).map((m) => byId.get(m.profile_id)).filter(Boolean) as Profile[];
  return { members, teams, memberships: ms, byId, teamById, teamsOf, membersOf };
});
