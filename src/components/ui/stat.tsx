import type { ReactNode } from "react";

export function Stat({ label, value, sub, tone = "ice", size = "md", className = "" }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: "ice" | "cobalt" | "orchid" | "coral" | "amber" | "muted"; size?: "sm" | "md" | "lg"; className?: string }) {
  const color = { ice: "text-ice", cobalt: "text-cobalt-soft", orchid: "text-orchid-soft", coral: "text-coral-soft", amber: "text-amber", muted: "text-muted" }[tone];
  const sz = { sm: "text-xl", md: "text-3xl", lg: "text-5xl" }[size];
  return (
    <div className={className}>
      <p className="t-eyebrow">{label}</p>
      <p className={`t-num font-semibold leading-none mt-1.5 ${sz} ${color}`}>{value}</p>
      {sub && <p className="t-sub mt-1.5">{sub}</p>}
    </div>
  );
}
