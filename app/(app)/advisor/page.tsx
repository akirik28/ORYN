import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getUpcomingDeadlines } from "@/lib/deadlines/upcoming";
import { AdvisorChat } from "@/features/advisor/advisor-chat";
import { StrategyPanel } from "@/features/advisor/strategy-panel";
import { CounselorPriorities } from "@/features/advisor/counselor-priorities";
import { PageHeader } from "@/components/oryn/page-header";
import { isAIConfigured } from "@/lib/ai";
import { rankDimensionGaps, toDimensionScoreRows } from "@/lib/counselor/gaps";
import { toProfileSignal, canClaimGap } from "@/lib/scoring/signal";
import { DIMENSION_LABELS } from "@/lib/scoring/labels";
import { getCounselorRecommendations } from "@/lib/counselor";

export const metadata = { title: "Counselor" };

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

  const profileSignal = toProfileSignal(scores);
  // Same honesty guard the dashboard applies: don't state a focus Oryn can't actually
  // support from the data. The strategy panel simply omits the row instead.
  const focusLabel =
    biggestGap && canClaimGap(profileSignal, biggestGap.dimension)
      ? DIMENSION_LABELS[biggestGap.dimension]
      : null;
  const nextDecision = upcomingDeadlines[0]
    ? { title: upcomingDeadlines[0].title, date: upcomingDeadlines[0].date }
    : null;

  // Counselor Core Phase L. Isolated from the rest of the page's queries: a failure here
  // should never take down the chat itself (spec: external/internal failure must not
  // crash the application) — the deterministic pipeline has its own honest empty/low-
  // confidence states for the ordinary case; this only guards the unexpected one.
  let counselorResult: Awaited<ReturnType<typeof getCounselorRecommendations>> | null = null;
  try {
    counselorResult = await getCounselorRecommendations(userId);
  } catch (error) {
    console.error("[advisor] failed to compute counselor recommendations", error instanceof Error ? error.stack : error);
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Counselor"
        title="Your strategy room."
        description="Oryn answers from your actual profile — including when the honest answer is to do less."
      />

      <StrategyPanel
        focusLabel={focusLabel}
        nextDecision={nextDecision}
        timeBudget={profile?.weekly_time_budget ?? null}
        signal={profileSignal}
      />

      {counselorResult ? <CounselorPriorities result={counselorResult} /> : null}

      {/* Boxed to match every other block on this page (2026-08-30, explicit founder
          direction) — reverses AdvisorChat's own earlier "no card around the conversation"
          call, see that component's comment. */}
      <div className="glass-card flex min-h-[28rem] flex-col rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-7">
        <AdvisorChat conversationId={conversation?.id ?? null} initialMessages={messages} aiConfigured={isAIConfigured()} />
      </div>
    </div>
  );
}
