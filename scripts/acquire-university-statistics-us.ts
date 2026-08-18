#!/usr/bin/env node
/**
 * US admissions/cost/outcome statistics from the same College Scorecard bulk file
 * enrich-student-counts-us.ts already downloads and verifies — `university_statistics` was
 * completely empty (0 rows) before this script, which is why every detail page's "Admission
 * rate" and "Cost of attendance" stat has read "Unavailable" for every university, US included.
 *
 * Reuses `lib/acquisition/college-scorecard-overrides.ts`'s `FLAGSHIP_UNITID_OVERRIDES`/
 * `BULK_FILE_URL` (same matching problem, same hand-verified exceptions) rather than
 * duplicating the multi-campus-system judgment calls in a second table that could drift from
 * the first — that module exists specifically so this and enrich-student-counts-us.ts can
 * share it without importing from each other's script file (every script here runs its own
 * `main()` unconditionally at module load, so importing FROM a script re-runs its whole
 * pipeline as a side effect — caught live while building this file, see that module's header).
 *
 * FIELD DEFINITIONS, stated plainly (spec's own non-negotiable: never present false precision):
 *   - `admission_rate` <- ADM_RATE (IPEDS, most recent cohort with a reported rate)
 *   - `sat_range_low`/`high` <- SATVR25+SATMT25 / SATVR75+SATMT75 (25th/75th percentile
 *     composite SAT: Verbal + Math sections, the standard 1600-point scale) — only written
 *     when BOTH section scores exist for that percentile; never a partial sum.
 *   - `act_range_low`/`high` <- ACTCM25 / ACTCM75 (ACT composite 25th/75th percentile)
 *   - `cost_of_attendance` <- COSTT4_A ("average cost of attendance," IPEDS's own published
 *     estimate — sticker price before need-based aid, not what a typical student actually
 *     pays; that distinction is real and worth remembering if this is ever surfaced without
 *     the caveat), `cost_currency` = "USD"
 *   - `graduation_rate` <- C150_4 (completion within 150% of normal time — the standard IPEDS
 *     4-year-institution graduation-rate definition)
 * Exactly like the enrollment file, there is no single per-row reporting year — each
 * institution's figures are IPEDS's own "most recent available" for that institution, not a
 * uniform cohort year. `stat_year` is left NULL rather than asserting one; the caveat is
 * spelled out in `source` instead of hidden.
 *
 * `university_statistics` had zero existing rows when this was written, so there is no
 * overwrite precedence question yet — every match is a fresh insert. A future re-run should
 * decide how to handle a value this script previously wrote (matching the `notes`-marker
 * convention `enrich-student-counts-us.ts` uses for `total_students`) rather than assume.
 *
 * Usage:
 *   npm run acquire:university-statistics-us                  # dry run
 *   npm run acquire:university-statistics-us -- --apply
 */

import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { nameKey, nameVariants } from "../lib/acquisition/normalize";
import { BULK_FILE_URL, FLAGSHIP_UNITID_OVERRIDES } from "../lib/acquisition/college-scorecard-overrides";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

const SOURCE_LABEL = "College Scorecard (US Dept. of Education, IPEDS-derived) — most recent available cohort per institution, not a uniform year";

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields;
}

interface StatsRow {
  unitid: string;
  name: string;
  admRate: number | null;
  satvr25: number | null;
  satvr75: number | null;
  satmt25: number | null;
  satmt75: number | null;
  actcm25: number | null;
  actcm75: number | null;
  cost: number | null;
  gradRate: number | null;
}

function downloadAndParse(): StatsRow[] {
  const dir = mkdtempSync(join(tmpdir(), "oryn-scorecard-stats-"));
  try {
    console.log("Downloading College Scorecard bulk file...");
    execSync(`curl -sL -o data.zip "${BULK_FILE_URL}"`, { cwd: dir, stdio: "inherit" });
    execSync(`unzip -oq data.zip`, { cwd: dir });
    const csvFile = execSync(`ls *.csv`, { cwd: dir }).toString().trim().split("\n")[0];
    const text = readFileSync(join(dir, csvFile), "utf-8");
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    const header = parseCsvLine(lines[0]);
    const idx = (col: string) => {
      const i = header.indexOf(col);
      if (i < 0) throw new Error(`Expected column "${col}" not found in ${csvFile} — the file shape may have changed since this script was written.`);
      return i;
    };
    const iUnitid = idx("UNITID");
    const iName = idx("INSTNM");
    const iAdmRate = idx("ADM_RATE");
    const iSatvr25 = idx("SATVR25");
    const iSatvr75 = idx("SATVR75");
    const iSatmt25 = idx("SATMT25");
    const iSatmt75 = idx("SATMT75");
    const iActcm25 = idx("ACTCM25");
    const iActcm75 = idx("ACTCM75");
    const iCost = idx("COSTT4_A");
    const iGradRate = idx("C150_4");

    const parseNum = (raw: string | undefined): number | null => {
      if (raw === undefined || raw === "" || raw === "NULL" || raw === "PrivacySuppressed") return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    };

    const rows: StatsRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const f = parseCsvLine(lines[i]);
      rows.push({
        unitid: f[iUnitid],
        name: f[iName],
        admRate: parseNum(f[iAdmRate]),
        satvr25: parseNum(f[iSatvr25]),
        satvr75: parseNum(f[iSatvr75]),
        satmt25: parseNum(f[iSatmt25]),
        satmt75: parseNum(f[iSatmt75]),
        actcm25: parseNum(f[iActcm25]),
        actcm75: parseNum(f[iActcm75]),
        cost: parseNum(f[iCost]),
        gradRate: parseNum(f[iGradRate]),
      });
    }
    console.log(`Parsed ${rows.length} US institutions from the bulk file.`);
    return rows;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const scorecardRows = downloadAndParse();
  const byNameKey = new Map<string, StatsRow[]>();
  const byUnitid = new Map<string, StatsRow>();
  for (const row of scorecardRows) {
    byUnitid.set(row.unitid, row);
    for (const variant of nameVariants(row.name)) {
      const key = nameKey(variant);
      byNameKey.set(key, [...(byNameKey.get(key) ?? []), row]);
    }
  }

  const { data: usUnis, error } = await admin.from("universities").select("id, name").eq("country", "United States").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${(usUnis ?? []).length} US universities in the spine.`);

  const { data: existingStats } = await admin.from("university_statistics").select("university_id");
  const existingIds = new Set((existingStats ?? []).map((s) => s.university_id));

  let matched = 0;
  let matchedViaOverride = 0;
  let unmatched = 0;
  let ambiguous = 0;
  let alreadyHasRow = 0;
  const toWrite: { universityId: string; universityName: string; row: StatsRow }[] = [];

  for (const uni of usUnis ?? []) {
    if (existingIds.has(uni.id)) {
      alreadyHasRow++;
      continue; // this script never overwrites — see file header
    }
    const candidates = new Set<StatsRow>();
    for (const variant of nameVariants(uni.name)) {
      for (const row of byNameKey.get(nameKey(variant)) ?? []) candidates.add(row);
    }
    if (candidates.size === 0) {
      const overrideUnitid = FLAGSHIP_UNITID_OVERRIDES[uni.name];
      const overrideRow = overrideUnitid ? byUnitid.get(overrideUnitid) : undefined;
      if (overrideRow) {
        candidates.add(overrideRow);
        matchedViaOverride++;
      } else {
        unmatched++;
        continue;
      }
    }
    if (candidates.size > 1) {
      ambiguous++;
      continue;
    }
    const row = [...candidates][0];
    matched++;
    toWrite.push({ universityId: uni.id, universityName: uni.name, row });
  }

  console.log(
    `Matched ${matched} (${matchedViaOverride} via the shared flagship-campus override table), unmatched ${unmatched}, ambiguous ${ambiguous}, ${alreadyHasRow} already have a university_statistics row (skipped, never overwritten).`
  );
  console.log(`${toWrite.length} row(s) to insert.`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite.slice(0, 15)) {
      console.log(
        `  would write ${w.universityName}: admit=${w.row.admRate ?? "?"} SAT=${w.row.satvr25 != null && w.row.satmt25 != null ? w.row.satvr25 + w.row.satmt25 : "?"}-${w.row.satvr75 != null && w.row.satmt75 != null ? w.row.satvr75 + w.row.satmt75 : "?"} ACT=${w.row.actcm25 ?? "?"}-${w.row.actcm75 ?? "?"} cost=$${w.row.cost ?? "?"} gradRate=${w.row.gradRate ?? "?"}`
      );
    }
    if (toWrite.length > 15) console.log(`  ... and ${toWrite.length - 15} more`);
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const r = w.row;
    const satLow = r.satvr25 != null && r.satmt25 != null ? r.satvr25 + r.satmt25 : null;
    const satHigh = r.satvr75 != null && r.satmt75 != null ? r.satvr75 + r.satmt75 : null;
    const payload = {
      university_id: w.universityId,
      stat_year: null,
      admission_rate: r.admRate,
      sat_range_low: satLow,
      sat_range_high: satHigh,
      act_range_low: r.actcm25,
      act_range_high: r.actcm75,
      graduation_rate: r.gradRate,
      cost_of_attendance: r.cost,
      cost_currency: r.cost != null ? "USD" : null,
      source: `${SOURCE_LABEL}, UNITID ${r.unitid}`,
      data_confidence: "high",
      retrieved_at: new Date().toISOString(),
    };
    const { error: insertError } = await admin.from("university_statistics").insert(payload);
    if (insertError) {
      console.error(`  FAILED ${w.universityName}: ${insertError.message}`);
      continue;
    }
    written++;
  }
  console.log(`\nWrote ${written}/${toWrite.length}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
