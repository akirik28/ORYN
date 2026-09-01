import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "../_components/forgot-password-form";
import { instrumentSerif } from "@/lib/fonts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgotPassword");
  return { title: t("headline") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth.forgotPassword");
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 26, fontWeight: 400, color: "#111118" }}>
          {t("headline")}
        </h1>
        <p className="text-sm" style={{ color: "#7A7A8A" }}>{t("description")}</p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-[13px]" style={{ color: "#AAAABC" }}>
        <Link href="/login">{t("backToSignIn")}</Link>
      </p>
    </div>
  );
}
