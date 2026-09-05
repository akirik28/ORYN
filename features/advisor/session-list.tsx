"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
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
  onDelete,
  isLoading,
  isDeleting,
}: {
  conversations: SessionListItem[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  /** Founder, 2026-09-05, verbatim: "silme butonu da lazım" — a delete button too.
   *  Irreversible (advisor_messages cascade-deletes with the conversation, migration
   *  0011), which is exactly why confirmation lives in this component rather than firing
   *  on a single click — see the AlertDialog below. */
  onDelete: (id: string) => void;
  isLoading: boolean;
  /** The id currently being deleted, or null — distinct from isLoading (which gates
   *  *selecting* a conversation), so switching sessions stays possible while a delete for a
   *  DIFFERENT row is in flight, and only the row actually being removed shows a spinner. */
  isDeleting: string | null;
}) {
  const t = useTranslations("advisor.sessionList");
  const locale = useLocale() as Locale;
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const confirming = conversations.find((c) => c.id === confirmingId) ?? null;

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
            <li key={c.id} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                disabled={isLoading}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "w-full rounded-xl px-3 py-2 pr-9 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  active ? "bg-accent text-ink-1" : "text-ink-3 hover:bg-accent hover:text-ink-1",
                )}
              >
                <span className="block truncate font-medium">{c.title}</span>
                <span className="block text-xs text-ink-3">{formatRelativeTime(c.updatedAt, locale)}</span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("deleteLabel", { title: c.title })}
                title={t("delete")}
                disabled={isDeleting !== null}
                onClick={(e) => {
                  // Sits on top of the select <button> above, not nested inside it — a
                  // <button> inside a <button> is invalid HTML and unreachable by some
                  // assistive tech, so this stops the click from also selecting the row.
                  e.stopPropagation();
                  setConfirmingId(c.id);
                }}
                className="absolute top-1/2 right-1 -translate-y-1/2 text-ink-3 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-error disabled:opacity-40"
              >
                {isDeleting === c.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </Button>
            </li>
          );
        })}
      </ul>

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirmingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{confirming ? t("deleteConfirmDescription", { title: confirming.title }) : null}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={isDeleting !== null} />}>{t("cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting !== null}
              onClick={() => {
                if (confirming) onDelete(confirming.id);
                setConfirmingId(null);
              }}
            >
              {t("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
