# Is `data_status` real machinery or decoration? — two different answers for two different tables

**Read-only throughout.** Investigation only — no code change, nothing to fix here yet on
either question. Scope: why all 1,325 `university_requirements` rows read `data_status: fresh`,
and what `data_status: needs_review` actually means for the 734/1,019 `universities` rows that
carry it.

## Question 1: are all 1,325 requirement rows `fresh` because the job is decorative?

**No — the machinery is real, correctly designed, and correctly not doing anything yet, for a
reason that has nothing to do with either of the two contrast bugs.**

**The job exists and its logic is sound.** `lib/jobs/detect-stale-data.ts` (Phase 30 Job E)
recomputes `data_status` for `universities`, `university_requirements`, and
`university_deadlines` by comparing `now() - ageReference` against a per-table threshold (60
days for requirements) and only ever moves a row between `fresh` and `stale` — `needs_review`
and `unavailable` rows are read but deliberately never touched (own comment: age is not the
reason those exist, see Question 2). Read `recomputeDataStatus` directly: it's a small, pure,
correct function.

**Checked live why it never fires for requirements: every row is too young, by a wide margin.**

```
oldest age-reference: 2026-08-16 11:27:02 UTC
newest age-reference:  2026-08-31 22:36:53 UTC
rows older than 60 days: 0 of 1,325
```

The oldest requirement row on file is 17 days old against a 60-day threshold. `fresh` on every
row is not a symptom — it's the only correct output `recomputeDataStatus` could produce today,
regardless of whether the job runs once, daily, or never. This directly answers oryn-a7's own
framing: "nothing has gone stale" is not implausible here — it's arithmetically exact, because
this entire corpus is genuinely brand new.

**Checked both contrast shapes directly against `university_requirements`' actual write
paths — neither applies:**

- *"A column can be written unconditionally when it shouldn't be"* (the `universities.
  last_changed_at` shape): `university_requirements` has no `last_changed_at` column at all
  (confirmed via `information_schema.columns` — only `data_confidence`, `data_status`,
  `last_checked_at`, `source_url`, `updated_at`, `verified_at` exist), so there is no
  conditional-vs-unconditional question to even ask for this table.
- *"A write can fail silently against an unapplied-migration column"* (the `university_
  statistics.last_changed_at` shape, `23fa0df5`, merged this morning): checked every requirement
  write path — `lib/requirements/discover.ts:82` (`const { error } = await admin.from(
  "university_requirements").insert(...)`, checked immediately, pushed to an `errors` array,
  never silently dropped) and the `scripts/apply-*-2026-08-23.ts` → `lib/requirements/
  ingest.ts:applyRequirementDecision` path (insert result destructured as `{ id, error }`,
  and a failed insert is explicitly downgraded to `outcome: "rejected"` with the real DB
  error recorded — the function's own comment: "nothing is ever recorded as a success it
  didn't have"). Both paths check what they write. Neither references a column absent from
  this table live.

**What's real, separate from the age question: the job has never actually run.**
`external_sync_jobs` has zero rows for `job_name = 'detect_stale_data'` — not scheduled
(deliberately, per the route's own comment: not wired into `vercel.json`, "scheduling this is a
deployment decision for the founder"), and never manually triggered either, not even once for a
smoke test. This doesn't change today's answer (even a real run today would correctly report
zero changes, for the reason above), but it does mean the code path itself is currently
unvalidated against live data in practice — worth someone running it once, deliberately, when
there's an actual candidate row to watch it flip, rather than trusting the reading above forever
on inspection alone. Did not do that run myself: it's a real write against the shared database,
and the point of this investigation was to explain live state, not create a new one.

## Question 2: what does `needs_review` actually mean for the 734 universities that carry it?

**Established from live evidence, not guessed: one bulk insert, sparser on two specific
fields, and no script in the current repo explains it.**

**It's a single INSERT, not 734 individual decisions.** All 734 `needs_review` rows share the
identical `created_at` — `2026-08-16 23:29:46.90496 UTC`, to the microsecond
(`distinct_minutes: 1`) — the same fingerprint this codebase already uses elsewhere to prove a
bulk load (see the `canonical_entity_merges` timestamp-clustering finding earlier tonight). The
285 `fresh` universities are a different, earlier, more gradual batch (Aug 15–17, spread across
9 distinct minutes).

**The two cohorts are not "complete vs. incomplete" in general — they differ on two specific
fields:**

| | `fresh` (n=285) | `needs_review` (n=734) |
|---|---|---|
| has `website_url` | 95% | 98% |
| has `institution_type` | 94% | 100% |
| has `student_size` | 72% | **24%** |
| has `admissions_url` | 94% | **49%** |
| has `description` | 1% | 0% |

`needs_review` universities are *more* likely to have a website and an institution type than the
`fresh` ones — this is not a blanket "less-complete-so-flagged" rule. What actually separates
them is specifically `student_size` and `admissions_url`: the `needs_review` batch is missing
those two fields roughly 3x and 2x as often, respectively. This is a real, checkable pattern —
Job E's own comment guessed "most likely completeness/confidence at creation" without citing a
number; this table is that number.

**Could not find the script or migration that actually set it.** Grepped every `.ts`, `.py`,
and `.sql` file in the repo for a literal `data_status`/`needs_review` write against
`universities`: `scripts/expand-university-spine.ts` writes only `'fresh'` (twice, both
hardcoded); every `.sql` migration mentioning `needs_review` either just defines the enum
(`0006`, `0074`) or belongs to an unrelated table (`canonical_entity_registry`, `0038`/`0039`).
The column's own default is `'fresh'` (migration `0006`), so this isn't a silent default either
— something explicitly wrote `'needs_review'` for exactly these 734 rows, in one statement, and
nothing in the currently-tracked repository shows what that was. Checked commits around the
same timestamp (2026-08-16 evening) on the chance it was same-session work — found only the
Canonical Entity Autocomplete System's Drive-corpus import, which is a different table and a
much smaller batch (98 universities, not 734) — a red herring, ruled out rather than assumed
unrelated.

**What this means for "should a student see it," which I'm not deciding:** the honest reading
of the evidence is that `needs_review` most likely marks "created without an admissions URL or
enrollment figure, in one large early population pass" — closer to "we haven't finished
filling this one in yet" than "something here is wrong." That's a real, defensible reading, but
it rests on a correlation across two fields and a timestamp, not on a found piece of intent —
I'm not confident enough in it to call it settled, and it's exactly the kind of half-confirmed
fact that shouldn't drive a wording decision on its own. If it's worth pinning down further,
the founder or whoever ran the original spine population may simply know what that batch was
directly, which would turn this from an inference into a fact.

## Summary

| | Requirements (`fresh` × 1,325) | Universities (`needs_review` × 734) |
|---|---|---|
| Is the freshness machinery real? | Yes — correct logic, correctly inert today | N/A — Job E deliberately never touches `needs_review` |
| Root cause of the observed value | All rows younger than the 60-day threshold | One bulk INSERT, 2026-08-16 23:29:46 UTC |
| Silent-failure risk (the `university_statistics` shape)? | Checked directly — not present | N/A |
| Unconditional-write risk (the `universities.last_changed_at` shape)? | N/A — no such column exists on this table | N/A |
| Provenance | Fully traced to real, error-checked ingest code | Not found in the current repo — likely predates it |
