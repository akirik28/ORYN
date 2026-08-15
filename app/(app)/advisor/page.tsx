import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { AdvisorChat } from "@/features/advisor/advisor-chat";
import { isAIConfigured } from "@/lib/ai";

export const metadata = { title: "Advisor" };

export default async function AdvisorPage() {
  const session = await requireUser();
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("advisor_conversations")
    .select("*")
    .eq("user_id", session.userId!)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const messages = conversation
    ? (
        await supabase
          .from("advisor_messages")
          .select("*")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: true })
      ).data ?? []
    : [];

  return (
    <div className="flex h-[calc(100svh-8rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Advisor</h1>
        <p className="text-muted-foreground">Ask about priorities, tradeoffs, or what to do next.</p>
      </div>
      <AdvisorChat conversationId={conversation?.id ?? null} initialMessages={messages} aiConfigured={isAIConfigured()} />
    </div>
  );
}
