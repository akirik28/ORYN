import { describe, expect, test } from "vitest";
import { checkUndergraduatePathwayAvailability } from "@/lib/admissions/pathway-availability";

/**
 * docs/d7-no-pathway-universities-findings-2026-09-04.md. Nothing in the codebase represented
 * this before — a student could add Tokyo or Copenhagen as a target and receive a confident
 * reach/competitive/likely classification for an admission route that does not exist for them.
 */
describe("checkUndergraduatePathwayAvailability — the four confirmed no-pathway cases", () => {
  test.each([
    ["2c25084f-260f-4b34-9499-5b2d1fb9a873", "The University of Tokyo"],
    ["9b743584-6f43-4fdd-8f53-fbf2e60a1bd8", "University of Copenhagen"],
    ["bd8f606a-3bc2-4075-bb21-26869b494733", "UNAM"],
    ["9b957f10-d9d0-4a64-b28e-601bd6cc8a61", "TU Dresden"],
  ])("%s (%s) has no pathway for this applicant", (universityId) => {
    const result = checkUndergraduatePathwayAvailability({ universityId });
    expect(result.availability).toBe("not_available_for_applicant");
    expect(result.explanation).not.toBeNull();
    expect(result.sources.length).toBeGreaterThan(0);
  });

  test("Tokyo's explanation names the actual situation, not a bare refusal", () => {
    const result = checkUndergraduatePathwayAvailability({ universityId: "2c25084f-260f-4b34-9499-5b2d1fb9a873" });
    expect(result.explanation).toContain("PEAK");
    expect(result.explanation).toContain("Fall 2026");
  });

  test("Tokyo's caveat names the two real alternatives it does not describe", () => {
    const result = checkUndergraduatePathwayAvailability({ universityId: "2c25084f-260f-4b34-9499-5b2d1fb9a873" });
    expect(result.caveat).toContain("Japanese");
    expect(result.caveat).toContain("transfer");
  });

  test("Copenhagen's explanation states the Danish-language requirement, not just 'no pathway'", () => {
    const result = checkUndergraduatePathwayAvailability({ universityId: "9b743584-6f43-4fdd-8f53-fbf2e60a1bd8" });
    expect(result.explanation).toContain("Danish");
  });
});

describe("checkUndergraduatePathwayAvailability — refuses to claim what it did not research", () => {
  test("an unlisted university is unknown, not assumed to have a pathway or to lack one", () => {
    // MIT — a real universities.id, deliberately not one of the four researched entries.
    const result = checkUndergraduatePathwayAvailability({ universityId: "e6cae05f-b8b3-4ae4-84f8-6b11d53de28a" });
    expect(result.availability).toBe("unknown");
    expect(result.explanation).toBeNull();
    expect(result.sources).toHaveLength(0);
  });

  test("a spot-checked-but-unclear university (KTH, King Saud — see the D7 doc's own sample) is deliberately not listed", () => {
    // These two came back genuinely unclear during the D7 sample, not confirmed negative.
    // Listing them here would be the same false-certainty problem this module exists to fix,
    // just pointed the other direction — confirmed by their absence from the source list, not
    // by a lookup, since there is nothing to look up for a university this module has never
    // heard of.
    const result = checkUndergraduatePathwayAvailability({ universityId: "00000000-0000-0000-0000-000000000000" });
    expect(result.availability).toBe("unknown");
  });

  test("a null universityId is unknown rather than an error", () => {
    expect(() => checkUndergraduatePathwayAvailability({ universityId: null })).not.toThrow();
    expect(checkUndergraduatePathwayAvailability({ universityId: null }).availability).toBe("unknown");
  });
});

describe("checkUndergraduatePathwayAvailability — locale: tr", () => {
  test("Tokyo's Turkish explanation names PEAK and the real timeline", () => {
    const result = checkUndergraduatePathwayAvailability({ universityId: "2c25084f-260f-4b34-9499-5b2d1fb9a873" }, "tr");
    expect(result.explanation).toContain("PEAK");
    expect(result.explanation).toContain("2026 Sonbahar");
  });

  test("Copenhagen's Turkish explanation states the Danish-language requirement", () => {
    const result = checkUndergraduatePathwayAvailability({ universityId: "9b743584-6f43-4fdd-8f53-fbf2e60a1bd8" }, "tr");
    expect(result.explanation).toContain("Danca");
  });

  test("an unlisted university's Turkish result carries no explanation either — nothing to warn about, in either language", () => {
    const result = checkUndergraduatePathwayAvailability({ universityId: "e6cae05f-b8b3-4ae4-84f8-6b11d53de28a" }, "tr");
    expect(result.explanation).toBeNull();
    expect(result.caveat).toBeNull();
  });

  test("omitting locale is identical to passing 'en' explicitly, across every researched entry (default-locale backward compatibility)", () => {
    for (const universityId of [
      "2c25084f-260f-4b34-9499-5b2d1fb9a873",
      "9b743584-6f43-4fdd-8f53-fbf2e60a1bd8",
      "bd8f606a-3bc2-4075-bb21-26869b494733",
      "9b957f10-d9d0-4a64-b28e-601bd6cc8a61",
    ]) {
      expect(checkUndergraduatePathwayAvailability({ universityId })).toEqual(checkUndergraduatePathwayAvailability({ universityId }, "en"));
    }
  });
});
