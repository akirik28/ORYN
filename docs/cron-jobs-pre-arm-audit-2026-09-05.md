# Cron jobs pre-arm audit — 2026-09-05

CEO (oryn-5b) request: the founder is about to turn on live cron execution for the 7 jobs
registered in `lib/jobs/schedule.ts`'s `JOB_DEFINITIONS` and `vercel.json`'s `crons` list
(same 7 in both — verified). Before that happens, audit every one for the exact shape of bug
Job D had (`0efe0e76`, `2231272e`): a job that runs to completion, reports `errorsEncountered:
0`/success at the tracking level, and produces silently-empty or silently-wrong output. Three
questions per job, CEO's own framing:

1. Can it silently produce zero, the way Job D did (session-scoped client under a session-less
   caller → RLS-filtered reads/writes, no thrown error)?
2. If a dependent service or write fails, does the job still report success with a partial
   result (spec Phase 33: "external API failure must not crash the app" — the corollary this
   audit is actually checking is that it also must not silently under-report)?
3. What happens on a second run — does it duplicate, or is it idempotent?

Measure-and-report only, per standing instruction — no code changed in this pass, no live
writes. One real, precise finding below (§Deadline/university-change notifications); everything
else audited clean or already fixed. Job D itself is not re-audited here — it already has its
own fix and doc; this pass is about not finding a second one the same day it goes live.

## Method

Read every job's route (`app/api/jobs/<name>/route.ts`) and its underlying `lib/` implementation
directly — not grepped-and-assumed, per this session's own established discipline for exactly
this kind of check. For each: confirmed which Supabase client every function in the actual call
chain uses (not just the top-level one — Job D's own bug was two levels deep, the route built an
admin client correctly and then handed a bare `userId` into a function that silently defaulted
back to a session-scoped one), how a real per-item failure is counted, and whether writes are
insert-only (duplicate risk) or keyed/upserted (idempotent by construction).

## Job A — `discover_opportunities` (`lib/opportunities/discover.ts`)

- **Silent-zero:** No. Self-contained — builds and uses its own `createAdminClient()`
  throughout, no downstream call defers to a different client. A Tavily failure returns early
  with the real error in `errors[]`, not an empty-but-successful result.
- **External-service failure:** Handled correctly. `!searchResult.success` short-circuits with
  the provider's own error message attached; a per-candidate extraction failure is caught,
  pushed to `errors[]`, and the loop continues to the next candidate rather than aborting or
  silently skipping. The route sums `errors.length` into `errorsEncountered` — a real count,
  not a placeholder.
- **Re-run / idempotency:** Safe. Existing `opportunities` rows are loaded up front and every
  candidate is checked with `isDuplicateOpportunity` before insert — a second run against the
  same search results correctly skips everything already stored rather than duplicating it.

## Job (unnamed in schedule.ts's own numbering, but the sibling of A) — `discover_requirements` (`lib/requirements/discover.ts`)

- **Silent-zero:** No. Same shape as Job A exactly — own admin client, Tavily failure and
  per-candidate extraction failure both surfaced into `errors[]`, propagated to
  `errorsEncountered` at the route.
- **External-service failure:** Handled correctly, same pattern as Job A.
- **Re-run / idempotency:** Safe, same dedup-before-insert shape (`isDuplicateRequirement`).
  Worth flagging as a *design* limit, not a bug: `getUniversitiesNeedingRequirementDiscovery`
  only ever targets universities with **zero** requirement rows — a university that already has
  any rows is never revisited by this job, by its own documented design (`docs/known-issues.md`
  referenced in the file's own comment). This job fills a gap once; it does not re-verify
  existing requirement rows going forward. Combined with §5 of
  `docs/requirement-freshness-audit-2026-09-05.md` (Job E's staleness detection has nothing that
  acts on a `stale` result once it eventually appears), there is currently no job anywhere in
  this list that would ever re-research a requirement row once inserted, however old it gets.
  Not a silent-failure bug — a real, present gap between "detect staleness" and "act on it,"
  worth the founder knowing before assuming Job E's eventual `stale` flags do anything on their
  own.

## Job C — `sync_us_universities` (`lib/universities/sync-us-universities.ts`)

- **Silent-zero:** No. Own admin client throughout. A College Scorecard failure returns
  `status: "error"` with the real message, counted into `errorsEncountered` at the route
  (`runs.filter(r => r.status === "error").length`).
- **External-service failure:** Handled correctly.
- **Re-run / idempotency:** Genuinely well-built. Looks up the existing row by
  `(lower(name), country)` — the same pair the table's own unique index enforces — before
  deciding insert vs. update, so re-running with the same school list updates the same rows
  rather than creating duplicates. `last_changed_at` is only stamped when a real field actually
  differs (`hasUniversityDataChanged`), not on every mechanical re-sync — this matters directly
  for Job's-worth-of-effort downstream: `notify_university_changes` (below) reads
  `last_changed_at` to decide what counts as "changed," and an unconditional stamp here would
  have made every sync day look like a real change day to that job.

## `notify_university_changes` (Phase 24 notification, not Phase 30 Job B — see its own route
comment for why) and `deadline_reminders` — audited together, share the one real finding

Both route files correctly hardcode `errorsEncountered: 0` with an explicit comment ("no
per-item external call here that can fail short of the whole run throwing"). **That comment is
not quite true for either job**, traced one level deeper than the route:

Both call `createNotification` (`lib/notifications/create.ts`) once per affected student.
`createNotification` itself is safe in isolation — own admin client, catches its own errors —
but its **return contract conflates two different outcomes into the same `false`**:

```ts
if (!(await categoryIsEnabled(supabase, params.userId, params.category))) {
  return false;                    // expected: student muted this category
}
...
if (error) {
  console.warn("[notifications] failed to create", ...);
  return false;                    // NOT expected: a real database write failed
}
```

Both callers (`lib/deadlines/scan.ts`'s `writeDeadlineNotifications`,
`lib/universities/data-change-scan.ts`'s equivalent aggregation loop) do the same thing with
that `false`:

```ts
const sent = await createNotification({ ... });
if (!sent) continue;
```

A genuine database failure while creating a notification is indistinguishable from a student
having muted the category, at every layer above `createNotification`'s own `console.warn` —
never counted, never surfaced to `runWithTracking`, never visible in `external_sync_jobs`. The
route's `errorsEncountered: 0` is not a placeholder here the way it correctly is for
`detect_stale_data`'s pure-recompute case; it is a claim that happens to currently be true only
because no `createNotification` call has actually failed for a real reason yet, not because the
code guarantees it. This is the same shape as Job D's bug in miniature — a real per-item failure
mode exists and is currently invisible to tracking — narrower in blast radius (Job D silently
produced zero output for *every* student, *every* run; this would only manifest for whichever
specific student's write happens to fail), but the same class CEO asked this pass to find.

Not fixed here, per standing instruction (measure and report). A minimal fix, if wanted, would
have `createNotification` return a three-way result (`sent` / `muted` / `failed`) instead of a
boolean, and both callers add `failed` counts into their own return shape the same way
`scanStaleOutlooks` already does for admission-outlook refreshes (see below) — that function is
the in-repo template for the right shape, not a new one that would need designing.

**Separately, already documented, not new:** `notify-university-changes/route.ts`'s own header
comment (dated 2026-09-03, predates this pass) already states plainly that every candidate
notification this job would currently send traces to this project's own research backfill
landing after a student started tracking a university, not to a genuine external change. Worth
restating here because it is exactly the kind of thing that will be silently true the first
time this specific cron fires live, and is easy to miss re-reading only this audit rather than
that route file's own comment.

## Job E — `detect_stale_data` (`lib/jobs/detect-stale-data.ts`)

Already fully audited in `docs/requirement-freshness-audit-2026-09-05.md` §5 (found while
investigating a separate, CEO-assigned question about `university_requirements.data_status`).
Summary for this doc's own completeness:

- **Silent-zero:** N/A in Job D's sense — this is a pure, deterministic, stored-timestamp-only
  recompute with no AI/external call to spend money on and produce nothing from. It genuinely
  has never executed even once (zero rows in `external_sync_jobs` for this job name), fully
  built and wired regardless — see the linked doc for the full account.
- **External-service failure:** N/A — no external call exists in this job.
- **Re-run / idempotency:** Perfectly safe by construction. `recomputeDataStatus` only writes
  when the recomputed value differs from what's stored; it's an `UPDATE`, never an `INSERT`, so
  there is no duplicate-row shape possible regardless of run count.

## `refresh_admission_outlooks` (`lib/admissions/scan.ts` → `lib/admissions/persist.ts`)

- **Silent-zero:** No, and this one is worth naming as the in-repo template for how the other
  two notification jobs above should look. `scanStaleOutlooks` threads its own admin client
  explicitly into `refreshAdmissionOutlook`'s own `client` parameter (`client ??
  createClient()` default, same shape Job D's fix introduced) rather than relying on a hidden
  default — confirmed directly in `persist.ts`, not assumed from the pattern elsewhere.
- **External-service failure:** N/A — `refreshAdmissionOutlook` makes zero AI or external API
  calls (grepped directly: no `getAIProvider`/`tavilyProvider`/`fetch`/`collegeScorecardProvider`
  anywhere in `lib/admissions/persist.ts`); it is a deterministic computation from already-stored
  profile scores and university facts. A per-row failure is still caught individually
  (`try/catch` inside the loop) and counted into a real `failed` field, kept distinct from
  `refused` (the honesty gate declining to compute a number at all — a different, intentional
  outcome, not an error). The route's own comment notes this `failed` count itself was *already*
  fixed once before today to actually reach `errorsEncountered` — the exact failure mode this
  whole audit is looking for, already found and closed here previously.
- **Re-run / idempotency:** Safe — recomputes and updates the same `target_universities` row by
  id; no insert path, no duplicate-row shape possible.

## Summary

| Job | Silent-zero | External-failure handling | Re-run safety |
|---|---|---|---|
| discover_opportunities (A) | Clean | Clean | Clean (content dedup) |
| discover_requirements | Clean | Clean | Clean (content dedup); design-limited to universities with zero rows, never re-verifies |
| sync_us_universities (C) | Clean | Clean | Clean (identity upsert) |
| notify_university_changes | **Real gap** — see above | **Real gap** — see above | Clean (log dedup) |
| deadline_reminders | **Real gap** — see above | **Real gap** — see above | Clean (log dedup) |
| detect_stale_data (E) | N/A (no external call); never executed yet | N/A | Clean (update-only) |
| refresh_admission_outlooks | Clean | N/A (no external call) | Clean (update-only) |

One real, precise finding shared by two jobs (`createNotification`'s conflated return value);
one already-documented pre-existing risk restated for visibility
(`notify_university_changes`'s day-one false-positive source); one design limitation worth the
founder knowing (`discover_requirements` never re-visits a covered university, and nothing in
this list ever acts on `detect_stale_data`'s eventual `stale` flags either). Everything else
audited clean against all three questions, including two jobs (`sync_us_universities`,
`refresh_admission_outlooks`) that already show the correct pattern in-repo as a template for
fixing the one real gap, if that's the founder's call.

## Addendum — the `research-generator` "recorded exactly once" flake under load

CEO flagged a second, separate signal the same day: after merging `0140`, a full-suite run
showed 7 failures, a later run showed 1, and the one repeating across runs was
`research-generator > a successful generation is recorded in ai_usage exactly once` — passing
3/3 in isolation. Asked whether this is test flakiness or a genuine `ai_usage` double-write
that would scale the moment cron runs this path daily, per-student. Same measure-and-report
instruction; counted as part of this audit since it's the same "silent success hiding a real
problem" question, aimed at the one job-adjacent path (`withUsageLogging`) shared by every
AI-calling feature in the app, not just one cron job.

**Read first, not assumed:** `lib/ai/usage.ts`'s `withUsageLogging` is exactly-once by
construction — the success path and the catch-and-log-then-rethrow path are structurally
mutually exclusive branches of the same `try`, with no loop or retry around either. The one
internal retry that exists (`lib/ai/anthropic-provider.ts`'s own one-retry-on-schema-validation-
failure, up to 2 real attempts) sums usage across every attempt into a single combined figure
*before* it ever reaches `withUsageLogging` — the file's own comment names exactly why: using
only the last attempt's usage would silently under-bill by whatever the discarded first attempt
already spent. Separately — this is the protection CEO referenced from yesterday — the
Anthropic SDK's own default automatic-retry-on-timeout (`maxRetries: 2`, which would silently
turn one logical call into up to three real billed requests) was already closed 2026-09-04:
both `generateText`/`generateStructured` and the streaming call pass `maxRetries: 0` explicitly,
with the exact "up to three attempts instead of one" shape already named in that fix's own
comment. Reading the code alone gives no route to a genuine double-`ai_usage`-row write.

**Then reproduced directly, not left as a read-only inference:** ran the specific test 15× in
isolation (15/15 green, confirming CEO's own report), then generated real contention — two
full 444-file suites launched concurrently in the background, plus 40 additional isolated runs
of just this test hammering against that load. Caught 5 real failures. Every one of the 5 was:

```
Error: Test timed out in 20000ms.
```

**Never once** an assertion failure on `recorded.length` (which would read `expected 1, got 2`
or similar) — the test never reached its own assertion at all under load; the mocked
`generateResearchProjects` call itself simply took longer than the 20s ceiling to resolve.
Meanwhile, both full 444-file suites running concurrently *with* that same contention finished
100% green (444/444, 6661/6663 with the 2 already-known expected fails, both runs) — across 888
total executions of this exact test plus the 45 isolated ones, zero assertion-count failures
anywhere. The failures landed specifically in the smallest, most-frequently-relaunched process
(a fresh Vitest process spun up per hammer-loop iteration), not the two large steady-state
processes — the shape of CPU-scheduling contention starving a short-lived process, not a
deterministic code path.

This is also not a new class for this repo: `vitest.config.mts`'s own header comment (dated
2026-09-02, raising the global timeout from vitest's 5000ms default to 20000ms) already
documents this exact mechanism for a different test — "two lanes reported 8-13 failures in a
full run, in a DIFFERENT set of files each time, none related to their own changes... a busy
machine can't manufacture a red run" was the stated goal, at a 20s ceiling. Today's fleet
(5 parallel research agents + several local Postgres instances + this session's own full-suite
runs, per CEO's own description) is exactly the condition that ceiling was raised against, once
more crossing it rather than a new failure mode appearing.

**Answering CEO's three questions directly:**

1. **Is the test itself fragile?** Yes — under genuine heavy concurrent load, confirmed by
   direct reproduction, not inferred.
2. **Does `ai_usage` actually get written twice?** No evidence of this anywhere in this pass —
   zero assertion-count failures across 933 total executions under real contention, and the
   code path has no structural route to it (exactly-once by construction, retries already
   summed/capped as of yesterday's fix).
3. **What happens at cron scale?** Low risk from *this* specific mechanism — production cron
   runs won't be competing against multiple concurrent full local test suites the way this
   reproduction did; that condition is specific to this development environment's own resource
   pressure, not something a live daily cron invocation recreates. The genuine cron-scale risk
   this whole audit actually surfaces is the separate, real finding above (`createNotification`'s
   conflated `false`) — not this test's flakiness.

Not fixed here (raising the timeout further, or marking this specific test to run outside the
global ceiling, would be the two obvious options if the flake rate under real fleet conditions
is bothersome enough to act on) — measured and reported per standing instruction; the decision
belongs to CEO/founder.

## Verification

Read-only pass — no code changed, no live writes, nothing merged. All claims above traced to
the actual source file and line, not inferred from naming or grepped-and-trusted. The load
reproduction in the addendum above is the one place this pass generated real (if temporary)
system load rather than only reading — two background `vitest run` processes and one loop of
45, all completed, nothing left running.
