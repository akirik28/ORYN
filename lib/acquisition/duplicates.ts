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

/** Lowercased, diacritic-stripped, whitespace-collapsed. `\s` matches U+00A0 (non-breaking
 * space) under the ECMAScript spec, so this also folds that in — the exact character a
 * live pair ("Università di Padova" / "Università di Padova") turned out to differ by. */
function foldForComparison(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Two cities are compatible when they are the same place written differently — the exact
 * drift this registry has seen: "Boston" / "Boston, MA", "Newcastle" / "Newcastle CBD", and
 * (diacritic-only) "Tübingen" / "Tubingen", "São Paulo" / "Sao Paulo". NOT compatible does
 * not by itself prove two different institutions (a name+city collision alone is still not
 * the SAFE bar), it only removes "city" as corroborating evidence for a match.
 */
export function citiesCompatible(cityA: string | null, cityB: string | null): boolean {
  if (!cityA || !cityB) return true; // no evidence either way
  const a = foldForComparison(cityA);
  const b = foldForComparison(cityB);
  if (a === b) return true;
  const segsA = a.split(",").map((s) => s.trim());
  const segsB = b.split(",").map((s) => s.trim());
  return segsA[0] === segsB[0] || segsA.includes(b) || segsB.includes(a);
}

/**
 * True when two canonical names are the SAME string, differing only by Unicode encoding
 * noise — composition form (NFC vs NFD), presence/absence of a diacritic, or whitespace
 * character type — never by an added or removed WORD. This is deliberately much narrower
 * than "shares a nameVariant/nameKey" (which also treats "The X" vs "X" and "X (ABBR)" vs
 * "X" as related): those involve a real textual difference a human would notice; this does
 * not — the two strings render pixel-identically and no reasonable reading could take them
 * for different institutions. Found live: 26 of 28 name-variant pairs in one pass turned out
 * to be exactly this (registry rows imported twice from sources using different Unicode
 * normalization), not genuine near-duplicates.
 *
 * A stricter fold than citiesCompatible's on purpose — this one must never fold away an
 * actual word (dropping "the"/expanding "&", the way nameKey does for search purposes),
 * because doing so here would silently widen this function into the fuzzy name-similarity
 * matching this product's rules forbid using as merge evidence.
 */
export function isPureEncodingVariant(nameA: string, nameB: string): boolean {
  return foldForComparison(nameA) === foldForComparison(nameB);
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

  // A pure encoding variant (same name, differing only by Unicode noise — see
  // isPureEncodingVariant's own docs) is strong diagnostic signal, surfaced in the evidence
  // text below regardless of bucket — but it is deliberately NOT wired to SAFE_TO_CANONICALIZE
  // on its own. This module's one external-verification bar (an agreeing ROR id) exists
  // specifically so "how confident does the name/city match look" is never the thing that
  // authorizes a merge, no matter how obviously true it seems — the same principle that kept
  // migration 0039's 43 identical-normalized_name pairs queued for human review instead of
  // auto-merged, even though the architects were themselves confident they're duplicates.
  const pureEncodingVariant = isPureEncodingVariant(a.canonicalName, b.canonicalName) && citiesCompatible(a.city, b.city);

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
    evidence.push(
      pureEncodingVariant
        ? `Pure Unicode-encoding-variant name collision (no external ids on either side to confirm — still not auto-merged without one): "${a.canonicalName}" / "${b.canonicalName}".`
        : `Name-variant collision only (no external ids on either side to confirm): "${a.canonicalName}" / "${b.canonicalName}".`
    );
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
