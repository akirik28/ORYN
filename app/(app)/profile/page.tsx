import Link from "next/link";
import { getCurrentProfile, requireUser } from "@/lib/security/dal";
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

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Your Career Profile</h1>
          <p className="mt-1 text-muted-foreground">
            A living picture of your academics, leadership, research, and execution — this is Oryn&apos;s
            development assessment, not an admissions score.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <Link href="/profile/portfolio" className="text-primary hover:underline">
            View portfolio →
          </Link>
          <Link href="/profile/history" className="text-primary hover:underline">
            View progress →
          </Link>
        </div>
      </div>

      <section className="grid gap-8 rounded-2xl border bg-card p-6 md:grid-cols-2 md:p-8">
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
        <h2 className="text-lg font-semibold">Peer comparison</h2>
        <PeerBenchmark summary={benchmarkSummary} />
      </section>

      <AchievementSection
        title="Goals"
        description="What you're working toward — recommendations trace back to these."
        items={goalsRes.data ?? []}
        fields={GOAL_FIELDS}
        defaultValues={{ title: "", category: null, target_date: null, status: "active" }}
        toFormValues={(item) => item as unknown as FormValues}
        renderSummary={(item) => ({ title: item.title, subtitle: [item.category, item.status !== "active" ? item.status : null].filter(Boolean).join(" · ") || undefined })}
        onCreate={createGoal as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateGoal as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteGoal}
        emptyStateText="No goals yet. What are you working toward?"
      />

      <AchievementSection
        title="Activities"
        description="Clubs, leadership roles, sports, summer programs."
        items={activitiesRes.data ?? []}
        fields={ACTIVITY_FIELDS}
        defaultValues={{ title: "", organization: null, category: "club", description: null, is_leadership_role: false, people_led: null, organization_scope: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, weeks_per_year: null, location: null }}
        toFormValues={(item) => item as unknown as FormValues}
        renderSummary={(item) => ({ title: item.title, subtitle: item.organization ?? undefined })}
        onCreate={createActivity as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateActivity as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteActivity}
        emptyStateText="No activities yet. Add clubs, leadership, or other experiences."
      />

      <AchievementSection
        title="Projects"
        description="Things you've built or shipped, on your own or with a team."
        items={projectsRes.data ?? []}
        fields={PROJECT_FIELDS}
        defaultValues={{ title: "", organization: null, description: null, role: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, outcome_summary: null, users_reached: null, revenue_amount: null, repo_url: null, live_url: null, location: null }}
        toFormValues={(item) => item as unknown as FormValues}
        renderSummary={(item) => ({ title: item.title, subtitle: item.outcome_summary ?? item.organization ?? undefined })}
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
        fields={RESEARCH_FIELDS}
        defaultValues={{ title: "", organization: null, mentor_name: null, field: null, description: null, methodology: null, independence_level: null, output_type: "none", output_url: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, location: null }}
        toFormValues={(item) => item as unknown as FormValues}
        renderSummary={(item) => ({ title: item.title, subtitle: item.field ?? undefined })}
        onCreate={createResearchExperience as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateResearchExperience as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteResearchExperience}
        emptyStateText="No research experience yet — publication isn't required for a strong score."
      />

      <AchievementSection
        title="Awards"
        description="Competitions, honors, and distinctions."
        items={awardsRes.data ?? []}
        fields={AWARD_FIELDS}
        defaultValues={{ title: "", organization: null, level: null, description: null, award_date: null, location: null }}
        toFormValues={(item) => item as unknown as FormValues}
        renderSummary={(item) => ({ title: item.title, subtitle: item.level ?? undefined })}
        onCreate={createAward as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateAward as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteAward}
        emptyStateText="No awards yet."
      />

      <AchievementSection
        title="Work experience"
        description="Internships, jobs, and apprenticeships."
        items={workRes.data ?? []}
        fields={WORK_EXPERIENCE_FIELDS}
        defaultValues={{ title: "", organization: "", employment_type: "internship", description: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, paid: null, location: null }}
        toFormValues={(item) => item as unknown as FormValues}
        renderSummary={(item) => ({ title: item.title, subtitle: item.organization })}
        onCreate={createWorkExperience as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateWorkExperience as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteWorkExperience}
        emptyStateText="No work experience yet."
      />

      <AchievementSection
        title="Volunteering"
        description="Community service and volunteering."
        items={volunteeringRes.data ?? []}
        fields={VOLUNTEERING_FIELDS}
        defaultValues={{ title: "", organization: null, description: null, cause_area: null, start_date: null, end_date: null, ongoing: false, hours_per_week: null, weeks_per_year: null, location: null }}
        toFormValues={(item) => item as unknown as FormValues}
        renderSummary={(item) => ({ title: item.title, subtitle: item.cause_area ?? undefined })}
        onCreate={createVolunteering as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateVolunteering as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteVolunteering}
        emptyStateText="No volunteering yet."
      />

      <AchievementSection
        title="Education"
        description="Schools and academic stages."
        items={educationRes.data ?? []}
        fields={EDUCATION_FIELDS}
        defaultValues={{ school_name: "", country: null, stage: "high_school", curriculum: null, start_date: null, end_date: null, is_current: true, overall_gpa: null, gpa_scale: null, notes: null }}
        toFormValues={(item) => item as unknown as FormValues}
        renderSummary={(item) => ({ title: item.school_name, subtitle: item.country ?? undefined })}
        onCreate={createEducationRecord as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateEducationRecord as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteEducationRecord}
        emptyStateText="No education records yet."
      />

      <AchievementSection
        title="Test scores"
        description="SAT, ACT, AP, IB, language proficiency, and more."
        items={testScoresRes.data ?? []}
        fields={TEST_SCORE_FIELDS}
        defaultValues={{ test_name: "", score: "", max_score: null, test_date: null }}
        toFormValues={(item) => item as unknown as FormValues}
        renderSummary={(item) => ({ title: item.test_name, subtitle: item.score })}
        onCreate={createTestScore as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateTestScore as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteTestScore}
        emptyStateText="No test scores yet."
      />

      <AchievementSection
        title="Certifications"
        description="Certificates from courses or programs."
        items={certificationsRes.data ?? []}
        fields={CERTIFICATION_FIELDS}
        defaultValues={{ title: "", organization: null, description: null, issue_date: null, expiry_date: null, credential_url: null }}
        toFormValues={(item) => item as unknown as FormValues}
        renderSummary={(item) => ({ title: item.title, subtitle: item.organization ?? undefined })}
        onCreate={createCertification as (v: FormValues) => Promise<{ error?: string }>}
        onUpdate={updateCertification as (id: string, v: FormValues) => Promise<{ error?: string }>}
        onDelete={deleteCertification}
        emptyStateText="No certifications yet."
      />
    </div>
  );
}
