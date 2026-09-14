import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui";
import { AcceptInviteForm } from "./accept-form";
import { getT } from "@/lib/i18n/server";
import type { OrgRole } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("auth.invitation") };
}

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const { t } = await getT();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invitation", { p_token: token });
  const inv = Array.isArray(data) ? data[0] : data;

  if (error || !inv) {
    return (
      <div>
        <h1 className="text-3xl">{t("auth.inviteNotFound")}</h1>
        <p className="t-muted mt-2">{t("auth.inviteNotFoundBody")}</p>
        <ButtonLink href="/login" variant="secondary" className="mt-6">{t("auth.toLogin")}</ButtonLink>
      </div>
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
    if (profile?.org_id) redirect("/dashboard");
  }
  return (
    <div>
      <p className="t-label mb-2">{t("auth.invitation")}</p>
      <h1 className="text-3xl">{t("auth.joinOrg", { org: inv.org_name })}</h1>
      <p className="t-muted mt-2">{t("auth.invitedAs", { role: t(`role.${inv.role as OrgRole}`), email: inv.email })}</p>
      {inv.accepted && <p className="mt-4 text-sm text-coral-deep font-semibold">{t("auth.inviteUsed")}</p>}
      {!inv.accepted && user && <AcceptInviteForm token={token} />}
      {!inv.accepted && !user && (
        <div className="mt-6 flex flex-col gap-3">
          <ButtonLink href={`/signup?invite=${token}&email=${encodeURIComponent(inv.email)}`} size="lg">{t("auth.createAndJoin")}</ButtonLink>
          <Link href={`/login?next=/invite/${token}`} className="text-sm text-blue-deep font-semibold text-center hover:underline">{t("auth.haveAccount")}</Link>
        </div>
      )}
    </div>
  );
}
