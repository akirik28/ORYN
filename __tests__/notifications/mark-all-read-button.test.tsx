// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("@/app/(app)/notifications/actions", () => ({ markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { MarkAllReadButton } from "@/features/notifications/mark-all-read-button";
import { markAllNotificationsRead } from "@/app/(app)/notifications/actions";
import { toast } from "sonner";

beforeEach(() => {
  vi.mocked(markAllNotificationsRead).mockReset();
  vi.mocked(toast.error).mockReset();
});

afterEach(() => {
  cleanup();
});

describe("MarkAllReadButton", () => {
  test("renders nothing when there's nothing unread", () => {
    const { container } = render(<MarkAllReadButton unreadCount={0} label="Mark all read" />);
    expect(container).toBeEmptyDOMElement();
  });

  test("clicking it marks everything read, no toast on success", async () => {
    vi.mocked(markAllNotificationsRead).mockResolvedValue({});
    render(<MarkAllReadButton unreadCount={103} label="Mark all read" />);

    fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));

    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("a failed mark-all-read shows the real server error", async () => {
    vi.mocked(markAllNotificationsRead).mockResolvedValue({ error: "Couldn't update notifications." });
    render(<MarkAllReadButton unreadCount={5} label="Mark all read" />);

    fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't update notifications."));
  });
});
