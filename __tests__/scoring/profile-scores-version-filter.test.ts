import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
function source(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

/**
 * Guards the version-tracking gap CEO found in the stale-output sweep (2026-09-02):
 * `profile_scores`' upsert keys on `(user_id, dimension, calculation_version)`
 * (lib/scoring/persist.ts) — a future version bump INSERTS fresh rows rather than
 * overwriting old ones, so any reader that doesn't filter to the current version would get
 * every dimension back twice the day a second version exists. Harmless today (verified
 * live: every profile_scores row shares one version), load-bearing the day it isn't.
 *
 * Same shape as pagination-safety.test.ts's own reasoning: this is a live-behavior property
 * a Node-side unit test can't exercise directly (there's no second version to construct),
 * so this asserts the actual fix — every one of the seven `.from("profile_scores")` reads
 * in the codebase filters on `calculation_version` — stays in place. A Node-side test CAN
 * exercise lib/admissions/staleness.ts's isOutlookStale directly (see staleness.test.ts) —
 * that one takes plain values, not a live query — this file is specifically for the seven
 * query call sites that can't be unit-tested the same way.
 */
describe("every profile_scores read filters to the current calculation_version", () => {
  const sites: { file: string; fn: string }[] = [
    { file: "lib/security/dal.ts", fn: "getProfileScores" },
    { file: "lib/opportunities/persist-matches.ts", fn: "refreshOpportunityMatches" },
    { file: "lib/counselor/state.ts", fn: "getCounselorState" },
    { file: "lib/admissions/persist.ts", fn: "refreshAdmissionOutlook" },
    { file: "lib/scoring/monthly-review.ts", fn: "getMonthlyReview" },
    { file: "lib/benchmarking/cohort.ts", fn: "getCohortDimensionScores" },
    { file: "lib/benchmarking/index.ts", fn: "getPeerBenchmarks" },
  ];

  for (const { file, fn } of sites) {
    test(`${file} (${fn})`, () => {
      const fileSource = source(file);
      expect(fileSource).toContain('from("profile_scores")');
      const fn2 = extractFunction(fileSource, fn);
      expect(fn2).toContain('.eq("calculation_version", CAREER_PROFILE_SCORE_VERSION)');
    });
  }
});

/** Same technique as pagination-safety.test.ts's own helper — duplicated rather than
 *  imported, since these two files guard unrelated bug classes and shouldn't be coupled to
 *  each other for a ~15-line utility. counselor/state.ts and admissions/persist.ts declare
 *  their scoresPromise with a `const`, not a function keyword, so the pattern covers both
 *  `export async function NAME(` and a bare `NAME(` appearing anywhere at module scope --
 *  loose on purpose; a false-positive match inside this specific, small, hand-picked file
 *  list is not a realistic risk the way it would be scanning an entire large file for an
 *  arbitrary name. */
function extractFunction(fullSource: string, name: string): string {
  // `\s*=` only (not `\s*=\s*async`) so a `cache(async (...` wrapper (lib/security/dal.ts's
  // getProfileScores) still matches -- pagination-safety.test.ts's own copy of this helper
  // doesn't need that case, since none of its five functions are cache()-wrapped.
  const startPattern = new RegExp(`(async )?function ${name}\\(|const ${name}\\s*=`);
  const startMatch = startPattern.exec(fullSource);
  if (!startMatch) throw new Error(`extractFunction: couldn't find ${name} in source`);
  const start = startMatch.index;
  const rest = fullSource.slice(start + startMatch[0].length);
  const nextTopLevel = /\n(export |async function |function |const [A-Za-z]+ = )/.exec(rest);
  const end = nextTopLevel ? start + startMatch[0].length + nextTopLevel.index : fullSource.length;
  return fullSource.slice(start, end);
}
