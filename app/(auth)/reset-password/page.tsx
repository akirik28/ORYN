import Link from "next/link";
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

  if (!session.isAuth) {
    return (
      <div className="space-y-4 text-center">
        <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 26, fontWeight: 400, color: "#111118" }}>
          Link expired
        </h1>
        <p className="text-sm" style={{ color: "#7A7A8A" }}>
          This password reset link is invalid or has expired.
        </p>
        <Link href="/forgot-password" className="text-sm font-semibold" style={{ color: "#3D35E8" }}>
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 26, fontWeight: 400, color: "#111118" }}>
          Set a new password
        </h1>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
