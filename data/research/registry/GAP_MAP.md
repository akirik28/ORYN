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

**CONFIRMED 2026-08-26 ~11:40, no longer provisional**: 0 of 194 `official`-sourced images have
any captured usage right — 100%, control-checked against the wikimedia path (which does capture
license reliably) to rule out a query artifact. All 194 are `RIGHTS_REVIEW_REQUIRED` per §10
until someone establishes usage rights.

**Bigger finding underneath it, from S8's Track B (20 images visually inspected, non-overlapping
with S3's 3)**: `status='official'` is not a reliable photo-quality signal at all — 3-4 of 7
`official` rows are a flat logo/crest/mascot image, not campus photography. `wikimedia_verified`
fared much better: 13 of 13 inspected passed clean. Combined with S3's earlier 2/3 failure (23
total non-overlapping spot-checks across two independent lanes), the pattern is: **don't treat
`official`-status rows as photo-ready without a human visual check; `wikimedia_verified` can be
leaned on with lighter-touch spot-checking.** Prioritize S1-S4 audit effort on `official`-tagged
rows first. Also confirmed: the `needs_review` gate is purely dimensional (resolution/aspect-
ratio only) — a real campus photo (King Faisal University) sits stuck there over an 8%-narrow
width shortfall while a real logo (Alfaisal) slipped past it into `needs_review` by accident, not
by any content check. Don't fully trust `needs_review` either direction without looking.

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

## S8's QA gate — first full pass complete, 2026-08-26 ~11:40

Both tracks pushed to `oryn/s8-qa-gate` (`bdd7dce`): `data/research/qa/s8_qa_track_a_2026-08-26.md`
(facts/eligibility/currentness, 459 lines) and `s8_qa_track_b_2026-08-26.md` (images/duplicates/
link-integrity, 453 lines). This is the first checkpoint with findings on the **live, real-user
harm surface**, not just research/coverage gaps — escalated to the founder directly rather than
held for an end-of-week rollup. Summary (full citations in S8's own docs):

**7 live defects on the actual 203-row recommendation surface (real students, right now):**
İTÜ Lise Yaz Okulu 2026 (cycle_status wrongly "upcoming," deadline 41 days past) · Özyeğin Summer
Research Program (cycle_status contradicts its own description — the same institution-banner
conflict CR1 flagged 3 days ago, still unreconciled) · Istanbul Bilgi University Summer School
(deadline 14+ months stale, still `verified_current`) · Interlochen Review (CR1's proposed
recategorize+close fix from 2026-08-23/24 never applied) · JEI/THIMUN/InvestIN (all three have
live-confirmed real mandatory fees; DB shows `cost=null` on all three — THIMUN's is a quotable
€340+/person).

**Broader punch list (Browse-surface, not the harm-surface 7)**: 1 fully-dead record (both URLs
404, UWC Short Courses) + 5 more 404s + 1 reproducibly-unreliable (522 ×3, Genç UPSHIFT); CJSJ's
domain still doesn't resolve (flagged 2026-08-24, never fixed); 5 unresolved duplicate clusters
(Belin-Blank SSTP, UCSB Research Mentorship, Lehigh, Phillips Exeter, Sabancı Summer School — same
disable-the-weaker-row fix already proven on 8 others); `opportunities.official_url` has no
unique constraint (schema note, not urgent — 3 of 11 URL-collision clusters found were legitimate
one-URL-many-programs cases a naive constraint would wrongly block). Lower-priority, still open:
HMMT deadline null, AMC-AIME wrong/merged official_url, Stockholm Water Prize wrong-entity — all
three flagged in the 2026-08-23/24 corpus and never fixed.

**Process-integrity finding, worth a standing convention**: `GAP_CLOSURE_5RECORD_DRYRUN_2026-08-
24.md` and `TUBITAK_6OLYMPIAD_DRYRUN_2026-08-24.md` both still read "awaiting review" in their own
closing lines, but all 11 proposed records were actually written to production hours before
either file was saved — nearly caused this very audit to wrongly report already-shipped work as
a gap. Recommend a one-line `APPLIED [timestamp]` stamp convention on every dry-run doc once its
proposals are promoted, going forward.

**Also worth knowing — reassuring, not just bad news**: the BU/SAIC duplicate-row fixes and
Mathworks/Fordham URL fixes from the prior corpus are all confirmed still holding. The harder
eligibility/citizenship/age judgment calls (Breakthrough Junior Challenge, Wharton, Coca-Cola
Scholars, TechGirls) all checked out accurate on live re-fetch. The real defect surface clusters
narrowly around **stale Turkish-institution banners and missing fee amounts**, not the
higher-stakes eligibility category — worth knowing precisely rather than reading this as "the
corpus is broadly untrustworthy."

S8 has no write access to `opportunities`/`university_profile_metrics` (correct, by design) — all
of the above is routed to the founder for a promotion decision, not applied by any research lane.

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
