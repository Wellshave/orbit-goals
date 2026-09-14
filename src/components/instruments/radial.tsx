import { clamp } from "@/lib/format";

export function Radial({ value, size = 96, stroke = 10, tone = "blue", label, children }: { value: number; expected?: number; size?: number; stroke?: number; tone?: "blue" | "purple" | "mint" | "yellow" | "coral" | "grey"; label?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = clamp(value, 0, 1);
  const color = { blue: "#5B6CFF", purple: "#9B72F2", mint: "#48CFAE", yellow: "#F6C85F", coral: "#FF7B6B", grey: "#98A2B3" }[tone];
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#EEF1F7" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={`${v * c} ${c}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 800ms cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
