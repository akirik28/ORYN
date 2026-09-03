// @vitest-environment jsdom
import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

/** No confirm step — same reversible-action treatment as ProviderRecheckButton: raising or
 *  lowering the ceiling only changes how future calls degrade, nothing already spent. */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(app)/admin/actions", () => ({ updateWeeklyPlanBudgetCeiling: vi.fn() }));

import { WeeklyPlanBudgetForm } from "@/features/admin/weekly-plan-budget-form";
import { updateWeeklyPlanBudgetCeiling } from "@/app/(app)/admin/actions";
import { toast } from "sonner";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderForm(currentCeilingUsd = 10) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <WeeklyPlanBudgetForm currentCeilingUsd={currentCeilingUsd} />
    </NextIntlClientProvider>,
  );
}

test("starts pre-filled with the current ceiling, not empty", () => {
  renderForm(25);
  expect(screen.getByLabelText("Monthly ceiling (USD)")).toHaveValue(25);
});

test("saving calls the action with the edited number, not the original", async () => {
  vi.mocked(updateWeeklyPlanBudgetCeiling).mockResolvedValue({});
  renderForm(10);

  fireEvent.change(screen.getByLabelText("Monthly ceiling (USD)"), { target: { value: "30" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(updateWeeklyPlanBudgetCeiling).toHaveBeenCalledWith(30));
});

test("a real error from the write is shown, not swallowed as a silent success", async () => {
  vi.mocked(updateWeeklyPlanBudgetCeiling).mockResolvedValue({ error: "Enter a positive monthly ceiling." });
  renderForm(10);

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Enter a positive monthly ceiling."));
  expect(toast.success).not.toHaveBeenCalled();
});

test("Save is disabled for a zero or negative value — never sends an invalid ceiling", () => {
  renderForm(10);
  fireEvent.change(screen.getByLabelText("Monthly ceiling (USD)"), { target: { value: "0" } });
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

  fireEvent.change(screen.getByLabelText("Monthly ceiling (USD)"), { target: { value: "-5" } });
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});
