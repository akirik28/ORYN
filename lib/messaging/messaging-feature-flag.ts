import "server-only";

import { notFound } from "next/navigation";

/**
 * The 1:1 messaging kill switch.
 *
 * Unlike the social layer (lib/social/posts-feature-flag.ts), this feature's tables are
 * already applied and its routes already exist and render for anyone who types the URL —
 * confirmed live 2026-09-02 (audit/migration-0058-social-layer-2026-09-02). The founder's
 * decision to keep student-to-student messaging out of V1 (AGENTS.md §12: "do not build
 * public student messaging in V1"; Phase 54's do-not-build list) was implemented as a
 * removed navigation link only — features/app-shell/nav-items.ts's own comment says so
 * directly. That is an incomplete implementation of a decision already made, not a new
 * decision: this module closes the gap the same way the social layer is already closed,
 * reusing that pattern rather than inventing a second one.
 *
 * Scope, as of 2026-09-02: GATED here is /messages, /messages/[userId], every export in
 * app/(app)/messages/actions.ts, and the "Message" link on app/(app)/u/[id]/page.tsx
 * (which points straight at /messages/[userId] and must not render at all when this flag
 * is off — a visible dead link is worse than the button not existing).
 *
 * Connections was deliberately left ungated in this file's first version — CEO's ruling at
 * the time was that gating sendConnectionRequest/respondToConnectionRequest/removeConnection
 * or the /connections listing page risked stranding a student mid-loop for a feature that
 * looked like a different, separately-shipped thing from messaging. The founder overruled
 * that the same night: posts, messaging, likes AND connections all stay hidden until after
 * launch, as one bundle, to be switched on together later. See
 * lib/social/connections-feature-flag.ts for that gate — a separate flag, same pattern,
 * not folded into this one, because the two features can still plausibly be switched on at
 * different times even though they're being kept off together today; this comment is kept
 * accurate to what shipped, not rewritten to pretend the two decisions were always the same
 * one.
 *
 * Every data-layer entry point in app/(app)/messages/actions.ts calls
 * assertMessagingEnabled() before touching the database; every page under app/(app)/messages
 * calls requireMessagingEnabled() before rendering anything. __tests__/messaging/
 * messaging-hidden.test.ts asserts both, per function rather than per file — the social
 * layer's own equivalent test only checks that the assertion string appears somewhere in a
 * file, which would still pass with one bad call site out of several; this one enumerates
 * every export and checks each individually, the same way this exact gap was found.
 *
 * Deliberately NOT prefixed NEXT_PUBLIC_ and deliberately absent from .env.example, for the
 * same reasons as the social layer's flag: it must never reach the browser bundle, and it
 * is not a setup knob for a new developer to fill in.
 */

export const MESSAGING_FLAG_ENV = "ORYN_ENABLE_MESSAGING";

/** Exact-match on the string "true" only — same reasoning as isSocialFeedEnabled: an
 * ambiguous value must resolve to OFF, and enumerating the single string that means on is
 * the only way to guarantee that. */
export function isMessagingEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[MESSAGING_FLAG_ENV] === "true";
}

export class MessagingDisabledError extends Error {
  constructor() {
    super(
      "Oryn's 1:1 messaging is not enabled. This feature is built but switched off; " +
        "see lib/messaging/messaging-feature-flag.ts."
    );
    this.name = "MessagingDisabledError";
  }
}

/** For Server Actions — throws rather than returning a falsy result, so a caller that
 * forgot to check gets a loud failure instead of a silently-empty result that could ship
 * unnoticed. Mirrors assertSocialFeedEnabled exactly. */
export function assertMessagingEnabled(env: Record<string, string | undefined> = process.env): void {
  if (!isMessagingEnabled(env)) throw new MessagingDisabledError();
}

/** For pages — 404s rather than redirecting, same reasoning as requireAdmin()
 * (lib/security/require-admin.ts): doesn't reveal that a messaging feature exists at all
 * to a student who finds or guesses the URL. */
export function requireMessagingEnabled(env: Record<string, string | undefined> = process.env): void {
  if (!isMessagingEnabled(env)) notFound();
}
