// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * Regression coverage for the 2026-08-29 audit finding: submitAdd() used to append an
 * optimistic item with `id: crypto.randomUUID()` — a locally generated id that never
 * matched the real database row addFeaturedItem() had just inserted. Removing or reordering
 * that same item before the next full page load (which replaces this optimistic state with
 * server-truthed `initialItems`) then sent a real Server Action a fake id: `remove()`'s
 * delete matched zero rows and "succeeded" while the real row survived; `move()`'s reorder
 * was rejected outright by the ownership check, silently, since neither call checked its
 * result's `error`. The fix: addFeaturedItem now returns the row's real id, and the client
 * uses it for the optimistic item instead of generating one — proven here by asserting
 * exactly which id a subsequent remove() call sends to removeFeaturedItem().
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/app/(app)/profile/featured-actions", () => ({
  addFeaturedItem: vi.fn(),
  removeFeaturedItem: vi.fn(),
  reorderFeaturedItems: vi.fn(),
}));

import { FeaturedManager } from "@/features/profile/featured-manager";
import { addFeaturedItem, removeFeaturedItem } from "@/app/(app)/profile/featured-actions";
import { toast } from "sonner";

const CANDIDATES = {
  project: [{ id: "proj-1", label: "My Research Tool" }],
  research_experience: [],
  award: [],
  activity: [],
  work_experience: [],
  volunteering_experience: [],
  sports_experience: [],
};

afterEach(() => {
  cleanup();
  vi.mocked(addFeaturedItem).mockReset();
  vi.mocked(removeFeaturedItem).mockReset();
  vi.mocked(toast.error).mockReset();
});

// Two Selects render at once as soon as the dialog opens: "mode" (defaults to "project",
// already matching CANDIDATES) and, since a project candidate exists, "choose an item" right
// below it — both share role="combobox" with no distinguishing accessible name, so a plain
// findByRole("combobox") is ambiguous. The item picker is always the second one.
// Waits for the dialog to fully close after a successful add — Base UI's exit animation
// leaves the dialog (and the Select's still-showing "My Research Tool" value inside it) in
// the DOM until then, which otherwise makes later `getByText("My Research Tool")` queries
// ambiguous against the real list item just added.
async function addFeaturedCandidate() {
  fireEvent.click(screen.getByRole("button", { name: /Feature something/ }));
  const combobox = (await screen.findAllByRole("combobox"))[1];
  fireEvent.click(combobox);
  fireEvent.click(await screen.findByRole("option", { name: "My Research Tool" }));
  fireEvent.click(screen.getByRole("button", { name: "Feature it" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

describe("FeaturedManager — real id, not a phantom one", () => {
  test("removing a just-added item sends the SERVER's real id, not a client-generated one", async () => {
    vi.mocked(addFeaturedItem).mockResolvedValue({ id: "real-server-id-123" });
    vi.mocked(removeFeaturedItem).mockResolvedValue({});

    render(<FeaturedManager initialItems={[]} candidates={CANDIDATES} />);
    await addFeaturedCandidate();

    expect(screen.getByText("My Research Tool")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(removeFeaturedItem).toHaveBeenCalledWith("real-server-id-123"));
  });

  test("a failed add surfaces an error and never appends a real item (dialog stays open, so 'Remove' never appears)", async () => {
    vi.mocked(addFeaturedItem).mockResolvedValue({ error: "You can feature up to 5 items. Remove one before adding another." });

    render(<FeaturedManager initialItems={[]} candidates={CANDIDATES} />);
    fireEvent.click(screen.getByRole("button", { name: /Feature something/ }));
    const combobox = (await screen.findAllByRole("combobox"))[1];
    fireEvent.click(combobox);
    fireEvent.click(await screen.findByRole("option", { name: "My Research Tool" }));
    fireEvent.click(screen.getByRole("button", { name: "Feature it" }));

    await waitFor(() => expect(screen.getByText(/Remove one before adding another/)).toBeInTheDocument());
    // Distinguishes "the Select still shows its chosen value" (expected, dialog stayed
    // open on failure) from "a real list item was appended" (the actual regression this
    // guards against) — a plain queryByText("My Research Tool") would find the former too.
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  test("a failed remove rolls back the optimistic removal and surfaces the error", async () => {
    vi.mocked(addFeaturedItem).mockResolvedValue({ id: "real-id" });
    vi.mocked(removeFeaturedItem).mockResolvedValue({ error: "Couldn't remove that." });

    render(<FeaturedManager initialItems={[]} candidates={CANDIDATES} />);
    await addFeaturedCandidate();
    expect(screen.getByText("My Research Tool")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't remove that."));
    expect(screen.getByText("My Research Tool")).toBeInTheDocument();
  });
});
