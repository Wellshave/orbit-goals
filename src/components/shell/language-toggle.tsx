"use client";

import { Languages } from "lucide-react";
import { setLocale } from "@/app/actions/locale";
import { useLocale, useT } from "@/lib/i18n/client";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n";

/** NL | EN keuze. Werkt zonder JavaScript (form + server action). */
export function LanguageToggle({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const locale = useLocale();
  const t = useT();
  return (
    <form action={setLocale} className={`inline-flex items-center gap-1 ${className}`} aria-label={t("shell.language")}>
      {!compact && <Languages className="size-4 text-ink-3 mr-1" aria-hidden />}
      <span className="inline-flex p-0.5 gap-0.5 rounded-full bg-cloud">
        {LOCALES.map((l) => (
          <button key={l} type="submit" name="locale" value={l} aria-pressed={locale === l} title={LOCALE_NAMES[l]} className={`press px-2.5 py-1 text-xs font-bold rounded-full uppercase ${locale === l ? "bg-white text-ink shadow-[var(--shadow-press)]" : "text-ink-2 hover:text-ink"}`}>
            {l}
          </button>
        ))}
      </span>
    </form>
  );
}
