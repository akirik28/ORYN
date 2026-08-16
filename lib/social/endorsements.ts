import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface SkillEndorsementInfo {
  count: number;
  endorsedByMe: boolean;
}

/**
 * Cross-user read (skill_endorsements RLS only covers "own or given" — migration 0034 —
 * so a third-party viewer's page load goes through the admin client, same pattern as
 * every other cross-user read in this pack). One batched `.in()` query for every skill
 * on the page rather than one query per skill.
 */
export async function getEndorsementsForSkills(skillIds: string[], viewerId: string | null): Promise<Record<string, SkillEndorsementInfo>> {
  const result: Record<string, SkillEndorsementInfo> = {};
  for (const id of skillIds) result[id] = { count: 0, endorsedByMe: false };
  if (skillIds.length === 0) return result;

  const admin = createAdminClient();
  const { data } = await admin.from("skill_endorsements").select("skill_id, endorser_id").in("skill_id", skillIds);

  for (const row of data ?? []) {
    const entry = result[row.skill_id];
    if (!entry) continue;
    entry.count += 1;
    if (viewerId && row.endorser_id === viewerId) entry.endorsedByMe = true;
  }
  return result;
}
