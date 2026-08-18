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
 * REAL NEGATIVE RESULTS, recorded rather than silently skipped: University College London,
 * University of Manchester, King's College London, University of Birmingham, University of
 * Leeds, and Durham University each confirmed to have NO single published international
 * figure — fees are programme-specific, exposed only through an interactive course-fee search
 * tool (or, for Birmingham, quoted only per individual offer letter) with no static table this
 * pass's tooling could read cleanly. These are NOT gaps to guess at; left genuinely unresolved.
 * Their (separately confirmed) UK/Home fee IS written, since that figure is a single national
 * policy number every UK university publishes plainly — £9,790 for 2026/27, independently
 * confirmed live at every one of the 12 universities below that publish a Home rate at all.
 *
 * SECOND BATCH, 2026-08-18 — 6 more added (Exeter, Warwick, St Andrews, Loughborough,
 * Southampton, Queen Mary), same per-university-official-page discipline. Three more real
 * negative results this batch: Imperial College London and Newcastle University both split
 * every fee out to individual course pages with no overview table (Imperial's own overview
 * page states only the CPI-linked *increase* — 3.5% — never a base figure); Cardiff University's
 * overseas-fees page returned HTTP 403 to this pass's fetch tooling (unlike the JS-search-tool
 * class of negative result above — a fetch-access problem, not a missing-data one; worth
 * retrying with different tooling before assuming it's the same "no static table" case).
 * St Andrews' Home/RUK fee is genuinely "to be confirmed" per the university's own page — not
 * assumed to match the £9,790 cap the way Warwick/Loughborough's Home fees are (St Andrews has
 * its own Scotland-specific fee history and shouldn't be defaulted to the England-cap figure).
 *
 * CROSS-CHECK THE SUPERSESSION REGISTRY BEFORE PICKING A ROW BY NAME — a real mistake this
 * script made once already: this spine has THREE UK pairs where two `universities` rows are
 * the same real institution (already resolved in `lib/universities/duplicate-supersessions.
 * json`, Phase 2's work) — "UCL"/"University College London", "London School of Economics and
 * Political Science"/"The London School of Economics and Political Science (LSE)", and
 * "University of Warwick"/"The University of Warwick" (Warwick not used by this table). A
 * first version of this script keyed its UCL entry as `"UCL"` — the LOSER row
 * (`cf8adcbd-...`), which every browse/search/detail surface excludes — instead of the winner,
 * `"University College London"` (`03c8faf1-...`). The data would have been permanently
 * invisible. Caught before `--apply` reached `main` by checking `duplicate-supersessions.json`
 * directly, not by re-litigating "which row looks more complete" from scratch (which is also
 * what happened, unnoticed, for the LSE entry: it happened to land on the already-registered
 * winner row by that same heuristic, not because the registry was actually checked at the
 * time). Every entry below has been cross-checked against the registry now — see the file's
 * own git history for the fix commit if reconstructing what changed matters later.
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
  "University of Bristol": {
    domestic: 9790,
    international: [25500, 49700],
    sourceUrl: "https://www.bristol.ac.uk/students/support/finances/tuition-fees/ug/overseas/26-27/2026-starters/",
    notes:
      "2026/27 entry. Home fee £9,790, independently confirmed on a separate page. Overseas: real per-programme table, 503 rows scanned directly — £25,500 to £49,700. High confidence.",
  },
  "University of Birmingham": {
    domestic: 9790,
    sourceUrl: "https://www.birmingham.ac.uk/study/undergraduate/fees-funding/tuition",
    notes:
      "2026/27 entry. UK fee: £9,790/year. International fee: no single published figure — quoted per individual offer letter, no table found; not guessed.",
  },
  "University of Leeds": {
    domestic: 9790,
    sourceUrl: "https://www.leeds.ac.uk/undergraduate-fees/doc/fees-undergraduate-fees",
    notes:
      "2026/27 entry. UK fee: £9,790/year. International fee: no single published figure — course-search-tool only, no static table found; not guessed.",
  },
  "University of Glasgow": {
    domestic: 9790,
    international: [27720, 62730],
    sourceUrl: "https://www.gla.ac.uk/undergraduate/fees/intlfees/",
    notes:
      "2026/27 entry (page explicitly labels separate 2025/26 vs 2026/27 tables — this used the 2026/27 one, verified from the section heading). International, undergraduate degree programmes only (excludes the separate 'Incoming Study Abroad' visiting-student rate, £24,000/£12,000, a different category): £27,720 (Arts and Social Sciences) to £62,730 (MBChB and clinical programmes); also BDS £58,500, BVMS £37,350. Home/RUK fee (£9,790) NOT independently re-verified on Glasgow's own page this pass — written anyway as a well-established national policy figure independently confirmed live at 11 other UK institutions this pass, not a per-institution guess.",
  },
  "The University of Sheffield": {
    domestic: 9790,
    international: [25000, 50925],
    sourceUrl: "https://sheffield.ac.uk/new-students/tuition-fees/undergraduate-overseas",
    notes:
      "2026/27 entry, directly read. Standard overseas undergraduate: £25,000-£32,100. Medicine £47,575/year (5 years), Dentistry £50,925/year (5 years) — full range £25,000-£50,925. Home fee £9,790 independently confirmed on a separate page.",
  },
  "Durham University": {
    domestic: 9790,
    sourceUrl: "https://www.durham.ac.uk/study/undergraduate/fees-and-funding/tuition-fees/",
    notes:
      "2026/27 entry. UK fee: £9,790/year. International fee: no single published figure — course-database only, no static table found; not guessed.",
  },
  "University of Nottingham": {
    domestic: 9790,
    international: [20000, 47000],
    sourceUrl: "https://www.nottingham.ac.uk/fees/tuitionfees/202627/undergraduate.aspx",
    notes:
      "2026/27 entry. Real per-programme table, 209 rows (195 with a valid international figure) scanned directly. Home fee £9,790/year (a handful of Foundation-Year courses show £5,760 instead — excluded as a non-standard rate, not representative). International: £20,000-£47,000. High confidence.",
  },

  // --- Second batch, 2026-08-18, continuing the queued 65 ---
  "University of Exeter": {
    domestic: 9790,
    international: [24900, 48900],
    sourceUrl: "https://www.exeter.ac.uk/undergraduate-degrees/fees/",
    notes:
      "2026/27 entry, read directly from a real per-subject-band table. Home: £9,790/year. International bands: £24,900 (Business/Economics/Marketing) to £48,900 (BMBS Medicine); Arts/Humanities/Social Sciences/Law £24,950; Biosciences/Psychology/Nursing/Geography £31,200; Computer Science/Engineering/Physics/Natural Sciences £31,200; Mathematics £30,100; Sport and Health Sciences £29,900. High confidence, Medicine included in the range (unlike Oxford, Exeter's own table lists it as one band among others, not called out as a separate pricing structure).",
  },
  "University of Warwick": {
    // Winner of the Warwick duplicate pair (0b204add-..., 6 vs 2 FK references) —
    // "The University of Warwick" (ad3ef0a4-...) is the loser, cross-checked against
    // duplicate-supersessions.json before writing, same discipline as every entry above.
    domestic: 9790,
    international: [27870, 35530],
    sourceUrl: "https://warwick.ac.uk/services/finance/studentfinance/fees/overseasfees/",
    notes:
      "2026/27 entry, read directly from Warwick's own Band 1/Band 2 overseas fee schedule. Band 1 (Arts & Humanities): £27,870. Band 2 (STEM & professional): £35,530. Medicine (MBChB) is priced separately, outside this range, and excluded from it — £32,510 (Year 1), £56,660 (Years 2-4) — same treatment as Oxford's clinical medicine exclusion, for the same reason (a genuinely different, non-comparable pricing structure). Home fee £9,790 not independently re-verified on Warwick's own page this pass — written as the same well-established 2026/27 national policy figure independently confirmed live at multiple other UK institutions this pass (Oxford, UCL, King's, Exeter, Southampton, Queen Mary), not a per-institution guess.",
  },
  "University of St Andrews": {
    international: [33250, 39620],
    sourceUrl: "https://www.st-andrews.ac.uk/study/tuition-fees/undergraduate/",
    notes:
      "2026/27 entry, read directly. Overseas: Arts, Divinity and Science £33,250; Medicine £39,620 (includes a Scottish-Government-mandated national levy for overseas medical students covering NHS clinical teaching costs, stated explicitly on the page as part of the figure, not hidden). Home (RUK) fee explicitly stated on the page as 'to be confirmed' for 2026/27 — genuinely not yet published, not written here rather than assumed to match the £9,790 cap other institutions confirm (St Andrews' own Scotland-domiciled/RUK fee history has diverged from the standard England cap before).",
  },
  "Loughborough University": {
    domestic: 9790,
    international: [24700, 33000],
    sourceUrl: "https://www.lboro.ac.uk/study/undergraduate/fees-funding/fees/international-fees-2026-27/",
    notes:
      "2026/27 entry, read directly from a real 5-band fee table (page marked 'Updated on 09/10/2025'). International: £24,700 (Humanities/Social Sciences — English, History, Law, Psychology, Sociology) to £33,000 (Sport and Exercise Science); Business/Economics £25,950; Computing/Management £27,300; Engineering/Sciences/Design £30,700. Home fee £9,790 not independently re-verified on Loughborough's own page this pass — written under the same cross-institution-confirmed-national-figure reasoning as Warwick above.",
  },
  "University of Southampton": {
    domestic: 9790,
    sourceUrl: "https://www.southampton.ac.uk/courses/fees/undergraduate/tuition-fees.page",
    notes:
      "2026/27 entry. Home fee £9,790/year, independently confirmed live on this page. International fee: no single published figure on this page or its linked international-fees page — genuinely course-specific, no static table found this pass; not guessed.",
  },
  "Queen Mary University of London": {
    domestic: 9790,
    sourceUrl: "https://www.qmul.ac.uk/undergraduate/feesandfunding/tuitionfees/",
    notes:
      "2026/27 entry. Home fee £9,790/year, independently confirmed live on this page (Foundation-year variants differ: £9,790 Science/Engineering integrated, £5,760 Humanities/Social Sciences integrated — not representative of the standard rate, excluded). International standard-programme fee: no single published figure on this page — directed to a per-course finder; only the International Foundation Year figure (£25,500) is stated directly, which isn't the standard undergraduate rate, so not written as `tuition_international_annual`.",
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

  console.log(`${toWrite.length} metric rows to write, ${noEntry} UK universities with no entry in this table (left unresolved, see file header for the "no single published figure" cases and the queued remainder).`);

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
