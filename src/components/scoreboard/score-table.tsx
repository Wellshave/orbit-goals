import Link from "next/link";
import { Hand, Heart } from "lucide-react";
import type { ScoreRow } from "@/lib/data/scoreboard";
import type { Profile, Team, ContributionKind } from "@/lib/types";
import { Avatar } from "@/components/ui";
import { SCORE_ORDER, SCORE_RULES } from "@/lib/score";
import { sendKudos } from "@/app/actions/misc";

/** Scorebord: profielfoto's, zachte balken, uitklapbare opbouw en waardering per persoon. */
export function ScoreTable({ rows, byId, teamsOf, highlight }: { rows: ScoreRow[]; byId: Map<string, Profile>; teamsOf: (id: string) => Team[]; highlight?: string }) {
  const max = rows[0]?.total ?? 0;
  if (rows.length === 0) return <p className="text-sm t-muted">Nog geen bijdragen in deze periode.</p>;
  const medal = ["bg-butter text-yellow-deep", "bg-cloud text-ink-2", "bg-peach text-coral-deep"];
  return (
    <ol className="flex flex-col gap-3">
      {rows.map((r, i) => {
        const p = byId.get(r.profile_id);
        if (!p) return null;
        const kinds = SCORE_ORDER.filter((k) => r.breakdown[k]);
        const me = r.profile_id === highlight;
        return (
          <li key={r.profile_id} className={`card ${me ? "ring-2 ring-blue/30" : ""}`} data-tour={i === 0 ? "score-row" : undefined}>
            <details className="group">
              <summary className="list-none cursor-pointer p-4 grid grid-cols-[2.25rem_auto_1fr_auto] items-center gap-3 [&::-webkit-details-marker]:hidden">
                <span className={`grid place-items-center size-9 rounded-full font-display font-extrabold ${medal[i] ?? "bg-white border border-line text-ink-2"}`}>{i + 1}</span>
                <Avatar name={p.full_name} src={p.avatar_url} size="md" ring />
                <span className="min-w-0">
                  <span className="block font-bold truncate"><Link href={`/people/${p.id}`} className="hover:text-blue-deep">{p.full_name}</Link>{me && <span className="text-xs t-muted font-medium"> · jij</span>}</span>
                  <span className="block text-xs t-muted truncate">{p.job_title}{teamsOf(p.id).length ? ` · ${teamsOf(p.id).map((t) => t.name).join(", ")}` : ""}</span>
                  <span className="block mt-2 h-2 rounded-full bg-cloud overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${max ? (r.total / max) * 100 : 0}%`, background: i === 0 ? "linear-gradient(90deg,#F6C85F,#FFD98A)" : "linear-gradient(90deg,#5B6CFF,#9B72F2)" }} /></span>
                </span>
                <span className="text-right"><span className="font-display font-extrabold text-2xl block leading-none">{r.total}</span><span className="text-xs t-muted">punten</span></span>
              </summary>
              <div className="px-4 pb-4 pt-0 grid md:grid-cols-[1fr_auto] gap-4 items-start">
                <div>
                  <p className="t-label mb-2">Zo is de score opgebouwd</p>
                  <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
                    {kinds.map((k) => { const b = r.breakdown[k as ContributionKind]!; return (
                      <li key={k} className="flex items-center justify-between text-sm py-1.5 border-b border-line last:border-0"><span><span className="font-semibold">{SCORE_RULES[k].label}</span><span className="t-muted text-xs"> · {b.entries}× {SCORE_RULES[k].points}</span></span><span className="font-bold tnum">{b.points}</span></li>
                    ); })}
                  </ul>
                </div>
                {!me && (
                  <div className="flex flex-col gap-2" data-tour={i === 0 ? "kudos" : undefined}>
                    <form action={sendKudos}><input type="hidden" name="to_id" value={p.id} /><input type="hidden" name="kind" value="high_five" /><button type="submit" className="press w-full inline-flex items-center gap-2 rounded-full bg-sky text-blue-deep font-semibold text-sm px-4 py-2 hover:bg-blue hover:text-white"><Hand className="size-4" aria-hidden /> Geef een high-five</button></form>
                    <form action={sendKudos}><input type="hidden" name="to_id" value={p.id} /><input type="hidden" name="kind" value="thanks" /><button type="submit" className="press w-full inline-flex items-center gap-2 rounded-full bg-peach text-coral-deep font-semibold text-sm px-4 py-2 hover:bg-coral hover:text-white"><Heart className="size-4" aria-hidden /> Bedank voor bijdrage</button></form>
                  </div>
                )}
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
