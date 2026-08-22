import { resolveIdentity, type LocalUniversity } from "@/lib/acquisition/identity";
import { sourceAuthority, domainOf } from "@/lib/acquisition/source-authority";

/** One record from data/research/university-requirements/deadlines_batch*.jsonl — see
 * docs/research/university-requirements/research-handoff-university-requirements.md for the
 * full field-by-field contract. */
export interface ResearchDeadlineRecord {
  research_deadline_id: string;
  university_name: string | null;
  university_country: string | null;
  university_official_domain?: string | null;
  program_name: string | null;
  deadline_type: string;
  deadline_date: string | null;
  deadline_text_verbatim: string | null;
  deadline_time?: string | null;
  recurrence: string;
  cycle_year: number | null;
  cycle_label?: string | null;
  applies_to?: string | null;
  source_url: string;
  source_type: string;
  source_authority_passes_gate: boolean;
  retrieved_at: string;
  verification_state: string;
  limitations?: string | null;
}

export type UniversityLookupRow = LocalUniversity & { websiteUrl?: string | null };

export type DeadlineIngestOutcome = "accepted" | "duplicate" | "unresolved_university" | "not_ingestible" | "malformed_source" | "rejected";

export interface AcceptedDeadlineRow {
  university_id: string;
  program_id: null;
  deadline_type: string;
  /** Null for a recurring_annual_undated row — the date lives in recurrence_month/day instead.
   * Migration 0056's university_deadlines_recurrence_shape_check enforces which of the two
   * shapes a given recurrence value requires. */
  deadline_date: string | null;
  application_cycle: string | null;
  source_url: string;
  retrieved_at: string;
  recurrence: string;
  recurrence_month: number | null;
  recurrence_day: number | null;
  cycle_year: number | null;
  cycle_label: string | null;
  verification_state: string;
  deadline_text_verbatim: string | null;
  source_type: string;
  binding_policy: string | null;
  research_record_id: string;
}

const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DE_MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const EN_MONTH_ABBR: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Sept: 9, Oct: 10, Nov: 11, Dec: 12 };
const MONTH_INDEX: Record<string, number> = {};
EN_MONTHS.forEach((m, i) => (MONTH_INDEX[m] = i + 1));
DE_MONTHS.forEach((m, i) => (MONTH_INDEX[m] = i + 1));
const FULL_MONTH_PATTERN = [...EN_MONTHS, ...DE_MONTHS].join("|");
const ABBR_MONTH_PATTERN = Object.keys(EN_MONTH_ABBR)
  .sort((a, b) => b.length - a.length)
  .join("|");

/** Month/day extraction, EN + DE only (the two languages that dominate this corpus's undated
 * deadlines — see migration 0056's own §6 note: "Heidelberg and Stuttgart 100% undated"). FR/IT/TR
 * undated deadlines are left `not_ingestible` rather than extended to, a deliberate scope
 * boundary stated here rather than silently absent. */
const RECURRING_DATE_PATTERN = new RegExp(
  "\\b(?:" +
    `(${FULL_MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b` + // Month Day
    `|(\\d{1,2})(?:st|nd|rd|th)?\\s+(${FULL_MONTH_PATTERN})\\b` + // Day Month
    `|(\\d{1,2})\\.\\s*(${FULL_MONTH_PATTERN})\\b` + // Day. Month (German — "15. Juli")
    `|(\\d{1,2})\\.(\\d{1,2})\\.(?!\\d)` + // DD.MM.
    `|(${ABBR_MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b` + // Abbr Day
    `|(\\d{1,2})(?:st|nd|rd|th)?\\s+(${ABBR_MONTH_PATTERN})\\.?\\b` + // Day Abbr
    ")",
  "g"
);

/**
 * Extracts a single unambiguous (month, day) from free-text deadline prose, or null if the text
 * names zero or 2+ DISTINCT calendar dates. Deliberately conservative on the 2+ case: a range
 * ("1 September to 30 September") and a compound multi-fact string ("Application — Feb 1;
 * Documents — May 4") both produce 2+ matches and both return null rather than guessing which
 * date belongs in a single recurrence_month/recurrence_day pair — collapsing either silently
 * would be the same confidently-wrong failure migration 0056 exists to close at the schema
 * layer, one level up. Corpus-wide (335 recurring_annual_undated deadline records, 2026-08-21):
 * 199 yield exactly one date this way, 109 are 2+-date and stay refused, 27 have no
 * machine-extractable date at all. See docs/handoffs/deadline-recurrence-ingest-report.md.
 */
export function extractSingleRecurringDate(text: string | null | undefined): { month: number; day: number } | null {
  if (!text) return null;
  const seen = new Set<string>();
  const dates: { month: number; day: number }[] = [];
  RECURRING_DATE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = RECURRING_DATE_PATTERN.exec(text)) !== null) {
    let month: number | null = null;
    let day: number | null = null;
    if (match[1]) {
      month = MONTH_INDEX[match[1]];
      day = Number(match[2]);
    } else if (match[4]) {
      month = MONTH_INDEX[match[4]];
      day = Number(match[3]);
    } else if (match[6]) {
      month = MONTH_INDEX[match[6]];
      day = Number(match[5]);
    } else if (match[7]) {
      const d = Number(match[7]);
      const mo = Number(match[8]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        month = mo;
        day = d;
      }
    } else if (match[9]) {
      month = EN_MONTH_ABBR[match[9]];
      day = Number(match[10]);
    } else if (match[12]) {
      month = EN_MONTH_ABBR[match[12]];
      day = Number(match[11]);
    }
    if (month == null || day == null || day < 1 || day > 31) continue;
    const key = `${month}-${day}`;
    if (!seen.has(key)) {
      seen.add(key);
      dates.push({ month, day });
    }
  }
  return dates.length === 1 ? dates[0] : null;
}

/**
 * binding_policy, populated ONLY from cycle_label via a strict substring allow-list — never
 * blended with deadline_text_verbatim. Blending was tried first and produced inconsistent
 * results for the identical real-world fact: two QuestBridge National College Match records
 * (NYU, Columbia) classified `binding` only because their captured verbatim text happened to
 * also mention "Early Decision" nearby, while two other QuestBridge records for different
 * universities (Harvard, Yale) carrying the identical cycle_label were correctly left
 * unclassified because their captured text didn't repeat the phrase. cycle_label is the
 * researcher's own structured summary of what kind of round this is, so matching against it
 * alone is the more honest signal, at the cost of a few recoverable true positives (e.g.
 * Wisconsin's plain "Fall Early Action" text with no cycle_label) — a deliberate trade, not an
 * oversight. See docs/handoffs/deadline-recurrence-ingest-report.md for the full 42-record
 * review this was checked against.
 */
export function deriveBindingPolicy(cycleLabel: string | null | undefined): string | null {
  if (!cycleLabel) return null;
  const lower = cycleLabel.toLowerCase();
  if (lower.includes("restrictive early action") || lower.includes("single-choice early action") || lower.includes("single choice early action")) {
    return "restrictive_single_choice";
  }
  if (lower.includes("early decision")) return "binding";
  if (lower.includes("early action")) return "non_binding";
  return null;
}

export interface DeadlineIngestDecision {
  outcome: DeadlineIngestOutcome;
  detail: string | null;
  universityId: string | null;
  row: AcceptedDeadlineRow | null;
}

/**
 * VERIFIED_HISTORICAL is deliberately NOT in this set (migration 0056 changed the calculus —
 * see the comment on NON_ACTIONABLE_VERIFICATION_STATES below for why landing it is now the
 * right call, and why that's a different question from ingestion-time refusal).
 *
 * The remaining three stay refused because nothing downstream can safely act on them yet:
 * CONFLICTING_EVIDENCE has a real home now (requirement_source_conflicts, migration 0056 §8)
 * but nothing populates conflict_group_id on the ingestion path in this pass — landing an
 * unlinked conflicting row would be silently picking whichever side got researched into this
 * particular record, exactly what §8 exists to prevent. NEEDS_REVIEW and
 * CURRENT_CYCLE_NOT_PUBLISHED were never about representability — they mean "not safe to treat
 * as settled," which a schema change doesn't resolve.
 */
const UNSAFE_VERIFICATION_STATES = new Set(["CONFLICTING_EVIDENCE", "NEEDS_REVIEW", "CURRENT_CYCLE_NOT_PUBLISHED"]);

/**
 * Read-path filter (lib/deadlines/upcoming.ts, lib/deadlines/scan.ts): a row in this set is a
 * real, correctly-fetched fact that must never be presented to a student as an actionable
 * upcoming deadline. VERIFIED_HISTORICAL is the only state that can actually reach the table —
 * a real, correctly-sourced date for a cycle that has already closed (migration 0056's own
 * column comment: "read paths must exclude them from anything that reads as actionable"). Before
 * 0056 this state was refused outright at ingestion, because the table had no column to mark a
 * row non-actionable and a bare deadline_date sitting there reads as a live one (see the
 * pre-0056 dry-run report's Erasmus Rotterdam case). The other three are included here too, for
 * defense in depth — they're refused at ingestion so should never appear live, but a read path
 * that only trusts ingestion to have been the sole writer is one bypass away from being wrong. */
export const NON_ACTIONABLE_VERIFICATION_STATES = new Set(["VERIFIED_HISTORICAL", "CONFLICTING_EVIDENCE", "NEEDS_REVIEW", "CURRENT_CYCLE_NOT_PUBLISHED"]);

/**
 * Whether a dated deadline may be shown to a student as something still to act on.
 *
 * Both halves are required and neither implies the other. `verification_state` answers "is this
 * *cycle* closed?"; the date answers "has *this date* passed?" — and they disagree in both
 * directions in live data. A row for an open cycle whose own date has gone by still reads as
 * VERIFIED_CURRENT; and rows for the still-open Wintersemester 2026/27 were marked
 * VERIFIED_HISTORICAL because their individual dates had passed. Trusting either alone gets one
 * of those two populations wrong.
 *
 * This exists because the state half and the date half were applied at one read path and only
 * the state half at another: 35% of what the university detail page rendered under a heading
 * saying "Upcoming" was in the past, ascending-sorted, so the stalest date led the list. The
 * shared predicate is the fix — a comment promising two call sites will stay in step is not one.
 */
export function isActionableDatedDeadline(deadline: { verification_state: string; deadline_date: string | null }, todayIso: string): boolean {
  if (NON_ACTIONABLE_VERIFICATION_STATES.has(deadline.verification_state)) return false;
  if (!deadline.deadline_date) return false;
  return deadline.deadline_date >= todayIso;
}

export function resolveDeadlineUniversity(record: ResearchDeadlineRecord, universities: readonly UniversityLookupRow[]): { universityId: string | null; reason: string | null } {
  if (!record.university_name?.trim()) {
    return { universityId: null, reason: "No university_name." };
  }
  const resolution = resolveIdentity({ displayName: record.university_name, names: [record.university_name], countryName: record.university_country ?? null }, universities);
  if (resolution.status === "matched") return { universityId: resolution.match.universityId, reason: null };
  return { universityId: null, reason: resolution.reason };
}

/** Pure decision function — no I/O. `existingKeys` is what's already live (or already accepted
 * earlier in this same batch), keyed by `deadlineDedupKey(university_id, deadline_type,
 * factKey)` where factKey is the ISO date for a dated_specific row or `recurring:MM-DD` for a
 * recurring_annual_undated one — exact match, not fuzzy, since a date either is or isn't the
 * same fact (unlike a requirement's free-text title). No DB-level unique index exists on
 * university_deadlines, so this is the only duplicate protection — callers building
 * `existingKeys` from the live table must include recurring rows using the same `recurring:MM-DD`
 * shape or re-running a batch will re-accept (and duplicate-insert) every recurring row every
 * time. See scripts/ingest-requirements-deadlines.ts. */
export function decideDeadlineIngestion(record: ResearchDeadlineRecord, universities: readonly UniversityLookupRow[], existingKeys: ReadonlySet<string>): DeadlineIngestDecision {
  const { universityId, reason } = resolveDeadlineUniversity(record, universities);
  if (!universityId) {
    return { outcome: "unresolved_university", detail: reason, universityId: null, row: null };
  }

  let deadlineDate: string | null = null;
  let recurrenceMonth: number | null = null;
  let recurrenceDay: number | null = null;
  let factKey: string;

  if (record.recurrence === "recurring_annual_undated") {
    const extracted = extractSingleRecurringDate(record.deadline_text_verbatim);
    if (!extracted) {
      return {
        outcome: "not_ingestible",
        detail: `recurrence=recurring_annual_undated ("${record.deadline_text_verbatim}") — could not extract exactly one unambiguous calendar date from deadline_text_verbatim (found zero dates, or found two-or-more distinct dates that may belong to different sub-facts, e.g. a range or a compound "application X; documents Y" string). Needs structured recurrence_month/recurrence_day captured at the research stage, or manual resolution. See extractSingleRecurringDate in lib/deadlines/ingest.ts.`,
        universityId,
        row: null,
      };
    }
    recurrenceMonth = extracted.month;
    recurrenceDay = extracted.day;
    factKey = `recurring:${String(extracted.month).padStart(2, "0")}-${String(extracted.day).padStart(2, "0")}`;
  } else if (record.recurrence === "not_published_centrally") {
    return { outcome: "not_ingestible", detail: "recurrence=not_published_centrally — nothing published to ingest.", universityId, row: null };
  } else {
    // dated_specific, or (matching this function's pre-existing behavior for any value outside
    // the three migration 0056's CHECK constraint allows) anything else: attempt the ordinary
    // dated shape and let a genuine constraint violation surface honestly as `rejected` with the
    // real Postgres error, rather than guessing what an unrecognized value should mean here.
    if (!record.deadline_date) {
      return { outcome: "not_ingestible", detail: `recurrence=${record.recurrence} but deadline_date is null — inconsistent record, needs review.`, universityId, row: null };
    }
    deadlineDate = record.deadline_date;
    factKey = deadlineDate;
  }

  if (UNSAFE_VERIFICATION_STATES.has(record.verification_state)) {
    return { outcome: "not_ingestible", detail: `verification_state=${record.verification_state}`, universityId, row: null };
  }

  const matchedUniversity = universities.find((u) => u.id === universityId);
  const officialDomains = new Set(matchedUniversity?.websiteUrl ? [domainOf(matchedUniversity.websiteUrl)] : []);
  const authority = sourceAuthority("policy", record.source_url, officialDomains);
  if (!authority) {
    return {
      outcome: "malformed_source",
      detail: `source_url "${record.source_url}" does not resolve to an accepted authority for policy facts (was source_authority_passes_gate=${record.source_authority_passes_gate} at research time).`,
      universityId,
      row: null,
    };
  }

  const dedupKey = deadlineDedupKey(universityId, record.deadline_type, factKey);
  if (existingKeys.has(dedupKey)) {
    return { outcome: "duplicate", detail: "Same university, deadline type, and date/recurrence already exists.", universityId, row: null };
  }

  return {
    outcome: "accepted",
    detail: null,
    universityId,
    row: {
      university_id: universityId,
      program_id: null,
      deadline_type: record.deadline_type,
      deadline_date: deadlineDate,
      application_cycle: record.cycle_label ?? (record.cycle_year ? String(record.cycle_year) : null),
      source_url: record.source_url,
      retrieved_at: record.retrieved_at,
      recurrence: record.recurrence,
      recurrence_month: recurrenceMonth,
      recurrence_day: recurrenceDay,
      cycle_year: record.cycle_year,
      cycle_label: record.cycle_label ?? null,
      verification_state: record.verification_state,
      deadline_text_verbatim: record.deadline_text_verbatim,
      source_type: record.source_type,
      binding_policy: deriveBindingPolicy(record.cycle_label),
      research_record_id: record.research_deadline_id,
    },
  };
}

/** `factKey` is either an ISO deadline_date (dated_specific) or `recurring:MM-DD`
 * (recurring_annual_undated) — see decideDeadlineIngestion's own doc comment. */
export function deadlineDedupKey(universityId: string, deadlineType: string, factKey: string): string {
  return `${universityId}|${deadlineType}|${factKey}`;
}

/** Builds the same `recurring:MM-DD` shape decideDeadlineIngestion uses internally, for callers
 * (scripts/ingest-requirements-deadlines.ts) constructing existingKeys from already-live rows
 * that have recurrence_month/recurrence_day set instead of deadline_date. */
export function recurringFactKey(month: number, day: number): string {
  return `recurring:${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Derives the same factKey shape decideDeadlineIngestion computes internally, from any row
 * shape (an already-live DB row, or a just-built AcceptedDeadlineRow) carrying these four
 * fields — the single source of truth both the live-table dedup-pool builder and the
 * same-batch dedup tracker in scripts/ingest-requirements-deadlines.ts key off, so the two
 * can never silently disagree about what counts as "the same fact". Returns null when neither
 * a date nor a complete recurrence pair is present (a row that shouldn't be possible given the
 * DB's own university_deadlines_recurrence_shape_check, but not this function's job to enforce). */
export function deadlineFactKeyFromRow(row: { recurrence: string; deadline_date: string | null; recurrence_month: number | null; recurrence_day: number | null }): string | null {
  if (row.recurrence === "recurring_annual_undated" && row.recurrence_month != null && row.recurrence_day != null) {
    return recurringFactKey(row.recurrence_month, row.recurrence_day);
  }
  return row.deadline_date ?? null;
}

export interface DeadlineWriteClient {
  insertDeadline(row: AcceptedDeadlineRow): Promise<{ id: string | null; error: { message: string } | null }>;
  insertQueueRow(row: DeadlineQueueRowInput): Promise<{ error: { message: string } | null }>;
}

export interface DeadlineQueueRowInput {
  batch_id: string;
  research_deadline_id: string;
  university_id: string | null;
  university_name_input: string | null;
  university_country_input: string | null;
  program_name_input: string | null;
  deadline_type_input: string | null;
  deadline_date_input: string | null;
  recurrence_input: string | null;
  source_url_input: string | null;
  source_type_input: string | null;
  verification_state_input: string | null;
  raw_payload: unknown;
  outcome: DeadlineIngestOutcome;
  outcome_detail: string | null;
  promoted_deadline_id: string | null;
}

export interface ApplyDeadlineResult {
  accepted: boolean;
  orphaned: boolean;
  insertError: string | null;
  queueInsertError: string | null;
}

export async function applyDeadlineDecision(
  record: ResearchDeadlineRecord,
  decision: DeadlineIngestDecision,
  batchId: string,
  client: DeadlineWriteClient,
  queueRetryAttempts = 3
): Promise<ApplyDeadlineResult> {
  const { id: promotedId, error: insertError } = decision.outcome === "accepted" && decision.row ? await client.insertDeadline(decision.row) : { id: null, error: null };

  const effectiveOutcome: DeadlineIngestOutcome = insertError ? "rejected" : decision.outcome;
  const effectiveDetail = insertError ? `Decided "${decision.outcome}" but the university_deadlines insert failed: ${insertError.message}` : decision.detail;

  const queueRow: DeadlineQueueRowInput = {
    batch_id: batchId,
    research_deadline_id: record.research_deadline_id,
    university_id: decision.universityId,
    university_name_input: record.university_name,
    university_country_input: record.university_country,
    program_name_input: record.program_name,
    deadline_type_input: record.deadline_type,
    deadline_date_input: record.deadline_date,
    recurrence_input: record.recurrence,
    source_url_input: record.source_url,
    source_type_input: record.source_type,
    verification_state_input: record.verification_state,
    raw_payload: record,
    outcome: effectiveOutcome,
    outcome_detail: effectiveDetail,
    promoted_deadline_id: promotedId,
  };

  let queueError: { message: string } | null = null;
  for (let attempt = 1; attempt <= queueRetryAttempts; attempt++) {
    const result = await client.insertQueueRow(queueRow);
    queueError = result.error;
    if (!queueError) break;
    if (attempt < queueRetryAttempts) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }

  return {
    accepted: !insertError && decision.outcome === "accepted",
    orphaned: Boolean(promotedId) && Boolean(queueError),
    insertError: insertError?.message ?? null,
    queueInsertError: queueError?.message ?? null,
  };
}
