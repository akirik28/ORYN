import { describe, expect, test } from "vitest";
import { findRawIdentifierLeaks, findUnassessedDimensionScored, runDeterministicChecks, RAW_IDENTIFIER_DENYLIST } from "@/lib/ai/eval/deterministic-checks";

describe("findRawIdentifierLeaks", () => {
  test("catches the two identifiers actually observed live", () => {
    expect(findRawIdentifierLeaks("your career_exploration gap is better addressed by...")).toHaveLength(1);
    expect(findRawIdentifierLeaks("LSE is currently an extreme_reach for you")).toHaveLength(1);
  });

  test("catches every multi-word ProfileDimension/OutlookLabel value, not just the two named ones", () => {
    for (const identifier of RAW_IDENTIFIER_DENYLIST.filter((id) => id.includes("_"))) {
      const findings = findRawIdentifierLeaks(`some text mentioning ${identifier} in passing`);
      expect(findings, `expected a finding for "${identifier}"`).toHaveLength(1);
      expect(findings[0].evidence.toLowerCase()).toBe(identifier);
    }
  });

  test("is case-insensitive (a model capitalizing a sentence shouldn't dodge the check)", () => {
    expect(findRawIdentifierLeaks("Career_exploration is your weakest area.")).toHaveLength(1);
  });

  test("does not flag clean, correctly-humanized prose", () => {
    const clean = "Leadership is already strong. Research is currently the clearer gap, and career exploration could use more evidence too.";
    expect(findRawIdentifierLeaks(clean)).toHaveLength(0);
  });

  test("does not flag ordinary English words that happen to also be single-word enum values", () => {
    // "research", "leadership", "strong", "reach", "competitive" are all real words a
    // demanding-mentor reply uses constantly — only the underscored multi-word identifiers
    // are actually diagnostic (see the module's own comment on why).
    const clean = "Your research is strong. This is a competitive reach school, but a good one to reach for.";
    expect(findRawIdentifierLeaks(clean)).toHaveLength(0);
  });

  test("denylist covers all 9 ProfileDimension and 6 OutlookLabel values (15 total) — a reader should see all of them even though only the 9 underscored ones are wired into the scan", () => {
    expect(RAW_IDENTIFIER_DENYLIST).toHaveLength(15);
  });
});

describe("findUnassessedDimensionScored", () => {
  const unassessed = ["Research", "Awards & Distinction"];

  test("catches the exact observed shape: a score quoted for a dimension with nothing recorded", () => {
    const findings = findUnassessedDimensionScored("Academics is strong. Research is 0/100 right now, so start there.", unassessed);
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence).toContain("Research is 0/100");
  });

  test("catches non-zero scores too — the bug is quoting any number for an unmeasured dimension, not specifically zero", () => {
    const findings = findUnassessedDimensionScored("Research sits at 42/100 currently.", unassessed);
    expect(findings).toHaveLength(1);
  });

  test("catches alternate score phrasings", () => {
    expect(findUnassessedDimensionScored("You scored 0 out of 100 in Research.", unassessed)).toHaveLength(1);
  });

  test("does NOT flag the correct behavior: describing the state honestly with no number", () => {
    const correct = "Research hasn't been assessed yet — there's nothing recorded for Proxola to judge.";
    expect(findUnassessedDimensionScored(correct, unassessed)).toHaveLength(0);
  });

  const allLabels = ["Research", "Awards & Distinction", "Career Exploration", "Community Impact", "Academics", "Leadership", "Execution / Project Depth", "Intellectual Curiosity", "Entrepreneurship"];

  test("does not flag one sentence naming two dimensions where the score is the other one's — the second live false positive", () => {
    // Observed 2026-09-02 in the reply-length comparison run. An ordinary, correctly-formed
    // sentence: Research is stated as unassessed and carries no number, the 60/100 is
    // Execution's. Scope-splitting alone can't help — this is one sentence.
    const text = "The real gaps are Research (unassessed) and Execution / Project Depth (60/100) — this week should push on those.";
    expect(findUnassessedDimensionScored(text, unassessed, allLabels)).toHaveLength(0);
  });

  test("still fires when the score really is attached to the unassessed dimension", () => {
    const text = "The real gaps are Research (0/100) and Execution / Project Depth (60/100).";
    expect(findUnassessedDimensionScored(text, unassessed, allLabels)).toHaveLength(1);
  });

  test("fires when the unassessed label comes second and owns the trailing score", () => {
    const text = "Leadership is 88/100, while Research sits at 12/100.";
    expect(findUnassessedDimensionScored(text, unassessed, allLabels)).toHaveLength(1);
  });

  test("without the all-labels argument it degrades to the coarser scope, not to silence", () => {
    // Two-argument callers keep the old behaviour: the window can't close early because
    // nothing tells it where another dimension starts. A false positive is the safe
    // direction for a leak check; silently missing leaks would not be.
    const text = "The real gaps are Research (unassessed) and Execution / Project Depth (60/100).";
    expect(findUnassessedDimensionScored(text, unassessed)).toHaveLength(1);
  });

  test("does not flag a markdown list where the score belongs to a different bullet — the live false positive", () => {
    // Observed 2026-09-02 against haiku-4-5. The reply was correct: it said Research was
    // unassessed and quoted no number for it. The old sentence split saw no `.!?` anywhere
    // in the list — "are:" ends on a colon, bullets end on parens — so the whole block was
    // one scope and Intellectual Curiosity's 55/100 was attributed to Research.
    const text = [
      "Your real gaps are:",
      "- **Research** (unassessed; no evidence yet)",
      "- **Intellectual Curiosity** (55/100)",
      "- **Execution / Project Depth** (60/100)",
    ].join("\n");
    expect(findUnassessedDimensionScored(text, unassessed)).toHaveLength(0);
  });

  test("still catches a genuine leak inside a list item — narrowing the scope must not blind the check", () => {
    const text = ["Where you stand:", "- **Leadership** (88/100)", "- **Research** (0/100)"].join("\n");
    const findings = findUnassessedDimensionScored(text, unassessed);
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence).toContain("Research");
    expect(findings[0].evidence).not.toContain("Leadership");
  });

  test("treats a blank line as a boundary, so a heading's label does not capture the next block's score", () => {
    const text = "### Research\n\nLeadership, by contrast, is 91/100 and needs nothing right now.";
    expect(findUnassessedDimensionScored(text, unassessed)).toHaveLength(0);
  });

  test("a single newline is NOT a boundary — a hard-wrapped claim stays one scope", () => {
    const text = "Research is currently\nsitting at 0/100 with nothing recorded.";
    expect(findUnassessedDimensionScored(text, unassessed)).toHaveLength(1);
  });

  test("does not flag a score in one sentence bleeding into an unrelated mention of the label in the next", () => {
    // Sentence-scoped on purpose — see the function's own comment for why a character
    // window (too narrow or too wide) is the wrong shape for this check.
    const text = "Leadership is 91/100, your strongest area. Research remains unassessed — nothing recorded yet.";
    expect(findUnassessedDimensionScored(text, unassessed)).toHaveLength(0);
  });

  test("a genuinely assessed dimension's real score is never flagged (it isn't in the unassessed list)", () => {
    const text = "Leadership is 91/100 and Entrepreneurship is 82/100 — both strong.";
    expect(findUnassessedDimensionScored(text, unassessed)).toHaveLength(0);
  });
});

describe("runDeterministicChecks", () => {
  test("combines both checks", () => {
    const bad = "Your career_exploration gap matters, and Research is 0/100 right now.";
    const findings = runDeterministicChecks(bad, ["Research"]);
    expect(findings.map((f) => f.check).sort()).toEqual(["raw_identifier_leak", "unassessed_dimension_scored"]);
  });

  test("a fully clean response produces zero findings", () => {
    const clean = "Leadership is strong at 91/100. Research hasn't been assessed yet, so it's a reasonable next area to build evidence in.";
    expect(runDeterministicChecks(clean, ["Research"])).toHaveLength(0);
  });
});
