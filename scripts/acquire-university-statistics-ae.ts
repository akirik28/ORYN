#!/usr/bin/env node
/**
 * United Arab Emirates tuition fee acquisition — official university pages only, no bulk
 * source found (and, unlike most other countries in this roadmap, genuinely can't have one).
 *
 * Extends the founder-directed tuition/cost-acquisition roadmap already run for UK, Canada,
 * Australia, Germany, Netherlands, France, Switzerland, Italy, Spain, South Korea, Japan, and
 * Saudi Arabia (see acquire-university-statistics-uk.ts for the full architecture rationale —
 * why `university_profile_metrics` not `university_statistics.cost_of_attendance`, why ranges
 * use the low end as `value_numeric`, why the supersession registry must be cross-checked
 * before picking a row by name — not repeated here). The UAE (12 universities in this spine, 0
 * with any tuition metric before this pass) was flagged in that roadmap's own tracking as one
 * of the largest untouched pools, alongside Taiwan (see the sibling `-tw.ts` script).
 *
 * BULK-SOURCE CHECK, done before writing any per-institution code, same discipline as every
 * prior country in this roadmap: checked the UAE Ministry of Education and the Commission for
 * Academic Accreditation (CAA, the federal higher-education regulator under the Ministry of
 * Higher Education and Scientific Research) for a per-institution tuition dataset. Unlike
 * Germany (state-law rate) or Japan (a single national MEXT standard), the UAE has NO
 * government-set or government-published tuition figure at all to find: tuition here is
 * confirmed, not assumed, to be set independently by each institution (a mix of public,
 * government-linked, and fully private universities, several of them foreign-branch or
 * American-curriculum campuses with market-rate pricing) — the CAA's public register lists
 * licensed institutions and accredited programmes, not fees. A genuine negative result, the
 * correct one for this specific country's actual regulatory structure, not an unexplored gap.
 * Went to individual official university pages instead, same as every other country in this
 * roadmap.
 *
 * A GENUINE STRUCTURAL PATTERN FOUND ACROSS EVERY UAE UNIVERSITY CHECKED THIS PASS: every one
 * bills per CREDIT HOUR, never a single flat annual figure — closer to the Canadian per-credit
 * shape than the UK/flat-rate shape. Same discipline as the Canada script: no assumed credit-
 * load multiplier is used to manufacture an annual number from a per-credit rate; each entry
 * below is written under its own `tuition_*_per_credit` metric code (never the `_annual` codes,
 * which would misrepresent the figure), following the precedent
 * acquire-university-statistics-ca.ts already established for exactly this fee-basis
 * difference. Where a university's own page also states a standard total-degree credit count,
 * that total is recorded in `notes` for context — never turned into a value_numeric of its own.
 *
 * REAL NEGATIVE RESULTS, recorded rather than silently skipped: American University of Sharjah
 * — a specific, plausible figure (AED 110,876/year flat) surfaced in search results explicitly
 * attributed to aus.edu's own tuition page, but two different aus.edu URLs both returned HTTP
 * 403 to this pass's fetch tooling on direct attempts — no live read of the official page was
 * possible, so (unlike LSE's UK entry, which had partial live confirmation plus a page excerpt)
 * this was left unwritten rather than trusted from a search snippet alone. Abu Dhabi University
 * — an official fee page exists (adu.ac.ae/study/financials/tuition-fees) but its content is
 * JS-rendered and returned empty to this pass's fetch tooling; its downloadable PDF schedule
 * also failed to parse (binary/encoded content, not extractable text) — a fetch-access problem,
 * not a confirmed absence of data, worth retrying with different tooling. Ajman University: its
 * official tuition page exists but the actual figures are PDF-only (a 2026-2027 fee booklet),
 * same "PDF-gated, not readable this pass" pattern this roadmap already documented for Malaysia.
 * American University in Dubai, University of Sharjah, Al Ain University, American University
 * of Ras Al Khaimah, Canadian University Dubai, University of Dubai: not reached this pass —
 * genuinely not researched, not attempted and abandoned; queued for a future batch.
 *
 * Usage:
 *   npm run acquire:university-statistics-ae                  # dry run
 *   npm run acquire:university-statistics-ae -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface AeTuitionEntry {
  /** AED per credit hour. */
  internationalPerCredit?: number;
  domesticPerCredit?: number;
  statsAsOf: string;
  sourceUrl: string;
  notes: string;
}

/** `universities.name` (exact, this spine) -> hand-verified UAE tuition data. Every entry read
 * directly from the cited official page 2026-08-20. Never fuzzy-matched. Cross-checked against
 * `lib/universities/duplicate-supersessions.json` first — no UAE entries exist in that
 * registry (checked, not assumed), so no supersession risk for this table. */
const AE_TUITION: Record<string, AeTuitionEntry> = {
  "Khalifa University": {
    internationalPerCredit: 2500,
    domesticPerCredit: 2500,
    statsAsOf: "current (as published, no academic year stated on the page itself)",
    sourceUrl: "https://www.ku.ac.ae/admissions/undergraduate-admissions/tuition-fees",
    notes:
      "Undergraduate, AED 2,500/credit hour, read directly from Khalifa University's own undergraduate-admissions tuition page. The page does not state whether this differs by citizenship (UAE national vs. international) — no separate rate was found on the page, so the same figure is recorded for both metric codes rather than assuming a difference that wasn't confirmed. The university's own page includes the standard disclaimer that it reserves the right to change fees.",
  },
  "Zayed University": {
    internationalPerCredit: 2500,
    domesticPerCredit: 2500,
    statsAsOf: "current (as published, no academic year stated on the page itself)",
    sourceUrl: "https://www.zu.ac.ae/main/en/undergraduate-programs/tuition-scholarship",
    notes:
      "AED 2,500/credit hour, read directly from Zayed University's own tuition-and-scholarship page, which explicitly states this single rate applies to BOTH self-funding UAE national students and non-national (international) students — a confirmed, not assumed, uniform rate (unlike Khalifa, where the page simply didn't address the distinction). UAE nationals under the federal government scholarship scheme are separately funded for up to five years and transition to this same self-funded rate afterward — a different concept (a funding source, not a different sticker price) not itemised as its own figure.",
  },
  "United Arab Emirates University": {
    internationalPerCredit: 2661,
    statsAsOf: "2026/27 entry (the page's own stated current rate; explicitly supersedes a 2025/26-and-earlier AED 1,900-3,000/credit range also shown on the same page)",
    sourceUrl: "https://www.uaeu.ac.ae/en/dvcsae/student_account_office/program-and-housing-rates-international-students-undergraduate-students.shtml",
    notes:
      "International undergraduate students, AED 2,661/credit hour, read directly from UAEU's own Student Account Office page — this rate is now uniform across the colleges checked on the page (most programs, Engineering, Law, Statistics & Data Analytics all list the same per-credit figure for 2026/27, though total degree cost still differs by required credit count: ~319,320 AED for a standard 120-credit degree, ~351,252 AED for Engineering's 132 credits, ~345,930 AED for Law's 130 credits). The page explicitly states fees vary by the academic year a student was admitted in and reserves the right to adjust annually — this specific figure is the 2026/27-onward rate, not blended with the older range also shown. No domestic/UAE-national rate found on this specific page (it is scoped to international students), so not written here.",
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

  const { data: aeUnis, error } = await admin.from("universities").select("id, name").eq("country", "United Arab Emirates").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${(aeUnis ?? []).length} UAE universities in the spine; ${Object.keys(AE_TUITION).length} hand-verified entries in this pass.`);

  type ToWrite = { universityId: string; universityName: string; metricCode: string; valueNumeric: number };
  const toWrite: ToWrite[] = [];
  let noEntry = 0;

  for (const uni of aeUnis ?? []) {
    const entry = AE_TUITION[uni.name];
    if (!entry) {
      noEntry++;
      continue;
    }
    if (entry.internationalPerCredit != null) {
      toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_international_per_credit", valueNumeric: entry.internationalPerCredit });
    }
    if (entry.domesticPerCredit != null) {
      toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_domestic_per_credit", valueNumeric: entry.domesticPerCredit });
    }
  }

  console.log(`${toWrite.length} metric rows to write, ${noEntry} UAE universities with no entry in this table (left unresolved — see file header for the specific negative results, not silently skipped).`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / ${w.metricCode} = AED ${w.valueNumeric}/credit`);
    return;
  }

  let written = 0;
  let skippedExisting = 0;
  for (const w of toWrite) {
    const entry = AE_TUITION[w.universityName];
    // Never overwrite an existing value — see acquire-university-statistics-tw.ts's header for
    // why this script is deliberately more conservative than its upsert-on-sight siblings.
    const existingRow = await admin.from("university_profile_metrics").select("id").eq("university_id", w.universityId).eq("metric_code", w.metricCode).eq("scope", "undergraduate").maybeSingle();
    if (existingRow.data) {
      skippedExisting++;
      continue;
    }
    const payload = {
      university_id: w.universityId,
      metric_code: w.metricCode,
      value_numeric: w.valueNumeric,
      unit: "AED/credit",
      stats_as_of: entry.statsAsOf,
      scope: "undergraduate",
      precision_state: "exact",
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
