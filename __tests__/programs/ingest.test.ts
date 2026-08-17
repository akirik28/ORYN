import { describe, expect, test } from "vitest";
import { decideIngestion, resolveUniversity, looksPageConfirmed, type ResearchProgramRecord, type UniversityLookupRow } from "@/lib/programs/ingest";

const MIT: UniversityLookupRow = { id: "uni-mit", name: "Massachusetts Institute of Technology", country: "United States", website_url: "https://web.mit.edu" };
const EDINBURGH: UniversityLookupRow = { id: "uni-edi", name: "The University of Edinburgh", country: "United Kingdom", website_url: "https://www.ed.ac.uk" };
const NAPIER: UniversityLookupRow = { id: "uni-nap", name: "Edinburgh Napier University", country: "United Kingdom", website_url: "https://www.napier.ac.uk" };
const KFUPM_A: UniversityLookupRow = { id: "uni-kfupm-a", name: "King Fahd University of Petroleum and Minerals", country: "Saudi Arabia", website_url: null };
const KFUPM_B: UniversityLookupRow = { id: "uni-kfupm-b", name: "King Fahd University of Petroleum and Minerals", country: "Saudi Arabia", website_url: null };

const UNIVERSITIES = [MIT, EDINBURGH, NAPIER, KFUPM_A, KFUPM_B];

function record(overrides: Partial<ResearchProgramRecord> = {}): ResearchProgramRecord {
  return {
    research_program_id: "RSRCH-0001",
    university_name: "Massachusetts Institute of Technology",
    university_country: "United States",
    program_name: "Computer Science",
    official_program_url: "https://cs.mit.edu",
    source_url: "https://cs.mit.edu",
    source_type: "official_primary",
    verification_status: "Verified - official page fetched and read",
    researched_at: "2026-08-17",
    ...overrides,
  };
}

describe("resolveUniversity", () => {
  test("resolves an exact name+country match", () => {
    expect(resolveUniversity(record(), UNIVERSITIES)).toBe("uni-mit");
  });

  test("does not resolve 'University of Edinburgh' to the unrelated Edinburgh Napier University", () => {
    const r = record({ university_name: "University of Edinburgh", university_country: "United Kingdom" });
    // Neither an exact-name match (real name is "The University of Edinburgh") nor a safe
    // override without the manual alias table — must not silently pick Napier.
    expect(resolveUniversity(r, UNIVERSITIES)).not.toBe("uni-nap");
  });

  test("resolves via university_official_domain when name+country is ambiguous or absent", () => {
    const r = record({ university_name: "MIT", university_country: "United States", university_official_domain: "web.mit.edu" });
    expect(resolveUniversity(r, UNIVERSITIES)).toBe("uni-mit");
  });

  test("refuses to resolve when two live rows share the same name and country (real duplicate case)", () => {
    const r = record({ university_name: "King Fahd University of Petroleum and Minerals", university_country: "Saudi Arabia" });
    expect(resolveUniversity(r, UNIVERSITIES)).toBeNull();
  });

  test("returns null rather than guessing for a university not in the lookup at all", () => {
    const r = record({ university_name: "Some Unlisted College", university_country: "Nowhere" });
    expect(resolveUniversity(r, UNIVERSITIES)).toBeNull();
  });

  test("bridges a known label alias (Türkiye vs Turkey) via country normalization", () => {
    const turkish: UniversityLookupRow = { id: "uni-tr", name: "Boğaziçi University", country: "Turkey", website_url: null };
    const r = record({ university_name: "Boğaziçi University", university_country: "Türkiye" });
    expect(resolveUniversity(r, [turkish])).toBe("uni-tr");
  });
});

describe("looksPageConfirmed", () => {
  test("true for an explicit official-page confirmation", () => {
    expect(looksPageConfirmed("Verified - official Bachelor/first-cycle page")).toBe(true);
  });

  test("false when the status says retrieval was blocked", () => {
    expect(looksPageConfirmed("Verified - official programme result; page retrieval blocked")).toBe(false);
  });

  test("false for anything not explicitly verified", () => {
    expect(looksPageConfirmed("Review")).toBe(false);
    expect(looksPageConfirmed("Rejected")).toBe(false);
  });
});

describe("decideIngestion", () => {
  test("accepts a well-formed, page-confirmed, resolvable record", () => {
    const decision = decideIngestion(record(), UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("accepted");
    expect(decision.programRow?.university_id).toBe("uni-mit");
    expect(decision.programRow?.verification_state).toBe("verified_current");
    expect(decision.programRow?.subject_taxonomy).toBe("computer_science");
  });

  test("never inserts a program row for an unresolved university, even with perfect evidence", () => {
    const r = record({ university_name: "Totally Unknown University", university_country: "Nowhere" });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("unresolved_university");
    expect(decision.programRow).toBeNull();
    expect(decision.universityId).toBeNull();
  });

  test("rejects as insufficient_evidence when official_program_url is missing", () => {
    const r = record({ official_program_url: "" });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("insufficient_evidence");
    expect(decision.programRow).toBeNull();
  });

  test("rejects as insufficient_evidence when verification_status reads as a search result only", () => {
    const r = record({ verification_status: "Verified - official programme result; page retrieval blocked" });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("insufficient_evidence");
    expect(decision.programRow).toBeNull();
  });

  test("flags a duplicate against an existing key without inserting again", () => {
    const existing = new Set(["uni-mit|computer science|"]);
    const decision = decideIngestion(record(), UNIVERSITIES, existing);
    expect(decision.outcome).toBe("duplicate");
    expect(decision.programRow).toBeNull();
  });

  test("is idempotent: ingesting the same record twice against its own first output never double-accepts", () => {
    const first = decideIngestion(record(), UNIVERSITIES, new Set());
    expect(first.outcome).toBe("accepted");
    const keyAfterFirst = new Set([`${first.programRow!.university_id}|${first.programRow!.normalized_name}|${first.programRow!.degree_level ?? ""}`]);
    const second = decideIngestion(record(), UNIVERSITIES, keyAfterFirst);
    expect(second.outcome).toBe("duplicate");
  });

  test("rejects malformed_source for an unrecognized source_type", () => {
    const r = record({ source_type: "vibes" });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("malformed_source");
  });

  test("two different program names at the same university both accept independently", () => {
    const existing = new Set<string>();
    const econ = decideIngestion(record({ program_name: "Economics", official_program_url: "https://econ.mit.edu", source_url: "https://econ.mit.edu" }), UNIVERSITIES, existing);
    expect(econ.outcome).toBe("accepted");
  });
});
