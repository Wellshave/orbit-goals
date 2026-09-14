import { cookies } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, makeT, type Locale } from "./index";

/** Taal uit de cookie (gezet via de taalkeuze); standaard Nederlands. */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
});

export async function getT() {
  const locale = await getLocale();
  return { t: makeT(locale), locale };
}
