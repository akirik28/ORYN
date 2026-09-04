import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getParentDashboardContext } from "@/lib/parent/dashboard-context";
import { ParentPendingScreen } from "@/features/parent/parent-pending-screen";
import { ParentPageShell, ParentSectionHeader, OpportunitiesSection } from "@/features/parent/parent-panel-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.opportunities");
  return { title: t("heading") };
}

/**
 * B3a (2026-09-04): the first of the four dedicated section routes -- see
 * app/parent/(dashboard)/page.tsx's own comment for why the overview stays alongside these
 * rather than being replaced by them. Same "session -> link -> panel data" sequence as every
 * other page under this layout, via the shared getParentDashboardContext helper.
 *
 * B3c interface contract (CEO, 2026-09-04, fixed in writing): `OpportunityCatalogBrowser`
 * (features/parent/opportunity-catalog-browser.tsx, not yet in this tree) will take
 * `{ searchParams: { q?: string; page?: string }; basePath: "/parent/opportunities";
 * locale: Locale }`, fetch its own data, and render ALONGSIDE `OpportunitiesSection` below --
 * full-catalog browsing, not a replacement for "what's already matched." Same reasoning as
 * app/parent/(dashboard)/universities/page.tsx's own comment for why this isn't a real prop
 * yet: nothing here reads it until that component's actual import lands.
 */
export default async function ParentOpportunitiesPage() {
  const ctx = await getParentDashboardContext();
  if (ctx.state !== "active") return <ParentPendingScreen state={ctx.state} locale={ctx.locale} />;

  const tr = ctx.locale === "tr";
  return (
    <ParentPageShell>
      <ParentSectionHeader
        title={tr ? "Fırsatlar" : "Opportunities"}
        description={
          tr
            ? "Öğrencinin profiline en uygun fırsatlar."
            : "The opportunities that best fit the student's profile."
        }
      />
      <OpportunitiesSection opportunities={ctx.data.opportunities} locale={ctx.locale} />
    </ParentPageShell>
  );
}
