import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile, Team, TeamMembership } from "@/lib/types";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");
  if (!profile.org_id || !profile.onboarded) redirect("/onboarding");

  const { data: org } = await supabase.from("organizations").select("*").eq("id", profile.org_id).single();
  if (!org) redirect("/onboarding");

  return { supabase, user, profile: profile as Profile, org: org as Organization, isAdmin: profile.role === "owner" || profile.role === "admin" };
});

/** Alle leden + teams van de organisatie (voor pickers, avatars, teamlabels). */
export const getDirectory = cache(async () => {
  const { supabase, org } = await getSession();
  const [{ data: members }, { data: teams }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("org_id", org.id).order("full_name"),
    supabase.from("teams").select("*").eq("org_id", org.id).order("name"),
    supabase.from("team_memberships").select("*"),
  ]);
  const byId = new Map<string, Profile>();
  for (const m of (members ?? []) as Profile[]) byId.set(m.id, m);
  const teamById = new Map<string, Team>();
  for (const t of (teams ?? []) as Team[]) teamById.set(t.id, t);
  const ms = (memberships ?? []) as TeamMembership[];
  const teamsOf = (profileId: string) => ms.filter((m) => m.profile_id === profileId).map((m) => teamById.get(m.team_id)).filter(Boolean) as Team[];
  const membersOf = (teamId: string) => ms.filter((m) => m.team_id === teamId).map((m) => byId.get(m.profile_id)).filter(Boolean) as Profile[];
  return { members: (members ?? []) as Profile[], teams: (teams ?? []) as Team[], memberships: ms, byId, teamById, teamsOf, membersOf };
});
