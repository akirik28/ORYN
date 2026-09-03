import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isProfilesCurriculumOtherTextLive } from "@/lib/profile/curriculum-other-text";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.wizard");
  return { title: t("pageTitle") };
}

export default async function OnboardingPage() {
  // Migration 0109, proposed and not yet applied -- see that migration's own header.
  // tryCreateAdminClient() returning null (no SUPABASE_SECRET_KEY configured) degrades to
  // the same "not live" default as a genuinely missing column, matching every other check
  // built against this pattern tonight: fail closed, never guess a feature is ready.
  const admin = tryCreateAdminClient();
  const curriculumOtherTextLive = admin ? await isProfilesCurriculumOtherTextLive(admin) : false;

  return <OnboardingWizard curriculumOtherTextLive={curriculumOtherTextLive} />;
}
