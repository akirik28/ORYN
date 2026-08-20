import { notFound } from "next/navigation";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { UniversityExplorerHero } from "@/features/universities/university-explorer-hero";
import { AcceptanceMoment } from "@/features/applications/status-control";
import { OpportunityDetailView } from "@/features/opportunities/opportunity-detail-view";
import { DetailHeroImage as UniversityDetailHeroImage } from "@/features/universities/detail-hero-image";
import { SUPPORTED_COUNTRIES } from "@/lib/data/country-geo";
import { PreviewShell } from "./preview-shell";
import {
  FIXTURE_STUDENT,
  FIXTURE_BIGGEST_GAP,
  FIXTURE_TOP_STRENGTH,
  FIXTURE_BIGGEST_IMPROVEMENT,
  FIXTURE_WEEKLY_PLAN,
  FIXTURE_AVOID_RECOMMENDATION,
  FIXTURE_DEADLINES,
  FIXTURE_TARGET_UNIVERSITIES,
  FIXTURE_OPPORTUNITIES,
  FIXTURE_OPPORTUNITY_DETAIL_RICH,
  FIXTURE_OPPORTUNITY_DETAIL_SPARSE,
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
    <PreviewShell score={FIXTURE_STUDENT.profileStrengthScore}>
      <div className="mb-16 space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Opportunity detail — richly populated record</p>
        <OpportunityDetailView {...FIXTURE_OPPORTUNITY_DETAIL_RICH} />
      </div>

      <div className="mb-16 space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Opportunity detail — sparse record</p>
        <OpportunityDetailView {...FIXTURE_OPPORTUNITY_DETAIL_SPARSE} />
      </div>

      <div className="mb-16 max-w-3xl space-y-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          University detail hero — 3-tier fallback (photo / logo / icon, same-origin test assets to avoid a network dependency)
        </p>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Tier 1 — verified photo</p>
          <UniversityDetailHeroImage photoUrl="/icon.png" logoUrl={null} name="Test University" />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Tier 2 — no photo, has a logo</p>
          <UniversityDetailHeroImage photoUrl={null} logoUrl="/apple-icon.png" name="Test University" />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Tier 3 — no photo, no logo</p>
          <UniversityDetailHeroImage photoUrl={null} logoUrl={null} name="Test University" />
        </div>
      </div>

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
        topStrength={FIXTURE_TOP_STRENGTH}
        biggestImprovement={FIXTURE_BIGGEST_IMPROVEMENT}
        weeklyPlan={FIXTURE_WEEKLY_PLAN}
        planError={null}
        counselorThisWeek={[]}
        avoidRecommendation={FIXTURE_AVOID_RECOMMENDATION}
        upcomingDeadlines={FIXTURE_DEADLINES}
        targetUniversities={FIXTURE_TARGET_UNIVERSITIES}
        opportunityPreview={FIXTURE_OPPORTUNITIES.map((o) => ({ id: o.opportunity.id, title: o.opportunity.title, matchScore: o.matchScore }))}
      />
    </PreviewShell>
  );
}
