import { notFound } from "next/navigation";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreRadar } from "@/features/profile/score-radar";
import { ProfileSignal } from "@/features/dashboard/profile-signal";
import { JourneyTimeline } from "@/features/profile/journey-timeline";
import { PeerBenchmark } from "@/features/profile/peer-benchmark";
import { AchievementSection } from "@/features/profile/achievement-section";
import { FIXTURE_PROFILE_SIGNAL } from "@/lib/dev/fixtures";
import { PreviewShell } from "../preview-shell";
import {
  ACTIVITY_FIELDS,
  PROJECT_FIELDS,
  EDUCATION_FIELDS,
  COURSE_FIELDS,
  TEST_SCORE_FIELDS,
  AWARD_FIELDS,
  CERTIFICATION_FIELDS,
  GOAL_FIELDS,
  SKILL_FIELDS,
} from "@/features/profile/field-config";
import type { FormValues } from "@/features/profile/dynamic-form-fields";

// Dedicated Journey (Profile) preview — checks the 2026-08-30 tab restructure (Overview /
// Academics / Experience / Recognition / Skills & goals, replacing 14 stacked
// AchievementSection blocks) without needing all 14 tables' worth of fixture rows: one or
// two representative sections per tab, empty (EmptyState still exercises the real render
// path), is enough to prove the Tabs mechanism, spacing, and mobile TabsList overflow —
// the sections themselves are unchanged, already-shipped code.
// Inline Server Actions ("use server" in the function body), not plain async functions —
// AchievementSection is a Client Component, and a plain closure can't cross that boundary
// (only a real Action survives it; see achievement-section.tsx's own comment on this exact
// class of error, and quick-add-entry.tsx's). Caught live via this same preview route
// throwing "Event handlers cannot be passed to Client Component props" at request time —
// neither typecheck nor lint catches it, matching the precedent those other comments
// describe.
async function noop() {
  "use server";
  return {};
}
async function noopDelete() {
  "use server";
  return {};
}

export default function JourneyPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL}>
      <div className="space-y-10">
        <PageHeader
          eyebrow="Journey"
          title="Everything you've built so far."
          description="Your record of academics, leadership, research and execution."
        />

        <Tabs defaultValue="overview" className="gap-6">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="academics">Academics</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="recognition">Recognition</TabsTrigger>
            <TabsTrigger value="skills">Skills & goals</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-10 pt-2">
            <section className="grid gap-8 rounded-3xl border border-brand-primary-border bg-brand-primary-subtle p-6 md:grid-cols-2 md:p-8">
              <ScoreRadar scores={{ research: 42, leadership: 88 }} />
              <div className="flex flex-col justify-center">
                <ProfileSignal signal={FIXTURE_PROFILE_SIGNAL} showScores heading="Where you stand" />
              </div>
            </section>
            <section className="space-y-6">
              <SectionHeader title="Your journey" description="Everything on one timeline, newest first." />
              <JourneyTimeline entries={[]} />
            </section>
            <section className="space-y-3">
              <SectionHeader title="Peer comparison" />
              <PeerBenchmark summary={{ cohortDescription: "Students in your graduation year and target field", results: [] }} />
            </section>
          </TabsContent>

          <TabsContent value="academics" className="space-y-8 pt-2">
            <AchievementSection
              title="Education"
              items={[]}
              summaries={{}}
              fields={EDUCATION_FIELDS}
              defaultValues={{ school_name: "", school_entity_id: null, country: null, stage: "high_school", curriculum: null, start_date: null, end_date: null, is_current: true, overall_gpa: null, gpa_scale: null, notes: null }}
              onCreate={noop as (v: FormValues) => Promise<{ error?: string }>}
              onUpdate={noop as (id: string, v: FormValues) => Promise<{ error?: string }>}
              onDelete={noopDelete}
              emptyStateText="No education records yet."
            />
            <AchievementSection
              title="Coursework"
              items={[]}
              summaries={{}}
              fields={COURSE_FIELDS}
              defaultValues={{ course_name: "", level: "regular", subject: null, academic_year: null, grade_value: null, grade_scale: null, credit_hours: null }}
              onCreate={noop as (v: FormValues) => Promise<{ error?: string }>}
              onUpdate={noop as (id: string, v: FormValues) => Promise<{ error?: string }>}
              onDelete={noopDelete}
              emptyStateText="No coursework yet."
            />
            <AchievementSection
              title="Test scores"
              items={[]}
              summaries={{}}
              fields={TEST_SCORE_FIELDS}
              defaultValues={{ test_name: "", score: "", max_score: null, test_date: null }}
              onCreate={noop as (v: FormValues) => Promise<{ error?: string }>}
              onUpdate={noop as (id: string, v: FormValues) => Promise<{ error?: string }>}
              onDelete={noopDelete}
              emptyStateText="No test scores yet."
            />
          </TabsContent>

          <TabsContent value="experience" className="space-y-8 pt-2">
            <AchievementSection
              title="Activities"
              items={[]}
              summaries={{}}
              fields={ACTIVITY_FIELDS}
              defaultValues={{ title: "", organization: null, organization_entity_id: null, category: "other", description: null, is_leadership_role: false, people_led: null, organization_scope: null, opportunity_title: null, opportunity_id: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, weeks_per_year: null, location: null, story_notes: null }}
              onCreate={noop as (v: FormValues) => Promise<{ error?: string }>}
              onUpdate={noop as (id: string, v: FormValues) => Promise<{ error?: string }>}
              onDelete={noopDelete}
              emptyStateText="No activities yet."
            />
            <AchievementSection
              title="Projects"
              items={[]}
              summaries={{}}
              fields={PROJECT_FIELDS}
              defaultValues={{ title: "", organization: null, organization_entity_id: null, description: null, role: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, outcome_summary: null, users_reached: null, revenue_amount: null, repo_url: null, live_url: null, location: null, story_notes: null }}
              onCreate={noop as (v: FormValues) => Promise<{ error?: string }>}
              onUpdate={noop as (id: string, v: FormValues) => Promise<{ error?: string }>}
              onDelete={noopDelete}
              emptyStateText="No projects yet."
            />
          </TabsContent>

          <TabsContent value="recognition" className="space-y-8 pt-2">
            <AchievementSection
              title="Awards"
              items={[]}
              summaries={{}}
              fields={AWARD_FIELDS}
              defaultValues={{ title: "", organization: null, organization_entity_id: null, level: null, description: null, award_date: null, location: null, story_notes: null }}
              onCreate={noop as (v: FormValues) => Promise<{ error?: string }>}
              onUpdate={noop as (id: string, v: FormValues) => Promise<{ error?: string }>}
              onDelete={noopDelete}
              emptyStateText="No awards yet."
            />
            <AchievementSection
              title="Certifications"
              items={[]}
              summaries={{}}
              fields={CERTIFICATION_FIELDS}
              defaultValues={{ title: "", organization: null, organization_entity_id: null, description: null, issue_date: null, expiry_date: null, credential_url: null }}
              onCreate={noop as (v: FormValues) => Promise<{ error?: string }>}
              onUpdate={noop as (id: string, v: FormValues) => Promise<{ error?: string }>}
              onDelete={noopDelete}
              emptyStateText="No certifications yet."
            />
          </TabsContent>

          <TabsContent value="skills" className="space-y-8 pt-2">
            <AchievementSection
              title="Goals"
              items={[]}
              summaries={{}}
              fields={GOAL_FIELDS}
              defaultValues={{ title: "", category: null, target_date: null, status: "active" }}
              onCreate={noop as (v: FormValues) => Promise<{ error?: string }>}
              onUpdate={noop as (id: string, v: FormValues) => Promise<{ error?: string }>}
              onDelete={noopDelete}
              emptyStateText="No goals yet."
            />
            <AchievementSection
              title="Skills"
              items={[]}
              summaries={{}}
              fields={SKILL_FIELDS}
              defaultValues={{ name: "", category: "other", proficiency: null }}
              onCreate={noop as (v: FormValues) => Promise<{ error?: string }>}
              onUpdate={noop as (id: string, v: FormValues) => Promise<{ error?: string }>}
              onDelete={noopDelete}
              emptyStateText="No skills yet."
            />
          </TabsContent>
        </Tabs>
      </div>
    </PreviewShell>
  );
}
