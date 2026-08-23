"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AdvisorMessage, AdvisorMessageThinking } from "@/components/oryn/advisor-message";
import { Eyebrow } from "@/components/oryn/eyebrow";
import { sendAdvisorMessage, retryAdvisorMessage } from "@/app/(app)/advisor/actions";
import type { AdvisorMessage as AdvisorMessageRow } from "@/types/database";

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

// Openers phrased as decisions a student is actually weighing, not feature prompts. The
// second one matters most: it invites Oryn to say *no*, which is the behaviour the master
// spec's Phase 39 is built around and the thing that most distinguishes it from a chatbot.
const SUGGESTED_PROMPTS = [
  "What's the weakest part of my profile?",
  "Should I start another club?",
  "What should I do this week?",
  "Is my university list realistic?",
];

export function AdvisorChat({
  conversationId,
  initialMessages,
  aiConfigured,
}: {
  conversationId: string | null;
  initialMessages: AdvisorMessageRow[];
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
    // No card around the conversation. A bordered panel makes counsel look like output
    // from a widget; this is the page.
    <div className="flex flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-10 overflow-y-auto pb-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl">
            <Eyebrow>Start here</Eyebrow>
            <p className="mt-4 font-display text-2xl leading-[1.2] tracking-[-0.02em] text-balance">
              Ask Oryn what to do — or whether something is worth doing at all.
            </p>
            <p className="mt-3 leading-relaxed text-ink-2">
              Oryn answers from what it already knows about your profile, and will tell you when
              the honest answer is to do less.
            </p>
            <div className="mt-6 flex flex-col items-start gap-1">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => submit(prompt)}
                  disabled={!aiConfigured}
                  className="-mx-2 rounded-md px-2 py-1.5 text-left text-sm text-ink-2 underline-offset-4 transition-colors hover:text-brand-primary hover:underline disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) =>
            message.pending ? (
              <AdvisorMessageThinking key={message.id} />
            ) : message.role === "user" ? (
              <AdvisorMessage key={message.id} variant="student">
                <p className="whitespace-pre-wrap">{message.content}</p>
              </AdvisorMessage>
            ) : message.failed ? (
              <AdvisorMessage key={message.id}>
                <p className="text-ink-3">
                  {message.errorMessage || "Oryn couldn't complete this response."}
                </p>
                <p className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => retry(message.id)}
                    disabled={retryingId === message.id}
                  >
                    <RotateCcw className="size-3.5" />
                    Try again
                  </Button>
                </p>
              </AdvisorMessage>
            ) : (
              <AdvisorMessage key={message.id}>
                {/* Server-authored prose. Split on blank lines so multi-paragraph counsel
                    gets real paragraph rhythm instead of one wall behind `whitespace-pre-wrap`. */}
                {message.content
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((para, i) => (
                    <p key={i} className="whitespace-pre-wrap">
                      {para}
                    </p>
                  ))}
              </AdvisorMessage>
            ),
          )
        )}
      </div>

      {error ? <p className="pb-3 text-sm text-error">{error}</p> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        /* Clears the fixed mobile bottom bar (56px + safe area). A plain `bottom-0` sticks the
           composer to the viewport floor, which is exactly where the nav already is — the send
           button ends up underneath "Journey". Desktop (lg and up) has no bottom bar, so it returns to 0. */
        className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] flex items-end gap-2 border-t border-border bg-background/95 py-4 backdrop-blur-sm lg:bottom-0"
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
          placeholder={aiConfigured ? "Ask Oryn…" : "The AI counselor isn't configured yet"}
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
