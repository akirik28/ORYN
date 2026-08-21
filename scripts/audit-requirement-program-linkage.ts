#!/usr/bin/env node
/**
 * Measures how much of the requirement research corpus could be attached to a specific
 * programme, and by what evidence.
 *
 * READ-ONLY BY CONSTRUCTION. There is no `--apply` flag, no Supabase write client, and no
 * insert/update/upsert anywhere in this file or in lib/requirements/program-linkage.ts. It
 * exists to produce a number a human then decides what to do with; it must not become the
 * thing that does it. `university_requirements` has no `program_name` column, so a
 * requirement row either carries a real `program_id` or carries no programme identification
 * at all — which makes a wrong `program_id` strictly worse than none, and makes an automated
 * backfill on fuzzy evidence the single most damaging change available here.
 *
 * Two passes are run against the same records:
 *   LIVE   — against `university_programs` as it stands. This is what a backfill could do today.
 *   CORPUS — against the full programme research corpus on disk. This is the ceiling if every
 *            researched programme were ingested, and the gap between the two passes separates
 *            "unresolvable in principle" from "blocked behind an ingestion backlog".
 *
 * Usage:
 *   npm run audit:requirement-program-linkage
 *   npm run audit:requirement-program-linkage -- --out /tmp/linkage.json
 *   npm run audit:requirement-program-linkage -- --samples 20
 *   npm run audit:requirement-program-linkage -- --env-file ../../../.env.local   (from a worktree)
 */

export {};

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { classifyCorpusFiles } from "../lib/requirements/corpus-files";
import { resolveRequirementUniversity, type ResearchRequirementRecord, type UniversityLookupRow } from "../lib/requirements/ingest";
import { classifyProgramLinkage, countProgramsWithIdentifyingUrl, normalizeProgramUrl, type LinkageProgram, type ProgramLinkageClass, type UrlLinkageClass } from "../lib/requirements/program-linkage";
import { normalizeProgramName } from "../lib/programs/normalize";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

// `--env-file <path>` exists because this script is routinely run from a git worktree, which
// has its own working directory and therefore no `.env.local` of its own. Reading the main
// checkout's file by path beats copying a secrets file around.
const envFileArg = process.argv.indexOf("--env-file");
try {
  process.loadEnvFile(envFileArg >= 0 ? process.argv[envFileArg + 1] : ".env.local");
} catch {
  // No env file — fine, maybe using real environment variables.
}

const REQUIREMENTS_DIR = "data/research/university-requirements";
const PROGRAMS_DIR = "data/research/university-programs";

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
interface ProgramRow {
  id: string;
  university_id: string;
  name: string;
  degree_level: string | null;
  official_program_url: string | null;
  admissions_url: string | null;
  faculty_or_school: string | null;
}
interface ResearchProgramRecord {
  research_program_id?: string;
  university_name?: string | null;
  university_country?: string | null;
  program_name?: string | null;
  degree_level?: string | null;
  official_program_url?: string | null;
  admissions_url?: string | null;
}

/** A record parsed off disk, carrying which file it came from so every count can be traced
 * back to a file rather than being an anonymous total. */
type CorpusRecord = ResearchRequirementRecord & { __file: string; research_deadline_id?: string; deadline_type?: string };

function parseJsonl<T>(path: string): T[] {
  return readFileSync(path, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as T);
}

/** Same candidate assembly the real ingestion path uses, so a university that resolves here
 * resolves there — aliases and external ids included, not bare names. */
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

function tally(values: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

function pct(n: number, total: number): string {
  return total === 0 ? "n/a" : `${((n / total) * 100).toFixed(1)}%`;
}

interface Classified {
  file: string;
  id: string;
  university: string | null;
  universityId: string | null;
  programName: string | null;
  scope: string | null;
  sourceUrl: string;
  linkage: ProgramLinkageClass;
  /** For `naming_mismatch` only: was there any programme at all to match against? */
  catalogueSize: number;
  url: UrlLinkageClass;
  resolvedProgramId: string | null;
  urlProgramId: string | null;
  nameMatchCount: number;
  nameMatchIds: string[];
  recordLevel: string | null;
}

const LINKAGE_ORDER: ProgramLinkageClass[] = [
  "no_programme_stated",
  "name_match_confirmed",
  "name_match_level_unverified",
  "name_match_level_conflict",
  "name_match_ambiguous",
  "naming_mismatch",
  "unresolved_university",
];
const URL_ORDER: UrlLinkageClass[] = ["program_url_unique", "admissions_url_unique", "descendant_candidate", "shared_url_ambiguous", "descendant_ambiguous", "no_url_relation"];

function classifyAll(records: readonly CorpusRecord[], universities: readonly UniversityLookupRow[], programsByUniversity: ReadonlyMap<string, LinkageProgram[]>): Classified[] {
  const out: Classified[] = [];
  for (const record of records) {
    const { universityId } = resolveRequirementUniversity(record, universities);
    const base = {
      file: record.__file,
      id: record.research_requirement_id,
      university: record.university_name,
      universityId,
      programName: record.program_name,
      scope: record.scope ?? null,
      sourceUrl: record.source_url,
    };
    if (!universityId) {
      out.push({ ...base, linkage: "unresolved_university", catalogueSize: 0, url: "no_url_relation", resolvedProgramId: null, urlProgramId: null, nameMatchCount: 0, nameMatchIds: [], recordLevel: null });
      continue;
    }
    const catalogue = programsByUniversity.get(universityId) ?? [];
    const result = classifyProgramLinkage({ programName: record.program_name, scope: record.scope, sourceUrl: record.source_url }, catalogue);
    out.push({
      ...base,
      linkage: result.linkage,
      catalogueSize: catalogue.length,
      url: result.url,
      resolvedProgramId: result.resolvedProgramId,
      urlProgramId: result.urlProgramId,
      nameMatchCount: result.nameMatchIds.length,
      nameMatchIds: result.nameMatchIds,
      recordLevel: result.recordLevel,
    });
  }
  return out;
}

function reportPass(label: string, classified: readonly Classified[], sampleCount: number): Record<string, number> {
  const total = classified.length;
  const byLinkage = tally(classified.map((c) => c.linkage));
  console.log(`\n=== ${label}: programme identification, ${total} requirement records ===`);
  for (const k of LINKAGE_ORDER) console.log(`  ${k.padEnd(30)} ${String(byLinkage[k] ?? 0).padStart(5)}  ${pct(byLinkage[k] ?? 0, total)}`);

  const statesProgramme = classified.filter((c) => c.linkage !== "no_programme_stated" && c.linkage !== "unresolved_university");
  const resolved = classified.filter((c) => c.linkage === "name_match_confirmed").length;
  const nameMatchAnyLevel = classified.filter((c) => c.linkage.startsWith("name_match_")).length;
  console.log(`\n  States a programme:                       ${statesProgramme.length}`);
  console.log(`  ... resolves by exact name + level agree: ${resolved} (${pct(resolved, statesProgramme.length)})`);
  console.log(`  ... matches by name at any level:         ${nameMatchAnyLevel} (${pct(nameMatchAnyLevel, statesProgramme.length)})  <- what a name-only rule would claim`);
  console.log(`  ... NOT resolved by the name rule:        ${statesProgramme.length - resolved} (${pct(statesProgramme.length - resolved, statesProgramme.length)})`);

  // Why a naming mismatch happened matters more than that it happened: a university with no
  // ingested catalogue cannot possibly match, and calling that a "naming problem" would send
  // someone to rename things that are not the cause.
  const mismatches = classified.filter((c) => c.linkage === "naming_mismatch");
  const emptyCatalogue = mismatches.filter((c) => c.catalogueSize === 0);
  const thinCatalogue = mismatches.filter((c) => c.catalogueSize > 0 && c.catalogueSize < 10);
  console.log(`\n  Of the ${mismatches.length} naming mismatches:`);
  console.log(`    university has NO programmes at all:     ${emptyCatalogue.length} (${pct(emptyCatalogue.length, mismatches.length)})`);
  console.log(`    university has fewer than 10 programmes: ${thinCatalogue.length} (${pct(thinCatalogue.length, mismatches.length)})`);
  console.log(`    university has a real catalogue:         ${mismatches.length - emptyCatalogue.length - thinCatalogue.length} (${pct(mismatches.length - emptyCatalogue.length - thinCatalogue.length, mismatches.length)})`);

  const unresolved = statesProgramme.filter((c) => c.linkage !== "name_match_confirmed");
  const byUrl = tally(unresolved.map((c) => c.url));
  console.log(`\n  Would URL keying close the ${unresolved.length} unresolved?`);
  for (const k of URL_ORDER) console.log(`    ${k.padEnd(24)} ${String(byUrl[k] ?? 0).padStart(5)}  ${pct(byUrl[k] ?? 0, unresolved.length)}`);
  const deterministic = (byUrl["program_url_unique"] ?? 0) + (byUrl["admissions_url_unique"] ?? 0);
  const candidate = byUrl["descendant_candidate"] ?? 0;
  console.log(`    -> deterministically resolvable by URL: ${deterministic} (${pct(deterministic, unresolved.length)})`);
  console.log(`    -> candidates needing verification:     ${candidate} (${pct(candidate, unresolved.length)})`);
  console.log(`    -> unresolvable by any URL evidence:    ${unresolved.length - deterministic - candidate} (${pct(unresolved.length - deterministic - candidate, unresolved.length)})`);

  // How ambiguous the name evidence is BEFORE the level rule is applied. A record whose name
  // already matches 2+ programmes cannot be rescued by adding a degree level unless the
  // programmes differ on it, so this bounds how much any name-based rule could ever achieve.
  const nameMatchers = classified.filter((c) => c.nameMatchCount > 0);
  const multi = nameMatchers.filter((c) => c.nameMatchCount > 1);
  console.log(`\n  Records matching >=1 programme by exact name: ${nameMatchers.length}`);
  console.log(`    ... matching exactly one:   ${nameMatchers.length - multi.length}`);
  console.log(`    ... matching 2+ programmes: ${multi.length} (${pct(multi.length, nameMatchers.length)}) — name alone cannot pick one`);

  // The case that decides whether a name-only rule is safe: a single name match, plus
  // independent URL evidence, pointing at DIFFERENT programmes.
  const bothLines = classified.filter((c) => c.nameMatchCount === 1 && c.urlProgramId);
  const contradicted = bothLines.filter((c) => c.nameMatchIds[0] !== c.urlProgramId);
  console.log(`\n  Single name match WITH independent URL evidence: ${bothLines.length}`);
  console.log(`    ... URL confirms the name match:    ${bothLines.length - contradicted.length}`);
  console.log(`    ... URL CONTRADICTS the name match: ${contradicted.length}`);
  for (const c of contradicted.slice(0, sampleCount)) console.log(`      CONTRADICTED ${c.university} :: "${c.programName}"  name->${c.nameMatchIds[0]}  url->${c.urlProgramId}`);

  const conflicts = classified.filter((c) => c.linkage === "name_match_level_conflict");
  if (conflicts.length > 0) {
    console.log(`\n  Name matched but the source's own degree level DISAGREED (${conflicts.length}) — each one a row a name-only rule would have bound wrongly:`);
    for (const c of conflicts.slice(0, sampleCount)) console.log(`    ${c.university} :: "${c.programName}" (record states ${c.recordLevel}; ${c.nameMatchCount} name match(es), none at that level)`);
  }

  return byLinkage;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--apply")) {
    console.error("This is a measurement script. It has no apply path and never writes. Remove --apply.");
    process.exitCode = 1;
    return;
  }
  const outIdx = args.indexOf("--out");
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
  const sampleIdx = args.indexOf("--samples");
  const sampleCount = sampleIdx >= 0 ? Number(args[sampleIdx + 1]) : 8;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key };

  const { requirementFiles, deadlineFiles } = classifyCorpusFiles(REQUIREMENTS_DIR);
  const records: CorpusRecord[] = requirementFiles.flatMap((f) => parseJsonl<ResearchRequirementRecord>(`${REQUIREMENTS_DIR}/${f}`).map((r) => ({ ...r, __file: f })));
  const deadlineRecordCount = deadlineFiles.reduce((n, f) => n + parseJsonl(`${REQUIREMENTS_DIR}/${f}`).length, 0);

  console.log(`=== Corpus ===`);
  console.log(`Requirement-named files: ${requirementFiles.length} (${records.length} records)`);
  console.log(`Deadline-named files:    ${deadlineFiles.length} (${deadlineRecordCount} records)`);
  console.log(`Corpus total:            ${requirementFiles.length + deadlineFiles.length} files, ${records.length + deadlineRecordCount} records`);

  // Deadline records misfiled into requirement-named files. classifyCorpusFiles routes by
  // FILENAME, so these would be handed to the requirement path; they are not requirements and
  // must not sit in the requirement denominator.
  const misfiled = records.filter((r) => r.research_deadline_id || r.deadline_type);
  const requirements = records.filter((r) => !r.research_deadline_id && !r.deadline_type);
  if (misfiled.length > 0) {
    const byFile = tally(misfiled.map((r) => r.__file));
    console.log(`\n!! ${misfiled.length} deadline-shaped record(s) sit inside requirement-named files, across ${Object.keys(byFile).length} file(s):`);
    for (const [f, n] of Object.entries(byFile).sort((a, b) => b[1] - a[1])) console.log(`     ${f}: ${n}`);
    console.log(`   Excluded from the requirement denominator below (${requirements.length} genuine requirement records).`);
  }

  const universities = await loadUniversityCandidates(target);
  const { rows: programRows } = await fetchAllRowsVerified<ProgramRow>(target, "university_programs", "id,university_id,name,degree_level,official_program_url,admissions_url,faculty_or_school", "order=id");
  const { rows: liveRequirements } = await fetchAllRowsVerified<{ id: string; program_id: string | null }>(target, "university_requirements", "id,program_id", "order=id");

  const livePrograms: LinkageProgram[] = programRows.map((p) => ({
    id: p.id,
    universityId: p.university_id,
    name: p.name,
    degreeLevel: p.degree_level,
    officialProgramUrl: p.official_program_url,
    admissionsUrl: p.admissions_url,
  }));
  const liveByUniversity = new Map<string, LinkageProgram[]>();
  for (const p of livePrograms) liveByUniversity.set(p.universityId, [...(liveByUniversity.get(p.universityId) ?? []), p]);

  console.log(`\n=== Live tables ===`);
  console.log(`universities:            ${universities.length}`);
  console.log(`university_programs:     ${livePrograms.length} across ${liveByUniversity.size} universities`);
  console.log(`  ... with admissions_url: ${livePrograms.filter((p) => p.admissionsUrl).length}`);
  console.log(`university_requirements: ${liveRequirements.length} rows, ${liveRequirements.filter((r) => r.program_id).length} with a program_id`);

  const urlUsability = countProgramsWithIdentifyingUrl(livePrograms);
  console.log(`\n=== Can official_program_url identify a programme? ===`);
  console.log(`Programme rows whose URL is unique within their own university: ${urlUsability.identifying} (${pct(urlUsability.identifying, livePrograms.length)})`);
  console.log(`Programme rows sharing a URL with a sibling programme:          ${urlUsability.shared} (${pct(urlUsability.shared, livePrograms.length)})`);
  console.log(`Programme rows with no URL at all:                              ${urlUsability.missing} (${pct(urlUsability.missing, livePrograms.length)})`);

  const sharedGroups = new Map<string, { count: number; universityId: string; url: string }>();
  for (const p of livePrograms) {
    const n = normalizeProgramUrl(p.officialProgramUrl);
    if (!n) continue;
    const k = `${p.universityId}|${n}`;
    sharedGroups.set(k, { count: (sharedGroups.get(k)?.count ?? 0) + 1, universityId: p.universityId, url: n });
  }
  const universityNameById = new Map(universities.map((u) => [u.id, u.name]));
  console.log(`\nTop shared programme URLs (a URL carrying zero identifying information):`);
  for (const g of [...sharedGroups.values()].filter((g) => g.count > 1).sort((a, b) => b.count - a.count).slice(0, 10)) {
    console.log(`  ${String(g.count).padStart(4)}  ${universityNameById.get(g.universityId) ?? g.universityId}  ${g.url}`);
  }

  const live = classifyAll(requirements, universities, liveByUniversity);
  reportPass("LIVE", live, sampleCount);

  // ---- CORPUS pass: the ceiling if the whole researched programme catalogue were ingested.
  const programCorpus = readdirSync(PROGRAMS_DIR)
    .filter((f) => f.endsWith(".jsonl"))
    .flatMap((f) => parseJsonl<ResearchProgramRecord>(`${PROGRAMS_DIR}/${f}`));
  const corpusByUniversity = new Map<string, LinkageProgram[]>();
  let corpusUnresolvedUniversity = 0;
  const corpusUniversityCache = new Map<string, string | null>();
  for (const [i, rec] of programCorpus.entries()) {
    const cacheKey = `${rec.university_name ?? ""}|${rec.university_country ?? ""}`;
    let universityId = corpusUniversityCache.get(cacheKey);
    if (universityId === undefined) {
      universityId = resolveRequirementUniversity(
        { university_name: rec.university_name ?? null, university_country: rec.university_country ?? null } as ResearchRequirementRecord,
        universities
      ).universityId;
      corpusUniversityCache.set(cacheKey, universityId);
    }
    if (!universityId) {
      corpusUnresolvedUniversity += 1;
      continue;
    }
    const entry: LinkageProgram = {
      id: rec.research_program_id ?? `corpus-${i}`,
      universityId,
      name: rec.program_name ?? "",
      degreeLevel: rec.degree_level ?? null,
      officialProgramUrl: rec.official_program_url ?? null,
      admissionsUrl: rec.admissions_url ?? null,
    };
    corpusByUniversity.set(universityId, [...(corpusByUniversity.get(universityId) ?? []), entry]);
  }
  const corpusProgramCount = [...corpusByUniversity.values()].reduce((n, l) => n + l.length, 0);
  console.log(`\n=== Programme research corpus ===`);
  console.log(`Records on disk: ${programCorpus.length}; resolved to a live university: ${corpusProgramCount} across ${corpusByUniversity.size} universities; unresolved institution: ${corpusUnresolvedUniversity}`);
  console.log(`Live table holds ${livePrograms.length} — the difference is the ingestion backlog, not missing research.`);

  const corpus = classifyAll(requirements, universities, corpusByUniversity);
  reportPass("CORPUS (ceiling if fully ingested)", corpus, sampleCount);

  // ---- Which institutions never resolve at all. Named, because "50 unresolved" is not
  // actionable and a list of names is.
  const unresolvedNames = tally(live.filter((c) => c.linkage === "unresolved_university").map((c) => c.university ?? "(no university_name)"));
  console.log(`\n=== Institutions the identity layer could not resolve (${Object.values(unresolvedNames).reduce((a, b) => a + b, 0)} records) ===`);
  for (const [name, n] of Object.entries(unresolvedNames).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${name}`);

  // ---- What the two unique indexes would do to a resolved row. This is the interaction the
  // whole exercise turns on: resolving a row to a programme moves it OUT of
  // university_requirements_university_type_scope_idx (partial, WHERE program_id IS NULL) and
  // INTO university_requirements_program_type_idx, which is UNIQUE on (program_id,
  // requirement_type) with NO scope term at all — strictly narrower. Migration 0056 replaces
  // both with title-discriminated versions but is deliberately unapplied.
  const resolvedByAnyEvidence = live.filter((c) => c.resolvedProgramId ?? (c.url === "program_url_unique" || c.url === "admissions_url_unique" ? c.urlProgramId : null));
  const programTypeKeys = new Map<string, number>();
  const programTypeScopeTitleKeys = new Map<string, number>();
  const requirementById = new Map(requirements.map((r) => [r.research_requirement_id, r]));
  for (const c of resolvedByAnyEvidence) {
    const pid = c.resolvedProgramId ?? c.urlProgramId;
    const rec = requirementById.get(c.id);
    if (!pid || !rec) continue;
    const typeKey = `${pid}|${rec.requirement_category_db}`;
    programTypeKeys.set(typeKey, (programTypeKeys.get(typeKey) ?? 0) + 1);
    const wideKey = `${typeKey}|${rec.scope ?? ""}|${rec.requirement_text ?? ""}`;
    programTypeScopeTitleKeys.set(wideKey, (programTypeScopeTitleKeys.get(wideKey) ?? 0) + 1);
  }
  const lostToday = [...programTypeKeys.values()].reduce((n, c) => n + (c - 1), 0);
  const lostAfter0056 = [...programTypeScopeTitleKeys.values()].reduce((n, c) => n + (c - 1), 0);
  console.log(`\n=== If the resolvable records were written with a program_id ===`);
  console.log(`Records resolvable by name-confirmed or unique-URL evidence: ${resolvedByAnyEvidence.length}`);
  console.log(`  Under TODAY's university_requirements_program_type_idx (program_id, requirement_type):`);
  console.log(`    distinct keys: ${programTypeKeys.size}; rows silently destroyed on insert: ${lostToday}`);
  console.log(`  Under migration 0056's replacement (program_id, requirement_type, scope, md5(title)):`);
  console.log(`    distinct keys: ${programTypeScopeTitleKeys.size}; rows destroyed: ${lostAfter0056}`);
  console.log(`  0056 is written and deliberately unapplied. Linking rows before it is applied trades one`);
  console.log(`  constraint for a narrower one.`);

  // Some records put a FACULTY or SCHOOL in program_name (Michigan's "Marsal Family School of
  // Education"). Those are not naming errors and no programme key will ever resolve them —
  // the fact is genuinely faculty-scoped, and the schema has no faculty-scoped slot for it.
  const facultiesByUniversity = new Map<string, Set<string>>();
  for (const p of programRows) {
    if (!p.faculty_or_school?.trim()) continue;
    const set = facultiesByUniversity.get(p.university_id) ?? new Set<string>();
    set.add(normalizeProgramName(p.faculty_or_school));
    facultiesByUniversity.set(p.university_id, set);
  }
  const facultyScoped = live.filter((c) => c.linkage === "naming_mismatch" && c.universityId && c.programName && facultiesByUniversity.get(c.universityId)?.has(normalizeProgramName(c.programName)));
  console.log(`\n=== program_name actually names a FACULTY/SCHOOL, not a programme: ${facultyScoped.length} record(s) ===`);
  for (const c of facultyScoped.slice(0, sampleCount)) console.log(`  ${c.university} :: "${c.programName}"`);
  if (facultyScoped.length > sampleCount) console.log(`  ... and ${facultyScoped.length - sampleCount} more`);

  console.log(`\n=== Sample: records stating a programme that no name rule resolves, at a university WITH a real catalogue (first ${sampleCount}) ===`);
  for (const c of live.filter((x) => x.linkage === "naming_mismatch" && x.catalogueSize >= 10).slice(0, sampleCount)) {
    console.log(`  [${c.url}] ${c.university} (${c.catalogueSize} programmes) :: "${c.programName}"`);
    console.log(`      ${c.sourceUrl}`);
  }

  if (outPath) {
    writeFileSync(
      outPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          liveByLinkage: tally(live.map((c) => c.linkage)),
          corpusByLinkage: tally(corpus.map((c) => c.linkage)),
          urlUsability,
          live,
          corpus,
        },
        null,
        2
      )
    );
    console.log(`\nPer-record detail written to ${outPath}`);
  }

  console.log(`\nNothing was written to the database. This script has no apply path.`);
}

main();
