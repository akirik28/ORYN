import type { ResearchRequirementRecord } from "./ingest";
import type { ResearchDeadlineRecord } from "@/lib/deadlines/ingest";

/**
 * Representability audit for the university-requirements research corpus.
 *
 * This module answers ONE question, and deliberately not the question
 * `decideRequirementIngestion` answers. That function asks "should this record be written
 * today?" — a policy question whose answer is often a safe, correct "no". This one asks
 * "if we wrote it, would the row still mean what the source page means?" — a schema
 * question. The two come apart in the direction that matters:
 *
 *   - A record can be BLOCKED and perfectly representable (verification_state=NEEDS_REVIEW
 *     is a research-lane judgement about evidence, not a missing column).
 *   - A record can be ACCEPTED and NOT representable — and that is the dangerous cell.
 *     `decideRequirementIngestion` currently accepts a row while silently discarding its
 *     `test_scale`, its recency window, and its exclusion clause, because
 *     `AcceptedRequirementRow` has nowhere to put them. The row that lands looks like a
 *     complete, self-contained fact. It is not; it is a fact with its qualifiers removed.
 *
 * Why that is worse than it first sounds. Ingestion always writes `structured_rule: null`,
 * so `lib/requirements/evaluate.ts` returns `needs_manual_review` for every ingested row
 * today — no student can be told a wrong "met" through the evaluator right now. The damage
 * is deferred, not absent: the qualifier-stripped row is exactly what a later admin (or
 * `lib/ai/interpret-requirement.ts`) reads when populating `structured_rule`. By then the
 * scale version, the validity window and the "we do not accept this variant" clause exist
 * only in `requirement_research_queue.raw_payload`, which that reviewer is not looking at.
 * The wrong "met" is authored later, from a row we made look trustworthy.
 *
 * So `unrepresentable` here is not a synonym for "rejected". It is the count of records for
 * which writing the row loses information the source page carried, and it is the number that
 * decides whether ingestion is safe tonight.
 *
 * Detection discipline mirrors the platform rule that an exact identifier is evidence while
 * a name/substring match is only a lead: every shape below is derived from a STRUCTURED field
 * (`is_exclusion`, `test_scale`, `scale_ambiguity`, `verification_state`, `recurrence`,
 * `cycle_year`) wherever the corpus carries one. Free-text regexes are used only for shapes
 * the research contract never gave a structured field to (recency windows, score provenance,
 * age bars), and every such finding is marked `evidenceKind: "text_lead"` so a reader can
 * tell a measured count from an inferred one and re-check it by hand.
 */

/** A shape the live schema has no column for. Ordered roughly by how badly a dropped
 * qualifier misleads, not alphabetically. */
export type RequirementShape =
  | "inverted_recency"
  | "recency_window"
  | "eligibility_by_absence"
  | "incomparable_scale"
  | "scale_qualifier_dropped"
  | "score_provenance"
  | "unevaluable_age_bar"
  | "unresolved_conflict"
  | "historical_as_current";

export type DeadlineShape = "undated_cycle" | "binding_semantics" | "unresolved_conflict" | "historical_as_current" | "no_date_published";

export type EvidenceKind = "structured_field" | "text_lead";

export interface ShapeFinding<S extends string> {
  shape: S;
  /** Which field established this, so a reviewer can re-check the call. */
  evidenceKind: EvidenceKind;
  evidence: string;
  /** What the live schema does with the record today, stated concretely. */
  lossIfWritten: string;
}

/** `test_scale` values that are not merely unstored but genuinely incomparable — no numeric
 * column could hold them alongside the others even if one existed. TR-YÖS in a single cycle:
 * Hacettepe publishes 400 of 500 (a score on a stated denominator), Ankara publishes "440
 * points" with no denominator published anywhere, METU publishes "first 5th percentile" (a
 * rank, not a score). Storing all three as a bare number and comparing them means nothing. */
const INCOMPARABLE_SCALES = new Set(["TR_YOS_SCALE_UNSTATED", "TR_YOS_PERCENTILE_RANK"]);

/** `scale_ambiguity` values the research lane itself marked as unsafe to evaluate. Includes
 * `possibly_discontinued_instrument`, which `lib/requirements/ingest.ts`'s own
 * UNSAFE_SCALE_AMBIGUITY set does NOT currently contain — see the design doc's Finding 3. */
const AMBIGUOUS_SCALES = new Set(["undated_scale_assumption", "partially_unsatisfiable", "possibly_discontinued_instrument"]);

/**
 * A recency rule bounded from BELOW — "certificates taken on or after DATE are not
 * accepted" — rather than from above. METU is the live case: IELTS taken on or after
 * 24 December 2022 is refused. Every recency model in this codebase and in the proposed
 * schema assumes "at most N years old", so a max-age field gets METU exactly backwards and
 * tells a student their fresh certificate qualifies when it is the freshness that
 * disqualifies it. Detected before the generic max-age pattern so the more specific shape wins.
 */
const INVERTED_RECENCY_RE = /\b(on|from)\s+or\s+after\b[^.]{0,120}?\b(not|no longer|will not|cannot|won'?t)\b|\b(not|no longer)\s+(be\s+)?accept(ed)?\b[^.]{0,80}?\b(on|from)\s+or\s+after\b/i;

/** Ordinary max-age windows: "valid for two years", "no more than two years old",
 * "issued within 2 years of", "must have been achieved no more than N years prior to entry".
 * Unrepresentable for a different reason than the inverted case — the column simply does not
 * exist — but equally capable of producing a confident wrong "met" once a rule is authored. */
const RECENCY_WINDOW_RE =
  /\b(valid (?:for|until)|no more than|not more than|within|issued within|no older than|older than|less than)\s+(?:\w+\s+){0,3}(year|years|month|months)\b|\byears?\s+(?:prior to|before)\s+(?:entry|the start)\b|\bvalidity\b[^.]{0,60}\b(year|month)s?\b/i;

/**
 * Score provenance: HOW a score was obtained, which is per-institution and therefore cannot
 * be a global property of the test. Southampton accepts IELTS One Skill Retake; Edinburgh
 * refuses it. Same variant, both official, both current. A student can hold a numerically
 * qualifying score the institution rejects on provenance alone — a superscored 1300 and a
 * single-sitting 1300 are the same number and only one is accepted.
 */
const PROVENANCE_RE = /\bone skill retake\b|\bmybest\b|\bmy best\b|\bsuperscor/i;
/** Named score VARIANTS, which must stay anchored to a test name or an explicit
 * version/edition word. A bare `\bonline\b` was tried and rejected: it fired 38 times across
 * this corpus and almost every hit was "the online application portal" or "complete the online
 * self-test" — administrative prose, not a score provenance. Same for a bare `\bindicator\b`,
 * which matched "your GPA is only one indicator used when assessing an application". Anchoring
 * is what makes this a lead worth reporting rather than noise. */
const PROVENANCE_VARIANT_RE =
  /\bhome edition\b|\bielts indicator\b|\b(?:ielts|toefl|pte|duolingo)\s+online\b|\bonline\s+(?:version|edition)s?\b|\bsingle sitting\b|\bsame (?:session|sitting)\b|\bcombination of test results\b|\bdifferent test dates\b/i;

/**
 * An age bar. TU Dublin requires applicants to be 18 before 31 December. ORYN stores birth
 * YEAR only, deliberately (AGENTS.md Phase 2 minor-safe design), so for a student born late
 * in the year this is genuinely unevaluable — not merely unstored. It must return
 * needs_manual_review and must never resolve to "met". Note the shape: two bare day-and-month
 * cut-offs with no year, the same year-less shape as a recurring deadline, but attached to a
 * requirement rather than a date.
 */
const AGE_BAR_RE = /\bmust be\s+\d{2}\b|\bage of\s+\d{2}\b|\bunder\s+(?:the age of\s+)?\d{2}\b|\bat least\s+\d{2}\s+years\s+of\s+age\b|\baged?\s+\d{2}\s+(?:or over|or older|by|before)\b/i;

/** Verification states that describe evidence quality rather than schema fit — a record can
 * be perfectly representable and still carry one. Kept separate from the shape list on
 * purpose. */
export const EVIDENCE_BLOCKED_STATES = new Set(["NEEDS_REVIEW", "CURRENT_CYCLE_NOT_PUBLISHED"]);

/** Retries a read that failed transiently. The project's Supabase endpoint intermittently
 * answers a burst of concurrent count probes with HTTP 401 rather than 429; serializing the
 * reads mostly avoids it, and this backoff covers the remainder. Deliberately small and
 * bounded — an infinite retry against a genuinely bad credential would hang a dry run that is
 * supposed to fail fast and say so. */
export async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${(lastError as Error).message}`);
}

function textOf(record: ResearchRequirementRecord): string {
  // limitations/researcher_notes are included because the research contract puts recency and
  // provenance caveats there when the requirement_text itself is a bare threshold.
  return [record.requirement_text, record.limitations, record.researcher_notes, record.scope].filter(Boolean).join(" — ");
}

/**
 * Every shape one requirement record carries that the live schema cannot hold. Empty array
 * means the row would survive a write with its meaning intact. Pure — no I/O, no DB.
 */
export function classifyRequirementShapes(record: ResearchRequirementRecord): ShapeFinding<RequirementShape>[] {
  const findings: ShapeFinding<RequirementShape>[] = [];
  const text = textOf(record);

  if (record.is_exclusion === true) {
    findings.push({
      shape: "eligibility_by_absence",
      evidenceKind: "structured_field",
      evidence: "is_exclusion=true",
      lossIfWritten:
        "university_requirements.is_exclusion exists (migration 0052) but AcceptedRequirementRow never sets it, so decideRequirementIngestion blocks the record as not_ingestible and the clause is dropped entirely. Ankara's 'programmes EXCLUDING the above-listed' heading is the whole eligibility rule for Medicine/Dentistry/Computer Eng/AI/Software/Law/Veterinary/Pharmacy; dropping it leaves the general SAT row matching an applicant who is not eligible at all.",
    });
  }

  if (record.verification_state === "CONFLICTING_EVIDENCE") {
    findings.push({
      shape: "unresolved_conflict",
      evidenceKind: "structured_field",
      evidence: "verification_state=CONFLICTING_EVIDENCE",
      lossIfWritten:
        "No column links two rows as competing readings of one fact. The record is blocked, so the conflict survives only in the research corpus and is invisible to the product. 'Trust the more recent page' is not a usable rule: at Groningen the older-looking page is correct, at Erasmus the newer one is.",
    });
  }

  if (record.verification_state === "VERIFIED_HISTORICAL") {
    findings.push({
      shape: "historical_as_current",
      evidenceKind: "structured_field",
      evidence: "verification_state=VERIFIED_HISTORICAL",
      lossIfWritten:
        "university_requirements has no column marking a row closed or non-actionable, and lib/requirements/ingest.ts's UNSAFE_VERIFICATION_STATES does not list VERIFIED_HISTORICAL (its comment asserts the state 'never appears on a requirement record in this corpus' — no longer true). The row would be accepted and displayed as a current requirement.",
    });
  }

  if (record.test_scale && INCOMPARABLE_SCALES.has(record.test_scale)) {
    findings.push({
      shape: "incomparable_scale",
      evidenceKind: "structured_field",
      evidence: `test_scale=${record.test_scale}`,
      lossIfWritten: "The threshold is a rank or has no published denominator. No numeric column holds it alongside a scored threshold, and comparing across them is meaningless.",
    });
  } else if (record.scale_ambiguity && AMBIGUOUS_SCALES.has(record.scale_ambiguity)) {
    findings.push({
      shape: "incomparable_scale",
      evidenceKind: "structured_field",
      evidence: `scale_ambiguity=${record.scale_ambiguity}`,
      lossIfWritten: "The research lane flagged this threshold as unsafe to evaluate as a bare number.",
    });
  } else if (record.test_scale) {
    findings.push({
      shape: "scale_qualifier_dropped",
      evidenceKind: "structured_field",
      evidence: `test_scale=${record.test_scale}`,
      lossIfWritten:
        "university_requirements has no test_scale column, so the qualifier is discarded and the number is stored bare. ETS dual reporting ends January 2028, at which point every unqualified legacy TOEFL threshold silently becomes unmeasurable rather than merely ambiguous.",
    });
  }

  if (INVERTED_RECENCY_RE.test(text)) {
    findings.push({
      shape: "inverted_recency",
      evidenceKind: "text_lead",
      evidence: firstMatch(INVERTED_RECENCY_RE, text),
      lossIfWritten: "A max-age field inverts this rule. METU refuses IELTS taken ON OR AFTER 24 December 2022; a max-age model tells the student their fresh certificate qualifies.",
    });
  } else if (RECENCY_WINDOW_RE.test(text)) {
    findings.push({
      shape: "recency_window",
      evidenceKind: "text_lead",
      evidence: firstMatch(RECENCY_WINDOW_RE, text),
      lossIfWritten:
        "No max-age column on the requirement and no date_achieved on the student-side fact, so a student meeting the number with an expired qualification is told they qualify. The anchor differs too ('prior to entry' vs 'from the start date of this programme').",
    });
  }

  if (PROVENANCE_RE.test(text) || PROVENANCE_VARIANT_RE.test(text)) {
    findings.push({
      shape: "score_provenance",
      evidenceKind: "text_lead",
      evidence: firstMatch(PROVENANCE_RE.test(text) ? PROVENANCE_RE : PROVENANCE_VARIANT_RE, text),
      lossIfWritten: "No excluded-provenance list on the rule and no provenance flag on the student's stored score. Southampton accepts One Skill Retake, Edinburgh refuses it — provenance cannot be a global property of the test.",
    });
  }

  if (AGE_BAR_RE.test(text)) {
    findings.push({
      shape: "unevaluable_age_bar",
      evidenceKind: "text_lead",
      evidence: firstMatch(AGE_BAR_RE, text),
      lossIfWritten: "ORYN stores birth year only by deliberate minor-safe design, so a day-and-month age cut-off is unevaluable for students born late in the year. Must return needs_manual_review, never 'met'.",
    });
  }

  return findings;
}

/** Every shape one deadline record carries that the live schema cannot hold. */
export function classifyDeadlineShapes(record: ResearchDeadlineRecord): ShapeFinding<DeadlineShape>[] {
  const findings: ShapeFinding<DeadlineShape>[] = [];

  if (record.recurrence === "recurring_annual_undated" || record.cycle_year === null) {
    findings.push({
      shape: "undated_cycle",
      evidenceKind: "structured_field",
      evidence: record.recurrence === "recurring_annual_undated" ? "recurrence=recurring_annual_undated" : "cycle_year=null",
      lossIfWritten:
        "university_deadlines.deadline_date is a real date column and cannot represent 'this date, every year, no fixed year'. The undated convention is per-institution, not per-country — TU Berlin publishes 0% undated, Heidelberg and Stuttgart 100% — so no inference rule recovers the year without corrupting the institutions that genuinely do not publish one.",
    });
  }

  if (record.recurrence === "not_published_centrally") {
    findings.push({
      shape: "no_date_published",
      evidenceKind: "structured_field",
      evidence: "recurrence=not_published_centrally",
      lossIfWritten: "A real, sourced finding that no central date exists. There is no column to record 'confirmed absent', so it is indistinguishable from 'not yet researched'.",
    });
  }

  if (record.verification_state === "CONFLICTING_EVIDENCE") {
    findings.push({
      shape: "unresolved_conflict",
      evidenceKind: "structured_field",
      evidence: "verification_state=CONFLICTING_EVIDENCE",
      lossIfWritten: "No column links competing readings. Manchester's page binds 15 October 2026 to 'September 2024 entry' — self-contradicting on one official page; silently picking either side publishes a date that may be a year wrong.",
    });
  }

  if (record.verification_state === "VERIFIED_HISTORICAL") {
    findings.push({
      shape: "historical_as_current",
      evidenceKind: "structured_field",
      evidence: "verification_state=VERIFIED_HISTORICAL",
      lossIfWritten: "A correctly-fetched date for a cycle that has already closed. university_deadlines has no closed/non-actionable column, so a bare deadline_date sitting there reads as a live deadline.",
    });
  }

  // Binding semantics are US-shaped and mostly arrive later, but `early` is already present
  // in this corpus and the type carries eligibility logic, not just a date: Early Decision is
  // a contract, Restrictive Early Action forbids other early applications.
  const bindingText = [record.deadline_type, record.deadline_text_verbatim, record.applies_to].filter(Boolean).join(" ");
  if (record.deadline_type === "early" || /\bearly decision\b|\brestrictive early action\b|\bsingle[- ]choice early\b|\bbinding\b/i.test(bindingText)) {
    findings.push({
      shape: "binding_semantics",
      evidenceKind: record.deadline_type === "early" ? "structured_field" : "text_lead",
      evidence: record.deadline_type === "early" ? "deadline_type=early" : firstMatch(/\bearly decision\b|\brestrictive early action\b|\bsingle[- ]choice early\b|\bbinding\b/i, bindingText),
      lossIfWritten:
        "deadline_type is free text with no binding/restriction semantics. Early Decision is a contract and Restrictive Early Action forbids other early applications, so the type governs eligibility for OTHER applications — a constraint the deadline engine cannot express and would not surface.",
    });
  }

  return findings;
}

function firstMatch(re: RegExp, text: string): string {
  const m = re.exec(text);
  if (!m) return "";
  const start = Math.max(0, (m.index ?? 0) - 20);
  return text.slice(start, Math.min(text.length, (m.index ?? 0) + m[0].length + 40)).trim();
}

/**
 * The batch-level shape the per-record classifier structurally cannot see: two records that
 * are each individually fine but collide in the live unique index
 * `university_requirements_university_type_scope_idx` — UNIQUE (university_id,
 * requirement_type, COALESCE(scope,'')) WHERE program_id IS NULL. That index permits exactly
 * ONE requirement per (university, type, scope), so a university publishing four alternative
 * English-proficiency routes can store one of them.
 *
 * This is not hypothetical. All 36 of the 36 `rejected` rows in the live
 * requirement_research_queue are this constraint firing — Edinburgh lost 4 english_proficiency
 * rows, Glasgow 5 minimum_grade, Sabancı 7 international_requirement. Those records were
 * decided `accepted`, carried real sourced facts, and were destroyed on insert.
 *
 * Takes already-accepted decisions keyed the way the index keys them and returns the groups
 * that would collide, counting every row past the first as a loss.
 */
export function findUniqueSlotCollisions(acceptedKeys: readonly string[]): { key: string; count: number; lost: number }[] {
  const counts = new Map<string, number>();
  for (const key of acceptedKeys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count, lost: count - 1 }))
    .sort((a, b) => b.lost - a.lost);
}
