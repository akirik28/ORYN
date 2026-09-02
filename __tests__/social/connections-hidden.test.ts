import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isConnectionsEnabled, assertConnectionsEnabled, CONNECTIONS_FLAG_ENV, ConnectionsDisabledError } from "@/lib/social/connections-feature-flag";

/**
 * ============================================================================
 * Connections must be provably unreachable, not merely unlinked — same standard
 * as messaging, extended the same night by the founder's own reversal.
 * ============================================================================
 *
 * __tests__/messaging/messaging-hidden.test.ts's original scope deliberately left
 * Connections ungated: CEO's ruling was that gating sendConnectionRequest/
 * respondToConnectionRequest/removeConnection or the /connections listing page risked
 * stranding a student mid-loop on a feature established as live and load-bearing for
 * app/(app)/u/[id]/page.tsx. The founder overruled that the same night: "şu anda post
 * atma, mesajlaşma, post beğenme tarzı özellikler, connection özellikleri gizli kalsın" —
 * posts, messaging, likes AND connections all stay hidden until after launch, as one
 * bundle to switch on together later. This file gates connections using the exact same
 * pattern messaging already established, per function rather than per file for the same
 * reason: a file-level "does the string appear anywhere" check would still pass with one
 * bad call site out of several.
 *
 * Scope, decided explicitly (see lib/social/connections-feature-flag.ts's own header):
 * gated is every export in connections/actions.ts, the /connections page, and the
 * connection-specific controls on /u/[id] (ConnectButton, the mutual-connections line).
 * NOT gated: /u/[id] itself, or anything else it renders — that page is a genuinely
 * separate, already-shipped feature (portfolio, skills, endorsements, recommendations)
 * that happens to also show connection controls, and Settings' "share your public
 * profile" tool depends on it staying reachable. A negative test below pins that
 * distinction too.
 */

const ROOT = join(import.meta.dirname, "..", "..");

const CONNECTIONS_ACTIONS_PATH = "app/(app)/connections/actions.ts";
const PUBLIC_PROFILE_PAGE_PATH = "app/(app)/u/[id]/page.tsx";

/** Every exported async function name in a file, in source order. */
function exportedFunctionNames(contents: string): string[] {
  return [...contents.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
}

/** The body text of one named exported function: from its own `export async function X(`
 * to the start of the NEXT exported function (or end of file). Slicing to the next export
 * boundary rather than a fixed character window rules out a false pass from a short
 * function whose window bleeds into a neighboring one that happens to call the guard —
 * same technique __tests__/messaging/messaging-hidden.test.ts already uses. */
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

describe("layer: every connections/actions.ts export asserts the flag, checked per function", () => {
  const contents = readFileSync(join(ROOT, CONNECTIONS_ACTIONS_PATH), "utf8");
  const names = exportedFunctionNames(contents);

  test("all three known mutations are still exported (a name change should fail this, not silently stop being checked)", () => {
    expect(names.sort()).toEqual(["removeConnection", "respondToConnectionRequest", "sendConnectionRequest"].sort());
  });

  test.each(exportedFunctionNames(readFileSync(join(ROOT, CONNECTIONS_ACTIONS_PATH), "utf8")))("%s calls assertConnectionsEnabled() as its own first statement", (name) => {
    const body = functionBody(contents, name, names);
    const afterSignatureLine = body.slice(body.indexOf("\n") + 1);
    const firstStatement = afterSignatureLine.trim().split("\n")[0].trim();
    expect(firstStatement, `${name}'s first statement`).toBe("assertConnectionsEnabled();");
  });
});

describe("layer: the /connections listing page guards before rendering or fetching", () => {
  test("requireConnectionsEnabled runs before requireUser", () => {
    const contents = readFileSync(join(ROOT, "app/(app)/connections/page.tsx"), "utf8");
    expect(contents).toContain("import { requireConnectionsEnabled }");
    const bodyStart = contents.indexOf("export default async function ConnectionsPage");
    const body = contents.slice(bodyStart);
    expect(body.indexOf("requireConnectionsEnabled()")).toBeLessThan(body.indexOf("requireUser()"));
  });
});

describe("layer: /u/[id]'s connection controls do not render when connections is off", () => {
  const contents = readFileSync(join(ROOT, PUBLIC_PROFILE_PAGE_PATH), "utf8");

  test("the ConnectButton's own condition includes isConnectionsEnabled()", () => {
    // A tight proximity window (not contents.lastIndexOf across the WHOLE file) on
    // purpose: this file has a second, earlier isConnectionsEnabled() check gating the
    // mutual-connections line, and a loose "does this string appear anywhere before the
    // component" search would count that earlier, unrelated condition as covering
    // ConnectButton too — caught this exact false pass while mutation-testing the fix
    // (reverted ConnectButton's own condition to `true`, and the loose version of this
    // test still passed because of the other check higher up the file).
    expect(contents).toContain("import { isConnectionsEnabled }");
    const componentIndex = contents.indexOf("<ConnectButton");
    expect(componentIndex, "the ConnectButton component must still exist").toBeGreaterThan(-1);
    const nearbyCode = contents.slice(Math.max(0, componentIndex - 200), componentIndex);
    expect(nearbyCode, "isConnectionsEnabled() must immediately gate the conditional block rendering ConnectButton").toContain("{isConnectionsEnabled()");
  });

  test("the mutual-connections line's own condition includes isConnectionsEnabled()", () => {
    const lineIndex = contents.indexOf('t("mutualConnections"');
    expect(lineIndex, "the mutualConnections translation call must still exist").toBeGreaterThan(-1);
    const precedingCode = contents.slice(0, lineIndex);
    const conditionStart = precedingCode.lastIndexOf("{isConnectionsEnabled()");
    expect(conditionStart, "isConnectionsEnabled() must gate the mutual-connections block").toBeGreaterThan(-1);
  });
});

describe("layer: the kill switch fails closed", () => {
  test("the flag is off when unset", () => {
    expect(isConnectionsEnabled({})).toBe(false);
  });

  test.each(["false", "0", "1", "yes", "on", "TRUE", "True", " true", "true ", ""])("%s does not enable connections", (value) => {
    expect(isConnectionsEnabled({ [CONNECTIONS_FLAG_ENV]: value })).toBe(false);
  });

  test("only the exact string 'true' enables it", () => {
    expect(isConnectionsEnabled({ [CONNECTIONS_FLAG_ENV]: "true" })).toBe(true);
  });

  test("assertConnectionsEnabled throws rather than returning a falsy result", () => {
    expect(() => assertConnectionsEnabled({})).toThrow(ConnectionsDisabledError);
    expect(() => assertConnectionsEnabled({ [CONNECTIONS_FLAG_ENV]: "true" })).not.toThrow();
  });

  test("the flag is server-only — never NEXT_PUBLIC_", () => {
    expect(CONNECTIONS_FLAG_ENV.startsWith("NEXT_PUBLIC_")).toBe(false);
  });

  test("the flag is absent from .env.example — not a setup knob", () => {
    expect(readFileSync(join(ROOT, ".env.example"), "utf8")).not.toContain(CONNECTIONS_FLAG_ENV);
  });

  test("uses its own flag name, distinct from messaging's", () => {
    expect(CONNECTIONS_FLAG_ENV).not.toBe("ORYN_ENABLE_MESSAGING");
  });
});

describe("negative check: /u/[id] itself, and everything it renders besides connection controls, is deliberately NOT gated", () => {
  const contents = readFileSync(join(ROOT, PUBLIC_PROFILE_PAGE_PATH), "utf8");

  test("the page component itself has no requireConnectionsEnabled call — the page still renders when connections is off", () => {
    expect(contents).not.toContain("requireConnectionsEnabled");
  });

  test("portfolio, skills, and endorsement rendering do not reference the connections flag", () => {
    // Spot-checks the specific calls this page makes for the still-live feature set —
    // a future "simplify the gating" pass folding these in would be exactly the
    // regression this test exists to catch.
    expect(contents).toContain("getPublicPortfolio");
    expect(contents).toContain("getPublicSkills");
    expect(contents).toContain("getEndorsementsForSkills");
    const portfolioCallIndex = contents.indexOf("getPublicPortfolio(");
    const nearbyCode = contents.slice(Math.max(0, portfolioCallIndex - 200), portfolioCallIndex);
    expect(nearbyCode).not.toContain("isConnectionsEnabled");
  });
});
