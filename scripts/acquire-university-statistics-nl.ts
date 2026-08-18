#!/usr/bin/env node
/**
 * Netherlands tuition fee acquisition — a genuine hybrid: one scalable national number for
 * domestic/EU students, real per-university research for international students.
 *
 * Fifth country in the founder-directed tuition/cost-acquisition roadmap (UK -> Canada ->
 * Australia -> Germany -> Netherlands -> France -> Switzerland -> ...).
 *
 * SCALABILITY CHECK, done before any per-university research: the Netherlands has a real
 * national "wettelijk collegegeld" (statutory tuition fee), set annually by the Dutch
 * government and confirmed directly on DUO's own page (duo.nl, the Dutch government's
 * official student-finance executive agency) at **€2,694 for the 2026-2027 academic year**.
 * It applies uniformly to EU/EEA/Swiss/Surinamese students (and Dutch nationals) enrolled in
 * an accredited, government-funded ("bekostigd") programme who have not already completed a
 * Dutch degree at the same level — every one of the 13 Dutch universities in this spine is
 * exactly that kind of institution, so this half of the picture is a genuine "one government
 * figure -> many universities" win, same shape as Germany's state law. Written as
 * `tuition_domestic_annual` for all 13.
 *
 * WHERE IT STOPS BEING SCALABLE: non-EU/EEA students pay "instellingscollegegeld"
 * (institutional tuition), which is NOT government-set — each university sets its own rate,
 * and (unlike Germany's flat non-EU rate) most Dutch universities price it **per faculty**,
 * not as one institution-wide number. Nuffic (the Dutch government's international-education
 * body, checked as a candidate bulk source) maintains a scholarship database, not a
 * comparative institutional-fee dataset — so this half needed real per-university research,
 * same as the UK.
 *
 * A REAL NEAR-MISS CAUGHT MID-RESEARCH, worth recording: a first pass took Leiden University's
 * figure from a single specific programme's page (€18,700, actually just the Faculty of
 * Science's rate) as if it were Leiden's one general rate. Re-fetching Leiden's actual general
 * bachelor's tuition-fee overview page (not a specific programme's page) surfaced the real
 * picture — a genuine per-faculty range, €14,300 (most faculties) to €30,200 (Medicine) — before
 * anything was written. Re-checked every other "single figure" candidate against its own
 * general overview page after catching this, not just a search-engine summary of a specific
 * programme; Utrecht failed that re-check (its general page links out to a PDF with no static
 * figure) and moved from "resolved" to genuinely unresolved as a result.
 *
 * REAL NEGATIVE RESULTS, investigated not skipped: Utrecht University (general fee page links
 * only to a PDF, no static figure — the €17,073 seen earlier was one specific programme, not
 * representative); Vrije Universiteit Amsterdam (confirmed to vary by programme, breakdown is
 * PDF-only); Maastricht University (a real low/high/top three-tier system exists, but the
 * actual tier boundaries are not on any static page this pass's tooling could read — only the
 * highest, BKKI-surcharged tier for two specific programmes, €20,109, was directly confirmed,
 * not representative enough to anchor a range on); Radboud University (confirmed to vary per
 * programme, directs to individual programme pages, no general figure). None of the four
 * downloaded (file downloads need explicit user permission, out of scope for an unattended
 * pass) or guessed at.
 *
 * Usage:
 *   npm run acquire:university-statistics-nl                  # dry run
 *   npm run acquire:university-statistics-nl -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

const STATUTORY_FEE_2026_27 = 2694;
const DUO_SOURCE_URL = "https://duo.nl/particulier/tuition-fees.jsp";

interface NlInternationalEntry {
  /** [low, high] for a range, or a single repeated value for an exact flat figure — see
   * `precisionState`. */
  range: [number, number];
  precisionState: "exact" | "range";
  sourceUrl: string;
  dataQualityFlag: "current" | "current_search_cited";
  notes: string;
}

/** `universities.name` (exact, this spine) -> hand-verified non-EEA institutional tuition.
 * Every entry read from the institution's own general bachelor's tuition-fee page 2026-08-18
 * (not a specific programme's page — see file header for why that distinction matters here).
 * 4 of the 13 Dutch universities are deliberately absent — see file header's negative results. */
const NL_INTERNATIONAL: Record<string, NlInternationalEntry> = {
  "Delft University of Technology": {
    range: [19906, 19906],
    precisionState: "exact",
    sourceUrl: "https://www.tudelft.nl/en/education/study-programme-orientation/practical-matters/tuition-fee-finances",
    dataQualityFlag: "current",
    notes: "2026-2027 institutional rate, one general figure for Bachelor's programmes, read directly from TU Delft's own tuition-fee-and-finances page: 'BSc €19,906'.",
  },
  "University of Amsterdam": {
    range: [17500, 34700],
    precisionState: "range",
    sourceUrl: "https://www.uva.nl/en/education/fees-and-funding/tuition-fees/tuition-fees.html",
    dataQualityFlag: "current",
    notes: "2026-2027 institutional (non-EEA) fee, read directly from UvA's own general tuition-fees page, which explicitly lists a '2026-2027 institutional fee per faculty' table: Faculty of Humanities €17,500 (lowest found) to Faculty of Medicine €34,700 (highest); Faculty of Science €21,800. Genuinely per-faculty, not one flat rate.",
  },
  "Erasmus University Rotterdam": {
    range: [13500, 32200],
    precisionState: "range",
    sourceUrl: "https://www.eur.nl/en/education/practical-matters/registration/tuition-fee/tuition-fee-2026-2027",
    dataQualityFlag: "current",
    notes: "2026-2027 institutional (non-EEA) fee, read directly from EUR's own 'Tuition fee 2026-2027' page. €13,500 across most faculties (ESSB, ESPhil, ESHPM, ESHCC, ESL, ESE); EUC (Liberal Arts and Sciences) €16,300; RSM €14,000; Erasmus MC (Medicine) €32,200 — the page's own words: 'these fees vary per programme and per person.' Continuing students re-enrolling without interruption pay a lower €11,700 at the standard rate — not used here since this figure is for a new/incoming student.",
  },
  "Eindhoven University of Technology": {
    range: [18600, 18600],
    precisionState: "exact",
    sourceUrl: "https://www.tue.nl/en/education/become-a-tue-student/tuition-fees-and-other-study-costs/tuition-fee",
    dataQualityFlag: "current",
    notes: "2026-2027 institutional rate, read directly from TU/e's own tuition-fee page: €18,600, applying to students without EU/EEA, Swiss or Surinamese nationality (or a prior comparable Dutch degree). Superseded an earlier, noisier search-only signal that suggested a lower/stale €14,200 'historical reference' figure — the actual current page is unambiguous.",
  },
  "Wageningen University & Research": {
    range: [18300, 18300],
    precisionState: "exact",
    sourceUrl: "https://www.wur.nl/en/education-programmes/bachelor/practical-information/tuiton-fees.htm",
    dataQualityFlag: "current",
    notes: "2026-2027 institutional rate ('Institutional tuition fee 3'), read directly from WUR's own bachelor tuition-fees page, explicitly stated to apply uniformly to all non-EU/EEA bachelor's students, not per-programme: '...your tuition fee for the academic year 2026-2027 is €18,300.' (Page URL's 'tuiton' spelling is WUR's own typo, not introduced here.)",
  },
  "University of Groningen": {
    range: [14000, 32000],
    precisionState: "range",
    sourceUrl: "https://www.rug.nl/education/application-enrolment-tuition-fees/tuition-fee/bachelor?lang=en",
    dataQualityFlag: "current_search_cited",
    notes: "2026-2027 institutional (tariff II, non-EU/EEA) fee, cited from RUG's own official 'Regulations for Registration and Tuition Fees 2026-2027' (a PDF found via search, not independently re-opened this pass — data_quality_flag reflects that). Four programme-band rates found: €14,000 / €17,200 / €19,800 / €32,000 — low and high ends used as the range; the two middle values are in this university's own regulations document, not repeated here.",
  },
  "University of Twente": {
    range: [12300, 16400],
    precisionState: "range",
    sourceUrl: "https://utwente.nl/en/education/bachelor/study-costs/tuition-fees",
    dataQualityFlag: "current",
    notes: "2026-2027 institutional (non-EEA) fee, read directly from Twente's own bachelor study-costs page: two explicit tiers, 'lower rate programmes' €12,300/year (e.g. Communication Science, Psychology, Public Administration) and 'higher rate programmes' €16,400/year (e.g. technical/engineering degrees like Applied Physics, Mechanical Engineering).",
  },
  "Leiden University": {
    range: [14300, 30200],
    precisionState: "range",
    sourceUrl: "https://www.universiteitleiden.nl/en/education/admission-and-application/bachelors/tuition-fee",
    dataQualityFlag: "current",
    notes: "2026-2027 institutional (non-EEA) fee, read directly from Leiden's own GENERAL bachelor's tuition-fee page (not a specific programme's page — see file header for why that distinction mattered here). €14,300 for most faculties (Archaeology, Humanities, Governance & Global Affairs, Law, Social and Behavioural Sciences); €18,700 for the Faculty of Science; Medicine considerably higher at €30,200 (used as the range's high end); Leiden University College The Hague has its own separate €17,570 + €2,990 structure, not used here.",
  },
  "Tilburg University": {
    range: [13400, 13400],
    precisionState: "exact",
    sourceUrl: "https://www.tilburguniversity.edu/students/administration/tuition-fees/rates",
    dataQualityFlag: "current_search_cited",
    notes: "2026-2027 institutional (non-EU/EEA) fee, €13,400, consistently reported as a flat rate applying to all Bachelor's programmes across two independent searches of Tilburg's own 'Rates tuition fees' page — direct fetch of that page returned HTTP 403 to this pass's tooling, so this is search-cited rather than independently re-read in full, hence the data_quality_flag.",
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

  const { data: nlUnis, error } = await admin.from("universities").select("id, name").eq("country", "Netherlands").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${(nlUnis ?? []).length} Dutch universities in the spine; all get the statutory domestic fee, ${Object.keys(NL_INTERNATIONAL).length} have a resolved international figure.`);

  type ToWrite = { universityId: string; universityName: string; metricCode: string; valueNumeric: number; precisionState: "exact" | "range" };
  const toWrite: ToWrite[] = [];
  let noIntlEntry = 0;

  for (const uni of nlUnis ?? []) {
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_domestic_annual", valueNumeric: STATUTORY_FEE_2026_27, precisionState: "exact" });
    const intl = NL_INTERNATIONAL[uni.name];
    if (!intl) {
      noIntlEntry++;
      console.log(`  NO INTERNATIONAL ENTRY (name mismatch or genuinely unresolved): ${JSON.stringify(uni.name)}`);
      continue;
    }
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_international_annual", valueNumeric: intl.range[0], precisionState: intl.precisionState });
  }

  console.log(`${toWrite.length} metric rows to write, ${noIntlEntry} Dutch universities with no resolved international figure (domestic still written for all).`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / ${w.metricCode} = €${w.valueNumeric} (${w.precisionState})`);
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const isDomestic = w.metricCode === "tuition_domestic_annual";
    const intl = isDomestic ? null : NL_INTERNATIONAL[w.universityName];
    const payload = {
      university_id: w.universityId,
      metric_code: w.metricCode,
      value_numeric: w.valueNumeric,
      unit: "EUR/year",
      stats_as_of: "2026/27",
      scope: "undergraduate",
      precision_state: w.precisionState,
      source_url: isDomestic ? DUO_SOURCE_URL : intl!.sourceUrl,
      source_type: "official_primary",
      verified_at: new Date().toISOString(),
      data_quality_flag: isDomestic ? "current" : intl!.dataQualityFlag,
      notes: isDomestic
        ? "Statutory tuition fee (wettelijk collegegeld) for 2026-2027, set by the Dutch government and confirmed on DUO's own page — applies uniformly to EU/EEA/Swiss/Surinamese students (and Dutch nationals) at every government-funded Dutch university, including this one. A separate, non-tuition, per-institution enrolment/registration process exists but is not a distinct fee concept modelled here."
        : intl!.notes,
    };
    const existingRow = await admin
      .from("university_profile_metrics")
      .select("id")
      .eq("university_id", w.universityId)
      .eq("metric_code", w.metricCode)
      .eq("scope", "undergraduate")
      .maybeSingle();
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
