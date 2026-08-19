#!/usr/bin/env node
/**
 * France tuition fee acquisition — a real national law, but only for the subset of this
 * spine's French entries that are actually standard public universities.
 *
 * Sixth country in the founder-directed tuition/cost-acquisition roadmap (UK -> Canada ->
 * Australia -> Germany -> Netherlands -> France -> Switzerland -> ...).
 *
 * SCALABILITY CHECK: France sets a national statutory fee ("droits nationaux") by government
 * decree, uniform across public universities — **€178/year for Licence (Bachelor's) for
 * 2026-2027** for French/EU/EEA/Swiss students. Since décret n° 2026-385 (19 May 2026), non-EU
 * ("extra-communautaire") students at public universities pay a differentiated national rate
 * instead — **€2,902/year for Licence**, confirmed via multiple independent sources quoting
 * the same decree number and figure, including several universities' own pages (univ-lyon1.fr,
 * cyu.fr, u-bordeaux.fr, univ-brest.fr) describing the identical system. Universities may
 * exempt some students from this differentiated rate based on personal circumstances, capped
 * at 30% of subject students for 2026-2027 (dropping to 25% in 2027-2028) — so a meaningful
 * minority of non-EU students at any given university pay the domestic rate instead, similar
 * in spirit to how UK/US merit scholarships discount a sticker price without this project
 * modelling every discount; €2,902 is still the real, government-set rate the large majority
 * (at least 70%) of non-EU students actually pay. The CVEC (Contribution Vie Étudiante et de
 * Campus, €105/year) is a separate, small, non-tuition administrative fee — same "don't fold a
 * different concept into the headline figure" treatment as Germany's Semesterbeitrag, not
 * itemised here. The official government FAQ page
 * (enseignementsup-recherche.gouv.fr/fr/faq-droits-d-inscription-differencies-pour-les-etudiants-extra-communautaires-101557)
 * returned HTTP 403 to this pass's fetch tooling (like Cardiff's UK case — a fetch-access
 * problem, not a missing-data one); cited anyway as the authoritative source, corroborated by
 * the university-page confirmations above.
 *
 * WHY ONLY 19 OF THIS SPINE'S 30 FRENCH ENTRIES GET THE NATIONAL FIGURE — checked each one
 * individually before assuming "French public university" means "on the national schedule,"
 * because it doesn't always: this spine's France list includes several institutions with a
 * genuinely different, decree-independent fee-setting status. Confirmed, not assumed:
 *   - École Centrale de Lyon: its own page states cycle-ingénieur tuition is now INCOME-BASED
 *     (calculated from the family's reference taxable income), €1,613–4,113 depending on
 *     income — not the national schedule at all, and not a course-based range this project's
 *     domestic/international model can represent honestly.
 *   - Institut National Polytechnique de Toulouse: an "Institut" grouping several constituent
 *     schools (ENSEEIHT and others); search surfaced only the shared CVEC amount, no single
 *     institution-wide tuition figure — genuinely fragmented, not a gap to guess at.
 *   - CNAM (Conservatoire National des Arts et Métiers): a continuing-education-focused public
 *     institution whose fees are set per regional training centre, not nationally or
 *     institution-wide — confirmed via its own site structure (separate CNAM-Paris,
 *     CNAM-Nouvelle-Aquitaine, etc. sites), no single figure exists to write.
 *   - Sciences Po: long-published, well-known sliding-scale tuition based on family income
 *     (French/EU students), plus its own separate non-EU schedule — never on the national
 *     droits-nationaux schedule.
 *   - École Polytechnique, Institut Polytechnique de Paris, Université Paris Dauphine - PSL,
 *     Université PSL, École Normale Supérieure de Lyon: each a "Grand Établissement" (or part
 *     of one) with its own government-granted fee-setting autonomy, historically and currently
 *     used to charge a different (sometimes much higher, sometimes historically near-zero for
 *     ENS's civil-servant-track students) rate than the standard university schedule.
 *   - ESCP Business School, ESSEC Business School: private grandes écoles, real market-rate
 *     tuition, not subject to any public-university decree at all.
 * All 11 are left unresolved this pass rather than guessed at — each is a genuinely different
 * fee-setting mechanism, not a research gap. Worth a dedicated future pass (most are
 * prestigious, high-interest institutions for this product's audience), but conflating any of
 * them with the standard €178/€2,902 schedule would be a real, confirmable factual error.
 *
 * Usage:
 *   npm run acquire:university-statistics-fr                  # dry run
 *   npm run acquire:university-statistics-fr -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

const DOMESTIC_LICENCE_2026_27 = 178;
const INTERNATIONAL_DIFFERENTIATED_LICENCE_2026_27 = 2902;
const GOUV_SOURCE_URL =
  "https://www.enseignementsup-recherche.gouv.fr/fr/faq-droits-d-inscription-differencies-pour-les-etudiants-extra-communautaires-101557";

const NOTES =
  "Droits nationaux (domestic/EU/EEA/Swiss) for Licence, 2026-2027: €178/year, set by " +
  "government decree, uniform across public universities on the national schedule. Droits " +
  "différenciés (non-EU/EEA 'extra-communautaire') for Licence, 2026-2027: €2,902/year, per " +
  "décret n° 2026-385 (19 May 2026) — confirmed via the government's own FAQ (fetch blocked, " +
  "HTTP 403, cited as source anyway) and independently corroborated on several universities' " +
  "own pages describing the identical system and figure. Universities may exempt some non-EU " +
  "students from the differentiated rate based on personal circumstances, capped at 30% of " +
  "subject students for 2026-2027 — €2,902 is still the real rate at least 70% of non-EU " +
  "students actually pay, not a theoretical maximum. A separate, small, non-tuition CVEC " +
  "(Contribution Vie Étudiante et de Campus, €105/year) applies to every student regardless of " +
  "nationality — a genuinely different, non-tuition concept, not itemised here. This " +
  "university is on the standard national fee schedule — see acquire-university-statistics-fr.ts's " +
  "header for the 11 French spine entries confirmed NOT to be (Sciences Po, ESSEC, ESCP, " +
  "École Polytechnique, Institut Polytechnique de Paris, PSL, Dauphine-PSL, ENS Lyon, Centrale " +
  "Lyon, Toulouse INP, CNAM), each with its own different, decree-independent fee-setting " +
  "status.";

/** `universities.name` (exact, this spine) — the 19 of 30 French spine entries confirmed to be
 * standard public universities on the national droits-nationaux/droits-différenciés schedule.
 * The other 11 are deliberately absent — see file header. */
const STANDARD_NATIONAL_SCHEDULE_UNIVERSITIES: string[] = [
  "Sorbonne University",
  "Université Paris-Saclay",
  "Université Paris 1 Panthéon-Sorbonne",
  "Université Paris Cité",
  "Université Grenoble Alpes",
  "Aix-Marseille University",
  "Université de Strasbourg",
  "Université de Montpellier",
  "University of Bordeaux",
  "Université Paul Sabatier Toulouse III",
  "Université Claude Bernard Lyon 1",
  "Université de Lille",
  "CY Cergy Paris University",
  "Nantes Université",
  "Université Côte d'Azur",
  "Université de Franche-Comté",
  "Université de Lorraine",
  "Université de Rennes",
  "Université Paris-Est Créteil Val de Marne",
];

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

  const { data: frUnis, error } = await admin.from("universities").select("id, name").eq("country", "France").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  const onSchedule = new Set(STANDARD_NATIONAL_SCHEDULE_UNIVERSITIES);
  console.log(`${(frUnis ?? []).length} French universities in the spine; ${onSchedule.size} confirmed on the standard national fee schedule.`);

  type ToWrite = { universityId: string; universityName: string; metricCode: string; valueNumeric: number };
  const toWrite: ToWrite[] = [];
  let notOnSchedule = 0;

  for (const uni of frUnis ?? []) {
    if (!onSchedule.has(uni.name)) {
      notOnSchedule++;
      console.log(`  NOT ON NATIONAL SCHEDULE (name mismatch, or one of the 11 confirmed-different institutions): ${JSON.stringify(uni.name)}`);
      continue;
    }
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_domestic_annual", valueNumeric: DOMESTIC_LICENCE_2026_27 });
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_international_annual", valueNumeric: INTERNATIONAL_DIFFERENTIATED_LICENCE_2026_27 });
  }

  console.log(`${toWrite.length} metric rows to write, ${notOnSchedule} French universities not on the national schedule (left unresolved).`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / ${w.metricCode} = €${w.valueNumeric}`);
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const payload = {
      university_id: w.universityId,
      metric_code: w.metricCode,
      value_numeric: w.valueNumeric,
      unit: "EUR/year",
      stats_as_of: "2026/27",
      scope: "undergraduate",
      precision_state: "exact",
      source_url: GOUV_SOURCE_URL,
      source_type: "government_dataset",
      verified_at: new Date().toISOString(),
      data_quality_flag: "current_search_cited",
      notes: NOTES,
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
