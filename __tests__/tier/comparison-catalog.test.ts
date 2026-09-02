import { describe, expect, test } from "vitest";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";
import { TIER_COMPARISON_ROWS } from "@/lib/tier/comparison";

/**
 * `PlanTierView` reads `settings.plan.comparison.<id>.*` via a dynamic key
 * (`t(\`comparison.${row.id}.label\`)`) — the same shape `translation-keys.test.ts`'s own
 * documented scope excludes by design (`t(\`x.${y}\`)`, "not really fixable by this kind of
 * guard... needs type-aware resolution"). That check is correct to skip it; this file exists
 * specifically to cover the one thing it can't: whether `TIER_COMPARISON_ROWS` and both
 * catalogs actually agree, so a row added to the array without matching catalog entries (or
 * vice versa) fails loudly here instead of rendering a literal `comparison.xyz.label` string
 * on a real page.
 */

type Catalog = Record<string, unknown>;

function comparisonEntries(catalog: Catalog): Record<string, unknown> {
  const settings = catalog.settings as Catalog | undefined;
  const plan = settings?.plan as Catalog | undefined;
  const comparison = plan?.comparison as Catalog | undefined;
  return comparison ?? {};
}

describe("TIER_COMPARISON_ROWS stays in sync with both message catalogs", () => {
  const enComparison = comparisonEntries(en);
  const trComparison = comparisonEntries(tr);

  test("finds at least the rows this file was written against (guards against the array or the catalog path silently going empty)", () => {
    expect(TIER_COMPARISON_ROWS.length).toBeGreaterThanOrEqual(3);
  });

  test.each(TIER_COMPARISON_ROWS)("$id has a label in both catalogs", (row) => {
    expect(typeof (enComparison[row.id] as Catalog | undefined)?.label).toBe("string");
    expect(typeof (trComparison[row.id] as Catalog | undefined)?.label).toBe("string");
  });

  test.each(TIER_COMPARISON_ROWS.filter((r) => r.kind === "differs"))("$id (differs) has standard and ultra values in both catalogs", (row) => {
    for (const catalog of [enComparison, trComparison]) {
      const entry = catalog[row.id] as Catalog | undefined;
      expect(typeof entry?.standard).toBe("string");
      expect(typeof entry?.ultra).toBe("string");
      // A sameByDesign row's dedicated "same" key must not leak onto a normal row -- that
      // would mean PlanTierView's branch picked the wrong shape for it.
      expect(entry?.same).toBeUndefined();
    }
  });

  test.each(TIER_COMPARISON_ROWS.filter((r) => r.kind === "sameByDesign"))("$id (sameByDesign) has a single shared value in both catalogs, not standard/ultra", (row) => {
    for (const catalog of [enComparison, trComparison]) {
      const entry = catalog[row.id] as Catalog | undefined;
      expect(typeof entry?.same).toBe("string");
      // The inverse of the check above: a sameByDesign row rendering .standard/.ultra
      // instead of .same would silently produce two empty cells (t() falls back to the
      // raw key), not a visible error.
      expect(entry?.standard).toBeUndefined();
      expect(entry?.ultra).toBeUndefined();
    }
  });

  test("no catalog entry is an orphan -- every comparison key in each catalog corresponds to a real row", () => {
    for (const catalog of [enComparison, trComparison]) {
      expect(Object.keys(catalog).sort()).toEqual(TIER_COMPARISON_ROWS.map((r) => r.id).sort());
    }
  });
});
