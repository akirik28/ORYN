/**
 * Pure classification core for university canonical-entity duplicate detection
 * (scripts/university-duplicates-audit.ts — spec Phase 2, University Intelligence Spine).
 *
 * Extracted from the script so the actual decision rule is unit tested without a database:
 * the failure mode this guards against is silent — a classifier that got looser over time
 * (or a copy-paste variant of it elsewhere) auto-merging two real, different institutions
 * that happen to share a name, or failing to flag a genuine duplicate because a field was
 * read from the wrong side of the pair.
 *
 * No `import "server-only"` — reused by both the Next.js app (if a future admin surface
 * wants this) and the plain `tsx` script, same constraint as the rest of lib/acquisition/.
 */

export type DuplicateClassification = "SAFE_TO_CANONICALIZE" | "LIKELY_DUPLICATE_REQUIRES_REVIEW" | "NOT_DUPLICATE" | "AMBIGUOUS";

export interface ExternalIdLike {
  id_system: string;
  external_id: string;
}

export interface CanonicalEntityLike {
  id: string;
  canonicalName: string;
  countryCode: string | null;
  city: string | null;
}

export interface DuplicateClassificationResult {
  classification: DuplicateClassification;
  evidence: string[];
}

/**
 * Two cities are compatible when they are the same place written differently — the exact
 * drift this registry has seen twice now: "Boston" / "Boston, MA", "Newcastle" / "Newcastle
 * CBD". NOT compatible does not by itself prove two different institutions (a name+city
 * collision alone is still not the SAFE bar), it only removes "city" as corroborating
 * evidence for a match.
 */
export function citiesCompatible(cityA: string | null, cityB: string | null): boolean {
  if (!cityA || !cityB) return true; // no evidence either way
  const a = cityA.toLowerCase().trim();
  const b = cityB.toLowerCase().trim();
  if (a === b) return true;
  const segsA = a.split(",").map((s) => s.trim());
  const segsB = b.split(",").map((s) => s.trim());
  return segsA[0] === segsB[0] || segsA.includes(b) || segsB.includes(a);
}

/**
 * Classify a candidate duplicate pair from real stored evidence — never from name
 * similarity alone. `nameVariantOnly` marks a pair found by article/parenthetical-aware
 * name matching rather than an exact `normalized_name` collision: real, but on its own
 * still short of the SAFE bar for an unattended future run of this classifier (a human/
 * agent confirming against a live registry is what actually clears that bar — see
 * scripts/university-duplicates-audit.ts's MANUALLY_VERIFIED list).
 */
export function classifyDuplicateCandidate(
  a: CanonicalEntityLike,
  b: CanonicalEntityLike,
  idsA: ExternalIdLike[],
  idsB: ExternalIdLike[],
  opts: { nameVariantOnly: boolean }
): DuplicateClassificationResult {
  const evidence: string[] = [];
  let classification: DuplicateClassification;

  const bySystemA = new Map(idsA.map((r) => [r.id_system, r.external_id]));
  const bySystemB = new Map(idsB.map((r) => [r.id_system, r.external_id]));
  const sharedSystems = [...bySystemA.keys()].filter((s) => bySystemB.has(s));
  const agreeing = sharedSystems.filter((s) => bySystemA.get(s) === bySystemB.get(s));
  const conflicting = sharedSystems.filter((s) => bySystemA.get(s) !== bySystemB.get(s));

  if (a.countryCode && b.countryCode && a.countryCode !== b.countryCode) {
    classification = "NOT_DUPLICATE";
    evidence.push(`country_code differs: "${a.countryCode}" vs "${b.countryCode}".`);
  } else if (conflicting.length > 0) {
    classification = "NOT_DUPLICATE";
    for (const s of conflicting) evidence.push(`${s} conflicts: "${bySystemA.get(s)}" vs "${bySystemB.get(s)}".`);
  } else if (agreeing.includes("ROR")) {
    classification = "SAFE_TO_CANONICALIZE";
    evidence.push(`Identical ROR id: ${bySystemA.get("ROR")}.`);
  } else if (agreeing.length > 0) {
    classification = "LIKELY_DUPLICATE_REQUIRES_REVIEW";
    evidence.push(`Agrees on ${agreeing.join(", ")} (no ROR on one/both sides to reach SAFE tier).`);
  } else if (opts.nameVariantOnly) {
    classification = "LIKELY_DUPLICATE_REQUIRES_REVIEW";
    evidence.push(`Name-variant collision only (no external ids on either side to confirm): "${a.canonicalName}" / "${b.canonicalName}".`);
  } else {
    classification = "AMBIGUOUS";
    evidence.push(`No shared external id system yet (A has ${[...bySystemA.keys()].join("/") || "none"}; B has ${[...bySystemB.keys()].join("/") || "none"}).`);
  }

  if (!citiesCompatible(a.city, b.city)) {
    evidence.push(`Cities look genuinely different: "${a.city}" vs "${b.city}" (not just formatting).`);
  } else if (a.city && b.city) {
    evidence.push(`Cities consistent: "${a.city}" / "${b.city}".`);
  }

  return { classification, evidence };
}
