import { describe, expect, test } from "vitest";
import {
  buildOriginalPostInsert,
  buildRepostInsert,
  buildPostUpdate,
  parseVisibility,
  PostInputError,
  POST_VISIBILITIES,
  MAX_POST_BODY_LENGTH,
} from "@/lib/social/posts-input";

const AUTHOR = "11111111-1111-1111-1111-111111111111";
const ORIGINAL_ID = "22222222-2222-2222-2222-222222222222";

describe("visibility is never implicit", () => {
  test("every declared visibility parses to itself", () => {
    for (const v of POST_VISIBILITIES) expect(parseVisibility(v)).toBe(v);
  });

  test.each([undefined, null, "", "public", "everyone", "friends", 1, true, {}])(
    "%s is rejected rather than coerced to a default",
    (raw) => {
      // Silently substituting a "safe" default would be its own bug: a caller's stated
      // audience must never be rewritten, and a missing one must never become a guess.
      expect(() => parseVisibility(raw)).toThrow(PostInputError);
    }
  );

  test("omitting visibility fails the whole insert — there is no fallback path", () => {
    expect(() => buildOriginalPostInsert({ authorId: AUTHOR, body: "hi", visibility: undefined })).toThrow(PostInputError);
  });
});

describe("buildOriginalPostInsert", () => {
  test("produces exactly the columns an original post is allowed to set", () => {
    const insert = buildOriginalPostInsert({ authorId: AUTHOR, body: "  Hello  ", visibility: "connections" });
    // Assert the CONTENTS, not that something was returned. In particular: no counters,
    // no removed_*, no edited_at — those are trigger- and moderator-owned.
    expect(insert).toEqual({
      author_id: AUTHOR,
      kind: "original",
      visibility: "connections",
      body: "Hello",
      attachment_path: null,
      attachment_kind: null,
    });
  });

  test.each(["like_count", "repost_count", "edit_count", "edited_at", "removed_at", "removed_by", "removal_reason"])(
    "never sets %s",
    (column) => {
      const insert = buildOriginalPostInsert({ authorId: AUTHOR, body: "hi", visibility: "private" });
      expect(Object.keys(insert)).not.toContain(column);
    }
  );

  test("an empty or whitespace-only body is rejected", () => {
    expect(() => buildOriginalPostInsert({ authorId: AUTHOR, body: "   ", visibility: "private" })).toThrow(PostInputError);
  });

  test("the length bound matches the schema's own", () => {
    const atLimit = "x".repeat(MAX_POST_BODY_LENGTH);
    expect(buildOriginalPostInsert({ authorId: AUTHOR, body: atLimit, visibility: "private" }).body).toHaveLength(
      MAX_POST_BODY_LENGTH
    );
    expect(() => buildOriginalPostInsert({ authorId: AUTHOR, body: `${atLimit}x`, visibility: "private" })).toThrow(
      PostInputError
    );
  });

  test("an attachment must have both path and kind, or neither", () => {
    const complete = buildOriginalPostInsert({
      authorId: AUTHOR,
      body: "hi",
      visibility: "private",
      attachmentPath: `${AUTHOR}/photo.png`,
      attachmentKind: "image",
    });
    expect(complete.attachment_path).toBe(`${AUTHOR}/photo.png`);
    expect(complete.attachment_kind).toBe("image");

    expect(() =>
      buildOriginalPostInsert({ authorId: AUTHOR, body: "hi", visibility: "private", attachmentPath: "x/y.png" })
    ).toThrow(PostInputError);
    expect(() =>
      buildOriginalPostInsert({ authorId: AUTHOR, body: "hi", visibility: "private", attachmentKind: "image" })
    ).toThrow(PostInputError);
  });
});

describe("buildRepostInsert — a repost is its own object referencing the original", () => {
  test("with commentary", () => {
    expect(
      buildRepostInsert({
        authorId: AUTHOR,
        originalPostId: ORIGINAL_ID,
        originalVisibility: "connections",
        commentary: "  worth reading  ",
        visibility: "connections",
      })
    ).toEqual({
      author_id: AUTHOR,
      kind: "repost",
      visibility: "connections",
      body: "worth reading",
      reposted_post_id: ORIGINAL_ID,
      attachment_path: null,
      attachment_kind: null,
    });
  });

  test("without commentary — body is null, not an empty string", () => {
    // The schema's `posts_repost_shape` allows a null body but a "" would fail its
    // `char_length(btrim(body)) between 1 and 3000` branch.
    const bare = buildRepostInsert({
      authorId: AUTHOR,
      originalPostId: ORIGINAL_ID,
      originalVisibility: "connections",
      visibility: "connections",
    });
    expect(bare.body).toBeNull();

    const whitespaceOnly = buildRepostInsert({
      authorId: AUTHOR,
      originalPostId: ORIGINAL_ID,
      originalVisibility: "connections",
      commentary: "   ",
      visibility: "connections",
    });
    expect(whitespaceOnly.body).toBeNull();
  });

  test("a repost never carries its own attachment — it displays the original's", () => {
    const insert = buildRepostInsert({
      authorId: AUTHOR,
      originalPostId: ORIGINAL_ID,
      originalVisibility: "oryn_public",
      visibility: "oryn_public",
    });
    expect(insert.attachment_path).toBeNull();
    expect(insert.attachment_kind).toBeNull();
  });

  test("widening the audience is rejected at the point of decision, not left to the render", () => {
    expect(() =>
      buildRepostInsert({
        authorId: AUTHOR,
        originalPostId: ORIGINAL_ID,
        originalVisibility: "connections",
        visibility: "oryn_public",
      })
    ).toThrow(PostInputError);
  });

  test("narrowing is allowed", () => {
    expect(
      buildRepostInsert({
        authorId: AUTHOR,
        originalPostId: ORIGINAL_ID,
        originalVisibility: "oryn_public",
        visibility: "connections",
      }).visibility
    ).toBe("connections");
  });

  test("a private original cannot be reposted at all", () => {
    expect(() =>
      buildRepostInsert({
        authorId: AUTHOR,
        originalPostId: ORIGINAL_ID,
        originalVisibility: "private",
        visibility: "private",
      })
    ).toThrow(PostInputError);
  });

  test("over-long commentary is rejected", () => {
    expect(() =>
      buildRepostInsert({
        authorId: AUTHOR,
        originalPostId: ORIGINAL_ID,
        originalVisibility: "connections",
        commentary: "x".repeat(MAX_POST_BODY_LENGTH + 1),
        visibility: "connections",
      })
    ).toThrow(PostInputError);
  });
});

describe("buildPostUpdate — an edit can only touch what an author owns", () => {
  test("body only", () => {
    expect(buildPostUpdate({ body: " new text " })).toEqual({ body: "new text" });
  });

  test("visibility only", () => {
    expect(buildPostUpdate({ visibility: "private" })).toEqual({ visibility: "private" });
  });

  test("both together", () => {
    expect(buildPostUpdate({ body: "new", visibility: "connections" })).toEqual({ body: "new", visibility: "connections" });
  });

  test.each(["edited_at", "edit_count", "like_count", "repost_count", "removed_at", "removed_by", "author_id", "kind"])(
    "an edit payload never contains %s",
    (column) => {
      // An author must not be able to make an edit look like it never happened, un-remove
      // a moderated post, or inflate their own counters. The guard trigger enforces this
      // at the database; keeping it out of the payload is the defence-in-depth half.
      expect(Object.keys(buildPostUpdate({ body: "new", visibility: "private" }))).not.toContain(column);
    }
  );

  test("an empty edit is rejected rather than sent as a no-op UPDATE", () => {
    // A no-op UPDATE would still fire the revision trigger's comparison and bump
    // updated_at for nothing.
    expect(() => buildPostUpdate({})).toThrow(PostInputError);
  });

  test("clearing the body is rejected — deleting is the way to remove a post", () => {
    expect(() => buildPostUpdate({ body: "   " })).toThrow(PostInputError);
  });

  test("an invalid visibility on an edit is rejected, same as on create", () => {
    expect(() => buildPostUpdate({ visibility: "everyone" })).toThrow(PostInputError);
  });
});
