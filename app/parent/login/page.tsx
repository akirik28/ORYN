import type { Metadata } from "next";
import Link from "next/link";
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
 */
export default async function ParentLoginPage() {
  const session = await verifySession();
  if (session.isAuth && session.userId) {
    const role = await getAccountRole(session.userId);
    redirect(role === "parent" ? "/parent" : "/dashboard");
  }

  const t = await getTranslations("parent.login");

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 28, fontWeight: 400, color: "#2E2418" }}>
          {t("heading")}
        </h1>
        <p className="text-sm" style={{ color: "#8A7A64" }}>{t("subheading")}</p>
      </div>
      <LoginForm next="/parent" />
      <p className="text-center text-[13px]" style={{ color: "#B0A38E" }}>
        <Link href="/login" style={{ color: "#8A6D3D" }} className="font-semibold">
          {t("backToStudentSignIn")}
        </Link>
      </p>
    </div>
  );
}
