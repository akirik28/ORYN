import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/oryn/page-header";
import { CvImportFlow } from "@/features/profile/cv-import-flow";
import { isAIConfigured } from "@/lib/ai";
import { EmptyState } from "@/components/oryn/empty-state";
import { FileUp } from "lucide-react";

export const metadata = { title: "Scan a CV" };

export default function CvImportPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-ink-3 transition-colors hover:text-ink-1 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft className="size-3.5" /> Back to journey
        </Link>
        <PageHeader
          className="mt-3"
          eyebrow="Journey"
          title="Scan a CV."
          description="Already have your record written down somewhere? Oryn can read it and pull out your education, activities, awards, projects, research and work — you review everything before any of it is saved."
        />
      </div>

      {isAIConfigured() ? (
        <CvImportFlow />
      ) : (
        // Phase 72: say what's missing rather than showing a button that can't work.
        <EmptyState
          icon={FileUp}
          title="CV scanning isn't configured yet"
          description="This needs ANTHROPIC_API_KEY to be set — see API_SETUP.md. You can still add everything to your profile manually."
        />
      )}
    </div>
  );
}
