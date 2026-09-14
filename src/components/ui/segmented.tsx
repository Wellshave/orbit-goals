import Link from "next/link";

export function Segmented<T extends string>({ options, value, hrefFor, ariaLabel }: { options: { value: T; label: string }[]; value: T; hrefFor: (v: T) => string; ariaLabel: string }) {
  return (
    <nav aria-label={ariaLabel} className="inline-flex p-1 gap-1 rounded-full bg-cloud max-w-full overflow-x-auto">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Link key={o.value} href={hrefFor(o.value)} aria-current={active ? "true" : undefined} className={`press px-3.5 py-1.5 text-sm font-semibold rounded-full whitespace-nowrap ${active ? "bg-white text-ink shadow-[var(--shadow-press)]" : "text-ink-2 hover:text-ink"}`}>
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
