import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { verifySession } from "@/lib/security/dal";
import { getAccountRole, getParentLinkStatus } from "@/lib/auth/account-role";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { instrumentSerif } from "@/lib/fonts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.pending");
  return { title: t("heading") };
}

/**
 * The screen for §K3's deliberately-empty state: a parent account exists and is
 * authenticated, but has no `active` parent_links row -- either no student has invited
 * them yet, or the invite is sent and awaiting the student's own confirmation. CEO's
 * explicit ask: "its own screen, not a redirect loop or an empty dashboard." This IS that
 * screen, not a fallback inside the dashboard -- the dashboard layout below never renders
 * for a not-yet-linked parent at all, it redirects here instead.
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

  const t = await getTranslations("parent.pending");
  // "revoked" reuses the no-invite copy rather than a third message -- both honestly mean
  // "nothing to see right now", and a distinct "your access was removed" message can wait
  // for P4, which is the lane that will actually be able to produce that state on purpose.
  const body = status === "pending" ? t("bodyAwaitingConfirmation") : t("bodyNoInvite");

  return (
    <div className="space-y-6 text-center">
      <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 28, fontWeight: 400, color: "#2E2418" }}>
        {t("heading")}
      </h1>
      <p className="text-sm" style={{ color: "#8A7A64" }}>{body}</p>
      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full">
          {t("signOut")}
        </Button>
      </form>
    </div>
  );
}
