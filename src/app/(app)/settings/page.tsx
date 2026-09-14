import Link from "next/link";
import { getDirectory, getSession } from "@/lib/data/session";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, Avatar } from "@/components/ui";
import { ProfileEditor } from "@/components/people/profile-editor";
import { InviteForm, MemberRow, OrgForm } from "./settings-forms";
import { revokeInvite } from "@/app/actions/org";
import { ROLE_LABELS, VISIBILITY_LABELS } from "@/lib/status";
import { fmtDate } from "@/lib/format";
import type { OrgRole } from "@/lib/types";

export const metadata = { title: "Instellingen" };

export default async function SettingsPage() {
  const { supabase, org, profile, isAdmin } = await getSession();
  const dir = await getDirectory();
  const { data: invites } = isAdmin ? await supabase.from("invitations").select("*").eq("org_id", org.id).is("accepted_at", null).order("created_at", { ascending: false }) : { data: [] };
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow={org.name} title="Instellingen en rechten" description={isAdmin ? "Organisatie, teamleden, rollen en uitnodigingen." : "Je profiel en wat je in deze organisatie mag."} />
      <div className="flex flex-col gap-6">
        <ProfileEditor profile={profile} />

        <Panel eyebrow="Rechten" title="Wat jij mag">
          <ul className="text-sm grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-ice-dim">
            <li>Rol: <strong className="text-ice">{ROLE_LABELS[profile.role]}</strong></li>
            <li>Persoonlijke doelen en KPI&apos;s aanmaken: <strong className="text-ice">ja</strong></li>
            <li>Team- en company goals aanmaken: <strong className="text-ice">{isAdmin ? "ja" : "nee"}</strong></li>
            <li>KPI&apos;s toewijzen aan anderen: <strong className="text-ice">{isAdmin ? "ja" : "nee"}</strong></li>
            <li>Teamleden uitnodigen en beheren: <strong className="text-ice">{isAdmin ? "ja" : "nee"}</strong></li>
            <li>Privédoelen van anderen zien: <strong className="text-ice">nooit</strong></li>
          </ul>
          <div className="mt-4 text-xs text-muted">
            <p className="t-eyebrow mb-1">Zichtbaarheidsniveaus</p>
            <ul className="grid sm:grid-cols-2 gap-x-6">{Object.entries(VISIBILITY_LABELS).map(([k, v]) => <li key={k}>{v}</li>)}</ul>
          </div>
        </Panel>

        {isAdmin && (
          <>
            <Panel eyebrow="Organisatie" title="Naam en productnaam"><OrgForm org={org} /></Panel>

            <Panel eyebrow={`${dir.members.length}`} title="Teamleden en rollen" id="leden">
              <ul className="divide-y divide-line">
                {dir.members.map((m) => (
                  <li key={m.id} className="py-3 grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    <Avatar name={m.full_name} src={m.avatar_url} size="sm" />
                    <span className="min-w-0"><Link href={`/people/${m.id}`} className="block text-sm font-semibold truncate hover:text-cobalt-soft">{m.full_name}{m.id === profile.id ? " (jij)" : ""}</Link><span className="block text-xs text-muted truncate">{m.email} · {m.job_title || "—"} · {dir.teamsOf(m.id).map((t) => t.name).join(", ") || "geen team"}</span></span>
                    <MemberRow member={m} me={profile} />
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel eyebrow="Uitnodigen" title="Teamleden uitnodigen" id="uitnodigen">
              <p className="text-sm text-muted mb-4">Maak een uitnodigingslink en deel die met je collega. De link is 14 dagen geldig en koppelt het account automatisch aan {org.name}.</p>
              <InviteForm orgId={org.id} />
              {(invites ?? []).length > 0 && (
                <div className="mt-6">
                  <p className="t-eyebrow mb-2">Openstaande uitnodigingen</p>
                  <ul className="divide-y divide-line">
                    {(invites ?? []).map((i) => (
                      <li key={i.id} className="py-2 flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-semibold">{i.email}</span>
                        <span className="text-xs text-muted">{ROLE_LABELS[i.role as OrgRole]} · verloopt {fmtDate(i.expires_at)}</span>
                        <code className="t-num text-xs text-ice-dim bg-ink-deep px-2 py-1 rounded select-all break-all">{base}/invite/{i.token}</code>
                        <form action={revokeInvite} className="ml-auto"><input type="hidden" name="id" value={i.id} /><button type="submit" className="text-xs text-muted hover:text-coral-soft">Intrekken</button></form>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>

            <Panel eyebrow="Teams" title="Teams beheren"><p className="text-sm text-muted">Teams, leden en leads beheer je op de <Link href="/teams" className="text-cobalt-soft font-semibold hover:underline">teampagina&apos;s</Link>.</p></Panel>
          </>
        )}
      </div>
    </div>
  );
}
