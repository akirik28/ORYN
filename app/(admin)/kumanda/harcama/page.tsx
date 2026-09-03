import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionSkeleton } from "@/features/admin/sections/section-skeleton";
import { SpendSummarySection } from "@/features/admin/sections/spend-summary-section";
import { SpendPerUserSection } from "@/features/admin/sections/spend-per-user-section";
import { RemainingCreditSection } from "@/features/admin/sections/remaining-credit-section";
import { BudgetWarningsSection } from "@/features/admin/sections/budget-warnings-section";
import { AiFeatureShapeSection } from "@/features/admin/sections/ai-feature-shape-section";
import { JobBudgetSection } from "@/features/admin/sections/job-budget-section";
import { WeeklyPlanBudgetSection } from "@/features/admin/sections/weekly-plan-budget-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.control");
  return { title: t("item.spend") };
}

/**
 * Fifth group, and the largest single move: seven of the eight sections that made up the
 * old page's "spend" tab, unchanged (the eighth, DegradeStandingSection, moved to
 * /kumanda/sistem instead -- a reliability/model-selection status, not a dollar-budget
 * control, closer in kind to that screen's other sections). Three of the seven
 * (SpendPerUserSection, JobBudgetSection, AiFeatureShapeSection) import server actions
 * directly from app/(app)/admin/actions.ts -- that file is untouched by this package, so
 * those imports keep resolving exactly as they do on the old page.
 *
 * WeeklyPlanBudgetSection added 2026-09-03: the one section this restructure genuinely
 * missed (docs/control-centre-number-reconciliation-2026-09-03.md-adjacent finding,
 * oryn-a7) -- /admin had 23 sections to /kumanda's 22, and this was the exact gap. Placed
 * immediately after JobBudgetSection, matching its position on the old page precisely: both
 * are dollar-ceiling controls for an AI feature's spend, not a status/monitoring section
 * like DegradeStandingSection above.
 */
export default async function SpendPage() {
  const t = await getTranslations("admin.control");

  return (
    <div className="space-y-6">
      <PageHeader title={t("item.spend")} description={t("spendDescription")} />
      <Suspense fallback={<SectionSkeleton rows={4} />}>
        <SpendSummarySection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <SpendPerUserSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton rows={2} />}>
        <RemainingCreditSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton rows={2} />}>
        <BudgetWarningsSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton rows={3} />}>
        <AiFeatureShapeSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton rows={2} />}>
        <JobBudgetSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton rows={2} />}>
        <WeeklyPlanBudgetSection />
      </Suspense>
    </div>
  );
}
