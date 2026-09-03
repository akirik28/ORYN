import "server-only";

import { notFound } from "next/navigation";
import { getCurrentProfile, requireUser } from "./dal";
import { isAdminProfile } from "./is-admin";

/**
 * Admin routes 404 rather than redirect for a non-admin — doesn't reveal that an admin
 * panel exists at all to a normal user poking at URLs. That's the right call for the case
 * this function was built to protect, but it used to be the ONLY call: `getCurrentProfile()`
 * quietly returns `null` for a session that never existed or has expired (it checks
 * `session.userId` itself and short-circuits before ever querying `profiles`), and
 * `isAdminProfile(null)` is `false` the same way a real non-admin's profile is — so "the
 * page doesn't exist", "you're not allowed", and "you got signed out" all rendered as one
 * identical 404. Found live 2026-09-03: the founder read seven /kumanda screens fine, hit a
 * 404 on the eighth (an expired session, confirmed from the server log — a login redirect
 * followed right after), and reasonably concluded the panel itself was broken.
 *
 * `app/(app)/admin/` never actually hit this: it sits under `app/(app)/layout.tsx`, which
 * calls `requireProfile()` (redirect-to-login on a missing session OR a missing profile)
 * before this function is ever reached — so the old route was accidentally correct via an
 * outer layout, not because this function handled it. `app/(admin)/layout.tsx` (the
 * /kumanda tree) calls only this function, directly, with no such outer gate — the one
 * route group where the gap was actually reachable.
 *
 * Fixed at the source that both routes share, rather than in the /kumanda layout alone:
 * `requireUser()` first (same redirect every other authenticated page in this app already
 * uses for "no session", so a student, an admin, and now every /kumanda visitor hit an
 * identical login page for an identical reason) — only a call that survives that with a
 * real session goes on to the admin check, which keeps 404-ing exactly the case it was
 * built for and reveals nothing new to a signed-in non-admin.
 */
export async function requireAdmin() {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!isAdminProfile(profile)) {
    notFound();
  }
  return profile;
}
