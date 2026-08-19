import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getUpcomingDeadlines } from "@/lib/deadlines/upcoming";
import { AdvisorChat } from "@/features/advisor/advisor-chat";
import { AdvisorContextStrip } from "@/features/advisor/advisor-context-strip";
import { PageHeader } from "@/components/oryn/page-header";
import { isAIConfigured } from "@/lib/ai";
import { rankDimensionGaps, toDimensionScoreRows } from "@/lib/counselor/gaps";

export const metadata = { title: "Advisor" };

export default async function AdvisorPage() {
  const session = await requireUser();
  const userId = session.userId!;
  const supabase = await createClient();

  const [conversationRes, profile, scoresRes, upcomingDeadlines] = await Promise.all([
    supabase.from("advisor_conversations").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    getCurrentProfile(),
    supabase.from("profile_scores").select("dimension, score, confidence, reason_codes").eq("user_id", userId),
    getUpcomingDeadlines(supabase, userId, 10),
  ]);

  const conversation = conversationRes.data;
  const messages = conversation
    ? (
        await supabase
          .from("advisor_messages")
          .select("*")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: true })
      ).data ?? []
    : [];

  const scores = scoresRes.data ?? [];
  // Counselor Core Phase D — see app/(app)/dashboard/page.tsx's identical usage.
  const biggestGap = rankDimensionGaps(toDimensionScoreRows(scores))[0] ?? null;

  return (
    <div className="flex h-[calc(100svh-8rem)] flex-col">
      <div className="mb-4 space-y-3">
        <PageHeader title="Advisor" description="Ask about priorities, tradeoffs, or what to do next." />
        <AdvisorContextStrip
          biggestGap={biggestGap}
          upcomingDeadlineCount={upcomingDeadlines.length}
          timeBudget={profile?.weekly_time_budget ?? null}
        />
      </div>
      <AdvisorChat conversationId={conversation?.id ?? null} initialMessages={messages} aiConfigured={isAIConfigured()} />
    </div>
  );
}
