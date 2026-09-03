# Parent invite flow — design (P4, 2026-09-04)

Lane P4 of `docs/veli-hesabi-spec-2026-09-04.md`: collecting an optional parent email at
signup, generating (not sending) an invitation, and the two-sided confirm flow §K3 requires.
This doc records the decisions CEO asked to see reasoned in writing, plus the shape of what
was actually built, for whoever reviews or extends this next.

Branch: `oryn/p4-parent-invite-flow-2026-09-04`. Depends on P1's migration 0116
(`profiles.account_role`, `profiles.parent_invite_email`, `parent_links`) — staged, not yet
applied. Every read/write path here degrades safely until it lands (see
`lib/parent/links.ts`'s own header for the exact mechanism).

---

## 1. The two decisions CEO asked for, with reasoning

### 1.1 The expiry window — 14 days

Applies identically to an invite token nobody has acted on yet, and to a `parent_links` row
still `pending` (a parent accepted, the student hasn't confirmed) — both share the same real
risk: an old, likely-forgotten credential-shaped link sitting open indefinitely.

Two constraints, not one:
- **Long enough** that a real parent — an adult with no reason to treat this urgently — has a
  realistic chance to notice the link (however it reached them) and act on it without the
  product nagging them.
- **Short enough** that a mistyped address, or an invite the student changed their mind about,
  doesn't stay claimable indefinitely.

14 days is the same order of magnitude as this codebase's other claim-a-credential windows
(Supabase Auth's own default recovery-link expiry) without copying that number blindly — a
parent invite is lower-urgency than a password reset (nothing is locked out while it waits),
which argues for more slack, not less, hence longer rather than matching it exactly.

Implementation: `lib/parent/invite-token.ts`'s `PARENT_INVITE_WINDOW_DAYS`. A token's
`issuedAt` is checked against this window in `verifyParentInviteToken`; an already-created
`parent_links` row's `invited_at` is checked the same way via `isPendingLinkExpired`. Both
paths share one constant — there is exactly one place this number lives.

**Deliberately not a fourth `status` value.** §5's contract is `'pending' | 'active' |
'revoked'`, agreed across every lane touching this schema. "Expired" is computed at read
time instead of stored, so this codebase's own write path never needs to unilaterally widen a
contract other lanes are already building against.

### 1.2 What happens when the student changes the address after an invite is out

CEO's framing: *"the old invitation is a live door to an address that may be wrong."*

**Decision: revoke every still-`pending` link whose `invited_email` no longer matches the
address the student just saved. Never touch an `active` link.**

Reasoning:
- An unconfirmed (`pending`) invitation to an address the student has since replaced is
  exactly the live door CEO named. §K3 exists to protect against a *wrong* address, not just
  a wrong click, and `unique(parent_user_id, student_user_id)` constrains the *pair*, not the
  email — nothing in the schema itself stops two simultaneous invitations to two different
  addresses for the same student without this.
- An `active` link is a different thing entirely: a real, already-approved relationship where
  the student already completed §K3's confirmation on purpose. Ending that is what the
  explicit "Remove access" button is for (`revokeParentLink`, same function, different
  caller) — it must never happen as a side effect of editing an unrelated field. A student
  correcting a typo in "who I'd invite next" should not silently lose a parent they already
  approved.
- Scoped to `invited_email != savedEmail`, not "every pending link" — re-saving the same
  address, or regenerating a link after the old one simply expired, must not revoke a
  still-good invitation just because the student touched the form.
- Clearing the field (`null`) revokes every pending link unconditionally — "I don't want to
  invite anyone right now" reasonably includes not leaving a dangling pending invite behind.

Implementation: `lib/parent/links.ts`'s `revokeStalePendingLinks`, called from the tail of
`setParentInviteEmail` on every successful column write. Best-effort — logged, never thrown;
the email save itself must not fail because a secondary cleanup query did.

**A related question this raises, resolved by the actual design rather than left open:**
does an invite token nobody has ever acted on (no `parent_links` row exists yet at all) also
need this cleanup? No — because the accept link is never persisted or sent anywhere by this
codebase. It's recomputed fresh, from the current `parent_invite_email`, every time
`features/settings/settings-view.tsx` renders (see §3 below). There is no stale, forgotten,
still-live *unaccepted* link sitting in a database row to clean up — only ones the student
already pasted somewhere themselves, which age out on the token's own 14-day clock
regardless, exactly as designed.

---

## 2. Token mechanism

Custom HMAC-SHA256, signed with the existing `SUPABASE_SECRET_KEY` (no new required env var —
this feature has no live send surface yet, so adding configuration nothing depends on today
would be premature). Not Supabase's own `generateLink`/`inviteUserByEmail`: both would create
a real `auth.users` row before anyone has acted on the invite, which is wrong here — nobody
should exist as a "parent" until they actually submit the accept form.

**This token is not the security boundary.** §K3 already names the real one: a `parent_links`
row stays `pending` until the student confirms, so even a leaked or guessed token cannot move
any student data on its own — it can only get as far as creating a `pending`, invisible link.
What the token has to do is narrower: tie one invite to one `(studentUserId, invitedEmail)`
pair, and carry an issue time so it can expire. See `lib/parent/invite-token.ts` for the full
implementation and its own extensive header comments.

`verifyParentInviteToken` returns the payload even on an `expired` result (not just `ok:
true`) — the signature has already been authenticated by the time expiry is checked, so it's
a genuine, trustworthy payload, just too old to act on. The accept-invite page uses this to
say *whose* invite expired ("Ask Ada to create a new one"), not just that something did.

---

## 3. Generate, don't send (§K6)

Same posture as the already-built, deliberately-unarmed student weekly digest
(`lib/digest/run.ts`): infrastructure exists, sending stays off pending the founder's father's
legal answer on minor-data access. No email-sending call exists anywhere in this codebase
(`docs/email-audit-transactional-vs-commercial-2026-09-03.md`), and this feature adds none.

Unlike digest, though, this feature is not fully inert while sending is off. The generated
accept link and message content are real and live — a student can copy them and send them to
their parent themselves, through whatever channel they already use. Pretending the feature
does nothing until sending is wired would itself be a "fake button that does nothing"
(AGENTS.md Rule 4), just aimed at the wrong person — the student, not the parent, would be the
one misled about what actually happened.

Concretely: `features/settings/settings-view.tsx` computes a fresh invite (token + email
content) on every render, whenever `profiles.parent_invite_email` is set and nothing
currently `active` or validly-`pending` already covers it (see
`loadGeneratedInvitePreview`). `features/settings/parent-invite-section.tsx` shows the link
with a copy button and an explicit notice that Proxola doesn't send this automatically yet.

CEO also confirmed six live addresses on proxola.com (`hello@`, `destek@`, `bilgi@`, three
more) forwarding to one inbox, for whenever sending is wired — not used anywhere in this
build; noted here only so whoever arms sending later knows the inboxes already exist.

---

## 4. What's built vs. deferred

**Built, this lane:**
- `SignUpSchema.parentEmail` (optional) and the signup form field.
- `profiles.parent_invite_email` write on signup (admin client — no session exists yet on
  Supabase's email-confirmation-required path) and from Settings (regular client).
- `lib/parent/invite-token.ts` — token create/verify/expiry, unit-tested
  (`__tests__/parent/invite-token.test.ts`, 12 cases: round-trip, tamper detection, expiry
  boundary on both sides, malformed input).
- `lib/parent/invite-email.ts` — bilingual content generator, unit-tested
  (`__tests__/parent/invite-email.test.ts`): asserts both languages name the student, state
  the expiry window, name what stays private (advisor conversations, inability to change
  anything), and mention Premium's weekly summary. Uses `use-intl/core`'s `createTranslator`
  directly rather than `next-intl/server`'s `getTranslations` — see that file's own header
  comment for why: `getTranslations` throws outside real Next.js request scope regardless of
  an explicit locale argument, a confirmed defect in this exact codebase
  (`docs/weekly-plan-grounding-loss-2026-09-03.md`, found live in a background job). Today's
  only caller has real request scope and would never hit it, but the fix costs nothing and
  removes the same landmine for whoever calls this from a job or route handler later.
- `lib/parent/links.ts` — the data layer: `setAccountRole`, `setParentInviteEmail` (+
  `revokeStalePendingLinks`), `createParentLink`, `getParentLinksForStudent`,
  `confirmParentLink`, `revokeParentLink`. Every path degrades safely if migration 0116 hasn't
  landed yet in the environment it runs in.
- `types/database.ts` — hand-added `AccountRole`, `ParentLinkStatus`, `ParentLink`,
  `ParentLinkInsert`, and the two new `Profile` columns, matching migration 0116's confirmed
  shape exactly (including `created_at`/`updated_at` on `parent_links`) — same "write the
  type ahead of the applied migration" precedent this file already used for
  `admin_finance_settings`/`page_views`.
- `features/settings/parent-invite-section.tsx` + `app/(app)/settings/parent-actions.ts` —
  the student's own view: nothing yet / a copyable link / pending-confirmation (with
  Confirm/Decline) / active (with Remove access). Own file rather than added to the existing
  `app/(app)/settings/actions.ts`, deliberately — several other lanes (P1-P7) touch
  Settings-adjacent surfaces the same night; a separate file is a smaller collision surface.
- `app/(parent-invite)/` — a new, minimal route group (own layout, reusing `(auth)`'s exact
  visual chrome rather than its code) for the parent's unauthenticated landing page
  (`/parent-invite/[token]`) and its Server Action (`acceptParentInvite`, in
  `app/(parent-invite)/actions.ts`). Deliberately NOT nested under `/parent` — P2 owns that
  route group for the general parent login/dashboard experience; this only needs to exist
  long enough to create a `pending` link and show a static "waiting on your child" message,
  with no dependency on whatever P2 builds.

**Deferred, by design, to other lanes or later work:**
- Any authenticated parent-side page beyond the static post-signup message (P2/P3's territory
  — parent login, `/parent` route group, dashboard).
- RLS policies enforcing read-only access (P1's territory, per §K2 — this codebase's own
  write paths already never grant anything based on a `pending` status, but the database-level
  enforcement is P1's, not duplicated here).
- Wiring real email delivery (§K6 — blocked on the founder's father's legal answer).
- A parent who already has an account linking a second child, or accepting a second invite
  from a different student — `createParentLink`'s unique-violation handling treats a
  duplicate `(parent_user_id, student_user_id)` pair as an idempotent success, but the accept
  form itself always creates a brand-new `auth.users` row; a "sign in instead" path wasn't
  built. Reasonable first-version scope cut, not an oversight.

---

## 5. Known gaps, stated plainly

- **`revokeStalePendingLinks` has no direct unit test.** It needs a chained Supabase query
  builder mock this codebase has no existing shared harness for, and building one felt like
  more new surface than one function's test coverage justified tonight, against a hard
  13:00 deadline. The logic is exercised by `lib/parent/links.ts`'s own extensive header
  comment and reasoning above, and by the full-suite typecheck, but not by a running test.
  Worth adding once a real Supabase-mock pattern exists in this codebase for something else
  to piggyback on.
- **No live browser verification tonight.** This session's standing rule is not to use browser
  tools outside `127.0.0.1` + `/design-preview/*` — the shared pane carries the founder's real,
  persisted login, and `/signup`, `/settings`, and `/parent-invite/[token]` are none of them
  under that path. Everything here passed `tsc --noEmit`, `eslint .`, and the full test suite,
  but the actual rendered UI (the new signup field, the Settings section's four visual states,
  the accept-invite page) has not been visually confirmed in a real browser. This should
  happen before calling the feature done.
