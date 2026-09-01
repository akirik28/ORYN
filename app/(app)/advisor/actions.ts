"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { generateAdvisorReply } from "@/lib/ai/advisor-chat";
import { classifyAdvisorFailure } from "@/lib/ai/advisor-failure";
import { assertWithinAIRateLimit, RateLimitExceededError } from "@/lib/ai/rate-limit";
import { isMonthlyQuotaExhausted } from "@/lib/ai/monthly-quota";
import { logEvent } from "@/lib/analytics/log";
import { isUuidLike } from "@/lib/validation/uuid";
import type { AIMessage } from "@/lib/ai/provider";

// Student-facing strings in this file are additive-locale-branched inline (`tr ?  : `),
// matching lib/counselor/copy.ts's own established shape, rather than routed through the
// message catalog — these are Server Action return values, not React-tree copy.
// RateLimitExceededError's own default message (thrown from lib/ai/rate-limit.ts, caught
// and passed through verbatim at both `error.message` sites below) is deliberately NOT
// translated here: that class is shared by 15+ unrelated Server Actions across the app
// (messages, plan, connections, profile, entities, onboarding, export-data, social...) —
// translating its default would be an app-wide decision, not one this file's own scope covers.

export async function sendAdvisorMessage(
  conversationId: string | null,
  content: string
): Promise<{ conversationId: string; assistantMessageId?: string; content?: string; error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const locale = await resolveLocale();
  const tr = locale === "tr";
  const trimmed = content.trim();
  if (!trimmed) return { conversationId: conversationId ?? "", error: tr ? "Mesaj boş olamaz." : "Message can't be empty." };
  if (conversationId && !isUuidLike(conversationId)) return { conversationId: "", error: tr ? "Geçersiz konuşma." : "Invalid conversation." };

  try {
    await assertWithinAIRateLimit(userId, "advisor_chat", { maxCalls: 30, windowMinutes: 10 });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { conversationId: conversationId ?? "", error: error.message };
    }
    throw error;
  }

  // The monthly allowance the UI shows has to be the one actually enforced, or the bar is
  // decoration. Checked after the burst limiter because that one is the cheaper guard.
  if (await isMonthlyQuotaExhausted(userId, "advisor_chat")) {
    return {
      conversationId: conversationId ?? "",
      error: tr
        ? "Bu ayki danışman mesajlarını kullandın. Hakkın gelecek ayın başında yenilenir."
        : "You've used this month's counselor messages. Your allowance resets at the start of next month.",
    };
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
    .order("created_at", { ascending: true });
  const history: AIMessage[] = (priorMessages ?? []).map((m) => ({ role: m.role, content: m.content ?? "" }));

  const { error: userMessageError } = await supabase
    .from("advisor_messages")
    .insert({ conversation_id: convId, user_id: userId, role: "user", content: trimmed });
  if (userMessageError) {
    return { conversationId: convId, error: tr ? "Mesajın kaydedilemedi." : "Couldn't save your message." };
  }
  await logEvent(userId, "advisor_message_sent", { conversationId: convId });

  try {
    const reply = await generateAdvisorReply({ userId, history, newMessage: trimmed });
    const { data: assistantMessage } = await supabase
      .from("advisor_messages")
      .insert({ conversation_id: convId, user_id: userId, role: "assistant", content: reply, status: "complete" })
      .select("id")
      .single();
    revalidatePath("/advisor");
    return { conversationId: convId, assistantMessageId: assistantMessage?.id, content: reply };
  } catch (error) {
    // P0 fix: previously nothing was written here at all — the user's message stayed
    // saved with no reply and no persisted failure signal, only an ephemeral client-side
    // toast that vanished on reload (see docs/counselor-core-plan.md §2/§11 and
    // docs/handoffs/claude-a-to-claude-b.md). Now a failed turn gets its own row, so a
    // reload shows a retry-able failed bubble instead of a silent gap.
    console.error("[advisor] failed to generate reply", error);
    const { status, errorMessage } = classifyAdvisorFailure(error, locale);
    const { data: failedMessage } = await supabase
      .from("advisor_messages")
      .insert({ conversation_id: convId, user_id: userId, role: "assistant", content: null, status, error_message: errorMessage })
      .select("id")
      .single();
    revalidatePath("/advisor");
    return { conversationId: convId, assistantMessageId: failedMessage?.id, error: errorMessage };
  }
}

/**
 * Retries a single failed assistant turn in place (same row id, same position in the
 * conversation) — never inserts a duplicate user message, never loses the student's
 * original question.
 */
export async function retryAdvisorMessage(failedMessageId: string): Promise<{ content?: string; error?: string }> {
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

  try {
    await assertWithinAIRateLimit(userId, "advisor_chat", { maxCalls: 30, windowMinutes: 10 });
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    throw error;
  }

  // A retry spends real model budget like any other call, so it draws on the same
  // allowance rather than offering a way around it.
  if (await isMonthlyQuotaExhausted(userId, "advisor_chat")) {
    return {
      error: tr
        ? "Bu ayki danışman mesajlarını kullandın. Hakkın gelecek ayın başında yenilenir."
        : "You've used this month's counselor messages. Your allowance resets at the start of next month.",
    };
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
    const reply = await generateAdvisorReply({ userId, history, newMessage: userMessage.content });
    await supabase.from("advisor_messages").update({ content: reply, status: "complete", error_message: null }).eq("id", failedMessageId);
    revalidatePath("/advisor");
    return { content: reply };
  } catch (error) {
    console.error("[advisor] retry failed", error);
    const { status, errorMessage } = classifyAdvisorFailure(error, locale);
    await supabase.from("advisor_messages").update({ status, error_message: errorMessage }).eq("id", failedMessageId);
    revalidatePath("/advisor");
    return { error: errorMessage };
  }
}
