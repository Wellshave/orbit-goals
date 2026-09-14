import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui";
import { AcceptInviteForm } from "./accept-form";
import { ROLE_LABELS } from "@/lib/status";
import type { OrgRole } from "@/lib/types";

export const metadata = { title: "Uitnodiging" };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invitation", { p_token: token });
  const inv = Array.isArray(data) ? data[0] : data;

  if (error || !inv) {
    return (
      <div>
        <h1 className="font-display text-3xl font-bold">Uitnodiging niet gevonden</h1>
        <p className="t-sub mt-2">Deze link is ongeldig of al gebruikt. Vraag een nieuwe uitnodiging aan bij je beheerder.</p>
        <ButtonLink href="/login" variant="secondary" className="mt-6">Naar inloggen</ButtonLink>
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
      <p className="t-eyebrow mb-2">Uitnodiging</p>
      <h1 className="font-display text-3xl font-bold tracking-tight">Word lid van {inv.org_name}</h1>
      <p className="t-sub mt-2">
        Je bent uitgenodigd als <strong className="text-ice">{ROLE_LABELS[inv.role as OrgRole]}</strong> voor {inv.email}.
      </p>
      {inv.accepted && <p className="mt-4 text-sm text-coral-soft">Deze uitnodiging is al gebruikt.</p>}
      {!inv.accepted && user && <AcceptInviteForm token={token} />}
      {!inv.accepted && !user && (
        <div className="mt-6 flex flex-col gap-3">
          <ButtonLink href={`/signup?invite=${token}&email=${encodeURIComponent(inv.email)}`} size="lg">Account aanmaken en meedoen</ButtonLink>
          <Link href={`/login?next=/invite/${token}`} className="text-sm text-muted text-center underline underline-offset-4">
            Ik heb al een account
          </Link>
        </div>
      )}
    </div>
  );
}
