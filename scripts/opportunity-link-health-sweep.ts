#!/usr/bin/env node
/**
 * Read-only link-health measurement across the live opportunity catalog (CEO dispatch,
 * 2026-09-03, following the thin-category sourcing pass where 2 of 4 candidates failed on
 * unreachable organiser domains and one (TeensGive.org) had its domain reassigned outright to
 * a commercial essay-writing service). Question: how much of the EXISTING catalogue rests on
 * a source_url/official_url that no longer works, or no longer belongs to the organisation we
 * credit?
 *
 * MEASUREMENT ONLY. No database writes of any kind -- this script only reads a pre-exported
 * JSON snapshot of (id, title, organization, official_url, source_url) and reports. It does
 * not call runReverificationPass, claim a lease, or touch opportunity_verification_runs.
 *
 * Reuses b9's fetch ladder and content guards (lib/opportunities/reverification/) rather than
 * rebuilding URL-fetch logic, per the CEO's explicit instruction. Deliberately calls
 * fetchRung2BrowserUA / fetchRung3FollowRedirect directly rather than the full
 * runFetchLadder() wrapper: rung 1 (Tavily extract) is a paid, rate-limited API and this is a
 * one-time 282-row sweep answering a link-health question, not a content-extraction
 * completeness question -- skipping it is a disclosed, cost-conscious scoping choice (see the
 * companion doc), not an oversight. A URL that fails rung 2/3 here is reported as "unreadable
 * via free fetch, not escalated to Tavily," never silently upgraded to "dead."
 *
 * Usage:
 *   NODE_PATH=/path/to/shim_modules \
 *     npx tsx scripts/opportunity-link-health-sweep.ts --input path.json --out path.json [--concurrency 6]
 */

export {};

import * as fs from "node:fs";

function parseArg(name: string): string | undefined {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return undefined;
  return process.argv[index + 1];
}

interface InputRow {
  id: string;
  title: string;
  organization: string | null;
  official_url: string;
  source_url: string | null;
}

interface FetchAttemptLite {
  rung: number;
  method: string;
  httpStatus: number | null;
  bytes: number | null;
  error: string | null;
}

interface UrlOutcome {
  url: string;
  attempts: FetchAttemptLite[];
  finalUrl: string | null;
  succeededAtRung: number | null;
  content: string | null;
}

interface UrlResultForReport {
  attempts: FetchAttemptLite[];
  finalUrl: string | null;
  succeededAtRung: number | null;
  contentGuard: "content_too_short" | "identity_mismatch" | null;
}

interface RowReport {
  id: string;
  title: string;
  organization: string | null;
  official_url: string;
  source_url: string | null;
  urlsChecked: string[];
  results: Record<string, UrlResultForReport>;
  classification: "healthy" | "dead" | "redirect_same_org" | "redirect_different_org" | "content_mismatch" | "mixed";
  notes: string[];
}

/** Crude eTLD+1 approximation -- good enough to distinguish "same institution, different
 * subdomain" from "genuinely different domain" for this measurement's purposes. Not a full
 * public-suffix-list implementation (see lib/opportunities/duplicates.ts's own registrable-
 * domain fix from earlier tonight, which uses tldts for exactly that reason); a false split on
 * an unusual multi-part TLD here would show as a spurious redirect_different_org flag, which
 * this pass's own manual review step (reading every flagged row before reporting by name)
 * catches rather than silently trusting. */
function registrableDomain(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    const parts = hostname.replace(/^www\./, "").split(".");
    if (parts.length <= 2) return parts.join(".");
    const secondLast = parts[parts.length - 2];
    const last = parts[parts.length - 1];
    if (last.length === 2 && ["ac", "co", "com", "edu", "gov", "org", "net"].includes(secondLast)) {
      return parts.slice(-3).join(".");
    }
    return parts.slice(-2).join(".");
  } catch {
    return null;
  }
}

async function processInChunks<T>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    await Promise.all(chunk.map((item, j) => fn(item, i + j)));
  }
}

async function main() {
  const inputPath = parseArg("input");
  const outPath = parseArg("out");
  const concurrency = Number(parseArg("concurrency") ?? "6");
  if (!inputPath || !outPath) {
    console.error("Usage: --input path.json --out path.json [--concurrency N]");
    process.exit(1);
  }

  const { fetchRung2BrowserUA, fetchRung3FollowRedirect } = await import("../lib/opportunities/reverification/fetch-ladder");
  const { passesContentFloor, passesPageIdentity } = await import("../lib/opportunities/reverification/classify");

  const rows: InputRow[] = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  console.log(`[sweep] ${rows.length} rows loaded`);

  const distinctUrls = [...new Set(rows.flatMap((r) => [r.official_url, r.source_url].filter((u): u is string => !!u)))];
  console.log(`[sweep] ${distinctUrls.length} distinct URLs across ${rows.length} rows`);

  const urlOutcomes = new Map<string, UrlOutcome>();
  let completed = 0;

  await processInChunks(distinctUrls, concurrency, async (url) => {
    const rung2 = await fetchRung2BrowserUA(url);
    const attempts: FetchAttemptLite[] = [rung2.attempt];
    let content = rung2.content;
    let finalUrl: string | null = rung2.finalUrl;
    let succeededAtRung: number | null = rung2.content ? 2 : null;

    if (!content && rung2.finalUrl && rung2.finalUrl !== url) {
      const rung3 = await fetchRung3FollowRedirect(rung2.finalUrl);
      attempts.push(rung3.attempt);
      if (rung3.content) {
        content = rung3.content;
        finalUrl = rung3.finalUrl;
        succeededAtRung = 3;
      }
    }

    urlOutcomes.set(url, { url, attempts, finalUrl, succeededAtRung, content });
    completed += 1;
    if (completed % 20 === 0 || completed === distinctUrls.length) console.log(`[sweep] ${completed}/${distinctUrls.length} URLs checked`);
  });

  const reports: RowReport[] = rows.map((row) => {
    const urlsChecked = [...new Set([row.official_url, row.source_url].filter((u): u is string => !!u))];
    const results: Record<string, UrlResultForReport> = {};
    const notes: string[] = [];
    let anyDead = false;
    let anyRedirectDifferentOrg = false;
    let anyRedirectSameOrg = false;
    let anyContentMismatch = false;
    let anyHealthy = false;

    for (const url of urlsChecked) {
      const outcome = urlOutcomes.get(url)!;
      let contentGuard: UrlResultForReport["contentGuard"] = null;

      if (!outcome.content) {
        anyDead = true;
      } else {
        if (!passesContentFloor(outcome.content)) {
          contentGuard = "content_too_short";
          anyContentMismatch = true;
        } else if (!passesPageIdentity(outcome.content, { title: row.title, officialUrl: row.official_url }, row.organization)) {
          contentGuard = "identity_mismatch";
          anyContentMismatch = true;
        } else {
          anyHealthy = true;
        }

        if (outcome.finalUrl && outcome.finalUrl !== url) {
          const origDomain = registrableDomain(url);
          const finalDomain = registrableDomain(outcome.finalUrl);
          if (origDomain && finalDomain && origDomain !== finalDomain) {
            anyRedirectDifferentOrg = true;
            notes.push(`${url} -> ${outcome.finalUrl} (registrable domain changed: ${origDomain} -> ${finalDomain})`);
          } else {
            anyRedirectSameOrg = true;
          }
        }
      }

      results[url] = { attempts: outcome.attempts, finalUrl: outcome.finalUrl, succeededAtRung: outcome.succeededAtRung, contentGuard };
    }

    let classification: RowReport["classification"];
    if (anyRedirectDifferentOrg) classification = "redirect_different_org";
    else if (anyContentMismatch && !anyHealthy) classification = "content_mismatch";
    else if (anyDead && !anyHealthy) classification = "dead";
    else if (anyRedirectSameOrg && anyHealthy) classification = "redirect_same_org";
    else if (anyHealthy) classification = "healthy";
    else classification = "mixed";

    return { id: row.id, title: row.title, organization: row.organization, official_url: row.official_url, source_url: row.source_url, urlsChecked, results, classification, notes };
  });

  fs.writeFileSync(outPath, JSON.stringify(reports, null, 2));

  const dist: Record<string, number> = {};
  for (const r of reports) dist[r.classification] = (dist[r.classification] ?? 0) + 1;
  console.log("\n=== Classification distribution ===");
  console.log(JSON.stringify(dist, null, 2));

  console.log("\n=== redirect_different_org (the dangerous shape -- report by name) ===");
  for (const r of reports.filter((x) => x.classification === "redirect_different_org")) {
    console.log(`- ${r.title} (${r.id}): ${r.notes.join("; ")}`);
  }

  console.log("\n=== dead (no rung succeeded via free fetch) ===");
  for (const r of reports.filter((x) => x.classification === "dead")) {
    const statuses = r.urlsChecked.map((u) => r.results[u]?.attempts.map((a) => `rung${a.rung}:${a.httpStatus ?? a.error}`).join(",")).join(" | ");
    console.log(`- ${r.title} (${r.id}): ${statuses}`);
  }

  console.log("\n=== content_mismatch (loads, but fails identity/floor guard) ===");
  for (const r of reports.filter((x) => x.classification === "content_mismatch")) {
    console.log(`- ${r.title} (${r.id}): ${r.urlsChecked.map((u) => `${u} [${r.results[u]?.contentGuard}]`).join(", ")}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[sweep] failed", error);
    process.exit(1);
  });
