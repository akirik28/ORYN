import { describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Regression coverage for the bug oryn-a7 found running the harness live for the first time
 * (2026-09-01): a real ANTHROPIC_API_KEY sitting in .env.local was never loaded, so
 * `--live --confirm-spend` hit "ANTHROPIC_API_KEY is not set" and exited 1 even with a
 * perfectly good key on disk.
 *
 * The valuable assertion here is not "does process.loadEnvFile get called" (a mock-call
 * check would have passed on the very code that shipped broken -- the call existed, in the
 * wrong module-evaluation order relative to @/lib/env's own module-scope reads). It's that
 * the actual gated CLI entry point, spawned as a real child process the way `npm run eval:ai`
 * spawns it, reaches PAST `isAIConfigured()` when a key exists only in .env.local and nowhere
 * else in the environment.
 *
 * Network-safe by construction, not by promise: ANTHROPIC_BASE_URL is redirected to
 * 127.0.0.1:1 (a port nothing listens on), which the Anthropic SDK reads as its own default
 * base URL (see node_modules/@anthropic-ai/sdk/client.js) ahead of the real api.anthropic.com
 * default. The process reaching past the gate then fails with a local connection error before
 * any request leaves the machine -- confirmed by hand before writing this test (see the PR
 * description / commit message for the manual run's output). This is the "or is stubbed"
 * option from the brief, applied at the network layer rather than by mocking the SDK, which
 * exercises strictly more of the real code path for the same safety guarantee.
 *
 * A fresh temp directory (not this repo's own .env.local) is both the isolation mechanism and
 * part of what's under test: .env.local is read relative to process.cwd() by design, and a
 * key that only works when the CLI happens to be launched from the repo root would be exactly
 * as fragile as the bug this pins.
 */

const TSX_BIN = join(process.cwd(), "node_modules", ".bin", "tsx");
const TSCONFIG = join(process.cwd(), "tsconfig.eval-cli.json");
const SCRIPT = join(process.cwd(), "scripts", "run-ai-eval.ts");
const UNREACHABLE_BASE_URL = "http://127.0.0.1:1";
// 60s, not 20s. This spawns a real subprocess that type-checks and runs a CLI, and the
// whole file takes ~17s on an IDLE machine -- so at 20s it had almost no headroom, and under
// concurrent load the spawn timed out, returned no output, and the assertion then failed on
// an empty string rather than on anything about the code. Raised 2026-09-02 after it took
// down a merge gate that way. A test whose result depends on what else the machine is doing
// makes every gate it sits in unreadable.
const SPAWN_TIMEOUT_MS = 60_000;

function runCli(cwd: string, extraEnv: Record<string, string | undefined>): { stdout: string; stderr: string; status: number | null } {
  const env = { ...process.env, ...extraEnv };
  delete env.ANTHROPIC_API_KEY; // isolate: the only key must come from this test's own .env.local (or explicitly none)
  const result = spawnSync(TSX_BIN, ["--tsconfig", TSCONFIG, SCRIPT, "--live", "--confirm-spend"], {
    cwd,
    env,
    encoding: "utf-8",
    timeout: SPAWN_TIMEOUT_MS,
  });
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "", status: result.status };
}

describe("scripts/run-ai-eval.ts loads .env.local before the isAIConfigured gate", () => {
  test(
    "a key present only in .env.local (not the inherited environment) reaches past the gate",
    { timeout: SPAWN_TIMEOUT_MS + 10_000 },
    () => {
      const dir = mkdtempSync(join(tmpdir(), "oryn-eval-cli-test-"));
      try {
        writeFileSync(join(dir, ".env.local"), "ANTHROPIC_API_KEY=sk-ant-test-dummy-not-a-real-key\n");
        const { stdout, stderr } = runCli(dir, { ANTHROPIC_BASE_URL: UNREACHABLE_BASE_URL });
        const combined = stdout + stderr;

        expect(combined).toContain("Running live against the real API");
        expect(combined).not.toContain("ANTHROPIC_API_KEY is not set");
        // The dummy key must never reach a real endpoint — this is the network-safety half
        // of the test, not just the gate-passing half. A connection error against the
        // redirected port is expected and correct; a successful model response would mean
        // this test accidentally spent real credit against a real key, which must never
        // happen here.
        expect(combined).toMatch(/APIConnectionError|ECONNREFUSED|Connection error/);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  );

  test("no .env.local and no key in the environment: still refuses with the (improved) message, not a crash", { timeout: SPAWN_TIMEOUT_MS + 10_000 }, () => {
    const dir = mkdtempSync(join(tmpdir(), "oryn-eval-cli-test-"));
    try {
      const { stdout, stderr, status } = runCli(dir, {});
      const combined = stdout + stderr;
      expect(combined).toContain("ANTHROPIC_API_KEY is not set");
      expect(combined).toContain(".env.local");
      expect(combined).not.toContain("Running live against the real API");
      expect(status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
