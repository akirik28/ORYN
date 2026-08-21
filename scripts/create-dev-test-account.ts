#!/usr/bin/env node
/**
 * Creates (or resets) one fixed, known-password test account directly against Supabase
 * Auth via the admin API — `email_confirm: true` bypasses the "Confirm email" setting that
 * has blocked every live-account browser QA pass this whole session (see
 * docs/founder-blocked-backlog.md). Idempotent: safe to run again any time login stops
 * working, whether the account was deleted, the password was changed, or a different
 * environment is being pointed at.
 *
 * Run with: npm run dev:test-account
 *
 * Deliberately does NOT import anything under lib/ marked `"server-only"` (same reasoning
 * as scripts/check-integrations.ts's own comment) — talks to @supabase/supabase-js
 * directly, this is a plain Node/tsx script, not a Next.js request.
 *
 * DEV/QA ONLY. This account exists only in whichever Supabase project SUPABASE_SECRET_KEY
 * in .env.local points at (this repo's scratch/QA project, not a real user's data) — never
 * run this against a production project.
 */

import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local -- fine, maybe using real environment variables already.
}

const TEST_EMAIL = "test@oryn.dev";
const TEST_PASSWORD = "OrynTest2026!";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local -- see API_SETUP.md.");
    process.exit(1);
  }

  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // listUsers has no "filter by email" param -- paginate the (small, scratch-project) user
  // list looking for a match rather than guessing an id.
  let existingId: string | null = null;
  for (let page = 1; page <= 20 && !existingId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    existingId = data.users.find((u) => u.email === TEST_EMAIL)?.id ?? null;
    if (data.users.length < 200) break;
  }

  let userId: string;
  if (existingId) {
    const { data, error } = await admin.auth.admin.updateUserById(existingId, {
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Existing test account found -- password reset to the value below.`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: "Test Student" },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`New test account created.`);
  }

  // The on_auth_user_created trigger (supabase/migrations/0002_profiles.sql) already
  // inserted a minimal profiles row (id + display_name) -- fill in enough real fields that
  // login lands on a working dashboard instead of redirecting straight back into the
  // onboarding wizard, without fabricating activities/scores/opportunities (a separate,
  // bigger "seed realistic demo data" task, not what a login account needs).
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      first_name: "Test",
      last_name: "Student",
      display_name: "Test Student",
      country: "United States",
      school_name: "Lincoln High School",
      graduation_year: new Date().getFullYear() + 2,
      curriculum: "ap",
      onboarding_completed: true,
    })
    .eq("id", userId);
  if (profileError) throw profileError;

  console.log("\nLog in with:");
  console.log(`  Email:    ${TEST_EMAIL}`);
  console.log(`  Password: ${TEST_PASSWORD}`);
  console.log("\nProfile starts with just identity fields set (no activities/scores/saved");
  console.log("opportunities yet) -- add those through the app itself, or ask for a richer");
  console.log("seed as a follow-up.");
}

main().catch((error) => {
  console.error("Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
