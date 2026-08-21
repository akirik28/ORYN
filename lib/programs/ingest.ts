import { classifySubjects } from "./subject-taxonomy";
import { normalizeProgramName } from "./normalize";
import { resolveIdentity, type LocalUniversity } from "@/lib/acquisition/identity";
import { sourceAuthority, domainOf } from "@/lib/acquisition/source-authority";

/** One record from the research handoff contract — see
 * docs/research-handoff-university-programs.md for the full field-by-field spec. */
export interface ResearchProgramRecord {
  research_program_id: string;
  university_name: string;
  university_country: string;
  university_official_domain?: string | null;
  program_name: string;
  degree_level?: string | null;
  degree_type?: string | null;
  faculty_or_school?: string | null;
  subject_hint?: string | null;
  official_program_url: string;
  admissions_url?: string | null;
  source_url: string;
  source_type: string;
  verification_status: string;
  language_of_instruction?: string | null;
  duration?: string | null;
  campus?: string | null;
  delivery_mode?: string | null;
  international_eligible?: boolean | null;
  researched_at: string;
  researcher_notes?: string | null;
  evidence_excerpt?: string | null;
}

/** Re-exported so callers only need to import from this module. LocalUniversity (from
 * lib/acquisition/identity) is the platform-wide shape for "a university candidate an
 * identity match can be resolved against" — id, name, country, plus optional aliases and
 * external ids sourced from canonical_entities/entity_aliases/entity_external_ids. This
 * pipeline no longer keeps its own separate university-matching data shape.
 *
 * Extended (not forked) with an optional `websiteUrl` — universities.website_url, when
 * populated — purely so this module can establish an `officialDomains` hint for
 * sourceAuthority() itself; it plays no role in identity resolution. */
export type UniversityLookupRow = LocalUniversity & { websiteUrl?: string | null };

/**
 * University identity resolution for a research record — a thin adapter over
 * lib/acquisition/identity.ts's resolveIdentity(), which is the one entity-matching
 * implementation this platform has (see docs/research-handoff-university-programs.md's
 * "Entity linking" section for why a second, program-specific matcher was retired in favor
 * of this). Strict and alias-aware: exact name+country, then registered aliases
 * (entity_aliases, via LocalUniversity.aliases), then external ids — never fuzzy, and a
 * multi-candidate match is `unresolved`, not a guess.
 */
export function resolveUniversity(record: ResearchProgramRecord, universities: readonly UniversityLookupRow[]): { universityId: string | null; reason: string | null } {
  const resolution = resolveIdentity(
    {
      displayName: record.university_name,
      names: [record.university_name],
      countryName: record.university_country || null,
    },
    universities
  );
  if (resolution.status === "matched") return { universityId: resolution.match.universityId, reason: null };
  return { universityId: null, reason: resolution.reason };
}

/** A researcher-stated verification_status counts as page-confirmed only when it says so
 * explicitly. Mirrors the Drive-corpus vocabulary ("Verified - official ... page" vs
 * "... page retrieval blocked") without hardcoding to that exact phrasing, so a future
 * research process can use its own wording as long as it follows this shape. */
export function looksPageConfirmed(verificationStatus: string): boolean {
  const s = verificationStatus.toLowerCase();
  if (!s.includes("verified")) return false;
  const blockedMarkers = ["retrieval blocked", "page unfetched", "not fetched", "search result only", "unfetched"];
  return !blockedMarkers.some((marker) => s.includes(marker));
}

export type IngestOutcome = "accepted" | "duplicate" | "unresolved_university" | "insufficient_evidence" | "malformed_source" | "conflicting" | "rejected";

export interface AcceptedProgramRow {
  university_id: string;
  name: string;
  normalized_name: string;
  degree_level: string | null;
  field: string | null;
  subject_taxonomy: string;
  secondary_subject_tags: string[];
  language_of_instruction: string | null;
  campus: string | null;
  delivery_mode: string | null;
  international_eligible: boolean | null;
  degree_type: string | null;
  faculty_or_school: string | null;
  official_program_url: string;
  admissions_url: string | null;
  source_url: string;
  source_type: string;
  verification_state: "verified_current";
  notes: string;
  data_confidence: "high";
}

export interface IngestDecision {
  outcome: IngestOutcome;
  detail: string | null;
  universityId: string | null;
  programRow: AcceptedProgramRow | null;
}

/** No longer consulted by decideIngestion's own automatic duplicate detection — see
 * programDedupKey's comment for why (dedup-key-shape pass, migration 0053). Kept exported
 * only because scripts/stage-programs-ingestion-dryrun.ts (a completed, historical batch's
 * dry-run tool, not part of the live ingestion path) still imports it for its own
 * supersession-redirect check; do not wire this back into decideIngestion's automatic
 * duplicate detection without re-reading docs/handoffs/program-dedup-key-decision.md first —
 * that was tried and found to cause severe data loss (53 of 54 real cases were false
 * positives: distinct programmes sharing one institution's catalogue-listing page, not
 * actual duplicates). */
export function programUrlKey(universityId: string, officialProgramUrl: string): string {
  return `url:${universityId}|${officialProgramUrl}`;
}

/** ingest-fixes defect 6: `${university_id}|${normalized_program_name}|${degree_level ?? ""}`
 * alone treats a legitimate same-subject, different-language-of-instruction pair (e.g. a
 * Dutch and an English track of the same programme — a normal, common shape at Dutch/German
 * universities, not an edge case) as one duplicate identity, silently dropping the second one.
 * Language is a real, structural fact distinguishing two separately-enrollable programmes, not
 * cosmetic metadata, so it's now part of what makes two records "the same" or not.
 *
 * `officialProgramUrl` joined the key in the dedup-key-shape pass (migration 0053), replacing
 * the old separate `programUrlKey`-based "same URL anywhere at this university = duplicate,
 * regardless of name" check. That check was added to catch one real case (TU Delft: a
 * catalogue re-scrape produced "Computer Science & Engineering - English" for the same URL
 * already holding "Computer Science and Engineering") but, measured directly against
 * program_research_queue's full audit history, turned out to be wrong 53 times out of 54 real
 * firings — every other case was a university (Manchester, Wisconsin, METU, ~45 others) that
 * publishes one shared catalogue-listing URL for its entire, genuinely distinct programme
 * list, so the very first accepted programme silently blocked every other one at that
 * university sharing the same listing page. Folding the URL into the *composite* key instead
 * (alongside name/degree/language, not replacing them) fixes the actually-evidenced problem
 * this whole pass was assigned to solve — Bologna/Padua's campus-specific programmes, each
 * with its own official_program_url, wrongly forced to share one row — without the standalone
 * check's blind spot: two rows can now differ ONLY by URL and still correctly coexist, since a
 * shared catalogue URL no longer says anything about identity on its own. The accepted cost:
 * a same-programme, same-URL-would-have-caught-it rename like TU Delft's now inserts as two
 * rows instead of being auto-merged — occasional and human-visible (both rows are factually
 * true) rather than the old check's failure mode, which was systemic and silent. See
 * docs/handoffs/program-dedup-key-decision.md for the full evidence and the campus/
 * faculty_or_school widening this rejected in the same pass.
 *
 * Exported so the caller builds `existingKeys` (from live table rows) with the identical key
 * shape this function checks against — the two must never drift, or every existing row would
 * look "new" (an unrelated correctness bug) or every record would look "duplicate" (this bug,
 * again). `officialProgramUrl` is required, not optional: decideIngestion already rejects any
 * record missing it (as `insufficient_evidence`) before a dedup key is ever computed, so every
 * real call site has one — live data confirms 100% of today's rows do too. */
export function programDedupKey(
  universityId: string,
  normalizedName: string,
  degreeLevel: string | null,
  languageOfInstruction: string | null,
  officialProgramUrl: string
): string {
  return `${universityId}|${normalizedName}|${degreeLevel ?? ""}|${languageOfInstruction ?? ""}|${officialProgramUrl}`;
}

/** Pure decision function — no I/O, fully unit-testable. `existingKeys` is the set of
 * `programDedupKey(...)` combinations already present (live table rows + anything already
 * accepted earlier in this same batch), so a batch is idempotent against both re-runs and
 * internal duplicates. Callers may additionally populate `programUrlKey()` entries in the same
 * set — decideIngestion checks both a record's name-based key and its URL-based key, so a
 * same-URL/different-name duplicate is caught even though a name/degree-level/language match
 * alone would have missed it. */
export function decideIngestion(record: ResearchProgramRecord, universities: readonly UniversityLookupRow[], existingKeys: ReadonlySet<string>): IngestDecision {
  if (!record.university_name?.trim() || !record.program_name?.trim()) {
    return { outcome: "rejected", detail: "Missing university_name or program_name.", universityId: null, programRow: null };
  }

  const { universityId, reason } = resolveUniversity(record, universities);
  if (!universityId) {
    return { outcome: "unresolved_university", detail: reason, universityId: null, programRow: null };
  }

  if (!record.official_program_url?.trim() || !record.source_url?.trim()) {
    return { outcome: "insufficient_evidence", detail: "Missing official_program_url or source_url.", universityId, programRow: null };
  }

  // Source authority is resolved per fact class (lib/acquisition/source-authority.ts),
  // not asserted from the record's own claimed source_type — a record cannot self-certify
  // as official_primary; the URL's domain has to actually earn that for the "programs"
  // fact class. looksOfficial() alone only recognizes .edu/.ac./.gov-shaped domains, which
  // excludes plenty of genuine European institutions (ethz.ch, tudelft.nl, tum.de) — so a
  // matched university's own stored website_url is offered as an additional official
  // domain, the same "caller established it from an authoritative identity source" contract
  // sourceAuthority()'s officialDomains parameter documents.
  const matchedUniversity = universities.find((u) => u.id === universityId);
  const officialDomains = new Set(matchedUniversity?.websiteUrl ? [domainOf(matchedUniversity.websiteUrl)] : []);
  const authority = sourceAuthority("programs", record.source_url, officialDomains);
  if (!authority) {
    return {
      outcome: "malformed_source",
      detail: `source_url "${record.source_url}" does not resolve to an accepted authority for program facts (must be the institution's own domain).`,
      universityId,
      programRow: null,
    };
  }

  const normalizedName = normalizeProgramName(record.program_name);
  const dedupKey = programDedupKey(universityId, normalizedName, record.degree_level ?? null, record.language_of_instruction ?? null, record.official_program_url);
  if (existingKeys.has(dedupKey)) {
    return {
      outcome: "duplicate",
      detail: "Same university + program identity + degree level + language of instruction + official_program_url already exists.",
      universityId,
      programRow: null,
    };
  }

  if (!looksPageConfirmed(record.verification_status)) {
    return {
      outcome: "insufficient_evidence",
      detail: `verification_status "${record.verification_status}" reads as a search result, not a confirmed fetched page.`,
      universityId,
      programRow: null,
    };
  }

  const { primary, secondary } = classifySubjects(record.program_name);
  const delivery = record.delivery_mode;
  const validDelivery = delivery === "online" || delivery === "in_person" || delivery === "hybrid" ? delivery : null;

  return {
    outcome: "accepted",
    detail: null,
    universityId,
    programRow: {
      university_id: universityId,
      name: record.program_name,
      normalized_name: normalizedName,
      degree_level: record.degree_level ?? null,
      field: primary === "other" ? null : primary,
      subject_taxonomy: primary,
      secondary_subject_tags: secondary,
      language_of_instruction: record.language_of_instruction ?? null,
      campus: record.campus ?? null,
      delivery_mode: validDelivery,
      international_eligible: record.international_eligible ?? null,
      degree_type: record.degree_type ?? null,
      faculty_or_school: record.faculty_or_school ?? null,
      official_program_url: record.official_program_url,
      admissions_url: record.admissions_url ?? null,
      source_url: record.source_url,
      source_type: authority.sourceType,
      verification_state: "verified_current",
      notes: `Research handoff, program_id ${record.research_program_id}, researched_at ${record.researched_at}.`,
      data_confidence: "high",
    },
  };
}

/** What scripts/ingest-university-programs.ts's `--apply` step actually needs from a DB
 * client — narrow and mockable so applyDecision below is unit-testable without a real
 * Supabase connection, the same "inject the dependency, test the logic" shape decideIngestion
 * itself already uses for `universities`/`existingKeys`. */
export interface ProgramWriteClient {
  insertProgram(row: AcceptedProgramRow): Promise<{ id: string | null; error: { message: string } | null }>;
  insertQueueRow(row: ProgramQueueRowInput): Promise<{ error: { message: string } | null }>;
}

export interface ProgramQueueRowInput {
  batch_id: string;
  research_program_id: string;
  university_id: string | null;
  university_name_input: string;
  university_country_input: string;
  program_name_input: string;
  degree_level_input: string | null;
  official_program_url_input: string | null;
  source_url_input: string | null;
  source_type_input: string | null;
  verification_status_input: string | null;
  raw_payload: unknown;
  outcome: IngestOutcome;
  outcome_detail: string | null;
  promoted_program_id: string | null;
}

export interface ApplyDecisionResult {
  accepted: boolean;
  /** True only when the program insert succeeded but the queue audit row still failed after
   * exhausting retries — a permanently-orphaned program row (ingest-fixes defect 7), distinct
   * from a plain program-insert failure (which is now always fully audited, defect 6). */
  orphaned: boolean;
  programInsertError: string | null;
  queueInsertError: string | null;
}

/**
 * Applies one already-decided record: writes the program row if accepted, then ALWAYS writes
 * a program_research_queue audit row (ingest-fixes defect 6's invariant) — even when the
 * program insert failed the DB's own unique index despite decideIngestion saying "accepted"
 * (a legitimate same-dedup-key collision decideIngestion's own pre-computed-snapshot decision
 * couldn't see coming, or any other constraint violation). The queue row's own `outcome` is
 * downgraded to "rejected" with the real DB error in that case, rather than keeping the stale
 * "accepted" label — nothing is ever recorded as a success it didn't have.
 *
 * The queue insert itself retries (ingest-fixes defect 7) since losing ONLY the audit trail
 * after a program row already landed is a worse, non-self-healing failure (a batch re-run
 * reads the program back as "duplicate" and never retries the missing queue row) than losing
 * the program row itself.
 */
export async function applyDecision(
  record: ResearchProgramRecord,
  decision: IngestDecision,
  batchId: string,
  client: ProgramWriteClient,
  queueRetryAttempts = 3
): Promise<ApplyDecisionResult> {
  const { id: promotedId, error: programError } =
    decision.outcome === "accepted" && decision.programRow
      ? await client.insertProgram(decision.programRow)
      : { id: null, error: null };

  const effectiveOutcome: IngestOutcome = programError ? "rejected" : decision.outcome;
  const effectiveDetail = programError
    ? `Decided "${decision.outcome}" but the university_programs insert failed: ${programError.message}`
    : decision.detail;

  const queueRow: ProgramQueueRowInput = {
    batch_id: batchId,
    research_program_id: record.research_program_id,
    university_id: decision.universityId,
    university_name_input: record.university_name,
    university_country_input: record.university_country,
    program_name_input: record.program_name,
    degree_level_input: record.degree_level ?? null,
    official_program_url_input: record.official_program_url ?? null,
    source_url_input: record.source_url ?? null,
    source_type_input: record.source_type ?? null,
    verification_status_input: record.verification_status ?? null,
    raw_payload: record,
    outcome: effectiveOutcome,
    outcome_detail: effectiveDetail,
    promoted_program_id: promotedId,
  };

  let queueError: { message: string } | null = null;
  for (let attempt = 1; attempt <= queueRetryAttempts; attempt++) {
    const result = await client.insertQueueRow(queueRow);
    queueError = result.error;
    if (!queueError) break;
    if (attempt < queueRetryAttempts) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }

  return {
    accepted: !programError && decision.outcome === "accepted",
    orphaned: Boolean(promotedId) && Boolean(queueError),
    programInsertError: programError?.message ?? null,
    queueInsertError: queueError?.message ?? null,
  };
}
