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

**5 live defects on the actual recommendation surface (real students, right now) — corrected
2026-08-26 ~12:10.** Originally reported as 7; S8 caught their own error before it reached
anyone consequential (re-verifying for the founder-bound copy-paste list, they found their
subagent's completion summary didn't match its own underlying evidence for 2 of the 7).
**Interlochen Review and JEI are Browse-only** (`unverified`/`under_review`, same tier as HMMT/
AMC/Stockholm Water Prize below) — not on the real harm surface, removed. All 5 remaining
independently re-verified via direct SQL immediately before this write, each with a row id and
a live-refetch citation:

1. **İTÜ Lise Yaz Okulu 2026** (`973b3bdd-59c2-4e99-a76b-2006b365d63a`) — `cycle_status=
   "upcoming"`, deadline `2026-07-16` is 41 days past today. Institution's own page still shows
   "SON KAYIT: 16 TEMMUZ," matching our stored deadline exactly — `cycle_status` was simply never
   updated once it passed. Should read `closed`/`historical`.
2. **Özyeğin University Summer Research Program** (`2f0e0301-5dd4-4d25-91a4-8f73bf5584e9`) —
   `cycle_status="closed"` directly contradicts our own `description` ("2026 applications are
   open"). Live re-fetch today: the institution's own banner still reads "APPLICATIONS FOR 2026
   ARE NOW OPENED!" — needs human reconciliation (stale banner vs. genuinely rolling admission),
   not a simple flip. Same conflict flagged 2026-08-23, still untouched.
3. **Istanbul Bilgi University High School Summer School** (`d780bc55-41e0-444b-8bcc-
   3f927b28c4b7`) — `deadline=2025-06-12` (14+ months stale) on a row marked `verified_current`.
   The row's own `description` already hedges this ("no 2026 dates/pricing published") but the
   structured `deadline` field doesn't reflect that hedge — anything reading `deadline` directly
   sees a year-plus-old date presented as current.
4. **THIMUN The Hague Conference** (`960dcf4d-322c-4e72-8c99-0a1d3368b2ea`) — `cost=null`;
   live re-fetch confirms €340.00/person plus €190.00/school delegation fee (pre-payment packages
   €1,210–€5,290). Separate issue on the same row: registration is school-routed ("only students
   from participating schools can apply for an individual student position"), not stated anywhere
   in the description.
5. **InvestIN — Immersive Career Experiences** (`8a7c89e4-e63a-4f64-a76d-4bae1b31e889`) —
   `cost=null`; not free — exact figure not yet pinned down, but the program's own dedicated
   "Scholarship Scheme" is strong evidence of a paid model (a financial-aid mechanism wouldn't
   exist for a genuinely free program). Recommend "confirmed non-free, figure pending" rather
   than a blank unknown.

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

## S4's full-registry structural audit — third independent confirmation of the rights gap

`docs/research/university-photos-s4/STRUCTURAL_AUDIT.md` on `origin/oryn/s4-university-photos` —
a DB/HTTP-level pass (not visual) across all 1,010 universities, explicitly scoped for S8/CEO to
route, not a re-judgment of other shards' work. Clean plumbing confirmed: **zero broken image
links** across all 714 live `primary_image_url` rows (a first automated pass flagged 22 as dead —
a connection-burst false alarm, all 22 confirmed HTTP 200 on individual slower recheck — worth
relaying as a general lesson: verify a "broken link" claim with a slow, one-at-a-time recheck
before asserting it, concurrent HEAD-check bursts produce false positives), **zero** cross-
institution checksum collisions, **zero** accepted rows with a missing URL or checksum.

**Sharpens the rights-gap finding, doesn't just repeat it**: license completeness is exactly
inverted by status — `wikimedia_verified` is **525/525 (100%)** license-complete, `official` is
**0/194 (0%)** — confirming (a third independent way, after CEO's own count and S8's) that the
rights gap is a systemic property of the `official` acquisition path specifically, not a random
per-row gap. Minor, low-priority addition: **17 `wikimedia_verified` rows have a populated
license but no attribution** (Commons "artist" field empty — likely older/bulk-imported files,
not an extraction bug): Aarhus, Central South University, Coventry, Florida State, Graz TU,
KU Leuven, NTHU, Novosibirsk State, Salzburg, Politecnico di Torino, Bucharest, UCLA, Florida,
Missouri-Columbia, St Andrews, Wisconsin-Madison, Utrecht. Not blocking — flag only if attribution
is ever surfaced next to the image in-product.

## Time-sensitive founder item — deadline in 4 days, from S6

**Marshall Society Essay Competition** (`5f7ef5d4`, live/`verified_current`) has zero Turkey-
eligibility data recorded and a **2026-08-30 deadline (4 days out)**. S6-B researched fresh
today: "open to all students who have not yet begun university," no geographic restriction found
on the operator's own page (2 direct fetches), corroborated by a long-running third-party UK
econ-teaching resource. Proposed `VERIFIED_ELIGIBLE`, medium-high (not top) confidence — the
linked full-rules Google Doc was never opened and could contain an unseen restriction. This is an
enrichment opportunity with a real expiry, not a standing item — worth a promotion decision before
Saturday specifically, unlike the rest of this week's normal-priority queue. Full record:
`S6B-0001` in `data/research/opportunities/s6b_essay_humanities_batch1.jsonl` on
`oryn/s6-competitions-research`.

**Separately, lower urgency, a real code-level gap not fixable by any research lane**: Wharton
Global HS Investment Competition's team-size requirement (4-6 students + teacher advisor) is
correctly stored in the row's `description` but never reaches the AI advisor's context assembly —
confirmed independently twice (the 2026-08-23/24 corpus, then S6-B today). Worth a PRODUCT/
engineering look at why `description` content doesn't flow into advisor context generally, since
this is likely one instance of a broader pattern, not a single-row bug.

## S7 Wave 1 complete — safety finding, real partial saturation, capacity decision

67 unique accepted (41 `VERIFIED`+resolved-Turkey-access ready for S8, 26 `CANDIDATE`/`UNCLEAR`
needing more work), 75 rejected-with-reasons (logged so nobody re-researches them), against a
nominal ≥140 target for this category. Below target for evidence-backed reasons, not corner-
cutting — full reasoning in `s7_MASTER_CLOSEOUT.md`: genuine category thinness (Turkish
foundations largely don't fund study-abroad; most famous international scholarships are
citizenship-restricted or graduate-only), a real structural finding (~zero multi-month
fellowships are Turkey-accessible for this age group), correctly-avoided padding (B2
independently found ~200+ already-covered titles in this directory before spending budget), and
a hit tool-call ceiling on 3 of 4 sub-agents with specific named unexplored leads recorded, not a
blind stop.

**Safety finding, not just a data-quality one**: `youthmedicaljournal.org` (note: not `.com`) now
redirects to a gambling site. Independently reconfirmed by S7 directly, not a sub-agent artifact.
Logged here prominently so it's never mistaken for a live candidate by any lane — this is exactly
the class of finding that must never reach a student, regardless of category ownership.

**QA pattern worth checking fleet-wide, flagged by S7**: found 7 of their own records where
`turkey_student_access` claimed stronger confidence than the underlying `verification_state`
actually supported — self-assessed eligibility confidence outrunning fetched evidence. Normalized
all 7 in their own output. S7's own read: this looks like a structural artifact of how confidence
gets self-reported generally, not S7-specific — **S8 should check whether the same pattern shows
up in S5/S6's output**, not just S7's.

**Capacity decision**: approved a bounded Wave 2 (3 sub-agents against S7's own specifically-
named remaining leads — more scholarships, remaining publication categories, Turkish corporate-
foundation fellowships), explicitly **not** as a push toward the 140 number for its own sake.
Stop when the named leads are exhausted, even if that lands well below 140 — per the Common
Operating Contract, quality and evidence-backed saturation beat quota-chasing. If Wave 2 also
saturates quickly, that's a legitimate, evidenced answer for this category, not a shortfall to
explain away.

## S6 lane closed — 69 records, depth over volume, new gap found

Full closeout, `oryn/s6-competitions-research`: **12 self-graded production-ready** (11 genuine
new/enriched + 1 discontinuation-confirmation), 2 candidate, 2 rejected, 2 blocked, 6 ready-for-
review, 45 verified. Deliberately stopped at 69 against a nominal ~180 share — evidence-backed
(competition is already 24% of the corpus alone), not a shortfall. Key finds: **TÜBİTAK 2204-A/
2202** were completely absent despite 6 live olympiads' descriptions assuming that domestic
qualification route exists (closed); **GençBizz** (26-edition, Ministry-of-Education-protocol,
81-province Turkish entrepreneurship competition) found via dedicated Turkish-language search,
existed nowhere in the prior corpus; the **affiliation-inflation pattern** (Contract §8) recurred
a second time (UniHive, after Blackstone) — worth a dedicated cross-category sweep later, not
just this lane's finding. Two known live defects re-confirmed (not fixable without write access):
Stockholm Water Prize still wrong-entity (flagged 3 days ago, still live), FRC/FIRST Robotics
likely-duplicate pair with a newly-found Turkish national organizer (frcturkiye.org).

**New gap surfaced, not previously tracked**: **0 of 69 opportunity records have any image** —
opportunity-level photos aren't in any S1-S8 lane's assigned scope (S1-S4 is universities only).
Likely true fleet-wide, not just S6's 69. Assigning S6 to a bounded photo-sourcing pass on their
own 69 records next (same §10 standard S1-S4 uses: open-license, correct-entity, no-logo,
dry-run only) — they have the domain context already built, more efficient than a cold lane.
Flagging for S8/CFO: worth checking whether this is a real gap across all ~400 opportunity rows,
not sized yet.

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
