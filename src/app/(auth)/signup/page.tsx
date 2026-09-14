import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Account aanmaken" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const invite = typeof sp.invite === "string" ? sp.invite : "";
  const email = typeof sp.email === "string" ? sp.email : "";
  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Account aanmaken</h1>
      <p className="t-sub mt-1">{invite ? "Je bent uitgenodigd. Maak een account aan om mee te doen." : "Start een nieuwe organisatie of sluit je aan via een uitnodiging."}</p>
      <SignupForm invite={invite} email={email} />
      <p className="text-sm text-muted mt-6">
        Al een account?{" "}
        <Link href={invite ? `/login?next=/invite/${invite}` : "/login"} className="text-ice underline underline-offset-4 decoration-line-strong hover:decoration-ice">
          Inloggen
        </Link>
      </p>
    </div>
  );
}
