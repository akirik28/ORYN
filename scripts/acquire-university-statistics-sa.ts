#!/usr/bin/env node
/**
 * Saudi Arabia tuition fee acquisition — a real, decades-old national policy for domestic
 * students; genuinely per-institution for international students.
 *
 * Twelfth country in the founder-directed tuition/cost-acquisition roadmap, picked by the
 * coverage report's ranking after Malaysia and Russia both turned out to be genuine dead ends
 * this pass (... -> Japan -> [Malaysia, not written] -> [Russia, not written] -> Saudi Arabia
 * -> ...).
 *
 * SCALABILITY CHECK — DOMESTIC SIDE: Saudi Arabia has never charged its own citizens tuition at
 * public universities — a long-standing national policy (government-funded higher education,
 * part of the broader social contract), not a per-institution choice. Confirmed directly on
 * KFUPM's own official page: "Saudi national students admitted directly to KFUPM receive
 * government scholarships that cover their tuition, making education tuition-free for domestic
 * students" — framed as a national government scholarship mechanism tied to admission, not a
 * KFUPM-specific programme. Extended to the other 12 confirmed-public Saudi universities in
 * this spine as a national policy fact, the same "confirm on a sample, extend to the rest of
 * the same legal category with a distinct data-quality flag" discipline already used for
 * Germany's Baden-Württemberg law and Japan's MEXT standard — NOT independently re-verified per
 * institution this pass.
 *
 * WHY INTERNATIONAL IS NOT THE SAME BLANKET STORY: unlike domestic, the widely-repeated claim
 * that Saudi public universities are "tuition-free for international students too" turned out,
 * on checking the actual mechanism, to run through a real, COMPETITIVE government scholarship
 * programme ("Study in Saudi," studyinsaudi.moe.gov.sa) with its own separate application
 * cycle — King Saud University's own page explicitly states international scholarships "are
 * not automatic but require an application process." KFUPM's own page is the clearest: a real
 * sticker international tuition, SAR 20,000/year, with a separate, competitive,
 * needs/merit-based scholarship programme covering "from 10% up to 100%" — not automatic, not
 * universal. Written as `precision_state: "upper_bound"` (an existing allowed value, no
 * migration needed — same shape as Italy's ISEE ceiling and KAIST's merit-conditional waiver),
 * not as a blanket $0, which would have been the wrong generalization here even though it was
 * right for domestic. Only KFUPM's international figure is confirmed this pass — the other 12
 * public universities' international sticker prices were not individually researched, left
 * unresolved rather than assumed to match KFUPM's.
 *
 * A REAL SUPERSESSION CAUGHT BEFORE WRITING: this spine has a KFUPM duplicate pair —
 * "King Fahd University of Petroleum and Minerals (KFUPM)" (winner) and "KFUPM" (loser, short
 * form) — checked against `universities.duplicate_status` before writing
 * anything, same discipline as every other country in this project.
 *
 * NOT INCLUDED: 4 private universities in this spine (Prince Mohammad Bin Fahd University,
 * Prince Sultan University, Alfaisal University, Effat University) charge real, independent
 * tuition, not subject to the public national-policy pattern above — not researched this pass.
 *
 * Usage:
 *   npm run acquire:university-statistics-sa                  # dry run
 *   npm run acquire:university-statistics-sa -- --apply
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

const DOMESTIC_FREE_NOTES =
  "Domestic (Saudi national) tuition: $0, a long-standing national policy — Saudi Arabia does " +
  "not charge its own citizens tuition at public universities, funded by the government as " +
  "part of admission itself, not a competitive scholarship in the same sense as the " +
  "international programme. Confirmed directly on KFUPM's own page; extended here to every " +
  "confirmed-public Saudi university in this spine as a national policy fact, not " +
  "independently re-verified per institution this pass.";

/** The 13 confirmed-public Saudi universities in this spine (4 private universities —
 * Prince Mohammad Bin Fahd, Prince Sultan, Alfaisal, Effat — deliberately excluded, see file
 * header). Cross-checked against `universities.duplicate_status`: the KFUPM
 * pair resolved to its winner name below. */
const PUBLIC_UNIVERSITIES: string[] = [
  "King Fahd University of Petroleum and Minerals (KFUPM)",
  "King Saud University",
  "King Abdulaziz University (KAU)",
  "Imam Abdulrahman Bin Faisal University (IAU)",
  "King Khalid University",
  "King Faisal University",
  "Prince Sattam Bin Abdulaziz University",
  "Imam Mohammad Ibn Saud Islamic University – IMSIU",
  "Princess Nourah bint Abdulrahman University",
  "Qassim University",
  "Taif University",
  "Umm Al-Qura University",
  "Jouf University",
];

const KFUPM_NAME = "King Fahd University of Petroleum and Minerals (KFUPM)";
const KFUPM_INTERNATIONAL_ANNUAL = 20000;
const KFUPM_SOURCE_URL = "https://www.kfupm.edu.sa/study/international-students/fees-and-scholarships";
const KFUPM_INTERNATIONAL_NOTES =
  "International (non-Saudi) undergraduate tuition, SAR 20,000/year — KFUPM's own official " +
  "page, 'regular admission to undergraduate programs.' A separate, competitive, " +
  "needs/merit-based scholarship committee can award 10% to 100% coverage, and a distinct " +
  "exchange-student track is fully waived — neither is automatic or universal, so this figure " +
  "is written as a ceiling (`upper_bound`), not a flat guaranteed rate, the same shape as " +
  "Italy's ISEE ceiling and KAIST's merit-conditional waiver elsewhere in this project.";

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

  const { data: saUnis, error } = await admin.from("universities").select("id, name").eq("country", "Saudi Arabia").order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  const onPublicList = new Set(PUBLIC_UNIVERSITIES);
  console.log(`${(saUnis ?? []).length} Saudi universities in the spine; ${onPublicList.size} confirmed public (domestic $0 policy).`);

  type ToWrite = { universityId: string; universityName: string; metricCode: string; valueNumeric: number; precisionState: "exact" | "upper_bound"; sourceUrl: string; notes: string; dataQualityFlag: "current" | "current_search_cited" };
  const toWrite: ToWrite[] = [];
  let notPublic = 0;

  for (const uni of saUnis ?? []) {
    if (!onPublicList.has(uni.name)) {
      notPublic++;
      console.log(`  NOT ON PUBLIC LIST (private, or name mismatch): ${JSON.stringify(uni.name)}`);
      continue;
    }
    const isKfupm = uni.name === KFUPM_NAME;
    toWrite.push({
      universityId: uni.id,
      universityName: uni.name,
      metricCode: "tuition_domestic_annual",
      valueNumeric: 0,
      precisionState: "exact",
      sourceUrl: isKfupm ? KFUPM_SOURCE_URL : "https://www.kfupm.edu.sa/study/international-students/fees-and-scholarships",
      notes: DOMESTIC_FREE_NOTES,
      dataQualityFlag: isKfupm ? "current" : "current_search_cited",
    });
    if (isKfupm) {
      toWrite.push({
        universityId: uni.id,
        universityName: uni.name,
        metricCode: "tuition_international_annual",
        valueNumeric: KFUPM_INTERNATIONAL_ANNUAL,
        precisionState: "upper_bound",
        sourceUrl: KFUPM_SOURCE_URL,
        notes: KFUPM_INTERNATIONAL_NOTES,
        dataQualityFlag: "current",
      });
    }
  }

  console.log(`${toWrite.length} metric rows to write, ${notPublic} Saudi universities not on the public list.`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of toWrite) console.log(`  would write ${w.universityName} / ${w.metricCode} = ${w.valueNumeric === 0 ? "Free" : `SAR ${w.valueNumeric}`} (${w.precisionState})`);
    return;
  }

  let written = 0;
  for (const w of toWrite) {
    const payload = {
      university_id: w.universityId,
      metric_code: w.metricCode,
      value_numeric: w.valueNumeric,
      unit: "SAR/year",
      stats_as_of: "2026/27",
      scope: "undergraduate",
      precision_state: w.precisionState,
      source_url: w.sourceUrl,
      source_type: "official_primary",
      verified_at: new Date().toISOString(),
      data_quality_flag: w.dataQualityFlag,
      notes: w.notes,
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
