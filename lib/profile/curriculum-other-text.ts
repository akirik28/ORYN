import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { columnExistsLive } from "@/lib/supabase/errors";

export { CURRICULUM_OTHER_TEXT_MAX_LENGTH } from "./curriculum-other-text-constant";

/**
 * Migration 0109, proposed and not yet applied. Two independent checks, not one shared
 * probe against either table -- `profiles.curriculum_other_text` and
 * `education_records.curriculum_other_text` are written by different code paths (onboarding
 * writes both at once; the profile editor only ever touches education_records), so each
 * caller checks only the column its own write path actually needs, matching this session's
 * established one-check-per-table discipline for exactly this class of gate.
 */
export async function isProfilesCurriculumOtherTextLive(admin: SupabaseClient<Database>): Promise<boolean> {
  return (await columnExistsLive(admin, "profiles", "curriculum_other_text")) === true;
}

export async function isEducationRecordsCurriculumOtherTextLive(admin: SupabaseClient<Database>): Promise<boolean> {
  return (await columnExistsLive(admin, "education_records", "curriculum_other_text")) === true;
}
