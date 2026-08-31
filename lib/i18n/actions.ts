"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { integrationStatus } from "@/lib/env";
import { verifySession } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from "./config";

/**
 * Switches the interface language.
 *
 * Writes to two places, and both are load-bearing:
 *
 * - **The cookie** is what the next request actually reads (lib/i18n/locale.ts). Setting it
 *   is what makes the switch take effect, and its one-year lifetime is what makes the
 *   choice survive the browser being closed — a session cookie would silently revert a
 *   student to English overnight.
 * - **`profiles.preferred_language`** is the durable record, so the choice follows the
 *   student to a new browser or a new device rather than living only where they made it.
 *
 * The cookie is written first and unconditionally. A signed-out visitor on the login screen
 * has no row to write to and must still be able to change language; and if the database
 * write fails, the student should still get the language they just asked for rather than a
 * switch that silently does nothing. The failure is reported back so the caller can say the
 * preference will not follow them to another device — it is not swallowed.
 *
 * `revalidatePath("/", "layout")` rather than a targeted path: the locale is read in the
 * root layout, so every cached segment below it is now stale.
 */
export async function setLocale(next: string): Promise<{ error?: string }> {
  if (!isLocale(next)) {
    // Not user-facing under normal use — the switcher only ever sends a supported code.
    // This guards the action being called directly, since a Server Action is a public
    // HTTP endpoint and `preferred_language` has no CHECK constraint to catch a bad value.
    return { error: "unsupported-locale" };
  }

  const store = await cookies();
  store.set(LOCALE_COOKIE, next, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
    // Must stay off for http://localhost, or the switch appears to do nothing in dev.
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/", "layout");

  if (!integrationStatus.supabase) return {};

  try {
    const session = await verifySession();
    if (!session.userId) return {};

    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ preferred_language: next })
      .eq("id", session.userId);

    if (error) {
      console.error("[i18n] failed to persist preferred_language", { error: error.message });
      return { error: "not-saved-to-account" };
    }
  } catch (error) {
    console.error("[i18n] failed to persist preferred_language", { error });
    return { error: "not-saved-to-account" };
  }

  return {};
}
