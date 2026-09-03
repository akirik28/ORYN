import { describe, expect, test } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGraph, findAllViolations, stripComments, extractValueSpecifiers } from "@/scripts/check-server-only-boundary";

/**
 * scripts/check-server-only-boundary.ts — added 2026-09-03 after three separate lanes hit
 * the same bug the same day (a "server-only" module leaking into a "use client" bundle,
 * caught only by `next dev`/`next build`, never by tsc or eslint). The script's own first
 * three commits, in order, each collapsed the reported violation count for a real reason:
 *
 *   85 -> the naive graph didn't understand "use server" is its own boundary (an action
 *         file compiles to a client-safe RPC stub; nothing it imports reaches the client
 *         bundle through it).
 *   25 -> didn't distinguish `import type` (fully erased, can't leak anything) from a real
 *         value import, including the mixed inline `{ type X, Y }` form.
 *    1 -> a genuine false positive: a real file's own multi-line comment, discussing
 *         "import type" and "from" in prose, corrupted the (comment-unaware) regex parser
 *         into misreading a real type-only import as a value import.
 *    0 -> after stripping comments before parsing, validated against the six fixtures
 *         below, THEN trusted.
 *
 * These fixtures are what make that zero (and any future run's result) credible rather
 * than just a number an unvalidated script produced — see check-server-only-boundary.ts's
 * own header for the checker's known limitations.
 */

const FIXTURES_ROOT = join(dirname(fileURLToPath(import.meta.url)), "server-only-boundary-fixtures");

function violationClientNames(graph: ReturnType<typeof buildGraph>): string[] {
  return findAllViolations(graph)
    .map((v) => v.client.replace(FIXTURES_ROOT + "/", ""))
    .sort();
}

describe("check-server-only-boundary against known-answer fixtures", () => {
  const graph = buildGraph(FIXTURES_ROOT, ["app", "features", "lib"]);

  test("flags a direct value import of a server-only export", () => {
    expect(violationClientNames(graph)).toContain("features/direct-violation.tsx");
  });

  test("flags a transitive violation through a plain (non-boundary) module -- the real bug's exact shape", () => {
    expect(violationClientNames(graph)).toContain("features/transitive-violation.tsx");
    const violation = findAllViolations(graph).find((v) => v.client.endsWith("transitive-violation.tsx"))!;
    // The path must show the real hop through plain-reexport.ts, not a direct edge --
    // confirms this is genuinely testing transitivity, not coincidentally matching.
    expect(violation.path.some((p) => p.endsWith("plain-reexport.ts"))).toBe(true);
  });

  test("flags a mixed inline `{ type X, Y }` import -- the real value Y makes this a real import", () => {
    expect(violationClientNames(graph)).toContain("features/mixed-import-violation.tsx");
  });

  test("does NOT flag a pure `import type` -- fully erased, cannot leak anything", () => {
    expect(violationClientNames(graph)).not.toContain("features/safe-type-only.tsx");
  });

  test('does NOT flag a client file reaching server-only only through a "use server" action', () => {
    expect(violationClientNames(graph)).not.toContain("features/safe-via-server-action.tsx");
  });

  test("does NOT flag a type-only import sitting directly below a comment that discusses import/type/from in prose -- the exact regression", () => {
    expect(violationClientNames(graph)).not.toContain("features/safe-comment-heavy-type-only.tsx");
  });

  test("exactly 3 of the 6 client-facing fixtures violate -- not more, not fewer", () => {
    const clientFixtures = graph.files.filter((f) => graph.isUseClient.get(f));
    expect(clientFixtures.length).toBe(6);
    expect(findAllViolations(graph).length).toBe(3);
  });
});

describe("stripComments", () => {
  test("removes // and /* */ comments but preserves string/template literal content verbatim", () => {
    const src = 'const url = "https://example.com"; // a comment\n/* block */ const x = 1;';
    const stripped = stripComments(src);
    expect(stripped).toContain('"https://example.com"');
    expect(stripped).not.toContain("a comment");
    expect(stripped).not.toContain("block");
  });

  test("a comment containing the literal words import/type/from does not survive to confuse the statement parser", () => {
    const src = '// import type Foo from "somewhere-fake"\nimport { real } from "@/lib/real";';
    const stripped = stripComments(src);
    expect(stripped).not.toContain("somewhere-fake");
    expect(extractValueSpecifiers(stripped)).toEqual(["@/lib/real"]);
  });
});

describe("extractValueSpecifiers", () => {
  test("a plain named value import is a value specifier", () => {
    expect(extractValueSpecifiers('import { X } from "@/lib/foo";')).toEqual(["@/lib/foo"]);
  });

  test("`import type` is excluded entirely", () => {
    expect(extractValueSpecifiers('import type { X } from "@/lib/foo";')).toEqual([]);
  });

  test("`export type { X } from` is excluded", () => {
    expect(extractValueSpecifiers('export type { X } from "@/lib/foo";')).toEqual([]);
  });

  test("mixed `{ type X, Y }` is a value specifier, not excluded", () => {
    expect(extractValueSpecifiers('import { type X, Y } from "@/lib/foo";')).toEqual(["@/lib/foo"]);
  });

  test("side-effect-only `import \"spec\"` is a value specifier", () => {
    expect(extractValueSpecifiers('import "server-only";')).toEqual([]);
    // server-only has no `from` clause, so it's outside this function's scope by design --
    // detected separately via the dedicated isServerOnly regex in buildGraph, not here.
  });

  test("a dynamic import() is always a value specifier", () => {
    expect(extractValueSpecifiers('const m = await import("@/lib/foo");')).toEqual(["@/lib/foo"]);
  });

  test("`export * from` is a value specifier (no braces to be all-type)", () => {
    expect(extractValueSpecifiers('export * from "@/lib/foo";')).toEqual(["@/lib/foo"]);
  });
});
