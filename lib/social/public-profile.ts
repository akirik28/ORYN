import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PublicProfileRow } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPortfolio } from "@/lib/portfolio/build";
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
 * tables have no public-read policy by design (lib/social/public-profile.ts is the one
 * place that's allowed to read someone else's, and only after getPublicProfile above has
 * already confirmed the profile is public). Education is deliberately excluded — GPA/
 * school aren't part of "projects, achievements and skills". Evidence file paths are
 * never part of PortfolioItem's shape in the first place (lib/portfolio/types.ts). */
export async function getPublicPortfolio(userId: string): Promise<PortfolioItem[]> {
  const admin = createAdminClient();
  const items = await buildPortfolio(admin, userId);
  return items.filter((item) => item.category !== "education");
}

export interface PublicSkill {
  name: string;
  category: string;
  proficiency: string | null;
}

export async function getPublicSkills(userId: string): Promise<PublicSkill[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("skills").select("name, category, proficiency").eq("user_id", userId).order("category");
  return data ?? [];
}
