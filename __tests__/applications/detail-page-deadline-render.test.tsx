// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MockSupabaseClient, type MockTableConfig } from "../stubs/mock-supabase-table";

/**
 * 2026-09-05 (docs/past-deadline-honesty-measurement-2026-09-05.md, CEO's fix follow-up):
 * app/(app)/applications/[id]/page.tsx used to interpolate `application.deadline` into a
 * plain PageHeader description string — a past deadline rendered identically to one still
 * ahead, no badge, no "passed" wording. Fixed by routing it through the same shared
 * `DeadlineBadge` component the applications LIST view (`applications-view.tsx`) already
 * used correctly a few lines away in the same feature.
 *
 * Real render, not a read of the JSX — same technique as
 * __tests__/universities/compare-page-render.test.tsx (MockSupabaseClient + @testing-
 * library/react + a pinned clock, since the whole point is "is this date before or after
 * today").
 *
 * Verified red before trusting this green: reverted the page's own fix (`git stash` on just
 * that file), re-ran this file — the first two tests failed exactly as expected (the
 * rendered text contained the raw ISO date, e.g. "due 2026-01-15", with neither "Past due"
 * nor "days left" anywhere), the "no deadline" test still passed since that path was never
 * touched by the fix either way. Restored the fix, confirmed 3/3 green again.
 */

const { requireUserMock, resolveLocaleMock, getTranslationsMock, createClientMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  resolveLocaleMock: vi.fn().mockResolvedValue("en"),
  getTranslationsMock: vi.fn().mockResolvedValue((key: string) => key),
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/security/dal", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: resolveLocaleMock }));
vi.mock("next-intl/server", () => ({ getTranslations: getTranslationsMock }));
// This page also renders client components (ApplicationStatusControl, NotesField) that call
// next-intl's own useTranslations hook directly, not the server-side getTranslations above —
// same key-passthrough behavior, so assertions on either side stay simple substring checks.
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/requirements/persist", () => ({ refreshRequirementEvaluations: vi.fn().mockResolvedValue(undefined) }));

import ApplicationDetailPage from "@/app/(app)/applications/[id]/page";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const APP_ID = "22222222-2222-2222-2222-222222222222";

function baseApplication(overrides: Record<string, unknown>) {
  return {
    id: APP_ID,
    user_id: USER_ID,
    target_university_id: "target-1",
    application_type: "regular",
    status: "not_started",
    notes: null,
    ...overrides,
  };
}

function renderDetail(applicationRow: Record<string, unknown>) {
  requireUserMock.mockResolvedValue({ userId: USER_ID, isAuth: true });
  const tables: Record<string, MockTableConfig> = {
    applications: { rows: [applicationRow] },
    target_universities: { rows: [] },
    application_requirements: { rows: [] },
    universities: { rows: [] },
  };
  createClientMock.mockResolvedValue(new MockSupabaseClient(tables));
  return ApplicationDetailPage({ params: Promise.resolve({ id: APP_ID }) });
}

describe("application detail page — deadline render (2026-09-05 fix)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  test("a past deadline says it's passed, not a bare date indistinguishable from an upcoming one", async () => {
    const element = await renderDetail(baseApplication({ deadline: "2026-01-15" }));
    const { container } = render(element);

    // DeadlineBadge's own urgencyLabel: "Past due" for a negative days-until (see
    // components/proxola/deadline-badge.test.ts for that function's own direct proof).
    expect(container.textContent).toContain("Past due");
    // The bare, unqualified date string must not appear on its own anymore — it's rendered
    // through the badge component, not interpolated as raw text.
    expect(container.textContent).not.toContain("2026-01-15");
  });

  test("an upcoming deadline still shows real urgency, not an alarm that hasn't happened", async () => {
    const element = await renderDetail(baseApplication({ deadline: "2026-09-20" }));
    const { container } = render(element);

    expect(container.textContent).toContain("days left");
    expect(container.textContent).not.toContain("Past due");
  });

  test("no deadline on file: no badge, no crash, no stray 'due' label with nothing after it", async () => {
    const element = await renderDetail(baseApplication({ deadline: null }));
    const { container } = render(element);

    expect(container.textContent).not.toContain("Past due");
    expect(container.textContent).not.toContain("days left");
  });
});
