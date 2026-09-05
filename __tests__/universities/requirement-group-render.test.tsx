// @vitest-environment jsdom
import { describe, test, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { RequirementGroup, resolveRequirementCheckedAt } from "@/features/universities/requirement-group";
import type { UniversityRequirement } from "@/types/database";

/**
 * 2026-09-05 — before this, every requirement rendered a bare, dateless "Source" link
 * (t("sourceLink")); a student picks courses/tests off a requirement, so an invisible
 * retrieval date here is a sharper version of the tuition-freshness gap fixed the same day
 * elsewhere (fca96582/06a3f1f6). This proves SourceBadge actually renders in its place.
 *
 * The last_checked_at/retrieved_at precedence itself is tested directly against
 * resolveRequirementCheckedAt (a plain pure function), not through a full render —
 * SourceBadge passes checkedAt through formatRelativeTime before any label ever sees it, so
 * asserting on a rendered relative-time string ("3 weeks ago") would be non-deterministic
 * against a fixed test date and wouldn't actually prove which raw field won.
 *
 * RequirementGroup is a plain sync function component (unlike the async Server Components
 * elsewhere in this app) — no getTranslations mocking needed, `t`/`tSourceBadge` are passed
 * in directly as props.
 */

function fakeT(key: string): string {
  return key;
}

function fakeTSourceBadge(key: string): string {
  return key;
}

function baseRequirement(overrides: Partial<UniversityRequirement> = {}): UniversityRequirement {
  return {
    id: "r1",
    university_id: "u1",
    program_id: null,
    requirement_type: "english_proficiency",
    title: "IELTS 6.5",
    requirement_detail: "Overall band 6.5, no sub-score below 6.0.",
    is_required: true,
    structured_rule: null,
    data_confidence: "high",
    data_status: "fresh",
    scope: null,
    verification_state: "verified_current",
    verified_at: null,
    requirement_group_id: null,
    group_role: null,
    is_exclusion: false,
    clause_ref: null,
    test_scale: null,
    scale_ambiguity: null,
    recency_rule: null,
    excluded_provenances: null,
    evaluation_gate: null,
    conflict_group_id: null,
    research_record_id: null,
    unmet_consequence: null,
    calendar_bound_fact_class: null,
    source_url: "https://example.edu/admissions",
    retrieved_at: "2026-08-21T00:00:00Z",
    last_checked_at: null,
    created_at: "2026-08-21T00:00:00Z",
    updated_at: "2026-08-21T00:00:00Z",
    ...overrides,
  };
}

describe("resolveRequirementCheckedAt", () => {
  test("falls back to retrieved_at when last_checked_at is null — the always-populated floor", () => {
    expect(resolveRequirementCheckedAt({ last_checked_at: null, retrieved_at: "2026-08-21T00:00:00Z" })).toBe("2026-08-21T00:00:00Z");
  });

  test("prefers last_checked_at when a real re-check exists", () => {
    expect(resolveRequirementCheckedAt({ last_checked_at: "2026-09-04T00:00:00Z", retrieved_at: "2026-08-21T00:00:00Z" })).toBe("2026-09-04T00:00:00Z");
  });

  test("null when genuinely neither is set", () => {
    expect(resolveRequirementCheckedAt({ last_checked_at: null, retrieved_at: null })).toBeNull();
  });
});

afterEach(() => {
  cleanup();
});

describe("RequirementGroup — source freshness chrome (2026-09-05)", () => {
  test("a requirement with a source_url renders SourceBadge's chrome, not the old bare Source link", () => {
    const { container } = render(
      <RequirementGroup title="Test group" items={[baseRequirement()]} evaluationByRequirement={new Map()} locale="en" t={fakeT} tSourceBadge={fakeTSourceBadge} />
    );
    expect(container.textContent).toContain("source");
    expect(container.textContent).toContain("viewSource");
    expect(container.textContent).not.toContain("sourceLink");
  });

  test("no source_url renders no source chrome at all — unchanged from before", () => {
    const { container } = render(
      <RequirementGroup title="Test group" items={[baseRequirement({ source_url: null })]} evaluationByRequirement={new Map()} locale="en" t={fakeT} tSourceBadge={fakeTSourceBadge} />
    );
    expect(container.textContent).not.toContain("source");
    expect(container.textContent).not.toContain("viewSource");
  });
});
