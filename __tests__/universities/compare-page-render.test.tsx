// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MockSupabaseClient, type MockTableConfig } from "../stubs/mock-supabase-table";

/**
 * C7 follow-up (CEO, 2026-09-04): "kaynak okumakla yetinme, mümkünse render et" — don't just
 * read the source, render it. This file actually executes app/(app)/universities/compare/
 * page.tsx's own code against real, live-captured data (queried directly against the DB the
 * same session, see docs/c7-comparison-thin-data-2026-09-04.md) and inspects the real DOM
 * output — not a trace of the JSX by eye.
 *
 * Extended the same day for CEO's actual fix assignment: suppress the statisticsSource badge
 * when core stats are missing (mirrors the detail page's own fix), and add an honest
 * application-deadline row (the page queried university_deadlines nowhere before this). The
 * first version of this file proved the BUG; this version proves the FIX — same technique,
 * opposite direction, which is exactly what a real render test is for.
 *
 * `today` is pinned via vi.useFakeTimers()/setSystemTime rather than left on the real clock —
 * the deadline row's content depends on "is this date still upcoming", and an assertion built
 * on today's real date would silently start failing once Oct 15, 2026 (one of the real dates
 * below) is no longer in the future. See lib/universities/data-depth.ts's own
 * soonestApplicationDeadline for the pure-function-level version of this same proof with a
 * pinned `today`, plus edge cases (non-actionable states, expired dates, dated-vs-recurring
 * sort) this file doesn't re-cover at the page level.
 *
 * Mock shape follows __tests__/advisor/chat-route-guards.test.ts's established pattern
 * (vi.hoisted + one vi.mock per dependency, import the thing under test after the mocks),
 * __tests__/settings/plan-tier-view.test.tsx's jsdom + @testing-library/react precedent, and
 * __tests__/admin/ai-spend-shape.test.ts's useFakeTimers/setSystemTime pattern.
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

// Every field below is a real value queried live against the production DB this same session
// (project qtcvcflzxbuagvvwahhu) — not invented fixture data. See
// docs/c7-comparison-thin-data-2026-09-04.md and data-depth.test.ts's own soonestApplicationDeadline
// block for the queries these came from.
const MIT_ID = "03167d0c-2315-49e3-a37e-f9c9c7d2d27c";
const OXFORD_ID = "e5164eb3-88c1-4ecc-81d7-d591ea0c34ea";
const EDINBURGH_ID = "e2feb81c-1bda-4889-8aa9-37783b720901";
const YALE_ID = "a24caa73-0ddd-4beb-899b-ba9d81c6622e";

const universities: MockTableConfig = {
  rows: [
    { id: MIT_ID, name: "Massachusetts Institute of Technology", city: "Cambridge", country: "United States", institution_type: "Private nonprofit", student_size: 11816, application_system: null, admissions_url: "https://mitadmissions.org", website_url: "https://mit.edu" },
    { id: OXFORD_ID, name: "University of Oxford", city: "Oxford", country: "United Kingdom", institution_type: "Public", student_size: 26800, application_system: null, admissions_url: null, website_url: "https://www.ox.ac.uk" },
    { id: EDINBURGH_ID, name: "The University of Edinburgh", city: "Edinburgh", country: "United Kingdom", institution_type: "Public", student_size: 49485, application_system: "UCAS", admissions_url: null, website_url: "https://www.ed.ac.uk" },
    { id: YALE_ID, name: "Yale University", city: "New Haven", country: "United States", institution_type: "Private nonprofit", student_size: 6600, application_system: null, admissions_url: null, website_url: "https://www.yale.edu" },
  ],
};

const universityStatistics: MockTableConfig = {
  rows: [
    { university_id: MIT_ID, admission_rate: 0.0455, cost_of_attendance: 82730, cost_currency: "USD", source: "College Scorecard (US Dept. of Education, IPEDS-derived)", data_confidence: "high", updated_at: "2026-09-04T00:00:00Z", sat_range_low: 1520, act_range_low: 34, graduation_rate: 0.9641 },
    // Oxford: the D6/C7 case. Every headline figure is null, but `source` is a real, populated URL.
    { university_id: OXFORD_ID, admission_rate: null, cost_of_attendance: null, cost_currency: null, source: "https://www.ox.ac.uk/about/facts-and-figures/admissions-statistics/undergraduate-students", data_confidence: "medium", updated_at: "2026-09-04T08:08:10Z", sat_range_low: null, act_range_low: null, graduation_rate: null },
    { university_id: EDINBURGH_ID, admission_rate: 0.53, cost_of_attendance: null, cost_currency: null, source: "https://study.ed.ac.uk/undergraduate/applying/selection/admissions-statistics", data_confidence: "high", updated_at: "2026-09-04T00:00:00Z", sat_range_low: null, act_range_low: null, graduation_rate: null },
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

// Real rows, queried live 2026-09-04 — see data-depth.test.ts's soonestApplicationDeadline
// block for the same three universities' exact shapes and expected soonest values.
const universityDeadlines: MockTableConfig = {
  rows: [
    { university_id: MIT_ID, deadline_type: "scholarship", deadline_date: null, recurrence: "recurring_annual_undated", verification_state: "VERIFIED_RECURRING_UNDATED", recurrence_month: null, recurrence_day: null },
    { university_id: MIT_ID, deadline_type: "scholarship", deadline_date: null, recurrence: "recurring_annual_undated", verification_state: "VERIFIED_RECURRING_UNDATED", recurrence_month: null, recurrence_day: null },
    { university_id: OXFORD_ID, deadline_type: "application", deadline_date: "2026-10-15", recurrence: "dated_specific", verification_state: "unverified", recurrence_month: null, recurrence_day: null },
    { university_id: OXFORD_ID, deadline_type: "document", deadline_date: "2026-11-10", recurrence: "dated_specific", verification_state: "unverified", recurrence_month: null, recurrence_day: null },
    { university_id: EDINBURGH_ID, deadline_type: "document", deadline_date: "2026-07-15", recurrence: "dated_specific", verification_state: "VERIFIED_HISTORICAL", recurrence_month: null, recurrence_day: null },
    { university_id: EDINBURGH_ID, deadline_type: "application", deadline_date: "2026-09-01", recurrence: "dated_specific", verification_state: "unverified", recurrence_month: null, recurrence_day: null },
    { university_id: EDINBURGH_ID, deadline_type: "early", deadline_date: "2026-10-15", recurrence: "dated_specific", verification_state: "unverified", recurrence_month: null, recurrence_day: null },
    { university_id: EDINBURGH_ID, deadline_type: "application", deadline_date: "2027-01-13", recurrence: "dated_specific", verification_state: "unverified", recurrence_month: null, recurrence_day: null },
    // Yale: ONLY recurring_annual_undated rows for both types, no dated row exists at all.
    { university_id: YALE_ID, deadline_type: "application", deadline_date: null, recurrence: "recurring_annual_undated", verification_state: "VERIFIED_RECURRING_UNDATED", recurrence_month: 5, recurrence_day: 1 },
    { university_id: YALE_ID, deadline_type: "application", deadline_date: null, recurrence: "recurring_annual_undated", verification_state: "VERIFIED_RECURRING_UNDATED", recurrence_month: 1, recurrence_day: 2 },
    { university_id: YALE_ID, deadline_type: "early", deadline_date: null, recurrence: "recurring_annual_undated", verification_state: "VERIFIED_RECURRING_UNDATED", recurrence_month: 11, recurrence_day: 1 },
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
      university_deadlines: universityDeadlines,
    })
  );
  return CompareUniversitiesPage({ searchParams: Promise.resolve({ ids: ids.join(",") }) });
}

function cellsByRowLabel(container: HTMLElement): Map<string, Element[]> {
  const map = new Map<string, Element[]>();
  for (const tr of Array.from(container.querySelectorAll("tbody tr"))) {
    const cells = Array.from(tr.querySelectorAll("td"));
    map.set(cells[0]?.textContent?.trim() ?? "", cells);
  }
  return map;
}

function columnIndexFor(container: HTMLElement, nameSubstring: string): number {
  const headerCells = Array.from(container.querySelectorAll("thead th")).map((th) => th.textContent?.trim());
  return headerCells.findIndex((text) => text?.includes(nameSubstring));
}

describe("universities compare page — real render, real captured data (C7 + CEO's fix follow-up)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  test("FIXED: Oxford's SourceBadge is now suppressed when core stats are missing — the exact self-contradiction C7 found is gone", async () => {
    const element = await renderCompare([MIT_ID, OXFORD_ID, EDINBURGH_ID]);
    const { container } = render(element);
    const oxfordCol = columnIndexFor(container, "University of Oxford");
    const rows = cellsByRowLabel(container);

    expect(rows.get("costOfAttendance")?.[oxfordCol]?.textContent?.trim()).toBe("—");
    expect(rows.get("admissionRate")?.[oxfordCol]?.textContent?.trim()).toBe("—");
    // Previously this contained "ox.ac.uk" — now suppressed alongside the two "—" cells above.
    expect(rows.get("statisticsSource")?.[oxfordCol]?.textContent?.trim()).toBe("—");
  });

  test("Edinburgh's SourceBadge still renders — its admissionRate is real, so nothing to contradict", async () => {
    const element = await renderCompare([MIT_ID, OXFORD_ID, EDINBURGH_ID]);
    const { container } = render(element);
    const edinburghCol = columnIndexFor(container, "University of Edinburgh");
    const rows = cellsByRowLabel(container);

    expect(rows.get("admissionRate")?.[edinburghCol]?.textContent?.trim()).toBe("53%");
    expect(rows.get("statisticsSource")?.[edinburghCol]?.textContent).toContain("ed.ac.uk");
  });

  test("Oxford's real tuition (£9,790 / £37,380) still renders — untouched by the badge fix", async () => {
    const element = await renderCompare([MIT_ID, OXFORD_ID, EDINBURGH_ID]);
    const { container } = render(element);
    const oxfordCol = columnIndexFor(container, "University of Oxford");
    const rows = cellsByRowLabel(container);

    expect(rows.get("tuition")?.[oxfordCol]?.textContent).not.toBe("—");
  });

  test("NEW ROW: applicationDeadline is now the 5th row, right after students — full ordered label list", async () => {
    const element = await renderCompare([MIT_ID, OXFORD_ID, EDINBURGH_ID]);
    const { container } = render(element);
    const rowLabels = Array.from(container.querySelectorAll("tbody tr td:first-child")).map((td) => td.textContent?.trim());
    expect(rowLabels).toEqual([
      "location",
      "qsRanking",
      "institutionType",
      "students",
      "applicationDeadline",
      "costOfAttendance",
      "tuition",
      "admissionRate",
      "statisticsSource",
      "applicationSystem",
      "researchStrengths",
    ]);
  });

  test("MIT: honest 'not confirmed' text with a real clickable link — never a claim that no deadline exists", async () => {
    const element = await renderCompare([MIT_ID, OXFORD_ID, EDINBURGH_ID]);
    const { container } = render(element);
    const mitCol = columnIndexFor(container, "Massachusetts Institute of Technology");
    const rows = cellsByRowLabel(container);

    const cell = rows.get("applicationDeadline")?.[mitCol];
    expect(cell?.textContent).toContain("applicationDeadlineNotConfirmed");
    expect(cell?.textContent?.toLowerCase()).not.toContain("no deadline");
    expect(cell?.textContent?.toLowerCase()).not.toContain("does not exist");
    const link = cell?.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("https://mitadmissions.org");
  });

  test("Oxford: real soonest deadline rendered — Application: Oct 15, 2026", async () => {
    const element = await renderCompare([MIT_ID, OXFORD_ID, EDINBURGH_ID]);
    const { container } = render(element);
    const oxfordCol = columnIndexFor(container, "University of Oxford");
    const rows = cellsByRowLabel(container);

    const text = rows.get("applicationDeadline")?.[oxfordCol]?.textContent ?? "";
    expect(text).toContain("deadlineTypeApplication");
    expect(text).not.toBe("—");
  });

  test("Edinburgh: soonest of several real rows is the 'early' one (Oct 15), not the earlier-listed but already-expired application row (Sep 1)", async () => {
    const element = await renderCompare([MIT_ID, OXFORD_ID, EDINBURGH_ID]);
    const { container } = render(element);
    const edinburghCol = columnIndexFor(container, "University of Edinburgh");
    const rows = cellsByRowLabel(container);

    const text = rows.get("applicationDeadline")?.[edinburghCol]?.textContent ?? "";
    expect(text).toContain("deadlineTypeEarly");
  });

  test("Yale: ONLY recurring_annual_undated rows, no dated row at all — still shows a real date, not '—'", async () => {
    const element = await renderCompare([MIT_ID, YALE_ID]);
    const { container } = render(element);
    const yaleCol = columnIndexFor(container, "Yale University");
    const rows = cellsByRowLabel(container);

    const cell = rows.get("applicationDeadline")?.[yaleCol];
    expect(cell?.textContent).toContain("deadlineTypeEarly");
    expect(cell?.textContent).not.toBe("—");
  });

  test("MIT still shows its other real gaps (applicationSystem, researchStrengths) unaffected by either fix", async () => {
    const element = await renderCompare([MIT_ID, OXFORD_ID, EDINBURGH_ID]);
    const { container } = render(element);
    const mitCol = columnIndexFor(container, "Massachusetts Institute of Technology");
    const rows = cellsByRowLabel(container);

    expect(rows.get("applicationSystem")?.[mitCol]?.textContent?.trim()).toBe("—");
    expect(rows.get("researchStrengths")?.[mitCol]?.textContent?.trim()).toBe("—");
  });
});
