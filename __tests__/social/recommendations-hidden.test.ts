import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isConnectionsEnabled, CONNECTIONS_FLAG_ENV } from "@/lib/social/connections-feature-flag";

/**
 * ============================================================================
 * writeRecommendation() must be provably unreachable while connections is off,
 * not merely correct by accident because nothing else can create an accepted
 * connection yet.
 * ============================================================================
 *
 * Found during the feature-flag enforcement audit (docs/feature-flag-enforcement-
 * audit-2026-09-05.md): writeRecommendation() requires an accepted connection
 * (checkRecommendationEligibility) but never called assertConnectionsEnabled()
 * itself — a borrowed guarantee, not a standing one (the exact pattern CEO named
 * repeatedly the same day: does a check evaluate its own precondition, or trust a
 * separate, earlier check to have already established something?). Fixed by
 * adding the call; this file pins it the same way __tests__/social/
 * connections-hidden.test.ts and __tests__/messaging/messaging-hidden.test.ts
 * already pin their own actions files — per function, not per file, since a
 * file-level "does the string appear anywhere" check would still pass with one
 * bad call site out of several.
 *
 * Scope, decided explicitly and pinned by both a positive and a negative test:
 * gated is writeRecommendation only. setRecommendationVisibility,
 * deleteRecommendation, and reportRecommendation deliberately stay ungated — each
 * only ever touches a row the caller already owns (author or recipient), and
 * since writeRecommendation is now the only path that can create one, there is
 * nothing for those three to act on while the flag is off regardless. Gating them
 * too would be redundant, not wrong, but it wasn't what was asked and isn't pinned
 * here as a requirement — if that changes, this file's negative test should change
 * with it, not silently stop matching reality.
 */

const ROOT = join(import.meta.dirname, "..", "..");
const RECOMMENDATION_ACTIONS_PATH = "app/(app)/u/[id]/recommendation-actions.ts";

/** Every exported async function name in a file, in source order. */
function exportedFunctionNames(contents: string): string[] {
  return [...contents.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
}

/** The body text of one named exported function: from its own `export async function X(`
 * to the start of the NEXT exported function (or end of file) — same technique
 * __tests__/messaging/messaging-hidden.test.ts and __tests__/social/
 * connections-hidden.test.ts already use, so a short function's fixed window can't bleed
 * into a neighboring one that happens to call the guard. */
function functionBody(contents: string, name: string, allNames: string[]): string {
  const start = contents.indexOf(`export async function ${name}(`);
  if (start === -1) throw new Error(`function "${name}" not found`);
  const laterStarts = allNames
    .filter((n) => n !== name)
    .map((n) => contents.indexOf(`export async function ${n}(`, start + 1))
    .filter((i) => i > start);
  const end = laterStarts.length > 0 ? Math.min(...laterStarts) : contents.length;
  return contents.slice(start, end);
}

describe("layer: writeRecommendation asserts the connections flag, checked per function", () => {
  const contents = readFileSync(join(ROOT, RECOMMENDATION_ACTIONS_PATH), "utf8");
  const names = exportedFunctionNames(contents);

  test("all four known mutations are still exported (a name change should fail this, not silently stop being checked)", () => {
    expect(names.sort()).toEqual(["deleteRecommendation", "reportRecommendation", "setRecommendationVisibility", "writeRecommendation"].sort());
  });

  test("writeRecommendation calls assertConnectionsEnabled() as its own first statement", () => {
    const body = functionBody(contents, "writeRecommendation", names);
    const afterSignatureLine = body.slice(body.indexOf("\n") + 1);
    const firstStatement = afterSignatureLine.trim().split("\n")[0].trim();
    expect(firstStatement).toBe("assertConnectionsEnabled();");
  });

  test.each(["setRecommendationVisibility", "deleteRecommendation", "reportRecommendation"])(
    "%s deliberately does NOT assert the flag — it only ever touches a row the caller already owns",
    (name) => {
      const body = functionBody(contents, name, names);
      expect(body).not.toContain("assertConnectionsEnabled()");
    }
  );
});

describe("layer: the connections kill switch fails closed (shared with connections/actions.ts, re-pinned here since this file now depends on it)", () => {
  test("the flag is off when unset", () => {
    expect(isConnectionsEnabled({})).toBe(false);
  });

  test("only the exact string 'true' enables it", () => {
    expect(isConnectionsEnabled({ [CONNECTIONS_FLAG_ENV]: "true" })).toBe(true);
  });
});
