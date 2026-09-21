"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Gift, Flag, Check, Star } from "lucide-react";
import type { Goal, Milestone, Profile, Reward } from "@/lib/types";
import { goalProgress, milestonePosition } from "@/lib/status";
import { clamp, fmtCompact, fmtDate, fmtValue } from "@/lib/format";
import { Avatar } from "@/components/ui";
import { explainMilestone, nextMilestone } from "@/lib/explain";
import { useLocale, useT } from "@/lib/i18n/client";

/**
 * Progress Path — een doel als reis. Zachte S-route, gekleurde milestones,
 * profielfoto's van recente bijdragers bij de huidige positie, vlag als finish,
 * rewards als cadeautjes, gloed rond de volgende milestone en een pulse bij nieuwe voortgang.
 */
export function ProgressPath({ goal, milestones, rewards = [], contributors = [], lastUpdateAt, href, compact = false, accent = "#5B6CFF", caption = true }: {
  goal: Goal; milestones: Milestone[]; rewards?: Reward[]; contributors?: Profile[]; lastUpdateAt?: string | null; href?: string; compact?: boolean; accent?: string;
  /** Uitleg onder het pad; uit wanneer de omringende compositie dezelfde zin al toont. */
  caption?: boolean;
}) {
  const reduce = useReducedMotion();
  const t = useT();
  const locale = useLocale();
  const [selected, setSelected] = useState<Milestone | null>(null);
  const [seen, setSeen] = useState(lastUpdateAt);
  const [pulseKey, setPulseKey] = useState(0);
  if (lastUpdateAt !== seen) { setSeen(lastUpdateAt); setPulseKey((k) => k + 1); }

  const W = 760, H = compact ? 150 : 210;
  const p = clamp(goalProgress(goal), 0, 1);
  // Zachte golvende route: twee cubic béziers, puur wiskundig zodat server en client gelijk renderen.
  const geo = useMemo(() => {
    const P0 = [40, H * 0.62], C1 = [W * 0.22, H * 0.62], C2 = [W * 0.25, H * 0.28], P1 = [W * 0.45, H * 0.32];
    const C3 = [2 * P1[0] - C2[0], 2 * P1[1] - C2[1]], C4 = [W * 0.7, H * 0.72], P2 = [W - 60, H * 0.5];
    const d = `M ${P0[0]} ${P0[1]} C ${C1[0]} ${C1[1]}, ${C2[0]} ${C2[1]}, ${P1[0]} ${P1[1]} C ${C3[0]} ${C3[1]}, ${C4[0]} ${C4[1]}, ${P2[0]} ${P2[1]}`;
    const bez = (a: number[], b: number[], c: number[], e: number[], t: number) => {
      const u = 1 - t;
      return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * e[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * e[1]];
    };
    const pts: number[][] = [];
    for (let i = 0; i <= 80; i++) pts.push(bez(P0, C1, C2, P1, i / 80));
    for (let i = 1; i <= 80; i++) pts.push(bez(P1, C3, C4, P2, i / 80));
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = cum[cum.length - 1];
    const pointAt = (t: number) => {
      const target = clamp(t, 0, 1) * total;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < target) i++;
      const seg = cum[i] - cum[i - 1] || 1;
      const f = (target - cum[i - 1]) / seg;
      return { x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f };
    };
    return { d, pointAt, start: P0 };
  }, [W, H]);
  const { d, pointAt } = geo;
  const sorted = useMemo(() => [...milestones].sort((a, b) => milestonePosition(goal, a.target_value) - milestonePosition(goal, b.target_value)), [milestones, goal]);
  const next = nextMilestone(goal, milestones);
  const done = goal.status === "achieved";
  const cur = pointAt(p);

  return (
    <div className="scene w-full" data-tour="progress-path">
      <div className="relative w-full overflow-visible">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible" role="img" aria-label={t("path.progressAria", { p: Math.round(p * 100), g: goal.title })}>
          <defs>
            <linearGradient id="pp-fill" x1="0" x2="1"><stop offset="0" stopColor={accent} /><stop offset="1" stopColor="#9B72F2" /></linearGradient>
            <filter id="pp-shadow" x="-20%" y="-50%" width="140%" height="220%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#172033" floodOpacity="0.14" /></filter>
          </defs>
          {/* schaduw-laag voor diepte */}
          <path d={d} fill="none" stroke="rgba(23,32,51,0.06)" strokeWidth={22} strokeLinecap="round" transform="translate(0 10)" />
          {/* route */}
          <path d={d} fill="none" stroke="#E6E9F2" strokeWidth={18} strokeLinecap="round" />
          <motion.path d={d} fill="none" stroke="url(#pp-fill)" strokeWidth={18} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: p }} transition={{ duration: reduce ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }} />
          {/* start */}
          <circle cx={geo.start[0]} cy={geo.start[1]} r={9} fill="#fff" stroke={accent} strokeWidth={4} />
          {/* milestones */}
          {sorted.map((m) => {
            const pos = milestonePosition(goal, m.target_value);
            const pt = pointAt(pos);
            const achieved = m.status === "achieved";
            const isNext = next?.id === m.id;
            const reward = rewards.find((r) => r.milestone_id === m.id);
            return (
              <g key={m.id} transform={`translate(${pt.x} ${pt.y})`} className="cursor-pointer" onClick={() => setSelected(selected?.id === m.id ? null : m)} role="button" aria-label={t("path.milestoneAria", { m: m.name, s: achieved ? t("path.achievedShort") : t("path.openShort") })} tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(selected?.id === m.id ? null : m)}>
                {isNext && !done && <circle r={30} fill={accent} opacity={0.18} className={reduce ? "" : "glow"} style={{ transformOrigin: "center", transformBox: "fill-box" }} />}
                {m.is_ultimate ? (
                  <g filter="url(#pp-shadow)">
                    <circle r={22} fill={achieved ? "#48CFAE" : "#fff"} stroke={achieved ? "#2FAE90" : "#F6C85F"} strokeWidth={4} />
                    <Flag x={-11} y={-11} width={22} height={22} color={achieved ? "#fff" : "#D9A63A"} strokeWidth={2.5} />
                  </g>
                ) : (
                  <g filter="url(#pp-shadow)">
                    <circle r={16} fill={achieved ? "#48CFAE" : "#fff"} stroke={achieved ? "#2FAE90" : isNext ? accent : "#C9CFDB"} strokeWidth={4} />
                    {achieved ? <Check x={-8} y={-8} width={16} height={16} color="#fff" strokeWidth={3} /> : <Star x={-8} y={-8} width={16} height={16} color={isNext ? accent : "#98A2B3"} strokeWidth={2.5} />}
                  </g>
                )}
                {reward && (
                  <g transform="translate(14 -22)">
                    <circle r={11} fill="#FFF1CF" stroke="#fff" strokeWidth={2} />
                    <Gift x={-6} y={-6} width={12} height={12} color="#D9A63A" strokeWidth={2.5} />
                  </g>
                )}
                <text y={m.is_ultimate ? 40 : 34} textAnchor="middle" className="fill-ink" style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)" }}>{fmtCompact(m.target_value, goal.unit)}</text>
                {!compact && <text y={m.is_ultimate ? 56 : 50} textAnchor="middle" fill="#667085" style={{ fontSize: 11 }}>{m.name.length > 18 ? m.name.slice(0, 18) + "…" : m.name}</text>}
              </g>
            );
          })}
          {/* huidige positie met bijdragers */}
          <g transform={`translate(${cur.x} ${cur.y})`}>
            <motion.circle key={pulseKey} r={14} fill={accent} opacity={0.35} initial={pulseKey > 0 && !reduce ? { scale: 1, opacity: 0.5 } : { opacity: 0 }} animate={pulseKey > 0 && !reduce ? { scale: 3.2, opacity: 0 } : { opacity: 0 }} transition={{ duration: 1.1, ease: "easeOut" }} style={{ transformOrigin: "center", transformBox: "fill-box" }} />
            <circle r={13} fill={accent} stroke="#fff" strokeWidth={4} filter="url(#pp-shadow)" />
          </g>
        </svg>
        {contributors.length > 0 && (
          <div className="absolute flex -space-x-2 pointer-events-none" style={{ left: `calc(${((cur.x / W) * 100).toFixed(2)}% - ${Math.min(contributors.length, 3) * 12}px)`, top: cur.y > 70 ? `calc(${((cur.y / H) * 100).toFixed(2)}% - 46px)` : `calc(${((cur.y / H) * 100).toFixed(2)}% + 16px)` }} aria-hidden>
            {contributors.slice(0, 3).map((c) => (
              <Avatar key={c.id} name={c.full_name} src={c.avatar_url} size="sm" ring />
            ))}
          </div>
        )}
      </div>
      <div className={`mt-2 ${caption || selected ? "min-h-[3.5rem]" : ""}`} aria-live="polite">
        {selected ? (
          <div className="tile bg-white p-3 flex items-start gap-3 shadow-[var(--shadow-card)]">
            <span className={`clay size-9 ${selected.status === "achieved" ? "bg-mintsoft text-mint-deep" : "bg-butter text-yellow-deep"}`}>{selected.status === "achieved" ? <Check className="size-4" /> : <Star className="size-4" />}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm">{selected.name} <span className="t-muted font-medium">· {fmtValue(selected.target_value, goal.unit)}</span></p>
              <p className="text-xs t-muted mt-0.5">{selected.status === "achieved" ? t("path.achievedOn", { d: fmtDate(selected.achieved_at, "d MMM yyyy", locale) }) : selected.target_date ? t("path.targetDate", { d: fmtDate(selected.target_date, "d MMM yyyy", locale) }) : t("path.noDate")}{selected.description ? ` · ${selected.description}` : ""}</p>
              {rewards.find((r) => r.milestone_id === selected.id) && (
                <p className="text-xs mt-1 inline-flex items-center gap-1.5 text-yellow-deep font-semibold"><Gift className="size-3.5" aria-hidden /> {rewards.find((r) => r.milestone_id === selected.id)!.title}</p>
              )}
            </div>
            <button type="button" onClick={() => setSelected(null)} className="text-xs font-semibold t-muted hover:text-ink">{t("path.close")}</button>
          </div>
        ) : !caption ? null : (
          <p className="text-sm t-muted">
            {done ? t("path.allDone") : explainMilestone(t, goal, next) ?? t("path.noMilestones")}
            {href && <> <Link href={href} className="font-semibold text-blue-deep hover:underline">{t("path.openGoal")}</Link></>}
          </p>
        )}
      </div>
    </div>
  );
}
