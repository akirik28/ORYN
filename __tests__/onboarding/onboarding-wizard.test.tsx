// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * Regression coverage for the double-activation bug found this session: `Continue`
 * (features/onboarding/onboarding-wizard.tsx's goNext) had no `disabled` guard, unlike
 * `Back` and `Finish`. Two closely-spaced activations — a real double-click, or two fast
 * Enter/Space presses while focus stays on Continue — called setStep's functional
 * updater twice before either had a chance to be observed, silently skipping a step
 * with no error and no visual glitch. Fixed with a useRef re-entrancy guard released on
 * step change, chosen specifically because it changes no rendered prop on the button
 * (an isPending-based disabled state would visibly change on every normal click to
 * guard a rare fault).
 *
 * Two React-behavior subtleties this file had to work around, discovered by running it
 * and watching it fail for the wrong reason before landing on this shape:
 * - Steps render via `AnimatePresence`/Motion (`StepShell`), so the *visible* heading
 *   swap lags a tick behind React's own state commit — assertions on "which step is
 *   now showing" use `findByRole`/`waitFor`, not a synchronous `getByRole`, or they
 *   flake on timing exactly like this session's live-browser testing did.
 * - `fireEvent.click` wraps each call in its own `act()`, which flushes React's state
 *   *and effects* before returning — meaning two separate `fireEvent.click()` calls,
 *   even back-to-back with no `await` between them, each get an independent flush and
 *   never reproduce the actual race (two activations landing before either is
 *   processed). Reproducing that race needs both raw click dispatches inside one
 *   shared `act()` block, done explicitly in the first test below.
 *
 * EntityCombobox/SuggestInput/InterestsStep/ImportStep are mocked to keep this test
 * targeted at step transitions, not their own internals — following
 * __tests__/dashboard/weekly-focus.test.tsx's pattern of mocking what the component
 * imports rather than the component itself.
 */

vi.mock("@/app/(onboarding)/onboarding/actions", () => ({ completeOnboarding: vi.fn() }));
vi.mock("@/features/entities/entity-combobox", () => ({
  EntityCombobox: () => <div data-testid="entity-combobox" />,
}));
vi.mock("@/features/entities/suggest-input", () => ({
  SuggestInput: () => <div data-testid="suggest-input" />,
}));
vi.mock("@/features/onboarding/steps/interests-step", () => ({
  InterestsStep: () => <div data-testid="interests-step" />,
}));
vi.mock("@/features/onboarding/steps/import-step", () => ({
  ImportStep: () => <div data-testid="import-step" />,
}));

import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { completeOnboarding } from "@/app/(onboarding)/onboarding/actions";

beforeEach(() => {
  vi.mocked(completeOnboarding).mockReset();
});

afterEach(() => {
  cleanup();
});

/** Dispatches a real, bubbling click on `el` without fireEvent's own per-call act() flush. */
function rawClick(el: Element) {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

describe("OnboardingWizard — double-activation guard", () => {
  test("two activations landing before either is processed advance exactly one step, not two", async () => {
    render(<OnboardingWizard />);
    const continueButton = screen.getByRole("button", { name: /Continue/ });

    // Both dispatches share one act() block, so — unlike two separate fireEvent.click()
    // calls — neither gets its own flush first. This is the actual race: goNext() runs
    // twice against the same pre-update `step` closure before React (or the guard's
    // step-change effect) has processed the first call.
    act(() => {
      rawClick(continueButton);
      rawClick(continueButton);
    });

    // Before the fix: this settles on step 2 ("What are you interested in?"), having
    // silently skipped step 1 — the exact regression this test guards against.
    expect(await screen.findByRole("heading", { name: "Tell us about your school" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "What are you interested in?" })).not.toBeInTheDocument();
  });

  test("a normal single click still advances one step (the fix doesn't break the common path)", async () => {
    render(<OnboardingWizard />);

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    expect(await screen.findByRole("heading", { name: "Tell us about your school" })).toBeInTheDocument();
  });

  test("Continue is re-armed once the step actually changes — a later click still works", async () => {
    render(<OnboardingWizard />);

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(await screen.findByRole("heading", { name: "Tell us about your school" })).toBeInTheDocument();

    // Step 1 requires country/school/curriculum (all mocked/empty here) — a second,
    // later, well-separated click should be processed and correctly rejected by
    // validation, not silently dropped by a guard stuck from the first transition.
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(await screen.findByText("Fill in your country, school, and curriculum to continue.")).toBeInTheDocument();
  });

  test("a rejected step-1 validation attempt doesn't wedge Continue for a later Back", async () => {
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByRole("button", { name: /Continue/ })); // -> step 1, empty fields
    await screen.findByRole("heading", { name: "Tell us about your school" });

    fireEvent.click(screen.getByRole("button", { name: /Continue/ })); // rejected: validation error, no step change
    expect(await screen.findByText("Fill in your country, school, and curriculum to continue.")).toBeInTheDocument();

    // The guard must not have been left set by the rejected attempt (goNext returns
    // before ever setting it on that path) — Back should work immediately.
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(await screen.findByRole("heading", { name: "What are you working toward?" })).toBeInTheDocument();
  });

  test("two Back activations landing before either is processed retreat exactly one step, not two", async () => {
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByRole("button", { name: /Continue/ })); // -> step 1
    await screen.findByRole("heading", { name: "Tell us about your school" });
    fireEvent.click(screen.getByRole("button", { name: /Continue/ })); // rejected (empty fields) — stay on step 1, guard untouched
    await screen.findByText("Fill in your country, school, and curriculum to continue.");

    // This wizard only has TOTAL_STEPS - 1 = 4 forward steps reachable this way in test
    // (steps 2-4 are mocked), so exercise the same race in the Back direction instead,
    // from step 1: two same-tick Back activations must not go past step 0.
    const backButton = screen.getByRole("button", { name: /Back/ });
    act(() => {
      rawClick(backButton);
      rawClick(backButton);
    });

    expect(await screen.findByRole("heading", { name: "What are you working toward?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back/ })).toBeDisabled();
  });
});

describe("OnboardingWizard — step transition doesn't freeze on the first click", () => {
  test("both the progress value and the visible heading update after one click, immediately", async () => {
    render(<OnboardingWizard />);

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    // Regression test for a defect found and confirmed live (getAnimations() on the
    // step-content element returned zero animations seconds after the click, computed
    // style fully settled at opacity:1/transform:none -- Motion's AnimatePresence was
    // waiting on a completion signal from an exit animation it never actually started,
    // freezing the *visible* step on step 0 forever while `step` state itself had
    // already advanced). Before the fix, the progress bar and the heading disagreed
    // about what step it was; asserting both together is what catches that specific
    // failure mode -- a test that only checked the heading (via findByRole/waitFor,
    // tolerant of a delay) would eventually pass once the animation timed out on its
    // own in a real browser, and never actually prove the desync is gone.
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByRole("heading", { name: "Tell us about your school" })).toBeInTheDocument();
  });
});
