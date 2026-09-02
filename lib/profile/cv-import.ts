import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntityScope } from "@/lib/entities/field-policy";
import type { SkillCategory } from "@/types/database";
import type { CVExtractionResult } from "@/lib/ai/cv-extraction";
import type { Locale } from "@/lib/i18n/config";
import { MAX_ACTIVE_SKILLS, canAddAnotherSkill, isDuplicateSkillName } from "@/lib/social/skills";
import { isDuplicateLanguage } from "@/lib/social/languages";
import { SKILL_CATEGORY_OPTIONS, fieldText } from "@/features/profile/field-config";
import type { LanguageProficiencyValue } from "@/lib/vocabularies/languages";

/**
 * Persisting AI-extracted CV items into the profile tables.
 *
 * Lifted out of `completeOnboarding`, which was the only caller until CV import became
 * reachable after onboarding too (`/profile/import`). The mapping has real per-table
 * shape differences — education has no `title`, work experience requires a non-null
 * `organization` — so a second hand-written copy would have drifted the first time one of
 * those tables changed.
 *
 * Every row is written with `source: "cv_import"` so a student (and Oryn's own scoring)
 * can tell an imported claim from one typed by hand. Nothing here invents a field the
 * extraction didn't produce.
 */
export type CvImportCategory =
  | "education"
  | "activities"
  | "awards"
  | "projects"
  | "research"
  | "workExperience";

export interface CvImportItem {
  category: CvImportCategory;
  title: string;
  organization: string | null;
  /** Set only when the student linked the text to a real canonical entity — never inferred. */
  organizationEntityId: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
}

export const CV_IMPORT_CATEGORY_TABLE = {
  education: "education_records",
  activities: "activities",
  awards: "awards",
  projects: "projects",
  research: "research_experiences",
  workExperience: "work_experiences",
} as const;

/**
 * Mirrors features/profile/field-config.ts's per-table entity scopes exactly — CV-import
 * items land in the same tables the manual profile forms do, so a school extracted here and
 * a school typed by hand on /profile must resolve against the same registry slice.
 *
 * Single source for both CV-review surfaces (features/onboarding/steps/import-step.tsx and
 * features/profile/cv-import-flow.tsx) — two independent copies of a mapping that decides
 * which entity registry a search hits is exactly the kind of drift that would quietly point
 * one surface's "School" field at the wrong entity type while the other stayed correct.
 */
export const CV_IMPORT_CATEGORY_TO_ORGANIZATION_SCOPE: Record<CvImportCategory, EntityScope> = {
  education: "school",
  activities: "activity_organization",
  awards: "award_organization",
  projects: "project_organization",
  research: "research_organization",
  workExperience: "work_organization",
};

/** Groups items by category so each table takes one insert rather than one per row. */
export function groupCvItemsByCategory(items: CvImportItem[]): Map<CvImportCategory, CvImportItem[]> {
  const byCategory = new Map<CvImportCategory, CvImportItem[]>();
  for (const item of items) {
    byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), item]);
  }
  return byCategory;
}

/**
 * The row shape for one item in its destination table.
 *
 * Education is the odd one: `education_records` has no `title`/`organization` pair, so the
 * school is taken from `organization` and falls back to `title` — an extracted education
 * entry often carries the school in either field depending on how the CV was written.
 * `is_current` is derived from a missing end date rather than guessed.
 */
export function cvItemToRow(userId: string, item: CvImportItem): Record<string, unknown> {
  if (item.category === "education") {
    return {
      user_id: userId,
      school_name: item.organization || item.title,
      school_entity_id: item.organizationEntityId,
      start_date: item.startDate,
      end_date: item.endDate,
      notes: item.description,
      is_current: !item.endDate,
    };
  }

  return {
    user_id: userId,
    title: item.title,
    // work_experiences.organization is NOT NULL, unlike every other table here.
    organization: item.category === "workExperience" ? item.organization || "Unknown" : item.organization,
    organization_entity_id: item.organizationEntityId,
    description: item.description,
    start_date: item.startDate,
    end_date: item.endDate,
    source: "cv_import",
  };
}

/**
 * Writes reviewed items into their tables. Returns how many rows landed, so a caller can
 * tell the student what actually happened rather than assuming success.
 *
 * Deliberately not transactional: these are independent appends across six tables, and
 * partially importing a CV is a far better outcome for a student than rejecting the whole
 * upload because one row failed. The count is the honest report of that.
 */
export async function insertCvImportItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- one client, six differently-shaped tables
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  items: CvImportItem[],
): Promise<{ inserted: number; failedCategories: CvImportCategory[] }> {
  let inserted = 0;
  const failedCategories: CvImportCategory[] = [];

  for (const [category, categoryItems] of groupCvItemsByCategory(items)) {
    const table = CV_IMPORT_CATEGORY_TABLE[category];
    const rows = categoryItems.map((item) => cvItemToRow(userId, item));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table name is dynamic across differently-shaped tables
    const { error } = await (supabase.from(table as any) as any).insert(rows);
    if (error) {
      console.error("[cv-import] insert failed", { table, code: error.code, message: error.message });
      failedCategories.push(category);
      continue;
    }
    inserted += rows.length;
  }

  return { inserted, failedCategories };
}

// ---------------------------------------------------------------------------
// Skills / languages (2026-09-02)
//
// Extracted by the same AI call as everything above (lib/ai/cv-extraction.ts) but never
// previously reachable from either review surface or the save path — paid for, always
// discarded. Kept apart from CvImportItem/insertCvImportItems on purpose: `skills` and
// `languages` are proficiency-shaped (a name plus one small attribute), not
// title/organization/dates, and each has its own real constraint the achievement tables
// don't (skills: a 15-item cap and a DB unique index on lower(name); languages: a
// case-insensitive dedup check with no DB backstop) — a bulk insert() like the one above
// would throw on the first duplicate name rather than degrading gracefully. Both surfaces
// (features/onboarding/steps/import-step.tsx and features/profile/cv-import-flow.tsx) call
// the same flatten/insert pair here, same reasoning as CV_IMPORT_CATEGORY_TO_ORGANIZATION_SCOPE
// above: one shared implementation the two surfaces can't drift apart from.
// ---------------------------------------------------------------------------

/** Reuses field-config.ts's own English->Turkish table (the same one every manual skill
 * form already translates "Technical"/"Creative"/etc. through) rather than a second copy. */
export function skillCategoryLabel(category: SkillCategory, locale: Locale): string {
  const englishLabel = SKILL_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
  return fieldText(englishLabel, locale);
}

export interface CvImportReviewSkill {
  id: string;
  name: string;
  category: SkillCategory;
  included: boolean;
}

export interface CvImportReviewLanguage {
  id: string;
  name: string;
  /** Whatever the document actually said, shown to the student as a hint — never written to
   * the `proficiency` column itself. See lib/ai/cv-extraction.ts's schema comment. */
  statedLevel: string | null;
  /** The real, closed-enum value the student sets during review (lib/validation/achievements.ts's
   * LanguageSchema) — starts null; nothing is guessed into it. */
  proficiency: LanguageProficiencyValue | null;
  included: boolean;
}

export function flattenCvSkills(result: CVExtractionResult): CvImportReviewSkill[] {
  return result.skills.map((raw, index) => ({
    id: `skill-${index + 1}`,
    name: raw.name,
    category: raw.category,
    // No confidence signal exists for skills (unlike every achievement category) to
    // default this off the way a low-confidence achievement starts unchecked — nothing here
    // is more or less trustworthy than anything else, so everything starts included.
    included: true,
  }));
}

export function flattenCvLanguages(result: CVExtractionResult): CvImportReviewLanguage[] {
  return result.languages.map((raw, index) => ({
    id: `language-${index + 1}`,
    name: raw.name,
    statedLevel: raw.statedLevel,
    proficiency: null,
    included: true,
  }));
}

/** True whenever a write hits the specific "this column doesn't exist yet" error a not-yet-
 * applied migration produces (Postgres error 42703) — the same defensive check
 * lib/plan/persist.ts (migration 0077) and lib/jobs/run-with-tracking.ts (migration 0083)
 * already use, extended to whichever column name the caller is currently trying to write. */
function isMissingColumnError(error: { code?: string; message?: string } | null, column: string): boolean {
  return error?.code === "42703" && (error.message?.includes(column) ?? false);
}

export interface CvImportSkillCandidate {
  name: string;
  category: SkillCategory;
  proficiency: string | null;
}

/**
 * Dedupes against the student's existing skills (case-insensitive, matching migration
 * 0034's unique index) and against the cap (lib/social/skills.ts — 15 active skills) before
 * ever attempting an insert, rather than firing a bulk insert and hoping. Migration 0084
 * (source column) may not be applied yet — retries once without `source` on the specific
 * "column doesn't exist" error rather than failing the whole batch.
 */
export async function insertCvImportSkills(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic Supabase client, same reason as insertCvImportItems above
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  candidates: CvImportSkillCandidate[],
): Promise<{ inserted: number; skippedDuplicate: number; skippedCap: number }> {
  if (candidates.length === 0) return { inserted: 0, skippedDuplicate: 0, skippedCap: 0 };

  const { data: existing } = await supabase.from("skills").select("name").eq("user_id", userId);
  const existingNames = (existing ?? []).map((s: { name: string }) => s.name);

  const deduped: CvImportSkillCandidate[] = [];
  let skippedDuplicate = 0;
  const seenThisBatch: string[] = [];
  for (const candidate of candidates) {
    if (isDuplicateSkillName([...existingNames, ...seenThisBatch], candidate.name)) {
      skippedDuplicate += 1;
      continue;
    }
    seenThisBatch.push(candidate.name);
    deduped.push(candidate);
  }

  const roomLeft = Math.max(0, MAX_ACTIVE_SKILLS - existingNames.length);
  const toInsert = canAddAnotherSkill(existingNames.length) ? deduped.slice(0, roomLeft) : [];
  const skippedCap = deduped.length - toInsert.length;
  if (toInsert.length === 0) return { inserted: 0, skippedDuplicate, skippedCap };

  const baseRows = toInsert.map((c) => ({ user_id: userId, name: c.name, category: c.category, proficiency: c.proficiency }));
  let { error } = await supabase.from("skills").insert(baseRows.map((row) => ({ ...row, source: "cv_import" })));
  if (error && isMissingColumnError(error, "source")) {
    ({ error } = await supabase.from("skills").insert(baseRows));
  }
  if (error) {
    console.error("[cv-import] skills insert failed", { code: error.code, message: error.message });
    return { inserted: 0, skippedDuplicate, skippedCap };
  }

  return { inserted: toInsert.length, skippedDuplicate, skippedCap };
}

export interface CvImportLanguageCandidate {
  name: string;
  proficiency: LanguageProficiencyValue | null;
}

/** Same shape as insertCvImportSkills, without the cap — languages have none. */
export async function insertCvImportLanguages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic Supabase client, same reason as insertCvImportItems above
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  candidates: CvImportLanguageCandidate[],
): Promise<{ inserted: number; skippedDuplicate: number }> {
  if (candidates.length === 0) return { inserted: 0, skippedDuplicate: 0 };

  const { data: existing } = await supabase.from("languages").select("name").eq("user_id", userId);
  const existingNames = (existing ?? []).map((l: { name: string }) => l.name);

  const toInsert: CvImportLanguageCandidate[] = [];
  let skippedDuplicate = 0;
  const seenThisBatch: string[] = [];
  for (const candidate of candidates) {
    if (isDuplicateLanguage([...existingNames, ...seenThisBatch], candidate.name)) {
      skippedDuplicate += 1;
      continue;
    }
    seenThisBatch.push(candidate.name);
    toInsert.push(candidate);
  }
  if (toInsert.length === 0) return { inserted: 0, skippedDuplicate };

  const baseRows = toInsert.map((c) => ({ user_id: userId, name: c.name, proficiency: c.proficiency }));
  let { error } = await supabase.from("languages").insert(baseRows.map((row) => ({ ...row, source: "cv_import" })));
  if (error && isMissingColumnError(error, "source")) {
    ({ error } = await supabase.from("languages").insert(baseRows));
  }
  if (error) {
    console.error("[cv-import] languages insert failed", { code: error.code, message: error.message });
    return { inserted: 0, skippedDuplicate };
  }

  return { inserted: toInsert.length, skippedDuplicate };
}
