#!/usr/bin/env node
/**
 * Read-only analysis of the 388 "named a program, no exact match" rows found by
 * scripts/report-program-link-potential.ts. Splits them into two questions:
 *
 *   (1) Is the named programme simply absent from university_programs at that university?
 *   (2) Or does that university have a program whose name is RECOGNIZABLY the same course
 *       under different text — and if so, does the difference cluster into a small number
 *       of predictable shapes (a trailing degree-type suffix, a UCAS code, etc.)?
 *
 * This is explicitly NOT a matcher and produces no linking decision — CEO's instruction was
 * "do not build a matcher for them, that's the same trap one level up." The heuristics below
 * (suffix-stripping, substring check) exist only to TRIAGE which of the 388 are worth a
 * human reading closely, and to propose candidate cluster labels for a human to confirm or
 * reject. Nothing here is imported by, or intended to be imported by, the ingestion pipeline.
 * The report this produces is deliberately marked "candidate" throughout, and the actual
 * numbers reported to CEO come from hand-reading a sample, not from trusting this output.
 *
 * Usage:
 *   npx tsx scripts/analyze-program-name-mismatches.ts > /tmp/program-name-mismatches.json
 */
import { readFileSync, writeFileSync } from "node:fs";
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
      // skip
    }
  }
  return records;
}

/** Candidate suffix/prefix shapes to test for, purely as labels for a human to check —
 * not applied anywhere as an actual matching rule. Ordered longest-first so a compound
 * suffix ("with Industrial Placement BSc") isn't mislabeled as the shorter "BSc" alone. */
const DEGREE_SUFFIXES = [
  "with Industrial Placement BSc",
  "with a Year in Industry MSci",
  "with a Year in Industry BSc",
  "with Placement Year BSc",
  "with Foundation Year",
  "MBBS",
  "MBChB",
  "BDS",
  "BEng",
  "MEng",
  "MSci",
  "MChem",
  "BSc (Hons)",
  "BSc",
  "BA (Hons)",
  "BA",
  "MA",
  "LLB",
];

function stripKnownSuffix(name: string): { core: string; suffix: string | null } {
  for (const suf of DEGREE_SUFFIXES) {
    if (name.endsWith(` ${suf}`)) return { core: name.slice(0, -(suf.length + 1)).trim(), suffix: suf };
    if (name.endsWith(suf) && name.length > suf.length) return { core: name.slice(0, -suf.length).trim(), suffix: suf };
  }
  return { core: name, suffix: null };
}

/** A UCAS course code: 1 letter + 3 digits (A100), or 4 letters (LLB1), commonly appended in
 * parentheses. Just a detection regex for labeling — not used to strip-and-match anything. */
const UCAS_CODE_PATTERN = /\(([A-Z]\d{3}|[A-Z]{2,4}\d?)\)\s*$/;

interface MismatchRecord {
  kind: "requirement" | "deadline";
  researchId: string;
  universityId: string;
  universityName: string;
  programName: string;
  candidateShape: string;
  candidateMatch: string | null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key };

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

  const [{ rows: liveReqs }, { rows: liveDls }, { rows: programRows }, { rows: universities }] = await Promise.all([
    fetchAllRowsVerified<{ id: string; university_id: string; research_record_id: string | null }>(target, "university_requirements", "id,university_id,research_record_id", "order=id"),
    fetchAllRowsVerified<{ id: string; university_id: string; research_record_id: string | null }>(target, "university_deadlines", "id,university_id,research_record_id", "order=id"),
    fetchAllRowsVerified<{ id: string; university_id: string; name: string }>(target, "university_programs", "id,university_id,name", "order=id"),
    fetchAllRowsVerified<{ id: string; name: string }>(target, "universities", "id,name", "order=id"),
  ]);
  const programs: ProgramLookupRow[] = programRows.map((p) => ({ id: p.id, universityId: p.university_id, name: p.name }));
  const universityNameById = new Map(universities.map((u) => [u.id, u.name]));
  const programsByUniversity = new Map<string, string[]>();
  for (const p of programs) {
    programsByUniversity.set(p.universityId, [...(programsByUniversity.get(p.universityId) ?? []), p.name]);
  }

  const mismatches: MismatchRecord[] = [];

  function classify(kind: "requirement" | "deadline", researchId: string, universityId: string, programName: string) {
    const uniPrograms = programsByUniversity.get(universityId) ?? [];
    const { core } = stripKnownSuffix(programName);
    const hasUcasCode = UCAS_CODE_PATTERN.test(programName);

    // Candidate 1: after stripping a known degree suffix from the RECORDED name, does the
    // remaining "core" exactly match, or is it a substring of, some program at this
    // university? This is the "present under a different name, suffix-shaped" candidate.
    let candidateMatch: string | null = null;
    let candidateShape = "no_candidate_found";

    const suffixCoreHit = uniPrograms.find((p) => p === core || p.startsWith(`${core} `));
    if (core !== programName && suffixCoreHit) {
      candidateShape = "degree_suffix_stripped";
      candidateMatch = suffixCoreHit;
    } else {
      // Candidate 2: the recorded name (or its core) appears as a substring of some program
      // name, or vice versa — catches "Medicine" vs "Medicine MBBS" the other direction, and
      // "Economics" vs "Economics and Business Economics" style containment.
      const substringHit = uniPrograms.find((p) => p.includes(programName) || programName.includes(p));
      if (substringHit) {
        candidateShape = "substring_containment";
        candidateMatch = substringHit;
      } else if (hasUcasCode) {
        const codeMatch = programName.match(UCAS_CODE_PATTERN);
        const withoutCode = codeMatch ? programName.slice(0, codeMatch.index).trim() : programName;
        const codeHit = uniPrograms.find((p) => p.includes(withoutCode) || withoutCode.includes(p));
        if (codeHit) {
          candidateShape = "ucas_code_appended";
          candidateMatch = codeHit;
        } else {
          candidateShape = "has_ucas_code_no_candidate";
        }
      } else if (uniPrograms.length === 0) {
        candidateShape = "university_has_zero_programs";
      }
    }

    mismatches.push({ kind, researchId, universityId, universityName: universityNameById.get(universityId) ?? "?", programName, candidateShape, candidateMatch });
  }

  for (const row of liveReqs) {
    if (!row.research_record_id) continue;
    const programName = reqProgramNameById.get(row.research_record_id);
    if (!programName?.trim()) continue;
    const resolution = resolveExactProgram(row.university_id, programName, programs);
    if (!resolution.programId && resolution.reason?.includes("no exact-match")) {
      classify("requirement", row.research_record_id, row.university_id, programName.trim());
    }
  }
  for (const row of liveDls) {
    if (!row.research_record_id) continue;
    const programName = dlProgramNameById.get(row.research_record_id);
    if (!programName?.trim()) continue;
    const resolution = resolveExactProgram(row.university_id, programName, programs);
    if (!resolution.programId && resolution.reason?.includes("no exact-match")) {
      classify("deadline", row.research_record_id, row.university_id, programName.trim());
    }
  }

  const byShape = new Map<string, number>();
  for (const m of mismatches) byShape.set(m.candidateShape, (byShape.get(m.candidateShape) ?? 0) + 1);

  console.error(`Total no-exact-match records classified: ${mismatches.length}`);
  console.error("Candidate shape breakdown (UNVERIFIED — for triage only, not a final count):");
  for (const [shape, count] of [...byShape.entries()].sort((a, b) => b[1] - a[1])) {
    console.error(`  ${shape}: ${count}`);
  }

  writeFileSync("/tmp/program-name-mismatches.json", JSON.stringify(mismatches, null, 2));
  console.error(`\nFull detail written to /tmp/program-name-mismatches.json for hand review.`);
}

main().catch((err: unknown) => {
  console.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
