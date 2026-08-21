#!/usr/bin/env node
/**
 * Matches the live YOK Atlas placement records fetched by scripts/fetch-yok-atlas-placements.ts
 * against existing university_programs rows and inserts the result into
 * university_program_placement_cycles (migration 0055).
 *
 * Scales the single-university (Ankara Üniversitesi) round-trip validation in
 * docs/handoffs/yok-atlas-placement-schema-decision.md to all 12 Turkish universities this
 * project currently holds university_programs rows for. See lib/programs/yok-atlas-matching.ts
 * for the matching rules and __tests__/programs/yok-atlas-matching.test.ts for the shapes it
 * was built against (the Ankara "Bitki Koruma" Lisans/Önlisans collision and the Istanbul
 * University "İşletme" faculty-disambiguation case in particular).
 *
 * Usage:
 *   npx tsx scripts/fetch-yok-atlas-placements.ts          # writes data/research/yok-atlas-placements-2026-08-21.json
 *   npx tsx scripts/ingest-yok-atlas-placements.ts         # dry run
 *   npx tsx scripts/ingest-yok-atlas-placements.ts --apply
 */
import { readFileSync, readdirSync } from "node:fs";
import { matchYokPlacements, type ExistingProgramRow, type YokPlacementRecord } from "../lib/programs/yok-atlas-matching";
import { buildKilavuzBridge, type BilingualNameEntry } from "../lib/programs/tr-bilingual-name-bridge";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local -- fine, maybe using real environment variables (CI, hosting platform).
}

const INPUT_PATH = "data/research/yok-atlas-placements-2026-08-21.json";
const CYCLE_YEAR = 2026;
const CYCLE_LABEL = "2026-YKS";
const BILINGUAL_NAMES_DIR = "data/research/university-programs";

/**
 * Loads every tr_bilingual_names_*.jsonl file (the sourced English<->Turkish programme-name
 * bridge for universities whose university_programs.name and YOK's birimAdi are recorded in
 * different languages -- see docs/handoffs/tr-bilingual-programme-names.md) and builds the
 * kilavuzKodu -> program_id bridge matchYokPlacements can resolve through. Absent entirely on
 * a checkout with no bilingual-names research yet -- returns an empty bridge, not an error, so
 * this script keeps working for universities that don't need it.
 */
function loadBilingualNameBridge(): ReturnType<typeof buildKilavuzBridge> {
  let files: string[];
  try {
    files = readdirSync(BILINGUAL_NAMES_DIR).filter((f) => f.startsWith("tr_bilingual_names_") && f.endsWith(".jsonl"));
  } catch {
    return { bridge: new Map(), heldBack: [] };
  }
  const entries: BilingualNameEntry[] = [];
  for (const file of files) {
    const text = readFileSync(`${BILINGUAL_NAMES_DIR}/${file}`, "utf-8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      entries.push(JSON.parse(line) as BilingualNameEntry);
    }
  }
  console.log(`Loaded ${entries.length} sourced bilingual-name entries from ${files.length} file(s) in ${BILINGUAL_NAMES_DIR}/.`);
  return buildKilavuzBridge(entries);
}

interface FetchedFile {
  fetched_at: string;
  source_url: string;
  universities: { ourName: string; yokName: string; universiteId: number }[];
  records: YokPlacementRecord[];
}

interface UniversityRow {
  id: string;
  name: string;
  country: string;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY -- see API_SETUP.md. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key: secretKey };

  const file: FetchedFile = JSON.parse(readFileSync(INPUT_PATH, "utf-8"));
  console.log(`Loaded ${file.records.length} raw record(s) for ${file.universities.length} universities from ${INPUT_PATH} (fetched ${file.fetched_at}).`);

  const [{ rows: universities }, { rows: existingPrograms }, { rows: existingPlacements }] = await Promise.all([
    fetchAllRowsVerified<UniversityRow>(target, "universities", "id,name,country", "country=eq.Turkey"),
    fetchAllRowsVerified<ExistingProgramRow>(target, "university_programs", "id,university_id,name,faculty_or_school", "order=id"),
    fetchAllRowsVerified<{ program_id: string; cycle_year: number; burs_orani_adi: string | null; fymk_id: string | null }>(
      target,
      "university_program_placement_cycles",
      "program_id,cycle_year,burs_orani_adi,fymk_id",
      "order=id"
    ),
  ]);
  console.log(`Live state: ${universities.length} Turkish universities, ${existingPrograms.length} existing university_programs rows, ${existingPlacements.length} existing placement rows (re-verified live, not a stale snapshot).`);

  const universityIdByName = new Map(universities.map((u) => [u.name, u.id]));
  const universityIdByYokId = new Map<number, string>();
  for (const u of file.universities) {
    const ourId = universityIdByName.get(u.ourName);
    if (!ourId) {
      console.error(`FATAL: "${u.ourName}" from the fetched file is not a live Turkish university row anymore. Re-run fetch or fix the name. Nothing written.`);
      process.exitCode = 1;
      return;
    }
    universityIdByYokId.set(u.universiteId, ourId);
  }

  const targetUniversityIds = new Set(universityIdByYokId.values());
  const relevantPrograms = existingPrograms.filter((p) => targetUniversityIds.has(p.university_id));

  const { bridge: kilavuzBridge, heldBack } = loadBilingualNameBridge();
  if (kilavuzBridge.size > 0 || heldBack.length > 0) {
    console.log(
      `Bilingual-name bridge: ${kilavuzBridge.size} kilavuzKodu -> program_id mapping(s) wired in (confidence: high only), ${heldBack.length} entry/entries held back.`
    );
  }

  const nowIso = new Date().toISOString();
  const result = matchYokPlacements(
    file.records,
    relevantPrograms,
    universityIdByYokId,
    CYCLE_YEAR,
    CYCLE_LABEL,
    file.source_url,
    nowIso,
    kilavuzBridge
  );

  // Skip anything that would collide with a placement row already live (same program_id, cycle,
  // burs tier, faculty) -- re-running this script after a partial apply must not error out on
  // rows already safely inserted.
  const existingKeySet = new Set(
    existingPlacements.map((p) => `${p.program_id}::${p.cycle_year}::${p.burs_orani_adi ?? ""}::${p.fymk_id ?? ""}`)
  );
  const toInsert = result.matched.filter(
    (m) => !existingKeySet.has(`${m.program_id}::${m.cycle_year}::${m.burs_orani_adi ?? ""}::${m.fymk_id ?? ""}`)
  );
  const alreadyLive = result.matched.length - toInsert.length;

  const nameByUniId = new Map(universities.map((u) => [u.id, u.name]));
  const countsByUni: Record<string, { matched: number; unmatched: number; ambiguous: number }> = {};
  for (const u of universities) {
    if (targetUniversityIds.has(u.id)) countsByUni[u.name] = { matched: 0, unmatched: 0, ambiguous: 0 };
  }
  for (const m of toInsert) {
    // toInsert rows don't carry university_id directly -- look it up via the matched program.
    const program = relevantPrograms.find((p) => p.id === m.program_id);
    const uniName = program ? nameByUniId.get(program.university_id) : undefined;
    if (uniName) countsByUni[uniName].matched += 1;
  }
  for (const u of result.unmatchedApi) {
    const uniName = nameByUniId.get(u.universityId);
    if (uniName) countsByUni[uniName].unmatched += 1;
  }
  for (const a of result.ambiguous) {
    const uniName = nameByUniId.get(a.universityId);
    if (uniName) countsByUni[uniName].ambiguous += 1;
  }

  console.log("\nPer-university breakdown (LISANS-level source records only):");
  for (const [name, c] of Object.entries(countsByUni)) {
    console.log(`  ${name}: matched=${c.matched} unmatched=${c.unmatched} ambiguous_groups=${c.ambiguous}`);
  }
  console.log(`\nTotals: ${toInsert.length} new row(s) to insert, ${alreadyLive} already live (skipped, re-run-safe), ${result.unmatchedApi.length} unmatched source record(s), ${result.ambiguous.length} ambiguous name-group(s) left unresolved (not guessed).`);

  if (result.ambiguous.length > 0) {
    console.log("\nAmbiguous groups (flagged, not written):");
    for (const a of result.ambiguous) {
      console.log(`  ${nameByUniId.get(a.universityId)} / "${a.name}": ${a.apiCount} source record(s) vs ${a.dbCount} db row(s) -- ${a.reason}`);
    }
  }

  if (heldBack.length > 0) {
    console.log(
      `\nBilingual-name bridge held back ${heldBack.length} programme(s) from automatic matching (unpaired, no kilavuzKodu, or below "high" confidence -- see docs/handoffs/tr-bilingual-programme-names.md):`
    );
    for (const h of heldBack) {
      console.log(`  ${h.university} / ${h.program_id}: ${h.reason}`);
    }
  }

  const filledCount = toInsert.filter((r) => r.placement_status === "filled").length;
  const unfilledCount = toInsert.length - filledCount;
  const withBursTier = toInsert.filter((r) => r.burs_orani_adi != null).length;
  const scoreTypes = new Set(toInsert.map((r) => r.puan_turu));
  console.log(`\nOf the ${toInsert.length} to insert: ${filledCount} filled, ${unfilledCount} unfilled, ${withBursTier} with a burs/fee tier, puan_turu values present: ${[...scoreTypes].sort().join(", ")}.`);

  if (!apply) {
    console.log("\nDry run -- nothing written. Re-run with --apply to write.");
    return;
  }

  if (toInsert.length === 0) {
    console.log("\nNothing new to insert.");
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const BATCH_SIZE = 200;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error, data } = await admin.from("university_program_placement_cycles").insert(batch).select("id");
    if (error) {
      console.error(`Batch ${i}-${i + batch.length} failed: ${error.message}. ${inserted} row(s) inserted before this failure.`);
      process.exitCode = 1;
      return;
    }
    inserted += data?.length ?? 0;
    console.log(`  inserted batch ${i}-${i + batch.length} (${data?.length ?? 0} row(s))`);
  }

  console.log(`\nInserted ${inserted}/${toInsert.length} row(s) into university_program_placement_cycles.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
