import type { ReactNode } from "react";
import type { Tone } from "@/lib/status";
import { ClayIcon, type IconName } from "@/components/icons";

/** Compacte tegel met kleurvlak, icoon en één getal in gewone taal. */
export function Tile({ label, value, sub, tone = "blue", icon, className = "" }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: Tone; icon?: IconName; className?: string }) {
  const bg = { blue: "soft-sky", purple: "soft-lavender", mint: "soft-mint", yellow: "soft-butter", coral: "soft-peach", grey: "soft-cloud" }[tone];
  return (
    <div className={`tile ${bg} p-4 flex items-start gap-3 ${className}`}>
      {icon && <ClayIcon name={icon} tone={tone} size="md" className="bg-white/80" />}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-2 leading-tight">{label}</p>
        <p className="font-display font-extrabold text-2xl leading-none mt-1 text-ink">{value}</p>
        {sub && <p className="text-xs t-muted mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, className = "" }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: string; size?: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-sm font-semibold text-ink-2">{label}</p>
      <p className="font-display font-extrabold text-2xl leading-tight mt-0.5">{value}</p>
      {sub && <p className="text-xs t-muted mt-0.5">{sub}</p>}
    </div>
  );
}
