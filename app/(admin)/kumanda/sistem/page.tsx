import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionSkeleton } from "@/features/admin/sections/section-skeleton";
import { ProviderHealthSection } from "@/features/admin/sections/provider-health-section";
import { ScheduledJobsSection } from "@/features/admin/sections/scheduled-jobs-section";
import { DegradeStandingSection } from "@/features/admin/sections/degrade-standing-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.control");
  return { title: t("item.system") };
}

/**
 * Third group moved into the control centre: provider-health, scheduled-jobs and
 * degrade-standing. All three sections are unchanged; only the route is new. Regrouped
 * here from two different old tabs (degrade-standing was under "spend" on the old page,
 * provider-health/scheduled-jobs under "system") per the plan doc's own route table --
 * this route's job is "is the machinery healthy," which degrade-standing answers as much
 * as the other two do. scheduled-jobs-section.tsx imports its trigger actions directly
 * from app/(app)/admin/actions.ts; that file is untouched, so the import keeps working
 * exactly as it does on the old page.
 */
export default async function SystemPage() {
  const t = await getTranslations("admin.control");

  return (
    <div className="space-y-6">
      <PageHeader title={t("item.system")} description={t("systemDescription")} />
      <Suspense fallback={<SectionSkeleton />}>
        <ProviderHealthSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton rows={4} />}>
        <ScheduledJobsSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton rows={2} />}>
        <DegradeStandingSection />
      </Suspense>
    </div>
  );
}
