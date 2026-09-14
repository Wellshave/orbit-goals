import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Inloggen" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/dashboard";
  const confirmed = sp.confirmed === "1";
  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Inloggen</h1>
      <p className="t-sub mt-1">Welkom terug. Log in met je e-mailadres en wachtwoord.</p>
      {confirmed && <p className="mt-4 text-sm text-cobalt-soft">Je e-mailadres is bevestigd. Je kunt nu inloggen.</p>}
      <LoginForm next={next} />
      <p className="text-sm text-muted mt-6">
        Nog geen account?{" "}
        <Link href="/signup" className="text-ice underline underline-offset-4 decoration-line-strong hover:decoration-ice">
          Account aanmaken
        </Link>
      </p>
    </div>
  );
}
