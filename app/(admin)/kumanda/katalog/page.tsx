import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/proxola/page-header";
import { SectionSkeleton } from "@/features/admin/sections/section-skeleton";
import { OpportunitiesSection } from "@/features/admin/sections/opportunities-section";
import { DescriptionCleanupSection } from "@/features/admin/sections/description-cleanup-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.control");
  return { title: t("item.catalog") };
}

/**
 * Fourth group moved into the control centre: OpportunitiesSection (which already embeds
 * OpportunityModerationList itself -- the plan doc's "moderation list" isn't a separate
 * component to wire in) and DescriptionCleanupSection. Both unchanged.
 */
export default async function CatalogPage() {
  const t = await getTranslations("admin.control");

  return (
    <div className="space-y-6">
      <PageHeader title={t("item.catalog")} description={t("catalogDescription")} />
      <Suspense fallback={<SectionSkeleton />}>
        <OpportunitiesSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton rows={3} />}>
        <DescriptionCleanupSection />
      </Suspense>
    </div>
  );
}
