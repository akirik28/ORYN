import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser, getCurrentProfile, getProfileScores } from "@/lib/security/dal";
import { resolveLocale } from "@/lib/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { getUpcomingDeadlines } from "@/lib/deadlines/upcoming";
import { AdvisorChat } from "@/features/advisor/advisor-chat";
import { StrategyPanel } from "@/features/advisor/strategy-panel";
import { CounselorPriorities } from "@/features/advisor/counselor-priorities";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { isAIConfigured } from "@/lib/ai";
import { rankDimensionGaps, toDimensionScoreRows } from "@/lib/counselor/gaps";
import { toProfileSignal, canClaimGap } from "@/lib/scoring/signal";
import { dimensionLabel } from "@/lib/scoring/labels";
import { getCounselorRecommendations } from "@/lib/counselor";
import { getMonthlyQuota } from "@/lib/ai/monthly-quota";
import { selectModelForUser } from "@/lib/ai/limits/budget";
import { MonthlyUsageMeter } from "@/features/advisor/monthly-usage-meter";

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("nav");
  return { title: tMeta("counselor") };
}

export default async function AdvisorPage() {
  const session = await requireUser();
  const userId = session.userId!;
  const supabase = await createClient();
  const locale = await resolveLocale();
  const t = await getTranslations("advisor.page");

  const [conversationRes, profile, scores, upcomingDeadlines] = await Promise.all([
    supabase.from("advisor_conversations").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    getCurrentProfile(),
    // Shared, cache()'d — docs/performance.md §2; see app/(app)/layout.tsx's identical use.
    getProfileScores(userId),
    getUpcomingDeadlines(supabase, userId, 10),
  ]);

  // The allowance the chat actually enforces (app/(app)/advisor/actions.ts).
  const quota = await getMonthlyQuota(userId, "advisor_chat");
  // A second, independent read purely for display — selectModelForUser has no side
  // effects (it only reads ai_usage, same table getMonthlyQuota above already reads for
  // the same reason), so calling it here doesn't select a model for any real generation,
  // it just answers "is this student currently past lib/ai/limits/budget.ts's target" so
  // the meter can say so before the student notices from the replies themselves.
  const { degraded: budgetDegraded } = await selectModelForUser(userId);

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

  // Counselor Core Phase D — see app/(app)/dashboard/page.tsx's identical usage.
  const biggestGap = rankDimensionGaps(toDimensionScoreRows(scores))[0] ?? null;

  const profileSignal = toProfileSignal(scores);
  // Same honesty guard the dashboard applies: don't state a focus Oryn can't actually
  // support from the data. The strategy panel simply omits the row instead.
  const focusLabel =
    biggestGap && canClaimGap(profileSignal, biggestGap.dimension)
      ? dimensionLabel(biggestGap.dimension, locale)
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
    counselorResult = await getCounselorRecommendations(userId, locale);
  } catch (error) {
    console.error("[advisor] failed to compute counselor recommendations", error instanceof Error ? error.stack : error);
  }

  return (
    <div className="space-y-10">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <StrategyPanel
        focusLabel={focusLabel}
        nextDecision={nextDecision}
        timeBudget={profile?.weekly_time_budget ?? null}
        signal={profileSignal}
      />

      {counselorResult ? <CounselorPriorities result={counselorResult} /> : null}

      {/* Boxed to match every other block on this page (2026-08-30, explicit founder
          direction) — reverses AdvisorChat's own earlier "no card around the conversation"
          call, see that component's comment.

          Given its own titled section and a sidebar as of 2026-08-31: the conversation is
          the reason this page exists, and as an unlabelled box below two analysis panels
          it read as one more widget. The heading states what the box is for; the sidebar
          carries this month's real allowance beside it rather than hiding the number
          inside an error message the student only sees once they hit the wall. */}
      <section className="space-y-4">
        <SectionHeader title={t("talkItThrough")} description={t("talkItThroughDescription")} />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="glass-card flex min-h-[34rem] flex-col rounded-2xl border border-white/65 bg-white/45 p-6 backdrop-blur-2xl md:p-7">
            <AdvisorChat conversationId={conversation?.id ?? null} initialMessages={messages} aiConfigured={isAIConfigured()} />
          </div>
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <MonthlyUsageMeter quota={quota} budgetDegraded={budgetDegraded} />
          </aside>
        </div>
      </section>
    </div>
  );
}
