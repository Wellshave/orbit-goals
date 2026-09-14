import Link from "next/link";
import type { ScoreRow } from "@/lib/data/scoreboard";
import type { Profile, Team, ContributionKind } from "@/lib/types";
import { Avatar } from "@/components/ui";
import { SCORE_ORDER, SCORE_RULES } from "@/lib/score";

/** Scorebord met transparante opbouw per persoon (uitklapbaar). */
export function ScoreTable({ rows, byId, teamsOf, highlight }: { rows: ScoreRow[]; byId: Map<string, Profile>; teamsOf: (id: string) => Team[]; highlight?: string }) {
  const max = rows[0]?.total ?? 0;
  if (rows.length === 0) return <p className="text-sm text-muted">Nog geen bijdragen in deze periode.</p>;
  return (
    <ol className="flex flex-col gap-2">
      {rows.map((r, i) => {
        const p = byId.get(r.profile_id);
        if (!p) return null;
        const kinds = SCORE_ORDER.filter((k) => r.breakdown[k]);
        return (
          <li key={r.profile_id} className={`deck ${r.profile_id === highlight ? "border-cobalt/50" : ""}`}>
            <details className="group">
              <summary className="list-none cursor-pointer p-3 sm:p-4 grid grid-cols-[2rem_auto_1fr_auto] items-center gap-3 [&::-webkit-details-marker]:hidden">
                <span className={`t-num font-bold text-lg ${i === 0 ? "text-orchid-soft" : i < 3 ? "text-ice" : "text-muted"}`}>{i + 1}</span>
                <Avatar name={p.full_name} src={p.avatar_url} size="sm" />
                <span className="min-w-0">
                  <span className="block font-semibold text-sm truncate">
                    <Link href={`/people/${p.id}`} className="hover:text-cobalt-soft">{p.full_name}</Link>
                    {r.profile_id === highlight && <span className="text-xs text-muted font-normal"> · jij</span>}
                  </span>
                  <span className="block text-[0.6875rem] text-muted truncate">{p.job_title}{teamsOf(p.id).length ? ` · ${teamsOf(p.id).map((t) => t.name).join(", ")}` : ""}</span>
                  <span className="block mt-1.5 h-1 rounded-full well overflow-hidden">
                    <span className="block h-full rounded-full" style={{ width: `${max ? (r.total / max) * 100 : 0}%`, background: i === 0 ? "linear-gradient(90deg,#9567E8,#B391F2)" : "linear-gradient(90deg,#496CFF,#6F8BFF)" }} />
                  </span>
                </span>
                <span className="text-right">
                  <span className="t-num font-bold text-xl block">{r.total}</span>
                  <span className="text-[0.625rem] text-muted uppercase tracking-wider font-mono">punten</span>
                </span>
              </summary>
              <div className="px-4 pb-4 pt-0">
                <p className="t-eyebrow mb-2">Opbouw van de score</p>
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
                  {kinds.map((k) => {
                    const b = r.breakdown[k as ContributionKind]!;
                    return (
                      <li key={k} className="flex items-center justify-between text-sm py-1 border-b border-line last:border-0">
                        <span>
                          <span className="font-medium">{SCORE_RULES[k].label}</span>
                          <span className="text-muted text-xs"> · {b.entries}× {SCORE_RULES[k].points} pt</span>
                        </span>
                        <span className="t-num font-semibold">{b.points}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
