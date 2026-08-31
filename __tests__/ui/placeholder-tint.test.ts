import { describe, test, expect } from "vitest";
import { placeholderTint, PLACEHOLDER_TINT_COUNT } from "@/lib/ui/placeholder-tint";

/**
 * The tint has to be derived rather than stored or rolled, and the two ways that goes wrong
 * are both silent: a non-deterministic pick produces a React hydration mismatch and a card
 * that changes colour as you navigate, and a poorly-distributed hash produces a page where
 * every card somehow lands on the same tint — which looks exactly like the single-wash bug
 * this replaced.
 */

describe("placeholderTint", () => {
  test("is deterministic — the same key always gives the same tint", () => {
    const key = "b4091e25-c8ca-4042-9976-ee41ae4031d5";
    const first = placeholderTint(key);
    for (let i = 0; i < 50; i += 1) {
      expect(placeholderTint(key)).toBe(first);
    }
  });

  test("always returns a tint that app/globals.css actually defines", () => {
    for (const key of ["", "a", "opportunity", "b4091e25-c8ca-4042-9976-ee41ae4031d5", "İTÜ Tasarım Atölyesi"]) {
      const tint = placeholderTint(key);
      expect(Number.isInteger(tint)).toBe(true);
      expect(tint).toBeGreaterThanOrEqual(0);
      expect(tint).toBeLessThan(PLACEHOLDER_TINT_COUNT);
    }
  });

  test("a missing key is ordinary, not an error", () => {
    expect(placeholderTint(null)).toBe(0);
    expect(placeholderTint(undefined)).toBe(0);
    expect(placeholderTint("")).toBe(0);
  });

  test("UUIDs sharing a long prefix still separate — the realistic failure mode", () => {
    // Sequential/prefixed ids are exactly what a weak hash collapses. If this ever regresses,
    // a grid of same-batch rows goes back to looking like one repeated card.
    const shared = "b4091e25-c8ca-4042-9976-ee41ae4031";
    const tints = new Set(["a0", "b1", "c2", "d3", "e4", "f5", "06", "17"].map((s) => placeholderTint(shared + s)));
    expect(tints.size).toBeGreaterThan(1);
  });

  test("spreads across the full palette over a realistic corpus", () => {
    // 276 keys is the live active-opportunity count. Every tint should appear, and no single
    // one should swallow a third of the grid.
    const counts = new Array(PLACEHOLDER_TINT_COUNT).fill(0);
    for (let i = 0; i < 276; i += 1) {
      counts[placeholderTint(`opportunity-row-${i}-${i * 7919}`)] += 1;
    }
    expect(counts.every((n) => n > 0)).toBe(true);
    expect(Math.max(...counts)).toBeLessThan(276 / 3);
  });
});
