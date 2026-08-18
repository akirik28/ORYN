#!/usr/bin/env node
/**
 * Two facts sitting unused in `qs2027_import_staging` since it was first imported: `size_code`
 * (QS's own S/M/L/XL institution-size band, populated for all 1000 staged rows) and
 * `institution_status` (Public / Private not for Profit / Private for Profit, 987/1000
 * populated). Neither has ever been read by any script — checked via `grep -rl
 * qs2027_import_staging scripts/ lib/`, zero hits before this file.
 *
 * Exact join, no fuzzy name-matching: `qs2027_import_staging.list_position` is the same
 * `list_position` already stored on `university_rankings` (ranking_provider='QS',
 * ranking_edition='2027') when the rankings themselves were imported — confirmed live
 * (`list_position=1` on both sides is MIT). staging -> rankings.list_position ->
 * rankings.university_id -> universities.id, zero string comparison anywhere in the path.
 *
 * `size_code`: QS's own methodology (confirmed via web search, QS's support docs return
 * HTTP 403 to automated fetches so quoting their site directly wasn't possible) is a FTE
 * (full-time-equivalent) degree-seeking-student-body band, and QS does not publish the
 * numeric thresholds between XS/S/M/L/XL. Written as a NEW `university_profile_metrics` row
 * (`metric_code: 'qs_size_category'`, `precision_state: 'category_only'`) — deliberately not
 * touching `total_students`/`student_size` at all: a coarse band is a different, weaker kind
 * of fact than an exact headcount, not a substitute for one, and the two coexist without
 * conflict since they're different metric_codes entirely.
 *
 * `institution_status`: only fills `universities.institution_type` when that column is
 * currently NULL. Deliberately not used to overwrite an existing value — a prior pass this
 * session already found or hand-researched richer text there ("Public research university"
 * vs QS's bare "Public"), and a previous investigation into pulling from ROR was rejected
 * for exactly this reason (coarser data replacing richer data). For the 255 universities
 * with no institution_type at all, QS's plain Public/Private label is still real signal
 * worth having over nothing.
 *
 * Usage:
 *   npm run acquire:qs-institution-profile                  # dry run
 *   npm run acquire:qs-institution-profile -- --apply
 */

import { fetchAllRowsVerified } from "../lib/acquisition/paginate";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

const SOURCE_URL = "https://www.qs.com/insights/qs-world-university-rankings-2027-results-table-excel";

interface Rest {
  url: string;
  key: string;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }
  const rest: Rest = { url, key };
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { rows: staging } = await fetchAllRowsVerified<{ list_position: number; size_code: string | null; institution_status: string | null }>(
    rest,
    "qs2027_import_staging",
    "list_position,size_code,institution_status",
    "order=list_position.asc",
    "list_position"
  );
  const { rows: rankings } = await fetchAllRowsVerified<{ list_position: number; university_id: string }>(
    rest,
    "university_rankings",
    "list_position,university_id",
    "ranking_provider=eq.QS&ranking_edition=eq.2027&order=list_position.asc"
  );
  const { rows: universities } = await fetchAllRowsVerified<{ id: string; name: string; institution_type: string | null }>(
    rest,
    "universities",
    "id,name,institution_type",
    "order=id.asc"
  );
  const { rows: existingSizeMetrics } = await fetchAllRowsVerified<{ university_id: string }>(
    rest,
    "university_profile_metrics",
    "university_id",
    "metric_code=eq.qs_size_category&order=university_id.asc"
  );

  console.log(`Loaded ${staging.length} staging rows, ${rankings.length} QS 2027 rankings, ${universities.length} universities, ${existingSizeMetrics.length} existing qs_size_category metrics.`);

  const uniIdByListPosition = new Map(rankings.map((r) => [r.list_position, r.university_id]));
  const uniById = new Map(universities.map((u) => [u.id, u]));
  const hasSizeMetric = new Set(existingSizeMetrics.map((m) => m.university_id));

  const sizeToWrite: { universityId: string; universityName: string; sizeCode: string }[] = [];
  const typeToWrite: { universityId: string; universityName: string; status: string }[] = [];
  let noRankingLink = 0;

  for (const row of staging) {
    const universityId = uniIdByListPosition.get(row.list_position);
    if (!universityId) {
      noRankingLink++;
      continue;
    }
    const uni = uniById.get(universityId);
    if (!uni) continue;

    if (row.size_code && row.size_code.trim() && !hasSizeMetric.has(universityId)) {
      sizeToWrite.push({ universityId, universityName: uni.name, sizeCode: row.size_code.trim() });
    }
    if (row.institution_status && row.institution_status.trim() && uni.institution_type === null) {
      typeToWrite.push({ universityId, universityName: uni.name, status: row.institution_status.trim() });
    }
  }

  console.log(`\n${sizeToWrite.length} qs_size_category metric(s) to write (${noRankingLink} staging rows have no matching QS 2027 university_rankings list_position — expected for staged institutions outside our spine's own roster).`);
  console.log(`${typeToWrite.length} universities.institution_type fill(s) to write (only where currently null).`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    for (const w of sizeToWrite.slice(0, 8)) console.log(`  would write size ${w.universityName} = ${w.sizeCode}`);
    if (sizeToWrite.length > 8) console.log(`  ... and ${sizeToWrite.length - 8} more`);
    for (const w of typeToWrite.slice(0, 8)) console.log(`  would fill institution_type ${w.universityName} = "${w.status}"`);
    if (typeToWrite.length > 8) console.log(`  ... and ${typeToWrite.length - 8} more`);
    return;
  }

  let sizeWritten = 0;
  for (const w of sizeToWrite) {
    const { error } = await admin.from("university_profile_metrics").insert({
      university_id: w.universityId,
      metric_code: "qs_size_category",
      value_text: w.sizeCode,
      unit: "qs_size_band",
      scope: "institution",
      precision_state: "category_only",
      source_url: SOURCE_URL,
      source_type: "official_primary",
      verified_at: new Date().toISOString(),
      data_quality_flag: "current_official",
      notes: `QS World University Rankings 2027 official Size classification (S/M/L/XL, FTE degree-seeking student body). QS does not publish the numeric thresholds between bands — a coarse category, not a substitute for an exact total_students figure.`,
    });
    if (error) console.error(`  FAILED size ${w.universityName}: ${error.message}`);
    else sizeWritten++;
  }

  let typeWritten = 0;
  for (const w of typeToWrite) {
    const { error } = await admin.from("universities").update({ institution_type: w.status }).eq("id", w.universityId).is("institution_type", null);
    if (error) console.error(`  FAILED institution_type ${w.universityName}: ${error.message}`);
    else typeWritten++;
  }

  console.log(`\nWrote ${sizeWritten}/${sizeToWrite.length} size metrics, ${typeWritten}/${typeToWrite.length} institution_type fills.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
