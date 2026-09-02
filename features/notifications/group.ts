import type { Notification, NotificationCategory } from "@/types/database";

/**
 * Phase 24: "avoid spam, aggregate where possible." Three of the seven categories already
 * solve this at write time — `deadline` (lib/deadlines/scan.ts's buildDigestNotification),
 * `university_data_changed` (lib/universities/data-change-scan.ts), and `profile_update`
 * (lib/scoring/profile-update-notification.ts) each combine everything from one computation
 * run into a single notification, "; "-joined, so an individual deadline/university/dimension
 * stays individually named inside the body rather than being collapsed into a bare count —
 * exactly the distinction Phase 24 needs: "3 new opportunities match your profile" is useful,
 * "2 deadlines soon" (losing which ones) is not.
 *
 * `new_opportunity` and `weekly_plan` have no equivalent — each match/plan creates its own row
 * with no batching, so multiple can pile up across genuinely separate trigger calls with
 * nothing to combine them. Live-verified 2026-09-02
 * (docs/notification-center-live-verification-2026-09-02.md): 12 `new_opportunity` rows for
 * one QA account, 3 opportunities repeated 4 times each; the founder's own account has ~100
 * unread `weekly_plan` rows, documented in app/(app)/layout.tsx's own comment as the
 * 2026-08-30 duplicate-notification incident (lib/plan/persist.ts), not 100 genuine weeks.
 *
 * Read-time, not write-time, deliberately: the founder's 100 rows already exist and a
 * write-time-only fix could never retroactively help them — grouping at render time makes
 * that backlog comprehensible with no migration, no backfill, and nothing destroyed (every
 * row stays queryable exactly as before). It's also the only option consistent with migration
 * 0087's model of one atomic fact per row, and it's fully reversible: a rendering change, not
 * a schema change.
 *
 * Only groups the UNREAD subset of a groupable category. Once read, a notification is history,
 * not "spam" competing for attention — grouping only where the spam pressure actually is means
 * a group dissolves back into its individual (now-read) rows the moment it's marked read,
 * with no extra state to track for that transition.
 */
const GROUPABLE_CATEGORIES: ReadonlySet<NotificationCategory> = new Set(["new_opportunity", "weekly_plan"]);

export interface SingleDisplayItem {
  kind: "single";
  notification: Notification;
}

export interface GroupDisplayItem {
  kind: "group";
  category: NotificationCategory;
  /** All member notifications, most-recent first — needed in full so "mark as read" can
   * target every id in the group, and so a `weekly_plan` group can show its most recent
   * member's real title/body (the only one that's actually current — every row for this
   * category links to the same `/plan`, which always shows the live plan regardless of
   * which notification led there). */
  notifications: readonly Notification[];
}

export type NotificationDisplayItem = SingleDisplayItem | GroupDisplayItem;

/**
 * Pure and translation-agnostic on purpose: returns raw grouped data, not rendered strings, so
 * it's fully unit-testable without mocking next-intl, and so the two call sites (the bell
 * popover, the full list page) can each render a group's title/link/body with their own
 * `useTranslations` call, matching how every other notification string in this codebase is
 * already composed at the point it's displayed, not inside a shared helper.
 *
 * Input order is not assumed — both call sites already fetch `order("created_at", { ascending:
 * false })`, and this re-sorts its own output to match rather than silently depending on that.
 */
export function groupNotifications(notifications: readonly Notification[]): NotificationDisplayItem[] {
  const byGroup = new Map<NotificationCategory, Notification[]>();
  const singles: Notification[] = [];

  for (const n of notifications) {
    if (n.read_at || !GROUPABLE_CATEGORIES.has(n.category)) {
      singles.push(n);
      continue;
    }
    const bucket = byGroup.get(n.category);
    if (bucket) bucket.push(n);
    else byGroup.set(n.category, [n]);
  }

  const items: NotificationDisplayItem[] = singles.map((notification) => ({ kind: "single", notification }));
  for (const [category, members] of byGroup) {
    if (members.length === 1) {
      items.push({ kind: "single", notification: members[0] });
      continue;
    }
    const sorted = [...members].sort((a, b) => b.created_at.localeCompare(a.created_at));
    items.push({ kind: "group", category, notifications: sorted });
  }

  return items.sort((a, b) => {
    const aTime = a.kind === "single" ? a.notification.created_at : a.notifications[0].created_at;
    const bTime = b.kind === "single" ? b.notification.created_at : b.notifications[0].created_at;
    return bTime.localeCompare(aTime);
  });
}

/**
 * Deliberately a plain, simple callable rather than next-intl's own generated `Translator`
 * type: matching that type exactly (either the namespace-scoped one or the unparameterized
 * `ReturnType<typeof useTranslations>`) either fails contravariantly (the namespace-scoped
 * `key` union is narrower than a plain `string`) or blows TypeScript's own type-instantiation
 * depth limit (confirmed hitting TS2589 here specifically, even though
 * features/dashboard/weekly-focus.tsx's very similar `reflectionLabel(t: ReturnType<typeof
 * useTranslations>, ...)` does not — the difference wasn't worth chasing further once a
 * simpler, working alternative existed). `t` is callable exactly like this at runtime
 * regardless of its richer compile-time type (next-intl's `Translator` also carries
 * `.rich`/`.markup`/`.raw`/`.has`, unused here) — both call sites pass the real `t` cast to
 * this simpler shape rather than fighting the generated type further.
 */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * Turns a GroupDisplayItem into what NotificationBell/NotificationList already know how to
 * render for a single notification — title/body/link — so the group-vs-single branch in each
 * component's JSX stays small. Not exported from group.ts's own pure section above because it
 * needs `t`; kept in the same file rather than a third one since it's presentation logic for
 * exactly the type group.ts defines, not a separate concern.
 *
 * `new_opportunity`: no per-item detail (every match already got its own full page at
 * /opportunities/[id] before it was grouped — nothing here needs to repeat that), just the
 * count and a link to browse everything currently matched.
 *
 * `weekly_plan`: shows the most recent member's real title/body — the only one that's still
 * current, since every row for this category links to the same `/plan`, which always renders
 * the live plan regardless of which notification led there — plus a plain count of the older,
 * now-superseded reminders folded into it.
 */
export function describeGroup(group: GroupDisplayItem, t: Translate): { title: string; body: string | null; link: string | null } {
  if (group.category === "new_opportunity") {
    return { title: t("newOpportunityDigestTitle", { count: group.notifications.length }), body: null, link: "/opportunities" };
  }
  // weekly_plan is the only other groupable category (GROUPABLE_CATEGORIES above) — no default
  // case needed, and none added, so a third category being made groupable without updating
  // this function fails to typecheck instead of silently falling through.
  const [mostRecent, ...older] = group.notifications;
  const body = older.length > 0 ? [mostRecent.body, t("weeklyPlanDigestExtra", { count: older.length })].filter(Boolean).join(" — ") : mostRecent.body;
  return { title: mostRecent.title, body, link: mostRecent.link };
}
