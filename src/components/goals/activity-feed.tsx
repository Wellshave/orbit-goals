import { ThumbsUp, Award, Flag, Sparkles, ArrowRightLeft, UserPlus, Star } from "lucide-react";
import type { ActivityEvent, Comment, Goal, GoalUpdate, Profile, Reaction, Recognition } from "@/lib/types";
import { Avatar } from "@/components/ui";
import { fmtRelative, fmtValue, fmtDate } from "@/lib/format";
import { toggleReaction, deleteComment } from "@/app/actions/comments";
import { toggleRecognition } from "@/app/actions/goals";
import { CommentComposer } from "./comment-composer";
import { ReplyToggle } from "./feed-item-actions";
import { STATUS_META } from "@/lib/status";
import type { Status } from "@/lib/types";

type Item =
  | { kind: "update"; at: string; update: GoalUpdate }
  | { kind: "comment"; at: string; comment: Comment }
  | { kind: "event"; at: string; event: ActivityEvent };

/** Activity feed van een doel: updates, reacties (met antwoorden), systeemgebeurtenissen. */
export function ActivityFeed({ goal, updates, comments, reactions, recognitions, events, byId, me, canManage, members }: {
  goal: Goal; updates: GoalUpdate[]; comments: Comment[]; reactions: Reaction[]; recognitions: Recognition[]; events: ActivityEvent[];
  byId: Map<string, Profile>; me: Profile; canManage: boolean; members: Profile[];
}) {
  const topComments = comments.filter((c) => !c.parent_comment_id && !c.goal_update_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_comment_id === id);
  const commentsOnUpdate = (id: string) => comments.filter((c) => c.goal_update_id === id && !c.parent_comment_id);
  const sysEvents = events.filter((e) => ["milestone_achieved", "status_change", "goal_created", "goal_achieved", "assignment"].includes(e.kind));

  const items: Item[] = [
    ...updates.map((u) => ({ kind: "update" as const, at: u.created_at, update: u })),
    ...topComments.map((c) => ({ kind: "comment" as const, at: c.created_at, comment: c })),
    ...sysEvents.map((e) => ({ kind: "event" as const, at: e.created_at, event: e })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const shared = goal.visibility !== "private";

  return (
    <div>
      {shared && (
        <div className="mb-5">
          <CommentComposer goalId={goal.id} members={members} />
        </div>
      )}
      {items.length === 0 && <p className="text-sm text-muted">Nog geen activiteit. De eerste voortgangsupdate verschijnt hier.</p>}
      <ol className="flex flex-col gap-4">
        {items.map((it) => {
          if (it.kind === "update") {
            const u = it.update;
            const author = byId.get(u.profile_id);
            const recs = recognitions.filter((r) => r.goal_update_id === u.id);
            const mine = recs.some((r) => r.recognized_by === me.id);
            const delta = Number(u.new_value) - Number(u.previous_value);
            return (
              <li key={`u-${u.id}`} className="deck p-4" id={`u-${u.id}`}>
                <div className="flex items-start gap-3">
                  <Avatar name={author?.full_name ?? "?"} src={author?.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{author?.full_name ?? "Onbekend"}</span>
                      <span className="text-muted"> · voortgang · {fmtRelative(u.created_at)}</span>
                    </p>
                    <p className="t-num mt-1.5 text-base">
                      {goal.measure === "binary" ? (
                        <span className="font-semibold text-orchid-soft">{u.new_value >= 1 ? "Gemarkeerd als behaald" : "Heropend"}</span>
                      ) : (
                        <>
                          <span className="text-muted">{fmtValue(u.previous_value, goal.unit)}</span>
                          <span className="text-muted mx-2" aria-hidden>→</span>
                          <span className="font-semibold">{fmtValue(u.new_value, goal.unit)}</span>
                          <span className={`ml-2 text-xs ${delta >= 0 ? "text-cobalt-soft" : "text-coral-soft"}`}>{delta >= 0 ? "+" : "−"}{fmtValue(Math.abs(delta), goal.unit)}</span>
                        </>
                      )}
                    </p>
                    {u.note && <p className="text-sm text-ice-dim mt-1.5 whitespace-pre-line">{u.note}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {(canManage || mine) && u.profile_id !== me.id && (
                        <form action={toggleRecognition}>
                          <input type="hidden" name="goal_update_id" value={u.id} />
                          <input type="hidden" name="goal_id" value={goal.id} />
                          <button type="submit" aria-pressed={mine} className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full border px-2 py-0.5 ${mine ? "text-orchid-soft border-orchid/50 bg-orchid/10" : "text-muted border-line-strong hover:text-ice"}`}>
                            <Award className="size-3.5" aria-hidden /> {mine ? "Erkend" : "Erkennen"} {recs.length > 0 && <span className="t-num">{recs.length}</span>}
                          </button>
                        </form>
                      )}
                      {!canManage && !mine && recs.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-orchid-soft"><Award className="size-3.5" aria-hidden /> Erkend door {recs.map((r) => byId.get(r.recognized_by)?.full_name.split(" ")[0]).join(", ")}</span>
                      )}
                      {shared && <ReplyToggle goalId={goal.id} members={members} goalUpdateId={u.id} />}
                    </div>
                    {commentsOnUpdate(u.id).length > 0 && (
                      <ul className="mt-3 flex flex-col gap-3 border-l border-line pl-3">
                        {commentsOnUpdate(u.id).map((c) => (
                          <CommentItem key={c.id} c={c} goal={goal} byId={byId} me={me} reactions={reactions} replies={repliesOf(c.id)} members={members} shared={shared} />
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            );
          }
          if (it.kind === "comment") {
            return (
              <li key={`c-${it.comment.id}`} className="deck p-4" id={`c-${it.comment.id}`}>
                <CommentItem c={it.comment} goal={goal} byId={byId} me={me} reactions={reactions} replies={repliesOf(it.comment.id)} members={members} shared={shared} />
              </li>
            );
          }
          const e = it.event;
          const p = e.payload as Record<string, string>;
          const icon = e.kind === "milestone_achieved" ? <Star className="size-3.5 text-orchid-soft" /> : e.kind === "goal_achieved" ? <Sparkles className="size-3.5 text-orchid-soft" /> : e.kind === "status_change" ? <ArrowRightLeft className="size-3.5 text-muted" /> : e.kind === "assignment" ? <UserPlus className="size-3.5 text-muted" /> : <Flag className="size-3.5 text-muted" />;
          const text =
            e.kind === "milestone_achieved" ? <>Milestone <strong className="text-ice">{p.name}</strong> behaald{p.is_ultimate ? " — ultimate goal!" : ""}</>
            : e.kind === "goal_achieved" ? <>Doel <strong className="text-ice">behaald</strong></>
            : e.kind === "status_change" ? <>Status: {STATUS_META[p.from as Status]?.label ?? p.from} → <strong className="text-ice">{STATUS_META[p.to as Status]?.label ?? p.to}</strong></>
            : e.kind === "assignment" ? <>{byId.get(p.profile_id)?.full_name ?? "Iemand"} toegewezen als verantwoordelijke</>
            : <>Doel aangemaakt{e.actor_id ? ` door ${byId.get(e.actor_id)?.full_name ?? ""}` : ""}</>;
          return (
            <li key={`e-${e.id}`} className="flex items-center gap-2.5 px-1 text-xs text-muted">
              <span className="grid place-items-center size-6 rounded-full bg-ink-deep border border-line" aria-hidden>{icon}</span>
              <span>{text}</span>
              <span className="ml-auto t-num shrink-0">{fmtDate(e.created_at, "d MMM HH:mm")}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function CommentItem({ c, goal, byId, me, reactions, replies, members, shared, depth = 0 }: { c: Comment; goal: Goal; byId: Map<string, Profile>; me: Profile; reactions: Reaction[]; replies: Comment[]; members: Profile[]; shared: boolean; depth?: number }) {
  const author = byId.get(c.author_id);
  const likes = reactions.filter((r) => r.comment_id === c.id && r.kind === "like");
  const acks = reactions.filter((r) => r.comment_id === c.id && r.kind === "ack");
  const iLike = likes.some((r) => r.profile_id === me.id);
  const iAck = acks.some((r) => r.profile_id === me.id);
  return (
    <div className="flex items-start gap-3" id={`c-${c.id}`}>
      <Avatar name={author?.full_name ?? "?"} src={author?.avatar_url} size={depth ? "xs" : "sm"} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold">{author?.full_name ?? "Onbekend"}</span>
          <span className="text-muted"> · {fmtRelative(c.created_at)}</span>
        </p>
        <p className="text-sm text-ice-dim mt-1 whitespace-pre-line">{highlightMentions(c.body)}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <form action={toggleReaction} className="inline">
            <input type="hidden" name="comment_id" value={c.id} />
            <input type="hidden" name="goal_id" value={goal.id} />
            <input type="hidden" name="kind" value="like" />
            <button type="submit" aria-pressed={iLike} className={`inline-flex items-center gap-1 text-xs font-semibold ${iLike ? "text-cobalt-soft" : "text-muted hover:text-ice"}`}>
              <ThumbsUp className="size-3.5" aria-hidden /> {likes.length > 0 ? likes.length : "Like"}
            </button>
          </form>
          <form action={toggleReaction} className="inline">
            <input type="hidden" name="comment_id" value={c.id} />
            <input type="hidden" name="goal_id" value={goal.id} />
            <input type="hidden" name="kind" value="ack" />
            <button type="submit" aria-pressed={iAck} className={`inline-flex items-center gap-1 text-xs font-semibold ${iAck ? "text-orchid-soft" : "text-muted hover:text-ice"}`}>
              <Award className="size-3.5" aria-hidden /> {acks.length > 0 ? `Erkend ${acks.length}` : "Erkennen"}
            </button>
          </form>
          {shared && depth === 0 && <ReplyToggle goalId={goal.id} members={members} parentId={c.id} />}
          {c.author_id === me.id && (
            <form action={deleteComment} className="inline">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="goal_id" value={goal.id} />
              <button type="submit" className="text-xs text-muted hover:text-coral-soft">Verwijderen</button>
            </form>
          )}
        </div>
        {replies.length > 0 && (
          <ul className="mt-3 flex flex-col gap-3 border-l border-line pl-3">
            {replies.map((r) => (
              <li key={r.id}>
                <CommentItem c={r} goal={goal} byId={byId} me={me} reactions={reactions} replies={[]} members={members} shared={shared} depth={1} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function highlightMentions(body: string) {
  const parts = body.split(/(@[A-Za-zÀ-ÿ][\w.'\-]*(?: [A-Za-zÀ-ÿ][\w.'\-]*){0,3})/g);
  return parts.map((p, i) => (p.startsWith("@") ? <span key={i} className="text-cobalt-soft font-semibold">{p}</span> : p));
}
