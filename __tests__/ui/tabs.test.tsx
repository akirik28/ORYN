// @vitest-environment jsdom
import { describe, test, expect, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/**
 * Pins a real @base-ui/react 1.7.0 bug (confirmed 2026-09-03, root-causing
 * [[project_oryn_student_mobile_pass]]'s Portfolio finding): switching tabs never actually
 * unmounts the previously-active `Tabs.Panel`, even though `keepMounted` defaults to
 * `false` and Base UI's own source (`TabsPanel.mjs`: `shouldRender = keepMounted ||
 * mounted`) says it should. Confirmed universal, not specific to any one page's usage —
 * reproduces with this bare, minimal, textbook-correct Tabs tree, with zero relation to any
 * feature component. Confirmed by diffing against Journey's 5-tab instance too: it has the
 * identical bug, discovered only because this investigation re-tested it more carefully
 * than the mobile pass's own first (flawed) check did.
 *
 * jsdom has no Web Animations API at all (`Element.prototype.getAnimations` is
 * `undefined`) — confirmed empirically before writing this test. Base UI's
 * `useAnimationsFinished` explicitly branches on `typeof el.getAnimations !== 'function'`
 * and takes an immediate, synchronous-ish path when it's missing, which is NOT the path a
 * real browser takes (real browsers always have `getAnimations`, confirmed returning `[]`
 * here — zero active animations, matching this app's own CSS, which sets no
 * transition/animation on tabs-content at all). Without the polyfill below, this exact
 * assertion passes in jsdom even though the real bug is live in every browser — confirmed
 * by running it both ways before landing this file. The polyfill is load-bearing, not
 * decoration: it's what makes this test test the real code path instead of jsdom's
 * incomplete one.
 */
beforeAll(() => {
  // No @ts-expect-error needed: lib.dom.d.ts declares getAnimations() (real browsers have
  // it), so this type-checks fine even though jsdom's own runtime never implements it — see
  // file header. Empty array matches what a real browser actually returns here.
  Element.prototype.getAnimations = () => [];
});

afterEach(() => cleanup());

function renderTwoTabs() {
  return render(
    <Tabs defaultValue="alpha">
      <TabsList>
        <TabsTrigger value="alpha">Alpha</TabsTrigger>
        <TabsTrigger value="beta">Beta</TabsTrigger>
      </TabsList>
      <TabsContent value="alpha">Alpha content</TabsContent>
      <TabsContent value="beta">Beta content</TabsContent>
    </Tabs>,
  );
}

describe("Tabs (components/ui/tabs.tsx over @base-ui/react)", () => {
  test("the trigger's selected state does switch correctly", () => {
    renderTwoTabs();
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Beta" }));
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true");
  });

  // test.fails, not test: this assertion is EXPECTED to fail as of @base-ui/react 1.7.0 —
  // see this file's own header comment. .fails() inverts pass/fail, so this shows green in
  // the suite today and turns RED the moment @base-ui/react actually fixes it upstream
  // (loudly, on any version bump) — that's the signal to flip this back to a plain `test`
  // with a positive assertion. Don't "fix" it by deleting, skipping, or rewriting the
  // assertion to match the buggy behavior.
  test.fails("switching tabs unmounts the previously-active panel (real Base UI bug, not app code)", () => {
    renderTwoTabs();
    fireEvent.click(screen.getByRole("tab", { name: "Beta" }));
    const panels = document.querySelectorAll('[data-slot="tabs-content"]');
    expect(panels.length).toBe(1);
    expect(screen.queryByText("Alpha content")).not.toBeInTheDocument();
    expect(screen.getByText("Beta content")).toBeInTheDocument();
  });
});
