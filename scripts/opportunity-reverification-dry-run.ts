#!/usr/bin/env node
/**
 * Bounded dry run for the opportunity re-verification job (design doc §10, run for real for
 * the first time 2026-09-03 — CEO dispatch: "run it... tell me what it would have done").
 *
 * No writes at all — passes { dryRun: true } straight through to runReverificationPass,
 * which suppresses claimLease/writeRun/writeSourceVerifiedAt/applyDemotion unconditionally
 * (see lib/opportunities/reverification/run-job.ts's own header, and
 * __tests__/opportunities/reverification/run-job-dry-run.test.ts for the automated proof).
 * Every real read and every real external call (Tavily, browser-UA fetch, Internet Archive,
 * Anthropic adjudication) still happens — that's the whole point of running this for real
 * rather than trusting the design on paper. The route (app/api/jobs/opportunity-
 * reverification/route.ts, `dry_run: true` in the request body) does the identical thing;
 * this script exists for §10.2's own stated preference ("a dry run wants a long single pass
 * with full per-rung logging... the repo already uses dated one-off scripts for exactly
 * this") and for a context where a second `next dev` isn't available (this codebase's dev
 * server is a cross-worktree singleton — see docs/opportunity-reverification-job-design-
 * 2026-08-23.md's own implementation note for how the first live run was actually invoked).
 *
 * REQUIRES A SHIM ON THE MODULE PATH FOR "server-only". This is the one piece of friction
 * worth explaining rather than working around silently: everything under lib/ (like nearly
 * everything server-side in this codebase) starts with `import "server-only"`. That package
 * is bundled inside Next.js itself, not a standalone npm dependency reachable from a plain
 * Node/tsx process's module resolution — importing this file directly throws `Cannot find
 * module 'server-only'`. The REAL package's own implementation is nothing but
 * `if (typeof window !== 'undefined') throw ...` — a pure no-op on any server context,
 * including a plain script, since there is no `window` global there either. So the fix is
 * exactly that no-op, made resolvable: point NODE_PATH at a directory containing a matching
 * `server-only/package.json` + empty `index.js`. Nothing about this changes what the real
 * package does at runtime; it only makes an already-inert-here import resolvable.
 *
 * Usage:
 *   NODE_PATH=/path/to/a/dir/containing/server-only-shim \
 *     npx tsx scripts/opportunity-reverification-dry-run.ts [--max-rows N] [--budget-ms N] [--ids-file path.json]
 *
 * Bounded by default (--max-rows 20) — enough to be representative of the priority-ranked
 * queue without meaningful Tavily/AI spend (checkJobBudget's own $5/month ceiling on
 * opportunity_reverification is the backstop regardless).
 *
 * --ids-file points at a JSON file containing an array of opportunity ids (a plain
 * `string[]`, or any array of objects each carrying an `id` field — the phrase-corpus
 * fetch scripts' own JSON shape, so a corpus file can be pointed at directly with no
 * reformatting). When given, the run is scoped to exactly those ids (RunOptions.candidateIds
 * — see run-job.ts's own comment for why this bypasses the due-set filter) instead of the
 * production priority-ranked due-set — for a measurement that wants a representative
 * cross-section of the catalogue rather than whatever the ranking would surface first.
 */

export {};

import * as fs from "node:fs";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

function parseArg(name: string, fallback: number): number {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  const parsed = Number(process.argv[index + 1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseStringArg(name: string): string | undefined {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return undefined;
  return process.argv[index + 1];
}

function loadCandidateIds(path: string | undefined): string[] | undefined {
  if (!path) return undefined;
  const parsed = JSON.parse(fs.readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`--ids-file ${path} must contain a JSON array`);
  const ids = parsed.map((entry) => (typeof entry === "string" ? entry : entry?.id)).filter((id): id is string => typeof id === "string" && id.length > 0);
  return [...new Set(ids)];
}

async function main() {
  // Dynamic import, deliberately not a static one at the top of this file, AND deliberately
  // inside main() rather than a bare top-level `await import(...)` — this repo's tsx/esbuild
  // pipeline transforms to CJS, which rejects top-level await outright ("Top-level await is
  // currently not supported with the 'cjs' output format"), so it has to live inside an
  // async function regardless. The ordering guarantee this exists for is unchanged: lib/
  // env.ts reads process.env.SUPABASE_SECRET_KEY (and friends) into a module-level `const`
  // evaluated once, at import time. A static `import` is hoisted ahead of any other top-level
  // code in the same file regardless of source order, so it would pull in that whole module
  // graph BEFORE loadEnvFile above ever ran — the exact bug already found and fixed once in
  // this codebase for the eval CLI (memory: "eval CLI loads .env.local before env-reading
  // imports"). A dynamic import() is not hoisted; it runs exactly where it's written, and
  // main() is only ever called after loadEnvFile above has already populated process.env.
  const { runReverificationPass } = await import("../lib/opportunities/reverification/run-job");

  const maxRows = parseArg("max-rows", 20);
  const budgetMs = parseArg("budget-ms", 180_000);
  const candidateIds = loadCandidateIds(parseStringArg("ids-file"));

  console.log(`[dry-run] starting -- maxRows=${maxRows} budgetMs=${budgetMs} dryRun=true${candidateIds ? ` candidateIds=${candidateIds.length}` : ""}`);
  const startedAt = Date.now();

  const result = await runReverificationPass({ maxRows, budgetMs, dryRun: true, ...(candidateIds ? { candidateIds } : {}) });

  const elapsedMs = Date.now() - startedAt;
  const rows = result.rows ?? [];

  console.log("\n=== Aggregate ===");
  console.log(JSON.stringify({ attempted: result.attempted, committed: result.committed, stoppedBy: result.stoppedBy, dueRemaining: result.dueRemaining, hasMore: result.hasMore, degraded: result.degraded, elapsedMs }, null, 2));

  const outcomeDistribution: Record<string, number> = {};
  for (const row of rows) outcomeDistribution[row.outcome] = (outcomeDistribution[row.outcome] ?? 0) + 1;
  console.log("\n=== Outcome distribution ===");
  console.log(JSON.stringify(outcomeDistribution, null, 2));

  const unreadable = rows.filter((r) => r.outcome === "p2_unreadable");
  const failureClassDistribution: Record<string, number> = {};
  for (const row of unreadable) failureClassDistribution[row.failureClass ?? "unknown"] = (failureClassDistribution[row.failureClass ?? "unknown"] ?? 0) + 1;
  console.log("\n=== p2_unreadable failure_class distribution ===");
  console.log(JSON.stringify(failureClassDistribution, null, 2));

  const corroborationChecks = rows.filter((r) => r.corroboration !== null);
  const falsified = corroborationChecks.filter((r) => r.corroboration?.falsified);
  const corroborated = corroborationChecks.filter((r) => r.corroboration?.corroborated);
  const uncorroborated = corroborationChecks.filter((r) => !r.corroboration?.falsified && !r.corroboration?.corroborated);
  console.log("\n=== Corroboration (the host-wall question) ===");
  console.log(
    JSON.stringify(
      {
        totalUnreadableFetches: corroborationChecks.length,
        falsifiedByWayback: falsified.length,
        corroboratedUnreadable: corroborated.length,
        uncorroborated: uncorroborated.length,
        falsifiedRate: corroborationChecks.length > 0 ? `${((falsified.length / corroborationChecks.length) * 100).toFixed(1)}%` : "n/a (no unreadable fetches this run)",
      },
      null,
      2
    )
  );

  const disagreements = rows.filter((r) => r.reachedAdjudication);
  const deterministicAgreements = rows.filter((r) => r.outcome === "p1_confirmed" && !r.reachedAdjudication);
  console.log("\n=== Deterministic vs. adjudicated ===");
  console.log(
    JSON.stringify(
      {
        resolvedDeterministically: deterministicAgreements.length,
        reachedLlmAdjudication: disagreements.length,
        adjudicationConfirmedChanged: rows.filter((r) => r.outcome === "p1_changed").length,
        adjudicationNotConfirmed: rows.filter((r) => r.outcome === "p4_contradicted").length,
      },
      null,
      2
    )
  );

  const wouldWriteSourceVerifiedAt = rows.filter((r) => r.wouldWriteSourceVerifiedAt).length;
  const wouldProposeDemotion = rows.filter((r) => r.wouldProposeDemotion).length;
  console.log("\n=== Would-be writes (none actually applied — dryRun: true) ===");
  console.log(JSON.stringify({ wouldWriteSourceVerifiedAt, wouldProposeDemotion }, null, 2));

  console.log("\n=== Per-row detail ===");
  for (const row of rows) {
    console.log(
      JSON.stringify(
        {
          title: row.title,
          url: row.url,
          outcome: row.outcome,
          evidenceClass: row.evidenceClass,
          failureClass: row.failureClass,
          succeededAtRung: row.succeededAtRung,
          corroboration: row.corroboration,
          reachedAdjudication: row.reachedAdjudication,
          matchedExcerpt: row.matchedExcerpt ? row.matchedExcerpt.slice(0, 160) : null,
          detectedDeadline: row.detectedDeadline,
          proposedChange: row.proposedChange,
          error: row.error,
        },
        null,
        2
      )
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[dry-run] failed", error);
    process.exit(1);
  });
