import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Inloggen" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/dashboard";
  const confirmed = sp.confirmed === "1";
  return (
    <div>
      <h1 className="text-3xl">Welkom terug</h1>
      <p className="t-muted mt-1">Log in met je e-mailadres en wachtwoord.</p>
      {confirmed && <p className="mt-4 text-sm text-mint-deep font-semibold">Je e-mailadres is bevestigd. Je kunt nu inloggen.</p>}
      <LoginForm next={next} />
      <p className="text-sm t-muted mt-6">
        Nog geen account?{" "}
        <Link href="/signup" className="text-blue-deep font-semibold hover:underline">
          Account aanmaken
        </Link>
      </p>
    </div>
  );
}
