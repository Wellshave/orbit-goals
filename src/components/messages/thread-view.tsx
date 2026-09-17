"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, SendHorizontal } from "lucide-react";
import { sendMessage } from "@/app/actions/messages";
import { createClient } from "@/lib/supabase/client";
import { ActionForm } from "@/components/ui/form";
import { Avatar, FormMessage, SubmitButton } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import type { DirectMessage, Profile } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n/client";

export function ThreadView({ meId, other, messages }: { meId: string; other: Profile; messages: DirectMessage[] }) {
  const [state, action, isPending] = useActionState(sendMessage, undefined);
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const firstName = other.full_name.split(" ")[0] || other.full_name;

  // Nieuwste bericht in beeld houden.
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  // Na een geslaagde verzending: veld leegmaken en focus terug.
  useEffect(() => {
    if (!state?.sentAt || !inputRef.current) return;
    inputRef.current.value = "";
    inputRef.current.focus();
  }, [state?.sentAt]);

  // Live binnenkomende berichten: eerst de sessie laden, anders joint realtime anoniem en houdt RLS alles tegen.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel(`dm:${meId}:${other.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${meId}` }, () => {
          router.refresh();
          // Tweede verversing: het openen markeert bericht en melding als gelezen, daarna klopt de teller in de balk weer.
          setTimeout(() => router.refresh(), 1500);
        })
        .subscribe();
    });
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [meId, other.id, router]);

  return (
    <section className="card flex flex-col h-[calc(100dvh-230px)] min-h-[420px] overflow-hidden" aria-label={other.full_name}>
      <header className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-line bg-white/70">
        <Avatar name={other.full_name} src={other.avatar_url} size="md" ring />
        <div className="min-w-0 flex-1">
          <p className="font-display font-extrabold truncate">{other.full_name}</p>
          <p className="text-xs t-muted truncate">{other.job_title || "—"}</p>
        </div>
        <Link href={`/people/${other.id}`} className="text-xs font-semibold text-blue-deep hover:underline shrink-0">{t("messages.viewProfile")}</Link>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-1.5" role="log" aria-live="polite">
        <p className="self-center text-xs t-muted inline-flex items-center gap-1.5 bg-cloud rounded-full px-3 py-1 mb-2"><Lock className="size-3" aria-hidden /> {t("messages.privateNote", { name: firstName })}</p>
        {messages.length === 0 && (
          <div className="m-auto text-center">
            <p className="font-display font-extrabold text-lg">{t("messages.threadEmpty")}</p>
            <p className="text-sm t-muted">{t("messages.threadEmptyBody", { name: firstName })}</p>
          </div>
        )}
        {messages.map((m, idx) => {
          const mine = m.sender_id === meId;
          const showDay = idx === 0 || messages[idx - 1].created_at.slice(0, 10) !== m.created_at.slice(0, 10);
          return (
            <div key={m.id} className="flex flex-col">
              {showDay && <p className="self-center text-xs font-semibold t-muted my-2">{fmtDate(m.created_at, "EEEE d MMMM", locale)}</p>}
              <div className={`max-w-[85%] sm:max-w-[70%] rounded-3xl px-4 py-2.5 text-[0.9375rem] whitespace-pre-wrap break-words ${mine ? "self-end bg-blue text-white rounded-br-lg" : "self-start bg-cloud text-ink rounded-bl-lg"}`}>
                {m.body}
                <span className={`block text-[0.6875rem] mt-0.5 ${mine ? "text-white/75 text-right" : "t-muted"}`}>{fmtDate(m.created_at, "HH:mm", locale)}</span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <ActionForm action={action} pending={isPending} className="border-t border-line p-3 sm:p-4 bg-white/70">
        <input type="hidden" name="to" value={other.id} />
        <div className="flex items-end gap-2">
          <label htmlFor="dm-body" className="sr-only">{t("messages.placeholder", { name: firstName })}</label>
          <textarea
            id="dm-body" ref={inputRef} name="body" rows={1} maxLength={4000} required
            placeholder={t("messages.placeholder", { name: firstName })}
            className="ctl !min-h-11 max-h-40 flex-1 resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
          />
          <SubmitButton pendingText={t("messages.sending")}><SendHorizontal className="size-4" aria-hidden /> {t("messages.send")}</SubmitButton>
        </div>
        <div className="flex items-center justify-between gap-3 mt-1.5">
          <p className="text-xs t-muted hidden sm:block">{t("messages.enterHint")}</p>
          <FormMessage error={state?.error} />
        </div>
      </ActionForm>
    </section>
  );
}
