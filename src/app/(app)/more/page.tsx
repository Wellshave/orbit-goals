import Link from "next/link";
import { NAV } from "@/components/shell/nav";
import { getSession } from "@/lib/data/session";
import { Avatar } from "@/components/ui";
import { signOut } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/status";

export const metadata = { title: "Meer" };

export default async function MorePage() {
  const { profile } = await getSession();
  return (
    <div className="max-w-md">
      <Link href={`/people/${profile.id}`} className="deck p-4 flex items-center gap-3 mb-4">
        <Avatar name={profile.full_name} src={profile.avatar_url} size="md" />
        <span><span className="block font-semibold">{profile.full_name}</span><span className="block text-xs text-muted">{ROLE_LABELS[profile.role]} · {profile.job_title}</span></span>
      </Link>
      <ul className="deck divide-y divide-line">
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <li key={n.href}>
              <Link href={n.href} className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-ice/5"><Icon className="size-4 text-muted" aria-hidden /> {n.label}</Link>
            </li>
          );
        })}
      </ul>
      <form action={signOut} className="mt-4">
        <button type="submit" className="text-sm text-muted hover:text-coral-soft font-semibold">Uitloggen</button>
      </form>
    </div>
  );
}
