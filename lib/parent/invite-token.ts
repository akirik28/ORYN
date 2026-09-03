import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * P4 (docs/veli-hesabi-spec-2026-09-04.md §K3, §6): the token a parent's invite link encodes.
 *
 * This is NOT the security boundary — K3 already names the real one: the link stays `pending`
 * in `parent_links` until the student confirms it, so even a leaked or guessed token cannot
 * move data on its own. What this token has to do is narrower: tie one specific invite to one
 * specific (student, email) pair so a parent can't reuse a token meant for a different address,
 * and carry an issue time so an old, forgotten link can expire (see below) without needing a
 * database row to exist before anyone has acted on the invite at all — at the point this token
 * is generated, there is no `parent_links` row yet (no `parent_user_id` exists until someone
 * accepts), so the token itself is the only record of "this invite was created."
 *
 * Signed with SUPABASE_SECRET_KEY rather than a dedicated new env var — this feature has no
 * live surface yet (sending is off, see invite-email.ts), so adding required configuration for
 * a secret nothing depends on today is exactly the kind of premature setup AGENTS.md's own
 * "don't ask, decide" rule argues against value in speculating over. Reusing an existing
 * server-only secret costs nothing to reverse if a dedicated key is wanted once this ships for
 * real, and HMAC-derived from a real secret is exactly as strong as a fresh one either way.
 */
const TOKEN_PURPOSE = "parent_invite_v1";

/** docs/veli-hesabi-spec-2026-09-04.md's own decision point, answered and reasoned here rather
 * than left implicit — CEO's explicit ask.
 *
 * 14 days. This is the window between "student typed a parent's email" and "that link expires
 * if nobody has acted on it" — it covers a `parent_links` row still `pending` (a parent
 * accepted but the student hasn't confirmed) exactly the same as an invite nobody has touched
 * at all, since both cases share the identical risk this bounds: an old, likely-forgotten
 * credential-shaped link sitting open. Two hard constraints, not one: long enough that a real
 * parent — an adult with no reason to treat this urgently — has a realistic chance to notice an
 * eventual invite email and act on it without the product nagging; short enough that a typo'd
 * address, or an invite the student changed their mind about, doesn't stay claimable
 * indefinitely. 14 days is the same order of magnitude as this codebase's other
 * claim-a-credential windows (Supabase Auth's own default recovery-link expiry) without
 * copying that number blindly — a parent invite is lower-urgency than a password reset (nothing
 * is locked out while it waits) and deserves more slack, not less, hence longer rather than
 * matching it exactly.
 */
export const PARENT_INVITE_WINDOW_DAYS = 14;
const WINDOW_MS = PARENT_INVITE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export interface ParentInvitePayload {
  studentUserId: string;
  invitedEmail: string;
  issuedAt: number;
}

function sign(payloadB64: string): string {
  // env.supabase.secretKey is optional at the type level (lib/env.ts's required() returns
  // undefined rather than throwing on a missing var, so other callers can degrade) but this
  // one can't degrade — an invite token signed with an empty key is a token anyone could
  // forge, not a smaller feature. Same explicit-throw posture as
  // lib/supabase/admin.ts's createAdminClient() for the identical variable.
  if (!env.supabase.secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not configured — parent invite tokens cannot be signed (see API_SETUP.md).");
  }
  return createHmac("sha256", env.supabase.secretKey).update(`${TOKEN_PURPOSE}.${payloadB64}`).digest("base64url");
}

export function createParentInviteToken(studentUserId: string, invitedEmail: string): string {
  const payload: ParentInvitePayload = { studentUserId, invitedEmail: invitedEmail.trim().toLowerCase(), issuedAt: Date.now() };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export type ParentInviteTokenResult =
  | { ok: true; payload: ParentInvitePayload }
  // `expired` carries `payload` too, unlike `malformed`/`bad_signature` — the signature has
  // already been verified by the time expiry is checked below, so the payload is genuinely
  // authenticated, just too old to act on. A caller needs it for exactly this reason: the
  // parent-invite accept page still wants to say *whose* invite this was ("Ask X to create a
  // new one") even when it's expired, not just that something expired.
  | { ok: false; reason: "malformed" | "bad_signature" }
  | { ok: false; reason: "expired"; payload: ParentInvitePayload };

/** Constant-time signature comparison — this token gates account access, so it gets the same
 * timing-attack discipline any credential check needs, not just a `===`. */
export function verifyParentInviteToken(token: string): ParentInviteTokenResult {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };
  const [payloadB64, signature] = parts;

  const expected = sign(payloadB64);
  const expectedBuf = Buffer.from(expected, "base64url");
  const actualBuf = Buffer.from(signature, "base64url");
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: ParentInvitePayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof payload.studentUserId !== "string" || typeof payload.invitedEmail !== "string" || typeof payload.issuedAt !== "number") {
    return { ok: false, reason: "malformed" };
  }

  if (Date.now() - payload.issuedAt > WINDOW_MS) return { ok: false, reason: "expired", payload };

  return { ok: true, payload };
}

/** Same 14-day reasoning applied to an already-created `parent_links` row (a parent accepted,
 * status is `pending`, waiting on the student) — exported so lib/parent/links.ts can apply the
 * identical window without duplicating the constant or re-deriving the cutoff logic. */
export function isPendingLinkExpired(invitedAt: string): boolean {
  return Date.now() - new Date(invitedAt).getTime() > WINDOW_MS;
}
