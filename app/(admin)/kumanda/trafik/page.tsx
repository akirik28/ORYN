import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionSkeleton } from "@/features/admin/sections/section-skeleton";
import { ActivitySection } from "@/features/admin/sections/activity-section";
import { GrowthSignupsSection } from "@/features/admin/sections/growth-signups-section";
import { GrowthActivationSection } from "@/features/admin/sections/growth-activation-section";
import { GrowthLoopClosingSection } from "@/features/admin/sections/growth-loop-closing-section";
import { GrowthRetentionSection } from "@/features/admin/sections/growth-retention-section";
import { GrowthFeatureCensusSection } from "@/features/admin/sections/growth-feature-census-section";
import { GrowthStudentActionsSection } from "@/features/admin/sections/growth-student-actions-section";

/**
 * Traffic. CEO's own correction mid-build: the plan doc said this screen renders an em-dash
 * because nothing is counted -- true of visitors specifically, not of the screen as a whole.
 * Six growth sections and ActivitySection already ship real data (signups, activation,
 * loop-closing, retention, feature census, student actions, product events) -- moved here
 * unchanged from the old admin page's growth and people tabs, not rewritten.
 *
 * What stays honest, and is the narrower, sharper point: no pageview tracking exists and the
 * app has never been deployed, so there is no visitor count to show -- not "0 visitors"
 * (which would claim measurement happened and found nobody), an em-dash with the reason. One
 * screen holding three states at once: measured (signups, events), measured-as-zero (a real
 * section reporting a real 0 if that's what the data says), and not-measured-at-all
 * (visitors). Collapsing any of those into the others is the exact defect this whole night
 * was about.
 */
export default async function TrafficPage() {
  const t = await getTranslations("admin.control.traffic");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="admin-panel rounded-xl p-5">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-ink-3)" }}>
          {t("visitorsLabel")}
        </p>
        <p className="mt-2 text-3xl font-semibold" style={{ color: "var(--admin-ink-1)" }}>
          —
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--admin-ink-3)" }}>
          {t("visitorsNotMeasured")}
        </p>
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
