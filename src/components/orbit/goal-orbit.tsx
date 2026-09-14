"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Gift, Star, Check } from "lucide-react";
import type { Goal, Milestone, Profile, Reward } from "@/lib/types";
import { goalExpected, goalProgress, milestonePosition, STATUS_META } from "@/lib/status";
import { clamp, fmtCompact, fmtDate, fmtValue, pct } from "@/lib/format";
import { Avatar } from "@/components/ui";

/**
 * Goal Orbit — de visuele handtekening.
 * Een doel als ruimtelijk object: centrale core (huidige waarde), milestone-ringen,
 * nodes voor verantwoordelijke teamleden op een buitenste baan, een voortgangsboog
 * en een verwachte-tempo markering. CSS 3D (perspective + rotateX) met parallax op
 * muisbeweging. Geen WebGL: stabiel, licht en toegankelijk (alle info ook als tekst).
 */
export function GoalOrbit({
  goal,
  milestones,
  rewards = [],
  people,
  lastUpdateAt,
  size = 420,
  interactive = true,
  href,
}: {
  goal: Goal;
  milestones: Milestone[];
  rewards?: Reward[];
  people: (Profile & { orbitRole?: string })[];
  lastUpdateAt?: string | null;
  size?: number;
  interactive?: boolean;
  href?: string;
}) {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<{ kind: "milestone"; m: Milestone } | { kind: "person"; p: Profile } | null>(null);
  const [pulseKey, setPulseKey] = useState(0);

  const progress = clamp(goalProgress(goal), 0, 1);
  const expected = goalExpected(goal);
  const sorted = useMemo(() => [...milestones].sort((a, b) => a.sort_order - b.sort_order || a.target_value - b.target_value), [milestones]);
  const cx = size / 2;
  const cy = size / 2;
  const coreR = size * 0.155;
  const arcR = size * 0.235;
  const ringBase = size * 0.29;
  const ringStep = sorted.length ? (size * 0.44 - ringBase) / Math.max(1, sorted.length) : 0;
  const peopleR = size * 0.475;

  // Pulse bij nieuwe voortgang (state aanpassen tijdens render, geen effect nodig)
  const [seenUpdate, setSeenUpdate] = useState(lastUpdateAt);
  if (lastUpdateAt !== seenUpdate) {
    setSeenUpdate(lastUpdateAt);
    if (seenUpdate !== undefined) setPulseKey((k) => k + 1);
  }

  function onMove(e: React.MouseEvent) {
    if (!interactive || reduce || !wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: py * -10, y: px * 12 });
  }

  const arcLen = 2 * Math.PI * arcR;
  const tone = STATUS_META[goal.status].tone;
  const arcColor = { cobalt: "#496CFF", orchid: "#9567E8", coral: "#FF715B", amber: "#F2B84B", muted: "#8A97B8" }[tone] ?? "#496CFF";

  // Positie op een cirkel (start bovenaan, met de klok mee)
  const pos = (frac: number, r: number) => {
    const a = -Math.PI / 2 + frac * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };

  return (
    <div className="orbit-scene w-full" ref={wrap} onMouseMove={onMove} onMouseLeave={() => setTilt({ x: 0, y: 0 })}>
      <motion.div
        className="orbit-plane relative mx-auto"
        style={{ width: size, height: size, maxWidth: "100%" }}
        animate={{ rotateX: 52 + tilt.x, rotateZ: tilt.y * 0.4 }}
        transition={{ type: "spring", stiffness: 60, damping: 18 }}
      >
        {/* Grondschaduw voor diepte */}
        <div aria-hidden className="absolute inset-[8%] rounded-full" style={{ background: "radial-gradient(circle, rgba(73,108,255,0.18), rgba(11,16,32,0) 65%)", filter: "blur(18px)", transform: "translateZ(-40px)" }} />

        {/* Milestone-ringen */}
        {sorted.map((m, i) => {
          const r = ringBase + ringStep * i;
          const done = m.status === "achieved";
          const isSel = selected?.kind === "milestone" && selected.m.id === m.id;
          const p = pos(milestonePosition(goal, m.target_value), r);
          return (
            <div key={m.id} className="absolute inset-0" style={{ transform: `translateZ(${(i + 1) * 6}px)` }}>
              <svg className="absolute inset-0 overflow-visible" width={size} height={size} aria-hidden>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={done ? "rgba(149,103,232,0.55)" : "rgba(232,240,255,0.14)"} strokeWidth={done ? 1.5 : 1} strokeDasharray={done ? undefined : "3 5"} />
                {isSel && <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(232,240,255,0.5)" strokeWidth={2} />}
              </svg>
              <button
                type="button"
                onClick={() => interactive && setSelected(isSel ? null : { kind: "milestone", m })}
                className={`absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full border transition-transform hover:scale-110 focus-visible:scale-110 ${
                  done ? "bg-orchid border-orchid-soft text-white" : m.is_ultimate ? "bg-ink-deep border-orchid text-orchid-soft" : "bg-ink-deep border-ice/60 text-ice"
                } ${isSel ? "ring-2 ring-ice/70 ring-offset-2 ring-offset-ink" : ""}`}
                style={{ left: p.x, top: p.y, width: m.is_ultimate ? 30 : 22, height: m.is_ultimate ? 30 : 22, transform: `translate(-50%,-50%) rotateX(-52deg)`, boxShadow: done ? "0 0 18px rgba(149,103,232,0.7)" : "0 4px 10px rgba(0,0,0,0.5)" }}
                aria-label={`Milestone ${m.name} (${fmtCompact(m.target_value, goal.unit)}), ${done ? "behaald" : "open"}`}
                aria-pressed={isSel}
              >
                {done ? <Check className="size-3" /> : m.is_ultimate ? <Star className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
              </button>
            </div>
          );
        })}

        {/* Buitenste baan: teamleden */}
        <div className="absolute inset-0" style={{ transform: `translateZ(${(sorted.length + 2) * 6}px)` }}>
          <svg className="absolute inset-0 overflow-visible" width={size} height={size} aria-hidden>
            <circle cx={cx} cy={cy} r={peopleR} fill="none" stroke="rgba(232,240,255,0.07)" strokeWidth={1} />
          </svg>
          {people.map((p, i) => {
            const frac = people.length === 1 ? 0.5 : (i + 0.5) / people.length;
            const q = pos(frac, peopleR);
            const isSel = selected?.kind === "person" && selected.p.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => interactive && setSelected(isSel ? null : { kind: "person", p })}
                className={`absolute rounded-full transition-transform hover:scale-110 focus-visible:scale-110 ${isSel ? "ring-2 ring-cobalt ring-offset-2 ring-offset-ink" : ""}`}
                style={{ left: q.x, top: q.y, transform: "translate(-50%,-50%) rotateX(-52deg)" }}
                aria-label={`${p.full_name}${p.orbitRole ? `, ${p.orbitRole}` : ""}`}
                aria-pressed={isSel}
              >
                <Avatar name={p.full_name} src={p.avatar_url} size="sm" className="shadow-[0_6px_14px_rgba(0,0,0,0.6)]" />
              </button>
            );
          })}
        </div>

        {/* Voortgangsboog */}
        <svg className="absolute inset-0 overflow-visible" width={size} height={size} aria-hidden style={{ transform: "translateZ(4px)" }}>
          <circle cx={cx} cy={cy} r={arcR} fill="none" stroke="rgba(232,240,255,0.1)" strokeWidth={size * 0.028} />
          {/* verwacht tempo */}
          {goal.status !== "achieved" && (
            <circle cx={cx} cy={cy} r={arcR} fill="none" stroke="rgba(232,240,255,0.45)" strokeWidth={1.5} strokeDasharray={`${expected * arcLen} ${arcLen}`} transform={`rotate(-90 ${cx} ${cy})`} />
          )}
          <motion.circle
            cx={cx}
            cy={cy}
            r={arcR}
            fill="none"
            stroke={arcColor}
            strokeWidth={size * 0.028}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            initial={{ strokeDasharray: `0 ${arcLen}` }}
            animate={{ strokeDasharray: `${progress * arcLen} ${arcLen}` }}
            transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: `drop-shadow(0 0 10px ${arcColor}99)` }}
          />
        </svg>

        {/* Core */}
        <div className="absolute" style={{ left: cx, top: cy, transform: "translate(-50%,-50%) translateZ(30px) rotateX(-52deg)" }}>
          <motion.div
            key={pulseKey}
            initial={pulseKey > 0 && !reduce ? { boxShadow: "0 0 0 0 rgba(73,108,255,0.7)" } : false}
            animate={pulseKey > 0 && !reduce ? { boxShadow: "0 0 0 34px rgba(73,108,255,0)" } : {}}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="rounded-full grid place-items-center text-center"
            style={{
              width: coreR * 2,
              height: coreR * 2,
              background: `radial-gradient(circle at 35% 30%, ${goal.status === "achieved" ? "#B391F2" : "#6F8BFF"}, ${goal.status === "achieved" ? "#9567E8" : "#496CFF"} 45%, #17213D 100%)`,
              boxShadow: "0 22px 50px -14px rgba(73,108,255,0.7), inset 0 -10px 24px rgba(11,16,32,0.6), inset 0 2px 4px rgba(255,255,255,0.35)",
            }}
          >
            <div>
              <p className="t-num font-bold leading-none" style={{ fontSize: Math.max(14, coreR * 0.34) }}>{pct(progress)}</p>
              <p className="t-num text-[0.625rem] text-ice/80 mt-1 leading-tight px-2">{fmtCompact(goal.current_value, goal.unit)}</p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Details van selectie */}
      <div className="mt-2 min-h-[4.5rem]" aria-live="polite">
        {selected?.kind === "milestone" && <MilestoneDetail goal={goal} m={selected.m} reward={rewards.find((r) => r.milestone_id === selected.m.id)} />}
        {selected?.kind === "person" && (
          <div className="deck-raised p-3 flex items-center gap-3">
            <Avatar name={selected.p.full_name} src={selected.p.avatar_url} size="md" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{selected.p.full_name}</p>
              <p className="text-xs text-muted truncate">{selected.p.job_title || selected.p.email}{(selected.p as Profile & { orbitRole?: string }).orbitRole ? ` · ${(selected.p as Profile & { orbitRole?: string }).orbitRole}` : ""}</p>
            </div>
            <Link href={`/people/${selected.p.id}`} className="text-xs font-semibold text-cobalt-soft hover:underline">Profiel</Link>
          </div>
        )}
        {!selected && (
          <p className="text-center text-xs text-muted">
            {interactive ? "Selecteer een milestone of teamlid voor details." : ""}
            {href && (
              <>
                {" "}
                <Link href={href} className="text-cobalt-soft font-semibold hover:underline">Open doel</Link>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function MilestoneDetail({ goal, m, reward }: { goal: Goal; m: Milestone; reward?: Reward }) {
  const done = m.status === "achieved";
  return (
    <div className="deck-raised p-3 flex items-start gap-3">
      <span className={`grid place-items-center size-9 rounded-full shrink-0 ${done ? "bg-orchid text-white" : "border border-line-strong text-muted"}`} aria-hidden>
        {done ? <Check className="size-4" /> : m.is_ultimate ? <Star className="size-4" /> : <span className="t-num text-xs">{Math.round(milestonePosition(goal, m.target_value) * 100)}%</span>}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm">
          {m.name} <span className="t-num text-muted font-normal">· {fmtValue(m.target_value, goal.unit)}</span>
        </p>
        <p className="text-xs text-muted mt-0.5">
          {done ? `Behaald op ${fmtDate(m.achieved_at)}` : m.target_date ? `Streefdatum ${fmtDate(m.target_date)}` : "Geen streefdatum"}
          {m.description ? ` · ${m.description}` : ""}
        </p>
        {reward && (
          <p className="text-xs mt-1 inline-flex items-center gap-1.5 text-orchid-soft">
            <Gift className="size-3.5" aria-hidden /> {reward.title}
            {reward.granted_at ? <span className="text-muted">· toegekend</span> : null}
          </p>
        )}
      </div>
    </div>
  );
}
