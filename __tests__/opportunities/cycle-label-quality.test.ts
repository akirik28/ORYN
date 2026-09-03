import { describe, expect, it } from "vitest";
import { inspectCycleLabel } from "@/lib/opportunities/cycle-label-quality";
import { decideIngestion } from "@/lib/opportunities/ingest";

/**
 * Fixtures are VERBATIM live `current_cycle_label` values, read from the active catalogue on
 * 2026-09-03, not invented examples. That matters for this particular guard: its whole
 * justification is a claim about what real researcher prose looks like, and a test built
 * from strings written to satisfy the regex would prove the regex matches itself. Each is
 * annotated with the short id it came from so a future reader can go and look at the row.
 */
const LIVE = {
  /** ccd1cf71, Summer at Stanford — the clearest "this is about our database" case. */
  ownRecord: "Row title-year (2025) is stale; live page (summer.stanford.edu/students/high-school) states its 8-week program runs June 20-August 16, 2026, already concluded as of this check (2026-08-22).",
  /** 416cc004, Terp Young Scholars — short, and a real fact wrapped in internal framing. */
  researchDate: "Summer 2026: 13-31 July 2026 (concluded by research date)",
  /** 95b59593, National Economics Challenge. */
  atVerification: "2026 cycle (concluded May 28-29, 2026); 2027 cycle dates not yet posted at verification",
  /** a4c5a08a — "not confirmed on pages fetched". */
  pagesFetched: "Summer placements; exact current-cycle application window not confirmed on pages fetched",
  /** 6f8a2189, Alpha Leo Club — an ISO date frozen into the prose. */
  bakedDate: "Ongoing as of 2026-08-21",
  /** a22bb8af, FU Berlin SommerUNI — 283 chars, the longest in the catalogue. */
  longest:
    "2027 edition confirmed for 2-13 August 2027 (interest list open at time of research); the official page did not display specific Summer 2026 dates when checked, only the general framing \"last two weeks of the Berlin summer holidays\" and a prior confirmed cycle of 25 Aug - 5 Sep 2025",
  /** 51ea0b34, JRHS — a genuinely good, student-readable label. The control. */
  clean: "Rolling submissions, no fixed deadline",
} as const;

describe("inspectCycleLabel", () => {
  it("says nothing about a label that is already good copy", () => {
    expect(inspectCycleLabel(LIVE.clean)).toEqual([]);
  });

  it.each([
    ["", "empty string"],
    ["   ", "whitespace only"],
  ])("returns no findings for %s (%s)", (input) => {
    expect(inspectCycleLabel(input)).toEqual([]);
  });

  it("returns no findings for null", () => {
    expect(inspectCycleLabel(null)).toEqual([]);
  });

  it("returns no findings for undefined", () => {
    expect(inspectCycleLabel(undefined)).toEqual([]);
  });

  it.each([
    ["researchDate", LIVE.researchDate],
    ["atVerification", LIVE.atVerification],
    ["pagesFetched", LIVE.pagesFetched],
  ])("flags %s as referring to Proxola's own research process", (_name, label) => {
    expect(inspectCycleLabel(label).map((f) => f.defect)).toContain("research_process_reference");
  });

  it("flags a label that describes our stored row rather than the opportunity", () => {
    expect(inspectCycleLabel(LIVE.ownRecord).map((f) => f.defect)).toContain("describes_our_own_record");
  });

  it("flags an ISO date frozen into the prose", () => {
    expect(inspectCycleLabel(LIVE.bakedDate).map((f) => f.defect)).toContain("baked_in_date");
  });

  it("flags a label the card cannot show, and reports its real length", () => {
    const finding = inspectCycleLabel(LIVE.longest).find((f) => f.defect === "exceeds_card_width");
    expect(finding).toBeDefined();
    // The number in the message must be this label's real length, not a category label --
    // the point of surfacing it is that a person can judge how much is being clamped away.
    expect(finding?.detail).toContain(String(LIVE.longest.length));
  });

  it("reports every matching signature, not just the first", () => {
    // The longest live label is simultaneously over-width AND research-process prose. A
    // guard that stopped at the first match would under-report exactly the worst offenders.
    const defects = inspectCycleLabel(LIVE.longest).map((f) => f.defect);
    expect(defects).toContain("research_process_reference");
    expect(defects).toContain("exceeds_card_width");
  });

  it("gives every finding a detail that does not leak regex or field internals", () => {
    for (const label of Object.values(LIVE)) {
      for (const finding of inspectCycleLabel(label)) {
        expect(finding.detail.length).toBeGreaterThan(20);
        expect(finding.detail).not.toMatch(/current_cycle_label|\/\^|\\b/);
      }
    }
  });
});

describe("decideIngestion — cycle-label findings are advisory only", () => {
  // Mirrors __tests__/opportunities/ingest.test.ts's own `record()` fixture rather than
  // inventing a second valid shape -- decideIngestion runs an evidence gate before it ever
  // reaches the label, so a record missing source_type/verification_status is rejected long
  // before these assertions could mean anything.
  const base = {
    research_opportunity_id: "RSRCH-OPP-9001",
    title: "Youth Economics Research Programme",
    organization: "Example Institute",
    category: "research" as const,
    official_url: "https://example.edu/programme",
    source_url: "https://example.edu/programme",
    source_type: "official_primary" as const,
    verification_status: "Verified - official page fetched and read",
    researched_at: "2026-09-03",
    description:
      "A twelve-week programme in which secondary school students complete a supervised empirical economics project using public datasets, culminating in a written paper.",
  };

  it("accepts a record whose cycle label is flagged, and surfaces the finding", () => {
    const decision = decideIngestion({ ...base, current_cycle_label: LIVE.ownRecord }, []);
    // The load-bearing assertion: a label finding must NEVER change the outcome.
    expect(decision.outcome).toBe("accepted");
    expect(decision.row?.current_cycle_label).toBe(LIVE.ownRecord);
    expect(decision.labelWarnings.map((f) => f.defect)).toContain("describes_our_own_record");
  });

  it("stores the label unchanged — the guard never rewrites or drops it", () => {
    const decision = decideIngestion({ ...base, current_cycle_label: LIVE.longest }, []);
    expect(decision.row?.current_cycle_label).toBe(LIVE.longest);
  });

  it("keeps label findings out of `warnings`, which reports on the description", () => {
    const decision = decideIngestion({ ...base, current_cycle_label: LIVE.researchDate }, []);
    expect(decision.labelWarnings.length).toBeGreaterThan(0);
    expect(decision.warnings.every((w) => w.defect !== ("research_process_reference" as never))).toBe(true);
  });

  it("reports no label findings when there is no label", () => {
    expect(decideIngestion({ ...base, current_cycle_label: null }, []).labelWarnings).toEqual([]);
  });
});
