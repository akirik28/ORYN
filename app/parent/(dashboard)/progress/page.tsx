import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getParentDashboardContext } from "@/lib/parent/dashboard-context";
import { getLatestParentCommentary } from "@/lib/parent/commentary";
import { isDueForMonthlyCommentary } from "@/lib/digest/parent-commentary-run";
import { ParentPendingScreen } from "@/features/parent/parent-pending-screen";
import { ParentPageShell, ParentSectionHeader, GapSection } from "@/features/parent/parent-panel-view";
import { ParentCommentaryPanel } from "@/features/parent/parent-commentary-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.progress");
  return { title: t("heading") };
}

/**
 * B3a (2026-09-04) -- see app/parent/(dashboard)/opportunities/page.tsx's own comment.
 * "Gelişim" (development/progress) is the founder's own word for what the data model calls
 * `gap` -- same underlying field GapSection already rendered on the overview, given its own
 * route and header here rather than a second name for the same thing.
 *
 * ADDED 2026-09-04 (B3b's monthly commentary, storage/display closed the same day -- see
 * migration 0130 and lib/parent/commentary.ts): `entry`/`due` are both plain, fast reads --
 * getLatestParentCommentary is a single SECURITY DEFINER call, isDueForMonthlyCommentary is a
 * pure function over a timestamp already in `ctx.link`. Neither touches the AI provider.
 * ParentCommentaryPanel is a Client Component specifically so the (potentially 20-58s) actual
 * generation, when `due` is true, never blocks this page's own render -- see that component's
 * own header comment for the full reasoning.
 */
export default async function ParentProgressPage() {
  const ctx = await getParentDashboardContext();
  if (ctx.state !== "active") return <ParentPendingScreen state={ctx.state} locale={ctx.locale} />;

  const entry = await getLatestParentCommentary(ctx.link.student_user_id);
  const due = isDueForMonthlyCommentary(ctx.link.last_commentary_sent_at);

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
      <ParentCommentaryPanel entry={entry} due={due} locale={ctx.locale} />
      <GapSection gap={ctx.data.gap} locale={ctx.locale} />
    </ParentPageShell>
  );
}
