import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionSkeleton } from "@/features/admin/sections/section-skeleton";
import { AdminActivitySection } from "@/features/admin/sections/admin-activity-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.control");
  return { title: t("item.ledger") };
}

/**
 * First section moved from app/(app)/admin/ into the control centre — see
 * docs/kumanda-merkezi-yapi-plani-2026-09-03.md. AdminActivitySection is unchanged;
 * only the route it renders under is new. Chosen to go first because it's the smallest
 * possible move (one section, no interactive controls), which makes it the right place
 * to verify oryn-a7's token claim before moving the other five, larger groups.
 */
export default async function LedgerPage() {
  const t = await getTranslations("admin.control");

  return (
    <div className="space-y-6">
      <PageHeader title={t("item.ledger")} description={t("ledgerDescription")} />
      <Suspense fallback={<SectionSkeleton rows={4} />}>
        <AdminActivitySection />
      </Suspense>
    </div>
  );
}
