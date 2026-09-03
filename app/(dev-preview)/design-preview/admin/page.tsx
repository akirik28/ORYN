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
import { WeeklyPlanBudgetSection } from "@/features/admin/sections/weekly-plan-budget-section";
import { ProviderHealthSection } from "@/features/admin/sections/provider-health-section";
import { ScheduledJobsSection } from "@/features/admin/sections/scheduled-jobs-section";
import { ReportsSection } from "@/features/admin/sections/reports-section";
import { UserListSection } from "@/features/admin/sections/user-list-section";
import { AdminActivitySection } from "@/features/admin/sections/admin-activity-section";
import { DescriptionCleanupSection } from "@/features/admin/sections/description-cleanup-section";
import { PreviewToolbar } from "../preview-toolbar";

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
/**
 * `?tone=light` renders these same sections on the control centre's light-green ground
 * (app/globals.css's [data-surface="admin"][data-admin-tone="light"], the tone
 * app/(admin)/layout.tsx uses). Added 2026-09-03 because the claim that the light tone
 * needs no component changes -- it redefines the same --admin-* token NAMES rather than
 * introducing a second component family -- could not be checked by anyone: /kumanda is
 * behind requireAdmin(), no account is is_admin yet, and there is deliberately no dev
 * bypass. This route already renders the real sections without that gate, so it is the
 * one place the claim is falsifiable. Default stays dark so the existing tone is still
 * what you get without asking.
 *
 * WeeklyPlanBudgetSection added 2026-09-03: the real app/(app)/admin/page.tsx renders it,
 * this route hadn't, and it was never migrated onto any /kumanda/* page either — the one
 * section genuinely unreachable from any no-auth preview, found auditing proactive-disable
 * coverage for its own isWeeklyPlanBudgetSettingsTableLive check. Not a full resync with
 * the real page's current section list — several sections added since this route was first
 * built (AiFeatureShapeSection, JobBudgetSection, DegradeStandingSection, growth-tab
 * sections, etc.) are already viewable via /design-preview/kumanda instead, so this stays a
 * targeted fix for the one section with no preview coverage anywhere, not a staleness
 * cleanup of this whole route.
 */
export default async function AdminDesignPreviewPage({ searchParams }: { searchParams: Promise<{ tone?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { tone } = await searchParams;
  const light = tone === "light";
  const t = await getTranslations("admin");

  return (
    <div
      data-surface="admin"
      data-admin-tone={light ? "light" : undefined}
      style={{ background: "var(--admin-bg)", color: "var(--admin-ink-1)" }}
      className="mx-auto max-w-5xl space-y-6 p-6"
    >
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
          <Suspense fallback={<SectionSkeleton rows={2} />}>
            <WeeklyPlanBudgetSection />
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

        <TabsContent value="catalog" className="space-y-10 pt-2">
          <Suspense fallback={<SectionSkeleton rows={4} />}>
            <AdminActivitySection />
          </Suspense>
          <Suspense fallback={<SectionSkeleton rows={3} />}>
            <DescriptionCleanupSection />
          </Suspense>
        </TabsContent>
      </Tabs>
      <PreviewToolbar />
    </div>
  );
}
