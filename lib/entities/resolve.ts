import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, InstitutionCategory } from "@/types/database";
import { isUuidLike } from "@/lib/validation/uuid";
import { findPossibleDuplicates, type EntityCandidate } from "./rank";
import type { EntitySearchType } from "./search";

export interface ResolvedEntity {
  id: string;
  canonicalName: string;
}

/**
 * Re-verifies a client-submitted entity id server-side before it's ever written to an
 * achievement/profile row — never trusts the autocomplete result blindly (spec section
 * 16). Confirms the row exists AND (for institutions) that its category matches the
 * field it's being linked from, so a school id can never end up linked as an
 * `organization_id` or vice versa. Returns the row's CURRENT canonical name, which the
 * caller writes into the legacy text column to keep it in sync (spec section 13).
 */
export async function resolveInstitution(supabase: SupabaseClient<Database>, id: string, category: InstitutionCategory): Promise<ResolvedEntity | null> {
  if (!isUuidLike(id)) return null;
  const { data } = await supabase.from("institutions").select("id, canonical_name, category").eq("id", id).eq("category", category).maybeSingle();
  if (!data) return null;
  return { id: data.id, canonicalName: data.canonical_name };
}

export async function resolveUniversity(supabase: SupabaseClient<Database>, id: string): Promise<ResolvedEntity | null> {
  if (!isUuidLike(id)) return null;
  const { data } = await supabase.from("universities").select("id, name").eq("id", id).maybeSingle();
  if (!data) return null;
  return { id: data.id, canonicalName: data.name };
}

export async function resolveOpportunity(supabase: SupabaseClient<Database>, id: string): Promise<ResolvedEntity | null> {
  if (!isUuidLike(id)) return null;
  const { data } = await supabase.from("opportunities").select("id, title").eq("id", id).maybeSingle();
  if (!data) return null;
  return { id: data.id, canonicalName: data.title };
}

/** Type-and-existence dispatcher for the generic EntityCombobox's own resolve call —
 * every Server Action wiring a specific field (e.g. updateEducationRecord's school_id)
 * still calls the specific resolve* function above for its own field, so a mismatch
 * between the combobox's `entityType` prop and the field it's bound to can't silently
 * resolve to the wrong table. */
export async function resolveEntity(supabase: SupabaseClient<Database>, type: EntitySearchType, id: string): Promise<ResolvedEntity | null> {
  if (type === "school" || type === "organization") return resolveInstitution(supabase, id, type);
  if (type === "university") return resolveUniversity(supabase, id);
  return resolveOpportunity(supabase, id);
}

const MAX_CANONICAL_NAME_LENGTH = 300;

export interface CreateCustomInstitutionInput {
  category: InstitutionCategory;
  canonicalName: string;
  city: string | null;
  country: string | null;
  websiteUrl: string | null;
}

export type CreateCustomInstitutionResult =
  | { status: "created"; entity: ResolvedEntity }
  | { status: "possible_duplicates"; candidates: ResolvedEntity[] }
  | { status: "error"; error: string };

/**
 * The "custom fallback" mechanism (spec section 6) plus its required duplicate check
 * (spec section 7) in one place, so no call site can add the fallback without the
 * check. Never auto-merges (spec section 8) — a possible-duplicate result only ever
 * hands the caller candidates to show the user ("Did you mean X?"); creation proceeds
 * only when the caller explicitly confirms past that (`confirmDespiteDuplicates`).
 */
export async function createCustomInstitution(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: CreateCustomInstitutionInput,
  confirmDespiteDuplicates = false
): Promise<CreateCustomInstitutionResult> {
  const canonicalName = input.canonicalName.trim();
  if (!canonicalName) return { status: "error", error: "Enter a name." };
  if (canonicalName.length > MAX_CANONICAL_NAME_LENGTH) return { status: "error", error: "That name is too long." };

  const country = input.country?.trim() || null;
  const city = input.city?.trim() || null;
  const websiteUrl = input.websiteUrl?.trim() || null;
  if (websiteUrl && !/^https?:\/\/.+/i.test(websiteUrl)) return { status: "error", error: "Website must start with http:// or https://." };

  if (!confirmDespiteDuplicates) {
    let existingQuery = supabase.from("institutions").select("id, canonical_name, aliases, country, city").eq("category", input.category);
    if (country) existingQuery = existingQuery.eq("country", country);
    const { data: existing } = await existingQuery.limit(300);
    const candidates: EntityCandidate[] = (existing ?? []).map((row) => ({
      id: row.id,
      canonicalName: row.canonical_name,
      aliases: row.aliases,
      country: row.country,
      city: row.city,
    }));
    const duplicates = findPossibleDuplicates(canonicalName, candidates, { country, city });
    if (duplicates.length > 0) {
      return { status: "possible_duplicates", candidates: duplicates.map((d) => ({ id: d.id, canonicalName: d.canonicalName })) };
    }
  }

  const { data, error } = await supabase
    .from("institutions")
    .insert({
      category: input.category,
      canonical_name: canonicalName,
      country,
      city,
      website_url: websiteUrl,
      status: "unverified",
      created_by: userId,
    })
    .select("id, canonical_name")
    .single();

  if (error) {
    // 23505 = the DB's own exact-duplicate index (migration 0038) caught what the
    // fuzzy pre-check above didn't — still never auto-merges; surfaced as a friendly
    // error rather than silently succeeding or crashing.
    if (error.code === "23505") return { status: "error", error: "That already exists — search for it instead of adding it again." };
    return { status: "error", error: "Couldn't add that. Please try again." };
  }
  if (!data) return { status: "error", error: "Couldn't add that. Please try again." };

  return { status: "created", entity: { id: data.id, canonicalName: data.canonical_name } };
}
