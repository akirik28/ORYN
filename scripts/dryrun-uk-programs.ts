#!/usr/bin/env node
/**
 * Dry-run driver for the 2026-08-22 UK programme catalogue batch (Oxford/Cambridge/Imperial/
 * UCL/LSE/Warwick/KCL, 934 records across 7 files). Imports the REAL decideIngestion and
 * programDedupKey from lib/programs/ingest.ts — never applyDecision — and drives them against
 * local JSON snapshots of universities/entity_aliases/entity_external_ids/university_programs
 * pulled live via the Supabase MCP (this worktree has no SUPABASE_SECRET_KEY), instead of the
 * live fetchAllRowsVerified() calls scripts/ingest-university-programs-batch.ts makes itself.
 * Snapshots were pulled in the same session, immediately before this run.
 *
 * Reports the outcome breakdown per file and in total, plus per-column non-null counts on the
 * accepted set (an "accepted" outcome proves a row WILL land, not that it lands complete —
 * per the coordinator's explicit ask after a prior batch landed 1,254 rows with every
 * qualifier column null and had to be rolled back).
 *
 * Nothing is written. This script has no --apply mode at all, deliberately — the coordinator
 * runs the actual apply themselves from a credentialed worktree.
 */
import { readFileSync } from "node:fs";
import { decideIngestion, programDedupKey, type ResearchProgramRecord, type UniversityLookupRow, type AcceptedProgramRow } from "../lib/programs/ingest";

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
  degree_type: string | null;
}

function loadUniversityCandidatesFromSnapshot(): UniversityLookupRow[] {
  const universities: UniversityRow[] = JSON.parse(readFileSync("/tmp/snapshot_universities.json", "utf-8"));
  const aliases: AliasRow[] = JSON.parse(readFileSync("/tmp/snapshot_aliases.json", "utf-8"));
  const externalIds: ExternalIdRow[] = JSON.parse(readFileSync("/tmp/snapshot_external_ids.json", "utf-8"));

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

function main() {
  const paths = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (paths.length === 0) {
    console.error("Usage: tsx scripts/dryrun-uk-programs.ts <path1.jsonl> <path2.jsonl> ...");
    process.exitCode = 1;
    return;
  }

  const universities = loadUniversityCandidatesFromSnapshot();
  const existingRows: ExistingProgramRow[] = JSON.parse(readFileSync("/tmp/snapshot_existing_programs.json", "utf-8"));
  console.log(
    `Candidate pool (from local snapshots, pulled live via Supabase MCP this session): ${universities.length} universities, ${existingRows.length} existing programs.`
  );

  const existingKeys = new Set(
    existingRows.map((r) => programDedupKey(r.university_id, r.normalized_name, r.degree_level, r.language_of_instruction, r.official_program_url, r.degree_type))
  );

  const totalCounts: Record<string, number> = {};
  const acceptedRows: AcceptedProgramRow[] = [];
  const unresolvedUniversityNames = new Map<string, number>();
  const universitiesTouched = new Set<string>();
  const rejectedExamples: { outcome: string; university: string; program: string; detail: string | null }[] = [];

  for (const path of paths) {
    const records = parseJsonl(path);
    const fileCounts: Record<string, number> = {};

    for (const record of records) {
      const decision = decideIngestion(record, universities, existingKeys);
      fileCounts[decision.outcome] = (fileCounts[decision.outcome] ?? 0) + 1;
      totalCounts[decision.outcome] = (totalCounts[decision.outcome] ?? 0) + 1;

      if (decision.outcome === "accepted" && decision.programRow) {
        acceptedRows.push(decision.programRow);
        universitiesTouched.add(decision.programRow.university_id);
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
      } else {
        if (decision.outcome === "unresolved_university") {
          unresolvedUniversityNames.set(record.university_name, (unresolvedUniversityNames.get(record.university_name) ?? 0) + 1);
        }
        if (rejectedExamples.length < 30 && decision.outcome !== "accepted") {
          rejectedExamples.push({ outcome: decision.outcome, university: record.university_name, program: record.program_name, detail: decision.detail });
        }
      }
    }
    console.log(`\n${path} (${records.length} records): ${JSON.stringify(fileCounts)}`);
  }

  console.log(`\n=== Totals across ${paths.length} file(s) ===`);
  console.log("Outcome breakdown:", totalCounts);
  console.log(`Distinct universities with at least one accepted record: ${universitiesTouched.size}`);

  if (unresolvedUniversityNames.size > 0) {
    console.log("\nUnresolved university names (input string -> count):");
    for (const [name, count] of unresolvedUniversityNames) console.log(`  "${name}": ${count}`);
  }

  if (rejectedExamples.length > 0) {
    console.log(`\nFirst ${rejectedExamples.length} non-accepted decisions (any outcome):`);
    for (const ex of rejectedExamples) {
      console.log(`  [${ex.outcome}] ${ex.university} / ${ex.program} -- ${ex.detail}`);
    }
  }

  // Per-column non-null counts on the accepted set — an "accepted" outcome proves a row WILL
  // land, not that it lands complete.
  console.log(`\n=== Per-column non-null counts on the ${acceptedRows.length} accepted rows ===`);
  const columns: (keyof AcceptedProgramRow)[] = [
    "university_id", "name", "normalized_name", "degree_level", "field", "subject_taxonomy",
    "secondary_subject_tags", "language_of_instruction", "campus", "delivery_mode",
    "international_eligible", "degree_type", "faculty_or_school", "official_program_url",
    "admissions_url", "source_url", "source_type", "verification_state", "notes", "data_confidence",
  ];
  for (const col of columns) {
    let nonNull = 0;
    for (const row of acceptedRows) {
      const v = row[col];
      if (v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)) nonNull++;
    }
    console.log(`  ${col}: ${nonNull}/${acceptedRows.length} (${((nonNull / acceptedRows.length) * 100).toFixed(1)}%)`);
  }

  // Duplicate-key sanity check within the accepted set itself (would only ever be non-zero if
  // this driver's own existingKeys bookkeeping had a bug, since decideIngestion is called
  // sequentially and each newly-accepted key is added before the next record is decided).
  const acceptedKeySet = new Set<string>();
  let internalDupes = 0;
  for (const row of acceptedRows) {
    const key = programDedupKey(row.university_id, row.normalized_name, row.degree_level, row.language_of_instruction, row.official_program_url, row.degree_type);
    if (acceptedKeySet.has(key)) internalDupes++;
    acceptedKeySet.add(key);
  }
  console.log(`\nInternal duplicate-key collisions within the accepted set itself: ${internalDupes} (should be 0 — decideIngestion is sequential).`);

  // UCL SSEES bilingual-matrix spot check: count accepted UCL rows whose normalized_name starts
  // with a known SSEES source-language stem, to confirm each language pair produced a distinct
  // accepted row rather than collapsing.
  const uclId = universities.find((u) => u.name === "University College London")?.id;
  if (uclId) {
    const uclAccepted = acceptedRows.filter((r) => r.university_id === uclId);
    const bulgarianPairs = uclAccepted.filter((r) => /^bulgarian and /i.test(r.name));
    console.log(`\nUCL accepted rows: ${uclAccepted.length}. Bulgarian-and-X language-pair rows among them: ${bulgarianPairs.length} (each should be a distinct accepted row, not merged).`);
    console.log("  Sample names:", bulgarianPairs.slice(0, 5).map((r) => r.name));
  }

  // Oxford degree_type population check (the just-completed follow-up pass).
  const oxfordId = universities.find((u) => u.name === "University of Oxford")?.id;
  if (oxfordId) {
    const oxfordAccepted = acceptedRows.filter((r) => r.university_id === oxfordId);
    const withDegreeType = oxfordAccepted.filter((r) => r.degree_type !== null && r.degree_type !== undefined);
    console.log(`\nOxford accepted rows: ${oxfordAccepted.length}. degree_type populated: ${withDegreeType.length}/${oxfordAccepted.length}.`);
  }

  console.log("\nDry run only — nothing written, no --apply mode exists in this script.");
}

main();
