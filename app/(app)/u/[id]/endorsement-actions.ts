"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getConnectionWith } from "@/lib/social/connections";
import { checkEndorsementEligibility } from "@/lib/social/skill-endorsements";
import { isUuidLike } from "@/lib/validation/uuid";
import { assertWithinRateLimit, RateLimitExceededError } from "@/lib/security/rate-limit";
import { RATE_LIMITS } from "@/lib/security/rate-limit-config";

type ActionResult = { error?: string };

const ENDORSEMENT_REASON_MESSAGES: Record<string, string> = {
  self: "You can't endorse your own skill.",
  not_connected: "You can only endorse a connection's skill.",
  blocked: "You can't endorse this person's skill.",
  already_endorsed: "You already endorsed this skill.",
};

/**
 * Re-checks every condition migration 0034's INSERT policy also enforces (self, accepted
 * connection, not blocked, not a duplicate) via lib/social/skill-endorsements.ts's pure
 * predicate — same "the UI not offering the button isn't the security boundary"
 * reasoning as sendMessage/sendConnectionRequest. RLS is the real, final gate either way.
 */
export async function endorseSkill(skillId: string, skillOwnerId: string): Promise<ActionResult> {
  const session = await requireUser();
  if (!isUuidLike(skillId) || !isUuidLike(skillOwnerId)) return { error: "Invalid skill." };

  try {
    await assertWithinRateLimit(session.userId!, "endorse_skill", RATE_LIMITS.endorse_skill);
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    throw error;
  }

  const supabase = await createClient();
  const isSelf = skillOwnerId === session.userId;
  const connection = isSelf ? null : await getConnectionWith(supabase, session.userId!, skillOwnerId);
  const hasAcceptedConnection = connection?.status === "accepted";

  const { data: blocked } = await supabase.rpc("is_blocked_between", { user_a: session.userId!, user_b: skillOwnerId });

  const { data: already } = await supabase
    .from("skill_endorsements")
    .select("id")
    .eq("skill_id", skillId)
    .eq("endorser_id", session.userId!)
    .maybeSingle();

  const reason = checkEndorsementEligibility({
    isSelf,
    hasAcceptedConnection,
    isBlocked: Boolean(blocked),
    alreadyEndorsed: Boolean(already),
  });
  if (reason) return { error: ENDORSEMENT_REASON_MESSAGES[reason] };

  const { error } = await supabase.from("skill_endorsements").insert({ skill_id: skillId, endorser_id: session.userId! });
  if (error) return { error: "Couldn't endorse that skill." };

  revalidatePath(`/u/${skillOwnerId}`);
  return {};
}

export async function withdrawEndorsement(skillId: string, skillOwnerId: string): Promise<ActionResult> {
  const session = await requireUser();
  if (!isUuidLike(skillId)) return { error: "Invalid skill." };

  const supabase = await createClient();
  const { error } = await supabase.from("skill_endorsements").delete().eq("skill_id", skillId).eq("endorser_id", session.userId!);
  if (error) return { error: "Couldn't remove that endorsement." };

  revalidatePath(`/u/${skillOwnerId}`);
  return {};
}
