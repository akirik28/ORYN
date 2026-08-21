import { describe, expect, test } from "vitest";
import { decideIngestion, resolveUniversity, looksPageConfirmed, programUrlKey, type ResearchProgramRecord, type UniversityLookupRow } from "@/lib/programs/ingest";

const MIT: UniversityLookupRow = { id: "uni-mit", name: "Massachusetts Institute of Technology", country: "United States" };
const EDINBURGH: UniversityLookupRow = { id: "uni-edi", name: "The University of Edinburgh", country: "United Kingdom", aliases: ["University of Edinburgh"] };
const NAPIER: UniversityLookupRow = { id: "uni-nap", name: "Edinburgh Napier University", country: "United Kingdom" };
const KFUPM_A: UniversityLookupRow = { id: "uni-kfupm-a", name: "King Fahd University of Petroleum and Minerals", country: "Saudi Arabia" };
const KFUPM_B: UniversityLookupRow = { id: "uni-kfupm-b", name: "King Fahd University of Petroleum and Minerals", country: "Saudi Arabia" };
const EPFL: UniversityLookupRow = {
  id: "uni-epfl",
  name: "EPFL – École polytechnique fédérale de Lausanne",
  country: "Switzerland",
  aliases: ["EPFL"],
  websiteUrl: "https://www.epfl.ch",
};

const UNIVERSITIES = [MIT, EDINBURGH, NAPIER, KFUPM_A, KFUPM_B, EPFL];

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

describe("resolveUniversity (via lib/acquisition/identity.resolveIdentity)", () => {
  test("resolves an exact name+country match", () => {
    expect(resolveUniversity(record(), UNIVERSITIES).universityId).toBe("uni-mit");
  });

  test("does not resolve 'University of Edinburgh' to the unrelated Edinburgh Napier University", () => {
    const r = record({ university_name: "University of Edinburgh", university_country: "United Kingdom" });
    // Resolves via the registered alias on EDINBURGH, never to the unrelated Napier despite
    // both plausibly text-matching a naive search.
    expect(resolveUniversity(r, UNIVERSITIES).universityId).toBe("uni-edi");
  });

  test("resolves a well-known abbreviation via a registered alias, not a hardcoded override", () => {
    const r = record({ university_name: "EPFL", university_country: "Switzerland" });
    expect(resolveUniversity(r, UNIVERSITIES).universityId).toBe("uni-epfl");
  });

  test("refuses to resolve when two live rows share the same name and country (real duplicate case)", () => {
    const r = record({ university_name: "King Fahd University of Petroleum and Minerals", university_country: "Saudi Arabia" });
    const result = resolveUniversity(r, UNIVERSITIES);
    expect(result.universityId).toBeNull();
    expect(result.reason).toContain("duplicates must be merged");
  });

  test("returns null with a reason rather than guessing for a university not in the lookup at all", () => {
    const r = record({ university_name: "Some Unlisted College", university_country: "Nowhere" });
    const result = resolveUniversity(r, UNIVERSITIES);
    expect(result.universityId).toBeNull();
    expect(result.reason).toBeTruthy();
  });

  test("bridges a known label alias (Türkiye vs Turkey) via the shared country normalizer", () => {
    const turkish: UniversityLookupRow = { id: "uni-tr", name: "Boğaziçi University", country: "Turkey" };
    const r = record({ university_name: "Boğaziçi University", university_country: "Türkiye" });
    expect(resolveUniversity(r, [turkish]).universityId).toBe("uni-tr");
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
  test("accepts a well-formed, page-confirmed, resolvable record with an official-domain source", () => {
    const decision = decideIngestion(record(), UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("accepted");
    expect(decision.programRow?.university_id).toBe("uni-mit");
    expect(decision.programRow?.verification_state).toBe("verified_current");
    expect(decision.programRow?.subject_taxonomy).toBe("computer_science");
    expect(decision.programRow?.source_type).toBe("official_primary");
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

  test("rejects as malformed_source when the source_url is not on an accepted domain for program facts", () => {
    // A Wikipedia-style or content-farm URL is never acceptable evidence for a program fact,
    // regardless of what the record's own source_type field claims.
    const r = record({ source_url: "https://en.wikipedia.org/wiki/MIT" });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("malformed_source");
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

  test("flags a duplicate by official_program_url even when the display name differs (found live: TU Delft)", () => {
    // Real case: university_programs already had "Computer Science and Engineering" for TU
    // Delft (research-handoff pass), and a later deterministic catalogue scrape produced
    // "Computer Science & Engineering - English" for the exact same official_program_url —
    // name-based dedup alone would have inserted both as if they were different programmes.
    const existing = new Set([programUrlKey("uni-mit", "https://cs.mit.edu")]);
    const r = record({ program_name: "Computer Science & Engineering - English" });
    const decision = decideIngestion(r, UNIVERSITIES, existing);
    expect(decision.outcome).toBe("duplicate");
    expect(decision.detail).toContain("official_program_url");
    expect(decision.programRow).toBeNull();
  });

  test("two different program names at the same university both accept independently", () => {
    const existing = new Set<string>();
    const econ = decideIngestion(record({ program_name: "Economics", official_program_url: "https://econ.mit.edu", source_url: "https://econ.mit.edu" }), UNIVERSITIES, existing);
    expect(econ.outcome).toBe("accepted");
  });

  test("accepts a resolved university's own non-.edu/.ac./.gov domain (EPFL sits on .ch)", () => {
    // Before this domain was wired as an officialDomains hint, sourceAuthority() only ever
    // recognized .edu/.ac./.gov-shaped domains, which would have wrongly rejected this as
    // malformed_source despite EPFL being correctly resolved and the source page being real.
    const r = record({
      university_name: "EPFL",
      university_country: "Switzerland",
      official_program_url: "https://www.epfl.ch/education/bachelor/",
      source_url: "https://www.epfl.ch/education/bachelor/",
    });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("accepted");
    expect(decision.programRow?.university_id).toBe("uni-epfl");
  });

  test("accepts a department subdomain of the resolved university's own domain", () => {
    const r = record({
      university_name: "EPFL",
      university_country: "Switzerland",
      official_program_url: "https://sti.epfl.ch/bachelor/",
      source_url: "https://sti.epfl.ch/bachelor/",
    });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("accepted");
  });

  test("still rejects a domain that is not the resolved university's own domain, even off .ch", () => {
    const r = record({
      university_name: "EPFL",
      university_country: "Switzerland",
      official_program_url: "https://some-unrelated-site.ch/epfl-programs",
      source_url: "https://some-unrelated-site.ch/epfl-programs",
    });
    const decision = decideIngestion(r, UNIVERSITIES, new Set());
    expect(decision.outcome).toBe("malformed_source");
  });
});
