import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/security/dal";
import { FeaturesView } from "@/features/catalog/features-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("features") };
}

export default async function FeaturesPage() {
  const session = await requireUser();
  return <FeaturesView userId={session.userId!} />;
}
