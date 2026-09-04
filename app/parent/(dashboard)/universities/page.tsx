import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getParentDashboardContext } from "@/lib/parent/dashboard-context";
import { ParentPendingScreen } from "@/features/parent/parent-pending-screen";
import { ParentPageShell, ParentSectionHeader, UniversitiesSection } from "@/features/parent/parent-panel-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.universities");
  return { title: t("heading") };
}

/**
 * B3a (2026-09-04) -- see app/parent/(dashboard)/opportunities/page.tsx's own comment.
 *
 * B3c interface contract (CEO, 2026-09-04, fixed in writing): `UniversityCatalogBrowser`
 * (features/parent/university-catalog-browser.tsx, not yet in this tree) will take
 * `{ searchParams: { q?: string; page?: string }; basePath: "/parent/universities";
 * locale: Locale }`, fetch its own data, and render ALONGSIDE `UniversitiesSection` below --
 * full-catalog browsing, not a replacement for "what has the student already picked." Left as
 * a comment rather than a real `searchParams` prop on this function: nothing here reads it
 * yet, and an unused prop is dead weight until that component's actual import lands.
 */
export default async function ParentUniversitiesPage() {
  const ctx = await getParentDashboardContext();
  if (ctx.state !== "active") return <ParentPendingScreen state={ctx.state} locale={ctx.locale} />;

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
    </ParentPageShell>
  );
}
