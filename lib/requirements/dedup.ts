import { normalizeTitle, titleSimilarity } from "@/lib/opportunities/dedup";
import type { RequirementCategory } from "@/types/database";

const SIMILARITY_THRESHOLD = 0.6;

export interface RequirementDedupCandidate {
  category: RequirementCategory;
  title: string;
  programId: string | null;
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
  return normalizeTitle(a.title) === normalizeTitle(b.title) || titleSimilarity(a.title, b.title) >= SIMILARITY_THRESHOLD;
}
