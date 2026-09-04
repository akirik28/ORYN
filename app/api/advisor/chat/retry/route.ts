import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { generateAdvisorReplyStream } from "@/lib/ai/advisor-chat";
import { classifyAdvisorFailure } from "@/lib/ai/advisor-failure";
import { assertWithinAIRateLimit, RateLimitExceededError } from "@/lib/ai/rate-limit";
import { getMonthlyQuota } from "@/lib/ai/monthly-quota";
import { isUuidLike } from "@/lib/validation/uuid";
import { isUndefinedColumnError } from "@/lib/supabase/errors";
import { resolveResponseMode } from "@/lib/tier/response-mode";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { acquireAdvisorGenerationLock, releaseAdvisorGenerationLock } from "@/lib/advisor/generation-lock";
import type { AIMessage } from "@/lib/ai/provider";
import type { Locale } from "@/lib/i18n/config";

/**
 * Streaming sibling of app/(app)/advisor/actions.ts's retryAdvisorMessage — same guards,
 * same order, same ownership/status checks. See app/api/advisor/chat/route.ts's own header
 * for the shared event-shape and error-handling reasoning; this file exists separately
 * (rather than one route branching on a body field) for the same reason sendAdvisorMessage
 * and retryAdvisorMessage are already two distinct exports today — retrying updates an
 * existing row in place and never inserts a user message, which is a different enough shape
 * from a fresh send that sharing one handler would mean branching through most of it anyway.
 */

function quotaExhaustedMessage(resetsAt: string, locale: Locale): string {
  const date = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { month: "long", day: "numeric" }).format(new Date(resetsAt));
  return locale === "tr"
    ? `Bu ay Proxola'nın yapay zeka hakkını kullandın. Sohbet ${date} tarihinde yenilenir. Proxola'nın geri kalanı — planın, fırsatların, üniversitelerin — her zamanki gibi açık.`
    : `You've used up this month's Proxola AI allowance. Chat resets on ${date}. The rest of Proxola — your plan, opportunities, universities — stays open as always.`;
}

function alreadyGeneratingMessage(locale: Locale): string {
  return locale === "tr"
    ? "Danışman şu anda başka bir mesajını yanıtlıyor. Cevap gelince tekrar yazabilirsin."
    : "The counselor is already answering another one of your messages. You can send another once that reply arrives.";
}

function sseEvent(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request): Promise<Response> {
  const session = await requireUser();
  const userId = session.userId!;
  const locale = await resolveLocale();
  const tr = locale === "tr";

  let body: { failedMessageId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: tr ? "Geçersiz istek." : "Invalid request." }, { status: 400 });
  }

  const failedMessageId = body.failedMessageId ?? "";
  if (!isUuidLike(failedMessageId)) return Response.json({ error: tr ? "Geçersiz mesaj." : "Invalid message." }, { status: 400 });

  const supabase = await createClient();

  const { data: failedMessage } = await supabase
    .from("advisor_messages")
    .select("id, conversation_id, role, status")
    .eq("id", failedMessageId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!failedMessage || failedMessage.role !== "assistant" || failedMessage.status !== "failed") {
    return Response.json({ error: tr ? "Bu mesaj tekrar denenemez." : "This message can't be retried." }, { status: 404 });
  }

  const { error: touchError } = await supabase.from("advisor_conversations").update({ updated_at: new Date().toISOString() }).eq("id", failedMessage.conversation_id);
  if (touchError) {
    console.warn("[advisor-stream] failed to bump conversation updated_at on retry", { conversationId: failedMessage.conversation_id, error: touchError.message });
  }

  try {
    await assertWithinAIRateLimit(userId, "advisor_chat", { maxCalls: 30, windowMinutes: 10 }, locale);
  } catch (error) {
    if (error instanceof RateLimitExceededError) return Response.json({ error: error.message }, { status: 429 });
    throw error;
  }

  const tierProfile = await getCurrentProfile();
  const planTier = resolvePlanTier(tierProfile ?? { plan_tier: "standard", ultra_gift_expires_at: null });

  const quota = await getMonthlyQuota(userId, planTier);
  if (quota.usedIsKnown && quota.remaining <= 0) {
    return Response.json({ error: quotaExhaustedMessage(quota.resetsAt, locale) }, { status: 403 });
  }

  const { data: allMessages } = await supabase
    .from("advisor_messages")
    .select("id, role, content, status")
    .eq("conversation_id", failedMessage.conversation_id)
    .order("created_at", { ascending: true });
  const messages = allMessages ?? [];
  const failedIndex = messages.findIndex((m) => m.id === failedMessageId);
  const userMessage = failedIndex > 0 ? messages[failedIndex - 1] : null;
  if (!userMessage || userMessage.role !== "user" || userMessage.content === null) {
    return Response.json({ error: tr ? "Tekrar denenecek orijinal mesaj bulunamadı." : "Couldn't find the original message to retry." }, { status: 404 });
  }

  const history: AIMessage[] = messages
    .slice(0, failedIndex - 1)
    .filter((m) => m.status === "complete" && m.content !== null)
    .map((m) => ({ role: m.role, content: m.content ?? "" }));

  const lockStartedAt = await acquireAdvisorGenerationLock(supabase);
  if (!lockStartedAt) {
    return Response.json({ error: alreadyGeneratingMessage(locale) }, { status: 409 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let released = false;
      const releaseLock = async () => {
        if (released) return;
        released = true;
        await releaseAdvisorGenerationLock(supabase, lockStartedAt);
      };

      try {
        const responseMode = tierProfile ? resolveResponseMode(tierProfile) : "balanced";
        const { text: reply, degraded } = await generateAdvisorReplyStream({ userId, history, newMessage: userMessage.content!, responseMode, planTier }, (delta) => {
          controller.enqueue(sseEvent({ type: "delta", text: delta }));
        });

        let { error: updateError } = await supabase
          .from("advisor_messages")
          .update({ content: reply, status: "complete", error_message: null, degraded })
          .eq("id", failedMessageId);
        if (updateError && isUndefinedColumnError(updateError, "degraded")) {
          ({ error: updateError } = await supabase.from("advisor_messages").update({ content: reply, status: "complete", error_message: null }).eq("id", failedMessageId));
        }
        if (updateError) {
          // Unlike a fresh send's insert, this is an UPDATE on a row that already exists — a
          // failed write here just leaves the row in its prior "failed" state, still
          // retryable, nothing orphaned, so no further fallback write is needed.
          console.error("[advisor-stream] retry succeeded but failed to save", { messageId: failedMessageId, error: updateError.message });
          controller.enqueue(sseEvent({ type: "error", message: tr ? "Yanıt kaydedilemedi." : "Couldn't save the reply." }));
          return;
        }

        controller.enqueue(sseEvent({ type: "done", assistantMessageId: failedMessageId, degraded }));
      } catch (error) {
        console.error("[advisor-stream] retry failed", error);
        const { status, errorMessage } = classifyAdvisorFailure(error, locale);
        const { error: updateError } = await supabase.from("advisor_messages").update({ status, error_message: errorMessage }).eq("id", failedMessageId);
        if (updateError) {
          console.error("[advisor-stream] failed to record retry failure", { messageId: failedMessageId, error: updateError.message });
        }
        controller.enqueue(sseEvent({ type: "error", message: errorMessage, assistantMessageId: failedMessageId }));
      } finally {
        await releaseLock();
        controller.close();
      }
    },
    async cancel() {
      await releaseAdvisorGenerationLock(supabase, lockStartedAt);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
