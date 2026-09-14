import Link from "next/link";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { getScoreboard } from "@/lib/data/scoreboard";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar, ButtonLink } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/status";

export const metadata = { title: "Mensen" };

export default async function PeoplePage() {
  const { supabase, isAdmin } = await getSession();
  const dir = await getDirectory();
  const period = resolvePeriod({}, "month");
  const rows = await getScoreboard(supabase, period.from, period.to);
  return (
    <div className="pt-2">
      <PageHeader help="people" icon="collab" tone="purple" eyebrow={`${dir.members.length} mensen`} title="Het team" description="Iedereen in de organisatie, met rol, teams en punten van deze maand." actions={isAdmin ? <ButtonLink href="/settings#uitnodigen" size="sm">Iemand uitnodigen</ButtonLink> : undefined} />
      <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {dir.members.map((m) => {
          const score = rows.find((r) => r.profile_id === m.id)?.total ?? 0;
          const teams = dir.teamsOf(m.id);
          return (
            <li key={m.id}>
              <Link href={`/people/${m.id}`} className="card hover-lift p-5 flex items-center gap-4">
                <Avatar name={m.full_name} src={m.avatar_url} size="lg" ring />
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-extrabold text-lg truncate">{m.full_name}</span>
                  <span className="block text-sm t-muted truncate">{m.job_title || "—"}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1">{teams.map((t) => <span key={t.id} className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ background: `color-mix(in oklab, ${t.color} 18%, white)`, color: `color-mix(in oklab, ${t.color} 70%, #172033)` }}>{t.name}</span>)}<span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-cloud text-ink-2">{ROLE_LABELS[m.role]}</span></span>
                </span>
                <span className="text-right"><span className="font-display font-extrabold text-xl block leading-none">{score}</span><span className="text-xs t-muted">punten</span></span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
