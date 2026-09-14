import { nl, type Dict } from "./nl";
import { en } from "./en";
import { nl as dfNl, enGB } from "date-fns/locale";

export type Locale = "nl" | "en";
export const LOCALES: Locale[] = ["nl", "en"];
export const DEFAULT_LOCALE: Locale = "nl";
export const LOCALE_COOKIE = "orbit.locale";
export const LOCALE_NAMES: Record<Locale, string> = { nl: "Nederlands", en: "English" };

const dicts: Record<Locale, Dict> = { nl, en };

export type T = (key: string, vars?: Record<string, string | number>) => string;

function lookup(dict: unknown, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const raw = lookup(dicts[locale], key) ?? lookup(dicts.nl, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export function makeT(locale: Locale): T {
  return (key, vars) => translate(locale, key, vars);
}

export function isLocale(v: unknown): v is Locale {
  return v === "nl" || v === "en";
}

/** date-fns locale bij de app-taal. */
export function dfLocale(locale: Locale) {
  return locale === "en" ? enGB : dfNl;
}
