import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionSkeleton } from "@/features/admin/sections/section-skeleton";
import { ReportsSection } from "@/features/admin/sections/reports-section";
import { FeedbackReportsSection } from "@/features/admin/sections/feedback-reports-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.control");
  return { title: t("item.moderation") };
}

/** Second section moved into the control centre. ReportsSection is unchanged; only the
 *  route rendering it is new. See docs/kumanda-merkezi-yapi-plani-2026-09-03.md.
 *  FeedbackReportsSection added 2026-09-03 (migration 0113, proposed) — same screen, its
 *  own Suspense boundary so one section's data doesn't block the other's first paint. */
export default async function ModerationPage() {
  const t = await getTranslations("admin.control");

  return (
    <div className="space-y-6">
      <PageHeader title={t("item.moderation")} description={t("moderationDescription")} />
      <Suspense fallback={<SectionSkeleton />}>
        <ReportsSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <FeedbackReportsSection />
      </Suspense>
    </div>
  );
}
