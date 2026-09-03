# P6 — shared premium, tier-resolution + the revocation decision

Scope per `docs/veli-hesabi-spec-2026-09-04.md`: "ortak premium + iki taraflı ödeme yüzeyi"
(shared premium + two-sided payment surface), depends on P1 (44's `parent_links`/`account_role`
migration, not landed yet). Two things built tonight that don't depend on P1's exact column
names; one real decision written down that the spec left implicit; one thing spec'd but not
built, because building it against a table that doesn't exist yet would mean either broken
code or a fake authorization check — neither is shippable.

## Built: `lib/tier/parent-tier.ts` + `__tests__/tier/parent-tier.test.ts`

`resolveParentEffectiveTier(linkStatus, studentProfile)` — a parent's tier is a lookup through
an active link to the student's own `resolvePlanTier()` result, never a value stored on the
parent's row (§K4). `pending` and `revoked` both resolve to `"standard"` — not just "revoked
leaks nothing" but "unconfirmed leaks nothing either": a `pending` row exists specifically
because the student hasn't confirmed it (§K3), and a tier leak through it would make that
confirmation step meaningless. 7 tests, all passing: both statuses that inherit nothing (checked
against an Ultra student, not just a standard one, so the gate is proven to fire before the
tier lookup rather than coincidentally agreeing with it), permanent Ultra, an active gift, an
expired gift, and standard.

**Why this reuses `resolvePlanTier` rather than re-deriving tier logic:** that function's own
header already says every Ultra-aware surface should import it rather than copy its fallback —
a parent surface re-implementing "permanent tier wins, then check the gift" would be a second
copy of logic that already has one canonical home, and the exact kind of drift this fleet
found and fixed in `browse.ts` a few hours ago.

**Why one function, not a plural "all my children" version.** `parent_links`' own unique
constraint (§5) is `(parent_user_id, student_user_id)`, not `parent_user_id` alone — the schema
already allows one parent linked to several students, so a parent doesn't have one flat tier.
Effective tier is a property of a *(parent, student) pair*, always — the same way the AI budget
it feeds is scoped per student, never per family (this is also why the parent's own `plan_tier`
must never be written: a second independently-"ultra" row would double a cost ceiling that's
deliberately hard-capped per student in `lib/ai/limits/budget.ts`). A plural convenience
wrapper would just be `links.map(resolveParentEffectiveTier)` at the call site — not worth
inventing a return shape (array? Map? keyed how?) before whoever builds the parent dashboard
(P3) knows what they actually need to iterate.

## Decided: what happens when a link is revoked mid-subscription

Not in the spec — asked for explicitly. The clean answer follows directly from K4 read
strictly: **the subscription record is single and lives on the student, always — it was never
the parent's, regardless of who paid.** So revoking a `parent_links` row does exactly one
thing: the parent's own `resolveParentEffectiveTier` call for that student now returns
`"standard"` (no active link to look through). It does **not** touch the student's `plan_tier`
in either direction — not a downgrade, not a refund, not a re-attribution.

**Money already spent stays spent, and it bought the student's tier, not the parent's access
to it.** A parent who paid and is later revoked doesn't get their contribution "returned" by
downgrading the student — that would mean the student's own subscription (which they may now
be paying for themselves, or a *different* linked parent may be) gets cut off by an unrelated
access change on one relationship. Revocation and billing are two independent axes on purpose:
revoking a link is something either party can do to an *access relationship*; changing
`plan_tier` is a *subscription* action. Coupling them (auto-downgrade on revoke) would be the
one thing K4 explicitly ruled out re-introduced sideways — a link, once revoked, silently
turning back into "two records, one dependent on the other's history."

**One case worth naming rather than leaving to be discovered live:** a parent who revokes their
own access (or is revoked by the student) mid-month sees no billing-side event at all today,
because there is no real billing yet (see below) — the only observable effect is that their
next `resolveParentEffectiveTier` call returns `"standard"`. Once real payment exists, whether
a *parent-initiated* payment should trigger any kind of proration/refund logic on revoke is a
genuine open product question — flagged here rather than answered, since it depends on billing
mechanics that don't exist yet to reason about concretely.

## Spec'd, not built: the DB wrapper and the parent-side interest action

**Why not built:** both need to query `parent_links`, which doesn't exist in `types/database.ts`
or the live database yet. Writing either now means either code that fails `npm run typecheck`
today, or an authorization check with no real table to check against — silently shippable-looking
scaffolding that would be a live security hole the moment any page called it. AGENTS.md's own
rule against "fake buttons that do nothing" extends to fake authorization that doesn't check
anything yet. Spec'd precisely enough to build directly once P1 lands:

```ts
// lib/tier/parent-tier.ts, once parent_links exists:
export async function fetchParentEffectiveTier(
  admin: SupabaseClient<Database>,
  parentUserId: string,
  studentUserId: string
): Promise<PlanTier> {
  const { data: link } = await admin
    .from("parent_links")
    .select("status")
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentUserId)
    .maybeSingle();
  if (!link) return "standard"; // no relationship at all -- same as "not active"
  const { data: student } = await admin
    .from("profiles")
    .select("plan_tier, ultra_gift_expires_at")
    .eq("id", studentUserId)
    .single();
  if (!student) return "standard";
  return resolveParentEffectiveTier(link.status as ParentLinkStatus, student);
}
```

```ts
// app/(parent)/settings/actions.ts (or wherever P2/P3 mount the parent shell), once
// parent_links exists -- mirrors registerUltraInterestAction (app/(app)/settings/actions.ts)
// exactly: same honest "interest, not a checkout" pattern, no fake payment flow. The ONLY
// difference is the authorization check (must be an active link) and the metadata (which
// student this is about), so the same "ultra_interest_registered" event stays one queryable
// taxonomy instead of forking into a second event name.
export async function registerUltraInterestAsParentAction(studentUserId: string): Promise<void> {
  const session = await requireUser();
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("parent_links")
    .select("status")
    .eq("parent_user_id", session.userId!)
    .eq("student_user_id", studentUserId)
    .eq("status", "active")
    .maybeSingle();
  if (!link) throw new Error("no active link to this student"); // not a UI a parent without one ever reaches, but never trust that alone
  await logEvent(session.userId!, "ultra_interest_registered", { registered_by: "parent", student_user_id: studentUserId });
}
```

Both use `createAdminClient()`, deliberately — not a plain RLS-gated client call. §K2 is explicit
that a parent's role must never get `INSERT`/`UPDATE` on a student's rows at the RLS level, and
that's exactly right for direct table access; but this action doesn't write to the student's
row at all (it only logs an analytics event under the *parent's own* user_id), and the
*authorization check itself* — "does this parent_links row exist and say active" — needs to run
regardless of whichever RLS policy P1 ends up writing for `parent_links`, the same way every
other privileged app-level check in this codebase runs against the admin client rather than
leaning on RLS to be the only gate (`lib/opportunities/persist-matches.ts` is the established
pattern for this).

**Once P1 lands**, wiring this in is: add the wrapper above, add the action above, regenerate
`types/database.ts` (or hand-add the table per this codebase's own "hand-authored" convention),
re-run this file's tests to confirm nothing about the pure function needs to change (it
shouldn't — its two arguments were designed not to care what the real column names are), and
mount `registerUltraInterestAsParentAction` from wherever P2/P3's parent shell puts a plan page.
Not mounting a page or route here on purpose: `/parent` itself is P2's scope, the panel shell
P3's — a page built against a route neither has established yet is exactly the collision this
fleet has spent tonight avoiding across seven parallel lanes.

## What this pass did not do

Did not touch `parent_links`, `account_role`, or any migration (P1). Did not build `/parent`
routing or a parent-facing page (P2/P3). Did not touch the invite flow or parent email collection
(P4). Did not touch the weekly AI digest (P5). Did not build upgrade pop-ups or write copy
explaining student features to a parent (P7 — `TIER_COMPARISON_ROWS`/`PlanTierView` already
carry that content if P7 wants to reuse it, unchanged here). Did not modify the student-side
`/settings/plan` page or `registerUltraInterestAction` — G9 needed a parallel parent-side path
to exist, not a change to the existing student one. Did not touch a payment provider, real or
placeholder — there isn't one, and this pass didn't invent one.
