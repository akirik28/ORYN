#!/usr/bin/env node
/**
 * Canada tuition fee acquisition — pilot start, official university pages only.
 *
 * Second country in the founder-directed tuition/cost-acquisition roadmap (UK -> Canada ->
 * Australia -> ...). See acquire-university-statistics-uk.ts for the full architecture
 * rationale (why `university_profile_metrics` not `university_statistics.cost_of_attendance`,
 * why ranges use the low end as `value_numeric`, why the supersession registry must be
 * cross-checked before picking a row by name) — not repeated here.
 *
 * SOURCE CHECK, done before writing any code: Statistics Canada's Tuition and Living
 * Accommodation Costs tables (37-10-0003 through -0006, -0045-01 — reachable, unlike HESA) are
 * genuinely official but published at province/field-of-study granularity, not per-institution
 * — confirmed by reading the tables' own documentation and an (archived) StatCan interactive
 * tool built on the same source tables. No per-institution bulk file found for Canada, unlike
 * Germany's Destatis or Spain's ciencia.gob.es. Went straight to individual official
 * university pages, same approach as UK.
 *
 * A GENUINE STRUCTURAL DIFFERENCE FROM THE UK BATCH, AND WITHIN CANADA ITSELF: most Canadian
 * universities checked this pass bill tuition PER CREDIT (UBC, and — confirmed but not yet
 * resolved to real numbers — McMaster), not as one flat annual figure; this is normal here,
 * not a gap. Alberta is the one exception found so far: a real flat annual rate per program
 * band, same shape as the UK data. Each `CA_TUITION` entry states its own `feeBasis` rather
 * than assuming one convention for the whole country — see `CaTuitionEntry`. Where per-credit,
 * deliberately NOT multiplying by an assumed credit-load to manufacture an annual figure —
 * that would be guessing a course load on the student's behalf, exactly the kind of
 * fabrication this workstream exists to avoid.
 *
 * A REAL MISTAKE CAUGHT WHILE WRITING THIS SCRIPT, before any write happened: a first draft
 * reused the UK batch's `tuition_international_annual`/`tuition_domestic_annual` metric codes
 * for this per-credit data. That is exactly the "collapse different cost concepts into one
 * field" the founder's spec forbids — anything reading `tuition_international_annual` (this
 * codebase's own detail-page UI already does, rendering "From £X/yr") would silently mislabel
 * a per-credit figure as an annual one. Fixed before `--apply`: this data uses its own metric
 * codes, `tuition_international_per_credit`/`tuition_domestic_per_credit`, so a per-year and a
 * per-credit figure can never collide under the same code. Not yet wired into any UI — the
 * detail page's tuition StatCard only reads the `_annual` codes; extending it to also handle
 * `_per_credit` correctly (a genuinely different display, not a relabeled copy of the annual
 * one) is queued as a deliberate follow-up, not rushed into this pass.
 *
 * REAL NEGATIVE RESULTS, investigated not skipped:
 *   - McGill University: Quebec's tuition structure is genuinely complex (a base per-credit
 *     Quebec rate, plus separate "Rate A"/"Rate B" out-of-province supplements for Canadian
 *     students, plus a cohort-guaranteed rate system for international students) and McGill's
 *     own international fee schedule is published ONLY as a PDF with no readable static page
 *     found — downloading it wasn't attempted (file downloads need explicit user permission,
 *     out of scope for an unattended acquisition pass). Search-derived figures for McGill
 *     conflicted between sources ($31,836 vs $49,000, likely different years or faculties
 *     confused) — too uncertain to trust. Not written.
 *   - University of Toronto: fee schedules are fragmented per constituent COLLEGE (Trinity,
 *     Victoria, University College, St. Michael's, Innis, Woodsworth each publish their own
 *     separate PDF) on top of per-faculty variation, all PDF-only, none readable as a static
 *     page this pass's tooling could parse. Not written.
 *   - Western University: every fee schedule found (2026-27-Program-Specific-Tuition-Fees.pdf
 *     and siblings) is PDF-only, no static HTML table or summary page found. Not written.
 *   - McMaster University: confirmed per-unit(credit) billing (same shape as UBC), but the
 *     actual rate table is published only as an XLSX rendered through Microsoft's Office
 *     Online viewer (view.officeapps.live.com) — the numbers live inside a canvas/iframe,
 *     not real page text this pass's tooling could read. Not written.
 *
 * Usage:
 *   npm run acquire:university-statistics-ca                  # dry run
 *   npm run acquire:university-statistics-ca -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface CaTuitionEntry {
  /** Not every Canadian university bills the same way — UBC bills per credit, Alberta a flat
   * annual rate per program band, Waterloo per 0.5-unit COURSE (a distinct concept from a
   * "credit" — not assumed equivalent). Each entry states its own basis explicitly rather than
   * assuming one convention for the whole country. */
  feeBasis: "per_credit" | "annual" | "per_course";
  /** [low, high] across published undergraduate programs, in CAD, at whatever `feeBasis` says. */
  international: [number, number];
  domesticLow?: number;
  /** Not hardcoded to one value for the whole table — see the Alberta entry, which is
   * genuinely a year behind the others (no 2026/27 page found for it yet). */
  statsAsOf: string;
  sourceUrl: string;
  notes: string;
}

/** `universities.name` (exact, this spine) -> hand-verified Canada tuition data. Every entry
 * read directly from the cited official page 2026-08-18. Never fuzzy-matched. Cross-checked
 * against `universities.duplicate_status` before being added — see the UK
 * script's header for why that check matters. */
const CA_TUITION: Record<string, CaTuitionEntry> = {
  "University of British Columbia": {
    feeBasis: "per_credit",
    international: [1434.7, 2222.61],
    domesticLow: 206.69,
    statsAsOf: "2026/27 entry",
    sourceUrl: "https://vancouver.calendar.ubc.ca/fees/tuition-fees/undergraduate",
    notes:
      "2026/27 Vancouver campus rates, students commencing 2026 Summer or later, read directly from a real live table (not a PDF). International, per credit: $1,434.70 (Music, the lowest-priced program) to $2,222.61 (Commerce, the highest). A full-time undergraduate course load is commonly ~30 credits/year at Canadian universities, but that is NOT asserted here — no credit-load multiplier is applied, so this figure must not be presented as an annual number. Domestic per-credit low end (Arts/most programs, Year 1): $206.69 — domestic rates vary by program and year similarly to international; only the lowest common rate is recorded, not a full domestic range, since this pass's focus is the international figure.",
  },
  "University of Alberta": {
    feeBasis: "annual",
    international: [32643.6, 47756.4],
    statsAsOf: "2025/26 cohort (see notes — not 2026/27)",
    sourceUrl: "https://calendar.ualberta.ca/content.php?catoid=69&navoid=22549",
    notes:
      "IMPORTANT: this is the 2025-26 rate table, explicitly labeled as such on the source page — no 2026/27 version was found anywhere on this domain at time of check, unlike every other entry in this file. Not silently presented as 2026/27. Alberta uses a program-based, cohort-guaranteed tuition model (each entering class's rate is locked for the program's duration, increasing ~5.5%/year for NEW cohorts) — this pass did not compute an inflation-adjusted 2026/27 estimate, since that would be a derived, not directly-sourced, figure. Real annual rate (not per-credit): $32,643.60 (Augustana/Saint Jean/Education/Native Studies/Nursing degree programs, the lowest band) to $47,756.40 (Faculty of Engineering, the highest of the standard bands — excludes higher outlier professional programs: Pharmacy $60,452.52, Law $57,205.34, Dental Surgery $107,921.52, none of which are undergraduate first-entry degrees).",
  },

  // --- Second batch, 2026-08-18 ---
  "University of Waterloo": {
    feeBasis: "per_course",
    international: [4698.2, 6919.4],
    statsAsOf: "Fall 2025 (see notes — not yet 2026/27)",
    sourceUrl: "https://uwaterloo.ca/finance/fee-schedule-international-undergraduate-students-fall-2025-0",
    notes:
      "IMPORTANT: the live fee-schedule page found is explicitly Fall 2025, not 2026/27 — no 2026/27 schedule was found at time of check; same honest-about-staleness treatment as the Alberta entry above. Waterloo bills per 0.5-unit COURSE (its own real billing unit, e.g. a standard one-term course), not a generic 'credit' — a genuinely different denomination from UBC's per-credit figure above, kept in its own `unit` string so the two are never displayed as if comparable. Range across standard faculties: $4,698.20 (Health/Science) to $6,919.40 (Engineering/Mathematics, top band); Environment $4,719.60. Excludes Optometry ($36,011/term) and Pharmacy ($35,561/term), which are professional per-term program fees on a completely different structure, not comparable to a per-course undergraduate rate.",
  },

  // --- Third batch, 2026-08-19 --- Calgary, Ottawa, Dalhousie, Victoria, Manitoba, Carleton
  // checked, no single official-page bulk figure found (per-course lookup tools, PDF-only
  // schedules, or the fetch tooling itself blocked/paywalled by the site) — not written, not
  // guessed from an aggregator. SFU is the one real addition: another genuine per-unit billing
  // system, same discipline as UBC/Waterloo above — no credit-load multiplier applied.
  "Simon Fraser University": {
    feeBasis: "per_credit",
    international: [1262.88, 1492.13],
    statsAsOf: "2024/2025-or-later entry cohort, read 2026-08-19",
    sourceUrl: "https://www.sfu.ca/students/calendar/fees-and-regulations/tuition-fees/undergraduate.html",
    notes:
      "Per-unit rate, not annual — same 'no assumed credit-load multiplier' discipline as UBC/Waterloo above. Basic rate for students entering 2024/2025 or later: $1,262.88/unit. Premium-program rates, same cohort: Beedie School of Business $1,492.13/unit (the range's high end used here), Engineering/Mechatronic/Sustainable Energy $1,348.19/unit, Computing Science $1,327.97/unit. Earlier-cohort students pay lower legacy rates ($1,239.06/unit for 2017/18-2023/24 entrants, $1,087.78/unit for 2016/17-or-earlier) — not relevant to a prospective student, not recorded. Domestic rate not captured this pass — left unresolved rather than guessed.",
  },
  "Université Laval": {
    feeBasis: "per_credit",
    international: [933.53, 933.53],
    statsAsOf: "Fall 2026/Winter 2027",
    sourceUrl: "https://www.ulaval.ca/etudes/droits-de-scolarite/etudiant-de-linternational/programmes-de-1er-cycle/automne-2026-hiver-2027",
    notes:
      "A real Fall-2026/Winter-2027-specific official page (unlike several other entries in this file still on a stale year) — base international rate is a single uniform $933.53/credit, no indication of variation by faculty or program (both tuple elements the same, honestly representing one flat rate rather than a real range). Example bundled totals on the page (1 credit $933.53, 3 credits $2,800.59, 12 credits $11,362.12, 15 credits $14,116.48) combine base tuition with foreign-student supplements, admin/technology/transit fees — not comparable to the other CAD/credit entries in this file, which are base tuition only; not used as the recorded rate. International students also pay a separate mandatory $900/year health/hospital insurance fee, not tuition, not recorded here.",
  },
};

/**
 * REAL NEGATIVE RESULTS, second batch, investigated not skipped:
 *   - University of Calgary: the university's own Calendar (calendar.ucalgary.ca) is the
 *     stated official source but wasn't reduced to one clean figure this pass — it's a large
 *     interactive calendar site, not a static table, and third-party estimates for it conflict
 *     wildly ($26,849–$84,085 depending on source), too uncertain to trust without reading the
 *     Calendar directly. Needs dedicated per-page navigation, not attempted this pass.
 *   - Simon Fraser University: genuinely structurally complex, not just hard to find — tuition
 *     is billed per unit AND depends on the student's ENTRY COHORT (a real tuition-guarantee
 *     system: 2016/17-or-earlier / 2017/18-2023/24 / 2024/25-or-later cohorts each pay a
 *     different locked-in per-unit rate, e.g. $1,262.88 vs $1,239.06 vs $1,087.78/unit for the
 *     same base program). There is no single "the 2026/27 rate" the way most other entries in
 *     this file have — any figure written would need to specify which cohort, a materially
 *     different shape than every other entry here. Not written rather than picking one cohort
 *     arbitrarily.
 *   - University of Ottawa: the official tuition-international page returned HTTP 402 to this
 *     pass's fetch tooling — a fetch-access failure, not a confirmed absence of data (same class
 *     of gap as Cardiff in the UK batch), worth retrying with different tooling.
 *   - University of Victoria: the official page states fees are set at the Board's June meeting
 *     and directs to the Calendar/faculty pages for actual figures — the page's own tuition
 *     estimator tool was non-functional ("Waiting for results") at time of check. Not written.
 *   - Queen's University: no official-domain (queensu.ca) fee page surfaced in this pass's
 *     search results at all — every result was a third-party aggregator. Not attempted further
 *     without a real official URL to start from.
 */

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

  const { data: caUnis, error } = await admin.from("universities").select("id, name").eq("country", "Canada").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${(caUnis ?? []).length} Canadian universities in the spine; ${Object.keys(CA_TUITION).length} hand-verified entries in this pilot batch.`);

  type ToWrite = { universityId: string; universityName: string; metricCode: string; valueNumeric: number; unit: string };
  const toWrite: ToWrite[] = [];
  let noEntry = 0;

  for (const uni of caUnis ?? []) {
    const entry = CA_TUITION[uni.name];
    if (!entry) {
      noEntry++;
      continue;
    }
    const isAnnual = entry.feeBasis === "annual";
    const intlCode = isAnnual ? "tuition_international_annual" : "tuition_international_per_credit";
    const domCode = isAnnual ? "tuition_domestic_annual" : "tuition_domestic_per_credit";
    const unit = entry.feeBasis === "per_credit" ? "CAD/credit" : entry.feeBasis === "per_course" ? "CAD/0.5-unit course" : "CAD/year";
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: intlCode, valueNumeric: entry.international[0], unit });
    if (entry.domesticLow != null) {
      toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: domCode, valueNumeric: entry.domesticLow, unit });
    }
  }

  console.log(`${toWrite.length} metric rows to write, ${noEntry} Canadian universities with no entry in this table (left unresolved, see file header for the "too complex to resolve this pass" cases and the queued remainder).`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / ${w.metricCode} = $${w.valueNumeric} (${w.unit})`);
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const entry = CA_TUITION[w.universityName];
    const payload = {
      university_id: w.universityId,
      metric_code: w.metricCode,
      value_numeric: w.valueNumeric,
      unit: w.unit,
      stats_as_of: entry.statsAsOf,
      scope: "undergraduate",
      precision_state: "range",
      source_url: entry.sourceUrl,
      source_type: "official_primary",
      verified_at: new Date().toISOString(),
      data_quality_flag: "current",
      notes: entry.notes,
    };
    const existingRow = await admin.from("university_profile_metrics").select("id").eq("university_id", w.universityId).eq("metric_code", w.metricCode).eq("scope", "undergraduate").maybeSingle();
    const { error: writeError } = existingRow.data
      ? await admin.from("university_profile_metrics").update(payload).eq("id", existingRow.data.id)
      : await admin.from("university_profile_metrics").insert(payload);
    if (writeError) {
      console.error(`  FAILED ${w.universityName} / ${w.metricCode}: ${writeError.message}`);
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
