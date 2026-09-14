export function Sparkline({ values, target, width = 120, height = 32, tone = "cobalt", higherBetter = true }: { values: number[]; target?: number; width?: number; height?: number; tone?: "cobalt" | "orchid" | "coral" | "amber"; higherBetter?: boolean }) {
  if (values.length === 0) return <div className="skeleton" style={{ width, height }} aria-hidden />;
  const all = target !== undefined ? [...values, target] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const pad = 3;
  const x = (i: number) => (values.length === 1 ? width / 2 : pad + (i / (values.length - 1)) * (width - pad * 2));
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const color = { cobalt: "#6F8BFF", orchid: "#B391F2", coral: "#FF9483", amber: "#F2B84B" }[tone];
  const last = values[values.length - 1];
  const hit = target === undefined ? true : higherBetter ? last >= target : last <= target;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      {target !== undefined && <line x1={pad} x2={width - pad} y1={y(target)} y2={y(target)} stroke="rgba(232,240,255,0.35)" strokeDasharray="2 3" />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(last)} r={2.75} fill={hit ? color : "#FF715B"} />
    </svg>
  );
}
