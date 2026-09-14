"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Gift, Flag, Star } from "lucide-react";
import type { Goal, Milestone, Reward } from "@/lib/types";
import { fmtValue } from "@/lib/format";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

/** Milestone-viering: lichte, warme gloed en een badge die rustig verschijnt. */
export function MilestoneCelebration({ goal, milestones, rewards }: { goal: Goal; milestones: Milestone[]; rewards: Reward[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const t = useT();
  const id = sp.get("celebrate");
  const m = milestones.find((x) => x.id === id);
  const [open, setOpen] = useState(Boolean(m));
  const [seenId, setSeenId] = useState(id);
  if (id !== seenId) { setSeenId(id); setOpen(Boolean(m)); }

  function close() {
    setOpen(false);
    const q = new URLSearchParams(sp.toString());
    q.delete("celebrate");
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!m) return null;
  const reward = rewards.find((r) => r.milestone_id === m.id);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="celebrate-title">
          <button type="button" className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]" onClick={close} aria-label={t("celebration.close")} />
          {!reduce && (
            <>
              <motion.div aria-hidden className="absolute rounded-full" style={{ background: "radial-gradient(circle, rgba(246,200,95,0.55), rgba(72,207,174,0.25) 45%, transparent 70%)" }} initial={{ width: 120, height: 120, opacity: 0 }} animate={{ width: 900, height: 900, opacity: [0, 1, 0.5] }} transition={{ duration: 1.5, ease: "easeOut" }} />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.span key={i} aria-hidden className="absolute size-3 rounded-full" style={{ background: ["#F6C85F", "#48CFAE", "#9B72F2", "#FF7B6B", "#5B6CFF", "#F6C85F"][i] }} initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }} animate={{ x: Math.cos((i / 6) * Math.PI * 2) * 180, y: Math.sin((i / 6) * Math.PI * 2) * 140 - 40, opacity: [0, 1, 0], scale: [0.5, 1.2, 0.8] }} transition={{ duration: 1.6, delay: 0.25, ease: "easeOut" }} />
              ))}
            </>
          )}
          <motion.div className="relative card-lift max-w-md w-full p-8 text-center" initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={{ type: "spring", stiffness: 170, damping: 20, delay: reduce ? 0 : 0.2 }}>
            <motion.div className="clay mx-auto mb-5 size-24 rounded-[28px] bg-butter text-yellow-deep" initial={reduce ? false : { scale: 0.5, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 13, delay: 0.35 }}>
              {m.is_ultimate ? <Flag className="size-11" strokeWidth={2.25} /> : <Star className="size-11" strokeWidth={2.25} />}
            </motion.div>
            <p className="t-label">{m.is_ultimate ? t("celebration.ultimate") : t("celebration.milestone")}</p>
            <h2 id="celebrate-title" className="text-4xl mt-1">{m.name}</h2>
            <p className="font-display font-bold text-mint-deep mt-2 text-lg">{fmtValue(m.target_value, goal.unit)}</p>
            <p className="t-muted mt-2">{goal.title}</p>
            {reward && (
              <div className="mt-5 tile soft-butter p-4 inline-flex items-center gap-3 text-left">
                <span className="clay size-11 bg-white text-yellow-deep"><Gift className="size-5" /></span>
                <div><p className="font-bold text-sm">{t("celebration.reward", { r: reward.title })}</p>{reward.description && <p className="text-xs t-muted">{reward.description}</p>}</div>
              </div>
            )}
            <Button className="mt-6" size="lg" variant="mint" onClick={close}>{t("celebration.continue")}</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
