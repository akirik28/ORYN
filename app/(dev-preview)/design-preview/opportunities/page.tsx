import { notFound } from "next/navigation";
import { OpportunityCard } from "@/features/opportunities/opportunity-card";
import { FIXTURE_OPPORTUNITIES, FIXTURE_PROFILE_SIGNAL } from "@/lib/dev/fixtures";
import { PreviewShell } from "../preview-shell";

// Checks the 2026-08-30 card changes without Supabase: the "No image yet" placeholder band
// (migration 0066's image_url is null on every row today) and the "Taught in …" descriptor,
// which the fixtures exercise in both single- and multi-language forms.
export default function OpportunitiesPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL}>
      <div className="grid gap-4 md:grid-cols-2">
        {FIXTURE_OPPORTUNITIES.map(({ opportunity, matchScore, reasonCodes }) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            matchScore={matchScore}
            reasonCodes={reasonCodes}
            initialStatus={null}
          />
        ))}
      </div>
    </PreviewShell>
  );
}
