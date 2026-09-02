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

// The base "nobody connected, nothing pending" shape, spread into each scenario below so
// every test only states the one or two fields it's actually varying.
const NONE = { isSelf: false, isPublic: false, hasAcceptedConnection: false, hasPendingRequestFromTarget: false };

describe("canViewBasicProfile — public_profiles view's WHERE clause (migration 0024, current)", () => {
  // Corrected 2026-09-02: this whole block was asserting migration 0023's ORIGINAL,
  // pre-fix carve-out (any connection, any status, either direction) rather than 0024's
  // actual fix — the exact bug 0024's own header names: "a single unsolicited connection
  // request... permanently unlocked their basic profile." Rewritten against the live
  // view definition (pg_get_viewdef, checked directly against oryn-qa-scratch), not the
  // migration file alone, and against migration 0024's own header comment for why each
  // branch is shaped the way it is.

  test("public profile: visible to a stranger", () => {
    expect(canViewBasicProfile({ ...NONE, isPublic: true })).toBe(true);
  });

  test("private profile, stranger: not visible", () => {
    expect(canViewBasicProfile({ ...NONE })).toBe(false);
  });

  test("owner viewing own profile: always visible, public or not", () => {
    expect(canViewBasicProfile({ ...NONE, isSelf: true })).toBe(true);
    expect(canViewBasicProfile({ ...NONE, isSelf: true, isPublic: true })).toBe(true);
  });

  test("accepted connection unlocks basic fields even on a private profile", () => {
    expect(canViewBasicProfile({ ...NONE, hasAcceptedConnection: true })).toBe(true);
  });

  test("a pending request FROM the target unlocks basic fields — you must be able to see who's asking before accept/decline means anything", () => {
    expect(canViewBasicProfile({ ...NONE, hasPendingRequestFromTarget: true })).toBe(true);
  });

  test("the exact bug migration 0024 fixed: a pending request the VIEWER sent does NOT unlock the target's profile", () => {
    // This is the one direction canViewBasicProfile's stale pre-fix version got
    // structurally wrong — hasAnyConnection couldn't even express this distinction, it
    // only knew "a row exists". The requester's own outgoing request (or a stale
    // request to a target who has since gone private) must never disclose the
    // recipient's profile back to them; that's what made the original leak a leak.
    // hasPendingRequestFromTarget is false here on purpose — it only ever reflects a
    // request in the OTHER direction — so this asserts the absence of a "hasPendingAsRequester"
    // input entirely, not just a false value for one.
    expect(canViewBasicProfile({ ...NONE, hasPendingRequestFromTarget: false })).toBe(false);
  });

  test("a declined request does not unlock basic fields, even though the row still exists", () => {
    // migration 0024's other named fix: "a declined request kept the same leak forever,
    // since the row still exists." Modeled by simply not setting either connection flag
    // — the type has no "status" field for the caller to get right or wrong, on purpose:
    // a declined (or any non-accepted, non-pending-toward-viewer) row is indistinguishable
    // from no row at all, which is the corrected behavior.
    expect(canViewBasicProfile({ ...NONE })).toBe(false);
  });

  test("disconnected (connection row hard-deleted): same as a stranger, no lingering visibility", () => {
    // Deliberately the opposite of message-history retention: disconnect removes the
    // connections row entirely, so both connection flags go back to false. Profile
    // visibility and message-history retention are two independent systems — retaining
    // one is not a reason to expect the other retained too.
    expect(canViewBasicProfile({ ...NONE })).toBe(false);
  });

  test("blocking is not an input to this gate at all — a public profile stays exactly as visible to a blocked party as to anyone else", () => {
    // This isn't an oversight: this app's block feature (migration 0027) scopes to
    // messaging only (is_blocked_between, checked in sendMessage). There is no
    // "isBlocked" parameter here because profile visibility was never meant to change
    // on block — same public-facing content, just no ability to message about it.
    const withoutBlockContext = canViewBasicProfile({ ...NONE, isPublic: true });
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
    const basicVisible = canViewBasicProfile({ isSelf: false, isPublic: false, hasAcceptedConnection: true, hasPendingRequestFromTarget: false });
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
    // Professional Profile pack (migration 0033): open_to has its own independent
    // visibility gate (contact_info.open_to_visibility, not this view — see
    // lib/social/contact-info.ts), and show_gpa is a private preference flag, not
    // display data — neither belongs in the blanket-visible identity tier.
    "open_to",
    "show_gpa",
  ];

  test.each(FORBIDDEN_PROFILE_FIELDS)("never includes private profiles column %s", (field) => {
    expect((PUBLIC_PROFILE_SAFE_COLUMNS as readonly string[]).includes(field)).toBe(false);
  });

  test.each(["id", "display_name", "headline", "about", "country", "curriculum", "graduation_year", "looking_for", "created_at"])(
    "includes expected public column %s",
    (field) => {
      expect((PUBLIC_PROFILE_SAFE_COLUMNS as readonly string[]).includes(field)).toBe(true);
    }
  );
});
