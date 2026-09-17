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

/** Interne eenheid voor tijdsdoelen: de waarde is een aantal seconden en wordt als u:mm:ss getoond. */
export const TIME_UNIT = "time";

export function fmtDuration(totalSeconds: number): string {
  const neg = totalSeconds < 0;
  const s = Math.round(Math.abs(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const body = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
  return neg ? `-${body}` : body;
}

export function toSeconds(h: number | string, m: number | string, s: number | string): number {
  const n = (x: number | string) => { const v = Number(String(x).replace(",", ".")); return Number.isFinite(v) && v > 0 ? v : 0; };
  return Math.round(n(h) * 3600 + n(m) * 60 + n(s));
}

export function splitSeconds(total: number | null | undefined): { h: string; m: string; s: string } {
  if (!total || total <= 0) return { h: "", m: "", s: "" };
  const t = Math.round(total);
  return { h: String(Math.floor(t / 3600)), m: String(Math.floor((t % 3600) / 60)), s: String(t % 60) };
}

export function fmtValue(v: number | null | undefined, unit: string, opts?: { compact?: boolean }): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  const u = unit.trim();
  if (u === TIME_UNIT) return fmtDuration(v);
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
