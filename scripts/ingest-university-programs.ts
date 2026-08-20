#!/usr/bin/env node
/**
 * University-programs research handoff ingestion (spec Phase: university programs
 * pipeline). Reads a JSONL batch matching docs/research-handoff-university-programs.md,
 * resolves each record's university via lib/acquisition/identity.ts's shared, alias-aware
 * matching, and writes every outcome (accepted/duplicate/unresolved/insufficient-evidence/
 * malformed-source) to program_research_queue — only `accepted` rows also land in
 * university_programs.
 *
 * Idempotent and restartable: re-running the same batch produces `duplicate` outcomes for
 * anything already accepted, never a second insert (belt-and-suspenders with the DB's own
 * unique index on university_programs).
 *
 * Reads universities/aliases/external-ids via lib/acquisition/paginate.ts rather than a
 * plain supabase-js `.select()` — PostgREST's default 1000-row cap silently truncates an
 * unpaginated read, and `universities` alone is 1010 rows. An earlier version of this
 * script had exactly that bug (would have silently dropped the last ~10 universities,
 * alphabetically, from the candidate pool); fixed as part of reconciling with the
 * acquisition pipeline's own hard-won fix for the same bug class.
 *
 * Usage:
 *   npm run ingest:university-programs -- data/research/university-programs/batch1.jsonl
 *   npm run ingest:university-programs -- data/research/university-programs/batch1.jsonl --apply
 *
 * Deliberately does NOT import anything under lib/ with `import "server-only"` (same
 * constraint as scripts/enrich-student-counts.ts).
 */
import { readFileSync } from "node:fs";
import { decideIngestion, programUrlKey, type ResearchProgramRecord, type UniversityLookupRow } from "../lib/programs/ingest";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

function parseJsonl(path: string): ResearchProgramRecord[] {
  const text = readFileSync(path, "utf-8");
  const records: ResearchProgramRecord[] = [];
  for (const [i, line] of text.split("\n").entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed));
    } catch (err) {
      throw new Error(`${path}:${i + 1}: malformed JSON — ${(err as Error).message}`);
    }
  }
  return records;
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
  official_program_url: string;
}

/** Full candidate pool for identity resolution — every university, alias-enriched, read
 * completely (see the pagination note above). Aliases/external-ids are grouped in memory
 * rather than joined per-university to avoid N+1 requests. */
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
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const path = args.find((a) => !a.startsWith("--"));
  if (!path) {
    console.error("Usage: npm run ingest:university-programs -- <path.jsonl> [--apply]");
    process.exitCode = 1;
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key: secretKey };

  const records = parseJsonl(path);
  console.log(`Loaded ${records.length} record(s) from ${path}.`);

  const [universities, { rows: existing }] = await Promise.all([
    loadUniversityCandidates(target),
    fetchAllRowsVerified<ExistingProgramRow>(target, "university_programs", "university_id,normalized_name,degree_level,official_program_url", "order=id"),
  ]);
  console.log(`Candidate pool: ${universities.length} universities (paginated + exact-count verified).`);

  const existingKeys = new Set([
    ...existing.map((r) => `${r.university_id}|${r.normalized_name}|${r.degree_level ?? ""}`),
    ...existing.map((r) => programUrlKey(r.university_id, r.official_program_url)),
  ]);

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const batchId = `${path.split("/").pop()}_${new Date().toISOString().slice(0, 10)}`;
  const decisions = records.map((record) => ({ record, decision: decideIngestion(record, universities, existingKeys) }));

  const counts: Record<string, number> = {};
  for (const { decision } of decisions) counts[decision.outcome] = (counts[decision.outcome] ?? 0) + 1;
  console.log("Outcome breakdown:", counts);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
    return;
  }

  let accepted = 0;
  for (const { record, decision } of decisions) {
    // Claim the key immediately so two accepted records in the same batch for the same
    // program don't both pass the pre-computed existingKeys check.
    if (decision.outcome === "accepted" && decision.programRow) {
      const key = `${decision.programRow.university_id}|${decision.programRow.normalized_name}|${decision.programRow.degree_level ?? ""}`;
      existingKeys.add(key);
      existingKeys.add(programUrlKey(decision.programRow.university_id, decision.programRow.official_program_url));
    }

    const { data: inserted, error: programError } =
      decision.outcome === "accepted" && decision.programRow
        ? await admin.from("university_programs").insert(decision.programRow).select("id").single()
        : { data: null, error: null };
    if (programError) {
      console.error(`  failed to insert program for ${record.university_name} / ${record.program_name}: ${programError.message}`);
      continue;
    }
    if (decision.outcome === "accepted") accepted += 1;

    const { error: queueError } = await admin.from("program_research_queue").insert({
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
      outcome: decision.outcome,
      outcome_detail: decision.detail,
      promoted_program_id: inserted?.id ?? null,
    });
    if (queueError) console.error(`  program written but queue audit row failed for ${record.research_program_id}: ${queueError.message}`);
  }

  console.log(`\nInserted ${accepted}/${records.length} row(s) into university_programs. Full audit trail in program_research_queue (batch_id='${batchId}').`);
}

main();
