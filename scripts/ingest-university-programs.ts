#!/usr/bin/env node
/**
 * University-programs research handoff ingestion (spec Phase: university programs
 * pipeline). Reads a JSONL batch matching docs/research-handoff-university-programs.md,
 * resolves each record's university via lib/programs/ingest.ts's strict alias-aware
 * matching, and writes every outcome (accepted/duplicate/unresolved/insufficient-evidence)
 * to program_research_queue — only `accepted` rows also land in university_programs.
 *
 * Idempotent and restartable: re-running the same batch produces `duplicate` outcomes for
 * anything already accepted, never a second insert (belt-and-suspenders with the DB's own
 * unique index on university_programs).
 *
 * Usage:
 *   npm run ingest:university-programs -- data/research/university-programs/batch1.jsonl
 *   npm run ingest:university-programs -- data/research/university-programs/batch1.jsonl --apply
 *
 * Deliberately does NOT import anything under lib/ with `import "server-only"` (same
 * constraint as scripts/enrich-student-counts.ts).
 */
import { readFileSync } from "node:fs";
import { decideIngestion, type ResearchProgramRecord, type UniversityLookupRow } from "../lib/programs/ingest";

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

  const records = parseJsonl(path);
  console.log(`Loaded ${records.length} record(s) from ${path}.`);

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: universities, error: uniError } = await admin.from("universities").select("id, name, country, website_url");
  if (uniError) {
    console.error(`Couldn't read universities: ${uniError.message}`);
    process.exitCode = 1;
    return;
  }

  const { data: existing, error: existingError } = await admin.from("university_programs").select("university_id, normalized_name, degree_level");
  if (existingError) {
    console.error(`Couldn't read existing university_programs: ${existingError.message}`);
    process.exitCode = 1;
    return;
  }
  const existingKeys = new Set((existing ?? []).map((r) => `${r.university_id}|${r.normalized_name}|${r.degree_level ?? ""}`));

  const batchId = `${path.split("/").pop()}_${new Date().toISOString().slice(0, 10)}`;
  const decisions = records.map((record) => ({ record, decision: decideIngestion(record, universities as UniversityLookupRow[], existingKeys) }));

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
