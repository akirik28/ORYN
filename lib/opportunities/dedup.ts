export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/$/, "");
    return `${host}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Jaccard similarity over normalized-title word sets — good enough to catch "Economics
 * Challenge 2027" vs "The Economics Challenge — 2027!" without a fuzzy-match dependency. */
export function titleSimilarity(a: string, b: string): number {
  const setA = new Set(normalizeTitle(a).split(" ").filter(Boolean));
  const setB = new Set(normalizeTitle(b).split(" ").filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionSize = 0;
  for (const word of setA) {
    if (setB.has(word)) intersectionSize += 1;
  }
  const unionSize = new Set([...setA, ...setB]).size;
  return intersectionSize / unionSize;
}

const SIMILARITY_THRESHOLD = 0.6;

export interface DedupCandidate {
  title: string;
  organization: string | null;
  officialUrl: string | null;
}

/**
 * Two candidates are the same opportunity if they share a canonical URL, or if they're
 * from the same organization with highly similar titles (catches the same competition
 * re-crawled with a slightly different title, e.g. a year suffix).
 */
export function isDuplicateOpportunity(a: DedupCandidate, b: DedupCandidate): boolean {
  if (a.officialUrl && b.officialUrl && normalizeUrl(a.officialUrl) === normalizeUrl(b.officialUrl)) {
    return true;
  }

  const orgA = (a.organization ?? "").trim().toLowerCase();
  const orgB = (b.organization ?? "").trim().toLowerCase();
  if (orgA && orgA === orgB && titleSimilarity(a.title, b.title) >= SIMILARITY_THRESHOLD) {
    return true;
  }

  return false;
}
