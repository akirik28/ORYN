# Founder-Blocked Backlog

Canonical, single list of everything left that needs founder/dashboard/credential/legal
access — nothing here is a code task an agent session can finish itself. When this list
is empty, ORYN is unblocked. Cross-referenced from every other doc that used to repeat
this information; update here first, not in five places.

Each item: **exact action**, **why it's blocking**, **what it depends on**.

> **Numbering is discovery order, not priority.**
>
> **Superseded 2026-09-01.** This header used to name items **36** and **30** as the two
> highest-priority, "live now." Both were verified closed in the database on 2026-09-01 and are
> struck below — the guard trigger and the `auth.uid()` view predicate are live, checked by
> reading their definitions rather than this file. Item **29** and most of item **33** went the
> same way the same evening.
>
> **The lesson is in the header itself**: this pointer stayed wrong for days because every pass
> that "confirmed" those items re-read *this document* instead of querying the database, so the
> file became its own authority. A `CRITICAL` label made re-deriving feel unnecessary, which is
> exactly backwards. **Before acting on any entry here, probe the live schema object.**
>
> Nothing on this list expires — but entries do get quietly fixed by other work, and this file
> is the last place to find out.

> Looking for *what to do first*, not *the full list*? **[FOUNDER-START-HERE.md](./FOUNDER-START-HERE.md)**
> sequences the subset that actually gets the app running, in order, with expected results.
> This file stays the complete inventory — including the optional and later-stage items
> that ordered path deliberately leaves out.

---

## 1. Disable "Confirm email" (QA project)

**Action**: Supabase dashboard → Authentication → Sign In / Providers → Email → turn
"Confirm email" off, on the QA project only. Confirm Site URL / Redirect URLs includes
`http://localhost:3000`.
**Blocks**: every browser-QA step in `docs/browser-qa-checklist.md` — signup returns no
usable session without this, since no email provider exists in this repo to receive a
confirmation link.
**Depends on**: nothing — the single highest-leverage unblock, do this first.

## 2. Add `SUPABASE_SECRET_KEY`

**Action**: Supabase dashboard → Project Settings → API → copy the secret key → add to
`.env.local` as `SUPABASE_SECRET_KEY=...`.
**Blocks**: notifications, product analytics, account deletion, peer benchmarking, all
four background jobs, the entire `/admin` panel (including the new moderation Reports
section), and applying/verifying migrations 3–5 below via `npm run check:integrations`.
**Depends on**: nothing.

## 3. Apply migrations 0028 → 0032, in order

**Status (2026-08-16, Professional Profile pack session)**: `0029` (story_notes columns)
is now applied to `oryn-qa-scratch` via the Supabase MCP tools directly from this
session — confirmed additive/safe per this file's own reasoning, applied with no schema
conflicts. **Do not re-run 0029 against `oryn-qa-scratch`** — this status is specific to
that one project (project ref `qtcvcflzxbuagvvwahhu`); a different project (a fresh QA
project, staging, production) starts from its own actual state, always confirm via the
runbook's own pre-check rather than assuming this note carries over. `0028`, `0030`,
`0031`, `0032` are **still not applied**: the very next
`apply_migration` call (0028) was refused by Claude Code's own auto-mode safety
classifier ("Blocked by classifier"), and a subsequent read-only `list_migrations` call
was refused for the same reason — the classifier appears to gate the whole Supabase
MCP-write category in this session, not just the specific 0028 statement, so retrying
individual migrations wasn't attempted further per the tool's own instruction not to work
around a denial. **Unblock**: the user needs to grant this session (or a future one) an
explicit Bash/MCP permission rule for Supabase migration application — see the denial
message's own suggestion ("add a Bash permission rule to their settings") — after which
0028, 0030, 0031, 0032, and this pack's own 0033–0037 (item 16 below) can all be applied
in one sitting following the runbook.
**Action**: follow `docs/founder-environment-unblock-runbook.md` steps 3–8 for the
remaining `0028`, `0030`, `0031`, `0032` — each has its own pre-check/apply/post-check
SQL. Do not skip a post-check.
**Blocks**: `0028` blocks safe re-running of the university program/requirement seed
(no dedup index yet). `0030` blocks the moderation panel and `message_reports` export.
`0031` blocks realtime message updates (recipient must reload). `0032` blocks safe
re-running of
the university sync job and honest null-handling on two opportunity fields.
**Depends on**: item 2 (secret key, for the post-checks) — the SQL editor itself doesn't
need it, but verifying each step does.

## 4. Apply `supabase/seed_drive_batch1.sql`

**Action**: runbook step 9, **after** 0028 and 0032 specifically (its
`university_requirements` insert depends on 0028's index; the fix that makes this safe
was verified against a real local Postgres this pass — see
`docs/migration-safety-audit-0028-0031.md`).
**Blocks**: university discovery, opportunities, and admission-outlook pages are
otherwise empty (21 identity-only universities, 0 programs/requirements/opportunities).
**Depends on**: item 3.

## 5. Add `ANTHROPIC_API_KEY`

**Action**: [console.anthropic.com](https://console.anthropic.com) → API Keys → add to
`.env.local`.
**Blocks**: AI Advisor (never once run against a live model), weekly plan generation, CV
extraction at onboarding, achievement refinement, research-project generation, Essay
Story Bank outline generation, opportunity/requirement extraction (also needs item 6),
and the admin-only "suggest a rule" AI assist on the requirement form.
**Depends on**: nothing.

## 6. Add `TAVILY_API_KEY` (optional) — key present, plan usage limit now exceeded

**Status (2026-08-17, University Intelligence Spine continuation)**: the key itself is
configured and was working all session (drove `admissions_url`/`application_system`
acquisition from ~36% to 40% coverage across 1,019 universities). A subsequent batch then
hit `HTTP 432` from `api.tavily.com/search`: `{"detail":{"error":"This request exceeds
your plan's set usage limit. Please upgrade your plan or contact support@tavily.com"}}`.
Confirmed with a direct `curl` against the API, not just the acquisition script — this is
Tavily's own plan-level usage cap, not a bug in this repo, not rate-limiting (which the
acquisition script already handles and retries around), and not something a code change
can work around. Per this repo's own standing rule against building unsafe substitutes to
route around a billing/credential blocker, no fallback heuristic was built — remaining
`admissions_url`/`application_system` acquisition (currently 413 universities still
missing `admissions_url`) and the OpenAlex-adjacent research-topic work both stay paused
on this specifically until the plan resets or is upgraded.
**Action**: [tavily.com](https://tavily.com) dashboard → check current plan's usage
window/reset date, or upgrade the plan → add/confirm `TAVILY_API_KEY` in `.env.local`.
**Blocks**: the opportunity-discovery and requirement-discovery background jobs, and (as
of this pass) all further `acquire:admissions` batches until the limit resets or the plan
is upgraded — everything else works without it.
**Depends on**: item 5 also needed for the two background jobs (search + AI-structure both
required); not needed for `acquire:admissions`, which is Tavily-only by design.

## 7. Add `COLLEGE_SCORECARD_API_KEY` (optional)

**Action**: free, instant self-serve key at
[api.data.gov/signup](https://api.data.gov/signup/) → add to `.env.local`.
**Blocks**: the U.S. university sync job only (`sync-university-data`).
**Depends on**: nothing.

## 8. Add `CRON_SECRET` (needed only if scheduling the background jobs)

**Action**: `openssl rand -hex 32` → add to `.env.local` and to whatever scheduler calls
the four `/api/jobs/*` routes.
**Blocks**: nothing by default — `verifyCronRequest` is fail-closed, so the jobs simply
refuse every request until this is set (the correct default, not a bug). Only matters
once you actually want the jobs to run on a schedule rather than via the admin panel's
manual triggers.
**Depends on**: a hosting/scheduler decision (item 14) if you want it automated rather
than manually triggered from `/admin`.

## 9. Create two real QA accounts

**Action**: runbook step 11 — sign up Account A and Account B through the actual
browser at `/signup`, in two separate sessions.
**Blocks**: all of `docs/browser-qa-checklist.md`.
**Depends on**: item 1. Do **not** substitute `supabase/tests/*_manual.sql`'s inserted
test users — those have no GoTrue identity, can't log in through the browser.

## 10. Grant yourself `is_admin`

**Action**: `update public.profiles set is_admin = true where id = '<your auth.users id>';`
in the SQL editor.
**Blocks**: QA of `/admin` (moderation queue, provider health, job triggers) — no UI
grants this flag by design.
**Depends on**: item 9 (need your own account to exist first).

## 11. Product decision: Drive-doc conflict (messaging scope + visual theme)

**Action**: read `docs/known-issues.md`'s "Needs founder decision" section in full, then
say explicitly which is correct — the founder's own Drive planning doc (no DMs, light
theme) or the later same-day chat instructions that were actually built (messaging kept,
dark theme kept).
**Blocks**: nothing functionally today (the chat-instructed versions are what's live and
working), but this is a real, unresolved contradiction in the founder's own stated intent
that no session should keep guessing on indefinitely. If the doc is actually correct: the
messaging feature needs removing (schema, RLS, UI, nav — a real, scoped effort) and the
entire design system needs reworking toward light/white (also real, scoped).
**Depends on**: nothing — pure founder judgment call, still open as of 2026-08-16.

## 12. Product decision: suspension/ban mechanism for moderation

**Action**: decide what "suspended" means (duration, appealable how, what it blocks) —
then it's a real, scoped implementation task, not a column.
**Blocks**: the moderation panel (built, migration `0030`) currently supports
status-tracking and a resolution note, but has no actual punitive action beyond that —
an admin can mark a report reviewed but can't suspend or ban the reported user.
**Depends on**: nothing — deliberately scoped out of the minimum-viable moderation pass
pending this decision.

## 13. Professional legal review (COPPA/GDPR-for-minors)

**Action**: commission a lawyer review of the minor-safe/privacy engineering posture
described in `SECURITY.md`.
**Blocks**: any real minor signing up in production.
**Depends on**: nothing — required regardless of engineering state.

## 14. Hosting platform + deploy configuration

**Action**: choose a host (Vercel, etc.), connect the production Supabase project,
configure environment variables there, deploy, set up the custom domain.
**Blocks**: any real launch. Not attempted by any session so far — explicitly out of
scope per the founder's own earlier instruction.
**Depends on**: items 1–8 done against the *production* Supabase project, not just QA.

## 15. Error-monitoring provider (Sentry or equivalent)

**Action**: pick a provider, wire it in.
**Blocks**: nothing today, but every error currently goes to `console.error` and
vanishes in a serverless environment — messaging/social failures post-deploy would be
invisible without this.
**Depends on**: item 14 (needs a real deploy target to be worth setting up).

## 16. ~~Apply migrations 0033 → 0037 (Professional Profile & Networking Pack)~~ — RESOLVED 2026-08-17

**Applied to `oryn-qa-scratch`**, along with `0028` and `0030`–`0032`, which had also
never been applied. `contact_info`, `featured_items`, `skill_endorsements`,
`recommendations`, `profile_views` and `profiles.headline/about/open_to/show_gpa` now
exist.

`0037` had to be fixed first: it used `create or replace view`, which Postgres only allows
to *append* columns, so inserting `headline`/`about` next to `display_name` failed with
`42P16: cannot change name of view column "country" to "headline"` — on live and on any
fresh database. It now drops and recreates the view and re-issues its grant.

Still not exercised in a browser: the code paths for these features have never served a
real signed-in request. See the Phase 12 note in `docs/live-db-reconciliation.md`.

## 16b. Decide whether Education (and therefore GPA) appears on the public profile

**Action**: decide, as a product/minor-safety call, whether a student's public `/u/[id]`
profile may show an Education section — school name, and GPA behind the existing
per-student `profiles.show_gpa` opt-in.
**Why this is blocked, not built**: two parts of the product currently contradict each
other, and reconciling them is a disclosure decision about minors, not a wiring task.
`docs/product-decisions.md` records a deliberate choice that the public portfolio omits
the `education` category entirely, reasoning that "a public GPA/school-name toggle feels
like a materially bigger disclosure... worth a deliberate look, not an oversight";
`school_name` is likewise on `public_profiles`' forbidden-column list and regression
tested as such. Migration `0033` then added `profiles.show_gpa` with a comment promising
GPA "is only ever shown on the public profile when this is true" — a promise nothing can
keep while education isn't public at all.
**What was done instead (2026-08-16)**: the owner-facing "Show my GPA on my public
profile" checkbox has been withheld from the UI, because a control that silently does
nothing is a worse defect than a missing one. The column, the Server Action path, and any
value already stored are untouched, and `updateProfessionalIdentity` no longer writes the
field, so an unrelated headline/About save can't reset it. Nothing about GPA privacy
changed; GPA remains not publicly exposed.
**To unblock**: say yes or no. If yes, the wiring is small — include `education` in
`getPublicPortfolio`, strip `meta` (the "GPA x/y" string) unless `show_gpa`, add
`school_name` to the public column set, and restore the checkbox. If no, drop the
`show_gpa` column in a future migration and this item closes.
**Depends on**: nothing technical — a founder decision, and plausibly a legal review
touchpoint given the minor-safety framing (item 13).

## 17. ~~Apply migration 0038 + seed_entities_drive_batch1.sql~~ — RESOLVED 2026-08-17

**Closed by the live-database reconciliation.** Both artefacts named here are gone.

`0038_canonical_institutions.sql` was never applied to anything and has been deleted: the
live project already carried a richer canonical registry (`canonical_entities` and nine
supporting tables), built directly against the project and never committed. Applying 0038
would have created a second, competing identity system. The repo now converges on the
live design — see `docs/live-db-reconciliation.md` for the full trace.

`seed_entities_drive_batch1.sql` was deleted too, and replaced by
`supabase/seed_canonical_delta.sql`, which is a genuine delta rather than a replay: the
Drive pack's 54 schools and 77 universities were already live (14 of those universities
under a QS-style parenthetical name, so inserting them would have created real
duplicates), leaving 17 organizations actually missing. Those 17 are imported.

`npm run entities:backfill-report` still needs `SUPABASE_SECRET_KEY` to run — that part of
this item stands, and moves to item 3's credential ask.

## 18. Enable leaked-password protection (Supabase Auth)

**Action**: turn on "Leaked password protection" in the Supabase Auth dashboard
(Authentication -> Policies). It checks new passwords against HaveIBeenPwned.
**Why it's blocked**: it is a project setting, not schema — no migration can enable it,
and it is not exposed through the MCP tooling.
**Blocks**: nothing functional. It is the one security-advisor finding from the
reconciliation that cannot be fixed in code.

## 19. Decide what to do about 43 duplicate university identities

**Status (2026-08-17, University Intelligence Spine pass)**: investigated in full, not
resolved. Every one of the 43 turns out to be an **orphan** duplicate — one side of each
pair has zero linked `universities` rows (never enriched, no website, no external ids,
`official_verified` with no evidence — see item 20), so there is **no visible product
impact** (the University Explorer reads `universities`, not `canonical_entities` directly;
an orphan with no `universities` row never renders a card). Registry-cleanliness issue, not
a user-facing bug. A second pass (article/parenthetical-acronym-aware name matching, which
`canonical_entities.normalized_name`'s own DB trigger doesn't do) found 28 *more* pairs of
the same shape, of which exactly 8 (now merged — see item 25) turned out to have two real
`universities` rows instead of one. Full dossier, evidence, and the reusable detector:
`docs/handoffs/claude-a-university-spine.md`, `npm run audit:university-duplicates`.
**Action**: review the remaining ~63 orphan pairs (43 + 28 − 8 merged) sitting in
`entity_verification_queue` with `blocker='possible_duplicate'` (or found live by the
detector above), and for each either merge with `merge_canonical_entities(source, target,
reason)` or give the two rows distinct city/country values.
**Why it's blocked**: they are almost certainly the same institution ingested twice with
differently-written cities ("Boston" vs "Boston, MA"), but "almost certainly" is not the
bar for merging real entities, and a name-similarity heuristic must never run unattended.
Each needs a human to confirm against an official source (or, per the detector's own SAFE
bar, a matching ROR id once the orphan side ever gets external ids acquired for it).
**Blocks**: nothing today — duplicates make search noisier, not wrong.

## 20. ~~Decide what `official_verified` means for 78 university entities~~ — RESOLVED 2026-08-17

**Downgraded all 73 live evidence-less entities to `source_verified`** (`npm run
audit:verification-state -- --fix-downgrade`, `scripts/verification-state-audit.ts`).
Confirmed at the time: 0/73 `official_verified` university entities had any `entity_evidence`
row — not 78 (the live count had drifted down to 73 by the time of this pass, some tombstoned
by the item-25 merges below). One direction only, never upgrades — attaching real evidence
and re-verifying specific institutions from an official source remains a real, separate,
not-yet-done task if `official_verified` is wanted back for any of them. Re-run confirms 0
university entities currently claim `official_verified` with no evidence.

## 21. Written licensing position on QS ranking data

**Action**: get an explicit answer — from QS directly, or from counsel — on whether ORYN
may display QS rank positions to students in a public product, and under what attribution.
**Why it's blocked**: `university_rankings` already holds 1,009 QS 2027 rows, and the
Explorer card renders "QS #N" today. Rankings are a commercial publication, not open data;
"we cited the source" is not the same as "we have the right to redistribute it at scale."
This is a rights question, not an engineering one.
**Blocks**: nothing in development. It blocks *public launch* of the university surface as
currently built. Raised by `docs/cialfo-public-intelligence-audit.md`.

## 22. ETS / College Board score-verification agreement

**Action**: decide whether to pursue an API agreement with ETS (TOEFL) and/or College Board
(SAT) for score verification, and if so start it.
**Why it's blocked**: needs a commercial/organisational relationship ORYN does not have.
**Blocks**: any genuinely `verified` test score. Without it, ORYN's evidence taxonomy tops
out at `evidence_added` for test scores — which is honest and correct, just weaker than a
competitor that verifies against the testing body itself. Raised by the Cialfo audit, where
this pattern was found in use.

## 23. Product decision: how scholarships get sourced

**Action**: choose between (a) sourcing scholarships institution-by-institution from each
awarding body's own official page — slow, clean, HIGH confidence, or (b) licensing an
aggregator dataset — fast, needs a licence review first.
**Why it's blocked**: (b) is a spend-and-rights decision. Nothing should be ingested at
scale from an aggregator without that review, per this repo's own source-rights rule.
**Blocks**: populating a scholarships table. The schema can be designed either way, so
design work proceeds; only the data does not.

## 24. Consent design for storing real application outcomes

**Action**: decide whether ORYN will ask students for permission to store their actual
admission decisions (accepted / rejected / waitlisted / withdrawn) for benchmarking, and
get the consent language reviewed alongside item 13.
**Why it's blocked**: these are minors' application outcomes. Phase 18 is explicitly
designed to be future-compatible rather than built now, and it should stay that way until
consent is designed, not retrofitted.
**Blocks**: Phase 18 outcome-based benchmarking, and any peer comparison grounded in real
decisions rather than profile scores.

## 25. ~~Merge duplicate university identities~~ — IDENTITY + ROW-SUPPRESSION LAYERS RESOLVED; APPLICATION READ PATHS STILL ON THE INTERIM FIX

**Update 2026-08-20**: migration 0043's DDL turned out to already be live (found during a
routine live-DB re-measurement, contradicting this item's own "no DDL access" framing below
— that framing is now stale, kept for history) and its data backfill has since been run and
verified: all 9 pairs below now show `duplicate_status='superseded'` with the correct
`superseded_by_id`, matching `lib/universities/duplicate-supersessions.json` exactly. What's
left is purely an application-layer refactor — `lib/universities/canonical.ts`'s 16 read
surfaces still filter via that static JSON file, not a live `duplicate_status` query. Not
blocked on anything anymore, just not yet done — see that file's own header comment for the
scoped upgrade path (it's a deliberate wider refactor, not a drop-in swap, since the current
functions are synchronous and a DB-native replacement naturally isn't).

**9 pairs, not 8** — this list was missing KFUPM/King Fahd University of Petroleum and
Minerals (its second row's `canonical_name` is literally just "KFUPM", so it didn't match
the "previously known" cross-reference this file made to item 19, and an early pass in this
session's own investigation initially and wrongly concluded it didn't exist; found properly
via a `university_rankings` audit — two `universities.id` rows both claiming QS 2027 rank
"63" with no tie marker). All 9 live-verified against ROR
(`https://api.ror.org/v2/organizations`) on 2026-08-17 and merged via
`merge_canonical_entities()`. Full per-pair evidence, winner/loser ids, and reasoning:
`docs/handoffs/claude-a-university-spine.md`.

| Institution | Evidence they are one institution |
|---|---|
| University of Warwick / **The** University of Warwick | Both resolve to `ror.org/01a77tt86`. The second records its city as "England", which is not a city. |
| University College London / UCL | Both resolve to `ror.org/02jx3x895`. |
| Massachusetts Institute of Technology ×2 | Both resolve to `ror.org/042nb2s44`. |
| London School of Economics and Political Science ×2 | Both resolve to `ror.org/0090zs177`. |
| Hong Kong University of Science and Technology ×2 | Both resolve to `ror.org/00q4vv597` (not the separate real HKUST-GZ campus, `050h0vm43`). |
| King Fahd University of Petroleum and Minerals / KFUPM | One ROR record (`ror.org/03yez3163`) lists both names. |
| University of Newcastle, Australia ×2 | Both resolve to `ror.org/00eae9z71` (not UK Newcastle University, `01kj2bm70`). |
| University of Technology Sydney ×2 | Both resolve to `ror.org/03f0f6041` (not the unrelated University of Sydney). |

**What was open, historical framing (superseded by the 2026-08-20 update above)**:
`merge_canonical_entities()` merges the identity layer only (aliases, external ids, evidence,
repoints `universities.canonical_entity_id`) — it never touches the `universities` rows
themselves, so all 18 still exist and the University Explorer would still show 9 duplicate
cards. A non-destructive fix (`universities.duplicate_status` / `superseded_by_id`, migration
`0043_university_duplicate_supersession.sql`) is written and committed but *(at the time this
paragraph was originally written)* not applied — that session had no Supabase MCP / linked
CLI / direct Postgres access, only PostgREST (which cannot run DDL). Deliberately not a
straight `DELETE` of the losing row either way: `university_programs`/`university_requirements`
reference `universities(id) on delete cascade`, and 4 of these 9 pairs already carry real
`university_programs` rows on one side — an automated delete is a standing risk to that
data, a superseded flag is not.
**To finish** (DDL + backfill are now done, per the 2026-08-20 update above — this is what's
actually left): switch `lib/universities/canonical.ts`'s read paths to query
`duplicate_status`/`superseded_by_id` directly instead of the JSON file, per that file's own
header comment. **No longer depends on DDL/founder action** — it's ordinary application work
now. Related: item 19's remaining ~63 lower-confidence orphan pairs (no visible-card impact,
lower priority).

## 26. Approve applying migration 0057 (YÖK Atlas `kilavuz_kodu` column)

**Action**: decide whether to authorize applying
`supabase/migrations/0057_university_program_kilavuz_kodu.sql` to the live database.
**Why it's blocked**: not technical — the migration is written and reviewed, adds a single
nullable `text` column plus a partial index, and does not touch dedup/identity logic. It's
withheld because a prior coordination session's authorization for migration 0055 was explicit
that it "does not extend to this migration," and the file's own header says not to apply
without asking the founder again. Confirmed still not applied: `information_schema.columns`
has no `kilavuz_kodu` on `university_programs` as of 2026-08-22.
**What it unblocks**: a stable per-programme source identifier for Turkey's 779
`university_programs` rows, all of which currently carry only the bare YÖK Atlas portal root
as `official_program_url` (no per-programme page exists on that site) — the largest population
in this schema with no usable per-programme source reference. `kilavuz_kodu` is confirmed live
and stable in YÖK Atlas's own API, already stored without incident across 456 real placement
rows (see `docs/handoffs/yok-atlas-placements-scale-12-universities.md`).
**What it does NOT do**: backfill the column for the existing 779 rows (separate, harder work —
6 universities have programme names recorded in English rather than Turkish, a gap that needs
closing first) or touch deduplication/identity resolution.
**Depends on**: nothing technical — a founder go-ahead, same shape as item 25's original
DDL-access gate but for authorization rather than access.

## 27. Decide what happens to ~80 defective opportunity rows from your own Drive corpus

**Action**: decide, for roughly 80 live `opportunities` rows, whether to (a) re-research them
from official sources, (b) retire them (`status='disabled'`) until someone does, or (c) accept
them as-is for now.
**The measurement** (BUG-1, 2026-08-22, live, read-only): of 271 `status='active'` rows — the
ones students actually browse — **85 (31.4%) carry at least one hard defect signature**: 77
whose description opens by restating its own title (a spreadsheet-cell dump, not prose), 77 with
a raw `https://…` URL sitting in the description body shown to students, 45 truncated mid-word
ending in a literal `…`, and 5 whose *title* is an institution name rather than an opportunity.
A random sample of 8 was 8/8 genuinely defective — no false positives in the detector.
**Root cause, established not inferred**: the garbling is already present in the source Drive
spreadsheet cells. ORYN's importer carried it through faithfully rather than introducing it —
the ` | ` separators and the ~900-character truncation exist verbatim in the seed SQL, and no
900-character clip exists anywhere in the generator. **There is no extraction bug to fix; the
source corpus is the defect.** That is why this is your call and not an engineering task.
**Half-handled without you — and the classification underneath it needed checking.** The
UCSC course-catalogue entry, King's College London and St Andrews were retired on
2026-08-23. Three institution-name rows were missed and are still live. Re-measured
2026-09-01, and this time by reading each row rather than trusting the label on the group:

The rows were filed as "categorically wrong, never valid opportunity records." That is not
what they are. Every one of them has a real pre-college programme behind it and a correct
official URL. What makes them retire-able is something different and narrower: they are
**index pages whose specific programmes already exist as separate, properly-titled, active
rows**.

| Row | Verdict | Why |
|---|---|---|
| King's College London (London, UK) | correctly disabled | "King's College London Pre-University Summer School" is active with the right URL |
| University of St. Andrews (Scotland, UK) | correctly disabled | "University of St Andrews Summer Academic Experience" is active with the right URL |
| ECON 1 - 01 Introductory Microeconomics | correctly disabled | genuinely a UCSC class-detail page, not an opportunity |
| Carnegie Mellon University (PA, USA) | safe to disable | points at CMU's pre-college admissions index; "Carnegie Mellon SAMS" and CMIMC are already separate active rows |
| New York University (NY, USA) | safe to disable | points at NYU's programme *finder*; "NYU Precollege Program", "NYU High School Law Institute" and "Future Makers: NYU Stern Pre-College Institute" are already separate active rows |
| **University of Southern California (CA, USA)** | **do NOT disable** | **no properly-titled replacement exists.** The only other active USC row is "Dive Into Engineering!", one narrow Viterbi programme. Disabling this removes USC Pre-College's summer courses from the catalogue entirely |

```sql
-- Two index-page duplicates. Their real programmes already exist as separate active rows.
update public.opportunities
set status = 'disabled', updated_at = now()
where id in (
  'b4091e25-c8ca-4042-9976-ee41ae4031d5',  -- Carnegie Mellon University (PA, USA)
  '907e279d-bc2f-46b0-b970-9ed9c0abb261'   -- New York University (NY, USA)
);
```

**This is one decision, not two — it is the umbrella-row question, arriving from a second
direction.** The S5 research lane independently found the same shape and named it: a single
row standing in for a family of programmes with genuinely different facts (BRAND-ED covers
four differently-branded, differently-priced, differently-aged sub-programmes; UWC Short
Courses covers many independently-organised courses at different colleges). Six such cases
are already recorded as awaiting a product decision — see `docs/ORYN_WORKSTREAMS.md`'s
S5-TURKEY-ACADEMIC-OPPORTUNITIES row and `docs/handoffs/s5a-summer-academic-enrichment-handoff.md`
— alongside a "systemic bare institution name" pattern the same lane put at roughly a third
of the unverified bucket.

CMU, NYU and USC are the same thing found from the cleanup side rather than the research
side. Worth deciding once, for the shape, rather than case by case in two places — with the
caveat USC demonstrates: *which* action a given umbrella row needs (split, retitle, or
retire) still has to be checked per row, because it depends on whether properly-titled
replacements already exist. Only the policy generalises; the verdict does not.

**USC needs a retitle, not a retirement** — its `official_url` is already correct
(`https://precollege.usc.edu/summer-programs/`); only the `title` field carries the
institution name instead of the programme name:

```sql
update public.opportunities
set title = 'USC Pre-College Summer Programs', updated_at = now()
where id = '4a54159a-58dd-4304-a139-2b76f2a9fe38';
```

An agent cannot run either statement — the same auto-mode safety classifier that blocked the
original attempt — and no lane should force it, since it is a write to your live project.
Both are reversible.

Two things worth knowing about how this was nearly got wrong. The earlier note here said all
six were still active and awaiting you; half had in fact been applied and nothing updated the
document. And the group label "categorically wrong, not a judgment call" was doing work that
no row-level check supported — acting on it as written would have disabled a real programme.
A group verdict is not evidence about any particular row in the group.

**Re-measured 2026-09-01 — this decision is now much smaller than the text above describes.**
Running the defect signatures against the live catalogue today, on all 275 `active` rows:

| Signature | 2026-08-22 (as recorded above) | 2026-09-01 |
|---|---|---|
| Raw URL dumped in the description body | 77 | **1** |
| Description opens by restating its own title | 77 | **7** |
| Truncated mid-word, ending in `…` | 45 | **31** |
| Title is an institution name | 5 | 3 (2 safe to retire, 1 needs a retitle — see above) |
| **Distinct rows with any hard defect** | **85 of 271 (31.4%)** | **~34 of 275 (12.4%)** |

Treat the two columns as indicative rather than an exact delta: the August figures came from
a different detector, and mine is stated in SQL below so it can be re-run rather than trusted.
The direction is not in doubt — the description-cleanup work in late August did most of this.

**And what remains is milder than "a garbled card vs. an empty shelf."**

- The **31 truncated** rows have *good titles* and real content — Wharton Global Youth
  Program, Global Issues at Princeton, 67th London International Youth Science Forum. The
  defect is a description that stops mid-sentence at ~700–800 characters. A student sees a
  real programme whose blurb trails off, not a garbled card.
- Of the **7 that restate their title**, five are purely cosmetic (the title is already
  correct; the description just repeats it before the real text). Only two have a genuinely
  wrong title, and both are recoverable from the row's own description without any
  re-research: `American University, Washington DC` → the Community of Scholars programme,
  and the USC row covered above.
- The **1 raw URL** is that same American University row (`www.american.edu/sis/communityofscholars.`).
- Five further rows mention a domain in prose — `oberlin.edu` (Pioneer's academic credit),
  `frcturkiye.org` (FIRST's Turkish partner), `tcr.org`, `ie.edu`, `env-olympiad.com`. These
  are editorially useful, not scrape residue, and are excluded from the count above.

```sql
-- Re-run the measurement:
select count(*) filter (where description ~ 'https?://'
                          or description ~ '(^|\s)www\.[a-z0-9-]+\.[a-z]{2,}') as url_in_body,
       count(*) filter (where description like title || ' | %')                   as restates_title,
       count(*) filter (where description like '%…')                             as truncated
from public.opportunities where status = 'active';
```

**So the choice you were asked to make — re-research ~80 rows, retire them, or accept them —
is now about 31 rows whose only problem is a clipped description, plus two titles that can be
fixed from data already in the row.** Re-researching 80 rows to this project's evidence bar
was a real budget question. Re-fetching 31 descriptions is not the same question.

**Why it matters**: these are on the surface students browse. Per your own non-negotiables,
nothing that misleads should ship. But re-researching ~80 rows to this project's evidence bar is
real work (measured yield elsewhere: ~5% of rows per hour of research), so the honest options are
retire-now-research-later or accept-and-schedule.
**Depends on**: nothing technical. Full detail will be in `docs/known-issues.md` under BUG-1's
investigation note.

### Re-verified 2026-09-01 15:20 — the verdicts above held; three things they do not cover

Re-queried all three live rows rather than re-reading this entry. **Nothing drifted**: CMU and
NYU are still index pages, USC is still a single coherent programme family (and now carries a
$11,570 cost with `cycle_status='open'`, which is what a real programme record looks like). The
SQL above can be run as written. What pulling on the thread added:

**a. One genuine casualty among the disabled rows, and it is not in the table above.**
`c581e99a` **The Pioneer Academics Research Program**, disabled 2026-08-23, **has no
replacement anywhere in the table.** Eight of the nine disabled truncated rows have a live,
correctly-titled counterpart — that is what makes their retirement safe, and it is checked here
row by row, not inferred from the two this entry already names. Pioneer is the ninth. It is a
real, well-known research programme; its `official_url` points at a marketing review post
(`/news/is-pioneer-academics-worth-it-review-…`) rather than a programme page, which is the
likely reason someone retired it. Whether it was *also* rejected on merit is not recoverable —
there is no field-level changelog, so "no replacement exists" is the entirety of the evidence.
**Re-adding it with a correct URL is a live write and therefore yours.**

**b. The defect is not only live, it is loaded.** This entry measures the `active` set. The
same import left **41 rows sitting in `under_review`**, and they share one shape: description
clipped at exactly 899–900 characters, **and `deadline`, `cost`, `minimum_age` and
`maximum_age` all null on every single one**. Verified from the product code rather than
assumed — `isOpportunityActionable` (`lib/opportunities/lifecycle.ts`) returns false for any
status but `active`, and `browse.ts` filters `status='active'` in SQL — so **no student sees
them today**. The point is what happens on the day someone approves the queue: 41 records go
live that cannot answer "am I eligible?" or "when is this due?", which are two of the three
questions the opportunity surface exists to answer. **Fill those fields before promoting the
queue**, or promote selectively.

**c. The rule you are being asked for should be written to cover four more rows, not three.**
Sitting in `under_review` right now: **University of Pennsylvania (PA, USA)** is exactly the USC
case (its description names ESAP, cost $9,250 — retitle, do not retire); **Brown University (RI,
USA)** and **Harvard University (MA, USA)** are exactly the CMU/NYU case. Not urgent, since none
is visible — but if the decision is recorded as "these three rows" rather than as a rule, the
same defect ships the day they are approved. One row that looks like it belongs and does not:
**York University Helix Summer Science Institute (ON, CANADA)** names a real programme and
merely carries a location suffix. Leave it alone.

**Method note, because it nearly went the other way.** KCL and St Andrews have an
`official_url` pointing at an unrelated academic page while their *descriptions* carry the
correct summer-school URL on the university's own domain. That reads as "two real programmes
wrongly hidden by a fixable field error," and it was one message away from being reported that
way. One more query settled it — both are live under correct titles, exactly as this entry
already said. The entry was right; the fresh reading of the same rows was wrong. **A group
verdict is not evidence about any row in the group, and that cuts toward the cautious answer as
often as away from it.**

## 28. Five opportunities that no AI-permitted fetch path can reach

**Action**: check these by hand, or decide to drop them: **Technovation** and **CSHL** block
Anthropic's crawler by name in `robots.txt` (respected — this org does not route around a
block, and deliberately does not substitute archive.org for a live fetch); **BSPEE**, **Ashoka**
and **Girl Up** return server-side 403s despite clean robots.txt.
**Why it's blocked**: not a capability gap that more effort solves. Two hosts have explicitly
opted out of AI access; three refuse the connection. A human browser can read all five.
**Blocks**: their deadline and eligibility facts stay unverifiable, so they cannot be presented
as verified. They are not wrong today — they are unknown, and correctly labelled as such.
**Depends on**: nothing but a person with a browser, or a decision to retire them.

## 29. ~~Apply migration 0060 (`opportunities.country_eligibility_confirmed_open`)~~ — ALREADY APPLIED, verified live 2026-09-01

> ### ✅ Nothing to do. The column is live.
>
> `information_schema.columns` confirms `opportunities.country_eligibility_confirmed_open`
> exists in `oryn-qa-scratch`, queried directly 2026-09-01 18:20. Surfaced by the
> `current-state.md` refresh and re-derived here before striking it, the same way items 30
> and 36 were.
>
> This is the third entry tonight that was applied without the ledger recording it — the same
> pattern that made `supabase_migrations.schema_migrations` unreliable as an authority for
> this project. **Probe the schema object, never the ledger, and never this file.**

**Action (no longer required)**: ~~apply `supabase/migrations/0060_opportunity_country_eligibility_confirmed_open.sql`
to the live database, or say no.~~
**Why it's blocked**: same posture as 0057 — written, reviewed, merged to `main` (PR #5), and
deliberately not applied. The application code reads the column defensively, so every
environment behaves identically and honestly whether or not it has been applied; nothing is
broken while it waits.
**What it unblocks**: the honest distinction between "this program is confirmed open worldwide"
and "nobody has researched this row yet" — both of which are an empty `eligible_countries` array
today, which is why unresearched rows can read as open to everyone. Once applied, the research
org can backfill the confirmed-open rows with per-row evidence.
**Depends on**: nothing technical — your go-ahead.

---

## 30. ~~LAUNCH BLOCKER — anonymous users can read any public student profile~~ — RESOLVED, VERIFIED LIVE 2026-09-01

> ### ✅ Already fixed. Nothing to authorize.
>
> Verified live against `oryn-qa-scratch` on 2026-09-01 16:30, by reading the definitions rather
> than trusting this entry or the ledger:
>
> - **`public_profiles`' live view definition now begins `WHERE auth.uid() IS NOT NULL AND (…)`**
>   (`pg_get_viewdef`). The anonymous branch this entry describes no longer exists.
> - **The base table is independently closed too**: `profiles` carries exactly two policies,
>   `select own profile` and `update own profile`, both `USING (id = auth.uid())`. So there is no
>   second path around the view.
>
> Found by the `docs/known-issues.md` staleness pass and confirmed by me independently before
> striking a launch blocker off your list — removing a real security item because a document said
> it was fixed is the one mistake worth being slow about. `docs/migration-state.md` already had
> this right and dated; **this entry is where the staleness lived**, and it stayed stale because
> both earlier passes treated *this file* as the authority on live state instead of querying it.

**Original entry preserved below for the record. Action (no longer required)**: authorize the fix. A migration will be written (not applied) — you approve applying
it, the same as items 26 and 29. This is the one item on this list that must be closed before a
real student signs up.

**What was found** (BUG-1, 2026-08-22, live RLS verification against `oryn-qa-scratch`, using
real GoTrue password sign-in rather than simulated tokens): the `public_profiles` view returns a
row to an **anonymous, unauthenticated caller** for any profile with `is_public = true`.

**Why it happens, since it isn't obvious from reading the migration**: migration 0023 granted
the view to `authenticated` and its own comment states this was "deliberately more conservative…
than a fully public, unauthenticated, indexable page." That grant was already redundant —
Supabase's default project bootstrap grants `anon` SELECT on every table and view in the
`public` schema. Normally RLS is the real gate on top of that, and it correctly is everywhere
else (an anonymous caller reading the base `profiles` table gets nothing, verified). But
`public_profiles` is a security-definer view whose `is_public = true` branch never references
`auth.uid()` — it's satisfied by the row's own data, regardless of who is asking. **Intent and
implementation disagree; the intent is documented, so this is a defect, not a decision about
what we meant.**

**Exposure, measured rather than estimated**: 7 profiles live, **1 currently public**. Only
fields already in `PUBLIC_PROFILE_SAFE_COLUMNS` are reachable — display name, headline, about,
country, curriculum, graduation year, looking-for. Private fields (name, birth year, city,
school, admin flag) all correctly stayed inaccessible, separately verified. Only one profile at
a time by id; no anonymous enumeration path was found.

**Why it still matters**: this is minor-safety data. A 14–18-year-old's display name,
curriculum, graduation year and free-text "about", readable by anyone on the internet with no
account, for a profile the product tells them is visible to other Oryn students.
`AGENTS.md` Phase 12 names avoiding public-by-default profiles explicitly, and non-negotiable
minor-safety framing runs through the whole spec. The gap between what the product promises and
what the database permits is the defect.

**8 of 9 other checks on this surface passed**, including both regressions migration 0024 was
written to close — so the surrounding design is sound and this is one specific hole, not a
systemic failure.

**Depends on**: nothing technical — your go-ahead to apply the migration once written. Related
open thread: whether other security-definer views rest on the same incomplete-grant assumption
(BUG-1 is checking).

---

## 31. Build the UPDATE-by-id apply path, or 1,429 verified URL corrections stay unapplied

**Action**: decide who builds it — a fresh RES-I1 session, or a code lane tomorrow.
**The situation**: 1,429 `university_programs.official_program_url` values are known-defective by
category (pagination links, portal roots, archived cycles). Corrections have been researched
**and independently verified** — RES-V2 sampled a stratified n=80 with a recorded seed and found
**zero** failures in either failure mode (doesn't resolve / resolves to the wrong programme).
Cleared to apply wholesale.
**Why they can't be applied**: the apply path doesn't exist. `decideIngestion` — the ingestion
machinery everything else goes through — structurally cannot do an UPDATE by id; it decides
between insert and skip. RES-I1 delivered a *design* for the missing path
(`docs/handoffs/i1-supersede-gap-design-2026-08-22.md`, complete and specific, including an
audit trail distinguishing enrichment from correction) and stated explicitly that it was a
design and not an implementation. That lane's session has since exited.
**Why I didn't just assign it**: building a new live-data write path plus an audit table that
may need its own migration is substantial new machinery, and your standing instruction today was
not to destabilise the project while you were away. Every lane still running is doing bounded,
revertible work; this isn't that shape. The research org correctly refused to have its
opportunities-ingester cross into `university_*` territory to cover the gap.
**Urgency**: none. These URLs have been wrong for days; another day changes nothing.
**Depends on**: your call on who builds it.

## 32. Product decision: should `university_programs.degree_type` hold more than one award?

**Action**: decide whether a programme can record multiple qualifications.
**Why it surfaced**: Glasgow's 62 `degree_type` enrichments were verified 30/30 factually
correct — and **83% of the sampled programmes are multi-award**. Glasgow's own pages list 2–4
valid qualifications for one programme (`BSc/MSci`, `BEng/MEng`, `MA(SocSci)/LLB/MA`), and the
field holds exactly one, **selected by extraction order rather than judgment**. The tell is a
Politics programme whose `MA/LLB/MA(SocSci)` options resolved to "LLB".
**The concrete harm, which is what makes this decidable**: a student searching for MEng will
miss a programme recorded as BEng. That's a real miss on a real search, not an abstraction.
**Handled correctly in the meantime, no data at risk**: ORYN-BASORG ruled to apply the ~10
single-award records and hold the ~51 multi-award ones. Its reasoning is worth repeating because
it names the whole day's theme precisely — *writing "BSc" for a BSc/MSci programme isn't false;
it presents an extraction artifact as an editorial fact, and the field's authority does the
misleading.*
**Depends on**: nothing technical — a schema/product judgment. ORYN-CFO was asked to weigh in.

> **ORYN-CFO's answer, recorded 2026-09-01 — a recommendation, not a decision. This item is
> still yours.**
>
> **Yes, and do this one first: it's the cheapest of the five.** A join table
> `university_program_degree_types(program_id, degree_type, display_order)`, with the single
> field retired to a derived "primary award" if anything still needs one. The 51 held Glasgow
> rows are already verified 30/30 correct, so this is schema plus a backfill of data we already
> trust — **no new research**, and it fixes the MEng-misses-BEng search miss directly.
>
> The general principle, which item 35 puts to you across all five instances: when a field's job
> is "the current single truth" but reality has coexisting truths, model it as rows rather than
> fighting the field — the `university_deadlines.verification_state` precedent.
>
> Writing the migration needs nothing from you; *applying* it does, same as 0073 and 0074.

## 33. ~~Ten `_backup_*`/staging tables in `public`~~ — NINE DROPPED; the tenth is live infrastructure, not a straggler

> ### Resolved for nine. The tenth needed a different read, arrived at over three passes.
>
> Queried live 2026-09-01 18:20: of the ten this entry originally described, **nine no longer
> exist** (migration `0069`, applied with no ledger row — confirmed by the absence itself). The
> one still in `public` is **`qs2027_import_staging`**.
>
> Getting to the right read of that one table took three tries, each corrected by the next. A
> lane reported all ten gone, correctly hedged as "inferred from absence, not a record of the
> drop" — the direct query found the survivor. The next read treated the survivor as "same
> decision, one tenth the scope" — also wrong. `qs2027_import_staging` is **not abandoned
> residue like the nine that were dropped**; it is live pipeline infrastructure, verified
> directly:
>
> - **1,000 rows** — a populated QS Top-1000 staging dataset, not an empty leftover.
> - **Live code depends on it**: `scripts/acquire-qs-institution-profile.ts` reads it (joining
>   on `list_position`), and `lib/acquisition/paginate.ts` special-cases its lack of an `id`
>   column.
> - It is **migration-tracked**, and `0069_drop_ad_hoc_backup_tables.sql` — the migration that
>   removed the other nine — **deliberately spared it**.
>
> A prior schema-hygiene audit had already reached this conclusion and excluded it by name:
> *"active pipeline infrastructure for an ongoing QS Top1000 expansion, not abandoned residue.
> Revisit once that expansion is complete, not before."* Same reasoning applies to
> `global_university_discovery_queue`, flagged by that same audit and never part of this
> entry's original ten — noted so a later cleanup doesn't sweep it up.
>
> **So dropping or relocating `qs2027_import_staging` now risks breaking an in-progress
> pipeline nobody has declared finished.** It shares its access-control posture (RLS on, zero
> policies, Supabase's default `anon`/`authenticated` grants) with thirteen other internal
> tables — whether that posture is safe to change, across all fourteen, is now one question
> instead of fourteen: **item 40**.

**Action**: nothing table-specific here — the grant question for `qs2027_import_staging` is
folded into item 40's blanket-revoke proposal, which covers it by name. The one decision that
belongs to *this* entry: once whoever owns the QS Top1000 expansion declares it finished,
dropping `qs2027_import_staging` becomes available again, the same way the other nine were.
**Depends on**: item 40 for the grant question; a product/ops call on the QS expansion's
completion for the drop question.

---

## 34. URGENT-ISH — verified work is stranded because no ingester session exists

**Action**: open one ingester session (an RES-I2-shaped lane). It clears most of this in under
an hour.
**Why**: six of thirteen sessions ended without warning this afternoon (13 → 8), including
**both** database-writing lanes. What remains — research and verification — deliberately cannot
write to the live database, and ORYN-BASORG correctly refused to let verifiers do it: that
separation is what produced today's real catches, and collapsing it under staffing pressure
would trade the quality mechanism for a handful of rows.

**What's waiting, all verified, all bounded, all revertible:**
- ~~Habitat Derneği's 26 August deadline~~ — **NOT stranded. Corrected 2026-08-22 evening.**
  The row is already live, `active`, with `deadline 2026-08-26` matching its source verbatim;
  a student can see it now. Only `last_verified_at` is null — a provenance stamp, not a
  student-facing defect. This was escalated all afternoon on a false premise: the research
  record being unmerged was read as the fact not being live, which conflates the pipeline's
  state with the database's. Nobody queried the row until ORYN-BASORG did and corrected itself.
- Five `cycle_status` corrections resolved against their own sources (IPPF → open, HOSA →
  upcoming, Wharton Data Science → closed, CMIMC → closed, BIYSC → upcoming).
- Glasgow's ~10 single-award `degree_type` records (the ~51 multi-award ones are correctly held
  pending item 32).
- Six non-opportunity retirements (a course-catalogue entry, five institution-name titles),
  already prepped.
- The 1,429 URL corrections — but those need item 31's apply path built first, so they're
  blocked twice over.

**Nothing here is harmful while it waits, and nothing here expires.** Today's live state is
honest; an unapplied correction is a missing improvement, not a defect.

> ### ⚠️ READ BEFORE INGESTING ANY OF THIS — 325 contract defects are on `main`
>
> The **116** records from RES-R2's P2/P3 output — 87 summer-programme plus 27
> remaining-category, which is 114 *distinct* records, plus 2 correction records for 116 raw —
> **failed contract validation** and were merged anyway, deliberately. Full verdict:
> `docs/research/verification/v1-5_dlopp_p2_p3_verdict.md`, which **lives on PR #39's branch,
> not yet on `main`** — if you're reading this before #39 merges, the file is only reachable
> from that branch.
>
> - **232** missing `record_type`/`lane` fields — systemic, in all 116 records.
> - **92** `cycle_status_found` format drifts.
> - **1** logical-consistency defect: the **Interlochen Arts Camp** record's internal year
>   ambiguity — a live page headed "Camp 2026" carrying `2027-01-15`, the same same-day-
>   next-year projection pattern found and rejected on the Ron Brown record. Seen three times
>   independently. **Do not apply this one at all without resolving it first.**
>
> **The research itself is sound** — ID discipline passed, `finding_type` 100% clean, the
> live-status breakdown matches, and a zero-row category was independently confirmed genuine
> rather than assumed. These are *shape* defects, not truth defects, which is why merging them
> was the right call: a merged research branch lands proposals, not facts, and the branch was
> the only durable form that work had after the lane died.
>
> **The risk is entirely at ingestion.** An ingester consuming these files unaware either fails
> loudly on 325 contract violations — fine — or, if the path is lenient, writes malformed
> records silently, which is not. **Validate against the verdict before ingesting.** Nobody
> currently owns fixing the field shapes: verifiers don't edit researcher files, RES-R2 is gone,
> and both ingesters are gone. RES-V1's verdict is the specification for whoever inherits it.
>
> *Sequencing note, disclosed: PR #41 was merged by ORYN-CEO before this verdict arrived. PR #32
> carries the rest of the same batch.*

**Why I didn't just do it myself**: I nearly did, for Habitat specifically, on the reasoning
that a four-day deadline outranks a territory boundary when the owning lane no longer exists.
The environment's safety classifier blocked that message, and on reflection it was right to.
Pressure is exactly when a boundary gets crossed "just this once", and you can open a session
in minutes — a far better outcome than establishing that the coordinator writes to live data
whenever staffing thins. ORYN-CFO flagged this same gap independently this afternoon and
recommended the org doc define it as policy rather than leave it to judgment.

## 35. Product decision: the schema forces one value where reality has several

**Action**: decide whether these fields may hold multiple simultaneous truths, as one modelling
question rather than four separate schema tickets.
**Why it's one question**: four lanes hit it independently today, in four different columns,
without coordinating:
- `opportunities.cycle_status` must be `closed` **and** `date_not_announced` at once — the
  current cycle has closed *and* the next genuinely isn't announced. True for **11 of 18**
  rows examined.
- `university_programs.degree_type` holds one award where the source page lists 2–4 (item 32).
- One deadline field for Girl Up's per-region pathways, which have different dates per region.
- Concord Review's cycle label conflates publication months with deadline months.

**The shape, in ORYN-BASORG's words**: *the schema forces one value where reality has several
simultaneous truths, and the field's authority does the misleading rather than any false value.*
Every individual stored value is factually correct. The misleading part is the field's implied
claim to be complete.

**Why it matters concretely**: a student searching MEng misses a programme recorded as BEng; a
student filtering for open opportunities can't distinguish "closed for good" from "closed, next
cycle unannounced". Both are real misses on real searches.

**A fifth instance, found later the same day, with more weight than the other four**:
`ApplicationStatus` and `TargetStatus` conflate *the institution's decision* with *the student's
own choice*, so an accepted-then-withdrawn application silently loses the acceptance. Traced to
its consequence rather than left abstract — `lib/scoring/monthly-review.ts` excludes withdrawn
from "Applications submitted", which means **a student who got into a university and then chose
not to go loses their single most positive outcome from their own Monthly Review.** Phase 40
exists to show a student their progress; this makes the product forget the best thing that
happened to them.

**THERE IS ALREADY A WORKING ANSWER IN THIS CODEBASE, and it's the recommended shape.**
`university_deadlines.verification_state` looks like it should have this exact problem — it even
carries a `CURRENT_CYCLE_NOT_PUBLISHED` value — and doesn't, because it stores **one row per
dated event**. Two facts that need to coexist become two rows instead of fighting over one
field. Found by FEAT-2 while auditing for the opposite.

So the question isn't really *"should this field hold multiple values?"* — it's *"when two facts
must coexist, should they be two rows?"* A precedent that already ships and works beats a design
proposal, and it answers all five instances at once.

**Depends on**: nothing technical — a schema/product judgment. Deciding the principle once
settles all five and prevents the next one. ORYN-CFO was asked to weigh in on the `degree_type`
instance. Full analysis: `docs/feat2-multi-axis-status-audit-2026-08-22.md`.

> **ORYN-CFO's answer, recorded 2026-09-01 — a recommendation, not a decision. The call is
> still yours.**
>
> **The principle: yes.** Where a field's job is "the current single truth" but reality has
> coexisting or historically-layered truths, model it as rows. A field that silently overwrites
> a coexisting truth is indistinguishable, *from its own output*, from one that never had it —
> the same failure class as this codebase's confident-output-from-absent-input pattern, in its
> information-loss variant.
>
> **But deciding the principle once does not mean treating all five the same**, and the ranking
> matters more than the principle:
>
> 1. **`ApplicationStatus`/`TargetStatus` — highest actual harm, do this one first.** The
>    institution's decision and the student's own later choice are different axes, not one
>    field's history. `applications.status` is a single column, so `accepted` → `withdrawn`
>    **destroys the fact of the acceptance outright** — not hidden from a view, gone from the
>    record. The product forgetting the best thing that happened to a student because they later
>    made an unrelated choice. Needs an event table (two immutable rows), with "current status"
>    derived.
>    *Precision, since an earlier draft of this note put the harm in the wrong place:*
>    `lib/scoring/monthly-review.ts` counts `applicationsSubmittedRecently` and never displays
>    acceptances, so a withdrawal drops one from a **submitted count** there. The acceptance loss
>    is in the schema, not in that view.
> 2. **`degree_type` — do this second; it's the free unlock.** See item 32: the data is already
>    verified, so it's schema plus backfill.
> 3. **Girl Up per-region deadlines** — trivial; reuse `university_deadlines`' existing shape as
>    a region-scoped `opportunity_deadlines`.
> 4. **`cycle_status`** — model cycles as rows; current-cycle-status and next-cycle-date-known
>    are orthogonal facts forced into one column.
> 5. **Concord Review — check this one before assuming it needs the same treatment.** It reads
>    more like a single mislabelled field (publication month vs deadline month sharing an
>    ambiguous "cycle" name) than genuine multi-value reality. Four lanes converging on a
>    principle is exactly when the fifth case gets forced to fit it.
>
> None of this is destructive DDL — additive schema plus backfill. Writing the migrations needs
> nothing from you; applying them does, same as 0073 and 0074.

---

## 36. ~~CRITICAL — any signed-in user can make themselves an admin~~ — RESOLVED, VERIFIED LIVE 2026-09-01

> ### ✅ RESOLVED — `0062` is now correct and safe to apply.
>
> **Read this only if you saw the earlier warning.** For part of this evening, `0062` on `main`
> was defective and this item told you to run it. BUG-1 found the bug in its own migration by
> tracing the actual writers instead of re-reading the file: the version then on `main` also
> guarded `profile_strength_score` and `completeness_percent`, and those two are legitimately
> written by the score-recompute path through the *same* client a student's browser uses. The
> database cannot tell the app from the student — both are role `authenticated` — so applying it
> would have **silently frozen score recompute**: no error, no failed write, scores just stopped.
>
> **`0062` now guards `is_admin` alone.** That closes the entire privilege escalation, collides
> with nothing, and needs no code change. Merged and gated. The two computed columns move to
> `0063`, paired with a small code change routing their writes through the admin client where
> they always belonged — that one is still being written and is **not** urgent.
>
> Nothing was ever applied to the database during the defective window, so there is nothing to
> undo. ORYN-CEO reviewed the original line by line and merged it without catching this.

> ### ✅ APPLIED AND LIVE — verified 2026-09-01. This is no longer your highest-priority item; it is not an item at all.
>
> The escalation is closed **in the database right now**. Verified by reading the trigger's own
> source, not the ledger and not this entry:
>
> ```
> trigger  profiles_00_guard_protected_columns  on public.profiles
> function public.profiles_guard_protected_columns()  -- SET search_path TO ''
>   if pg_trigger_depth() <= 1 and current_user <> 'service_role' then
>     new.is_admin                := old.is_admin;
>     new.profile_strength_score  := old.profile_strength_score;
>     new.completeness_percent    := old.completeness_percent;
> ```
>
> Live admin count is **1**, unchanged. A signed-in student's `is_admin := true` is silently
> reset to its old value before the row is written.
>
> **And the shipped design is better than the one described below.** This entry says `0062`
> guards "`is_admin` alone" because guarding the two computed columns would freeze score
> recompute. What actually landed guards **all three** and exempts `service_role`, paired with
> the code change routing those writes through the admin client — so the computed columns are
> protected too, without the freeze. Five sibling guards exist on the same pattern
> (`profile_scores`, `profile_score_snapshots`, `opportunity_matches`,
> `student_requirement_evaluations`, `evidence_files`).
>
> **Why this sat here wrong:** every pass that "confirmed" it re-read this file instead of
> querying the database. The word *CRITICAL* made re-derivation feel unnecessary, which is
> exactly backwards.

**Action (no longer required — see above)**: ~~authorize applying migration `0062`. Written, not applied — same shape as items
26/29/30. Still the highest-priority item on this list, above item 30.~~

**What was found** (BUG-1, 2026-08-22, live against `oryn-qa-scratch`; I re-verified the policy
definitions independently): the QA account `oryn.qa.b@example.com` — an ordinary, non-admin
student account — **granted itself `is_admin = true` with a single unprivileged API call.** Not a
theoretical read of the schema. It was executed, it succeeded, and the row changed.

**Why it happens**: the `profiles` UPDATE policy is `USING (id = auth.uid())` with
`WITH CHECK (id = auth.uid())`. That is exactly right for what it says — *you may update your own
row* — and it is the whole protection. **RLS policies are row-scoped, not column-scoped.** Postgres
has no notion here of "this row, but not that column". Nothing anywhere else restricts which
columns a student may write, so `is_admin` is as writable to them as their own display name.

**Why this is worse than item 30**: item 30 requires a student to opt into a public profile and
exposes a whitelist of safe columns. This one requires nothing, is available to every account the
moment it signs up, and grants everything. Admin routes call `requireAdmin()` and then
`createAdminClient()` — a **service-role client that bypasses RLS entirely**. So the escalation
doesn't grant a slightly wider view; it grants the key that turns RLS off.

**Two more columns of the same shape**, found by the same sweep: `profile_strength_score` and
`completeness_percent`. Both are meant to be computed by Oryn from a student's actual record, and
both are directly writable by the student they describe. Less severe — a student can only inflate
their own numbers, and the fabrication is invisible to them and to us — but the same defect, and
the fix covers all three in one place.

**The fix**: a `BEFORE UPDATE` trigger on `profiles` that resets the protected columns to their
`OLD` values unless the caller is the service role. This is not a new pattern for this codebase —
it is the same mechanism as `posts_guard_system_columns` in `0058`, and three
`enforce_canonical_entity_type` triggers already guard other columns on other tables. The pattern
was known and simply never applied to `profiles`. Legitimate admin grants keep working: they run
through the service-role client, which the trigger deliberately exempts.

**Depends on**: your approval to run one migration. Written by BUG-1, mechanism reviewed by CEO.

---

## 37. Product decision: how should Oryn represent "we haven't checked," across every eligibility dimension?

**Action**: decide the one principle below (it is almost certainly a rubber stamp — it is the
principle migration `0060` already encodes), then approve writing and applying one more migration
that extends it to the two dimensions that don't have it yet.

**Why it's blocked**: five eligibility dimensions on `opportunities` each independently answer
"what does an absent/empty value mean?" and today they give three different answers. That's a
product decision (what should absence mean, product-wide), not a bug I can just fix — item 29
already asks you to apply half of it (`0060`) without stating the fuller decision it's part of.

**The five dimensions, verified against current `lib/opportunities/matching.ts`
(`computeEligibility`) and `lib/counselor/eligibility.ts`
(`evaluateOpportunityEligibility`) today:**

1. **Country** (`eligible_countries`, structured array). Empty means either "confirmed open
   worldwide" or "never researched" — identical on the wire, both read paths currently treat empty
   as "no restriction, no warning." `0060` (item 29) fixes this with a tri-state marker column,
   `country_eligibility_confirmed_open` — written, reviewed, **not applied**.
2. **Citizenship — structured** (`eligible_citizenships`, array). Same table, same column, same
   fix: `0060`'s own CHECK constraint already spans both `eligible_countries` and
   `eligible_citizenships` under one marker. Already solved once `0060` is applied.
3. **Age** (`minimum_age`/`maximum_age`, nullable). Null silently passes with zero warning today.
   No column anywhere distinguishes "confirmed no age gate" from "nobody checked." Same defect
   shape `0060` fixes for country — just not built yet for this field.
4. **Grade** (`eligible_grades`, nullable/empty array). Identical defect shape to age: empty
   passes silently, no confirmation marker exists.
5. **Citizenship/residency prose** (`citizenship_restrictions`/`residency_restrictions`, free
   text). A *different* failure mode — not a missing marker but a code disagreement:
   ~~`evaluateOpportunityEligibility` correctly surfaces this prose as an "unknown" warning
   while `computeEligibility` doesn't consult these fields at all.~~ **FIXED 2026-08-22 evening,
   PR [#116](https://github.com/akirik28/ORYN/pull/116)** — both paths now emit the identical
   string, pinned by a wording-parity test, so the card and the counselor can no longer disagree
   about what one row's own text says. **Not part of this decision and no longer a defect.** The
   same PR also closed the Browse fallback that rendered uncomputed matches as eligible.

   **So this item is narrower than when it was written.** What it still asks — and this part is
   unchanged and accurate — is the age/grade decision in dimensions 3 and 4, which subsumes
   item 29.

**What a student sees today**: silence in 4 of 5 cases. Only the counselor's prose handling
(dimension 5) shows any "unknown" signal — and only on the surface that reads it.

**The one principle that settles all of it**: *a field may assert "no restriction" only through an
explicit, dedicated confirmation signal — never through the mere absence, emptiness, or
non-specificity of restriction data.* This is not a new idea — it's exactly what `0060` already
encodes for dimensions 1–2. Dimensions 3–4 are the same decision, unapplied to two more columns.

**What it costs**: one new migration, one new boolean column shared across age+grade (mirroring
`0060`'s one column shared across country+citizenship) — e.g.
`age_grade_eligibility_confirmed_unrestricted`, `not null default false`, with a CHECK constraint
mirroring `0060`'s (can't claim "confirmed unrestricted" while `minimum_age`/`maximum_age`/
`eligible_grades` carry real values). Read-path changes in both `computeEligibility` and
`evaluateOpportunityEligibility` — the same shape of change `0060` already requires there, applied
to two more fields instead of two. No data backfill, same reasoning as `0060`: confirming
individual rows is a research-pass write, not a schema migration's job.

**This subsumes item 29** — applying `0060` alone only half-answers the question this item asks.
The founder decision here is "yes, and the same thing for age/grade," not a separate topic.

**Distinct from item 35**, despite the surface similarity (both surfaced during eligibility work):
item 35 is about a field needing two *simultaneous* true values at once (e.g. `cycle_status` being
both "closed" and "date not yet announced" — solved by splitting one field into two rows). This
item is about one field's *absence* being ambiguous between two meanings *over time* (solved by a
tri-state marker). Different failure mode, different fix. Not a duplicate — read separately.

**Two live defects intentionally left out of this decision** (don't need founder input; CEO said
to assign these directly once this item exists):
- The `computeEligibility`/`evaluateOpportunityEligibility` disagreement on citizenship/residency
  prose (dimension 5 above).
- The ~38-row Browse eligible-by-default gap (`lib/opportunities/browse.ts`'s fallback treats a
  missing match row as `eligible: true`).

**Depends on**: your decision on the principle (likely a formality) + approval to write and apply
one migration for age/grade, following `0060`'s exact pattern. Audit and design by FEAT-1,
2026-08-22 — no code or migration written for this item, per CEO's explicit scope.

## 38. Apply migration 0074, then the 85-record Nordic/Belgian/Austrian batch

**Action, in order:**

1. Apply `supabase/migrations/0074_deadline_freshness.sql` (below) to `oryn-qa-scratch`. It's
   on `main` (`c4eaaea4`) but not yet applied to the live database — different questions,
   checked separately.
2. Run the batch (terminal, from the repo root, once 0074 is live):
   ```bash
   npm run ingest:requirements-deadlines -- --only=nordic_requirements_ --apply
   ```
   All 85 records at once — the "8 `VERIFIED_HISTORICAL` records" section below explains why
   none of them need holding back.

**Status check, done today (2026-09-01), not assumed from the 2026-08-31 handoff**: re-ran
the exact ingestion decision logic this batch will use, live against `oryn-qa-scratch` as it
stands right now — **64 requirements + 21 deadlines = 85, identical to what the original
vetting pass reported yesterday.** Nothing in the six new countries has become a duplicate or
broken in the day since, despite other lanes actively writing to `universities`/
`university_programs` in the meantime. Source: `docs/handoffs/old-corpus-vetting-2026-08-31.md`
(the original pass — countries, source-freshness checks, human-or-script disclosure, full
per-record reasoning) and my own re-run using the ingester's existing `--only=` filter, which
exists for exactly this ("a batch that is still being reviewed can sit untouched while a
separately-vetted batch is applied on its own branch").

**Correcting my own first message on this**: I told oryn-a7 "86 records" before I'd read the
handoff doc closely. That number came from nowhere — the doc says 89 (68 requirements + 21
deadlines: 85 across the six new countries + 4 already-applied Turkey rows), and both my fresh
count and the doc agree on 89. Saying so plainly rather than quietly using the right number.

**The 4 Turkey (Ankara Üniversitesi) records are already live — nothing to do.** The handoff
doc's "Applied" was a real write, not a pending one: checked `university_requirements` directly
and found exactly 4 rows with `research_record_id` in `REQ-2026-08-21-{9321,9324,9325,9326}`,
`created_at` 2026-08-31 19:11:15, matching the doc's description (standardized-test and
minimum-grade facts) exactly. Ankara shows 7 requirements + 2 deadlines live today, not 4 — the
other 3 requirements (`REQ-2026-08-23-ANK000{1,2,3}`) and both deadlines are from the separate
40-institution depth pass, unrelated to this corpus, already live before this handoff ran.
Re-running the 4 Turkey rows would duplicate them — don't include `tr_requirements_*` files in
any re-run of this batch.

**Migration 0074** — written and committed (`c4eaaea4`) but **not yet on `main`, not live**:
confirmed `university_deadlines` has neither `last_checked_at` nor `data_status` in
`oryn-qa-scratch` right now, and `c4eaaea4` isn't an ancestor of `origin/main`. Mirrors
`university_requirements`'s existing two columns exactly; `last_checked_at` stays `NULL` on the
existing 470 rows rather than backfilled, since nobody has actually rechecked them.

```sql
alter table public.university_deadlines
  add column if not exists last_checked_at timestamptz;

alter table public.university_deadlines
  add column if not exists data_status data_status not null default 'fresh';

comment on column public.university_deadlines.last_checked_at is
  'When this deadline was last verified against its source. NULL means never checked since ingestion -- not a failure, but not a check either. Never backfill this with now(): a timestamp asserts a verification that happened.';

comment on column public.university_deadlines.data_status is
  'fresh | stale | needs_review | unavailable (Phase 29), same enum and same meanings as university_requirements.data_status. Defaults to fresh on insert, matching that table; a row is only as fresh as its last_checked_at actually says.';

create index if not exists university_deadlines_staleness_idx
  on public.university_deadlines (last_checked_at nulls first)
  where data_status <> 'unavailable';
```

**The 8 `VERIFIED_HISTORICAL` records** (1 requirement, 7 deadlines — exact ids from today's
re-run): `REQ-2026-08-22-FI-HEL-001`, and deadlines `DL-2026-08-22-FI-AALTO-003/004/005`,
`DL-2026-08-22-FI-HEL-001/002`, `DL-2026-08-22-SE-LUND-001`, `DL-2026-08-22-AT-UNIVIE-001`.
Each is a real, correctly-sourced date for a cycle that has already closed — 4 dated ones
already past, 3 Aalto ones recurring but researched with lower confidence than this corpus's
other recurring facts (`recurrence: recurring_annual_undated` rather than the
`VERIFIED_RECURRING_UNDATED` label used elsewhere for facts confirmed to actually recur), and
the 1 requirement is Helsinki's own admission-group timing.

I independently re-verified — not just trusted the handoff doc's claim — that the 7 deadline
ones are safe to insert even so: read `lib/deadlines/ingest.ts` (`NON_ACTIONABLE_VERIFICATION_STATES`),
`lib/deadlines/upcoming.ts`, and `lib/deadlines/scan.ts` just now, and both the "Due soon"
widget and the deadline-reminder job filter `VERIFIED_HISTORICAL` rows out explicitly — a
student cannot see one as an upcoming or approaching deadline. Migration 0056 is what made
this safe (before it, the table had no way to mark a row non-actionable at all).

**Correction (2026-09-01, hours after the above was written): the 1 requirement record is
not a special case — no decision needed for it, it's as safe as the other 7.** What's below
was wrong when I wrote it, on inference rather than a check I actually ran. The gap
`lib/requirements/shape-audit.ts:206-212` names was real when the 2026-08-31 handoff doc was
written — and has since been fixed: `lib/requirements/ingest.ts` now exports
`NON_ACTIONABLE_REQUIREMENT_VERIFICATION_STATES = {"verified_historical", "conflicting"}`
(commit `3e1e9cb6`, today), the requirements-side mirror of the deadlines filter above, and its
own header comment names `REQ-2026-08-22-FI-HEL-001` as the exact record that prompted it.
Applied at every path that reads requirements for display or reasoning —
`app/(app)/universities/[id]/page.tsx:165` (confirmed directly), plus `lib/counselor/state.ts`
and `lib/requirements/persist.ts` — so a `verified_historical` requirement is filtered out the
same way a `VERIFIED_HISTORICAL` deadline is. Caught by oryn-a7 minutes after this doc merged,
independently re-derived and confirmed by me before I saw that message. No asymmetry, no
row to delete, no option to pick: run the full 85-record batch as one step.

<details><summary>Superseded — kept for what went wrong, not as current guidance</summary>

**The 1 requirement record is different, and this is the actual decision left in this item**:
`university_requirements` has no equivalent filter — a `VERIFIED_HISTORICAL` requirement
renders on a university page exactly like a current one, a real gap `lib/requirements/shape-audit.ts:206-212`
already names. The ingestion script does not exclude it (that state was refused at
ingestion-time before 0056; it no longer is). Two honest options, not a formality: (a) run the
full batch including this one row and accept it displays without a "may be outdated"
distinction until that filter is built (small, separately scoped — mirroring the deadlines-side
fix this same item just applied), or (b) run the batch, then
`delete from public.university_requirements where research_record_id = 'REQ-2026-08-22-FI-HEL-001';`
to hold it out until the display gap closes. Either is defensible; leaving it in silently
without picking one is not.

</details>

**Depends on**: your go-ahead to run both steps against live data — same posture as items 26/29.

---

## 39. Product decision: what should "Regenerate" do with a student's completed work?

**Action**: decide one of three shapes for what `getOrCreateWeeklyPlan(..., {force: true})`
does to a week's already-completed actions when a student regenerates their plan — see
below. Everything else in this item is already fixed and pushed; this one decision is the
only founder-gated part.

**What was found, all re-verified directly against the live database, not taken from any
report**: `lib/plan/persist.ts:70` runs
`supabase.from("weekly_actions").delete().eq("plan_id", plan.id)` **unconditionally** before
inserting the newly-generated actions. `weekly_plans` is upserted on `(user_id,
week_start_date)`, so a regenerate within the same ISO week reuses the same `plan.id` — the
delete lands on the actions the student is currently looking at, including any already marked
`completed` with a `reflection_outcome`/`reflection_note` attached. Nothing copies that data
anywhere first.

**Why this is worse than "some history gets tidied up": it breaks the product's own central
loop.** `lib/ai/student-context.ts:200-201` reads `weekly_actions.reflection_outcome`/
`reflection_note` for exactly this student, and `formatContextForPrompt` (line 385) puts them
in the advisor's prompt as `Recent weekly-action outcomes (learn from these...)`. Once the row
is deleted, that reflection cannot reach the advisor again — not "harder to find," gone. The
act → reflect → advisor-adjusts loop the founder's own plan names as what separates this
product from a to-do list is destroyed by the same click that's supposed to feed it.

**Live evidence this already happened, not a theoretical risk**: `product_events` holds 4
distinct `weekly_action_completed` action ids from 2026-08-22/08-23. All 4 are confirmed
absent from `weekly_actions` today (`select id from weekly_actions where id in (...)` returns
zero rows) — `weekly_actions` currently holds 22 rows, every one `not_started`, zero with a
`reflection_outcome`. The two affected accounts (`46dd6f7e…`, `e9eba798…`) each show exactly 2
`weekly_plan` notifications, i.e. roughly two regenerations apiece. **This was not a heavy-use
edge case** — the account that regenerated 100 times (`ccf2161e…`, the founder's own account,
confirmed via `profiles.display_name`) has zero completions, nothing to lose. The lightest
plausible use — complete an action, reflect, regenerate once or twice — was enough to erase it
on two separate accounts.

**The decision** (not made here — three real options, not equally simple to build):
- **(a) Carry completed actions forward** into the regenerated plan instead of deleting them,
  so a student's history persists across regenerations within the week.
- **(b) Delete only non-completed actions**, leaving anything with `status = 'completed'` (and
  its reflection) untouched by the delete.
- **(c) Soft-delete** (a `deleted_at`/similar column) so the row and its reflection survive in
  the table even after being removed from what's rendered, recoverable and still readable by
  `buildStudentAdvisorContext` if that function is updated to include it.

No option is applied. Whichever is chosen still needs `lib/plan/persist.ts:70`'s unconditional
delete rewritten, which is real, scoped work, not a one-line fix.

**Two related defects in the same function — already fixed and pushed, not part of the
decision above.** Both are the same shape (an unconditional insert on every regeneration, no
dedup, going back to the same finding that `getOrCreateWeeklyPlan` has exactly two callers —
the regenerate action and the dashboard's own lazy first-generate — and neither is a scheduled
job a student could be away from, so every one of these inserts happened while the student was
looking at the page):

1. **Notification spam.** `createNotification(...)` at line 118 fired on every regeneration,
   unconditionally. Live: one account (`ccf2161e`, the founder's own) had **100** identical
   "Your weekly plan is ready" notifications, **107 of 110 notifications in the whole table**
   unread. Fixed by mirroring `lib/deadlines/scan.ts`'s own `notifyIfThresholdCrossed`
   dedup-before-insert pattern, scoped to the ISO week (matching `weekly_plans`' own
   one-row-per-week shape): skip the insert if a `weekly_plan` notification already exists for
   this user since the week started.
2. **`ai_recommendations` duplication reaching the advisor's prompt.** Line 105 inserted a new
   `avoid_for_now` row on every regeneration with no dedup either. Live: 110 rows total, the
   same 100 for the same founder account, split 99/1 across exactly 2 distinct titles (not an
   even split — corrected after an initial "fifty each" characterization that turned out to be
   arithmetic, not a query). `lib/ai/student-context.ts:274` reads the 15 most recent
   `avoid_for_now` titles undeduplicated into the prompt's "don't repeat this" list — for that
   account, most of those 15 slots were the same one or two titles repeated, degrading the
   exact mechanism meant to stop Oryn re-suggesting something already rejected, worst for the
   account that uses the product most. Fixed the same way as (1), at the write site in
   `lib/plan/persist.ts`, not by touching `student-context.ts` — same file, same precedent, and
   it avoids any change to the prompt-assembly code a separate eval-harness effort depends on
   matching exactly.

**What the two fixes above do not do, stated plainly rather than left implied**: they stop
*new* duplicates. They do not clean up the **110 rows already in the table** — a live data
write, so it stays out of this branch; it's a one-time cleanup someone with write access can do
once the fix above is live: `ccf2161e` (the founder's own account) will keep showing a
degraded, mostly-repeated "avoid for now" history to the advisor until those existing rows are
cleared.

**A separate, smaller spec gap surfaced by the same investigation**: Phase 30 names five
background jobs including "Job D: Weekly student plan generation," but no scheduled job
actually calls `getOrCreateWeeklyPlan` — its only two callers are both request-time (the
regenerate action, the dashboard's lazy generate). Every plan in the table today was generated
by a student sitting on the page, not a Monday-morning cron. Reporting this as its own gap,
not building it: whether weekly plans should generate on a schedule (and, if so, whether *that*
context is the one place today's notification would have been genuinely useful) is a separate
product question from the three defects above.

**Depends on**: your decision on (a)/(b)/(c) above for the deletion behavior. The two dedup
fixes and this write-up need no decision — already on `oryn/plan-regenerate-defects-2026-09-01`.

---

## 40. Product decision: fourteen internal tables carry a default grant their own RLS already denies — safe to revoke it?

**Action**: approve a migration that revokes Supabase's default schema-wide `anon`/
`authenticated` grants on the fourteen tables listed below — with one table (`product_events`)
handled differently, not identically, per the carve-out below.

**Why it's one question, not fourteen**: this started as the exposure note attached to item 33
(`qs2027_import_staging`), but that table isn't special — checking it properly meant checking
what it's actually a member of. Re-derived independently rather than trusted forward (item 33's
own history is three straight corrections in one evening — see
`docs/handoffs/` if that sequence is instructive — so this entry re-ran every check from
scratch rather than inheriting a number):

- **14 of 78 `public` tables have RLS enabled and *zero* policies**, confirmed directly against
  `pg_policies` (not just the advisor lint): `canonical_entity_merges`,
  `canonical_field_policies`, `deadline_research_queue`, `entity_locations`,
  `entity_relationships`, `entity_verification_queue`, `external_sync_jobs`,
  `global_university_discovery_queue`, `product_events`, `program_research_queue`,
  `provider_health`, `qs2027_import_staging`, `requirement_research_queue`,
  `university_profile_verification_queue`. Confirmed complete — no fifteenth table with zero
  policies exists.
- **The default grant is not what makes these fourteen distinctive.** All 78 `public` tables
  (80 relations, counting two views) carry Supabase's default `anon` grant — it's schema-wide,
  not something switched on selectively. What's distinctive about these fourteen is that,
  unlike the other 64, **nothing currently converts the grant into access**: RLS is on and
  denies everything, by omission rather than by a rule anyone wrote and can reason about. A
  single permissive policy added carelessly, or one `DISABLE ROW LEVEL SECURITY` during an
  incident, turns any of them into live anonymous-or-authenticated CRUD with no further step
  required — ORYN-BASORG's framing for the original nine-table version of this: *a loaded gun
  with the safety on, and the safety is a thing people turn off casually.*
- **Exactly one of the fourteen holds anything that looks like student data.** Checked every
  column on all fourteen for a `user_id`/`profile_id`/`student`/`email`-shaped column:
  `product_events.user_id` is the only hit. The other thirteen are research/ingestion queues,
  entity-canonicalisation bookkeeping, and operational telemetry over public-domain university
  data — some large (`program_research_queue` alone is 19,034 rows), none minor-safety data.

**The `product_events` carve-out — this is not a fourteenth identical case, and treating it as
one would silently break something that just shipped.** Migration `0073` (already applied) gave
`authenticated` users a real, scoped policy: `select own product_events … using (user_id =
auth.uid())`, specifically so the data-export endpoint can return a student's own analytics
rows instead of a silent empty section. **A Postgres RLS policy only restores access within
what the underlying `GRANT` already permits — it cannot grant access the table-level privilege
doesn't have.** Revoking `authenticated`'s `SELECT` on `product_events` as part of a blanket
sweep would make `0073`'s policy unreachable: the export would go back to silently empty, the
exact failure mode `0073` was written to close, and nothing would error to say so. Every other
part of `product_events`'s default grant is safe to revoke by the same logic as the other
thirteen — `0073`'s own text states writes stay service-role-only "exactly as today," matching
what the code shows (below), and `anon` gets nothing from `0073` at all (`auth.uid()` is null
for an anonymous request, so an `anon` grant here was never doing anything).

**Checked, not assumed, whether a revoke is safe for what's actually running today** — CEO's
explicit ask, because a revoke that silently breaks an ingestion script would be a bad trade for
a theoretical exposure. Every file in `lib/`, `app/`, and `scripts/` referencing any of the
fourteen tables was checked for which Supabase client it writes through:

- **Four tables have no code reference anywhere in the application** — `entity_locations`,
  `entity_verification_queue`, `university_profile_verification_queue`, and
  `global_university_discovery_queue` were seeded once by their own creating migrations
  (`0038`/`0039`/`0044`/`0051`) and have no `lib/`, `app/`, or `scripts/` file touching them at
  all today. Nothing can break because nothing calls them.
- **Every other write path goes through the service-role key, with no counter-example found.**
  In application code: `lib/providers/health.ts`, `lib/jobs/run-with-tracking.ts`, and
  `lib/analytics/log.ts` (the three files that write `provider_health`, `external_sync_jobs`,
  and `product_events` respectively) all call `createAdminClient()` directly. Two files that
  import both a request-scoped and an admin client (`lib/opportunities/persist-matches.ts`,
  `lib/requirements/persist.ts`) use the request-scoped client for reads only and route their
  one write elsewhere (`opportunity_matches`, `student_requirement_evaluations` — neither in
  this set) through `admin`. In scripts: every ingestion/acquisition script referencing
  `program_research_queue`, `deadline_research_queue`, `requirement_research_queue`,
  `canonical_entity_merges`, `entity_relationships`, or `qs2027_import_staging` (thirteen
  scripts checked by name) constructs its own client directly from `SUPABASE_SECRET_KEY` — the
  service-role key, not the publishable one. Service-role bypasses grants and RLS entirely, so
  none of this depends on what `anon`/`authenticated` can do.

**Proposed shape** (not yet written as a migration — sketched here so approval and drafting can
happen in one round trip):

```sql
-- Thirteen tables: strip the default grant entirely for anon and authenticated.
revoke all on table
  public.canonical_entity_merges, public.canonical_field_policies,
  public.deadline_research_queue, public.entity_locations, public.entity_relationships,
  public.entity_verification_queue, public.external_sync_jobs,
  public.global_university_discovery_queue, public.program_research_queue,
  public.provider_health, public.qs2027_import_staging, public.requirement_research_queue,
  public.university_profile_verification_queue
from anon, authenticated;

-- product_events: strip everything for anon (its 0073 policy never covers it); for
-- authenticated, strip only what 0073 didn't intend to grant, keep select.
revoke insert, update, delete, truncate, references, trigger on table public.product_events
  from anon, authenticated;
revoke select on table public.product_events from anon;
```

**Trade-off**: none identified against current functionality — see the write-path audit above.
The only cost is to any *future* code that assumes the default grant is still there; going
forward, a table meant for `anon`/`authenticated` access needs an explicit `GRANT` alongside its
policy, which is the pattern the rest of the schema already follows.
**The broader posture question, beyond these fourteen**: should a newly created internal/queue
table ever inherit the default schema-wide grant, or should new tables be created with grants
revoked by default and added back explicitly only when a policy exists to bound them? That's a
standing-convention decision, not just a cleanup of these fourteen — worth deciding once rather
than re-litigating at table fifteen.
**Depends on**: your call — it's DDL against live grants, not data, but still waited for you per
the same discipline as item 33.

---

## 40. Approve applying migration 0059 (widen the YÖK placement-cycle unique key)

**Action**: decide whether to authorize applying
`supabase/migrations/0059_schema_gaps_2026-08-22.sql`'s change to
`university_program_placement_cycles_key_idx` — widening it from
`(program_id, cycle_year, burs_orani_adi, fymk_id)` to also include `kilavuz_kodu`.
**Why it's blocked**: not technical — the migration is written, and the file's own comment says
it needs authorization before running against the live, populated table. Confirmed still not
applied today (2026-09-01): `pg_indexes` shows the live index still in its 4-column form.
**What it unblocks**: 23 real YÖK Atlas placement records currently colliding onto shared keys
with genuinely different pairs — e.g. two of Yıldız Teknik's own admission tracks (Turkish-medium
vs. English-medium, or day vs. evening — not confirmed which) with a 2,830-place ranking gap and
15-point cutoff difference between them, both trying to occupy one row. Without the widened key,
one of every colliding pair silently doesn't exist in the data a student would see once §0's read
side gets built (see `docs/handoffs/tr-university-depth-gate-f-2026-09-01.md`). First found and
explained in full in `docs/handoffs/yok-placement-key-gap-2026-08-22.md`, including the harder
question worth reading before approving: **widening the key lets two tracks share one
`university_programs` row; the more honest fix might be splitting the row instead** (same shape
as Durham's BSc/MChem and four other institutions' variant-field collisions this project has
already hit). This item approves the cheaper, reversible fix; the harder question is not this
item's call to make.
**What it does NOT do**: insert any of the 23 rows itself (that still needs the ingest script's
`--apply` run afterward) or touch the *other* pending YÖK migration, item 26
(`university_programs.kilavuz_kodu`, a source-traceability column — related field, different
table, different migration, independently blocked).
**Depends on**: your call — DDL against a populated table, no different in kind from items 33/35.

---

## Environment hazard (not a decision, but you should know)

**The primary checkout `/Users/adasarpkirik/Desktop/Founder/ORYN` sits on branch
`oryn/hide-social-nav`, which has genuinely diverged from `main`** (212 behind, 8 ahead, not an
ancestor). Two real consequences hit on 2026-08-22: the long-running dev server on `:3000` was
serving 212-commit-stale code — including a font bug already fixed on `main` — and every
coordination doc commit made from that checkout landed on the diverged branch instead of `main`,
invisible to anyone reading `main`, until it was caught and rescued (PR #11).
**No session may change this unilaterally** (org rule: nobody works in the primary checkout).
Worth deciding what that checkout should be on. In the meantime, no lane verifies against
`:3000`; each stands up its own server from `main`.

---

## Environment-capability gap (not founder-blocked, noted for completeness)

**RLS/server-layer integration testing** was investigated this pass (not skipped
unexamined — see `docs/production-route-audit.md`'s "Server-layer / RLS integration
testing" section for the concrete Docker/PostgREST/auth-schema investigation) and
correctly not built: it would need either a real Supabase project or Docker becoming
available in the execution environment, neither a "give me a credential" ask. Not on the
numbered list above because there's no single founder action that unblocks it — it's a
standing capability gap, revisit if either becomes available.
