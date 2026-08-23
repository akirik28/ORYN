import { describe, expect, test } from "vitest";
import { formatRequirementsCaveat } from "@/lib/ai/requirements-text";

describe("formatRequirementsCaveat", () => {
  test("a single requirement produces an explicit entry line", () => {
    const line = formatRequirementsCaveat(["Team of 4 to 6 students plus one teacher/educator advisor, all from the same high school"]);
    expect(line).not.toBeNull();
    expect(line).toContain("ENTRY REQUIRES");
    expect(line).toContain("Team of 4 to 6 students");
  });

  test("multiple requirements are joined, not just the first shown", () => {
    // The live case this exists for: Wharton's team requirement AND the team leader's age
    // floor are two separate application_requirements entries, and a student needs both
    // before the 19-day deadline, not just whichever one happened to be first.
    const line = formatRequirementsCaveat([
      "Team of 4 to 6 students plus one teacher/educator advisor, all from the same high school",
      "Designated student team leader must be at least 16 years old by September 28, 2026",
    ])!;
    expect(line).toContain("Team of 4 to 6 students");
    expect(line).toContain("at least 16 years old");
  });

  test("an empty array is silent", () => {
    expect(formatRequirementsCaveat([])).toBeNull();
  });
});
