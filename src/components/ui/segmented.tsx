import Link from "next/link";

export function Segmented<T extends string>({ options, value, hrefFor, ariaLabel }: { options: { value: T; label: string }[]; value: T; hrefFor: (v: T) => string; ariaLabel: string }) {
  return (
    <nav aria-label={ariaLabel} className="well inline-flex p-0.5 gap-0.5 max-w-full overflow-x-auto">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Link
            key={o.value}
            href={hrefFor(o.value)}
            aria-current={active ? "true" : undefined}
            className={`px-3 py-1.5 text-[0.8125rem] font-semibold rounded-[4px] whitespace-nowrap transition-colors ${
              active ? "bg-midnight-3 text-ice shadow-[inset_0_1px_0_rgba(232,240,255,0.1)]" : "text-muted hover:text-ice"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
