// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

/**
 * Saving a university is one unconfirmed click on a card, and until 2026-09-01 there was no
 * way back: `removeTargetUniversity` existed, correct and scoped to the caller's own row,
 * and nothing called it. The nearest escape was setting status to "Withdrawn", which changes
 * a badge — nothing filters withdrawn targets out of any list, including the dashboard's
 * University Outlook.
 *
 * Covered here rather than live because the founder's own account holds zero targets (all 18
 * belong to fixture personas), so reaching the saved branch on a real account would mean
 * writing to it.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(app)/universities/actions", () => ({
  addTargetUniversity: vi.fn(),
  removeTargetUniversity: vi.fn(),
  updateTargetUniversityStatus: vi.fn(),
}));

import { SaveUniversityButton } from "@/features/universities/save-university-button";
import { removeTargetUniversity } from "@/app/(app)/universities/actions";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderSaved(messages: typeof en = en) {
  return render(
    <NextIntlClientProvider locale={messages === tr ? "tr" : "en"} messages={messages}>
      <SaveUniversityButton universityId="u-1" universityName="Bocconi University" targetId="t-1" status="target" />
    </NextIntlClientProvider>,
  );
}

describe("removing a saved university", () => {
  test("an unsaved university offers only Save — there is nothing to remove", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SaveUniversityButton universityId="u-1" universityName="Bocconi University" targetId={null} status={null} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("button", { name: /save to my universities/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  test("a saved university offers a remove control naming it", () => {
    renderSaved();
    expect(screen.getByRole("button", { name: "Remove Bocconi University from my universities" })).toBeInTheDocument();
  });

  test("removal is confirmed, not immediate — one click calls nothing", async () => {
    renderSaved();
    fireEvent.click(screen.getByRole("button", { name: /remove bocconi/i }));
    await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument());
    expect(removeTargetUniversity).not.toHaveBeenCalled();
  });

  test("the confirmation names what is lost, not just the row", async () => {
    renderSaved();
    fireEvent.click(screen.getByRole("button", { name: /remove bocconi/i }));
    const dialog = await screen.findByRole("alertdialog");
    // Status and outlook do not come back on re-save; saying so is the point of confirming.
    expect(dialog).toHaveTextContent(/status/i);
    expect(dialog).toHaveTextContent(/Bocconi University/);
  });

  test("confirming sends the target id, not the university id", async () => {
    vi.mocked(removeTargetUniversity).mockResolvedValue({});
    renderSaved();
    fireEvent.click(screen.getByRole("button", { name: /remove bocconi/i }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(removeTargetUniversity).toHaveBeenCalledWith("t-1"));
  });

  test("Turkish renders the translated control, not a fallback", () => {
    renderSaved(tr as typeof en);
    expect(screen.getByRole("button", { name: "Bocconi University üniversitesini listemden kaldır" })).toBeInTheDocument();
  });
});
