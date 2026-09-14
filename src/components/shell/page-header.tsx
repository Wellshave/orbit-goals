import type { ReactNode } from "react";
import { ClayIcon, type IconName } from "@/components/icons";
import type { Tone } from "@/lib/status";
import { HelpButton } from "@/components/help/help-button";

export function PageHeader({ eyebrow, title, description, actions, children, icon, tone = "blue", help }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode; icon?: IconName; tone?: Tone; help?: string }) {
  return (
    <header className="mb-8 flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {icon && <ClayIcon name={icon} tone={tone} size="lg" className="mt-1" />}
          <div className="min-w-0">
            {eyebrow && <p className="t-label mb-1">{eyebrow}</p>}
            <h1 className="text-3xl sm:text-4xl inline-flex items-start gap-3">{title}{help && <HelpButton topic={help} className="mt-1.5" />}</h1>
            {description && <p className="t-muted mt-2 max-w-2xl text-[0.9375rem]">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
