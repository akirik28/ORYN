// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * E1 (2026-09-05) — renders PreSeniorGuidanceBanner directly as the top-level awaited async
 * component (not nested inside ApplicationsView, which can only resolve ONE top-level async
 * component itself — see applications-view-render.test.tsx's own mock of this exact component
 * for why). Same identity-translator technique that file and compare-page-render.test.tsx
 * already established: getTranslations mocked to return the key itself, so an assertion on a
 * specific key proves that key — not a sibling one — is what actually rendered; and proves the
 * real per-student value (a title, a date, a checklist label) appears as plain text, never
 * silently dropped by passing it through the (interpolation-blind) mocked t() instead.
 */

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  getLocale: vi.fn(async () => "en"),
}));

import { PreSeniorGuidanceBanner } from "@/features/applications/pre-senior-guidance-banner";
import type { ApplicationsPageGuidance } from "@/lib/applications/grade-relevance";

afterEach(() => {
  cleanup();
});

describe("PreSeniorGuidanceBanner", () => {
  test("a deadline action shows the deadline key and the real title, never the opportunity or none key", async () => {
    const guidance: ApplicationsPageGuidance = {
      grade: 10,
      yearsUntilSenior: 2,
      action: { kind: "deadline", title: "Youth Economics Challenge", date: "2026-10-15", href: "/d1" },
    };
    const { container } = render(await PreSeniorGuidanceBanner({ guidance }));

    expect(container.textContent).toContain("eyebrow");
    expect(container.textContent).toContain("action.deadlineLead");
    expect(container.textContent).toContain("Youth Economics Challenge");
    expect(container.textContent).not.toContain("action.opportunityLead");
    expect(container.textContent).not.toContain("action.none");
  });

  test("an opportunity action shows the real title and organization, never the deadline key", async () => {
    const guidance: ApplicationsPageGuidance = {
      grade: 9,
      yearsUntilSenior: 3,
      action: { kind: "opportunity", title: "Youth Research Fellowship", organization: "OECD Youth Lab", href: "/m1" },
    };
    const { container } = render(await PreSeniorGuidanceBanner({ guidance }));

    expect(container.textContent).toContain("action.opportunityLead");
    expect(container.textContent).toContain("Youth Research Fellowship");
    expect(container.textContent).toContain("OECD Youth Lab");
    expect(container.textContent).not.toContain("action.deadlineLead");
  });

  test("an opportunity with no organization on file doesn't render a stray empty parenthesis", async () => {
    const guidance: ApplicationsPageGuidance = {
      grade: 9,
      yearsUntilSenior: 3,
      action: { kind: "opportunity", title: "Open-Ended Fellowship", organization: null, href: null },
    };
    const { container } = render(await PreSeniorGuidanceBanner({ guidance }));

    expect(container.textContent).toContain("Open-Ended Fellowship");
    expect(container.textContent).not.toContain("()");
  });

  test("a profile-gap action shows the real checklist label text, not a generic placeholder", async () => {
    const guidance: ApplicationsPageGuidance = { grade: 11, yearsUntilSenior: 1, action: { kind: "profile_gap", checklistKey: "career_goal" } };
    const { container } = render(await PreSeniorGuidanceBanner({ guidance }));

    // completenessChecklistLabel is a real bilingual dictionary, not next-intl — unaffected by
    // the getTranslations mock above, so its real English text must appear verbatim.
    expect(container.textContent).toContain("Set a career goal");
  });

  test("no real action anywhere shows the honest 'none' key, never a fabricated task", async () => {
    const guidance: ApplicationsPageGuidance = { grade: 9, yearsUntilSenior: 3, action: { kind: "none" } };
    const { container } = render(await PreSeniorGuidanceBanner({ guidance }));

    expect(container.textContent).toContain("action.none");
  });

  // Deliberately not asserted here: whether yearsUntilSenior's real value reaches the ICU
  // plural interpolation correctly. The identity mock above (`(key) => key`) drops every
  // interpolation argument, same as applications-view-render.test.tsx's own — asserting
  // "yearsUntilSenior" appears would only prove the KEY was called, not that the count reached
  // it, and a test claiming to check that while actually checking something else is exactly
  // the false-verifier shape this codebase has hit before. That correctness is next-intl's own
  // proven ICU-plural handling (already exercised identically by hero.universityCount
  // elsewhere in this file's own namespace), not something worth re-testing per caller.
  test("the whenUsefulLead and yearsUntilSenior keys both render, distinct from each other", async () => {
    const guidance: ApplicationsPageGuidance = { grade: 9, yearsUntilSenior: 3, action: { kind: "none" } };
    const { container } = render(await PreSeniorGuidanceBanner({ guidance }));

    expect(container.textContent).toContain("whenUsefulLead");
    expect(container.textContent).toContain("yearsUntilSenior");
  });
});
