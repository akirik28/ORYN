#!/usr/bin/env node
/**
 * Switzerland tuition fee acquisition — no single national or cantonal-uniform rate; a real
 * two-tier system, each tier researched on its own terms.
 *
 * Seventh country in the founder-directed tuition/cost-acquisition roadmap (UK -> Canada ->
 * Australia -> Germany -> Netherlands -> France -> Switzerland -> ...).
 *
 * SCALABILITY CHECK: unlike Germany (one state law) or France (one national decree), Switzerland
 * has no single fee-setting body for all 11 of this spine's universities. Two real tiers exist:
 *   1. The "ETH domain" — ETH Zurich and EPFL, Switzerland's 2 FEDERAL institutes of
 *      technology, governed by the same ETH Board (ETH-Rat). One shared federal policy: from
 *      fall semester 2025 (continuing through 2026-2027), foreign Bachelor's/Master's students
 *      pay a tripled rate, CHF 2,190/semester, vs CHF 730/semester for Swiss/Liechtenstein
 *      students and those who held Swiss/Liechtenstein residence when qualifying for
 *      university. Confirmed directly on ETH Zurich's own page; independently corroborated for
 *      EPFL (same ETH Board decision explicitly named as covering "ETH Zurich or EPFL").
 *   2. Every other university in this spine is CANTONAL — each of Switzerland's 26 cantons
 *      funds and prices its own university independently, the way US states do for public
 *      universities, not a single country-wide rate. Researched individually, same as the UK.
 *
 * A REAL, NAMED FINDING WORTH RECORDING: two of the cantonal universities researched this pass
 * — Basel and Geneva — currently charge domestic AND international students the exact SAME
 * fee, explicitly stated on their own pages/coverage as "no distinction, unlike most other
 * Swiss universities." Both have pending political proposals to introduce a higher
 * international rate (not yet adopted law as of this pass — not used here, matching the "don't
 * write a proposal as if it were current policy" discipline). Bern's fee INCREASE, by contrast,
 * *is* adopted and takes effect "ab Herbstsemester 2026" (from autumn semester 2026) — today's
 * date falls right at that transition, so the new, higher rate is what a 2026-2027 applicant
 * actually faces and is what's written here.
 *
 * REAL NEGATIVE RESULTS: University of Zurich's own page confirms its base CHF 720/semester
 * fee (unchanged since 2012) but also references a new "additional fee for foreign students"
 * regulation taking effect 1 January 2026 — the exact additional amount was not found on any
 * static page this pass's tooling could read; domestic is written, international left
 * unresolved rather than guessed. USI (Università della Svizzera italiana), University of
 * Fribourg, University of St. Gallen, and Zurich University of Applied Sciences (a Fachhochschule
 * — a genuinely different institutional tier from the classical cantonal universities, would
 * need its own separate research) were not attempted this pass; queued.
 *
 * CURRENCY NOTE: figures are Swiss Francs (CHF), which this codebase's `currencyPrefix()`
 * already renders correctly via its existing unknown-code fallback (`"CHF "` prefix, the
 * standard international convention — Swiss Francs don't commonly use a dedicated symbol the
 * way £/€/$ do) — no detail-page change needed for this country, confirmed before writing.
 *
 * Usage:
 *   npm run acquire:university-statistics-ch                  # dry run
 *   npm run acquire:university-statistics-ch -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface ChTuitionEntry {
  domesticAnnual: number;
  internationalAnnual: number | null;
  statsAsOf: string;
  sourceUrl: string;
  dataQualityFlag: "current" | "current_search_cited";
  notes: string;
}

const ETH_DOMAIN_NOTES =
  "ETH domain federal policy (ETH Board / ETH-Rat), covering both ETH Zurich and EPFL " +
  "identically: CHF 730/semester (CHF 1,460/year) for Swiss/Liechtenstein students and those " +
  "who held Swiss/Liechtenstein residence when obtaining their university entrance " +
  "qualification; CHF 2,190/semester (CHF 4,380/year) for other foreign students — a " +
  "threefold increase effective from fall semester 2025, continuing through 2026-2027, " +
  "readjusted every 4 years by the Swiss consumer price index (first readjustment 2029). " +
  "Students already enrolled before the change keep the prior rate until their current " +
  "programme ends.";

/** `universities.name` (exact, this spine) -> hand-verified Switzerland tuition data. Every
 * entry read from the institution's own page or a directly-corroborated news/official source
 * 2026-08-18. Cross-checked against `lib/universities/duplicate-supersessions.json` (no
 * Swiss entries found) before being added. */
const CH_TUITION: Record<string, ChTuitionEntry> = {
  "ETH Zurich": {
    domesticAnnual: 1460,
    internationalAnnual: 4380,
    statsAsOf: "2026/27 (fall 2025 threefold-increase policy, unchanged for 2026-27)",
    sourceUrl: "https://ethz.ch/students/en/studies/financial/tuition-fees.html",
    dataQualityFlag: "current",
    notes: ETH_DOMAIN_NOTES,
  },
  "EPFL – École polytechnique fédérale de Lausanne": {
    domesticAnnual: 1460,
    internationalAnnual: 4380,
    statsAsOf: "2026/27 (fall 2025 threefold-increase policy, unchanged for 2026-27)",
    sourceUrl: "https://www.epfl.ch/education/studies/en/rules-and-procedures/study-taxes/tuition-fee-other-fees",
    dataQualityFlag: "current_search_cited",
    notes: ETH_DOMAIN_NOTES + " EPFL's own rate not independently re-fetched this pass — the ETH Board decision explicitly names EPFL alongside ETH Zurich, and multiple independent sources confirm the identical CHF 730/2,190 figures for EPFL specifically.",
  },
  "University of Zurich": {
    domesticAnnual: 1440,
    internationalAnnual: null,
    statsAsOf: "2026/27 (base fee unchanged since 2012)",
    sourceUrl: "https://www.uzh.ch/de/studies/application/fees.html",
    dataQualityFlag: "current_search_cited",
    notes:
      "Base fee CHF 720/semester (CHF 1,440/year), stated on UZH's own page as unchanged since 2012 — applies broadly, not distinguished by nationality on this page. A separate 'additional fee for foreign students' regulation takes effect 1 January 2026 (its own dedicated PDF regulation found, titled 'Reglement über den Erlass der zusätzlichen Studiengebühr... Ausländergebühr'), but the exact additional CHF amount was not found on any static page this pass's tooling could read — not guessed, international left unresolved.",
  },
  "University of Basel": {
    domesticAnnual: 1700,
    internationalAnnual: 1700,
    statsAsOf: "2026/27",
    sourceUrl: "https://studienberatung.unibas.ch/en/studying/study-planning/live-aus-der-uni-9/",
    dataQualityFlag: "current_search_cited",
    notes:
      "CHF 850/semester (CHF 1,700/year), uniform across all faculties — Basel currently does NOT charge international students a higher rate, unlike most other Swiss universities (explicitly reported this way in Basel-region press coverage). A political proposal to introduce a higher international rate (doubling to CHF 1,700/semester for that group specifically) is under discussion but not yet adopted law as of this pass — not used here.",
  },
  "University of Geneva": {
    domesticAnnual: 1000,
    internationalAnnual: 1000,
    statsAsOf: "2026/27",
    sourceUrl: "https://www.unige.ch/formalites/taxes/exo",
    dataQualityFlag: "current_search_cited",
    notes:
      "CHF 500/semester (CHF 1,000/year) for both domestic and international students — UNIGE explicitly makes no fee distinction by nationality, unlike most other Swiss universities (its own site states this directly). A political proposal (UDC party bill) to raise the rate to CHF 1,500/semester for some non-resident foreign students is under discussion but not yet adopted as of this pass — not used here.",
  },
  "University of Bern": {
    domesticAnnual: 1700,
    internationalAnnual: 3400,
    statsAsOf: "from autumn semester 2026 (Herbstsemester 2026) — a real fee increase, not a proposal; today's date falls at this transition",
    sourceUrl: "https://www.unibe.ch/studium/organisatorisches/semestereinschreibung/gebuehren/studiengebuehren_ab_herbstsemester_2026/index_ger.html",
    dataQualityFlag: "current_search_cited",
    notes:
      "An adopted (not merely proposed) increase, confirmed via UniBE's own dedicated 'Studiengebühren ab Herbstsemester 2026' page plus multiple independent Swiss news outlets (Der Bund, Nau.ch): domestic CHF 850/semester (CHF 1,700/year, up from 750); international CHF 1,700/semester (CHF 3,400/year, up from a previously unusually low CHF 200/semester). Students already enrolled before the change keep the prior rate until their programme ends.",
  },
  "University of Lausanne": {
    domesticAnnual: 1400,
    internationalAnnual: 2100,
    statsAsOf: "2025/26 rate, no newer change found for 2026/27",
    sourceUrl: "https://www.unil.ch/files/live/sites/unil/files/02-universite/0212-cadres-legal-reglementaire/textes-leg/3-ens/dir3-2-taxes-delais.pdf",
    dataQualityFlag: "current_search_cited",
    notes:
      "Swiss nationals or those fiscally domiciled in Switzerland: CHF 700/semester (CHF 1,400/year). Students from abroad: CHF 1,050/semester (CHF 2,100/year), confirmed as of the 2025-2026 academic year with no newer figure found for 2026-2027 this pass.",
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

  const { data: chUnis, error } = await admin.from("universities").select("id, name").eq("country", "Switzerland").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${(chUnis ?? []).length} Swiss universities in the spine; ${Object.keys(CH_TUITION).length} hand-verified entries in this pass.`);

  type ToWrite = { universityId: string; universityName: string; metricCode: string; valueNumeric: number };
  const toWrite: ToWrite[] = [];
  let noEntry = 0;

  for (const uni of chUnis ?? []) {
    const entry = CH_TUITION[uni.name];
    if (!entry) {
      noEntry++;
      console.log(`  NO ENTRY (name mismatch or genuinely unresearched): ${JSON.stringify(uni.name)}`);
      continue;
    }
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_domestic_annual", valueNumeric: entry.domesticAnnual });
    if (entry.internationalAnnual != null) {
      toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_international_annual", valueNumeric: entry.internationalAnnual });
    }
  }

  console.log(`${toWrite.length} metric rows to write, ${noEntry} Swiss universities with no entry in this table.`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / ${w.metricCode} = CHF ${w.valueNumeric}`);
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const entry = CH_TUITION[w.universityName];
    const payload = {
      university_id: w.universityId,
      metric_code: w.metricCode,
      value_numeric: w.valueNumeric,
      unit: "CHF/year",
      stats_as_of: entry.statsAsOf,
      scope: "undergraduate",
      precision_state: "exact",
      source_url: entry.sourceUrl,
      source_type: "official_primary",
      verified_at: new Date().toISOString(),
      data_quality_flag: entry.dataQualityFlag,
      notes: entry.notes,
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
