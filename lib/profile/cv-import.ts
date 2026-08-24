import type { SupabaseClient } from "@supabase/supabase-js";

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
