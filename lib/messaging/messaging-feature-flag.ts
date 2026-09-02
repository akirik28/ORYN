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
 * Scope, decided explicitly rather than inferred wholesale from "Connections and Messages
 * are hidden" (nav-items.ts groups them, but they are not one feature underneath):
 *   - GATED: /messages, /messages/[userId], every export in
 *     app/(app)/messages/actions.ts, and the "Message" link on app/(app)/u/[id]/page.tsx
 *     (which points straight at /messages/[userId] and must not render at all when this
 *     flag is off — a visible dead link is worse than the button not existing).
 *   - NOT gated: sendConnectionRequest / respondToConnectionRequest / removeConnection,
 *     the /connections listing page, and /u/[id] itself. Connections is load-bearing for
 *     the already-shipped /u/[id] page (ConnectButton handles connect, accept and decline
 *     entirely inline, and Settings links to /u/[id] as a "share your public profile"
 *     feature) — a separate, intentional, live feature, not dormant like messaging. The
 *     connections listing page specifically is left live because gating it would strand a
 *     student mid-loop (accepting a request requires knowing whose profile to visit, and
 *     the listing page is how a student currently finds a pending incoming request); the
 *     asymmetry of getting this wrong favors leaving it reachable, matching today's
 *     behaviour, over gating a page on an inferred reading of intent.
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
