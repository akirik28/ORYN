"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { Send, ShieldOff, ShieldCheck, Flag, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { sendMessage, markConversationRead, blockUser, unblockUser, reportMessage } from "@/app/(app)/messages/actions";
import type { Message } from "@/types/database";

export function ConversationThread({
  currentUserId,
  otherUserId,
  otherDisplayName,
  initialMessages,
  isBlocked,
}: {
  currentUserId: string;
  otherUserId: string;
  otherDisplayName: string;
  initialMessages: Message[];
  isBlocked: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(isBlocked);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportTarget, setReportTarget] = useState<Message | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void markConversationRead(otherUserId);
  }, [otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <p className="text-sm text-muted-foreground">
          {blocked ? "You've blocked this student — they can't message you, and you can't message them." : "Accepted connection"}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} nativeButton={true} aria-label="Conversation options">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
        {blocked ? (
          <p className="text-center text-sm text-muted-foreground">Unblock to send a new message.</p>
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
