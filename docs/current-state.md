# ORYN Current State

Single short operational source of truth. **Rewritten in place, not appended to**, at each
integration checkpoint — history lives in `docs/handoffs/*` and `git log`, not here.

**Read `docs/ORYN_WORKSTREAMS.md` for who owns what right now, and
`docs/MASTER-EXECUTION-STRATEGY.md` for the enduring product/build direction — this file only
answers "what is actually true right now."**

## Measurement provenance (read this before trusting any number below)

- **Code state** is measured against a specific commit on a specific branch. It goes stale the
  moment anyone pushes. Re-run `git log --oneline -1 <ref>` before trusting it.
- **Live database state** is measured by directly querying the `oryn-qa-scratch` Supabase
  project (`qtcvcflzxbuagvvwahhu`) at a specific timestamp. Re-measure before trusting it for
  anything more than a same-day approximation.

| What | Value |
|---|---|
| Code measured against | `origin/main` @ `dcce22f` ("merge: Canada handoff — co-op taxonomy is per-programme, not per-institution") |
| Code measurement timestamp | 2026-08-22 04:34 |
| Live DB measured against | `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`), via Supabase MCP `execute_sql`/`list_migrations`/`get_advisors` |
| Live DB measurement timestamp | 2026-08-22 (this checkpoint) |

If this file and a handoff doc disagree, this file is newer and wins *for the date stamped
above*. If this file and a fresh live measurement disagree, the live measurement wins — this
file is a snapshot, not a live view.

## Branches / integration state

- `main` (`dcce22f`) is being actively integrated into — 8+ merges landed the morning of
  2026-08-22 alone (04:19–04:34): Canada programme catalogue (Western University, 555
  records), UK programme catalogue, live-row-verification, schema-gaps-design, ca-programmes.
  The prior checkpoint's framing ("main hasn't merged either active product branch yet") is
  now stale.
- Per `docs/ORYN_WORKSTREAMS.md` (rows dated 2026-08-21, not individually re-verified this
  checkpoint): DATA-A (`oryn/programs-pipeline-reconciled`) was deferred from the 08-21
  integration wave (still-moving branch, freeze-test rule); PROD-B
  (`oryn/counselor-data-quality-v1`) was included in that wave; UI-SIMPLIFY
  (`oryn/ui-simplification-v1`) was explicitly excluded per founder instruction, continuing
  independently. Current status of all three not re-checked this pass.
- 80+ local branches and ~85 worktrees exist under `.claude/worktrees/`. Most research lanes
  in `ORYN_WORKSTREAMS.md` are marked complete/idle-pending-assignment; several product/data
  branches are marked dormant/superseded. Not individually re-verified this checkpoint —
  flagged as real integration debt worth a dedicated audit.
- No other Claude sessions were reachable via `ListAgents` at this checkpoint — the 08-21
  overnight fleet appears to have gone idle; nobody is currently picking up the
  idle-pending-assignment research lanes.

## Live database (measured 2026-08-22, this checkpoint)

- `universities`: **1,019** rows — **1,010 `canonical`, 9 `superseded`** (migration 0043's
  data backfill confirmed genuinely live and correct: `duplicate_status` is populated).
- `university_programs`: **14,457** rows (up from 418 at the 08-20 checkpoint — the DE/NL,
  Canada, UK, Ireland, France/Italy, Turkey/YÖK Atlas and US research lanes have been ingested
  at real scale since then).
- `university_requirements`: **1,254** rows (up from 84).
- `university_deadlines`: **396** rows (up from 26).
- `opportunities`: **391** rows, **188 `verified_current`** (48.1%, up from 31.2%). Still-open
  gap, essentially unchanged in relative terms: **366/391 (93.6%) missing
  `eligible_countries`** — this remains the single gate blocking real eligibility matching,
  per `docs/MASTER-EXECUTION-STRATEGY.md` §P3.
- `canonical_entities`: **1,172** rows. `entity_verification_queue`: **101** rows still open.
- `profiles`: **5** — no longer the pre-launch scratch "1", real signups now exist.

## Migrations

Applied through `20260821184903_requirement_shape_representability` — this **is** migration
`0056` (`0056_requirement_shape_representability.sql`), confirmed live. **Reconciled this
checkpoint**: commit messages loosely calling two different things "migration 0056" was the
source of the apparent discrepancy flagged at the last checkpoint, not a real gap —
`0057_university_program_kilavuz_kodu.sql` was originally drafted *as* 0056, then renumbered
to 0057 once the real 0056 claimed that number first (`c710acc`). 0057 itself is **deliberately
not applied**: its own header states a prior coordination session's authorization for 0055
"does not extend to this migration" and instructs not to apply without asking the founder
again. Confirmed live: no `kilavuz_kodu` column exists on `university_programs`. Now tracked as
founder-blocked-backlog item 26.

## External service status (measured 2026-08-22, via `npm run check:integrations` — this
worktree only; credentials are per-checkout via `.env.local`, not shared across worktrees)

| Service | Status |
|---|---|
| Supabase (anon key) | OK |
| Supabase (secret key) | **Still failing — "JWT issued at future".** Same regression flagged at the 08-20 checkpoint, unresolved 2+ days later. Founder action — see below. |
| Anthropic | Missing credential in this checkout specifically (not necessarily a global blocker — other worktrees have had this working per `ORYN_WORKSTREAMS.md`'s DATA-A row) |
| Tavily | Missing credential in this checkout specifically (same caveat) |
| College Scorecard | Missing credential (unchanged; optional) |
| OpenAlex | OK (keyless, unchanged) |

## Security advisors snapshot (measured 2026-08-22)

No new alarming findings. Same accepted WARN/ERROR items as the 08-20 checkpoint
(`public_profiles` SECURITY DEFINER, `pg_trgm`/`unaccent` in public schema, two
SECURITY DEFINER functions callable by anon/authenticated, leaked-password-protection
disabled — all previously reviewed and accepted, not re-litigated here). New since 08-20:
**9 `_backup_*` tables** left by various sessions' before-risky-write snapshots (e.g.
`_backup_eligible_countries_2026_08_22b`, `_backup_yokatlas_confidence_2026_08_22`), flagged
INFO-level RLS-enabled-no-policy — expected for internal snapshot tables, but worth a cleanup
pass once nobody needs them for rollback.

## Founder actions required

Only items no Claude session can do unilaterally. Full detail:
`docs/founder-blocked-backlog.md`, `docs/FOUNDER-START-HERE.md`.

1. **Still open, still time-sensitive**: the Supabase secret-key "JWT issued at future"
   failure — check the project's service-role key hasn't rotated and this environment's
   clock/credential is current. Blocks every secret-key-dependent write (account deletion,
   admin panel, notification writes, moderation) in any environment hitting this.
2. Add billing credit to the Anthropic account / resolve the Tavily plan-usage limit — not
   re-confirmed globally this checkpoint (this specific checkout simply has no local key for
   either, which is a separate, per-worktree issue).
3. The remaining `founder-blocked-backlog.md` items (QA accounts, `is_admin` grant, legal
   review, hosting/deploy choice, error-monitoring provider, scholarship-sourcing policy,
   QS-ranking licensing position, GPA-on-public-profile decision, etc.) — unchanged, see that
   file directly rather than a second copy going stale here.

## Next phase

1. ~~Canonical identity correctness (P1)~~ — **done, merged to `main`** ([PR #2](https://github.com/akirik28/ORYN/pull/2),
   `b36214b`, merged by the founder 2026-08-22 09:38 UTC). All 23 real consumers (not 16 —
   corrected during the work) of `lib/universities/canonical.ts` now query the live
   `duplicate_status`/`superseded_by_id` columns directly; the static JSON snapshot and its
   generation script are deleted. Independently re-verified before merge: lint/typecheck clean,
   121 files/1824 tests pass, build succeeds, live DB state unchanged (canonical=1010/
   superseded=9). Full detail: `docs/handoffs/canonical-live-column-refactor-2026-08-22.md`.
2. ~~Opportunity eligibility gap (P3)~~ — **first pass done, merged to `main`** ([PR #3](https://github.com/akirik28/ORYN/pull/3),
   `8f0b145`, merged 2026-08-22 09:38 UTC). `eligible_countries` moved from 366/391 null (93.6%)
   to 352/391 (90.0%). **Real finding, not just a completeness one**: confirmed directly in
   `lib/opportunities/matching.ts`/`lib/counselor/eligibility.ts` that an empty array already
   means "not restricted," not "unknown" — a genuinely restricted program with no data is shown
   as eligible to everyone today with no warning (e.g. MIT PRIMES, QuestBridge, both closed by
   this pass). Worth counselor/PROD-B attention independent of finishing the backfill. Scoped
   5-wave plan for the remaining 352 in `docs/research/opportunities-eligible-countries/README.md`
   — Wave 2 (research/scholarship/fellowship/internship, ~20 records) is next, see the research
   queue below.
3. **Branch/worktree integration audit**: 80+ branches, ~85 worktrees, several
   idle-pending-assignment research lanes with real uningested output — worth a dedicated
   reconciliation pass rather than continuing to accumulate more parallel lanes.
4. ~~Migration 0056/0057 reconciliation~~ — resolved this checkpoint, see Migrations section
   above. What's left is founder-blocked-backlog item 26 (authorize applying 0057), not a
   Claude-session task.
5. Production readiness items unchanged (legal review, hosting, error-monitoring, CI).
