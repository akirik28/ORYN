#!/usr/bin/env node
/**
 * Spain tuition fee acquisition — public tuition is set per-ECTS-credit, by REGION, not by
 * institution or by one national number.
 *
 * Ninth country in the founder-directed tuition/cost-acquisition roadmap, and the first picked
 * by the coverage report's ranking rather than a fixed list (UK -> Canada -> Australia ->
 * Germany -> Netherlands -> France -> Switzerland -> Italy -> Spain -> ...).
 *
 * SCALABILITY CHECK: ciencia.gob.es (flagged as a possible lead in an earlier pass's Canada
 * script comment, never verified) does not itself publish a tuition dataset — checked directly,
 * its Universidades section has no such page. The real pattern, found instead: Spanish public
 * university tuition is set by "precio público por crédito ECTS" (public price per ECTS
 * credit), fixed annually by DECREE of each of Spain's 17 autonomous regions (comunidades
 * autónomas) — not by the Spanish state, and not by each university independently. Every
 * public university within a region charges the SAME per-credit price. A standard Spanish
 * "Grado" (Bachelor's) is a nationally standardised 240 ECTS over 4 years — 60 ECTS/year, a
 * real government-mandated full-time course load, not a guess — so `credit_price × 60` is a
 * legitimate, citable annual estimate for a first-year student on a typical course load, per
 * the founder's own explicit allowance for deriving an annual figure from "an explicit
 * official per-credit structure with a standard full-time credit load." Written as
 * `precision_state: "approximate"` (an existing allowed value in the check constraint — not
 * "exact," since no decree states this annual total directly for most regions, and not
 * "range," since this isn't a course-fee band the way UK/Canada/Australia figures are).
 *
 * TWO REGIONS RESOLVED THIS PASS, both confirmed CURRENT for 2026-2027 specifically — not an
 * older year silently reused, per the founder's own "verify by academic year" instruction:
 *   - Comunidad de Madrid: €18.46/credit, first enrolment, per DECRETO 43/2022 (still the
 *     governing decree for 2026-2027 fees per comunidad.madrid's own page). Applies to 5 public
 *     universities in this spine.
 *   - Catalunya: €17.69/credit, per DECRET 96/2026, de 16 de juny (a 2026-dated decree,
 *     explicitly for curs 2026-2027, confirmed independently on the Generalitat's own press
 *     release AND the University of Lleida's own page, both stating the identical figure and
 *     decree number). Catalunya has recently consolidated to ONE flat rate for all degree
 *     fields (no more per-field "experimentality" coefficient) — genuinely simpler than Madrid,
 *     which still varies by field; the Madrid figure used here is the base/lowest coefficient,
 *     same low-anchor convention as every course-fee range in this project. Applies to 5 public
 *     universities in this spine.
 *
 * A REGIONAL BONIFICATION FOUND, NOT MODELLED — worth recording since it changes what the
 * "sticker price" actually means: Andalucía's regional government subsidises 99% of the cost
 * of credits passed on first enrolment (a real, large discount programme), which is why
 * Andalucía was NOT written this pass even though a €12.62/credit figure was found — that
 * figure is real but only representative of the pre-bonification list price, and the 2025-26
 * source found was not confirmed to still hold for 2026-2027 specifically. Valencia
 * (Decret 122/2026 confirmed to exist, but no specific per-credit figure surfaced this pass)
 * and every other region were not attempted. 13 further public universities and all 6 private
 * universities in this spine's Spain list (Comillas, IE University, Universidad Europea,
 * Universitat Ramon Llull, Universitat Internacional de Catalunya, University of Navarra — none
 * subject to any regional public-price decree, each sets its own tuition independently) are
 * queued, not attempted.
 *
 * DOMESTIC/INTERNATIONAL: not clearly differentiated by either region's decree text found this
 * pass (unlike Germany/France/Netherlands/Switzerland, where a non-EU surcharge is explicit and
 * well-documented) — written as the same figure for both, with that gap stated plainly in notes
 * rather than guessed at.
 *
 * Usage:
 *   npm run acquire:university-statistics-es                  # dry run
 *   npm run acquire:university-statistics-es -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface EsRegionalEntry {
  creditPrice: number;
  sourceUrl: string;
  dataQualityFlag: "current" | "current_search_cited";
  notes: string;
}

const STANDARD_CREDITS_PER_YEAR = 60;

const MADRID: EsRegionalEntry = {
  creditPrice: 18.46,
  sourceUrl: "https://www.comunidad.madrid/educacion/precios-publicos-universitarios",
  dataQualityFlag: "current_search_cited",
  notes:
    "Comunidad de Madrid, DECRETO 43/2022, de 29 de junio — €18.46/ECTS credit, first enrolment ('primera matrícula'), Grado. Annual estimate = €18.46 × 60 ECTS (Spain's standard full-time Grado course load) = €1,107.60, rounded. The decree sets a per-credit price 'para cada enseñanza de grado' (per field of study) — this is the base/lowest tier found, not independently confirmed against every field this pass, same low-anchor convention as every course-fee range in this project. Second and subsequent enrolments (repeated courses) cost more — not modelled here. Domestic/international not clearly differentiated in sources found this pass; same figure used for both.",
};

const CATALUNYA: EsRegionalEntry = {
  creditPrice: 17.69,
  sourceUrl: "https://govern.cat/salapremsa/notes-premsa/617582/el-govern-aprova-el-decret-de-preus-publics-universitaris-que-mante-les-rebaixes-i-exempcions-del-darrer-curs",
  dataQualityFlag: "current",
  notes:
    "Catalunya, DECRET 96/2026, de 16 de juny, curs 2026-2027 — €17.69/ECTS credit, now a single consolidated rate for all Grado fields (Catalunya recently removed its per-field 'experimentality' coefficient, unlike Madrid). Annual estimate = €17.69 × 60 ECTS = €1,061.40, rounded — matches the €1,061 total the Generalitat's own announcement states directly for a standard 60-credit year, confirming the 60-ECTS assumption is correct, not just this project's own guess. A separate, smaller administrative fee (€141-150/year) is not included — a genuinely different, non-tuition concept, same treatment as every other country's administrative fees in this project. Domestic/international not clearly differentiated in sources found this pass; same figure used for both.",
};

/** `universities.name` (exact, this spine) -> which regional price applies. Every public
 * university in Madrid or Catalunya in this spine, cross-checked against
 * `lib/universities/duplicate-supersessions.json` (no Spanish entries found) before being
 * added. Private universities and universities in other regions are deliberately absent — see
 * file header. */
const REGION_BY_UNIVERSITY: Record<string, EsRegionalEntry> = {
  "Complutense University of Madrid": MADRID,
  "Universidad Autónoma de Madrid": MADRID,
  "Universidad Carlos III de Madrid (UC3M)": MADRID,
  "Universidad Politécnica de Madrid (UPM)": MADRID,
  "Universidad de Alcalá (Madrid)": MADRID,
  "Universitat de Barcelona": CATALUNYA,
  "Universitat Autònoma de Barcelona": CATALUNYA,
  "Universitat Pompeu Fabra (Barcelona)": CATALUNYA,
  "Universitat Politècnica de Catalunya · BarcelonaTech (UPC)": CATALUNYA,
  "Universitat Rovira i Virgili": CATALUNYA,
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

  const { data: esUnis, error } = await admin.from("universities").select("id, name").eq("country", "Spain").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${(esUnis ?? []).length} Spanish universities in the spine; ${Object.keys(REGION_BY_UNIVERSITY).length} matched to a resolved region this pass.`);

  type ToWrite = { universityId: string; universityName: string; metricCode: string; valueNumeric: number };
  const toWrite: ToWrite[] = [];
  let noEntry = 0;

  for (const uni of esUnis ?? []) {
    const entry = REGION_BY_UNIVERSITY[uni.name];
    if (!entry) {
      noEntry++;
      console.log(`  NO ENTRY (private, unresolved region, or name mismatch): ${JSON.stringify(uni.name)}`);
      continue;
    }
    const annual = Math.round(entry.creditPrice * STANDARD_CREDITS_PER_YEAR);
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_domestic_annual", valueNumeric: annual });
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_international_annual", valueNumeric: annual });
  }

  console.log(`${toWrite.length} metric rows to write, ${noEntry} Spanish universities with no entry in this table.`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / ${w.metricCode} = ~€${w.valueNumeric} (approximate)`);
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const entry = REGION_BY_UNIVERSITY[w.universityName];
    const payload = {
      university_id: w.universityId,
      metric_code: w.metricCode,
      value_numeric: w.valueNumeric,
      unit: "EUR/year",
      stats_as_of: "2026/27",
      scope: "undergraduate",
      precision_state: "approximate",
      source_url: entry.sourceUrl,
      source_type: "government_dataset",
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
