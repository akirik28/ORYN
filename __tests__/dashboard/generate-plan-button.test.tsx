// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

/**
 * Until the a11y sweep (2026-09-01) that added this file, clicking "Regenerate" called
 * regenerateWeeklyPlan() directly — no confirmation of any kind — which hard-deletes every
 * action on the current plan, including completed ones and the reflection notes a student
 * wrote about them (lib/plan/persist.ts's getOrCreateWeeklyPlan, `force: true`). Confirmed
 * live on the founder's own account: four completions existed in product_events with their
 * action rows already gone. Same house pattern as
 * __tests__/universities/save-university-button.test.tsx — mirrored here deliberately.
 *
 * Generating a *first* plan (no existing plan) destroys nothing, so it must not be gated —
 * `hasExistingPlan={false}` (the dashboard's only mount, since that button only ever renders
 * in the "no plan yet" branch) skips the dialog entirely.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(app)/plan/actions", () => ({ regenerateWeeklyPlan: vi.fn() }));

import { GeneratePlanButton } from "@/features/dashboard/generate-plan-button";
import { regenerateWeeklyPlan } from "@/app/(app)/plan/actions";
import { toast } from "sonner";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderButton(props: Partial<React.ComponentProps<typeof GeneratePlanButton>> = {}, messages: typeof en = en) {
  return render(
    <NextIntlClientProvider locale={messages === tr ? "tr" : "en"} messages={messages}>
      <GeneratePlanButton label="Regenerate" pendingLabel="Thinking…" hasExistingPlan {...props} />
    </NextIntlClientProvider>,
  );
}

describe("regenerating an existing plan", () => {
  test("is confirmed, not immediate — one click calls nothing", async () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument());
    expect(regenerateWeeklyPlan).not.toHaveBeenCalled();
  });

  test("the confirmation names what is lost, not a generic warning", async () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/completed/i);
    expect(dialog).toHaveTextContent(/notes/i);
  });

  test("confirming calls regenerateWeeklyPlan", async () => {
    vi.mocked(regenerateWeeklyPlan).mockResolvedValue({});
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Regenerate" }));
    await waitFor(() => expect(regenerateWeeklyPlan).toHaveBeenCalled());
  });

  test("Cancel closes the dialog without calling regenerateWeeklyPlan", async () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(regenerateWeeklyPlan).not.toHaveBeenCalled();
  });

  test("a server error is shown, not swallowed", async () => {
    vi.mocked(regenerateWeeklyPlan).mockResolvedValue({ error: "Something went wrong generating your plan. Please try again." });
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Regenerate" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Something went wrong generating your plan. Please try again."));
  });
});

describe("generating a first plan — nothing exists yet to lose", () => {
  test("hasExistingPlan={false} skips confirmation entirely", async () => {
    vi.mocked(regenerateWeeklyPlan).mockResolvedValue({});
    renderButton({ label: "Generate my plan", hasExistingPlan: false });
    fireEvent.click(screen.getByRole("button", { name: "Generate my plan" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(regenerateWeeklyPlan).toHaveBeenCalled());
  });
});

describe("translation", () => {
  test("Turkish renders the translated confirmation, not a fallback", async () => {
    renderButton({ label: "Yeniden oluştur" }, tr as typeof en);
    fireEvent.click(screen.getByRole("button", { name: "Yeniden oluştur" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Bu haftanın planı yeniden oluşturulsun mu?");
  });
});
