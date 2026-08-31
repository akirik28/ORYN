import { requireUser } from "@/lib/security/dal";
import { PageHeader } from "@/components/oryn/page-header";
import { ResearchIdeaStudio } from "@/features/profile/research-idea-studio";

export const metadata = { title: "Research ideas" };

export default async function ResearchIdeasPage() {
  await requireUser();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Research"
        title="Find a project you can actually finish."
        description="Oryn proposes research scaled to your level and the time you have — grounded in real academic literature and public data, never an impressive-sounding question with no way to answer it."
      />
      <ResearchIdeaStudio />
    </div>
  );
}
