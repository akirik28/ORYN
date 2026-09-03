import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/security/require-admin";
import { PageHeader } from "@/components/oryn/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionSkeleton } from "@/features/admin/sections/section-skeleton";
import { SpendSummarySection } from "@/features/admin/sections/spend-summary-section";
import { SpendPerUserSection } from "@/features/admin/sections/spend-per-user-section";
import { RemainingCreditSection } from "@/features/admin/sections/remaining-credit-section";
import { BudgetWarningsSection } from "@/features/admin/sections/budget-warnings-section";
import { AiFeatureShapeSection } from "@/features/admin/sections/ai-feature-shape-section";
import { JobBudgetSection } from "@/features/admin/sections/job-budget-section";
import { WeeklyPlanBudgetSection } from "@/features/admin/sections/weekly-plan-budget-section";
import { DegradeStandingSection } from "@/features/admin/sections/degrade-standing-section";
import { ProviderHealthSection } from "@/features/admin/sections/provider-health-section";
import { ScheduledJobsSection } from "@/features/admin/sections/scheduled-jobs-section";
import { ReportsSection } from "@/features/admin/sections/reports-section";
import { UserListSection } from "@/features/admin/sections/user-list-section";
import { OpportunitiesSection } from "@/features/admin/sections/opportunities-section";
import { ActivitySection } from "@/features/admin/sections/activity-section";
import { AgeGateFlagsSection } from "@/features/admin/sections/age-gate-flags-section";
import { AdminActivitySection } from "@/features/admin/sections/admin-activity-section";
import { DescriptionCleanupSection } from "@/features/admin/sections/description-cleanup-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("pageTitle") };
}

/**
 * Auth + composition only (docs/admin-panel-architecture-2026-09-02.md, D1). Every section
 * fetches its own data and is wrapped in Suspense, so a slow section degrades its own card
 * instead of the page, and any one section can be read, moved or deleted without touching the
 * other seven. Four tabs, money first (D2) — the founder's own framing was "from the credit
 * onward", and reports moved out of the first slot it used to occupy by default rather than
 * by design (the social layer that generates them is switched off, so it was always empty).
 *
 * Catalog, added 2026-09-02 (the "control panel, not a report" course correction): the first
 * write-capable, non-Spend/System/People action group. AdminActivitySection sits first in it
 * on purpose — a founder about to press a button that rewrites 35 descriptions should see the
 * accountability trail for what "pressing a button" already does before pressing another one.
 */
export default async function AdminPage() {
  await requireAdmin();
  const t = await getTranslations("admin");

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />

      <Tabs defaultValue="spend" className="gap-6">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="spend">{t("tabs.spend")}</TabsTrigger>
          <TabsTrigger value="system">{t("tabs.system")}</TabsTrigger>
          <TabsTrigger value="people">{t("tabs.people")}</TabsTrigger>
          <TabsTrigger value="catalog">{t("tabs.catalog")}</TabsTrigger>
        </TabsList>

        <TabsContent value="spend" className="space-y-10 pt-2">
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
          <Suspense fallback={<SectionSkeleton rows={2} />}>
            <DegradeStandingSection />
          </Suspense>
        </TabsContent>

        <TabsContent value="system" className="space-y-10 pt-2">
          <Suspense fallback={<SectionSkeleton />}>
            <ProviderHealthSection />
          </Suspense>
          <Suspense fallback={<SectionSkeleton rows={4} />}>
            <ScheduledJobsSection />
          </Suspense>
        </TabsContent>

        <TabsContent value="people" className="space-y-10 pt-2">
          <Suspense fallback={<SectionSkeleton />}>
            <UserListSection />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <OpportunitiesSection />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <ReportsSection />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <ActivitySection />
          </Suspense>
          <Suspense fallback={<SectionSkeleton rows={2} />}>
            <AgeGateFlagsSection />
          </Suspense>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-10 pt-2">
          <Suspense fallback={<SectionSkeleton rows={4} />}>
            <AdminActivitySection />
          </Suspense>
          <Suspense fallback={<SectionSkeleton rows={3} />}>
            <DescriptionCleanupSection />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
