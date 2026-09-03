"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { recomputeCareerProfile } from "@/lib/scoring/persist";
import {
  insertCvImportItems,
  insertCvImportSkills,
  insertCvImportLanguages,
  type CvImportItem,
  type CvImportCategory,
  type CvImportSkillCandidate,
  type CvImportLanguageCandidate,
} from "@/lib/profile/cv-import";
import { logEvent } from "@/lib/analytics/log";
import { getTranslations } from "next-intl/server";

// No re-export of `uploadAndExtractCV` here, deliberately. A "use server" module may only
// export async functions — a re-export (or a type export) makes Turbopack reject the file
// and it ends up with *no* exports at all, which typecheck happily accepts and the
// production build does not. The client imports the upload action straight from the
// onboarding module instead; it is the same server action either way.

// Same six translation keys features/profile/cv-import-flow.tsx's own CATEGORY_LABEL_KEYS
// resolves against the "profile" namespace -- not imported from there since that constant
// lives in a "use client" file, but the keys themselves (profile.page.sections.*.title)
// are the real, already-translated category names, not a second copy of English text.
const CATEGORY_TITLE_KEYS = {
  education: "page.sections.education.title",
  activities: "page.sections.activities.title",
  awards: "page.sections.awards.title",
  projects: "page.sections.projects.title",
  research: "page.sections.research.title",
  workExperience: "page.sections.workExperience.title",
} as const satisfies Record<CvImportCategory, string>;

/**
 * Save reviewed CV items into the profile, after onboarding.
 *
 * `completeOnboarding` does the same write, but it is guarded by a one-time
 * `runSecondaryWrites` flag precisely so a re-submitted onboarding cannot duplicate rows —
 * which makes it the wrong function to reuse here, where repeat imports are the expected
 * behaviour (a student adds a newer CV a term later). Same shared insert helper, different
 * idempotency story, and that difference is the reason for a separate action rather than a
 * flag on the old one.
 *
 * Every row lands with `source: "cv_import"` and nothing is written that the student did
 * not see and keep on the review screen (master spec Phase 60: never save AI-extracted
 * achievements without a review step).
 */
export async function importReviewedCvItems(
  items: CvImportItem[],
  skills: CvImportSkillCandidate[] = [],
  languages: CvImportLanguageCandidate[] = [],
): Promise<{ inserted?: number; error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const t = await getTranslations("onboarding.import");
  const tProfile = await getTranslations("profile");

  if (items.length === 0 && skills.length === 0 && languages.length === 0) {
    return { error: t("nothingSelected") };
  }

  const supabase = await createClient();
  const { inserted: achievementsInserted, failedCategories }: { inserted: number; failedCategories: CvImportCategory[] } =
    items.length > 0 ? await insertCvImportItems(supabase, userId, items) : { inserted: 0, failedCategories: [] };
  const { inserted: skillsInserted, skippedDuplicate: skillsSkippedDuplicate, skippedCap: skillsSkippedCap } = await insertCvImportSkills(
    supabase,
    userId,
    skills,
  );
  const { inserted: languagesInserted, skippedDuplicate: languagesSkippedDuplicate } = await insertCvImportLanguages(
    supabase,
    userId,
    languages,
  );
  const inserted = achievementsInserted + skillsInserted + languagesInserted;

  if (inserted === 0) {
    return { error: t("savedNothing") };
  }

  // The profile changed, so the scores derived from it are stale. Best-effort: a scoring
  // failure must not make a successful import look like it failed.
  try {
    await recomputeCareerProfile(userId, { snapshotReason: "cv_import" });
  } catch (error) {
    console.error("[cv-import] recompute failed after import", error);
  }

  await logEvent(userId, "cv_imported", { itemCount: inserted, source: "post_onboarding" });

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  // Reported honestly rather than as a flat success: a partial import is a real outcome
  // (a failed achievement category, a skill over the 15-cap, a name that duplicated
  // something already on the profile), and the student should be told which parts didn't
  // land rather than have them silently vanish.
  const notes: string[] = [];
  if (failedCategories.length > 0) {
    const categories = failedCategories.map((c) => tProfile(CATEGORY_TITLE_KEYS[c])).join(", ");
    notes.push(t("categoriesFailed", { categories }));
  }
  if (skillsSkippedCap > 0) notes.push(t("skillsSkippedCap", { count: skillsSkippedCap }));
  const skippedDuplicate = skillsSkippedDuplicate + languagesSkippedDuplicate;
  if (skippedDuplicate > 0) notes.push(t("alreadyOnProfile", { count: skippedDuplicate }));

  if (notes.length > 0) {
    return {
      inserted,
      error: t("savedWithNotes", { count: inserted, notes: notes.join("; ") }),
    };
  }

  return { inserted };
}
