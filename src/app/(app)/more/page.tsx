import Link from "next/link";
import { NAV } from "@/components/shell/nav";
import { getSession } from "@/lib/data/session";
import { Avatar } from "@/components/ui";
import { ClayIcon } from "@/components/icons";
import { signOut } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/status";

export const metadata = { title: "Meer" };

export default async function MorePage() {
  const { profile } = await getSession();
  return (
    <div className="max-w-md pt-4">
      <Link href={`/people/${profile.id}`} className="card p-4 flex items-center gap-3 mb-4">
        <Avatar name={profile.full_name} src={profile.avatar_url} size="lg" ring />
        <span><span className="block font-bold text-lg">{profile.full_name}</span><span className="block text-sm t-muted">{ROLE_LABELS[profile.role]} · {profile.job_title}</span></span>
      </Link>
      <ul className="card divide-y divide-line overflow-hidden">
        {NAV.map((n) => (
          <li key={n.href}><Link href={n.href} className="press flex items-center gap-3 px-4 py-3 font-semibold hover:bg-cloud"><ClayIcon name={n.icon} tone={n.tone} size="sm" /> {n.label}</Link></li>
        ))}
      </ul>
      <form action={signOut} className="mt-4"><button type="submit" className="text-sm t-muted hover:text-coral-deep font-semibold">Uitloggen</button></form>
    </div>
  );
}
