# Full migration audit — 2026-09-02

CEO's ask: every migration in `supabase/migrations/` (90 total), classified applied/unapplied/
partial by probing the live schema directly, not `list_migrations` or any file's own comment.
For every unapplied one, does the code degrade — distinguishing write-path guards from read-path
gaps. Read-only, report don't fix.

Full report: `docs/migration-audit-applied-vs-written-2026-09-02.md`.

## Headline

87 of 90 migrations fully applied. 1 (0058, the social feed) deliberately, safely unapplied
behind a 5-layer kill switch — not a gap. 2 (0089, 0090 — both from tonight) genuinely unapplied,
both correctly documented as such, both verified to have correct degrade paths. **Zero partial
applications anywhere**, including the two highest-risk-for-partial-failure migrations in the set
(0085's enum type recreation, 0065's six-table RLS rewrite) — both verified clean.

## The real finding: ten stale "not applied" comments, three of them security fixes

0057, 0059, 0060, 0061, 0064, 0065, 0076, 0077, 0083, 0084 all still say, in their own file,
"WRITTEN BUT NOT APPLIED" or equivalent. All ten are actually live — verified by checking each
one's own claimed schema objects directly, not by trusting the file. Three of the ten (0061:
`public_profiles` anon-read guard, 0064: message-report insert-forgery fix, 0065: six-table
insert-forgery fix across profile_scores/opportunity_matches/etc.) are security fixes that are
correctly enforced right now — but a future session reading any of these files in isolation, the
normal way a migration gets read, would conclude a live fix is still missing.

Two migrations (0062, 0063) already had this exact problem and already fixed it themselves — a
"STATUS, corrected 2026-09-02... APPLIED" note replacing the original claim. That's the template;
it just wasn't applied to the other ten. Not fixed here per the assignment — flagged as the
single highest-value, lowest-risk follow-up: a comment edit, touches no schema, closes a real,
repeatable "read one file, believe the wrong thing" failure mode.

## Degrade-path verification, the part CEO specifically asked to distinguish

- **0058** — not a gap at all. Five independent layers (no route, no nav, feature-flag assertion
  at every data-layer entry point, Server Actions not wired as real actions, tables don't exist),
  mechanically asserted by `__tests__/social/posts-hidden.test.ts`. Verified the flag file and its
  callers exist as claimed.
- **0089 (`plan_tier`)** — correct, textbook read-path shape: `profile.plan_tier ?? "standard"`.
  No write path exists yet by design (no payment flow this pass).
- **0090 (7 `notify_*` columns)** — correct on both reads, with one nuance worth stating precisely
  rather than smoothing over: the read in `lib/notifications/create.ts` explicitly names all 7
  columns in `.select(...)` rather than using a wildcard — which is *why* catching
  `isUndefinedColumnError` works there (an explicit named-column select does trigger a schema-
  cache error for a missing column, same as a write; a wildcard select would not). The Settings UI
  read (`profile?.notify_deadline ?? true`) is the standard `?? default` shape. The *write*
  (`updateNotificationPreferences`) does not silently degrade — a failed update surfaces a real
  error to the student rather than a swallowed success, which is the correct behavior for the one
  write a student directly and knowingly triggers (this codebase's own "no fake production
  behavior" rule), not a bug.

## Gates

`npm run typecheck` / `npm run lint` / `npm run test` — [see commit for result]. Documentation-only
change; no `next build` per the current fleet gate policy (CEO runs it once at merge). Never ran
`npm ci`/`npm install` in this worktree — used the existing symlinked `node_modules` as-is, per
the new environment rule.
