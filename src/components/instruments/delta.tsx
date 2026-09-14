import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { fmtNum } from "@/lib/format";

export function Delta({ value, unit = "", higherBetter = true, suffix = "" }: { value: number | null; unit?: string; higherBetter?: boolean; suffix?: string }) {
  if (value === null || Number.isNaN(value)) return <span className="text-muted t-num text-xs">–</span>;
  const good = value === 0 ? null : (value > 0) === higherBetter;
  const Icon = value === 0 ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  const color = good === null ? "text-muted" : good ? "text-cobalt-soft" : "text-coral-soft";
  const label = unit === "%" ? `${fmtNum(Math.abs(value), 1)} pt` : unit === "€" ? `€ ${fmtNum(Math.abs(value))}` : `${fmtNum(Math.abs(value))}${unit ? " " + unit : ""}`;
  return (
    <span className={`inline-flex items-center gap-0.5 t-num text-xs font-semibold ${color}`}>
      <Icon className="size-3" aria-hidden />
      {value > 0 ? "+" : value < 0 ? "−" : ""}
      {label}
      {suffix && <span className="text-muted font-normal ml-0.5">{suffix}</span>}
    </span>
  );
}
