# ORYN Research Freeze — Gap Map

**Maintained by: CEO (control tower).** Rewritten in place at each checkpoint, not appended to.
Numbers below are measured live against `opportunities`/`universities` in Supabase project
`qtcvcflzxbuagvvwahhu` (oryn-qa-scratch) — re-run the queries in this file's own footer before
trusting this beyond same-day use.

## Checkpoint: 2026-08-26, freeze day 1, ~09:15 (session start)

## 1. University photos (S1-S4 scope)

**CORRECTED 2026-08-26 ~09:50 — my first pass here was wrong, not just incomplete.** Original
text below this line said "0 image infrastructure, genuine cold start." Flagged independently
by S10 (CFO) within ~15 minutes, then independently confirmed by S2 (own live query) and S8
(own `information_schema` check found the same column-level absence I did). Root cause: I
grepped migration files for a literal `image_url`/`photo_url` column and found nothing real —
but the actual data lives in a generic EAV table (`metric_code`/`value_text` pairs), which a
column grep structurally cannot see. Same blind spot hit S8 independently via a different
method (schema introspection, still column-based). Leaving the wrong version struck through
above rather than deleting it — the methodology miss is worth other sessions seeing, not just
the fix.

| | Count |
|---|---|
| Canonical universities needing a photo | **1,010** |
| Have a `primary_image_status` row in `university_profile_metrics` | **901** (109 have none) |
| — of which `wikimedia_verified` | **525** |
| — of which `official` | **194** |
| — of which `verified` | **2** |
| — of which `needs_review` (candidate rejected, reason logged) | **180** |
| "Accepted" total (wikimedia_verified + official + verified) — **pipeline-accepted, not visually verified, see below** | **721 / 1,010 (71%)** |
| Have `primary_image_license` recorded (CC BY-SA/CC BY/Public Domain/CC0 variants, 28 distinct license strings) | Present for the large majority of accepted rows |

**UPDATE 2026-08-26 ~10:35, from S3 — read this before treating 721 as "done."** S3 didn't just
query status, they downloaded and looked at 3 sample images from their own shard: **Bristol**
(a stone sign dominated by the university's own crest/wordmark — an outright §10 fail), **Stanford**
(a generic graduation-crowd photo with nothing identifiably Stanford in it — identity
unverifiable), **Heidelberg** (genuinely compliant — 1 of 3). n=3 is too small to extrapolate a
fleet-wide failure rate from, but it proves the point in the paragraph below with concrete cases:
**"721 accepted" means "passed a dimension/aspect-ratio check," not "passed the actual photo
standard."** Real semantic-verification status of the 721 is currently **unknown**, not good.
S1-S4: audit-first on every row in your shard, including the ones marked accepted — do not
skip straight to the 289 needs_review/no-candidate rows and assume the 721 are fine.

**Real infrastructure, confirmed by reading the code directly, not just the DB**:
`lib/acquisition/image-storage.ts` (Supabase Storage upload/optimize, bucket `university-images`,
real uploaded webp files — per S2), `lib/acquisition/image-validation.ts` (read directly by CEO:
separate dimension/aspect-ratio gates for campus photos — min 800x450, aspect 1.15-2.6 — vs.
logos — min 150px side, deliberately permissive on aspect), `lib/acquisition/opengraph.ts`,
`lib/universities/image-coverage.ts`, plus `scripts/acquire-university-images.ts` (624 lines) and
`scripts/university-image-coverage-report.ts` (130 lines). Git history: `f8a9b9c` "final
university image coverage — 708/1019 (69.5%) after rate-limit fix (round 2)" and refactor
`0b78387` (2026-08-22), both real, both on `main`.

**Separately, `universities.logo_url` exists as its own thing** (referenced in
`image-validation.ts`'s own doc comment) — **the Common Operating Contract §10 explicitly
disqualifies logos/crests/seals/wordmarks as a real photo**, so a populated `logo_url` does
**not** count toward photo coverage under this week's standard, regardless of how the pipeline
uses that column internally.

**What this changes for S1-S4**: this is a **verify-and-fill-gaps mission, not a cold start.**
The real, still-open gap — confirmed by reading `image-validation.ts` directly — is that the
existing pipeline only checks image *dimensions/aspect ratio*. **There is zero semantic check**:
nothing verifies the photo actually depicts the correct university (not a sister campus, not a
similarly-named institution), isn't a crest/seal that slipped past the campus-vs-logo split, and
isn't a generic city/stock photo. That gap — §10's `correct_entity_verified`/`no_logo_verified`
fields — is the real S1-S4 job on the 721 "accepted" rows, plus first-pass sourcing on the 109
with no candidate at all and re-attempts on the 180 `needs_review`. Prioritize the 109-with-
nothing and highest-exposure universities first; ask CEO for a `target_universities`/match-count
join if you need a ranked list rather than guessing.

**Founder escalation #1 — now fully resolved, closing it, not just downgrading it.** S2 checked
the actual read side directly: `app/(app)/universities/page.tsx:289` and `.../[id]/page.tsx:120-
129` both query `university_profile_metrics` with an explicit `.in("metric_code", [...])`
allowlist. So: (a) **write side needs no migration** — `acquire-university-images.ts` already
writes 5 distinct metric_codes today, a new one is just another write; (b) **surfacing a new
metric_code in the UI needs a small, explicit code change** (add it to those two `.in()` lists)
when promotion actually happens — not a migration, but not silently automatic either. No founder
action needed for S1-S4 to keep working now.

**New flag from S8, unconfirmed pending their own re-check**: of the 194 `official`-sourced
images, S8's first pass found no captured `primary_image_license` on that subset. If that holds,
§10 requires those be marked `RIGHTS_REVIEW_REQUIRED`, not silently treated as fine because
`status='official'`. S8-B is verifying the exact count before this is asserted as fact — treat
as **provisional** until S8 confirms.

**Minor denominator note**: S8 independently measured against 1,019 total university rows (901
touched / 118 none) rather than 1,010 *canonical* rows (901 touched / 109 none) used elsewhere in
this doc. 1,010-canonical is the right denominator for "how many need their own photo" — the 9
superseded rows shouldn't need independent coverage. Both measurements are real and consistent
with each other once you account for the 9-row difference; noting so nobody reads it as a
conflict.

## 2. Opportunities, by category (S5-S7 scope) — live counts, all statuses

| Category | active | under_review | other | **total** |
|---|---|---|---|---|
| summer_program | 149 | 87 | 17 (1 expired, 16 disabled) | **253** |
| competition | 70 | 31 | 0 | **101** |
| research | 10 | 3 | 0 | **13** |
| internship | 7 | 1 | 0 | **8** |
| scholarship | 8 | 1 | 0 | **9** |
| volunteering | 6 | 1 | 0 | **7** |
| entrepreneurship | 5 | 0 | 2 (disabled) | **7** |
| student_program | 7 | 0 | 0 | **7** |
| online_program | 6 | 0 | 0 | **6** |
| fellowship | 5 | 0 | 0 | **5** |
| academic_program | 1 | 2 | 0 | **3** |
| conference | 2 | 0 | 0 | **2** |
| **Total** | **276** | **126** | **19** | **421** |

### This is a real, live imbalance — not a hypothesis

`summer_program` + `competition` = 354 of 421 rows (84%). The other ten categories combined =
67 rows (16%), and several of those ten are the categories most directly tied to a strong
application profile beyond "did a program": **research (13), internship (8), fellowship (5),
academic_program (3), conference (2)** — 31 rows combined, most of it not yet `active`.
Publications/awards/leadership as *named categories* don't exist in the schema's own `category`
enum at all (they may be living inside `competition`/`research`/tags — S7 should confirm rather
than assume a true zero).

**Directive for this checkpoint**: S5/S6 capacity should shift toward *closing gaps within*
summer_program/competition (deadline/eligibility/cost completeness — per the 2026-08-23/24
corpus, still real gaps there) rather than adding volume to already-thick categories. **S7
(scholarships/awards/publications/leadership/online/Türkiye-global) is this checkpoint's
highest-leverage category** — smallest base, least prior-session attention, and covers ground
(publications, leadership, awards as such) that may not exist as findable rows at all yet.
Redirect any idle S5/S6 capacity to S7-shaped candidates before adding a 150th summer program.

## 3. Turkey-access and second-review status — not yet measurable

`turkey_student_access` (VERIFIED_ELIGIBLE / ELIGIBLE_WITH_CONDITIONS / NOT_ELIGIBLE / UNCLEAR)
is this freeze's own new field — it is not a live DB column, so it cannot be queried yet. Until
S1-S8 report it through the registry, the honest state is: **unmeasured**, not zero. Do not
read "421 opportunities live" as "421 usable by a Türkiye-based student" — the 2026-08-23/24
corpus already found real counter-examples in both directions (Caltech SRC restricted to one
US school district; AI Scholars CMU restricted to US citizens; MITES/Clark/SIMR US-only) sitting
inside what reads as a healthy active count.

## 4. Grade-band and subject-family coverage — not yet measured

Not measured this checkpoint — `opportunities.fields`/`eligible_grades` would need a live query
per subject family (STEM/Math/CS-AI/Science/Engineering/Business/Economics/Finance/
Entrepreneurship/Essay/Humanities/Law-Politics/Arts/Architecture) and per grade (9-12). Flagging
as an open gap in the gap map itself rather than guessing — next checkpoint.

## 5. Geographic access-pathway coverage — partial read from prior corpus only

Prior corpus (not re-verified live this checkpoint): strong US/UK coverage, real Netherlands/
Germany/Canada/Australia programme-catalogue depth (separate table, `university_programs`,
not `opportunities`), a dedicated Turkey-opportunities pass (2026-08-21, 24 records) and Turkey
national-route resolution for 6 flagship olympiads. Asia (beyond a few named competitions) and
"Online/year-round, geography-agnostic" as an explicit opportunity shape are both thin on
first read — not yet quantified.

## Known operational risk, not yet urgent (flagged by S1, recording so it isn't lost)

All S1-S4 work is dry-run/proposal-only right now — no `--apply` runs, per the Common Operating
Contract. `scripts/acquire-university-images.ts` has checksum dedup so the same photo can't land
on two universities, but **has no protection against two concurrent `--apply` runs racing on the
same Storage bucket.** Not a problem today (nobody is applying). Whoever on DATA/CEO eventually
promotes S1-S4's verified batch to production should serialize that step rather than let multiple
sessions run `--apply` in parallel.

## Founder escalations queued (not yet sent — batching for one message, not one per finding)

1. **University-photo schema doesn't exist.** S1-S4 can source and verify candidate images now,
   but writing them to production needs new columns (`image_url`, `image_source_url`,
   `image_depicts`, `image_verified`, `no_logo_verified`, `correct_entity_verified`,
   `rights_status`) — a migration, which no research lane (including CEO) may create per the
   Common Operating Contract. Recommend DATA or a founder-authorized session drafts this once
   S1-S4 has a real verified batch to size it against.
2. **`turkey_student_access` and `selectivity_evidence` have no columns either** — the second
   is a carried-over gap from the 2026-08-23/24 corpus (`summer_schema_and_pipeline_gaps_2026-
   08-24.md`, 15 items), not new. Same blocker shape as #1.

## How these numbers were produced (re-run to refresh)

```sql
select category, status, count(*) as n from opportunities group by category, status order by 1,2;
select count(*) from universities where duplicate_status = 'canonical';
```
Run against Supabase project `qtcvcflzxbuagvvwahhu` via `execute_sql`. Photo-infrastructure
absence confirmed via `grep -rn "image_url\|photo_url\|image_source\|no_logo_verified"
supabase/migrations/` (zero hits, all 65 migrations).
