"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarRange } from "lucide-react";
import { PERIOD_LABELS, type PeriodKey } from "@/lib/periods";
import { HelpButton } from "@/components/help/help-button";

const KEYS: PeriodKey[] = ["today", "week", "month", "quarter", "year"];

export function PeriodBar({ current, label }: { current: PeriodKey; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [custom, setCustom] = useState(current === "custom");
  const [pending, start] = useTransition();

  function go(key: PeriodKey, from?: string, to?: string) {
    const q = new URLSearchParams(sp.toString());
    q.set("period", key);
    if (key === "custom" && from && to) { q.set("from", from); q.set("to", to); } else { q.delete("from"); q.delete("to"); }
    start(() => router.push(`${pathname}?${q.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-3" aria-busy={pending} data-tour="period-bar">
      <div className="inline-flex p-1 gap-1 rounded-full bg-cloud max-w-full overflow-x-auto" role="group" aria-label="Periode">
        {KEYS.map((k) => (
          <button key={k} type="button" onClick={() => { setCustom(false); go(k); }} aria-pressed={current === k} className={`press px-3.5 py-1.5 text-sm font-semibold rounded-full whitespace-nowrap ${current === k ? "bg-white text-ink shadow-[var(--shadow-press)]" : "text-ink-2 hover:text-ink"}`}>
            {PERIOD_LABELS[k]}
          </button>
        ))}
        <button type="button" onClick={() => setCustom((c) => !c)} aria-pressed={current === "custom"} aria-expanded={custom} className={`press px-3.5 py-1.5 text-sm font-semibold rounded-full inline-flex items-center gap-1.5 ${current === "custom" ? "bg-white text-ink shadow-[var(--shadow-press)]" : "text-ink-2 hover:text-ink"}`}>
          <CalendarRange className="size-4" aria-hidden /> Eigen
        </button>
      </div>
      <span className="text-sm font-medium t-muted" aria-live="polite">{label}</span>
      <HelpButton topic="period" size="sm" />
      {custom && (
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); go("custom", String(f.get("from")), String(f.get("to"))); }}>
          <label className="sr-only" htmlFor="pb-from">Van</label>
          <input id="pb-from" name="from" type="date" required defaultValue={sp.get("from") ?? ""} className="ctl !w-auto !py-1.5 text-sm" />
          <span className="t-muted text-sm">tot</span>
          <label className="sr-only" htmlFor="pb-to">Tot</label>
          <input id="pb-to" name="to" type="date" required defaultValue={sp.get("to") ?? ""} className="ctl !w-auto !py-1.5 text-sm" />
          <button type="submit" className="press text-sm font-semibold px-4 py-2 rounded-full bg-blue text-white">Toepassen</button>
        </form>
      )}
    </div>
  );
}
