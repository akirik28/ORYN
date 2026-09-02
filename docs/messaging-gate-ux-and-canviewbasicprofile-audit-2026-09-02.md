# Two follow-ups: what renders with messaging off, and does canViewBasicProfile still describe the real view

## 1. What renders on `/u/[id]` for an accepted connection with messaging disabled

Zero accepted connections exist live (confirmed again today), so this state cannot be
observed with real data — confirmed this genuinely can't be reached even with dev-server
access: the shared server oryn-a7 pointed at serves the canonical checkout with
`ORYN_ENABLE_MESSAGING` unset (today's actual default, not a special disabled-case setup),
requires a real session `/u/[id]` won't give without one, and has the same zero-accepted-
connections database underneath it regardless. Verified from the code path, stated plainly.

Traced the exact JSX (`app/(app)/u/[id]/page.tsx`, the button row):

```tsx
<div className="flex gap-2">
  {isMessagingEnabled() && canShowMessageButton(...) ? (<Button>...Message</Button>) : null}
  <ConnectButton .../>
</div>
```

When the left condition is `false`, React renders nothing for that branch — not an empty
node, not a placeholder, nothing in the DOM at all. Confirmed this isn't just a reading of
how JSX/CSS *should* behave: wrote a scratch render test (React Testing Library, real
`render()`, not asserted from memory) reproducing this exact structure with the condition
forced `false`. Result: the flex container has exactly one child, `gap-2` applies to nothing
(no gap reserved for an absent second element — CSS `gap` only inserts space *between*
existing children), no "Message" text anywhere, `ConnectButton` renders normally showing
"Connected". No orphaned gap, no empty wrapper, no layout break — a clean single-button row,
visually identical in shape to any other conditionally-hidden action in this codebase.
Scratch-only, run and deleted, not part of the committed suite.

Checked the rest of the page for any other messaging-reactive element: grepped every
mention of "message"/"Message" in the file — the button block above is the only one.

**Conclusion: sane. No fix needed for this half.**

## 2. `canViewBasicProfile` — did find a real, if non-live, gap behind the reassuring name

Pulled the live `public_profiles` view definition directly (`pg_get_viewdef`, not the
migration files alone) and compared it clause by clause against what `canViewBasicProfile`
claimed. They did not match — and the reason why is fully on the record in this repo's own
history.

**Migration 0023** (original) had a genuinely status-agnostic, bidirectional carve-out:
`id in (select ... from connections where auth.uid() in (requester_id, recipient_id))` — any
connection row, either direction, any status.

**Migration 0024**, titled `fix_connection_privacy_leak`, replaced it after finding exactly
that shape was a real bug — its own header: *"a single unsolicited connection request —
zero consent from the target — permanently unlocked their basic profile... A declined
request kept the same leak forever."* The fix, confirmed still live today: `accepted` in
either direction, plus `pending` **only when the viewer is the recipient** (so you can see
who's asking before deciding), with a declined row matching neither branch.

**`canViewBasicProfile`'s doc-comment and its own dedicated test file were still describing
migration 0023's pre-fix behavior** — the `hasAnyConnection` field was documented as "True if
ANY connections row exists... in EITHER direction, regardless of status," and the test suite
had a passing test titled *"a merely PENDING connection also unlocks basic fields — the
view's carve-out has no status filter,"* explicitly citing "migration 0023's own comment" as
its source — never updated for 0024. Neither the requester-direction leak nor the declined-
still-leaking case had a test at all, in either direction, before this pass.

**Answering the framing directly: not a live security gap, but not simply redundant either.**
`canViewBasicProfile` has no caller anywhere in `app/` or `features/` — confirmed again
during this pass — so nothing in production was making a wrong decision from this. But its
entire reason to exist is to be an accurate description of the view for a human to trust, and
it was describing the exact bug 0024 fixed as though it were still current behavior, backed
by a test that actively asserted the wrong thing. That's worse than no documentation: a
comment-shaped function that would mislead anyone who read it, in the file's own words, as
"the single highest-consequence privacy surface in this app."

**Fixed rather than removed**, since the underlying purpose (regression signal if the TS
mirror and the SQL view drift) is real and the correction is small and precise:

- Replaced the single `hasAnyConnection: boolean` with two fields that can actually express
  migration 0024's real, direction-aware shape: `hasAcceptedConnection` and
  `hasPendingRequestFromTarget` (deliberately no way to express "pending, viewer is
  requester" at all — that omission is the fix, not an oversight to patch later).
- Rewrote every test against the corrected shape, and added the two cases that were never
  tested in either version: a pending request the *viewer* sent does not unlock the
  target's profile (the exact leak 0024 fixed), and a declined request doesn't either.
- Updated the file's own top comment, which also overstated things in an unrelated way
  ("both real code paths this module is wired into" — only two of the three functions are;
  `canViewBasicProfile` isn't) and a column-whitelist comment that cited migration 0023 for
  the current 9-column list, when migration 0037 is what actually added `headline`/`about`
  to it (checked directly, not assumed from the adjacent comment that already knew this).
- Fixed one adjacent stale cross-reference in `lib/social/mutual-connections.ts` that named
  the old `hasAnyConnection` field by name as a contrast point.

**Mutation-tested the fix directly**: reverted the corrected function to omit the
`hasPendingRequestFromTarget` branch, reran the suite — exactly the one test written for
that branch failed, the other 46 stayed green — restored, confirmed via `git diff` the
restore matches the corrected version exactly.

## What this means for the "four comments found wrong tonight" count

This is a fifth, and it has a shape worth naming distinctly from the others: this one wasn't
a comment outrunning a later code change (the usual shape tonight) — the SQL was fixed
correctly and promptly (migration 0024, same era as 0023), and the *separate*, deliberately
non-authoritative TypeScript mirror of it simply never got the memo, for reasons this repo's
history doesn't record. The 0024 migration itself is a model of what to do right (the bug
found, the fix applied, the reasoning documented in the migration); the gap was entirely in
the downstream, unenforced copy of that reasoning being trusted without a live cross-check
that anyone might have looked at it.
