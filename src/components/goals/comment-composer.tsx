"use client";

import { useActionState, useRef, useState } from "react";
import { addComment } from "@/app/actions/comments";
import { FormMessage, SubmitButton, Avatar, Button } from "@/components/ui";
import { HelpButton } from "@/components/help/help-button";
import { useT } from "@/lib/i18n/client";
import type { Profile } from "@/lib/types";

/** Reactieformulier met @-vermeldingen (autocomplete op teamleden). */
export function CommentComposer({ goalId, members, parentId, goalUpdateId, placeholder, compact = false, onDone, autoFocus }: { goalId: string; members: Profile[]; parentId?: string; goalUpdateId?: string; placeholder?: string; compact?: boolean; onDone?: () => void; autoFocus?: boolean }) {
  const t = useT();
  const [body, setBody] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [mentioned, setMentioned] = useState<string[]>([]);
  const ta = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof addComment>>, fd: FormData) => {
    const result = await addComment(prev, fd);
    if (result?.success) {
      setBody("");
      setMentioned([]);
      formRef.current?.reset();
      onDone?.();
    }
    return result;
  }, undefined);

  function onChange(v: string) {
    setBody(v);
    const caret = ta.current?.selectionStart ?? v.length;
    const before = v.slice(0, caret);
    const m = before.match(/@([\w.\- ]{0,30})$/);
    setQuery(m ? m[1] : null);
  }

  function pick(p: Profile) {
    const caret = ta.current?.selectionStart ?? body.length;
    const before = body.slice(0, caret).replace(/@([\w.\- ]{0,30})$/, `@${p.full_name} `);
    const after = body.slice(caret);
    setBody(before + after);
    setMentioned((m) => Array.from(new Set([...m, p.id])));
    setQuery(null);
    const pos = before.length;
    setTimeout(() => {
      ta.current?.focus();
      ta.current?.setSelectionRange(pos, pos);
    }, 0);
  }

  const suggestions = query === null ? [] : members.filter((m) => m.full_name.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

  return (
    <form ref={formRef} action={action} className="relative flex flex-col gap-2" data-tour={parentId || goalUpdateId ? undefined : "composer"}>
      <input type="hidden" name="goal_id" value={goalId} />
      {parentId && <input type="hidden" name="parent_comment_id" value={parentId} />}
      {goalUpdateId && <input type="hidden" name="goal_update_id" value={goalUpdateId} />}
      {mentioned.map((id) => (
        <input key={id} type="hidden" name="mention" value={id} />
      ))}
      <textarea
        ref={ta}
        name="body"
        value={body}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setQuery(null);
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") formRef.current?.requestSubmit();
        }}
        className={`ctl ${compact ? "!min-h-14" : "!min-h-20"}`}
        placeholder={placeholder ?? t("feed.placeholder")}
        aria-label={t("feed.message")}
        autoFocus={autoFocus}
        required
      />
      {suggestions.length > 0 && (
        <ul className="absolute left-0 top-full mt-1 z-20 card-lift p-1.5 w-64" role="listbox" aria-label={t("feed.tag")}>
          {suggestions.map((p) => (
            <li key={p.id}>
              <button type="button" role="option" aria-selected={false} onClick={() => pick(p)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-left text-sm hover:bg-cloud">
                <Avatar name={p.full_name} src={p.avatar_url} size="xs" />
                <span className="truncate">{p.full_name}</span>
                <span className="text-xs t-muted truncate">{p.job_title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <FormMessage error={state?.error} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs t-muted inline-flex items-center gap-2">{t("feed.shortcut")} {!parentId && !goalUpdateId && <HelpButton topic="composer" size="sm" />}</p>
        <div className="flex items-center gap-2">
          {onDone && (
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>{t("common.cancel")}</Button>
          )}
          <SubmitButton size="sm" pendingText={t("feed.posting")}>{parentId ? t("feed.postReply") : t("feed.post")}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
