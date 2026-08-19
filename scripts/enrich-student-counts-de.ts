#!/usr/bin/env node
/**
 * German student population enrichment from Destatis (Statistisches Bundesamt) — the official
 * federal statistics office, the same authority the product spec names for this exact use case
 * (Section 5 / PHASE 3). Mirrors enrich-student-counts-us.ts's architecture and precedence
 * rules exactly; see that file for the fuller design rationale.
 *
 * SOURCE: "Statistischer Bericht - Statistik der Studierenden - Wintersemester 2024/2025"
 * (endgültige Ergebnisse), table 21311-12 ("... nach Hochschularten, Ländern und Hochschulen"
 * — the one table in the report broken down to individual-institution level, not just national/
 * state aggregates). Downloaded and verified live 2026-08-18:
 *   https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bildung-Forschung-Kultur/Hochschulen/Publikationen/Downloads-Hochschulen/statistischer-bericht-studierende-hochschulen-endg-2110410257005.xlsx
 * Figures cross-checked for plausibility against well-known institution sizes (Köln/Münster as
 * large ~40-47k, Konstanz/Hohenheim as small specialized ~8-10k) before trusting the extraction.
 *
 * WHY A STATIC TABLE, NOT A LIVE XLSX PARSE: Destatis publishes this as an XLSX with a
 * multi-level hierarchical layout (Land -> Hochschulart -> Hochschule -> sometimes a
 * sub-campus row) and genuinely abbreviated institution names ("U Freiburg i.Br.", "TU
 * Berlin", "U des Saarlandes Saarbrücken") that don't string-match our spine's names — some of
 * which are the native German form, some translated to English, inconsistently, across this
 * spine's own acquisition history. Bridging that gap needs a human to actually look at both
 * lists side by side (done once, this pass, spot-checked against known real-world figures) —
 * the same kind of explicit, individually-verified mapping enrich-student-counts-us.ts already
 * uses for its FLAGSHIP_UNITID_OVERRIDES hard cases, just for every entry here instead of a
 * handful, since the abbreviation gap applies to all of them, not just multi-campus edge cases.
 * Re-verifying this table against a fresher Destatis publication next year is a manual step,
 * same as that script's own hardcoded dated bulk-file URL needing a periodic bump.
 *
 * DELIBERATELY NOT INCLUDED (left unresolved, not guessed):
 *   - Technical University of Munich, RWTH Aachen University — our spine already has a
 *     `student_size` for both (this pass's precedence rule wouldn't overwrite them anyway
 *     unless Wikidata-sourced) and TUM's own Destatis row ("TU München in München, Straubing,
 *     Garching und Weihenstephan" = 53970) roughly matches what's already stored (51954),
 *     which is itself a useful cross-check that both figures are in the right ballpark, but
 *     RWTH Aachen has no clearly corresponding top-level Destatis row under that name.
 *   - Constructor University — the only Destatis candidate ("Constructor University Bremen
 *     gGmbH") shows 536, implausibly low for what is a ~1,500-2,000-student institution;
 *     recorded as a genuine uncertainty rather than trusted.
 *   - TUHH Hamburg University of Technology — no matching top-level row found.
 *
 * Usage:
 *   npm run enrich:student-counts-de                  # dry run
 *   npm run enrich:student-counts-de -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

const SOURCE_URL =
  "https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bildung-Forschung-Kultur/Hochschulen/Publikationen/Downloads-Hochschulen/statistischer-bericht-studierende-hochschulen-endg-2110410257005.xlsx?__blob=publicationFile&v=3";
const SOURCE_LABEL = "Destatis (Statistisches Bundesamt), Statistik der Studierenden WS 2024/2025, table 21311-12";

/** `universities.name` (exact, this spine) -> [Destatis short label, total_students]. Every
 * entry hand-verified against table 21311-12 (see file header) — never fuzzy-matched. */
const DESTATIS_TOTALS: Record<string, [destatisLabel: string, total: number]> = {
  "Albert-Ludwigs-Universitaet Freiburg": ["U Freiburg i.Br.", 24135],
  "Christian-Albrechts-University zu Kiel": ["U Kiel", 24936],
  "Freie Universitaet Berlin": ["FU Berlin", 38397],
  "Frankfurt School of Finance and Management": ["Frankfurt School of Finance & Management-HfB (Priv. U)", 953],
  "Goethe-University Frankfurt am Main": ["U Frankfurt a.M.", 40954],
  "Humboldt-Universität zu Berlin": ["Humboldt-Universität Berlin", 35845],
  "Johannes Gutenberg Universität Mainz": ["U Mainz", 29490],
  "Julius-Maximilians-Universität Würzburg": ["U Würzburg", 26024],
  "Justus-Liebig-University Giessen": ["U Gießen", 24698],
  "Leibniz University Hannover": ["U Hannover", 26074],
  "Martin-Luther-Universität Halle-Wittenberg": ["U Halle", 18727],
  "Otto-von-Guericke-Universität Magdeburg": ["U Magdeburg", 12605],
  "Philipps-Universität Marburg": ["U Marburg", 20532],
  "Ruhr-Universität Bochum": ["U Bochum", 37759],
  "Saarland University": ["U des Saarlandes Saarbrücken", 15684],
  "Technical University of Darmstadt": ["TU Darmstadt", 24310],
  "Technische Universität Bergakademie Freiberg": ["TU Bergakademie Freiberg", 4383],
  "Technische Universität Berlin (TU Berlin)": ["TU Berlin", 34550],
  "Technische Universität Braunschweig": ["TU Braunschweig", 15632],
  "Technische Universität Dresden": ["TU Dresden", 27812],
  "TU Dortmund University": ["TU Dortmund", 29454],
  "Ulm University": ["U Ulm", 9814],
  "Universität  Leipzig": ["U Leipzig", 30528],
  "Universität Bremen": ["U Bremen", 17793],
  "Universität Duisburg-Essen": ["U Duisburg-Essen", 37567],
  "Universität Jena": ["U Jena", 16069],
  "Universität Konstanz": ["U Konstanz", 10063],
  "Universität Mannheim": ["U Mannheim", 11486],
  "Universität Potsdam": ["U Potsdam", 19696],
  "Universität Regensburg": ["U Regensburg", 20202],
  "Universität Rostock": ["U Rostock", 12815],
  "Universität Stuttgart": ["U Stuttgart", 20620],
  "University Duesseldorf": ["U Düsseldorf", 28641],
  "University of Bayreuth": ["U Bayreuth", 11689],
  "University of Cologne": ["U Köln", 47238],
  "University of Göttingen": ["U Göttingen", 26824],
  "University of Hohenheim": ["U Hohenheim", 8427],
  "University of Münster": ["U Münster", 41962],
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

  const { data: deUnis, error } = await admin.from("universities").select("id, name, student_size").eq("country", "Germany").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${(deUnis ?? []).length} German universities in the spine.`);

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

  const toWrite: { universityId: string; universityName: string; destatisLabel: string; value: number }[] = [];
  let noEntry = 0;
  for (const uni of deUnis ?? []) {
    const entry = DESTATIS_TOTALS[uni.name];
    if (!entry) {
      noEntry++;
      continue;
    }
    const [destatisLabel, value] = entry;
    const existing = existingByUni.get(uni.id);
    if (existing && !(existing.notes ?? "").startsWith("Wikidata-indexed")) {
      continue; // a stronger or equal existing value already there — never overwrite
    }
    toWrite.push({ universityId: uni.id, universityName: uni.name, destatisLabel, value });
  }

  console.log(`${Object.keys(DESTATIS_TOTALS).length} hand-verified entries; ${toWrite.length} to write, ${noEntry} German universities with no Destatis entry in this table (left unresolved, see file header).`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / total_students = ${w.value} (Destatis: "${w.destatisLabel}")`);
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const payload = {
      university_id: w.universityId,
      metric_code: "total_students",
      value_numeric: w.value,
      unit: "students",
      stats_as_of: "2024-2025 (Wintersemester)",
      scope: "institution",
      precision_state: "exact",
      source_url: SOURCE_URL,
      source_type: "official_primary",
      verified_at: new Date().toISOString(),
      data_quality_flag: "current",
      notes: `${SOURCE_LABEL}. Destatis label: "${w.destatisLabel}". Headcount, institution-level (parent Hochschule row, sub-campuses combined where Destatis reports them separately).`,
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
