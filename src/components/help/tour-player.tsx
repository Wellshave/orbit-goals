"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { getTour, stopTour, subscribeTour } from "@/lib/help/tour-store";
import type { TourStep } from "@/lib/help/types";

const CURSOR_W = 28;

/**
 * Walkthrough-speler: een cursor beweegt over de echte pagina, licht elementen uit,
 * 'klikt' en typt (visueel), met Engelse uitleg in beeld. Werkt als video, maar live.
 */
export function TourPlayer() {
  const tour = useSyncExternalStore(subscribeTour, getTour, () => null);
  if (!tour) return null;
  return <Runner key={tour.title} steps={tour.steps} title={tour.title} />;
}

function Runner({ steps, title }: { steps: TourStep[]; title: string }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cursor, setCursor] = useState({ x: typeof window !== "undefined" ? window.innerWidth / 2 : 0, y: typeof window !== "undefined" ? window.innerHeight / 2 : 0 });
  const [ripple, setRipple] = useState(0);
  const [typed, setTyped] = useState("");
  const typedInto = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const timer = useRef<number | null>(null);

  const step = steps[i];

  const clear = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const restoreTyped = useCallback(() => {
    const el = typedInto.current;
    if (el) {
      const setter = Object.getOwnPropertyDescriptor(el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value")?.set;
      setter?.call(el, "");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      typedInto.current = null;
    }
    setTyped("");
  }, []);

  const finish = useCallback(() => {
    clear();
    restoreTyped();
    stopTour();
  }, [clear, restoreTyped]);

  // Eén stap uitvoeren
  useEffect(() => {
    if (!step || paused) return;
    let cancelled = false;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) {
      // Element niet op deze pagina (bijv. lege staat): sla over.
      timer.current = window.setTimeout(() => {
        if (i + 1 < steps.length) setI(i + 1);
        else finish();
      }, 50);
      return;
    }
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    const run = async () => {
      await wait(20);
      if (cancelled) return;
      restoreTyped();
      await wait(reduce ? 50 : 550);
      if (cancelled) return;
      const r = el.getBoundingClientRect();
      setRect(r);
      const cx = Math.min(r.left + Math.min(r.width * 0.5, 220), window.innerWidth - 40);
      const cy = r.top + Math.min(r.height * 0.5, 60);
      setCursor({ x: cx, y: cy });
      await wait(reduce ? 50 : 700);
      if (cancelled) return;
      if (step.action === "click") {
        setRipple((k) => k + 1);
        if (step.real) {
          const clickable = el.matches("button, a, summary, [role=button]") ? el : el.querySelector<HTMLElement>("summary, button, a");
          clickable?.click();
          await wait(400);
          if (!cancelled) setRect(el.getBoundingClientRect());
        }
      }
      if (step.action === "type" && step.typeText) {
        const input = el.matches("input, textarea") ? (el as HTMLInputElement) : el.querySelector<HTMLInputElement | HTMLTextAreaElement>("input:not([type=hidden]), textarea");
        if (input) {
          typedInto.current = input;
          const setter = Object.getOwnPropertyDescriptor(input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value")?.set;
          for (let c = 1; c <= step.typeText.length; c++) {
            if (cancelled) return;
            setter?.call(input, step.typeText.slice(0, c));
            input.dispatchEvent(new Event("input", { bubbles: true }));
            setTyped(step.typeText.slice(0, c));
            await wait(reduce ? 5 : 70);
          }
        }
      }
      const readTime = Math.max(2600, step.text.length * 45) + (step.hold ?? 0);
      timer.current = window.setTimeout(() => {
        if (i + 1 < steps.length) setI(i + 1);
        else finish();
      }, reduce ? Math.min(readTime, 2500) : readTime);
    };
    void run();
    return () => { cancelled = true; clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, paused, step, steps.length]);

  // Rect meevolgen bij scroll/resize
  useEffect(() => {
    const el = step ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    if (!el) return;
    const upd = () => setRect(el.getBoundingClientRect());
    window.addEventListener("resize", upd);
    window.addEventListener("scroll", upd, true);
    return () => { window.removeEventListener("resize", upd); window.removeEventListener("scroll", upd, true); };
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") { clear(); setI((n) => Math.min(n + 1, steps.length - 1)); }
      if (e.key === "ArrowLeft") { clear(); setI((n) => Math.max(n - 1, 0)); }
      if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish, clear, steps.length]);

  if (!step) return null;
  const pad = 8;
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 120, damping: 20 };

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none" aria-live="polite">
      {/* spotlight */}
      <AnimatePresence>
        {rect && (
          <motion.div key="spot" className="absolute rounded-[20px] border-[3px] border-blue" initial={{ opacity: 0 }} animate={{ opacity: 1, left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} exit={{ opacity: 0 }} transition={spring} style={{ boxShadow: "0 0 0 9999px rgba(23,32,51,0.38), 0 0 0 6px rgba(91,108,255,0.25)" }} />
        )}
      </AnimatePresence>
      {/* cursor */}
      <motion.div className="absolute" animate={{ x: cursor.x - 4, y: cursor.y - 2 }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 18 }} style={{ width: CURSOR_W, height: CURSOR_W }} aria-hidden>
        <AnimatePresence>
          {ripple > 0 && <motion.span key={ripple} className="absolute -left-4 -top-4 size-10 rounded-full bg-blue/40" initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.6 }} />}
        </AnimatePresence>
        <svg viewBox="0 0 24 24" width={CURSOR_W} height={CURSOR_W} style={{ filter: "drop-shadow(0 4px 8px rgba(23,32,51,0.45))" }}>
          <path d="M5 3l14 8.5-6.3 1.4L16 20l-3-1.4-3.1-6.6L5 17z" fill="#172033" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        {typed && <span className="absolute left-7 top-5 whitespace-nowrap rounded-full bg-ink text-white text-xs font-semibold px-2 py-1">{typed}</span>}
      </motion.div>
      {/* caption */}
      <div className="absolute inset-x-0 bottom-6 flex justify-center px-4 pointer-events-auto">
        <motion.div key={i} initial={reduce ? false : { y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card-lift max-w-xl w-full p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="clay size-9 bg-sky text-blue-deep shrink-0 font-display font-extrabold text-sm">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold t-muted">{title} · step {i + 1} of {steps.length}</p>
              <p className="font-semibold text-[0.9375rem] leading-snug mt-0.5">{step.text}</p>
            </div>
            <button type="button" onClick={finish} className="press p-2 rounded-full text-ink-2 hover:bg-cloud" aria-label="Close walkthrough"><X className="size-4" /></button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-cloud overflow-hidden"><div className="h-full rounded-full bg-blue transition-[width] duration-500" style={{ width: `${((i + 1) / steps.length) * 100}%` }} /></div>
            <button type="button" onClick={() => { clear(); setI((n) => Math.max(0, n - 1)); }} className="press p-1.5 rounded-full text-ink-2 hover:bg-cloud" aria-label="Previous step"><SkipBack className="size-4" /></button>
            <button type="button" onClick={() => setPaused((p) => !p)} className="press p-1.5 rounded-full text-ink-2 hover:bg-cloud" aria-label={paused ? "Play" : "Pause"}>{paused ? <Play className="size-4" /> : <Pause className="size-4" />}</button>
            <button type="button" onClick={() => { clear(); if (i + 1 < steps.length) setI(i + 1); else finish(); }} className="press p-1.5 rounded-full text-ink-2 hover:bg-cloud" aria-label="Next step"><SkipForward className="size-4" /></button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
