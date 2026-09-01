import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { verifySession } from "@/lib/security/dal";
import { ResetPasswordForm } from "../_components/reset-password-form";
import { instrumentSerif } from "@/lib/fonts";

export const metadata = { title: "Set a new password" };

// No direct source screen for this one — the Figma handoff's ForgotPassword flow never
// shows a distinct "enter your new password" step. Given the same Instrument
// Serif/Inter/card treatment as its siblings for visual consistency, not claimed as a
// literal 1:1 transplant like login/signup/forgot-password.
export default async function ResetPasswordPage() {
  const session = await verifySession();
  const t = await getTranslations("auth.resetPassword");

  if (!session.isAuth) {
    return (
      <div className="space-y-4 text-center">
        <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 26, fontWeight: 400, color: "#111118" }}>
          {t("linkExpiredTitle")}
        </h1>
        <p className="text-sm" style={{ color: "#7A7A8A" }}>
          {t("linkExpiredBody")}
        </p>
        <Link href="/forgot-password" className="text-sm font-semibold" style={{ color: "#3D35E8" }}>
          {t("requestNewLink")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 26, fontWeight: 400, color: "#111118" }}>
          {t("setNewPassword")}
        </h1>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
