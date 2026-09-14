"use client";

import { useState } from "react";
import { MessageSquareReply } from "lucide-react";
import { CommentComposer } from "./comment-composer";
import type { Profile } from "@/lib/types";

export function ReplyToggle({ goalId, members, parentId, goalUpdateId }: { goalId: string; members: Profile[]; parentId?: string; goalUpdateId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="press inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 bg-cloud text-ink-2 hover:text-ink">
          <MessageSquareReply className="size-3.5" aria-hidden /> Reageren
        </button>
      ) : (
        <div className="mt-2">
          <CommentComposer goalId={goalId} members={members} parentId={parentId} goalUpdateId={goalUpdateId} compact placeholder="Schrijf een antwoord…" onDone={() => setOpen(false)} autoFocus />
        </div>
      )}
    </div>
  );
}
