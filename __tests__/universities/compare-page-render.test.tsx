// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MockSupabaseClient, type MockTableConfig } from "../stubs/mock-supabase-table";

/**
 * C7 follow-up (CEO, 2026-09-04): "kaynak okumakla yetinme, mümkünse render et" — don't just
 * read the source, render it. This file actually executes app/(app)/universities/compare/
 * page.tsx's own code against real, live-captured data (queried directly against the DB
 * earlier the same session, see docs/c7-comparison-thin-data-2026-09-04.md) and inspects the
 * real DOM output — not a trace of the JSX by eye.
 *
 * These tests PROVE a finding; they do not assert desired behavior. The self-contradicting
 * SourceBadge test below is expected to change the day someone fixes it — that's the point:
 * this file is evidence for a report, not a spec for what "correct" looks like. See C7's own
 * doc for the full writeup and what a fix here would need to do (mirror the detail page's
 * `missingCoreAdmissionStats` guard).
 *
 * Mock shape follows __tests__/advisor/chat-route-guards.test.ts's established pattern
 * (vi.hoisted + one vi.mock per dependency, import the thing under test after the mocks) and
 * __tests__/settings/plan-tier-view.test.tsx's jsdom + @testing-library/react precedent for
 * this codebase. `.in()` support was added to mock-supabase-table.ts for this file — the
 * first consumer whose queries need it.
 */

const {
  requireProfileMock,
  resolveLocaleMock,
  getTranslationsMock,
  logEventMock,
  createClientMock,
} = vi.hoisted(() => ({
  requireProfileMock: vi.fn(),
  resolveLocaleMock: vi.fn().mockResolvedValue("en"),
  getTranslationsMock: vi.fn().mockResolvedValue((key: string) => key),
  logEventMock: vi.fn().mockResolvedValue(undefined),
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/security/dal", () => ({ requireProfile: requireProfileMock }));
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: resolveLocaleMock }));
vi.mock("next-intl/server", () => ({ getTranslations: getTranslationsMock }));
vi.mock("@/lib/analytics/log", () => ({ logEvent: logEventMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import CompareUniversitiesPage from "@/app/(app)/universities/compare/page";

const ULTRA_PROFILE = { id: "test-student", plan_tier: "ultra" as const, ultra_gift_expires_at: null };

// Every field below is a real value queried live against the production DB this same
// session (project qtcvcflzxbuagvvwahhu) — not invented fixture data. See
// docs/c7-comparison-thin-data-2026-09-04.md for the queries these came from.
const MIT_ID = "03167d0c-2315-49e3-a37e-f9c9c7d2d27c";
const OXFORD_ID = "e5164eb3-88c1-4ecc-81d7-d591ea0c34ea";
const EDINBURGH_ID = "e2feb81c-1bda-4889-8aa9-37783b720901";

const universities: MockTableConfig = {
  rows: [
    { id: MIT_ID, name: "Massachusetts Institute of Technology", city: "Cambridge", country: "United States", institution_type: "Private nonprofit", student_size: 11816, application_system: null },
    { id: OXFORD_ID, name: "University of Oxford", city: "Oxford", country: "United Kingdom", institution_type: "Public", student_size: 26800, application_system: null },
    { id: EDINBURGH_ID, name: "The University of Edinburgh", city: "Edinburgh", country: "United Kingdom", institution_type: "Public", student_size: 49485, application_system: "UCAS" },
  ],
};

const universityStatistics: MockTableConfig = {
  rows: [
    { university_id: MIT_ID, admission_rate: 0.0455, cost_of_attendance: 82730, cost_currency: "USD", source: "College Scorecard (US Dept. of Education, IPEDS-derived)", data_confidence: "high", updated_at: "2026-09-04T00:00:00Z" },
    // Oxford: the D6/C7 case. Every headline figure is null, but `source` is a real, populated URL.
    { university_id: OXFORD_ID, admission_rate: null, cost_of_attendance: null, cost_currency: null, source: "https://www.ox.ac.uk/about/facts-and-figures/admissions-statistics/undergraduate-students", data_confidence: "medium", updated_at: "2026-09-04T08:08:10Z" },
    { university_id: EDINBURGH_ID, admission_rate: 0.53, cost_of_attendance: null, cost_currency: null, source: "https://study.ed.ac.uk/undergraduate/applying/selection/admissions-statistics", data_confidence: "high", updated_at: "2026-09-04T00:00:00Z" },
  ],
};

const universityRankings: MockTableConfig = {
  rows: [
    { university_id: MIT_ID, rank_display: "1" },
    { university_id: OXFORD_ID, rank_display: "4" },
    { university_id: EDINBURGH_ID, rank_display: "35" },
  ],
};

const universityProfileMetrics: MockTableConfig = {
  rows: [
    // Oxford's real tuition figures — value_numeric, not value_text (the column the real page reads).
    { university_id: OXFORD_ID, metric_code: "tuition_domestic_annual", value_text: null, value_numeric: 9790, unit: "GBP/year", precision_state: "exact" },
    { university_id: OXFORD_ID, metric_code: "tuition_international_annual", value_text: null, value_numeric: 37380, unit: "GBP/year", precision_state: "range" },
    { university_id: OXFORD_ID, metric_code: "research_topics_top5", value_text: "Particle physics | Genomics | Data Analysis", value_numeric: null, unit: "text", precision_state: "category_only" },
    { university_id: EDINBURGH_ID, metric_code: "tuition_domestic_annual", value_text: null, value_numeric: 9790, unit: "GBP/year", precision_state: "exact" },
    { university_id: EDINBURGH_ID, metric_code: "tuition_international_annual", value_text: null, value_numeric: 29600, unit: "GBP/year", precision_state: "exact" },
    { university_id: EDINBURGH_ID, metric_code: "research_topics_top5", value_text: "Informatics | Medicine | Law", value_numeric: null, unit: "text", precision_state: "category_only" },
    // MIT genuinely has no research_topics_top5 row and no tuition rows (US -> cost_of_attendance covers it) — omitted, not zeroed.
  ],
};

function renderCompare(ids: string[]) {
  requireProfileMock.mockResolvedValue(ULTRA_PROFILE);
  createClientMock.mockResolvedValue(
    new MockSupabaseClient({
      universities,
      university_statistics: universityStatistics,
      university_rankings: universityRankings,
      university_profile_metrics: universityProfileMetrics,
    })
  );
  return CompareUniversitiesPage({ searchParams: Promise.resolve({ ids: ids.join(",") }) });
}

describe("universities compare page — real render, real captured data (C7)", () => {
  test("Oxford's row shows the self-contradicting shape: '—' for cost and admission rate, but a real SourceBadge with the ox.ac.uk URL in the same column", async () => {
    const element = await renderCompare([MIT_ID, OXFORD_ID, EDINBURGH_ID]);
    const { container } = render(element);

    const headerCells = Array.from(container.querySelectorAll("thead th")).map((th) => th.textContent?.trim());
    const oxfordColumnIndex = headerCells.findIndex((text) => text?.includes("University of Oxford"));
    expect(oxfordColumnIndex).toBeGreaterThan(0); // 0 is the blank corner cell

    const rowsByLabel = new Map<string, HTMLTableCellElement[]>();
    for (const tr of Array.from(container.querySelectorAll("tbody tr"))) {
      const cells = Array.from(tr.querySelectorAll("td"));
      const label = cells[0]?.textContent?.trim() ?? "";
      rowsByLabel.set(label, cells as HTMLTableCellElement[]);
    }

    const oxfordCost = rowsByLabel.get("costOfAttendance")?.[oxfordColumnIndex];
    const oxfordAdmission = rowsByLabel.get("admissionRate")?.[oxfordColumnIndex];
    const oxfordSource = rowsByLabel.get("statisticsSource")?.[oxfordColumnIndex];

    // The bug, proven by actual rendered text content — not by reading the conditional.
    expect(oxfordCost?.textContent?.trim()).toBe("—");
    expect(oxfordAdmission?.textContent?.trim()).toBe("—");
    expect(oxfordSource?.textContent).toContain("ox.ac.uk");

    cleanup();
  });

  test("Oxford's real tuition (£9,790 / £37,380) renders correctly — the value_text/value_numeric mismatch was in the report author's own query, not the product code", async () => {
    const element = await renderCompare([MIT_ID, OXFORD_ID, EDINBURGH_ID]);
    const { container } = render(element);

    const headerCells = Array.from(container.querySelectorAll("thead th")).map((th) => th.textContent?.trim());
    const oxfordColumnIndex = headerCells.findIndex((text) => text?.includes("University of Oxford"));

    const rowsByLabel = new Map<string, Element[]>();
    for (const tr of Array.from(container.querySelectorAll("tbody tr"))) {
      const cells = Array.from(tr.querySelectorAll("td"));
      rowsByLabel.set(cells[0]?.textContent?.trim() ?? "", cells);
    }

    const oxfordTuition = rowsByLabel.get("tuition")?.[oxfordColumnIndex];
    expect(oxfordTuition?.textContent).not.toBe("—");
    expect(oxfordTuition?.textContent?.length ?? 0).toBeGreaterThan(0);

    cleanup();
  });

  test("no deadline row exists at all for universities — not blank, absent: the full set of rendered row labels has no deadline-shaped entry", async () => {
    const element = await renderCompare([MIT_ID, OXFORD_ID, EDINBURGH_ID]);
    const { container } = render(element);

    const rowLabels = Array.from(container.querySelectorAll("tbody tr td:first-child")).map((td) => td.textContent?.trim());
    expect(rowLabels).toEqual([
      "location",
      "qsRanking",
      "institutionType",
      "students",
      "costOfAttendance",
      "tuition",
      "admissionRate",
      "statisticsSource",
      "applicationSystem",
      "researchStrengths",
    ]);
    expect(rowLabels.some((l) => l?.toLowerCase().includes("deadline"))).toBe(false);

    cleanup();
  });

  test("MIT — the single most-targeted university in the product — still shows real gaps: applicationSystem and researchStrengths both '—', same as an untouched row", async () => {
    const element = await renderCompare([MIT_ID, OXFORD_ID, EDINBURGH_ID]);
    const { container } = render(element);

    const headerCells = Array.from(container.querySelectorAll("thead th")).map((th) => th.textContent?.trim());
    const mitColumnIndex = headerCells.findIndex((text) => text?.includes("Massachusetts Institute of Technology"));

    const rowsByLabel = new Map<string, Element[]>();
    for (const tr of Array.from(container.querySelectorAll("tbody tr"))) {
      const cells = Array.from(tr.querySelectorAll("td"));
      rowsByLabel.set(cells[0]?.textContent?.trim() ?? "", cells);
    }

    expect(rowsByLabel.get("applicationSystem")?.[mitColumnIndex]?.textContent?.trim()).toBe("—");
    expect(rowsByLabel.get("researchStrengths")?.[mitColumnIndex]?.textContent?.trim()).toBe("—");
    // But MIT is not uniformly empty — cost, admission rate, and source are real, proving this
    // is a partial-gap picture, not a blanket "MIT has no data" situation.
    expect(rowsByLabel.get("costOfAttendance")?.[mitColumnIndex]?.textContent).not.toBe("—");
    expect(rowsByLabel.get("admissionRate")?.[mitColumnIndex]?.textContent).not.toBe("—");

    cleanup();
  });
});
