import { describe, expect, test } from "vitest";
import {
  buildProfileSignal,
  canClaimGap,
  evidenceStateFor,
  evidenceStateLabel,
  evidenceStateShortLabel,
  hasConfidentSignal,
  isAssessed,
  signalCoverage,
  signalStateFor,
  EVIDENCE_STATE_LABELS,
  EVIDENCE_STATE_SHORT_LABELS,
  type DimensionScoreRow,
  type EvidenceState,
} from "@/lib/scoring/signal";
import type { DataConfidence, ProfileDimension } from "@/types/database";

/** A dimension that produced reason codes — i.e. it actually found records to score. */
const WITH_EVIDENCE = true;
const NO_EVIDENCE = false;

describe("evidenceStateFor", () => {
  test("bands a confidently-assessed dimension", () => {
    expect(evidenceStateFor(85, "high", WITH_EVIDENCE)).toBe("strong");
    expect(evidenceStateFor(55, "high", WITH_EVIDENCE)).toBe("developing");
    expect(evidenceStateFor(20, "high", WITH_EVIDENCE)).toBe("emerging");
  });

  test("band boundaries are inclusive at the lower edge", () => {
    expect(evidenceStateFor(70, "high", WITH_EVIDENCE)).toBe("strong");
    expect(evidenceStateFor(69, "high", WITH_EVIDENCE)).toBe("developing");
    expect(evidenceStateFor(40, "high", WITH_EVIDENCE)).toBe("developing");
    expect(evidenceStateFor(39, "high", WITH_EVIDENCE)).toBe("emerging");
  });

  // The core fix. A dimension with no records scores 0 by construction; reporting that 0
  // as weakness is the thing that made a 90%-complete profile look like a failing one.
  test("no records is never reported as weakness, whatever the score says", () => {
    expect(evidenceStateFor(0, "low", NO_EVIDENCE)).toBe("not_assessed");
    expect(evidenceStateFor(0, "high", NO_EVIDENCE)).toBe("not_assessed");
    expect(evidenceStateFor(95, "high", NO_EVIDENCE)).toBe("not_assessed");
  });

  test("records but low confidence is limited evidence, not a verdict", () => {
    expect(evidenceStateFor(35, "low", WITH_EVIDENCE)).toBe("limited_evidence");
    expect(evidenceStateFor(90, "low", WITH_EVIDENCE)).toBe("limited_evidence");
  });

  test("a zero score is only 'emerging' when Proxola actually assessed it", () => {
    expect(evidenceStateFor(0, "high", NO_EVIDENCE)).toBe("not_assessed");
    expect(evidenceStateFor(0, "high", WITH_EVIDENCE)).toBe("emerging");
  });
});

describe("isAssessed", () => {
  test("only the three judgement states count as assessed", () => {
    expect(isAssessed("strong")).toBe(true);
    expect(isAssessed("developing")).toBe(true);
    expect(isAssessed("emerging")).toBe(true);
    expect(isAssessed("limited_evidence")).toBe(false);
    expect(isAssessed("not_assessed")).toBe(false);
  });
});

describe("labels", () => {
  test("every state has a full and a short label", () => {
    for (const state of ["strong", "developing", "emerging", "limited_evidence", "not_assessed"] as const) {
      expect(EVIDENCE_STATE_LABELS[state]).toBeTruthy();
      expect(EVIDENCE_STATE_SHORT_LABELS[state]).toBeTruthy();
    }
  });

  // Tone guard: the states a student sees most often when their profile is thin must not
  // read as verdicts on them. This is a deliberate product decision, so it gets a test.
  test("the low-end labels are framed as next steps, not failures", () => {
    expect(EVIDENCE_STATE_LABELS.emerging).toBe("A good next area to strengthen");
    expect(EVIDENCE_STATE_LABELS.not_assessed).toBe("Not enough evidence yet");
    for (const label of Object.values(EVIDENCE_STATE_LABELS)) {
      expect(label.toLowerCase()).not.toContain("weak");
      expect(label.toLowerCase()).not.toContain("poor");
      expect(label.toLowerCase()).not.toContain("needs attention");
    }
  });
});

describe("buildProfileSignal", () => {
  function row(
    dimension: ProfileDimension,
    score: number,
    confidence: DataConfidence = "high",
    hasEvidence = true,
  ) {
    return { dimension, score, confidence, reasonCodes: hasEvidence ? [{ code: "x" }] : [] };
  }

  test("assessed states lead, unassessed sink to the bottom", () => {
    const signal = buildProfileSignal([
      row("research", 20),
      row("academics", 88),
      row("leadership", 55),
      row("entrepreneurship", 0, "high", false),
      row("awards_distinction", 40, "low"),
    ]);
    expect(signal.map((s) => s.dimension)).toEqual([
      "academics",
      "leadership",
      "research",
      "awards_distinction",
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

  // Omitting the evidence field used to compile, and silently meant "no evidence" — a
  // scored student rendered as if their profile were empty. It is now a type error, and
  // this @ts-expect-error is the assertion: if the field ever goes optional again, the
  // directive becomes unused and `npm run typecheck` fails on this line.
  test("the evidence field cannot be omitted by a caller", () => {
    // @ts-expect-error reasonCodes is required — omission must not compile.
    const bad: DimensionScoreRow = { dimension: "research", score: 80, confidence: "high" };
    // Still exercise the runtime path so the fixture isn't dead code.
    expect(buildProfileSignal([{ ...bad, reasonCodes: [] }])[0].state).toBe("not_assessed");
  });

  test("empty input yields an empty signal rather than throwing", () => {
    expect(buildProfileSignal([])).toEqual([]);
  });
});

describe("honesty guards", () => {
  function row(
    dimension: ProfileDimension,
    score: number,
    confidence: DataConfidence = "high",
    hasEvidence = true,
  ) {
    return { dimension, score, confidence, reasonCodes: hasEvidence ? [{ code: "x" }] : [] };
  }

  test("a profile with nothing recorded supports no confident claim", () => {
    const signal = buildProfileSignal([
      row("academics", 0, "low", false),
      row("research", 0, "low", false),
      row("leadership", 0, "low", false),
    ]);
    expect(hasConfidentSignal(signal)).toBe(false);
    // The exact case caught live: the gap ranker still returns `academics`, and the
    // headline must not repeat it as a finding.
    expect(canClaimGap(signal, "academics")).toBe(false);
  });

  test("one assessed dimension is enough to have a read on the profile", () => {
    const signal = buildProfileSignal([row("academics", 80), row("research", 0, "low", false)]);
    expect(hasConfidentSignal(signal)).toBe(true);
  });

  test("but a gap still can't be named in a dimension Proxola hasn't assessed", () => {
    const signal = buildProfileSignal([row("academics", 80), row("research", 0, "low", false)]);
    expect(canClaimGap(signal, "research")).toBe(false);
    expect(canClaimGap(signal, "academics")).toBe(true);
  });

  test("a genuinely thin but measured dimension can be named", () => {
    const signal = buildProfileSignal([row("academics", 85), row("research", 18)]);
    expect(canClaimGap(signal, "research")).toBe(true);
  });

  test("an empty signal supports nothing", () => {
    expect(hasConfidentSignal([])).toBe(false);
    expect(canClaimGap([], "research")).toBe(false);
    expect(signalStateFor([], "research")).toBeNull();
  });
});

describe("signalCoverage", () => {
  function row(
    dimension: ProfileDimension,
    score: number,
    confidence: DataConfidence = "high",
    hasEvidence = true,
  ) {
    return { dimension, score, confidence, reasonCodes: hasEvidence ? [{ code: "x" }] : [] };
  }

  test("separates what Proxola assessed from what it is still waiting on", () => {
    const signal = buildProfileSignal([
      row("academics", 85),
      row("leadership", 72),
      row("research", 30),
      row("awards_distinction", 20, "low"),
      row("entrepreneurship", 0, "low", false),
    ]);
    expect(signalCoverage(signal)).toEqual({ assessed: 3, awaitingEvidence: 2, strong: 2, total: 5 });
  });
});

describe("evidenceStateLabel / evidenceStateShortLabel", () => {
  const ALL_STATES: EvidenceState[] = ["not_assessed", "limited_evidence", "emerging", "developing", "strong"];

  test("English branch matches the existing constant maps exactly", () => {
    for (const state of ALL_STATES) {
      expect(evidenceStateLabel(state, "en")).toBe(EVIDENCE_STATE_LABELS[state]);
      expect(evidenceStateShortLabel(state, "en")).toBe(EVIDENCE_STATE_SHORT_LABELS[state]);
    }
  });

  test("Turkish branch is distinct, real Turkish, one value per state", () => {
    const seen = new Set<string>();
    for (const state of ALL_STATES) {
      const label = evidenceStateLabel(state, "tr");
      expect(label).not.toBe(EVIDENCE_STATE_LABELS[state]);
      expect(seen.has(label)).toBe(false);
      seen.add(label);
    }
  });

});
