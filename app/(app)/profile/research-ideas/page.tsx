import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/security/dal";
import { PageHeader } from "@/components/oryn/page-header";
import { ResearchIdeaStudio } from "@/features/profile/research-idea-studio";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.researchIdeas");
  return { title: t("pageTitle") };
}

export default async function ResearchIdeasPage() {
  await requireUser();
  const t = await getTranslations("profile.researchIdeas");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <ResearchIdeaStudio />
    </div>
  );
}
