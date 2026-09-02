# `syncUsUniversities`'s write path against the live schema — 2026-09-02

**Status:** report only. No code, no migration, no live write. Read-only throughout —
`information_schema`/`pg_catalog` reads and the existing test suite only.
**Trigger:** the founder applied migrations `0075`-`0088` (all but `0087`, which failed
exactly as its own comment predicted) while the fleet was paused. `university_statistics
.last_changed_at` (migration `0080`) is now live. CEO's ask: confirm whether
`sync_us_universities`'s write path is now schema-compatible, without executing it —
`sync_us_universities` has never run (0 rows in `external_sync_jobs`, per
`docs/scheduled-jobs-phase30-mapping-2026-09-01.md`), and this is not the pass that
changes that.

## 0. The framing needs one correction before the verdict

The historical bug as described — "the upsert had no `{ error }` destructure at all, so
Postgres rejected the write and nothing observed it, forever, silently" — **was real, but is
already fixed in the code on `main` today**, independently of migration `0080` landing.
`lib/universities/sync-us-universities.ts`'s own comment (lines 206-216) names it precisely:
found by oryn-3f's unapplied-migration sweep, fixed by adding the `{ error: statsError }`
destructure and a specific-column check before this pass ever started. Read fresh today, not
assumed from the description.

**One more layer under that, found while verifying it:** the missing-column *detector* itself
had a second, independent bug until earlier today. `lib/supabase/errors.ts`'s own header is
direct about it: every degrade guard in this codebase checked only Postgres's `42703`
(`undefined_column`) — the code raised for a `SELECT` against an unknown column. A write
(`INSERT`/`UPDATE`/`UPSERT`) never reaches that check: PostgREST validates the payload against
its schema cache *before* any SQL runs and returns its own `PGRST204` instead. **"Every degrade
path in this codebase... was inert for writes"** until this was found live (`refreshOpportunityMatches` took the non-degrade branch against a genuinely-absent column) and
`isUndefinedColumnError` was fixed to check both codes, then moved to a shared home once a
second domain needed it. `sync-us-universities.ts` imports the now-correct shared version.

So: even in the fully-unpatched historical state (checking neither field), the practical
consequence would *not* have been silent forever — the code would have fallen to the
`else if (statsError) return { status: "error", ... }` branch, which `syncUsUniversities`'s
caller counts into `errorsEncountered` and the job route surfaces. Undetected only in the
sense that nobody was watching `external_sync_jobs` for a job that has never run — not
undetected in the sense that the code itself hid it. Worth being precise about, since the
whole reason this class of bug matters is auditors trusting "it ran, it reported success" —
and this one never ran at all, so it never had the chance to lie.

## 1. What the live schema actually supports today — every column, checked, not assumed

Read `syncOne`'s three write payloads in full (`universities`, `university_statistics`,
`university_sources`) and cross-referenced every column against `information_schema.columns`
for the live database (`qtcvcflzxbuagvvwahhu`):

**`universities`** — `name`, `city`, `institution_type`, `website_url`, `student_size`,
`external_ids` (jsonb, `NOT NULL DEFAULT '{}'`), `country` (`NOT NULL`), `data_confidence`
(enum, `NOT NULL`), `data_status` (enum, `NOT NULL`), `last_checked_at`, `last_changed_at` —
**all present**, types match what the code writes (JS strings/numbers/ISO-date-strings against
`text`/`integer`/`timestamptz`). `last_changed_at` here was already live before today's
migration batch — it is `university_statistics`'s copy of the column that was missing,
confirmed by the asymmetry in the code itself: only the `university_statistics` upsert has a
degrade-and-retry branch, because only that column was ever absent.

**`university_statistics`** — `admission_rate`, `sat_range_low/high`, `act_range_low/high`,
`graduation_rate`, `cost_of_attendance` (all `numeric`/`integer`, nullable), `cost_currency`,
`source`, `retrieved_at`, `university_id`, `stat_year`, **and `last_changed_at` (confirmed
live: `timestamp with time zone`, nullable)** — the column migration `0080` added. **All
present.**

**`university_sources`** — `university_id`, `source_url` (`NOT NULL`), `source_domain`,
`source_type`, `confidence` (enum), `retrieved_at` (`NOT NULL DEFAULT now()`), `raw_excerpt` —
**all present.**

**Enum values the code writes as literals, checked against `pg_enum` rather than assumed
valid:** `data_confidence: "high"` — valid (`high`/`medium`/`low`). `data_status: "fresh"` —
valid (`fresh`/`stale`/`needs_review`/`unavailable`). Both used correctly.

**The two `onConflict` targets the code's own comments claim exist, checked against `pg_indexes`
(not `pg_constraint` — a plain `CREATE UNIQUE INDEX` doesn't register as a table constraint,
and my first pass checked the wrong catalog and would have reported a false gap here; caught
before it became a finding):**
- `university_statistics_university_year_idx` — `UNIQUE (university_id, stat_year)` — **exists**, matches `onConflict: "university_id,stat_year"` exactly.
- `university_sources_university_url_idx` — `UNIQUE (university_id, source_url)` — **exists**, matches `onConflict: "university_id,source_url"` exactly.

**RLS:** `syncOne` uses `createAdminClient()` (`lib/supabase/admin.ts`), the genuine
secret-key/service-role client — confirmed by reading the file, not inferred from the name.
Bypasses RLS. Not a blocker.

## 2. What's tested already, and what genuinely isn't

`__tests__/universities/sync-us-universities.test.ts` covers `hasUniversityDataChanged` and
`hasStatisticsChanged` (the pure comparators deciding whether `last_changed_at` advances) —
both pass, both are real logic, neither touches Supabase. **Its own header says plainly: "the
surrounding fetch/upsert flow has no existing coverage and adding it is outside this package's
scope."** That was a deliberate prior scoping decision, not an oversight this pass discovered.

`__tests__/supabase/errors.test.ts` unit-tests `isUndefinedColumnError` directly, including the
exact regression this file exists for: a `PGRST204` response is matched, a `42703` is matched,
a differently-named missing column under either code is correctly rejected. This is real
coverage of the degrade-detection logic, mocked, no live DB, currently passing.

**What's not covered by anything, mocked or live: `syncOne`'s actual three-table read-then-write
sequence end to end.** I did not build that mock this pass. Building a faithful mock of a
three-table, multi-branch (insert vs. update vs. degrade-retry) Supabase query-builder chain is
real engineering effort in its own right, was explicitly out of scope for the test file that
already exists, and — most importantly — **would prove the mock is self-consistent, not that
the live database is.** The schema/type/enum/index/RLS cross-reference in §1 is the stronger
evidence for the actual question asked ("would it work against the live schema"), because it
checks the live schema directly rather than a stand-in for it.

## 3. The verdict, and what it isn't

**Every column the write path touches exists, with a compatible type. Every enum value is
valid. Both unique indexes the upserts depend on exist. The admin client bypasses RLS
correctly. The error-handling code destructures and correctly classifies both real-world
missing-column error codes.** On every axis a live database could reject this write, it now
would not — as far as static, schema-level verification can establish that.

**What this is not:** an execution. I did not call `syncOne`, `syncUsUniversities`, or the
`/api/jobs/sync-university-data` route — that would be a live write against real university
rows, which was explicitly out of bounds this pass, matching the same boundary already held on
the QA-row question earlier. Two things only an actual run can still tell you, honestly:
whether `collegeScorecardProvider.searchByName`'s real response shape (network call to a live
government API) matches what `syncOne` expects field-for-field — the provider's own contract,
untouched by anything that changed today — and whether the deployed environment actually has
`SUPABASE_SECRET_KEY`/`COLLEGE_SCORECARD_API_KEY` configured, which is a deployment fact, not a
code fact.

**The honest one-line answer: the write path is schema-compatible now, verified statically
across every axis that could reject it; whether it actually persists a change is a deploy-time
fact, not something this pass can or should manufacture proof of without a live write.**
