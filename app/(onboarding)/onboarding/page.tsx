import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.wizard");
  return { title: t("pageTitle") };
}

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
