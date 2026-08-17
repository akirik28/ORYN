/**
 * Matching an external registry record to one of our universities — and refusing to guess.
 *
 * This is the gate that keeps ORYN on one entity identity system. Every acquired fact has to
 * attach to an existing `universities` row (and through it, an existing `canonical_entities`
 * row). A pipeline that cannot confidently tell which university a record describes must
 * report `unresolved` and move on; it must never create a new university row to hold the
 * fact, because that is how a registry ends up with two of the same institution and a
 * student sees the same university twice with different data on each card.
 *
 * The match is deliberately conservative. Name similarity alone is never sufficient: country
 * must agree too, because "University of Manchester" and "Manchester Metropolitan" style
 * near-collisions, and genuinely distinct same-name institutions in different countries, are
 * both real. Where an external id (Wikidata, GRID) is already stored on our side, that beats
 * any name comparison and is used first.
 */

import { nameKey, nameVariants, sameCountry } from "./normalize";

export type IdentityMatchMethod = "external_id" | "exact_name" | "variant_name" | "alias_name";

export interface IdentityMatch {
  /** Our university row id. */
  universityId: string;
  method: IdentityMatchMethod;
  /** What the match was made against, for the import report. */
  matchedOn: string;
}

export type IdentityResolution =
  | { status: "matched"; match: IdentityMatch }
  | { status: "unresolved"; reason: string };

/** The minimum a caller must know about one of our universities to match against it. */
export interface LocalUniversity {
  id: string;
  name: string;
  country: string;
  /** Alias strings already attached to this university's canonical entity. */
  aliases?: readonly string[];
  /** External ids already stored, keyed the same way ROR keys them ("wikidata", "grid", ...). */
  externalIds?: Readonly<Record<string, string>>;
}

/** What an external record offers for matching. */
export interface ExternalIdentity {
  displayName: string;
  /** Every name form the registry publishes, including localised labels and acronyms. */
  names: readonly string[];
  /** Resolved country *name* — callers convert a registry's ISO code first. */
  countryName: string | null;
  externalIds?: Readonly<Record<string, string>>;
}

/**
 * Resolve `external` against `candidates`.
 *
 * Returns `unresolved` — never a best guess — when the evidence is ambiguous: no country on
 * the external record, a country mismatch, no name overlap, or more than one candidate
 * matching equally well. Each of those carries a distinct reason so the import report says
 * *why* a record could not be placed, which is what makes the unresolved list actionable
 * instead of a black box.
 */
export function resolveIdentity(external: ExternalIdentity, candidates: readonly LocalUniversity[]): IdentityResolution {
  if (candidates.length === 0) return { status: "unresolved", reason: "No local university candidates supplied." };

  // 1. External ids are decisive when both sides have one. No name comparison can outrank
  //    a registry id that already sits on our row.
  const externalIds = external.externalIds ?? {};
  for (const [type, value] of Object.entries(externalIds)) {
    const hits = candidates.filter((c) => c.externalIds?.[type] && c.externalIds[type] === value);
    if (hits.length === 1) {
      return { status: "matched", match: { universityId: hits[0].id, method: "external_id", matchedOn: `${type}=${value}` } };
    }
    if (hits.length > 1) {
      return { status: "unresolved", reason: `Multiple local universities claim ${type}=${value}; needs a human merge decision first.` };
    }
  }

  // 2. Country must be known and must agree. Without it, a name match is not enough.
  if (!external.countryName) {
    return { status: "unresolved", reason: `Registry record for "${external.displayName}" has no resolvable country; name-only matching is not accepted.` };
  }
  const sameCountryCandidates = candidates.filter((c) => sameCountry(c.country, external.countryName!));
  if (sameCountryCandidates.length === 0) {
    return {
      status: "unresolved",
      reason: `No local university in ${external.countryName} to match "${external.displayName}" against (candidate countries: ${[...new Set(candidates.map((c) => c.country))].join(", ")}).`,
    };
  }

  const externalKeys = new Set(
    external.names
      .flatMap((n) => nameVariants(n))
      .map(nameKey)
      .filter(Boolean)
  );

  // 3. Exact canonical-name match within the country.
  const exact = sameCountryCandidates.filter((c) => externalKeys.has(nameKey(c.name)));
  if (exact.length === 1) {
    return { status: "matched", match: { universityId: exact[0].id, method: "exact_name", matchedOn: exact[0].name } };
  }
  if (exact.length > 1) {
    return {
      status: "unresolved",
      reason: `"${external.displayName}" matches ${exact.length} local universities in ${external.countryName} by name (${exact.map((c) => c.name).join(" | ")}); duplicates must be merged before enrichment.`,
    };
  }

  // 4. Our own name variants against the registry's names.
  const variant = sameCountryCandidates.filter((c) => nameVariants(c.name).map(nameKey).some((k) => externalKeys.has(k)));
  if (variant.length === 1) {
    return { status: "matched", match: { universityId: variant[0].id, method: "variant_name", matchedOn: variant[0].name } };
  }
  if (variant.length > 1) {
    return { status: "unresolved", reason: `"${external.displayName}" matches ${variant.length} local universities by name variant; ambiguous.` };
  }

  // 5. Stored aliases last — they are the loosest signal, so they only decide when nothing
  //    stronger did, and still only within the matching country.
  const alias = sameCountryCandidates.filter((c) => (c.aliases ?? []).map(nameKey).some((k) => externalKeys.has(k)));
  if (alias.length === 1) {
    return { status: "matched", match: { universityId: alias[0].id, method: "alias_name", matchedOn: `alias of ${alias[0].name}` } };
  }
  if (alias.length > 1) {
    return { status: "unresolved", reason: `"${external.displayName}" matches ${alias.length} local universities by alias; ambiguous.` };
  }

  return {
    status: "unresolved",
    reason: `No name, variant, or alias overlap between "${external.displayName}" and any local university in ${external.countryName}.`,
  };
}

/**
 * Cross-check a registry's city/country against ours for an already-matched university.
 *
 * Returns the disagreements rather than fixing them: a country mismatch on a row we matched
 * by external id is a genuine data-quality signal worth a human look, not something a
 * pipeline should silently overwrite in either direction.
 */
export function compareLocation(
  local: { city: string | null; country: string },
  external: { city: string | null; countryName: string | null }
): { countryAgrees: boolean | null; cityAgrees: boolean | null } {
  const countryAgrees = external.countryName ? sameCountry(local.country, external.countryName) : null;
  const cityAgrees = local.city && external.city ? nameKey(local.city) === nameKey(external.city) : null;
  return { countryAgrees, cityAgrees };
}
