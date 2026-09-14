"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { HelpButton } from "@/components/help/help-button";

const noop = () => () => {};

/** Modal via portal naar <body>, zodat hij overal (ook in een <p> of <h2>) geplaatst kan worden. */
export function Modal({ open, onClose, title, children, wide = false, help }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; help?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open, mounted]);
  if (!mounted || !open) return null;
  return createPortal(
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} className={`card-lift m-auto w-[calc(100%-2rem)] ${wide ? "max-w-3xl" : "max-w-lg"} p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]`}>
      <div className="p-6 max-h-[85vh] overflow-y-auto">
        <header className="flex items-center justify-between mb-4">
          <h2 className="text-xl inline-flex items-center gap-2">{title}{help && <HelpButton topic={help} size="sm" />}</h2>
          <button type="button" onClick={onClose} className="press p-2 rounded-full text-ink-2 hover:bg-cloud" aria-label="Sluiten"><X className="size-4" /></button>
        </header>
        {children}
      </div>
    </dialog>,
    document.body
  );
}
