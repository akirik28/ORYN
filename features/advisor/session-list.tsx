"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatRelativeTime } from "@/lib/i18n/date";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export interface SessionListItem {
  id: string;
  title: string;
  updatedAt: string;
}

/**
 * Founder, 2026-09-04, verbatim: "eski oturumun sağ tarafa depolanması lazım ki eskiye tekrar
 * dönebilsin" — the old session needs to be stored on the right so he can go back to it. Pure
 * presentation: AdvisorWorkspace owns the list itself (loaded server-side, patched
 * client-side on create/first-title), this component only renders it and reports a click.
 *
 * Nothing here calls createConversation or sendAdvisorMessage — selecting a past session is a
 * read (AdvisorWorkspace's own onSelect goes through getConversationMessages), never a path
 * that could reach assertConversationLimitNotExceeded. The session wall gates creating a NEW
 * conversation; reopening an old one was never the thing it was built to stop.
 */
export function SessionList({
  conversations,
  activeConversationId,
  onSelect,
  isLoading,
}: {
  conversations: SessionListItem[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  const t = useTranslations("advisor.sessionList");
  const locale = useLocale() as Locale;

  if (conversations.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-ink-3">{t("heading")}</h3>
        <p className="text-sm text-ink-3">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-ink-3">{t("heading")}</h3>
      <ul className="space-y-1">
        {conversations.map((c) => {
          const active = c.id === activeConversationId;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                disabled={isLoading}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "w-full rounded-xl px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  active ? "bg-accent text-ink-1" : "text-ink-3 hover:bg-accent hover:text-ink-1",
                )}
              >
                <span className="block truncate font-medium">{c.title}</span>
                <span className="block text-xs text-ink-3">{formatRelativeTime(c.updatedAt, locale)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
