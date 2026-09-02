import { notFound } from "next/navigation";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { UniversityExplorerHero } from "@/features/universities/university-explorer-hero";
import { AcceptanceMoment } from "@/features/applications/status-control";
import { SUPPORTED_COUNTRIES } from "@/lib/data/country-geo";
import { ProgressView } from "@/features/profile/progress-view";
import { SettingsView } from "@/features/settings/settings-view";
import { EvidenceRow } from "@/features/documents/evidence-row";
import { SearchView } from "@/features/search/search-view";
import { ApplicationsView } from "@/features/applications/applications-view";
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
          cycleStatus: o.opportunity.cycle_status ?? null,
        }))}
        opportunityMatchesRefreshed={true}
      />

      <div className="mt-16 space-y-3 border-t pt-16">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Settings</p>
        <SettingsView email="ada@example.com" userId="fixture-user" profile={null} unreadNotificationCount={0} />
      </div>

      <div className="mt-16 max-w-2xl space-y-3 border-t pt-16">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Documents (evidence row)</p>
        <ul className="space-y-2">
          <EvidenceRow id="1" fileName="Economics_Olympiad_Certificate.pdf" linkedLabel="National Economics Olympiad — 2nd Place" signedUrl="#" />
          <EvidenceRow id="2" fileName="STEM_Director_Letter.pdf" linkedLabel="Regional Director — STEM Organization" signedUrl={null} />
        </ul>
      </div>

      <div className="mt-16 space-y-3 border-t pt-16">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Search</p>
        <SearchView
          query="econ"
          results={[
            { type: "university", id: "1", title: "London School of Economics", subtitle: "London, UK · QS #45", href: "/universities/1" },
            { type: "opportunity", id: "2", title: "Research Science Institute", subtitle: "Research · Oct 15", href: "/opportunities/2" },
            { type: "award", id: "3", title: "National Economics Olympiad", subtitle: "Award · 2025", href: "/profile" },
          ]}
        />
      </div>

      <div className="mt-16 space-y-3 border-t pt-16">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Applications</p>
        <ApplicationsView
          hasTargets
          availableTargets={[{ id: "t1", name: "Bocconi University" }]}
          applications={[
            {
              id: "a1", universityName: "University of Pennsylvania", applicationType: "early_decision", deadline: "2026-11-01", status: "in_progress", readiness: { kind: "measured", percent: 33 },
              requirements: [
                { id: "r1", requirement_type: "application", status: "completed" },
                { id: "r2", requirement_type: "transcript", status: "completed" },
                { id: "r3", requirement_type: "test_score", status: "not_started" },
                { id: "r4", requirement_type: "essay", status: "not_started" },
                { id: "r5", requirement_type: "recommendation", status: "not_started" },
                { id: "r6", requirement_type: "financial_aid", status: "not_started" },
              ],
            },
            {
              id: "a2", universityName: "University of Cambridge", applicationType: "regular_decision", deadline: "2026-10-15", status: "not_started", readiness: { kind: "measured", percent: 0 },
              requirements: [
                { id: "r7", requirement_type: "application", status: "not_started" },
                { id: "r8", requirement_type: "transcript", status: "not_started" },
                { id: "r9", requirement_type: "essay", status: "not_started" },
                { id: "r10", requirement_type: "recommendation", status: "not_started" },
              ],
            },
            {
              id: "a3", universityName: "Yale University", applicationType: "regular_decision", deadline: "2026-01-02", status: "submitted", readiness: { kind: "not_tracked", applicationStatus: "submitted" },
              requirements: [
                { id: "r11", requirement_type: "application", status: "completed" },
                { id: "r12", requirement_type: "transcript", status: "not_started" },
                { id: "r13", requirement_type: "essay", status: "not_started" },
                { id: "r14", requirement_type: "recommendation", status: "not_started" },
              ],
            },
          ]}
        />
      </div>

      <div className="mt-16 space-y-3 border-t pt-16">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Applications — empty, no targets saved yet</p>
        <ApplicationsView hasTargets={false} availableTargets={[]} applications={[]} />
      </div>
    </PreviewShell>
  );
}
