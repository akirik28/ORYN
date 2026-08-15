"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { generateAdvisorReply } from "@/lib/ai/advisor-chat";
import { AIProviderNotConfiguredError } from "@/lib/ai";
import { assertWithinAIRateLimit, RateLimitExceededError } from "@/lib/ai/rate-limit";
import { logEvent } from "@/lib/analytics/log";

export async function sendAdvisorMessage(
  conversationId: string | null,
  content: string
): Promise<{ conversationId: string; error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const trimmed = content.trim();
  if (!trimmed) return { conversationId: conversationId ?? "", error: "Message can't be empty." };

  try {
    await assertWithinAIRateLimit(userId, "advisor_chat", { maxCalls: 30, windowMinutes: 10 });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { conversationId: conversationId ?? "", error: error.message };
    }
    throw error;
  }

  const supabase = await createClient();
  let convId = conversationId;

  if (!convId) {
    const { data: conversation, error } = await supabase
      .from("advisor_conversations")
      .insert({ user_id: userId, title: trimmed.slice(0, 60) })
      .select()
      .single();
    if (error || !conversation) {
      return { conversationId: "", error: "Couldn't start a new conversation." };
    }
    convId = conversation.id;
  }

  const { data: priorMessages } = await supabase
    .from("advisor_messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });

  const { error: userMessageError } = await supabase
    .from("advisor_messages")
    .insert({ conversation_id: convId, user_id: userId, role: "user", content: trimmed });
  if (userMessageError) {
    return { conversationId: convId, error: "Couldn't save your message." };
  }
  await logEvent(userId, "advisor_message_sent", { conversationId: convId });

  try {
    const reply = await generateAdvisorReply({
      userId,
      history: priorMessages ?? [],
      newMessage: trimmed,
    });
    await supabase.from("advisor_messages").insert({ conversation_id: convId, user_id: userId, role: "assistant", content: reply });
  } catch (error) {
    if (error instanceof AIProviderNotConfiguredError) {
      return { conversationId: convId, error: "not_configured" };
    }
    console.error("[advisor] failed to generate reply", error);
    return { conversationId: convId, error: "Something went wrong. Please try again." };
  }

  revalidatePath("/advisor");
  return { conversationId: convId };
}
