"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AdvisorMessage, AdvisorMessageThinking } from "@/components/proxola/advisor-message";
import { Eyebrow } from "@/components/proxola/eyebrow";
import { UpgradePromptOverlay } from "@/features/advisor/upgrade-prompt-overlay";
import { sendAdvisorMessage, retryAdvisorMessage, softDismissUpgradePrompt, notNowUpgradePrompt } from "@/app/(app)/advisor/actions";
import { shouldShowUpgradePrompt, NOT_YET_DISMISSED, type UpgradePromptDismissalState } from "@/lib/advisor/upgrade-prompt";
import { formatAbsoluteDate } from "@/lib/i18n/date";
import type { Locale } from "@/lib/i18n/config";
import type { AdvisorMessage as AdvisorMessageRow, PlanTier, ResponseMode } from "@/types/database";

/** sessionStorage, not state -- "shown once per session" needs to survive this component
 * remounting (a route change and back) within the same tab, but must NOT survive a new tab
 * or a new day, which is exactly sessionStorage's own lifetime and none of localStorage's.
 * The durable dismissal tiers (soft/not-now/forever) are a different question, answered by
 * lib/advisor/upgrade-prompt.ts against the database -- this key only ever answers "have I
 * shown it in this browser tab already," nothing more. */
const UPGRADE_PROMPT_SESSION_KEY = "proxola:upgrade-prompt-shown";

function hasShownUpgradePromptThisSession(): boolean {
  try {
    return sessionStorage.getItem(UPGRADE_PROMPT_SESSION_KEY) === "1";
  } catch {
    // Private browsing / storage disabled -- fail toward "not shown yet" rather than
    // throwing, same posture as every other best-effort read in this feature.
    return false;
  }
}

function markUpgradePromptShownThisSession(): void {
  try {
    sessionStorage.setItem(UPGRADE_PROMPT_SESSION_KEY, "1");
  } catch {
    // Nothing to recover -- worst case this reappears once more later in the same
    // session, which the durable per-account caps still bound.
  }
}

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  /** Persisted (migration 0046) — a failed turn renders as its own bubble with a Retry
   * affordance, sourced from the DB on load, not only from transient submit-time state. */
  failed?: boolean;
  errorMessage?: string;
  /** True when this specific reply was served by the degraded (cheaper) model —
   * lib/ai/advisor-chat.ts's AdvisorReply.degraded, threaded straight through. Live-session
   * only: not persisted on the advisor_messages row, so a reply loaded from
   * `initialMessages` on a fresh page load is never marked degraded even if it originally
   * was — see docs/upgrade-prompt-design-spec-2026-09-02.md's punch list, item 1, on why
   * that's a deliberate scope line and not an oversight. */
  degraded?: boolean;
}

export function AdvisorChat({
  conversationId,
  initialMessages,
  aiConfigured,
  quotaExhausted = false,
  quotaResetsAt,
  tier = "standard",
  responseMode = "balanced",
  upgradePromptDismissalState = NOT_YET_DISMISSED,
  onConversationTitled,
}: {
  conversationId: string | null;
  initialMessages: AdvisorMessageRow[];
  aiConfigured: boolean;
  /** Called once per conversation, the first time sendAdvisorMessage reports a
   * conversationTitle back (lib/advisor/conversation-title.ts derives it from that first
   * message) — lets AdvisorWorkspace's own session list show the real topic instead of the
   * generic placeholder without waiting for a full reload. Optional so a caller with no list
   * to update (none exist outside AdvisorWorkspace today, but this component has its own
   * tests that construct it directly) doesn't need to pass a no-op. */
  onConversationTitled?: (conversationId: string, title: string) => void;
  /** This month's message-count backstop (lib/ai/monthly-quota.ts) is genuinely spent —
   * distinct from `degraded` on an individual reply. Optional and defaults to `false`,
   * same "a caller not yet passing it renders exactly as before" convention as
   * MonthlyUsageMeter's own `budgetDegraded` prop, so every existing caller (and test)
   * stays correct without change. */
  quotaExhausted?: boolean;
  /** ISO date the allowance resets — required to say something concrete rather than "soon"
   * whenever `quotaExhausted` is true; unused otherwise. */
  quotaResetsAt?: string;
  /** Both optional, same "existing caller/test renders exactly as before" convention as
   * quotaExhausted above — a caller not yet passing these gets tier="standard" (the more
   * conservative default: the prompt CAN evaluate as eligible, same as a real standard
   * account) and NOT_YET_DISMISSED (no suppression active), so nothing about not passing
   * these silently blocks the feature for a caller that simply hasn't been updated yet. */
  tier?: PlanTier;
  /** Same optional/default convention as tier above. Only used to compute isThoroughReply
   * below — never sent anywhere; the server independently resolves and re-checks this same
   * value from the student's own profile before it ever reaches generateAdvisorReply's own
   * gate, so a stale or spoofed prop here can only ever make the interim status label wrong,
   * never change what the model is actually asked to do. */
  responseMode?: ResponseMode;
  upgradePromptDismissalState?: UpgradePromptDismissalState;
}) {
  const t = useTranslations("advisor.chat");
  const locale = useLocale() as Locale;
  // Same gate lib/ai/advisor-chat.ts's generateAdvisorReply applies server-side before it
  // ever appends THOROUGH_INSTRUCTION — mirrored here only to pick a truer interim status
  // label (below), never to decide what the model is actually asked to do. A student's own
  // standing setting, not a per-message choice, so this is stable for the component's whole
  // lifetime, not recomputed per submission.
  const isThoroughReply = responseMode === "thorough" && tier === "ultra";
  // Openers phrased as decisions a student is actually weighing, not feature prompts. The
  // second one matters most: it invites Oryn to say *no*, which is the behaviour the master
  // spec's Phase 39 is built around and the thing that most distinguishes it from a chatbot.
  // Translated, not just labeled — clicking one sends its actual text as the chat message
  // (see submit() below), and the AI already answers in the student's language
  // (lib/ai/output-language.ts), so a Turkish prompt here keeps the whole exchange coherent
  // rather than opening a Turkish conversation with an English first line.
  const SUGGESTED_PROMPTS = [
    t("prompts.weakestPart"),
    t("prompts.anotherClub"),
    t("prompts.thisWeek"),
    t("prompts.universityListRealistic"),
  ];
  const [convId, setConvId] = useState(conversationId);
  const [messages, setMessages] = useState<LocalMessage[]>(
    initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content ?? "",
      failed: m.status === "failed",
      errorMessage: m.error_message ?? undefined,
      // Migration 0088 (live here 2026-09-02, still unapplied-safe for any environment that
      // hasn't run it yet): `m.degraded` is `undefined` when the column doesn't exist,
      // `false` for any row written before it did — both correctly render no note, same as
      // a real "not degraded" `false` does. See that migration's own comment for why
      // a plain `false` default is honest here rather than a guess.
      degraded: m.degraded ?? false,
    }))
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  // Which message (if any) currently shows the upgrade-prompt overlay directly below it —
  // at most one at a time, by construction: maybeShowUpgradePrompt only ever sets this once
  // per session (hasShownUpgradePromptThisSession), and nothing else clears it except the
  // student's own dismissal.
  const [upgradePromptMessageId, setUpgradePromptMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const localIdCounter = useRef(0);
  // maybeShowUpgradePrompt reads this instead of the `input` state variable directly: it
  // runs inside submit()'s async continuation, a closure fixed to the render where the user
  // clicked Send -- `input` there is permanently whatever was in the box at that moment (the
  // message they just sent, never ""), since setInput("") only schedules a future render and
  // cannot change an already-captured closure's own binding. A ref has no such snapshot; it
  // always holds whatever was most recently written to it, so it reflects the composer's
  // real state at the moment the reply actually arrives, not the moment it was requested.
  const inputRef = useRef("");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  /**
   * The one call site for lib/advisor/upgrade-prompt.ts's shouldShowUpgradePrompt — called
   * exactly once per genuinely new reply (from submit()'s and retry()'s own result-handling
   * code below, never from a render pass over historical messages), which is what makes
   * "only on the first qualifying reply" true by construction rather than something this
   * function has to separately enforce beyond the session-shown check.
   *
   * `isStreaming` is always `false` here deliberately, not a placeholder — this component
   * has no token-by-token streaming (the "thinking" placeholder is a spinner until the full
   * reply arrives in one Server Action response), so by the time this runs the reply is
   * already fully arrived, never mid-generation. Kept as an explicit field on
   * UpgradePromptContext (not silently dropped) so a future streaming implementation has an
   * obvious place to wire a real value in, rather than needing to rediscover the requirement.
   */
  function maybeShowUpgradePrompt(messageId: string, degraded: boolean | undefined) {
    if (hasShownUpgradePromptThisSession()) return;
    const shouldShow = shouldShowUpgradePrompt(
      { tier, degraded: degraded ?? false, isStreaming: false, hasUnsentComposerText: inputRef.current.trim().length > 0, alreadyShownThisSession: false },
      upgradePromptDismissalState,
    );
    if (!shouldShow) return;
    markUpgradePromptShownThisSession();
    setUpgradePromptMessageId(messageId);
  }

  // Not wrapped in startTransition (that one is tied to isPending, which disables the
  // composer while a message is in flight — an unrelated concern to a dismiss click). The
  // overlay hides optimistically either way; these are fire-and-forget, matching the Server
  // Actions' own contract of never surfacing an error for exactly this reason.
  function handleUpgradePromptNotNow() {
    setUpgradePromptMessageId(null);
    void notNowUpgradePrompt();
  }

  function handleUpgradePromptSoftDismiss() {
    setUpgradePromptMessageId(null);
    void softDismissUpgradePrompt();
  }

  function submit(content: string) {
    // The composer is already disabled while exhausted (see the Textarea/Button props
    // below) — this is the same guard repeated at the call site, not a second decision.
    // It exists for the same reason lib/ai/monthly-quota.ts's own comment gives for
    // checking server-side too: a Server Action (and, here, this function) is directly
    // callable regardless of what's rendered, so the thing that actually prevents a
    // wasted round-trip has to live in the code path, not only in a disabled attribute.
    if (!content.trim() || isPending || quotaExhausted) return;
    setError(null);
    localIdCounter.current += 1;
    const userMessage: LocalMessage = { id: `local-${localIdCounter.current}`, role: "user", content };
    const thinkingMessage: LocalMessage = { id: "thinking", role: "assistant", content: "", pending: true };
    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setInput("");
    inputRef.current = "";

    startTransition(async () => {
      const result = await sendAdvisorMessage(convId, content);
      if (result.conversationId) setConvId(result.conversationId);
      if (result.conversationId && result.conversationTitle) onConversationTitled?.(result.conversationId, result.conversationTitle);

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

      // Swap the thinking placeholder for the real reply directly, rather than only
      // dropping it: revalidatePath() on the server invalidates the route for the *next*
      // render, but this component's `messages` is local useState seeded once from
      // `initialMessages` — a prop change alone never flows back in without a remount, so
      // the reply would otherwise stay invisible until a manual reload (found live-testing
      // this exact path — the server had already persisted and returned the reply while
      // the chat kept showing nothing).
      setMessages((prev) =>
        prev.map((m) =>
          m.id === "thinking"
            ? { id: result.assistantMessageId ?? "thinking", role: "assistant", content: result.content ?? "", degraded: result.degraded }
            : m,
        )
      );
      maybeShowUpgradePrompt(result.assistantMessageId ?? "thinking", result.degraded);
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
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, pending: false, failed: false, content: result.content ?? "", degraded: result.degraded } : m)),
      );
      maybeShowUpgradePrompt(messageId, result.degraded);
    });
  }

  return (
    // The card is applied by the page (2026-08-30, explicit founder direction reversing
    // the earlier "no card" call here) — this component still owns none of that chrome
    // itself, only the scroll/composer layout inside it.
    <div className="flex flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-10 overflow-y-auto pb-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl">
            <Eyebrow locale={locale}>{t("startHere")}</Eyebrow>
            <p className="mt-4 font-display text-2xl leading-[1.2] tracking-[-0.02em] text-balance">
              {t("headline")}
            </p>
            <p className="mt-3 leading-relaxed text-ink-2">{t("subtext")}</p>
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
              <AdvisorMessageThinking
                key={message.id}
                statusLabel={isThoroughReply ? t("thinkingThorough") : t("thinking")}
              />
            ) : message.role === "user" ? (
              <AdvisorMessage key={message.id} variant="student">
                <p className="whitespace-pre-wrap">{message.content}</p>
              </AdvisorMessage>
            ) : message.failed ? (
              <AdvisorMessage key={message.id}>
                <p className="text-ink-3">
                  {message.errorMessage || t("couldntComplete")}
                </p>
                <p className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => retry(message.id)}
                    // A retry spends real model budget too (app/(app)/advisor/actions.ts's
                    // retryAdvisorMessage draws on the same allowance) — disabled here for
                    // the same reason the composer is: no point offering a click that can
                    // only repeat the same "used up" answer.
                    disabled={retryingId === message.id || quotaExhausted}
                  >
                    <RotateCcw className="size-3.5" />
                    {t("tryAgain")}
                  </Button>
                </p>
              </AdvisorMessage>
            ) : (
              <AdvisorMessage key={message.id} meta={message.degraded ? t("degradeNote.label") : undefined}>
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
                {/* Same copy for every degraded reply, regardless of this student's own usage
                    pattern — a system-state disclosure, not a personalized pitch (design
                    spec §2). No "Upgrade"/pricing language: there is no premium tier to sell
                    yet, only the fact of what happened to this specific reply. */}
                {message.degraded ? (
                  <p className="mt-4 border-t border-border pt-3 text-sm text-ink-3">
                    {t("degradeNote.detail")}
                  </p>
                ) : null}
                {/* Anchored here, not as a page-level overlay -- see
                    upgrade-prompt-overlay.tsx's own doc comment for why document-flow
                    placement is what makes "never covers the reply" true by construction.
                    Rendered as a sibling of the message content, inside the same
                    AdvisorMessage, so it visually reads as attached to this specific reply
                    without needing its own positioning logic. */}
                {upgradePromptMessageId === message.id ? (
                  <UpgradePromptOverlay onNotNow={handleUpgradePromptNotNow} onSoftDismiss={handleUpgradePromptSoftDismiss} />
                ) : null}
              </AdvisorMessage>
            ),
          )
        )}
      </div>

      {/* Persistent, not tied to a failed submit attempt — quotaExhausted is a standing
          state for the rest of the month, not a one-off error, so it renders declaratively
          from the prop rather than only after the student tries and fails. Default `Alert`
          variant (calm, `bg-card`), not `destructive`: this is a fact about a monthly
          allowance, not something the student did wrong. States what changed (chat only)
          and what didn't (everything else), per this task's own "what can they still do"
          requirement — no tier/upgrade mention, since there is nowhere real to send one
          yet (see the commit message). */}
      {quotaExhausted && quotaResetsAt ? (
        <Alert className="mb-3">
          <AlertTitle>{t("exhausted.title")}</AlertTitle>
          <AlertDescription>
            {t("exhausted.detail", { date: formatAbsoluteDate(quotaResetsAt, locale, { month: "long", day: "numeric" }) })}
          </AlertDescription>
        </Alert>
      ) : error ? (
        <p className="pb-3 text-sm text-error">{error}</p>
      ) : null}

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
          onChange={(e) => {
            setInput(e.target.value);
            inputRef.current = e.target.value;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          placeholder={
            quotaExhausted ? t("placeholderExhausted") : aiConfigured ? t("placeholderReady") : t("placeholderNotConfigured")
          }
          disabled={!aiConfigured || quotaExhausted}
          rows={1}
          className="max-h-32 min-h-9 flex-1 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          aria-label={t("sendAriaLabel")}
          disabled={!aiConfigured || quotaExhausted || isPending || !input.trim()}
        >
          <ArrowUp className="size-4" />
        </Button>
      </form>
    </div>
  );
}
