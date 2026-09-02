// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * Component-level coverage for NotificationList (features/notifications/notification-list.tsx)
 * — the notifications page's row list, same render-for-real pattern as
 * __tests__/app-shell/notification-bell.test.tsx. That file covers the popover's own
 * click-to-mark-read and bulk actions; this one is specifically about the page's added
 * per-row "Mark read" control, which the popover doesn't have.
 */

vi.mock("@/app/(app)/notifications/actions", () => ({ markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn(), markNotificationsRead: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { NotificationList } from "@/features/notifications/notification-list";
import { markNotificationRead, markNotificationsRead } from "@/app/(app)/notifications/actions";
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
  vi.mocked(markNotificationsRead).mockReset();
  vi.mocked(toast.error).mockReset();
});

afterEach(() => {
  cleanup();
});

function renderList(notifications: Notification[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <NotificationList notifications={notifications} />
    </NextIntlClientProvider>,
  );
}

describe("NotificationList", () => {
  test("an unread row shows a 'Mark read' button; a read row does not", () => {
    renderList([notification({ id: "unread-1", read_at: null }), notification({ id: "read-1", read_at: new Date().toISOString() })]);

    const markReadButtons = screen.getAllByRole("button", { name: "Mark read" });
    expect(markReadButtons).toHaveLength(1);
  });

  test("clicking 'Mark read' marks that specific notification read, no toast", async () => {
    vi.mocked(markNotificationRead).mockResolvedValue({});
    renderList([notification({ id: "target-id" })]);

    fireEvent.click(screen.getByRole("button", { name: "Mark read" }));

    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith("target-id"));
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("clicking the title link also marks it read (same behavior as the popover)", async () => {
    vi.mocked(markNotificationRead).mockResolvedValue({});
    renderList([notification({ id: "target-id" })]);

    fireEvent.click(screen.getByText("Deadline tomorrow"));

    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith("target-id"));
  });

  test("a notification with no link renders as plain text, not a dead link", () => {
    renderList([notification({ link: null })]);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Deadline tomorrow")).toBeInTheDocument();
  });

  test("a failed mark-read shows the real server error rather than nothing", async () => {
    vi.mocked(markNotificationRead).mockResolvedValue({ error: "Couldn't update notification." });
    renderList([notification()]);

    fireEvent.click(screen.getByRole("button", { name: "Mark read" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't update notification."));
  });

  test("renders full, unclamped body text for a long aggregated notification", () => {
    const longBody =
      "University of Pennsylvania — tomorrow; International Economics Challenge 2027 — 3 days; London School of Economics — Economics, personal statement — 7 days; Youth Research Fellows Programme — 14 days";
    renderList([notification({ body: longBody })]);

    expect(screen.getByText(longBody)).toBeInTheDocument();
  });
});

/**
 * features/notifications/group.ts's grouping on the full-page list — deadline (this file's
 * default fixture category) never groups, so none of the tests above touch this path.
 */
describe("NotificationList — grouping (features/notifications/group.ts)", () => {
  test("three unread weekly_plan notifications render as one row showing the most recent body, not three rows", () => {
    renderList([
      notification({ id: "wp-1", category: "weekly_plan", title: "Your weekly plan is ready", body: "This week: finish the research draft.", link: "/plan", created_at: "2026-09-02T00:00:00.000Z" }),
      notification({ id: "wp-2", category: "weekly_plan", title: "Your weekly plan is ready", body: "Older plan body.", link: "/plan", created_at: "2026-08-26T00:00:00.000Z" }),
      notification({ id: "wp-3", category: "weekly_plan", title: "Your weekly plan is ready", body: "Even older plan body.", link: "/plan", created_at: "2026-08-19T00:00:00.000Z" }),
    ]);

    expect(screen.getByText("Your weekly plan is ready")).toBeInTheDocument();
    expect(screen.getByText(/This week: finish the research draft\./)).toBeInTheDocument();
    expect(screen.getByText(/\+2 more/)).toBeInTheDocument();
    expect(screen.queryByText("Older plan body.")).not.toBeInTheDocument();
  });

  test("clicking 'Mark read' on a collapsed weekly_plan row marks every member id, not one", async () => {
    vi.mocked(markNotificationsRead).mockResolvedValue({});
    renderList([
      notification({ id: "wp-1", category: "weekly_plan", link: "/plan", created_at: "2026-09-02T00:00:00.000Z" }),
      notification({ id: "wp-2", category: "weekly_plan", link: "/plan", created_at: "2026-08-26T00:00:00.000Z" }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Mark read" }));

    await waitFor(() => expect(markNotificationsRead).toHaveBeenCalledWith(["wp-1", "wp-2"]));
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  test("the founder's own ~100-row shape stays one row, not a wall of duplicates", () => {
    const notifications = Array.from({ length: 100 }, (_, i) =>
      notification({ id: `wp-${i}`, category: "weekly_plan", title: "Your weekly plan is ready", link: "/plan", created_at: `2026-0${(i % 6) + 3}-01T00:00:00.000Z` }),
    );
    renderList(notifications);

    expect(screen.getAllByText("Your weekly plan is ready")).toHaveLength(1);
  });
});
