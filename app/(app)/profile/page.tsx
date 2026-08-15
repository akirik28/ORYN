import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCurrentProfile, requireUser } from "@/lib/security/dal";
import { PageHeader } from "@/components/oryn/page-header";
import { SectionHeader } from "@/components/oryn/section-header";
import { createClient } from "@/lib/supabase/server";
import { ScoreRadar } from "@/features/profile/score-radar";
import { DimensionBars } from "@/features/profile/dimension-bars";
import { PeerBenchmark } from "@/features/profile/peer-benchmark";
import { getPeerBenchmarks } from "@/lib/benchmarking";
import { AchievementSection } from "@/features/profile/achievement-section";
import { ResearchIdeaGenerator } from "@/features/profile/research-idea-generator";
import {
  ACTIVITY_FIELDS,
  PROJECT_FIELDS,
  AWARD_FIELDS,
  RESEARCH_FIELDS,
  VOLUNTEERING_FIELDS,
  WORK_EXPERIENCE_FIELDS,
  EDUCATION_FIELDS,
  TEST_SCORE_FIELDS,
  CERTIFICATION_FIELDS,
  GOAL_FIELDS,
  SPORTS_FIELDS,
} from "@/features/profile/field-config";
import {
  createActivity,
  updateActivity,
  deleteActivity,
  createProject,
  updateProject,
  deleteProject,
  createAward,
  updateAward,
  deleteAward,
  createResearchExperience,
  updateResearchExperience,
  deleteResearchExperience,
  createVolunteering,
  updateVolunteering,
  deleteVolunteering,
  createWorkExperience,
  updateWorkExperience,
  deleteWorkExperience,
  createEducationRecord,
  updateEducationRecord,
  deleteEducationRecord,
  createTestScore,
  updateTestScore,
  deleteTestScore,
  createCertification,
  updateCertification,
  deleteCertification,
  createGoal,
  updateGoal,
  deleteGoal,
  createSportsExperience,
  updateSportsExperience,
  deleteSportsExperience,
} from "./actions";
import type { FormValues } from "@/features/profile/dynamic-form-fields";
import type { ProfileDimension } from "@/types/database";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await requireUser();
  const userId = session.userId!;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [
    scoresRes,
    activitiesRes,
    sportsRes,
    projectsRes,
    awardsRes,
    researchRes,
    volunteeringRes,
    workRes,
    educationRes,
    testScoresRes,
    certificationsRes,
    goalsRes,
    benchmarkSummary,
  ] = await Promise.all([
    supabase.from("profile_scores").select("*").eq("user_id", userId),
    supabase.from("activities").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("sports_experiences").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("projects").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("awards").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("research_experiences").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("volunteering_experiences").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("work_experiences").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("education_records").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("test_scores").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("certifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("career_goals").select("*").eq("user_id", userId).order("status", { ascending: true }).order("target_date", { ascending: true, nullsFirst: false }),
    getPeerBenchmarks(userId),
  ]);

  const scoreMap = Object.fromEntries(
    (scoresRes.data ?? []).map((s) => [s.dimension, { score: s.score, confidence: s.confidence }])
  ) as Partial<Record<ProfileDimension, { score: number; confidence: "high" | "medium" | "low" }>>;
  const radarScores = Object.fromEntries(Object.entries(scoreMap).map(([k, v]) => [k, v!.score]));

  // AchievementSection is a Client Component; a plain function prop like the old
  // `renderSummary={(item) => ({...})}` can't cross the Server->Client boundary (only a
  // "use server" Action can) — computed here instead, server-side, into a plain
  // id-keyed data map. See achievement-section.tsx's own comment for the full story.
  const summaryMap = <T extends { id: string }>(items: T[], summarize: (item: T) => { title: string; subtitle?: string }) =>
    Object.fromEntries(items.map((item) => [item.id, summarize(item)]));

  return (
    <div className="space-y-10">
      <PageHeader
        title="Your Career Profile"
        description="A living picture of your academics, leadership, research, and execution — this is Oryn's development assessment, not an admissions score."
        action={
          <div className="flex flex-col items-end gap-1 text-sm">
            <Link href="/profile/portfolio" className="inline-flex items-center gap-1 text-brand-primary hover:underline">
              View portfolio <ArrowRight className="size-3.5" />
            </Link>
            <Link href="/profile/history" className="inline-flex items-center gap-1 text-brand-primary hover:underline">
              View progress <ArrowRight className="size-3.5" />
            </Link>
          </div>
        }
      />

      <section className="grid gap-8 rounded-3xl border border-brand-primary-border bg-gradient-to-br from-brand-primary-subtle via-card to-card p-6 md:grid-cols-2 md:p-8">
        <ScoreRadar scores={radarScores} />
        <div className="flex flex-col justify-center">
          <DimensionBars scores={scoreMap} />
          <p className="mt-4 text-xs text-muted-foreground">
            Profile completeness: {profile?.completeness_percent ?? 0}%. Completeness measures how much Oryn
            knows about you — it&apos;s separate from how strong your profile is.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Peer comparison" />
        <PeerBenchmark summary={benchmarkSummary} />
      </section>

      <AchievementSection
        title="Goals"
        description="What you're working toward — recommendations trace back to these."
        items={goalsRes.data ?? []}
        summaries={summaryMap(goalsRes.data ?? [], (item) => ({ title: item.title, subtitle: [item.category, item.status !== "active" ? item.status : null].filter(Boolean).join(" · ") || undefined }))}
        fields={GOAL_FIELDS}
        defaultValues={{ title: "", category: null, target_date: null, status: "active" }}
        onCreate={createGoal as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateGoal as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteGoal}
        emptyStateText="No goals yet. What are you working toward?"
      />

      <AchievementSection
        title="Activities"
        description="Clubs, leadership roles, sports, summer programs."
        items={activitiesRes.data ?? []}
        summaries={summaryMap(activitiesRes.data ?? [], (item) => ({ title: item.title, subtitle: item.organization ?? undefined }))}
        fields={ACTIVITY_FIELDS}
        defaultValues={{ title: "", organization: null, category: "club", description: null, is_leadership_role: false, people_led: null, organization_scope: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, weeks_per_year: null, location: null }}
        onCreate={createActivity as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateActivity as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteActivity}
        emptyStateText="No activities yet. Add clubs, leadership, or other experiences."
      />

      <AchievementSection
        title="Sports"
        description="Athletic history — a first-class part of your profile, not folded into Activities."
        items={sportsRes.data ?? []}
        summaries={summaryMap(sportsRes.data ?? [], (item) => ({
          title: item.sport,
          subtitle: [item.team_name, item.is_captain ? "Captain" : null].filter(Boolean).join(" · ") || undefined,
        }))}
        fields={SPORTS_FIELDS}
        defaultValues={{
          sport: "",
          discipline: null,
          team_name: null,
          position: null,
          level: null,
          us_specific_label: null,
          is_captain: false,
          achievements: null,
          start_date: null,
          end_date: null,
          ongoing: false,
          hours_per_week: null,
          weeks_per_year: null,
          location: null,
          description: null,
        }}
        onCreate={createSportsExperience as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateSportsExperience as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteSportsExperience}
        emptyStateText="No sports yet. Add a team, club, or individual sport you take seriously."
      />

      <AchievementSection
        title="Projects"
        description="Things you've built or shipped, on your own or with a team."
        items={projectsRes.data ?? []}
        summaries={summaryMap(projectsRes.data ?? [], (item) => ({ title: item.title, subtitle: item.outcome_summary ?? item.organization ?? undefined }))}
        fields={PROJECT_FIELDS}
        defaultValues={{ title: "", organization: null, description: null, role: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, outcome_summary: null, users_reached: null, revenue_amount: null, repo_url: null, live_url: null, location: null }}
        onCreate={createProject as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateProject as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteProject}
        emptyStateText="No projects yet."
      />

      <div className="flex justify-end">
        <ResearchIdeaGenerator />
      </div>
      <AchievementSection
        title="Research"
        description="Independent or mentored research experience."
        items={researchRes.data ?? []}
        summaries={summaryMap(researchRes.data ?? [], (item) => ({ title: item.title, subtitle: item.field ?? undefined }))}
        fields={RESEARCH_FIELDS}
        defaultValues={{ title: "", organization: null, mentor_name: null, field: null, description: null, methodology: null, independence_level: null, output_type: "none", output_url: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, location: null }}
        onCreate={createResearchExperience as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateResearchExperience as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteResearchExperience}
        emptyStateText="No research experience yet — publication isn't required for a strong score."
      />

      <AchievementSection
        title="Awards"
        description="Competitions, honors, and distinctions."
        items={awardsRes.data ?? []}
        summaries={summaryMap(awardsRes.data ?? [], (item) => ({ title: item.title, subtitle: item.level ?? undefined }))}
        fields={AWARD_FIELDS}
        defaultValues={{ title: "", organization: null, level: null, description: null, award_date: null, location: null }}
        onCreate={createAward as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateAward as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteAward}
        emptyStateText="No awards yet."
      />

      <AchievementSection
        title="Work experience"
        description="Internships, jobs, and apprenticeships."
        items={workRes.data ?? []}
        summaries={summaryMap(workRes.data ?? [], (item) => ({ title: item.title, subtitle: item.organization }))}
        fields={WORK_EXPERIENCE_FIELDS}
        defaultValues={{ title: "", organization: "", employment_type: "internship", description: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, paid: null, location: null }}
        onCreate={createWorkExperience as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateWorkExperience as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteWorkExperience}
        emptyStateText="No work experience yet."
      />

      <AchievementSection
        title="Volunteering"
        description="Community service and volunteering."
        items={volunteeringRes.data ?? []}
        summaries={summaryMap(volunteeringRes.data ?? [], (item) => ({ title: item.title, subtitle: item.cause_area ?? undefined }))}
        fields={VOLUNTEERING_FIELDS}
        defaultValues={{ title: "", organization: null, description: null, cause_area: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, weeks_per_year: null, location: null }}
        onCreate={createVolunteering as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateVolunteering as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteVolunteering}
        emptyStateText="No volunteering yet."
      />

      <AchievementSection
        title="Education"
        description="Schools and academic stages."
        items={educationRes.data ?? []}
        summaries={summaryMap(educationRes.data ?? [], (item) => ({ title: item.school_name, subtitle: item.country ?? undefined }))}
        fields={EDUCATION_FIELDS}
        defaultValues={{ school_name: "", country: null, stage: "high_school", curriculum: null, start_date: null, end_date: null, is_current: true, overall_gpa: null, gpa_scale: null, notes: null }}
        onCreate={createEducationRecord as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateEducationRecord as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteEducationRecord}
        emptyStateText="No education records yet."
      />

      <AchievementSection
        title="Test scores"
        description="SAT, ACT, AP, IB, language proficiency, and more."
        items={testScoresRes.data ?? []}
        summaries={summaryMap(testScoresRes.data ?? [], (item) => ({ title: item.test_name, subtitle: item.score }))}
        fields={TEST_SCORE_FIELDS}
        defaultValues={{ test_name: "", score: "", max_score: null, test_date: null }}
        onCreate={createTestScore as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateTestScore as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteTestScore}
        emptyStateText="No test scores yet."
      />

      <AchievementSection
        title="Certifications"
        description="Certificates from courses or programs."
        items={certificationsRes.data ?? []}
        summaries={summaryMap(certificationsRes.data ?? [], (item) => ({ title: item.title, subtitle: item.organization ?? undefined }))}
        fields={CERTIFICATION_FIELDS}
        defaultValues={{ title: "", organization: null, description: null, issue_date: null, expiry_date: null, credential_url: null }}
        onCreate={createCertification as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateCertification as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteCertification}
        emptyStateText="No certifications yet."
      />
    </div>
  );
}
