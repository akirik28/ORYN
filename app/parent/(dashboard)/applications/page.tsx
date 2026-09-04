import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getParentDashboardContext } from "@/lib/parent/dashboard-context";
import { ParentPendingScreen } from "@/features/parent/parent-pending-screen";
import { ParentPageShell, ParentSectionHeader, ApplicationsSection } from "@/features/parent/parent-panel-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.applications");
  return { title: t("heading") };
}

/** B3a (2026-09-04) -- see app/parent/(dashboard)/opportunities/page.tsx's own comment. */
export default async function ParentApplicationsPage() {
  const ctx = await getParentDashboardContext();
  if (ctx.state !== "active") return <ParentPendingScreen state={ctx.state} locale={ctx.locale} />;

  const tr = ctx.locale === "tr";
  return (
    <ParentPageShell>
      <ParentSectionHeader
        title={tr ? "Başvurular" : "Applications"}
        description={
          tr
            ? "Öğrencinin üniversite başvurularının durumu."
            : "The status of the student's university applications."
        }
      />
      <ApplicationsSection applications={ctx.data.applications} locale={ctx.locale} />
    </ParentPageShell>
  );
}
