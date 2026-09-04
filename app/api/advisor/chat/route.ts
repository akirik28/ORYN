import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { generateAdvisorReplyStream } from "@/lib/ai/advisor-chat";
import { classifyAdvisorFailure } from "@/lib/ai/advisor-failure";
import { assertWithinAIRateLimit, RateLimitExceededError } from "@/lib/ai/rate-limit";
import { getMonthlyQuota } from "@/lib/ai/monthly-quota";
import { logEvent } from "@/lib/analytics/log";
import { isUuidLike } from "@/lib/validation/uuid";
import { isUndefinedColumnError } from "@/lib/supabase/errors";
import { resolveResponseMode } from "@/lib/tier/response-mode";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { acquireAdvisorGenerationLock, releaseAdvisorGenerationLock } from "@/lib/advisor/generation-lock";
import { deriveConversationTitle } from "@/lib/advisor/conversation-title";
import type { AIMessage } from "@/lib/ai/provider";
import type { Locale } from "@/lib/i18n/config";

/**
 * Streaming sibling of app/(app)/advisor/actions.ts's sendAdvisorMessage — same guards, same
 * order, same error shapes for everything before generation starts, so a client migrating
 * to this route doesn't need new error-handling logic for the non-streaming failure cases.
 * The one thing that's actually different is what happens once generation starts: instead
 * of one Server Action awaiting the full reply, this returns a `Response` backed by a
 * `ReadableStream` (the standard Next.js App Router way to stream) that emits SSE-style
 * `data: {...}\n\n` events as the reply is generated, plus one final `done`/`error` event
 * once everything after generation (the assistant-message insert, the lock release) has
 * actually run — not just once the text itself finishes, so a client reading `done` can
 * trust the reply is actually persisted, the same guarantee sendAdvisorMessage's return
 * value already gives today.
 *
 * Event shapes: `{"type":"delta","text":string}` per chunk, `{"type":"done",
 * conversationId, conversationTitle?, assistantMessageId, degraded}` once persisted,
 * `{"type":"error","message":string}` on any failure — before OR after generation starts,
 * so a client only needs to handle one error shape regardless of when the failure happened.
 *
 * A Server Action is directly callable with any argument regardless of what's rendered —
 * this Route Handler carries the identical discipline: every check below is real
 * enforcement, not a UI nicety the client is trusted to have already applied.
 */

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_TURNS = 40;

function sseEvent(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

function quotaExhaustedMessage(resetsAt: string, locale: Locale): string {
  // Mirrors app/(app)/advisor/actions.ts's own quotaExhaustedMessage — see that file's
  // header for why the date is spelled out and "Proxola AI" is named rather than "messages".
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

export async function POST(request: Request): Promise<Response> {
  const session = await requireUser();
  const userId = session.userId!;
  const locale = await resolveLocale();
  const tr = locale === "tr";

  let body: { conversationId?: string | null; content?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: tr ? "Geçersiz istek." : "Invalid request." }, { status: 400 });
  }

  const conversationId = body.conversationId ?? null;
  const content = body.content ?? "";
  const trimmed = content.trim();
  if (!trimmed) return Response.json({ error: tr ? "Mesaj boş olamaz." : "Message can't be empty." }, { status: 400 });
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return Response.json(
      {
        error: tr
          ? "Bu mesaj danışmanın bir seferde okuyabileceğinden uzun. Tek seferde tek şey sormayı dene."
          : "That message is too long for the counselor to read at once. Try asking one thing at a time.",
      },
      { status: 400 },
    );
  }
  if (conversationId && !isUuidLike(conversationId)) {
    return Response.json({ error: tr ? "Geçersiz konuşma." : "Invalid conversation." }, { status: 400 });
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

  const supabase = await createClient();
  let convId = conversationId;

  if (convId) {
    // Re-verify ownership server-side, same discipline as sendAdvisorMessage's identical
    // branch — see that file's own comment for why this isn't closing a data-exposure hole
    // (RLS already does that) but avoiding orphaned messages against someone else's
    // conversation_id.
    const { data: owned } = await supabase.from("advisor_conversations").select("id").eq("id", convId).eq("user_id", userId).maybeSingle();
    if (!owned) return Response.json({ error: tr ? "Konuşma bulunamadı." : "Conversation not found." }, { status: 404 });
    const { error: touchError } = await supabase.from("advisor_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
    if (touchError) {
      console.warn("[advisor-stream] failed to bump conversation updated_at", { conversationId: convId, error: touchError.message });
    }
  }

  if (!convId) {
    // Same wall as sendAdvisorMessage's lazy-create branch — see
    // assertConversationLimitNotExceeded's own header there for why this check exists at all.
    if (planTier !== "ultra") {
      const { count, error: countError } = await supabase.from("advisor_conversations").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (countError) {
        console.error("[advisor-stream] failed to count existing conversations", { userId, error: countError.message });
        return Response.json({ error: tr ? "Yeni bir sohbet başlatılamadı." : "Couldn't start a new conversation." }, { status: 500 });
      }
      if ((count ?? 0) > 0) {
        return Response.json(
          {
            error: tr
              ? "Standart planda tek sohbet hakkın var, o zaten mevcut. Ayrı oturumlar Ultra'da."
              : "Standard includes one conversation, and you already have it. Separate sessions are part of Ultra.",
          },
          { status: 403 },
        );
      }
    }

    const { data: conversation, error } = await supabase.from("advisor_conversations").insert({ user_id: userId }).select().single();
    if (error || !conversation) {
      return Response.json({ error: tr ? "Yeni bir konuşma başlatılamadı." : "Couldn't start a new conversation." }, { status: 500 });
    }
    convId = conversation.id;
  }

  const { data: priorMessages } = await supabase
    .from("advisor_messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY_TURNS);
  const history: AIMessage[] = (priorMessages ?? [])
    .slice()
    .reverse()
    .map((m) => ({ role: m.role, content: m.content ?? "" }));

  let conversationTitle: string | undefined;
  if ((priorMessages?.length ?? 0) === 0) {
    conversationTitle = deriveConversationTitle(trimmed);
    const { error: titleError } = await supabase.from("advisor_conversations").update({ title: conversationTitle }).eq("id", convId);
    if (titleError) {
      console.warn("[advisor-stream] failed to set conversation title from first message", { conversationId: convId, error: titleError.message });
      conversationTitle = undefined;
    }
  }

  const { error: userMessageError } = await supabase.from("advisor_messages").insert({ conversation_id: convId, user_id: userId, role: "user", content: trimmed });
  if (userMessageError) {
    return Response.json({ conversationId: convId, conversationTitle, error: tr ? "Mesajın kaydedilemedi." : "Couldn't save your message." }, { status: 500 });
  }
  await logEvent(userId, "advisor_message_sent", { conversationId: convId });

  const lockStartedAt = await acquireAdvisorGenerationLock(supabase);
  if (!lockStartedAt) {
    return Response.json({ conversationId: convId, conversationTitle, error: alreadyGeneratingMessage(locale) }, { status: 409 });
  }

  // Everything above can fail with a plain JSON error response — nothing has started
  // generating yet, so there's nothing a stream would buy the client. Once we're here, the
  // lock is held and the model call is about to start: from this point on, every exit path
  // (success or failure) must release it, which is what the stream's own try/finally below
  // is for — there is no other place left to put a `finally` once the response has started
  // streaming.
  const finalConvId = convId;
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
        const { text: reply, degraded } = await generateAdvisorReplyStream({ userId, history, newMessage: trimmed, responseMode, planTier }, (delta) => {
          controller.enqueue(sseEvent({ type: "delta", text: delta }));
        });

        let { data: assistantMessage, error: assistantMessageError } = await supabase
          .from("advisor_messages")
          .insert({ conversation_id: finalConvId, user_id: userId, role: "assistant", content: reply, status: "complete", degraded })
          .select("id")
          .single();
        if (assistantMessageError && isUndefinedColumnError(assistantMessageError, "degraded")) {
          // Migration 0088 not applied yet — same degrade-and-retry as sendAdvisorMessage.
          ({ data: assistantMessage, error: assistantMessageError } = await supabase
            .from("advisor_messages")
            .insert({ conversation_id: finalConvId, user_id: userId, role: "assistant", content: reply, status: "complete" })
            .select("id")
            .single());
        }

        if (assistantMessageError || !assistantMessage) {
          // The reply itself generated fine — only the save failed. Same P0 remedy as
          // sendAdvisorMessage's identical branch: record a failed row so a reload shows a
          // retryable bubble instead of a reply that vanishes on refresh.
          console.error("[advisor-stream] reply generated but failed to save", { conversationId: finalConvId, error: assistantMessageError?.message });
          const errorMessage = tr ? "Yanıt kaydedilemedi." : "Couldn't save the reply.";
          const { data: failedMessage, error: failedMessageError } = await supabase
            .from("advisor_messages")
            .insert({ conversation_id: finalConvId, user_id: userId, role: "assistant", content: null, status: "failed", error_message: errorMessage })
            .select("id")
            .single();
          if (failedMessageError) {
            console.error("[advisor-stream] failed to persist the failure record itself", { conversationId: finalConvId, error: failedMessageError.message });
          }
          controller.enqueue(sseEvent({ type: "error", message: errorMessage, assistantMessageId: failedMessage?.id }));
          return;
        }

        controller.enqueue(sseEvent({ type: "done", conversationId: finalConvId, conversationTitle, assistantMessageId: assistantMessage.id, degraded }));
      } catch (error) {
        // Same P0 fix sendAdvisorMessage's own catch block documents: a failed turn gets its
        // own row, so a reload shows a retryable bubble instead of a silent gap — this is
        // the shape that's easiest to lose by accident in a streaming rewrite, since "the
        // stream broke halfway through" doesn't look like the clean try/catch this logic was
        // originally written against. It's the same catch block, just reached from inside a
        // stream instead of a Server Action.
        console.error("[advisor-stream] failed to generate reply", error);
        const { status, errorMessage } = classifyAdvisorFailure(error, locale);
        const { data: failedMessage, error: failedMessageError } = await supabase
          .from("advisor_messages")
          .insert({ conversation_id: finalConvId, user_id: userId, role: "assistant", content: null, status, error_message: errorMessage })
          .select("id")
          .single();
        if (failedMessageError) {
          console.error("[advisor-stream] failed to persist the failure record itself", { conversationId: finalConvId, error: failedMessageError.message });
        }
        controller.enqueue(sseEvent({ type: "error", message: errorMessage, assistantMessageId: failedMessage?.id }));
      } finally {
        await releaseLock();
        controller.close();
      }
    },
    async cancel() {
      // The client disconnected (navigated away, closed the tab) mid-stream — the lock still
      // needs releasing so this student isn't locked out of their next message by a request
      // nobody is reading the response of anymore.
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
