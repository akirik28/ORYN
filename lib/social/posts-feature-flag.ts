/**
 * The social layer's kill switch.
 *
 * This feature — posts, likes, reposts (migration 0058) — is built and switched OFF. The
 * founder's constraint is that nothing about it is reachable by a logged-in student, and
 * "provably unreachable, not merely unlinked" is the standard. That proof has five
 * independent layers, of which this module is one:
 *
 *   1. No route. Nothing under `app/` renders a feed or a post, so there is no URL to
 *      type. This is the primary guarantee — the other four are what stops it from
 *      quietly stopping being true.
 *   2. No navigation entry and no link from any existing page. See the comment block in
 *      features/app-shell/nav-items.ts, which is the brief for this work.
 *   3. No Server Action. The mutation logic lives in lib/social/post-actions.ts as
 *      ordinary server functions with NO `"use server"` directive, so Next never mints an
 *      action id for it and there is no RPC endpoint to invoke. Wrapping them in a real
 *      `"use server"` file is a five-line change at switch-on time — see that file's
 *      header.
 *   4. This flag. Every data-layer entry point calls `assertSocialFeedEnabled()` before
 *      it touches the database, so if a future route is ever added without re-reading any
 *      of the above, it fails closed rather than silently working.
 *   5. Migration 0058 is not applied. The tables do not exist in any environment.
 *
 * __tests__/social/posts-hidden.test.ts asserts 1-4 mechanically against the actual
 * source tree, so this stops being a claim in a comment and becomes a failing test the
 * moment any of it drifts.
 *
 * Deliberately NOT prefixed `NEXT_PUBLIC_`: the value must never reach the browser
 * bundle, both so it cannot be read client-side and so no client-side code can be written
 * that branches on it. Deliberately absent from `.env.example` too — that file is the
 * setup template a new developer fills in, and this is not a knob to fill in. Turning it
 * on is a founder decision gated on the legal review recorded in
 * docs/founder-blocked-backlog.md, and it does nothing on its own anyway while layers
 * 1-3 and 5 hold.
 */

export const SOCIAL_FEED_FLAG_ENV = "ORYN_ENABLE_SOCIAL_FEED";

/**
 * Exact-match on the string "true" only. Not truthiness, not a case-insensitive compare,
 * not "1"/"yes"/"on" — an ambiguous value like `ORYN_ENABLE_SOCIAL_FEED=false` or a
 * stray `=0` must resolve to OFF, and the only way to guarantee that is to enumerate the
 * single string that means on.
 */
export function isSocialFeedEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[SOCIAL_FEED_FLAG_ENV] === "true";
}

export class SocialFeedDisabledError extends Error {
  constructor() {
    super(
      "The Proxola social layer is not enabled. This feature is built but switched off; " +
        "see lib/social/posts-feature-flag.ts and docs/founder-blocked-backlog.md."
    );
    this.name = "SocialFeedDisabledError";
  }
}

/**
 * Throws rather than returning a falsy result on purpose. A caller that forgot to check
 * gets a loud failure; a caller that returns an empty feed would look like "no posts yet"
 * and could ship unnoticed.
 */
export function assertSocialFeedEnabled(env: Record<string, string | undefined> = process.env): void {
  if (!isSocialFeedEnabled(env)) throw new SocialFeedDisabledError();
}
