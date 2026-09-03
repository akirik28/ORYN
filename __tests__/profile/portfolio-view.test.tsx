// @vitest-environment jsdom
import { describe, test, expect, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { PortfolioView } from "@/features/profile/portfolio-view";
import type { PortfolioItem, PortfolioSkill } from "@/lib/portfolio/types";

/**
 * Component-level coverage for PortfolioView (features/profile/portfolio-view.tsx) — had
 * zero coverage of its own before this file; __tests__/portfolio/ only covered the data
 * layer (build.ts, recent.ts). That gap is exactly why the bug below survived undetected:
 * nobody had ever rendered this component and clicked its tabs, in a test or otherwise
 * (app/(app)/profile/portfolio/page.tsx had no design-preview either — see
 * [[project_oryn_student_mobile_pass]]).
 *
 * getAnimations polyfill: see __tests__/ui/tabs.test.tsx's own header comment for the full
 * explanation — jsdom has no Web Animations API, and without polyfilling it to match what a
 * real browser actually returns (an empty array; confirmed live, this app sets no
 * transition/animation on tabs-content), the bug-pinning test below would pass falsely.
 */
beforeAll(() => {
  // No @ts-expect-error needed here either — see __tests__/ui/tabs.test.tsx's own comment.
  Element.prototype.getAnimations = () => [];
});

afterEach(() => cleanup());

const ITEMS: PortfolioItem[] = [
  {
    id: "item-1",
    category: "research",
    title: "Youth unemployment across OECD countries",
    organization: null,
    description: "Independent research project.",
    startDate: "2026-04-01",
    endDate: "2026-07-01",
    ongoing: false,
    meta: "40+ hours",
    createdAt: "2026-08-01",
    evidenceStatus: "evidence_added",
  },
  {
    id: "item-2",
    category: "education",
    title: "IB Diploma Programme",
    organization: "İstanbul International School",
    description: "Higher Level: Economics, Mathematics, Physics.",
    startDate: "2024-10-01",
    endDate: null,
    ongoing: true,
    meta: null,
    createdAt: "2024-10-01",
    evidenceStatus: null,
  },
];

const SKILLS: PortfolioSkill[] = [{ id: "skill-1", name: "Python", category: "Technical" }];

function renderPortfolio(items: PortfolioItem[], skills: PortfolioSkill[] = []) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PortfolioView items={items} skills={skills} />
    </NextIntlClientProvider>,
  );
}

describe("PortfolioView", () => {
  test("empty state: no items and no skills shows the empty state, not a blank Tabs shell", () => {
    renderPortfolio([], []);
    expect(screen.getByText("Your portfolio is empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to Journey" })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  test("populated: renders every item's title on the default Timeline tab", () => {
    renderPortfolio(ITEMS, []);
    expect(screen.getByText("Youth unemployment across OECD countries")).toBeInTheDocument();
    expect(screen.getByText("IB Diploma Programme")).toBeInTheDocument();
  });

  test("evidence badge renders only for items with a non-null evidenceStatus", () => {
    renderPortfolio(ITEMS, []);
    // item-1 has evidence_added; item-2 has null and must stay quiet (evidenceStatusPresentation's
    // own documented contract — a badge on every card would read as a nag, not information).
    expect(screen.getByText("Evidence added")).toBeInTheDocument();
  });

  test("skills render only when the skills array is non-empty", () => {
    renderPortfolio(ITEMS, []);
    expect(screen.queryByText("Skills")).not.toBeInTheDocument();
    cleanup();
    renderPortfolio(ITEMS, SKILLS);
    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
  });

  test("the By-category tab does switch selection correctly", () => {
    renderPortfolio(ITEMS, []);
    fireEvent.click(screen.getByRole("tab", { name: "By category" }));
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "By category" })).toHaveAttribute("aria-selected", "true");
  });

  // test.fails, not test — see __tests__/ui/tabs.test.tsx's header comment for the full
  // root-cause writeup and why .fails() (not skip/todo) is the right tool here. This is the
  // exact bug found live during [[project_oryn_student_mobile_pass]]: both the Timeline and
  // By-category panels stay mounted and visible at once after switching, so a student sees
  // every item twice. Not app code — do not "fix" this test by changing PortfolioView;
  // re-check after any @base-ui/react version bump instead.
  test.fails("switching to By category unmounts the Timeline panel (real Base UI bug, not app code)", () => {
    renderPortfolio(ITEMS, []);
    fireEvent.click(screen.getByRole("tab", { name: "By category" }));
    const panels = document.querySelectorAll('[data-slot="tabs-content"]');
    expect(panels.length).toBe(1);
  });
});
