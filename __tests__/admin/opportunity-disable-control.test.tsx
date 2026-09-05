// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, within, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

/**
 * The under_review-graveyard fix (2026-09-05, docs/under-review-pool-audit-2026-09-03*.md's
 * own three passes, and CEO's own live measurement confirming zero real students affected
 * today): `setOpportunityDisabled` already writes "active" for any prior status when called
 * with `disabled: false` — the actual gap was this control never offering that call for an
 * `under_review` row at all, only ever showing "Disable" (the wrong direction). `isUnderReview`
 * is the new prop; the write it triggers is byte-identical to reactivate, only the copy and
 * (no-destructive-styling, no-reason-input) presentation differ. This file had zero coverage
 * before this pass.
 *
 * The trigger button's aria-label carries the title (added in this same pass, matching
 * achievement-section.tsx's own deleteItemAriaLabel precedent) while its visible text and the
 * dialog's confirm button both stay the bare short verb -- so the trigger and the confirm
 * button share NO accessible name and each `getByRole` query below is unambiguous without
 * needing `within(dialog)` to disambiguate, though the confirm-button queries still scope to
 * the alertdialog for clarity.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/app/(app)/admin/actions", () => ({ setOpportunityDisabled: vi.fn() }));

import { OpportunityDisableControl } from "@/features/admin/opportunity-disable-control";
import { setOpportunityDisabled } from "@/app/(app)/admin/actions";
import { toast } from "sonner";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const TITLE = "Duke University Talent Identification Program 2024";

function renderControl(props: Partial<{ isDisabled: boolean; isUnderReview: boolean }> = {}) {
  const onChanged = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <OpportunityDisableControl
        opportunityId="opp-1"
        title={TITLE}
        isDisabled={props.isDisabled ?? false}
        isUnderReview={props.isUnderReview ?? false}
        onChanged={onChanged}
      />
    </NextIntlClientProvider>,
  );
  return { onChanged };
}

function dialog() {
  return screen.getByRole("alertdialog");
}

describe("OpportunityDisableControl — active/expired row (the pre-existing disable path, unaffected)", () => {
  test("shows a Disable trigger naming the record, not Approve or Reactivate", () => {
    renderControl();
    expect(screen.getByRole("button", { name: `Disable ${TITLE}` })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: new RegExp(`^Approve `) })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: new RegExp(`^Reactivate `) })).not.toBeInTheDocument();
  });

  test("requires a reason and never calls the action without one", async () => {
    renderControl();
    fireEvent.click(screen.getByRole("button", { name: `Disable ${TITLE}` }));
    fireEvent.click(within(dialog()).getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(setOpportunityDisabled).not.toHaveBeenCalled();
  });

  test("with a reason, disables — writes disabled: true", async () => {
    vi.mocked(setOpportunityDisabled).mockResolvedValue({ changed: true });
    renderControl();
    fireEvent.click(screen.getByRole("button", { name: `Disable ${TITLE}` }));
    fireEvent.change(within(dialog()).getByPlaceholderText("Reason (recorded)"), { target: { value: "Dead link" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(setOpportunityDisabled).toHaveBeenCalledWith("opp-1", true, "Dead link"));
  });
});

describe("OpportunityDisableControl — disabled row (the pre-existing reactivate path, unaffected)", () => {
  test("shows Reactivate, no reason input, calls disabled: false", async () => {
    vi.mocked(setOpportunityDisabled).mockResolvedValue({ changed: true });
    const { onChanged } = renderControl({ isDisabled: true });

    const trigger = screen.getByRole("button", { name: `Reactivate ${TITLE}` });
    expect(trigger).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(within(dialog()).queryByPlaceholderText("Reason (recorded)")).not.toBeInTheDocument();
    fireEvent.click(within(dialog()).getByRole("button", { name: "Reactivate" }));

    await waitFor(() => expect(setOpportunityDisabled).toHaveBeenCalledWith("opp-1", false, undefined));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(false));
    expect(toast.success).toHaveBeenCalledWith(`${TITLE} is visible to students again.`);
  });
});

describe("OpportunityDisableControl — under_review row, the new case this pass adds", () => {
  test("shows an Approve trigger naming the record, not Disable and not Reactivate", () => {
    renderControl({ isUnderReview: true });
    expect(screen.getByRole("button", { name: `Approve ${TITLE}` })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: new RegExp(`^Disable `) })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: new RegExp(`^Reactivate `) })).not.toBeInTheDocument();
  });

  test("approving needs no reason -- same posture as reactivating, since nothing is being hidden", () => {
    renderControl({ isUnderReview: true });
    fireEvent.click(screen.getByRole("button", { name: `Approve ${TITLE}` }));
    expect(within(dialog()).queryByPlaceholderText("Reason (recorded)")).not.toBeInTheDocument();
  });

  test("calls the EXISTING setOpportunityDisabled with disabled: false -- no new backend function, exactly CEO's constraint", async () => {
    vi.mocked(setOpportunityDisabled).mockResolvedValue({ changed: true });
    const { onChanged } = renderControl({ isUnderReview: true });

    fireEvent.click(screen.getByRole("button", { name: `Approve ${TITLE}` }));
    fireEvent.click(within(dialog()).getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(setOpportunityDisabled).toHaveBeenCalledWith("opp-1", false, undefined));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(false));
  });

  test("the success toast says the record is now visible -- not the reactivate wording, which would wrongly imply it was ever visible before", async () => {
    vi.mocked(setOpportunityDisabled).mockResolvedValue({ changed: true });
    renderControl({ isUnderReview: true });

    fireEvent.click(screen.getByRole("button", { name: `Approve ${TITLE}` }));
    fireEvent.click(within(dialog()).getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(`${TITLE} is now visible to students.`));
  });

  test("a no-op (already active by the time this loaded) reports the shared changeNoop copy, not a false success", async () => {
    vi.mocked(setOpportunityDisabled).mockResolvedValue({ changed: false });
    renderControl({ isUnderReview: true });

    fireEvent.click(screen.getByRole("button", { name: `Approve ${TITLE}` }));
    fireEvent.click(within(dialog()).getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(`${TITLE} was already in that state. Nothing changed.`));
  });

  test("the confirm button is styled non-destructively, unlike disable", () => {
    // The shared Button base classes include `aria-invalid:border-destructive` on every
    // variant (components/ui/button.tsx's own `base` string), so a bare /destructive/ match
    // would false-positive on the "default" variant too -- only the destructive variant's own
    // `bg-destructive/10` background utility actually distinguishes it.
    renderControl({ isUnderReview: true });
    fireEvent.click(screen.getByRole("button", { name: `Approve ${TITLE}` }));
    const confirmButton = within(dialog()).getByRole("button", { name: "Approve" });
    expect(confirmButton.className).not.toMatch(/bg-destructive\/10/);
  });
});
