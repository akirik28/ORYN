// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * Component-level coverage for NotificationBell (features/app-shell/notification-bell.tsx)
 * — same pattern as __tests__/dashboard/weekly-focus.test.tsx (mock the Server Action
 * module, render for real, assert on behavior via fireEvent/jsdom).
 *
 * Written for docs/feat2-error-surfacing-audit-2026-08-22.md's finding #3, the last of
 * the three: both mark-read actions here discard their result entirely
 * (`void markX(...)`), so a failed write gives the student no signal to retry — lowest
 * severity of the three findings (self-correcting: unread state re-derives from the
 * server on next load, no data loss), but still a genuinely silent failure. Fix is the
 * simplest of the three, matching requirement-checklist.tsx's plain
 * `if (result.error) toast.error(result.error)` — no optimistic client state exists here
 * to roll back (the notification list is a server-rendered prop; nothing changes it
 * client-side before the round-trip), so there's only an error to surface, unlike
 * Package 5's rollback case.
 */

vi.mock("@/app/(app)/notifications/actions", () => ({ markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { NextIntlClientProvider } from "next-intl";
import { NotificationBell } from "@/features/app-shell/notification-bell";
import { markNotificationRead, markAllNotificationsRead } from "@/app/(app)/notifications/actions";
import { toast } from "sonner";
import type { Notification } from "@/types/database";

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notif-1",
    user_id: "student-1",
    category: "deadline",
    title: "Deadline tomorrow",
    body: "Yale University — application deadline approaching.",
    link: "/applications/app-1",
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(markNotificationRead).mockReset();
  vi.mocked(markAllNotificationsRead).mockReset();
  vi.mocked(toast.error).mockReset();
});

afterEach(() => {
  cleanup();
});

/**
 * The bell reads the active locale (`useLocale()`) to render its relative timestamps, so
 * it needs the same provider the root layout gives it in the real app. Pinned to "en" so
 * these assertions stay about mark-read behavior rather than becoming a translation test —
 * catalog content is covered in __tests__/i18n/locale.test.ts.
 */
function renderBell(notifications: Notification[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={{}}>
      <NotificationBell notifications={notifications} />
    </NextIntlClientProvider>,
  );
}

async function openBell() {
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  await screen.findByText("Notifications");
}

describe("NotificationBell — pinned success-path behavior", () => {
  test("clicking an unread notification marks it read, no toast", async () => {
    vi.mocked(markNotificationRead).mockResolvedValue({});
    renderBell([notification()]);
    await openBell();

    fireEvent.click(screen.getByText("Deadline tomorrow"));

    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith("notif-1"));
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("'Mark all read' calls the action once, no toast", async () => {
    vi.mocked(markAllNotificationsRead).mockResolvedValue({});
    renderBell([notification()]);
    await openBell();

    fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));

    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("clicking an already-read notification does not call markNotificationRead at all", async () => {
    renderBell([notification({ read_at: new Date().toISOString() })]);
    await openBell();

    fireEvent.click(screen.getByText("Deadline tomorrow"));

    expect(markNotificationRead).not.toHaveBeenCalled();
  });
});

describe("NotificationBell — failure path (docs/feat2-error-surfacing-audit-2026-08-22.md finding #3)", () => {
  test("a failed mark-read shows the real server error rather than nothing", async () => {
    vi.mocked(markNotificationRead).mockResolvedValue({ error: "Couldn't update notification." });
    renderBell([notification()]);
    await openBell();

    fireEvent.click(screen.getByText("Deadline tomorrow"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't update notification."));
  });

  test("a failed 'Mark all read' shows the real server error rather than nothing", async () => {
    vi.mocked(markAllNotificationsRead).mockResolvedValue({ error: "Couldn't update notifications." });
    renderBell([notification()]);
    await openBell();

    fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't update notifications."));
  });
});
