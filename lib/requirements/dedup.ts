import { normalizeTitle, titleSimilarity } from "@/lib/opportunities/dedup";
import type { RequirementCategory } from "@/types/database";

const SIMILARITY_THRESHOLD = 0.6;

export interface RequirementDedupCandidate {
  category: RequirementCategory;
  title: string;
  programId: string | null;
}

/** Every number appearing in a title, as a sorted multiset. */
function numericTokens(title: string): string[] {
  return (title.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", ".")).sort();
}

/**
 * Whether two requirement titles state the SAME fact, as opposed to merely reading alike.
 *
 * Word-overlap similarity alone gets this wrong on exactly the data the corpus is full of.
 * The University of Edinburgh publishes both
 *
 *   "TOEFL-iBT (including Home Edition) from 21 January 2026: total 4.5 with at least 4.0 …"
 *   "TOEFL-iBT (including Home Edition) before 21 January 2026: total 92 with at least 20 …"
 *
 * (REQ-2026-08-21-4004 and REQ-2026-08-21-4010). They share ~0.68 Jaccard similarity — well
 * over the threshold — while being two different thresholds on two different score scales,
 * split by ETS's rescale date. Merging them discards the route a student with a pre-2026
 * certificate actually qualifies under, and leaves them measured against the wrong scale.
 *
 * So similarity is necessary but not sufficient: for threshold facts the NUMBER is the fact,
 * and two titles carrying different numbers are never the same fact however alike they read.
 * Titles with no numbers at all are unaffected, which is the case the Jaccard match was
 * introduced for ("Minimum GPA" vs "Minimum GPA requirement").
 *
 * This also settles the disagreement migration 0056 would otherwise leave open: 0056 keys
 * its unique index on md5(title), deliberately accepting an occasional visible near-duplicate
 * over systemic silent loss. Fuzzy dedup that merges different numbers makes the opposite
 * trade, and the DB constraint can no longer catch it because the two rows never collide.
 */
export function statesTheSameFact(a: string, b: string): boolean {
  if (normalizeTitle(a) === normalizeTitle(b)) return true;
  if (titleSimilarity(a, b) < SIMILARITY_THRESHOLD) return false;
  const [na, nb] = [numericTokens(a), numericTokens(b)];
  return na.length === nb.length && na.every((value, i) => value === nb[i]);
}

/**
 * Two requirement candidates are the same fact if they're attached to the same
 * program-scope (or both university-wide), the same category, and highly similar titles —
 * reuses the same Jaccard-similarity title match lib/opportunities/dedup.ts already
 * validates (e.g. "Minimum GPA" vs "Minimum GPA requirement") rather than re-implementing
 * fuzzy matching a second time.
 */
export function isDuplicateRequirement(a: RequirementDedupCandidate, b: RequirementDedupCandidate): boolean {
  if (a.programId !== b.programId) return false;
  if (a.category !== b.category) return false;
  return statesTheSameFact(a.title, b.title);
}
