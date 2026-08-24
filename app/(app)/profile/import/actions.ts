"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { recomputeCareerProfile } from "@/lib/scoring/persist";
import { insertCvImportItems, type CvImportItem } from "@/lib/profile/cv-import";
import { logEvent } from "@/lib/analytics/log";

export type { CVUploadResult } from "@/app/(onboarding)/onboarding/actions";
export { uploadAndExtractCV } from "@/app/(onboarding)/onboarding/actions";

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
): Promise<{ inserted?: number; error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;

  if (items.length === 0) {
    return { error: "Nothing was selected to import." };
  }

  const supabase = await createClient();
  const { inserted, failedCategories } = await insertCvImportItems(supabase, userId, items);

  if (inserted === 0) {
    return { error: "We couldn't save anything from that CV. Please try again." };
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

  // Reported honestly rather than as a flat success: a partial import is a real outcome,
  // and the student should be told which parts didn't land.
  if (failedCategories.length > 0) {
    return {
      inserted,
      error: `Saved ${inserted} item${inserted === 1 ? "" : "s"}, but ${failedCategories.join(", ")} couldn't be saved. You can add those manually.`,
    };
  }

  return { inserted };
}
