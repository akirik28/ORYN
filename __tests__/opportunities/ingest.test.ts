import { describe, expect, test } from "vitest";
import { decideIngestion, looksPageConfirmed, type ResearchOpportunityRecord } from "@/lib/opportunities/ingest";
import type { DedupCandidate } from "@/lib/opportunities/dedup";

function record(overrides: Partial<ResearchOpportunityRecord> = {}): ResearchOpportunityRecord {
  return {
    research_opportunity_id: "RSRCH-OPP-0001",
    title: "PROMYS",
    organization: "Boston University",
    category: "summer_program",
    official_url: "https://promys.org",
    source_url: "https://promys.org/apply",
    source_type: "official_primary",
    verification_status: "Verified - official page fetched and read",
    researched_at: "2026-08-17",
    ...overrides,
  };
}

describe("looksPageConfirmed", () => {
  test("true for an explicit official-page confirmation", () => {
    expect(looksPageConfirmed("Verified - official page fetched and read")).toBe(true);
  });

  test("false when the status says retrieval was blocked", () => {
    expect(looksPageConfirmed("Verified - official page; retrieval blocked")).toBe(false);
  });

  test("false for anything not explicitly verified", () => {
    expect(looksPageConfirmed("Review")).toBe(false);
    expect(looksPageConfirmed("Rejected")).toBe(false);
  });
});

describe("decideIngestion", () => {
  test("accepts a well-formed, page-confirmed record with an official-domain source", () => {
    const decision = decideIngestion(record(), []);
    expect(decision.outcome).toBe("accepted");
    expect(decision.row?.title).toBe("PROMYS");
    expect(decision.row?.verification_state).toBe("verified_current");
    expect(decision.row?.status).toBe("active");
    expect(decision.row?.source_confidence).toBe("high");
    expect(decision.row?.selectivity_tier).toBe("unknown");
    expect(decision.row?.cycle_status).toBe("unverified");
  });

  test("rejects outright when title, organization, or official_url is missing", () => {
    expect(decideIngestion(record({ title: "" }), []).outcome).toBe("rejected");
    expect(decideIngestion(record({ organization: "" }), []).outcome).toBe("rejected");
    expect(decideIngestion(record({ official_url: "" }), []).outcome).toBe("rejected");
  });

  test("rejects as malformed_field for a category outside the recognized taxonomy", () => {
    const r = record({ category: "not_a_real_category" });
    const decision = decideIngestion(r, []);
    expect(decision.outcome).toBe("malformed_field");
  });

  test("rejects as insufficient_evidence when source_url is missing", () => {
    const r = record({ source_url: "" });
    const decision = decideIngestion(r, []);
    expect(decision.outcome).toBe("insufficient_evidence");
  });

  test("rejects as malformed_source when source_url is not the organizer's own domain or a recognized authority", () => {
    // A Wikipedia-style page is never acceptable evidence for an opportunity's own facts,
    // regardless of what the record's own source_type field claims.
    const r = record({ source_url: "https://en.wikipedia.org/wiki/PROMYS" });
    const decision = decideIngestion(r, []);
    expect(decision.outcome).toBe("malformed_source");
  });

  test("accepts a source_url on the same domain as official_url even without a shared registry", () => {
    const r = record({ official_url: "https://www.launchx.com", source_url: "https://www.launchx.com/apply" });
    const decision = decideIngestion(r, []);
    expect(decision.outcome).toBe("accepted");
  });

  test("rejects as insufficient_evidence when verification_status reads as a search result only", () => {
    const r = record({ verification_status: "Verified - official page; retrieval blocked" });
    const decision = decideIngestion(r, []);
    expect(decision.outcome).toBe("insufficient_evidence");
    expect(decision.row).toBeNull();
  });

  describe("structured retrieval_method routes the evidence gate (shared with the programs pipeline)", () => {
    test("live_fetch passes even though the prose would fail the legacy matcher", () => {
      const r = record({ retrieval_method: "live_fetch", verification_status: "Retrieved directly from the organizer's own site, HTTP 200." });
      expect(decideIngestion(r, []).outcome).toBe("accepted");
    });

    test("archived_capture stays out", () => {
      const r = record({ retrieval_method: "archived_capture", verification_status: "Retrieved from the Wayback Machine's capture of the organizer's page." });
      const decision = decideIngestion(r, []);
      expect(decision.outcome).toBe("insufficient_evidence");
      expect(decision.detail).toContain("archived_capture");
    });

    test("a malformed retrieval_method fails closed, even with legacy-passing prose", () => {
      const r = record({ retrieval_method: "fetched", verification_status: "Verified - official page fetched and read" });
      const decision = decideIngestion(r, []);
      expect(decision.outcome).toBe("insufficient_evidence");
      expect(decision.detail).toContain("not a recognized value");
    });

    test("a legacy record (no retrieval_method) is judged exactly as before", () => {
      const r = record({ verification_status: "Retrieved directly from the organizer's own site, HTTP 200." });
      expect(decideIngestion(r, []).outcome).toBe("insufficient_evidence");
    });
  });

  test("requires selectivity_evidence whenever selectivity_tier is above open_enrollment", () => {
    const r = record({ selectivity_tier: "highly_selective" });
    const decision = decideIngestion(r, []);
    expect(decision.outcome).toBe("malformed_field");
    expect(decision.detail).toContain("selectivity_evidence");
  });

  test("accepts a selective tier when selectivity_evidence is present", () => {
    const r = record({ selectivity_tier: "highly_selective", selectivity_evidence: "Published acceptance rate ~15%; qualifying exam required." });
    const decision = decideIngestion(r, []);
    expect(decision.outcome).toBe("accepted");
    expect(decision.row?.selectivity_tier).toBe("highly_selective");
  });

  test("never requires selectivity_evidence for open_enrollment (RSI vs a paid open-enrollment course must not read the same by default)", () => {
    const r = record({ selectivity_tier: "open_enrollment" });
    const decision = decideIngestion(r, []);
    expect(decision.outcome).toBe("accepted");
    expect(decision.row?.selectivity_tier).toBe("open_enrollment");
  });

  test("flags a duplicate by canonical URL match without inserting again", () => {
    const existing: (DedupCandidate & { id: string })[] = [{ id: "opp-1", title: "PROMYS", organization: "Boston University", officialUrl: "https://promys.org" }];
    const decision = decideIngestion(record(), existing);
    expect(decision.outcome).toBe("duplicate");
    expect(decision.row).toBeNull();
    expect(decision.matchedExistingId).toBe("opp-1");
  });

  test("flags a duplicate by same-organization + high title similarity (e.g. an added year suffix)", () => {
    // titleSimilarity is plain word-level Jaccard — swapping a year token (2026 -> 2027)
    // drops two whole tokens out of a short title and lands under the 0.6 threshold, so this
    // only reliably catches a title that's a near-strict superset of the other, like a bare
    // year suffix appended to an otherwise-identical title.
    const existing: (DedupCandidate & { id: string })[] = [{ id: "opp-2", title: "Economics Summer Challenge", organization: "Acme Foundation", officialUrl: "https://acme.org/challenge" }];
    const r = record({ title: "Economics Summer Challenge 2027", organization: "Acme Foundation", official_url: "https://acme.org/challenge-2027", source_url: "https://acme.org/challenge-2027" });
    const decision = decideIngestion(r, existing);
    expect(decision.outcome).toBe("duplicate");
    expect(decision.matchedExistingId).toBe("opp-2");
  });

  test("is idempotent: ingesting the same record twice against its own first output never double-accepts", () => {
    const first = decideIngestion(record(), []);
    expect(first.outcome).toBe("accepted");
    const existing: (DedupCandidate & { id: string })[] = [{ id: "opp-new", title: first.row!.title, organization: first.row!.organization, officialUrl: first.row!.official_url }];
    const second = decideIngestion(record(), existing);
    expect(second.outcome).toBe("duplicate");
  });

  test("defaults application_url to official_url when not separately provided", () => {
    const decision = decideIngestion(record({ application_url: null }), []);
    expect(decision.row?.application_url).toBe("https://promys.org");
  });

  test("preserves an explicit application_url distinct from official_url", () => {
    const decision = decideIngestion(record({ application_url: "https://promys.org/apply-now" }), []);
    expect(decision.row?.application_url).toBe("https://promys.org/apply-now");
  });
});
