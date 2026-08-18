#!/usr/bin/env node
/**
 * UK tuition fee acquisition — pilot batch, official university pages only.
 *
 * First country in the founder-directed tuition/cost-acquisition roadmap (UK -> Canada ->
 * Australia -> Germany -> Netherlands -> France -> Switzerland -> ...). `university_statistics`
 * (128 rows) is US-only; this does NOT write there — see below for why.
 *
 * SOURCE HIERARCHY FOLLOWED, per the founder's own spec: official university fees page (used
 * for every entry here) > official government dataset > official prospectus/PDF > trusted
 * national portal > other sources (verification only). HESA — the obvious UK-wide official
 * dataset — is Cloudflare bot-protected (confirmed `403` in an earlier pass, see the handoff
 * doc's "Current state"; not re-attempted, defeating a bot challenge is out of scope). Discover
 * Uni (discoveruni.gov.uk, the OfS/HESA-run public comparison site) is reachable but has no
 * bulk-download UI on its public pages as of this check. So this pass goes straight to each
 * university's own official fees page, exactly the founder's #1-ranked source anyway.
 *
 * WHY `university_profile_metrics`, NOT `university_statistics.cost_of_attendance`: that
 * column is documented (see acquire-university-statistics-us.ts) as specifically IPEDS's
 * "average cost of attendance" — a US-specific, all-in sticker-price concept that has no UK
 * equivalent. UK universities publish TUITION (international/domestic separately) as its own
 * figure, usually with no bundled cost-of-attendance estimate at all. Writing a UK tuition
 * number into a column documented to mean something else is exactly the "collapse different
 * cost concepts into one field" the founder's spec explicitly forbids. `university_profile_
 * metrics`'s flexible store (already reviewed and endorsed for exactly this kind of
 * variably-shaped fact — see the handoff doc's Phase 9) is the right fit, no migration needed.
 *
 * WHY A RANGE, NOT ONE NUMBER, for every `tuition_international_annual` entry here: every UK
 * university checked this pass with a published international figure states it as a range
 * (fees vary by course — humanities cheapest, lab sciences/medicine most expensive), never one
 * flat rate. `value_numeric` is set to the LOW end (a defensible, conservative anchor — never
 * the number a student would actually be quoted without knowing their course), `precision_state:
 * "range"`, and the full stated range is in `notes`. A caller must not present `value_numeric`
 * alone as "the" tuition fee — see `notes` for the real range every time.
 *
 * REAL NEGATIVE RESULTS, recorded rather than silently skipped: UCL, University of Manchester,
 * and King's College London each confirmed to have NO single published international figure —
 * fees are programme-specific, exposed only through an interactive course-fee search tool with
 * no static table this pass's tooling could read cleanly. These are NOT gaps to guess at; left
 * genuinely unresolved. Their (separately confirmed) UK/Home fee IS written, since that figure
 * is a single national policy number every UK university publishes plainly.
 *
 * A REAL FINDING, out of scope for this script to act on: the two "London School of Economics"
 * rows in the spine (`cfd5cd77-...` and `cc117524-...`) share ONE `canonical_entity_id`
 * (`ba53a102-...`) — the entity-level merge already happened — but neither `universities.id` is
 * in the row-level `SUPERSESSIONS` map `lib/universities/canonical.ts` reads, so the explorer
 * still shows LSE as two separate cards. This script writes to the more complete of the two
 * rows (`cfd5cd77-...` — has `website_url`/`admissions_url`, `institution_type: "Public"`; the
 * other has neither and a bare "university" placeholder type) but does NOT add a supersession
 * entry itself — that needs the same ROR-cross-check discipline the other 28 merged pairs got,
 * not a decision made mid-way through unrelated tuition research. Flagged in the handoff doc.
 *
 * Usage:
 *   npm run acquire:university-statistics-uk                  # dry run
 *   npm run acquire:university-statistics-uk -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface UkTuitionEntry {
  /** GBP/year. */
  domestic?: number;
  /** GBP/year — [low, high] if a range was published, a single-element tuple if one flat rate. */
  international?: [number] | [number, number];
  sourceUrl: string;
  /** Free-text note on exactly what the figure covers — course bands, exclusions, caveats. */
  notes: string;
}

/** `universities.name` (exact, this spine) -> hand-verified UK tuition data. Every entry read
 * directly from the cited official page 2026-08-18 (or, where marked, cross-cited via search
 * snippets attributed to the official domain when the live page hid the figure behind a JS
 * accordion this pass's tooling couldn't expand — see the LSE entry). Never fuzzy-matched. */
const UK_TUITION: Record<string, UkTuitionEntry> = {
  "University of Oxford": {
    domestic: 9790,
    international: [37380, 62820],
    sourceUrl: "https://www.ox.ac.uk/admissions/undergraduate/fees-and-funding/course-fees",
    notes:
      "2026/27 entry. Home (govt fee cap): £9,790/year. Overseas: £37,380–£62,820/year, varies by course — clinical medicine is priced separately, above this range, and is excluded from it.",
  },
  "University of Cambridge": {
    international: [29052, 70554],
    sourceUrl: "https://www.undergraduate.study.cam.ac.uk/international-students/international-fees-and-costs",
    notes:
      "2026 entry. Overseas tuition across 5 published course groups: £29,052 (Group 1 — humanities/social sciences) to £70,554 (Group 5 — Medical and Veterinary Science). A separate annual College fee also applies on top of University tuition for overseas-fee-status students (Oxbridge collegiate system) — a distinct cost concept, not folded into this figure. Home fee not independently re-verified on this specific page this pass (Oxford/UCL both independently confirm the same £9,790 national cap for 2026/27, so very likely identical, but not written here since not directly checked for Cambridge specifically).",
  },
  // Keyed "University College London", NOT "UCL" — this spine has both as separate rows
  // (cf8adcbd-... "UCL" and 03c8faf1-... "University College London") sharing one
  // canonical_entity_id, already resolved in duplicate-supersessions.json: "University
  // College London" is the winner (7 vs 2 FK references), "UCL" the loser. Caught live: a
  // first version of this table used "UCL" and would have written real, carefully-verified
  // tuition data onto the superseded row — invisible everywhere, since getSupersededUniversityIds()
  // excludes it from every browse/search/detail surface. Exactly the "KFUPM/UCL mistake"
  // class this workstream was explicitly told to avoid, caught before --apply by cross-
  // checking the supersession registry rather than assuming a name match means the right row.
  "University College London": {
    domestic: 9790,
    sourceUrl: "https://www.ucl.ac.uk/study/student-finances/tuition-fees/fee-schedules/fee-schedules-2026-2027/undergraduate-fees-2026-2027",
    notes:
      "2026/27 entry. UK fee: £9,790/year (subject to parliamentary approval). International/Overseas fee: no single published figure — genuinely programme-specific, exposed only via an interactive per-course fee search tool with no static table; not guessed.",
  },
  "London School of Economics and Political Science": {
    domestic: 9790,
    international: [30700, 39900],
    sourceUrl: "https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-economics",
    notes:
      "2026/27 entry. Home fee £9,790 independently confirmed live on this page. Overseas range £30,700 (Actuarial Science) – £39,900 (BSc Economics) — individual course figures cross-cited via search results attributed to lse.ac.uk / info.lse.ac.uk pages; the £39,900 Economics figure specifically was not independently re-rendered live (fee panel sits behind a JS accordion this pass's tooling didn't expand) — medium confidence, flagged via data_quality_flag.",
  },
  "The University of Edinburgh": {
    domestic: 9790,
    international: [29600, 38900],
    sourceUrl: "https://registryservices.ed.ac.uk/tuition-fees/find/undergraduate/2026-2027/full-time-new-students",
    notes:
      "2026/27 entry, from a real per-programme table (633 rows) directly on the page — high confidence. Rest-of-UK (RUK) rate £9,790/year, written as `domestic` here (matches the England/Wales national cap). Scotland-domiciled students are charged a separate, lower nominal rate (£1,820/year), typically covered in full by the Student Awards Agency Scotland (SAAS) for eligible students — a distinct fee-status category, not written as a separate metric this pass. International: £29,600 (most Arts/Business/Humanities programmes) to £38,900 (Sciences, Edinburgh College of Art); BMedSci-adjacent programmes commonly £37,500, within this range.",
  },
  "The University of Manchester": {
    domestic: 9790,
    sourceUrl: "https://www.studentsupport.manchester.ac.uk/finances/tuition-fees/fee-amounts/standard-tuition-fees/",
    notes:
      "2026/27 entry. UK fee: £9,790/year (subject to parliamentary approval). International fee: no single published figure — genuinely programme-specific, exposed only via a tuition fee search tool with no static table; not guessed. (One school-specific, not university-wide, figure surfaced during research: Alliance Manchester Business School UG international £33,100 — not written here since it isn't representative of the whole institution.)",
  },
  "King's College London": {
    domestic: 9790,
    sourceUrl: "https://www.kcl.ac.uk/study/undergraduate/fees-and-funding/tuition-fees",
    notes:
      "2026/27 entry. UK fee: £9,790/year, independently confirmed live on this page. International fee: no single published figure — genuinely programme-specific, exposed only via the online course finder; not guessed.",
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

  const { data: ukUnis, error } = await admin.from("universities").select("id, name").eq("country", "United Kingdom").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${(ukUnis ?? []).length} UK universities in the spine; ${Object.keys(UK_TUITION).length} hand-verified entries in this pilot batch.`);

  type ToWrite = { universityId: string; universityName: string; metricCode: string; valueNumeric: number; precisionState: string; dataQualityFlag: string };
  const toWrite: ToWrite[] = [];
  let noEntry = 0;

  for (const uni of ukUnis ?? []) {
    const entry = UK_TUITION[uni.name];
    if (!entry) {
      noEntry++;
      continue;
    }
    const dataQualityFlag = uni.name.startsWith("London School") ? "current_search_cited" : "current";
    if (entry.domestic != null) {
      toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_domestic_annual", valueNumeric: entry.domestic, precisionState: "exact", dataQualityFlag: "current" });
    }
    if (entry.international) {
      const [low] = entry.international;
      toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_international_annual", valueNumeric: low, precisionState: "range", dataQualityFlag });
    }
  }

  console.log(`${toWrite.length} metric rows to write, ${noEntry} UK universities with no entry in this table (left unresolved, see file header for the two genuine "no single published figure" cases and the queued remainder).`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / ${w.metricCode} = £${w.valueNumeric} (${w.precisionState})`);
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const entry = UK_TUITION[w.universityName];
    const payload = {
      university_id: w.universityId,
      metric_code: w.metricCode,
      value_numeric: w.valueNumeric,
      unit: "GBP/year",
      stats_as_of: "2026/27 entry",
      scope: "undergraduate",
      precision_state: w.precisionState,
      source_url: entry.sourceUrl,
      source_type: "official_primary",
      verified_at: new Date().toISOString(),
      data_quality_flag: w.dataQualityFlag,
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
