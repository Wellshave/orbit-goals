"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Bookmark, X } from "lucide-react";
import { saveFilter, deleteFilter } from "@/app/actions/misc";
import type { SavedFilter } from "@/lib/types";
import { FormMessage } from "@/components/ui";

export function SavedViews({ filters }: { filters: SavedFilter[] }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveFilter, undefined);
  const current = sp.toString();
  const forRoute = filters.filter((f) => f.route === pathname);
  const all = filters.filter((f) => f.route !== pathname);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Bookmark className="size-4 text-ink-3" aria-hidden />
      {[...forRoute, ...all].map((f) => {
        const active = f.route === pathname && f.query === current;
        return (
          <span key={f.id} className={`inline-flex items-center rounded-full text-sm font-semibold ${active ? "bg-lavender text-purple-deep" : "bg-white border border-line text-ink-2 hover:text-ink"}`}>
            <Link href={`${f.route}${f.query ? `?${f.query}` : ""}`} className="pl-3 pr-1.5 py-1.5">{f.name}</Link>
            <form action={deleteFilter}>
              <input type="hidden" name="id" value={f.id} /><input type="hidden" name="route" value={pathname} />
              <button type="submit" className="pr-2 py-1.5 text-ink-3 hover:text-coral-deep" aria-label={`Weergave ${f.name} verwijderen`}><X className="size-3.5" /></button>
            </form>
          </span>
        );
      })}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-blue-deep hover:underline">Weergave opslaan</button>
      ) : (
        <form action={action} className="inline-flex items-center gap-2" onSubmit={() => setTimeout(() => setOpen(false), 400)}>
          <input type="hidden" name="route" value={pathname} /><input type="hidden" name="query" value={current} />
          <input name="name" required autoFocus className="ctl !w-48 !py-1.5 text-sm" placeholder="Naam van de weergave" aria-label="Naam van de weergave" />
          <button type="submit" className="press text-sm font-semibold px-3.5 py-2 rounded-full bg-blue text-white">Opslaan</button>
          <button type="button" onClick={() => setOpen(false)} className="text-sm t-muted">Annuleren</button>
          <FormMessage error={state?.error} />
        </form>
      )}
    </div>
  );
}
