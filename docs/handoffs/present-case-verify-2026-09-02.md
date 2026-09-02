# Present-case verification — 0089/0090/0091, now live — 2026-09-02

CEO's ask: three migrations went from written-and-unapplied to live tonight (plan_tier,
notify_*, response_mode) — verify the direction their degrade guards were never exercised in.
Read-only on live, no writes performed. Full report:
`docs/present-case-verify-2026-09-02.md`.

## Headline

**All four points checked, all clean or explained, one real gap found and one stale comment
fixed.**

1. `resolvePlanTier`/`resolveResponseMode` — confirmed via direct live read (5 real rows,
   `pg_typeof`-checked): both return real, correctly-typed values now, not just defaults.
   Both `?? default` fallbacks provably can't fire against a present, non-null string.
2. `categoryIsEnabled` — ran the *exact* seven-column named select this function issues,
   live: real booleans, no error, exactly matching what its already-thorough mocked test
   suite assumed.
3. `updateNotificationPreferences`/`updateResponseMode` — the two actual writes. Did not
   write to live (extended the "don't set anyone's plan_tier" caution to all nine columns).
   Instead: replayed all 91 migrations into an isolated local Postgres and ran the *exact*
   UPDATE statements both functions issue — both succeed cleanly, values read back correct.
   Checked Postgres access control at all three places it can live (RLS policy, column
   grants, triggers) — all clean, nothing restricts these nine columns specially. Real
   finding: `updateResponseMode` has no dedicated Server-Action-level test, unlike its
   sibling `updateNotificationPreferences` — same risk shape, weaker coverage.
4. One stale comment found and fixed: `lib/tier/dev-preview.ts`'s header said, in the
   present tense, that `plan_tier` "genuinely does not exist" — true when written, not true
   now. Same "STATUS, corrected" treatment as ten migration headers and `shape-audit.ts`
   earlier tonight — dated note added, explaining what changed (the column's existence)
   and what didn't (the override mechanism itself, never conditional on absence). Checked
   the sibling `dev-preview-actions.ts` and all other consumers of these three columns
   across the codebase — nothing else found.

## Gates

`npm run typecheck` / `npm run lint` / `npm run test` — see commit. No `next build` per
current policy. No `npm ci`/`npm install` in this worktree. Zero live writes — every
write-path claim is proven via an isolated local Postgres replay (all 91 migrations, dropped
after this pass), never the shared database.
