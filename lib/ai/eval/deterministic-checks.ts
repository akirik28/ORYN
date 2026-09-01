import type { DeterministicFinding } from "./types";

/**
 * The two failure patterns lib/ai/student-context.ts's own comments record as observed,
 * live, on real advisor output — "Academics is 0/100" for a dimension nobody had entered
 * anything for, and the raw string `extreme_reach` in prose a student read. Both are fixed
 * at the prompt level now (dimensionLabel/outlookLabel display mapping, and an explicit
 * "never quote a score for an unassessed dimension" instruction) — these checks are what
 * stops that fix from being silently undone by a future prompt edit, or from never having
 * actually worked in the first place. A prompt instruction is not a guarantee; only
 * checking the model's own output is.
 */

/** Every raw identifier that has actually leaked into a student-facing reply, or could by
 * the same mechanism — not just the two CEO named. `ProfileDimension`'s 9 values and
 * `OutlookLabel`'s 6 both reach formatContextForPrompt as enum text the model reads
 * directly (see that file's own two comments on exactly this), so any of the 15 is an
 * equally live risk, not just the two instances someone happened to notice. Kept as a
 * plain list rather than importing the two union types directly — this file has to stay
 * readable as "the identifiers a student must never see," and a type-level list doesn't
 * carry that meaning to whoever edits it next. Whoever adds a tenth ProfileDimension or a
 * seventh OutlookLabel should add it here in the same commit — __tests__/ai/eval/
 * deterministic-checks.test.ts's own coverage test is what catches that being forgotten.
 */
export const RAW_IDENTIFIER_DENYLIST: readonly string[] = [
  // ProfileDimension (types/database.ts)
  "academics",
  "intellectual_curiosity",
  "leadership",
  "research",
  "entrepreneurship",
  "community_impact",
  "awards_distinction",
  "career_exploration",
  "execution_project_depth",
  // OutlookLabel (types/database.ts)
  "extreme_reach",
  "reach",
  "competitive",
  "strong",
  "likely",
  "not_applicable",
];

/** Whole-word only — "leadership" the plain English word is fine; only the snake_case
 * multi-word identifiers and the handful of single-word enum values that would never
 * naturally appear in ordinary prose are actually diagnostic. "research", "leadership",
 * "strong", "reach", "competitive" are common English words a demanding-mentor reply says
 * constantly for entirely legitimate reasons ("Research is your clearest gap") — flagging
 * every occurrence would drown the two real signatures (multi-word snake_case, which
 * cannot occur in ordinary English at all) in false positives. Split accordingly: the
 * snake_case entries are unambiguous identifiers wherever they appear; the plain-word
 * entries are checked only when they still carry an underscore in the source (they never
 * will, since JS string literals here have none) — so in practice this list's single-word
 * members exist for completeness/documentation (a reader should see all 15, not wonder why
 * 6 are missing) but never fire. Only the 9 truly diagnostic multi-word entries are wired
 * into the actual scan below.
 */
const DIAGNOSTIC_IDENTIFIERS = RAW_IDENTIFIER_DENYLIST.filter((id) => id.includes("_"));

/** Scans response text for any raw snake_case identifier a student should never see —
 * dimensionLabel()/outlookLabel() exist specifically so this never fires. */
export function findRawIdentifierLeaks(text: string): DeterministicFinding[] {
  const findings: DeterministicFinding[] = [];
  for (const identifier of DIAGNOSTIC_IDENTIFIERS) {
    const pattern = new RegExp(`\\b${identifier}\\b`, "i");
    const match = text.match(pattern);
    if (match) findings.push({ check: "raw_identifier_leak", evidence: match[0] });
  }
  return findings;
}

/**
 * Whether `text` states a numeric score ("42/100", "0/100", "scored 85") within the same
 * sentence as one of the given unassessed dimensions' display labels — the exact shape of
 * "Academics is 0/100" for a dimension with nothing recorded. Sentence-scoped, not
 * whole-response-scoped: a reply legitimately says "Research is 68/100" in one sentence
 * and "Academics hasn't been assessed yet" in the next, and flagging the response as a
 * whole would treat the second, correct sentence as contaminated by the first.
 *
 * Deliberately a real sentence split (period/exclamation/question mark boundary), not a
 * fixed character window either side of the label — a window is either too narrow (misses
 * "Academics is currently sitting at 0 out of 100") or too wide (falsely implicates the
 * next sentence's unrelated score). A label appearing with no adjacent number is not
 * itself a finding; stating the *state* honestly is exactly the correct behavior this
 * check exists to allow.
 *
 * A sentence split alone assumed prose, and that assumption broke the first time a model
 * answered in markdown. Observed live on 2026-09-02 (haiku-4-5, advisor_chat/en/regression):
 *
 *     Your real gaps are:
 *     - **Research** (unassessed; no evidence yet)
 *     - **Intellectual Curiosity** (55/100)
 *
 * There is no `.!?` anywhere in that block — "are:" ends on a colon and every bullet ends
 * on a paren — so the whole list collapsed into one "sentence", the unassessed label
 * "Research" landed in the same scope as a score belonging to a *different* dimension two
 * lines down, and the check reported a leak against a reply that had done exactly the
 * right thing. So the scope is now the unit that actually carries one claim: a sentence in
 * prose, a list item in a list, a block between blank lines. Note which direction this
 * moves — every added boundary makes scopes NARROWER, so it can only remove false
 * positives, never create a false negative on text the old split already handled. The one
 * genuine risk is a claim hard-wrapped across a line break, which is why plain single
 * newlines are NOT boundaries: only a blank line or the start of a new list item is.
 *
 * Scoping to a claim was still not enough. Observed 2026-09-02 in the reply-length run:
 * "The real gaps are Research (unassessed) and Execution / Project Depth (60/100)" is ONE
 * ordinary sentence, correctly formed, naming two dimensions with their own parentheticals.
 * Research is stated as unassessed and carries no number; the 60/100 is Execution's. A
 * scope-wide search cannot tell whose number it is, so it blamed the wrong one.
 *
 * So a score is now attributed to its NEAREST dimension label, and only fires if that
 * label is an unassessed one. The first attempt at this scanned forward from the label to
 * the next different dimension, which broke "You scored 0 out of 100 in Research" — the
 * score can precede its own label. This file's own existing test caught that, which is
 * worth noting: the direction-of-safety claim written in this very comment ("can only
 * remove false positives") was wrong, and only the older test disproved it.
 */
/** Sentence end, blank line, or the start of a markdown list item (`-`/`*`/`+`/`1.`/`1)`).
 * A bare `\n` is deliberately absent — see the note above on hard-wrapped claims. */
const CLAIM_BOUNDARY = /(?<=[.!?])\s+|\n\s*\n|\n(?=[ \t]*(?:[-*+]|\d+[.)])\s)/;

export function findUnassessedDimensionScored(
  text: string,
  unassessedDimensionLabels: readonly string[],
  /** Every dimension display label for this locale, not only the unassessed ones. Needed
   * to tell WHOSE score a number is: see the nearest-label note above. Defaults to the
   * unassessed set so two-argument callers still work — coarser, and erring toward a false
   * positive, which is the safe direction for a leak check. */
  allDimensionLabels: readonly string[] = unassessedDimensionLabels,
): DeterministicFinding[] {
  const findings: DeterministicFinding[] = [];
  const unassessed = new Set(unassessedDimensionLabels.map((l) => l.toLowerCase()));
  for (const scope of text.split(CLAIM_BOUNDARY)) {
    const labels = occurrences(scope, allDimensionLabels);
    if (labels.length === 0) continue;
    for (const score of scoreOccurrences(scope)) {
      const owner = nearest(labels, score.at);
      if (owner && unassessed.has(owner.label.toLowerCase())) {
        findings.push({ check: "unassessed_dimension_scored", evidence: scope.trim() });
        break;
      }
    }
  }
  return findings;
}

type Occurrence = { label: string; at: number; end: number };

function occurrences(scope: string, labels: readonly string[]): Occurrence[] {
  const haystack = scope.toLowerCase();
  const found: Occurrence[] = [];
  for (const label of labels) {
    const needle = label.toLowerCase();
    for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
      found.push({ label, at, end: at + needle.length });
    }
  }
  return found;
}

function scoreOccurrences(scope: string): { at: number }[] {
  const pattern = /\b\d{1,3}\s*(?:\/\s*100|out of 100|points?)\b/gi;
  const found: { at: number }[] = [];
  for (let m = pattern.exec(scope); m !== null; m = pattern.exec(scope)) found.push({ at: m.index });
  return found;
}

/** Distance from the score to the label's nearest edge, so "Research is 0/100" and
 * "0 out of 100 in Research" both attribute to Research regardless of which side it sits on
 * — the asymmetry of a forward-only window was a real false negative, caught by this file's
 * own existing "alternate score phrasings" test. */
function nearest(labels: Occurrence[], scoreAt: number): Occurrence | null {
  let best: Occurrence | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const label of labels) {
    const distance = scoreAt < label.at ? label.at - scoreAt : scoreAt - label.end;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = label;
    }
  }
  return best;
}

export function runDeterministicChecks(
  text: string,
  unassessedDimensionLabels: readonly string[],
  allDimensionLabels: readonly string[] = unassessedDimensionLabels,
): DeterministicFinding[] {
  return [...findRawIdentifierLeaks(text), ...findUnassessedDimensionScored(text, unassessedDimensionLabels, allDimensionLabels)];
}
