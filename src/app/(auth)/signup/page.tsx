import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Account aanmaken" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const invite = typeof sp.invite === "string" ? sp.invite : "";
  const email = typeof sp.email === "string" ? sp.email : "";
  return (
    <div>
      <h1 className="text-3xl">Account aanmaken</h1>
      <p className="t-muted mt-1">{invite ? "Je bent uitgenodigd. Maak een account aan om mee te doen." : "Start een nieuwe organisatie of sluit je aan via een uitnodiging."}</p>
      <SignupForm invite={invite} email={email} />
      <p className="text-sm t-muted mt-6">
        Al een account?{" "}
        <Link href={invite ? `/login?next=/invite/${invite}` : "/login"} className="text-blue-deep font-semibold hover:underline">
          Inloggen
        </Link>
      </p>
    </div>
  );
}
