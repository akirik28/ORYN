// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

/**
 * Component-level coverage for AchievementSection (features/profile/achievement-section.tsx)
 * — same __tests__/entities/entity-combobox.test.tsx / __tests__/dashboard/
 * weekly-focus.test.tsx pattern: mock what the component imports, render for real, assert
 * on behavior. `onCreate`/`onUpdate`/`onDelete` are props here, not an imported module, so
 * they're passed directly as `vi.fn()`s rather than `vi.mock`ed.
 *
 * Written for docs/feat2-error-surfacing-audit-2026-08-22.md finding #2 / Package 5
 * (docs/handoffs/feat1-achievement-save-2026-08-22.md): `handleDelete` discarded `onDelete`'s
 * result entirely, so a failed delete (RLS denial, transient DB error) showed the student
 * nothing — no error, no explanation. Honest (the item correctly stayed in the list, per
 * `crudRemove` only revalidating on success) but silent. Per CEO's stated convention: pin
 * the success path first (a delete that works must behave exactly as before), then the
 * failure path.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { AchievementSection } from "@/features/profile/achievement-section";
import { toast } from "sonner";

interface TestItem {
  id: string;
  title: string;
}

// AchievementSection calls useTranslations (common + profile.achievementSection) — needs
// the same real-catalog provider wrap as featured-manager.test.tsx, for the same reason:
// an empty messages object would throw, not just render blank, and these assertions query
// rendered English text by role/name ("Delete").
function renderSection(overrides: { onDelete?: (id: string) => Promise<{ error?: string }> } = {}) {
  const onCreate = vi.fn().mockResolvedValue({});
  const onUpdate = vi.fn().mockResolvedValue({});
  const onDelete = overrides.onDelete ?? vi.fn().mockResolvedValue({});

  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AchievementSection<TestItem>
        title="Activities"
        items={[{ id: "item-1", title: "Regional Science Fair" }]}
        summaries={{ "item-1": { title: "Regional Science Fair" } }}
        fields={[{ type: "text", name: "title", label: "Title" }]}
        defaultValues={{ title: "" }}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
        emptyStateText="No activities yet."
      />
    </NextIntlClientProvider>
  );

  return { onCreate, onUpdate, onDelete };
}

beforeEach(() => {
  vi.mocked(toast.error).mockReset();
});

afterEach(() => {
  cleanup();
});

// A destructive-action confirmation was added after this file was first written (a11y
// sweep, 2026-09-01: AchievementSection deleted on a single click with no confirmation of
// any kind, the same defect class as generate-plan-button.tsx). The delete icon now only
// opens an AlertDialog; `onDelete` fires from the dialog's own "Delete" button. Its icon
// trigger carries a per-item aria-label ("Delete {title}") specifically so it doesn't
// collide with the dialog's generic "Delete" — real accessibility reasoning, not just a
// test-disambiguation trick: a screen-reader user with several rows needs to know *which*
// item a bare "Delete" button removes before ever reaching the confirmation.
function clickDeleteThenConfirm() {
  fireEvent.click(screen.getByRole("button", { name: "Delete Regional Science Fair" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
}

describe("AchievementSection — delete requires confirmation", () => {
  test("clicking the delete icon alone does not call onDelete", async () => {
    const { onDelete } = renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Delete Regional Science Fair" }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  test("the confirmation names the item being deleted", async () => {
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Delete Regional Science Fair" }));

    expect(screen.getByText('Delete "Regional Science Fair"?')).toBeInTheDocument();
  });

  test("Cancel closes the dialog without calling onDelete", async () => {
    const { onDelete } = renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Delete Regional Science Fair" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onDelete).not.toHaveBeenCalled();
  });
});

describe("AchievementSection — pinned success-path behavior", () => {
  test("confirming delete calls onDelete, shows no toast, and doesn't throw", async () => {
    const { onDelete } = renderSection();

    clickDeleteThenConfirm();

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("item-1"));
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("the spinner clears and the dialog closes after a successful delete", async () => {
    renderSection();

    clickDeleteThenConfirm();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Delete Regional Science Fair" })).not.toBeDisabled();
  });
});

describe("AchievementSection — failure path (docs/feat2-error-surfacing-audit-2026-08-22.md finding #2)", () => {
  test("a failed delete surfaces the real server error instead of showing nothing", async () => {
    const onDelete = vi.fn().mockResolvedValue({ error: "We couldn't delete this right now. Please try again." });
    renderSection({ onDelete });

    clickDeleteThenConfirm();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("We couldn't delete this right now. Please try again."));
  });

  test("a failed delete leaves the item in the list — honest, not a false success", async () => {
    const onDelete = vi.fn().mockResolvedValue({ error: "We couldn't delete this right now. Please try again." });
    renderSection({ onDelete });

    clickDeleteThenConfirm();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByText("Regional Science Fair")).toBeInTheDocument();
  });

  test("the spinner still clears after a failed delete, so the button isn't stuck disabled", async () => {
    const onDelete = vi.fn().mockResolvedValue({ error: "We couldn't delete this right now. Please try again." });
    renderSection({ onDelete });

    clickDeleteThenConfirm();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Delete Regional Science Fair" })).not.toBeDisabled();
  });
});
