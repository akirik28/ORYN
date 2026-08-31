import Link from "next/link";
import { resolveLocale } from "@/lib/i18n/locale";
import { SignUpForm } from "../_components/signup-form";
import { instrumentSerif } from "@/lib/fonts";

export const metadata = { title: "Create your account" };

/**
 * The rest of this page's copy (headline, "Sign in" link) is outside the legal-surfaces
 * scope this file otherwise belongs to — not translated here. Only `locale` is resolved,
 * to hand to `SignUpForm` -> `SignUpConsent`, which does need it.
 */
export default async function SignUpPage() {
  const locale = await resolveLocale();

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 28, fontWeight: 400, color: "#111118" }}>
          Create your account
        </h1>
        <p className="text-sm" style={{ color: "#7A7A8A" }}>Free for students. No credit card required.</p>
      </div>
      <SignUpForm locale={locale} />
      <p className="text-center text-[13px]" style={{ color: "#AAAABC" }}>
        Already have an account?{" "}
        <Link href="/login" className="font-semibold" style={{ color: "#3D35E8" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
