import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getTargetUniversitiesWithDetails } from "@/lib/universities/queries";
import { getSavedOpportunitiesWithDetails } from "@/lib/opportunities/saved";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { SavedUniversitiesSection } from "@/features/saved/saved-universities-section";
import { SavedOpportunitiesSection } from "@/features/saved/saved-opportunities-section";
import { CompareBar } from "@/features/universities/compare-bar";
import { OpportunityCompareBar } from "@/features/opportunities/opportunity-compare-bar";

export const metadata = { title: "Saved" };

/**
 * Founder request, 2026-09-01 (verbatim): "kaydet butonu var ya, kaydedilenler diye bir
 * sayfa da açalım — orda fırsat ve ünileri gösterelim kaydedilen, ve yine karşılaştırma ve
 * filtreleme özellikleri olsun" — one page, saved opportunities and universities, with
 * compare and filter.
 *
 * One page with two sections, not two pages and not one merged list: a university and an
 * opportunity compare differently (see opportunities/compare/page.tsx vs universities/
 * compare/page.tsx — different columns, because they're different kinds of decisions), so
 * forcing them into a single list would mean either two incompatible row shapes side by
 * side or losing the type-specific comparison. One page keeps "everything I saved" as one
 * destination, matching the founder's own singular "bir sayfa."
 *
 * Both queries exclude the status that means "I took this off my list" — `not_interested`
 * for opportunities, `withdrawn` for universities — at the query level (see
 * lib/opportunities/saved.ts's own comment for the full reasoning). Everything else shows,
 * including `applied`/`accepted`/`rejected`: applying to something, or hearing back, isn't
 * the same as un-saving it.
 */
export default async function SavedPage() {
  const session = await requireUser();
  const userId = session.userId!;
  const supabase = await createClient();
  const t = await getTranslations("saved");

  const [targets, savedOpportunities] = await Promise.all([
    getTargetUniversitiesWithDetails(supabase, userId),
    getSavedOpportunitiesWithDetails(supabase, userId),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <section className="space-y-4">
        <SectionHeader title={t("universitiesSectionTitle")} />
        <SavedUniversitiesSection targets={targets} />
      </section>

      <section className="space-y-4">
        <SectionHeader title={t("opportunitiesSectionTitle")} />
        <SavedOpportunitiesSection saved={savedOpportunities} />
      </section>

      <CompareBar />
      <OpportunityCompareBar />
    </div>
  );
}
