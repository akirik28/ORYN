import { notFound } from "next/navigation";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { UniversityExplorerHero } from "@/features/universities/university-explorer-hero";
import { AcceptanceMoment } from "@/features/applications/status-control";
import { SUPPORTED_COUNTRIES } from "@/lib/data/country-geo";
import { buildProfileSignal } from "@/lib/scoring/signal";
import { PreviewShell } from "./preview-shell";
import {
  FIXTURE_STUDENT,
  FIXTURE_BIGGEST_GAP,
  FIXTURE_BIGGEST_IMPROVEMENT,
  FIXTURE_WEEKLY_PLAN,
  FIXTURE_AVOID_RECOMMENDATION,
  FIXTURE_DEADLINES,
  FIXTURE_TARGET_UNIVERSITIES,
  FIXTURE_OPPORTUNITIES,
} from "@/lib/dev/fixtures";

// Dev-only visual harness (AGENTS.md Phase 72 "Development Mode"). This sandbox has no
// Supabase/Docker, so authenticated pages render blind without something like this — it
// mounts real presentational components with fixture data instead of a second, drifting
// copy of the markup. Hard 404s outside development regardless of env vars, so it can
// never ship. See /docs/design-system.md.
// Mirrors the spec's own worked example (research weakest, leadership strongest) so the
// harness doubles as a check that the Profile Signal renders the shape the brief describes.
const FIXTURE_PROFILE_SIGNAL = buildProfileSignal([
  { dimension: "academics", score: 82, confidence: "high" },
  { dimension: "leadership", score: 91, confidence: "high" },
  { dimension: "intellectual_curiosity", score: 58, confidence: "medium" },
  { dimension: "research", score: 42, confidence: "high" },
  { dimension: "community_impact", score: 54, confidence: "medium" },
  { dimension: "career_exploration", score: 55, confidence: "low" },
]);

const FIXTURE_COUNTRY_COUNTS = SUPPORTED_COUNTRIES.map((c, i) => ({ country: c.name, count: [12, 8, 5, 4, 3][i % 5] ?? 1 }));

export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PreviewShell score={FIXTURE_STUDENT.profileStrengthScore}>
      <div className="mb-16 space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">University exploration</p>
        <UniversityExplorerHero countryCounts={FIXTURE_COUNTRY_COUNTS} selected={null} selectedRegion={null} />
      </div>

      <div className="mb-16 max-w-2xl space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Acceptance moment</p>
        <AcceptanceMoment universityName="London School of Economics" />
      </div>
      <DashboardView
        displayName={FIXTURE_STUDENT.displayName}
        greeting="Good evening"
        score={FIXTURE_STUDENT.profileStrengthScore}
        trend={FIXTURE_STUDENT.trend}
        biggestGap={FIXTURE_BIGGEST_GAP}
        biggestImprovement={FIXTURE_BIGGEST_IMPROVEMENT}
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
