"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { MoreHorizontal } from "lucide-react";

/** Lichte parallax op één betekenisvolle visualisatie. Uit bij reduced motion en op touch. */
export function Parallax({ children, strength = 8 }: { children: ReactNode; strength?: number }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 120, damping: 18 });
  const sy = useSpring(y, { stiffness: 120, damping: 18 });
  if (reduce) return <div>{children}</div>;
  return (
    <div
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set(((e.clientX - r.left) / r.width - 0.5) * strength);
        y.set(((e.clientY - r.top) / r.height - 0.5) * (strength * 0.6));
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
    >
      <motion.div style={{ x: sx, y: sy }}>{children}</motion.div>
    </div>
  );
}

/** Secundaire acties achter één knop. Sluit bij klik buiten het menu en met Escape. */
export function HeaderMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label={label} title={label}
        className="press grid place-items-center size-11 rounded-full bg-white border border-line text-ink-2 hover:text-ink shadow-[var(--shadow-press)]">
        <MoreHorizontal className="size-5" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 z-30 w-60 rounded-2xl bg-white border border-line shadow-[var(--shadow-lift)] p-1.5 flex flex-col [&>*]:w-full" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
          {children}
        </div>
      )}
    </div>
  );
}
