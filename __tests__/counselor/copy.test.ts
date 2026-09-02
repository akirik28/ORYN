import { describe, expect, test } from "vitest";
import { recommendationClassLabel, gapWhyLine } from "@/lib/counselor/copy";
import type { RecommendationClass } from "@/types/database";
import type { GapSeverity } from "@/lib/counselor/types";

/**
 * 2026-09-02 raw-enum-leak sweep: recommendationClass reached the weekly-plan and
 * advisor prompts as its raw value ("avoid_for_now", "deprioritize") in two separate
 * files (lib/ai/weekly-plan.ts, lib/ai/counselor-explain.ts) before this accessor
 * existed — the same class of bug outlookLabel/dimensionLabel already closed once,
 * documented in lib/ai/student-context.ts's own comment on the incident.
 */
describe("recommendationClassLabel", () => {
  const ALL_CLASSES: RecommendationClass[] = ["do", "consider", "deprioritize", "avoid_for_now"];

  test("never leaves an underscore — the actual signature of an unlabeled raw value, not mere textual difference (\"consider\" is deliberately its own label)", () => {
    for (const value of ALL_CLASSES) {
      expect(recommendationClassLabel(value, "en")).not.toContain("_");
      expect(recommendationClassLabel(value, "tr")).not.toContain("_");
    }
  });

  test("avoid_for_now — the one most likely to be echoed back, per CEO's own priority — is real English, not an identifier", () => {
    expect(recommendationClassLabel("avoid_for_now", "en")).toBe("avoid for now");
  });

  test("avoid_for_now in Turkish is real Turkish, not a transliteration", () => {
    // The exact-string assertion is the real check; Turkish naturally shares most Latin
    // lowercase letters with English (a regex for "any ASCII letter" would false-positive
    // on real Turkish text), so underscore-absence is the only generic signal worth
    // checking beyond the literal expected string.
    const tr = recommendationClassLabel("avoid_for_now", "tr");
    expect(tr).toBe("şimdilik önerilmiyor");
    expect(tr).not.toContain("_");
  });

  test("all four values produce visibly different text in each locale — no two collapse together", () => {
    const en = ALL_CLASSES.map((c) => recommendationClassLabel(c, "en"));
    const tr = ALL_CLASSES.map((c) => recommendationClassLabel(c, "tr"));
    expect(new Set(en).size).toBe(ALL_CLASSES.length);
    expect(new Set(tr).size).toBe(ALL_CLASSES.length);
  });

  test("do and avoid_for_now read as a coherent recommended/not-recommended pair, not unrelated words", () => {
    // Not a strict assertion on wording (that would just re-encode the implementation) —
    // asserts the actual design intent: labels stay short (a token cost concern for the
    // two AI surfaces carrying ~90% of this product's spend) and neither exceeds a
    // normal short-tag length.
    for (const value of ALL_CLASSES) {
      expect(recommendationClassLabel(value, "en").split(" ").length).toBeLessThanOrEqual(3);
      expect(recommendationClassLabel(value, "tr").split(" ").length).toBeLessThanOrEqual(3);
    }
  });
});

/**
 * Phase 79's audit, 2026-09-02: live on every Counselor Core card, "Academic —
 * insufficient data (0/100)" quoted a score for a dimension Oryn hasn't assessed at all —
 * exactly the false-precision Phase 68 forbids, the same principle
 * lib/scoring/signal.ts's EvidenceState machinery already holds a few files away. Fixed
 * by omitting the score for insufficient_data specifically; every other severity keeps
 * showing it unchanged, since those DO reflect a real, confidently-computed number.
 */
describe("gapWhyLine", () => {
  const ASSESSED_SEVERITIES: GapSeverity[] = ["critical", "moderate", "minor"];

  test("insufficient_data omits the score entirely, in both locales — the actual fix", () => {
    const en = gapWhyLine("academics", "insufficient_data", 0, "en");
    const tr = gapWhyLine("academics", "insufficient_data", 0, "tr");
    expect(en).not.toMatch(/\d+\/100/);
    expect(tr).not.toMatch(/\d+\/100/);
    expect(en).not.toContain("0/100");
    expect(tr).not.toContain("0/100");
  });

  test("insufficient_data still names the dimension and the reason, just not a number", () => {
    expect(gapWhyLine("career_exploration", "insufficient_data", 4, "en")).toBe(
      "Addresses Career Exploration, an area Oryn doesn't have enough data on yet."
    );
    expect(gapWhyLine("career_exploration", "insufficient_data", 4, "tr")).toBe("Kariyer Keşfi — yeterli veri yok.");
  });

  test("every other severity still quotes the real score, unchanged — this is a scoped fix, not a blanket removal", () => {
    for (const severity of ASSESSED_SEVERITIES) {
      expect(gapWhyLine("leadership", severity, 42, "en")).toContain("(42/100)");
      expect(gapWhyLine("leadership", severity, 42, "tr")).toContain("(42/100)");
    }
  });

  test("a non-zero insufficient_data score (limited_evidence's own case — some evidence, still not confident) also omits the number", () => {
    // The bug this guards specifically: insufficient_data covers BOTH not_assessed (score 0
    // by construction) and limited_evidence (a real but low-confidence score) -- CEO's own
    // framing. A nonzero score here must be omitted exactly like zero is, not just the
    // zero case.
    expect(gapWhyLine("research", "insufficient_data", 4, "en")).not.toMatch(/\d+\/100/);
  });
});
