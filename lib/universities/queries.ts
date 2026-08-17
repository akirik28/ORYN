import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TargetUniversity, University } from "@/types/database";
import { canonicalUniversityId } from "@/lib/universities/canonical";

export interface TargetUniversityWithDetails extends TargetUniversity {
  university: University | null;
}

/**
 * Joins target_universities to universities with two plain queries instead of a nested
 * PostgREST `.select("*, universities(*)")` — our hand-authored Database type doesn't
 * model FK Relationships (see the Identity<T> comment in types/database.ts), so nested
 * embedding can't be typed reliably. This pattern (fetch rows, batch-fetch the referenced
 * table by id, zip them back together) is the convention used everywhere in this codebase
 * that would otherwise need a join.
 */
export async function getTargetUniversitiesWithDetails(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 100
): Promise<TargetUniversityWithDetails[]> {
  const { data: targets } = await supabase
    .from("target_universities")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (!targets || targets.length === 0) return [];

  // Resolved through the canonical winner — self-heals a target that references a known-
  // duplicate loser row (from before the write-path fix existed) at read time instead of
  // permanently showing the dashboard a stale duplicate. See lib/universities/canonical.ts.
  const universityIds = [...new Set(targets.map((t) => canonicalUniversityId(t.university_id)))];
  const { data: universities } = await supabase.from("universities").select("*").in("id", universityIds);
  const universityById = new Map((universities ?? []).map((u) => [u.id, u]));

  return targets.map((target) => ({ ...target, university: universityById.get(canonicalUniversityId(target.university_id)) ?? null }));
}
