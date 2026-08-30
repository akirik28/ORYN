import Link from "next/link";
import { ForgotPasswordForm } from "../_components/forgot-password-form";
import { instrumentSerif } from "@/lib/fonts";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 26, fontWeight: 400, color: "#111118" }}>
          Reset your password
        </h1>
        <p className="text-sm" style={{ color: "#7A7A8A" }}>
          Enter your email and we&apos;ll send a reset link if an account exists.
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-[13px]" style={{ color: "#AAAABC" }}>
        <Link href="/login">← Back to sign in</Link>
      </p>
    </div>
  );
}
