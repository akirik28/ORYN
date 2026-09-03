"use server";

import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { searchEntities } from "@/lib/entities/search";
import { createCustomEntity, resolveEntity, type CreateCustomEntityResult, type ResolvedEntity } from "@/lib/entities/resolve";
import { ENTITY_SCOPES, isEntityScope, type EntityScope } from "@/lib/entities/field-policy";
import type { EntitySearchResult } from "@/lib/entities/types";
import { assertWithinRateLimit, RateLimitExceededError } from "@/lib/security/rate-limit";
import { RATE_LIMITS } from "@/lib/security/rate-limit-config";

/**
 * The one search entry point every EntityCombobox instance calls. Requires a session —
 * the registry's own RLS is `to authenticated` (migration 0039), so this is the same
 * gate re-expressed as a friendly redirect instead of a silently empty result. There is
 * no per-field authorization beyond that: search is read-only and safe for any signed-in
 * student regardless of which field they are about to link.
 */
export async function searchEntitiesAction(
  scope: EntityScope,
  query: string,
  context: { country?: string | null; city?: string | null } = {}
): Promise<EntitySearchResult[]> {
  await requireUser();
  if (!isEntityScope(scope)) return [];
  const supabase = await createClient();
  return searchEntities(supabase, scope, query, context);
}

/**
 * What `EntityCombobox` calls to learn whether its *currently linked* entity is verified
 * or a student-submitted one still awaiting a check — the id alone (its only prop about
 * the link) can't tell it that. Same read-only reasoning as searchEntitiesAction above, no
 * rate limit: fires once per `entityId` change, not per keystroke.
 */
export async function resolveEntityAction(scope: EntityScope, id: string): Promise<ResolvedEntity | null> {
  await requireUser();
  if (!isEntityScope(scope)) return null;
  const supabase = await createClient();
  return resolveEntity(supabase, scope, id);
}

export async function createCustomEntityAction(
  scope: EntityScope,
  displayName: string,
  city: string | null,
  country: string | null,
  confirmDespiteDuplicates = false
): Promise<CreateCustomEntityResult> {
  const session = await requireUser();
  if (!isEntityScope(scope)) return { status: "error", error: "Invalid entity type." };
  if (!ENTITY_SCOPES[scope].customFallbackType) {
    return { status: "error", error: "This field only accepts entries from Proxola's verified catalogue." };
  }

  // The rate limit is the abuse control for this path: the underlying RPC is SECURITY
  // DEFINER, so it is deliberately the only way a student session can write to the
  // registry at all, and nothing about the row records who submitted it.
  try {
    await assertWithinRateLimit(session.userId!, "create_custom_entity", RATE_LIMITS.create_custom_entity, await resolveLocale());
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { status: "error", error: error.message };
    throw error;
  }

  const supabase = await createClient();
  return createCustomEntity(supabase, { scope, displayName, city, country }, confirmDespiteDuplicates);
}
