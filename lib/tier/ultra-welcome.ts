import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PlanTier } from "@/types/database";

/**
 * The one-time "welcome to Ultra" moment (Phase 57 / founder request 2026-09-02,
 * verbatim: "ultra alındıktan sonra 'ultraya hoş geldiniz' yazısı çıkması lazım"). There is
 * no purchase event to hook this to yet — no payments integration exists — so this fires on
 * the same shape `onboarding_completed` already establishes in this codebase: a real column,
 * read and (conditionally) written in the same request, never a job or a client-only flag.
 *
 * `welcomeSeenAt` deliberately is NOT treated the same whether it's `null` or `undefined`,
 * unlike every other absent/unreadable-column fallback in this codebase
 * (resolvePlanTier/resolveResponseMode both collapse the distinction on purpose, since they
 * only ever need "what's the effective value"). This function needs the distinction, because
 * showing the welcome and durably recording that fact are one inseparable guarantee, not two
 * independent ones:
 *
 *   - `null`   — migration 0092 is applied and this student genuinely has never been shown
 *                the welcome. The one case that should show it.
 *   - `undefined` — migration 0092 isn't applied yet (a wildcard `select("*")` silently
 *                omits the column, same mechanism `lib/tier/plan-tier.ts`'s own comment
 *                documents). There is nowhere to durably record "shown" yet, so this
 *                deliberately does NOT show the welcome — the alternative is either firing
 *                on every single load until someone applies the migration (not "exactly
 *                once") or showing it once unrecorded and then possibly again after the
 *                migration lands. Neither is acceptable; staying silent until the write path
 *                exists is the only shape that keeps the "exactly once, ever" guarantee true
 *                in every state this column can be in.
 *   - a real ISO string — already shown. Never show again.
 */
export function shouldShowUltraWelcome(tier: PlanTier, welcomeSeenAt: string | null | undefined): boolean {
  return tier === "ultra" && welcomeSeenAt === null;
}

/**
 * Marks the welcome as shown. Called synchronously, in the same request and right after
 * `shouldShowUltraWelcome` returns true — not from a client-side dismiss handler — so the
 * read that decided to show it and the write that records having shown it can never drift
 * apart onto two different paths. A dismiss button only ever needs to hide the
 * already-rendered banner locally; it has nothing left to write.
 *
 * Best-effort by design: a failed write here must never take down the page that's already
 * decided to show the welcome, and must never retry — same posture as
 * lib/notifications/create.ts's read-side degrade, applied to a write instead. The realistic
 * failure mode is a plain infra hiccup (this call happens well after migration 0092's own
 * absence has already been ruled out by shouldShowUltraWelcome's null check above), so a
 * logged warning, not a thrown error or a swallowed-silent return, is the right ceiling.
 */
export async function markUltraWelcomeSeen(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ ultra_welcome_seen_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    console.warn("[ultra-welcome] failed to mark seen", { userId, error });
  }
}
