/**
 * The gated entry point for lib/ai/eval — the ONLY place in this package allowed to
 * construct a real AIProvider and the only command that can spend model credit. Not wired
 * into "test", "lint", "build", "check:i18n", or any CI step; it exists solely as its own
 * npm script ("eval:ai") that a human runs on purpose.
 *
 * Default behavior (no flags) never touches the network: it builds the real 12-case matrix
 * (2 fixtures x 3 targets x 2 locales), measures each case's actual prompt size, and prints
 * the cost projection. That's the number CEO asked this package to produce so the credit
 * decision has one before spending anything.
 *
 * Real calls require --live, and reading a cost estimate is not the same action as
 * approving it — --live alone still refuses, and needs --confirm-spend alongside it. Two
 * separate flags rather than one, so a copy-pasted command from a doc or a chat log can't
 * accidentally spend money by including a flag nobody meant to combine with the others.
 *
 * MUST be run via `npm run eval:ai`, not a bare `tsx scripts/run-ai-eval.ts` — the npm
 * script passes `--tsconfig tsconfig.eval-cli.json`, which is the only thing that lets
 * this resolve. This file transitively imports several lib/ai/* modules tagged `import
 * "server-only"` (student-context.ts, weekly-plan.ts, counselor-explain.ts) — deliberately,
 * since reusing their real, exported prompt-assembly logic instead of hand-copying it is
 * what keeps this harness from silently drifting off what the product actually sends (see
 * harness.ts's own header). The real "server-only" package throws outside Next's own
 * bundler, and isn't even installed as a plain resolvable dependency in this project — only
 * vendored inside next/dist/compiled — so a bare `tsx` run fails at import time with
 * "Cannot find module 'server-only'". tsconfig.eval-cli.json aliases it to the same inert
 * stub __tests__/stubs/server-only.ts (Vitest already aliases the same file for the exact
 * same reason — see vitest.config.mts) — safe here for the same reason it's safe there:
 * none of the modules this harness reaches depend on request-scoped Next.js APIs like
 * cookies()/headers(), only on their own pure formatting logic. See
 * scripts/check-integrations.ts's own header for why THAT script goes the other way and
 * avoids server-only imports entirely — a different tradeoff for a simpler job (checking
 * connectivity) than this one (faithfully reusing real prompt-assembly code).
 *
 * "./load-dotenv" MUST stay the first import below, not merely an early one — see that
 * file's own header for why source position among imports matters here even though imports
 * are hoisted as a group. Confirmed live (2026-09-01): without it, --live --confirm-spend
 * refused with "ANTHROPIC_API_KEY is not set" on a machine with a real key sitting in
 * .env.local the whole time, because @/lib/ai/eval/cases below had already pulled in
 * @/lib/env and frozen its module-scope integrationStatus before main() ever ran.
 */
import "./load-dotenv";
import { ALL_CASES } from "@/lib/ai/eval/cases";
import { estimateCost } from "@/lib/ai/eval/cost-estimate";
import { runEval } from "@/lib/ai/eval/harness";
import { isAIConfigured, getAIProvider } from "@/lib/ai";

function formatUsd(value: number | null): string {
  return value === null ? "unknown (model not in pricing table)" : `$${value.toFixed(4)}`;
}

function printCostEstimate() {
  const estimate = estimateCost(ALL_CASES);
  console.log(`\nCost projection — model: ${estimate.model} (assumed input/output pricing from lib/ai/pricing.ts)`);
  console.log(`${ALL_CASES.length} cases (2 fixtures x 3 targets x 2 locales).\n`);
  console.log("target          locale  fixture      input~tok  output~tok(assumed)  cost");
  for (const line of estimate.perCase) {
    console.log(
      `${line.target.padEnd(15)} ${line.locale.padEnd(6)}  ${line.fixtureId.padEnd(11)}  ${String(line.inputTokens).padStart(9)}  ${String(line.assumedOutputTokens).padStart(19)}  ${formatUsd(line.costUsd)}`,
    );
  }
  console.log(`\nTarget calls only:        ${formatUsd(estimate.totalTargetOnlyUsd)}`);
  console.log(`Target + judge calls:     ${formatUsd(estimate.totalWithJudgeUsd)}`);
  console.log(
    "\nOutput-token counts are documented assumptions, not measurements — see cost-estimate.ts's own header for what each is sourced from. Input-token counts are real, from the actual assembled prompts.",
  );
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const live = args.has("--live");
  const confirmed = args.has("--confirm-spend");
  const includeJudge = args.has("--judge");

  printCostEstimate();

  if (!live) {
    console.log("\nDry run only (no --live flag) — nothing was sent to the model. Re-run with --live --confirm-spend to actually run it.");
    return;
  }

  if (!confirmed) {
    console.log("\n--live was passed without --confirm-spend — refusing to spend model credit. Both flags are required together, on purpose.");
    process.exitCode = 1;
    return;
  }

  if (!isAIConfigured()) {
    console.log(
      "\nANTHROPIC_API_KEY is not set — cannot run live. Looked for it in .env.local (repo root, loaded automatically by this script) and the process environment; neither had it. If .env.local has a key and this still fails, confirm you're running via `npm run eval:ai`, not a bare `tsx scripts/run-ai-eval.ts` from a different working directory — .env.local is read relative to the process cwd. See API_SETUP.md."
    );
    process.exitCode = 1;
    return;
  }

  console.log(`\nRunning live against the real API (${includeJudge ? "target + judge calls" : "target calls only, pass --judge to also grade with the rubric"})...\n`);
  const report = await runEval(getAIProvider(), ALL_CASES, { includeJudge });

  for (const result of report.results) {
    const label = `${result.case.target}/${result.case.locale}/${result.case.fixture.id}`;
    if (result.deterministicFindings.length > 0) {
      console.log(`\n[FAIL] ${label} — ${result.deterministicFindings.length} deterministic finding(s):`);
      for (const f of result.deterministicFindings) console.log(`  - ${f.check}: "${f.evidence}"`);
    } else {
      console.log(`[ok]   ${label} — no deterministic findings`);
    }
    if (result.judge) {
      const s = result.judge.scores;
      console.log(`       rubric: specific=${s.specific} concise=${s.concise} analytical=${s.analytical} calm=${s.calm} evidenceAware=${s.evidenceAware} actionOriented=${s.actionOriented} discourage=${result.judge.discourage}`);
      console.log(`       judge notes: ${result.judge.notes}`);
    }
    if (result.postProcessingChanged) {
      console.log(`       [post-processed] resolvePlanSelfContradiction/enforceTimeBudget altered the raw plan before this was scored`);
    }
    // EvalCaseResult.responseText's own doc comment: "kept in the report so a human can
    // read what the model said" -- true of the in-memory report, false of every log saved
    // under docs/eval-runs/ so far, because this loop never printed it. Unconditional (not
    // behind another flag) so the next live run, whatever it's for, captures this as a
    // byproduct rather than needing a dedicated run just to fix the omission again.
    // Delimited on its own lines, never inline with the summary, so
    // `grep -E "concise=|\[ok\]|\[FAIL\]"` (docs/eval-runs/README.md's own documented way
    // of reading these logs) keeps matching exactly the compact lines it always has.
    console.log(`       response:\n       ---\n${result.responseText}\n       ---`);
  }

  for (const failure of report.failures) {
    console.log(`\n[ERROR] ${failure.case.target}/${failure.case.locale}/${failure.case.fixture.id} — did not complete: ${failure.message}`);
  }

  if (report.failures.length > 0) {
    console.log(
      `\n${report.failures.length} of ${ALL_CASES.length} cases did not complete. The rest are below and were still paid for — a partial report is a real report.`,
    );
  }
  console.log(`\n${report.deterministicFailureCount} of ${report.results.length} completed cases had a deterministic finding.`);
  console.log(
    `${report.postProcessingInterventionCount} of ${report.results.length} completed cases needed weekly-plan post-processing to correct the raw model output (0 is expected most runs; a rising count across runs is the "is a guardrail masking a prompt regression" signal).`,
  );
  console.log(`Actual usage this run: ${report.totalUsage.inputTokens} input tokens, ${report.totalUsage.outputTokens} output tokens.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
