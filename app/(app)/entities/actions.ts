"use server";

import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { searchEntities, type EntitySearchType, type EntitySearchResult } from "@/lib/entities/search";
import { createCustomInstitution, type CreateCustomInstitutionResult } from "@/lib/entities/resolve";
import { assertWithinRateLimit, RateLimitExceededError } from "@/lib/security/rate-limit";
import { RATE_LIMITS } from "@/lib/security/rate-limit-config";
import type { InstitutionCategory } from "@/types/database";

const SEARCH_TYPES: readonly EntitySearchType[] = ["school", "organization", "university", "opportunity"];
function isEntitySearchType(value: unknown): value is EntitySearchType {
  return typeof value === "string" && (SEARCH_TYPES as readonly string[]).includes(value);
}

/**
 * The one search entry point every EntityCombobox instance calls. Requires a session
 * (institutions' own RLS also requires `auth.uid() is not null` — this is the same gate
 * re-expressed as a friendly redirect instead of a raw RLS denial) but otherwise has no
 * per-field authorization: search itself is read-only and safe for any signed-in user
 * regardless of which field they're about to link.
 */
export async function searchEntitiesAction(type: EntitySearchType, query: string, context: { country?: string | null; city?: string | null } = {}): Promise<EntitySearchResult[]> {
  await requireUser();
  if (!isEntitySearchType(type)) return [];
  const supabase = await createClient();
  return searchEntities(supabase, type, query, context);
}

const INSTITUTION_CATEGORIES: readonly InstitutionCategory[] = ["school", "organization"];
function isInstitutionCategory(value: unknown): value is InstitutionCategory {
  return typeof value === "string" && (INSTITUTION_CATEGORIES as readonly string[]).includes(value);
}

export async function createCustomInstitutionAction(
  category: InstitutionCategory,
  canonicalName: string,
  city: string | null,
  country: string | null,
  websiteUrl: string | null,
  confirmDespiteDuplicates = false
): Promise<CreateCustomInstitutionResult> {
  const session = await requireUser();
  if (!isInstitutionCategory(category)) return { status: "error", error: "Invalid entity type." };

  try {
    await assertWithinRateLimit(session.userId!, "create_custom_institution", RATE_LIMITS.create_custom_institution);
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { status: "error", error: error.message };
    throw error;
  }

  const supabase = await createClient();
  return createCustomInstitution(supabase, session.userId!, { category, canonicalName, city, country, websiteUrl }, confirmDespiteDuplicates);
}
