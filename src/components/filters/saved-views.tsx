"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Bookmark, X } from "lucide-react";
import { saveFilter, deleteFilter } from "@/app/actions/misc";
import type { SavedFilter } from "@/lib/types";
import { FormMessage } from "@/components/ui";

/** Opgeslagen filterweergaven: chips + 'huidige weergave opslaan'. */
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
      <Bookmark className="size-3.5 text-muted" aria-hidden />
      {[...forRoute, ...all].map((f) => {
        const active = f.route === pathname && f.query === current;
        return (
          <span key={f.id} className={`inline-flex items-center rounded-full border text-xs font-semibold ${active ? "border-cobalt/60 bg-cobalt/12 text-ice" : "border-line-strong text-ice-dim hover:text-ice"}`}>
            <Link href={`${f.route}${f.query ? `?${f.query}` : ""}`} className="pl-2.5 pr-1.5 py-1">{f.name}</Link>
            <form action={deleteFilter}>
              <input type="hidden" name="id" value={f.id} />
              <input type="hidden" name="route" value={pathname} />
              <button type="submit" className="pr-1.5 py-1 text-muted hover:text-coral-soft" aria-label={`Weergave ${f.name} verwijderen`}>
                <X className="size-3" />
              </button>
            </form>
          </span>
        );
      })}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-muted hover:text-ice underline underline-offset-4">
          Huidige weergave opslaan
        </button>
      ) : (
        <form action={action} className="inline-flex items-center gap-1.5" onSubmit={() => setTimeout(() => setOpen(false), 400)}>
          <input type="hidden" name="route" value={pathname} />
          <input type="hidden" name="query" value={current} />
          <input name="name" required autoFocus className="ctl !w-44 !py-1 text-xs" placeholder="Naam van de weergave" aria-label="Naam van de weergave" />
          <button type="submit" className="text-xs font-semibold px-2.5 py-1.5 rounded-[4px] bg-cobalt text-white">Opslaan</button>
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted">Annuleren</button>
          <FormMessage error={state?.error} />
        </form>
      )}
    </div>
  );
}
