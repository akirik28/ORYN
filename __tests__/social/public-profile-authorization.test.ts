import { describe, expect, test } from "vitest";
import {
  canViewBasicProfile,
  canViewPortfolio,
  canShowMessageButton,
  PUBLIC_PROFILE_SAFE_COLUMNS,
} from "@/lib/social/public-profile-authorization";

// /u/[id] is the highest-consequence authorization surface in this app — migration 0024
// fixed a real privacy leak here once already. These scenarios mirror the exact list
// this route was audited against (docs/production-route-audit.md).

describe("canViewBasicProfile — public_profiles view's WHERE clause", () => {
  test("public profile: visible to a stranger", () => {
    expect(canViewBasicProfile({ isSelf: false, isPublic: true, hasAnyConnection: false })).toBe(true);
  });

  test("private profile, stranger: not visible", () => {
    expect(canViewBasicProfile({ isSelf: false, isPublic: false, hasAnyConnection: false })).toBe(false);
  });

  test("owner viewing own profile: always visible, public or not", () => {
    expect(canViewBasicProfile({ isSelf: true, isPublic: false, hasAnyConnection: false })).toBe(true);
    expect(canViewBasicProfile({ isSelf: true, isPublic: true, hasAnyConnection: false })).toBe(true);
  });

  test("accepted connection unlocks basic fields even on a private profile", () => {
    expect(canViewBasicProfile({ isSelf: false, isPublic: false, hasAnyConnection: true })).toBe(true);
  });

  test("a merely PENDING connection also unlocks basic fields — the view's carve-out has no status filter", () => {
    // hasAnyConnection models "any row in either direction, any status" — this is the
    // continuity carve-out from migration 0023's own comment: a requester can still see
    // the target's basic info while a request is pending, not just after acceptance.
    expect(canViewBasicProfile({ isSelf: false, isPublic: false, hasAnyConnection: true })).toBe(true);
  });

  test("disconnected (connection row hard-deleted): same as a stranger, no lingering visibility", () => {
    // Deliberately the opposite of message-history retention: disconnect removes the
    // connections row entirely, so hasAnyConnection goes back to false. Profile
    // visibility and message-history retention are two independent systems — retaining
    // one is not a reason to expect the other retained too.
    expect(canViewBasicProfile({ isSelf: false, isPublic: false, hasAnyConnection: false })).toBe(false);
  });

  test("blocking is not an input to this gate at all — a public profile stays exactly as visible to a blocked party as to anyone else", () => {
    // This isn't an oversight: this app's block feature (migration 0027) scopes to
    // messaging only (is_blocked_between, checked in sendMessage). There is no
    // "isBlocked" parameter here because profile visibility was never meant to change
    // on block — same public-facing content, just no ability to message about it.
    const withoutBlockContext = canViewBasicProfile({ isSelf: false, isPublic: true, hasAnyConnection: false });
    expect(withoutBlockContext).toBe(true);
  });
});

describe("canViewPortfolio — deliberately narrower than canViewBasicProfile", () => {
  test("public profile: portfolio visible to a stranger", () => {
    expect(canViewPortfolio({ isSelf: false, isPublic: true })).toBe(true);
  });

  test("private profile, stranger: portfolio not visible", () => {
    expect(canViewPortfolio({ isSelf: false, isPublic: false })).toBe(false);
  });

  test("owner previewing their own not-yet-public portfolio: always visible to themselves", () => {
    expect(canViewPortfolio({ isSelf: true, isPublic: false })).toBe(true);
  });

  test("the core asymmetry: an accepted connection on a private profile unlocks basic fields but NOT the portfolio", () => {
    // This is the one rule most likely to regress if someone "simplifies" the two gates
    // to share one condition later — lib/social/public-profile.ts's own comment states
    // this is deliberate: neither the accepted-connection nor the pending-request
    // carve-out was ever meant to unlock the full portfolio, only public_profiles' own
    // narrow column set.
    const basicVisible = canViewBasicProfile({ isSelf: false, isPublic: false, hasAnyConnection: true });
    const portfolioVisible = canViewPortfolio({ isSelf: false, isPublic: false });
    expect(basicVisible).toBe(true);
    expect(portfolioVisible).toBe(false);
  });

  // "Portfolio" here covers everything lib/portfolio/build.ts returns except education —
  // activities, leadership, sports, research, projects, awards, certifications,
  // volunteering, work — all gated by this one function. Named explicitly per the audit
  // checklist rather than left implicit in the generic cases above.
  test("sports visibility follows the same portfolio gate — hidden on a private profile even with a connection", () => {
    expect(canViewPortfolio({ isSelf: false, isPublic: false })).toBe(false);
  });

  test("achievements visibility (activities/awards/projects/research/etc.) follows the same portfolio gate", () => {
    expect(canViewPortfolio({ isSelf: false, isPublic: true })).toBe(true);
  });
});

describe("canShowMessageButton", () => {
  test("shown for an accepted connection", () => {
    expect(canShowMessageButton("accepted")).toBe(true);
  });

  test("hidden for a pending connection", () => {
    expect(canShowMessageButton("pending")).toBe(false);
  });

  test("hidden for a declined connection", () => {
    expect(canShowMessageButton("declined")).toBe(false);
  });

  test("hidden with no connection at all (stranger, or disconnected/history-only)", () => {
    expect(canShowMessageButton(null)).toBe(false);
  });
});

describe("PUBLIC_PROFILE_SAFE_COLUMNS — no cross-user private field leakage", () => {
  const FORBIDDEN_PROFILE_FIELDS = [
    "first_name",
    "last_name",
    "birth_year",
    "city",
    "school_name",
    "preferred_language",
    "timezone",
    "target_geographies",
    "weekly_time_budget",
    "busy_mode",
    "busy_mode_until",
    "onboarding_completed",
    "onboarding_step",
    "completeness_percent",
    "profile_strength_score",
    "is_admin",
    "updated_at",
  ];

  test.each(FORBIDDEN_PROFILE_FIELDS)("never includes private profiles column %s", (field) => {
    expect((PUBLIC_PROFILE_SAFE_COLUMNS as readonly string[]).includes(field)).toBe(false);
  });

  test.each(["id", "display_name", "country", "curriculum", "graduation_year", "looking_for", "created_at"])(
    "includes expected public column %s",
    (field) => {
      expect((PUBLIC_PROFILE_SAFE_COLUMNS as readonly string[]).includes(field)).toBe(true);
    }
  );
});
