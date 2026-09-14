import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { dfLocale, type Locale } from "./i18n";

const nf0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 });

export function fmtNum(v: number | null | undefined, decimals?: number): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  if (decimals === 0) return nf0.format(v);
  if (decimals === 1) return nf1.format(v);
  if (decimals === 2) return nf2.format(v);
  const abs = Math.abs(v);
  if (Number.isInteger(v) || abs >= 1000) return nf0.format(v);
  return abs < 10 ? nf2.format(v) : nf1.format(v);
}

export function fmtValue(v: number | null | undefined, unit: string, opts?: { compact?: boolean }): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  const u = unit.trim();
  if (u === "€") {
    if (opts?.compact && Math.abs(v) >= 1_000_000) return `€ ${nf2.format(v / 1_000_000).replace(/,00$/, "")} mln`;
    if (opts?.compact && Math.abs(v) >= 10_000) return `€ ${nf0.format(Math.round(v / 1000))}k`;
    return `€ ${fmtNum(v)}`;
  }
  if (u === "%") return `${fmtNum(v)}%`;
  if (u === "x") return `${fmtNum(v)}x`;
  if (u === "") return fmtNum(v);
  return `${fmtNum(v)} ${u}`;
}

export function fmtCompact(v: number, unit: string): string {
  return fmtValue(v, unit, { compact: true });
}

export function fmtDate(iso: string | Date | null | undefined, pattern = "d MMM yyyy", locale: Locale = "nl"): string {
  if (!iso) return "–";
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return format(d, pattern, { locale: dfLocale(locale) });
}

export function fmtRelative(iso: string | Date, locale: Locale = "nl"): string {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return formatDistanceToNowStrict(d, { addSuffix: true, locale: dfLocale(locale) });
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function clamp(n: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, n));
}
