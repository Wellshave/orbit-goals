import type { Status } from "@/lib/types";
import { STATUS_META } from "@/lib/status";

const tones: Record<string, string> = {
  muted: "text-muted border-line-strong bg-ice/[0.03]",
  cobalt: "text-cobalt-soft border-cobalt/40 bg-cobalt/10",
  amber: "text-amber border-amber/40 bg-amber/10",
  coral: "text-coral-soft border-coral/40 bg-coral/10",
  orchid: "text-orchid-soft border-orchid/40 bg-orchid/12",
};

export function statusTone(status: Status) {
  return tones[STATUS_META[status].tone];
}

export function StatusPill({ status, size = "sm", short = false }: { status: Status; size?: "xs" | "sm"; short?: boolean }) {
  const m = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${tones[m.tone]} ${
        size === "xs" ? "text-[0.6875rem] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
      }`}
    >
      <span aria-hidden className="text-[0.6em] leading-none">{m.glyph}</span>
      {short ? m.short : m.label}
    </span>
  );
}

export function StatusDot({ status, className = "" }: { status: Status; className?: string }) {
  const m = STATUS_META[status];
  const color: Record<string, string> = { muted: "bg-muted", cobalt: "bg-cobalt", amber: "bg-amber", coral: "bg-coral", orchid: "bg-orchid" };
  return <span className={`inline-block size-2 rounded-full ${color[m.tone]} ${className}`} aria-label={m.label} role="img" />;
}
