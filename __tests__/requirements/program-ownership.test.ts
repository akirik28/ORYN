import { describe, expect, test } from "vitest";
import { validateProgramOwnership } from "@/lib/requirements/program-ownership";

const UNIVERSITY_A = "11111111-1111-1111-1111-111111111111";
const UNIVERSITY_B = "22222222-2222-2222-2222-222222222222";
const PROGRAM_ID = "33333333-3333-3333-3333-333333333333";

describe("validateProgramOwnership", () => {
  test("university-wide requirement (programId null) is always valid — nothing to check", () => {
    // No program lookup should even be needed for this case, so programUniversityId is
    // deliberately passed as null here too (the caller never fetches it).
    expect(validateProgramOwnership(null, UNIVERSITY_A, null)).toEqual({ ok: true });
  });

  test("program genuinely belongs to the given university: valid", () => {
    expect(validateProgramOwnership(PROGRAM_ID, UNIVERSITY_A, UNIVERSITY_A)).toEqual({ ok: true });
  });

  test("regression: program belongs to a DIFFERENT university — this is the exact gap that let addUniversityRequirement silently attach a mismatched program before this fix", () => {
    const result = validateProgramOwnership(PROGRAM_ID, UNIVERSITY_A, UNIVERSITY_B);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("different university");
  });

  test("program id does not resolve to any live row (deleted, or a bad id): rejected with a distinct, honest message — not silently treated as valid, not conflated with the wrong-university case", () => {
    const result = validateProgramOwnership(PROGRAM_ID, UNIVERSITY_A, null);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("could not be found");
  });
});
