import Link from "next/link";
import { getDirectory, getSession } from "@/lib/data/session";
import { resolvePeriod } from "@/lib/periods";
import { getScoreboard } from "@/lib/data/scoreboard";
import { listKpiAssignments, listKpis } from "@/lib/data/kpis";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar, ButtonLink } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("people.title") };
}

export default async function PeoplePage() {
  const { supabase, org, isAdmin, locale, t } = await getSession();
  const dir = await getDirectory();
  const period = resolvePeriod({}, "month", locale);
  const [rows, kpis] = await Promise.all([getScoreboard(supabase, period.from, period.to), listKpis(supabase, org.id)]);
  const kpiAssignments = await listKpiAssignments(supabase, kpis.map((k) => k.id));
  const kpiCountOf = (id: string) => kpis.filter((k) => k.owner_id === id || kpiAssignments.some((a) => a.kpi_id === k.id && a.profile_id === id)).length;
  return (
    <div className="pt-2">
      <PageHeader help="people" icon="collab" tone="purple" eyebrow={t("people.eyebrow", { n: dir.members.length })} title={t("people.heading")} description={t("people.sub")} actions={isAdmin ? <ButtonLink href="/settings#uitnodigen" size="sm">{t("people.invite")}</ButtonLink> : undefined} />
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
                  {m.focus && <span className="block text-xs t-muted truncate">{m.focus}</span>}
                  <span className="mt-1.5 flex flex-wrap gap-1">{teams.map((tm) => <span key={tm.id} className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ background: `color-mix(in oklab, ${tm.color} 18%, white)`, color: `color-mix(in oklab, ${tm.color} 70%, #172033)` }}>{tm.name}</span>)}<span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-cloud text-ink-2">{t(`role.${m.role}`)}</span>{kpiCountOf(m.id) > 0 && <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-mintsoft text-mint-deep">{kpiCountOf(m.id) === 1 ? t("people.kpiCountOne") : t("people.kpiCount", { n: kpiCountOf(m.id) })}</span>}</span>
                </span>
                <span className="text-right"><span className="font-display font-extrabold text-xl block leading-none">{score}</span><span className="text-xs t-muted">{t("common.points")}</span></span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
