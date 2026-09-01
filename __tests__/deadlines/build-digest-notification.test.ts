import { describe, expect, test } from "vitest";
import { buildDigestNotification, type DeadlineHit } from "@/lib/deadlines/scan";

/**
 * Pure formatting coverage for the aggregation shape Phase 24 asks for directly ("avoid
 * spam, aggregate where possible") — no Supabase, no createNotification, just "given these
 * crossed-threshold hits for one student, what does the notification say." Dedup (which
 * hits even reach this function) is covered separately in
 * dedupe-and-aggregation.test.ts, which is also where the anti-spam property CEO asked for
 * directly (same deadline, engine run twice, exactly one notification) lives — that
 * property spans filtering AND writing, not formatting alone.
 */

const EN_TRANSLATE = (key: string, values?: Record<string, string | number>) => {
  switch (key) {
    case "deadlineTomorrow":
      return "Deadline tomorrow";
    case "daysUntilDeadline":
      return `${values?.days} days until deadline`;
    case "deadlineDigestTitle":
      return `${values?.count} deadlines coming up`;
    case "deadlineDigestItem":
      return `${values?.name} — ${values?.days} days`;
    case "deadlineDigestItemTomorrow":
      return `${values?.name} — tomorrow`;
    default:
      return key;
  }
};

function hit(overrides: Partial<DeadlineHit> = {}): DeadlineHit {
  return {
    userId: "student-1",
    locale: "en",
    source: "application",
    sourceId: "app-1",
    daysUntil: 7,
    link: "/applications/app-1",
    itemLabel: "Yale University",
    singleBody: "Yale University — application deadline approaching.",
    ...overrides,
  };
}

describe("buildDigestNotification — a single hit", () => {
  test("reuses the exact single-item title/body/link — byte-for-byte what every student received before aggregation existed", () => {
    const result = buildDigestNotification([hit({ daysUntil: 7 })], EN_TRANSLATE);
    expect(result).toEqual({
      title: "7 days until deadline",
      body: "Yale University — application deadline approaching.",
      link: "/applications/app-1",
    });
  });

  test("daysUntil === 1 uses the tomorrow title, not the generic days-until one", () => {
    const result = buildDigestNotification([hit({ daysUntil: 1, singleBody: "Tomorrow's the day." })], EN_TRANSLATE);
    expect(result.title).toBe("Deadline tomorrow");
    expect(result.body).toBe("Tomorrow's the day.");
  });

  test("itemLabel is never consulted for a single hit — only singleBody", () => {
    const result = buildDigestNotification([hit({ itemLabel: "SHOULD NOT APPEAR", singleBody: "Real body." })], EN_TRANSLATE);
    expect(result.body).toBe("Real body.");
    expect(result.body).not.toContain("SHOULD NOT APPEAR");
  });
});

describe("buildDigestNotification — multiple hits (the aggregation this package adds)", () => {
  test("two hits produce ONE notification naming both, not two notifications — the core anti-spam requirement", () => {
    const result = buildDigestNotification(
      [hit({ sourceId: "app-1", itemLabel: "Yale University", daysUntil: 7 }), hit({ sourceId: "app-2", itemLabel: "Erasmus University Rotterdam", daysUntil: 3 })],
      EN_TRANSLATE
    );
    expect(result.title).toBe("2 deadlines coming up");
    expect(result.body).toBe("Erasmus University Rotterdam — 3 days; Yale University — 7 days");
  });

  test("items are sorted soonest-first regardless of input order", () => {
    const result = buildDigestNotification(
      [hit({ sourceId: "app-1", itemLabel: "Furthest", daysUntil: 30 }), hit({ sourceId: "app-2", itemLabel: "Nearest", daysUntil: 3 }), hit({ sourceId: "app-3", itemLabel: "Middle", daysUntil: 14 })],
      EN_TRANSLATE
    );
    expect(result.body).toBe("Nearest — 3 days; Middle — 14 days; Furthest — 30 days");
  });

  test("a daysUntil === 1 item uses the tomorrow phrasing inside the joined list, not '1 days'", () => {
    const result = buildDigestNotification([hit({ sourceId: "app-1", itemLabel: "Yale University", daysUntil: 7 }), hit({ sourceId: "app-2", itemLabel: "Due Tomorrow Inc", daysUntil: 1 })], EN_TRANSLATE);
    expect(result.body).toBe("Due Tomorrow Inc — tomorrow; Yale University — 7 days");
  });

  test("links to /dashboard, not any one item's own page — a mixed digest has no single correct destination", () => {
    const result = buildDigestNotification(
      [hit({ sourceId: "app-1", link: "/applications/app-1", daysUntil: 3 }), hit({ sourceId: "univ-1", source: "university_deadline", link: "/universities/univ-1", daysUntil: 7 })],
      EN_TRANSLATE
    );
    expect(result.link).toBe("/dashboard");
  });

  test("three hits still produce exactly one notification, all three named", () => {
    const result = buildDigestNotification(
      [
        hit({ sourceId: "app-1", itemLabel: "A", daysUntil: 30 }),
        hit({ sourceId: "app-2", itemLabel: "B", daysUntil: 14 }),
        hit({ sourceId: "app-3", itemLabel: "C", daysUntil: 3 }),
      ],
      EN_TRANSLATE
    );
    expect(result.title).toBe("3 deadlines coming up");
    expect(result.body.split("; ")).toHaveLength(3);
  });
});
