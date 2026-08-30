import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
function source(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

/**
 * Guards the two live bugs this build found and fixed, both variations on the same failure
 * mode: PostgREST silently caps an unpaginated `.select()` at 1000 rows, and this project is
 * already past that on `universities` (1019) and close to it on `university_rankings` (1009).
 *
 *  1. app/(app)/universities/page.tsx's Ranking-sort path used to build its id scope with a
 *     bare `.select("id")` — no `.range()`. For the default "World" view (no country filter),
 *     that silently truncated the id list at 1000. The 700-vs-1000+ gap alone was quiet, but
 *     see #2: the truncated list then broke the query outright, not just undercounted it.
 *
 *  2. That truncated ~1000-id list was then passed to `.in("university_id", scopedIds)`. A
 *     live test against this project during this build showed `.in()` itself starts failing
 *     (Bad Request, or a bare "fetch failed") somewhere around 400-700 uuids in the list — so
 *     the default "World" + "QS Ranking" view (the landing state of this whole page) was
 *     returning ZERO results in production before this fix, not just an incomplete list.
 *
 * These are genuinely DB-behavior bugs a Node-side unit test can't reproduce (no live
 * PostgREST to hit here). What a test CAN do is assert the actual fix stays in place: the
 * code that reads a potentially-large table paginates (`.range(`), and nothing builds a
 * `.in("...", [...])` filter from a scope-sized id array — the id-intersection path exists
 * specifically so the only `.in()` calls left are bounded to a single page (<=48).
 *
 * Both guarded paths moved 2026-08-31 out of the page and into
 * lib/universities/browse-page.ts's `loadUniversityBrowsePage`, so the page and the
 * infinite-scroll Server Action share one implementation. The former `getScopedRows` and
 * `fetchViaIdIntersection` are now inlined branches of that one function, so the assertions
 * below scope to it rather than to two separate names — the bug class being guarded is
 * unchanged.
 */
describe("universities explorer never repeats the 1000-row / large-.in() bug class", () => {
  const browsePage = source("lib/universities/browse-page.ts");
  const queries = source("lib/universities/queries.ts");

  test("the scoped-rows read paginates with .range() rather than a single unbounded select", () => {
    const fn = extractFunction(browsePage, "loadUniversityBrowsePage");
    expect(fn).toContain(".range(");
    // The count check is the other half of the fix: a short read must fail loudly rather
    // than silently return fewer universities than the server holds.
    expect(fn).toContain("Refusing to return a partial result");
  });

  test("getUniversityCountByCountry paginates with .range()", () => {
    expect(extractFunction(queries, "getUniversityCountByCountry")).toContain(".range(");
  });

  test("getAllCostOfAttendance paginates with .range()", () => {
    expect(extractFunction(queries, "getAllCostOfAttendance")).toContain(".range(");
  });

  test("getAllQsListPositions paginates with .range()", () => {
    expect(extractFunction(queries, "getAllQsListPositions")).toContain(".range(");
  });

  test("the id-intersection path only calls .in(\"id\", ...) against a page-sized slice, never a full scope array", () => {
    const fn = extractFunction(browsePage, "loadUniversityBrowsePage");
    // The one `.in("id", ...)` left in this path must read from `pageIds` (already sliced to
    // one page), never from the full `scopedRows`/`matched`/`ordered` arrays directly.
    expect(fn).toContain('.in("id", pageIds)');
    expect(fn).not.toMatch(/\.in\("id",\s*(scopedRows|matched|ordered)/);
  });
});

/** Pulls one top-level function's source (by name) out of a file for a scoped assertion,
 * rather than asserting against the whole file — so this test fails on the function that
 * actually regressed, not on an unrelated `.range(` appearing anywhere else in a large page
 * file. Matches from the function's declaration to the next top-level declaration at column 0,
 * which is good enough for this file's consistent formatting without needing a real parser. */
function extractFunction(fullSource: string, name: string): string {
  const startPattern = new RegExp(`(async )?function ${name}\\(|const ${name}\\s*=\\s*async`);
  const startMatch = startPattern.exec(fullSource);
  if (!startMatch) throw new Error(`extractFunction: couldn't find ${name} in source`);
  const start = startMatch.index;
  const rest = fullSource.slice(start + startMatch[0].length);
  const nextTopLevel = /\n(export |async function |function |const [A-Za-z]+ = )/.exec(rest);
  const end = nextTopLevel ? start + startMatch[0].length + nextTopLevel.index : fullSource.length;
  return fullSource.slice(start, end);
}
