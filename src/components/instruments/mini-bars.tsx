/** Compacte staafjes voor de laatste periodes; gehaald = mint, niet gehaald = zacht koraal. */
export function MiniBars({ values, target, higherBetter = true, height = 36, labels }: { values: number[]; target?: number; higherBetter?: boolean; height?: number; labels?: string[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, target ?? 0) || 1;
  return (
    <div className="flex items-end gap-1" style={{ height }} aria-hidden>
      {values.map((v, i) => {
        const hit = target === undefined ? true : higherBetter ? v >= target : v <= target;
        return (
          <div key={i} className="flex-1 h-full min-w-[6px] max-w-[18px] flex flex-col justify-end" title={labels?.[i]}>
            <div className={`rounded-md ${hit ? "bg-mint" : "bg-coral/70"}`} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
          </div>
        );
      })}
    </div>
  );
}

/** Kleurrijke maandbalkjes voor een cumulatief doel (toename per periode). */
export function BarChart({ data, accent = "#5B6CFF", height = 140, unit = "", label = "Progress per period" }: { data: { label: string; value: number | null; expected?: number | null }[]; accent?: string; height?: number; unit?: string; label?: string }) {
  const vals = data.map((d) => d.value ?? 0);
  const max = Math.max(...vals, ...data.map((d) => d.expected ?? 0)) || 1;
  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5" style={{ height }} role="img" aria-label={label}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1 relative">
            {d.expected !== undefined && d.expected !== null && (
              <span className="absolute left-1 right-1 border-t-2 border-dashed border-ink/20" style={{ bottom: `${(d.expected / max) * 100}%` }} aria-hidden />
            )}
            <div className="w-full rounded-t-lg rounded-b-md" style={{ height: d.value === null ? 0 : `${Math.max(3, (d.value / max) * 100)}%`, background: d.value === null ? "transparent" : `linear-gradient(180deg, ${accent}, color-mix(in oklab, ${accent} 70%, white))`, transition: "height 700ms cubic-bezier(0.22,1,0.36,1)" }} title={d.value === null ? "" : `${d.label}: ${d.value}${unit}`} />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {data.map((d, i) => <span key={i} className="flex-1 text-center text-[0.6875rem] t-muted truncate">{d.label}</span>)}
      </div>
    </div>
  );
}
