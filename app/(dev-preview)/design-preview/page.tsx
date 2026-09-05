import { notFound } from "next/navigation";
import Link from "next/link";
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
import { OTHER_PREVIEW_ROUTES, buildPreviewHref } from "./preview-routes";
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
  buildFixtureHomeStrip,
} from "@/lib/dev/fixtures";

// Dev-only visual harness (AGENTS.md Phase 72 "Development Mode"). This sandbox has no
// Supabase/Docker, so authenticated pages render blind without something like this — it
// mounts real presentational components with fixture data instead of a second, drifting
// copy of the markup. Hard 404s outside development regardless of env vars, so it can
// never ship. See /docs/design-system.md.
const FIXTURE_COUNTRY_COUNTS = SUPPORTED_COUNTRIES.map((c, i) => ({ country: c.name, count: [12, 8, 5, 4, 3][i % 5] ?? 1 }));

export default async function DesignPreviewPage({ searchParams }: { searchParams: Promise<{ tier?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { tier: tierParam } = await searchParams;
  const tier = tierParam === "ultra" ? "ultra" : "standard";

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL} tier={tier}>
      <div className="mb-16 space-y-4 rounded-2xl border bg-card p-6">
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">Preview every surface</h1>
          <p className="text-sm text-muted-foreground">
            This is a preview, not a real account — nobody has an Ultra plan yet (<code>plan_tier</code> isn&apos;t even
            in the database). The toggle at the bottom of the screen switches Standard/Ultra and follows you between
            pages, so you can walk through the same screen both ways.
          </p>
          {/* 2026-09-02: the three big hardcoded surfaces docs/hardcoded-color-sweep-2026-09-02.md
              found (page ground, sidebar, hero gradients) are all converted now (sidebar/ground:
              oryn/ultra-tier-foundation-2026-09-02; hero gradients:
              oryn/hero-gradient-tier-2026-09-02 + oryn/hero-gradient-tier-prop-fix-2026-09-02 —
              the initial hero-gradient landing left every DashboardView/ApplicationsView call
              on this page itself still not passing `tier` through, a separate bug from the
              conversion itself, fixed in the prop-fix follow-up). The Ultra visual work is
              still mid-flight elsewhere in the app, so don't take this list as exhaustive. */}
          <p className="text-sm text-muted-foreground">
            The university map, the opportunity card&apos;s Ultra halo, the notification bell dot, the sidebar, the
            page background, and the hero cards below all now show a real difference. Ultra visual work is still in
            progress elsewhere in the app — this list will keep growing, not shrinking.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {OTHER_PREVIEW_ROUTES.map((route) => (
            <li key={route.href}>
              <Link href={buildPreviewHref(route, tier)} className="text-sm text-brand-primary underline-offset-2 hover:underline">
                {route.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

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
        tier={tier}
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
          id: o.opportunity.id,
          title: o.opportunity.title,
          matchScore: o.matchScore,
          deadline: o.opportunity.deadline ?? null,
          cycleStatus: o.opportunity.cycle_status ?? null,
        }))}
        opportunityStrip={buildFixtureHomeStrip()}
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
          tier={tier}
          availableTargets={[{ id: "t1", name: "Bocconi University", universityId: "u1", outlook: "competitive" }]}
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
        <ApplicationsView hasTargets={false} availableTargets={[]} applications={[]} tier={tier} />
      </div>
    </PreviewShell>
  );
}
