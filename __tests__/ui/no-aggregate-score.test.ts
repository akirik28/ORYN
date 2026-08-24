import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * The aggregate profile score must not return to student-facing UI.
 *
 * `profiles.profile_strength_score` is a mean of nine dimensions. It is still computed,
 * still stored, and still read by ranking, snapshots, benchmarking and trend logic — this
 * file does not object to any of that. What it prevents is the number being *rendered* to
 * a student again, which it was in three places: Home's header ("Career profile 69 +3 this
 * month"), the account menu, and Progress's display-type hero ("69, was 66"), plus the one
 * remaining "/100" in Progress's empty state.
 *
 * A source-level guard rather than a render test, because the failure mode is someone
 * re-adding the prop in a component that has no test of its own, and because the
 * replacement (lib/scoring/change.ts, the qualitative signal) is already covered by its own
 * unit tests. This checks the one thing those cannot: that nothing wires the figure back
 * into a page.
 */

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const STUDENT_FACING = [
  "features/dashboard/dashboard-view.tsx",
  "features/app-shell/user-menu.tsx",
  "features/profile/progress-view.tsx",
  "app/(app)/profile/page.tsx",
];

describe("student-facing surfaces do not render the aggregate score", () => {
  test.each(STUDENT_FACING)("%s does not print a score out of 100", (file) => {
    expect(read(file)).not.toMatch(/\/100/);
  });

  test("Home's header no longer carries a score or trend prop", () => {
    const src = read("features/dashboard/dashboard-view.tsx");
    expect(src).not.toMatch(/^\s*score:\s*number/m);
    expect(src).not.toMatch(/^\s*trend:\s*number/m);
    expect(src).not.toContain("Career profile <span");
  });

  test("the account menu shows a qualitative read, not a number", () => {
    const src = read("features/app-shell/user-menu.tsx");
    expect(src).not.toMatch(/^\s*score:\s*number/m);
    expect(src).toContain("signalCoverage");
  });

  test("Progress leads with movement, not with an overall figure", () => {
    const src = read("features/profile/progress-view.tsx");
    expect(src).not.toContain("Overall Career Profile");
    expect(src).not.toContain("review.overallAfter");
    expect(src).not.toContain("review.overallBefore");
    expect(src).not.toContain("review.overallDelta");
  });

  // The other half of the instruction: it stays available internally.
  test("the aggregate is still computed and still stored", () => {
    expect(read("lib/scoring/persist.ts")).toContain("profile_strength_score: careerProfile.overallScore");
    expect(read("lib/scoring/monthly-review.ts")).toContain("overallDelta");
  });

  // Removing the number must not have taken the honest bad news with it.
  test("dimension-level evidence and gaps are still shown", () => {
    const progress = read("features/profile/progress-view.tsx");
    expect(progress).toContain("dimensionDeltas");
    expect(progress).toContain("Next area to strengthen");
    const home = read("features/dashboard/dashboard-view.tsx");
    expect(home).toContain("Your clearest gap right now is");
    expect(home).toContain("No evidence yet");
  });
});
