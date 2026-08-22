#!/usr/bin/env node
/**
 * PROVENANCE: written by the BUG-1 lane during its 2026-08-22 RLS verification package —
 * the one that found the anonymous-read hole in `public_profiles` (founder-backlog item 30).
 * That session ended before committing it; the file existed only in an untracked worktree on
 * one machine, and ORYN-CFO found it during a handoff-compliance audit. Rescued verbatim by
 * ORYN-CEO — not reviewed line by line, not adapted, not run by me. Two things to fix before
 * reuse: it hardcodes absolute paths to `.env.local`/`.env.qa-accounts.local`, and it hardcodes
 * the two QA accounts' user ids.
 *
 * It creates real rows (a `connections` row between the two QA accounts, and it flips account
 * A's `is_public`) and cleans them up in an explicit separate step. Read the usage block below
 * before running any step, and run the cleanup step.
 *
 * ONE CHANGE from the rescued original, disclosed rather than silent: `report`'s parameter type
 * was `Promise<...>` and is now `PromiseLike<...>`. Supabase's query builder is thenable but not
 * a real Promise, so the original failed `tsc` in three places once the file entered the
 * typechecked tree — it never had before, being untracked. Behaviour is identical; awaiting a
 * thenable resolves the same way. Nothing else was touched.
 */
/**
 * RLS verification, Surface 1: /u/[id] public-profile exposure.
 * Read-only against the live oryn-qa-scratch project — real GoTrue sign-in, real
 * PostgREST, real RLS. Never writes anything outside the `connections` row this script
 * itself creates and reports (cleanup is a separate explicit step, not automatic, so a
 * failed run doesn't silently leave orphaned state).
 *
 * Usage: tsx rls-verify-surface1-u-id.ts <step>
 *   step=baseline   — query as A and B before any connection exists
 *   step=create-pending-a-to-b   — A sends B a connection request, then re-query
 *   step=accept     — B accepts, then re-query
 *   step=cleanup     — delete the connection this script created
 *
 * Run steps in order, reading each result before moving to the next — this script
 * intentionally does not chain them automatically.
 */
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile("/Users/adasarpkirik/Desktop/Founder/ORYN/.env.local");
process.loadEnvFile("/Users/adasarpkirik/Desktop/Founder/ORYN/.env.qa-accounts.local");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const A_EMAIL = process.env.QA_ACCOUNT_A_EMAIL!;
const A_PASSWORD = process.env.QA_ACCOUNT_A_PASSWORD!;
const B_EMAIL = process.env.QA_ACCOUNT_B_EMAIL!;
const B_PASSWORD = process.env.QA_ACCOUNT_B_PASSWORD!;

const A_ID = "46dd6f7e-ab57-411f-8ff7-64ce2cf16a07";
const B_ID = "e9eba798-195d-4859-960c-4b8968df7819";

async function signedInClient(email: string, password: string) {
  const client = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return { client, userId: data.user!.id };
}

async function anonClient() {
  return createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function report(label: string, fn: () => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>) {
  const { data, error } = await fn();
  console.log(`\n--- ${label} ---`);
  if (error) {
    console.log(`  ERROR: code=${error.code ?? "?"} message=${error.message}`);
  } else {
    console.log(`  DATA: ${JSON.stringify(data)}`);
  }
}

async function queryAsIdentity(label: string, client: Awaited<ReturnType<typeof anonClient>>, targetId: string) {
  await report(`${label}: public_profiles view for target ${targetId}`, () => client.from("public_profiles").select("*").eq("id", targetId).maybeSingle());
  await report(`${label}: direct profiles table for target ${targetId}`, () => client.from("profiles").select("*").eq("id", targetId).maybeSingle());
}

async function main() {
  const step = process.argv[2];
  if (!step) {
    console.error("Usage: tsx rls-verify-surface1-u-id.ts <baseline|create-pending-a-to-b|accept|cleanup>");
    process.exit(1);
  }

  if (step === "baseline") {
    console.log("=== BASELINE: no connection exists, both profiles private (is_public=false) ===");
    const anon = await anonClient();
    console.log("\n[ANON / unauthenticated client, no session]");
    await queryAsIdentity("anon->A", anon, A_ID);
    await queryAsIdentity("anon->B", anon, B_ID);

    const a = await signedInClient(A_EMAIL, A_PASSWORD);
    console.log(`\n[A signed in, auth.uid()=${a.userId}]`);
    await queryAsIdentity("A->B(unrelated,private)", a.client, B_ID);
    await queryAsIdentity("A->self", a.client, A_ID);
    await report("A: full connections table read", () => a.client.from("connections").select("*"));

    const b = await signedInClient(B_EMAIL, B_PASSWORD);
    console.log(`\n[B signed in, auth.uid()=${b.userId}]`);
    await queryAsIdentity("B->A(unrelated,private)", b.client, A_ID);
    await report("B: full connections table read", () => b.client.from("connections").select("*"));
  }

  if (step === "create-pending-a-to-b") {
    const a = await signedInClient(A_EMAIL, A_PASSWORD);
    const { data, error } = await a.client.from("connections").insert({ requester_id: A_ID, recipient_id: B_ID, status: "pending" }).select().single();
    if (error) throw new Error(`insert failed: ${error.message}`);
    console.log(`Created connection row: ${JSON.stringify(data)}`);
    console.log(`\n=== STATE: A(requester)->B(recipient), status=pending ===`);

    console.log(`\n[A signed in — A is the REQUESTER — this is the exact direction migration 0024 closed]`);
    await queryAsIdentity("A(requester)->B(recipient,private,pending)", a.client, B_ID);

    const b = await signedInClient(B_EMAIL, B_PASSWORD);
    console.log(`\n[B signed in — B is the RECIPIENT — should see A per the 'who is asking' carve-out]`);
    await queryAsIdentity("B(recipient)->A(requester,private,pending)", b.client, A_ID);
    await report("B: full connections table read", () => b.client.from("connections").select("*"));
    await report("A: full connections table read", () => a.client.from("connections").select("*"));
  }

  if (step === "accept") {
    const b = await signedInClient(B_EMAIL, B_PASSWORD);
    const { data, error } = await b.client.from("connections").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("requester_id", A_ID).eq("recipient_id", B_ID).select().single();
    if (error) throw new Error(`update failed: ${error.message}`);
    console.log(`Updated connection row: ${JSON.stringify(data)}`);
    console.log(`\n=== STATE: A<->B, status=accepted ===`);

    const a = await signedInClient(A_EMAIL, A_PASSWORD);
    console.log(`\n[A signed in — A is the requester, now accepted — should see B]`);
    await queryAsIdentity("A->B(accepted,private)", a.client, B_ID);
    console.log(`\n[B signed in — should see A]`);
    await queryAsIdentity("B->A(accepted,private)", b.client, A_ID);
  }

  if (step === "decline-and-reverify") {
    // Requires the row to be back in `pending` first — this script only ever creates one
    // row (A requester -> B recipient), so this step first resets it there via an A-side
    // delete + a fresh insert (mirroring what "withdraw and re-request" looks like in the
    // app), then B declines, then re-verifies both directions are invisible again.
    const a = await signedInClient(A_EMAIL, A_PASSWORD);
    const del = await a.client.from("connections").delete().eq("requester_id", A_ID).eq("recipient_id", B_ID);
    console.log(`Deleted prior row (if any): error=${del.error?.message ?? "none"}`);
    const ins = await a.client.from("connections").insert({ requester_id: A_ID, recipient_id: B_ID, status: "pending" }).select().single();
    if (ins.error) throw new Error(`re-insert failed: ${ins.error.message}`);
    console.log(`Re-created pending row: ${JSON.stringify(ins.data)}`);

    const b = await signedInClient(B_EMAIL, B_PASSWORD);
    const decl = await b.client.from("connections").update({ status: "declined", responded_at: new Date().toISOString() }).eq("requester_id", A_ID).eq("recipient_id", B_ID).select().single();
    if (decl.error) throw new Error(`decline failed: ${decl.error.message}`);
    console.log(`Declined: ${JSON.stringify(decl.data)}`);
    console.log(`\n=== STATE: A->B, status=declined (row still exists) ===`);

    console.log(`\n[A signed in — requester, declined — should NOT see B (never could, this direction)]`);
    await queryAsIdentity("A->B(declined,private)", a.client, B_ID);
    console.log(`\n[B signed in — recipient, declined — should NOT see A anymore (this is the 'declined kept leak forever' bug migration 0024 fixed)]`);
    await queryAsIdentity("B->A(declined,private)", b.client, A_ID);
  }

  if (step === "cleanup") {
    const a = await signedInClient(A_EMAIL, A_PASSWORD);
    const { error, count } = await a.client.from("connections").delete({ count: "exact" }).eq("requester_id", A_ID).eq("recipient_id", B_ID);
    console.log(`Cleanup delete: error=${error?.message ?? "none"}, count=${count}`);
    const check = await a.client.from("connections").select("*", { count: "exact", head: true });
    console.log(`Post-cleanup connections table count (as A, RLS-scoped): ${check.count}`);
  }
}

main().catch((err) => {
  console.error("SCRIPT ERROR:", err);
  process.exit(1);
});

async function isPublicCheck(direction: "set-a-public" | "restore-a-private") {
  const a = await signedInClient(A_EMAIL, A_PASSWORD);
  const target = direction === "set-a-public";
  const { data, error } = await a.client.from("profiles").update({ is_public: target }).eq("id", A_ID).select("id,is_public").single();
  if (error) throw new Error(`update failed: ${error.message}`);
  console.log(`Set A.is_public=${target}: ${JSON.stringify(data)}`);

  if (direction === "set-a-public") {
    const b = await signedInClient(B_EMAIL, B_PASSWORD);
    console.log(`\n[B signed in — no connection exists (declined), A now PUBLIC — should see A via is_public clause alone]`);
    await queryAsIdentity("B->A(no-connection,now-public)", b.client, A_ID);
    const anon = await anonClient();
    console.log(`\n[ANON — A is public — but view is granted to 'authenticated' only, not 'anon']`);
    await queryAsIdentity("anon->A(now-public)", anon, A_ID);
  }
}

if (process.argv[2] === "set-a-public") isPublicCheck("set-a-public");
if (process.argv[2] === "restore-a-private") isPublicCheck("restore-a-private");
