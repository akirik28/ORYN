"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, ArrowUp, User, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendAdvisorMessage, retryAdvisorMessage } from "@/app/(app)/advisor/actions";
import type { AdvisorMessage } from "@/types/database";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  /** Persisted (migration 0046) — a failed turn renders as its own bubble with a Retry
   * affordance, sourced from the DB on load, not only from transient submit-time state. */
  failed?: boolean;
  errorMessage?: string;
}

const SUGGESTED_PROMPTS = [
  "What's my biggest gap right now?",
  "Should I start a new club?",
  "What should I focus on this week?",
];

export function AdvisorChat({
  conversationId,
  initialMessages,
  aiConfigured,
}: {
  conversationId: string | null;
  initialMessages: AdvisorMessage[];
  aiConfigured: boolean;
}) {
  const [convId, setConvId] = useState(conversationId);
  const [messages, setMessages] = useState<LocalMessage[]>(
    initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content ?? "",
      failed: m.status === "failed",
      errorMessage: m.error_message ?? undefined,
    }))
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const localIdCounter = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function submit(content: string) {
    if (!content.trim() || isPending) return;
    setError(null);
    localIdCounter.current += 1;
    const userMessage: LocalMessage = { id: `local-${localIdCounter.current}`, role: "user", content };
    const thinkingMessage: LocalMessage = { id: "thinking", role: "assistant", content: "", pending: true };
    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setInput("");

    startTransition(async () => {
      const result = await sendAdvisorMessage(convId, content);
      if (result.conversationId) setConvId(result.conversationId);

      if (result.error) {
        if (result.assistantMessageId) {
          // A real, persisted failed turn — render it as a retry-able bubble, same as one
          // loaded from the DB on refresh, instead of only an ephemeral banner.
          setMessages((prev) =>
            prev.map((m) => (m.id === "thinking" ? { id: result.assistantMessageId!, role: "assistant", content: "", failed: true, errorMessage: result.error } : m))
          );
        } else {
          // A pre-message failure (rate limit, validation) — nothing was persisted, so
          // there's nothing to retry against; drop the placeholder and show the banner.
          setMessages((prev) => prev.filter((m) => m.id !== "thinking"));
          setError(result.error);
        }
        return;
      }

      // Server persisted the reply; re-fetch is unnecessary for a snappy feel — just
      // trust the round trip completed and drop the optimistic placeholder. The page
      // revalidates on next navigation, so history stays consistent.
      setMessages((prev) => prev.filter((m) => m.id !== "thinking"));
    });
  }

  function retry(messageId: string) {
    if (retryingId) return;
    setRetryingId(messageId);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, pending: true, failed: false } : m)));

    startTransition(async () => {
      const result = await retryAdvisorMessage(messageId);
      setRetryingId(null);
      if (result.error) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, pending: false, failed: true, errorMessage: result.error } : m)));
        return;
      }
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, pending: false, failed: false, content: result.content ?? "" } : m)));
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border bg-card">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary-strong">
              <Sparkles className="size-6" />
            </span>
            <p className="max-w-sm text-sm text-muted-foreground">
              Ask about your priorities, a specific opportunity, or whether something is worth your time.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => submit(prompt)}
                  disabled={!aiConfigured}
                  className="rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-(--duration-fast) hover:border-brand-primary-border hover:bg-brand-primary-subtle disabled:pointer-events-none disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  message.failed
                    ? "bg-destructive/10 text-destructive"
                    : message.role === "assistant"
                      ? "bg-brand-primary-soft text-brand-primary-strong"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {message.role === "assistant" ? <Sparkles className="size-4" /> : <User className="size-4" />}
              </span>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  message.failed ? "border border-destructive/30 bg-destructive/5" : message.role === "assistant" ? "bg-muted" : "bg-brand-primary text-primary-foreground"
                )}
              >
                {message.pending ? (
                  <span className="flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-current" />
                  </span>
                ) : message.failed ? (
                  <div className="space-y-2">
                    <p className="text-destructive">{message.errorMessage || "Oryn couldn't generate this response."}</p>
                    <Button variant="outline" size="sm" onClick={() => retry(message.id)} disabled={retryingId === message.id}>
                      <RotateCcw className="size-3.5" />
                      Retry
                    </Button>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {error ? <p className="border-t px-4 py-2 text-sm text-destructive">{error}</p> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-end gap-2 border-t p-3"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          placeholder={aiConfigured ? "Ask the advisor…" : "AI Advisor isn't configured yet"}
          disabled={!aiConfigured}
          rows={1}
          className="max-h-32 min-h-9 flex-1 resize-none"
        />
        <Button type="submit" size="icon" aria-label="Send message" disabled={!aiConfigured || isPending || !input.trim()}>
          <ArrowUp className="size-4" />
        </Button>
      </form>
    </div>
  );
}
