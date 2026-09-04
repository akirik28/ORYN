import "server-only";

import { verifySession } from "@/lib/security/dal";
import { getActiveParentLink } from "@/lib/auth/account-role";
import { getParentPanelData, type ParentPanelResult } from "@/lib/parent/panel-data";
import { resolveLocale } from "@/lib/i18n/locale";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { ParentLink } from "@/types/database";

/**
 * The "session -> link -> panel data" sequence every page under app/parent/(dashboard)/
 * needs, in one place (B3a, 2026-09-04) -- before this, app/parent/(dashboard)/page.tsx was
 * the only page and carried this inline. Splitting the dashboard into five routes (this
 * overview plus opportunities/universities/applications/progress) means five call sites for
 * the identical sequence; a shared helper is what keeps them from drifting the way two
 * inline copies of the same cookie-write options already did once tonight
 * (lib/i18n/config.ts's LOCALE_COOKIE_OPTIONS).
 *
 * `link` and `session.userId` are re-derived from `getActiveParentLink`/`verifySession`
 * rather than trusted from the (dashboard) layout that already checked them -- same reasoning
 * as that layout's own header comment: this file has no way to prove the precondition holds
 * other than checking it, and both calls are `cache()`-deduped against the layout's own, so
 * checking again costs nothing extra in the same request.
 *
 * The "active" variant carries the `link` row itself, not just `data` (added the same day
 * for app/parent/(dashboard)/progress/page.tsx's own commentary read: it needs
 * `link.last_commentary_sent_at` for the due-check and `link.student_user_id` for
 * getLatestParentCommentary, neither of which `ParentPanelData` carries).
 */
export type ParentDashboardContext =
  | { state: "no_link"; locale: Locale }
  | { state: "pending" | "revoked"; locale: Locale }
  | { state: "active"; locale: Locale; link: ParentLink; data: NonNullable<Extract<ParentPanelResult, { state: "active" }>["data"]> };

export async function getParentDashboardContext(): Promise<ParentDashboardContext> {
  const session = await verifySession();
  const locale = (await resolveLocale()) ?? DEFAULT_LOCALE;

  const link = session.userId ? await getActiveParentLink(session.userId) : null;
  if (!link) return { state: "no_link", locale };

  const result = await getParentPanelData(link.student_user_id, locale);
  if (result.state !== "active") return { state: result.state, locale };

  return { state: "active", locale, link, data: result.data };
}
