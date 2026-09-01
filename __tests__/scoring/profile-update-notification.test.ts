import { describe, expect, test } from "vitest";
import { detectNotifiableProfileUpdate, buildProfileUpdateNotification, NOTIFIABLE_DIMENSION_DELTA } from "@/lib/scoring/profile-update-notification";
import type { ProfileChange } from "@/lib/scoring/change";

/**
 * Pure-function coverage for the profile_update notification's actual decisions —
 * threshold, aggregation, and milestone detection. Both functions here are the entire
 * "does this deserve a notification, and what does it say" logic; lib/scoring/persist.ts's
 * recomputeCareerProfile only wires them to real data and a real createNotification call.
 *
 * recomputeCareerProfile itself is NOT behaviorally tested here, on purpose, matching this
 * exact file's established precedent: __tests__/scoring/recompute-admin-degradation.test.ts's
 * own header explains why (createClient() is request-scoped, not an injectable parameter
 * the way lib/deadlines/scan.ts's functions take a Supabase client — a live authenticated
 * session this environment doesn't have would be needed to drive it for real). See
 * profile-update-wiring.test.ts for the same source-text-pin approach that file already
 * uses, applied to confirm the new call is wired in the right place.
 */

function change(overrides: Partial<ProfileChange> = {}): ProfileChange {
  return { hasHistory: true, improved: [], declined: [], steady: 9, ...overrides };
}

describe("detectNotifiableProfileUpdate — the threshold decision", () => {
  test("no dimension history AND no completeness baseline (the true first-ever computation): null", () => {
    const result = detectNotifiableProfileUpdate({ hasHistory: false, improved: [], declined: [], steady: 0 }, null, 80);
    expect(result).toBeNull();
  });

  test("no dimension history but a real completeness baseline: the two are independent signals, so a milestone can still fire on its own", () => {
    // hasHistory=false only ever means "no PREVIOUS profile_score_snapshots row" (see
    // buildProfileChange's NO_PROFILE_CHANGE). previousCompleteness comes from a
    // different source (profiles.completeness_percent, read fresh every call) and can be
    // a real, non-null number even on a call where the dimension-snapshot history happens
    // to be empty -- these are not required to coincide, and this function deliberately
    // does not conflate them.
    const result = detectNotifiableProfileUpdate({ hasHistory: false, improved: [], declined: [], steady: 0 }, 20, 80);
    expect(result).toEqual({ dimensionChanges: [], completenessMilestone: 75 });
  });

  test("a dimension moving by exactly NOTIFIABLE_DIMENSION_DELTA counts — the boundary is inclusive", () => {
    const result = detectNotifiableProfileUpdate(change({ improved: [{ dimension: "research", delta: NOTIFIABLE_DIMENSION_DELTA }] }), null, 50);
    expect(result).not.toBeNull();
    expect(result!.dimensionChanges).toEqual([{ dimension: "research", delta: NOTIFIABLE_DIMENSION_DELTA }]);
  });

  test("a dimension moving by one less than the threshold does NOT count — this is the 'avoid meaningless movement' floor", () => {
    const result = detectNotifiableProfileUpdate(change({ improved: [{ dimension: "research", delta: NOTIFIABLE_DIMENSION_DELTA - 1 }] }), null, 50);
    expect(result).toBeNull();
  });

  test("a 1-point drift — explicitly named as noise in the brief — never notifies on its own", () => {
    const result = detectNotifiableProfileUpdate(change({ improved: [{ dimension: "academics", delta: 1 }] }), null, 50);
    expect(result).toBeNull();
  });

  test("a decline past the threshold counts too, not just improvements — Math.abs, not delta > 0", () => {
    const result = detectNotifiableProfileUpdate(change({ declined: [{ dimension: "leadership", delta: -NOTIFIABLE_DIMENSION_DELTA }] }), null, 50);
    expect(result).not.toBeNull();
    expect(result!.dimensionChanges).toEqual([{ dimension: "leadership", delta: -NOTIFIABLE_DIMENSION_DELTA }]);
  });

  test("a small decline below the threshold does not count", () => {
    const result = detectNotifiableProfileUpdate(change({ declined: [{ dimension: "leadership", delta: -2 }] }), null, 50);
    expect(result).toBeNull();
  });
});

describe("detectNotifiableProfileUpdate — aggregation across dimensions", () => {
  test("a CV import moving six dimensions at once is ONE event naming all six that cross the threshold, not six events", () => {
    const result = detectNotifiableProfileUpdate(
      change({
        improved: [
          { dimension: "academics", delta: 20 },
          { dimension: "research", delta: 15 },
          { dimension: "leadership", delta: 10 },
          { dimension: "awards_distinction", delta: 8 },
          { dimension: "execution_project_depth", delta: 6 },
          { dimension: "intellectual_curiosity", delta: 5 },
        ],
      }),
      null,
      70
    );
    expect(result).not.toBeNull();
    expect(result!.dimensionChanges).toHaveLength(6);
  });

  test("mixed: some dimensions cross the threshold, some don't — only the ones that do are included", () => {
    const result = detectNotifiableProfileUpdate(
      change({
        improved: [
          { dimension: "academics", delta: 20 },
          { dimension: "research", delta: 2 }, // below threshold
        ],
        declined: [
          { dimension: "leadership", delta: -1 }, // below threshold
        ],
      }),
      null,
      50
    );
    expect(result!.dimensionChanges).toEqual([{ dimension: "academics", delta: 20 }]);
  });
});

describe("detectNotifiableProfileUpdate — completeness milestones", () => {
  test("crossing 50% for the first time is reported", () => {
    const result = detectNotifiableProfileUpdate(change(), 40, 60);
    expect(result).not.toBeNull();
    expect(result!.completenessMilestone).toBe(50);
  });

  test("moving from 60 to 70 (no milestone crossed) reports nothing even with real movement", () => {
    const result = detectNotifiableProfileUpdate(change(), 60, 70);
    expect(result).toBeNull();
  });

  test("jumping across two milestones at once (20 -> 80) reports only the highest, 75", () => {
    const result = detectNotifiableProfileUpdate(change(), 20, 80);
    expect(result!.completenessMilestone).toBe(75);
  });

  test("reaching exactly 100 is reported as the 100 milestone", () => {
    const result = detectNotifiableProfileUpdate(change(), 90, 100);
    expect(result!.completenessMilestone).toBe(100);
  });

  test("previousCompleteness === null (no baseline, e.g. the very first computation) reports no milestone — say nothing rather than guess", () => {
    const result = detectNotifiableProfileUpdate(change({ improved: [{ dimension: "research", delta: 10 }] }), null, 80);
    expect(result!.completenessMilestone).toBeNull();
  });

  test("a dimension change AND a completeness milestone in the same update both surface in one event", () => {
    const result = detectNotifiableProfileUpdate(change({ improved: [{ dimension: "research", delta: 10 }] }), 40, 60);
    expect(result!.dimensionChanges).toHaveLength(1);
    expect(result!.completenessMilestone).toBe(50);
  });
});

const EN_TRANSLATE = (key: string, values?: Record<string, string | number>) => {
  switch (key) {
    case "profileUpdateTitle":
      return "Your profile score changed";
    case "profileUpdateItem":
      return `${values?.name} ${values?.delta}`;
    case "completenessMilestoneReached":
      return `Your profile is now ${values?.percent}% complete`;
    default:
      return key;
  }
};

describe("buildProfileUpdateNotification — formatting", () => {
  test("one dimension change: title names it generically, body has the one line", () => {
    const result = buildProfileUpdateNotification({ dimensionChanges: [{ dimension: "research", delta: 8 }], completenessMilestone: null }, EN_TRANSLATE, "en");
    expect(result.title).toBe("Your profile score changed");
    expect(result.body).toBe("Research +8");
    expect(result.link).toBe("/profile/history");
  });

  test("multiple dimension changes join into one body with '; ' — one notification, not several", () => {
    const result = buildProfileUpdateNotification(
      { dimensionChanges: [{ dimension: "research", delta: 8 }, { dimension: "leadership", delta: -3 }], completenessMilestone: null },
      EN_TRANSLATE,
      "en"
    );
    expect(result.body).toBe("Research +8; Leadership -3");
  });

  test("a completeness milestone rides along as one more line when dimensions also changed", () => {
    const result = buildProfileUpdateNotification({ dimensionChanges: [{ dimension: "research", delta: 8 }], completenessMilestone: 50 }, EN_TRANSLATE, "en");
    expect(result.body).toBe("Research +8; Your profile is now 50% complete");
  });

  test("a completeness-only event (no dimension changes) puts the fact directly in the title, with no redundant body", () => {
    const result = buildProfileUpdateNotification({ dimensionChanges: [], completenessMilestone: 100 }, EN_TRANSLATE, "en");
    expect(result.title).toBe("Your profile is now 100% complete");
    expect(result.body).toBeNull();
  });

  test("always links to /profile/history, the Progress page this notification is describing", () => {
    const single = buildProfileUpdateNotification({ dimensionChanges: [{ dimension: "research", delta: 8 }], completenessMilestone: null }, EN_TRANSLATE, "en");
    const completenessOnly = buildProfileUpdateNotification({ dimensionChanges: [], completenessMilestone: 50 }, EN_TRANSLATE, "en");
    expect(single.link).toBe("/profile/history");
    expect(completenessOnly.link).toBe("/profile/history");
  });
});
