import { verifySession } from "@/lib/security/dal";
import { getActiveParentLink } from "@/lib/auth/account-role";
import { getParentPanelData } from "@/lib/parent/panel-data";
import { ParentPanelView } from "@/features/parent/parent-panel-view";
import { ParentPendingScreen } from "@/features/parent/parent-pending-screen";
import { resolveLocale } from "@/lib/i18n/locale";

/**
 * The real parent panel (P3, docs/veli-hesabi-spec-2026-09-04.md). Mounted under
 * app/parent/(dashboard)/, whose layout (P2, oryn-71) already checked session, account_role,
 * and link status before rendering this page at all -- by the time this runs, the caller is
 * a signed-in parent with an active link. `getActiveParentLink` is called anyway rather than
 * trusted implicitly (cache()-deduped against the layout's own check, so this costs nothing
 * extra) because this file has no way to prove the precondition holds other than checking it,
 * and "shouldn't happen" is not the same guarantee as "checked."
 *
 * The `ParentPendingScreen` branch below should be unreachable in normal operation -- the
 * layout redirects to /parent/pending for exactly this case -- but degrades to the honest
 * screen rather than a blank page or a crash if it's ever reached anyway (a race between the
 * layout's check and this one, a student revoking access mid-session, etc.).
 */
export default async function ParentDashboardPage() {
  const session = await verifySession();
  const locale = await resolveLocale();

  const link = session.userId ? await getActiveParentLink(session.userId) : null;
  if (!link) return <ParentPendingScreen state="no_link" locale={locale} />;

  const result = await getParentPanelData(link.student_user_id, locale);
  if (result.state !== "active") return <ParentPendingScreen state={result.state} locale={locale} />;

  return <ParentPanelView data={result.data} locale={locale} />;
}
