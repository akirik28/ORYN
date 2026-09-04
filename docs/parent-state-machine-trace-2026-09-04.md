# Parent state machine — cross-lane seam trace, 2026-09-04

Code-level only, per instruction — `docs/worktree-dev-server-hazards-2026-09-04.md` (merged
tonight) found that even `127.0.0.1` couldn't be trusted not to load the founder's own
session from a worktree dev server, and concluded there may be no fully safe way to
browser-test tonight at all. Every claim below is read from the actual merged code at
`4a37740d`, not assumed from any lane's own design doc.

**Headline: one real bug, and it's mine.** Every other lane scopes a parent-child
relationship by an explicit `(parent, student)` pair. P2's own routing layer is the one place
in the whole feature that picks a link by guessing instead — and the guess is wrong exactly
in the two-child case CEO named.

## The bug: `getMostRecentParentLink` picks the wrong child

`lib/auth/account-role.ts`'s `getMostRecentParentLink` — the function every P2 routing
decision derives from (`getParentLinkStatus`, `hasActiveParentLink`, `getActiveParentLink`) —
resolves "which link" by:

```ts
.from("parent_links")
.select("*")
.eq("parent_user_id", parentUserId)
.order("updated_at", { ascending: false })
.limit(1)
.maybeSingle();
```

**Most recently touched, regardless of status.** For a parent with exactly one child this is
harmless — there's only one row to pick. For a parent with two:

- Link to child A: `active`, `updated_at` = last month (confirmed once, untouched since)
- Link to child B: `active` then `revoked`, `updated_at` = today

This function returns B. `getParentLinkStatus` reports `"revoked"`. `hasActiveParentLink`
returns `false`. **The dashboard layout (`app/parent/(dashboard)/layout.tsx`) redirects to
`/parent/pending` — for a parent who has real, active access to child A.** Every entry point
into the parent surface goes through this same layout, so this isn't a degraded view of
child A's data; it's a full, silent lockout with a "you're not linked" message, for a parent
who very much is.

The same query backs `getActiveParentLink`, which lane 11's panel page also calls — so even
the panel's own defensive fallback (below) inherits the identical wrong answer; there's no
independent second check that could catch it.

### Confirmed: this is the only place in the feature that guesses

Traced every other consumer of a parent-child relationship in the codebase. Every one of them
takes an explicit `studentUserId` (or resolves through a database function keyed on the exact
pair) rather than picking "the" link for a parent:

- **`lib/tier/parent-tier.ts`'s `fetchParentEffectiveTier(admin, parentUserId, studentUserId)`**
  — queries `parent_links` filtered on both ids together. No ambiguity possible.
- **`lib/parent/child-panel.ts`'s `getParentChildPanelState(studentUserId)`** — queries
  `parent_links` by `student_user_id`, and its own comment notes RLS additionally narrows to
  "at most one row when the caller is a parent" given the schema's
  `unique(parent_user_id, student_user_id)` constraint. Correctly scoped twice over.
- **`supabase/migrations/0116_parent_accounts.sql`'s `is_active_parent_of(p_student)`** — the
  single SECURITY DEFINER predicate every `get_parent_child_*` RPC calls: `where
  parent_user_id = auth.uid() and student_user_id = p_student and status = 'active'`. Exact
  pair, exact status. Every parent-facing data read in the feature ultimately gates through
  this one function.
- **`lib/tier/parent-interest-action.ts`'s `registerUltraInterestAsParentAction(studentUserId)`**
  — same pattern, `.eq("student_user_id", studentUserId)`.
- **`lib/digest/parent-commentary.ts`** — parameterized by `studentUserId` alone throughout;
  its own header comment already anticipates the multi-child batch runner that doesn't exist
  yet and specifies it "MUST filter to `status = 'active'` only" when built — the right
  instinct, just not yet exercised by anything live.

**This is why the bug is an availability defect, not a security one.** Even in the exact
scenario above, nothing downstream of P2's routing trusts P2's routing. If some other code
path ever did feed the wrong `studentUserId` through to `get_parent_child_profile` or its
siblings, `is_active_parent_of` would independently re-check the real pair and return
nothing. Confirmed by reading the migration directly, not inferred from the RLS design
intent: the check is `and status = 'active'` on the literal `(parent_user_id, student_user_id)`
pair, computed fresh, not reused from whatever the caller believed. A parent can be
**wrongly denied** by this bug. They cannot be **wrongly granted** anything by it.

### Not a one-liner, not fixed here

Restructuring `getMostRecentParentLink` to prefer an active link (query `status = 'active'`
first, fall back to most-recent-any-status only if none) is small but touches three call
sites' shared assumption, not one line. Left for the founder/whoever picks it up, per
instruction — flagged clearly enough to fix in a few minutes once someone's looking at it.

## Second finding: two independently-built "not linked" screens, one of them unreachable

`features/parent/parent-pending-screen.tsx`'s `ParentPendingScreen` is a real, more complete
component than what P2 shipped: three distinct states (`pending` / `revoked` / `no_link`,
each with its own icon and copy), styled through the brown `--role-*` theme tokens, bilingual
via hardcoded arrays. Its own header comment says plainly: *"Routing (which state reaches
this screen, and where it's mounted) is P2's; this is the copy."* **It was built expecting
P2 to call it.**

P2's actual `/parent/pending/page.tsx` (mine, pushed before this component existed) doesn't
import it — it hand-rolls its own JSX against next-intl's `parent.pending.*` catalog keys,
with only two message variants (`bodyNoInvite` / `bodyAwaitingConfirmation`; `revoked` reuses
the no-invite copy, a simplification my own code comment already flagged as deferred). Nobody
introduced a contradiction on purpose — P3's component landed after P2 pushed, and nothing
has reconciled them since.

**Where `ParentPendingScreen` is actually used**: only inline, inside
`app/parent/(dashboard)/page.tsx`'s own defensive fallback (`if (!link) return
<ParentPendingScreen state="no_link" .../>`), which that file's own comment correctly
identifies as "should be unreachable in normal operation — the layout redirects to
/parent/pending for exactly this case." **True in the non-buggy case** (my layout's redirect
fires before the page ever renders, so its own inline check never executes) — but the bug
above means the layout's redirect fires *incorrectly* for the two-child case, so the parent
never reaches this nicer fallback either way; they land on my simpler `/parent/pending` page
instead, which also can't distinguish their real situation ("you have another active link,
just not to this specific most-recently-touched relationship" isn't a state either page's
copy describes).

Net: even after the routing bug is fixed, someone should point `/parent/pending/page.tsx` at
`ParentPendingScreen` directly rather than maintaining two copies of the same three states —
a small, mechanical reconciliation, not reported as urgent on its own.

## CEO's specific questions, answered directly

**Does a `pending` parent land on your screen or the panel's own empty state?** Yours,
correctly, for a single-child parent — the layout's redirect always fires before the page
renders. For a multi-child parent whose *active* link isn't the most-recently-touched one,
neither — they're misrouted to yours with the wrong message, per the bug above.

**Does a revoke mid-session route the parent out, or leave them rendering?** Neither
gracefully — this codebase has no realtime/polling mechanism on this surface, so a parent
with an already-rendered page keeps seeing exactly what was server-rendered before the
revoke, until their next navigation or reload. Not a bug specific to this feature — it's the
inherent shape of a server-rendered app with no subscription layer — but worth stating
plainly: **RLS and `is_active_parent_of` stop the *next* read. Neither retroactively redacts
HTML already sent to a browser that has the tab open.** On the parent's next real request
(new page load, not client-side nav within a cached tree), the gate re-runs and correctly
routes them out — assuming the multi-child bug above doesn't misfire for an unrelated reason.

**What does 05's address-change revoke look like from the parent's side?**
`lib/parent/links.ts`'s `revokeStalePendingLinks` only ever revokes links with `status =
'pending'` whose `invited_email` no longer matches what the student just saved — confirmed by
reading the function directly, and its own comment is explicit that `active` links are never
touched by this path on purpose ("Ending that is what the explicit 'Remove access' button...
is for; it must not happen as a side effect of editing an unrelated field"). Correctly scoped.
The one rough edge: if this *does* fire, the parent's next sign-in shows
`ParentPendingScreen`'s `revoked` copy — *"The student has removed this parent link"* — which
reads as a deliberate act. For the address-change case it wasn't one; the student changed an
email field and a stale, unconfirmed invite was cleaned up as a consequence. Minor
copy-accuracy point, not a functional defect, and moot for `/parent/pending/page.tsx` today
regardless, since that page collapses `revoked` into the same copy as `no_link`.

**The two-children, one-active-one-revoked case — does everything agree on which child?**
No — this is the headline finding above. Every lane except P2's own routing agrees, by
construction (explicit pair-scoping, confirmed independently in tier, panel data, RLS, and the
interest-action write path). P2's routing is the one place that doesn't ask "which child" and
instead guesses.

## What held up

Worth stating plainly rather than only reporting problems: the RLS/SECURITY-DEFINER layer
(44's `is_active_parent_of`, called by every `get_parent_child_*` function) is real defense
in depth, not a documentation claim — read the migration directly, confirmed it re-derives
the exact pair from `auth.uid()` and the target student id on every call, never trusting
anything a caller believed. That's the reason this trace's worst finding is an availability
bug and not a data-exposure one. P4's revoke-scoping (pending-only on address change) is
correctly narrow. P5/P6/P7's tier, commentary, and interest-action code are all built against
an explicit-student-id contract that would have made the multi-child bug impossible if P2 had
followed the same pattern its neighbors independently converged on.
