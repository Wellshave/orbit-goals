import Link from "next/link";
import { SignupForm } from "./signup-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("auth.signupTitle") };
}

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const { t } = await getT();
  const invite = typeof sp.invite === "string" ? sp.invite : "";
  const email = typeof sp.email === "string" ? sp.email : "";
  return (
    <div>
      <h1 className="text-3xl">{t("auth.signupTitle")}</h1>
      <p className="t-muted mt-1">{invite ? t("auth.signupInvited") : t("auth.signupSub")}</p>
      <SignupForm invite={invite} email={email} />
      <p className="text-sm t-muted mt-6">
        {t("auth.haveAccount")}{" "}
        <Link href={invite ? `/login?next=/invite/${invite}` : "/login"} className="text-blue-deep font-semibold hover:underline">{t("auth.login")}</Link>
      </p>
    </div>
  );
}
