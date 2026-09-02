import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isMessagingEnabled, assertMessagingEnabled, MESSAGING_FLAG_ENV, MessagingDisabledError } from "@/lib/messaging/messaging-feature-flag";

/**
 * ============================================================================
 * Messaging must be provably unreachable, not merely unlinked — same standard
 * as the social layer, applied to a feature whose tables are already live.
 * ============================================================================
 *
 * docs/migration-0058-social-layer-audit-2026-09-02.md found that 1:1 messaging was hidden
 * from navigation only (features/app-shell/nav-items.ts) while its tables, routes, and
 * Server Actions were all already applied and reachable by anyone who typed the URL —
 * an incomplete implementation of the founder's already-made decision (AGENTS.md §12: "do
 * not build public student messaging in V1"; Phase 54's do-not-build list), not a new one.
 * This file asserts the fix mechanically, per function rather than per file: the social
 * layer's own equivalent test (__tests__/social/posts-hidden.test.ts) only checks that
 * "assertSocialFeedEnabled" appears somewhere in a module, which would still pass if only
 * one of several exported functions actually called it. Checked that gap by hand while
 * building this (paired every ForUser-core/wrapper split in lib/social/post-actions.ts) —
 * this test enumerates every export and checks each one individually instead.
 *
 * Scope, decided explicitly (see lib/messaging/messaging-feature-flag.ts's own header for
 * the full reasoning): gated here is 1:1 messaging only. sendConnectionRequest,
 * respondToConnectionRequest, removeConnection, and the /connections listing page are
 * deliberately NOT gated — Connections is load-bearing for the already-shipped /u/[id]
 * page. A negative test below pins that too, so a future "helpful" refactor that folds
 * connections into the same guard fails loudly instead of silently stranding that feature.
 */

const ROOT = join(import.meta.dirname, "..", "..");

const MESSAGING_ACTIONS_PATH = "app/(app)/messages/actions.ts";
const CONNECTIONS_ACTIONS_PATH = "app/(app)/connections/actions.ts";

/** Every exported async function name in a file, in source order. */
function exportedFunctionNames(contents: string): string[] {
  return [...contents.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
}

/** The body text of one named exported function: from its own `export async function X(`
 * to the start of the NEXT exported function (or end of file). Slicing to the next export
 * boundary rather than a fixed character window (the pattern __tests__/social/
 * posts-hidden.test.ts uses for its one per-function check) rules out a false pass from a
 * short function whose fixed window bleeds into a neighboring one that happens to call the
 * guard. */
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

describe("layer: nothing links to messaging", () => {
  test("navigation carries no messaging entry", () => {
    const nav = readFileSync(join(ROOT, "features/app-shell/nav-items.ts"), "utf8");
    const hrefs = [...nav.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).not.toMatch(/^\/messages/);
    }
  });

  test("the nav comment explaining why messaging is hidden stays in place", () => {
    const nav = readFileSync(join(ROOT, "features/app-shell/nav-items.ts"), "utf8");
    expect(nav).toContain("student-to-student messaging");
    expect(nav).toContain("Phase 54");
  });
});

describe("layer: every messages/actions.ts export asserts the flag, checked per function", () => {
  const contents = readFileSync(join(ROOT, MESSAGING_ACTIONS_PATH), "utf8");
  const names = exportedFunctionNames(contents);

  test("at least the five known mutations are still exported (a name change should fail this, not silently stop being checked)", () => {
    expect(names.sort()).toEqual(["blockUser", "markConversationRead", "reportMessage", "sendMessage", "unblockUser"].sort());
  });

  test.each(exportedFunctionNames(readFileSync(join(ROOT, MESSAGING_ACTIONS_PATH), "utf8")))("%s calls assertMessagingEnabled() as its own first statement", (name) => {
    const body = functionBody(contents, name, names);
    // The signature line ends in `{` (possibly after a `Promise<{ ... }>` return type,
    // which has its OWN `{` earlier on the same line — indexOf("{") would find that one
    // instead of the body's, so this skips the whole first line rather than hunting for
    // the "right" brace on it).
    const afterSignatureLine = body.slice(body.indexOf("\n") + 1);
    const firstStatement = afterSignatureLine.trim().split("\n")[0].trim();
    expect(firstStatement, `${name}'s first statement`).toBe("assertMessagingEnabled();");
  });
});

describe("layer: both messaging pages guard before rendering or fetching", () => {
  test("the conversation list page calls requireMessagingEnabled before requireUser", () => {
    const contents = readFileSync(join(ROOT, "app/(app)/messages/page.tsx"), "utf8");
    expect(contents).toContain("import { requireMessagingEnabled }");
    const bodyStart = contents.indexOf("export default async function MessagesPage");
    const body = contents.slice(bodyStart);
    expect(body.indexOf("requireMessagingEnabled()")).toBeLessThan(body.indexOf("requireUser()"));
  });

  test("the conversation page guards both generateMetadata and the page component", () => {
    const contents = readFileSync(join(ROOT, "app/(app)/messages/[userId]/page.tsx"), "utf8");
    const metadataBody = contents.slice(contents.indexOf("export async function generateMetadata"), contents.indexOf("export default async function"));
    expect(metadataBody, "generateMetadata must guard before it queries the other user's name").toContain("requireMessagingEnabled()");
    const pageBody = contents.slice(contents.indexOf("export default async function ConversationPage"));
    expect(pageBody.indexOf("requireMessagingEnabled()")).toBeLessThan(pageBody.indexOf("requireUser()"));
  });
});

describe("layer: /u/[id]'s Message link does not render when messaging is off", () => {
  test("the Message button's own condition includes isMessagingEnabled()", () => {
    const contents = readFileSync(join(ROOT, "app/(app)/u/[id]/page.tsx"), "utf8");
    expect(contents).toContain("import { isMessagingEnabled }");
    // The exact conditional guarding the /messages/[id] Link — anchored on the href it
    // points at, not on surrounding formatting, so a wrap/reflow doesn't break this test.
    const linkIndex = contents.indexOf("href={`/messages/${id}`}");
    expect(linkIndex, "the Message link (href=/messages/${id}) must still exist").toBeGreaterThan(-1);
    const precedingCode = contents.slice(0, linkIndex);
    const conditionStart = precedingCode.lastIndexOf("{isMessagingEnabled()");
    expect(conditionStart, "isMessagingEnabled() must gate the same conditional block that renders the Message link").toBeGreaterThan(-1);
  });
});

describe("layer: the kill switch fails closed", () => {
  test("the flag is off when unset", () => {
    expect(isMessagingEnabled({})).toBe(false);
  });

  test.each(["false", "0", "1", "yes", "on", "TRUE", "True", " true", "true ", ""])("%s does not enable messaging", (value) => {
    expect(isMessagingEnabled({ [MESSAGING_FLAG_ENV]: value })).toBe(false);
  });

  test("only the exact string 'true' enables it", () => {
    expect(isMessagingEnabled({ [MESSAGING_FLAG_ENV]: "true" })).toBe(true);
  });

  test("assertMessagingEnabled throws rather than returning a falsy result", () => {
    expect(() => assertMessagingEnabled({})).toThrow(MessagingDisabledError);
    expect(() => assertMessagingEnabled({ [MESSAGING_FLAG_ENV]: "true" })).not.toThrow();
  });

  test("the flag is server-only — never NEXT_PUBLIC_", () => {
    expect(MESSAGING_FLAG_ENV.startsWith("NEXT_PUBLIC_")).toBe(false);
  });

  test("the flag is absent from .env.example — not a setup knob", () => {
    expect(readFileSync(join(ROOT, ".env.example"), "utf8")).not.toContain(MESSAGING_FLAG_ENV);
  });
});

// Updated 2026-09-02: this block originally asserted that Connections was deliberately
// NOT gated by this flag — CEO's ruling at the time, to protect a loop established as
// live and load-bearing. The founder overruled that the same night: connections is now
// gated too, by its own flag (lib/social/connections-feature-flag.ts,
// __tests__/social/connections-hidden.test.ts has the full per-function coverage). This
// block is not deleted — its actual, narrower point still holds and is worth pinning
// deliberately rather than by omission: the two features have SEPARATE flags, not one
// shared switch, because CEO's instruction was "one switch family, consistent shape", not
// "one switch". If a future change folds them into a single flag, that's a real decision
// to make on purpose, not something that should happen by a well-intentioned refactor.
describe("Connections has its own flag, deliberately separate from this one", () => {
  test("connections/actions.ts references its own flag, not this one", () => {
    const contents = readFileSync(join(ROOT, CONNECTIONS_ACTIONS_PATH), "utf8");
    expect(contents).toContain("connections-feature-flag");
    expect(contents).not.toContain("messaging-feature-flag");
    expect(contents).not.toContain("assertMessagingEnabled");
  });

  test("the /connections listing page references its own flag, not this one", () => {
    const contents = readFileSync(join(ROOT, "app/(app)/connections/page.tsx"), "utf8");
    expect(contents).toContain("connections-feature-flag");
    expect(contents).not.toContain("messaging-feature-flag");
  });
});
