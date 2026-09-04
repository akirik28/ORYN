import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getParentDashboardContext } from "@/lib/parent/dashboard-context";
import { ParentPanelView } from "@/features/parent/parent-panel-view";
import { ParentPendingScreen } from "@/features/parent/parent-pending-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.overview");
  return { title: t("heading") };
}

/**
 * The parent overview -- everything in one scroll (P3, docs/veli-hesabi-spec-2026-09-04.md).
 * Mounted under app/parent/(dashboard)/, whose layout (P2, oryn-71) already checked session,
 * account_role, and link status before rendering this page at all -- by the time this runs,
 * the caller is a signed-in parent with an active link. `getParentDashboardContext` re-checks
 * anyway rather than trusting that implicitly (cache()-deduped against the layout's own
 * checks, so this costs nothing extra) because this file has no way to prove the precondition
 * holds other than checking it, and "shouldn't happen" is not the same guarantee as "checked."
 *
 * The `ParentPendingScreen` branch below should be unreachable in normal operation -- the
 * layout redirects to /parent/pending for exactly this case -- but degrades to the honest
 * screen rather than a blank page or a crash if it's ever reached anyway (a race between the
 * layout's check and this one, a student revoking access mid-session, etc.).
 *
 * B3a (2026-09-04): the founder's own complaint was "no separate pages at all" -- this stays
 * as the full overview rather than being replaced by one, and /parent/opportunities,
 * /parent/universities, /parent/applications, /parent/progress are the four new, real,
 * bookmarkable routes alongside it. The shared nav (app/parent/(dashboard)/layout.tsx) is
 * what makes all five reachable from one another.
 *
 * `generateMetadata` added same night, i18n coverage sweep: this page had no title mechanism
 * at all (not the static-English antipattern the check script flags, just nothing), so the
 * browser tab silently fell back to app/layout.tsx's own English default regardless of
 * locale -- the other four /parent/(dashboard)/* pages already had this, this one didn't.
 */
export default async function ParentDashboardPage() {
  const ctx = await getParentDashboardContext();
  if (ctx.state !== "active") return <ParentPendingScreen state={ctx.state} locale={ctx.locale} />;

  return <ParentPanelView data={ctx.data} locale={ctx.locale} />;
}
