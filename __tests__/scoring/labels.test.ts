import { describe, expect, test } from "vitest";
import { DIMENSION_LABELS, DIMENSION_LABELS_SHORT, DIMENSION_ORDER, dimensionLabel, dimensionLabelShort } from "@/lib/scoring/labels";

describe("dimensionLabel / dimensionLabelShort", () => {
  test("English branch matches the existing constant maps exactly, for every dimension", () => {
    for (const dimension of DIMENSION_ORDER) {
      expect(dimensionLabel(dimension, "en")).toBe(DIMENSION_LABELS[dimension]);
      expect(dimensionLabelShort(dimension, "en")).toBe(DIMENSION_LABELS_SHORT[dimension]);
    }
  });

  test("Turkish branch is distinct from English, one value per dimension, no duplicates", () => {
    const seen = new Set<string>();
    for (const dimension of DIMENSION_ORDER) {
      const label = dimensionLabel(dimension, "tr");
      expect(label).not.toBe(DIMENSION_LABELS[dimension]);
      expect(seen.has(label)).toBe(false);
      seen.add(label);
    }
  });

  test("Turkish short forms are also distinct and non-empty for every dimension", () => {
    for (const dimension of DIMENSION_ORDER) {
      const short = dimensionLabelShort(dimension, "tr");
      expect(short.length).toBeGreaterThan(0);
    }
  });

  // The exact fixed point this function exists for — lib/counselor/copy.ts used to carry
  // its own private duplicate of these same 9 Turkish names; this is the single source now.
  test("research and academics — the two names quoted across this branch's own commit messages", () => {
    expect(dimensionLabel("research", "tr")).toBe("Araştırma");
    expect(dimensionLabel("academics", "tr")).toBe("Akademik");
  });
});
