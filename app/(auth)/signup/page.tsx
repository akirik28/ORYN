import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { SignUpForm } from "../_components/signup-form";
import { instrumentSerif } from "@/lib/fonts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signup");
  return { title: t("title") };
}

export default async function SignUpPage() {
  const locale = await resolveLocale();
  const t = await getTranslations("auth.signup");

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 28, fontWeight: 400, color: "#111118" }}>
          {t("title")}
        </h1>
        <p className="text-sm" style={{ color: "#7A7A8A" }}>{t("subtitle")}</p>
      </div>
      <SignUpForm locale={locale} />
      <p className="text-center text-[13px]" style={{ color: "#AAAABC" }}>
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold" style={{ color: "#3D35E8" }}>
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
