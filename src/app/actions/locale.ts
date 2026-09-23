"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, currentUser } from "@/lib/supabase/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";

/** Taalkeuze: cookie (ook zonder login) + profielvoorkeur (als ingelogd). */
export async function setLocale(fd: FormData) {
  const locale = String(fd.get("locale") ?? "nl");
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (user) await supabase.from("profiles").update({ locale }).eq("id", user.id);
  revalidatePath("/", "layout");
}
