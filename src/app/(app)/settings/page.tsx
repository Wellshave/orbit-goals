import Link from "next/link";
import { getDirectory, getSession } from "@/lib/data/session";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, Avatar } from "@/components/ui";
import { ProfileEditor } from "@/components/people/profile-editor";
import { InviteForm, MemberRow, OrgForm } from "./settings-forms";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { revokeInvite } from "@/app/actions/org";
import { fmtDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { OrgRole } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("settings.title") };
}

const VIS = ["private", "shared", "team", "company"] as const;

export default async function SettingsPage() {
  const { supabase, org, profile, isAdmin, locale, t } = await getSession();
  const dir = await getDirectory();
  const { data: invites } = isAdmin ? await supabase.from("invitations").select("*").eq("org_id", org.id).is("accepted_at", null).order("created_at", { ascending: false }) : { data: [] };
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const yn = (b: boolean) => t(b ? "common.yes" : "common.no");
  return (
    <div className="max-w-4xl pt-2">
      <PageHeader help="settings" icon="settings" tone="grey" eyebrow={org.name} title={t("settings.heading")} description={isAdmin ? t("settings.subAdmin") : t("settings.subMember")} />
      <div className="flex flex-col gap-6">
        <Panel eyebrow={t("settings.language")} title={t("shell.language")}>
          <p className="text-sm t-muted mb-3">{t("settings.languageBody")}</p>
          <LanguageToggle />
        </Panel>

        <ProfileEditor profile={profile} />

        <Panel eyebrow={t("settings.permissions")} title={t("settings.whatYouMay")}>
          <ul className="text-sm grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-ink-2">
            <li>{t("settings.roleLine")}<strong className="text-ink">{t(`role.${profile.role}`)}</strong></li>
            <li>{t("settings.createPersonal")}<strong className="text-ink">{yn(true)}</strong></li>
            <li>{t("settings.createTeam")}<strong className="text-ink">{yn(isAdmin)}</strong></li>
            <li>{t("settings.assignKpis")}<strong className="text-ink">{yn(isAdmin)}</strong></li>
            <li>{t("settings.inviteManage")}<strong className="text-ink">{yn(isAdmin)}</strong></li>
            <li>{t("settings.seePrivate")}<strong className="text-ink">{t("common.never")}</strong></li>
          </ul>
          <div className="mt-4 text-xs t-muted">
            <p className="t-label mb-1">{t("settings.visLevels")}</p>
            <ul className="grid sm:grid-cols-2 gap-x-6">{VIS.map((k) => <li key={k}>{t(`visibility.${k}`)}</li>)}</ul>
          </div>
        </Panel>

        {isAdmin && (
          <>
            <Panel eyebrow={t("settings.org")} title={t("settings.orgTitle")}><OrgForm org={org} /></Panel>

            <Panel eyebrow={`${dir.members.length}`} title={t("settings.membersRoles")} id="leden">
              <ul className="divide-y divide-line">
                {dir.members.map((m) => (
                  <li key={m.id} className="py-3 grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    <Avatar name={m.full_name} src={m.avatar_url} size="md" ring />
                    <span className="min-w-0"><Link href={`/people/${m.id}`} className="block text-sm font-bold truncate hover:text-blue-deep">{m.full_name}{m.id === profile.id ? ` (${t("common.you")})` : ""}</Link><span className="block text-xs t-muted truncate">{m.email} · {m.job_title || "—"} · {dir.teamsOf(m.id).map((tm) => tm.name).join(", ") || t("settings.noTeamShort")}</span></span>
                    <MemberRow member={m} me={profile} />
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel eyebrow={t("settings.invite")} title={t("settings.inviteTitle")} id="uitnodigen">
              <p className="text-sm t-muted mb-4">{t("settings.inviteBody", { org: org.name })}</p>
              <InviteForm orgId={org.id} />
              {(invites ?? []).length > 0 && (
                <div className="mt-6">
                  <p className="t-label mb-2">{t("settings.openInvites")}</p>
                  <ul className="divide-y divide-line">
                    {(invites ?? []).map((i) => (
                      <li key={i.id} className="py-2 flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-semibold">{i.email}</span>
                        <span className="text-xs t-muted">{t(`role.${i.role as OrgRole}`)} · {t("settings.expires", { d: fmtDate(i.expires_at, "d MMM yyyy", locale) })}</span>
                        <code className="text-xs bg-cloud px-2 py-1 rounded-lg select-all break-all">{base}/invite/{i.token}</code>
                        <form action={revokeInvite} className="ml-auto"><input type="hidden" name="id" value={i.id} /><button type="submit" className="text-xs t-muted hover:text-coral-deep font-semibold">{t("settings.revoke")}</button></form>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>

            <Panel eyebrow={t("settings.teams")} title={t("settings.manageTeams")}><p className="text-sm t-muted">{t("settings.manageTeamsBody")}<Link href="/teams" className="text-blue-deep font-semibold hover:underline">{t("settings.teamPages")}</Link>.</p></Panel>
          </>
        )}
      </div>
    </div>
  );
}
