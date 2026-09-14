"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarRange } from "lucide-react";
import { PERIOD_LABELS, type PeriodKey } from "@/lib/periods";

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
    if (key === "custom" && from && to) {
      q.set("from", from);
      q.set("to", to);
    } else {
      q.delete("from");
      q.delete("to");
    }
    start(() => router.push(`${pathname}?${q.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <div className="well inline-flex p-0.5 gap-0.5" role="group" aria-label="Rapportageperiode">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setCustom(false);
              go(k);
            }}
            aria-pressed={current === k}
            className={`px-2.5 py-1.5 text-[0.8125rem] font-semibold rounded-[4px] transition-colors ${
              current === k ? "bg-midnight-3 text-ice shadow-[inset_0_1px_0_rgba(232,240,255,0.1)]" : "text-muted hover:text-ice"
            }`}
          >
            {PERIOD_LABELS[k]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustom((c) => !c)}
          aria-pressed={current === "custom"}
          aria-expanded={custom}
          className={`px-2.5 py-1.5 text-[0.8125rem] font-semibold rounded-[4px] inline-flex items-center gap-1.5 ${
            current === "custom" ? "bg-midnight-3 text-ice" : "text-muted hover:text-ice"
          }`}
        >
          <CalendarRange className="size-3.5" aria-hidden /> Eigen
        </button>
      </div>
      <span className="t-num text-xs text-ice-dim px-1" aria-live="polite">{label}</span>
      {custom && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            go("custom", String(f.get("from")), String(f.get("to")));
          }}
        >
          <label className="sr-only" htmlFor="pb-from">Van</label>
          <input id="pb-from" name="from" type="date" required defaultValue={sp.get("from") ?? ""} className="ctl !w-auto !py-1 text-xs" />
          <span className="text-muted text-xs">tot</span>
          <label className="sr-only" htmlFor="pb-to">Tot</label>
          <input id="pb-to" name="to" type="date" required defaultValue={sp.get("to") ?? ""} className="ctl !w-auto !py-1 text-xs" />
          <button type="submit" className="text-xs font-semibold px-2.5 py-1.5 rounded-[4px] bg-cobalt text-white">Toepassen</button>
        </form>
      )}
    </div>
  );
}
