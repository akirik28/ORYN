import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { verifySession } from "@/lib/security/dal";
import { getAccountRole, getParentLinkStatus, type ParentLinkStatus } from "@/lib/auth/account-role";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { ParentPendingScreen } from "@/features/parent/parent-pending-screen";
import { resolveLocale } from "@/lib/i18n/locale";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.pending");
  return { title: t("heading") };
}

/** `ParentPendingScreen`'s three states (pending/revoked/no_link) aren't quite this file's
 * four (that type also carries "active", which never reaches this page -- see below). Named
 * as its own function rather than inlined so the one place this mapping exists is easy to
 * find if a status value is ever added to either side. */
function toScreenState(status: ParentLinkStatus): "pending" | "revoked" | "no_link" {
  return status === "none" ? "no_link" : status === "pending" ? "pending" : "revoked";
}

/**
 * The screen for §K3's deliberately-empty state: a parent account exists and is
 * authenticated, but has no `active` parent_links row -- either no student has invited
 * them yet, or the invite is sent and awaiting the student's own confirmation. CEO's
 * explicit ask: "its own screen, not a redirect loop or an empty dashboard." This IS that
 * screen, not a fallback inside the dashboard -- the dashboard layout below never renders
 * for a not-yet-linked parent at all, it redirects here instead.
 *
 * FIXED 2026-09-04: now renders `features/parent/parent-pending-screen.tsx`'s
 * `ParentPendingScreen` instead of hand-rolled copy -- that component was built expecting
 * this page to call it ("routing is P2's; this is the copy," its own header says) but
 * shipped after this page did, so the two went unreconciled until
 * docs/parent-state-machine-trace-2026-09-04.md caught it. Real upgrade, not just a
 * refactor: three honest states instead of two ("revoked" no longer reuses the "no invite"
 * copy), brown-themed via the same `--role-*` tokens the dashboard uses, and it's the
 * component 11 will extend if a fourth state is ever needed -- one place instead of two.
 * Sign-out is passed in via `action` since the component itself knows nothing about auth.
 *
 * Auth- and role-gated like the dashboard group, but deliberately NOT nested inside it --
 * app/parent/(dashboard)/layout.tsx redirects HERE when the link isn't active, so if this
 * page also lived under that layout it would redirect to itself. Gates its own two
 * preconditions directly instead: real session, and account_role === "parent". If somehow
 * already `active` (e.g. confirmed in another tab while this one sat open), sends the
 * visitor on to the real dashboard rather than showing a stale "not linked" message.
 */
export default async function ParentPendingPage() {
  const session = await verifySession();
  if (!session.isAuth || !session.userId) {
    redirect("/parent/login");
  }

  const role = await getAccountRole(session.userId);
  if (role !== "parent") {
    redirect("/dashboard");
  }

  const status = await getParentLinkStatus(session.userId);
  if (status === "active") {
    redirect("/parent");
  }

  const [t, locale] = await Promise.all([getTranslations("parent.pending"), resolveLocale()]);

  return (
    <ParentPendingScreen
      state={toScreenState(status)}
      locale={locale}
      action={
        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            {t("signOut")}
          </Button>
        </form>
      }
    />
  );
}
