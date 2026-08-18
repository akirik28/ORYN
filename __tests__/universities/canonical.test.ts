import { describe, expect, test } from "vitest";
import { canonicalUniversityId, excludeSupersededUniversities, isSupersededUniversityId, pickCanonicalWinner, type DuplicateCandidate } from "@/lib/universities/canonical";

function candidate(overrides: Partial<DuplicateCandidate> & { id: string; name: string }): DuplicateCandidate {
  return { totalReferences: 0, hasWebsiteUrl: false, createdAt: "2026-01-01T00:00:00Z", ...overrides };
}

describe("pickCanonicalWinner", () => {
  test("more FK references wins outright, regardless of naming", () => {
    // Real case: KFUPM's parenthetical-suffixed row is the data-rich one, the bare acronym
    // is thin — a naming heuristic alone would pick the wrong side here.
    const rich = candidate({ id: "rich", name: "King Fahd University of Petroleum and Minerals (KFUPM)", totalReferences: 9 });
    const thin = candidate({ id: "thin", name: "KFUPM", totalReferences: 1 });
    expect(pickCanonicalWinner([rich, thin]).id).toBe("rich");
    expect(pickCanonicalWinner([thin, rich]).id).toBe("rich"); // order-independent
  });

  test("website_url breaks a tie in FK references", () => {
    const withSite = candidate({ id: "a", name: "Al-Farabi Kazakh National University", totalReferences: 1, hasWebsiteUrl: true });
    const withoutSite = candidate({ id: "b", name: "Farabi University (former Al-Farabi Kazakh National University)", totalReferences: 1, hasWebsiteUrl: false });
    expect(pickCanonicalWinner([withSite, withoutSite]).id).toBe("a");
  });

  test("a clean name (no parenthetical, no leading 'The') breaks a further tie", () => {
    const clean = candidate({ id: "clean", name: "University of Technology Sydney" });
    const messy = candidate({ id: "messy", name: "The University of Technology Sydney (UTS)" });
    expect(pickCanonicalWinner([clean, messy]).id).toBe("clean");
  });

  test("earliest createdAt is the final, fully-tied tiebreak", () => {
    const older = candidate({ id: "older", name: "Same Name", createdAt: "2026-01-01T00:00:00Z" });
    const newer = candidate({ id: "newer", name: "Same Name", createdAt: "2026-06-01T00:00:00Z" });
    expect(pickCanonicalWinner([older, newer]).id).toBe("older");
  });

  test("a single candidate is trivially its own winner", () => {
    const only = candidate({ id: "only", name: "Solo University" });
    expect(pickCanonicalWinner([only]).id).toBe("only");
  });

  test("throws on an empty list rather than returning a fabricated winner", () => {
    expect(() => pickCanonicalWinner([])).toThrow();
  });
});

describe("canonical id helpers", () => {
  test("known real pairs from the live spine resolve correctly", () => {
    // These assertions read the actual generated lib/universities/duplicate-supersessions.json
    // (via the module's static import), not a mock — a real regression test, not a synthetic
    // one. If a future re-run of resolve:university-duplicates changes a winner, this test is
    // meant to catch that and force a conscious look, not silently pass.
    const mit = "ba3a30b2-c6e2-4a0f-ba32-6da028175d35"; // "Massachusetts Institute of Technology (MIT)"
    expect(isSupersededUniversityId(mit)).toBe(true);
    expect(canonicalUniversityId(mit)).toBe("03167d0c-2315-49e3-a37e-f9c9c7d2d27c"); // bare "Massachusetts Institute of Technology"
  });

  test("an id with no known duplicate resolves to itself and is never marked superseded", () => {
    const notADuplicate = "00000000-0000-0000-0000-000000000000";
    expect(isSupersededUniversityId(notADuplicate)).toBe(false);
    expect(canonicalUniversityId(notADuplicate)).toBe(notADuplicate);
  });

  test("excludeSupersededUniversities drops known losers, keeps everything else", () => {
    const mitLoser = "ba3a30b2-c6e2-4a0f-ba32-6da028175d35";
    const mitWinner = "03167d0c-2315-49e3-a37e-f9c9c7d2d27c";
    const rows = [{ id: mitLoser, name: "MIT (loser)" }, { id: mitWinner, name: "MIT (winner)" }, { id: "unrelated", name: "Some Other University" }];
    const result = excludeSupersededUniversities(rows);
    expect(result.map((r) => r.id)).toEqual([mitWinner, "unrelated"]);
  });
});
