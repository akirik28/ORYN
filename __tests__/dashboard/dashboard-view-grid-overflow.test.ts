import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * FIXED 2026-09-02 (docs/mobile-responsiveness-audit-2026-09-02.md,
 * docs/dashboard-grid-overflow-fix-2026-09-02.md): the "University Outlook" and
 * "Opportunities" grid on the dashboard had no base `grid-cols-1` and neither section set
 * `min-w-0`, so below `md` both refused to shrink below their content's intrinsic width --
 * confirmed live, 473px inside a 343px container at 375px, worse at 320px, no scrollbar to
 * reach the clipped ~26-32%.
 *
 * WHAT THIS FILE ACTUALLY PROVES, STATED PLAINLY: that the specific classes this fix
 * depends on are present in the source. A className string is not a layout measurement --
 * Tailwind generating the expected CSS for `min-w-0`/`grid-cols-1`, the cascade resolving
 * them the intended way against `md:grid-cols-2`, and the actual rendered width, are none of
 * them things a source-text assertion can see. This test's only honest job is to catch an
 * accidental revert (someone deletes `min-w-0` while touching this section for an unrelated
 * reason) with a fast, specific failure, not to stand in for having measured the real page.
 *
 * THE REAL PROOF is the live measurement, not this file. Verified against a production
 * build (`next start`, not `next dev` -- no HMR in the way of the reading) via
 * `getBoundingClientRect()` on the actual rendered DOM:
 *
 *   320px:  glass-card-offset2 288px, glass-card 288px  (were 473px/473px, both broken)
 *   375px:  glass-card-offset2 343px, glass-card 343px  (were 473px/473px, both broken)
 *   768px:  glass-card-offset2 336px, glass-card 336px  (unchanged from before the fix)
 *   1280px: glass-card-offset2 414px, glass-card 414px  (unchanged from before the fix)
 *
 * See the fix's own comment in dashboard-view.tsx for the same numbers in context.
 */

function src(relPath: string): string {
  return readFileSync(join(import.meta.dirname, "..", "..", relPath), "utf8");
}

describe("dashboard-view.tsx — the University Outlook / Opportunities grid stays shrinkable below md", () => {
  const source = src("features/dashboard/dashboard-view.tsx");

  test("the grid wrapper declares an explicit single-column base, not implicit auto-sizing", () => {
    expect(source).toContain('className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-8"');
  });

  test("the University Outlook section can shrink below its content's intrinsic width", () => {
    expect(source).toContain('className="glass-card-offset2 min-w-0 p-6"');
  });

  test("the Opportunities section can shrink below its content's intrinsic width", () => {
    expect(source).toContain('className="glass-card min-w-0 p-6"');
  });
});
