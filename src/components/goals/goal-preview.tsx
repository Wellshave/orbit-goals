"use client";

import { Flag } from "lucide-react";
import { ClayIcon, ICONS, TONE_STYLE, type IconName } from "@/components/icons";
import { FORMAT_META } from "@/lib/goals/formats";
import { parseDuration, parseNumber, trackFor, type Draft } from "@/lib/goals/draft";
import { useT } from "@/lib/i18n/client";

type Pt = { x: number; y: number };
const SEG: [Pt, Pt, Pt, Pt][] = [
  [{ x: 14, y: 96 }, { x: 84, y: 102 }, { x: 80, y: 36 }, { x: 160, y: 48 }],
  [{ x: 160, y: 48 }, { x: 240, y: 60 }, { x: 250, y: 90 }, { x: 306, y: 24 }],
];
function bez(p: [Pt, Pt, Pt, Pt], u: number): Pt {
  const v = 1 - u;
  return { x: v * v * v * p[0].x + 3 * v * v * u * p[1].x + 3 * v * u * u * p[2].x + u * u * u * p[3].x, y: v * v * v * p[0].y + 3 * v * v * u * p[1].y + 3 * v * u * u * p[2].y + u * u * u * p[3].y };
}
/** Punt op de route voor een fractie 0..1 (pure rekensom, dus identiek op server en client). */
function onRoute(f: number): Pt {
  const c = Math.min(1, Math.max(0, f));
  return c <= 0.5 ? bez(SEG[0], c * 2) : bez(SEG[1], (c - 0.5) * 2);
}
const PATH = `M${SEG[0][0].x},${SEG[0][0].y} C${SEG[0][1].x},${SEG[0][1].y} ${SEG[0][2].x},${SEG[0][2].y} ${SEG[0][3].x},${SEG[0][3].y} C${SEG[1][1].x},${SEG[1][1].y} ${SEG[1][2].x},${SEG[1][2].y} ${SEG[1][3].x},${SEG[1][3].y}`;

/** Live voorbeeld van het doel: icoon, titel, route met milestones als routepunten en de samenvatting in gewone taal. */
export function GoalPreview({ draft, lines, target }: { draft: Draft; lines: string[]; target: number | null }) {
  const t = useT();
  const meta = draft.format ? FORMAT_META[draft.format] : { icon: "sparkles" as IconName, tone: "blue" as const };
  const icon = (draft.icon && draft.icon in ICONS ? draft.icon : meta.icon) as IconName;
  const hex = TONE_STYLE[meta.tone].hex;
  const track = trackFor(draft);
  const named = draft.milestones.filter((m) => m.name.trim());
  const isTime = draft.format === "improvement" && draft.valueKind === "time";
  const points = named.slice(0, 8).map((m, i) => {
    let f = (i + 1) / (named.length + (track === "steps" ? 0 : 1));
    if ((track === "value" || track === "count") && target && target > 0 && !isTime) {
      const v = parseNumber(m.value);
      if (!Number.isNaN(v)) f = Math.min(1, Math.max(0.04, v / target));
    }
    if (isTime) { const v = parseDuration(m.value); if (!Number.isNaN(v)) f = (i + 1) / (named.length + 1); }
    return { ...onRoute(f), name: m.name };
  });
  const end = onRoute(1);
  return (
    <div className="card-lift p-5 overflow-hidden" data-tour="wizard-summary" style={{ background: `linear-gradient(160deg,#FFFFFF 40%, color-mix(in oklab, ${hex} 14%, white))` }}>
      <p className="t-label mb-3">{t("wizard.preview")}</p>
      <div className="flex items-start gap-3">
        <ClayIcon name={icon} tone={meta.tone} size="lg" />
        <div className="min-w-0">
          <p className="font-display font-extrabold text-lg leading-snug break-words">{draft.title.trim() || t("wizard.summary.untitled")}</p>
          <p className="text-xs t-muted mt-0.5">{draft.format ? t(`goalFormat.${draft.format}.name`) : t("wizard.pickFormat")}{draft.category ? ` · ${draft.category}` : ""}</p>
        </div>
      </div>
      <svg viewBox="0 0 320 120" className="w-full mt-3" role="img" aria-label={t("wizard.routeAria", { n: named.length })}>
        <path d={PATH} fill="none" stroke="#E6EAF5" strokeWidth="14" strokeLinecap="round" />
        <path d={PATH} fill="none" stroke={hex} strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 9" />
        <circle cx={SEG[0][0].x} cy={SEG[0][0].y} r="6" fill="#fff" stroke={hex} strokeWidth="3" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="7.5" fill="#fff" stroke={hex} strokeWidth="3" />
            <text x={p.x} y={p.y + 3.2} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#172033">{i + 1}</text>
          </g>
        ))}
        <g transform={`translate(${end.x - 9},${end.y - 20})`}><circle cx="9" cy="20" r="9" fill={hex} /><Flag x={2.5} y={13.5} width={13} height={13} color="#fff" strokeWidth={2.5} /></g>
      </svg>
      <ul className="mt-2 flex flex-col gap-1.5 text-sm" aria-live="polite">
        {lines.map((l, i) => <li key={i} className={i === 0 ? "font-semibold text-ink" : "text-ink-2"}>{l}</li>)}
      </ul>
    </div>
  );
}
