/**
 * Deterministic description-quality signatures for the opportunities ingestion path.
 *
 * WHY THIS EXISTS: a live measurement on 2026-08-22 (BUG-1, read-only against the dev
 * project) found 85 of 271 `status='active'` opportunities — 31.4% of everything a student
 * can actually browse — carrying at least one of the signatures below. Worked examples:
 * `3f7170ba` "AI Scholars" is three separate CMU programmes concatenated into one record;
 * `7aa517a3` is a UCSC *course-catalogue entry*, not an opportunity at all. Full inventory:
 * `data/audit/opportunities-description-defects-2026-08-22.md`.
 *
 * Those rows came in through a one-off Drive-corpus import whose source spreadsheet cells
 * were already garbled — `lib/opportunities/ingest.ts` did not produce them. But ingest.ts
 * performed no description content check whatsoever, so it would not have caught them
 * either, and it is the path every future researcher batch flows through. This module is
 * that missing check.
 *
 * DESIGN CONSTRAINT — FAIL LOUD, NOT CLOSED. This repo has already been bitten once by a
 * content gate that prose-matched: the evidence gate falsely rejected 2,097 well-sourced
 * records, still a founder-pending item (`docs/handoffs/evidence-gate-false-rejections-2026-08-22.md`).
 * A description guard is the same failure shape. So: only a signature with **no legitimate
 * form** rejects. Everything with a plausible legitimate form is advisory — surfaced to a
 * human, never silently dropping a researcher's correct record. Blocking good research is
 * worse than admitting a flagged bad description, because the org's reflex when a gate
 * over-blocks is to widen it, and that is how the evidence bar drops.
 */

export type DescriptionDefect =
  /** No legitimate form — rejects. */
  | "multi_program_concatenation"
  /** Plausible legitimate forms — advisory only. */
  | "restates_title"
  | "embedded_url"
  | "truncated";

export type DescriptionDefectSeverity = "reject" | "flag";

export interface DescriptionQualityFinding {
  defect: DescriptionDefect;
  severity: DescriptionDefectSeverity;
  /** Human-readable, safe to surface in an ingestion report. */
  detail: string;
}

/** The separator the Drive corpus's spreadsheet-cell dumps use between glued-together
 * programmes. Spaces on both sides deliberately: a bare "|" appears legitimately inside
 * URLs and the occasional "A|B" shorthand, and matching those would be a false positive. */
const SEGMENT_SEPARATOR = " | ";

const BARE_URL_SEGMENT = /^https?:\/\/\S+$/;
const ANY_URL = /https?:\/\//;

/** Trailing ellipsis, either the single character a truncator emits or three literal dots. */
const TRAILING_ELLIPSIS = /(?:…|\.\.\.)\s*$/;

/** Titles shorter than this are too generic for a prefix comparison to mean anything —
 * "AI Scholars" legitimately opening a sentence is not evidence of a cell dump. */
const MIN_TITLE_LENGTH_FOR_PREFIX_CHECK = 12;

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A description built by gluing several programmes together with " | ", at least one of
 * whose segments is nothing but a raw URL. There is no legitimate description shaped like
 * `Programme A | https://a.example | Programme B | https://b.example` — a real description
 * is prose about one opportunity, and this table already has `official_url`/`application_url`
 * columns for links. Requires **two or more** separators (three or more segments): a single
 * "A | B" is ordinary shorthand and must not trip this.
 */
function detectMultiProgramConcatenation(description: string): DescriptionQualityFinding | null {
  const segments = description.split(SEGMENT_SEPARATOR).map((s) => s.trim());
  if (segments.length < 3) return null;

  const urlSegments = segments.filter((s) => BARE_URL_SEGMENT.test(s));
  if (urlSegments.length === 0) return null;

  return {
    defect: "multi_program_concatenation",
    severity: "reject",
    detail:
      `Description is ${segments.length} "${SEGMENT_SEPARATOR.trim()}"-separated segments, ` +
      `${urlSegments.length} of which ${urlSegments.length === 1 ? "is" : "are"} a bare URL — ` +
      `this is a spreadsheet-cell dump of several programmes, not one opportunity's description. ` +
      `Split it into one record per programme.`,
  };
}

/**
 * Advisory, not a rejection: a competition genuinely named for what it is can legitimately
 * open its description with its own name ("The Diamond Challenge is a global..."). What this
 * catches when it matters is the cell-dump shape, where the description's first field simply
 * repeats the title verbatim before any prose starts.
 */
function detectRestatesTitle(title: string, description: string): DescriptionQualityFinding | null {
  const normalizedTitle = normalizeForComparison(title);
  const normalizedDescription = normalizeForComparison(description);
  if (normalizedTitle.length < MIN_TITLE_LENGTH_FOR_PREFIX_CHECK) return null;
  if (!normalizedDescription.startsWith(normalizedTitle)) return null;

  return {
    defect: "restates_title",
    severity: "flag",
    detail: "Description opens by restating its own title verbatim — check it is prose about the opportunity, not a copied cell.",
  };
}

/**
 * Advisory, not a rejection: an official record citing its own source inline is a real,
 * defensible thing for a researcher to write. But a raw URL in the body is also the single
 * commonest scrape artefact in the live corpus (77 of 271 active rows), and the browse card
 * renders `description` raw under a `line-clamp-2` — so a leading URL is often the only
 * thing a student actually sees.
 */
function detectEmbeddedUrl(description: string): DescriptionQualityFinding | null {
  if (!ANY_URL.test(description)) return null;
  return {
    defect: "embedded_url",
    severity: "flag",
    detail: "Description contains a raw http(s) URL — links belong in official_url/application_url, and the browse card clamps to two lines.",
  };
}

/**
 * Advisory, not a rejection — deliberately, and this is the one place a caller might expect
 * a reject and not get one. A description ending in an ellipsis usually means it was cut
 * mid-thought, and in the Drive corpus it always did. But "…" also has a legitimate
 * stylistic form, and distinguishing a mid-word cut from a deliberate trailing ellipsis
 * cannot be done deterministically without a lexicon. Under this module's fail-loud-not-closed
 * rule, an ambiguous signature flags. A reviewer sees it either way.
 */
function detectTruncation(description: string): DescriptionQualityFinding | null {
  if (!TRAILING_ELLIPSIS.test(description)) return null;
  return {
    defect: "truncated",
    severity: "flag",
    detail: "Description ends in an ellipsis — likely cut mid-thought by an upstream length cap; confirm it is complete.",
  };
}

/**
 * Runs every signature. Order is stable (reject-severity first) so a caller can report the
 * blocking reason without sorting. An empty array means no signature fired — not that the
 * description is good, only that it is not defective in any way this module can prove.
 */
export function inspectDescription(title: string, description: string | null | undefined): DescriptionQualityFinding[] {
  if (!description || !description.trim()) return [];

  const findings = [
    detectMultiProgramConcatenation(description),
    detectRestatesTitle(title, description),
    detectEmbeddedUrl(description),
    detectTruncation(description),
  ].filter((f): f is DescriptionQualityFinding => f !== null);

  return findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "reject" ? -1 : 1));
}

/** The one blocking finding, if any. Callers that only need the gate decision use this. */
export function blockingDescriptionDefect(
  title: string,
  description: string | null | undefined
): DescriptionQualityFinding | null {
  return inspectDescription(title, description).find((f) => f.severity === "reject") ?? null;
}
