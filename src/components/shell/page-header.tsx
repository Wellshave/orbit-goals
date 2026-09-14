import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions, children }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="t-eyebrow mb-1.5">{eyebrow}</p>}
          <h1 className="t-display text-3xl sm:text-4xl">{title}</h1>
          {description && <p className="t-sub mt-2 max-w-2xl text-sm">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
