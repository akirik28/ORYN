// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

/**
 * Component-level coverage for WeeklyFocus (features/dashboard/weekly-focus.tsx) —
 * following __tests__/entities/entity-combobox.test.tsx's established pattern (this
 * repo's first React-Testing-Library component test): mock the Server Action module the
 * component imports, render for real, assert on behavior. `fireEvent`, not `user-event`
 * (not a devDependency in this repo — entity-combobox.test.tsx uses fireEvent too).
 *
 * Written for docs/feat2-error-surfacing-audit-2026-08-22.md's #1 finding: toggling an
 * action's checkbox sets `localStatus` optimistically and never checks whether the
 * server write that follows actually succeeded — worse than a silent failure, since a
 * failed save leaves the checkbox showing "completed" indefinitely, actively
 * misreporting success. Per ORYN-CEO's instruction: pin the success path first (a save
 * that works must behave exactly as before), then the failure path — the two describe
 * blocks below are ordered that way, and every test in the first block passes against
 * both the pre-fix and post-fix component.
 */

vi.mock("@/app/(app)/plan/actions", () => ({ updateActionStatus: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { WeeklyFocus } from "@/features/dashboard/weekly-focus";
import { updateActionStatus } from "@/app/(app)/plan/actions";
import { toast } from "sonner";
import type { WeeklyAction } from "@/types/database";

function action(overrides: Partial<WeeklyAction> = {}): WeeklyAction {
  return {
    id: "action-1",
    plan_id: "plan-1",
    user_id: "student-1",
    title: "Finish your economics dataset",
    description: null,
    reason: "The analysis can't start without it.",
    category: "research",
    priority: 1,
    estimated_minutes: 150,
    impact_level: "high",
    deadline: null,
    status: "not_started",
    source_type: "weekly_plan",
    source_id: null,
    reflection_outcome: null,
    reflection_note: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// WeeklyFocus's ActionRow reads useLocale() (for DeadlineBadge's locale prop, added this
// pass) — same NextIntlClientProvider-wrapping fix as __tests__/onboarding/onboarding-
// wizard.test.tsx's renderWizard(), needed once a component under test calls any next-intl
// hook.
function renderWeeklyFocus(actions: WeeklyAction[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <WeeklyFocus actions={actions} />
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(updateActionStatus).mockReset();
  vi.mocked(toast.error).mockReset();
});

afterEach(() => {
  cleanup();
});

describe("WeeklyFocus — pinned success-path behavior", () => {
  test("marking a not-started action complete: the checkbox shows done, no toast, and the reflection prompt appears", async () => {
    vi.mocked(updateActionStatus).mockResolvedValue({});
    renderWeeklyFocus([action()]);

    fireEvent.click(screen.getByRole("button", { name: "Mark as complete" }));

    await waitFor(() => expect(updateActionStatus).toHaveBeenCalledWith({ actionId: "action-1", status: "completed" }));
    expect(screen.getByRole("button", { name: "Mark as not started" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("What happened?")).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("un-marking a completed action: the checkbox reverts to not-done, no toast", async () => {
    vi.mocked(updateActionStatus).mockResolvedValue({});
    renderWeeklyFocus([action({ status: "completed" })]);

    fireEvent.click(screen.getByRole("button", { name: "Mark as not started" }));

    await waitFor(() => expect(updateActionStatus).toHaveBeenCalledWith({ actionId: "action-1", status: "not_started" }));
    expect(screen.getByRole("button", { name: "Mark as complete" })).toHaveAttribute("aria-pressed", "false");
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("saving a reflection outcome on a successful write shows no toast and hides the reflection prompt", async () => {
    vi.mocked(updateActionStatus).mockResolvedValue({});
    renderWeeklyFocus([action()]);

    fireEvent.click(screen.getByRole("button", { name: "Mark as complete" }));
    fireEvent.click(screen.getByRole("button", { name: /Completed successfully/ }));

    await waitFor(() =>
      expect(updateActionStatus).toHaveBeenCalledWith({ actionId: "action-1", status: "completed", reflectionOutcome: "completed_successfully" })
    );
    expect(screen.queryByText("What happened?")).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("WeeklyFocus — failure path (docs/feat2-error-surfacing-audit-2026-08-22.md finding #1)", () => {
  test("a failed toggle rolls the checkbox back rather than leaving it showing a false 'completed'", async () => {
    vi.mocked(updateActionStatus).mockResolvedValue({ error: "Couldn't update that action. Please try again." });
    renderWeeklyFocus([action()]);

    fireEvent.click(screen.getByRole("button", { name: "Mark as complete" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't update that action. Please try again."));
    // The real regression this test guards: before the fix, this assertion fails because
    // the optimistic setLocalStatus("completed") is never rolled back on a server error.
    expect(screen.getByRole("button", { name: "Mark as complete" })).toHaveAttribute("aria-pressed", "false");
  });

  test("a failed toggle also closes the reflection prompt it optimistically opened", async () => {
    vi.mocked(updateActionStatus).mockResolvedValue({ error: "Couldn't update that action. Please try again." });
    renderWeeklyFocus([action()]);

    fireEvent.click(screen.getByRole("button", { name: "Mark as complete" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByText("What happened?")).not.toBeInTheDocument();
  });

  test("a failed un-toggle (completed -> not_started) rolls back to showing completed", async () => {
    vi.mocked(updateActionStatus).mockResolvedValue({ error: "Couldn't update that action. Please try again." });
    renderWeeklyFocus([action({ status: "completed" })]);

    fireEvent.click(screen.getByRole("button", { name: "Mark as not started" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Mark as not started" })).toHaveAttribute("aria-pressed", "true");
  });

  test("a failed reflection save shows the real server error rather than nothing", async () => {
    vi.mocked(updateActionStatus)
      .mockResolvedValueOnce({}) // the toggle-to-complete call succeeds
      .mockResolvedValueOnce({ error: "Couldn't update that action. Please try again." }); // the reflection-attach call fails
    renderWeeklyFocus([action()]);

    fireEvent.click(screen.getByRole("button", { name: "Mark as complete" }));
    await waitFor(() => expect(updateActionStatus).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: /Completed successfully/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't update that action. Please try again."));
  });
});
