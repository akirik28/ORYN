import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/proxola/page-header";
import { SectionSkeleton } from "@/features/admin/sections/section-skeleton";
import { ActivitySection } from "@/features/admin/sections/activity-section";
import { GrowthSignupsSection } from "@/features/admin/sections/growth-signups-section";
import { GrowthActivationSection } from "@/features/admin/sections/growth-activation-section";
import { GrowthLoopClosingSection } from "@/features/admin/sections/growth-loop-closing-section";
import { GrowthRetentionSection } from "@/features/admin/sections/growth-retention-section";
import { GrowthFeatureCensusSection } from "@/features/admin/sections/growth-feature-census-section";
import { GrowthStudentActionsSection } from "@/features/admin/sections/growth-student-actions-section";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPageViewStats } from "@/lib/admin/queries";

/**
 * Traffic. CEO's own correction mid-build: the plan doc said this screen renders an em-dash
 * because nothing is counted -- true of visitors specifically, not of the screen as a whole.
 * Six growth sections and ActivitySection already ship real data (signups, activation,
 * loop-closing, retention, feature census, student actions, product events) -- moved here
 * unchanged from the old admin page's growth and people tabs, not rewritten.
 *
 * Visitor count updated 2026-09-03: recording now exists (lib/analytics/page-views.ts,
 * migration 0107 -- proposed, not yet applied). getPageViewStats returns null, not zeroes,
 * until that migration lands, so the em-dash/"not measured" state below is unchanged today
 * and will flip to real numbers the moment the table exists, with no further code change.
 * Still three states, never collapsed into each other: measured (signups, events),
 * measured-as-zero (a real section reporting a real 0), and not-measured-at-all (visitors,
 * today).
 */
export default async function TrafficPage() {
  const t = await getTranslations("admin.control.traffic");
  const admin = createAdminClient();
  const stats = await getPageViewStats(admin);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={stats ? t("descriptionMeasured") : t("description")} />

      <div className="admin-panel rounded-xl p-5">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-ink-3)" }}>
          {t("visitorsLabel")}
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: "var(--admin-ink-1)" }}>
          {stats ? stats.uniqueVisitorsToday : "—"}
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--admin-ink-3)" }}>
          {stats ? t("visitorsTodayHint") : t("visitorsNotMeasured")}
        </p>
        {stats ? (
          <p className="mt-4 text-sm tabular-nums" style={{ color: "var(--admin-ink-2)" }}>
            {t("pageViewsLast30d", { count: stats.pageViewsLast30d })}
          </p>
        ) : null}
      </div>

      <div className="space-y-10">
        <Suspense fallback={<SectionSkeleton />}>
          <GrowthSignupsSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <GrowthActivationSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton rows={2} />}>
          <GrowthLoopClosingSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <GrowthRetentionSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton rows={4} />}>
          <GrowthFeatureCensusSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <GrowthStudentActionsSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <ActivitySection />
        </Suspense>
      </div>
    </div>
  );
}
