import Link from "next/link";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { getScoreboard } from "@/lib/data/scoreboard";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar, ButtonLink } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/status";

export const metadata = { title: "Teamleden" };

export default async function PeoplePage() {
  const { supabase, isAdmin } = await getSession();
  const dir = await getDirectory();
  const period = resolvePeriod({}, "month");
  const rows = await getScoreboard(supabase, period.from, period.to);
  return (
    <>
      <PageHeader eyebrow={`${dir.members.length} personen`} title="Teamleden" description="Iedereen in de organisatie, met rol, teams en bijdragescore van deze maand." actions={isAdmin ? <ButtonLink href="/settings#uitnodigen" size="sm">Teamlid uitnodigen</ButtonLink> : undefined} />
      <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {dir.members.map((m) => {
          const score = rows.find((r) => r.profile_id === m.id)?.total ?? 0;
          return (
            <li key={m.id}>
              <Link href={`/people/${m.id}`} className="deck p-4 flex items-center gap-3 hover:border-ice/25 transition-colors">
                <Avatar name={m.full_name} src={m.avatar_url} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-semibold truncate">{m.full_name}</span>
                  <span className="block text-xs text-muted truncate">{m.job_title || "—"}</span>
                  <span className="block text-[0.6875rem] text-muted mt-1 truncate">{ROLE_LABELS[m.role]}{dir.teamsOf(m.id).length ? ` · ${dir.teamsOf(m.id).map((t) => t.name).join(", ")}` : ""}</span>
                </span>
                <span className="text-right"><span className="t-num font-bold text-lg block">{score}</span><span className="text-[0.625rem] text-muted font-mono uppercase">pt</span></span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
