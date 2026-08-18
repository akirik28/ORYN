#!/usr/bin/env node
/**
 * Australia tuition fee acquisition — pilot start, official university pages only.
 *
 * Third country in the founder-directed tuition/cost-acquisition roadmap (UK -> Canada ->
 * Australia -> Germany -> ...). See acquire-university-statistics-uk.ts for the shared
 * architecture rationale (why `university_profile_metrics`, why ranges use the low end,
 * why the supersession registry must be cross-checked before picking a row by name).
 *
 * No global source check was needed here the way StatCan/HESA needed one for Canada/UK —
 * Australia has no single obvious national tuition-by-institution dataset to rule out first;
 * went straight to official university pages.
 *
 * DOMESTIC FEES DELIBERATELY NOT ATTEMPTED THIS PASS: Australian domestic students don't pay a
 * flat "domestic tuition" fee the way UK/Canadian domestic students do — most domestic
 * undergraduates hold a Commonwealth Supported Place (a government-subsidised "student
 * contribution amount" set by field of study, separate from the international fee schedule
 * entirely, plus HECS-HELP loan eligibility). That's a structurally different concept, not a
 * missing number — modelling it honestly would need its own research pass, not a quick
 * `domesticLow` field reused from the UK/Canada shape. Left out rather than approximated.
 *
 * REAL NEGATIVE RESULTS, investigated not skipped:
 *   - UNSW Sydney: genuinely has real per-unit-of-credit tables (48 units of credit = one
 *     standard full-time year), but they sit behind Undergraduate/Postgraduate JS tabs with no
 *     working way found this pass to isolate just the Undergraduate panel's tables — a raw DOM
 *     scrape returns 33 tables mixing both levels together with no reliable per-table label to
 *     split on. Writing a "range" here risked silently blending undergrad and postgrad rates
 *     (a real, different-concept conflation), so nothing was written rather than guess.
 *   - University of Melbourne: 2026 fee tables are published only as PDFs
 *     (2026-International-Fee-Tables.pdf and a companion course-tuition PDF); the international-
 *     applications landing page shows only a $17,000 deposit figure, no rate table. Not written.
 *   - Australian National University, University of Queensland, Monash University: same
 *     pattern as UNSW/Melbourne, checked separately — every fee page found points at a
 *     per-course fee-estimator/finder tool (enter a specific programme, get that programme's
 *     figure) with zero static aggregate table or page-wide range statement anywhere on the
 *     official domain. **A real pattern worth naming**: of the 6 Australian universities
 *     checked so far, only the University of Sydney published a genuine, scannable,
 *     university-wide table — every other large Australian research university checked
 *     requires a real per-course tool interaction to get a single figure. A future pass
 *     wanting these five specifically will need to drive that tool programme-by-programme
 *     (a materially bigger job) rather than expect a quick static-page read to work.
 *
 * Usage:
 *   npm run acquire:university-statistics-au                  # dry run
 *   npm run acquire:university-statistics-au -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface AuTuitionEntry {
  /** AUD/year — [low, high] across published undergraduate faculties for the given entry year. */
  international: [number, number];
  statsAsOf: string;
  sourceUrl: string;
  notes: string;
}

/** `universities.name` (exact, this spine) -> hand-verified Australia tuition data. Every
 * entry read directly from the cited official page 2026-08-18. Never fuzzy-matched.
 * Cross-checked against `lib/universities/duplicate-supersessions.json` before being added. */
const AU_TUITION: Record<string, AuTuitionEntry> = {
  "The University of Sydney": {
    international: [49200, 60600],
    statsAsOf: "2026 entry",
    sourceUrl: "https://www.sydney.edu.au/study/fees-and-loans/international-student-tuition-fees.html",
    notes:
      "Real, clearly-labeled table: 'Full-time fees (guide for 2026 entry)' column, 'Undergraduate' row specifically (distinguished in the same tables from 'Postgraduate coursework'/'Postgraduate research' rows — the Undergraduate figure was read from that row only, not an unscoped min/max across the page, which would have mixed levels). 13 faculty tables scanned: $49,200 (lowest faculty) to $60,600 (highest). The page itself calls these 'a guide only' — course pages carry the precise figure.",
  },
};

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

  const { data: auUnis, error } = await admin.from("universities").select("id, name").eq("country", "Australia").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${(auUnis ?? []).length} Australian universities in the spine; ${Object.keys(AU_TUITION).length} hand-verified entries in this pilot batch.`);

  type ToWrite = { universityId: string; universityName: string; valueNumeric: number };
  const toWrite: ToWrite[] = [];
  let noEntry = 0;

  for (const uni of auUnis ?? []) {
    const entry = AU_TUITION[uni.name];
    if (!entry) {
      noEntry++;
      continue;
    }
    toWrite.push({ universityId: uni.id, universityName: uni.name, valueNumeric: entry.international[0] });
  }

  console.log(`${toWrite.length} metric rows to write, ${noEntry} Australian universities with no entry in this table (left unresolved, see file header for the "too complex to resolve this pass" cases and the queued remainder).`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / tuition_international_annual = A$${w.valueNumeric}`);
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const entry = AU_TUITION[w.universityName];
    const payload = {
      university_id: w.universityId,
      metric_code: "tuition_international_annual",
      value_numeric: w.valueNumeric,
      unit: "AUD/year",
      stats_as_of: entry.statsAsOf,
      scope: "undergraduate",
      precision_state: "range",
      source_url: entry.sourceUrl,
      source_type: "official_primary",
      verified_at: new Date().toISOString(),
      data_quality_flag: "current",
      notes: entry.notes,
    };
    const existingRow = await admin
      .from("university_profile_metrics")
      .select("id")
      .eq("university_id", w.universityId)
      .eq("metric_code", "tuition_international_annual")
      .eq("scope", "undergraduate")
      .maybeSingle();
    const { error: writeError } = existingRow.data
      ? await admin.from("university_profile_metrics").update(payload).eq("id", existingRow.data.id)
      : await admin.from("university_profile_metrics").insert(payload);
    if (writeError) {
      console.error(`  FAILED ${w.universityName}: ${writeError.message}`);
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
