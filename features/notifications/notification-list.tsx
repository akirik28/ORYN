"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { markReadIfUnread, markGroupRead } from "./mark-read";
import { groupNotifications, describeGroup, type Translate } from "./group";
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
  const items = useMemo(() => groupNotifications(notifications), [notifications]);

  return (
    <ul className="divide-y overflow-hidden rounded-2xl border" style={{ borderColor: "#EEEEF6" }}>
      {items.map((item) => {
        const key = item.kind === "single" ? item.notification.id : `group-${item.category}`;
        const unread = item.kind === "single" ? !item.notification.read_at : true; // a group is unread-only by construction (group.ts)
        const { title, body, link, createdAt, onActivate } =
          item.kind === "single"
            ? { title: item.notification.title, body: item.notification.body, link: item.notification.link, createdAt: item.notification.created_at, onActivate: () => markReadIfUnread(item.notification, startTransition) }
            : (() => {
                const d = describeGroup(item, t as Translate);
                return { ...d, createdAt: item.notifications[0].created_at, onActivate: () => markGroupRead(item.notifications.map((n) => n.id), startTransition) };
              })();

        return (
          <li key={key} className={cn("flex items-start gap-3 px-4 py-4 sm:px-6", unread ? "bg-[#FAFAFE]" : "bg-transparent")}>
            <span aria-hidden="true" className="mt-[7px] size-2 shrink-0 rounded-full" style={{ background: unread ? "#3D35E8" : "#D0D0E0" }} />
            <div className="min-w-0 flex-1">
              {link ? (
                <Link href={link} onClick={onActivate} className="block text-sm font-semibold hover:underline" style={{ color: "#111118" }}>
                  {title}
                </Link>
              ) : (
                <span className="block text-sm font-semibold" style={{ color: "#111118" }}>
                  {title}
                </span>
              )}
              {body ? (
                <p className="mt-1 text-sm leading-relaxed" style={{ color: "#7A7A8A" }}>
                  {body}
                </p>
              ) : null}
              <span className="mt-1.5 block text-xs" style={{ color: "#AAAABC" }}>
                {formatRelativeTime(createdAt, locale)}
              </span>
            </div>
            {unread ? (
              <button type="button" disabled={isPending} onClick={onActivate} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent" style={{ color: "#3D35E8" }}>
                {t("markAsRead")}
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
