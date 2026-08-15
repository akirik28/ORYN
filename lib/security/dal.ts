import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * Data Access Layer. proxy.ts only performs an optimistic cookie-based redirect — this is
 * the authoritative check. Every Server Component, Server Action, and Route Handler that
 * touches user data must call verifySession() (or requireUser()) itself; never rely on a
 * parent layout having already checked (layouts don't re-run on client-side navigation).
 * See node_modules/next/dist/docs/01-app/02-guides/authentication.md.
 */
export const verifySession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { isAuth: Boolean(user), userId: user?.id ?? null, email: user?.email ?? null };
});

/** Redirects to /login if there is no session. Use in pages/layouts that require auth. */
export async function requireUser() {
  const session = await verifySession();
  if (!session.isAuth || !session.userId) {
    redirect("/login");
  }
  return session;
}

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const session = await verifySession();
  if (!session.userId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", session.userId).single();

  if (error) {
    console.error("[dal] failed to load profile", { error: error.message });
    return null;
  }

  return data;
});

export async function requireProfile() {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}
