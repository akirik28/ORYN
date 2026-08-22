# Handoff: FEAT-1 Package 5 — achievement delete surfaces real errors

STATUS: **Code complete, full gate green on fresh-rebased numbers, PR open.** Branch
`oryn/feat1-achievement-save`, rebased twice onto `origin/main` as it moved during this
package (`16f4f73` → `3bd2d43`) — both rebases clean, no conflicts (the fix doesn't touch
`persist-matches.ts`, which BUG-1's migration 0063 changed). Gate: lint clean, typecheck
clean, **140 files / 2101 tests**, `npm run build` succeeds — all re-run fresh after the
rebase, not carried over from before tonight's disk incident.

## The defect

`docs/feat2-error-surfacing-audit-2026-08-22.md` finding #2:
`features/profile/achievement-section.tsx`'s `handleDelete` discarded `onDelete`'s result
entirely (`await onDelete(id); setDeletingId(null);`) — a student who clicked delete and
hit an RLS denial or a transient DB error saw nothing happen and no reason why. Honest, not
wrong (`crudRemove` only calls `afterWrite`/revalidates on success, so a failed delete
correctly left the item in the list — confirmed by reading `app/(app)/profile/actions.ts`
directly, not assumed) but silent — Phase 45's "errors should be human-readable" violated
at the point of loudest failure, a delete the student explicitly asked for. Backs delete for
every achievement type sharing this component: Activities, Projects, Awards, Research,
Volunteering, Work, Education, Test Scores, Certifications, Sports, and Goals — one fix
covers all of them.

## Fix

`if (result.error) toast.error(result.error)`, added to `handleDelete` — the same simple
pattern `requirement-checklist.tsx` already uses, per the audit's own recommendation (no
optimistic state exists on this path to roll back, so `status-control.tsx`'s
rollback-plus-toast pattern doesn't apply here; this is the audit's own read, confirmed by
re-reading the component myself).

## Tests

5 component tests, `__tests__/profile/achievement-section.test.tsx`, pin-then-extend per
this org's convention: 2 success-path cases first, then 3 failure-path cases. **Proved the
3 failure-path tests actually catch the regression**, not just pass vacuously: temporarily
reverted `handleDelete` to the pre-fix version, ran the suite (3 failed red, exactly the
ones exercising the error path), restored the fix, ran again (all 5 green). Diffed the
restored file against the original edit afterward to confirm the revert-and-restore left
the intended fix byte-for-byte identical to what shipped.

## Live verification — done, with one real complication along the way

Per the CEO's explicit instruction: signed out of an unidentified already-authenticated
session (found via `document.cookie`, cleared it directly, confirmed genuinely logged out
by `/login` rendering a real form afterward) and signed in explicitly as
`oryn.qa.b@example.com` from `.env.qa-accounts.local` — confirmed identity via the product's
own UI ("Good evening, oryn.qa.b") and a read-only DB query, not assumed.

**Disk-recovery verification, done first, per the CEO's instruction not to trust
pre-incident numbers**: confirmed via `ps aux` that this lane's own dev server survived the
ENOSPC crash (unlike UI-1's, which was killed outright) before relying on it further.

**Apparent complication, found live — WITHDRAWN, pending clean-account reproduction.**
While verifying, `profiles.onboarding_completed` reverted to `false` after an activity save
succeeded, and duplicate onboarding-created rows appeared (two "Building my profile" goals,
two `MEF Lisesi` education records, one stray `Lincoln High School`). I initially read this
as a Server Action race (`completeOnboarding` vs. `createActivity`, one write clobbering the
other's stale snapshot) and reported it as a live product bug. **CEO subsequently found the
simpler explanation and it's the correct one**: FEAT-2 was independently driving onboarding
on this exact account (`e9eba798-195d-4859-960c-4b8968df7819` = `oryn.qa.b@example.com`) at
the same time — FEAT-2 entering Lincoln High School/US, me entering MEF Lisesi/Turkish,
concurrently, because account allocation was never assigned across lanes that evening. Two
sessions mutating the same account is sufficient on its own to explain both the flag revert
and the exact duplicate rows found — no in-app Server Action race needs to exist for that
explanation to hold, so the evidence I had was contaminated (two writers) rather than
demonstrating a single-writer defect. Not re-flagging as an open finding; if a genuine race
exists in `completeOnboarding`/`createActivity` it would need reproduction against an
account no other lane is touching to actually show it, which this session did not do.
**Did not attempt to fix the observed symptom via a direct DB write** — attempted one
targeted `UPDATE profiles SET onboarding_completed = true ...` to unblock my own
verification, correctly denied by the permission classifier (a raw DB write is outside
this lane's authorized surface); re-ran onboarding through the actual UI instead. That
part of the response stands regardless of the corrected diagnosis above.

**Standing rule adopted going forward, per CEO**: any live verification names the QA
account it uses, and no two lanes use the same account concurrently. This lane's account
is `oryn.qa.b` (already held by possession; FEAT-2 has moved to `oryn.qa.a`).

**The actual verification, once identity and onboarding were sorted**: created a real
activity ("Regional Science Fair") via the UI, confirmed it persisted (visible in the
Activities list, confirmed via a DB row too), clicked Delete, confirmed via server logs
(`deleteActivity(...)` returned 200) and the rendered page (`get_page_text` showing "No
activities yet." afterward) that it was removed cleanly with **no error toast** — the
success path is unaffected by this fix, exactly as intended.

**The failure path (a real server-side delete error) was not reproduced live** — same
limitation FEAT-2 disclosed for its own similar fix: forcing a genuine Supabase write
failure against a real owned row isn't safely stageable without RLS tampering or similar.
Proven at the unit level only (see "Tests" above, including the fail-red/pass-green proof),
consistent with this territory's established practice of saying so rather than overclaiming
live coverage that doesn't exist.

## Process notes from tonight's disk incident (context, not new findings)

- Two of my own actions during the incident were denied by the classifier and, on
  investigation after disk recovered, turned out to be genuine disk exhaustion rather than
  content-based denials (confirmed: the exact same `document.cookie` read that failed
  during the incident succeeded immediately once disk was fixed) — already reported to CEO
  in real time.
- One action (the `profiles.onboarding_completed` direct UPDATE, above) was denied *after*
  disk recovery and is a genuine, correct classifier judgment, not a disk artifact — a raw
  DB write outside this lane's normal code-PR workflow. Did not attempt to route around it.

## Files touched

- `features/profile/achievement-section.tsx` — the fix (13 lines)
- `__tests__/profile/achievement-section.test.tsx` — new, 5 tests
- `next-env.d.ts` — dev-mode path regen, harmless per `AGENTS.md`'s own note
- `docs/handoffs/feat1-achievement-save-2026-08-22.md` — this file

No schema change, no migration, no DB writes by this lane.

## What this package did NOT do (rule 20)

- Did not chase the apparent `onboarding_completed` race further once the simpler
  two-sessions-one-account explanation surfaced — see the withdrawal note above.
- Did not clean up the QA-B account's duplicate onboarding rows — harmless test-fixture
  noise from two lanes sharing an account, not this lane's data to clean up unilaterally.
- Did not reproduce the failure (toast-shows-error) path live — proven at the unit level
  only, per the established practice cited above.
