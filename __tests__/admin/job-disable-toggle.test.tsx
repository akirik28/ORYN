// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

/**
 * Same reversible-vs-consequential split __tests__/dashboard/generate-plan-button.test.tsx
 * already pins for "Regenerate": disabling a job's future runs is a real operational change
 * (cron and manual triggers alike stop until reversed) and gets a confirm step naming what
 * it does and doesn't do; re-enabling only restores normal behavior and doesn't.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(app)/admin/actions", () => ({ toggleJobDisabled: vi.fn() }));

import { JobDisableToggle } from "@/features/admin/job-disable-toggle";
import { toggleJobDisabled } from "@/app/(app)/admin/actions";
import { toast } from "sonner";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderToggle(disabled: boolean) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <JobDisableToggle jobName="discover_opportunities" disabled={disabled} />
    </NextIntlClientProvider>,
  );
}

describe("disabling an active job", () => {
  test("is confirmed, not immediate — one click calls nothing", async () => {
    renderToggle(false);
    fireEvent.click(screen.getByRole("button", { name: /Disable future runs/ }));
    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument());
    expect(toggleJobDisabled).not.toHaveBeenCalled();
  });

  test("the confirmation says what it does and doesn't stop", async () => {
    renderToggle(false);
    fireEvent.click(screen.getByRole("button", { name: /Disable future runs/ }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/blocked/i);
    expect(dialog).toHaveTextContent(/can't stop it/i);
  });

  test("confirming calls toggleJobDisabled(jobName, true)", async () => {
    vi.mocked(toggleJobDisabled).mockResolvedValue({});
    renderToggle(false);
    fireEvent.click(screen.getByRole("button", { name: /Disable future runs/ }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(toggleJobDisabled).toHaveBeenCalledWith("discover_opportunities", true));
  });

  test("Cancel closes the dialog without calling toggleJobDisabled", async () => {
    renderToggle(false);
    fireEvent.click(screen.getByRole("button", { name: /Disable future runs/ }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(toggleJobDisabled).not.toHaveBeenCalled();
  });

  test("a real error from the write is shown, not swallowed as a silent success", async () => {
    vi.mocked(toggleJobDisabled).mockResolvedValue({ error: "Couldn't save that. Please try again." });
    renderToggle(false);
    fireEvent.click(screen.getByRole("button", { name: /Disable future runs/ }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't save that. Please try again."));
  });
});

describe("re-enabling a disabled job", () => {
  test("calls toggleJobDisabled(jobName, false) with no confirmation dialog at all", async () => {
    vi.mocked(toggleJobDisabled).mockResolvedValue({});
    renderToggle(true);
    fireEvent.click(screen.getByRole("button", { name: /Re-enable/ }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(toggleJobDisabled).toHaveBeenCalledWith("discover_opportunities", false));
  });
});
