#!/usr/bin/env node
/**
 * University Intelligence Spine — catastrophic-regression health check (spec Phase 10).
 *
 * Deliberately narrow and fast: this is NOT a replacement for report:universities (coverage
 * percentages), entities:audit (registry findings) or audit:university-duplicates (identity
 * pairs) — it is the check that should fail LOUDLY and IMMEDIATELY if something has gone
 * badly wrong, the way the founder brief asked for explicitly:
 *
 *   "if universities exact count unexpectedly becomes < expected baseline: FAIL LOUDLY
 *    if paginated result != exact count: FAIL LOUDLY
 *    if same ROR resolves to multiple live entities: FAIL LOUDLY"
 *
 * Exit code is non-zero on any FAIL, so this is safe to wire into a CI/pre-deploy gate later
 * without extra parsing. Every check uses fetchAllRowsVerified, which already throws on a
 * short/truncated read (the 1000-row PostgREST cap bug class) rather than silently
 * proceeding — so "the count matches the paginated read" is enforced by construction, not
 * re-implemented here.
 *
 * Extended (University Intelligence Spine continuation session) with five more checks beyond
 * the original four, each tied to a real incident this workstream actually hit rather than a
 * hypothetical: false-precision ranking rows, duplicate ranking positions, duplicate
 * university_profile_metrics rows, out-of-range student counts, and known-bad admissions_url
 * patterns (see each check's own comment for the specific incident).
 *
 * **One check is currently a known, expected FAIL**: "no canonical_entity_id shared by >1 live
 * universities row" — 9 pairs/18 rows, tracked in founder-blocked-backlog.md item 25, blocked
 * on migration 0043 needing DDL access this repo's automated sessions don't have. This is
 * intentional, not a bug in the gate: it stays a hard FAIL (not suppressed or downgraded) so
 * the count can never silently grow past 9, and so applying the eventual fix has an automated
 * way to confirm it worked. A red exit code from this one check specifically is expected until
 * that migration lands — check the detail line before assuming something new broke.
 *
 * Usage:
 *   npm run check:university-spine-health [-- --min-universities 1000]
 */

import { fetchAllRowsVerified, fetchExactCount } from "../lib/acquisition/paginate";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was checked.");
    process.exitCode = 1;
    return;
  }
  const rest = { url, key };
  const args = process.argv.slice(2);
  const minIndex = args.indexOf("--min-universities");
  // 1000, not 1010: a floor with a small margin below the last known-good count, so a
  // genuine one-or-two-row change (a founder-approved removal, say) doesn't trip this on
  // its own, while any real data-loss incident (truncation, a bad delete, a botched import)
  // still gets caught immediately.
  const minUniversities = minIndex >= 0 && args[minIndex + 1] ? Number(args[minIndex + 1]) : 1000;

  const checks: Check[] = [];

  // 1. Row-count floor. fetchExactCount uses PostgREST's own Content-Range total, not a
  // client-side count of a possibly-truncated page.
  const uniCount = await fetchExactCount(rest, "universities");
  checks.push({
    name: "universities count >= baseline",
    pass: uniCount >= minUniversities,
    detail: `${uniCount} (floor: ${minUniversities})`,
  });

  // 2. Paginated read matches exact count — fetchAllRowsVerified throws internally on a
  // mismatch, so reaching the push below at all means this already passed; a thrown error
  // surfaces as an uncaught rejection at the bottom of this file, which is the intended
  // "fail loudly" behavior for this specific invariant.
  const { rows: allUnis, expected } = await fetchAllRowsVerified<{ id: string }>(rest, "universities", "id", "order=id.asc");
  checks.push({
    name: "paginated universities read == exact count",
    pass: allUnis.length === expected,
    detail: `assembled ${allUnis.length}, server counts ${expected}`,
  });

  // 3. No external id claimed by two different LIVE (non-merged) canonical entities. This
  // is the sharpest possible identity-corruption signal: entity_external_ids has a DB-level
  // unique(id_system, external_id) constraint, so this can only happen via a merge that
  // left the source un-tombstoned, or a direct write that bypassed the importer entirely.
  const { rows: externalIds } = await fetchAllRowsVerified<{ entity_id: string; id_system: string; external_id: string }>(
    rest,
    "entity_external_ids",
    "entity_id,id_system,external_id",
    "order=id_system.asc"
  );
  const { rows: liveEntities } = await fetchAllRowsVerified<{ id: string; verification_state: string }>(
    rest,
    "canonical_entities",
    "id,verification_state",
    "entity_type=eq.university&order=id.asc"
  );
  const liveEntityIds = new Set(liveEntities.filter((e) => e.verification_state !== "merged").map((e) => e.id));
  const ownersBySystemId = new Map<string, Set<string>>();
  for (const row of externalIds) {
    if (!liveEntityIds.has(row.entity_id)) continue; // not a university entity, or already merged away
    const key = `${row.id_system}:${row.external_id}`;
    const owners = ownersBySystemId.get(key) ?? new Set<string>();
    owners.add(row.entity_id);
    ownersBySystemId.set(key, owners);
  }
  const collisions = [...ownersBySystemId.entries()].filter(([, owners]) => owners.size > 1);
  checks.push({
    name: "no external id claimed by >1 live university entity",
    pass: collisions.length === 0,
    detail: collisions.length === 0 ? "clean" : collisions.map(([k, owners]) => `${k} -> ${[...owners].join(", ")}`).join("; "),
  });

  // 4. Every live universities row still has a canonical_entity_id (Phase 2/8 assumption
  // every downstream duplicate/verification check in this pass relies on).
  const { rows: uniLinks } = await fetchAllRowsVerified<{ id: string; canonical_entity_id: string | null }>(
    rest,
    "universities",
    "id,canonical_entity_id",
    "order=id.asc"
  );
  const missingLink = uniLinks.filter((u) => !u.canonical_entity_id);
  checks.push({
    name: "every universities row has canonical_entity_id",
    pass: missingLink.length === 0,
    detail: missingLink.length === 0 ? "clean" : `${missingLink.length} row(s) missing a link, e.g. ${missingLink[0].id}`,
  });

  // 5. No false-precision ranking rows: a band-shaped rank_display (e.g. "601-610") must
  // never carry a non-null rank_numeric — migration 0038's own column comment requires this,
  // and AGENTS.md's non-negotiable rule 5 ("admission/ranking figures must never be presented
  // with false precision") makes this a product-trust invariant, not a style preference.
  // Manually verified clean once during Phase 5; this makes that check permanent instead of a
  // one-time finding that could silently regress on the next ingestion.
  const { rows: rankings } = await fetchAllRowsVerified<{ university_id: string; ranking_provider: string; ranking_edition: string; rank_display: string; rank_numeric: number | null }>(
    rest,
    "university_rankings",
    "university_id,ranking_provider,ranking_edition,rank_display,rank_numeric",
    "order=university_id.asc"
  );
  const falsePrecision = rankings.filter((r) => r.rank_numeric !== null && /[^0-9]/.test(r.rank_display.replace(/^=/, "")));
  checks.push({
    name: "no band-shaped rank_display with a non-null rank_numeric",
    pass: falsePrecision.length === 0,
    detail: falsePrecision.length === 0 ? "clean" : `${falsePrecision.length} row(s), e.g. ${falsePrecision[0].university_id} "${falsePrecision[0].rank_display}"`,
  });

  // 6. No canonical_entity_id shared by more than one live universities row. This is the
  // precise form of a check attempted twice while building this out: the first version tried
  // to infer duplicates from shared QS rank_display, which turned out to be unusable — sampled
  // live, the overwhelming majority of rank collisions past roughly the top 100 are ordinary
  // QS ties between entirely unrelated real institutions (e.g. HSE University and National
  // Taiwan Normal University both at #423), not our data being wrong, and this dataset doesn't
  // consistently mark them with QS's own "=" tie prefix. canonical_entity_id is the actual
  // ground truth instead: `merge_canonical_entities()` (Phase 2 this session, 9 pairs — see
  // founder-blocked-backlog.md item 25) repoints both sides of a merge to the SAME
  // canonical_entity_id but deliberately never touches the `universities` rows themselves, so
  // a merged pair's two rows sharing one canonical_entity_id is the exact documented "still
  // open" gap, not a new bug. **Expected to currently FAIL with exactly 9 pairs/18 rows** until
  // migration 0043 is applied (DDL-access-blocked, not code-blocked) and those rows are
  // superseded — failing loudly here is intentional so the gate can never silently regress
  // past 9, and so applying the fix has an automated way to confirm it actually worked.
  const entityOwners = new Map<string, Set<string>>();
  for (const u of uniLinks) {
    if (!u.canonical_entity_id) continue;
    entityOwners.set(u.canonical_entity_id, (entityOwners.get(u.canonical_entity_id) ?? new Set()).add(u.id));
  }
  const entityCollisions = [...entityOwners.entries()].filter(([, owners]) => owners.size > 1);
  checks.push({
    name: "no canonical_entity_id shared by >1 live universities row",
    pass: entityCollisions.length === 0,
    detail:
      entityCollisions.length === 0
        ? "clean"
        : `${entityCollisions.length} pair(s)/${entityCollisions.reduce((n, [, o]) => n + o.size, 0)} row(s) — expected until migration 0043 applies, see founder-blocked-backlog.md item 25: ${entityCollisions.map(([k, o]) => `${k}->${[...o].join(",")}`).join("; ")}`,
  });

  // 7. No duplicate (university_id, metric_code, scope) in university_profile_metrics. This
  // table's fill_if_null/upgrade write paths (enrich-student-counts.ts,
  // enrich-student-counts-us.ts) all assume at most one row per (university, metric, scope)
  // when deciding whether to insert or update — a duplicate here means some future read that
  // expects "the" current value (.maybeSingle()-shaped call sites) would silently pick
  // whichever row the query planner returns first.
  const { rows: metrics } = await fetchAllRowsVerified<{ university_id: string; metric_code: string; scope: string }>(
    rest,
    "university_profile_metrics",
    "university_id,metric_code,scope",
    "order=university_id.asc"
  );
  const metricKeyCounts = new Map<string, number>();
  for (const m of metrics) {
    const key = `${m.university_id}:${m.metric_code}:${m.scope}`;
    metricKeyCounts.set(key, (metricKeyCounts.get(key) ?? 0) + 1);
  }
  const metricDuplicates = [...metricKeyCounts.entries()].filter(([, n]) => n > 1);
  checks.push({
    name: "no duplicate (university, metric_code, scope) in university_profile_metrics",
    pass: metricDuplicates.length === 0,
    detail: metricDuplicates.length === 0 ? "clean" : `${metricDuplicates.length} key(s), e.g. ${metricDuplicates[0][0]} (${metricDuplicates[0][1]}x)`,
  });

  // 8. Student-count metrics within a sane range. Not a coverage/quality check (that's
  // report:universities) — this is a catastrophic-input guard: a unit mixup or parser bug
  // (e.g. a future CSV column-index shift) producing a zero, negative, or absurd headcount
  // should fail the gate immediately rather than surface as a silently wrong number on a
  // student-facing page. Ceiling is generous on purpose (the largest single-campus
  // universities worldwide top out in the 150k-200k range) — this catches garbage, not
  // legitimately large institutions.
  const { rows: studentMetrics } = await fetchAllRowsVerified<{ university_id: string; metric_code: string; value_numeric: number | null }>(
    rest,
    "university_profile_metrics",
    "university_id,metric_code,value_numeric",
    "metric_code=in.(total_students,undergraduate_students,postgraduate_students)&order=university_id.asc"
  );
  const insaneStudentCounts = studentMetrics.filter((m) => m.value_numeric !== null && (m.value_numeric <= 0 || m.value_numeric > 500_000));
  checks.push({
    name: "student-count metrics within a sane range (0, 500000]",
    pass: insaneStudentCounts.length === 0,
    detail: insaneStudentCounts.length === 0 ? "clean" : `${insaneStudentCounts.length} row(s), e.g. ${insaneStudentCounts[0].university_id}/${insaneStudentCounts[0].metric_code} = ${insaneStudentCounts[0].value_numeric}`,
  });

  // 9. No known-bad admissions_url pattern live. Mirrors scripts/audit-admissions-quality.ts's
  // two structural patterns (kept separate/duplicated deliberately, same reasoning as that
  // script's own header comment: this operates on URL-only evidence, not a full re-score).
  // Folded into the fast gate too because this specific bug class has already recurred twice
  // on the same university (LSE) within this session — worth a permanent, zero-cost tripwire
  // in addition to the dedicated audit script, not instead of it.
  const { rows: admissionsUrls } = await fetchAllRowsVerified<{ id: string; admissions_url: string | null }>(
    rest,
    "universities",
    "id,admissions_url",
    "admissions_url=not.is.null&order=id.asc"
  );
  const badAdmissionsPattern = /extenuating[- ]circumstances|special[- ]circumstances|mitigating[- ]circumstances|\bappeals?\b|\bcomplaints?\b|\/news\/|admission\s*results?|admission\s*scores?|entry\s*(?:cut[- ]?off|scores?)/i;
  const badAdmissionsUrls = admissionsUrls.filter((u) => u.admissions_url && badAdmissionsPattern.test(u.admissions_url));
  checks.push({
    name: "no known-bad admissions_url pattern",
    pass: badAdmissionsUrls.length === 0,
    detail: badAdmissionsUrls.length === 0 ? "clean" : `${badAdmissionsUrls.length} row(s), e.g. ${badAdmissionsUrls[0].id} -> ${badAdmissionsUrls[0].admissions_url}`,
  });

  console.log("=".repeat(70));
  console.log("UNIVERSITY SPINE HEALTH CHECK");
  console.log("=".repeat(70));
  let anyFailed = false;
  for (const check of checks) {
    console.log(`  [${check.pass ? "PASS" : "FAIL"}] ${check.name} — ${check.detail}`);
    if (!check.pass) anyFailed = true;
  }
  console.log("=".repeat(70));

  if (anyFailed) {
    console.error("\nAt least one catastrophic-regression check FAILED. Investigate before trusting any coverage report.");
    process.exitCode = 1;
  } else {
    console.log("\nAll checks passed.");
  }
}

main().catch((error: unknown) => {
  console.error("FAILED LOUDLY:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
