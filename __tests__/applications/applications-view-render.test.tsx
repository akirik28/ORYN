// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * 2026-09-04 fix (docs/application-tracker-notification-audit-2026-09-04.md, founder's
 * non-negotiable rule #13): the list-view readiness badge used to show a bare percentage
 * captioned only "ready" — the same visual shape the app uses elsewhere for admission-
 * outlook percentages, with no in-context distinction from those. Renders the real
 * ApplicationsView component (not a description of it) and checks the actual DOM for the
 * new "of checklist" caption, mirroring the identity-translator technique
 * __tests__/universities/compare-page-render.test.tsx already established: `getTranslations`
 * is mocked to return the key itself, so an assertion on `t("ofChecklist")`'s output proves
 * that key — not the old `t("ready")` — is what actually renders.
 *
 * `new-application-dialog.tsx` is unrelated to what this file proves (the readiness badge,
 * not the "add application" flow) and pulls in its own client-side `useTranslations` +
 * Dialog primitives — stubbed out to keep this render scoped to what's under test, the same
 * "mock what's not under test" discipline compare-page-render.test.tsx applies to Supabase.
 *
 * `RequirementChipGrid` is also stubbed — not because it's unrelated (it IS part of the same
 * card), but because it's itself an async Server Component, and React's plain
 * @testing-library/react DOM renderer can only resolve the ONE top-level async component this
 * file explicitly `await`s; a nested async child inside the returned tree fails with "is an
 * async Client Component" the moment the renderer tries to commit it. `compare-page-render
 * .test.tsx` doesn't hit this because none of ITS page's children are themselves async.
 */

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  getLocale: vi.fn(async () => "en"),
}));
vi.mock("@/features/applications/new-application-dialog", () => ({
  NewApplicationDialog: () => null,
}));
vi.mock("@/features/applications/requirement-chip-grid", () => ({
  RequirementChipGrid: () => null,
}));
// PreSeniorGuidanceBanner (E1, 2026-09-05) is itself an async Server Component — same nested-
// async limitation as RequirementChipGrid above, same fix. Its own real content is proven in
// __tests__/applications/pre-senior-guidance-banner-render.test.tsx, which awaits it directly
// as the one top-level async component instead. Rendered here as a visible marker (not null,
// unlike RequirementChipGrid) specifically so this file can still prove ApplicationsView wires
// the `guidance` prop to it conditionally — the one thing testing the banner in isolation can't
// show.
vi.mock("@/features/applications/pre-senior-guidance-banner", () => ({
  PreSeniorGuidanceBanner: () => "GUIDANCE_BANNER_MOCK",
}));

import { ApplicationsView, type ApplicationsViewRow } from "@/features/applications/applications-view";

function measuredApplication(overrides: Partial<ApplicationsViewRow> = {}): ApplicationsViewRow {
  return {
    id: "app-oxford",
    universityName: "University of Oxford",
    applicationType: "early_decision",
    deadline: "2026-09-10",
    status: "not_started",
    readiness: { kind: "measured", percent: 0 },
    requirements: [],
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("ApplicationsView — list-view readiness badge (2026-09-04 fix)", () => {
  test("a measured application shows the checklist-scoped caption, never the old bare 'ready' word", async () => {
    const element = await ApplicationsView({ applications: [measuredApplication()], hasTargets: true, availableTargets: [] });
    const { container } = render(element);

    expect(container.textContent).toContain("ofChecklist");
    // "ready" alone (not as a substring of "already"/"readiness"/etc.) must not appear —
    // exact word-boundary match, since "readiness" legitimately appears elsewhere on this
    // page in other contexts this fix doesn't touch.
    expect(container.textContent).not.toMatch(/\bready\b/);
  });

  test("a submitted application (readiness not_tracked) shows no percentage badge at all — unaffected by this fix", async () => {
    const element = await ApplicationsView({
      applications: [measuredApplication({ status: "submitted", readiness: { kind: "not_tracked", applicationStatus: "submitted" } })],
      hasTargets: true,
      availableTargets: [],
    });
    const { container } = render(element);

    expect(container.textContent).not.toContain("ofChecklist");
    expect(container.textContent).not.toMatch(/\d+%/);
  });
});

/**
 * E1 (2026-09-05) — proves ApplicationsView wires the `guidance` prop to the banner
 * conditionally (present only when non-null). The banner's own real content (does a deadline
 * action show the real title, does "none" stay honest, etc.) is proven in
 * pre-senior-guidance-banner-render.test.tsx, which awaits it directly — see the mock above
 * for why this file can't do that itself.
 */
describe("ApplicationsView — pre-senior guidance banner wiring (E1)", () => {
  test("no guidance renders no banner at all", async () => {
    const element = await ApplicationsView({ applications: [], hasTargets: false, availableTargets: [], guidance: null });
    const { container } = render(element);
    expect(container.textContent).not.toContain("GUIDANCE_BANNER_MOCK");
  });

  test("real guidance renders the banner", async () => {
    const element = await ApplicationsView({
      applications: [],
      hasTargets: false,
      availableTargets: [],
      guidance: { grade: 10, yearsUntilSenior: 2, action: { kind: "none" } },
    });
    const { container } = render(element);
    expect(container.textContent).toContain("GUIDANCE_BANNER_MOCK");
  });
});

/**
 * C3 (2026-09-05) — before this, a not-yet-applied target university showed nothing next to
 * its name: no badge, no "not yet assessed" sentence, nothing. A student reading silence there
 * has no way to tell "Oryn hasn't looked at this yet" from "there's nothing to say" — the exact
 * distinction this whole day's work kept coming back to. OutlookBadge itself isn't mocked here
 * (it's a plain sync component, no server-only imports) — its real "Not yet assessed" string
 * must appear verbatim, not a stand-in.
 */
describe("ApplicationsView — target universities section (C3)", () => {
  test("no available targets renders no section at all", async () => {
    const element = await ApplicationsView({ applications: [], hasTargets: false, availableTargets: [] });
    const { container } = render(element);
    expect(container.textContent).not.toContain("targetUniversities.title");
  });

  test("a target with a computed outlook shows its real label, not the null fallback", async () => {
    const element = await ApplicationsView({
      applications: [],
      hasTargets: true,
      availableTargets: [{ id: "t1", name: "Bocconi University", universityId: "u1", outlook: "competitive" }],
    });
    const { container } = render(element);
    expect(container.textContent).toContain("targetUniversities.title");
    expect(container.textContent).toContain("Bocconi University");
    expect(container.textContent).not.toContain("Not yet assessed");
  });

  test("a target with no outlook computed yet shows the real honest fallback text, not silence", async () => {
    const element = await ApplicationsView({
      applications: [],
      hasTargets: true,
      availableTargets: [{ id: "t1", name: "LSE", universityId: "u1", outlook: null }],
    });
    const { container } = render(element);
    expect(container.textContent).toContain("LSE");
    expect(container.textContent).toContain("Not yet assessed");
  });

  test("a target with no resolvable university row still shows its row, as plain text with no dead link", async () => {
    const element = await ApplicationsView({
      applications: [],
      hasTargets: true,
      availableTargets: [{ id: "t1", name: "Unknown", universityId: null, outlook: null }],
    });
    const { container } = render(element);
    expect(container.textContent).toContain("Unknown");
    expect(container.querySelector("a[href='/universities/null']")).toBeNull();
  });
});
