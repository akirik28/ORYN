"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { recomputeCareerProfile } from "@/lib/scoring/persist";
import { refineAchievementDescription, type AchievementRefinement } from "@/lib/ai/refine-achievement";
import { resolveLocale } from "@/lib/i18n/locale";
import { generateResearchProjects, type ResearchProject } from "@/lib/ai/research-generator";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { assertWithinAIRateLimit, RateLimitExceededError } from "@/lib/ai/rate-limit";
import { AIProviderNotConfiguredError } from "@/lib/ai";
import { logEvent } from "@/lib/analytics/log";
import { toFriendlyDbErrorMessage, type CrudAction } from "@/lib/errors/friendly-db-error";
import {
  ActivitySchema,
  ProjectSchema,
  AwardSchema,
  ResearchExperienceSchema,
  VolunteeringSchema,
  WorkExperienceSchema,
  EducationRecordSchema,
  CourseSchema,
  TestScoreSchema,
  CertificationSchema,
  GoalSchema,
  SportsSchema,
  type ActivityFormInput,
  type ProjectFormInput,
  type AwardFormInput,
  type ResearchExperienceFormInput,
  type VolunteeringFormInput,
  type WorkExperienceFormInput,
  type EducationRecordFormInput,
  type CourseFormInput,
  type TestScoreFormInput,
  type CertificationFormInput,
  type GoalFormInput,
  type SportsFormInput,
} from "@/lib/validation/achievements";
import { resolveEntity } from "@/lib/entities/resolve";
import type { EntityScope } from "@/lib/entities/field-policy";

type ActionResult = { error?: string };
type ZodLike<T> = { safeParse: (input: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } };

/**
 * Canonical Entity Autocomplete System: every achievement/education table with a
 * `*_entity_id` linkage column re-verifies that id server-side before it is ever
 * persisted — never trusts the client's autocomplete result blindly. A null id (the
 * legacy free-text path) skips this entirely.
 *
 * A canonical link also overwrites its `textField` with the entity's CURRENT display
 * name on every write, so the denormalized column a linked row's existing read paths
 * already render (portfolio, CV builder, exports, ...) always shows the canonical name
 * at the moment of selection, with zero changes to those read paths.
 * An opportunity link has no such column — the catalogue title is resolved for display
 * at read time instead (see lib/profile/activity-opportunities.ts), so `textField` is
 * null.
 *
 * `scope` must be the same scope features/profile/field-config.ts binds to that column,
 * and both must match the entity types the column's own database trigger allows. The
 * trigger is the real gate; resolving here just turns a would-be Postgres exception into
 * a message the student can act on.
 *
 * A table can carry more than one link: `activities` has both an organization and an
 * optional link to the opportunity/program catalogue it corresponds to.
 */
interface EntityLink {
  idField: string;
  textField: string | null;
  scope: EntityScope;
}

const ENTITY_LINK_FIELDS: Record<string, EntityLink[]> = {
  education_records: [{ idField: "school_entity_id", textField: "school_name", scope: "school" }],
  work_experiences: [{ idField: "organization_entity_id", textField: "organization", scope: "work_organization" }],
  volunteering_experiences: [{ idField: "organization_entity_id", textField: "organization", scope: "volunteering_organization" }],
  activities: [
    { idField: "organization_entity_id", textField: "organization", scope: "activity_organization" },
    { idField: "opportunity_id", textField: null, scope: "opportunity" },
  ],
  research_experiences: [{ idField: "organization_entity_id", textField: "organization", scope: "research_organization" }],
  awards: [{ idField: "organization_entity_id", textField: "organization", scope: "award_organization" }],
  certifications: [{ idField: "organization_entity_id", textField: "organization", scope: "certification_organization" }],
  projects: [{ idField: "organization_entity_id", textField: "organization", scope: "project_organization" }],
  sports_experiences: [{ idField: "team_entity_id", textField: "team_name", scope: "sports_team" }],
};

async function resolveEntityLinkage<T extends Record<string, unknown>>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  data: T
): Promise<{ data: T; error?: string }> {
  const links = ENTITY_LINK_FIELDS[table];
  if (!links) return { data };

  let next: Record<string, unknown> = data;
  for (const link of links) {
    const rawId = next[link.idField];
    if (rawId === null || rawId === undefined) continue;
    if (typeof rawId !== "string") return { data, error: "Invalid entity reference." };

    const resolved = await resolveEntity(supabase, link.scope, rawId);
    if (!resolved) return { data, error: "That entry couldn't be verified. Please search and select it again." };

    next = { ...next, [link.idField]: resolved.id, ...(link.textField ? { [link.textField]: resolved.canonicalName } : {}) };
  }

  return { data: next as T };
}

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
/** Logs the real Postgres error server-side, returns a friendly message for the client —
 * see lib/errors/friendly-db-error.ts for why this must never be `error.message` directly. */
function friendlyDbError(action: CrudAction, table: string, error: { message: string; code?: string }): string {
  console.error(`[profile] ${action} failed`, { table, code: error.code, message: error.message });
  return toFriendlyDbErrorMessage(action);
}

/**
 * `extraFields` is spread in last, after the form-validated `linked.data` — for columns a
 * caller needs to set server-side that must never be reachable through the Zod `schema`
 * itself (schema = what a client-submitted form is allowed to contain). `source` on
 * research_experiences is the first user: a saved AI-generated idea needs to record that
 * provenance (same reason lib/profile/cv-import.ts's own rows are written with
 * `source: "cv_import"`), but `ResearchExperienceSchema` is also the plain manual-entry
 * form's schema — adding `source` there would let a normal form submission claim any
 * provenance it likes, including a fake one.
 */
async function crudCreate<T extends Record<string, unknown>>(table: string, schema: ZodLike<T>, input: T, extraFields?: Record<string, unknown>): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success || !parsed.data) return { error: parsed.error?.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const linked = await resolveEntityLinkage(supabase, table, parsed.data);
  if (linked.error) return { error: linked.error };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table name varies per call site; the Zod schema above is the real type check.
  const { error } = await (supabase.from(table as any) as any).insert({ ...linked.data, ...extraFields, user_id: session.userId! });
  if (error) return { error: friendlyDbError("save", table, error) };

  await logEvent(session.userId!, "profile_item_added", { table });
  await afterWrite(session.userId!);
  return {};
}

async function crudUpdate<T extends Record<string, unknown>>(table: string, schema: ZodLike<T>, id: string, input: T): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success || !parsed.data) return { error: parsed.error?.issues[0]?.message ?? "Invalid input." };

  const supabase = await createClient();
  const linked = await resolveEntityLinkage(supabase, table, parsed.data);
  if (linked.error) return { error: linked.error };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table as any) as any).update(linked.data).eq("id", id).eq("user_id", session.userId!);
  if (error) return { error: friendlyDbError("save", table, error) };

  await afterWrite(session.userId!);
  return {};
}

async function crudRemove(table: string, id: string): Promise<ActionResult> {
  const session = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from(table as never).delete().eq("id", id).eq("user_id", session.userId!);
  if (error) return { error: friendlyDbError("delete", table, error) };

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
// ---------- Coursework ----------
export async function createCourse(input: CourseFormInput) {
  return crudCreate("courses", CourseSchema, input);
}
export async function updateCourse(id: string, input: CourseFormInput) {
  return crudUpdate("courses", CourseSchema, id, input);
}
export async function deleteCourse(id: string) {
  return crudRemove("courses", id);
}

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

// ---------- Sports (Chat 4 founder scope update) ----------
export async function createSportsExperience(input: SportsFormInput) {
  return crudCreate("sports_experiences", SportsSchema, input);
}
export async function updateSportsExperience(id: string, input: SportsFormInput) {
  return crudUpdate("sports_experiences", SportsSchema, id, input);
}
export async function deleteSportsExperience(id: string) {
  return crudRemove("sports_experiences", id);
}

// ---------- AI-assisted refinement (Phase 5) — generic across every achievement type ----------
const MAX_DESCRIPTION_LENGTH = 4000;

export async function refineAchievement(params: {
  achievementType: string;
  title: string;
  organization: string | null;
  description: string | null;
}): Promise<{ data?: AchievementRefinement; error?: string }> {
  const session = await requireUser();
  if (!params.title.trim()) return { error: "Add a title first." };
  // Same reason as the advisor's cap: without one, an overlong description produces a
  // provider 400 that lib/ai/service-failure.ts reads as "not your fault", when it is both
  // the student's and fixable by them. Stop it reaching the provider rather than trying to
  // tell two 400s apart afterwards (review finding, 2026-09-01).
  if ((params.description ?? "").length > MAX_DESCRIPTION_LENGTH) {
    return { error: "That description is too long to refine. Trim it to the key facts and try again." };
  }

  try {
    const locale = await resolveLocale();
    await assertWithinAIRateLimit(session.userId!, "achievement_refinement", { maxCalls: 20, windowMinutes: 30 }, locale);
    // 2026-09-03, closing the Ultra tier-economics boundary -- same pattern as
    // app/(app)/advisor/actions.ts: getCurrentProfile() is cache()'d, so this costs nothing
    // extra even though requireUser() above already resolved the session.
    const profile = await getCurrentProfile();
    const tier = resolvePlanTier(profile ?? { plan_tier: "standard", ultra_gift_expires_at: null });
    const data = await refineAchievementDescription({ userId: session.userId!, locale, tier, ...params });
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
    await assertWithinAIRateLimit(session.userId!, "research_generator", { maxCalls: 10, windowMinutes: 60 }, await resolveLocale());
    const supabase = await createClient();
    const [{ data: interests }, profile] = await Promise.all([
      supabase.from("student_interests").select("label").eq("user_id", session.userId!),
      getCurrentProfile(),
    ]);
    const data = await generateResearchProjects({
      userId: session.userId!,
      field: field.trim(),
      interests: (interests ?? []).map((i) => i.label),
      // 2026-09-03, closing the Ultra tier-economics boundary -- see refineAchievement
      // above's identical pattern.
      tier: resolvePlanTier(profile ?? { plan_tier: "standard", ultra_gift_expires_at: null }),
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
  const result = await crudCreate(
    "research_experiences",
    ResearchExperienceSchema,
    {
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
      story_notes: null,
    },
    // Without this, research_experiences.source falls back to its own default ('manual') --
    // indistinguishable from an entry the student typed by hand. Same reason
    // lib/profile/cv-import.ts's rows are written with source: "cv_import" instead of
    // letting that default apply.
    { source: "research_generator" },
  );
  if (!result.error) {
    await logEvent(session.userId!, "research_project_started", { field });
  }
  return result;
}
