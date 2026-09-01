// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * `setOpportunityStatus` had no test at all (docs/test-coverage-vs-spec.md), and the
 * behaviour most worth having one is the rollback: this component updates the button
 * optimistically and puts the old status back if the write fails. Its own comment says why —
 * without it "a failed write leaves the button showing a status that was never actually
 * saved, with no indication anything went wrong", which is the shape this codebase keeps
 * finding elsewhere.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/app/(app)/opportunities/actions", () => ({ setOpportunityStatus: vi.fn() }));

import { OpportunityActions } from "@/features/opportunities/opportunity-actions";
import { setOpportunityStatus } from "@/app/(app)/opportunities/actions";
import { toast } from "sonner";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const props = { opportunityId: "opp-1", officialUrl: "https://example.org", applicationUrl: null };

describe("saving and rejecting an opportunity", () => {
  test("Save sends the saved status for this opportunity", async () => {
    vi.mocked(setOpportunityStatus).mockResolvedValue({});
    render(<OpportunityActions {...props} initialStatus={null} />);

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(setOpportunityStatus).toHaveBeenCalledWith({ opportunityId: "opp-1", status: "saved", notInterestedReason: undefined }),
    );
  });

  test("a failed write rolls the button back instead of leaving a status nobody saved", async () => {
    vi.mocked(setOpportunityStatus).mockResolvedValue({ error: "Couldn't update that opportunity. Please try again." });
    render(<OpportunityActions {...props} initialStatus={null} />);

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    // Reverts to "Save", not stuck on "Saved", and the student is told.
    await waitFor(() => expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /^saved$/i })).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Couldn't update that opportunity. Please try again.");
  });

  test("a successful write keeps the new status", async () => {
    vi.mocked(setOpportunityStatus).mockResolvedValue({});
    render(<OpportunityActions {...props} initialStatus={null} />);

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /^saved$/i })).toBeInTheDocument());
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("a not-interested reason reaches the action — it is the whole point of asking", async () => {
    vi.mocked(setOpportunityStatus).mockResolvedValue({});
    render(<OpportunityActions {...props} initialStatus={null} />);

    fireEvent.click(screen.getByRole("button", { name: /not interested/i }));
    const reason = await screen.findByText("Too expensive");
    fireEvent.click(reason);

    await waitFor(() =>
      expect(setOpportunityStatus).toHaveBeenCalledWith({
        opportunityId: "opp-1",
        status: "not_interested",
        notInterestedReason: "too_expensive",
      }),
    );
  });

  test("a rejected opportunity offers an undo rather than disappearing silently", async () => {
    vi.mocked(setOpportunityStatus).mockResolvedValue({});
    render(<OpportunityActions {...props} initialStatus="not_interested" />);

    fireEvent.click(screen.getByRole("button", { name: /undo/i }));

    await waitFor(() =>
      expect(setOpportunityStatus).toHaveBeenCalledWith({ opportunityId: "opp-1", status: "saved", notInterestedReason: undefined }),
    );
  });
});
