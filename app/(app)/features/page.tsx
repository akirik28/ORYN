import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser, requireProfile } from "@/lib/security/dal";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { FeaturesView } from "@/features/catalog/features-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("features") };
}

export default async function FeaturesPage() {
  const session = await requireUser();
  const planTier = resolvePlanTier(await requireProfile());
  return <FeaturesView userId={session.userId!} tier={planTier} />;
}
