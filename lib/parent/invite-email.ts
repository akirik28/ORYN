import { createTranslator } from "use-intl/core";
import type { Locale } from "@/lib/i18n/config";
import { PARENT_INVITE_WINDOW_DAYS } from "@/lib/parent/invite-token";
import enMessages from "@/messages/en.json";
import trMessages from "@/messages/tr.json";

export interface ParentInviteEmailContent {
  subject: string;
  /** Plain text, not HTML — matches this codebase's posture everywhere else no send
   * infrastructure exists yet (see lib/digest/build.ts): there is no template renderer to
   * target, and a plain-text body is exactly what a student would paste into their own email
   * client themselves (see lib/parent/invite.ts's header for why that is the actual delivery
   * path today). */
  body: string;
}

/**
 * Builds a `next-intl`-compatible translator without going through
 * `next-intl/server`'s `getTranslations`, deliberately.
 *
 * `getTranslations({locale, namespace})` throws "not supported in Client Components" outside
 * a real Next.js request lifecycle, **regardless of the explicit locale argument** — this is
 * a confirmed, previously-diagnosed defect in this exact codebase
 * (docs/weekly-plan-grounding-loss-2026-09-03.md), which found it firing on 100% of calls
 * from a background job with no request context. Today's only caller of
 * buildParentInviteEmail (features/settings/settings-view.tsx, a real page render) has real
 * request scope and would never hit it — but the whole point of that diagnosis was that a
 * function which looks safe stays safe only until something calls it from a job, a route
 * handler, or a test, none of which carry Next.js's request-scoped context. Rather than leave
 * that same landmine for whoever eventually wires a "resend invite" job or route around this
 * function, `use-intl/core`'s `createTranslator` — next-intl's own underlying engine,
 * request-scope-free by construction — is used directly instead, loading the exact same
 * `messages/en.json`/`messages/tr.json` this app's own lib/i18n/request.ts serves through
 * `getRequestConfig`. Same catalog, same ICU interpolation engine, zero duplicated strings,
 * and it happens to make this function trivially unit-testable with no next-intl mock at all
 * (see __tests__/parent/invite-email.test.ts).
 */
function translatorFor(locale: Locale) {
  // Not hoisted into a `Record<Locale, ...>` lookup table: that would widen both catalogs to
  // a shared, less specific type and lose createTranslator's own key-checking (it infers
  // `TargetKey` from the literal shape of `messages`) — a typo'd t("emailSubjectt") would
  // silently type-check instead of failing the build. The ternary keeps each branch's
  // literal JSON type intact.
  const messages = locale === "tr" ? trMessages : enMessages;
  return createTranslator({ locale, messages, namespace: "parentInvite" });
}

/**
 * P4 (docs/veli-hesabi-spec-2026-09-04.md §K1, §K6, G13) — the message a student can send a
 * parent, built from the same i18n catalog as the rest of the product rather than hardcoded
 * inline like ADVISOR_SYSTEM_PROMPT (that one is deliberately English-only because it's a
 * model prompt, not human-facing copy; this is the opposite case).
 *
 * Three things this content is required to say, every time, not just when convenient:
 *   1. What a parent CAN see (G2) — reusing exactly the four items G2 itself lists.
 *   2. What a parent CANNOT see and can NEVER change (K1, G1) — named explicitly rather than
 *      left to be inferred from silence, because a parent who assumes "read-only" means "just
 *      no edit button" would still reasonably expect to see everything else, including the
 *      advisor conversations K1 exists specifically to keep private.
 *   3. The expiry window (PARENT_INVITE_WINDOW_DAYS), so a parent who finds this email two
 *      months late knows why the link no longer works instead of assuming a bug.
 *
 * Pure — no I/O, no secret, no network, no request-scope dependency — so this is trivially
 * unit-testable against both locales without a database or a running server.
 */
export function buildParentInviteEmail(params: {
  locale: Locale;
  studentDisplayName: string;
  acceptUrl: string;
}): ParentInviteEmailContent {
  const t = translatorFor(params.locale);
  const studentName = params.studentDisplayName;

  const subject = t("emailSubject", { studentName });

  const body = [
    t("emailBodyIntro", { studentName }),
    "",
    t("emailBodyWhatYouSee"),
    "",
    t("emailBodyWhatYouCannotSee"),
    "",
    t("emailBodyPremiumNote"),
    "",
    t("emailBodyExpiry", { days: PARENT_INVITE_WINDOW_DAYS }),
    "",
    `${t("emailBodyCta")}: ${params.acceptUrl}`,
  ].join("\n");

  return { subject, body };
}
