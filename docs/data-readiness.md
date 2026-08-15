# Data Readiness

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

**Founder action to make this live**: open the Supabase SQL editor for the linked
project, run `supabase/migrations/0028_program_requirement_dedup_indexes.sql`, then
`supabase/seed_drive_batch1.sql`. Both are idempotent — safe to run once, and safe to
re-run if interrupted partway through.

## How to re-verify

```sql
select 'universities' t, count(*) from public.universities
union all select 'university_programs', count(*) from public.university_programs
union all select 'university_requirements', count(*) from public.university_requirements
union all select 'opportunities', count(*) from public.opportunities
union all select 'external_sync_jobs', count(*) from public.external_sync_jobs;
```

Run against whichever Supabase project `.env.local` currently points at.
