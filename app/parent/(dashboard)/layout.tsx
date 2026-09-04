import { redirect } from "next/navigation";
import { verifySession } from "@/lib/security/dal";
import { getAccountRole, getParentLinkStatus, hasActiveParentLink } from "@/lib/auth/account-role";
import { resolveLocale } from "@/lib/i18n/locale";
import { ParentNav } from "@/features/parent/parent-nav";

/**
 * The real parent surface's gate (renders at /parent, the (dashboard) segment doesn't
 * appear in the URL) -- three checks, each redirecting somewhere specific rather than
 * showing one generic "access denied":
 *   1. no session          -> /parent/login
 *   2. session, not parent -> /dashboard (the student home; see app/(app)/layout.tsx's
 *                              mirror-image check for the other direction)
 *   3. parent, no active link -> /parent/pending (§K3's dedicated screen, not this layout
 *                              rendering an empty dashboard itself)
 * Resolved here, in a Server Component layout, before anything under it renders -- not in
 * proxy.ts (Next 16's middleware). proxy.ts (lib/supabase/proxy.ts) is explicitly
 * cookie-only/optimistic by this codebase's own convention ("this only reads the
 * cookie-based session; it is not the source of truth for authorization") and has no
 * database access at all -- account_role and parent_links.status both require a real
 * profiles/parent_links read, which is exactly why app/(app)/layout.tsx already resolves
 * onboarding_completed/birth_year the same way, at the layout, not the proxy. Because this
 * runs server-side and redirect() short-circuits the render, a browser never receives the
 * wrong shell to paint even briefly -- the same guarantee a client-side check couldn't make.
 *
 * SECURITY NOTE, worth repeating exactly where a future reader will look for it: everything
 * in this file is routing convenience. It decides what a parent SEES; it is not what stops
 * a parent from reading or writing a student's data if they somehow reached a page this
 * gate didn't cover. That boundary is 44's RLS policies on parent_links/profiles, enforced
 * by Postgres regardless of which layout a request happened to render through. Do not add
 * a data-fetching shortcut here on the assumption that "the layout already checked" is a
 * safe substitute for a real RLS policy on whatever table it queries -- see
 * lib/security/dal.ts's own header comment for why every data-touching call re-checks for
 * itself rather than trusting an ancestor layout.
 */
// page.tsx in this segment is P3 (lane 11)'s real panel. It reads lib/auth/account-role.ts's
// getActiveParentLink(session.userId) directly for the linked student's user id rather than
// this layout threading it down as a prop (App Router's `children` has no such channel) --
// cache()-deduped against this layout's own getParentLinkStatus call, so it costs no extra
// query in the same request.
// (STALE 2026-09-04: this comment used to say "no page.tsx in this segment on purpose,"
// written before lane 11's page.tsx landed -- corrected during a composed read of the whole
// route group, CEO dispatch, so it stops contradicting the file tree next to it.)
//
// ADDED 2026-09-04 (B3a): the nav bar. Placed here rather than in each page, since every
// page reachable through this layout is exactly the set of five it links between -- one
// shared nav instead of five copies. Renders only once this layout's three redirects have
// all passed, so it never appears for a parent with nothing yet to navigate between.
export default async function ParentDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session.isAuth || !session.userId) {
    redirect("/parent/login");
  }

  const role = await getAccountRole(session.userId);
  if (role !== "parent") {
    redirect("/dashboard");
  }

  const linkStatus = await getParentLinkStatus(session.userId);
  if (!hasActiveParentLink(linkStatus)) {
    redirect("/parent/pending");
  }

  const locale = await resolveLocale();

  return (
    <>
      <ParentNav locale={locale} />
      {children}
    </>
  );
}
