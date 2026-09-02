import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionSkeleton } from "@/features/admin/sections/section-skeleton";
import { SpendSummarySection } from "@/features/admin/sections/spend-summary-section";
import { SpendPerUserSection } from "@/features/admin/sections/spend-per-user-section";
import { RemainingCreditSection } from "@/features/admin/sections/remaining-credit-section";
import { BudgetWarningsSection } from "@/features/admin/sections/budget-warnings-section";
import { ProviderHealthSection } from "@/features/admin/sections/provider-health-section";
import { ScheduledJobsSection } from "@/features/admin/sections/scheduled-jobs-section";
import { ReportsSection } from "@/features/admin/sections/reports-section";
import { UserListSection } from "@/features/admin/sections/user-list-section";

/**
 * Verification aid, not a product surface: the real /admin (app/(app)/admin/page.tsx) is
 * gated by requireAdmin(), and as of 2026-09-02 the founder's own account isn't is_admin —
 * nobody has ever seen these screens rendered (docs/admin-access-and-0062-divergence-
 * 2026-09-02.md). Every section here is the exact same component the real page renders,
 * with the exact same read-only admin-client queries against live data — no auth gate, no
 * fixtures, because the underlying queries need neither: they're already unconditional
 * SELECTs, identical to what a real admin session would see today. This route exists only
 * to let a working session actually look at the output once, the same reason every other
 * design-preview/* route exists.
 */
export default async function AdminDesignPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const t = await getTranslations("admin");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
        Design-preview route (dev only, no requireAdmin() gate) — renders the real admin
        sections against live, read-only data. Not linked from anywhere; the real page is
        /admin.
      </p>
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />

      <Tabs defaultValue="spend" className="gap-6">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="spend">{t("tabs.spend")}</TabsTrigger>
          <TabsTrigger value="system">{t("tabs.system")}</TabsTrigger>
          <TabsTrigger value="people">{t("tabs.people")}</TabsTrigger>
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
            <ReportsSection />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
