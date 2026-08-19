import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getUpcomingDeadlines } from "@/lib/deadlines/upcoming";
import { AdvisorChat } from "@/features/advisor/advisor-chat";
import { AdvisorContextStrip } from "@/features/advisor/advisor-context-strip";
import { CounselorPriorities } from "@/features/advisor/counselor-priorities";
import { PageHeader } from "@/components/oryn/page-header";
import { isAIConfigured } from "@/lib/ai";
import { rankDimensionGaps, toDimensionScoreRows } from "@/lib/counselor/gaps";
import { getCounselorRecommendations } from "@/lib/counselor";

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

  // Counselor Core Phase L. Isolated from the rest of the page's queries: a failure here
  // should never take down the chat itself (spec: external/internal failure must not
  // crash the application) — the deterministic pipeline has its own honest empty/low-
  // confidence states for the ordinary case; this only guards the unexpected one.
  let counselorResult: Awaited<ReturnType<typeof getCounselorRecommendations>> | null = null;
  try {
    counselorResult = await getCounselorRecommendations(userId);
  } catch (error) {
    console.error("[advisor] failed to compute counselor recommendations", error);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Advisor" description="Ask about priorities, tradeoffs, or what to do next." />
      {counselorResult ? <CounselorPriorities result={counselorResult} /> : null}
      <div className="flex h-[calc(100svh-20rem)] min-h-[28rem] flex-col">
        <div className="mb-4">
          <AdvisorContextStrip
            biggestGap={biggestGap}
            upcomingDeadlineCount={upcomingDeadlines.length}
            timeBudget={profile?.weekly_time_budget ?? null}
          />
        </div>
        <AdvisorChat conversationId={conversation?.id ?? null} initialMessages={messages} aiConfigured={isAIConfigured()} />
      </div>
    </div>
  );
}
