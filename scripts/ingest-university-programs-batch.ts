#!/usr/bin/env node
/**
 * Multi-file wrapper around lib/programs/ingest.ts's decideIngestion/applyDecision for the
 * 2026-08-21 backlog of never-ingested research files (20 files, 2,383 records — DE/NL
 * batches 1-5 plus independent batches 30-44). Verified independently before writing this
 * (both by matching filename-derived batch_id against program_research_queue and by
 * substring-matching each university's name against every existing batch_id) that none of
 * these have been ingested under any recognizable batch_id.
 *
 * Loads university candidates and existing program keys ONCE, then processes every file in
 * sequence with shared, incrementally-updated state — same "claim the key immediately" logic
 * scripts/ingest-university-programs.ts uses within one file, extended across files so a
 * (here, unlikely — all 20 files are different universities) cross-file duplicate is still
 * caught correctly rather than only checked against pre-existing live state. Each file keeps
 * its own batch_id (`<filename>_<date>`), unchanged from the single-file script's convention.
 *
 * Usage:
 *   npm run ingest:university-programs-batch -- file1.jsonl file2.jsonl ...
 *   npm run ingest:university-programs-batch -- file1.jsonl file2.jsonl ... -- --apply
 */
import { readFileSync } from "node:fs";
import { applyDecision, decideIngestion, programDedupKey, type ProgramWriteClient, type ResearchProgramRecord, type UniversityLookupRow } from "../lib/programs/ingest";
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
  language_of_instruction: string | null;
  official_program_url: string;
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
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const paths = args.filter((a) => !a.startsWith("--"));
  if (paths.length === 0) {
    console.error("Usage: npm run ingest:university-programs-batch -- <path1.jsonl> <path2.jsonl> ... [--apply]");
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

  const [universities, { rows: existing }] = await Promise.all([
    loadUniversityCandidates(target),
    fetchAllRowsVerified<ExistingProgramRow>(target, "university_programs", "university_id,normalized_name,degree_level,language_of_instruction,official_program_url", "order=id"),
  ]);
  console.log(`Candidate pool: ${universities.length} universities, ${existing.length} existing programs (both re-verified live).`);

  const existingKeys = new Set(
    existing.map((r) => programDedupKey(r.university_id, r.normalized_name, r.degree_level, r.language_of_instruction, r.official_program_url))
  );

  const { createClient } = await import("@supabase/supabase-js");
  const admin = apply ? createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
  const writeClient: ProgramWriteClient | null = admin
    ? {
        async insertProgram(row) {
          const { data, error } = await admin.from("university_programs").insert(row).select("id").single();
          return { id: data?.id ?? null, error };
        },
        async insertQueueRow(row) {
          const { error } = await admin.from("program_research_queue").insert(row);
          return { error };
        },
      }
    : null;

  const totalCounts: Record<string, number> = {};
  let totalAccepted = 0;
  let totalOrphaned = 0;
  const universitiesTouched = new Set<string>();

  // Decision computation is sequential — within a file AND across files — not a .map() over a
  // static snapshot. Found live, not theoretical: independent_batch39 (Istanbul University)
  // has three records literally named "İşletme" (Business Administration), two of which
  // (Faculty of Economics / Faculty of Political Science) share identical name, degree level,
  // language_of_instruction, AND official_program_url (every Turkish YOK Atlas record in this
  // whole backlog points at the literal portal homepage, https://yokatlas.yok.gov.tr/ — YOK
  // Atlas has no stable per-programme URL at all, per this batch's own researcher_notes, so
  // official_program_url provides zero discrimination for this entire population, unlike the
  // fr_it_es_ch batch migration 0053 was designed around). A static .map() computes both
  // decisions against the SAME starting existingKeys snapshot, so neither sees the other and
  // both independently decide "accepted" — university_programs' own unique index would still
  // catch the real collision at insert time (nothing gets silently duplicated), but the DRY
  // RUN's predicted counts would be wrong, showing "accepted" for a pair that will actually
  // land as one accepted + one rejected. Sequential computation makes the prediction accurate
  // instead of merely safe.
  for (const path of paths) {
    const records = parseJsonl(path);
    const batchId = `${path.split("/").pop()}_${new Date().toISOString().slice(0, 10)}`;

    const fileCounts: Record<string, number> = {};
    for (const record of records) {
      const decision = decideIngestion(record, universities, existingKeys);
      fileCounts[decision.outcome] = (fileCounts[decision.outcome] ?? 0) + 1;
      totalCounts[decision.outcome] = (totalCounts[decision.outcome] ?? 0) + 1;
      if (decision.outcome === "accepted" && decision.universityId) universitiesTouched.add(decision.universityId);

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

      if (apply && writeClient) {
        const result = await applyDecision(record, decision, batchId, writeClient);
        if (result.accepted) totalAccepted += 1;
        if (result.programInsertError) {
          console.error(`  failed to insert program for ${record.university_name} / ${record.program_name}: ${result.programInsertError}`);
        }
        if (result.orphaned) {
          totalOrphaned += 1;
          console.error(
            `  ORPHANED PROGRAM ROW — (${record.university_name} / ${record.program_name}) inserted successfully but its program_research_queue audit row failed after retries: ${result.queueInsertError}. Needs manual reconciliation.`
          );
        } else if (result.queueInsertError) {
          console.error(`  program_research_queue insert failed after retries for ${record.research_program_id}: ${result.queueInsertError}`);
        }
      }
    }
    console.log(`\n${path} (${records.length} records): ${JSON.stringify(fileCounts)}`);
  }

  console.log(`\n=== Totals across ${paths.length} file(s) ===`);
  console.log("Outcome breakdown:", totalCounts);
  console.log(`Distinct universities with at least one accepted record: ${universitiesTouched.size}`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
    return;
  }

  console.log(`\nInserted ${totalAccepted} row(s) into university_programs across all files.`);
  if (totalOrphaned > 0) {
    console.error(`\n${totalOrphaned} program row(s) are ORPHANED — see lines above. Needs manual reconciliation, not a re-run.`);
  }
}

main();
