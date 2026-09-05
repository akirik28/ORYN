# Parent-invite chain trace — why parent_links is 0 (2026-09-05)

Report only, per CEO's explicit instruction: "Kod yazma, önce yürü ve raporla." Nothing
fixed or written here. Confirmed `parent_links` row count directly: 0 total, 0 pending,
0 active, 0 revoked.

## The one-line answer

**Not a technical break. The chain is sound end-to-end.** Zero completions in under 24
hours (the feature's own spec, `docs/veli-hesabi-spec-2026-09-04.md`, is dated
yesterday) is the expected result of a 7-step, two-person, zero-automation flow that
just shipped — not evidence something is broken.

## Does email get required anywhere in the chain?

**No — by explicit design.** `lib/parent/invite.ts`'s own header states it plainly:
"BUILT, DELIBERATELY NOT ARMED... no email-sending infrastructure exists anywhere in
this codebase... the accept link this returns is real and lives, so a student can copy
it and paste it into their own email/message to their parent themselves." Generating an
invite writes nothing to the database and sends nothing — it returns a real,
HMAC-signed, working URL that the student is expected to share through whatever channel
they already use (their own email, WhatsApp, in person). The absence of a chosen email
provider does not block this feature at all; it only blocks a future *automated*
version of it.

## The full chain, traced step by step, each one checked against the actual code

1. **Discoverability**: `features/dashboard/parent-email-prompt.tsx`, gated on
   `hasParentInviteEmail` (false until a student sets one) and migration 0117's
   dismissal columns — CEO confirmed 0116-0122 are live. A real, dismissible dashboard
   nudge exists; this isn't buried in Settings with no signal to find it.
2. **Student sets a parent email**: `features/settings/parent-invite-section.tsx` →
   `setParentInviteEmailAction` (`app/(app)/settings/parent-actions.ts`) →
   `setParentInviteEmail` (`lib/parent/links.ts`) — writes `profiles.parent_invite_email`
   only. Correct, simple, no dependency on anything unbuilt.
3. **Link generation**: `features/settings/settings-view.tsx`'s
   `loadGeneratedInvitePreview` calls `generateParentInvite` (`lib/parent/invite.ts`)
   whenever an email is on file and nothing already covers it (no active or
   valid-pending link for that email). Produces an HMAC-signed token
   (`lib/parent/invite-token.ts`, `createParentInviteToken` — signed with
   `SUPABASE_SECRET_KEY`, which this environment definitely has configured, confirmed by
   every other admin-client operation in this codebase depending on it too) and a real
   accept URL. **Writes nothing to the database yet** — there is no `parent_links` row
   until a parent actually acts, by design (the token alone carries the invite's
   identity). This is the key fact for reading the zero: a zero count doesn't
   distinguish "nobody generated a link" from "links were generated and shared but no
   parent has clicked through yet" — both look identical at this table.
4. **Student copies and shares the link manually** — outside the product, unmeasurable
   from here.
5. **Parent visits `/parent-invite/[token]`** — `app/(parent-invite)/parent-invite/
   [token]/page.tsx` verifies the token, looks up the student's display name (admin
   client, read-only, only for personalizing the copy — the signed token is what
   actually authorizes this, not the lookup), and renders `AcceptInviteForm` correctly
   for a valid, unexpired token. Expired/invalid/student-deleted cases all resolve to a
   clear message, not a crash.
6. **Parent submits the form** (name + password) — `accept-invite-form.tsx` correctly
   wires `useActionState` to `app/(parent-invite)/actions.ts`'s `acceptParentInvite`,
   which: re-verifies the token server-side (defense against a stale client-side check),
   creates the parent's own Supabase Auth user (`admin.auth.admin.createUser`, email
   pre-confirmed since nothing here depends on Supabase's own confirmation email
   either), sets `account_role='parent'`, and inserts the actual `parent_links` row
   (status `pending`) via `createParentLink` — idempotent on a repeat click (unique
   violation on `(parent_user_id, student_user_id)` treated as success, not an error).
7. **Student returns to Settings and clicks Confirm** — `confirmParentLinkAction` →
   `confirmParentLink`, which requires `status='pending'` AND the requesting session's
   own `student_user_id` before flipping to `active` — the real K3 double-confirmation
   boundary, enforced here independent of anything upstream.

**No functional break found anywhere in steps 1-7.**

## One real code-quality finding — flagged, not a functional bug

`app/(parent-invite)/actions.ts:101`: `void origin; // reserved: a future
emailRedirectTo-style confirmation link, once §K6 arms sending.` — **`origin` is never
declared anywhere in this file**, no import, no parameter, no local. This read as a
likely crash-on-every-successful-accept at first glance (a `ReferenceError` right after
the account/role/link were already created, which would explain a parent seeing an
error page despite the backend succeeding). **Checked, not assumed**: `npx tsc --noEmit`
reports zero errors for this file, which means `origin` resolves to something — the DOM
lib's global `declare var origin: string` (part of the shared browser/worker globals
TypeScript's `dom` lib config exposes, which is why this compiles cleanly even in a
server-only file). At runtime in a Node.js server action, `globalThis.origin` is simply
`undefined` — accessing it doesn't throw, `void origin` just evaluates to `void
undefined` silently. **Confirmed this is dead, confusing leftover code, not a crash.**
Worth a two-minute cleanup whenever someone's next in this file (the comment's own
intent was clearly a real parameter that got refactored away), but it is not why
`parent_links` is empty.

## Why zero, plainly

The feature is less than a day old. Completing it requires, in order: a student
noticing or acting on a dashboard prompt, entering a real email, saving it, copying a
link, leaving the product to send that link through some other channel entirely, a
parent receiving and clicking it, a parent completing a brand-new account signup form,
and the student coming back a second time to confirm. Seven steps, two people, zero
automation, one day old. Zero completions is the unremarkable outcome, not a signal
something is broken.
