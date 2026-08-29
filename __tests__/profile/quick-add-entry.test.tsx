// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * Component-level coverage for QuickAddEntry (features/profile/quick-add-entry.tsx), the
 * Journey page's unified "What would you like to add?" entry point (Figma handoff package
 * 1). Same render-for-real pattern as __tests__/profile/achievement-section.test.tsx.
 *
 * The Test score case is the pinned regression for the audit's flagship claim ("a test score
 * can be saved with only the exam name") — proven not reproducible in
 * __tests__/validation/achievements.test.ts at the schema layer; this file proves the same
 * thing one layer up, at the actual UI a student uses: the short form always shows Score,
 * never just Test name.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { QuickAddEntry, type QuickAddType } from "@/features/profile/quick-add-entry";
import { toast } from "sonner";
import { GraduationCap, Sparkles } from "lucide-react";
import { TEST_SCORE_FIELDS, ACTIVITY_FIELDS } from "@/features/profile/field-config";

function renderPicker(overrides: { onCreateTestScore?: (v: Record<string, unknown>) => Promise<{ error?: string }> } = {}) {
  const onCreateActivity = vi.fn().mockResolvedValue({});
  const onCreateTestScore = overrides.onCreateTestScore ?? vi.fn().mockResolvedValue({});

  const types: QuickAddType[] = [
    {
      key: "activity",
      label: "Activity",
      icon: <Sparkles className="size-4" aria-hidden="true" />,
      fields: ACTIVITY_FIELDS.filter((f) => f.quickAdd),
      defaultValues: { title: "", organization: null, organization_entity_id: null, category: "other" },
      onCreate: onCreateActivity as (v: Record<string, unknown>) => Promise<{ error?: string }>,
    },
    {
      key: "test_score",
      label: "Test score",
      icon: <GraduationCap className="size-4" aria-hidden="true" />,
      fields: TEST_SCORE_FIELDS.filter((f) => f.quickAdd),
      defaultValues: { test_name: "", score: "", max_score: null, test_date: null },
      onCreate: onCreateTestScore as (v: Record<string, unknown>) => Promise<{ error?: string }>,
    },
  ];

  render(<QuickAddEntry types={types} />);
  return { onCreateActivity, onCreateTestScore };
}

afterEach(() => {
  cleanup();
  vi.mocked(toast.success).mockReset();
});

describe("QuickAddEntry — the picker step", () => {
  test("opens on click and lists every provided type", async () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Add to your journey" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("What would you like to add?")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Activity/ })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Test score/ })).toBeInTheDocument();
  });

  test("Cancel closes without calling any onCreate", async () => {
    const { onCreateActivity, onCreateTestScore } = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Add to your journey" }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onCreateActivity).not.toHaveBeenCalled();
    expect(onCreateTestScore).not.toHaveBeenCalled();
  });
});

describe("QuickAddEntry — Test score (regression: must never lose the score field)", () => {
  test("picking Test score shows Test name, Score, Max score, and Date — not just the name", async () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Add to your journey" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Test score/ }));

    expect(await within(dialog).findByLabelText("Test name")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Score")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Max score")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Date")).toBeInTheDocument();
  });

  test("Back returns to the type picker without submitting", async () => {
    const { onCreateTestScore } = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Add to your journey" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Test score/ }));
    await within(dialog).findByLabelText("Test name");

    fireEvent.click(within(dialog).getByRole("button", { name: "Back" }));

    expect(within(dialog).getByText("What would you like to add?")).toBeInTheDocument();
    expect(onCreateTestScore).not.toHaveBeenCalled();
  });

  test("filling test name and score and saving calls onCreate with both values", async () => {
    const { onCreateTestScore } = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Add to your journey" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Test score/ }));

    fireEvent.change(await within(dialog).findByLabelText("Test name"), { target: { value: "SAT" } });
    fireEvent.change(within(dialog).getByLabelText("Score"), { target: { value: "1450" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(onCreateTestScore).toHaveBeenCalledWith(expect.objectContaining({ test_name: "SAT", score: "1450" })),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Added test score to your journey."));
  });

  test("a server-side rejection (e.g. missing score) surfaces the real error and keeps the dialog open", async () => {
    const onCreateTestScore = vi.fn().mockResolvedValue({ error: "Score is required." });
    renderPicker({ onCreateTestScore });
    fireEvent.click(screen.getByRole("button", { name: "Add to your journey" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Test score/ }));
    fireEvent.change(await within(dialog).findByLabelText("Test name"), { target: { value: "SAT" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(within(dialog).getByText("Score is required.")).toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
