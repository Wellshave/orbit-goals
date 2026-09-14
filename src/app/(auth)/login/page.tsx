import Link from "next/link";
import { LoginForm } from "./login-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("auth.login") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const { t } = await getT();
  const next = typeof sp.next === "string" ? sp.next : "/dashboard";
  const confirmed = sp.confirmed === "1";
  return (
    <div>
      <h1 className="text-3xl">{t("auth.loginTitle")}</h1>
      <p className="t-muted mt-1">{t("auth.loginSub")}</p>
      {confirmed && <p className="mt-4 text-sm text-mint-deep font-semibold">{t("auth.confirmed")}</p>}
      <LoginForm next={next} />
      <p className="text-sm t-muted mt-6">
        {t("auth.noAccount")}{" "}
        <Link href="/signup" className="text-blue-deep font-semibold hover:underline">{t("auth.createAccount")}</Link>
      </p>
    </div>
  );
}
