import type { NotificationCategory } from "@/types/database";

/**
 * The categories worth offering as a filter. `NotificationCategory` had 8 values when this
 * file was first written; `system` was one of them and could never produce a row (no writer,
 * ever — docs/handoffs/notification-categories-audit-2026-09-01.md). A filter chip for a
 * category that can't have data is a dead control, not a feature, so it was left out of this
 * list rather than included and disabled. Migration 0085 later removed `system` from the enum
 * itself — the audit's own recommendation, finally acted on — so `NotificationCategory` is
 * down to 7 values, all of them listed below. This file's filtering logic is still correct to
 * keep even though it currently excludes nothing: the next category that gets added without a
 * writer yet (it has happened twice already — this comment used to explain `system` and
 * `university_data_changed` both this way) should land in the enum without landing here too,
 * and this file is where that distinction is enforced.
 *
 * `university_data_changed` was the same kind of dead category as `system` when this file
 * was first written (blocked on a freshness-detection pipeline that didn't exist yet, per
 * the same audit) — commit afa33a57 built that pipeline and gave it a real writer, so it
 * belongs here now. Left as a note for whichever category is still missing next: check
 * whether it actually has a writer before assuming this list is still accurate.
 */
// `as const satisfies` rather than a `: readonly NotificationCategory[]` annotation: the
// latter validates membership but widens every element back to the full 8-value union,
// which made `categories.${c}` (page.tsx) type as if all 8 needed a catalog entry instead
// of just these 7. This keeps the narrow literal tuple type while still catching a typo'd
// category name at compile time.
export const FILTERABLE_CATEGORIES = [
  "deadline",
  "new_opportunity",
  "weekly_plan",
  "profile_update",
  "university_data_changed",
  "connection",
  "message",
] as const satisfies readonly NotificationCategory[];

type FilterableCategory = (typeof FILTERABLE_CATEGORIES)[number];

export function isFilterableCategory(value: string | undefined): value is FilterableCategory {
  return FILTERABLE_CATEGORIES.includes(value as FilterableCategory);
}
