import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getParentDashboardContext } from "@/lib/parent/dashboard-context";
import { ParentPendingScreen } from "@/features/parent/parent-pending-screen";
import { ParentPageShell, ParentSectionHeader, UniversitiesSection } from "@/features/parent/parent-panel-view";
import { UniversityCatalogBrowser } from "@/features/parent/university-catalog-browser";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.universities");
  return { title: t("heading") };
}

const BASE_PATH = "/parent/universities";

/**
 * B3a (2026-09-04) -- see app/parent/(dashboard)/opportunities/page.tsx's own comment.
 *
 * WIRED 2026-09-04: `UniversityCatalogBrowser` (B3c, features/parent/university-catalog-
 * browser.tsx) landed on main with exactly the contract CEO fixed in writing --
 * `{ searchParams, basePath, locale }`, fetches its own data. Renders ALONGSIDE
 * `UniversitiesSection` below, not in place of it: full-catalog browsing is a different
 * thing from "what has the student already picked." `searchParams` is Next's own Promise
 * page prop, awaited once here and passed down as the plain object both this page and the
 * browser's own `<form method="GET">` need.
 */
export default async function ParentUniversitiesPage({
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
        title={tr ? "Üniversiteler" : "Universities"}
        description={
          tr
            ? "Öğrencinin hedef olarak işaretlediği üniversiteler."
            : "The universities the student has marked as targets."
        }
      />
      <UniversitiesSection universities={ctx.data.universities} locale={ctx.locale} />
      <UniversityCatalogBrowser searchParams={resolvedSearchParams} basePath={BASE_PATH} locale={ctx.locale} />
    </ParentPageShell>
  );
}
