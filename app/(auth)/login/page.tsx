import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "../_components/login-form";
import { instrumentSerif } from "@/lib/fonts";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const t = await getTranslations("auth.login");

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 style={{ fontFamily: instrumentSerif.style.fontFamily, fontSize: 28, fontWeight: 400, color: "#111118" }}>
          {t("welcomeBack")}
        </h1>
        <p className="text-sm" style={{ color: "#7A7A8A" }}>{t("signInToContinue")}</p>
      </div>
      {error === "invalid_confirmation_link" ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t("invalidConfirmationLink")}
        </p>
      ) : null}
      <LoginForm next={next} />
      <p className="text-center text-[13px]" style={{ color: "#AAAABC" }}>
        {t("newToOryn")}{" "}
        <Link href="/signup" className="font-semibold" style={{ color: "#3D35E8" }}>
          {t("createAccount")}
        </Link>
      </p>
    </div>
  );
}
