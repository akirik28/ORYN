import { resolveIdentity, type LocalUniversity } from "@/lib/acquisition/identity";
import { sourceAuthority, domainOf } from "@/lib/acquisition/source-authority";
import { normalizeTitle, titleSimilarity } from "@/lib/opportunities/dedup";
import type { RequirementCategory } from "@/types/database";

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
/** Mirrors lib/requirements/evaluate.ts's SAFE_SCALE_AMBIGUITY as its exact complement, and
 * migration 0056 §1's own rule ("anything other than the first two blocks automatic
 * evaluation"). `possibly_discontinued_instrument` was missing here — a threshold on an exam
 * that may no longer be offered was being staged as a clean current fact, which is
 * lib/requirements/shape-audit.ts's Finding 3 and the exact drift that comment warns about. */
const UNSAFE_SCALE_AMBIGUITY = new Set(["undated_scale_assumption", "partially_unsatisfiable", "possibly_discontinued_instrument"]);

/** Mirrors university_requirements_university_type_scope_idx's own key shape exactly
 * (`(university_id, requirement_type, COALESCE(scope,''))`) so the application-level dedup
 * check and the real DB constraint agree on what "the same requirement" means. */
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
 * `requirementDedupKey()`, checked via the same Jaccard title-similarity
 * lib/requirements/dedup.ts's isDuplicateRequirement already uses.
 *
 * university_requirements DOES have a DB-level unique index for program_id-null rows —
 * `(university_id, requirement_type, COALESCE(scope,''))` (migration 0042) — which every row
 * this ingestion writes falls under (program_id is always null here). It exists to keep
 * genuinely different per-applicant-group requirements distinct (an international-only English
 * requirement and a domestic one are two rows, not a conflict), not to guarantee one row per
 * type per university — two different `minimum_grade` facts sharing both type and scope (or
 * both null-scope) will still collide there. `scope` is threaded through from the record's own
 * field for exactly this reason, but this is a real, coarser-than-ideal constraint, not
 * something to work around here — a rejected insert surfaces honestly as `rejected` via
 * applyRequirementDecision, same as any other DB error. */
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

  if (record.is_exclusion === true) {
    return { outcome: "not_ingestible", detail: "is_exclusion=true — university_requirements has no column to mark a row as an exclusion, so storing it as an ordinary requirement would invert its meaning.", universityId, row: null };
  }

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
  const isDuplicate = existingForKey.some((existingTitle) => normalizeTitle(existingTitle) === normalizeTitle(title) || titleSimilarity(existingTitle, title) >= 0.6);
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
