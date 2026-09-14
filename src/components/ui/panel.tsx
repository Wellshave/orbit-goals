import type { ReactNode } from "react";

/** Sectiekaart: witte kaart met zachte schaduw, ruime kop. */
export function Panel({ title, eyebrow, actions, children, className = "", padded = true, raised = false, as: Tag = "section", id, tone }: {
  title?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean; raised?: boolean;
  as?: "section" | "div" | "article" | "aside"; id?: string; tone?: "sky" | "lavender" | "mint" | "peach" | "butter";
}) {
  const bg = tone ? { sky: "soft-sky", lavender: "soft-lavender", mint: "soft-mint", peach: "soft-peach", butter: "soft-butter" }[tone] : "";
  return (
    <Tag id={id} className={`${raised ? "card-lift" : "card"} ${bg} ${padded ? "p-6" : ""} ${className}`}>
      {(title || eyebrow || actions) && (
        <header className={`flex items-start justify-between gap-4 ${padded ? "mb-5" : "px-6 pt-6 mb-3"}`}>
          <div className="min-w-0">
            {eyebrow && <p className="t-label mb-1">{eyebrow}</p>}
            {title && <h2 className="text-xl">{title}</h2>}
          </div>
          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}

/** Sectiekop zonder kaart, voor luchtige pagina-indeling. */
export function SectionHeading({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h2 className="text-xl sm:text-2xl">{title}</h2>
        {sub && <p className="t-muted text-sm mt-1">{sub}</p>}
      </div>
      {actions}
    </div>
  );
}
