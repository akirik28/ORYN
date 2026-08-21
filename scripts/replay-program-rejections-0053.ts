#!/usr/bin/env node
/**
 * One-time replay of program_research_queue rejections that migration 0053 (see
 * docs/handoffs/program-dedup-key-decision.md) should now resolve. Two populations, identified
 * by outcome + outcome_detail (not from memory — see the queries below):
 *
 *   1. 53 Middle East Technical University records rejected by the old, now-removed
 *      application-layer "same official_program_url anywhere at this university = duplicate,
 *      regardless of name" check. Filtered specifically to METU — the same outcome/detail also
 *      matches 1 ETH Zurich record, which was a CORRECT rejection (a genuine same-programme
 *      rename sharing a URL) and is deliberately excluded from replay: replaying it would
 *      create a real duplicate row, not recover a lost one.
 *   2. 11 University of Bologna / University of Padua records rejected by the pre-0053, four-
 *      column university_programs_dedup_idx (decideIngestion's own snapshot said "accepted";
 *      the database's stricter index caught what the snapshot couldn't see).
 *
 * Sources candidates directly from program_research_queue.raw_payload — the original
 * ResearchProgramRecord, stored verbatim for every decided record regardless of outcome (see
 * applyDecision in lib/programs/ingest.ts) — rather than a JSONL file, since this is a replay
 * of already-audited decisions, not new research. Re-queries university and existing-program
 * state fresh on every run (no caching, no snapshot reuse) — other lanes have written to both
 * tables since the original run.
 *
 * Does NOT assume every candidate will land: each one is re-run through the real, unmodified
 * decideIngestion() against current live state, so a record that now collides with a row
 * inserted by another lane since, or fails for an unrelated reason, is reported as such rather
 * than forced through.
 *
 * Usage:
 *   npm run replay:program-rejections-0053           # dry run — reports class counts only
 *   npm run replay:program-rejections-0053 -- --apply
 */
import { applyDecision, decideIngestion, programDedupKey, type ProgramWriteClient, type ResearchProgramRecord, type UniversityLookupRow } from "../lib/programs/ingest";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

interface UniversityRow {
  id: string;
  name: string;
  country: string;
  canonical_entity_id: string | null;
  website_url: string | null;
}
interface AliasRow {
  entity_id: string;
  alias: string;
}
interface ExternalIdRow {
  entity_id: string;
  id_system: string;
  external_id: string;
}
interface ExistingProgramRow {
  university_id: string;
  normalized_name: string;
  degree_level: string | null;
  language_of_instruction: string | null;
  official_program_url: string;
}
interface QueueRow {
  id: string;
  research_program_id: string;
  university_name_input: string;
  outcome: string;
  outcome_detail: string | null;
  raw_payload: ResearchProgramRecord;
}

/** Same loader as scripts/ingest-university-programs.ts, duplicated rather than imported —
 * that script doesn't export it, and this is a small, one-time tool where adding a shared
 * export to a working, tested script isn't worth the extra surface for one caller. */
async function loadUniversityCandidates(target: PostgrestTarget): Promise<UniversityLookupRow[]> {
  const [{ rows: universities }, { rows: aliases }, { rows: externalIds }] = await Promise.all([
    fetchAllRowsVerified<UniversityRow>(target, "universities", "id,name,country,canonical_entity_id,website_url", "order=id"),
    fetchAllRowsVerified<AliasRow>(target, "entity_aliases", "entity_id,alias", "order=id"),
    fetchAllRowsVerified<ExternalIdRow>(target, "entity_external_ids", "entity_id,id_system,external_id", "order=id"),
  ]);

  const aliasesByEntity = new Map<string, string[]>();
  for (const a of aliases) aliasesByEntity.set(a.entity_id, [...(aliasesByEntity.get(a.entity_id) ?? []), a.alias]);

  const externalIdsByEntity = new Map<string, Record<string, string>>();
  for (const e of externalIds) {
    const existing = externalIdsByEntity.get(e.entity_id) ?? {};
    existing[e.id_system] = e.external_id;
    externalIdsByEntity.set(e.entity_id, existing);
  }

  return universities.map((u) => ({
    id: u.id,
    name: u.name,
    country: u.country,
    aliases: u.canonical_entity_id ? aliasesByEntity.get(u.canonical_entity_id) : undefined,
    externalIds: u.canonical_entity_id ? externalIdsByEntity.get(u.canonical_entity_id) : undefined,
    websiteUrl: u.website_url,
  }));
}

const URL_CHECK_DETAIL = "Same official_program_url already exists at this university under a different name.";
const DB_CONSTRAINT_DETAIL_PREFIX = 'Decided "accepted" but the university_programs insert failed: duplicate key value violates unique constraint "university_programs_dedup_idx"';

/** The two replay populations, identified by outcome + outcome_detail directly against the
 * live table (not a hardcoded id list) — if either population's shape has changed since this
 * was written (e.g. someone else already replayed some of it), that will show up naturally in
 * the counts rather than silently going stale.
 *
 * Fetches the full `duplicate` and `rejected` outcome sets (182 + 12 rows as of the original
 * measurement — small) and filters in JS rather than pushing outcome_detail's exact text into
 * a PostgREST query string: fetchAllRows's `query` is inserted into the URL as-is, so a filter
 * value containing spaces/quotes would need careful manual encoding for no real benefit at
 * this row count. */
async function loadReplayCandidates(target: PostgrestTarget): Promise<QueueRow[]> {
  const cols = "id,research_program_id,university_name_input,outcome,outcome_detail,raw_payload";

  const [{ rows: duplicateRows }, { rows: rejectedRows }] = await Promise.all([
    fetchAllRowsVerified<QueueRow>(target, "program_research_queue", cols, "outcome=eq.duplicate&order=id"),
    fetchAllRowsVerified<QueueRow>(target, "program_research_queue", cols, "outcome=eq.rejected&order=id"),
  ]);

  const urlCheckRows = duplicateRows.filter((r) => r.outcome_detail === URL_CHECK_DETAIL);
  const metuOnly = urlCheckRows.filter((r) => r.university_name_input === "Middle East Technical University");
  const excluded = urlCheckRows.filter((r) => r.university_name_input !== "Middle East Technical University");
  if (excluded.length > 0) {
    console.log(
      `Excluded ${excluded.length} url-check-duplicate row(s) NOT from METU (correct rejections, not replayed): ${excluded.map((r) => `${r.university_name_input}/${r.research_program_id}`).join(", ")}`
    );
  }

  const constraintRejected = rejectedRows.filter((r) => (r.outcome_detail ?? "").startsWith(DB_CONSTRAINT_DETAIL_PREFIX));

  return [...metuOnly, ...constraintRejected];
}

async function main() {
  const apply = process.argv.includes("--apply");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key: secretKey };

  // Everything below is re-queried fresh on every invocation — no cached/prior-session state.
  const [universities, { rows: existing }, candidates] = await Promise.all([
    loadUniversityCandidates(target),
    fetchAllRowsVerified<ExistingProgramRow>(target, "university_programs", "university_id,normalized_name,degree_level,language_of_instruction,official_program_url", "order=id"),
    loadReplayCandidates(target),
  ]);
  console.log(`Candidate pool: ${universities.length} universities, ${existing.length} existing programs (both re-verified live).`);
  console.log(`Replay set: ${candidates.length} record(s).`);

  const existingKeys = new Set(
    existing.map((r) => programDedupKey(r.university_id, r.normalized_name, r.degree_level, r.language_of_instruction, r.official_program_url))
  );

  const batchId = `replay-program-rejections-0053_${new Date().toISOString().slice(0, 10)}`;

  // Sequential, not .map() over a static snapshot — this is a small, high-scrutiny batch and
  // several replay candidates could plausibly land on the identical new key (e.g. two METU
  // Northern Cyprus records), so existingKeys is updated after each decision, the same
  // discipline used for tables without university_programs' own DB-level backstop.
  const results: { queueRow: QueueRow; record: ResearchProgramRecord; decision: ReturnType<typeof decideIngestion> }[] = [];
  for (const queueRow of candidates) {
    const record = queueRow.raw_payload;
    const decision = decideIngestion(record, universities, existingKeys);
    if (decision.outcome === "accepted" && decision.programRow) {
      existingKeys.add(
        programDedupKey(
          decision.programRow.university_id,
          decision.programRow.normalized_name,
          decision.programRow.degree_level,
          decision.programRow.language_of_instruction,
          decision.programRow.official_program_url
        )
      );
    }
    results.push({ queueRow, record, decision });
  }

  const counts: Record<string, number> = {};
  for (const { decision } of results) counts[decision.outcome] = (counts[decision.outcome] ?? 0) + 1;
  console.log("\nOutcome breakdown:", counts);

  const stillNotAccepted = results.filter((r) => r.decision.outcome !== "accepted");
  if (stillNotAccepted.length > 0) {
    console.log(`\n${stillNotAccepted.length} record(s) still do NOT resolve to "accepted" — reason each:`);
    for (const { queueRow, decision } of stillNotAccepted) {
      console.log(`  [${decision.outcome}] ${queueRow.university_name_input} / ${queueRow.research_program_id}: ${decision.detail}`);
    }
  }

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const writeClient: ProgramWriteClient = {
    async insertProgram(row) {
      const { data, error } = await admin.from("university_programs").insert(row).select("id").single();
      return { id: data?.id ?? null, error };
    },
    async insertQueueRow(row) {
      const { error } = await admin.from("program_research_queue").insert(row);
      return { error };
    },
  };

  let accepted = 0;
  let orphaned = 0;
  for (const { record, decision } of results) {
    const result = await applyDecision(record, decision, batchId, writeClient);
    if (result.accepted) accepted += 1;
    if (result.programInsertError) {
      console.error(`  failed to insert program for ${record.university_name} / ${record.program_name}: ${result.programInsertError}`);
    }
    if (result.orphaned) {
      orphaned += 1;
      console.error(
        `  ORPHANED PROGRAM ROW — (${record.university_name} / ${record.program_name}) inserted successfully but its program_research_queue audit row failed after retries: ${result.queueInsertError}. Needs manual reconciliation.`
      );
    } else if (result.queueInsertError) {
      console.error(`  program_research_queue insert failed after retries for ${record.research_program_id}: ${result.queueInsertError}`);
    }
  }

  console.log(`\nInserted ${accepted}/${results.length} row(s) into university_programs. Full audit trail in program_research_queue (batch_id='${batchId}').`);
  if (orphaned > 0) {
    console.error(`\n${orphaned} program row(s) are ORPHANED — see lines above. Needs manual reconciliation, not a re-run.`);
  }
}

main();
