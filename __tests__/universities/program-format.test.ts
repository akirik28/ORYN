import { describe, expect, test } from "vitest";
import { DEGREE_LEVEL_DISPLAY_MAX_LENGTH, formatProgramDegreeLabel } from "@/lib/universities/program-format";

// Real values measured live in university_programs (2026-08-22) — not invented fixtures, so the
// test actually proves the reported regression is fixed rather than a shape that merely looks
// similar to it.
const VU_AMSTERDAM_PRE_MASTERS =
  "Pre-Master's / bridging programme (not a full Master's degree; prepares students to meet entry requirements for a named Master's programme)";
const OXFORD_FOUNDATION_YEAR = "Other / pre-degree (Foundation Year, not a Bachelor's or Master's in its own right, but a required pathway)";
const TORONTO_MEDICINE_NOTE =
  "Graduate-entry professional degree (Temerty Faculty of Medicine's own page describes program length as variable by prior credential -- duration in years was not found stated in a citable form during this research pass, so is left null rather than assumed.)";

describe("formatProgramDegreeLabel", () => {
  test("prefers degree_type when present, regardless of degree_level", () => {
    expect(formatProgramDegreeLabel({ degreeType: "MEng", degreeLevel: TORONTO_MEDICINE_NOTE })).toBe("MEng");
  });

  test("falls back to degree_level when it's short enough to be a real category", () => {
    expect(formatProgramDegreeLabel({ degreeType: null, degreeLevel: "Bachelor / first-cycle" })).toBe("Bachelor / first-cycle");
  });

  // Regression: 24 VU Amsterdam/Oxford rows rendered a >100-character prose blob as if it were
  // a degree label because degree_type was null and degree_level fell straight through.
  test("suppresses a long prose value instead of rendering it as a degree label", () => {
    expect(formatProgramDegreeLabel({ degreeType: null, degreeLevel: VU_AMSTERDAM_PRE_MASTERS })).toBeNull();
    expect(formatProgramDegreeLabel({ degreeType: null, degreeLevel: OXFORD_FOUNDATION_YEAR })).toBeNull();
  });

  test("suppresses the longest known value (a researcher's citation/caveat, not a level)", () => {
    expect(TORONTO_MEDICINE_NOTE.length).toBeGreaterThan(200);
    expect(formatProgramDegreeLabel({ degreeType: null, degreeLevel: TORONTO_MEDICINE_NOTE })).toBeNull();
  });

  test("never truncates a long value into a shorter wrong label — it's null or nothing", () => {
    const result = formatProgramDegreeLabel({ degreeType: null, degreeLevel: VU_AMSTERDAM_PRE_MASTERS });
    expect(result).not.toEqual(expect.stringContaining("Pre-Master"));
  });

  test("boundary: exactly at the max length is still shown, one over is suppressed", () => {
    const atLimit = "x".repeat(DEGREE_LEVEL_DISPLAY_MAX_LENGTH);
    const overLimit = "x".repeat(DEGREE_LEVEL_DISPLAY_MAX_LENGTH + 1);
    expect(formatProgramDegreeLabel({ degreeType: null, degreeLevel: atLimit })).toBe(atLimit);
    expect(formatProgramDegreeLabel({ degreeType: null, degreeLevel: overLimit })).toBeNull();
  });

  test("null/undefined/empty degree_level with no degree_type: nothing to show", () => {
    expect(formatProgramDegreeLabel({ degreeType: null, degreeLevel: null })).toBeNull();
    expect(formatProgramDegreeLabel({ degreeType: undefined, degreeLevel: undefined })).toBeNull();
    expect(formatProgramDegreeLabel({ degreeType: "", degreeLevel: "" })).toBeNull();
  });

  test("empty-string degree_type does not shadow a usable degree_level", () => {
    expect(formatProgramDegreeLabel({ degreeType: "", degreeLevel: "Master / second-cycle" })).toBe("Master / second-cycle");
  });
});
