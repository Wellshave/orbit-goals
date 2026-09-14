import { initials } from "@/lib/format";

const sizes = { xs: "size-6 text-[0.625rem]", sm: "size-8 text-xs", md: "size-11 text-sm", lg: "size-14 text-base", xl: "size-24 text-2xl" };
const palette = ["bg-sky text-blue-deep", "bg-lavender text-purple-deep", "bg-mintsoft text-mint-deep", "bg-butter text-yellow-deep", "bg-peach text-coral-deep"];

function hue(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return palette[h % palette.length];
}

export function Avatar({ name, src, size = "md", className = "", ring = false }: { name: string; src?: string | null; size?: keyof typeof sizes; className?: string; ring?: boolean }) {
  const cls = `${sizes[size]} rounded-full shrink-0 overflow-hidden grid place-items-center font-bold ${hue(name)} shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_-2px_rgba(23,32,51,0.25)] ${ring ? "ring-[3px] ring-white" : ""} ${className}`;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`${cls} object-cover`} />;
  }
  return (
    <span className={cls} role="img" aria-label={name}>
      {initials(name) || "?"}
    </span>
  );
}

export function AvatarStack({ people, max = 4, size = "xs" }: { people: { id: string; full_name: string; avatar_url: string | null }[]; max?: number; size?: keyof typeof sizes }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="inline-flex items-center -space-x-2">
      {shown.map((p) => (
        <Avatar key={p.id} name={p.full_name} src={p.avatar_url} size={size} className="ring-2 ring-white" />
      ))}
      {rest > 0 && <span className={`${sizes[size]} rounded-full grid place-items-center bg-cloud text-ink-2 ring-2 ring-white font-semibold`}>+{rest}</span>}
    </span>
  );
}
