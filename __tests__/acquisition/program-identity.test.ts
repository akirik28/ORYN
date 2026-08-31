import { describe, expect, it } from "vitest";
import { resolveExactProgram, type ProgramLookupRow } from "@/lib/acquisition/program-identity";

const BRISTOL = "11111111-1111-1111-1111-111111111111";
const KCL = "22222222-2222-2222-2222-222222222222";

const PROGRAMS: ProgramLookupRow[] = [
  { id: "p-med", universityId: BRISTOL, name: "Medicine" },
  { id: "p-dent", universityId: BRISTOL, name: "Dentistry" },
  { id: "p-vet", universityId: BRISTOL, name: "Veterinary Science" },
  { id: "p-kcl-med", universityId: KCL, name: "Medicine MBBS" },
  // Two KCL programs sharing one name on purpose, to exercise the ambiguous case below —
  // real duplicate names shouldn't happen, but the resolver must not guess if they do.
  { id: "p-kcl-dup-a", universityId: KCL, name: "Global Health & Social Medicine BSc" },
  { id: "p-kcl-dup-b", universityId: KCL, name: "Global Health & Social Medicine BSc" },
];

describe("resolveExactProgram", () => {
  it("links on an exact, case-sensitive match scoped to the given university", () => {
    const result = resolveExactProgram(BRISTOL, "Medicine", PROGRAMS);
    expect(result).toEqual({ programId: "p-med", reason: null });
  });

  it("does not link across universities even when the name matches exactly elsewhere", () => {
    const result = resolveExactProgram(KCL, "Medicine", PROGRAMS);
    expect(result.programId).toBeNull();
    expect(result.reason).toContain("no exact-match");
  });

  it("returns null with no reason when program_name is null — nothing to resolve, not a failure", () => {
    expect(resolveExactProgram(BRISTOL, null, PROGRAMS)).toEqual({ programId: null, reason: null });
  });

  it("returns null with no reason when program_name is an empty or whitespace-only string", () => {
    expect(resolveExactProgram(BRISTOL, "", PROGRAMS)).toEqual({ programId: null, reason: null });
    expect(resolveExactProgram(BRISTOL, "   ", PROGRAMS)).toEqual({ programId: null, reason: null });
  });

  it("trims surrounding whitespace before comparing — the one normalization this function allows", () => {
    const result = resolveExactProgram(BRISTOL, "  Medicine  ", PROGRAMS);
    expect(result).toEqual({ programId: "p-med", reason: null });
  });

  it("does NOT match on a different case — case-folding is a normalization this function refuses", () => {
    const result = resolveExactProgram(BRISTOL, "medicine", PROGRAMS);
    expect(result.programId).toBeNull();
  });

  it("does NOT match a degree-type suffix variant — 'Medicine MBBS' vs 'Medicine' are different strings", () => {
    const result = resolveExactProgram(KCL, "Medicine", PROGRAMS);
    expect(result.programId).toBeNull();
  });

  it("does NOT match a substring — a partial name is not an exact one", () => {
    const result = resolveExactProgram(BRISTOL, "Vet", PROGRAMS);
    expect(result.programId).toBeNull();
  });

  it("refuses to guess when a name matches more than one program at the same university", () => {
    const result = resolveExactProgram(KCL, "Global Health & Social Medicine BSc", PROGRAMS);
    expect(result.programId).toBeNull();
    expect(result.reason).toContain("ambiguous");
    expect(result.reason).toContain("2 programs");
  });

  it("returns null with a stated reason for a name that resolves to zero programs", () => {
    const result = resolveExactProgram(BRISTOL, "Astrophysics", PROGRAMS);
    expect(result).toEqual({ programId: null, reason: 'program_name "Astrophysics" has no exact-match program at this university.' });
  });
});
