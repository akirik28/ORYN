#!/usr/bin/env node
/**
 * Germany tuition fee acquisition — a real, scalable state-law pattern, not per-university
 * scraping.
 *
 * Fourth country in the founder-directed tuition/cost-acquisition roadmap (UK -> Canada ->
 * Australia -> Germany -> Netherlands -> France -> Switzerland -> ...).
 *
 * SCALABILITY CHECK, done before any per-university research, per the founder's own
 * instruction to look for a "country adapter -> many universities" pattern before falling back
 * to one-off manual work: Destatis (Germany's federal statistics office, the obvious candidate
 * having already ruled out StatCan for Canada) publishes rich per-institution STUDENT COUNT
 * data ("Studierende an Hochschulen") but genuinely no per-institution FEE dataset — because,
 * unlike the UK/Canada/Australia, tuition in Germany is not an institutional decision. It is
 * set by STATE LAW. Baden-Württemberg is the only one of Germany's 16 states that charges
 * non-EU/EEA international students tuition: a flat €1,500/semester (€3,000/year) for
 * bachelor's, consecutive master's, and state-examination programmes, in effect since winter
 * semester 2017/18 under the state's Landeshochschulgebührengesetz (Higher Education Fees
 * Act). Every other state's public universities charge $0 real tuition to domestic AND
 * international undergraduates alike — only a modest, per-institution administrative
 * "Semesterbeitrag" (typically ~€150-350/semester: student-union dues, often bundled with a
 * public-transport semester ticket), a genuinely different concept from tuition and not
 * itemised here (see below). This is a real "one law -> many universities" case: confirmed
 * directly, reading each institution's own official fee page, at 5 of the 9 Baden-Württemberg
 * universities in this spine (Heidelberg, Stuttgart, Freiburg, Konstanz, Ulm all independently
 * state the identical €1,500/semester figure and cite the same state law); the remaining 4
 * (Tübingen, Mannheim, Hohenheim, KIT) each carry their own dedicated official fee page at the
 * same statutory rate — URL confirmed live, exact figure not independently re-quoted from that
 * specific page this pass, so flagged with a different `data_quality_flag` below rather than
 * silently treated the same as the 5 directly read.
 *
 * TWO PRIVATE UNIVERSITIES IN THE GERMANY SPINE ARE EXPLICITLY EXCLUDED from the state-law
 * rule and researched individually instead, since a private university's tuition is a real
 * per-institution business decision, not a state policy: Constructor University (Bremen) and
 * Frankfurt School of Finance & Management. See their entries below.
 *
 * NOT MODELLED THIS PASS, same "don't approximate a structurally different concept" discipline
 * as Australia's Commonwealth Supported Place exclusion: the per-institution Semesterbeitrag
 * itself (a real fee every student pays, but administrative rather than tuition — e.g.
 * Stuttgart's own page states €184/semester, Freiburg's €190/semester) is named in the shared
 * notes text with its typical range, not written as a precise per-institution `value_numeric`
 * — that would need 47 individual confirmations for a few hundred euros of difference, out of
 * proportion to what a student comparing "how much will this cost me" actually needs.
 *
 * WHY `precision_state: "exact"` for every row here, unlike the UK/Canada/Australia ranges:
 * every figure in this file is a single flat number (a state-law amount or a private
 * university's flat headline tuition), never a published band — there is no "low end" to
 * anchor on, so `precision_state: "range"` would misrepresent these as something they are not.
 *
 * Usage:
 *   npm run acquire:university-statistics-de                  # dry run
 *   npm run acquire:university-statistics-de -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface DeTuitionEntry {
  internationalAnnual: number;
  domesticAnnual: number;
  statsAsOf: string;
  sourceUrl: string;
  sourceType: "official_primary" | "web_search";
  dataQualityFlag: "current" | "current_search_cited";
  notes: string;
}

const BW_LAW_NOTES =
  "Baden-Württemberg's Landeshochschulgebührengesetz (Higher Education Fees Act) charges " +
  "non-EU/EEA international students €1,500/semester (€3,000/year) for bachelor's, " +
  "consecutive master's, and state-examination programmes, in effect since WS2017/18. EU/EEA " +
  "citizens and 'Bildungsinländer' (e.g. non-EU citizens with a German Abitur) are exempt and " +
  "pay the same $0 as domestic students. A separate, much smaller administrative " +
  "Semesterbeitrag (typically €150-350/semester at Baden-Württemberg institutions — this " +
  "university's own page states its own exact figure) applies to every student regardless of " +
  "nationality — a genuinely different, non-tuition concept, not itemised here.";

const NON_BW_POLICY_NOTES =
  "No German state other than Baden-Württemberg charges tuition to undergraduates, domestic " +
  "or international — confirmed via this institution's own domain plus consistent " +
  "cross-source corroboration of the national policy picture, not a per-institution fee page " +
  "individually re-read this pass (the fact being verified is a state-level policy, not an " +
  "institutional choice). A separate, much smaller administrative Semesterbeitrag (typically " +
  "€150-350/semester nationally: student-union dues, often bundled with a public-transport " +
  "semester ticket) applies to every student regardless of nationality — a genuinely " +
  "different, non-tuition concept, not itemised here.";

/** The 9 Baden-Württemberg public universities in this spine. Fee set by state law, not by
 * each institution independently — see file header. `confirmedLive: true` = this pass read
 * the exact €1,500/semester figure directly stated on the institution's own page; `false` =
 * the institution's own dedicated fee-page URL was confirmed to exist and to be about this
 * exact topic, but the figure itself was not independently re-quoted from that specific page
 * this pass (relying on the uniform statutory rate instead). */
const BW_UNIVERSITIES: Record<string, { sourceUrl: string; confirmedLive: boolean }> = {
  "Universität Heidelberg": {
    sourceUrl:
      "https://www.uni-heidelberg.de/en/study/management-of-studies/semester-fees/tuition-fees-for-international-students",
    confirmedLive: true,
  },
  "Universität Stuttgart": {
    sourceUrl: "https://www.student.uni-stuttgart.de/studienorganisation/formalitaeten/gebuehren-und-beitraege/studiengebuehren/",
    confirmedLive: true,
  },
  "Albert-Ludwigs-Universitaet Freiburg": {
    sourceUrl: "https://uni-freiburg.de/en/studies/during-your-studies/tuition-fees-international-students/",
    confirmedLive: true,
  },
  "Universität Konstanz": {
    sourceUrl:
      "https://www.uni-konstanz.de/en/study/study-essentials/finances/tuition-fees/fees-for-international-students-and-for-second-degree-studies/",
    confirmedLive: true,
  },
  "Ulm University": {
    sourceUrl: "https://www.uni-ulm.de/en/study/organisation/tuition-fees/",
    confirmedLive: true,
  },
  "Eberhard Karls Universität Tübingen": {
    sourceUrl: "https://uni-tuebingen.de/en/study/organizing-your-studies/fees/tuition-fees/",
    confirmedLive: false,
  },
  "Universität Mannheim": {
    sourceUrl: "https://www.uni-mannheim.de/en/academics/during-your-studies/organizing-your-studies/fees/tuition-fees-for-international-students/",
    confirmedLive: false,
  },
  "University of Hohenheim": {
    sourceUrl: "https://www.uni-hohenheim.de/en/tuition-fees",
    confirmedLive: false,
  },
  "KIT, Karlsruhe Institute of Technology": {
    sourceUrl: "https://www.intl.kit.edu/istudies/12606.php",
    confirmedLive: false,
  },
};

/** Every other public German university in this spine: no state charges tuition outside
 * Baden-Württemberg, so both figures are a verified $0 — see file header and
 * `NON_BW_POLICY_NOTES`. Two genuinely private universities (Constructor University, Frankfurt
 * School of Finance & Management) are deliberately NOT in this list — see their own entries
 * below. Names copied exact-byte from a live spine query; note the double space in "Universität
 *  Leipzig" is real, not a typo — confirmed via `JSON.stringify` before writing this list. */
const NON_BW_PUBLIC_UNIVERSITIES: string[] = [
  "Technical University of Munich",
  "Ludwig-Maximilians-Universität München",
  "Freie Universitaet Berlin",
  "RWTH Aachen University",
  "Humboldt-Universität zu Berlin",
  "Technische Universität Berlin (TU Berlin)",
  "Technische Universität Dresden",
  "Rheinische Friedrich-Wilhelms-Universität Bonn",
  "Universität Hamburg",
  "Friedrich-Alexander-Universität Erlangen-Nürnberg",
  "Technical University of Darmstadt",
  "University of Göttingen",
  "University of Cologne",
  "University of Münster",
  "Goethe-University Frankfurt am Main",
  "Ruhr-Universität Bochum",
  "Julius-Maximilians-Universität Würzburg",
  "Leibniz University Hannover",
  "University of Bayreuth",
  "Johannes Gutenberg Universität Mainz",
  "Universität Potsdam",
  "Justus-Liebig-University Giessen",
  "Universität  Leipzig",
  "Universität Jena",
  "Universität Bremen",
  "Saarland University",
  "Technische Universität Bergakademie Freiberg",
  "Christian-Albrechts-University zu Kiel",
  "Otto-von-Guericke-Universität Magdeburg",
  "TU Dortmund University",
  "Universität Regensburg",
  "Martin-Luther-Universität Halle-Wittenberg",
  "Philipps-Universität Marburg",
  "Technische Universität Braunschweig",
  "TUHH Hamburg University of Technology",
  "Universität Duisburg-Essen",
  "Universität Rostock",
  "University Duesseldorf",
];

/** The 2 genuinely private universities in the Germany spine — real per-institution tuition,
 * researched individually rather than assumed from the state-law pattern above. */
const PRIVATE_UNIVERSITIES: Record<string, DeTuitionEntry> = {
  "Constructor University": {
    internationalAnnual: 20000,
    domesticAnnual: 20000,
    statsAsOf: "2025-2026 Cost of Attendance fact sheet",
    sourceUrl: "https://constructor.university/sites/default/files/2024-12/2025-2026%20CU%20Fact%20Sheet_Bachelor_Cost%20of%20Attendance.pdf",
    sourceType: "official_primary",
    dataQualityFlag: "current_search_cited",
    notes:
      "Private university — the Baden-Württemberg state-law pattern above does not apply. Flat headline Bachelor tuition, €20,000/year, read from this institution's own hosted 'Cost of Attendance' fact sheet (found via a search snippet quoting the PDF's own text directly, not independently re-opened as a file this pass). Same figure appears stable across multiple academic years' fact sheets found in search (2023, 2024-25, 2025-26 editions each state €20,000 Tuition, only Room/Board varying) — a real, consistent figure, not a one-off. Same rate for domestic and international students; Constructor is private and not subject to the Baden-Württemberg international-student fee law (this is its own tuition, not a state surcharge). Scholarship reductions exist but are not modelled here — this is the sticker price.",
  },
  "Frankfurt School of Finance and Management": {
    internationalAnnual: 16400,
    domesticAnnual: 16400,
    statsAsOf: "Academic Year 2026/2027",
    sourceUrl: "https://www.frankfurt-school.de/cms/dam/jcr:5a373f8b-d6cf-4175-9681-7b36eb573471/COA.Website%202026_27.pdf",
    sourceType: "official_primary",
    dataQualityFlag: "current",
    notes:
      "Private university — the Baden-Württemberg state-law pattern above does not apply. Flat headline Bachelor of Science tuition, €16,400/year (€8,200/semester), read from this institution's own 'Academic Year 2026/2027: Cost Of Attendance — Bachelor of Science Programmes' document, hosted on frankfurt-school.de. Same rate for domestic and international students. Scholarship reductions (15/25/50/75/100%) exist but are not modelled here — this is the sticker price before aid.",
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

  const { data: deUnis, error } = await admin.from("universities").select("id, name").eq("country", "Germany").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const entryByName = new Map<string, DeTuitionEntry>();
  for (const [name, bw] of Object.entries(BW_UNIVERSITIES)) {
    entryByName.set(name, {
      internationalAnnual: 3000,
      domesticAnnual: 0,
      statsAsOf: "2026/27 (fee amount unchanged since introduction WS2017/18)",
      sourceUrl: bw.sourceUrl,
      sourceType: "official_primary",
      dataQualityFlag: bw.confirmedLive ? "current" : "current_search_cited",
      notes: BW_LAW_NOTES,
    });
  }
  for (const name of NON_BW_PUBLIC_UNIVERSITIES) {
    entryByName.set(name, {
      internationalAnnual: 0,
      domesticAnnual: 0,
      statsAsOf: "2026/27 (no state tuition law outside Baden-Württemberg)",
      sourceUrl: "https://www.studying-in-germany.org/what-does-it-cost-to-study-in-germany/",
      sourceType: "web_search",
      dataQualityFlag: "current_search_cited",
      notes: NON_BW_POLICY_NOTES,
    });
  }
  for (const [name, entry] of Object.entries(PRIVATE_UNIVERSITIES)) {
    entryByName.set(name, entry);
  }

  console.log(`${(deUnis ?? []).length} German universities in the spine; ${entryByName.size} entries in this pass (${Object.keys(BW_UNIVERSITIES).length} Baden-Württemberg + ${NON_BW_PUBLIC_UNIVERSITIES.length} other public + ${Object.keys(PRIVATE_UNIVERSITIES).length} private).`);

  type ToWrite = { universityId: string; universityName: string; metricCode: string; valueNumeric: number };
  const toWrite: ToWrite[] = [];
  let noEntry = 0;

  for (const uni of deUnis ?? []) {
    const entry = entryByName.get(uni.name);
    if (!entry) {
      noEntry++;
      console.log(`  NO ENTRY (name mismatch or genuinely unresearched): ${JSON.stringify(uni.name)}`);
      continue;
    }
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_domestic_annual", valueNumeric: entry.domesticAnnual });
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_international_annual", valueNumeric: entry.internationalAnnual });
  }

  console.log(`${toWrite.length} metric rows to write (2 per matched university), ${noEntry} German universities with no entry.`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / ${w.metricCode} = €${w.valueNumeric}`);
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const entry = entryByName.get(w.universityName);
    if (!entry) continue;
    const payload = {
      university_id: w.universityId,
      metric_code: w.metricCode,
      value_numeric: w.valueNumeric,
      unit: "EUR/year",
      stats_as_of: entry.statsAsOf,
      scope: "undergraduate",
      precision_state: "exact",
      source_url: entry.sourceUrl,
      source_type: entry.sourceType,
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
