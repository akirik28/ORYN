# Pre-deploy dry run: the other four jobs

**Date:** 2026-09-03. **Author lane:** this session. **CEO dispatch**, direct follow-on to
[[project_oryn_job_dryrun_audit]] (which covered `notify-university-changes`,
`detect-stale-data`, `refresh-admission-outlooks`, `scheduled-review`): four more jobs have
been armed in `vercel.json` all along and have also never run — `discover-opportunities`
(02:00), `discover-requirements` (04:00), `sync-university-data` (06:00), and
`deadline-reminders` (08:00). On first deploy, all eight fire within a day. Same discipline:
read-only against live data, nothing invoked that writes.

## `deadline-reminders` (08:00 daily) — the one that writes to real students, checked hardest

**This is a genuinely different risk shape from `notify-university-changes`, and the
difference is the finding.** `notify-university-changes` fired on *when a row was written*
(`created_at`/`last_changed_at` vs. tracking start) — which is exactly what let two weeks of
catalogue-research backfill masquerade as fresh news. `deadline-reminders` fires on an
**exact match between today's date and a stored calendar date** (`thresholdCrossed`: does
`deadlineDate - today` land on exactly 30/14/7/3/1 days) — a property of the deadline's own
date, structurally independent of when the row was inserted. Tonight's catalogue growth (84
records promoted to active, deadlines staged) cannot by itself manufacture a hit the way it
did for the other job — it can only produce a hit if a deadline's real calendar date happens
to land in one of five specific day-counts from today, same as it would for data that was
years old.

**Live check of what would actually fire today, across all three sources**: exactly **one**
hit — an `application` row (student-entered deadline, not catalogue research), the University
of Oxford, `2026-09-10` (7 days out), on the founder's own account (`ccf2161e…`, the same id
`00-OKU-BENI.md`'s own step 1 makes admin). Zero hits from `saved_opportunities` and zero
from `target_universities`' program deadlines — the two sources that *could* have carried
tonight's catalogue work. `deadline_notification_log` is empty (never fired), so nothing
softens this either way, but there is nothing here that needs softening: an application
deadline is set by the student who created the application, not by anything this project's
own research pipeline touched tonight.

**Not the same finding twice** — worth being explicit about why this one comes back clean
where the other one didn't, rather than asserting it from the mechanism alone. Checked, not
assumed.

Same `createNotification` (`lib/notifications/create.ts`) as `notify-university-changes` —
same minor, already-noted gap: "muted" and "genuinely failed" collapse into the same `false`,
invisible to `errorsEncountered`. Not re-litigated here; already on record and already
accepted as an observability gap, not a correctness one.

## The three discovery/sync jobs — answering the "missing key" question from the behavior side

f5 is writing the environment-variable checklist from the config side; this is the same
question from the code's own behavior: what actually happens, end to end, when
`TAVILY_API_KEY`, `ANTHROPIC_API_KEY`, or `COLLEGE_SCORECARD_API_KEY` is missing on first
deploy.

**All three fail safely — checked at the provider layer directly, not inferred from the
route.** `lib/providers/tavily.ts` and `lib/providers/college-scorecard.ts` both return a
real, typed `{ success: false, error: { type: "not_configured", message: "...is not set." } }`
the moment a key is absent — never a silent empty success. Every call site that consumes this
(`discoverOpportunitiesForQuery`, `discoverRequirementsForUniversity`, `syncUsUniversities`)
threads that failure into its own per-item result (`errors: [...]` or `status: "error"`), and
every route sums those into a real `errorsEncountered` before calling `runWithTracking`. A
deploy missing any of the three keys would show `succeeded` with a non-zero, visible
`errorsEncountered` and `itemsProcessed: 0` — legible in the admin panel as "this ran and
everything failed," not indistinguishable from "this ran and found nothing today." This is
exactly what AGENTS.md's own Phase 72 asks for ("show a clear developer setup state... do not
pretend the feature works"), correctly implemented at every layer checked.

- **`discover-opportunities`**: 5 fixed queries (`DEFAULT_DISCOVERY_QUERIES`) per run, each
  independently hitting Tavily then, per candidate, the AI extraction step
  (`extractOpportunityFromContent`, needs `ANTHROPIC_API_KEY`) — a missing Anthropic key
  throws inside the per-candidate `try/catch` and is caught the same way, landing in `errors`
  rather than escaping. `JobBudgetExceededError` is the one thing NOT counted as an error
  (a clean, expected stop — `stoppedForBudget`), correctly distinguished from a real failure.
- **`discover-requirements`**: bounded batch of 5 universities per run (`DEFAULT_BATCH_SIZE`),
  same Tavily→AI shape. Live check: **908 of 1019 universities have zero
  `university_requirements` rows** — a large real backlog, but the job's own bounded batch
  means this is a ~180-day incremental chip-away by design, not something that surprises on
  day one. Matches the route's own comment ("cost per invocation stays predictable").
- **`sync-university-data`**: 15 fixed institutions (`DEFAULT_US_UNIVERSITIES`), College
  Scorecard only, no AI cost. Same `status: "error"` → `errorsEncountered` wiring, confirmed.

## One real, secondary finding: both discovery jobs' dedup check discards its own read error

`discoverOpportunitiesForQuery` and `discoverRequirementsForUniversity` both load their
existing-rows comparison set the same way:

```ts
const { data: existingOpportunities } = await supabase.from("opportunities").select(...);
// lib/opportunities/discover.ts:43 — `error` never checked
const { data: existingRows } = await admin.from("university_requirements").select(...);
// lib/requirements/discover.ts:51 — same shape
```

If this specific read fails (a transient DB hiccup, not a missing key — the admin client
bypasses RLS, so this isn't an auth problem), `data` is `undefined`, and both dedup checks
degrade via `(existing ?? [])` to **an empty comparison set** — meaning every candidate this
run finds would read as "not a duplicate," regardless of whether it already exists in the
catalogue. Not the same failure shape as the other findings in this pass (nothing writes to
or notifies a student incorrectly), and not caught by anything in this pass's own remit to
fix — a data-integrity risk (possible duplicate catalogue rows on a bad day), not a
first-run risk specifically, since it needs a coincidental read failure at exactly the wrong
moment to matter. Named because it's the same shape as
[[feedback_an_unchecked_write_is_invisible_to_every_gate]]'s family of findings, just on the
read side instead of the write side, and because a fresh-eyes read of exactly these two files
this pass already had open was the natural place to notice it. Not fixed here — narrow,
low-stakes, and outside what this dry run was asked to do.

## Gates

Read-only throughout — every number above came from a direct SQL query or a source read.
Nothing in this pass invoked any of the four jobs' real code paths. No code changed, so no
gate to run beyond confirming this document itself.

## Where this leaves the eight

Of eight jobs now checked across two passes: three write nothing student-facing and came back
low-risk (`detect-stale-data`, `refresh-admission-outlooks`, and now the three discovery/sync
jobs on the missing-key question specifically); one (`scheduled-review`) has already been
pulled back out pending founder sign-off; two write real notifications to real students, and
both have been checked by hand against live data — one (`notify-university-changes`) needed a
staged backfill before it's safe, the other (`deadline-reminders`) came back genuinely clean.
That is the full set.
