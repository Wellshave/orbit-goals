import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContributionKind } from "@/lib/types";

export interface ScoreRow { profile_id: string; total: number; breakdown: Partial<Record<ContributionKind, { points: number; entries: number }>>; }

export async function getScoreboard(supabase: SupabaseClient, from: Date, to: Date, teamId?: string | null) {
  const { data } = await supabase.rpc("scoreboard", { p_from: from.toISOString(), p_to: to.toISOString(), p_team: teamId ?? null });
  const rows = new Map<string, ScoreRow>();
  for (const r of (data ?? []) as { profile_id: string; kind: ContributionKind; points: number; entries: number }[]) {
    const row = rows.get(r.profile_id) ?? { profile_id: r.profile_id, total: 0, breakdown: {} };
    row.total += Number(r.points);
    row.breakdown[r.kind] = { points: Number(r.points), entries: Number(r.entries) };
    rows.set(r.profile_id, row);
  }
  return Array.from(rows.values()).sort((a, b) => b.total - a.total);
}
