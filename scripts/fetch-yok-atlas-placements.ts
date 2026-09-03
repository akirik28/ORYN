#!/usr/bin/env node
/**
 * Fetches live placement records from yokatlas.yok.gov.tr's own keyless
 * api/tercih-kilavuz/search endpoint for every Turkish university this project already holds
 * university_programs rows for, and writes the raw (untranslated) records to a local JSON file.
 *
 * Deliberately separate from matching/insertion (scripts/ingest-yok-atlas-placements.ts) — this
 * step's only job is "what does the live source say right now," kept inspectable on disk before
 * any matching logic touches it, the same separation the research-batch pipeline already uses
 * (batch file first, ingestion second).
 *
 * The search endpoint's own `universiteId` filter does not actually filter server-side (verified
 * directly: passing it still returns the full unfiltered dataset) — worked around by requesting
 * a page size large enough to receive the whole dataset in one response, then filtering
 * client-side for the university ids this project cares about.
 *
 * Usage:
 *   npx tsx scripts/fetch-yok-atlas-placements.ts
 */
import { writeFileSync } from "node:fs";

const BASE_URL = "https://yokatlas.yok.gov.tr";

const TARGET_UNIVERSITIES = [
  "Ankara Üniversitesi",
  "Middle East Technical University",
  "Istanbul University",
  "Hacettepe University",
  "Istanbul Technical University",
  "Yildiz Technical University",
  "Bilkent University",
  "Boğaziçi University",
  "Özyeğin University",
  "Gebze Technical University (GTU)",
  "Koç University",
  "Sabancı University",
] as const;

// Proxola's own `universities.name` values are the display forms used in the product's own
// research corpus (often English or ASCII-folded), not YOK Atlas's own Turkish institution
// names -- e.g. "Middle East Technical University" here vs. "ORTA DOĞU TEKNİK ÜNİVERSİTESİ
// (ANKARA)" in the source. Mapped by hand after inspecting the live universiteler list once
// (see the dry-run output), not guessed, and re-verified against the live list every run rather
// than hardcoding the numeric id alone -- a name is legible in review, a bare id is not.
const YOK_NAME_OVERRIDES: Record<string, string> = {
  "Ankara Üniversitesi": "ANKARA ÜNİVERSİTESİ",
  "Middle East Technical University": "ORTA DOĞU TEKNİK ÜNİVERSİTESİ (ANKARA)",
  "Istanbul University": "İSTANBUL ÜNİVERSİTESİ",
  "Hacettepe University": "HACETTEPE ÜNİVERSİTESİ (ANKARA)",
  "Istanbul Technical University": "İSTANBUL TEKNİK ÜNİVERSİTESİ",
  "Yildiz Technical University": "YILDIZ TEKNİK ÜNİVERSİTESİ (İSTANBUL)",
  "Bilkent University": "İHSAN DOĞRAMACI BİLKENT ÜNİVERSİTESİ (ANKARA)",
  "Boğaziçi University": "BOĞAZİÇİ ÜNİVERSİTESİ (İSTANBUL)",
  "Özyeğin University": "ÖZYEĞİN ÜNİVERSİTESİ (İSTANBUL)",
  "Gebze Technical University (GTU)": "GEBZE TEKNİK ÜNİVERSİTESİ",
  "Koç University": "KOÇ ÜNİVERSİTESİ (İSTANBUL)",
  "Sabancı University": "SABANCI ÜNİVERSİTESİ (İSTANBUL)",
};

interface YokUniversite {
  universiteId: number;
  universiteAdi: string;
  [key: string]: unknown;
}

interface YokPlacementRecord {
  birimAdi: string;
  kilavuzKodu: number;
  fymkId: number;
  fymkAdi: string;
  puanTuru: string;
  bursOraniAdi?: string;
  kontenjan: number;
  minPuan?: number;
  basariSirasi?: number;
  yil: number;
  sinav: string;
  ogrenimDiliAdi: string;
  birimTuruAdi: string;
  universiteId: number;
  [key: string]: unknown;
}

async function main() {
  console.log("Fetching university list from YOK Atlas...");
  const uniRes = await fetch(`${BASE_URL}/api/tercih-kilavuz/universiteler`);
  if (!uniRes.ok) {
    console.error(`universiteler fetch failed: ${uniRes.status} ${uniRes.statusText}`);
    process.exitCode = 1;
    return;
  }
  const universiteler: YokUniversite[] = await uniRes.json();
  console.log(`Got ${universiteler.length} universities from the live list.`);

  const idByYokName = new Map(universiteler.map((u) => [u.universiteAdi, u.universiteId]));

  const resolved: { ourName: string; yokName: string; universiteId: number }[] = [];
  const unresolved: string[] = [];
  for (const ourName of TARGET_UNIVERSITIES) {
    const yokName = YOK_NAME_OVERRIDES[ourName];
    const universiteId = yokName ? idByYokName.get(yokName) : undefined;
    if (universiteId === undefined) {
      unresolved.push(ourName);
    } else {
      resolved.push({ ourName, yokName, universiteId });
    }
  }

  console.log(`\nResolved ${resolved.length}/${TARGET_UNIVERSITIES.length} universities:`);
  for (const r of resolved) console.log(`  ${r.ourName}  ->  ${r.yokName} (id ${r.universiteId})`);
  if (unresolved.length > 0) {
    console.error(`\nUNRESOLVED (name not found in the live universiteler list, fix YOK_NAME_OVERRIDES): ${unresolved.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  console.log("\nFetching the full placement dataset (one large page, since universiteId does not filter server-side)...");
  const searchRes = await fetch(`${BASE_URL}/api/tercih-kilavuz/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page: 0, size: 30000 }),
  });
  if (!searchRes.ok) {
    console.error(`search fetch failed: ${searchRes.status} ${searchRes.statusText}`);
    process.exitCode = 1;
    return;
  }
  const searchBody: { content: YokPlacementRecord[]; totalElements: number } = await searchRes.json();
  console.log(`Live totalElements: ${searchBody.totalElements}, received ${searchBody.content.length} record(s) in this page.`);
  if (searchBody.content.length < searchBody.totalElements) {
    console.error(`Page size did not cover the full dataset (${searchBody.content.length} < ${searchBody.totalElements}) -- increase size and re-run. Nothing was written.`);
    process.exitCode = 1;
    return;
  }

  const targetIds = new Set(resolved.map((r) => r.universiteId));
  // Trimmed to the fields the matching/insertion pipeline actually uses -- the raw response
  // also carries lengthy per-record eligibility footnote prose (kosul/kosulList) and an
  // unexplained gk1/gk2/gk3 prior-cycle-shaped field cluster (see this migration's own header
  // comment for why that cluster is deliberately not modeled); keeping those verbatim would
  // make this file 30x larger for no downstream use.
  const filtered = searchBody.content
    .filter((r) => targetIds.has(r.universiteId))
    .map((r) => ({
      birimAdi: r.birimAdi,
      kilavuzKodu: r.kilavuzKodu,
      fymkId: r.fymkId,
      fymkAdi: r.fymkAdi,
      puanTuru: r.puanTuru,
      bursOraniAdi: r.bursOraniAdi,
      kontenjan: r.kontenjan,
      minPuan: r.minPuan,
      basariSirasi: r.basariSirasi,
      birimTuruAdi: r.birimTuruAdi,
      universiteId: r.universiteId,
    }));
  console.log(`\nFiltered to ${filtered.length} record(s) across the ${resolved.length} target universities.`);

  const byUniversity: Record<string, number> = {};
  for (const r of filtered) {
    const match = resolved.find((x) => x.universiteId === r.universiteId);
    const key = match ? match.ourName : String(r.universiteId);
    byUniversity[key] = (byUniversity[key] ?? 0) + 1;
  }
  console.log("Per-university record counts (all birimTuruAdi levels, not yet filtered to LISANS):");
  for (const [name, count] of Object.entries(byUniversity)) console.log(`  ${name}: ${count}`);

  const outPath = "data/research/yok-atlas-placements-2026-08-21.json";
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        fetched_at: new Date().toISOString(),
        source_url: `${BASE_URL}/`,
        universities: resolved,
        records: filtered,
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
