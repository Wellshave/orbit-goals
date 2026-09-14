"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Gift, Star } from "lucide-react";
import type { Goal, Milestone, Reward } from "@/lib/types";
import { fmtValue } from "@/lib/format";
import { Button } from "@/components/ui";

/**
 * Milestone celebration: georkestreerde lichtgolf + diepte, geen confetti.
 * Verschijnt via ?celebrate=<milestone_id> (gezet door de notificatie / de update-actie).
 */
export function MilestoneCelebration({ goal, milestones, rewards }: { goal: Goal; milestones: Milestone[]; rewards: Reward[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const id = sp.get("celebrate");
  const m = milestones.find((x) => x.id === id);
  const [open, setOpen] = useState(Boolean(m));
  const [seenId, setSeenId] = useState(id);
  if (id !== seenId) {
    setSeenId(id);
    setOpen(Boolean(m));
  }

  function close() {
    setOpen(false);
    const q = new URLSearchParams(sp.toString());
    q.delete("celebrate");
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  if (!m) return null;
  const reward = rewards.find((r) => r.milestone_id === m.id);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="celebrate-title">
          <button type="button" className="absolute inset-0 bg-ink-deep/80 backdrop-blur-sm" onClick={close} aria-label="Sluiten" />
          {!reduce && (
            <>
              <motion.div aria-hidden className="absolute rounded-full border border-orchid/40" initial={{ width: 80, height: 80, opacity: 0.9 }} animate={{ width: 1400, height: 1400, opacity: 0 }} transition={{ duration: 1.8, ease: "easeOut" }} />
              <motion.div aria-hidden className="absolute rounded-full border border-cobalt/40" initial={{ width: 80, height: 80, opacity: 0.9 }} animate={{ width: 1100, height: 1100, opacity: 0 }} transition={{ duration: 1.6, ease: "easeOut", delay: 0.15 }} />
              <motion.div aria-hidden className="absolute size-[520px] rounded-full" style={{ background: "radial-gradient(circle, rgba(149,103,232,0.35), rgba(73,108,255,0.12) 40%, transparent 70%)" }} initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1.2, opacity: [0, 1, 0.6] }} transition={{ duration: 1.4, ease: "easeOut" }} />
            </>
          )}
          <motion.div
            className="relative deck-raised max-w-md w-full p-8 text-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.94, rotateX: 12 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 160, damping: 20, delay: reduce ? 0 : 0.25 }}
            style={{ transformPerspective: 900 }}
          >
            <motion.div
              className="mx-auto mb-5 grid place-items-center size-20 rounded-full text-white"
              style={{ background: "radial-gradient(circle at 35% 30%, #B391F2, #9567E8 50%, #17213D)", boxShadow: "0 20px 50px -12px rgba(149,103,232,0.9), inset 0 2px 4px rgba(255,255,255,0.4)" }}
              initial={reduce ? false : { scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.4 }}
            >
              <Star className="size-8" aria-hidden />
            </motion.div>
            <p className="t-eyebrow">{m.is_ultimate ? "Ultimate goal behaald" : "Milestone behaald"}</p>
            <h2 id="celebrate-title" className="t-display text-4xl mt-2">{m.name}</h2>
            <p className="t-num text-orchid-soft mt-2 text-lg">{fmtValue(m.target_value, goal.unit)}</p>
            <p className="t-sub mt-3">{goal.title}</p>
            {reward && (
              <div className="mt-5 well p-3 inline-flex items-center gap-2.5 text-sm text-left">
                <Gift className="size-5 text-orchid-soft shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold">Reward: {reward.title}</p>
                  {reward.description && <p className="text-xs text-muted">{reward.description}</p>}
                </div>
              </div>
            )}
            <Button className="mt-6" size="lg" variant="orchid" onClick={close}>Doorgaan</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
