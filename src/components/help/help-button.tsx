"use client";

import { useState } from "react";
import { HelpCircle, PlayCircle, Lightbulb } from "lucide-react";
import { Modal, Button } from "@/components/ui";
import { HELP } from "@/lib/help/content";
import { HelpVisual } from "./help-visuals";
import { startTour } from "@/lib/help/tour-store";

/** Vraagteken-knop: opent uitleg (Engels) met een visuele demo en een afspeelbare walkthrough. */
export function HelpButton({ topic, size = "md", className = "", label }: { topic: string; size?: "sm" | "md"; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const t = HELP[topic];
  if (!t) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`press inline-flex items-center gap-1.5 rounded-full bg-white text-blue-deep border border-line shadow-[var(--shadow-press)] hover:bg-sky ${size === "sm" ? "size-7 justify-center" : label ? "px-3 py-1.5 text-sm font-semibold" : "size-9 justify-center"} ${className}`} aria-label={label ? undefined : `Help: ${t.title}`} title={t.title}>
        <HelpCircle className={size === "sm" ? "size-4" : "size-5"} aria-hidden />
        {label && size !== "sm" && <span>{label}</span>}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.title} wide>
        <div className="flex flex-col gap-5">
          <p className="text-[0.9375rem] text-ink-2">{t.summary}</p>
          <HelpVisual kind={t.visual} />
          <ol className="flex flex-col gap-2">
            {t.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm"><span className="clay size-7 shrink-0 bg-sky text-blue-deep font-display font-extrabold text-xs">{i + 1}</span><span className="pt-1">{s}</span></li>
            ))}
          </ol>
          {t.tips && t.tips.length > 0 && (
            <div className="tile soft-butter p-3 flex items-start gap-3 text-sm"><Lightbulb className="size-5 text-yellow-deep shrink-0 mt-0.5" aria-hidden /><ul className="flex flex-col gap-1">{t.tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul></div>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {t.tour && t.tour.length > 0 && (
              <Button onClick={() => { setOpen(false); setTimeout(() => startTour(t.tour!, t.title), 250); }} size="lg"><PlayCircle className="size-5" aria-hidden /> Play walkthrough on this page</Button>
            )}
            <Button variant="secondary" onClick={() => setOpen(false)}>Got it</Button>
            <span className="text-xs t-muted">Walkthrough: a cursor moves over the real page and explains each part. Esc closes, ← → skip, space pauses.</span>
          </div>
        </div>
      </Modal>
    </>
  );
}
