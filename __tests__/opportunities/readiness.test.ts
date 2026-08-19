import { describe, expect, test } from "vitest";
import { evaluateRecommendationReadiness } from "@/lib/opportunities/readiness";
import type { Opportunity } from "@/types/database";

function opportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "opp-1",
    title: "Breakthrough Junior Challenge",
    organization: "Breakthrough Prize Foundation",
    description: "Global video-submission science competition.",
    category: "competition",
    official_url: "https://breakthroughjuniorchallenge.org",
    application_url: null,
    country: null,
    remote_allowed: null,
    minimum_age: null,
    maximum_age: null,
    eligible_countries: [],
    fields: ["Science", "Physics", "Mathematics"],
    cost: 0,
    funding_available: null,
    deadline: "2026-09-15",
    start_date: null,
    end_date: null,
    source: null,
    source_url: "https://breakthroughjuniorchallenge.org",
    source_confidence: "high",
    last_verified_at: "2026-08-16T00:00:00Z",
    status: "active",
    normalized_title: "breakthrough junior challenge",
    cycle_status: "open",
    selectivity_tier: "highly_selective",
    verification_state: "verified_current",
    application_open_date: null,
    eligible_grades: [],
    citizenship_restrictions: null,
    residency_restrictions: null,
    location_mode: "online",
    financial_aid_available: null,
    application_requirements: [],
    current_cycle_label: null,
    verified_at: "2026-08-16T00:00:00Z",
    organization_entity_id: null,
    country_entity_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("evaluateRecommendationReadiness — hard blockers (tier: not_ready)", () => {
  test("a fully-populated, verified_current, open opportunity is recommendation_ready", () => {
    const report = evaluateRecommendationReadiness(opportunity());
    expect(report.tier).toBe("recommendation_ready");
    expect(report.blockers).toEqual([]);
  });

  test("unverified opportunities are not_ready, blocker names verification_state", () => {
    const report = evaluateRecommendationReadiness(opportunity({ verification_state: "unverified" }));
    expect(report.tier).toBe("not_ready");
    expect(report.blockers.join(" ")).toMatch(/verif/i);
  });

  test("closed cycle is not_ready", () => {
    const report = evaluateRecommendationReadiness(opportunity({ cycle_status: "closed" }));
    expect(report.tier).toBe("not_ready");
    expect(report.blockers.join(" ")).toMatch(/cycle/i);
  });

  test("historical cycle is not_ready", () => {
    expect(evaluateRecommendationReadiness(opportunity({ cycle_status: "historical" })).tier).toBe("not_ready");
  });

  test("discontinued cycle is not_ready", () => {
    expect(evaluateRecommendationReadiness(opportunity({ cycle_status: "discontinued" })).tier).toBe("not_ready");
  });

  test("date_not_announced cycle is NOT a blocker on its own — a genuinely current opportunity can have an unannounced next cycle", () => {
    const report = evaluateRecommendationReadiness(opportunity({ cycle_status: "date_not_announced" }));
    expect(report.tier).not.toBe("not_ready");
  });

  test("missing organizer is a blocker", () => {
    const report = evaluateRecommendationReadiness(opportunity({ organization: null }));
    expect(report.tier).toBe("not_ready");
    expect(report.blockers.join(" ")).toMatch(/organizer/i);
  });

  test("no provenance at all (no official_url and no source_url) is a blocker", () => {
    const report = evaluateRecommendationReadiness(opportunity({ official_url: null, source_url: null }));
    expect(report.tier).toBe("not_ready");
    expect(report.blockers.join(" ")).toMatch(/source|url/i);
  });

  test("official_url alone (no source_url) is sufficient provenance, not a blocker", () => {
    const report = evaluateRecommendationReadiness(opportunity({ official_url: "https://example.org", source_url: null }));
    expect(report.tier).not.toBe("not_ready");
  });
});

describe("evaluateRecommendationReadiness — a missing published deadline is never fabricated or required", () => {
  test("no deadline is reported as an honest quality signal, never a blocker, never a fabricated date", () => {
    const report = evaluateRecommendationReadiness(opportunity({ deadline: null }));
    expect(report.tier).not.toBe("not_ready");
    expect(report.qualitySignals.some((s) => /deadline/i.test(s))).toBe(true);
  });
});

describe("evaluateRecommendationReadiness — soft quality signals never block, only inform", () => {
  test("no field/category tags lowers confidence but does not block", () => {
    const report = evaluateRecommendationReadiness(opportunity({ fields: [] }));
    expect(report.tier).not.toBe("not_ready");
    expect(report.qualitySignals.some((s) => /field/i.test(s))).toBe(true);
  });

  test("no eligibility data at all (age/country/grade/citizenship all unset) is reported, not blocked — unknown stays unknown", () => {
    const report = evaluateRecommendationReadiness(
      opportunity({ minimum_age: null, maximum_age: null, eligible_countries: [], eligible_grades: [], citizenship_restrictions: null, residency_restrictions: null })
    );
    expect(report.tier).not.toBe("not_ready");
    expect(report.qualitySignals.some((s) => /eligib/i.test(s))).toBe(true);
  });

  test("a fully-verified, open, well-populated record with only a missing deadline is still recommendation_ready, not merely needs_verification", () => {
    const report = evaluateRecommendationReadiness(opportunity({ deadline: null }));
    expect(report.tier).toBe("recommendation_ready");
  });
});

describe("evaluateRecommendationReadiness — determinism", () => {
  test("same input produces the same report", () => {
    const opp = opportunity();
    expect(evaluateRecommendationReadiness(opp)).toEqual(evaluateRecommendationReadiness(opp));
  });
});
