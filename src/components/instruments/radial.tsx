import { clamp } from "@/lib/format";

/** Radiale voortgang met een tweede (dunne) ring voor het verwachte tempo. */
export function Radial({
  value,
  expected,
  size = 96,
  stroke = 8,
  tone = "cobalt",
  label,
  children,
}: {
  value: number;
  expected?: number;
  size?: number;
  stroke?: number;
  tone?: "cobalt" | "orchid" | "coral" | "amber" | "muted";
  label?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = clamp(value, 0, 1);
  const color = { cobalt: "#496CFF", orchid: "#9567E8", coral: "#FF715B", amber: "#F2B84B", muted: "#8A97B8" }[tone];
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(232,240,255,0.08)" strokeWidth={stroke} fill="none" />
        {expected !== undefined && (
          <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(232,240,255,0.35)" strokeWidth={1.5} fill="none" strokeDasharray={`${clamp(expected, 0, 1) * c} ${c}`} strokeLinecap="round" />
        )}
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={`${v * c} ${c}`} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: "stroke-dasharray 700ms cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
