"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { generateAdvisorReply } from "@/lib/ai/advisor-chat";
import { classifyAdvisorFailure } from "@/lib/ai/advisor-failure";
import { assertWithinAIRateLimit, RateLimitExceededError } from "@/lib/ai/rate-limit";
import { getMonthlyQuota } from "@/lib/ai/monthly-quota";
import { logEvent } from "@/lib/analytics/log";
import { isUuidLike } from "@/lib/validation/uuid";
import { isUndefinedColumnError } from "@/lib/supabase/errors";
import { formatAbsoluteDate } from "@/lib/i18n/date";
import type { AIMessage } from "@/lib/ai/provider";
import type { Locale } from "@/lib/i18n/config";

/**
 * Same wording as messages/{en,tr}.json's advisor.chat.exhausted, hand-written rather than
 * routed through the catalog for the same reason every other string in this file is (see
 * the comment above `sendAdvisorMessage`) — a Server Action return value, not React-tree
 * copy. Takes the real reset date rather than a vague "next month" (2026-09-02: the old
 * text didn't say when, and separately didn't mention that the rest of the product stays
 * open — both fixed here and in the client-side proactive notice AdvisorChat now renders
 * before a student can even reach this fallback path).
 *
 * "Oryn AI", not "counselor messages" (2026-09-02, token-metering change): the allowance
 * this now reports against is shared across seven features, not just chat — a student can
 * reach it from CV import and weekly-plan generation alone, having sent no chat messages
 * at all, so a sentence naming "messages" specifically would be confidently wrong exactly
 * the way this codebase keeps finding and fixing elsewhere.
 */
function quotaExhaustedMessage(resetsAt: string, locale: Locale): string {
  const date = formatAbsoluteDate(resetsAt, locale, { month: "long", day: "numeric" });
  return locale === "tr"
    ? `Bu ay Oryn'in yapay zeka hakkını kullandın. Sohbet ${date} tarihinde yenilenir. Oryn'in geri kalanı — planın, fırsatların, üniversitelerin — her zamanki gibi açık.`
    : `You've used up this month's Oryn AI allowance. Chat resets on ${date}. The rest of Oryn — your plan, opportunities, universities — stays open as always.`;
}

// Student-facing strings in this file are additive-locale-branched inline (`tr ?  : `),
// matching lib/counselor/copy.ts's own established shape, rather than routed through the
// message catalog — these are Server Action return values, not React-tree copy.
// RateLimitExceededError's own default message is now locale-aware too (lib/errors/rate-
// limit-exceeded.ts) — both `error.message` sites below already pass `locale` into
// assertWithinAIRateLimit, so the message they read back is already in the right language.
// That was an app-wide decision the first version of this file correctly deferred; it's
// now made, for all 15+ Server Actions that throw this error, not only this one.

/**
 * Caps that exist so a 400 from the provider means one thing rather than two.
 *
 * `lib/ai/service-failure.ts` maps a 400 to "this isn't something you did", which is right
 * for a spent balance and wrong for a message that overran the model's context — a cause
 * that *is* the student's and *is* fixable by them. Status cannot tell those apart, so the
 * fix is to stop the second one reaching the provider at all rather than to write a cleverer
 * branch (review finding, 2026-09-01).
 *
 * 4,000 characters is far more than a question and far less than a context limit;
 * MAX_HISTORY_TURNS bounds the other half, since the whole conversation was previously sent
 * on every turn with no limit. Oldest turns drop first: the current question and its
 * immediate context matter more than the opening of a long thread.
 */
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_TURNS = 40;

export async function sendAdvisorMessage(
  conversationId: string | null,
  content: string
): Promise<{ conversationId: string; assistantMessageId?: string; content?: string; degraded?: boolean; error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const locale = await resolveLocale();
  const tr = locale === "tr";
  const trimmed = content.trim();
  if (!trimmed) return { conversationId: conversationId ?? "", error: tr ? "Mesaj boş olamaz." : "Message can't be empty." };
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      conversationId: conversationId ?? "",
      error: tr
        ? "Bu mesaj danışmanın bir seferde okuyabileceğinden uzun. Tek seferde tek şey sormayı dene."
        : "That message is too long for the counselor to read at once. Try asking one thing at a time.",
    };
  }
  if (conversationId && !isUuidLike(conversationId)) return { conversationId: "", error: tr ? "Geçersiz konuşma." : "Invalid conversation." };

  try {
    await assertWithinAIRateLimit(userId, "advisor_chat", { maxCalls: 30, windowMinutes: 10 }, locale);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { conversationId: conversationId ?? "", error: error.message };
    }
    throw error;
  }

  // The monthly allowance the UI shows has to be the one actually enforced, or the bar is
  // decoration. Checked after the burst limiter because that one is the cheaper guard.
  //
  // This is a fallback, not the primary way a student learns their allowance is used up —
  // AdvisorChat now disables its own composer once features/advisor/monthly-usage-meter.tsx's
  // same `quota` read says exhausted, so in the ordinary case this branch is unreachable from
  // the UI. It stays a real, complete answer regardless (a Server Action is directly callable
  // with any argument, same discipline as every authorization check in this file) — someone
  // with a stale client state, a second tab, or JS genuinely disabled still gets the honest
  // message, not a lesser one.
  const quota = await getMonthlyQuota(userId);
  if (quota.usedIsKnown && quota.remaining <= 0) {
    return { conversationId: conversationId ?? "", error: quotaExhaustedMessage(quota.resetsAt, locale) };
  }

  const supabase = await createClient();
  let convId = conversationId;

  if (convId) {
    // Re-verify server-side that this conversation is actually the caller's own — same
    // "a Server Action is directly callable with any argument" discipline as every other
    // authorization-sensitive action in this app. RLS's owner-only policy (migration
    // 0014) already makes a foreign conversation id harmless (every read/write stays
    // scoped to auth.uid() regardless), so this isn't closing a data-exposure hole; it's
    // avoiding silently inserting orphaned advisor_messages rows against someone else's
    // conversation_id and returning a friendly error instead of a confusing empty thread.
    const { data: owned } = await supabase.from("advisor_conversations").select("id").eq("id", convId).eq("user_id", userId).maybeSingle();
    if (!owned) return { conversationId: "", error: tr ? "Konuşma bulunamadı." : "Conversation not found." };
    // Bumps `updated_at` via the table's existing set_updated_at trigger (migration 0011) —
    // this is the only write path an existing conversation ever goes through, and until now
    // nothing ever touched the row after its INSERT. AdvisorPage's own query orders by
    // updated_at to find "the" conversation to show (this product surfaces exactly one),
    // and with updated_at frozen at creation time that ordering was silently equivalent to
    // created_at — indistinguishable today (a session always keeps its convId in state, so
    // the same conversation is reused for every turn regardless), but a live incident on
    // 2026-08-23 (three conversations created in one minute after repeated failures) shows
    // a student's own history can end up spread across multiple rows, and without this, the
    // one left visible would be whichever was *created* last, not whichever they were
    // actually last talking in — silently stranding the real, active one.
    const { error: touchError } = await supabase.from("advisor_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
    if (touchError) {
      // Ordering-only: a failed bump just leaves "which conversation is active" as stale as
      // it already was, not wrong in a new way — logged so a real recurring failure is
      // visible rather than silently repeating forever.
      console.warn("[advisor] failed to bump conversation updated_at", { conversationId: convId, error: touchError.message });
    }
  }

  if (!convId) {
    const { data: conversation, error } = await supabase
      .from("advisor_conversations")
      .insert({ user_id: userId, title: trimmed.slice(0, 60) })
      .select()
      .single();
    if (error || !conversation) {
      return { conversationId: "", error: tr ? "Yeni bir konuşma başlatılamadı." : "Couldn't start a new conversation." };
    }
    convId = conversation.id;
  }

  // Only successful prior turns feed the model's own conversation history — a failed turn
  // has no real content (migration 0046).
  const { data: priorMessages } = await supabase
    .from("advisor_messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY_TURNS);
  // Fetched newest-first to take the most recent N, then restored to chronological order —
  // the model needs the conversation forwards, not backwards.
  const history: AIMessage[] = (priorMessages ?? [])
    .slice()
    .reverse()
    .map((m) => ({ role: m.role, content: m.content ?? "" }));

  const { error: userMessageError } = await supabase
    .from("advisor_messages")
    .insert({ conversation_id: convId, user_id: userId, role: "user", content: trimmed });
  if (userMessageError) {
    return { conversationId: convId, error: tr ? "Mesajın kaydedilemedi." : "Couldn't save your message." };
  }
  await logEvent(userId, "advisor_message_sent", { conversationId: convId });

  try {
    const { text: reply, degraded } = await generateAdvisorReply({ userId, history, newMessage: trimmed });
    let { data: assistantMessage, error: assistantMessageError } = await supabase
      .from("advisor_messages")
      .insert({ conversation_id: convId, user_id: userId, role: "assistant", content: reply, status: "complete", degraded })
      .select("id")
      .single();
    if (assistantMessageError && isUndefinedColumnError(assistantMessageError, "degraded")) {
      // Migration 0088 not applied yet (house pattern — see that file). The reply itself
      // must still save; the disclosure just won't survive a reload until it lands.
      ({ data: assistantMessage, error: assistantMessageError } = await supabase
        .from("advisor_messages")
        .insert({ conversation_id: convId, user_id: userId, role: "assistant", content: reply, status: "complete" })
        .select("id")
        .single());
    }
    if (assistantMessageError || !assistantMessage) {
      // The reply itself generated fine — only the save failed. Without this branch the
      // caller below returned `content: reply` regardless, so the student watched the
      // reply render once and found it gone on reload with no record it ever happened —
      // exactly the silent-gap symptom the P0 fix in the catch block below exists to
      // prevent, just from a different cause. Same remedy: best-effort record a failed
      // row so a reload shows a retry-able bubble instead of nothing.
      console.error("[advisor] reply generated but failed to save", { conversationId: convId, error: assistantMessageError?.message });
      const errorMessage = tr ? "Yanıt kaydedilemedi." : "Couldn't save the reply.";
      const { data: failedMessage, error: failedMessageError } = await supabase
        .from("advisor_messages")
        .insert({ conversation_id: convId, user_id: userId, role: "assistant", content: null, status: "failed", error_message: errorMessage })
        .select("id")
        .single();
      if (failedMessageError) {
        // Same reasoning as the catch block's own identical write below: already returns
        // `error: errorMessage` regardless, so the student never sees a false success here
        // — logged only so a repeat of this specific write failing is visible.
        console.error("[advisor] failed to persist the failure record itself", { conversationId: convId, error: failedMessageError.message });
      }
      revalidatePath("/advisor");
      return { conversationId: convId, assistantMessageId: failedMessage?.id, error: errorMessage };
    }
    revalidatePath("/advisor");
    return { conversationId: convId, assistantMessageId: assistantMessage.id, content: reply, degraded };
  } catch (error) {
    // P0 fix: previously nothing was written here at all — the user's message stayed
    // saved with no reply and no persisted failure signal, only an ephemeral client-side
    // toast that vanished on reload (see docs/counselor-core-plan.md §2/§11 and
    // docs/handoffs/claude-a-to-claude-b.md). Now a failed turn gets its own row, so a
    // reload shows a retry-able failed bubble instead of a silent gap.
    console.error("[advisor] failed to generate reply", error);
    const { status, errorMessage } = classifyAdvisorFailure(error, locale);
    const { data: failedMessage, error: failedMessageError } = await supabase
      .from("advisor_messages")
      .insert({ conversation_id: convId, user_id: userId, role: "assistant", content: null, status, error_message: errorMessage })
      .select("id")
      .single();
    if (failedMessageError) {
      // Already returns `error: errorMessage` below regardless, so the student never sees
      // a false success here — logged only so a repeat of this specific write failing is
      // visible, since its only other symptom is a retry button with nothing to retry.
      console.error("[advisor] failed to persist the failure record itself", { conversationId: convId, error: failedMessageError.message });
    }
    revalidatePath("/advisor");
    return { conversationId: convId, assistantMessageId: failedMessage?.id, error: errorMessage };
  }
}

/**
 * Retries a single failed assistant turn in place (same row id, same position in the
 * conversation) — never inserts a duplicate user message, never loses the student's
 * original question.
 */
export async function retryAdvisorMessage(failedMessageId: string): Promise<{ content?: string; degraded?: boolean; error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const locale = await resolveLocale();
  const tr = locale === "tr";
  if (!isUuidLike(failedMessageId)) return { error: tr ? "Geçersiz mesaj." : "Invalid message." };

  const supabase = await createClient();

  const { data: failedMessage } = await supabase
    .from("advisor_messages")
    .select("id, conversation_id, role, status")
    .eq("id", failedMessageId)
    .eq("user_id", userId) // ownership re-check, same discipline as sendAdvisorMessage above
    .maybeSingle();
  if (!failedMessage || failedMessage.role !== "assistant" || failedMessage.status !== "failed") {
    return { error: tr ? "Bu mesaj tekrar denenemez." : "This message can't be retried." };
  }
  // Same updated_at bump as sendAdvisorMessage, and for the same reason: a retry is real
  // activity on this conversation too.
  const { error: touchError } = await supabase
    .from("advisor_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", failedMessage.conversation_id);
  if (touchError) {
    console.warn("[advisor] failed to bump conversation updated_at on retry", { conversationId: failedMessage.conversation_id, error: touchError.message });
  }

  try {
    await assertWithinAIRateLimit(userId, "advisor_chat", { maxCalls: 30, windowMinutes: 10 }, locale);
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    throw error;
  }

  // A retry spends real model budget like any other call, so it draws on the same
  // allowance rather than offering a way around it. Same fallback reasoning as
  // sendAdvisorMessage's identical check above — AdvisorChat now disables the retry
  // button itself once exhausted, so this is the same defence-in-depth backstop, not the
  // usual path.
  const quota = await getMonthlyQuota(userId);
  if (quota.usedIsKnown && quota.remaining <= 0) {
    return { error: quotaExhaustedMessage(quota.resetsAt, locale) };
  }

  const { data: allMessages } = await supabase
    .from("advisor_messages")
    .select("id, role, content, status")
    .eq("conversation_id", failedMessage.conversation_id)
    .order("created_at", { ascending: true });
  const messages = allMessages ?? [];
  const failedIndex = messages.findIndex((m) => m.id === failedMessageId);
  // The failed row is always inserted immediately after the user message that triggered it
  // (sendAdvisorMessage above never writes anything in between) — so the immediately
  // preceding row is always that user message, regardless of what's been sent since.
  const userMessage = failedIndex > 0 ? messages[failedIndex - 1] : null;
  if (!userMessage || userMessage.role !== "user" || userMessage.content === null) {
    return { error: tr ? "Tekrar denenecek orijinal mesaj bulunamadı." : "Couldn't find the original message to retry." };
  }

  const history: AIMessage[] = messages
    .slice(0, failedIndex - 1)
    .filter((m) => m.status === "complete" && m.content !== null)
    .map((m) => ({ role: m.role, content: m.content ?? "" }));

  try {
    const { text: reply, degraded } = await generateAdvisorReply({ userId, history, newMessage: userMessage.content });
    let { error: updateError } = await supabase
      .from("advisor_messages")
      .update({ content: reply, status: "complete", error_message: null, degraded })
      .eq("id", failedMessageId);
    if (updateError && isUndefinedColumnError(updateError, "degraded")) {
      // Same degrade-and-retry as sendAdvisorMessage above — migration 0088 not applied yet.
      ({ error: updateError } = await supabase
        .from("advisor_messages")
        .update({ content: reply, status: "complete", error_message: null })
        .eq("id", failedMessageId));
    }
    if (updateError) {
      // Unlike sendAdvisorMessage's insert, this is an UPDATE on a row that already exists —
      // if it fails, the row simply stays in its prior "failed" state (still retry-able,
      // nothing orphaned), so no fallback write is needed here, just no false success.
      console.error("[advisor] retry succeeded but failed to save", { messageId: failedMessageId, error: updateError.message });
      return { error: tr ? "Yanıt kaydedilemedi." : "Couldn't save the reply." };
    }
    revalidatePath("/advisor");
    return { content: reply, degraded };
  } catch (error) {
    console.error("[advisor] retry failed", error);
    const { status, errorMessage } = classifyAdvisorFailure(error, locale);
    const { error: updateError } = await supabase.from("advisor_messages").update({ status, error_message: errorMessage }).eq("id", failedMessageId);
    if (updateError) {
      // Already returns `error: errorMessage` below regardless — logged only for visibility.
      console.error("[advisor] failed to record retry failure", { messageId: failedMessageId, error: updateError.message });
    }
    revalidatePath("/advisor");
    return { error: errorMessage };
  }
}
