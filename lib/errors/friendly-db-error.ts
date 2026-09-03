import type { Locale } from "@/lib/i18n/config";

/**
 * Never surface a raw Postgres error message to the client (Phase 45: errors must be
 * human-readable; a raw message can also leak schema internals — e.g. the exact column a
 * migration hasn't added to the live database yet). Pure mapping only, so the contract
 * ("the user never sees `error.message` verbatim") is unit-testable; callers log the real
 * error server-side themselves before showing this.
 *
 * `locale` is a required parameter, not resolved internally, same reasoning as
 * lib/errors/rate-limit-exceeded.ts's own header comment: keeps this pure and
 * synchronous (no `server-only`, no await) so every one of its six existing call sites
 * across profile/languages/skills/requirement/confirm-age/onboarding actions stays a
 * one-line change (thread the locale the caller already has, or already resolves) rather
 * than needing to become async. Found hardcoded English during 2026-09-03's student-facing
 * i18n audit — this was the single highest-leverage fix in that audit, since one change
 * here corrects every call site at once instead of needing six separate ones.
 */
export type CrudAction = "save" | "delete";

export function toFriendlyDbErrorMessage(action: CrudAction, locale: Locale): string {
  const tr = locale === "tr";
  if (action === "save") return tr ? "Kaydedilemedi. Lütfen tekrar dene." : "Couldn't save this. Please try again.";
  return tr ? "Silinemedi. Lütfen tekrar dene." : "Couldn't delete this. Please try again.";
}
