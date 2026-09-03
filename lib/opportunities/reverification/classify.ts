import type { ReverificationCandidate } from "./types";

/** Design doc §7.2 guard 1: rockefeller.edu returned 0 bytes, a JS-rendered page returns a
 * shell — below this floor, "no closure language found" would silently mean "we read
 * nothing," not "the page says nothing about closing." */
export const CONTENT_LENGTH_FLOOR = 500;

export function passesContentFloor(content: string): boolean {
  return content.trim().length >= CONTENT_LENGTH_FLOOR;
}

/**
 * Design doc §7.2 guard 2: the content must contain a recognisable token from the
 * opportunity's title or organization, or we may have fetched a redirect, a cookie wall, or
 * a 404 rendered with HTTP 200. Deliberately loose (any single meaningful word, not the
 * whole phrase) — the guard exists to catch "this page has nothing to do with the
 * opportunity at all," not to demand an exact-title match a real page is never going to give
 * verbatim.
 *
 * Words under 4 characters are excluded from the candidate set (design doc has no
 * corpus-measured floor for this; 4 is chosen so the check isn't satisfied by an incidental
 * "the"/"and"/"for" match against unrelated content) — a title/organization with no word
 * that long falls through to requiring the full lowercase phrase, which a real page about
 * the opportunity should still contain.
 */
export function passesPageIdentity(content: string, opportunity: Pick<ReverificationCandidate, "title" | "officialUrl">, organization: string | null): boolean {
  const haystack = content.toLowerCase();
  const candidates = [opportunity.title, organization ?? ""]
    .flatMap((s) => s.split(/\s+/))
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w.length >= 4);

  if (candidates.length === 0) {
    const fullTitle = opportunity.title.trim().toLowerCase();
    return fullTitle.length > 0 && haystack.includes(fullTitle);
  }
  return candidates.some((word) => haystack.includes(word.toLowerCase()));
}

/** Design doc §7.2 guard 3: no date-like token and no application vocabulary anywhere means
 * the page has not answered our question — treat as P2, not "no closure language found". */
const APPLICATION_VOCABULARY = [
  "apply",
  "application",
  "applicant",
  "deadline",
  "eligib",
  "admission",
  "enroll",
  "enrol",
  "registration",
  "register",
];
const DATE_LIKE = /\b\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b/i;

export function passesApplicationVocabulary(content: string): boolean {
  const haystack = content.toLowerCase();
  return DATE_LIKE.test(content) || APPLICATION_VOCABULARY.some((word) => haystack.includes(word));
}

export type ContentGuardFailure = "content_too_short" | "identity_mismatch" | "no_application_vocabulary";

/** All three §7.2 guards in the order the design doc presents them. Returns the first
 * failure, or null when every guard passes. A 200 that fails any one of these is P2 per
 * §7.2's own framing ("A 200 response is not a successful read"), never parsed further. */
export function checkContentGuards(
  content: string,
  opportunity: Pick<ReverificationCandidate, "title" | "officialUrl">,
  organization: string | null
): ContentGuardFailure | null {
  if (!passesContentFloor(content)) return "content_too_short";
  if (!passesPageIdentity(content, opportunity, organization)) return "identity_mismatch";
  if (!passesApplicationVocabulary(content)) return "no_application_vocabulary";
  return null;
}

// Design doc §5.1's fixed phrase set, verbatim.
const CLOSURE_PHRASES = ["applications are closed", "applications now closed", "no longer accepting", "deadline has passed", "check back"];
const OPENING_PHRASES = ["applications open", "apply by", "deadline:"];

export interface PhraseMatch {
  phrase: string;
  /** The literal substring of `content` surrounding the match, trimmed — always usable
   * directly as `matched_excerpt` (design doc §8.3's excerpt-or-nothing rule; this is
   * mechanically a substring of what was fetched, by construction, not an LLM's summary of
   * one). */
  excerpt: string;
}

function findPhrases(content: string, phrases: string[]): PhraseMatch[] {
  const haystack = content.toLowerCase();
  const matches: PhraseMatch[] = [];
  for (const phrase of phrases) {
    const index = haystack.indexOf(phrase);
    if (index === -1) continue;
    const start = Math.max(0, index - 80);
    const end = Math.min(content.length, index + phrase.length + 80);
    matches.push({ phrase, excerpt: content.slice(start, end).trim() });
  }
  return matches;
}

export function findClosurePhrases(content: string): PhraseMatch[] {
  return findPhrases(content, CLOSURE_PHRASES);
}

export function findOpeningPhrases(content: string): PhraseMatch[] {
  return findPhrases(content, OPENING_PHRASES);
}

// A conservative, explicit-format-only date extractor — design doc §5.1 step 3 ("regex date
// candidates"), not a general natural-language date parser. Every match is, by construction,
// a literal substring of `content`, so it always satisfies §8.3's excerpt-or-nothing rule
// without further checking.
const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/g;
const MONTH_DAY_YEAR = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/gi;
const DAY_MONTH_YEAR = /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/gi;

export function findDateCandidates(content: string): string[] {
  const found = new Set<string>();
  for (const pattern of [ISO_DATE, MONTH_DAY_YEAR, DAY_MONTH_YEAR]) {
    for (const match of content.matchAll(pattern)) found.add(match[0]);
  }
  return [...found];
}

/**
 * Design doc §8.3's anti-fabrication rule, stated for the exact shape already observed:
 * "three programmes given '2027' dates that were mechanically the real 2026 date plus one."
 * A detected date exactly one year after the stored deadline is rejected UNLESS it appears
 * verbatim in the fetched content — which, per findDateCandidates above, every real
 * detection already does by construction. This function exists as a second, independent
 * check for a value arriving from anywhere else (e.g. an LLM adjudication result, which does
 * not extract by regex and so does not get this guarantee for free).
 */
export function isFabricatedPlusOneYear(storedDeadline: string | null, detectedDeadline: string | null, content: string): boolean {
  if (!storedDeadline || !detectedDeadline) return false;
  const stored = new Date(`${storedDeadline}T00:00:00Z`);
  const detected = new Date(`${detectedDeadline}T00:00:00Z`);
  if (Number.isNaN(stored.getTime()) || Number.isNaN(detected.getTime())) return false;

  const plusOneYear = new Date(Date.UTC(stored.getUTCFullYear() + 1, stored.getUTCMonth(), stored.getUTCDate()));
  const isPlusOneYear = detected.getTime() === plusOneYear.getTime();
  if (!isPlusOneYear) return false;

  return !content.includes(detectedDeadline);
}

/** Design doc §8.3's excerpt-or-nothing rule: any P1 claim must carry a non-empty excerpt
 * that is a literal substring of the fetched content. Checked at the one place a P1 verdict
 * can be produced, not trusted from a caller. */
export function hasValidExcerpt(excerpt: string | null, content: string): boolean {
  return Boolean(excerpt && excerpt.length > 0 && content.includes(excerpt));
}

export type DeterministicVerdict =
  /** Stored state and page content agree — eligible for p1_confirmed once §8.5's remaining
   * preconditions (excerpt, positive support) are also satisfied. */
  | { kind: "agrees"; excerpt: string; detectedDeadline: string | null }
  /** The deterministic pass found signal contradicting stored state — this alone is not a
   * verdict (design doc §5.1: a model adjudicates disagreement, never the common path). The
   * caller routes this to ./adjudicate.ts. */
  | { kind: "disagreement"; excerpt: string; closureFound: boolean; openingFound: boolean; detectedDeadline: string | null }
  /** Content read fine (passed all three guards) but says nothing bearing on whether the
   * cycle is running — design doc §7.6 mechanism 1: an eligibility paragraph, a fee table
   * and a contact address are all liveness-silent. This is P2, not P1, even though the guards
   * passed — ISSYP's exact shape. */
  | { kind: "liveness_silent" };

/**
 * The deterministic classification pass (design doc §5.1 steps 2-4), assuming the three
 * content guards in checkContentGuards already passed — this function does not re-check
 * them. Absence of closure language is never read as evidence of opening (§7.2 guard 3 /
 * §7.6 mechanism 2) — the "agrees" case requires the page to *positively* state something
 * about the stored cycle, not merely fail to contradict it.
 */
export function classifyAgainstStoredState(
  content: string,
  stored: Pick<ReverificationCandidate, "cycleStatus" | "deadline">
): DeterministicVerdict {
  const closureMatches = findClosurePhrases(content);
  const openingMatches = findOpeningPhrases(content);
  const dateCandidates = findDateCandidates(content);
  const detectedDeadline = dateCandidates.length > 0 ? dateCandidates[0] : null;

  const stateImpliesOpen = stored.cycleStatus === "open" || stored.cycleStatus === "upcoming";
  const stateImpliesClosed = stored.cycleStatus === "closed" || stored.cycleStatus === "historical" || stored.cycleStatus === "discontinued";

  const closureFound = closureMatches.length > 0;
  const openingFound = openingMatches.length > 0;

  // §7.6's "2026 closed / 2027 announced" ambiguity: closure language coexisting with a
  // positive opening signal is not a stored-vs-page disagreement, it's a cycle transition —
  // treated as agreement with whatever the page's OPENING signal says, since that's the
  // forward-looking, decision-critical fact (design doc §9's demotion envelope separately
  // requires "no future-dated application signal on the same page" before ever demoting).
  if (closureFound && openingFound) {
    return { kind: "agrees", excerpt: openingMatches[0].excerpt, detectedDeadline };
  }

  if (closureFound && stateImpliesOpen) {
    return { kind: "disagreement", excerpt: closureMatches[0].excerpt, closureFound: true, openingFound: false, detectedDeadline };
  }
  if (openingFound && stateImpliesClosed) {
    return { kind: "disagreement", excerpt: openingMatches[0].excerpt, closureFound: false, openingFound: true, detectedDeadline };
  }

  if (closureFound && stateImpliesClosed) {
    return { kind: "agrees", excerpt: closureMatches[0].excerpt, detectedDeadline };
  }
  if (openingFound && stateImpliesOpen) {
    return { kind: "agrees", excerpt: openingMatches[0].excerpt, detectedDeadline };
  }

  // Neither phrase set matched anything. The page passed every content guard (it is about
  // this opportunity and has application-shaped vocabulary somewhere), but says nothing this
  // pass can positively read as confirming the stored cycle state — design doc §7.6's ISSYP
  // shape exactly: perfectly readable, liveness-silent.
  return { kind: "liveness_silent" };
}
