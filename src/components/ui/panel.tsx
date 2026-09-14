import type { ReactNode } from "react";

export function Panel({
  title,
  eyebrow,
  actions,
  children,
  className = "",
  padded = true,
  raised = false,
  as: Tag = "section",
  id,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  raised?: boolean;
  as?: "section" | "div" | "article" | "aside";
  id?: string;
}) {
  return (
    <Tag id={id} className={`${raised ? "deck-raised" : "deck"} ${padded ? "p-5" : ""} ${className}`}>
      {(title || eyebrow || actions) && (
        <header className={`flex items-start justify-between gap-4 ${padded ? "mb-4" : "px-5 pt-5 mb-3"}`}>
          <div className="min-w-0">
            {eyebrow && <p className="t-eyebrow mb-1">{eyebrow}</p>}
            {title && <h2 className="font-display text-lg font-semibold leading-tight tracking-tight">{title}</h2>}
          </div>
          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}
