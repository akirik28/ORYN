import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isConnectionsEnabled, CONNECTIONS_FLAG_ENV } from "@/lib/social/connections-feature-flag";

/**
 * ============================================================================
 * endorseSkill() must be provably unreachable while connections is off, not
 * merely correct by accident — same finding and same fix shape as
 * __tests__/social/recommendations-hidden.test.ts, for the sibling feature.
 * ============================================================================
 *
 * Found during the feature-flag enforcement audit (docs/feature-flag-enforcement-
 * audit-2026-09-05.md): endorseSkill() requires an accepted connection
 * (checkEndorsementEligibility) but never called assertConnectionsEnabled() itself.
 * Fixed by adding the call; pinned per function here the same way
 * __tests__/social/connections-hidden.test.ts and __tests__/messaging/
 * messaging-hidden.test.ts already pin their own actions files.
 *
 * Scope: gated is endorseSkill only. withdrawEndorsement deliberately stays
 * ungated — it only ever removes a row the caller (the endorser) already created,
 * and since endorseSkill is now the only path that can create one, there is
 * nothing for it to act on while the flag is off regardless.
 */

const ROOT = join(import.meta.dirname, "..", "..");
const ENDORSEMENT_ACTIONS_PATH = "app/(app)/u/[id]/endorsement-actions.ts";

/** Every exported async function name in a file, in source order. */
function exportedFunctionNames(contents: string): string[] {
  return [...contents.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
}

/** The body text of one named exported function, sliced to the next export boundary —
 * same technique the messaging/connections/recommendations hidden-tests already use. */
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

describe("layer: endorseSkill asserts the connections flag, checked per function", () => {
  const contents = readFileSync(join(ROOT, ENDORSEMENT_ACTIONS_PATH), "utf8");
  const names = exportedFunctionNames(contents);

  test("both known mutations are still exported (a name change should fail this, not silently stop being checked)", () => {
    expect(names.sort()).toEqual(["endorseSkill", "withdrawEndorsement"].sort());
  });

  test("endorseSkill calls assertConnectionsEnabled() as its own first statement", () => {
    const body = functionBody(contents, "endorseSkill", names);
    const afterSignatureLine = body.slice(body.indexOf("\n") + 1);
    const firstStatement = afterSignatureLine.trim().split("\n")[0].trim();
    expect(firstStatement).toBe("assertConnectionsEnabled();");
  });

  test("withdrawEndorsement deliberately does NOT assert the flag — it only ever removes a row the caller already created", () => {
    const body = functionBody(contents, "withdrawEndorsement", names);
    expect(body).not.toContain("assertConnectionsEnabled()");
  });
});

describe("layer: the connections kill switch fails closed (shared with connections/actions.ts, re-pinned here since this file now depends on it)", () => {
  test("the flag is off when unset", () => {
    expect(isConnectionsEnabled({})).toBe(false);
  });

  test("only the exact string 'true' enables it", () => {
    expect(isConnectionsEnabled({ [CONNECTIONS_FLAG_ENV]: "true" })).toBe(true);
  });
});
