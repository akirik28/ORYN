"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { markReadIfUnread } from "./mark-read";
import { formatRelativeTime } from "@/lib/i18n/date";
import { toLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/database";

/**
 * The full-page counterpart to NotificationBell's popover rows — same underlying data and
 * the same markReadIfUnread behavior, but room to show the whole body (no line-clamp) and a
 * real per-row "Mark read" control, not just "click through and it happens to mark read".
 * The unread dot stays purely decorative here (aria-hidden, same as the popover) rather than
 * doubling as the click target — an 8px dot is well under a reasonable touch-target size, so
 * the explicit button below carries that job instead.
 */
export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("notifications");
  const locale = toLocale(useLocale());

  return (
    <ul className="divide-y overflow-hidden rounded-2xl border" style={{ borderColor: "#EEEEF6" }}>
      {notifications.map((notification) => {
        const unread = !notification.read_at;
        return (
          <li key={notification.id} className={cn("flex items-start gap-3 px-4 py-4 sm:px-6", unread ? "bg-[#FAFAFE]" : "bg-transparent")}>
            <span aria-hidden="true" className="mt-[7px] size-2 shrink-0 rounded-full" style={{ background: unread ? "#3D35E8" : "#D0D0E0" }} />
            <div className="min-w-0 flex-1">
              {notification.link ? (
                <Link
                  href={notification.link}
                  onClick={() => markReadIfUnread(notification, startTransition)}
                  className="block text-sm font-semibold hover:underline"
                  style={{ color: "#111118" }}
                >
                  {notification.title}
                </Link>
              ) : (
                <span className="block text-sm font-semibold" style={{ color: "#111118" }}>
                  {notification.title}
                </span>
              )}
              {notification.body ? (
                <p className="mt-1 text-sm leading-relaxed" style={{ color: "#7A7A8A" }}>
                  {notification.body}
                </p>
              ) : null}
              <span className="mt-1.5 block text-xs" style={{ color: "#AAAABC" }}>
                {formatRelativeTime(notification.created_at, locale)}
              </span>
            </div>
            {unread ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => markReadIfUnread(notification, startTransition)}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                style={{ color: "#3D35E8" }}
              >
                {t("markAsRead")}
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
