import { describe, expect, it } from "vitest";
import { decideRequirementIngestion, requirementDedupKey, type ResearchRequirementRecord, type UniversityLookupRow } from "@/lib/requirements/ingest";

const EDINBURGH_ID = "11111111-1111-1111-1111-111111111111";

const UNIVERSITIES: UniversityLookupRow[] = [
  { id: EDINBURGH_ID, name: "The University of Edinburgh", country: "United Kingdom", websiteUrl: "https://www.ed.ac.uk" },
];

/** Minimal record that lands cleanly; each test overrides only the field under examination. */
function req(overrides: Partial<ResearchRequirementRecord> = {}): ResearchRequirementRecord {
  return {
    research_requirement_id: "REQ-TEST-0001",
    university_name: "The University of Edinburgh",
    university_country: "United Kingdom",
    program_name: null,
    category: "language",
    requirement_category_db: "english_proficiency",
    requirement_text: "IELTS Academic: total 6.5 with at least 5.5 in each component.",
    text_fidelity: "verbatim_quoted",
    scope: null,
    source_url: "https://www.ed.ac.uk/study/undergraduate/entry-requirements",
    source_type: "official_university_page",
    source_authority_passes_gate: true,
    retrieved_at: "2026-08-21T00:00:00Z",
    cycle_year: 2027,
    confidence: "high",
    verification_state: "VERIFIED_CURRENT",
    ...overrides,
  } as ResearchRequirementRecord;
}

function decide(record: ResearchRequirementRecord) {
  return decideRequirementIngestion(record, UNIVERSITIES, new Set<string>(), new Map<string, readonly string[]>());
}

describe("decideRequirementIngestion — migration 0052's group columns", () => {
  it("sets every one of the four columns on an accepted row, so none is left undefined for the insert", () => {
    const decision = decide(req());
    expect(decision.outcome).toBe("accepted");
    expect(decision.row).not.toBeNull();
    expect(Object.keys(decision.row!)).toEqual(expect.arrayContaining(["is_exclusion", "clause_ref", "requirement_group_id", "group_role"]));
  });

  it("defaults an ordinary requirement to is_exclusion=false rather than leaving it unset", () => {
    expect(decide(req()).row!.is_exclusion).toBe(false);
    expect(decide(req({ is_exclusion: false })).row!.is_exclusion).toBe(false);
    expect(decide(req({ is_exclusion: null })).row!.is_exclusion).toBe(false);
  });

  it("carries is_exclusion=true through instead of discarding the record", () => {
    // Ankara University REQ-2026-08-21-9321 — the heading that governs the SAT threshold in
    // REQ-2026-08-21-9324. Dropping this while ingesting the threshold is the failure that
    // tells an ineligible student they qualify.
    const decision = decide(
      req({
        research_requirement_id: "REQ-2026-08-21-9321",
        requirement_category_db: "entrance_exam",
        scope: "international_undergraduate",
        requirement_text: "VALID EXAMINATIONS AND REQUIRED SCORES FOR PROGRAMMES EXCLUDING THE ABOVE-LISTED",
        is_exclusion: true,
      })
    );
    expect(decision.outcome).toBe("accepted");
    expect(decision.row!.is_exclusion).toBe(true);
  });

  it("stores clause_ref verbatim, and normalizes absent/blank to null", () => {
    expect(decide(req({ clause_ref: "B-b-5-a" })).row!.clause_ref).toBe("B-b-5-a");
    expect(decide(req()).row!.clause_ref).toBeNull();
    expect(decide(req({ clause_ref: "   " })).row!.clause_ref).toBeNull();
  });

  it("leaves grouping unset, because no record in this corpus states a group and inferring one is what 0052 forbids", () => {
    const decision = decide(req());
    expect(decision.row!.requirement_group_id).toBeNull();
    expect(decision.row!.group_role).toBeNull();
  });

  it("never emits a row that would violate university_requirements_group_role_consistency", () => {
    // The DB CHECK is (requirement_group_id is null) = (group_role is null). Asserted over
    // every shape this builder can produce, so a future change that sets one column without
    // the other fails here rather than at insert time.
    for (const record of [req(), req({ is_exclusion: true }), req({ clause_ref: "A-2-c-ii" }), req({ scope: "international_undergraduate" })]) {
      const row = decide(record).row!;
      expect(row.requirement_group_id === null).toBe(row.group_role === null);
    }
  });

  it("never emits a row that would violate university_requirements_exclusion_role_implies_flag", () => {
    // The DB CHECK is group_role <> 'exclusion' OR is_exclusion.
    for (const record of [req(), req({ is_exclusion: true })]) {
      const row = decide(record).row!;
      if (row.group_role === "exclusion") expect(row.is_exclusion).toBe(true);
    }
  });
});

describe("decideRequirementIngestion — the shapes that must still be refused", () => {
  it("still blocks unsafe verification states even when the record is an exclusion", () => {
    expect(decide(req({ is_exclusion: true, verification_state: "CONFLICTING_EVIDENCE" })).outcome).toBe("not_ingestible");
  });

  it("still blocks an exclusion with no requirement_text — an unstated carve-out is not storable", () => {
    expect(decide(req({ is_exclusion: true, requirement_text: "  " })).outcome).toBe("not_ingestible");
  });

  it("still blocks an ambiguous scale", () => {
    expect(decide(req({ scale_ambiguity: "partially_unsatisfiable" })).outcome).toBe("not_ingestible");
  });
});

describe("requirementDedupKey", () => {
  it("groups rows by university+type+scope, treating null scope and empty scope as one bucket", () => {
    expect(requirementDedupKey(EDINBURGH_ID, "english_proficiency", null)).toBe(requirementDedupKey(EDINBURGH_ID, "english_proficiency", ""));
  });

  it("keeps genuinely different alternatives in the same bucket so title similarity, not the DB, separates them", () => {
    // Edinburgh's four routes all share university+type+scope. Migration 0056 is what lets
    // them coexist as rows; this key is only the bucket the title check runs within.
    const key = requirementDedupKey(EDINBURGH_ID, "english_proficiency", null);
    const titles = [
      "IELTS Academic: total 6.5 with at least 5.5 in each component.",
      "TOEFL-iBT (including Home Edition) from 21 January 2026: total 4.5 with at least 4.0 in each component.",
      "C1 Advanced (CAE) / C2 Proficiency (CPE): total 176 with at least 162 in each component.",
    ];
    const existing = new Map<string, readonly string[]>([[key, titles]]);
    const fourth = req({ requirement_text: "TOEFL-iBT (including Home Edition) before 21 January 2026: total 92 with at least 20 in each component." });
    expect(decideRequirementIngestion(fourth, UNIVERSITIES, new Set(), existing).outcome).toBe("accepted");
  });

  it("still catches a re-ingest of the same fact", () => {
    const key = requirementDedupKey(EDINBURGH_ID, "english_proficiency", null);
    const existing = new Map<string, readonly string[]>([[key, ["IELTS Academic: total 6.5 with at least 5.5 in each component."]]]);
    expect(decideRequirementIngestion(req(), UNIVERSITIES, new Set(), existing).outcome).toBe("duplicate");
  });
});
