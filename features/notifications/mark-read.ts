import { toast } from "sonner";
import { markNotificationRead, markAllNotificationsRead, markNotificationsRead } from "@/app/(app)/notifications/actions";
import type { Notification } from "@/types/database";
import type { useTransition } from "react";

type StartTransition = ReturnType<typeof useTransition>[1];

/**
 * Shared by NotificationBell and the notifications page's row list — both need the exact
 * same "skip if already read, call the action, surface a real error" behavior, and keeping
 * it in one place is what makes it possible to say for certain both surfaces behave
 * identically rather than having quietly drifted (the kind of divergence-between-two-copies
 * this diagnosis pass was specifically watching for elsewhere).
 */
export function markReadIfUnread(notification: Notification, startTransition: StartTransition) {
  if (notification.read_at) return;
  startTransition(async () => {
    const result = await markNotificationRead(notification.id);
    if (result.error) toast.error(result.error);
  });
}

export function markAllRead(startTransition: StartTransition) {
  startTransition(async () => {
    const result = await markAllNotificationsRead();
    if (result.error) toast.error(result.error);
  });
}

/**
 * A group (features/notifications/group.ts) only ever contains unread members by
 * construction, so — unlike markReadIfUnread — there's no "already read" case to skip;
 * activating a group's card or its own "mark read" control always has something to do.
 */
export function markGroupRead(notificationIds: readonly string[], startTransition: StartTransition) {
  startTransition(async () => {
    const result = await markNotificationsRead([...notificationIds]);
    if (result.error) toast.error(result.error);
  });
}
