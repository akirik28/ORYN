#!/usr/bin/env node
/**
 * Inserts the 5 confirmed UK "15 October" program-specific deadline rows (Bristol x3:
 * Medicine/Dentistry/Veterinary Science; KCL x2: Medicine/Dentistry) from
 * data/research/university-requirements/uk_deadlines_october_exception_2026-09-01.jsonl.
 *
 * This is a standalone INSERT script, not a run through
 * scripts/ingest-requirements-deadlines.ts, for one specific reason: that shared pipeline's
 * row builder (lib/deadlines/ingest.ts, AcceptedDeadlineRow) hard-codes `program_id: null`
 * for every row regardless of input — program_name is accepted into the JSONL contract but
 * silently dropped at write time (see lib/deadlines/ingest.ts:35 and :279). That is the root
 * cause CEO's finding traces to: 0 of 465 existing deadlines are program-linked because the
 * pipeline has never been able to write a link, not because no research ever named a program.
 *
 * Fixing that pipeline-wide is a real, separate change with its own risk (other lanes are
 * actively ingesting through it tonight) and its own judgment calls (fuzzy-matching
 * program_name against university_programs.name safely). Out of scope for "the eight UK rows
 * first." Instead, this script writes program_id directly from a hand-verified, hard-coded
 * mapping (known_program_id in the JSONL, cross-checked against university_programs by hand
 * before this script was written) — five rows, five already-confirmed real program rows, no
 * new program rows created, no fuzzy matching, no schema change.
 *
 * Dry-run by default; writes only with --apply.
 *
 * Usage:
 *   npx tsx scripts/insert-uk-october-deadlines.ts
 *   npx tsx scripts/insert-uk-october-deadlines.ts --apply
 */
import { readFileSync } from "node:fs";

try {
  process.loadEnvFile(".env.local");
} catch {
  // fine
}

interface DeadlineRecord {
  research_deadline_id: string;
  university_name: string;
  known_program_id: string;
  deadline_type: string;
  deadline_date: string;
  deadline_text_verbatim: string;
  cycle_year: number;
  cycle_label: string;
  source_url: string;
  source_type: string;
  retrieved_at: string;
  verification_state: string;
}

function parseJsonl<T>(path: string): T[] {
  return readFileSync(path, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }

  const records = parseJsonl<DeadlineRecord>(
    "data/research/university-requirements/uk_deadlines_october_exception_2026-09-01.jsonl"
  );
  console.log(`Loaded ${records.length} record(s).`);

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  // Safety: confirm every known_program_id is real, belongs to the named university, and
  // isn't already the target of a deadline row with the same date (idempotency / no dupes).
  const toInsert: (DeadlineRecord & { university_id: string })[] = [];
  for (const r of records) {
    const { data: program, error: progErr } = await admin
      .from("university_programs")
      .select("id,university_id,name,universities(name)")
      .eq("id", r.known_program_id)
      .single();
    if (progErr || !program) {
      console.error(`  SKIP ${r.research_deadline_id}: program_id ${r.known_program_id} not found (${progErr?.message ?? "no row"})`);
      continue;
    }
    const uniName = (program as unknown as { universities: { name: string } }).universities?.name;
    if (uniName !== r.university_name) {
      console.error(`  SKIP ${r.research_deadline_id}: program belongs to "${uniName}", expected "${r.university_name}"`);
      continue;
    }
    const { data: existing } = await admin
      .from("university_deadlines")
      .select("id")
      .eq("program_id", r.known_program_id)
      .eq("deadline_date", r.deadline_date)
      .eq("deadline_type", r.deadline_type);
    if (existing && existing.length > 0) {
      console.log(`  Already present, skipping: ${r.research_deadline_id} (program ${r.known_program_id}, ${r.deadline_date})`);
      continue;
    }
    toInsert.push({ ...r, university_id: program.university_id });
  }

  console.log(`Ready to insert: ${toInsert.length}/${records.length}`);
  if (toInsert.length === 0) {
    console.log("\nNothing to do.");
    return;
  }

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
    for (const r of toInsert) {
      console.log(`  would insert: ${r.university_name} | program ${r.known_program_id} | ${r.deadline_date} | ${r.research_deadline_id}`);
    }
    return;
  }

  let succeeded = 0;
  let failed = 0;
  for (const r of toInsert) {
    const { error } = await admin.from("university_deadlines").insert({
      university_id: r.university_id,
      program_id: r.known_program_id,
      deadline_type: r.deadline_type,
      deadline_date: r.deadline_date,
      application_cycle: r.cycle_label,
      source_url: r.source_url,
      retrieved_at: r.retrieved_at,
      recurrence: "dated_specific",
      recurrence_month: null,
      recurrence_day: null,
      cycle_year: r.cycle_year,
      cycle_label: r.cycle_label,
      verification_state: r.verification_state,
      deadline_text_verbatim: r.deadline_text_verbatim,
      source_type: r.source_type,
      binding_policy: null,
      research_record_id: r.research_deadline_id,
    });
    if (error) {
      failed++;
      console.error(`  FAILED ${r.research_deadline_id}: ${error.message}`);
    } else {
      succeeded++;
    }
  }
  console.log(`\nInserted ${succeeded}/${toInsert.length} row(s). ${failed} failure(s).`);
}

main();
