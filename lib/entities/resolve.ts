import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { isUuidLike } from "@/lib/validation/uuid";
import { ENTITY_SCOPES, type CanonicalEntityType, type EntityScope } from "./field-policy";
import { findPossibleDuplicates, type EntityCandidate } from "./rank";
import { validateCustomEntityInput } from "./validation";
import { canonicalUniversityId, loadSupersessionMap } from "@/lib/universities/canonical";

export interface ResolvedEntity {
  id: string;
  canonicalName: string;
  /**
   * True for a `user_submitted` row — a student added this through the custom fallback
   * and no one has checked it against an official source yet. Mirrors
   * `EntitySearchResult.isCustom` (lib/entities/search.ts) exactly, same computation, same
   * meaning — this is the field that was fetched here all along (`verification_state`,
   * selected below to filter out merged/inactive rows) and discarded before reaching the
   * caller, which is how `EntityCombobox` ended up unable to tell a verified link from a
   * self-added one: `entity-combobox.tsx`'s own "linked" indicator had only ever seen an
   * id, never this. Found 2026-09-02 during the onboarding audit — the label said
   * "Linked to a verified entry" for any linked entity at all.
   */
  isCustom: boolean;
}

/**
 * Re-verifies a client-submitted entity id server-side before it is ever written to an
 * achievement/profile row — never trusts the autocomplete result blindly. Confirms the
 * row exists AND that its entity type is one the target field accepts, so a `city` id
 * can never end up in an `organization_entity_id`.
 *
 * The database enforces the same rule independently (the
 * `enforce_canonical_entity_type` triggers), so this is defence in depth, not the only
 * gate — but checking here turns a raw Postgres exception into a message a student can
 * act on.
 *
 * Returns the entity's CURRENT display name, which the caller writes into the
 * denormalized text column to keep it in sync.
 */
export async function resolveCanonicalEntity(
  supabase: SupabaseClient<Database>,
  id: string,
  allowedTypes: readonly CanonicalEntityType[]
): Promise<ResolvedEntity | null> {
  if (!isUuidLike(id) || allowedTypes.length === 0) return null;
  const { data } = await supabase
    .from("canonical_entities")
    .select("id, display_name, entity_type, verification_state")
    .eq("id", id)
    .in("entity_type", [...allowedTypes])
    .maybeSingle();

  // A merged entity is a tombstone pointing at its replacement; linking to one would
  // freeze a row against an identity that no longer exists.
  if (!data || data.verification_state === "merged" || data.verification_state === "inactive") return null;
  return { id: data.id, canonicalName: data.display_name, isCustom: data.verification_state === "user_submitted" };
}

export async function resolveUniversity(supabase: SupabaseClient<Database>, id: string): Promise<ResolvedEntity | null> {
  if (!isUuidLike(id)) return null;
  // A client-submitted id could be a known-duplicate loser row (an old bookmark, a stale
  // client-side cache) — resolve to the canonical winner before the lookup, same defense as
  // addTargetUniversity, so a loser id can never end up denormalized into a profile field
  // even via this path. See lib/universities/canonical.ts.
  const supersessionMap = await loadSupersessionMap(supabase);
  const { data } = await supabase.from("universities").select("id, name").eq("id", canonicalUniversityId(supersessionMap, id)).maybeSingle();
  if (!data) return null;
  // Universities are a fully curated registry (field-policy.ts's own comment: no custom
  // fallback exists for this scope at all) — never user-submitted, so always verified.
  return { id: data.id, canonicalName: data.name, isCustom: false };
}

export async function resolveOpportunity(supabase: SupabaseClient<Database>, id: string): Promise<ResolvedEntity | null> {
  if (!isUuidLike(id)) return null;
  const { data } = await supabase.from("opportunities").select("id, title").eq("id", id).maybeSingle();
  if (!data) return null;
  // Same reasoning as resolveUniversity above — opportunities come from the discovery
  // pipeline, never a student-typed name.
  return { id: data.id, canonicalName: data.title, isCustom: false };
}

/** Scope-aware dispatcher for the generic EntityCombobox's own resolve call. Every
 * Server Action wiring a specific field still passes that field's own scope, so a
 * mismatch between the combobox's `scope` prop and the column it is bound to cannot
 * silently resolve against the wrong registry. */
export async function resolveEntity(supabase: SupabaseClient<Database>, scope: EntityScope, id: string): Promise<ResolvedEntity | null> {
  const definition = ENTITY_SCOPES[scope];
  if (definition.registry === "universities") return resolveUniversity(supabase, id);
  if (definition.registry === "opportunities") return resolveOpportunity(supabase, id);
  return resolveCanonicalEntity(supabase, id, definition.allowedTypes);
}

export interface CreateCustomEntityInput {
  scope: EntityScope;
  displayName: string;
  city: string | null;
  country: string | null;
}

/** A "did you mean" suggestion, deliberately not a `ResolvedEntity` — the duplicate-check
 * RPC below doesn't select `verification_state`, so there is no real `isCustom` to report
 * for these, and claiming one either way would repeat the exact bug this type change
 * exists to fix elsewhere. `EntityCombobox` treats a selection from this list as unknown
 * until its own entityId-resolve effect confirms the real state a moment later. */
export interface DuplicateCandidate {
  id: string;
  canonicalName: string;
}

export type CreateCustomEntityResult =
  | { status: "created"; entity: ResolvedEntity }
  | { status: "possible_duplicates"; candidates: DuplicateCandidate[] }
  | { status: "error"; error: string };

/** How close a search hit has to be before it is offered as "did you mean X?". The SQL
 * ranker scores an exact canonical match 1.0, an exact alias 0.995 and a prefix 0.97-0.98;
 * anything below this is a fuzzy trigram hit that is not confident enough to steer a
 * student away from adding a genuinely new entity. */
const DUPLICATE_SUGGESTION_SCORE = 0.9;

/**
 * The custom fallback: what happens when a student's school or employer genuinely is not
 * in the registry yet.
 *
 * Two things stop this from polluting the registry. First, a duplicate check runs before
 * creating anything, and a hit returns candidates for the student to choose from rather
 * than merging or blocking — entities are never auto-merged. Second, the write itself
 * goes through `create_or_resolve_user_submitted_entity`, which resolves alias-aware
 * against existing rows under an advisory lock and can only ever produce a
 * `user_submitted` row, queued for verification. A student cannot create a verified
 * entity through any path.
 */
export async function createCustomEntity(
  supabase: SupabaseClient<Database>,
  input: CreateCustomEntityInput,
  confirmDespiteDuplicates = false
): Promise<CreateCustomEntityResult> {
  const definition = ENTITY_SCOPES[input.scope];
  if (!definition.customFallbackType) {
    return { status: "error", error: "This field only accepts entries from Oryn's verified catalogue." };
  }

  const displayName = input.displayName.trim();
  const country = input.country?.trim() || null;
  const city = input.city?.trim() || null;

  const validationError = validateCustomEntityInput({ displayName });
  if (validationError === "empty_name") return { status: "error", error: "Enter a name." };
  if (validationError === "name_too_long") return { status: "error", error: "That name is too long." };

  if (!confirmDespiteDuplicates) {
    const { data: existing } = await supabase.rpc("search_canonical_entities", {
      q: displayName,
      p_entity_types: [...definition.allowedTypes],
      p_limit: 12,
    });

    const rows = (existing ?? []) as { entity_id: string; display_name: string; matched_text: string; country_code: string | null; city: string | null; score: number }[];
    // Two independent checks: the SQL ranker's own score, and the pure TS matcher over
    // the (already narrowed) hits. The TS pass sees `matched_text`, which is the alias
    // that matched when the hit came through one, so an abbreviation collision is caught
    // even though the display names look nothing alike.
    const highScoring = rows.filter((row) => row.score >= DUPLICATE_SUGGESTION_SCORE);
    const candidates: EntityCandidate[] = rows.map((row) => ({
      id: row.entity_id,
      canonicalName: row.display_name,
      aliases: row.matched_text && row.matched_text !== row.display_name ? [row.matched_text] : [],
      country: row.country_code,
      city: row.city,
    }));
    const fuzzyDuplicates = findPossibleDuplicates(displayName, candidates, { country, city });

    const duplicateIds = new Set([...highScoring.map((row) => row.entity_id), ...fuzzyDuplicates.map((c) => c.id)]);
    if (duplicateIds.size > 0) {
      const byId = new Map(rows.map((row) => [row.entity_id, row.display_name]));
      return {
        status: "possible_duplicates",
        candidates: [...duplicateIds].map((id) => ({ id, canonicalName: byId.get(id) ?? "" })).filter((c) => c.canonicalName),
      };
    }
  }

  const { data, error } = await supabase.rpc("create_or_resolve_user_submitted_entity", {
    p_entity_type: definition.customFallbackType,
    p_display_name: displayName,
    p_country_code: country,
    p_city: city,
  });

  if (error) {
    console.error("[entities] custom fallback failed", { scope: input.scope, code: error.code, message: error.message });
    return { status: "error", error: "Couldn't add that. Please try again." };
  }

  const created = (data ?? [])[0] as { entity_id: string; created_new: boolean } | undefined;
  if (!created) return { status: "error", error: "Couldn't add that. Please try again." };

  // The RPC resolves to an existing entity when the name (or one of its aliases) already
  // matches — created_new=false. Either way the student gets a real canonical id back,
  // which is the outcome they asked for, so this is a success, not a duplicate warning.
  const resolved = await resolveCanonicalEntity(supabase, created.entity_id, definition.allowedTypes);
  if (!resolved) return { status: "error", error: "Couldn't add that. Please try again." };

  return { status: "created", entity: resolved };
}
