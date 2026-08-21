import { resolveIdentity, type LocalUniversity } from "@/lib/acquisition/identity";
import { sourceAuthority, domainOf } from "@/lib/acquisition/source-authority";
import { statesTheSameFact } from "@/lib/requirements/dedup";
import type { RequirementCategory, RequirementGroupRole } from "@/types/database";

/** One record from data/research/university-requirements/requirements_batch*.jsonl — see
 * docs/research/university-requirements/research-handoff-university-requirements.md for the
 * full field-by-field contract. */
export interface ResearchRequirementRecord {
  research_requirement_id: string;
  university_name: string | null;
  university_country: string | null;
  university_official_domain?: string | null;
  program_name: string | null;
  category: string;
  requirement_category_db: string;
  requirement_text: string | null;
  text_fidelity: string;
  applies_to?: string | null;
  scope?: string | null;
  source_url: string;
  source_type: string;
  source_authority_passes_gate: boolean;
  source_authority_note?: string | null;
  retrieved_at: string;
  cycle_year: number | null;
  confidence: string;
  verification_state: string;
  limitations?: string | null;
  researcher_notes?: string | null;
  is_exclusion?: boolean | null;
  /** The source document's own clause numbering ("B-a-1", "B-b-5-a", "A-2-c-ii"), verbatim.
   * Present on 17 records in the 2026-08-21 corpus, all from the YÖK esaslar batch. Stored
   * as-is and never parsed — see migration 0052's comment on the column. */
  clause_ref?: string | null;
  test_scale?: string | null;
  scale_ambiguity?: string | null;
  supersedes?: string | null;
}

export type UniversityLookupRow = LocalUniversity & { websiteUrl?: string | null };

/** A source record's own stated properties rule it out today — one outcome, the specific
 * reason always lives in `detail` rather than multiplying this enum per cause (mirrors
 * lib/programs/ingest.ts's IngestOutcome philosophy). */
export type RequirementIngestOutcome = "accepted" | "duplicate" | "unresolved_university" | "superseded" | "not_ingestible" | "malformed_source" | "rejected";

export interface AcceptedRequirementRow {
  university_id: string;
  program_id: null;
  requirement_type: RequirementCategory;
  title: string;
  requirement_detail: string;
  is_required: boolean;
  structured_rule: null;
  data_confidence: "high" | "medium" | "low";
  scope: string | null;
  source_url: string;
  retrieved_at: string;
  /** Migration 0052's columns. They existed from 0052 but this builder never set them, which
   * is why an exclusion record could only ever be dropped (`not_ingestible`) rather than
   * stored with its meaning intact — the "eligibility encoded as absence" failure: Ankara
   * University's SAT threshold (REQ-2026-08-21-9324) lands while the heading that governs it
   * ("VALID EXAMINATIONS AND REQUIRED SCORES FOR PROGRAMMES EXCLUDING THE ABOVE-LISTED",
   * REQ-2026-08-21-9321) is discarded, leaving a student who is not eligible under that
   * heading looking like they qualify. */
  is_exclusion: boolean;
  clause_ref: string | null;
  requirement_group_id: string | null;
  group_role: RequirementGroupRole | null;
}

export interface RequirementIngestDecision {
  outcome: RequirementIngestOutcome;
  detail: string | null;
  universityId: string | null;
  row: AcceptedRequirementRow | null;
}

/** Verification states a requirement record can carry that make it unsafe to stage as a clean
 * current fact today, regardless of what the number/text says — see
 * docs/research/university-requirements/scalar-thresholds-are-not-enough.md. Not exported:
 * deadlines have their own, overlapping-but-not-identical unsafe set (VERIFIED_HISTORICAL
 * matters there; it never appears on a requirement record in this corpus). */
const UNSAFE_VERIFICATION_STATES = new Set(["CONFLICTING_EVIDENCE", "NEEDS_REVIEW", "CURRENT_CYCLE_NOT_PUBLISHED"]);
const UNSAFE_SCALE_AMBIGUITY = new Set(["undated_scale_assumption", "partially_unsatisfiable"]);

/** The bucket within which two requirements are compared for duplication. Migration 0056
 * widened the DB index to `(university_id, requirement_type, COALESCE(scope,''),
 * md5(COALESCE(title,'')))`, so this key is now deliberately COARSER than the constraint:
 * it collects every row sharing university+type+scope, and `decideRequirementIngestion`
 * then applies fuzzy title similarity within that bucket. The two no longer have identical
 * shapes and must not — the index catches only byte-identical titles (a re-ingest of the
 * same fact), while the application check also catches rewordings. Application dedup is the
 * wider net; the index is the backstop underneath it. What changed in 0056 is that four
 * genuinely different alternatives, which this key groups together, are no longer collapsed
 * to one row by the database before the title check can distinguish them. */
export function requirementDedupKey(universityId: string, requirementType: string, scope: string | null): string {
  return `${universityId}|${requirementType}|${scope ?? ""}`;
}

export function resolveRequirementUniversity(record: ResearchRequirementRecord, universities: readonly UniversityLookupRow[]): { universityId: string | null; reason: string | null } {
  if (!record.university_name?.trim()) {
    return { universityId: null, reason: "No university_name — a national-level or context/reference record, not attached to one institution." };
  }
  const resolution = resolveIdentity({ displayName: record.university_name, names: [record.university_name], countryName: record.university_country ?? null }, universities);
  if (resolution.status === "matched") return { universityId: resolution.match.universityId, reason: null };
  return { universityId: null, reason: resolution.reason };
}

/** Pure decision function — no I/O. `supersededIds` is the set of every `supersedes` value
 * present anywhere in the batch (a record another record explicitly supersedes is stale by the
 * research lane's own admission, even when nothing else about it looks wrong — see the
 * dry-run report's "Boğaziçi" case). `existingTitlesByKey` is what's already live, grouped by
 * `requirementDedupKey()`, checked via the same lib/requirements/dedup.ts `statesTheSameFact`
 * that isDuplicateRequirement uses — Jaccard title similarity, but refusing to merge two
 * titles whose NUMBERS differ, because for a threshold fact the number is the fact.
 *
 * university_requirements has a DB-level unique index for program_id-null rows. Migration
 * 0042 keyed it on `(university_id, requirement_type, COALESCE(scope,''))`, which permitted
 * exactly one requirement per university per type per scope and so destroyed every
 * alternative after the first: all 36 rows recorded as `rejected` in
 * requirement_research_queue are that index firing, Edinburgh losing three of its four
 * English-proficiency routes among them. Migration 0056 folds `md5(COALESCE(title,''))` into
 * the key, so genuinely different alternatives coexist while a byte-identical re-ingest is
 * still caught. The residual cost, identical to the one migration 0053 accepted for
 * programmes: a reworded title inserts a second row instead of being auto-merged — visible
 * and both-rows-true, rather than silent loss. A rejected insert still surfaces honestly as
 * `rejected` via applyRequirementDecision, same as any other DB error. */
export function decideRequirementIngestion(
  record: ResearchRequirementRecord,
  universities: readonly UniversityLookupRow[],
  supersededIds: ReadonlySet<string>,
  existingTitlesByKey: ReadonlyMap<string, readonly string[]>
): RequirementIngestDecision {
  const { universityId, reason } = resolveRequirementUniversity(record, universities);
  if (!universityId) {
    return { outcome: "unresolved_university", detail: reason, universityId: null, row: null };
  }

  if (supersededIds.has(record.research_requirement_id)) {
    return { outcome: "superseded", detail: "A newer record in this same corpus explicitly supersedes this one.", universityId, row: null };
  }

  // is_exclusion is no longer a reason to drop the record. Migration 0052 added the column
  // that makes an exclusion storable without inverting its meaning; this builder simply
  // never set it, so every exclusion was discarded and the fact survived only in
  // requirement_research_queue.raw_payload. Dropping them is the more dangerous option, not
  // the safer one: the thresholds those headings restrict are ingested regardless, so the
  // student sees the qualifying score and never the carve-out that disqualifies them.
  // lib/requirements/evaluate.ts refuses to auto-resolve any row carrying the flag.

  if (UNSAFE_VERIFICATION_STATES.has(record.verification_state)) {
    return { outcome: "not_ingestible", detail: `verification_state=${record.verification_state}`, universityId, row: null };
  }

  if (record.scale_ambiguity && UNSAFE_SCALE_AMBIGUITY.has(record.scale_ambiguity)) {
    return { outcome: "not_ingestible", detail: `scale_ambiguity=${record.scale_ambiguity}`, universityId, row: null };
  }

  if (!record.requirement_text?.trim()) {
    return { outcome: "not_ingestible", detail: "requirement_text is null/empty — nothing to show a student.", universityId, row: null };
  }

  const matchedUniversity = universities.find((u) => u.id === universityId);
  const officialDomains = new Set(matchedUniversity?.websiteUrl ? [domainOf(matchedUniversity.websiteUrl)] : []);
  const authority = sourceAuthority("policy", record.source_url, officialDomains);
  if (!authority) {
    return {
      outcome: "malformed_source",
      detail: `source_url "${record.source_url}" does not resolve to an accepted authority for policy facts (was source_authority_passes_gate=${record.source_authority_passes_gate} at research time) — ${record.source_authority_note ?? "no note"}`,
      universityId,
      row: null,
    };
  }

  const dedupKey = requirementDedupKey(universityId, record.requirement_category_db, record.scope ?? null);
  const title = record.requirement_text.slice(0, 200);
  const existingForKey = existingTitlesByKey.get(dedupKey) ?? [];
  const isDuplicate = existingForKey.some((existingTitle) => statesTheSameFact(existingTitle, title));
  if (isDuplicate) {
    return { outcome: "duplicate", detail: "An existing (or earlier-in-this-batch) requirement for the same university, category, and scope has a highly similar title.", universityId, row: null };
  }

  return {
    outcome: "accepted",
    detail: null,
    universityId,
    row: {
      university_id: universityId,
      program_id: null,
      requirement_type: record.requirement_category_db as RequirementCategory,
      title,
      requirement_detail: record.requirement_text,
      is_required: true,
      structured_rule: null,
      scope: record.scope ?? null,
      data_confidence: (record.confidence as "high" | "medium" | "low") ?? "medium",
      source_url: record.source_url,
      retrieved_at: record.retrieved_at,
      is_exclusion: record.is_exclusion === true,
      clause_ref: record.clause_ref?.trim() || null,
      // Grouping is deliberately NOT inferred here. requirement_groups models "any one of N
      // alternatives satisfies this", and no record in this corpus states which rows form
      // such a set — the only available signal would be "same university + type + scope +
      // source page", which is precisely the inference migration 0052 forbids ("never
      // populated by backfilling existing rows on inference"). Guessing it wrong is not a
      // cosmetic error: a qualifier miscounted as a fifth alternative would let a student
      // satisfy the group by meeting a condition that was never an alternative at all.
      // These stay null until a record carries an explicit group, or an admin assigns one.
      // Both columns move together — migration 0052's
      // university_requirements_group_role_consistency requires each to be null iff the
      // other is.
      requirement_group_id: null,
      group_role: null,
    },
  };
}

export interface RequirementWriteClient {
  insertRequirement(row: AcceptedRequirementRow): Promise<{ id: string | null; error: { message: string } | null }>;
  insertQueueRow(row: RequirementQueueRowInput): Promise<{ error: { message: string } | null }>;
}

/** Column shape must match the live requirement_research_queue table exactly — see
 * supabase/migrations/0051_requirement_deadline_research_queue.sql's own note on why this
 * differs from what that file originally specified (requirement_type_input/scope_input, not
 * category_input/requirement_category_db_input): the applied schema was revised after this
 * file was first written, and this type was updated to match reality rather than the other
 * way round. requirement_category_db (the actual DB enum value being inserted) is what's kept
 * — category (the founder-brief's coarser taxonomy) is still fully recoverable from
 * raw_payload, just not as its own indexed column. */
export interface RequirementQueueRowInput {
  batch_id: string;
  research_requirement_id: string;
  university_id: string | null;
  university_name_input: string | null;
  university_country_input: string | null;
  program_name_input: string | null;
  requirement_type_input: string | null;
  scope_input: string | null;
  requirement_text_input: string | null;
  source_url_input: string | null;
  source_type_input: string | null;
  verification_state_input: string | null;
  raw_payload: unknown;
  outcome: RequirementIngestOutcome;
  outcome_detail: string | null;
  promoted_requirement_id: string | null;
}

export interface ApplyRequirementResult {
  accepted: boolean;
  orphaned: boolean;
  insertError: string | null;
  queueInsertError: string | null;
}

/** Same shape as lib/programs/ingest.ts's applyDecision: writes the requirement row if
 * accepted, then ALWAYS writes an audit row, downgrading the outcome to "rejected" (with the
 * real DB error) if the insert failed despite being decided "accepted" — nothing is ever
 * recorded as a success it didn't have. The queue insert retries on transient failure. */
export async function applyRequirementDecision(
  record: ResearchRequirementRecord,
  decision: RequirementIngestDecision,
  batchId: string,
  client: RequirementWriteClient,
  queueRetryAttempts = 3
): Promise<ApplyRequirementResult> {
  const { id: promotedId, error: insertError } = decision.outcome === "accepted" && decision.row ? await client.insertRequirement(decision.row) : { id: null, error: null };

  const effectiveOutcome: RequirementIngestOutcome = insertError ? "rejected" : decision.outcome;
  const effectiveDetail = insertError ? `Decided "${decision.outcome}" but the university_requirements insert failed: ${insertError.message}` : decision.detail;

  const queueRow: RequirementQueueRowInput = {
    batch_id: batchId,
    research_requirement_id: record.research_requirement_id,
    university_id: decision.universityId,
    university_name_input: record.university_name,
    university_country_input: record.university_country,
    program_name_input: record.program_name,
    requirement_type_input: record.requirement_category_db,
    scope_input: record.scope ?? null,
    requirement_text_input: record.requirement_text,
    source_url_input: record.source_url,
    source_type_input: record.source_type,
    verification_state_input: record.verification_state,
    raw_payload: record,
    outcome: effectiveOutcome,
    outcome_detail: effectiveDetail,
    promoted_requirement_id: promotedId,
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
