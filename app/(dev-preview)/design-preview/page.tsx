import { notFound } from "next/navigation";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { UniversityExplorerHero } from "@/features/universities/university-explorer-hero";
import { AcceptanceMoment } from "@/features/applications/status-control";
import { SUPPORTED_COUNTRIES } from "@/lib/data/country-geo";
import { ProgressView } from "@/features/profile/progress-view";
import { PreviewShell } from "./preview-shell";
import {
  FIXTURE_STUDENT,
  FIXTURE_BIGGEST_GAP,
  FIXTURE_PROFILE_CHANGE,
  FIXTURE_WEEKLY_PLAN,
  FIXTURE_AVOID_RECOMMENDATION,
  FIXTURE_DEADLINES,
  FIXTURE_TARGET_UNIVERSITIES,
  FIXTURE_OPPORTUNITIES,
  FIXTURE_PROFILE_SIGNAL,
  FIXTURE_MONTHLY_REVIEW,
} from "@/lib/dev/fixtures";

// Dev-only visual harness (AGENTS.md Phase 72 "Development Mode"). This sandbox has no
// Supabase/Docker, so authenticated pages render blind without something like this — it
// mounts real presentational components with fixture data instead of a second, drifting
// copy of the markup. Hard 404s outside development regardless of env vars, so it can
// never ship. See /docs/design-system.md.
const FIXTURE_COUNTRY_COUNTS = SUPPORTED_COUNTRIES.map((c, i) => ({ country: c.name, count: [12, 8, 5, 4, 3][i % 5] ?? 1 }));

export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL}>
      <div className="mb-16 space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">University exploration</p>
        <UniversityExplorerHero countryCounts={FIXTURE_COUNTRY_COUNTS} selected={null} selectedRegion={null} />
      </div>

      <div className="mb-16 max-w-2xl space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Acceptance moment</p>
        <AcceptanceMoment universityName="London School of Economics" />
      </div>

      <div className="mb-16 space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Progress (populated)</p>
        <ProgressView review={FIXTURE_MONTHLY_REVIEW} />
      </div>
      <DashboardView
        displayName={FIXTURE_STUDENT.displayName}
        greeting="Good evening"
        biggestGap={FIXTURE_BIGGEST_GAP}
        profileChange={FIXTURE_PROFILE_CHANGE}
        profileSignal={FIXTURE_PROFILE_SIGNAL}
        weeklyPlan={FIXTURE_WEEKLY_PLAN}
        planError={null}
        counselorThisWeek={[]}
        avoidRecommendation={FIXTURE_AVOID_RECOMMENDATION}
        upcomingDeadlines={FIXTURE_DEADLINES}
        targetUniversities={FIXTURE_TARGET_UNIVERSITIES}
        opportunityPreview={FIXTURE_OPPORTUNITIES.map((o) => ({
          title: o.opportunity.title,
          matchScore: o.matchScore,
          deadline: o.opportunity.deadline ?? null,
        }))}
        opportunityMatchesRefreshed={true}
      />
    </PreviewShell>
  );
}
