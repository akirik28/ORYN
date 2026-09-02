// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

/**
 * 2026-09-02, the ops-panel pivot: before this, a successful trigger only refreshed the
 * page — the admin had to go re-read the (now-updated) row below to find out what the run
 * actually did. oryn-a7's brief named the exact failure this recreates if left as-is: "a
 * trigger button that only says 'started' would recreate exactly that blindness" (the
 * standing "billed forever, no artifact" finding). These tests pin that the real numbers
 * reach the toast, not just the row.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { JobTriggerButton } from "@/features/admin/job-trigger-button";
import { toast } from "sonner";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderButton(action: () => Promise<{ error?: string; itemsProcessed?: number; errorsEncountered?: number; durationMs?: number }>) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <JobTriggerButton label="Run opportunity discovery" action={action} />
    </NextIntlClientProvider>,
  );
}

describe("JobTriggerButton — real outcome, not just \"triggered\"", () => {
  test("a successful run with a duration shows items/errors/duration/spend in one toast", async () => {
    renderButton(async () => ({ itemsProcessed: 12, errorsEncountered: 1, durationMs: 3200 }));
    fireEvent.click(screen.getByRole("button", { name: "Run opportunity discovery" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("12 processed, 1 errors, 3s. $0.00 spend — this job doesn't call the AI provider."),
    );
  });

  test("a run whose row has no finished_at yet (still running) omits duration rather than showing a wrong one", async () => {
    renderButton(async () => ({ itemsProcessed: 0, errorsEncountered: 0 }));
    fireEvent.click(screen.getByRole("button", { name: "Run opportunity discovery" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("0 processed, 0 errors. $0.00 spend — this job doesn't call the AI provider."),
    );
  });

  test("an error (including a disabled job) is shown as an error, not folded into a success toast", async () => {
    renderButton(async () => ({ error: "This job's future runs are currently disabled — re-enable it first." }));
    fireEvent.click(screen.getByRole("button", { name: "Run opportunity discovery" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This job's future runs are currently disabled — re-enable it first."));
    expect(toast.success).not.toHaveBeenCalled();
  });
});
