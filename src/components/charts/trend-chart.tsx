"use client";

import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtNum } from "@/lib/format";

export interface TrendPoint { label: string; value: number | null; expected?: number | null; }

/** Vloeiende trendgrafiek (KPI-historie of doel-traject) in het thema. */
export function TrendChart({ data, target, unit = "", height = 200, tone = "#496CFF", kind = "line" }: { data: TrendPoint[]; target?: number; unit?: string; height?: number; tone?: string; kind?: "line" | "area" }) {
  const Chart = kind === "area" ? AreaChart : LineChart;
  return (
    <div style={{ width: "100%", height }} role="img" aria-label="Trendgrafiek">
      <ResponsiveContainer>
        <Chart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="tc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tone} stopOpacity={0.35} />
              <stop offset="100%" stopColor={tone} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(232,240,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#8A97B8", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#8A97B8", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => (Math.abs(v) >= 1_000_000 ? `${fmtNum(v / 1_000_000, 1)}M` : Math.abs(v) >= 1000 ? `${fmtNum(v / 1000, 0)}k` : fmtNum(v))} />
          <Tooltip
            contentStyle={{ background: "#1C2848", border: "1px solid rgba(232,240,255,0.16)", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-mono)" }}
            labelStyle={{ color: "#B9C6E4" }}
            formatter={(v, name) => [`${fmtNum(Number(v))}${unit === "%" ? "%" : unit === "€" ? " €" : unit ? " " + unit : ""}`, name === "expected" ? "Verwacht" : "Waarde"]}
          />
          {target !== undefined && <ReferenceLine y={target} stroke="rgba(232,240,255,0.5)" strokeDasharray="3 4" label={{ value: "target", fill: "#B9C6E4", fontSize: 10, position: "insideTopRight" }} />}
          {data.some((d) => d.expected !== undefined && d.expected !== null) && (
            kind === "area"
              ? <Area type="monotone" dataKey="expected" stroke="rgba(232,240,255,0.35)" strokeDasharray="4 4" fill="none" dot={false} isAnimationActive />
              : <Line type="monotone" dataKey="expected" stroke="rgba(232,240,255,0.35)" strokeDasharray="4 4" dot={false} isAnimationActive />
          )}
          {kind === "area" ? (
            <Area type="monotone" dataKey="value" stroke={tone} strokeWidth={2} fill="url(#tc-fill)" dot={{ r: 3, fill: tone, strokeWidth: 0 }} connectNulls isAnimationActive animationDuration={700} />
          ) : (
            <Line type="monotone" dataKey="value" stroke={tone} strokeWidth={2} dot={{ r: 3, fill: tone, strokeWidth: 0 }} connectNulls isAnimationActive animationDuration={700} />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
