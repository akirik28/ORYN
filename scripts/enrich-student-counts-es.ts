#!/usr/bin/env node
/**
 * Spanish student population enrichment from the Ministerio de Ciencia, Innovación y
 * Universidades. Mirrors enrich-student-counts-de.ts's architecture and precedence rules
 * exactly; see that file for the fuller design rationale on why this is a static, hand-
 * verified table rather than a live-parsed download.
 *
 * SOURCE: "Matriculados por Titulación 2015-2024" (Grado + Máster), downloaded and verified
 * live 2026-08-18:
 *   https://www.ciencia.gob.es/dam/jcr:717ab000-0372-44e4-bec3-e49afcb2838b/MatriculadosTitulacion2015_2024.xlsx
 * Two sheets ("Matriculados Grado", "Matriculados Master"), one row per (Comunidad autónoma,
 * Universidad, Rama, Titulación), each with a 2024-2025 "(**) Datos provisionales Avance"
 * column and a finalized 2023-2024 column. This table uses the **2023-2024 column** —
 * finalized, not provisional — summed across both sheets, grouped by `Universidad`.
 *
 * SCOPE, STATED PLAINLY: this total is Grado (Bachelor's) + Máster (Master's) only. The
 * source file has no Doctorado (PhD) sheet, so doctoral students are NOT included — a real
 * undercount versus a full institutional headcount, not hidden in the `notes` below. Figures
 * cross-checked for plausibility against well-known institution sizes before trusting them
 * (Complutense Madrid and Sevilla both landing near 58k, consistent with their reputation as
 * two of Spain's largest universities; smaller specialized/private ones landing far lower).
 *
 * DELIBERATELY UNRESOLVED: "Universidad Europea" in our spine has no city/campus qualifier,
 * but the source lists FOUR separately-branded "Universidad Europea" campuses as distinct
 * rows (Madrid 20469, Valencia 5985, Canarias 2440, del Atlántico 5362, plus a fifth
 * "Miguel de Cervantes" 5195 under the same corporate group) — genuinely ambiguous which one
 * our single row means, so left out rather than guessed, same principle as
 * enrich-student-counts-us.ts's multi-UNITID skip.
 *
 * Usage:
 *   npm run enrich:student-counts-es                  # dry run
 *   npm run enrich:student-counts-es -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

const SOURCE_URL = "https://www.ciencia.gob.es/dam/jcr:717ab000-0372-44e4-bec3-e49afcb2838b/MatriculadosTitulacion2015_2024.xlsx";
const SOURCE_LABEL = "Ministerio de Ciencia, Innovación y Universidades, Matriculados por Titulación 2023-2024 (Grado + Máster, Doctorado not included)";

/** `universities.name` (exact, this spine) -> [source's short "Universidad" label, sum of
 * Grado+Máster 2023-2024 Matriculados]. Every entry hand-verified against the aggregated
 * source table (see file header) — never fuzzy-matched. */
const ES_TOTALS: Record<string, [sourceLabel: string, total: number]> = {
  "Comillas Pontifical University": ["Pontificia Comillas", 11249],
  "Complutense University of Madrid": ["Complutense de Madrid", 57963],
  "IE University": ["IE Universidad", 9343],
  "Universidad Carlos III de Madrid (UC3M)": ["Carlos III de Madrid", 20183],
  "Universidad de Alcalá (Madrid)": ["Alcalá", 18886],
  "Universidad de Córdoba": ["Córdoba", 16298],
  "Universidad de Oviedo": ["Oviedo", 18907],
  "Universidad de Sevilla": ["Sevilla", 58138],
  "Universidad de Valladolid": ["Valladolid", 20118],
  "Universidad de Zaragoza": ["Zaragoza", 28870],
  "Universidade de Santiago de Compostela": ["Santiago de Compostela", 22591],
  "Universidade de Vigo": ["Vigo", 17975],
  "Universitat de Barcelona": ["Barcelona", 48969],
  "Universitat de Valencia": ["València (Estudi General)", 42674],
  "Universitat Internacional de Catalunya": ["Internacional de Catalunya", 5099],
  "Universitat Politècnica de Catalunya · BarcelonaTech (UPC)": ["Politécnica de Catalunya", 30763],
  "Universitat Politecnica de Valencia": ["Politècnica de València", 31824],
  "Universitat Pompeu Fabra (Barcelona)": ["Pompeu Fabra", 18728],
  "Universitat Ramon Llull": ["Ramón Llull", 17820],
  "Universitat Rovira i Virgili": ["Rovira i Virgili", 16033],
  "University of Alicante": ["Alicante", 23760],
  "University of Granada": ["Granada", 48262],
  "University of Navarra": ["Navarra", 12701],
  "University of Salamanca": ["Salamanca", 23244],
  "University of the Basque Country": ["País Vasco/Euskal Herriko Unibertsitatea", 40004],
  "Universidad Politécnica de Madrid (UPM)": ["Politécnica de Madrid", 33593],
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

  const { data: esUnis, error } = await admin.from("universities").select("id, name, student_size").eq("country", "Spain").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${(esUnis ?? []).length} Spanish universities in the spine.`);

  const { data: existingMetrics, error: metricsError } = await admin
    .from("university_profile_metrics")
    .select("university_id, notes")
    .eq("metric_code", "total_students");
  if (metricsError) {
    console.error(`Couldn't read existing metrics: ${metricsError.message}`);
    process.exitCode = 1;
    return;
  }
  const existingByUni = new Map<string, { notes: string | null }>();
  for (const m of existingMetrics ?? []) existingByUni.set(m.university_id, { notes: m.notes });

  const toWrite: { universityId: string; universityName: string; sourceLabel: string; value: number }[] = [];
  let noEntry = 0;
  for (const uni of esUnis ?? []) {
    const entry = ES_TOTALS[uni.name];
    if (!entry) {
      noEntry++;
      continue;
    }
    const [sourceLabel, value] = entry;
    const existing = existingByUni.get(uni.id);
    if (existing && !(existing.notes ?? "").startsWith("Wikidata-indexed")) {
      continue; // a stronger or equal existing value already there — never overwrite
    }
    toWrite.push({ universityId: uni.id, universityName: uni.name, sourceLabel, value });
  }

  console.log(`${Object.keys(ES_TOTALS).length} hand-verified entries; ${toWrite.length} to write, ${noEntry} Spanish universities with no entry in this table (left unresolved, see file header — includes the deliberately-ambiguous "Universidad Europea").`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / total_students = ${w.value} (source: "${w.sourceLabel}")`);
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const payload = {
      university_id: w.universityId,
      metric_code: "total_students",
      value_numeric: w.value,
      unit: "students",
      stats_as_of: "2023-2024",
      scope: "institution",
      // Grado+Máster only, no Doctorado sheet in this source — the true institutional total
      // is >= this figure, a systematic exclusion rather than rounding/estimation noise, so
      // "lower_bound" is the more precise fit than "approximate" here.
      precision_state: "lower_bound",
      source_url: SOURCE_URL,
      source_type: "official_primary",
      verified_at: new Date().toISOString(),
      data_quality_flag: "current",
      notes: `${SOURCE_LABEL}. Source label: "${w.sourceLabel}". Grado + Máster only — Doctorado (PhD) students are not included in this figure, a real undercount versus full institutional headcount.`,
    };
    const existingRow = await admin.from("university_profile_metrics").select("id").eq("university_id", w.universityId).eq("metric_code", "total_students").eq("scope", "institution").maybeSingle();
    const { error: writeError } = existingRow.data
      ? await admin.from("university_profile_metrics").update(payload).eq("id", existingRow.data.id)
      : await admin.from("university_profile_metrics").insert(payload);
    if (writeError) {
      console.error(`  FAILED ${w.universityName}: ${writeError.message}`);
      continue;
    }
    written++;
    await admin.from("universities").update({ student_size: w.value }).eq("id", w.universityId).is("student_size", null);
  }
  console.log(`\nWrote ${written}/${toWrite.length}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
