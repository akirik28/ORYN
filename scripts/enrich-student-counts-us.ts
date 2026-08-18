#!/usr/bin/env node
/**
 * US student population enrichment from the Department of Education's College Scorecard
 * bulk institution-level file (spec Priority 4, University Intelligence Spine continuation).
 *
 * The Wikidata-index pipeline (enrich-student-counts.ts) hit a real, honest ceiling this
 * session (712/719 remaining gaps genuinely have no sourced Wikidata statement). Rather than
 * loosen its thresholds or scrape per-institution, this targets ONE scalable national
 * dataset that alone can cover most of the US portion of the spine: the College Scorecard
 * "Most Recent Cohorts (Institution)" file, built by the Department of Education from IPEDS
 * — the same government reporting system every US institution is legally required to submit
 * enrollment figures to, republished by ED as a single ~6,300-row CSV, no API key needed
 * (unlike the live query API `lib/providers/college-scorecard.ts` wraps, which needs
 * `COLLEGE_SCORECARD_API_KEY` — a founder-blocked item; this bulk file sidesteps that
 * entirely). Verified live 2026-08-17: HTTP 200, real government-hosted data, sample values
 * cross-checked against known figures for Harvard/MIT/Princeton/Stanford before trusting it.
 *
 * SCOPE IS EXPLICIT, per the founder's own instruction not to conflate definitions:
 *   - `UGDS` = undergraduate degree/certificate-seeking students, 12-month unduplicated
 *     headcount (IPEDS Fall Enrollment survey definition) -> `undergraduate_students` metric.
 *   - `GRADS` = graduate students, same headcount basis -> `postgraduate_students` metric.
 *   - `total_students` = UGDS + GRADS, written ONLY when that is a meaningful institution-
 *     level total (both scoped 'institution', both headcount, both the same reporting year —
 *     never mixed with a differently-scoped or FTE-basis figure).
 * This is HEADCOUNT, not FTE, not a system-wide total for multi-campus systems (IPEDS reports
 * per-UNITID, i.e. per campus/branch as its own row — a state system's flagship campus and
 * satellite campuses are separate UNITIDs, matching how this spine already treats them as
 * separate `universities` rows in the cases where both exist).
 *
 * Precedence: `undergraduate_students`/`postgraduate_students` are new metrics (0% coverage
 * before this script), so always fill_if_null. `total_students` only overwrites an existing
 * value when that value's own notes mark it as this session's Wikidata pipeline (a weaker,
 * third-party-indexed source) — a genuinely hand-verified or otherwise-sourced existing value
 * is never touched, matching the `humanVerified` convention import-university-facts.ts
 * already established.
 *
 * Usage:
 *   npm run enrich:student-counts-us                  # dry run
 *   npm run enrich:student-counts-us -- --apply
 */

import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { nameKey, nameVariants } from "../lib/acquisition/normalize";

export {};

/**
 * Explicit, individually city-verified overrides — NOT fuzzy matching. IPEDS assigns a
 * separate UNITID (and a disambiguated INSTNM) to every campus of a multi-campus system, so
 * a bare spine name like "Purdue University" has zero exact-string candidates even though the
 * flagship campus is unambiguously present as "Purdue University-Main Campus". Confirmed live
 * 2026-08-17 by grepping the bulk file for each institution and cross-checking the resulting
 * UNITID's CITY/STABBR against that institution's well-known flagship location (e.g. Purdue ->
 * West Lafayette, IN; Ohio State -> Columbus, OH) before adding it here — the same
 * external-verification bar the rest of this session's identity work uses, just against the
 * bulk file's own city/state columns instead of ROR. Never extended by name-similarity alone.
 *
 * Two real multi-campus unmatched names deliberately have NO override and stay unresolved:
 *   - "City University of New York": a ~25-college system (Baruch, Hunter, Brooklyn, ...) with
 *     no single UNITID representing it — there is no correct single row to pick.
 *   - "University of Minnesota (System)": our own spine names this row as the SYSTEM total: assigning it the flagship
 *     Twin Cities campus's headcount would silently relabel a campus figure as a system figure
 *     — exactly the HEADCOUNT/FTE/SYSTEM/CAMPUS conflation this pipeline exists to prevent.
 */
const FLAGSHIP_UNITID_OVERRIDES: Record<string, string> = {
  "Arizona State University": "104151", // Tempe, AZ
  "Colorado State University": "126818", // Fort Collins, CO
  "Columbia University": "190150", // New York, NY — "...in the City of New York"
  "Georgia Institute of Technology": "139755", // Atlanta, GA
  "Louisiana State University": "159391", // Baton Rouge, LA — "...and Agricultural & Mechanical College"
  "North Carolina State University": "199193", // Raleigh, NC
  "Oklahoma State University": "207388", // Stillwater, OK
  "Pennsylvania State University": "214777", // University Park, PA
  "Purdue University": "243780", // West Lafayette, IN
  "Stony Brook University, State University of New York": "196097", // Stony Brook, NY
  "Texas A&M University": "228723", // College Station, TX
  "The New School, New York City and Paris": "193654", // New York, NY
  "The Ohio State University": "204796", // Columbus, OH
  "Tulane University": "160755", // New Orleans, LA — "...of Louisiana"
  "University at Albany SUNY": "196060", // Albany, NY
  "University at Buffalo SUNY": "196088", // Buffalo, NY
  "University of Cincinnati": "201885", // Cincinnati, OH
  "University of Colorado Denver": "126562", // Denver, CO — "...Anschutz Medical Campus"
  "University of Hawaiʻi at Mānoa": "141574", // Honolulu, HI — bulk file has no diacritics
  "University of New Mexico": "187985", // Albuquerque, NM
  "University of Oklahoma": "207500", // Norman, OK
  "University of Pittsburgh": "215293", // Pittsburgh, PA
  "University of South Carolina": "218663", // Columbia, SC
  "University of Virginia": "234076", // Charlottesville, VA
  "University of Washington": "236948", // Seattle, WA
};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

const BULK_FILE_URL = "https://ed-public-download.scorecard.network/downloads/Most-Recent-Cohorts-Institution_06102026.zip";
const SOURCE_LABEL = "College Scorecard (US Dept. of Education, IPEDS-derived)";

/** Minimal, correct-enough CSV row parser for this specific well-formed government file:
 * handles quoted fields (commas/newlines inside quotes) and doubled-quote escaping. Not a
 * general CSV library dependency for a single acquisition script that reads one known file
 * shape once. */
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

interface ScorecardRow {
  unitid: string;
  name: string;
  city: string;
  state: string;
  url: string;
  ugds: number | null;
  grads: number | null;
}

function downloadAndParse(): ScorecardRow[] {
  const dir = mkdtempSync(join(tmpdir(), "oryn-scorecard-"));
  try {
    console.log(`Downloading ${SOURCE_LABEL} bulk file...`);
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
    const iCity = idx("CITY");
    const iState = idx("STABBR");
    const iUrl = idx("INSTURL");
    const iUgds = idx("UGDS");
    const iGrads = idx("GRADS");

    const rows: ScorecardRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const f = parseCsvLine(lines[i]);
      const parseNum = (raw: string | undefined): number | null => {
        if (raw === undefined || raw === "" || raw === "NULL" || raw === "PrivacySuppressed") return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      };
      rows.push({
        unitid: f[iUnitid],
        name: f[iName],
        city: f[iCity],
        state: f[iState],
        url: f[iUrl],
        ugds: parseNum(f[iUgds]),
        grads: parseNum(f[iGrads]),
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
  const byNameKey = new Map<string, ScorecardRow[]>();
  const byUnitid = new Map<string, ScorecardRow>();
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
  console.log(`\n${(usUnis ?? []).length} US universities in the spine.`);

  const { data: existingMetrics, error: metricsError } = await admin
    .from("university_profile_metrics")
    .select("university_id, metric_code, notes")
    .in("metric_code", ["total_students", "undergraduate_students", "postgraduate_students"]);
  if (metricsError) {
    console.error(`Couldn't read existing metrics: ${metricsError.message}`);
    process.exitCode = 1;
    return;
  }
  const existingByUniAndMetric = new Map<string, { notes: string | null }>();
  for (const m of existingMetrics ?? []) existingByUniAndMetric.set(`${m.university_id}:${m.metric_code}`, { notes: m.notes });

  let matched = 0;
  let unmatched = 0;
  let ambiguous = 0;
  const unmatchedNames: string[] = [];
  const ambiguousDetail: string[] = [];
  const toWrite: { universityId: string; universityName: string; metric: string; value: number; sourceRow: ScorecardRow }[] = [];

  let matchedViaOverride = 0;
  for (const uni of usUnis ?? []) {
    const candidates = new Set<ScorecardRow>();
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
        unmatchedNames.push(uni.name);
        continue;
      }
    }
    if (candidates.size > 1) {
      // Multi-campus systems (e.g. several UNITIDs sharing a near-identical name) — refuse
      // rather than guess which campus our single spine row means.
      ambiguous++;
      ambiguousDetail.push(`${uni.name} -> ${[...candidates].map((c) => `${c.name} (${c.city}, ${c.state}, UNITID ${c.unitid})`).join(" | ")}`);
      continue;
    }
    const row = [...candidates][0];
    matched++;
    if (row.ugds !== null) toWrite.push({ universityId: uni.id, universityName: uni.name, metric: "undergraduate_students", value: row.ugds, sourceRow: row });
    if (row.grads !== null) toWrite.push({ universityId: uni.id, universityName: uni.name, metric: "postgraduate_students", value: row.grads, sourceRow: row });
    if (row.ugds !== null && row.grads !== null) toWrite.push({ universityId: uni.id, universityName: uni.name, metric: "total_students", value: row.ugds + row.grads, sourceRow: row });
  }

  console.log(
    `Matched ${matched} (${matchedViaOverride} via verified flagship-campus override), unmatched ${unmatched} (no name match in the bulk file — expected, most US institutions in the file aren't in our QS-derived spine), ambiguous ${ambiguous} (multiple bulk-file rows share a name — skipped rather than guessed).`
  );
  if (unmatchedNames.length > 0) {
    console.log(`\nUnmatched (no candidate row):`);
    for (const n of unmatchedNames) console.log(`  ${n}`);
  }
  if (ambiguousDetail.length > 0) {
    console.log(`\nAmbiguous (skipped, multiple bulk-file rows):`);
    for (const d of ambiguousDetail) console.log(`  ${d}`);
  }

  const filtered = toWrite.filter((w) => {
    const existing = existingByUniAndMetric.get(`${w.universityId}:${w.metric}`);
    if (!existing) return true; // new metric, always fine to fill
    if (w.metric !== "total_students") return false; // undergrad/postgrad are new metrics; if a row exists it was already written this run or a prior partial run — don't duplicate
    // total_students: only supersede a value this session's OWN Wikidata pipeline wrote.
    return (existing.notes ?? "").startsWith("Wikidata-indexed");
  });

  console.log(`\n${filtered.length} fact(s) to write (${toWrite.length - filtered.length} skipped — already have a stronger or equal existing value).`);
  const byMetric = new Map<string, number>();
  for (const f of filtered) byMetric.set(f.metric, (byMetric.get(f.metric) ?? 0) + 1);
  for (const [m, n] of byMetric) console.log(`  ${m.padEnd(24)} ${n}`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const f of filtered.slice(0, 15)) console.log(`  would write ${f.universityName} / ${f.metric} = ${f.value} (UNITID ${f.sourceRow.unitid})`);
    if (filtered.length > 15) console.log(`  ... and ${filtered.length - 15} more`);
    return;
  }

  let written = 0;
  for (const f of filtered) {
    const isReplace = f.metric === "total_students" && existingByUniAndMetric.has(`${f.universityId}:${f.metric}`);
    const payload = {
      university_id: f.universityId,
      metric_code: f.metric,
      value_numeric: f.value,
      unit: "students",
      // The "Most Recent Cohorts" file is a rolling per-institution snapshot, not a fixed
      // cohort year: each institution's UGDS/GRADS reflects ITS OWN latest finalized IPEDS
      // submission, which can differ row-to-row (a well-reporting institution might be Fall
      // 2025, a slower one Fall 2023). The bundled file carries no per-row year column and
      // ED's own data-dictionary PDF wasn't machine-readable to confirm one definitively —
      // asserting a single year across every row would be false precision. Matches the
      // existing Wikidata pipeline's own convention for this exact situation (see
      // enrich-student-counts.ts's "undated (see source)" / "current_page_date_uncertain").
      stats_as_of: "undated (see source)",
      scope: "institution",
      precision_state: "exact",
      source_url: `https://collegescorecard.ed.gov/school/?${f.sourceRow.unitid}`,
      source_type: "official_primary",
      verified_at: new Date().toISOString(),
      data_quality_flag: "current_page_date_uncertain",
      notes: `${SOURCE_LABEL}, UNITID ${f.sourceRow.unitid}. Headcount (not FTE), institution-level (single UNITID/campus). Reporting year is per-institution "most recent available", not uniformly dated.`,
    };
    if (isReplace) {
      const { data: existingRow } = await admin
        .from("university_profile_metrics")
        .select("id")
        .eq("university_id", f.universityId)
        .eq("metric_code", f.metric)
        .eq("scope", "institution")
        .maybeSingle();
      const { error: updateError } = existingRow
        ? await admin.from("university_profile_metrics").update(payload).eq("id", existingRow.id)
        : await admin.from("university_profile_metrics").insert(payload);
      if (updateError) console.error(`  FAILED ${f.universityName}/${f.metric}: ${updateError.message}`);
      else written++;
    } else {
      const { error: insertError } = await admin.from("university_profile_metrics").insert(payload);
      if (insertError) console.error(`  FAILED ${f.universityName}/${f.metric}: ${insertError.message}`);
      else written++;
    }

    if (f.metric === "total_students") {
      await admin.from("universities").update({ student_size: f.value }).eq("id", f.universityId).is("student_size", null);
    }
  }
  console.log(`\nWrote ${written}/${filtered.length}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
