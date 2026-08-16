# Founder Environment Unblock Runbook

Exact sequence to take ORYN's dev/QA environment from its current blocked state to
browser-QA-ready. Written so each step can be done independently and verified before
moving to the next — do not skip a post-check because the previous one looked fine.

No credential values appear anywhere in this document. Nothing here is destructive: every
migration in this range is additive only (new columns, new indexes, one new RLS policy, a
publication membership change, and two `NOT NULL`/`DEFAULT` drops on columns confirmed
empty live — see `docs/migration-safety-audit-0028-0031.md` for 0028–0031; 0032 is
covered inline below, verified against a real local Postgres instance during the
2026-08-16 audit that found the bug it fixes), and the seed step uses `on conflict do
nothing` throughout.

Run all SQL in the Supabase dashboard's SQL Editor for the `oryn-qa-scratch` project,
unless you have the CLI linked (`npx supabase link --project-ref <ref>`), in which case
`npx supabase db push` applies every pending migration in order in one step — steps
3–9's individual apply instructions are for the SQL-editor path; the pre-checks and
post-checks are useful either way.

---

## 1. Disable email confirmation (QA project only)

Supabase dashboard → Authentication → Sign In / Providers → Email → turn **"Confirm
email" off**. Also confirm Site URL / Redirect URLs includes `http://localhost:3000`.

**Why first:** every other step can be done without this, but no browser QA (step 13)
can start until this is off — do it first so the rest of the runbook can be completed in
one sitting without waiting on a dashboard change to propagate.

**Verify:** Authentication → Providers → Email should show "Confirm email" as disabled.

---

## 2. Add `SUPABASE_SECRET_KEY`

Project Settings → API → copy the **secret** key (not the publishable key). Add it to
`/Users/direncagankirik/Desktop/Founder/ORYN/.env.local` as `SUPABASE_SECRET_KEY=...`.

**Why second:** steps 4–9's post-checks, and the admin panel in step 12, all need this.

**Verify (no value printed):**
```bash
npm run check:integrations
```
Should show `Supabase (secret key)   OK` (currently `Missing credential`).

---

## 3. Migration 0028 — pre-check (duplicate safety)

0028 adds two unique indexes. It will fail cleanly (transaction rolls back, nothing
corrupts) if either table already has duplicate rows — but check first rather than
relying on that safety net.

```sql
select university_id, lower(name), count(*)
from public.university_programs
group by 1, 2 having count(*) > 1;

select program_id, requirement_type, count(*)
from public.university_requirements
where program_id is not null
group by 1, 2 having count(*) > 1;
```

**Expected result:** both queries return **0 rows**. If either returns rows, stop —
resolve the duplicates before proceeding (do not apply 0028 with duplicates present).

## 4. Migration 0028 — apply and verify

Apply: paste the contents of `supabase/migrations/0028_program_requirement_dedup_indexes.sql`
into the SQL editor and run it (or `supabase db push` if linked).

**Post-check:**
```sql
select indexname from pg_indexes
where indexname in ('university_programs_university_name_idx', 'university_requirements_program_type_idx');
```
**Expected result:** **2 rows** (both index names present).

---

## 5. Migration 0029 — apply and verify

Adds `story_notes text` to 7 tables. This is what unblocks the Essay Story Bank and —
more importantly — every achievement save across Activities/Projects/Awards/Research/
Volunteering/Work/Sports, all of which currently fail with a (now user-friendly, but
still failing) error because their Zod schemas unconditionally include `story_notes`.

**Pre-check (confirms it's not already applied — expect 0 rows):**
```sql
select table_name from information_schema.columns
where column_name = 'story_notes'
  and table_name in ('activities','projects','awards','research_experiences','volunteering_experiences','work_experiences','sports_experiences');
```

Apply: paste `supabase/migrations/0029_story_notes.sql` into the SQL editor and run it.

**Post-check (same query):**
**Expected result:** **7 rows** — one per table.

---

## 6. Migration 0030 — apply and verify

Adds moderation columns + one new RLS policy to `message_reports`. This also unblocks
the `message_reports` section of the data export (`/api/export-data`), which returns
empty for that table until this policy exists.

**Pre-check (expect 0 rows):**
```sql
select column_name from information_schema.columns
where table_name = 'message_reports' and column_name = 'status';
```

Apply: paste `supabase/migrations/0030_moderation.sql` into the SQL editor and run it.

**Post-check:**
```sql
select column_name from information_schema.columns
where table_name = 'message_reports'
  and column_name in ('status', 'reviewed_by', 'reviewed_at', 'resolution_note');

select policyname from pg_policies
where tablename = 'message_reports' and policyname = 'select own filed reports';
```
**Expected result:** first query returns **4 rows**, second returns **1 row**.

---

## 7. Migration 0031 — apply and verify

Adds `messages` to the `supabase_realtime` publication — required for the messaging
thread's live-update (no manual reload) to work. No RLS change; a client still only ever
receives events for rows it could already `SELECT`.

**Pre-check (expect 0 rows):**
```sql
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and tablename = 'messages';
```

Apply: paste `supabase/migrations/0031_messages_realtime.sql` into the SQL editor and run it.

**Post-check (same query):**
**Expected result:** **1 row**.

---

## 8. Migration 0032 — apply and verify

Added 2026-08-16, auditing the sync/import pipeline. Adds unique indexes to
`university_statistics`, `university_sources`, and `opportunity_sources` (all three
currently have none — a re-run of the university sync job duplicates rows indefinitely
instead of updating in place; fixed in the same pass in
`lib/universities/sync-us-universities.ts`, now using `upsert` against these indexes).
Also drops `NOT NULL`/`DEFAULT` on `opportunities.remote_allowed` and
`.funding_available`, so "the source page didn't say" can be stored as `null` instead of
silently becoming `false` (`lib/ai/opportunity-extraction.ts` already emits `null` in
this case, but the column previously couldn't store it).

**Pre-check (expect 0 rows — confirms it's not already applied):**
```sql
select indexname from pg_indexes
where indexname in (
  'university_statistics_university_year_idx',
  'university_sources_university_url_idx',
  'opportunity_sources_opportunity_url_idx'
);
```

Apply: paste `supabase/migrations/0032_ingestion_dedup_and_unknown_fields.sql` into the
SQL editor and run it.

**Post-check:**
```sql
select indexname from pg_indexes
where indexname in (
  'university_statistics_university_year_idx',
  'university_sources_university_url_idx',
  'opportunity_sources_opportunity_url_idx'
);

select column_name, is_nullable from information_schema.columns
where table_name = 'opportunities' and column_name in ('remote_allowed', 'funding_available');
```
**Expected result:** first query returns **3 rows**; second returns **2 rows**, both
with `is_nullable = 'YES'`.

---

## 9. Apply the staged seed batch and verify row counts

`supabase/seed_drive_batch1.sql` is real, sourced university/program/requirement/
opportunity data (not fixtures), staged since an earlier pass and never yet run against
any Postgres. **Apply after 0028 and 0032 specifically** — its `university_requirements`
insert's `on conflict` clause was fixed (2026-08-16, empirically verified against a real
Postgres 17 instance) to match 0028's partial unique index exactly; applying this file
against a database missing 0028 would error the entire requirements section (`there is
no unique or exclusion constraint matching the ON CONFLICT specification`).

It's `on conflict do nothing` throughout, so it's safe to run even if some rows already
exist — but that also means the exact row counts below are a **ceiling** (how many
insert attempts the file makes), not a guarantee, if anything already overlaps.

**Pre-check (current state):**
```sql
select 'universities' as t, count(*) from public.universities
union all select 'university_programs', count(*) from public.university_programs
union all select 'university_requirements', count(*) from public.university_requirements
union all select 'opportunities', count(*) from public.opportunities;
```
Expected before applying: `universities` around 21 (per `docs/data-readiness.md`'s last
live count), everything else at or near 0.

Apply: paste the full contents of `supabase/seed_drive_batch1.sql` into the SQL editor
and run it. It's long (~1,350 lines) — this may take a few seconds.

**Post-check (same query as pre-check).**
**Expected result:**
- `universities`: increases toward ~50 total (the file's own comment: "189 verified
  Bachelor/first-cycle programs across all 50" universities — some of the 31 new rows
  may already exist from the original 21, in which case the final total is lower than
  21+31).
- `university_programs`: increases by up to 189.
- `university_requirements`: increases by up to 520.
- `opportunities`: increases by up to 273.

If any of these is 0 after applying, something failed silently — check the SQL editor's
output for errors before moving on.

---

## 10. Add `ANTHROPIC_API_KEY`

[console.anthropic.com](https://console.anthropic.com) → API Keys. Add to `.env.local`
as `ANTHROPIC_API_KEY=...`. Optionally also `TAVILY_API_KEY`, `COLLEGE_SCORECARD_API_KEY`,
and a generated `CRON_SECRET` (`openssl rand -hex 32`) — see
`docs/environment-variables.md` for what each unlocks and `API_SETUP.md` for where to
get them.

**Verify:**
```bash
npm run check:integrations
```
Should show `Anthropic   OK`.

---

## 11. Create two QA user accounts

With step 1 done (email confirmation off), signup returns a live session immediately —
no email needed. Through the browser (not SQL):

1. `npm run dev`, go to `/signup`, create Account **A** (any email/password), complete
   onboarding.
2. Repeat in a private/incognito window (or a second browser profile — not a second tab
   of the same session) for Account **B**.

Do **not** use `supabase/tests/*_manual.sql`'s inserted test users for this — those write
directly into `auth.users` with no GoTrue identity or password, so they can't be logged
into through the browser.

**Verify:**
```sql
select id, email, created_at from auth.users order by created_at desc limit 2;
```
**Expected result:** 2 rows, both recent.

---

## 12. Grant yourself `is_admin`

Only needed to QA `/admin` (moderation queue, provider health, job triggers) — no UI
grants this flag.

```sql
update public.profiles set is_admin = true where id = '<your own auth.users id>';
```

**Verify:**
```sql
select id, is_admin from public.profiles where is_admin = true;
```
**Expected result:** at least 1 row — yours.

---

## 13. Browser QA

Everything above unblocks this. Use `docs/browser-qa-checklist.md` as the executable
checklist — work through it top to bottom with Accounts A and B from step 11, recording
PASS/FAIL/BLOCKED and evidence per row rather than assuming success.
