import { describe, test, expect } from "vitest";
import { flatten } from "@/features/onboarding/steps/import-step";
import type { CVExtractionResult } from "@/lib/ai/cv-extraction";

function emptyExtraction(): CVExtractionResult {
  return {
    education: [],
    activities: [],
    awards: [],
    projects: [],
    research: [],
    workExperience: [],
    skills: [],
    languages: [],
    unclassified: [],
  };
}

/**
 * Regression coverage for the 2026-08-29 audit finding: lib/ai/cv-extraction.ts's schema
 * gives education items a dedicated `schoolName` field (distinct from the generic
 * `title`/`organization` every other category uses), but `flatten()` only ever read
 * `raw.organization` — `schoolName` was extracted by the model and then silently discarded,
 * so a CV import could persist an education_records row with an empty or wrong school name
 * (lib/profile/cv-import.ts's `cvItemToRow` falls back to `organization || title`, neither
 * of which is guaranteed to actually be the school when a dedicated field exists for it).
 */
describe("flatten() — education school name", () => {
  test("prefers the dedicated schoolName over organization", () => {
    const extraction = emptyExtraction();
    extraction.education = [
      {
        title: "High School Diploma",
        organization: null,
        schoolName: "Lincoln High School",
        description: null,
        startDate: "2022-09-01",
        endDate: "2026-06-01",
        confidence: "high",
      },
    ];

    const [item] = flatten(extraction);
    expect(item.organization).toBe("Lincoln High School");
  });

  test("falls back to organization when the model didn't extract a distinct schoolName", () => {
    const extraction = emptyExtraction();
    extraction.education = [
      {
        title: "Diploma",
        organization: "Riverside Academy",
        schoolName: null,
        description: null,
        startDate: null,
        endDate: null,
        confidence: "medium",
      },
    ];

    const [item] = flatten(extraction);
    expect(item.organization).toBe("Riverside Academy");
  });

  test("non-education categories are unaffected — they have no schoolName field at all", () => {
    const extraction = emptyExtraction();
    extraction.activities = [
      {
        title: "Debate Club Captain",
        organization: "Debate Club",
        description: null,
        startDate: null,
        endDate: null,
        confidence: "high",
      },
    ];

    const [item] = flatten(extraction);
    expect(item.category).toBe("activities");
    expect(item.organization).toBe("Debate Club");
  });
});
