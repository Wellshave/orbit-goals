import type { ReactNode } from "react";

export function EmptyState({ title, body, action, icon, compact = false }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode; compact?: boolean }) {
  return (
    <div className={`well flex flex-col items-center justify-center text-center ${compact ? "p-6" : "p-10"}`}>
      {icon && <div className="mb-3 text-muted [&>svg]:size-7">{icon}</div>}
      <p className="font-display font-semibold text-base">{title}</p>
      {body && <p className="t-sub mt-1 max-w-sm">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
