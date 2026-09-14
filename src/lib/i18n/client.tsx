"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, makeT, type Locale, type T } from "./index";

const Ctx = createContext<{ locale: Locale; t: T }>({ locale: DEFAULT_LOCALE, t: makeT(DEFAULT_LOCALE) });

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: makeT(locale) }), [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT(): T {
  return useContext(Ctx).t;
}
export function useLocale(): Locale {
  return useContext(Ctx).locale;
}
