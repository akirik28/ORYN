import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionSkeleton } from "@/features/admin/sections/section-skeleton";
import { UserListSection } from "@/features/admin/sections/user-list-section";
import { AgeGateFlagsSection } from "@/features/admin/sections/age-gate-flags-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.control");
  return { title: t("item.students") };
}

/**
 * Sixth and last group of the fourteen. UserListSection is unchanged and already embeds
 * PlanTierControl per row, covering "user-list + plan-tier" from the plan doc's route
 * table. Two things the plan doc bundles into this row are deliberately NOT here:
 *
 * - Quota reset ("kota sıfırlama") is GrantQuotaEditor, which exists but is mounted inside
 *   SpendPerUserSection (moved to /kumanda/harcama in the previous commit), not inside
 *   UserListSection. Duplicating it into a second mounting here would be new composition,
 *   not moving an existing section unchanged -- out of scope for this package. Flagged to
 *   oryn-a7 rather than decided here.
 * - "1 hafta hediye" (a 1-week gift grant) has no existing component anywhere in the
 *   codebase. Building it would be new-screen work (the plan's own step 3), not a move.
 *
 * AgeGateFlagsSection added 2026-09-03, placed by oryn-a7's own ruling: it had no route in
 * the original table, and belongs here because it's a fact about students, not about the
 * catalog or moderation queues it used to sit next to on the old admin page's people tab.
 * Moved, not rewritten -- the component itself is unchanged.
 */
export default async function StudentsPage() {
  const t = await getTranslations("admin.control");

  return (
    <div className="space-y-6">
      <PageHeader title={t("item.students")} description={t("studentsDescription")} />
      <Suspense fallback={<SectionSkeleton />}>
        <UserListSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton rows={2} />}>
        <AgeGateFlagsSection />
      </Suspense>
    </div>
  );
}
