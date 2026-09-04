import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isUndefinedFunctionError } from "@/lib/supabase/errors";
import type { NarrativeSource } from "@/lib/digest/parent-commentary";
import type { Locale } from "@/lib/i18n/config";

/**
 * The read path for migration 0130's parent_commentary_entries -- the "gelişim" page's own
 * data source, via get_parent_child_commentary (SECURITY DEFINER, same shape as
 * get_parent_child_profile and neighbors). Called with the ordinary session-scoped client, not
 * admin -- the function's own is_active_parent_of()-derived scoping is what makes this safe
 * for a parent's regular request, the same way every other get_parent_child_* call in this
 * codebase already works.
 */
export interface ParentCommentaryEntry {
  id: string;
  generatedAt: string;
  locale: Locale;
  periodStart: string;
  periodEnd: string;
  narrative: string;
  narrativeSource: NarrativeSource;
}

/**
 * `p_limit: 1` -- the page shows only the latest entry today (CEO, 2026-09-04: "kapsamı dar
 * tut", keep scope narrow); the function itself already returns up to 12 ordered newest-first,
 * so a future "see past months" view is a limit change here, not a new migration.
 *
 * Degrades to null if the migration isn't applied yet (isUndefinedFunctionError), matching
 * every other pre-migration reader in lib/parent/ and lib/auth/account-role.ts -- "the
 * function doesn't exist yet" is this environment's normal state until the founder runs 0130
 * by hand, not an error.
 */
export async function getLatestParentCommentary(studentUserId: string): Promise<ParentCommentaryEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_parent_child_commentary", { p_student: studentUserId, p_limit: 1 });

  if (error) {
    if (!isUndefinedFunctionError(error, "get_parent_child_commentary")) {
      console.error("[parent/commentary] failed to read parent_commentary_entries", { studentUserId, error: error.message });
    }
    return null;
  }

  const row = data?.[0];
  if (!row) return null;

  return {
    id: row.id,
    generatedAt: row.generated_at,
    locale: row.locale as Locale,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    narrative: row.narrative,
    narrativeSource: row.narrative_source as NarrativeSource,
  };
}
