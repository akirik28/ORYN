/**
 * Deterministic quality signatures for `opportunities.current_cycle_label`.
 *
 * WHY THIS EXISTS: `current_cycle_label` was written for years as researcher bookkeeping —
 * a note from whoever verified the row to whoever reads it next. On 2026-09-02 it became
 * student-facing copy, when opportunity-card.tsx started rendering it verbatim for records
 * with no deadline (and, 2026-09-03, the detail page for the same records). Nothing about
 * the stored strings changed; their audience did.
 *
 * Running the function below over the live catalogue on 2026-09-03: of 190 active rows
 * carrying a label, 66 trip at least one signature — and 52 of those 66 have no deadline,
 * so they are the ones actually rendered. By signature: 47 exceed the card's width, 23
 * refer to Oryn's own research act, 10 freeze an ISO date into prose, 3 describe the stored
 * row rather than the opportunity; 15 rows trip more than one. Two of what a 15-year-old
 * reads today, in English sentences inside a Turkish interface: "(concluded by research
 * date)" and "Row title-year (2025) is stale; live page ... states".
 *
 * DESIGN CONSTRAINT — FLAG ONLY. NOTHING HERE REJECTS, AND NOTHING HERE SUPPRESSES.
 * Two separate reasons, both load-bearing:
 *
 * 1. The record is not the label. `description-quality.ts`'s header records what happened
 *    the last time a content gate over-blocked: the evidence gate falsely rejected 2,097
 *    well-sourced records. Refusing an entire verified opportunity because its cycle label
 *    reads like a note would be that failure again, for lower stakes.
 *
 * 2. Suppression is not available either, and this is the subtler point. It is tempting,
 *    since the label is optional and both render paths already say nothing when it is null.
 *    But the live 30 are overwhelmingly *a real fact wrapped in internal framing* — "Summer
 *    2026: 13-31 July 2026 (concluded by research date)" carries a true, student-useful
 *    date. Dropping the string to remove the jargon would delete the fact with it, and a
 *    regex is not entitled to decide which half of a sentence survives. That is authoring
 *    a claim by pattern match, which is the thing this codebase most consistently refuses.
 *
 * So the honest scope is narrow: tell whoever is ingesting that this string will be read by
 * a student, and let a person rewrite it. The same reason the existing 30 are a copy-review
 * list for a human and not a staged UPDATE.
 */

export type CycleLabelDefect =
  /** Refers to Oryn's own research act — "as of research date", "on the page fetched". */
  | "research_process_reference"
  /** Describes the database row rather than the opportunity — "Row title-year is stale". */
  | "describes_our_own_record"
  /** A date frozen into prose, which ages silently with no mechanism to refresh it. */
  | "baked_in_date"
  /** Longer than the card can show; opportunity-card.tsx clamps the label to 2 lines. */
  | "exceeds_card_width";

export interface CycleLabelFinding {
  defect: CycleLabelDefect;
  /** Human-readable, safe to surface in an ingestion report. */
  detail: string;
}

/** Roughly two clamped lines of `text-xs` in the card. Not a hard limit — a genuinely
 *  complex cycle can legitimately need the words, and the card clamps rather than breaks. */
const CARD_WIDTH_CHARS = 120;

/** Phrases naming the research act itself. A student has no idea when "the research date"
 *  was, or that a page was "fetched" — these are addressed to us, not to them. */
const RESEARCH_PROCESS = /\b(?:as of (?:the )?research date|by research date|at time of research|at verification|when (?:checked|fetched)|as of this check|on the pages? fetched|not (?:confirmed|retrieved|found) (?:on|in)\b|official page did not)/i;

/** Text about the accuracy of our own stored row. Always leaks the database at the reader. */
const OWN_RECORD = /\b(?:row title|row's title|this row|the record)\b|\btitle-year\b/i;

/** An ISO date embedded in the prose: correct the day it is written, silently wrong later. */
const BAKED_DATE = /\bas of \d{4}-\d{2}-\d{2}\b/i;

/**
 * Inspect a cycle label. Returns every matching signature; the caller decides what to do
 * with them. An empty array means no signature matched — NOT that the copy is good.
 */
export function inspectCycleLabel(label: string | null | undefined): CycleLabelFinding[] {
  if (!label) return [];
  const trimmed = label.trim();
  if (trimmed.length === 0) return [];

  const findings: CycleLabelFinding[] = [];

  if (RESEARCH_PROCESS.test(trimmed)) {
    findings.push({
      defect: "research_process_reference",
      detail: "Refers to Oryn's own research process. A student reading this card has no idea when the research happened or what page was fetched — say what is true of the opportunity instead.",
    });
  }
  if (OWN_RECORD.test(trimmed)) {
    findings.push({
      defect: "describes_our_own_record",
      detail: "Describes Oryn's stored record rather than the opportunity. Notes about a row being stale belong in the fix, not in what the student reads.",
    });
  }
  if (BAKED_DATE.test(trimmed)) {
    findings.push({
      defect: "baked_in_date",
      detail: "Freezes a date into prose. It is correct the day it is written and silently wrong afterwards, with nothing to refresh it.",
    });
  }
  if (trimmed.length > CARD_WIDTH_CHARS) {
    findings.push({
      defect: "exceeds_card_width",
      detail: `${trimmed.length} characters. The card clamps this label to 2 lines, so anything past roughly ${CARD_WIDTH_CHARS} is only visible on the detail page.`,
    });
  }

  return findings;
}
