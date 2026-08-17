#!/usr/bin/env node
/**
 * University student-count enrichment pipeline (spec Phase 3 + Phase 11).
 *
 * Resolves `total_students` for QS-ranked universities that don't have it yet, using
 * Wikidata (P2196, "total number of students") as a free, keyless, high-coverage index
 * into real primary/structured sources — not as the source of truth itself. A candidate
 * is only ever written when:
 *
 *   1. the Wikidata statement carries a reference URL (P854) — unsourced Wikidata claims
 *      are skipped, never inserted;
 *   2. that reference URL's domain looks like a genuine official institutional/government
 *      source (.edu / .ac.<cc> / .gov.<cc>) — HIGH tier, source_type 'official_primary' —
 *      or a short allow-list of reputable structured third parties (NACUBO, THE, QS,
 *      national stats offices, etc.) — MEDIUM tier, source_type 'third_party_structured'.
 *      Everything else (content-farm "college advice" sites, Wikipedia itself, directory
 *      sites) is excluded outright;
 *   3. the Wikidata item's country matches our `universities.country` (with common
 *      aliasing) — mismatches are skipped rather than guessed;
 *   4. the statistic's point-in-time (when present) is 2015 or later — older figures are
 *      excluded as too stale to be useful, even though they're real.
 *
 * Every accepted row is written with the reference URL as source_url, the actual stated
 * year (or an explicit "undated (see source)" marker) as stats_as_of, and a note
 * identifying it as Wikidata-indexed so it's clearly distinguishable later from rows a
 * human researched directly from an institution's own site. This keeps the pipeline
 * honest per AGENTS.md Phase 10: no fabricated values, explicit nulls/skips when unknown,
 * full provenance.
 *
 * Restartable: only pulls universities still missing the metric, so re-running after a
 * partial run (or a crash) naturally picks up where it left off — no separate checkpoint
 * file needed.
 *
 * Usage:
 *   npm run enrich:student-counts                  # dry run — prints what would happen
 *   npm run enrich:student-counts -- --apply                # writes accepted rows
 *   npm run enrich:student-counts -- --apply --limit 300    # cap how many universities to pull this run
 *
 * Deliberately does NOT import anything under lib/ with `import "server-only"` (same
 * constraint as scripts/check-integrations.ts and scripts/entities-audit.ts — that guard
 * throws outside Next.js's bundler).
 */

import { setTimeout as sleep } from "node:timers/promises";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables (CI, hosting platform).
}

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "ORYN-data-enrichment/1.0 (+https://github.com/akirik28/ORYN)";
const CHUNK_SIZE = 25;
const MIN_ACCEPT_YEAR = 2015;

// university, higher education institution, college, public university, private university,
// tertiary educational institution
const UNI_CLASSES = ["wd:Q3918", "wd:Q38723", "wd:Q189004", "wd:Q875538", "wd:Q902104", "wd:Q1188663"];

const MEDIUM_TRUSTED_DOMAINS = new Set([
  "nacubo.org",
  "timeshighereducation.com",
  "topuniversities.com",
  "shanghairanking.com",
  "statista.com",
  "oecd.org",
  "unesco.org",
  "worldbank.org",
  "data.worldbank.org",
  "usnews.com",
]);
const EXCLUDED_DOMAINS = new Set([
  "unipage.net",
  "studyportals.com",
  "mastersportal.com",
  "bachelorsportal.com",
  "collegesimply.com",
  "4icu.org",
  "webometrics.info",
  "wikipedia.org",
  "wikiwand.com",
  "prospects.ac.uk",
  "studyinternational.com",
  "topschoolsintheusa.com",
  "niche.com",
  "collegefactual.com",
  "collegetuitioncompare.com",
  "univstats.com",
]);
const COUNTRY_ALIASES: Record<string, Set<string>> = {
  "united states": new Set(["united states of america", "united states", "usa"]),
  "united kingdom": new Set(["united kingdom", "great britain"]),
  "hong kong sar": new Set(["hong kong"]),
  "macao sar": new Set(["macau", "macao"]),
  "south korea": new Set(["south korea", "republic of korea", "korea"]),
  czechia: new Set(["czechia", "czech republic"]),
  russia: new Set(["russia", "russian federation"]),
  "brunei darussalam": new Set(["brunei"]),
};

interface UniRow {
  id: string;
  name: string;
  country: string;
  rank_numeric: number | null;
}

interface SparqlBinding {
  searchName?: { value: string };
  item?: { value: string };
  itemLabel?: { value: string };
  countryLabel?: { value: string };
  students?: { value: string };
  pit?: { value: string };
  ref?: { value: string };
}

interface Candidate {
  uniId: string;
  uniName: string;
  wikidataItem: string;
  students: number;
  pitYear: number | null;
  ref: string;
  domain: string;
  tier: "HIGH" | "MEDIUM";
}

function nameVariants(name: string): string[] {
  const variants = new Set<string>();
  const base = name.trim().replace(/’/g, "'");
  variants.add(base);
  const paren = base.match(/^(.*?)\s*\([^)]*\)\s*$/);
  if (paren && paren[1].length > 3) variants.add(paren[1].trim());
  const dashAbbr = base.match(/^(.*?)\s*[-–]\s*[A-Z]{2,6}$/);
  if (dashAbbr && dashAbbr[1].length > 3) variants.add(dashAbbr[1].trim());
  const trailingOf = base.match(/^(.*?),\s*University of$/i);
  if (trailingOf) variants.add(`University of ${trailingOf[1].trim()}`);
  return [...variants].filter(Boolean);
}

function normCountry(country: string): Set<string> {
  const key = country.trim().toLowerCase();
  return COUNTRY_ALIASES[key] ?? new Set([key]);
}

function escSparql(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildQuery(labels: string[]): string {
  const values = labels.map((l) => `"${escSparql(l)}"@en`).join(" ");
  const classes = UNI_CLASSES.join(" ");
  return `
SELECT ?searchName ?item ?itemLabel ?countryLabel ?students ?pit ?ref WHERE {
  VALUES ?searchName { ${values} }
  ?item rdfs:label ?searchName .
  ?item wdt:P31/wdt:P279* ?class .
  VALUES ?class { ${classes} }
  ?item p:P2196 ?statement .
  ?statement ps:P2196 ?students .
  OPTIONAL { ?statement pq:P585 ?pit }
  OPTIONAL { ?statement prov:wasDerivedFrom ?refnode . ?refnode pr:P854 ?ref }
  OPTIONAL { ?item wdt:P17 ?country }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
}

async function runSparql(query: string): Promise<{ results: { bindings: SparqlBinding[] } }> {
  const res = await fetch(SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ query }),
  });
  if (!res.ok) throw new Error(`SPARQL request failed: ${res.status} ${await res.text().catch(() => "")}`);
  return res.json();
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function tierOf(domain: string): "HIGH" | "MEDIUM" | null {
  if (!domain || EXCLUDED_DOMAINS.has(domain)) return null;
  if (domain.endsWith(".edu") || domain.includes(".edu.") || domain.includes(".ac.") || domain.includes(".gov.") || domain.endsWith(".gov")) {
    return "HIGH";
  }
  if (MEDIUM_TRUSTED_DOMAINS.has(domain)) return "MEDIUM";
  return null;
}

async function resolveBatch(unis: UniRow[]): Promise<Map<string, Candidate>> {
  const variantMap = new Map<string, UniRow[]>();
  for (const u of unis) {
    for (const v of nameVariants(u.name)) {
      variantMap.set(v, [...(variantMap.get(v) ?? []), u]);
    }
  }
  const labels = [...variantMap.keys()];
  const chunks: string[][] = [];
  for (let i = 0; i < labels.length; i += CHUNK_SIZE) chunks.push(labels.slice(i, i + CHUNK_SIZE));

  const rowsByKey = new Map<string, SparqlBinding[]>();
  for (const [i, chunk] of chunks.entries()) {
    let data;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        data = await runSparql(buildQuery(chunk));
        break;
      } catch (err) {
        console.error(`  chunk ${i + 1}/${chunks.length} attempt ${attempt + 1} failed: ${(err as Error).message}`);
        await sleep(2000);
      }
    }
    if (!data) {
      console.error(`  chunk ${i + 1}/${chunks.length} FAILED after retries, skipping`);
      continue;
    }
    for (const b of data.results.bindings) {
      if (!b.item || !b.students) continue;
      const key = `${b.searchName?.value} ${b.item.value}`;
      rowsByKey.set(key, [...(rowsByKey.get(key) ?? []), b]);
    }
    process.stderr.write(`  chunk ${i + 1}/${chunks.length}: ${data.results.bindings.length} rows\n`);
    await sleep(1000);
  }

  const resolved = new Map<string, Candidate>();
  for (const [key, rows] of rowsByKey) {
    const [searchName, item] = key.split(" ");
    for (const uni of variantMap.get(searchName) ?? []) {
      const acceptableCountries = normCountry(uni.country);
      let best: Candidate | null = null;
      for (const r of rows) {
        const countryLabel = (r.countryLabel?.value ?? "").trim().toLowerCase();
        if (!countryLabel || !acceptableCountries.has(countryLabel)) continue;
        const domain = r.ref ? domainOf(r.ref.value) : "";
        const tier = tierOf(domain);
        if (!tier) continue;
        const pitMatch = r.pit?.value?.match(/^(\d{4})/);
        const pitYear = pitMatch ? Number(pitMatch[1]) : null;
        const candidate: Candidate = {
          uniId: uni.id,
          uniName: uni.name,
          wikidataItem: item,
          students: Number(r.students!.value),
          pitYear,
          ref: r.ref!.value,
          domain,
          tier,
        };
        const score = (c: Candidate) => [c.tier === "HIGH" ? 1 : 0, c.pitYear ?? -1] as const;
        if (!best || score(candidate) > score(best)) best = candidate;
      }
      if (best) {
        const existing = resolved.get(uni.id);
        const score = (c: Candidate) => [c.tier === "HIGH" ? 1 : 0, c.pitYear ?? -1] as const;
        if (!existing || score(best) > score(existing)) resolved.set(uni.id, best);
      }
    }
  }
  return resolved;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : 300;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: rows, error } = await admin
    .from("universities")
    .select("id, name, country, university_rankings!inner(rank_numeric, ranking_provider)")
    .eq("university_rankings.ranking_provider", "QS")
    .order("name");
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const { data: haveMetric, error: metricError } = await admin
    .from("university_profile_metrics")
    .select("university_id")
    .eq("metric_code", "total_students");
  if (metricError) {
    console.error(`Couldn't read existing metrics: ${metricError.message}`);
    process.exitCode = 1;
    return;
  }
  const already = new Set((haveMetric ?? []).map((r) => r.university_id as string));

  type Joined = { id: string; name: string; country: string; university_rankings: { rank_numeric: number | null }[] };
  const missing: UniRow[] = ((rows ?? []) as unknown as Joined[])
    .filter((r) => !already.has(r.id))
    .map((r) => ({ id: r.id, name: r.name, country: r.country, rank_numeric: r.university_rankings[0]?.rank_numeric ?? null }))
    .sort((a, b) => (a.rank_numeric ?? Infinity) - (b.rank_numeric ?? Infinity))
    .slice(0, limit);

  console.log(`${already.size} universities already have total_students. Resolving next ${missing.length} (of ${(rows?.length ?? 0) - already.size} still missing)...`);

  const resolved = await resolveBatch(missing);
  const accepted = [...resolved.values()].filter((c) => !(c.pitYear && c.pitYear < MIN_ACCEPT_YEAR));
  const staleRejected = [...resolved.values()].filter((c) => c.pitYear && c.pitYear < MIN_ACCEPT_YEAR);

  console.log(`\nResolved: ${resolved.size}/${missing.length}  (accepted ${accepted.length}, rejected as stale ${staleRejected.length}, unresolved ${missing.length - resolved.size})`);
  for (const c of accepted) {
    console.log(`  [${c.tier}] ${c.uniName} — ${c.students.toLocaleString()} students (${c.pitYear ?? "undated"}) via ${c.domain}`);
  }
  if (staleRejected.length) {
    console.log("\nRejected as too stale (< 2015), not written:");
    for (const c of staleRejected) console.log(`  ${c.uniName} — ${c.pitYear} via ${c.domain}`);
  }

  if (!apply) {
    console.log(`\nDry run — nothing written. Re-run with --apply to insert ${accepted.length} row(s).`);
    return;
  }

  let inserted = 0;
  for (const c of accepted) {
    const statsAsOf = c.pitYear ? String(c.pitYear) : "undated (see source)";
    const sourceType = c.tier === "HIGH" ? "official_primary" : "third_party_structured";
    const dataQualityFlag = c.pitYear
      ? c.tier === "HIGH"
        ? "dated_current"
        : "third_party_dated"
      : c.tier === "HIGH"
        ? "current_page_date_uncertain"
        : "third_party_undated";
    const note = `Wikidata-indexed figure (item ${c.wikidataItem.split("/").pop()}), sourced via ${c.domain}.`;
    const { error: insertError } = await admin.from("university_profile_metrics").insert({
      university_id: c.uniId,
      metric_code: "total_students",
      value_numeric: c.students,
      unit: "students",
      stats_as_of: statsAsOf,
      scope: "institution",
      precision_state: "approximate",
      source_url: c.ref,
      source_type: sourceType,
      verified_at: new Date().toISOString(),
      data_quality_flag: dataQualityFlag,
      notes: note,
    });
    if (insertError) {
      console.error(`  failed to insert ${c.uniName}: ${insertError.message}`);
      continue;
    }
    inserted += 1;

    // Keep universities.student_size (what the Explorer/detail UI actually reads) in
    // sync with the metric we just wrote. Only fills a currently-null value — never
    // overwrites an existing figure, so a human-verified student_size always wins over
    // this pipeline's Wikidata-sourced one.
    const { error: syncError } = await admin
      .from("universities")
      .update({ student_size: c.students })
      .eq("id", c.uniId)
      .is("student_size", null);
    if (syncError) console.error(`  metric written but student_size sync failed for ${c.uniName}: ${syncError.message}`);
  }
  console.log(`\nInserted ${inserted}/${accepted.length} row(s) into university_profile_metrics (and synced universities.student_size where it was empty).`);
}

main();
