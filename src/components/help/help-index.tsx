"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HelpCircle, PlayCircle } from "lucide-react";
import { Modal } from "@/components/ui";
import { HELP, HELP_INDEX } from "@/lib/help/content";
import { startTour } from "@/lib/help/tour-store";
import { ClayIcon } from "@/components/icons";
import { useT } from "@/lib/i18n/client";

/** Help-overzicht in de zijbalk: alle onderwerpen + walkthroughs. */
export function HelpIndex({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const tr = useT();
  function play(id: string) {
    const t = HELP[id];
    if (!t?.tour) return;
    setOpen(false);
    if (t.route && !pathname.startsWith(t.route)) {
      router.push(t.route);
      setTimeout(() => startTour(t.tour!, t.title), 1500);
    } else {
      setTimeout(() => startTour(t.tour!, t.title), 250);
    }
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`press w-full flex items-center gap-3 rounded-2xl text-[0.9375rem] font-semibold text-ink-2 hover:text-ink hover:bg-white/70 ${collapsed ? "justify-center p-2" : "px-2.5 py-2"}`} title="Help & walkthroughs">
        <ClayIcon name={HelpCircle} tone="blue" size="sm" />
        {!collapsed && <span>{tr("nav.help")}</span>}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Help & walkthroughs" wide>
        <p className="text-sm text-ink-2 mb-4">Every page and pop-up has a <span className="inline-flex align-middle items-center justify-center size-5 rounded-full bg-sky text-blue-deep"><HelpCircle className="size-3.5" /></span> button. Pick a topic here to read the explanation or play the walkthrough on its page.</p>
        <ul className="grid sm:grid-cols-2 gap-2">
          {HELP_INDEX.map((id) => { const t = HELP[id]; return (
            <li key={id} className="tile bg-white border border-line p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1"><p className="font-bold text-sm">{t.title}</p><p className="text-xs t-muted line-clamp-2">{t.summary}</p></div>
              {t.tour ? <button type="button" onClick={() => play(id)} className="press inline-flex items-center gap-1 text-xs font-semibold rounded-full bg-sky text-blue-deep px-3 py-1.5 hover:bg-blue hover:text-white"><PlayCircle className="size-4" /> Play</button> : t.route ? <Link href={t.route} onClick={() => setOpen(false)} className="text-xs font-semibold text-blue-deep">Open</Link> : null}
            </li>
          ); })}
        </ul>
      </Modal>
    </>
  );
}
