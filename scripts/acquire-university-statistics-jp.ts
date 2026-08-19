#!/usr/bin/env node
/**
 * Japan tuition fee acquisition — a national government-set standard rate, unchanged for two
 * decades, identical for domestic and international students.
 *
 * Eleventh country in the founder-directed tuition/cost-acquisition roadmap, the third picked
 * by the coverage report's ranking (... -> Italy -> Spain -> [China, not written] -> South
 * Korea -> Japan -> ...).
 *
 * SCALABILITY CHECK: Japan's national universities (国立大学) — a distinct legal category under
 * the National University Corporation Act — charge a single MEXT (Ministry of Education,
 * Culture, Sports, Science and Technology)-set "standard amount" (標準額): **¥535,800/year**,
 * confirmed directly on the University of Osaka's own official tuition page ("Undergraduate
 * student ¥535,800" under "Tuition Fee per year," no domestic/international distinction on the
 * page at all). This rate has been unchanged since 2005 — an unusually low year-conflation
 * risk for a "verify by academic year" figure, and independently corroborated across multiple
 * sources for University of Tokyo specifically, which also states plainly there is no separate
 * international rate. National universities may legally adjust up to roughly 20% above the
 * standard amount, but in practice nearly all charge exactly the standard figure — not
 * independently re-verified per institution this pass, matching the same "state-law rate,
 * confirmed on a sample, extended with a distinct data-quality flag to the rest" discipline
 * already used for Germany's Baden-Württemberg universities and Netherlands' statutory fee.
 *
 * A one-time, non-tuition ¥282,000 admission fee (入学金) also applies at enrolment — a
 * genuinely different concept from annual tuition, same "don't fold in a different fee" theme
 * as CVEC/Semesterbeitrag elsewhere in this project, not itemised here.
 *
 * WHY OSAKA METROPOLITAN UNIVERSITY IS INCLUDED DESPITE NOT BEING "NATIONAL": it's a municipal/
 * prefectural "public university corporation" (formed 2022 from the merger of Osaka City
 * University and Osaka Prefecture University), a legally distinct category from the 16 true
 * national universities above — checked specifically rather than assumed, since a different
 * governance structure could plausibly mean a different rate (the same caution that correctly
 * excluded Australia's non-Go8 universities from an assumed pattern). It turns out to follow
 * the identical ¥535,800/year standard, confirmed via its own English tuition page
 * (omu.ac.jp/en/admissions/tuitionfees/) — a real, checked fact, not an assumption from its
 * "public" label. Its own site does note a materially higher one-time ADMISSION fee (not
 * annual tuition) for students who are not Osaka residents (¥382,000) — a genuinely different,
 * residency-based concept from the international/domestic distinction modelled elsewhere in
 * this project, not itemised here since it doesn't affect the annual tuition figure itself.
 *
 * NOT INCLUDED: 5 private universities in this spine (Waseda, Keio, Ritsumeikan, Sophia, Tokyo
 * University of Science) set their own tuition entirely independently of MEXT's standard —
 * real per-institution research, not attempted this pass, queued.
 *
 * Usage:
 *   npm run acquire:university-statistics-jp                  # dry run
 *   npm run acquire:university-statistics-jp -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

const MEXT_STANDARD_ANNUAL = 535800;

const NATIONAL_STANDARD_NOTES =
  "MEXT (Ministry of Education, Culture, Sports, Science and Technology) national-university " +
  "standard tuition amount (標準額), ¥535,800/year — unchanged since 2005. Confirmed directly " +
  "on the University of Osaka's own tuition page: 'Undergraduate student ¥535,800,' with no " +
  "domestic/international distinction stated anywhere on the page. Independently corroborated " +
  "for University of Tokyo (no separate international rate). National universities may legally " +
  "adjust up to ~20% above this standard, but almost all charge it exactly — not independently " +
  "re-verified per institution this pass. A separate, one-time, non-tuition ¥282,000 admission " +
  "fee (入学金) also applies at enrolment, not itemised here — a genuinely different concept " +
  "from annual tuition, the same treatment as every other country's administrative fees in " +
  "this project.";

/** `universities.name` (exact, this spine) — the 17 universities in this spine confirmed to
 * follow the MEXT national standard rate: 16 true national universities plus Osaka Metropolitan
 * University (a municipal/prefectural public university corporation, checked specifically —
 * see file header — not assumed just because it's publicly governed). Cross-checked against
 * `lib/universities/duplicate-supersessions.json` (no Japanese entries found) before being
 * added. The remaining 5 Japanese universities in this spine are private and deliberately
 * absent — see file header. */
const NATIONAL_STANDARD_UNIVERSITIES: string[] = [
  "The University of Tokyo",
  "Kyoto University",
  "The University of Osaka",
  "Institute of Science Tokyo",
  "Tohoku University",
  "Nagoya University",
  "Kyushu University",
  "Hokkaido University",
  "University of Tsukuba",
  "Hiroshima University",
  "Kobe University",
  "Hitotsubashi University",
  "Chiba University",
  "Kanazawa University",
  "Nagasaki University",
  "Tokyo University of Agriculture and Technology",
  "Osaka Metropolitan University",
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

  const { data: jpUnis, error } = await admin.from("universities").select("id, name").eq("country", "Japan").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  const onStandard = new Set(NATIONAL_STANDARD_UNIVERSITIES);
  console.log(`${(jpUnis ?? []).length} Japanese universities in the spine; ${onStandard.size} confirmed on the MEXT national standard rate.`);

  type ToWrite = { universityId: string; universityName: string; metricCode: string };
  const toWrite: ToWrite[] = [];
  let notOnStandard = 0;

  for (const uni of jpUnis ?? []) {
    if (!onStandard.has(uni.name)) {
      notOnStandard++;
      console.log(`  NOT ON NATIONAL STANDARD (private, or name mismatch): ${JSON.stringify(uni.name)}`);
      continue;
    }
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_domestic_annual" });
    toWrite.push({ universityId: uni.id, universityName: uni.name, metricCode: "tuition_international_annual" });
  }

  console.log(`${toWrite.length} metric rows to write, ${notOnStandard} Japanese universities not on the national standard (private, left unresolved).`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / ${w.metricCode} = ¥${MEXT_STANDARD_ANNUAL.toLocaleString("en-US")}`);
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const payload = {
      university_id: w.universityId,
      metric_code: w.metricCode,
      value_numeric: MEXT_STANDARD_ANNUAL,
      unit: "JPY/year",
      stats_as_of: "2026/27 (MEXT standard amount, unchanged since 2005)",
      scope: "undergraduate",
      precision_state: "exact",
      source_url: "https://www.osaka-u.ac.jp/en/campus/tuition/tuition.html",
      source_type: w.universityName === "Osaka Metropolitan University" ? "official_primary" : "government_dataset",
      verified_at: new Date().toISOString(),
      data_quality_flag: w.universityName === "The University of Osaka" || w.universityName === "The University of Tokyo" ? "current" : "current_search_cited",
      notes: NATIONAL_STANDARD_NOTES,
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
