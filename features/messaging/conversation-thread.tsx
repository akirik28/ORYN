"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Send, ShieldOff, ShieldCheck, Flag, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { sendMessage, markConversationRead, blockUser, unblockUser, reportMessage } from "@/app/(app)/messages/actions";
import { resolveBlockUiState } from "@/lib/messaging/authorization";
import { isMessageFromConversationPartner, newMessageChannelFilter, newMessageChannelName } from "@/lib/messaging/realtime";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/database";

export function ConversationThread({
  currentUserId,
  otherUserId,
  otherDisplayName,
  initialMessages,
  connectionAccepted,
  blockedByMe,
  messagingBlocked,
}: {
  currentUserId: string;
  otherUserId: string;
  otherDisplayName: string;
  initialMessages: Message[];
  /** Whether there's currently a live accepted connection — independent of block state.
   * False and unaffected by blocking/unblocking here (that requires reconnecting via
   * /connections). Read access (this component always renders once reached) is a
   * separate, broader gate — see lib/messaging/authorization.ts. */
  connectionAccepted: boolean;
  blockedByMe: boolean;
  messagingBlocked: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  // Reconciles local state with the server's authoritative list whenever
  // router.refresh() lands new props — adjusted during render (React's documented
  // pattern for this, not an effect) so it takes effect before this render commits
  // instead of scheduling an extra one. See the submit()/realtime comments below for why
  // this exists: the optimistic row appended in submit() is never itself treated as proof
  // a message persisted, only as instant feedback until this replaces it.
  const [prevInitialMessages, setPrevInitialMessages] = useState(initialMessages);
  if (initialMessages !== prevInitialMessages) {
    setPrevInitialMessages(initialMessages);
    setMessages(initialMessages);
  }
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(blockedByMe);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportTarget, setReportTarget] = useState<Message | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // "Blocked by the other party" is only known at the moment this page loaded (no
  // realtime for the other side toggling their own block) and can't change from any
  // control in this component, so it's fixed for the session. My own `blocked` state is
  // reactive — toggling Block/Unblock below updates it, and composer visibility follows.
  const blockedByOtherAtLoad = messagingBlocked && !blockedByMe;
  const blockUiState = resolveBlockUiState({ blockedByMe: blocked, messagingBlocked: blocked || blockedByOtherAtLoad });
  const canSendNow = connectionAccepted && !blocked && !blockedByOtherAtLoad;

  useEffect(() => {
    void markConversationRead(otherUserId);
  }, [otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Realtime: only listens for messages addressed to ME (recipient_id = my id), then
  // re-fetches the whole conversation rather than splicing the payload into state — a
  // duplicate or out-of-order event just triggers a harmless repeat fetch of the same
  // truth, so there's no separate dedup logic to get wrong. RLS ("select own messages",
  // migration 0027) still gates what this channel can ever deliver — this subscription
  // can't see a row this user couldn't already SELECT. Reconnect/backoff is handled by
  // supabase-js's realtime client itself; this effect only needs to (re)subscribe when
  // the conversation identity changes and clean up on unmount.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(newMessageChannelName(currentUserId, otherUserId))
      .on<Message>(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: newMessageChannelFilter(currentUserId) },
        (payload) => {
          if (isMessageFromConversationPartner(payload.new.sender_id, otherUserId)) router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, otherUserId, router]);

  function submit() {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    startTransition(async () => {
      const result = await sendMessage(otherUserId, body);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: `optimistic-${Date.now()}`, sender_id: currentUserId, recipient_id: otherUserId, body, read_at: null, created_at: new Date().toISOString() },
      ]);
      setDraft("");
      router.refresh();
    });
  }

  function toggleBlock() {
    startTransition(async () => {
      const result = blocked ? await unblockUser(otherUserId) : await blockUser(otherUserId);
      if (!result.error) setBlocked((prev) => !prev);
    });
  }

  function submitReport() {
    if (!reportTarget || !reportReason.trim()) return;
    startTransition(async () => {
      await reportMessage(reportTarget.id, otherUserId, reportReason);
      setReportOpen(false);
      setReportReason("");
      setReportTarget(null);
    });
  }

  const headerCopy =
    blockUiState === "blocked_by_me"
      ? "You've blocked this student — they can't message you, and you can't message them."
      : blockUiState === "unavailable"
        ? "You can't message this student right now."
        : !connectionAccepted
          ? "You're no longer connected — you can view this conversation, but you can't send new messages."
          : "Accepted connection";

  const footerCopy =
    blockUiState === "blocked_by_me"
      ? "Unblock to send a new message."
      : blockUiState === "unavailable"
        ? "You can't send messages to this student right now."
        : "You're no longer connected, so you can't send new messages.";

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <p className="text-sm text-muted-foreground">{headerCopy}</p>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} nativeButton={true} aria-label="Conversation options">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Only "did I block them" is ever known here — see resolveBlockUiState.
                Blocking stays available even when disconnected or already blocked by the
                other party (harmless, and gives every user full control of their own
                block relationship). */}
            <DropdownMenuItem onClick={toggleBlock}>
              {blocked ? <ShieldCheck className="size-3.5" /> : <ShieldOff className="size-3.5" />}
              {blocked ? "Unblock" : "Block"} {otherDisplayName}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages yet — say hello.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={cn("group flex flex-col", mine ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                    mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  )}
                >
                  {m.body}
                </div>
                <div className="mt-1 flex items-center gap-2 px-1 text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                  {!mine && !m.id.startsWith("optimistic-") ? (
                    <button
                      type="button"
                      className="opacity-0 hover:underline group-hover:opacity-100"
                      onClick={() => {
                        setReportTarget(m);
                        setReportOpen(true);
                      }}
                    >
                      <Flag className="inline size-3" /> Report
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3">
        {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
        {!canSendNow ? (
          <p className="text-center text-sm text-muted-foreground">{footerCopy}</p>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Write a message…"
              rows={1}
              className="min-h-9 resize-none"
              maxLength={4000}
            />
            <Button size="icon" onClick={submit} disabled={isPending || !draft.trim()} aria-label="Send">
              <Send className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this message</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="What's wrong with this message?"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitReport} disabled={isPending || !reportReason.trim()}>
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
