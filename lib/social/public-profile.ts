import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PublicProfileRow } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPortfolio } from "@/lib/portfolio/build";
import { canViewPortfolio } from "@/lib/social/public-profile-authorization";
import type { PortfolioItem } from "@/lib/portfolio/types";

/** The `public_profiles` view already enforces `is_public = true` and the safe column
 * whitelist (migration 0023) — a plain RLS-scoped read, no admin client needed. Returns
 * null for a private or nonexistent profile; callers should treat that as "not found",
 * not surface *why* it's hidden (don't confirm/deny a private profile's existence). */
export async function getPublicProfile(supabase: SupabaseClient<Database>, userId: string): Promise<PublicProfileRow | null> {
  const { data } = await supabase.from("public_profiles").select("*").eq("id", userId).maybeSingle();
  return data;
}

/** Cross-user reads, so the admin client (server-only, bypasses RLS) — the achievement
 * tables have no public-read policy by design. Checks `is_public` itself rather than
 * trusting the caller already confirmed it: `getPublicProfile`'s view also returns a row
 * for an accepted connection or an incoming pending request (migration 0024's carve-outs
 * are deliberately narrower than "public" — see product-decisions.md), and neither
 * carve-out was ever meant to also unlock the full portfolio, only the view's own small
 * column set. `bypassCheck` exists only for a student previewing their own not-yet-public
 * page. */
async function isCurrentlyPublic(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("is_public").eq("id", userId).maybeSingle();
  return data?.is_public === true;
}

export async function getPublicPortfolio(userId: string, opts: { bypassCheck?: boolean } = {}): Promise<PortfolioItem[]> {
  const isSelf = Boolean(opts.bypassCheck);
  // Short-circuit preserved: canViewPortfolio's isSelf branch decides on its own, so
  // there's no reason to spend a query on is_public when previewing your own profile.
  const isPublic = isSelf ? false : await isCurrentlyPublic(userId);
  if (!canViewPortfolio({ isSelf, isPublic })) return [];
  const admin = createAdminClient();
  const items = await buildPortfolio(admin, userId);
  return items.filter((item) => item.category !== "education");
}

export interface PublicSkill {
  name: string;
  category: string;
  proficiency: string | null;
}

export async function getPublicSkills(userId: string, opts: { bypassCheck?: boolean } = {}): Promise<PublicSkill[]> {
  const isSelf = Boolean(opts.bypassCheck);
  const isPublic = isSelf ? false : await isCurrentlyPublic(userId);
  if (!canViewPortfolio({ isSelf, isPublic })) return [];
  const admin = createAdminClient();
  const { data } = await admin.from("skills").select("name, category, proficiency").eq("user_id", userId).order("category");
  return data ?? [];
}
