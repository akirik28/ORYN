#!/usr/bin/env node
/**
 * Read-only count: of the existing 465 university_deadlines and 1,325 university_requirements
 * rows, how many WOULD get program_id linked under lib/acquisition/program-identity.ts's
 * exact-match rule if their source research records were replayed through the now-fixed
 * ingestion pipeline? Does not replay anything and writes nothing — this is purely a
 * cross-reference between the live table, the research corpus, and university_programs.
 *
 * Method: for each live row with a non-null research_record_id, find that id's own record in
 * the corpus (same file-classification and shape-routing scripts/ingest-requirements-deadlines.ts
 * uses, so this can't silently disagree with what a real run would see), read its
 * program_name, and run it through the same resolveExactProgram the pipeline now calls.
 *
 * Usage:
 *   npx tsx scripts/report-program-link-potential.ts
 */
import { readFileSync } from "node:fs";
import { classifyCorpusFiles, partitionCorpusRecords, type CorpusRecordInput } from "../lib/requirements/corpus-files";
import { resolveExactProgram, type ProgramLookupRow } from "../lib/acquisition/program-identity";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

try {
  process.loadEnvFile(".env.local");
} catch {
  // fine
}

function parseJsonl<T>(path: string): T[] {
  const text = readFileSync(path, "utf-8");
  const records: T[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed));
    } catch {
      // A malformed line here shouldn't stop a read-only report; the real ingestion script
      // (which does mutate) is the one that fails loud on this.
    }
  }
  return records;
}

interface Tally {
  linked: number;
  noExactMatch: number;
  ambiguous: number;
  programNameAbsent: number;
  noCorpusRecordFound: number;
  noResearchRecordId: number;
}

function emptyTally(): Tally {
  return { linked: 0, noExactMatch: 0, ambiguous: 0, programNameAbsent: 0, noCorpusRecordFound: 0, noResearchRecordId: 0 };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Nothing was read.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key };

  // Same corpus read + shape-routing as scripts/ingest-requirements-deadlines.ts, so this
  // report's index can't disagree with what a real replay would actually see.
  const dir = "data/research/university-requirements";
  const { requirementFiles, deadlineFiles } = classifyCorpusFiles(dir);
  const parsed: CorpusRecordInput[] = [];
  for (const f of requirementFiles) {
    parseJsonl<unknown>(`${dir}/${f}`).forEach((record, i) => parsed.push({ file: f, index: i + 1, nameSaysShape: "requirement", record }));
  }
  for (const f of deadlineFiles) {
    parseJsonl<unknown>(`${dir}/${f}`).forEach((record, i) => parsed.push({ file: f, index: i + 1, nameSaysShape: "deadline", record }));
  }
  const partition = partitionCorpusRecords(parsed);

  const reqProgramNameById = new Map<string, string | null>();
  for (const r of partition.requirementRecords) {
    const rec = r.record as { research_requirement_id?: string; program_name?: string | null };
    if (rec.research_requirement_id) reqProgramNameById.set(rec.research_requirement_id, rec.program_name ?? null);
  }
  const dlProgramNameById = new Map<string, string | null>();
  for (const r of partition.deadlineRecords) {
    const rec = r.record as { research_deadline_id?: string; program_name?: string | null };
    if (rec.research_deadline_id) dlProgramNameById.set(rec.research_deadline_id, rec.program_name ?? null);
  }
  console.log(`Corpus index: ${reqProgramNameById.size} requirement record(s), ${dlProgramNameById.size} deadline record(s) with an id.`);

  const [{ rows: liveReqs }, { rows: liveDls }, { rows: programRows }] = await Promise.all([
    fetchAllRowsVerified<{ id: string; university_id: string; research_record_id: string | null }>(target, "university_requirements", "id,university_id,research_record_id", "order=id"),
    fetchAllRowsVerified<{ id: string; university_id: string; research_record_id: string | null }>(target, "university_deadlines", "id,university_id,research_record_id", "order=id"),
    fetchAllRowsVerified<{ id: string; university_id: string; name: string }>(target, "university_programs", "id,university_id,name", "order=id"),
  ]);
  const programs: ProgramLookupRow[] = programRows.map((p) => ({ id: p.id, universityId: p.university_id, name: p.name }));
  console.log(`Live rows: ${liveReqs.length} requirements, ${liveDls.length} deadlines. Program pool: ${programs.length}.\n`);

  const reqTally = emptyTally();
  for (const row of liveReqs) {
    if (!row.research_record_id) {
      reqTally.noResearchRecordId++;
      continue;
    }
    if (!reqProgramNameById.has(row.research_record_id)) {
      reqTally.noCorpusRecordFound++;
      continue;
    }
    const programName = reqProgramNameById.get(row.research_record_id) ?? null;
    if (!programName?.trim()) {
      reqTally.programNameAbsent++;
      continue;
    }
    const resolution = resolveExactProgram(row.university_id, programName, programs);
    if (resolution.programId) reqTally.linked++;
    else if (resolution.reason?.includes("ambiguous")) reqTally.ambiguous++;
    else reqTally.noExactMatch++;
  }

  const dlTally = emptyTally();
  for (const row of liveDls) {
    if (!row.research_record_id) {
      dlTally.noResearchRecordId++;
      continue;
    }
    if (!dlProgramNameById.has(row.research_record_id)) {
      dlTally.noCorpusRecordFound++;
      continue;
    }
    const programName = dlProgramNameById.get(row.research_record_id) ?? null;
    if (!programName?.trim()) {
      dlTally.programNameAbsent++;
      continue;
    }
    const resolution = resolveExactProgram(row.university_id, programName, programs);
    if (resolution.programId) dlTally.linked++;
    else if (resolution.reason?.includes("ambiguous")) dlTally.ambiguous++;
    else dlTally.noExactMatch++;
  }

  function printTally(label: string, total: number, t: Tally) {
    console.log(`${label} (${total} live row(s)):`);
    console.log(`  would link (exact match):        ${t.linked}`);
    console.log(`  named a program, no exact match:  ${t.noExactMatch}`);
    console.log(`  named a program, ambiguous:        ${t.ambiguous}`);
    console.log(`  program_name absent/empty:          ${t.programNameAbsent}`);
    console.log(`  research_record_id set, no corpus record found: ${t.noCorpusRecordFound}`);
    console.log(`  no research_record_id at all:      ${t.noResearchRecordId}`);
    const accounted = t.linked + t.noExactMatch + t.ambiguous + t.programNameAbsent + t.noCorpusRecordFound + t.noResearchRecordId;
    console.log(`  (sums to ${accounted} of ${total})\n`);
  }

  printTally("Requirements", liveReqs.length, reqTally);
  printTally("Deadlines", liveDls.length, dlTally);

  const totalLinkable = reqTally.linked + dlTally.linked;
  console.log(`TOTAL rows that would link under exact matching: ${totalLinkable} of ${liveReqs.length + liveDls.length}.`);
  console.log("Nothing was written. This is a count only.");
}

main().catch((err: unknown) => {
  console.error(`Report failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
