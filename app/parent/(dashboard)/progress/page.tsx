import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getParentDashboardContext } from "@/lib/parent/dashboard-context";
import { ParentPendingScreen } from "@/features/parent/parent-pending-screen";
import { ParentPageShell, ParentSectionHeader, GapSection } from "@/features/parent/parent-panel-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.progress");
  return { title: t("heading") };
}

/**
 * B3a (2026-09-04) -- see app/parent/(dashboard)/opportunities/page.tsx's own comment.
 * "Gelişim" (development/progress) is the founder's own word for what the data model calls
 * `gap` -- same underlying field GapSection already rendered on the overview, given its own
 * route and header here rather than a second name for the same thing.
 */
export default async function ParentProgressPage() {
  const ctx = await getParentDashboardContext();
  if (ctx.state !== "active") return <ParentPendingScreen state={ctx.state} locale={ctx.locale} />;

  const tr = ctx.locale === "tr";
  return (
    <ParentPageShell>
      <ParentSectionHeader
        title={tr ? "Gelişim" : "Progress"}
        description={
          tr
            ? "Öğrencinin profilinde şu anda en çok dikkat isteyen alan."
            : "The area of the student's profile that could use the most attention right now."
        }
      />
      <GapSection gap={ctx.data.gap} locale={ctx.locale} />
    </ParentPageShell>
  );
}
