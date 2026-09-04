import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getParentDashboardContext } from "@/lib/parent/dashboard-context";
import { ParentPendingScreen } from "@/features/parent/parent-pending-screen";
import { ParentPageShell, ParentSectionHeader, OpportunitiesSection } from "@/features/parent/parent-panel-view";
import { OpportunityCatalogBrowser } from "@/features/parent/opportunity-catalog-browser";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.opportunities");
  return { title: t("heading") };
}

const BASE_PATH = "/parent/opportunities";

/**
 * B3a (2026-09-04): the first of the four dedicated section routes -- see
 * app/parent/(dashboard)/page.tsx's own comment for why the overview stays alongside these
 * rather than being replaced by them. Same "session -> link -> panel data" sequence as every
 * other page under this layout, via the shared getParentDashboardContext helper.
 *
 * WIRED 2026-09-04: `OpportunityCatalogBrowser` (B3c) landed on main with exactly the
 * contract CEO fixed in writing -- see app/parent/(dashboard)/universities/page.tsx's own
 * comment for the identical reasoning (renders alongside `OpportunitiesSection`, not in
 * place of it; `searchParams` awaited once and passed down as the plain object both this
 * page and the browser's own `<form method="GET">` need).
 */
export default async function ParentOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const ctx = await getParentDashboardContext();
  if (ctx.state !== "active") return <ParentPendingScreen state={ctx.state} locale={ctx.locale} />;

  const resolvedSearchParams = await searchParams;
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
      <OpportunityCatalogBrowser searchParams={resolvedSearchParams} basePath={BASE_PATH} locale={ctx.locale} />
    </ParentPageShell>
  );
}
