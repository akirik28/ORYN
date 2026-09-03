import "server-only";

import { createParentInviteToken, PARENT_INVITE_WINDOW_DAYS } from "@/lib/parent/invite-token";
import { buildParentInviteEmail, type ParentInviteEmailContent } from "@/lib/parent/invite-email";
import { env } from "@/lib/env";
import type { Locale } from "@/lib/i18n/config";

/**
 * P4 (docs/veli-hesabi-spec-2026-09-04.md §K6) — generates a parent invite. Never sends one.
 *
 * BUILT, DELIBERATELY NOT ARMED — same posture and the same reason as lib/digest/run.ts (see
 * that file's own header): no email-sending infrastructure exists anywhere in this codebase
 * (docs/email-audit-transactional-vs-commercial-2026-09-03.md), so there is nothing to wire
 * even once §4's legal question is answered. Unlike digest, though, this feature is not
 * fully inert while sending is off — see the callers of this function (app/(auth)/actions.ts's
 * signUp, and the Settings "Parent account" section) for how a student is still meant to use
 * this today: the accept link this returns is real and lives, so a student can copy it and
 * paste it into their own email/message to their parent themselves. §K6's "infrastructure is
 * built, sending stays off" describes the automated path, not the feature — the manual path
 * is genuinely usable right now, and pretending otherwise would fail AGENTS.md's Rule 4 (no
 * feature that quietly does nothing) in the other direction: the student, not just the parent,
 * would be misled about what actually happened when they click the button.
 *
 * Stateless and side-effect-free beyond the deterministic HMAC in createParentInviteToken —
 * this function writes nothing to the database. The token alone carries everything needed to
 * verify the invite later (see invite-token.ts), so there is no "pending invite" row to create
 * before a parent has even seen the link; the first real database write in this whole flow is
 * lib/parent/links.ts's acceptParentInvite, once a parent actually acts on it.
 */
export interface ParentInviteGenerationResult {
  acceptUrl: string;
  email: ParentInviteEmailContent;
  expiresInDays: number;
}

export async function generateParentInvite(params: {
  studentUserId: string;
  studentDisplayName: string;
  invitedEmail: string;
  locale: Locale;
  /** Defaults to env.app.url — a caller with a real request (the Settings resend action) should
   * pass headers().get("origin") instead, matching app/(auth)/actions.ts's own getOrigin()
   * convention, so a preview/staging deploy links back to itself rather than production. */
  origin?: string;
}): Promise<ParentInviteGenerationResult> {
  const token = createParentInviteToken(params.studentUserId, params.invitedEmail);
  const origin = params.origin ?? env.app.url;
  const acceptUrl = `${origin}/parent-invite/${token}`;

  const email = await buildParentInviteEmail({
    locale: params.locale,
    studentDisplayName: params.studentDisplayName,
    acceptUrl,
  });

  return { acceptUrl, email, expiresInDays: PARENT_INVITE_WINDOW_DAYS };
}
