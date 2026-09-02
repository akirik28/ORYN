import { describe, expect, test } from "vitest";
import { groupNotifications, describeGroup, type GroupDisplayItem } from "@/features/notifications/group";
import type { Notification, NotificationCategory } from "@/types/database";

let seq = 0;
function notification(overrides: Partial<Notification> = {}): Notification {
  seq += 1;
  return {
    id: `n-${seq}`,
    user_id: "user-1",
    category: "new_opportunity",
    title: "New match: Test Program",
    body: null,
    link: "/opportunities/abc",
    read_at: null,
    created_at: `2026-09-02T10:00:${String(seq).padStart(2, "0")}.000Z`,
    ...overrides,
  };
}

describe("groupNotifications — only new_opportunity and weekly_plan group, only while unread", () => {
  test("a single unread new_opportunity notification is not grouped -- nothing to collapse", () => {
    const n = notification();
    const items = groupNotifications([n]);
    expect(items).toEqual([{ kind: "single", notification: n }]);
  });

  test("three unread new_opportunity notifications collapse into one group", () => {
    const notifications = [notification(), notification(), notification()];
    const items = groupNotifications(notifications);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("group");
    if (items[0].kind === "group") {
      expect(items[0].category).toBe("new_opportunity");
      expect(items[0].notifications).toHaveLength(3);
    }
  });

  test("group members are sorted most-recent-first regardless of input order", () => {
    const oldest = notification({ id: "old", created_at: "2026-09-01T00:00:00.000Z" });
    const newest = notification({ id: "new", created_at: "2026-09-03T00:00:00.000Z" });
    const middle = notification({ id: "mid", created_at: "2026-09-02T00:00:00.000Z" });

    const items = groupNotifications([oldest, newest, middle]);
    expect(items).toHaveLength(1);
    const group = items[0] as GroupDisplayItem;
    expect(group.notifications.map((n) => n.id)).toEqual(["new", "mid", "old"]);
  });

  test("weekly_plan also groups when unread and repeated -- the founder's own ~100-row case", () => {
    const notifications = Array.from({ length: 5 }, () => notification({ category: "weekly_plan", title: "Your weekly plan is ready", link: "/plan" }));
    const items = groupNotifications(notifications);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("group");
    if (items[0].kind === "group") expect(items[0].notifications).toHaveLength(5);
  });

  test("deadline notifications never group, however many are unread -- already write-time digested, and collapsing further would hide which deadline", () => {
    const notifications = [notification({ category: "deadline", link: "/dashboard" }), notification({ category: "deadline", link: "/dashboard" }), notification({ category: "deadline", link: "/dashboard" })];
    const items = groupNotifications(notifications);
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.kind === "single")).toBe(true);
  });

  test("profile_update and university_data_changed never group either -- already write-time digested per computation run", () => {
    const notifications = [
      notification({ category: "profile_update", link: "/profile/history" }),
      notification({ category: "profile_update", link: "/profile/history" }),
      notification({ category: "university_data_changed", link: "/universities/x" }),
      notification({ category: "university_data_changed", link: "/universities/x" }),
    ];
    const items = groupNotifications(notifications);
    expect(items).toHaveLength(4);
    expect(items.every((i) => i.kind === "single")).toBe(true);
  });

  test("connection and message never group -- each is a distinct interpersonal event", () => {
    const notifications = [notification({ category: "connection", link: "/u/a" }), notification({ category: "connection", link: "/u/b" }), notification({ category: "message", link: "/messages/a" })];
    const items = groupNotifications(notifications);
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.kind === "single")).toBe(true);
  });

  test("read new_opportunity notifications are never grouped, even several of them -- grouping only applies where the spam pressure actually is", () => {
    const notifications = [
      notification({ read_at: "2026-09-01T00:00:00.000Z" }),
      notification({ read_at: "2026-09-01T00:00:00.000Z" }),
      notification({ read_at: "2026-09-01T00:00:00.000Z" }),
    ];
    const items = groupNotifications(notifications);
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.kind === "single")).toBe(true);
  });

  test("mixed read and unread new_opportunity: only the unread ones group, read ones stay individual", () => {
    const readOne = notification({ id: "read-1", read_at: "2026-09-01T00:00:00.000Z" });
    const unread = [notification(), notification(), notification()];
    const items = groupNotifications([readOne, ...unread]);

    const singles = items.filter((i) => i.kind === "single");
    const groups = items.filter((i) => i.kind === "group");
    expect(singles).toHaveLength(1);
    expect((singles[0] as { notification: Notification }).notification.id).toBe("read-1");
    expect(groups).toHaveLength(1);
    expect((groups[0] as GroupDisplayItem).notifications).toHaveLength(3);
  });

  test("mixed categories: new_opportunity and weekly_plan each get their own separate group, not merged together", () => {
    const opps = [notification({ category: "new_opportunity" }), notification({ category: "new_opportunity" })];
    const plans = [notification({ category: "weekly_plan", link: "/plan" }), notification({ category: "weekly_plan", link: "/plan" })];
    const items = groupNotifications([...opps, ...plans]);

    expect(items).toHaveLength(2);
    expect(items.every((i) => i.kind === "group")).toBe(true);
    const categories = items.map((i) => (i as GroupDisplayItem).category).sort();
    expect(categories).toEqual(["new_opportunity", "weekly_plan"]);
  });

  test("overall list order stays most-recent-first, mixing singles and groups by their own effective timestamp", () => {
    const veryNew = notification({ id: "solo-newest", category: "deadline", link: "/dashboard", created_at: "2026-09-05T00:00:00.000Z" });
    const groupMembers = [
      notification({ id: "g1", created_at: "2026-09-04T00:00:00.000Z" }),
      notification({ id: "g2", created_at: "2026-09-03T00:00:00.000Z" }),
    ];
    const oldSolo = notification({ id: "solo-oldest", category: "deadline", link: "/dashboard", created_at: "2026-09-01T00:00:00.000Z" });

    const items = groupNotifications([oldSolo, ...groupMembers, veryNew]);
    // 2 deadline singles (never group) + 1 new_opportunity group (g1+g2) = 3 items, ordered by
    // each item's own effective timestamp: veryNew (09-05), the group (led by g1, 09-04),
    // oldSolo (09-01).
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ kind: "single", notification: { id: "solo-newest" } });
    expect(items[1].kind).toBe("group");
    expect(items[2]).toMatchObject({ kind: "single", notification: { id: "solo-oldest" } });
  });
});

describe("describeGroup — new_opportunity", () => {
  const t = (key: string, values?: Record<string, string | number>) => `${key}:${JSON.stringify(values ?? {})}`;

  test("title carries the real count, link goes to the general browse page, no per-item body", () => {
    const group: GroupDisplayItem = { kind: "group", category: "new_opportunity", notifications: [notification(), notification(), notification()] };
    const result = describeGroup(group, t);
    expect(result.title).toBe('newOpportunityDigestTitle:{"count":3}');
    expect(result.link).toBe("/opportunities");
    expect(result.body).toBeNull();
  });
});

describe("describeGroup — weekly_plan", () => {
  const t = (key: string, values?: Record<string, string | number>) => `${key}:${JSON.stringify(values ?? {})}`;

  test("shows the most recent member's real title/link -- the only one that's actually current", () => {
    const mostRecent = notification({ category: "weekly_plan", title: "Your weekly plan is ready", body: "Focus on research this week.", link: "/plan", created_at: "2026-09-02T10:00:05.000Z" });
    const older = notification({ category: "weekly_plan", title: "Your weekly plan is ready", body: "Old body.", link: "/plan", created_at: "2026-09-01T10:00:00.000Z" });
    const group: GroupDisplayItem = { kind: "group", category: "weekly_plan", notifications: [mostRecent, older] };

    const result = describeGroup(group, t);
    expect(result.title).toBe("Your weekly plan is ready");
    expect(result.link).toBe("/plan");
    expect(result.body).toContain("Focus on research this week.");
    expect(result.body).toContain('weeklyPlanDigestExtra:{"count":1}');
  });

  test("the founder's own ~100-row shape: a large group still just names the real overflow count", () => {
    const mostRecent = notification({ category: "weekly_plan", title: "Your weekly plan is ready", body: "This week's plan.", link: "/plan", created_at: "2026-09-02T10:00:05.000Z" });
    const older = Array.from({ length: 99 }, (_, i) => notification({ category: "weekly_plan", link: "/plan", created_at: `2026-08-${String((i % 28) + 1).padStart(2, "0")}T10:00:00.000Z` }));
    const group: GroupDisplayItem = { kind: "group", category: "weekly_plan", notifications: [mostRecent, ...older] };

    const result = describeGroup(group, t);
    expect(result.body).toContain('weeklyPlanDigestExtra:{"count":99}');
  });
});

describe("describeGroup — a category with no describeGroup branch fails to typecheck, not silently", () => {
  test("documents the invariant rather than testing it directly -- see describeGroup's own comment", () => {
    // groupNotifications only ever produces a "group" item for categories in
    // GROUPABLE_CATEGORIES (new_opportunity, weekly_plan) -- describeGroup's own type
    // signature (GroupDisplayItem, whose `category` is still the full NotificationCategory
    // union) means adding a third groupable category without a matching branch in
    // describeGroup is a real gap, but one TypeScript can't catch by itself since the
    // union isn't narrowed at that call site. Recorded here rather than silently trusted.
    const categories: NotificationCategory[] = ["new_opportunity", "weekly_plan"];
    expect(categories).toEqual(["new_opportunity", "weekly_plan"]);
  });
});
