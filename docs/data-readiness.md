# Data Readiness

> **SUPERSEDED — do not use the counts below as current (noted 2026-08-17).** Every row
> count in this file is from Chat 4 and is now wrong: it reports 21 universities and 0
> opportunities, while the live database holds **1,010 universities** (1,009 with QS 2027
> ranks, 283 with sourced student counts) and **11 opportunities**. Current data state lives
> in the Drive doc *ORYN University & Opportunity Enrichment — Canonical Report*
> (`1jxIAa6_pMTTh8j7efTXYheGLzTzpwnt2NtwULQy85s8`). The coverage-gap analysis is in
> [cialfo-public-intelligence-audit.md](./cialfo-public-intelligence-audit.md).
> What *is* still accurate here: the root-cause credential analysis, the pipeline audit, and
> the fact that `external_sync_jobs` has never had a single row.

Chat 4. Real counts from the live dev database (`oryn-qa-scratch`, wired up as `.env.local`'s
backend this pass), queried directly — not estimated, not from memory. Re-run the queries
in "How to re-verify" below before trusting this document after any further data work.

**Update (autonomous pass, same day)**: a staged batch is ready to apply — real, sourced
records generated from the founder's own Google Drive corpus, not yet in the live
database (see "Staged batch" below). The summary table immediately below still describes
**only what's actually live right now**; do not read the staged-batch section as having
already happened to these numbers.

## Summary

| Dataset | Rows | Verified source | Status |
|---|---|---|---|
| Universities | 21 | 21/21 (official institution websites) | Identity-only |
| University programs | 0 | — | Not started |
| University requirements | 0 | — | Not started |
| University statistics | 0 | — | Not started |
| University deadlines | 0 | — | Not started |
| Opportunities (all categories) | 0 | — | Not started |
| `external_sync_jobs` | 0 rows, ever | — | Pipeline never run |

**The honest headline finding: this product currently has zero programs, zero
requirements, zero statistics, zero deadlines, and zero opportunities of any kind.**
`external_sync_jobs` having exactly 0 rows — not just 0 successful rows, 0 rows at
all — means the ingestion pipeline hasn't merely produced bad data; it has never
executed, not even once, successfully or otherwise, in any environment this product has
run in. This is a **root-cause, external-credential blocker**, detailed below — not a
code defect and not something more engineering effort alone closes.

## Root cause

`lib/opportunities/discover.ts`, `lib/requirements/discover.ts`, and
`lib/universities/sync-us-universities.ts` all require credentials this environment
doesn't have:

| Credential | Gates | Status |
|---|---|---|
| `TAVILY_API_KEY` | Opportunity discovery, requirement discovery (search step) | Missing |
| `ANTHROPIC_API_KEY` | Opportunity/requirement extraction, structuring (AI step) | Missing |
| `COLLEGE_SCORECARD_API_KEY` | U.S. university sync (programs, stats) | Missing |
| `CRON_SECRET` | Protects the job routes from unauthenticated triggering | Missing |

Per this pass's own operating rule, these are not requested in chat — they need to be set
in `.env.local` the same way `SUPABASE_SECRET_KEY` was (see `API_SETUP.md` for where each
one comes from). Once `TAVILY_API_KEY` + `ANTHROPIC_API_KEY` are present,
`POST /api/jobs/discover-opportunities` and `POST /api/jobs/discover-requirements` become
real, not theoretical — the pipeline code itself was audited this pass (see "Pipeline
audit" below) and has no known blocker besides these credentials.

## Universities: what's actually there

21 rows, added this pass specifically to close the "zero real data" gap without
fabricating anything (Rule 4/non-negotiable #21 — see `product-decisions.md`'s "Chat 4"
section for the full reasoning). Every row:

- Real institution, real official website (2 of the 21 — Boğaziçi and Sabancı — spot-
  verified live via a fetch of the actual official site during this pass; the rest are
  extremely well-known, unambiguous institutions whose official domains were not
  independently re-fetched, so treat those specific 19 as "confident but not
  individually re-verified this session," not "individually confirmed live").
- Has exactly one `university_sources` row (official-site, high confidence, retrieved
  this pass).
- Has **no** program, requirement, statistic, or deadline data — identity facts only
  (name, city, country, website, institution type). Nothing else is asserted.

**Country coverage**: Turkey (5), United Kingdom (5), United States (3), Netherlands (3),
Canada (2), Italy (1), Switzerland (1), France (1) — 8 countries, matching
`AGENTS.md`'s stated initial geography (USA/UK/Europe/Turkey) directly.

**Initial-market coverage** (Turkey-based student targeting international universities —
the founder's own stated first persona): 5 Turkish universities (Boğaziçi, METU, Bilkent,
Koç, Sabancı — the actual set this exact student profile would realistically consider or
benchmark against, not an arbitrary sample) plus 16 international targets across the
UK/Europe/US/Canada. This is a genuinely usable, if small, "explore where I could go"
starter set for that persona specifically — see the market test in
`docs/final-product-audit.md`'s Chat 4 addendum for whether it actually lands.

**What's still missing, in priority order for this exact market**:
1. Any France/Germany/Spain coverage beyond Sciences Po (AGENTS.md names France
   specifically for Parcoursup integration — not attempted this pass, no Parcoursup
   ingestion code exists yet either).
2. Programs, requirements, and deadlines for any of the 21 — a student can find a
   university today but cannot yet see what it requires or when it's due.
3. Admission statistics (never fabricated, never will be without a real source — U.S.
   institutions could get this from College Scorecard once keyed; non-U.S. institutions
   have no equivalent structured source identified yet, matching AGENTS.md section 8's
   own "no single European admissions API" warning).

## Opportunities: nothing to report

Zero rows, zero categories populated, zero sources. Not seeded this pass, deliberately —
unlike university identity (stable, near-permanently-correct facts), a real opportunity
needs a *current, verified deadline* to be trustworthy at all, and hand-curating a
plausible-sounding deadline without a live source-check is exactly the "fake precision to
look populated" failure mode section 21 of this pass's brief explicitly forbids. This
dataset is 100% blocked on `TAVILY_API_KEY` + `ANTHROPIC_API_KEY` — there is no safe
manual-curation path around it the way there was for university identity facts.

## Pipeline audit (code-level, not run — no credentials to run it against)

Read `lib/opportunities/discover.ts`, `lib/requirements/discover.ts`,
`lib/opportunities/dedup.ts`, `lib/requirements/dedup.ts` this pass:

- **Search → candidate → extract → normalize → dedupe → store** matches the intended
  pipeline shape. Dedup is unit-tested (`__tests__/opportunities/dedup.test.ts`,
  `__tests__/requirements/dedup.test.ts`) against normalized-title + URL similarity.
- **Verification/moderation state**: opportunities get a `status` (`active`/`expired`/
  `under_review`/`disabled`) and `source_confidence`, but nothing in the current pipeline
  code sets a *new* discovery to `under_review` before it's queryable — it's stored
  directly as `active`. Given the pipeline has never run, this has never mattered in
  practice, but it means "moderation before publish" is not currently enforced in code,
  only possible via the admin panel's manual disable. Flagged in `known-issues.md` as a
  pre-launch item, not fixed this pass (would need product input on what the review
  queue/admin UX should look like — out of scope for "focused additions").
- **Prompt injection**: already fixed in Chat 3 (`<page_content>` delimiting +
  explicit untrusted-data instruction in both extraction system prompts) — re-confirmed
  present in the current file versions, not re-litigated this pass.
- **Retry/malformed-output handling**: both extraction functions go through
  `generateStructured`, which Zod-validates and retries once on schema failure (Phase 26)
  — unchanged, still correct.
- **Cost bounding**: `discover-requirements` is capped at 5 universities/run
  (`lib/requirements/discover.ts`); `discover-opportunities` was not re-audited for its
  own per-run cap this pass — worth a quick check before the first real run once keys
  exist, not a launch blocker given `ai_usage` logging + the AI rate limiter both remain
  in place regardless.

**Conclusion: the pipeline is architecturally ready. It has simply never been run.**

## Staged batch: founder's Google Drive corpus (autonomous pass, not yet applied)

While the founder was away, this session found a real, already-verified data corpus in
their Google Drive ("ORYN Database" folder, owned by their school account) — a prior
research pass (same day) had cross-checked school-counselor documents against official
institution/provider pages and split every record into `Verified`/`2026 cycle confirmed`
vs. `Review`/`Rejected` (kept out). Full methodology, corpus inventory, and the reusable
extraction pipeline: `scripts/drive-import/README.md`.

**This session has no working `SUPABASE_SECRET_KEY`** (still the placeholder — see
`.env.local`'s own header, unchanged since Chat 3), so none of this was written to the
live database. Instead, `scripts/drive-import/{parse,generate_sql}.py` transformed it into
`supabase/seed_drive_batch1.sql` — a plain, idempotent SQL file, reviewed by hand (not a
rubber-stamped code-gen output — see "how this was checked" below), ready for the founder
(or a future session with the key) to apply via the Supabase SQL editor or `psql`/CLI.
Requires `supabase/migrations/0028_program_requirement_dedup_indexes.sql` applied first
(adds two unique indexes the seed file's `ON CONFLICT` clauses depend on — safe to add
now specifically because this document's own live audit already confirmed both tables are
currently empty).

| Dataset | Staged rows | Notes |
|---|---|---|
| Universities | 31 new (of 50 in the corpus) | 19 already existed from the prior 21-university seed; matched by `(lower(name), country)`, never duplicated |
| University programs | 189 | Bachelor/first-cycle only, across all 50 (new + pre-existing) universities |
| University requirements | 520 | Pivoted from 192 verified programme-level rows into ORYN's one-row-per-requirement-type shape; `structured_rule` left `NULL` (admin-review-only, per migration 0020) |
| Opportunities | 273 | 125 `active`, 147 `under_review` (identity verified, current-cycle date not confirmed — never shown with a fabricated deadline), 1 `expired` |

**How this was checked, not just generated**: every row's parsed count was cross-validated
against that source file's own README-stated "Verified identity records" count before
being trusted (all matched exactly — 199 Summer Programs, 54 Competitions, 189 Programs,
200 Requirements, 50 Universities). The generated SQL was checked for enum-quoting
correctness, parenthesis/quote balance, and apostrophe-escaping (e.g. "King's College
London") programmatically, then spot-read by hand. No date was ever parsed out of free
text into a `deadline` column — a wrong guess there is exactly the false-precision failure
this document's own "Opportunities: nothing to report" section above already refuses to
do for the same reason.

**What this batch deliberately leaves out** (see `scripts/drive-import/README.md`'s "Known
limitations" for the full list): `country`/`eligible_countries`/`age`/`cost` on
opportunities (the source text doesn't reliably map to these without guessing), any
requirement's `structured_rule`, and university admission statistics — all still `NULL`/
unset, consistent with this document's own standing "never fabricate" rule.

**Founder action to make this live**: see `docs/founder-environment-unblock-runbook.md`
steps 3–4 and 8–9 for the exact sequence with pre/post-check SQL — in short, `0028` then
`0032` then this file, in that order. (**2026-08-16 correction**: the seed file's
`university_requirements` insert originally used an `ON CONFLICT` clause that didn't
match 0028's partial unique index — applying it as first written would have errored the
entire 520-row requirements section. Found and fixed by reproducing the exact failure
against a real local Postgres before trusting the fix; see
`docs/migration-safety-audit-0028-0031.md`'s "0032" section for detail. The file is
correctly idempotent now, not before.)

## Ingestion pipeline gaps found auditing sync/import code (2026-08-16)

Three real bugs found reading `lib/universities/sync-us-universities.ts`,
`lib/opportunities/discover.ts`, and the drive-import scripts — all fixed the same pass,
detail in the commit and `docs/migration-safety-audit-0028-0031.md`:

- **Silent overwrite**: the university sync job's update payload hardcoded
  `description`/`logo_url`/`selectivity`/`latitude`/`longitude` to `null` on every
  re-sync of an *existing* university, wiping any admin-entered or future-geocoded value
  back to null. Fixed by excluding those fields from the update path entirely.
- **Unbounded duplication**: `university_statistics` and `university_sources` had no
  unique constraint, so re-running the sync job for the same school appended a new row
  every time instead of updating in place. Migration `0032` adds the missing indexes;
  the sync code now upserts against them.
- **Unknown silently became false**: `opportunities.remote_allowed`/`.funding_available`
  were `not null default false`, so the AI extraction step
  (`lib/ai/opportunity-extraction.ts`) had no way to represent "the page didn't say" —
  it was structurally forced to guess. Migration `0032` makes both columns nullable;
  the extraction schema now allows (and is instructed to prefer) `null`.

**Dead schema, found the same pass** (present in migrations/types, never read by any
`app/`/`features/` file — not bugs, just worth knowing before spending effort populating
them): `universities.selectivity`/`external_ids`/`data_confidence`/`data_status`/
`last_checked_at`/`last_changed_at`; `universities.latitude`/`longitude` specifically —
added by migration `0016` "for the map-based university exploration view," but
`features/universities/world-map-explorer.tsx` actually positions countries from a
static lookup table (`lib/data/country-geo.ts`), never these per-university columns;
several `university_programs`/`university_statistics`/`university_requirements` columns
(`duration_years`, `tuition_amount`/`tuition_currency`, `language_of_instruction`,
`stat_year`, `sat_range_*`, `act_range_*`, `graduation_rate`, most `data_confidence`/
`retrieved_at` columns). None of this blocks anything — populating them later is additive
UI work, not a schema change.

**Admission outlook is genuinely deterministic, not AI-invented** — confirmed by reading
`lib/admissions/outlook.ts`/`explain.ts` and `lib/requirements/evaluate.ts`: no AI call
exists anywhere in the eligibility/outlook computation path. The only place AI touches
requirements at all is upstream and admin-gated (`lib/ai/interpret-requirement.ts`,
wired to the admin-only requirement form) — it *suggests* a structured rule for a human
to review before it's ever saved; it never asserts an eligibility fact at evaluation
time. This is the architecture `AGENTS.md` asks for (verified facts → deterministic rule
→ explanation), not a gap.

**Opportunity data model — schema gaps against the full "ideal opportunity" field list**
(none of these block launch; the schema supports every currently-populated field
correctly): no dedicated `grade_level` column (only `minimum_age`/`maximum_age`); no
explicit "international eligibility" boolean (inferred only from an empty
`eligible_countries` array); `remote_allowed` is binary, no hybrid option; no
application-*open* date (only `deadline`/`start_date`/`end_date`); no `selectivity`
column on `opportunities` (exists only on `universities`); and no per-opportunity
requirements list (essay/recommendation/transcript/test-score) — `university_requirements`
has no `opportunities` analog. `OpportunityCard` (the only component that renders an
opportunity) also currently displays just `title`/`organization`/`description`/
`official_url`/`deadline` — every other populated column (`category`, `country`,
`fields`, `cost`, `funding_available`, `remote_allowed`, dates, source fields, `status`)
is fetched but not shown. Not fixed this pass (UI/schema expansion, not a bug) —
documented here as backlog, not attempted.

## How to re-verify

```sql
select 'universities' t, count(*) from public.universities
union all select 'university_programs', count(*) from public.university_programs
union all select 'university_requirements', count(*) from public.university_requirements
union all select 'opportunities', count(*) from public.opportunities
union all select 'external_sync_jobs', count(*) from public.external_sync_jobs;
```

Run against whichever Supabase project `.env.local` currently points at.
