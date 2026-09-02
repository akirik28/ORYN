"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { PlanTier } from "@/types/database";
import { DEV_TIER_PREVIEW_COOKIE, isDevTierPreviewAllowed } from "./dev-preview";

/**
 * Sets or clears the dev-only tier-preview cookie. See lib/tier/dev-preview.ts's own header
 * for what this is and is not — most importantly, it never writes to `profiles.plan_tier` or
 * any other table. `tier: null` clears the override (back to whatever the real data says).
 *
 * Gated the same way as the reader, independently — a caller that reaches this function in
 * a production build (which nothing in this codebase does; the toggle UI itself is only
 * ever rendered when `isDevTierPreviewAllowed()`) still gets refused here rather than
 * trusting the caller to have checked.
 */
export async function setDevTierPreview(tier: PlanTier | null): Promise<{ error?: string }> {
  if (!isDevTierPreviewAllowed()) {
    return { error: "not-available-in-production" };
  }

  const store = await cookies();
  if (tier === null) {
    store.delete(DEV_TIER_PREVIEW_COOKIE);
  } else {
    store.set(DEV_TIER_PREVIEW_COOKIE, tier, {
      path: "/",
      // Session-only, on purpose — this is a look-around tool, not a setting. A developer
      // who wants it back after closing the browser can click the toggle again.
      sameSite: "lax",
      httpOnly: true,
      secure: false,
    });
  }

  // The tier is read once per request in app/(app)/layout.tsx, which every authenticated
  // route sits under — same reasoning as lib/i18n/actions.ts's setLocale.
  revalidatePath("/", "layout");
  return {};
}
