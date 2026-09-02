"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Bell, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { markReadIfUnread, markAllRead, markGroupRead } from "@/features/notifications/mark-read";
import { groupNotifications, describeGroup, type Translate } from "@/features/notifications/group";
import { formatRelativeTime } from "@/lib/i18n/date";
import { toLocale } from "@/lib/i18n/config";
import type { Notification } from "@/types/database";

export function NotificationBell({ notifications, unreadCount }: { notifications: Notification[]; unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("notifications");
  // `useLocale()` is typed as the app's Locale union via the AppConfig augmentation in
  // lib/i18n/app-config.d.ts, but it resolves at runtime from provider state — `toLocale`
  // keeps a stale or unexpected value rendering English rather than throwing on an index.
  const locale = toLocale(useLocale());
  // A real total from the caller, not derived from `notifications` — that list is capped
  // (app/(app)/layout.tsx fetches the most recent 20) so filtering it silently under-counts
  // once a student has more than 20 unread. See that layout's own comment for the incident
  // this was found from. `unreadCount` stays that raw row count even once grouping collapses
  // the popover's own rows — features/notifications/group.ts's own header explains why the
  // badge and the list are allowed to disagree in shape: the badge answers "how much is
  // unread," the list answers "how many things do I need to look at," and collapsing the
  // second must never quietly change the first.
  const items = useMemo(() => groupNotifications(notifications), [notifications]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* nativeButton={true}, not false: the render target here is Button with no render
          override of its own, which Base UI's Button already renders as a real <button>
          (see components/ui/button-link.tsx's comment on Button's own native default).
          Unlike the other PopoverTrigger/Button `render` usages in this codebase (an <a>
          or Link standing in for the button), there's nothing non-native about this one. */}
      {/* Figma-source trigger (App.tsx `Topbar`): 34px white box, #EEEEF6 border — literal
          source colors, matching the search box next to it. */}
      <PopoverTrigger
        render={
          <button
            type="button"
            style={{ background: "white", borderColor: "#EEEEF6" }}
            className="flex size-[34px] items-center justify-center rounded-[9px] border text-[#6A6A7A] transition-colors hover:text-[#111118] focus-visible:outline-none"
          />
        }
        nativeButton={true}
        aria-label={t("label")}
      >
        <span className="relative">
          <Bell className="size-[17px]" strokeWidth={1.6} />
          {unreadCount > 0 ? (
            // Ultra, 2026-09-02 revision: founder reversed the "contained signal" direction
            // (three lanes' own independent convergence on it turned out to be evidence for
            // engineering restraint, not for what the founder wants the product to feel like
            // -- oryn-a7's own correction). This dot now grows under Ultra, not just glows --
            // a same-size glow read as too subtle to be "unmissable... from across a room".
            // Bigger, single box-shadow replaces tier-glow-sm entirely rather than adding a
            // second box-shadow rule alongside it (the same collision this session already
            // found on the card ring -- two box-shadow declarations don't layer). References
            // var(--tier-glow) directly, not a hardcoded color, so this follows oryn-4e's
            // token re-point automatically. Only ever renders alongside a real unread count
            // -- never decorates an empty state, unchanged from before.
            <span
              aria-hidden="true"
              style={{ background: "#3D35E8", borderColor: "white" }}
              className="ultra:size-3.5 ultra:shadow-[0_0_32px_8px_var(--tier-glow)] absolute -right-1 -top-1 size-2 rounded-full border-[1.5px]"
            />
          ) : null}
          <span className="sr-only">{unreadCount > 0 ? t("unreadCount", { count: unreadCount }) : t("noUnread")}</span>
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 rounded-[14px] p-0" style={{ borderColor: "#EEEEF6" }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "#F4F4F8" }}>
          <span className="text-[13px] font-bold" style={{ color: "#111118" }}>{t("title")}</span>
          {unreadCount > 0 ? (
            <button
              className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-80"
              style={{ color: "#3D35E8" }}
              disabled={isPending}
              onClick={() => markAllRead(startTransition)}
            >
              <CheckCheck className="size-3.5" /> {t("markAllRead")}
            </button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-7 text-center text-[13px]" style={{ color: "#AAAABC" }}>{t("allCaughtUp")}</p>
          ) : (
            items.map((item) => {
              const key = item.kind === "single" ? item.notification.id : `group-${item.category}`;
              const unread = item.kind === "single" ? !item.notification.read_at : true; // a group is unread-only by construction (group.ts)
              const { title, body, link, createdAt, onActivate } =
                item.kind === "single"
                  ? {
                      title: item.notification.title,
                      body: item.notification.body,
                      link: item.notification.link,
                      createdAt: item.notification.created_at,
                      onActivate: () => {
                        setOpen(false);
                        markReadIfUnread(item.notification, startTransition);
                      },
                    }
                  : (() => {
                      const d = describeGroup(item, t as Translate);
                      return {
                        ...d,
                        createdAt: item.notifications[0].created_at,
                        onActivate: () => {
                          setOpen(false);
                          markGroupRead(item.notifications.map((n) => n.id), startTransition);
                        },
                      };
                    })();

              const rowClassName = cn("flex w-full items-start gap-2.5 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent", unread ? "bg-[#FAFAFE]" : "bg-transparent");
              const rowContent = (
                <>
                  <span aria-hidden="true" style={{ background: unread ? "#3D35E8" : "#D0D0E0" }} className="mt-[5px] size-2 shrink-0 rounded-full" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-snug font-semibold" style={{ color: "#111118" }}>{title}</span>
                    {body ? <span className="mt-0.5 line-clamp-2 text-xs leading-[1.45]" style={{ color: "#7A7A8A" }}>{body}</span> : null}
                    <span className="mt-1 block text-[11px]" style={{ color: "#AAAABC" }}>
                      {formatRelativeTime(createdAt, locale)}
                    </span>
                  </span>
                </>
              );

              // A notification with no `link` previously still rendered as a Link, falling
              // back to `href="#"` — a tap dutifully marked it read but visibly went
              // nowhere, indistinguishable from a dead control. Rendered as a real button
              // instead when there's nothing to navigate to, so the affordance matches what
              // actually happens on click.
              return link ? (
                <Link key={key} href={link} onClick={onActivate} className={rowClassName}>
                  {rowContent}
                </Link>
              ) : (
                <button key={key} type="button" onClick={onActivate} className={rowClassName}>
                  {rowContent}
                </button>
              );
            })
          )}
        </div>
        {/* Always shown, even when the visible 20 are all read — the popover only ever
            shows the most recent 20 (app/(app)/layout.tsx), so there can be more history
            than fits here regardless of what's currently unread. This is the "see
            everything" escape hatch the popover itself deliberately doesn't try to be. */}
        <div className="border-t px-4 py-2.5 text-center" style={{ borderColor: "#F4F4F8" }}>
          <Link href="/notifications" onClick={() => setOpen(false)} className="text-[11px] font-semibold hover:opacity-80" style={{ color: "#3D35E8" }}>
            {t("viewAll")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
