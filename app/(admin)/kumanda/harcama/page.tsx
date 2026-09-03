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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.control");
  return { title: t("item.spend") };
}

/**
 * Fifth group, and the largest single move: the six sections that made up the old page's
 * entire "spend" tab, unchanged. Three of the six (SpendPerUserSection, JobBudgetSection,
 * AiFeatureShapeSection) import server actions directly from app/(app)/admin/actions.ts --
 * that file is untouched by this package, so those imports keep resolving exactly as they
 * do on the old page.
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
    </div>
  );
}
