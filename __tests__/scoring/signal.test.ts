import { describe, expect, test } from "vitest";
import {
  buildProfileSignal,
  canClaimGap,
  evidenceStateFor,
  hasConfidentSignal,
  signalStateFor,
  EVIDENCE_STATE_LABELS,
} from "@/lib/scoring/signal";
import type { DataConfidence, ProfileDimension } from "@/types/database";

describe("evidenceStateFor", () => {
  test("bands a confident score", () => {
    expect(evidenceStateFor(85, "high")).toBe("strong");
    expect(evidenceStateFor(55, "high")).toBe("developing");
    expect(evidenceStateFor(20, "high")).toBe("needs_attention");
  });

  test("band boundaries are inclusive at the lower edge", () => {
    expect(evidenceStateFor(70, "high")).toBe("strong");
    expect(evidenceStateFor(69, "high")).toBe("developing");
    expect(evidenceStateFor(40, "high")).toBe("developing");
    expect(evidenceStateFor(39, "high")).toBe("needs_attention");
  });

  test("medium confidence still bands by score", () => {
    expect(evidenceStateFor(85, "medium")).toBe("strong");
    expect(evidenceStateFor(10, "medium")).toBe("needs_attention");
  });

  // The behaviour this module exists for: a dimension Oryn knows little about must not be
  // reported as weak. Low confidence wins over every band, including a high score.
  test("low confidence reports limited evidence, never a judgement", () => {
    expect(evidenceStateFor(0, "low")).toBe("limited_evidence");
    expect(evidenceStateFor(35, "low")).toBe("limited_evidence");
    expect(evidenceStateFor(95, "low")).toBe("limited_evidence");
  });

  test("a zero score is only 'needs attention' when Oryn is confident about it", () => {
    expect(evidenceStateFor(0, "low")).toBe("limited_evidence");
    expect(evidenceStateFor(0, "high")).toBe("needs_attention");
  });
});

describe("buildProfileSignal", () => {
  function row(dimension: ProfileDimension, score: number, confidence: DataConfidence = "high") {
    return { dimension, score, confidence };
  }

  test("orders strong first and limited-evidence last", () => {
    const signal = buildProfileSignal([
      row("research", 20),
      row("academics", 88),
      row("leadership", 55),
      row("entrepreneurship", 90, "low"),
    ]);
    expect(signal.map((s) => s.dimension)).toEqual([
      "academics",
      "leadership",
      "research",
      "entrepreneurship",
    ]);
  });

  test("ties within a state fall back to score, highest first", () => {
    const signal = buildProfileSignal([row("research", 72), row("academics", 95), row("leadership", 80)]);
    expect(signal.map((s) => s.dimension)).toEqual(["academics", "leadership", "research"]);
  });

  test("keeps the underlying score and confidence for downstream views", () => {
    const [first] = buildProfileSignal([row("academics", 88, "medium")]);
    expect(first).toMatchObject({ dimension: "academics", score: 88, confidence: "medium", state: "strong" });
  });

  test("empty input yields an empty signal rather than throwing", () => {
    expect(buildProfileSignal([])).toEqual([]);
  });

  test("every state has a human label", () => {
    for (const state of ["strong", "developing", "limited_evidence", "needs_attention"] as const) {
      expect(EVIDENCE_STATE_LABELS[state]).toBeTruthy();
    }
  });
});

describe("honesty guards", () => {
  function row(dimension: ProfileDimension, score: number, confidence: DataConfidence = "high") {
    return { dimension, score, confidence };
  }

  test("an entirely unscored profile supports no confident claim", () => {
    const signal = buildProfileSignal([
      row("academics", 0, "low"),
      row("research", 0, "low"),
      row("leadership", 0, "low"),
    ]);
    expect(hasConfidentSignal(signal)).toBe(false);
    // The exact case caught live: the gap ranker still returns `academics`, and the
    // headline must not repeat it as a finding.
    expect(canClaimGap(signal, "academics")).toBe(false);
  });

  test("one confident dimension is enough to have a read on the profile", () => {
    const signal = buildProfileSignal([row("academics", 80, "high"), row("research", 0, "low")]);
    expect(hasConfidentSignal(signal)).toBe(true);
  });

  test("but a gap still can't be named in the dimension that is itself unknown", () => {
    const signal = buildProfileSignal([row("academics", 80, "high"), row("research", 0, "low")]);
    expect(canClaimGap(signal, "research")).toBe(false);
    expect(canClaimGap(signal, "academics")).toBe(true);
  });

  test("a genuinely weak, confidently-measured dimension can be named", () => {
    const signal = buildProfileSignal([row("academics", 85, "high"), row("research", 18, "high")]);
    expect(canClaimGap(signal, "research")).toBe(true);
  });

  test("an empty signal supports nothing", () => {
    expect(hasConfidentSignal([])).toBe(false);
    expect(canClaimGap([], "research")).toBe(false);
    expect(signalStateFor([], "research")).toBeNull();
  });
});
