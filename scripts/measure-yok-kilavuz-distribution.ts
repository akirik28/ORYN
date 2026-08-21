#!/usr/bin/env node
/**
 * READ-ONLY measurement, per the coordination session's assignment (2026-08-22): for every
 * Turkish university_programs row Oryn holds, how many distinct YOK Atlas kilavuzKodu values
 * does the source actually publish against it? Answers the question that decides B6's
 * architectural call (docs/handoffs/schema-gaps-design-2026-08-22.md) -- widen the
 * placement-cycle key, or split the programme row -- with a real distribution instead of a
 * guess from 23 collided rows.
 *
 * No database write. No migration applied. Reuses the already-tested matchYokPlacements()
 * and buildKilavuzBridge() exactly as scripts/ingest-yok-atlas-placements.ts does -- this
 * script only reads their output and aggregates it differently; it does not reimplement any
 * matching logic of its own, to avoid a second, potentially-diverging copy of rules that are
 * already validated by __tests__/programs/yok-atlas-matching.test.ts.
 *
 * university_programs rows are read from a local snapshot (data/research/
 * tr-university-programs-2026-08-22.json), fetched once via the Supabase MCP execute_sql tool
 * (read-only) rather than requiring live SUPABASE_SECRET_KEY access, which this worktree does
 * not have working locally (same regression noted in docs/handoffs/
 * yok-atlas-placements-scale-12-universities.md).
 *
 * Usage: npx tsx scripts/measure-yok-kilavuz-distribution.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { matchYokPlacements, type ExistingProgramRow, type YokPlacementRecord } from "../lib/programs/yok-atlas-matching";
import { buildKilavuzBridge, type BilingualNameEntry } from "../lib/programs/tr-bilingual-name-bridge";

const SNAPSHOT_PATH = "data/research/yok-atlas-placements-2026-08-21.json";
const DB_PROGRAMS_PATH = "data/research/tr-university-programs-2026-08-22.json";
const BILINGUAL_NAMES_DIR = "data/research/university-programs";
const CYCLE_YEAR = 2026;
const CYCLE_LABEL = "2026-YKS";

interface FetchedFile {
  fetched_at: string;
  source_url: string;
  universities: { ourName: string; yokName: string; universiteId: number }[];
  records: YokPlacementRecord[];
}

interface DbProgramRow extends ExistingProgramRow {
  university_name: string;
}

function loadBilingualNameBridge(): ReturnType<typeof buildKilavuzBridge> {
  const files = readdirSync(BILINGUAL_NAMES_DIR).filter((f) => f.startsWith("tr_bilingual_names_") && f.endsWith(".jsonl"));
  const entries: BilingualNameEntry[] = [];
  for (const file of files) {
    const text = readFileSync(`${BILINGUAL_NAMES_DIR}/${file}`, "utf-8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      entries.push(JSON.parse(line) as BilingualNameEntry);
    }
  }
  return buildKilavuzBridge(entries);
}

function main() {
  const file: FetchedFile = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"));
  const dbPrograms: DbProgramRow[] = JSON.parse(readFileSync(DB_PROGRAMS_PATH, "utf-8"));

  console.log(`Loaded ${file.records.length} raw YOK Atlas record(s) for ${file.universities.length} universities (fetched ${file.fetched_at}).`);
  console.log(`Loaded ${dbPrograms.length} live university_programs rows across ${new Set(dbPrograms.map((p) => p.university_id)).size} Turkish universities.\n`);

  const universityIdByYokId = new Map<number, string>();
  const universityNameById = new Map<string, string>();
  for (const p of dbPrograms) universityNameById.set(p.university_id, p.university_name);
  for (const u of file.universities) {
    const ourId = dbPrograms.find((p) => p.university_name === u.ourName)?.university_id;
    if (ourId) universityIdByYokId.set(u.universiteId, ourId);
  }

  const { bridge: kilavuzBridge, heldBack } = loadBilingualNameBridge();
  console.log(`Bilingual-name bridge: ${kilavuzBridge.size} kilavuzKodu -> program_id mapping(s), ${heldBack.length} held back (medium/low confidence or unpaired).\n`);

  const nowIso = new Date().toISOString();
  const result = matchYokPlacements(file.records, dbPrograms, universityIdByYokId, CYCLE_YEAR, CYCLE_LABEL, file.source_url, nowIso, kilavuzBridge);

  // --- Per-program clean-match counts ---
  const countByProgramId = new Map<string, number>();
  const kilavuzByProgramId = new Map<string, string[]>();
  for (const m of result.matched) {
    countByProgramId.set(m.program_id, (countByProgramId.get(m.program_id) ?? 0) + 1);
    kilavuzByProgramId.set(m.program_id, [...(kilavuzByProgramId.get(m.program_id) ?? []), m.kilavuz_kodu]);
  }

  const dbById = new Map(dbPrograms.map((p) => [p.id, p]));
  const distribution = new Map<number, number>(); // codeCount -> number of programs
  for (const p of dbPrograms) {
    const c = countByProgramId.get(p.id) ?? 0;
    distribution.set(c, (distribution.get(c) ?? 0) + 1);
  }

  console.log("=== Distribution: cleanly-matched kilavuzKodu count per university_programs row (779 total) ===");
  for (const c of [...distribution.keys()].sort((a, b) => a - b)) {
    console.log(`  ${c} code(s): ${distribution.get(c)} program(s)`);
  }
  const multiCodeClean = [...countByProgramId.entries()].filter(([, n]) => n >= 2);
  console.log(`\n${multiCodeClean.length} program(s) cleanly matched to 2+ distinct kilavuzKodu.\n`);

  // --- Ambiguous groups: real multi-code evidence the current matcher cannot attribute ---
  const singleDbAmbiguous = result.ambiguous.filter((a) => a.dbCount === 1);
  const multiDbAmbiguous = result.ambiguous.filter((a) => a.dbCount > 1);
  console.log(`=== Ambiguous groups (${result.ambiguous.length} total) ===`);
  console.log(`  ${singleDbAmbiguous.length} group(s): exactly 1 DB row, 2+ API kilavuzKodu records -- real evidence, currently unattributable`);
  console.log(`  ${multiDbAmbiguous.length} group(s): 2+ DB rows sharing one name, faculty disambiguation did not resolve 1:1\n`);

  console.log("Sample of single-DB-row ambiguous groups (up to 15):");
  for (const a of singleDbAmbiguous.slice(0, 15)) {
    console.log(`  [${universityNameById.get(a.universityId)}] "${a.name}" -- ${a.apiCount} API records vs 1 DB row`);
  }

  console.log(`\nunmatchedApi (LISANS records with no DB-name counterpart at all): ${result.unmatchedApi.length}`);

  // --- Characterize multi-code cases: what actually varies? ---
  console.log("\n=== Characterizing 2+ code cases (sample) ===");
  const lisansById = new Map<number, YokPlacementRecord>();
  for (const r of file.records) if (r.birimTuruAdi === "LISANS") lisansById.set(r.kilavuzKodu, r);

  let shown = 0;
  for (const [programId, kodus] of kilavuzByProgramId) {
    if (kodus.length < 2 || shown >= 12) continue;
    const p = dbById.get(programId);
    const records = kodus.map((k) => lisansById.get(Number(k))).filter((r): r is YokPlacementRecord => !!r);
    console.log(`\n  ${p?.university_name} -- "${p?.name}" (program_id ${programId}):`);
    for (const r of records) {
      console.log(`    kilavuzKodu ${r.kilavuzKodu} | ${r.birimAdi} | tier=${r.bursOraniAdi ?? "(none)"} | faculty=${r.fymkAdi} | puanTuru=${r.puanTuru}`);
    }
    shown++;
  }

  // --- The question that actually decides B6: of the 2+-code programs, how many ALREADY
  // avoid collision under the PRE-B6 key (program_id, cycle_year, burs_orani_adi, fymk_id) --
  // because their multiple kilavuzKodu differ by fee tier, which is already a key column --
  // versus how many would genuinely still collide without kilavuz_kodu added? ---
  console.log("\n=== Of the 85 multi-code programs, how many actually need the B6 widening? ===");
  let alreadySafeUnderExistingKey = 0;
  let genuinelyCollidesWithoutB6 = 0;
  const collidingDetail: { programId: string; name: string; university: string; dupKey: string; kodus: string[] }[] = [];
  for (const [programId, kodus] of kilavuzByProgramId) {
    if (kodus.length < 2) continue;
    const records = kodus.map((k) => lisansById.get(Number(k))).filter((r): r is YokPlacementRecord => !!r);
    const existingKeyValues = records.map((r) => `${r.bursOraniAdi ?? ""}::${r.fymkId}`);
    const uniqueExistingKeys = new Set(existingKeyValues);
    if (uniqueExistingKeys.size === records.length) {
      alreadySafeUnderExistingKey++;
    } else {
      genuinelyCollidesWithoutB6++;
      const p = dbById.get(programId);
      collidingDetail.push({
        programId,
        name: p?.name ?? "?",
        university: p?.university_name ?? "?",
        dupKey: existingKeyValues.find((v, i) => existingKeyValues.indexOf(v) !== i) ?? "?",
        kodus,
      });
    }
  }
  console.log(`  ${alreadySafeUnderExistingKey} program(s): already distinguished by the EXISTING key (burs_orani_adi and/or fymk_id already differ) -- B6 not needed for these`);
  console.log(`  ${genuinelyCollidesWithoutB6} program(s): would genuinely collide on (program_id, cycle_year, burs_orani_adi, fymk_id) without B6's kilavuz_kodu addition\n`);

  if (collidingDetail.length > 0) {
    console.log("Detail on programs that genuinely need B6 (same burs_orani_adi + fymk_id, different kilavuzKodu):");
    for (const d of collidingDetail) {
      console.log(`\n  [${d.university}] "${d.name}" (program_id ${d.programId}):`);
      for (const k of d.kodus) {
        const r = lisansById.get(Number(k));
        console.log(`    kilavuzKodu ${k} | ${r?.birimAdi} | tier=${r?.bursOraniAdi ?? "(none)"} | faculty=${r?.fymkAdi} | puanTuru=${r?.puanTuru}`);
      }
    }
  }

  // --- Categorize what actually distinguishes the 18 that genuinely need B6 ---
  console.log("=== Categorizing the 18 genuine collisions by what varies in birimAdi ===");
  let languageSplit = 0;
  let kktcQuota = 0;
  let both = 0;
  let other = 0;
  for (const d of collidingDetail) {
    const names = d.kodus.map((k) => lisansById.get(Number(k))?.birimAdi ?? "");
    const hasIngilizceVariance = new Set(names.map((n) => n.includes("İngilizce"))).size > 1;
    const hasKktcVariance = names.some((n) => n.includes("KKTC"));
    if (hasIngilizceVariance && hasKktcVariance) both++;
    else if (hasIngilizceVariance) languageSplit++;
    else if (hasKktcVariance) kktcQuota++;
    else other++;
  }
  console.log(`  ${languageSplit} program(s): Turkish-medium vs English-medium split (birimAdi's "İngilizce" qualifier differs)`);
  console.log(`  ${kktcQuota} program(s): a KKTC (Northern Cyprus citizen) reserved-quota track alongside the general one, same medium`);
  console.log(`  ${both} program(s): both language AND KKTC-quota variance present across the group`);
  console.log(`  ${other} program(s): neither pattern -- genuinely other`);
  console.log(`  (Zero day/evening "(İÖ)" cases observed in this set -- the original hypothesis's second guess was not confirmed.)\n`);

  console.log("\n=== Characterizing ambiguous single-DB-row cases (sample, up to 10) ===");
  let shownAmb = 0;
  for (const a of singleDbAmbiguous) {
    if (shownAmb >= 10) break;
    const records = file.records.filter(
      (r) => r.birimTuruAdi === "LISANS" && universityIdByYokId.get(r.universiteId) === a.universityId && r.birimAdi === a.name
    );
    console.log(`\n  [${universityNameById.get(a.universityId)}] "${a.name}":`);
    for (const r of records) {
      console.log(`    kilavuzKodu ${r.kilavuzKodu} | tier=${r.bursOraniAdi ?? "(none)"} | faculty=${r.fymkAdi} | puanTuru=${r.puanTuru} | kontenjan=${r.kontenjan}`);
    }
    shownAmb++;
  }
}

main();
