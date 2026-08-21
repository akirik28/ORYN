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
  deadline_date: string;
  application_cycle: string | null;
  source_url: string;
  retrieved_at: string;
}

export interface DeadlineIngestDecision {
  outcome: DeadlineIngestOutcome;
  detail: string | null;
  universityId: string | null;
  row: AcceptedDeadlineRow | null;
}

/** VERIFIED_HISTORICAL matters here specifically (never appears on a requirement record in
 * this corpus): a real, correctly-fetched date for a cycle that has already closed. The
 * research corpus keeps it deliberately (prevents a future pass re-discovering the same date
 * and mistaking it for current), which is a different claim from "safe to insert into the live
 * university_deadlines table" — that table has no column to mark a row closed/non-actionable,
 * so a bare deadline_date sitting there reads as a live deadline. See the dry-run report's
 * Erasmus Rotterdam case. */
const UNSAFE_VERIFICATION_STATES = new Set(["CONFLICTING_EVIDENCE", "NEEDS_REVIEW", "CURRENT_CYCLE_NOT_PUBLISHED", "VERIFIED_HISTORICAL"]);

export function resolveDeadlineUniversity(record: ResearchDeadlineRecord, universities: readonly UniversityLookupRow[]): { universityId: string | null; reason: string | null } {
  if (!record.university_name?.trim()) {
    return { universityId: null, reason: "No university_name." };
  }
  const resolution = resolveIdentity({ displayName: record.university_name, names: [record.university_name], countryName: record.university_country ?? null }, universities);
  if (resolution.status === "matched") return { universityId: resolution.match.universityId, reason: null };
  return { universityId: null, reason: resolution.reason };
}

/** Pure decision function — no I/O. `existingDeadlines` is what's already live (or already
 * accepted earlier in this same batch), keyed by `${university_id}|${deadline_type}|${deadline_date}`
 * — exact match, not fuzzy, since a date either is or isn't the same fact (unlike a
 * requirement's free-text title). No DB-level unique index exists on university_deadlines, so
 * this is the only duplicate protection. */
export function decideDeadlineIngestion(record: ResearchDeadlineRecord, universities: readonly UniversityLookupRow[], existingKeys: ReadonlySet<string>): DeadlineIngestDecision {
  const { universityId, reason } = resolveDeadlineUniversity(record, universities);
  if (!universityId) {
    return { outcome: "unresolved_university", detail: reason, universityId: null, row: null };
  }

  if (record.recurrence === "recurring_annual_undated") {
    return {
      outcome: "not_ingestible",
      detail: `recurrence=recurring_annual_undated ("${record.deadline_text_verbatim}") — deadline_date is a real date column and cannot represent "no fixed year"; needs a recurrence_rule column (engineering follow-up, not this ingestion's call).`,
      universityId,
      row: null,
    };
  }
  if (record.recurrence === "not_published_centrally") {
    return { outcome: "not_ingestible", detail: "recurrence=not_published_centrally — nothing published to ingest.", universityId, row: null };
  }
  if (!record.deadline_date) {
    return { outcome: "not_ingestible", detail: `recurrence=${record.recurrence} but deadline_date is null — inconsistent record, needs review.`, universityId, row: null };
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

  const dedupKey = `${universityId}|${record.deadline_type}|${record.deadline_date}`;
  if (existingKeys.has(dedupKey)) {
    return { outcome: "duplicate", detail: "Same university, deadline type, and date already exists.", universityId, row: null };
  }

  return {
    outcome: "accepted",
    detail: null,
    universityId,
    row: {
      university_id: universityId,
      program_id: null,
      deadline_type: record.deadline_type,
      deadline_date: record.deadline_date,
      application_cycle: record.cycle_label ?? (record.cycle_year ? String(record.cycle_year) : null),
      source_url: record.source_url,
      retrieved_at: record.retrieved_at,
    },
  };
}

export function deadlineDedupKey(universityId: string, deadlineType: string, deadlineDate: string): string {
  return `${universityId}|${deadlineType}|${deadlineDate}`;
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
