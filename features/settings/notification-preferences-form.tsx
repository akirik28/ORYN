"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateNotificationPreferences } from "@/app/(app)/settings/actions";
import { MarkAllReadButton } from "@/features/notifications/mark-all-read-button";
import type { NotificationCategory } from "@/types/database";

// Same order FILTERABLE_CATEGORIES (features/notifications/categories.ts) renders the filter
// chips in — one place defines "the seven, in this order," reused here rather than re-derived,
// so a future eighth category only ever needs updating in one spot to show up in both places.
const CATEGORIES: NotificationCategory[] = [
  "deadline",
  "new_opportunity",
  "weekly_plan",
  "profile_update",
  "university_data_changed",
  "connection",
  "message",
];

/**
 * Migration 0090. Going-forward only — the section description above this form (settings.view
 * .notificationsDescription) says so in plain terms; this component's own job is just the
 * seven switches plus a way to act on the disclaimer immediately (MarkAllReadButton), not to
 * repeat the explanation.
 *
 * One row per category, same "label + On/Off button" shape as VisibilityForm's public-profile
 * row — this codebase has no Switch component, and a single new one for seven rows isn't worth
 * introducing over the pattern that already exists. All seven save together on one bottom
 * button, matching updateVisibility's batched-fields precedent, rather than one Server Action
 * round trip per toggle.
 */
export function NotificationPreferencesForm({
  initialPreferences,
  unreadCount,
}: {
  initialPreferences: Record<NotificationCategory, boolean>;
  unreadCount: number;
}) {
  const t = useTranslations("common");
  const tNotif = useTranslations("settings.notifications");
  const tCategories = useTranslations("notifications.categories");
  const tNotifications = useTranslations("notifications");
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = CATEGORIES.some((c) => preferences[c] !== initialPreferences[c]);

  return (
    <div className="space-y-3">
      {CATEGORIES.map((category) => (
        <div key={category} className="flex items-center justify-between gap-4 rounded-xl border p-4">
          <p className="text-sm font-medium">{tCategories(category)}</p>
          <Button
            type="button"
            variant={preferences[category] ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setPreferences((prev) => ({ ...prev, [category]: !prev[category] }));
              setSaved(false);
            }}
          >
            {preferences[category] ? tNotif("on") : tNotif("off")}
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          variant="outline"
          size="sm"
          disabled={isPending || !dirty}
          onClick={() =>
            startTransition(async () => {
              const result = await updateNotificationPreferences(preferences);
              if (result.error) setError(result.error);
              else setSaved(true);
            })
          }
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? tNotif("saved") : t("save")}
        </Button>
        <MarkAllReadButton unreadCount={unreadCount} label={tNotifications("markAllRead")} />
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
