import { describe, expect, test } from "vitest";
import {
  findExactDuplicates,
  findAliasCollisions,
  findDuplicateAliases,
  findInvalidEntities,
  findNearDuplicates,
  findDenormalizedNameDrift,
  auditEntities,
  summarizeFindings,
  type AuditableEntity,
} from "@/lib/entities/audit";

function entity(overrides: Partial<AuditableEntity> & { id: string; canonicalName: string }): AuditableEntity {
  return { aliases: [], country: "Turkey", city: "İstanbul", category: "school", ...overrides };
}

describe("findExactDuplicates", () => {
  test("two rows with the same category+name+country+city are flagged as an exact duplicate", () => {
    const findings = findExactDuplicates([
      entity({ id: "a", canonicalName: "Robert College" }),
      entity({ id: "b", canonicalName: "robert college" }),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].bucket).toBe("SAFE_EXACT_LINK");
    expect(findings[0].entityIds.sort()).toEqual(["a", "b"]);
  });

  test("same name in DIFFERENT cities is not a duplicate — the case the registry exists to keep apart", () => {
    const findings = findExactDuplicates([
      entity({ id: "a", canonicalName: "Saint Joseph", city: "İstanbul" }),
      entity({ id: "b", canonicalName: "Saint Joseph", city: "İzmir" }),
    ]);
    expect(findings).toEqual([]);
  });

  test("same name in different categories is not a duplicate", () => {
    const findings = findExactDuplicates([
      entity({ id: "a", canonicalName: "Acıbadem University", category: "school" }),
      entity({ id: "b", canonicalName: "Acıbadem University", category: "organization" }),
    ]);
    expect(findings).toEqual([]);
  });
});

describe("findDuplicateAliases", () => {
  test("the same alias on two entities is ambiguous, never auto-resolved", () => {
    const findings = findDuplicateAliases([
      entity({ id: "a", canonicalName: "Alpha School", aliases: ["AS"] }),
      entity({ id: "b", canonicalName: "Beta School", aliases: ["AS"] }),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].bucket).toBe("AMBIGUOUS");
  });

  test("distinct aliases produce no finding", () => {
    expect(
      findDuplicateAliases([
        entity({ id: "a", canonicalName: "Alpha School", aliases: ["AS"] }),
        entity({ id: "b", canonicalName: "Beta School", aliases: ["BS"] }),
      ])
    ).toEqual([]);
  });
});

describe("findAliasCollisions", () => {
  test("an alias equal to another entity's canonical name is flagged", () => {
    const findings = findAliasCollisions([
      entity({ id: "a", canonicalName: "Alpha School", aliases: ["Beta School"] }),
      entity({ id: "b", canonicalName: "Beta School" }),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].bucket).toBe("AMBIGUOUS");
    expect(findings[0].entityIds).toEqual(["a", "b"]);
  });

  test("an alias matching only its own entity's name is not a cross-entity collision", () => {
    expect(findAliasCollisions([entity({ id: "a", canonicalName: "Alpha School", aliases: ["alpha school"] })])).toEqual([]);
  });
});

describe("findInvalidEntities", () => {
  test("empty canonical name is INVALID", () => {
    const findings = findInvalidEntities([entity({ id: "a", canonicalName: "   " })]);
    expect(findings.some((f) => f.rule === "empty_canonical_name")).toBe(true);
    expect(findings.every((f) => f.bucket === "INVALID")).toBe(true);
  });

  test("untrimmed canonical name is INVALID", () => {
    expect(findInvalidEntities([entity({ id: "a", canonicalName: " Robert College " })]).some((f) => f.rule === "canonical_name_untrimmed")).toBe(true);
  });

  test("a non-http website (including javascript:) is INVALID", () => {
    expect(findInvalidEntities([entity({ id: "a", canonicalName: "X", websiteUrl: "javascript:alert(1)" })]).some((f) => f.rule === "malformed_website_url")).toBe(true);
    expect(findInvalidEntities([entity({ id: "a", canonicalName: "X", websiteUrl: "https://ok.example" })]).some((f) => f.rule === "malformed_website_url")).toBe(false);
  });

  test("an alias identical to the entity's own name is INVALID (redundant, inflates ranking)", () => {
    expect(
      findInvalidEntities([entity({ id: "a", canonicalName: "Robert College", aliases: ["robert college"] })]).some(
        (f) => f.rule === "alias_equals_own_canonical_name"
      )
    ).toBe(true);
  });

  test("a clean entity produces no findings", () => {
    expect(findInvalidEntities([entity({ id: "a", canonicalName: "Robert College", aliases: ["RC"], websiteUrl: "https://robcol.k12.tr" })])).toEqual([]);
  });
});

describe("findNearDuplicates", () => {
  test("a near-identical name in the same city is surfaced for review, not merged", () => {
    const findings = findNearDuplicates([
      entity({ id: "a", canonicalName: "Üsküdar American Academy" }),
      entity({ id: "b", canonicalName: "Uskudar American Acadmy" }),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].bucket).toBe("POSSIBLE_DUPLICATE");
  });

  test("genuinely different institutions are not flagged", () => {
    expect(findNearDuplicates([entity({ id: "a", canonicalName: "Robert College" }), entity({ id: "b", canonicalName: "Sezin Okulu" })])).toEqual([]);
  });

  test("an exact duplicate is reported once by findExactDuplicates, not double-reported here", () => {
    const rows = [entity({ id: "a", canonicalName: "Robert College" }), entity({ id: "b", canonicalName: "robert college" })];
    expect(findNearDuplicates(rows)).toEqual([]);
    expect(findExactDuplicates(rows)).toHaveLength(1);
  });

  test("each pair is reported once, not twice in both directions", () => {
    const findings = findNearDuplicates([
      entity({ id: "a", canonicalName: "Üsküdar American Academy" }),
      entity({ id: "b", canonicalName: "Uskudar American Acadmy" }),
    ]);
    expect(findings).toHaveLength(1);
  });
});

describe("findDenormalizedNameDrift", () => {
  test("a stale denormalized name is flagged as safely fixable", () => {
    const findings = findDenormalizedNameDrift([
      { table: "education_records", rowId: "r1", storedText: "Uskudar American Academy", canonicalName: "Üsküdar American Academy" },
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].bucket).toBe("SAFE_EXACT_LINK");
  });

  test("an in-sync row produces no finding", () => {
    expect(
      findDenormalizedNameDrift([{ table: "education_records", rowId: "r1", storedText: "Üsküdar American Academy", canonicalName: "Üsküdar American Academy" }])
    ).toEqual([]);
  });

  test("a null stored text against a real canonical name is drift", () => {
    expect(findDenormalizedNameDrift([{ table: "activities", rowId: "r2", storedText: null, canonicalName: "Yale University" }])).toHaveLength(1);
  });
});

describe("auditEntities / summarizeFindings", () => {
  test("a clean registry produces zero findings in every bucket", () => {
    const summary = summarizeFindings(
      auditEntities([
        entity({ id: "a", canonicalName: "Robert College", aliases: ["RC"] }),
        entity({ id: "b", canonicalName: "Sezin Okulu", aliases: ["Sezin"] }),
      ])
    );
    expect(summary).toEqual({ SAFE_EXACT_LINK: 0, POSSIBLE_DUPLICATE: 0, AMBIGUOUS: 0, UNRESOLVED: 0, INVALID: 0 });
  });

  test("a dirty registry is bucketed, and no rule ever silently merges", () => {
    const findings = auditEntities([
      entity({ id: "a", canonicalName: "Robert College", aliases: ["Sezin Okulu"] }),
      entity({ id: "b", canonicalName: "robert college" }),
      entity({ id: "c", canonicalName: "Sezin Okulu", websiteUrl: "ftp://nope" }),
    ]);
    const summary = summarizeFindings(findings);
    expect(summary.SAFE_EXACT_LINK).toBeGreaterThan(0); // the exact duplicate
    expect(summary.AMBIGUOUS).toBeGreaterThan(0); // alias colliding with another canonical name
    expect(summary.INVALID).toBeGreaterThan(0); // the ftp:// website
    // Every finding names the rows involved so a human can act; nothing is auto-applied.
    expect(findings.every((f) => f.entityIds.length > 0 && f.detail.length > 0)).toBe(true);
  });
});
