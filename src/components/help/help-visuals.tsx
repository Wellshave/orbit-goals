"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Flag, Gift, Star, Lock, Users, Building2, Share2, Hand, AtSign, Bell, Bookmark } from "lucide-react";
import type { HelpVisualKind } from "@/lib/help/types";
import { ClayIcon } from "@/components/icons";
import { StatusPill } from "@/components/ui";
import { SCORE_ORDER, SCORE_POINTS } from "@/lib/score";
import { en } from "@/lib/i18n/en";

/** Genummerde callout op een demo-visual. */
function Callout({ n, className = "" }: { n: number; className?: string }) {
  return <span className={`absolute z-10 grid place-items-center size-6 rounded-full bg-ink text-white text-xs font-bold ring-2 ring-white shadow ${className}`} aria-hidden>{n}</span>;
}

/** Vereenvoudigde, geanimeerde Progress Path met demo-waarden. */
function DemoPath({ progress = 0.68 }: { progress?: number }) {
  const reduce = useReducedMotion();
  const W = 520, H = 130;
  const d = `M 30 ${H * 0.65} C 150 ${H * 0.65}, 170 ${H * 0.25}, 250 ${H * 0.3} S 400 ${H * 0.8}, ${W - 40} ${H * 0.5}`;
  const nodes = [{ x: 168, y: 62, done: true, label: "€1M" }, { x: 300, y: 42, done: true, label: "€2M" }, { x: 395, y: 82, done: false, label: "€2.5M", next: true }, { x: W - 40, y: H * 0.5, done: false, label: "€3M", final: true }];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible" aria-hidden>
      <defs><linearGradient id="hp-fill" x1="0" x2="1"><stop offset="0" stopColor="#F6C85F" /><stop offset="1" stopColor="#9B72F2" /></linearGradient></defs>
      <path d={d} fill="none" stroke="#E6E9F2" strokeWidth={16} strokeLinecap="round" />
      <motion.path d={d} fill="none" stroke="url(#hp-fill)" strokeWidth={16} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: progress }} transition={{ duration: reduce ? 0 : 1.4, ease: [0.22, 1, 0.36, 1], repeat: reduce ? 0 : Infinity, repeatDelay: 2.5 }} />
      <circle cx={30} cy={H * 0.65} r={8} fill="#fff" stroke="#F6C85F" strokeWidth={4} />
      {nodes.map((n, i) => (
        <g key={i} transform={`translate(${n.x} ${n.y})`}>
          {n.next && <circle r={26} fill="#5B6CFF" opacity={0.18} className={reduce ? "" : "glow"} style={{ transformOrigin: "center", transformBox: "fill-box" }} />}
          <circle r={n.final ? 20 : 14} fill={n.done ? "#48CFAE" : "#fff"} stroke={n.done ? "#2FAE90" : n.final ? "#F6C85F" : n.next ? "#5B6CFF" : "#C9CFDB"} strokeWidth={4} />
          {n.done ? <Check x={-7} y={-7} width={14} height={14} color="#fff" strokeWidth={3} /> : n.final ? <Flag x={-9} y={-9} width={18} height={18} color="#D9A63A" /> : <Star x={-7} y={-7} width={14} height={14} color="#5B6CFF" />}
          {(i === 1 || i === 3) && <g transform="translate(13 -18)"><circle r={9} fill="#FFF1CF" stroke="#fff" strokeWidth={2} /><Gift x={-5} y={-5} width={10} height={10} color="#D9A63A" /></g>}
          <text y={n.final ? 36 : 30} textAnchor="middle" fill="#172033" style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--font-display)" }}>{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

function DemoGoalCard() {
  return (
    <div className="relative card p-4 max-w-sm mx-auto">
      <Callout n={1} className="-left-2 -top-2" />
      <div className="flex items-start gap-3">
        <ClayIcon name="team" tone="purple" size="md" />
        <div className="min-w-0 flex-1"><p className="font-display font-extrabold leading-snug">25 active influencers</p><p className="text-xs t-muted">Marketing · until 30 Sep</p></div>
        <span className="relative"><Callout n={5} className="-right-3 -top-3" /><StatusPill status="behind" size="xs" /></span>
      </div>
      <div className="mt-3 relative"><Callout n={2} className="-left-2 -top-1" /><p className="font-display font-extrabold text-xl">13 of 25 active</p>
        <div className="mt-2 relative h-3.5 rounded-full bg-cloud"><Callout n={3} className="right-6 -top-4" /><div className="h-full rounded-full w-[52%]" style={{ background: "linear-gradient(90deg,#FF7B6B,#FFA08F)" }} /><span className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-white border-2 border-ink/30 ring-2 ring-white" style={{ left: "60%" }} /></div>
      </div>
      <p className="mt-2 text-xs t-muted relative"><Callout n={4} className="-left-2 -top-2" />4 more until milestone: first reward</p>
      <div className="mt-3 relative rounded-full bg-sky text-blue-deep font-semibold text-sm py-2 text-center"><Callout n={6} className="-right-2 -top-2" />Update progress</div>
    </div>
  );
}

function DemoCheckin() {
  const reduce = useReducedMotion();
  return (
    <div className="relative card p-4 max-w-sm mx-auto">
      <div className="flex items-start gap-3 mb-3"><ClayIcon name="kpi" tone="mint" size="md" /><div><p className="font-display font-extrabold">Bol.com revenue per week</p><p className="text-xs t-muted">Target <strong className="text-ink">€ 10,000</strong> · last time € 10,150</p></div></div>
      <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
        <div className="relative"><Callout n={1} className="-left-2 -top-2" /><div className="ctl ctl-lg tnum">11.400</div></div>
        <div className="relative"><Callout n={2} className="-right-2 -top-2" /><span className="press inline-flex rounded-full bg-mint text-ink font-semibold px-5 py-3">Save check-in</span></div>
      </div>
      <motion.div className="mt-3 tile soft-mint p-3 flex items-center gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, 8] }} transition={{ duration: reduce ? 0.01 : 4, repeat: reduce ? 0 : Infinity, repeatDelay: 1, times: [0, 0.15, 0.85, 1] }}>
        <Callout n={3} className="-left-2 -top-2" />
        <span className="clay size-9 bg-mint text-white"><Check className="size-5" strokeWidth={3} /></span>
        <div><p className="font-display font-extrabold text-sm">Nice! Target reached.</p><p className="text-xs t-muted">€ 11,400 · you are on track this week.</p></div>
      </motion.div>
    </div>
  );
}

function DemoStatus() {
  const rows: { s: "not_started" | "on_track" | "needs_attention" | "behind" | "achieved"; p?: number; text: string }[] = [
    { s: "not_started", text: "No progress yet, or the start date is in the future." },
    { s: "on_track", text: "Progress is at least 90% of what the timeline expects." },
    { s: "on_track", p: 0.92, text: "‘Almost there’: 90% or more of the goal is done." },
    { s: "needs_attention", text: "Between 70% and 90% of the expected pace." },
    { s: "behind", text: "Below 70% of the expected pace, or past the deadline." },
    { s: "achieved", text: "The target has been reached." },
  ];
  return <ul className="flex flex-col gap-2">{rows.map((r, i) => <li key={i} className="flex items-center gap-3 text-sm"><StatusPill status={r.s} progress={r.p} /><span className="t-muted">{r.text}</span></li>)}</ul>;
}

function DemoVisibility() {
  const rows = [
    { icon: Lock, tone: "bg-cloud text-ink-2", label: "Private", who: "Only you. Not even admins." },
    { icon: Share2, tone: "bg-lavender text-purple-deep", label: "Shared", who: "You + the people you select." },
    { icon: Users, tone: "bg-sky text-blue-deep", label: "Team", who: "Team members, responsible people, admins." },
    { icon: Building2, tone: "bg-butter text-yellow-deep", label: "Company", who: "Everyone in the organisation." },
  ];
  return <ul className="grid sm:grid-cols-2 gap-2">{rows.map((r) => <li key={r.label} className="tile bg-white p-3 flex items-center gap-3"><span className={`clay size-10 ${r.tone}`}><r.icon className="size-5" /></span><span><span className="block font-bold text-sm">{r.label}</span><span className="block text-xs t-muted">{r.who}</span></span></li>)}</ul>;
}

function DemoScore() {
  return <ul className="grid sm:grid-cols-2 gap-x-6">{SCORE_ORDER.map((k) => <li key={k} className="py-1.5 flex items-start justify-between gap-3 text-sm border-b border-line"><span><span className="font-semibold">{en.score[k].label}</span><span className="block text-xs t-muted">{en.score[k].explain}</span></span><span className="font-bold text-blue-deep shrink-0">+{SCORE_POINTS[k]}</span></li>)}</ul>;
}

function DemoFeed() {
  return (
    <div className="flex flex-col gap-2 max-w-sm mx-auto">
      <div className="ctl text-sm t-muted relative"><Callout n={1} className="-left-2 -top-2" />Great work <span className="text-blue-deep font-semibold bg-sky rounded px-1">@Lex van Dissel</span>, milestone reached!</div>
      <div className="card-lift p-1.5 w-56 text-sm relative"><Callout n={2} className="-left-2 -top-2" /><div className="px-2 py-1.5 rounded-xl bg-cloud font-semibold">Lex van Dissel</div><div className="px-2 py-1.5 t-muted">Lex Meijer</div></div>
      <div className="flex gap-2 relative mt-1"><Callout n={3} className="-left-2 -top-2" /><span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 bg-sky text-blue-deep"><AtSign className="size-3.5" /> Like 3</span><span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 bg-lavender text-purple-deep"><Hand className="size-3.5" /> High-five</span></div>
    </div>
  );
}

function DemoNav() {
  const items = [["today", "yellow", "Today"], ["company", "blue", "Company"], ["rocket", "coral", "Goals"], ["kpi", "blue", "KPIs"], ["checkin", "mint", "Check-ins"], ["trophy", "yellow", "Scoreboard"]] as const;
  return <ul className="grid grid-cols-3 gap-2">{items.map(([i, t, l]) => <li key={l} className="tile bg-white p-2.5 flex items-center gap-2 text-sm font-semibold"><ClayIcon name={i} tone={t} size="sm" />{l}</li>)}</ul>;
}

function DemoPeriod() {
  return <div className="inline-flex p-1 gap-1 rounded-full bg-cloud">{["Today", "This week", "This month", "Quarter", "Year", "Custom"].map((l, i) => <span key={l} className={`px-3.5 py-1.5 text-sm font-semibold rounded-full ${i === 1 ? "bg-white shadow-[var(--shadow-press)]" : "t-muted"}`}>{l}</span>)}</div>;
}

export function HelpVisual({ kind }: { kind: HelpVisualKind }) {
  switch (kind) {
    case "progress-path": case "company": case "goal-detail" as string: return <div className="tile soft-butter p-4"><DemoPath /><p className="text-xs t-muted mt-2">Green dots: achieved. Glowing dot: next milestone. Gift: reward. Flag: finish. The coloured part of the path is your progress.</p></div>;
    case "goal-card": case "goals" as string: return <div className="tile soft-cloud p-4"><DemoGoalCard /><ol className="mt-3 grid sm:grid-cols-2 gap-x-4 text-xs t-muted list-decimal list-inside"><li>Icon and colour show the goal type</li><li>Progress in plain words</li><li>Bar with milestone dots</li><li>Next milestone and reward</li><li>Friendly status</li><li>One clear action</li></ol></div>;
    case "checkin": return <div className="tile soft-cloud p-4"><DemoCheckin /><ol className="mt-3 grid sm:grid-cols-3 gap-x-4 text-xs t-muted list-decimal list-inside"><li>Type the value</li><li>Save</li><li>Instant feedback, then it ticks off</li></ol></div>;
    case "status": return <div className="tile soft-cloud p-4"><DemoStatus /></div>;
    case "visibility": return <div className="tile soft-cloud p-4"><DemoVisibility /></div>;
    case "score": case "scoreboard" as string: return <div className="tile soft-cloud p-4"><DemoScore /></div>;
    case "feed": return <div className="tile soft-cloud p-4"><DemoFeed /><ol className="mt-3 text-xs t-muted list-decimal list-inside"><li>Write and type @ to tag someone</li><li>Pick a name from the list</li><li>Like, high-five or reply</li></ol></div>;
    case "navigation": return <div className="tile soft-cloud p-4"><DemoNav /></div>;
    case "period": return <div className="tile soft-cloud p-4 flex justify-center"><DemoPeriod /></div>;
    case "milestones": return <div className="tile soft-butter p-4"><DemoPath progress={0.5} /><p className="text-xs t-muted mt-2">Each dot is a milestone with its own target. The gift marks a reward, the flag is the final goal.</p></div>;
    case "kpi": case "kpi-form": return <div className="tile soft-cloud p-4"><div className="card p-4 max-w-sm mx-auto"><div className="flex items-start gap-3"><ClayIcon name="kpi" tone="mint" size="md" /><div className="flex-1"><p className="font-display font-extrabold">Posts live</p><p className="text-xs t-muted">Target 7 posts per week</p></div><StatusPill status="achieved" size="xs" /></div><div className="mt-3 flex items-end justify-between"><div><p className="font-display font-extrabold text-2xl">7 posts</p><p className="text-sm t-muted">Exactly on target.</p></div><div className="flex items-end gap-1 h-9">{[4, 6, 7, 5, 7, 8, 7, 7].map((v, i) => <div key={i} className={`w-3 rounded-md ${v >= 7 ? "bg-mint" : "bg-coral/70"}`} style={{ height: `${(v / 8) * 100}%` }} />)}</div></div><div className="mt-2 h-2.5 rounded-full bg-cloud"><div className="h-full w-full rounded-full bg-mint" /></div></div><p className="text-xs t-muted mt-2 text-center">Bars are the last periods: mint hit the target, coral did not.</p></div>;
    case "goal-form": return <div className="tile soft-cloud p-4"><DemoVisibility /><p className="text-xs t-muted mt-2">Pick the type, the measurement and who may see it. Milestones can be added right away.</p></div>;
    case "saved-views": return <div className="tile soft-cloud p-4 flex flex-wrap items-center gap-2"><Bookmark className="size-4 text-ink-3" />{["My week", "Sales this month", "Company goals Q3"].map((l, i) => <span key={l} className={`rounded-full text-sm font-semibold px-3 py-1.5 ${i === 0 ? "bg-lavender text-purple-deep" : "bg-white border border-line t-muted"}`}>{l}</span>)}<span className="text-sm font-semibold text-blue-deep">Save view</span></div>;
    case "notifications": return <div className="tile soft-cloud p-4 flex flex-col gap-2">{[["mention", "blue", "Dustin mentioned you"], ["flag", "yellow", "Milestone in sight"], ["award", "purple", "Willem gave you a high-five"]].map(([i, t, l]) => <div key={l} className="card p-3 flex items-center gap-3 text-sm"><ClayIcon name={i as "mention"} tone={t as "blue"} size="sm" /><span className="font-semibold flex-1">{l}</span><span className="size-2.5 rounded-full bg-coral" /></div>)}<p className="text-xs t-muted flex items-center gap-1"><Bell className="size-3.5" /> The bell in the top bar counts unread notifications live.</p></div>;
    case "people": case "teams": return <div className="tile soft-cloud p-4 flex flex-col gap-2">{[["Marketing", "#9B72F2"], ["Sales & Marketplaces", "#5B6CFF"], ["Operations", "#FF7B6B"]].map(([n, c]) => <div key={n} className="card p-3 flex items-center gap-3 text-sm" style={{ borderTop: `4px solid ${c}` }}><span className="font-semibold flex-1">{n}</span><span className="flex -space-x-2">{["A", "B", "C"].map((x) => <span key={x} className="size-6 rounded-full bg-sky ring-2 ring-white grid place-items-center text-[0.625rem] font-bold text-blue-deep">{x}</span>)}</span></div>)}</div>;
    case "settings": return <div className="tile soft-cloud p-4"><ul className="text-sm grid sm:grid-cols-3 gap-2">{[["Member", "Personal goals & KPIs"], ["Admin", "+ team & company goals, invites, roles"], ["Owner", "+ transfer ownership"]].map(([r, d]) => <li key={r} className="card p-3"><p className="font-bold">{r}</p><p className="text-xs t-muted">{d}</p></li>)}</ul></div>;
    case "dashboard": default: return <div className="tile soft-cloud p-4 grid grid-cols-[1fr_1fr] gap-2 text-xs">{[["Greeting + one action", "soft-sky"], ["Progress Path", "soft-butter"], ["Today to do", "soft-mint"], ["Needs attention", "soft-peach"], ["Your KPIs", "soft-sky"], ["Milestones close by", "soft-butter"], ["Team updates", "soft-lavender"], ["Personal goals", "soft-mint"]].map(([l, c], i) => <div key={l} className={`${c} rounded-xl px-3 py-2 font-semibold flex items-center gap-2 ${i < 2 ? "col-span-1" : ""}`}><span className="size-5 rounded-full bg-white grid place-items-center text-[0.625rem]">{i + 1}</span>{l}</div>)}</div>;
  }
}
