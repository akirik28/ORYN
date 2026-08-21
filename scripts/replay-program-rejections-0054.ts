#!/usr/bin/env node
/**
 * Replay of the 58 Durham/Southampton records that migration 0054 (degree_type joined the
 * composite key) should now resolve — rejected during the 2026-08-21 20-file ingestion
 * (batch_ids independent_batch32_2026-08-21.jsonl_2026-08-21 and
 * independent_batch36_2026-08-21.jsonl_2026-08-21) under the pre-0054 key, since that
 * ingestion ran before 0054 went live and was deliberately not interrupted mid-flight (see
 * docs/handoffs/program-ingest-batch-2026-08-21-apply-report.md).
 *
 * Deliberately scoped to those two batch_ids only. Does NOT touch
 * independent_batch39_2026-08-21.jsonl_2026-08-21 (Istanbul University) — those 3 stay
 * audited and untouched, per instruction: no key shape resolves them (YOK Atlas has no
 * per-programme URL at all), and widening further to catch three records would be exactly the
 * reactive patch this whole pass has avoided. See docs/handoffs/program-ingest-batch-2026-08-21-dry-run-report.md
 * for the full characterization of why these two batches are safe to replay and Istanbul's
 * three are not.
 *
 * Same shape as scripts/replay-program-rejections-0053.ts (sources candidates directly from
 * program_research_queue.raw_payload, sequential decision computation, fresh live-state
 * re-query), not generalized into a shared tool — a third one-off replay is still not enough
 * repetition to justify the abstraction over copying a working, well-understood shape.
 *
 * Usage:
 *   npm run replay:program-rejections-0054           # dry run
 *   npm run replay:program-rejections-0054 -- --apply
 */
import { applyDecision, decideIngestion, programDedupKey, type ProgramWriteClient, type ResearchProgramRecord, type UniversityLookupRow } from "../lib/programs/ingest";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

const REPLAY_BATCH_IDS = ["independent_batch32_2026-08-21.jsonl_2026-08-21", "independent_batch36_2026-08-21.jsonl_2026-08-21"];

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
  degree_type: string | null;
}
interface QueueRow {
  id: string;
  batch_id: string;
  research_program_id: string;
  university_name_input: string;
  program_name_input: string;
  outcome: string;
  raw_payload: ResearchProgramRecord;
}

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

  const [universities, { rows: existing }, { rows: allDuplicates }] = await Promise.all([
    loadUniversityCandidates(target),
    fetchAllRowsVerified<ExistingProgramRow>(target, "university_programs", "university_id,normalized_name,degree_level,language_of_instruction,official_program_url,degree_type", "order=id"),
    fetchAllRowsVerified<QueueRow>(target, "program_research_queue", "id,batch_id,research_program_id,university_name_input,program_name_input,outcome,raw_payload", "outcome=eq.duplicate&order=id"),
  ]);
  console.log(`Candidate pool: ${universities.length} universities, ${existing.length} existing programs (both re-verified live).`);

  const candidates = allDuplicates.filter((r) => REPLAY_BATCH_IDS.includes(r.batch_id));
  console.log(`Replay set: ${candidates.length} record(s) from ${REPLAY_BATCH_IDS.join(", ")}.`);

  const existingKeys = new Set(
    existing.map((r) => programDedupKey(r.university_id, r.normalized_name, r.degree_level, r.language_of_instruction, r.official_program_url, r.degree_type))
  );

  const batchId = `replay-program-rejections-0054_${new Date().toISOString().slice(0, 10)}`;

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
          decision.programRow.official_program_url,
          decision.programRow.degree_type
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
    console.log(`\n${stillNotAccepted.length} record(s) still do NOT resolve to "accepted":`);
    for (const { queueRow, decision } of stillNotAccepted) {
      console.log(`  [${decision.outcome}] ${queueRow.university_name_input} / ${queueRow.program_name_input}: ${decision.detail}`);
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
      console.error(`  ORPHANED PROGRAM ROW — (${record.university_name} / ${record.program_name}): ${result.queueInsertError}. Needs manual reconciliation.`);
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
