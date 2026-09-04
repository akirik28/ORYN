import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser, getCurrentProfile, getProfileScores } from "@/lib/security/dal";
import { resolveLocale } from "@/lib/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { getUpcomingDeadlines } from "@/lib/deadlines/upcoming";
import { AdvisorWorkspace } from "@/features/advisor/advisor-workspace";
import { StrategyPanel } from "@/features/advisor/strategy-panel";
import { CounselorPriorities } from "@/features/advisor/counselor-priorities";
import { PageHeader } from "@/components/proxola/page-header";
import { SectionHeader } from "@/components/proxola/section-header";
import { isAIConfigured } from "@/lib/ai";
import { rankDimensionGaps, toDimensionScoreRows } from "@/lib/counselor/gaps";
import { toProfileSignal, canClaimGap } from "@/lib/scoring/signal";
import { dimensionLabel } from "@/lib/scoring/labels";
import { getCounselorRecommendations } from "@/lib/counselor";
import { getMonthlyQuota } from "@/lib/ai/monthly-quota";
import { selectModelForUser } from "@/lib/ai/limits/budget";
import { ResponseModeSlider } from "@/features/advisor/response-mode-slider";
import { AdvisorInstructionsField } from "@/features/advisor/advisor-instructions-field";
import { resolveResponseMode } from "@/lib/tier/response-mode";
import { resolveAdvisorInstructions } from "@/lib/tier/advisor-instructions";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { extractUpgradePromptDismissalState } from "@/lib/advisor/upgrade-prompt";

const CONVERSATION_LIST_LIMIT = 50;

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

  const [conversationsRes, profile, scores, upcomingDeadlines] = await Promise.all([
    // Founder, 2026-09-04: past sessions must stay reachable on the right, not gone the
    // moment "new session" is clicked. Full list, not just the most recent — the active
    // conversation on initial load is simply this list's own first row (already ordered by
    // updated_at desc), no second query needed for what used to be a separate
    // .limit(1).maybeSingle(). CONVERSATION_LIST_LIMIT caps it the same way every other list
    // in this codebase caps an unbounded-in-principle query.
    supabase.from("advisor_conversations").select("id, title, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(CONVERSATION_LIST_LIMIT),
    getCurrentProfile(),
    // Shared, cache()'d — docs/performance.md §2; see app/(app)/layout.tsx's identical use.
    getProfileScores(userId),
    getUpcomingDeadlines(supabase, userId, 10),
  ]);
  const conversations = conversationsRes.data ?? [];

  // getCurrentProfile() (unlike layout.tsx's requireProfile()) can return null — same
  // "balanced" default resolveResponseMode itself falls back to for a genuinely missing
  // column, just handled one layer up here for a genuinely missing profile.
  const responseMode = profile ? resolveResponseMode(profile) : "balanced";
  // Resolved before the two calls below (2026-09-03, the Ultra tier-economics build) --
  // both now need it, and profile is already in scope from the Promise.all above, so this
  // is a reorder, not a new fetch. This page doesn't thread the dev-preview override
  // layout.tsx does (that mechanism exists to preview the whole shell, not one page in
  // isolation) -- resolvePlanTier(profile) alone is this file's own established pattern,
  // unchanged by this build.
  const planTier = resolvePlanTier(profile ?? { plan_tier: "standard", ultra_gift_expires_at: null });
  // The allowance the chat actually enforces (app/(app)/advisor/actions.ts) — shared
  // across all seven student-facing AI features since the 2026-09-02 token-metering
  // change, not chat messages alone (lib/ai/monthly-quota.ts's PER_STUDENT_AI_FEATURES).
  const quota = await getMonthlyQuota(userId, planTier);
  // A second, independent read purely for display — selectModelForUser has no side
  // effects (it only reads ai_usage, same table getMonthlyQuota above already reads for
  // the same reason), so calling it here doesn't select a model for any real generation,
  // it just answers "is this student currently past lib/ai/limits/budget.ts's target" so
  // the meter can say so before the student notices from the replies themselves.
  const { degraded: budgetDegraded } = await selectModelForUser(userId, planTier);
  // Derived from the same already-loaded `profile` object `planTier` above reads, not a
  // second query — see lib/advisor/upgrade-prompt.ts's own header for why this used to be
  // a separate fetch and no longer is (next build's Client Component SSR check, 2026-09-02).
  const upgradePromptDismissalState = extractUpgradePromptDismissalState(
    profile ?? {
      upgrade_prompt_soft_dismissed_until: null,
      upgrade_prompt_not_now_at: null,
      upgrade_prompt_not_now_count: 0,
      upgrade_prompt_dismissed_forever: false,
    },
  );

  const conversation = conversations[0] ?? null;
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
        <ResponseModeSlider responseMode={responseMode} budgetDegraded={budgetDegraded} quota={quota} planTier={planTier} />
        {/* Beside AdvisorWorkspace, not inside it — same position as ResponseModeSlider
            above, for the same reason: this is a per-student, cross-conversation setting
            (docs/ozellesme-spec-2026-09-03.md §1, "her sohbette, her istemde geçerli"),
            not state about which conversation is active, which is exactly what
            AdvisorWorkspace exists to own. */}
        <AdvisorInstructionsField initialInstructions={profile ? resolveAdvisorInstructions(profile) : null} planTier={planTier} />
        <AdvisorWorkspace
          initialConversationId={conversation?.id ?? null}
          initialMessages={messages}
          initialConversations={conversations.map((c) => ({ id: c.id, title: c.title, updatedAt: c.updated_at }))}
          aiConfigured={isAIConfigured()}
          // The composer and the sidebar meter must agree — same read (`quota` above),
          // not a second one that could drift. `usedIsKnown` guards this exactly like
          // isMonthlyQuotaExhausted does server-side: an unreadable count is never
          // reported as exhausted, only a genuinely confirmed zero is.
          quotaExhausted={quota.usedIsKnown && quota.remaining <= 0}
          quotaResetsAt={quota.resetsAt}
          tier={planTier}
          responseMode={responseMode}
          upgradePromptDismissalState={upgradePromptDismissalState}
          quota={quota}
          budgetDegraded={budgetDegraded}
        />
      </section>
    </div>
  );
}
