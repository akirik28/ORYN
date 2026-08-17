/**
 * The staging-fixture contract between acquisition and import.
 *
 * Acquisition (scripts/acquire-university-facts.ts) produces one of these; import
 * (scripts/import-university-facts.ts) consumes it. Keeping a reviewable artefact between
 * the two is the point: a batch can be diffed, inspected, and rejected before it touches
 * real rows, and the same fixture re-applied later is provably idempotent because the
 * importer's decisions depend only on the fixture and the current database state.
 *
 * The Zod schema is the enforcement, not the TypeScript types — a fixture is data read from
 * disk, so it gets validated at the boundary. Every provenance field is required: there is
 * no way to express a fact without a source URL, a scope, a retrieval time, and a
 * verification state, because a fact missing any of those must not reach the database.
 */

import { z } from "zod";

export const FACT_CLASSES = ["identity", "population", "cost", "policy", "programs", "research_strength"] as const;

export const VERIFICATION_STATES = [
  "verified_current",
  "verified_historical",
  "verified_derived",
  "unverified",
  "conflicting",
  "stale",
  "unresolved",
] as const;

/**
 * How a fact is allowed to interact with an existing stored value.
 *
 * Date-based precedence alone is not sufficient, because "newer" and "better" are not the
 * same thing. A registry record modified this year can still carry a *worse* value than the
 * one we already hold: ROR's geonames city for the University of Cape Town is "Rondebosch"
 * and for HKU is "Pok Fu Lam" — administratively correct, useless on a student-facing card,
 * and a straight regression over "Cape Town" and "Hong Kong". So each fact declares what it
 * may do, and the importer honours that before it ever consults dates.
 */
export const WRITE_POLICIES = [
  /** Only ever fills a null. Never replaces an existing value, however new the source. */
  "fill_if_null",
  /** Normal precedence: a newer, same-or-stronger source may replace the stored value. */
  "supersede_by_date",
  /** Never written at all. Compared against the stored value; disagreements are reported. */
  "cross_check_only",
] as const;

export const AcquiredFactSchema = z.object({
  /** Target column or metric code, e.g. "website_url", "research_topics_top5". */
  field: z.string().min(1),
  value: z.union([z.string().min(1), z.number()]),
  factClass: z.enum(FACT_CLASSES),
  writePolicy: z.enum(WRITE_POLICIES),
  /** What population/period the value covers. Never assume "institution" — a system-wide
   * total misread as one campus's is a real failure mode, so scope is mandatory. */
  scope: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceType: z.enum(["official_primary", "open_registry", "third_party_structured"]),
  sourceTier: z.enum(["HIGH", "MEDIUM"]),
  /** The date/year the source states its value is for. Null when the source gives none —
   * which is itself meaningful, and is why this is nullable rather than defaulted to today. */
  sourceAsOf: z.string().nullable(),
  retrievedAt: z.string().datetime(),
  verificationState: z.enum(VERIFICATION_STATES),
  notes: z.string().nullable(),
});
export type AcquiredFact = z.infer<typeof AcquiredFactSchema>;

export const AcquiredUniversitySchema = z.object({
  /** The name/country the roster declared. Kept verbatim so a mismatch against the live row
   * is visible in the import report rather than silently normalised away. */
  declaredName: z.string().min(1),
  declaredCountry: z.string().min(1),
  rorId: z.string().url(),
  rorDisplayName: z.string().min(1),
  rorCountryName: z.string().nullable(),
  rorLastModified: z.string().nullable(),
  /** Cross-registry ids, keyed as ROR keys them ("ror", "grid", "isni", "wikidata", "fundref"). */
  externalIds: z.record(z.string(), z.string()),
  aliases: z.array(z.string()),
  acronyms: z.array(z.string()),
  facts: z.array(AcquiredFactSchema),
});
export type AcquiredUniversity = z.infer<typeof AcquiredUniversitySchema>;

export const AcquisitionFixtureSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  generator: z.string().min(1),
  sources: z.array(
    z.object({
      name: z.string().min(1),
      api: z.string().url(),
      licence: z.string().min(1),
      factClasses: z.array(z.enum(FACT_CLASSES)),
    })
  ),
  universities: z.array(AcquiredUniversitySchema),
  /** Records acquisition could not confidently place. Kept in the artefact on purpose: an
   * unresolved list that is thrown away becomes an unresolved list that is retried forever. */
  unresolved: z.array(
    z.object({
      declaredName: z.string().min(1),
      declaredCountry: z.string().min(1),
      reason: z.string().min(1),
    })
  ),
});
export type AcquisitionFixture = z.infer<typeof AcquisitionFixtureSchema>;

export interface FixtureValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    universities: number;
    facts: number;
    unresolved: number;
    byField: Record<string, number>;
    byVerificationState: Record<string, number>;
  };
}

/**
 * Validate a fixture's shape *and* its internal consistency.
 *
 * The schema catches missing provenance. These extra checks catch the subtler failures that
 * a schema cannot express — a fact claiming to be verified from a source tier that cannot
 * support it, a duplicate field/scope pair that would make the import non-deterministic, or
 * a `sourceAsOf` in the future. Runs with no database access, so it is the meaningful
 * pre-flight available while `SUPABASE_SECRET_KEY` is unset.
 */
export function validateFixture(raw: unknown, now: Date = new Date()): FixtureValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = AcquisitionFixtureSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
      warnings,
      stats: { universities: 0, facts: 0, unresolved: 0, byField: {}, byVerificationState: {} },
    };
  }

  const fixture = parsed.data;
  const byField: Record<string, number> = {};
  const byVerificationState: Record<string, number> = {};
  let facts = 0;
  const seenRor = new Set<string>();

  for (const uni of fixture.universities) {
    if (seenRor.has(uni.rorId)) {
      errors.push(`Duplicate ROR id ${uni.rorId} appears twice in the fixture (second: "${uni.declaredName}").`);
    }
    seenRor.add(uni.rorId);

    if (uni.rorCountryName && uni.rorCountryName !== uni.declaredCountry) {
      warnings.push(`${uni.declaredName}: declared country "${uni.declaredCountry}" vs registry "${uni.rorCountryName}" — importer will cross-check.`);
    }

    const seenKeys = new Set<string>();
    for (const fact of uni.facts) {
      facts += 1;
      byField[fact.field] = (byField[fact.field] ?? 0) + 1;
      byVerificationState[fact.verificationState] = (byVerificationState[fact.verificationState] ?? 0) + 1;

      const key = `${fact.field}::${fact.scope}`;
      if (seenKeys.has(key)) {
        errors.push(`${uni.declaredName}: two facts for ${key} — import order would decide the winner, which must never happen.`);
      }
      seenKeys.add(key);

      if (fact.verificationState === "verified_current" && fact.sourceTier !== "HIGH" && fact.sourceType !== "third_party_structured") {
        errors.push(`${uni.declaredName}/${fact.field}: verified_current from tier ${fact.sourceTier} via ${fact.sourceType}.`);
      }

      if (fact.sourceAsOf) {
        const asOfYear = Number(fact.sourceAsOf.slice(0, 4));
        if (Number.isFinite(asOfYear) && asOfYear > now.getUTCFullYear() + 1) {
          errors.push(`${uni.declaredName}/${fact.field}: sourceAsOf year ${asOfYear} is in the future.`);
        }
      } else {
        warnings.push(`${uni.declaredName}/${fact.field}: source states no date; cannot be published as current without one.`);
      }

      if (Date.parse(fact.retrievedAt) > now.getTime() + 60_000) {
        errors.push(`${uni.declaredName}/${fact.field}: retrievedAt is in the future.`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: { universities: fixture.universities.length, facts, unresolved: fixture.unresolved.length, byField, byVerificationState },
  };
}
