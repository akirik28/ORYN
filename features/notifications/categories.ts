import type { NotificationCategory } from "@/types/database";

/**
 * The categories worth offering as a filter — `NotificationCategory` has 8 values, but two
 * can never produce a row: `system` (no writer, ever — see
 * docs/handoffs/notification-categories-audit-2026-09-01.md, recommended for removal) and
 * `university_data_changed` (real spec-named need, blocked on a freshness-detection pipeline
 * that doesn't exist yet, same audit). A filter chip for a category that can't have data is
 * a dead control, not a feature.
 */
// `as const satisfies` rather than a `: readonly NotificationCategory[]` annotation: the
// latter validates membership but widens every element back to the full 8-value union,
// which made `categories.${c}` (page.tsx) type as if all 8 needed a catalog entry instead
// of just these 6. This keeps the narrow literal tuple type while still catching a typo'd
// category name at compile time.
export const FILTERABLE_CATEGORIES = ["deadline", "new_opportunity", "weekly_plan", "profile_update", "connection", "message"] as const satisfies readonly NotificationCategory[];

type FilterableCategory = (typeof FILTERABLE_CATEGORIES)[number];

export function isFilterableCategory(value: string | undefined): value is FilterableCategory {
  return FILTERABLE_CATEGORIES.includes(value as FilterableCategory);
}
