import { describe, expect, test, vi } from "vitest";
import { formatAdmissionRateLine, formatUniversityAdmissionContext, type TargetUniversityAdmissionFact } from "@/lib/ai/university-admission-context";

function fact(overrides: Partial<TargetUniversityAdmissionFact> = {}): TargetUniversityAdmissionFact {
  return {
    name: "University of Oxford",
    admissionRate: null,
    admissionRateBasis: null,
    source: null,
    ...overrides,
  };
}

describe("formatAdmissionRateLine — one test per basis, proving each produces a genuinely different sentence", () => {
  test("published: states the real rate, its source, and explicitly labels it institution-wide — not this student's personal probability", () => {
    const line = formatAdmissionRateLine(fact({ admissionRateBasis: "published", admissionRate: 0.142, source: "ox.ac.uk" }));
    expect(line).toContain("14.2%");
    expect(line).toContain("ox.ac.uk");
    // Non-negotiable #11, said in the text itself, not left to the model's own interpretation.
    expect(line).toMatch(/not.*this student's personal admission probability/i);
  });

  test("published: never invents a rate — no admissionRate value means no line, even with basis set", () => {
    // Defensive case: migration 0119's own UPDATE only ever sets "published" deterministically
    // alongside a real admission_rate, so this shouldn't occur live — but the formatter must
    // still refuse to fabricate a number if it somehow does.
    expect(formatAdmissionRateLine(fact({ admissionRateBasis: "published", admissionRate: null }))).toBeNull();
  });

  test("published: renders the real precision, not a rounded whole-number estimate", () => {
    // 0.0455 -> "4.5%", not bucketed to a whole number ("5%") the way the student-facing
    // outlook page's own experimental range deliberately is — this context is internal
    // grounding, not a UI display, so it carries the real stored precision.
    const line = formatAdmissionRateLine(fact({ admissionRateBasis: "published", admissionRate: 0.0455 }));
    expect(line).toContain("4.5%");
    expect(line).not.toContain("~");
  });

  test("not_published: a real, informative negative sentence — not silence, and no invented number", () => {
    const line = formatAdmissionRateLine(fact({ admissionRateBasis: "not_published", admissionRate: null }));
    expect(line).not.toBeNull();
    expect(line).toMatch(/does not publish a single admission rate/i);
    expect(line).not.toMatch(/%/);
  });

  test("no_single_rate: a genuinely different sentence from not_published — per-program admission, not a withheld institution-wide figure", () => {
    const line = formatAdmissionRateLine(fact({ admissionRateBasis: "no_single_rate", admissionRate: null }));
    expect(line).not.toBeNull();
    expect(line).toMatch(/per-program/i);
    expect(line).not.toMatch(/does not publish/i);
  });

  test("not_researched: produces NOTHING — the fourth state, and the one CEO specifically asked to prove stays silent", () => {
    expect(formatAdmissionRateLine(fact({ admissionRateBasis: "not_researched" }))).toBeNull();
  });

  test("null/missing basis: same silence as not_researched — an absent basis is not evidence of anything", () => {
    expect(formatAdmissionRateLine(fact({ admissionRateBasis: null }))).toBeNull();
  });
});

describe("formatUniversityAdmissionContext", () => {
  test("empty array produces an empty string — no section header with nothing under it", () => {
    expect(formatUniversityAdmissionContext([])).toBe("");
  });

  test("a target list where every university is not_researched produces an empty string, not an empty section", () => {
    const text = formatUniversityAdmissionContext([fact({ admissionRateBasis: "not_researched" }), fact({ name: "Yale University", admissionRateBasis: "not_researched" })]);
    expect(text).toBe("");
  });

  test("a mix of all four bases: only the three that produce a sentence appear, not_researched is silently absent, not listed as unknown", () => {
    const text = formatUniversityAdmissionContext([
      fact({ name: "University of Oxford", admissionRateBasis: "published", admissionRate: 0.142, source: "ox.ac.uk" }),
      fact({ name: "National University of Singapore", admissionRateBasis: "not_published" }),
      fact({ name: "TU Munich", admissionRateBasis: "no_single_rate" }),
      fact({ name: "Erasmus University Rotterdam", admissionRateBasis: "not_researched" }),
    ]);
    expect(text).toContain("University of Oxford");
    expect(text).toContain("National University of Singapore");
    expect(text).toContain("TU Munich");
    expect(text).not.toContain("Erasmus University Rotterdam");
    // Section-level reminder, redundant with the per-line one on purpose — this is the one
    // non-negotiable this whole file exists to protect.
    expect(text).toMatch(/never state or imply.*personal chance of admission/i);
  });
});

describe("buildUniversityAdmissionContextText", () => {
  test("returns empty string and does not throw when the database read fails — never blocks an advisor reply", async () => {
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockRejectedValue(new Error("db unavailable")),
    }));
    vi.resetModules();
    const { buildUniversityAdmissionContextText: freshBuild } = await import("@/lib/ai/university-admission-context");
    const result = await freshBuild("user-1");
    expect(result).toBe("");
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });

  test("returns empty string when the student has no target universities at all — no query wasted formatting nothing", async () => {
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: (resolve: (v: { data: unknown[] }) => void) => resolve({ data: [] }),
    });
    vi.doMock("@/lib/supabase/server", () => ({ createClient: vi.fn().mockResolvedValue({ from }) }));
    vi.resetModules();
    const { buildUniversityAdmissionContextText: freshBuild } = await import("@/lib/ai/university-admission-context");
    const result = await freshBuild("user-1");
    expect(result).toBe("");
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });
});
