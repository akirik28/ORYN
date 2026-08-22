import { describe, expect, test } from "vitest";
import {
  canonicalUniversityId,
  excludeSupersededUniversities,
  isSupersededUniversityId,
  pickCanonicalWinner,
  type DuplicateCandidate,
  type SupersessionMap,
} from "@/lib/universities/canonical";

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
  // These four functions used to close over a module-level constant loaded from a static
  // duplicate-supersessions.json snapshot; they now take a freshly loaded SupersessionMap as
  // their first argument instead (see lib/universities/canonical.ts's header — loadSupersessionMap
  // queries the live universities.duplicate_status/superseded_by_id columns, migration 0043).
  // What's under test here is the pure map-consuming logic, not a live-data regression — that
  // guarantee now belongs to the DB itself (duplicate_status is NOT NULL with a CHECK
  // constraint, and scripts/university-duplicates-audit.ts is the tool that sets it), not to a
  // unit test with no database connection available in this environment. The real MIT
  // id/winner pair is used as fixture data anyway, purely so this stays a representative
  // example rather than an opaque "id-1"/"id-2" — see __tests__/programs/ingest.test.ts and
  // __tests__/universities/duplicate-regression.test.ts for the same discipline elsewhere.
  const MIT_LOSER = "ba3a30b2-c6e2-4a0f-ba32-6da028175d35"; // "Massachusetts Institute of Technology (MIT)"
  const MIT_WINNER = "03167d0c-2315-49e3-a37e-f9c9c7d2d27c"; // "Massachusetts Institute of Technology"
  const fixtureMap: SupersessionMap = new Map([[MIT_LOSER, { winnerId: MIT_WINNER }]]);

  test("a known-superseded id resolves to its winner", () => {
    expect(isSupersededUniversityId(fixtureMap, MIT_LOSER)).toBe(true);
    expect(canonicalUniversityId(fixtureMap, MIT_LOSER)).toBe(MIT_WINNER);
  });

  test("an id with no known duplicate resolves to itself and is never marked superseded", () => {
    const notADuplicate = "00000000-0000-0000-0000-000000000000";
    expect(isSupersededUniversityId(fixtureMap, notADuplicate)).toBe(false);
    expect(canonicalUniversityId(fixtureMap, notADuplicate)).toBe(notADuplicate);
  });

  test("excludeSupersededUniversities drops known losers, keeps everything else", () => {
    const rows = [{ id: MIT_LOSER, name: "MIT (loser)" }, { id: MIT_WINNER, name: "MIT (winner)" }, { id: "unrelated", name: "Some Other University" }];
    const result = excludeSupersededUniversities(fixtureMap, rows);
    expect(result.map((r) => r.id)).toEqual([MIT_WINNER, "unrelated"]);
  });
});
