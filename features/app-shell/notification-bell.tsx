"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { markNotificationRead, markAllNotificationsRead } from "@/app/(app)/notifications/actions";
import type { Notification } from "@/types/database";

export function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* nativeButton={true}, not false: the render target here is Button with no render
          override of its own, which Base UI's Button already renders as a real <button>
          (see components/ui/button-link.tsx's comment on Button's own native default).
          Unlike the other PopoverTrigger/Button `render` usages in this codebase (an <a>
          or Link standing in for the button), there's nothing non-native about this one. */}
      <PopoverTrigger render={<Button variant="ghost" size="icon" />} nativeButton={true} aria-label="Notifications">
        <span className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 ? (
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await markAllNotificationsRead();
                  if (result.error) toast.error(result.error);
                })
              }
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.link ?? "#"}
                onClick={() => {
                  setOpen(false);
                  if (!notification.read_at) {
                    startTransition(async () => {
                      const result = await markNotificationRead(notification.id);
                      if (result.error) toast.error(result.error);
                    });
                  }
                }}
                className={cn(
                  "block border-b px-3 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-accent",
                  !notification.read_at && "bg-accent/40"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-snug">{notification.title}</p>
                  {!notification.read_at ? <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                </div>
                {notification.body ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</p>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
