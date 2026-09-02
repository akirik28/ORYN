import "server-only";

import { notFound } from "next/navigation";

/**
 * The Connections kill switch.
 *
 * Same pattern as lib/messaging/messaging-feature-flag.ts, extended rather than reused
 * directly (CEO's explicit instruction: one switch FAMILY, not a second mechanism — but a
 * separate flag from messaging's own, since the two features can still plausibly be
 * switched on at different times even though the founder is keeping both off together
 * today). Founder's decision, relayed 2026-09-02, reversing the connections half of the
 * messaging-gate package's original scope: "şu anda post atma, mesajlaşma, post beğenme
 * tarzı özellikler, connection özellikleri gizli kalsın. Açıcaz sonra." (posting,
 * messaging, post-liking, and connection features stay hidden for now; they'll be turned
 * on later.) Hide, don't delete, keep it switchable — the same posture as the social feed
 * and messaging.
 *
 * Scope, decided explicitly rather than gating everything connections touches:
 *   - GATED: every export in app/(app)/connections/actions.ts
 *     (sendConnectionRequest/respondToConnectionRequest/removeConnection), the
 *     /connections listing page, and the connection-specific controls on
 *     app/(app)/u/[id]/page.tsx (ConnectButton and the mutual-connections line) — not the
 *     whole /u/[id] page.
 *   - NOT gated: /u/[id] itself, and everything else it renders (portfolio, skills,
 *     endorsements, recommendations). That page is a genuinely separate, already-shipped
 *     feature that happens to also show connection controls — it is not "a connections
 *     page". Settings' "share your public profile" link generator points at /u/[id]
 *     specifically so a student can show their portfolio; gating the whole page the way
 *     messaging's page is gated would turn that into a dead link for a feature (portfolio
 *     sharing) the founder never named as something to hide. Gating only the connection
 *     controls means that consequence doesn't exist and needs no separate handling.
 *
 * Every data-layer entry point in app/(app)/connections/actions.ts calls
 * assertConnectionsEnabled() before touching the database; the /connections page calls
 * requireConnectionsEnabled() before rendering anything; /u/[id]'s connection controls
 * check isConnectionsEnabled() in their own render condition, the same way its Message
 * link already checks isMessagingEnabled(). __tests__/social/connections-hidden.test.ts
 * asserts all three per call site, not per file, the same discipline
 * messaging-hidden.test.ts already established (a file-level "does the string appear
 * anywhere" check would still pass with one bad call site out of several — confirmed
 * empirically once already, not worth re-risking here).
 *
 * Deliberately NOT prefixed NEXT_PUBLIC_ and deliberately absent from .env.example, for
 * the same reasons as every other feature flag in this codebase: it must never reach the
 * browser bundle, and it is not a setup knob for a new developer to fill in.
 */

export const CONNECTIONS_FLAG_ENV = "ORYN_ENABLE_CONNECTIONS";

/** Exact-match on the string "true" only — same reasoning as every other flag in this
 * codebase: an ambiguous value must resolve to OFF. */
export function isConnectionsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[CONNECTIONS_FLAG_ENV] === "true";
}

export class ConnectionsDisabledError extends Error {
  constructor() {
    super(
      "Oryn's Connections feature is not enabled. This feature is built but switched off; " +
        "see lib/social/connections-feature-flag.ts."
    );
    this.name = "ConnectionsDisabledError";
  }
}

/** For Server Actions — throws rather than returning a falsy result, so a caller that
 * forgot to check gets a loud failure instead of a silently-empty result that could ship
 * unnoticed. Mirrors assertMessagingEnabled exactly. */
export function assertConnectionsEnabled(env: Record<string, string | undefined> = process.env): void {
  if (!isConnectionsEnabled(env)) throw new ConnectionsDisabledError();
}

/** For pages — 404s rather than redirecting, same reasoning as requireAdmin()
 * (lib/security/require-admin.ts) and requireMessagingEnabled(): doesn't reveal that a
 * connections feature exists at all to a student who finds or guesses the URL. */
export function requireConnectionsEnabled(env: Record<string, string | undefined> = process.env): void {
  if (!isConnectionsEnabled(env)) notFound();
}
