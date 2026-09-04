import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/app/(auth)/_components/login-form";
import { verifySession } from "@/lib/security/dal";
import { getAccountRole } from "@/lib/auth/account-role";
import { instrumentSerif } from "@/lib/fonts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.login");
  return { title: t("heading") };
}

/**
 * The parent entrance's own sign-in page (P2) -- a real route, not a query parameter on
 * /login, so it's reachable from an invite email and bookmarkable on its own
 * (docs/veli-hesabi-spec-2026-09-04.md: "ayrı girişi olacak"). Deliberately public (no
 * gate in app/parent/layout.tsx above this) -- gating a login page on being logged in
 * would be a redirect loop by construction. If a session already exists, this page itself
 * (not the layout) sends the visitor onward rather than showing the form again, mirroring
 * proxy.ts's existing AUTH_ROUTES behavior for /login -- just role-aware now.
 *
 * Reuses (auth)'s own LoginForm/signIn as-is rather than forking them: a parent
 * authenticates through the identical Supabase email/password flow a student does, just
 * with a different `next` target and different surrounding copy. No "create account" link
 * here on purpose -- a parent account is created through the invite flow (P4), not a bare
 * self-signup; that flow doesn't exist yet.
 *
 * Carries its own logo + card chrome inline (FIXED 2026-09-04) -- previously provided by
 * app/parent/layout.tsx, moved down here once that layout stopped wrapping every child in
 * a login-shaped card (see that file's own comment for why: nesting it around the
 * dashboard/pending, which are full-page components in their own right, broke both). Login
 * is genuinely the one screen under /parent this card shape still fits. Colors now read
 * from the `--role-*` custom properties (app/globals.css, scoped by the layout's
 * `data-role="parent"`) instead of hardcoded hex -- same fix ab flagged for the pending
 * page, applied here too since both were built before the token set existed.
 */
export default async function ParentLoginPage() {
  const session = await verifySession();
  if (session.isAuth && session.userId) {
    const role = await getAccountRole(session.userId);
    redirect(role === "parent" ? "/parent" : "/dashboard");
  }

  const t = await getTranslations("parent.login");

  return (
    <div
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: "linear-gradient(145deg, var(--role-page-bg-1) 0%, var(--role-page-bg-2) 30%, var(--role-page-bg-3) 55%, var(--role-page-bg-4) 100%)" }}
    >
      <Link href="/" className="relative mb-8">
        <Image src="/brand/logo-full.png" alt="Proxola" width={139} height={44} priority className="h-11 w-auto" />
      </Link>
      <div
        className="relative w-full max-w-sm space-y-6 rounded-[24px] border bg-card p-10"
        style={{ borderColor: "var(--role-surface-border)", boxShadow: "0 24px 80px color-mix(in oklch, var(--role-accent), transparent 88%)" }}
      >
        <div className="space-y-1 text-center">
          <h1 className="text-foreground" style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 28, fontWeight: 400 }}>
            {t("heading")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subheading")}</p>
        </div>
        <LoginForm next="/parent" />
        <p className="text-center text-[13px] text-muted-foreground">
          <Link href="/login" className="font-semibold" style={{ color: "var(--role-accent)" }}>
            {t("backToStudentSignIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
