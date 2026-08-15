"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { recomputeCareerProfile } from "@/lib/scoring/persist";
import { refineAchievementDescription, type AchievementRefinement } from "@/lib/ai/refine-achievement";
import { generateResearchProjects, type ResearchProject } from "@/lib/ai/research-generator";
import { assertWithinAIRateLimit, RateLimitExceededError } from "@/lib/ai/rate-limit";
import { AIProviderNotConfiguredError } from "@/lib/ai";
import { logEvent } from "@/lib/analytics/log";
import {
  ActivitySchema,
  ProjectSchema,
  AwardSchema,
  ResearchExperienceSchema,
  VolunteeringSchema,
  WorkExperienceSchema,
  EducationRecordSchema,
  TestScoreSchema,
  CertificationSchema,
  GoalSchema,
  type ActivityFormInput,
  type ProjectFormInput,
  type AwardFormInput,
  type ResearchExperienceFormInput,
  type VolunteeringFormInput,
  type WorkExperienceFormInput,
  type EducationRecordFormInput,
  type TestScoreFormInput,
  type CertificationFormInput,
  type GoalFormInput,
} from "@/lib/validation/achievements";

type ActionResult = { error?: string };
type ZodLike<T> = { safeParse: (input: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } };

async function afterWrite(userId: string) {
  try {
    await recomputeCareerProfile(userId);
  } catch (error) {
    console.error("[profile] failed to recompute career profile after edit", error);
  }
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

/**
 * Shared validate-insert/update/delete logic every achievement type below follows
 * identically. Not itself exported — Next.js Server Action files require each exported
 * member to be a standalone async function (see mutating-data.md / server-actions.md),
 * so each table gets three thin named wrapper exports around this instead of one
 * object-shaped export.
 */
async function crudCreate<T extends Record<string, unknown>>(table: string, schema: ZodLike<T>, input: T): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success || !parsed.data) return { error: parsed.error?.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table name varies per call site; the Zod schema above is the real type check.
  const { error } = await (supabase.from(table as any) as any).insert({ ...parsed.data, user_id: session.userId! });
  if (error) return { error: error.message };

  await logEvent(session.userId!, "profile_item_added", { table });
  await afterWrite(session.userId!);
  return {};
}

async function crudUpdate<T extends Record<string, unknown>>(table: string, schema: ZodLike<T>, id: string, input: T): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success || !parsed.data) return { error: parsed.error?.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table as any) as any).update(parsed.data).eq("id", id).eq("user_id", session.userId!);
  if (error) return { error: error.message };

  await afterWrite(session.userId!);
  return {};
}

async function crudRemove(table: string, id: string): Promise<ActionResult> {
  const session = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from(table as never).delete().eq("id", id).eq("user_id", session.userId!);
  if (error) return { error: error.message };

  await afterWrite(session.userId!);
  return {};
}

// ---------- Activities ----------
export async function createActivity(input: ActivityFormInput) {
  return crudCreate("activities", ActivitySchema, input);
}
export async function updateActivity(id: string, input: ActivityFormInput) {
  return crudUpdate("activities", ActivitySchema, id, input);
}
export async function deleteActivity(id: string) {
  return crudRemove("activities", id);
}

// ---------- Projects ----------
export async function createProject(input: ProjectFormInput) {
  return crudCreate("projects", ProjectSchema, input);
}
export async function updateProject(id: string, input: ProjectFormInput) {
  return crudUpdate("projects", ProjectSchema, id, input);
}
export async function deleteProject(id: string) {
  return crudRemove("projects", id);
}

// ---------- Awards ----------
export async function createAward(input: AwardFormInput) {
  return crudCreate("awards", AwardSchema, input);
}
export async function updateAward(id: string, input: AwardFormInput) {
  return crudUpdate("awards", AwardSchema, id, input);
}
export async function deleteAward(id: string) {
  return crudRemove("awards", id);
}

// ---------- Research experiences ----------
export async function createResearchExperience(input: ResearchExperienceFormInput) {
  return crudCreate("research_experiences", ResearchExperienceSchema, input);
}
export async function updateResearchExperience(id: string, input: ResearchExperienceFormInput) {
  return crudUpdate("research_experiences", ResearchExperienceSchema, id, input);
}
export async function deleteResearchExperience(id: string) {
  return crudRemove("research_experiences", id);
}

// ---------- Volunteering ----------
export async function createVolunteering(input: VolunteeringFormInput) {
  return crudCreate("volunteering_experiences", VolunteeringSchema, input);
}
export async function updateVolunteering(id: string, input: VolunteeringFormInput) {
  return crudUpdate("volunteering_experiences", VolunteeringSchema, id, input);
}
export async function deleteVolunteering(id: string) {
  return crudRemove("volunteering_experiences", id);
}

// ---------- Work experience ----------
export async function createWorkExperience(input: WorkExperienceFormInput) {
  return crudCreate("work_experiences", WorkExperienceSchema, input);
}
export async function updateWorkExperience(id: string, input: WorkExperienceFormInput) {
  return crudUpdate("work_experiences", WorkExperienceSchema, id, input);
}
export async function deleteWorkExperience(id: string) {
  return crudRemove("work_experiences", id);
}

// ---------- Education ----------
export async function createEducationRecord(input: EducationRecordFormInput) {
  return crudCreate("education_records", EducationRecordSchema, input);
}
export async function updateEducationRecord(id: string, input: EducationRecordFormInput) {
  return crudUpdate("education_records", EducationRecordSchema, id, input);
}
export async function deleteEducationRecord(id: string) {
  return crudRemove("education_records", id);
}

// ---------- Test scores ----------
export async function createTestScore(input: TestScoreFormInput) {
  return crudCreate("test_scores", TestScoreSchema, input);
}
export async function updateTestScore(id: string, input: TestScoreFormInput) {
  return crudUpdate("test_scores", TestScoreSchema, id, input);
}
export async function deleteTestScore(id: string) {
  return crudRemove("test_scores", id);
}

// ---------- Certifications ----------
export async function createCertification(input: CertificationFormInput) {
  return crudCreate("certifications", CertificationSchema, input);
}
export async function updateCertification(id: string, input: CertificationFormInput) {
  return crudUpdate("certifications", CertificationSchema, id, input);
}
export async function deleteCertification(id: string) {
  return crudRemove("certifications", id);
}

// ---------- Goals (Phase 66) ----------
export async function createGoal(input: GoalFormInput) {
  return crudCreate("career_goals", GoalSchema, input);
}
export async function updateGoal(id: string, input: GoalFormInput) {
  return crudUpdate("career_goals", GoalSchema, id, input);
}
export async function deleteGoal(id: string) {
  return crudRemove("career_goals", id);
}

// ---------- AI-assisted refinement (Phase 5) — generic across every achievement type ----------
export async function refineAchievement(params: {
  achievementType: string;
  title: string;
  organization: string | null;
  description: string | null;
}): Promise<{ data?: AchievementRefinement; error?: string }> {
  const session = await requireUser();
  if (!params.title.trim()) return { error: "Add a title first." };

  try {
    await assertWithinAIRateLimit(session.userId!, "achievement_refinement", { maxCalls: 20, windowMinutes: 30 });
    const data = await refineAchievementDescription({ userId: session.userId!, ...params });
    return { data };
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    if (error instanceof AIProviderNotConfiguredError) return { error: "AI suggestions aren't configured yet." };
    console.error("[profile] refinement failed", error);
    return { error: "Couldn't generate suggestions right now." };
  }
}

// ---------- Research project generator (Phase 13) ----------
export async function generateResearchIdeas(field: string): Promise<{ data?: ResearchProject[]; error?: string }> {
  const session = await requireUser();
  if (!field.trim()) return { error: "Enter a field or interest first." };

  try {
    await assertWithinAIRateLimit(session.userId!, "research_generator", { maxCalls: 10, windowMinutes: 60 });
    const supabase = await createClient();
    const { data: interests } = await supabase.from("student_interests").select("label").eq("user_id", session.userId!);
    const data = await generateResearchProjects({
      userId: session.userId!,
      field: field.trim(),
      interests: (interests ?? []).map((i) => i.label),
    });
    return { data };
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    if (error instanceof AIProviderNotConfiguredError) return { error: "The AI Advisor isn't configured yet, so research ideas can't be generated. See API_SETUP.md." };
    console.error("[profile] research generation failed", error);
    return { error: "Couldn't generate research ideas right now." };
  }
}

export async function saveResearchIdea(project: ResearchProject, field: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const result = await crudCreate("research_experiences", ResearchExperienceSchema, {
    title: project.researchQuestion,
    organization: null,
    mentor_name: null,
    field,
    description: `${project.whyItFits}\n\nMethod: ${project.method}\nExpected output: ${project.expectedOutput}`,
    methodology: project.method,
    independence_level: null,
    output_type: "none",
    output_url: null,
    start_date: null,
    end_date: null,
    ongoing: true,
    hours_per_week: null,
    location: null,
  });
  if (!result.error) {
    await logEvent(session.userId!, "research_project_started", { field });
  }
  return result;
}
