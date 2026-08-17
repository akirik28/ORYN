#!/usr/bin/env node
/**
 * Admissions URL / application system acquisition (spec Phase 4, University Intelligence
 * Spine) — Tavily-only, deterministic, no AI.
 *
 * ANTHROPIC_API_KEY is credit-blocked this session (billing: "insufficient credit balance",
 * not a missing key — see docs/handoffs/claude-a-university-spine.md). AGENTS.md Phase 9's
 * usual search-then-AI-extract workflow for the cost/policy layer isn't available, so this
 * takes the narrower path that needs no model call at all:
 *
 *   1. Tavily search, restricted to the institution's OWN already-verified domain
 *      (`include_domains`) — every candidate URL is `official_primary`-tier by construction
 *      (lib/acquisition/source-authority.ts), never a third-party aggregator.
 *   2. `lib/acquisition/admissions.ts`'s deterministic URL/title score picks the best
 *      candidate, or null if nothing clears the bar — never a guess.
 *   3. `application_system` is only ever set when a known portal name (Common App, UCAS,
 *      Parcoursup, ...) is found verbatim in the fetched page content — never inferred from
 *      its absence, and never defaulted to "direct" (the exact thing migration 0042's own
 *      column comment forbids).
 *
 * Single combined script (acquire + apply, like scripts/enrich-student-counts.ts) rather
 * than the acquire/import fixture split acquire-university-facts.ts uses: that split exists
 * because ROR/OpenAlex acquisition needs identity RESOLUTION (which existing row is this?)
 * before it can write anything. This pass starts from already-known `universities.id` rows
 * read directly from the database, so there is no separate identity-resolution step to
 * stage a fixture in front of. `fill_if_null` only — every fact here targets a column
 * currently at 0% coverage, and this must never overwrite a value a human later curates by
 * hand, so it re-checks the column is still null immediately before every write.
 *
 * Usage:
 *   npm run acquire:admissions -- --limit 25                # dry run, prints what it found
 *   npm run acquire:admissions -- --limit 25 --apply         # writes
 *   npm run acquire:admissions -- --limit 25 --out path.json # also saves the reviewable batch
 *
 * Tavily is a paid API — --limit defaults conservatively (25) rather than defaulting to the
 * full spine. Scale up deliberately once the classification quality on a small batch looks
 * right.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { detectApplicationSystem, extractDomain, pickBestAdmissionsCandidate } from "../lib/acquisition/admissions";
import { sourceAuthority } from "../lib/acquisition/source-authority";
import { CADENCE_DAYS, resolveVerificationState } from "../lib/acquisition/verification";

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

const USER_AGENT = "ORYN-data-acquisition/1.0 (+https://github.com/akirik28/ORYN)";
const TAVILY_CIRCUIT_THRESHOLD = 3;

interface UniRow {
  id: string;
  name: string;
  country: string;
  website_url: string;
}

interface AcquiredAdmissionsFact {
  universityId: string;
  universityName: string;
  field: "admissions_url" | "application_system";
  value: string;
  sourceUrl: string;
  verificationState: string;
  retrievedAt: string;
  notes: string | null;
}

interface TavilySearchResultLike {
  url?: unknown;
  title?: unknown;
  content?: unknown;
}

async function tavilySearch(apiKey: string, query: string, domain: string): Promise<{ ok: true; results: TavilySearchResultLike[] } | { ok: false; rateLimited: boolean }> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "User-Agent": USER_AGENT },
    body: JSON.stringify({ query, max_results: 5, search_depth: "basic", include_domains: [domain] }),
  }).catch(() => null);
  if (!response) return { ok: false, rateLimited: false };
  if (response.status === 429) return { ok: false, rateLimited: true };
  if (!response.ok) return { ok: false, rateLimited: false };
  const body = (await response.json().catch(() => null)) as { results?: unknown } | null;
  const results = Array.isArray(body?.results) ? (body!.results as TavilySearchResultLike[]) : [];
  return { ok: true, results };
}

async function tavilyExtract(apiKey: string, url: string): Promise<string | null> {
  const response = await fetch("https://api.tavily.com/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "User-Agent": USER_AGENT },
    body: JSON.stringify({ urls: [url], extract_depth: "basic", format: "text" }),
  }).catch(() => null);
  if (!response || !response.ok) return null;
  const body = (await response.json().catch(() => null)) as { results?: { url?: unknown; raw_content?: unknown }[] } | null;
  const first = body?.results?.[0];
  return typeof first?.raw_content === "string" ? first.raw_content : null;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex >= 0 && args[limitIndex + 1] ? Number(args[limitIndex + 1]) : 25;
  const outIndex = args.indexOf("--out");
  const outPath = outIndex >= 0 ? args[outIndex + 1] : null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read.");
    process.exitCode = 1;
    return;
  }
  if (!tavilyKey) {
    console.error("Missing TAVILY_API_KEY — see API_SETUP.md. This pass needs it (no fallback source for admissions/application-system discovery this session).");
    process.exitCode = 1;
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: candidates, error } = await admin
    .from("universities")
    .select("id, name, country, website_url")
    .not("website_url", "is", null)
    .is("admissions_url", null)
    .order("name")
    .limit(limit);
  if (error) {
    console.error(`Couldn't read universities: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  const rows = (candidates ?? []) as UniRow[];
  console.log(`${rows.length} universit${rows.length === 1 ? "y" : "ies"} selected (has website_url, missing admissions_url).\n`);

  const facts: AcquiredAdmissionsFact[] = [];
  const unresolved: { universityId: string; universityName: string; reason: string }[] = [];
  const outcomes = { ok: 0, rateLimited: 0, failed: 0, skipped: 0 };
  let consecutiveFailures = 0;
  let circuitLogged = false;

  for (const uni of rows) {
    const domain = extractDomain(uni.website_url);
    if (!domain) {
      unresolved.push({ universityId: uni.id, universityName: uni.name, reason: `website_url "${uni.website_url}" did not parse as a URL.` });
      continue;
    }

    if (consecutiveFailures >= TAVILY_CIRCUIT_THRESHOLD) {
      if (!circuitLogged) {
        circuitLogged = true;
        console.log(`\n  Tavily circuit breaker OPEN after ${TAVILY_CIRCUIT_THRESHOLD} consecutive failures — skipping the rest of this run.\n`);
      }
      outcomes.skipped += 1;
      unresolved.push({ universityId: uni.id, universityName: uni.name, reason: "Skipped — Tavily circuit breaker open for this run." });
      continue;
    }

    const search = await tavilySearch(tavilyKey, `${uni.name} undergraduate admissions apply`, domain);
    await sleep(400);
    if (!search.ok) {
      outcomes[search.rateLimited ? "rateLimited" : "failed"] += 1;
      consecutiveFailures += 1;
      unresolved.push({ universityId: uni.id, universityName: uni.name, reason: search.rateLimited ? "Tavily rate limited." : "Tavily search request failed." });
      continue;
    }
    consecutiveFailures = 0;
    outcomes.ok += 1;

    const candidatesForScoring = search.results.filter((r): r is { url: string; title: string; content?: string } => typeof r.url === "string" && typeof r.title === "string");
    const best = pickBestAdmissionsCandidate(candidatesForScoring);
    if (!best) {
      unresolved.push({ universityId: uni.id, universityName: uni.name, reason: `No candidate on ${domain} cleared the admissions-page score threshold.` });
      if (rows.length <= 60) console.log(`UNRESOLVED  ${uni.name} — no confident admissions page found on ${domain}`);
      continue;
    }

    const retrievedAt = new Date().toISOString();
    const authority = sourceAuthority("policy", best.url, new Set([domain]));
    const verificationState = authority
      ? resolveVerificationState({ authority, sourceYear: null, retrievedAt, cadenceDays: CADENCE_DAYS.policy ?? 90 })
      : "unverified";

    facts.push({
      universityId: uni.id,
      universityName: uni.name,
      field: "admissions_url",
      value: best.url,
      sourceUrl: best.url,
      verificationState,
      retrievedAt,
      notes: null,
    });

    // Extract the accepted page's fuller content (search only returns a short snippet) to
    // check for a known application-portal name. One extract call per ACCEPTED page only,
    // not per search result — keeps the paid-API cost bounded to what was actually useful.
    const fullContent = (await tavilyExtract(tavilyKey, best.url)) ?? candidatesForScoring.find((c) => c.url === best.url)?.content ?? "";
    await sleep(400);
    const appSystem = detectApplicationSystem(fullContent);
    if (appSystem) {
      facts.push({
        universityId: uni.id,
        universityName: uni.name,
        field: "application_system",
        value: appSystem.system,
        sourceUrl: best.url,
        verificationState,
        retrievedAt,
        notes: `Matched "${appSystem.matchedText}" in fetched page content.`,
      });
    }

    if (rows.length <= 60) {
      console.log(`ok          ${uni.name} -> ${best.url}${appSystem ? ` [${appSystem.system}]` : ""}`);
    }
  }

  console.log(`\nTavily outcomes: ok=${outcomes.ok} rate_limited=${outcomes.rateLimited} failed=${outcomes.failed} skipped=${outcomes.skipped}`);
  console.log(`Admissions URLs found: ${facts.filter((f) => f.field === "admissions_url").length}/${rows.length}`);
  console.log(`Application systems detected: ${facts.filter((f) => f.field === "application_system").length}/${rows.length}`);
  console.log(`Unresolved: ${unresolved.length}/${rows.length}`);

  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), facts, unresolved }, null, 2)}\n`);
    console.log(`\nWrote reviewable batch to ${outPath}`);
  }

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
    return;
  }

  console.log(`\nApplying ${facts.length} fact(s)...`);
  let written = 0;
  for (const fact of facts) {
    // fill_if_null, re-checked at write time (not just at read time above) — this run's own
    // earlier admissions_url write for the SAME university is what would make a same-run
    // application_system write need this: without the re-check, two facts for one
    // university in one run could not otherwise race, but a concurrent session could.
    const probe = await fetch(`${url}/rest/v1/universities?id=eq.${fact.universityId}&select=${fact.field}`, {
      headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
    });
    const probeBody = (await probe.json().catch(() => [])) as { [k: string]: unknown }[];
    const current = probeBody[0]?.[fact.field];
    if (current !== null && current !== undefined) {
      console.log(`  skip_human_verified ${fact.universityName}/${fact.field}: already "${String(current)}".`);
      continue;
    }
    const patch = await fetch(`${url}/rest/v1/universities?id=eq.${fact.universityId}`, {
      method: "PATCH",
      headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ [fact.field]: fact.value, last_checked_at: fact.retrievedAt, last_changed_at: fact.retrievedAt }),
    });
    if (!patch.ok) {
      console.error(`  FAILED ${fact.universityName}/${fact.field}: HTTP ${patch.status} ${await patch.text().catch(() => "")}`);
      continue;
    }
    written += 1;
  }
  console.log(`Wrote ${written}/${facts.length} fact(s).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
