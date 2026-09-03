import { describe, expect, test } from "vitest";
import {
  canViewPost,
  canRepostWithVisibility,
  isAtLeastAsNarrowAs,
  resolveRepostRender,
  type EmbeddedOriginal,
  type PostVisibilityInput,
} from "@/lib/social/posts-visibility";
import type { PostVisibility } from "@/types/database";

/**
 * The social layer's visibility rules (migration 0058). These mirror the RLS policy
 * branch for branch — the policy is the real enforcement (see the module's own header),
 * so treat a failure here as "the policy and the product's model of it have drifted",
 * which is the thing worth catching.
 */

/** A viewer with no relationship to the author and nothing special about them. Each test
 * overrides only the field it is actually about, so a rule can never pass by accident
 * because some unrelated field happened to be permissive. */
const STRANGER: PostVisibilityInput = {
  isAuthor: false,
  visibility: "connections",
  hasAcceptedConnection: false,
  authorProfileIsPublic: false,
  isBlockedBetween: false,
  isRemoved: false,
};

describe("canViewPost — the audience is an explicit decision, and private is the fallthrough", () => {
  test("a `private` post is visible to its author and to absolutely nobody else", () => {
    expect(canViewPost({ ...STRANGER, visibility: "private", isAuthor: true })).toBe(true);
    expect(canViewPost({ ...STRANGER, visibility: "private" })).toBe(false);
    // Not even to an accepted connection, and not even if the author's profile is public.
    expect(canViewPost({ ...STRANGER, visibility: "private", hasAcceptedConnection: true })).toBe(false);
    expect(canViewPost({ ...STRANGER, visibility: "private", authorProfileIsPublic: true })).toBe(false);
  });

  test("`connections` requires a currently ACCEPTED connection, not merely a pending one", () => {
    expect(canViewPost({ ...STRANGER, visibility: "connections", hasAcceptedConnection: true })).toBe(true);
    expect(canViewPost({ ...STRANGER, visibility: "connections", hasAcceptedConnection: false })).toBe(false);
  });

  test("`connections` is not widened by the author's profile being public", () => {
    expect(canViewPost({ ...STRANGER, visibility: "connections", authorProfileIsPublic: true })).toBe(false);
  });

  test("`oryn_public` is double-gated: the post's visibility AND the author's own is_public", () => {
    expect(canViewPost({ ...STRANGER, visibility: "oryn_public", authorProfileIsPublic: true })).toBe(true);
    // The whole point of the second gate: a student who never opted into a shareable
    // profile cannot broadcast Proxola-wide by picking a visibility on one post.
    expect(canViewPost({ ...STRANGER, visibility: "oryn_public", authorProfileIsPublic: false })).toBe(false);
  });

  test("an unrecognised visibility value falls through to author-only rather than to visible", () => {
    // The fail-closed construction, exercised: cast past the type so this asserts runtime
    // behaviour, which is what a bad enum value from a future migration would produce.
    const rogue = { ...STRANGER, visibility: "everyone" as unknown as PostVisibility, hasAcceptedConnection: true };
    expect(canViewPost(rogue)).toBe(false);
    expect(canViewPost({ ...rogue, isAuthor: true })).toBe(true);
  });
});

describe("canViewPost — blocking gates a feed even though it does not gate a profile", () => {
  test("a block hides a post from an otherwise-eligible connection", () => {
    const eligible = { ...STRANGER, visibility: "connections" as const, hasAcceptedConnection: true };
    expect(canViewPost(eligible)).toBe(true);
    expect(canViewPost({ ...eligible, isBlockedBetween: true })).toBe(false);
  });

  test("a block hides an oryn_public post too", () => {
    const eligible = { ...STRANGER, visibility: "oryn_public" as const, authorProfileIsPublic: true };
    expect(canViewPost(eligible)).toBe(true);
    expect(canViewPost({ ...eligible, isBlockedBetween: true })).toBe(false);
  });

  test("the input is symmetric — one boolean, never a direction", () => {
    // `isBlockedBetween` maps to is_blocked_between (symmetric, security-definer). There
    // is deliberately no `blockedByMe` / `blockedMe` pair on this input: a caller must not
    // be able to learn which party blocked which, the same non-disclosure rule
    // lib/messaging/authorization.ts already enforces.
    expect(Object.keys(STRANGER).filter((k) => k.toLowerCase().includes("block"))).toEqual(["isBlockedBetween"]);
  });

  test("a block does not hide the author's own post from themselves", () => {
    expect(canViewPost({ ...STRANGER, isAuthor: true, isBlockedBetween: true })).toBe(true);
  });
});

describe("canViewPost — moderator removal", () => {
  const eligible = { ...STRANGER, visibility: "connections" as const, hasAcceptedConnection: true };

  test("a removed post is hidden from every viewer except its author", () => {
    expect(canViewPost({ ...eligible, isRemoved: true })).toBe(false);
    expect(canViewPost({ ...eligible, isRemoved: true, authorProfileIsPublic: true, visibility: "oryn_public" })).toBe(false);
  });

  test("the author still sees their own removed post — removal is never silent", () => {
    expect(canViewPost({ ...STRANGER, isAuthor: true, isRemoved: true })).toBe(true);
  });
});

describe("canRepostWithVisibility — a repost can never widen the original's audience", () => {
  test("same visibility is always allowed", () => {
    expect(canRepostWithVisibility("connections", "connections")).toBe(true);
    expect(canRepostWithVisibility("oryn_public", "oryn_public")).toBe(true);
  });

  test("narrowing is allowed", () => {
    expect(canRepostWithVisibility("oryn_public", "connections")).toBe(true);
    expect(canRepostWithVisibility("oryn_public", "private")).toBe(true);
    expect(canRepostWithVisibility("connections", "private")).toBe(true);
  });

  test("widening is rejected — this is the rule that stops a repost being a leak", () => {
    expect(canRepostWithVisibility("connections", "oryn_public")).toBe(false);
  });

  test("a private post cannot be reposted at any visibility", () => {
    expect(canRepostWithVisibility("private", "private")).toBe(false);
    expect(canRepostWithVisibility("private", "connections")).toBe(false);
    expect(canRepostWithVisibility("private", "oryn_public")).toBe(false);
  });

  test("the width ordering itself is private < connections < oryn_public", () => {
    expect(isAtLeastAsNarrowAs("private", "connections")).toBe(true);
    expect(isAtLeastAsNarrowAs("connections", "oryn_public")).toBe(true);
    expect(isAtLeastAsNarrowAs("oryn_public", "connections")).toBe(false);
  });
});

describe("resolveRepostRender — one neutral unavailable state, on purpose", () => {
  const ORIGINAL: EmbeddedOriginal = {
    id: "11111111-1111-1111-1111-111111111111",
    authorId: "22222222-2222-2222-2222-222222222222",
    body: "Original text",
    attachmentPath: null,
    editedAt: null,
    removedAt: null,
    createdAt: "2026-08-20T10:00:00.000Z",
  };

  test("an available original is shown, with its CURRENT body", () => {
    const result = resolveRepostRender(ORIGINAL);
    expect(result.state).toBe("shown");
    expect(result.state === "shown" && result.original.body).toBe("Original text");
  });

  test("an edited original shows the edited text plus the edit marker, never a snapshot", () => {
    // The repost is a pointer, not a copy. A snapshot taken at repost time would let a
    // reposter pin a version the author has since corrected or retracted.
    const edited = { ...ORIGINAL, body: "Corrected text", editedAt: "2026-08-21T09:00:00.000Z" };
    const result = resolveRepostRender(edited);
    expect(result.state).toBe("shown");
    expect(result.state === "shown" && result.original.body).toBe("Corrected text");
    expect(result.state === "shown" && result.original.editedAt).toBe("2026-08-21T09:00:00.000Z");
  });

  test("a deleted original (null from an RLS-filtered read) renders unavailable", () => {
    expect(resolveRepostRender(null)).toEqual({ state: "unavailable" });
  });

  test("a moderator-removed original renders unavailable even when the row came back", () => {
    // This happens for exactly one viewer: the original's own author, who can still read
    // their removed row, looking at someone else's repost of it.
    expect(resolveRepostRender({ ...ORIGINAL, removedAt: "2026-08-21T12:00:00.000Z" })).toEqual({ state: "unavailable" });
  });

  test("the unavailable result carries NO reason field — deleted and not-visible-to-you are indistinguishable", () => {
    // Distinguishing them would disclose "that post still exists, you just can't see it".
    // Asserting the shape, not just the boolean, is what stops a well-meaning future
    // change from adding `reason: "deleted"` back.
    const fromDeleted = resolveRepostRender(null);
    const fromRemoved = resolveRepostRender({ ...ORIGINAL, removedAt: "2026-08-21T12:00:00.000Z" });
    expect(Object.keys(fromDeleted)).toEqual(["state"]);
    expect(fromDeleted).toEqual(fromRemoved);
  });
});
