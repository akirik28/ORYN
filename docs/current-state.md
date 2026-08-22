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
| Code measured against | `origin/main` @ `2334f07` |
| Code measurement timestamp | **2026-08-22 19:40** (late-evening checkpoint — supersedes 18:20 and 04:34) |
| Gate on that commit | lint clean · typecheck clean · **144 files / 2,122 tests** · production build compiles — run by ORYN-CEO in a clean checkout, then **independently reproduced by ORYN-CFO** in a second clean-room worktree |
| PR queue | **empty.** 93 merged today |
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
- **CORRECTED 18:35.** This line previously read "no other Claude sessions were reachable —
  the overnight fleet appears to have gone idle." That was true when written this morning and
  **false for the whole of this afternoon and evening**, when a 13-session organization was
  running against this repo. A research lane read it as current, concluded its own manager was
  gone, and re-routed its reporting on that basis — the doc did the misleading, not the lane.
  **Live at 18:35: roughly a dozen sessions active**, coordinated per
  `docs/ORYN-ORG-STRUCTURE.md`. Session liveness changes by the minute and does not belong in
  a checkpoint document at all; `ListAgents` is the only answer to that question, and even it
  reports a moment rather than an identity — a session that briefly drops and resumes returns
  under a different reference, which misled three sessions today including this one's author.

## Live database (measured 2026-08-22, this checkpoint)

- `universities`: **1,019** rows — **1,010 `canonical`, 9 `superseded`** (migration 0043's
  data backfill confirmed genuinely live and correct: `duplicate_status` is populated).
- `university_programs`: **16,770** rows (418 at the 08-20 checkpoint → 14,457 yesterday morning
  → 16,119 this afternoon → **16,770** now). The last +651 is **Australia, which had zero
  programme coverage this morning** — now 651 across **four** universities (UNSW 217, Monash 178,
  Sydney 149, UWA 107). Adelaide's 119 are researched and deliberately **not** applied. Three
  further universities were deferred, each blocked by a different access-control mechanism. All
  107 UWA records were re-fetched through a `robots.txt`-permitted path before merge, after the
  lane caught that its own completed work had used a disallowed one — verified live: zero
  `/sitecore` URLs remain.
- **Known completeness gap**: `degree_type` is null on **257 of 651** Australian rows — 100% of
  Sydney and 100% of UWA, versus 1 of 217 at UNSW and 0 of 178 at Monash. The null tracks the
  *extraction method*, not the university: title-token extraction leaves it empty, structured-field
  extraction fills it densely. `degree_level` is populated on **all 651**, so the qualification
  level shows on every record and only the abbreviation is missing. **Completeness, not
  correctness** — and an honest null is the right outcome if the source doesn't publish an
  abbreviation, since a `degree_type` inferred from a title would be Oryn's guess dressed as a
  sourced fact. Open question routed to the research lane: does the source publish one at all?
- `university_requirements`: **1,254** rows (up from 84).
- `university_deadlines`: **396** rows (up from 26).
- `opportunities`: **391** rows, **271 `active`** (the browse surface). Two open gaps, both
  measured live this afternoon and both independently re-measured by ORYN-BASORG:
  - **351/391 missing `eligible_countries`** (was 366 this morning). Still the gate on real
    eligibility matching per `docs/MASTER-EXECUTION-STRATEGY.md` §P3. Now honestly *labelled*
    even where unresearched — see FEAT-1's Package 1 below.
  - **only 60/391 carry a deadline.** Verified records are still moving through the pipeline
    with nothing able to apply them: **the `opportunities*` write territory is deliberately
    vacant.** The founder stopped one of two RES-I2 instances and which one is ambiguous, so
    waking either risks overriding a deliberate stop or handing live-write access to the wrong
    session. Ruling: nobody writes to `opportunities*` until the founder opens a lane
    (backlog item 34). Research on those tables continues and is unaffected — produce freely,
    apply nothing.
- `canonical_entities`: **1,172** rows. `entity_verification_queue`: **101** rows still open.
- `profiles`: **5** — no longer the pre-launch scratch "1", real signups now exist.

## Referential & duplicate integrity (measured 2026-08-22 19:50, ORYN-CEO)

Run directly against live `oryn-qa-scratch` after the day's 96 merges and the Australian
ingestion. **All clean:**

| check | result |
|---|---|
| `university_programs` with a missing university | **0** |
| `university_requirements` with a missing university | **0** |
| `university_deadlines` with a missing university | **0** |
| `university_deadlines.program_id` not in `university_programs` | **0** |
| `opportunity_matches` with a missing opportunity | **0** |
| `profile_scores` with a missing profile | **0** |
| **true duplicate programme rows** | **0 across all 16,770** |

**The duplicate check is worth reading carefully, because a coarser version of it produces a
false alarm.** 318 `official_program_url` values appear on more than one row, and 120 rows share
an identical (name, degree_level, url) triple within one university. **Neither is a defect.**
Many programmes legitimately share one catalogue URL — Turkey's largest group has 391 rows on a
single YÖK Atlas page, which is expected while those rows have no per-programme identifier
(backlog item 26). And the identical-triple rows are genuinely distinct programmes: Harvard's two
"Economics" entries are the **Harvard College `AB`** and the **Extension School `ALB`** — same
name, same level, same catalogue URL, different school and different degree designation.

Duplicate identity for a programme therefore requires **degree_type** as well as name, level and
url. Under that definition there are zero duplicates; under name+level+url alone there appear to
be 120, and that number is wrong.

**And this is enforced, not merely observed.** The live schema carries a UNIQUE index —
`university_programs_dedup_idx`, added 2026-08-21 by `program_dedup_index_degree_type`:

```sql
UNIQUE (university_id, normalized_name, COALESCE(degree_level,''),
        COALESCE(language_of_instruction,''), official_program_url,
        COALESCE(degree_type,''))
```

So the database **cannot** hold a duplicate under that definition — the measured zero is a
consequence of an enforced constraint rather than a lucky state, and it will stay zero through
future ingestion without anyone re-checking. The schema had already encoded `degree_type` as part
of programme identity before this evening's check derived the same thing empirically; anyone
reasoning about duplicates should read this index rather than inventing a definition, as I did.

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
| Supabase (secret key) | **OK — resolved 2026-08-22 ~10:15 UTC.** The "JWT issued at future" failure (open since 08-20) turned out to be a transient Supabase server-side condition, not a credential problem: the key in `.env.local` was a valid current `sb_secret_` key all along, and the identical request now returns 200 on 10/10 direct probes and 3/3 `check:integrations` runs. Investigated and ruled out before concluding transient: key format/staleness, project-URL mismatch, duplicate env definitions, shell-env override, local clock skew (server and local clocks matched to the second), supabase-js client-side validation (error string absent from the library). Everything secret-key-dependent (admin panel, notifications, account deletion, moderation) is unblocked. If it recurs, it flaps server-side — re-probe before touching credentials. |
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

1. ~~Supabase secret-key failure~~ — **resolved 2026-08-22, transient server-side; no
   founder action was needed after all** (see External service status above).
2. Supabase dashboard → Authentication → Sign In / Providers → Email → turn **Confirm
   email** off — still the one gate on browser-QA signup.
3. Add billing credit to the Anthropic account (unblocks live AI-advisor testing; timing
   optional) / resolve the Tavily plan-usage limit when discovery jobs are wanted.
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
3. ~~Branch/worktree integration audit~~ — done. 55 clean, already-merged worktrees removed
   (no branch deleted, no work lost); disk went from 9.7GB free to ~11GB with headroom held
   steady since despite 13 concurrent sessions.
4. ~~Migration 0056/0057 reconciliation~~ — resolved. What's left is founder-blocked-backlog
   item 26 (authorize applying 0057), not a Claude-session task.
5. Production readiness items unchanged (legal review, hosting, error-monitoring, CI).

## What the 13-session organization shipped on 2026-08-22

Structure and operating rules: `docs/ORYN-ORG-STRUCTURE.md`. Per-role briefs:
`docs/ORYN-ORG-BRIEFS.md`. Merge history: `docs/handoffs/merge-log.md`.

**Live trust defects closed** — every one of these was the product asserting something its
own data did not support, which is the strategy's first priority:
- **Türkiye Scholarships** told students it was open to citizens of all countries while its
  own official `.gov.tr` source separately lists Turkish citizens as *ineligible*. For a
  product whose core audience is Turkish students, the live row said the opposite of its
  source. Fixed and verified live.
- **Unresearched opportunities read as unrestricted.** An empty `eligible_countries` meant
  "no country restriction" in both the matching layer and the counselor, so a genuinely
  restricted programme nobody had researched appeared eligible to everyone, silently.
  Now carries an honest "not verified yet" note instead (FEAT-1 Package 1, migration 0060
  written and **not applied** — founder item 29).
- **Closed-cycle opportunities could appear in "Due soon"** and fire a deadline reminder —
  the dashboard's own opportunity block already suppressed them, the deadline block did not
  (FEAT-2 Package 2).
- **The admission outlook told students with no essays that essays were an unknown.** For a
  YKS/CAO-style placement system the engine correctly computed a sourced explanation, and the
  page dropped it on the floor and rendered a US-holistic strengths/gaps/essays panel instead
  (FEAT-1 Package 2).
- **2,097 well-sourced programme records were wrongly blocked** by an evidence gate that
  prose-matched attestation wording instead of judging evidence. Replaced with a structured
  `retrieval_method`; 1,657 Canadian records ingested and verified as a result. Genuinely weak
  evidence (McGill's archive captures) stays correctly blocked.

**Known and deliberately not acted on** (founder items 27–29): ~79 opportunity rows whose
descriptions are degraded in the founder's own source spreadsheet; 5 opportunities no
AI-permitted fetch path can reach; migration 0060.

**In flight at time of writing**: RLS/database-security verification (BUG-1), Australia
programme catalogues (RES-R1, 37 universities at zero coverage), opportunity deadlines
wave 2 and eligibility wave 3, territory test coverage (FEAT-2), UI defect fixes (UI-1,
audit at `docs/ui-audit-2026-08-22.md` — the agenda for the founder's UI conversation).
