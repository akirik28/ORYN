#!/usr/bin/env node
/**
 * Taiwan tuition fee acquisition — official university pages only, no bulk source found.
 *
 * Extends the founder-directed tuition/cost-acquisition roadmap already run for UK, Canada,
 * Australia, Germany, Netherlands, France, Switzerland, Italy, Spain, South Korea, Japan, and
 * Saudi Arabia (see acquire-university-statistics-uk.ts for the full architecture rationale —
 * why `university_profile_metrics` not `university_statistics.cost_of_attendance`, why ranges
 * use the low end as `value_numeric`, why the supersession registry must be cross-checked
 * before picking a row by name — not repeated here). Taiwan (16 universities in this spine, 0
 * with any tuition metric before this pass) was flagged in that roadmap's own tracking as one
 * of the largest untouched pools, alongside the UAE (see the sibling `-ae.ts` script).
 *
 * BULK-SOURCE CHECK, done before writing any per-institution code, same discipline as every
 * prior country in this roadmap: searched for a Taiwan Ministry of Education (MOE) per-
 * institution tuition dataset (the "大專校院學雜費" — university tuition/fee — data MOE is
 * known to regulate and publish policy about) on both MOE's own site and Taiwan's official
 * open-data portal (data.gov.tw). Found real MOE content on this exact topic
 * (depart.moe.edu.tw's "拉近公私立大專校院學雜費差距落實教育實質公平" announcement) — but
 * confirmed by direct fetch that it publishes only NATIONAL AVERAGES (public ≈ NT$62,000/year,
 * private ≈ NT$110,000/year), not a per-institution breakdown, and is not a linked data file.
 * data.gov.tw's own dataset search for 大專校院 (tertiary institutions) surfaces institution-
 * NAME directories (`33207`, `6091`) and enrollment-count datasets (`46324`), never a fee/
 * tuition dataset. No bulk per-institution Taiwan tuition source exists that this pass could
 * find — a genuine negative result, not an unexplored gap. Went to individual official
 * university pages instead, same as every other country in this roadmap.
 *
 * REAL NEGATIVE RESULTS, recorded rather than silently skipped: National Yang Ming Chiao Tung
 * University (NYCU), National Cheng Kung University (NCKU), National Chengchi University, and
 * National Sun Yat-sen University were all checked — each has a real official tuition page
 * (oia.<domain>.edu.tw), but this pass's fetch tooling could not read a clean, current,
 * international-student figure off any of them (some returned only local-student baseline fees
 * in the fetched excerpt, others 404'd or the connection failed outright) — not guessed from
 * the many conflicting third-party aggregator figures found alongside them (UniPage, Standyou,
 * GoToUniversity, Qogent all disagreed with each other by 2-3x for the same institution — not an
 * official source per this roadmap's own hierarchy, never used). National Taiwan University of
 * Science and Technology (Taiwan Tech / NTUST): a specific per-credit figure (NT$3,340/credit)
 * surfaced in search results attributed to its own domain, but the specific page could not be
 * independently re-fetched live this pass (404 on the direct URL found, a PDF companion source
 * failed on a TLS certificate error) — not written without a live read of its own.
 *
 * Usage:
 *   npm run acquire:university-statistics-tw                  # dry run
 *   npm run acquire:university-statistics-tw -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface TwTuitionEntry {
  /** [low, high] across published undergraduate colleges/programs, NTD/semester. A single-
   * element tuple if only one flat rate was found. */
  international?: [number] | [number, number];
  domestic?: [number] | [number, number];
  statsAsOf: string;
  sourceUrl: string;
  notes: string;
}

/** `universities.name` (exact, this spine) -> hand-verified Taiwan tuition data. Every entry
 * read directly from the cited official page 2026-08-20. Never fuzzy-matched. Cross-checked
 * against `universities.duplicate_status` first — no Taiwan entries exist in
 * that registry (checked, not assumed), so no supersession risk for this table. */
const TW_TUITION: Record<string, TwTuitionEntry> = {
  "National Taiwan University (NTU)": {
    international: [50460, 62100],
    statsAsOf: "current (as published)",
    sourceUrl: "https://admissions.ntu.edu.tw/fees-scholarships/tuition-fees/",
    notes:
      "Undergraduate, per semester, international/Mainland Chinese student rate, read directly from NTU's own Office of International Affairs admissions page. By college: Liberal Arts/Social Sciences/Law NT$50,460 (lowest), Management NT$51,220, Life Science NT$60,520, Science/Bio-resources & Agriculture NT$58,520, Engineering/EECS NT$58,940, International College (Semiconductors) NT$60,000, Medicine & Public Health NT$62,100 (highest). value_numeric set to the true low end (Liberal Arts/Social Sciences/Law), per this roadmap's established range convention. A separate, lower 'Overseas Chinese/Hong Kong & Macau' rate also exists (roughly half the international rate) but is a different student-status category, not the domestic/citizen rate, and not written here to avoid conflating the two. The page itself notes fees are billed per semester and to check the Office of Academic Affairs for the exact current-year amount.",
  },
  "Chang Gung University": {
    international: [38758, 59547],
    statsAsOf: "2024/25 academic year (page's own most recent posted table; the same page states the 2025/26 figures 'will be changed and announced by mid-August' — not silently presented as current-year, see note)",
    sourceUrl: "https://www.cgu.edu.tw/recruit_intl/Contents?nodeId=15117",
    notes:
      "Undergraduate, per semester, read directly from Chang Gung's own international-recruitment tuition page. This page's own posted table is labeled 2024-2025 — the page states the following year's actual fees are announced separately each August, and no later table was found live this pass, so this figure is knowingly a year or more behind current, not asserted as 2026/27. By college: Management NT$38,758 (most departments, lowest), Industrial Design NT$44,537, Engineering NT$44,537, Intelligent Computing NT$44,537, Medicine (most departments) NT$46,807, Traditional Chinese Medicine NT$59,547 (highest). value_numeric set to the true low end (Management). International students pay the same posted rate as local students per this page (no separate international premium stated) — so this figure is used for both metric codes.",
    domestic: [38758, 59547],
  },
  "National Taipei University of Technology": {
    international: [47378, 54837],
    statsAsOf: "2024/25 academic year (page's own stated year — see note)",
    sourceUrl: "https://oia.ntut.edu.tw/p/412-1032-13790.php?Lang=en",
    notes:
      "Undergraduate, per semester, international-student rate, read directly from NTUT's (Taipei Tech) own Office of International Affairs page. The page itself labels these figures 2024/2025 and states actual per-student cost also depends on housing/other chosen options — not asserted as current-year. Most programs NT$54,837/semester; a named set of humanities/social-science programs (Applied English, Cultural Vocation Development, Business Management) NT$47,378/semester (the low end used for value_numeric). Separate mandatory fees (internet, insurance, dormitory) of roughly NT$400-9,900/semester also apply depending on student choices — not itemised here, a different cost concept from tuition itself, same treatment as every other country's administrative fees in this roadmap.",
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

  const { data: twUnis, error } = await admin.from("universities").select("id, name").eq("country", "Taiwan").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${(twUnis ?? []).length} Taiwanese universities in the spine; ${Object.keys(TW_TUITION).length} hand-verified entries in this pass.`);

  type ToWrite = { universityId: string; universityName: string; metricCode: string; valueNumeric: number };
  const toWrite: ToWrite[] = [];
  let noEntry = 0;

  for (const uni of twUnis ?? []) {
    const entry = TW_TUITION[uni.name];
    if (!entry) {
      noEntry++;
      continue;
    }
    if (entry.international) {
      toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_international_annual", valueNumeric: entry.international[0] });
    }
    if (entry.domestic) {
      toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_domestic_annual", valueNumeric: entry.domestic[0] });
    }
  }

  console.log(`${toWrite.length} metric rows to write, ${noEntry} Taiwanese universities with no entry in this table (left unresolved — see file header for the specific negative results, not silently skipped).`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / ${w.metricCode} = NT$${w.valueNumeric}/semester (low end of a published range — see notes)`);
    return;
  }

  let written = 0;
  let skippedExisting = 0;
  for (const w of toWrite) {
    const entry = TW_TUITION[w.universityName];
    // Never overwrite an existing value — this roadmap's other country scripts upsert
    // idempotently because each script only ever touches universities it freshly researched
    // itself, but this script is deliberately more conservative: if a row already exists for
    // this university+metric (e.g. written by a different, concurrent session), skip rather
    // than risk clobbering data this script didn't itself verify.
    const existingRow = await admin.from("university_profile_metrics").select("id").eq("university_id", w.universityId).eq("metric_code", w.metricCode).eq("scope", "undergraduate").maybeSingle();
    if (existingRow.data) {
      skippedExisting++;
      continue;
    }
    const payload = {
      university_id: w.universityId,
      metric_code: w.metricCode,
      value_numeric: w.valueNumeric,
      unit: "TWD/semester",
      stats_as_of: entry.statsAsOf,
      scope: "undergraduate",
      precision_state: "range",
      source_url: entry.sourceUrl,
      source_type: "official_primary",
      verified_at: new Date().toISOString(),
      data_quality_flag: "current",
      notes: entry.notes,
    };
    const { error: writeError } = await admin.from("university_profile_metrics").insert(payload);
    if (writeError) {
      console.error(`  FAILED ${w.universityName} / ${w.metricCode}: ${writeError.message}`);
      continue;
    }
    written++;
  }
  console.log(`\nWrote ${written}/${toWrite.length} (${skippedExisting} already had a row, not overwritten).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
