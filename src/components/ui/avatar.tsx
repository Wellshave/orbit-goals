import { initials } from "@/lib/format";

const sizes = { xs: "size-6 text-[0.625rem]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-base", xl: "size-24 text-2xl" };

export function Avatar({
  name,
  src,
  size = "md",
  className = "",
  ring = false,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
  ring?: boolean;
}) {
  const cls = `${sizes[size]} rounded-full shrink-0 overflow-hidden grid place-items-center font-semibold bg-midnight-3 text-ice-dim border border-line-strong ${
    ring ? "ring-2 ring-cobalt/60 ring-offset-2 ring-offset-ink" : ""
  } ${className}`;
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
    <span className="inline-flex items-center -space-x-1.5">
      {shown.map((p) => (
        <Avatar key={p.id} name={p.full_name} src={p.avatar_url} size={size} className="ring-2 ring-midnight" />
      ))}
      {rest > 0 && (
        <span className={`${sizes[size]} rounded-full grid place-items-center bg-ink-deep text-muted ring-2 ring-midnight font-medium`}>+{rest}</span>
      )}
    </span>
  );
}
