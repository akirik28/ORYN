import { describe, expect, test } from "vitest";
import { hasUniversityDataChanged } from "@/lib/universities/sync-us-universities";

/**
 * hasUniversityDataChanged is what stops syncOne from stamping last_changed_at on every
 * Job C run regardless of whether anything actually differs — see that file's own comment
 * for why an unconditional stamp would have made the university_data_changed notification
 * (lib/universities/data-change-scan.ts) fire on every scheduled sync. Only this pure
 * comparator is tested here; the surrounding fetch/upsert flow has no existing coverage and
 * adding it is outside this package's scope.
 */
function fields(overrides: Partial<Parameters<typeof hasUniversityDataChanged>[0]> = {}) {
  return {
    name: "Test University",
    city: "Testville",
    institution_type: "Public",
    website_url: "https://test.edu",
    student_size: 10000,
    external_ids: { college_scorecard_id: "12345" },
    ...overrides,
  };
}

describe("hasUniversityDataChanged", () => {
  test("identical fields report no change", () => {
    expect(hasUniversityDataChanged(fields(), fields())).toBe(false);
  });

  test("a name change is detected", () => {
    expect(hasUniversityDataChanged(fields(), fields({ name: "Renamed University" }))).toBe(true);
  });

  test("a city change is detected", () => {
    expect(hasUniversityDataChanged(fields(), fields({ city: "New City" }))).toBe(true);
  });

  test("a null-to-value change on a nullable field is detected", () => {
    expect(hasUniversityDataChanged(fields({ website_url: null }), fields({ website_url: "https://test.edu" }))).toBe(true);
  });

  test("a student_size change is detected", () => {
    expect(hasUniversityDataChanged(fields(), fields({ student_size: 12000 }))).toBe(true);
  });

  test("external_ids is compared by value, not by reference", () => {
    // Two fresh object literals with identical contents must read as unchanged — a naive
    // !== comparison on the object itself would always report true here, since a new
    // literal is never === to a previously-stored one.
    const existing = fields({ external_ids: { college_scorecard_id: "12345" } });
    const incoming = fields({ external_ids: { college_scorecard_id: "12345" } });
    expect(hasUniversityDataChanged(existing, incoming)).toBe(false);
  });

  test("a real external_ids value change is detected", () => {
    expect(hasUniversityDataChanged(fields({ external_ids: { college_scorecard_id: "12345" } }), fields({ external_ids: { college_scorecard_id: "99999" } }))).toBe(true);
  });
});
