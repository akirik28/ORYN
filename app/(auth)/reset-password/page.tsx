import Link from "next/link";
import { verifySession } from "@/lib/security/dal";
import { ResetPasswordForm } from "../_components/reset-password-form";

export const metadata = { title: "Set a new password" };

export default async function ResetPasswordPage() {
  const session = await verifySession();

  if (!session.isAuth) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="font-display text-2xl tracking-tight">Link expired</h1>
        <p className="text-sm text-muted-foreground">
          This password reset link is invalid or has expired.
        </p>
        <Link href="/forgot-password" className="text-sm text-primary underline-offset-4 hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-display text-2xl tracking-tight">Set a new password</h1>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
