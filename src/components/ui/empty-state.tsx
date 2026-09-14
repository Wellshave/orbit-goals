import type { ReactNode } from "react";
import { ClayIcon, type IconName } from "@/components/icons";
import type { Tone } from "@/lib/status";

export function EmptyState({ title, body, action, icon = "sparkles", tone = "blue", compact = false }: { title: string; body?: string; action?: ReactNode; icon?: IconName; tone?: Tone; compact?: boolean }) {
  return (
    <div className={`tile soft-cloud flex flex-col items-center justify-center text-center ${compact ? "p-6" : "p-10"}`}>
      <ClayIcon name={icon} tone={tone} size="lg" className="mb-3" />
      <p className="font-display font-bold text-lg">{title}</p>
      {body && <p className="t-muted text-sm mt-1 max-w-sm">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
