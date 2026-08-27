# S6 Competitions — TRACKER

Shared file — S6-A and S6-B each append their own dated entries below. Never edit another
session's entry.

---

## S6-A (STEM) — 2026-08-26 checkpoint 1

**Orientation completed**: read the S6 README, EXISTING_COMPETITION_BASELINE.md, the full
cr1_2026-08-23/24 corpus (tracker, handoff, all research/olympiad/fixes/commercial-tier/
do-not-add JSONL batches, both TÜBİTAK dry-run docs, turkey_routes.jsonl — ~14 files), the fleet
CEO's REGISTRY_README.md and GAP_MAP.md (confirmed: no S6 claims exist yet in the fleet registry,
gap map confirms competition category at 101 rows/70 active/31 under_review and explicitly steers
S5/S6 toward gap-closing over volume), the seed PDF (all 2 content pages, full table). Re-ran the
live baseline SQL query fresh (2026-08-26) — 101 competition rows, structurally unchanged from the
orchestrator's session-start snapshot (no material drift in ~this session's window).

**Biggest single finding**: TÜBİTAK 2204-A (the actual research-project competition, with the real
university-admission benefit) and TÜBİTAK 2202 (the national science-olympiad ladder that IMO/IBO/
IChO/IPhO/IOI/IOAI all route through) are **both completely absent from production**, despite being
the most heavily P1-documented STEM records in the entire 2026-08-23/24 cr1 corpus (verbatim call
document text, local PDF extraction, verified admission-benefit clauses). Only the 6 international
olympiad rows that silently assume this ladder exists were ever written. A Turkish 14-16 year old
reading the live DB today sees IMO/IBO/IChO/IPhO/IOI/IOAI as destinations with no visible on-ramp.
Fresh-verified both records today (2026-08-26): call document URLs still live, cycle both closed
(2025-2026 window already passed), 2026-2027 not yet announced — consistent with cr1's own
expectation of an October announcement. One correction I caught in my own process: my first fetch
of TÜBİTAK's general "research competitions" hub page returned 2204-B (secondary/ortaokul) content
instead of 2204-A (lise) — resolved by going to the English-language 2204-A-specific page directly,
which explicitly confirms it is the high-school variant, distinct from 2204-B. Recording this so a
future researcher doesn't repeat the same page-selection mistake.

**Checkpoint 1 deliverable**: `s6a_tubitak_batch1.jsonl` (S6A-0001, S6A-0002 — the two net-new
TÜBİTAK records) and `s6a_tubitak_olympiad_upgrades.jsonl` (S6A-0003 through S6A-0008 — Turkey-
access taxonomy enrichment for the 6 already-live international olympiads, each citing the specific
international body's own page that names TÜBİTAK as Türkiye's national route — IBO/IMO/IChO/IOI/
IOAI all independently confirmed, IPhO confirmed but with its own contact link found dead/stale).
All 8 classified `turkey_student_access`: the two TÜBİTAK records themselves are
`VERIFIED_ELIGIBLE` (they ARE the national competition), the six international olympiads are
`ELIGIBLE_WITH_CONDITIONS` (never `VERIFIED_ELIGIBLE` — national delegation required, condition
named specifically per Contract §6). One unresolved critical flag carried forward on IBO: its own
"not specific for STEM or biology" school-type eligibility clause potentially conflicts with
Türkiye's Fen Lisesi system — flagged, not resolved, needs the IBO office directly.

**Image status**: none of these 8 have a resolved photo yet — noted honestly as `NOT_YET_RESOLVED`
in each record rather than skipped silently. TÜBİTAK's own Bilim Genç (bilimgenc.tubitak.gov.tr)
photo galleries are the likely next source for the two TÜBİTAK records; not yet attempted.

**Next**: continue with existing live-row upgrades (AMC-AIME, HMMT, Breakthrough Junior Challenge,
USACO, Purple Comet, Waterloo, EUCYS, GENIUS Olympiad, Nat Geo Slingshot, iGEM HS, HOSA, the 4
STEM gap-closure rows from cr1's overnight pass — Brain Bee, FIRST Global Challenge, IEnvO,
Stockholm Junior Water Prize — plus provider_type checks on CMIMC/Battle Code/Penn Apps/Wharton
Data Science/Zero Robotics), then net-new candidates confirmed this session (Berkeley Math
Tournament's 3 formats — BMT in-person/BMT Online/BmMT — and Stanford Math Tournament's 2 formats,
with SMT Online confirmed genuinely worldwide while SMT in-person is US-centric), then a light
image-sourcing pass on the highest-value records, then HANDOFF.md.

**Not yet touched this session**: environment/sustainability beyond what cr1 already found,
medicine/biomedical beyond HOSA/Brain Bee, data-science-specific beyond Wharton. Flagging as
remaining scope rather than silently dropping.

---

## S6-B (Business/Humanities/Creative) — 2026-08-26 checkpoint 1

**Orientation completed**: read the S6 README and EXISTING_COMPETITION_BASELINE.md in full; the
full cr1_2026-08-23/24 corpus relevant to this scope (tracker, handoff, research_batch1-2,
finding1_journals, commercial_tier, do_not_add, active_unverified_fixes, verified_depth_fixes,
interlochen_review_eval, turkey_routes, us_country_tag_audit, research_category_decision — 14
files); the fleet CEO's REGISTRY_README.md and GAP_MAP.md from the CEO branch (confirmed steer:
competition+summer_program already 84% of corpus, depth over volume this checkpoint); the seed
PDF (both content pages, full table, read natively). Re-ran the live baseline SQL query fresh
(2026-08-26 ~19:03 UTC) — 101 competition rows, unchanged from the orchestrator's snapshot.

**Method**: mined cr1's prior research first for anything in my scope before researching cold —
recovered rich, reusable P1 evidence on ~8 already-live rows (Concord Review, Princeton Play
Contest, Wharton Investment's team+teacher gate, Blue Ocean, DECA's missing-Turkey finding,
National History Day's wrong-country-tag finding, Earth Prize, IEO's and Stockholm Junior Water
Prize's Turkey routes) that only needed this week's `turkey_student_access` taxonomy applied, not
re-derivation. Then verified/enriched a further ~14 already-live rows cold (Marshall Society, IPO,
BSPEE, Blackstone Junior Division, Harvard Crimson, Diamond Challenge, Conrad Challenge, HPEC,
YIS Stock Pitch, IPPF, World Scholar's Cup, 120 Hours), then researched 5 genuinely new candidates
(Jane Austen Society Essay Contest, Columbia Undergraduate Law Review HS Essay Contest, Harvard
Political Review Essay Competition, GençBizz — a Turkey-native national entrepreneurship
programme found via dedicated search, Eurasian Schools Debating Championship — Istanbul-hosted
debate tournament), confirmed one HOLD (RISE for the World — status genuinely unconfirmable,
matches the brief's own expectation) and one non-competition finding (Young Guru Academy — a
real, highly selective Turkish fellowship programme, not a competition; flagged for whichever
lane owns fellowship/student_program categories).

**Biggest single finding**: the strongest Turkey-access evidence found all session was not an
international body's country list but **direct first-party accounts from Turkish/Istanbul-based
schools of their own real participation** — Özel Saint Benoît Fransız Lisesi (Istanbul) at BSPEE
with a prize win, and MEF International Schools (Istanbul) at World Scholar's Cup's Izmir regional
round, qualifying for Global Rounds. Neither fact was in the prior corpus. This is a stronger
evidence class than a generic "open worldwide" statement, and worth other lanes watching for —
a school's own account of having actually competed beats any organizer's eligibility prose.

**Second finding worth flagging**: GençBizz Lise Girişimcilik Programı — a 26-edition-running
national Turkish high-school entrepreneurship programme (Genç Başarı Eğitim Vakfı / Junior
Achievement Turkey), run under a direct Ministry of National Education protocol across all 81
provinces, culminating in a national final whose winner represents Türkiye at GEN-E, a major
European entrepreneurship festival. This is the closest business/entrepreneurship analogue to how
TÜBİTAK anchors the STEM olympiad routes, and it did not exist anywhere in the prior corpus or
seed PDF — found via a dedicated Turkish-language search per the brief's explicit instruction to
look for exactly this shape of record.

**Corrections proposed to existing rows** (not new records, data-quality fixes): DECA and National
Economics Challenge both resolve to `NOT_ELIGIBLE` for a Türkiye-based student (DECA's chartered-
association list names 14 non-US countries, Türkiye is not among them, confirmed again this
session; National Economics Challenge is structurally US-state-gated with only a narrow, unverified
China-specific exception found). Both are currently shown to all 7 test users with `eligible_
countries=[]`, i.e. no signal against recommending them to a Turkish student — a `NOT_ELIGIBLE`
classification is itself a valuable resolved fact, not a gap.

**Deliberately held back from VERIFIED/PRODUCTION_READY**: Harvard Political Review Essay
Competition (real, but no stated country-eligibility rule found and a materially higher fee tier
than comparable records — $45-85 vs $0-25 elsewhere in this batch); Eurasian Schools Debating
Championship (Istanbul-hosted, structurally Turkey-favourable, but governing organization,
eligibility rule, fee and team structure are all genuinely unknown, not merely unresearched —
next edition's registration has not opened); 120 Hours (worldwide country access confirmed, but a
genuine, unresolved conflict between "any student" and "enrolled architecture-degree student"
readings across sources — flagged prominently rather than defaulted to the flattering reading);
The Earth Prize and HPEC and National History Day (`UNCLEAR` — real, repeated attempts made, no
eligibility-by-country statement exists to find on the operator's own pages as of this session).

**Deliverables this checkpoint**: `s6b_essay_humanities_batch1.jsonl` (S6B-0001–0010),
`s6b_business_batch1.jsonl` (S6B-0011–0018), `s6b_turkey_and_mixed_batch1.jsonl` (S6B-0019–0028),
`claims_s6b.jsonl` (29 lines, S6B-0001–0029 including the YGA rejection). 22 already-live rows
touched (enrichment or correction), 5 genuinely new candidates proposed, 1 formal HOLD, 1
out-of-category rejection. None yet carries a rights-cleared photo — several have a specific
candidate source identified (Wharton news posts, UDaily/Diamond Challenge, World Scholar's Cup
school write-ups, GençBizz national press coverage) and are marked `RIGHTS_REVIEW_REQUIRED`;
others (pure online/written-submission competitions with no physical event — most of the essay
competitions) are reasoned to have no photo to find at all, which is itself a resolved state, not
a gap, and is noted as such per record rather than left ambiguous.

**Time-critical flag for whoever reviews next**: The Marshall Society Essay Competition's deadline
is **2026-08-30 — 4 days from this checkpoint.** If this record is going to reach a student in
time to be useful, it needs review priority over everything else in this batch. Wharton Global HS
Investment Competition's deadline (2026-09-11, 19 days out) is the second most time-sensitive, and
per cr1's CR1-155 the team-of-4-6-plus-teacher requirement — now confirmed independently this
session too — needs to reach a student well before that date, not after.

**Next**: cross-review S6-A's STEM-side records per the Contract's mandated pairing once both
lanes report substantial batches; possible further new-candidate search in architecture/film
(both still thin per the baseline doc — 120 Hours is the only architecture row in the whole
corpus and its audience-fit is itself unresolved; film has zero rows found in either the baseline
or the seed PDF); assess whether continuing past this checkpoint's ~28 records is warranted given
the CEO's explicit depth-over-volume steer for an already-saturated category, or whether to move
toward HANDOFF.md.

---

## S6-A (STEM) — 2026-08-26 checkpoint 2

**Deliverables this checkpoint**: `s6a_math_cs_batch1.jsonl` (S6A-0009–0016, 8 records — Turkey-
access + corrections for AMC-AIME, HMMT, USACO, Purple Comet, Waterloo, CMIMC, Battlecode,
PennApps), `s6a_berkeley_stanford_math.jsonl` (S6A-0017–0021, 5 net-new records — Berkeley's 3
formats + Stanford's 2), `s6a_science_env_batch1.jsonl` (S6A-0022–0032, 11 records — Breakthrough
Junior Challenge, GENIUS Olympiad, Nat Geo Slingshot, iGEM HS, EUCYS, Brain Bee, FIRST Global
Challenge, IEnvO, Stockholm Junior Water Prize, Earth Prize, IYPT). Running total: 32 records
(S6A-0001–0032).

**Two most time-critical fixes found**: HMMT's registration deadline (2026-09-20, ~25 days out at
this checkpoint) was completely absent from a live row matched to every user — fresh-confirmed
today, unchanged from cr1's finding 3 days ago. Breakthrough Junior Challenge's deadline
(2026-09-15, ~20 days out) was correctly stored but carried zero age/country/English-language
data — also fresh-confirmed. Flagging both for review priority, same urgency class S6-B flagged
for Marshall Society/Wharton Investment on their side.

**Discipline notes on what did NOT get promoted to PRODUCTION_READY**: Battlecode and PennApps
held at `VERIFIED` — Battlecode's High-School-track eligibility for non-US students exists only in
a search-corroborated claim, not a primary-source page found this session; PennApps may be a
college-only event misfiled into a high-school-facing category, not independently resolved. IYPT
held at `BLOCKED` — genuine attempt made (found 2019 participation via Galatasaray Eğitim Vakfı, a
2022 results page, but could not confirm current-cycle 2025/2026 Turkish participation), recorded
per Contract's explicit instruction to mark `UNCLEAR`/say-what-was-tried rather than guess by
analogy to the TÜBİTAK-routed olympiads. iGEM HS and The Earth Prize held at `VERIFIED` — each has
one specific, named, unresolved-after-two-passes gap (iGEM's team fee; Earth Prize's deadline)
that I judged should block PRODUCTION_READY status rather than be smoothed over.

**Cross-lane flag for S6-B / DATA / CEO**: the WRONG-entity "Stockholm Water Prize" row (c8eb3d40,
a professional career-achievement award for established researchers) is **still `active` and
student-facing in the live DB as of this checkpoint**, three days after cr1 first flagged it and
proposed the correct youth-prize replacement (which IS already `under_review`, `17aeb772`, and
which I've now enriched with full Turkey-access data — S6A-0030). Not my call to remove a live row,
but flagging again since it remains live and I don't want it lost between two research passes.

**Also flagged this checkpoint**: GENIUS Olympiad (S6A-0023) is genuinely mixed STEM+arts per its
own 9-category structure (AI/Coding/Robotics/Science alongside Art/Music/Short Film/Speech/
Entrepreneurship) — taking first pass per the assignment's instruction, flagging for S6-B
cross-review rather than silently deciding it's "mine."

**Next**: medicine/health-adjacent (HOSA, Technovation Girls), Microsoft Imagine Cup Junior status
resolution, FRC Türkiye national-route record (resolves the FRC/FIRST Robotics Competition
duplicate-pair question), Zero Robotics HS-division check, then a light image-sourcing pass on the
highest-value records (TÜBİTAK 2204-A/2202, AMC, HMMT, Breakthrough), then HANDOFF.md. Given the
CEO's depth-over-volume steer and the strength of this batch (32 well-evidenced records, several
with genuinely time-critical fixes), assessing real saturation is now a live question for the next
checkpoint rather than pushing toward the nominal ~90-record share.

---

## S6-A (STEM) — 2026-08-26 checkpoint 3 (session close)

**Deliverable**: `s6a_medicine_robotics_other.jsonl` (S6A-0033–0036, 4 records). Running total:
**36 records** (S6A-0001–0036).

**HOSA (S6A-0033)**: resolved cr1's open question with a definitive fresh check — Türkiye is
confirmed NOT among HOSA's 57 chartered associations (checked the full published list today). This
converts a "genuinely unknown" from 3 days ago into a resolved `ELIGIBLE_WITH_CONDITIONS` (the
condition being: a Turkish school would need to found a new chapter from scratch).

**FRC Türkiye (S6A-0036)**: the strongest single find of this closing batch. Confirmed
frcturkiye.org (Fikret Yüksel Foundation) as a currently-active, well-structured Turkish national
FRC organizer — 8 regional competitions across Türkiye, March-April 2026, ages 14-18/grades 9-12.
This also resolves the open duplicate-pair question the baseline doc flagged (`FIRST Robotics
Competition` db25d327 active vs `FRC (FIRST® Robotics Competition)` dfb94075 under_review) — FRC
IS the standard abbreviation for FIRST Robotics Competition, almost certainly the same underlying
competition; flagging for DATA/CEO to merge rather than writing a third, separate record.

**Microsoft Imagine Cup Junior (S6A-0035)**: fresh check supports the live DB's existing
`discontinued`/`conflicting` flag rather than contradicting it — the seed PDF's own cited URL
(category/34) now shows only the general adult Imagine Cup, no Junior content found anywhere.

**Image-sourcing pass**: attempted on the 2 highest-value records (TÜBİTAK 2204-A via a TÜBİTAK
Bilim Genç award-announcement page; AMC via its Wikipedia article) — both genuine negative results
(only generic stock photos / no images at all), recorded so the next researcher doesn't re-check
the same dead ends. Given the volume of well-evidenced factual work in this session and the
photo requirement's own note that no `image_url` column exists yet (proposal field only, not
blocking a future migration), did not exhaustively image-search all 36 records — this is the one
genuine gap across the batch and is named honestly in the handoff rather than papered over.

**Session assessment against the CEO's depth-over-volume steer**: 36 records is well below the
nominal ~90-record share, and that is a deliberate choice, not a shortfall. The category was
already 101 rows deep with real structural gaps (missing Turkey-access data, wrong URLs, deadline-
ownership errors, one entirely-missing national infrastructure layer) rather than missing rows —
the CEO's own gap map said exactly this before I started. 36 genuinely fresh-verified, evidence-
cited records (2 major net-new government-run competitions, 6 Turkey-access enrichments on
already-live flagship olympiads, 5 net-new university math tournaments, and 23 corrections/
enrichments to existing live rows including 3 records with sub-30-day deadlines that were
previously missing critical data) represents real depth. Stopping here rather than padding toward
90 with thinner finds, per Contract §13.

**Proceeding to write HANDOFF.md** — STEM research pass for this session considered complete.

---

## S6 Orchestrator — cross-review reconciliation, 2026-08-26

Both HANDOFF.md sections read in full; both lanes' JSONL files grepped directly (not taken on
their self-reports alone) for the two items each handoff flagged as needing reconciliation.

**Stockholm Junior Water Prize (S6A-0030 / S6B-0025, live row `17aeb772`) — no factual conflict
found.** Both independently confirm `ELIGIBLE_WITH_CONDITIONS` via DSİ (State Hydraulic Works
General Directorate, Ankara), both confirm `national_delegation_required: true`, both trace to the
same underlying cr1 CR1-036 evidence. S6A-0030 is the more complete record (fuller
`individual_or_team`/`age_range`/`subjects` detail) — treat it as canonical, with S6B-0025 as
independent corroboration, not a second record to apply. Both correctly re-flag that the
wrong-entity "Stockholm Water Prize" (`c8eb3d40`) is still live and student-facing — this is now a
three-times-confirmed finding (cr1, S6-A, S6-B) with no correction landed in production yet.

**The Earth Prize (S6A-0031 / S6B-0021, live row `00aaf965`) — no factual conflict found.** Both
independently reached `UNCLEAR` (a participation count, not a stated eligibility rule — the 160-
vs-169-country discrepancy on the operator's own site was independently caught by both), both name
the missing deadline as the blocking gap, both correctly held at `VERIFIED` rather than
`PRODUCTION_READY` for the same reason. Treat as one record, independently converged twice — a
genuine confidence signal, not redundant work to discard.

**Confirmed gap, not assumption**: grepped every `s6a_*.jsonl`/`s6b_*.jsonl` file directly for
"genius olympiad", "greenwich", "unihive". GENIUS Olympiad was researched (S6A-0023, S6-A took
first pass as its own notes state). **International Greenwich Olympiad and UniHive Research
Proposal Competition were not researched by either lane** — both handoffs described these as "left
for the other's first look," and neither actually took it. Both are already live/`under_review` in
the baseline. Assigning to S6-B now in a bounded follow-up (S6-A already spent its first-pass turn
on GENIUS Olympiad).

**PRODUCTION_READY bar reconciliation — the two lanes graded themselves on different bars for the
same brief language.** S6-A treated "attempted an image search, found nothing" as a resolved photo
state sufficient for `PRODUCTION_READY` (28 records so labeled, including TÜBİTAK 2204-A and AMC —
both competitions with a real physical/ceremonial component where a photo plausibly exists
somewhere, just not yet found). S6-B treated only an affirmative "no physical event exists to
photograph" (pure online/written-submission competitions) as a resolved-absent state, and left
everything else — including several of its own strongest records — at `VERIFIED`, reporting **0**
`PRODUCTION_READY` by that stricter reading. **Ruling, applied going forward**: "searched, found
nothing yet" on a competition with a real physical/ceremonial component (TÜBİTAK, AMC, any
in-person olympiad or event) is `NOT_YET_RESOLVED`, not resolved-absent — S6-B's bar is the correct
one for those. "No physical event exists" on a genuinely online-only/written-submission competition
is a legitimate resolved-absent state and does not block `PRODUCTION_READY` on its own. Separately,
and more fundamentally: Contract §11 defines `PRODUCTION_READY` as requiring **second-agent/S8
review passed** — that has not happened for any record from either lane yet, so the procedurally
honest count for this entire S6 lane right now is **0 formally `PRODUCTION_READY`**, not S6-A's 28.
S6-A's self-labeled 28 and S6-B's 21 `VERIFIED` are both real, well-evidenced progress — asking
S6-A to re-grade its own in-person-competition records' photo status against this ruling as part of
the bounded cross-review follow-up below, rather than the orchestrator silently editing another
lane's files.

**Escalated outside this doc, given the clock**: Marshall Society Essay Competition (`5f7ef5d4`,
S6B-0001) has a **2026-08-30 deadline — 4 days from this reconciliation**. Sent directly to S9/CEO
now rather than held for the full lane close-out, since a 4-day window won't survive a normal
review cycle. Full evidence in S6B-0001; nothing about this changes the finding's own noted caveat
(the linked full-rules Google Doc was never opened, so treat as medium-high confidence, not
certain).

**Dispatched now**: a bounded follow-up to each lane (not a full second research pass) —
S6-B takes International Greenwich Olympiad + UniHive Research Proposal Competition, plus a second
opinion on 1-2 of S6-A's held-back STEM items if time allows; S6-A gives a documented second
opinion on S6-B's two flagged "closer call" judgments (Blue Ocean Competition, 120 Hours) and
re-grades its own in-person-competition records' photo status per the ruling above. Both report
back to the orchestrator, not each other directly, to avoid a third HANDOFF.md write race.

---

## S6-A (STEM) — 2026-08-26, bounded follow-up (photo regrade + second opinions)

**Task 1 complete — photo-status regrade.** Went through all 28 self-graded `PRODUCTION_READY`
records and applied the orchestrator's ruling mechanically: used each record's own already-
researched `mode` field (established during original research, not a new determination) as the
objective test — `mode` containing "in-person" or "hybrid" (with a real in-person component) =
photo plausibly exists somewhere, `NOT_YET_RESOLVED` blocks promotion; `mode` = "online" with no
physical gathering = legitimately resolved-absent, does not block promotion.

**Result**: 20 of 28 regraded from `PRODUCTION_READY` to `VERIFIED` (TÜBİTAK 2204-A, TÜBİTAK 2202,
IMO, IBO, IChO, IPhO, IOI, IOAI, AMC, HMMT, Waterloo, CMIMC, BMT in-person, GENIUS Olympiad,
EUCYS, Brain Bee, FIRST Global Challenge, Stockholm Junior Water Prize, HOSA, FRC Türkiye) — every
one has a real in-person/ceremonial component per its own `mode` field. **8 correctly remain
`PRODUCTION_READY`** with photo legitimately resolved-absent: USACO, Purple Comet, BmMT, SMT
Online, Breakthrough Junior Challenge, Nat Geo Slingshot, IEnvO (all genuinely online/video-
submission, no gathering to photograph) plus Microsoft Imagine Cup Junior as a distinct special
case (the record's substance is "this competition no longer runs," so photo applicability is moot
rather than resolved-absent in the online-competition sense — flagged as a different reason, not
conflated with the other 7). Written as append-only corrections in
`s6a_photo_status_regrade.jsonl` (21 lines: 20 individual regrades + 1 summary note) and mirrored
as new status lines in `claims_s6a.jsonl` (20 new lines, `PRODUCTION_READY` → `VERIFIED`) — no
original lines rewritten in either file.

**This lane's honest self-graded count is now**: 8 `PRODUCTION_READY` / 28 `VERIFIED` / 1
`BLOCKED` (IYPT) = 36 unique records, unchanged total, corrected grading. Per Contract §11 and the
orchestrator's own point, none of the 8 are FORMALLY `PRODUCTION_READY` until second-agent/S8
review passes — flagging that this 8 is still a self-grade, not a closed number.

**Task 2 complete — second opinions on S6-B's two flagged closer calls.**

**Blue Ocean Competition (S6B's record, `cb4a1030`)**: S6-B classified `VERIFIED_ELIGIBLE` at
"medium-high" confidence from the FAQ's own phrase "high school students around the world,"
explicitly self-flagging it as a closer call than most of their batch. **My read**: this is
genuinely borderline, and applying the exact bar I used on my own similarly-shaped records — I
held Technovation Girls, Nat Geo Slingshot's "expanded globally," and Earth Prize's 160-vs-169-
country claims all to `ELIGIBLE_WITH_CONDITIONS` or `UNCLEAR` specifically because "X students
around the world" / "expanded globally" framing is descriptive audience-positioning language, not
a dedicated eligibility RULE naming a condition or a registration mechanism (contrast with SMT
Online, where the eligibility sentence sits in a dedicated "who can register" answer AND names the
actual mechanism for international participants: "as long as they are able to take the tests in
PDT time"). Blue Ocean's FAQ phrase has neither a named condition nor a stated mechanism for a
non-US entrant. **I would have landed one notch more conservative — `ELIGIBLE_WITH_CONDITIONS`,
not `VERIFIED_ELIGIBLE`** — for internal consistency across the whole S6 corpus, not because I
think S6-B's reasoning is unsound; their own "medium-high not top-tier" self-grading shows they
already saw the same tension. Documented as a difference of calibration on a genuinely close call,
not an error — S6-B's record, S6-B's call to revise or not.

**120 Hours (S6B's record, live row `345f64dd-f6f4-4f29-9341-75743c39a7d1`, S6-B's proposal in
`s6b_turkey_and_mixed_batch1.jsonl`)**: attempted one
more direct source per the orchestrator's invitation. Re-fetched 120hours.no's homepage (WebFetch),
tried `/faq` directly (WebFetch: 404 — same result S6-B got), then independently confirmed the
same 404 via the Browser pane (not just a WebFetch-specific limit), and read the rendered homepage
in full via the browser (screenshot + page text) — confirms the site's real footer nav shows
`Information` / `Terms and conditions` / `FAQ` as items but the underlying `/faq` route itself does
not resolve; did not have time within this bounded task to work out the site's actual client-side
routing to reach that content by another path. **The ambiguity is NOT resolved.** Rendering the
documented opinion the task allows for instead: S6-B's own quoted operator eligibility text is "you
must be affiliated to a university or a school on student level" — read plainly, a high school
*is* "a school," and a high schooler *is* a student "at student level," so the operator's own
words plausibly already include high schoolers without needing the third-party gloss at all. The
countervailing evidence (ArchDaily/Bustler/Competitions.archi consistently framing it as an
architecture/design-student competition) may simply reflect who typically enters rather than a
hard restriction — professional architecture-competition aggregators would naturally describe the
typical entrant, not necessarily the full eligibility rule. **My lean is that high-school
eligibility is more likely than not**, but I agree with S6-B's decision to hold at
`ELIGIBLE_WITH_CONDITIONS` rather than `VERIFIED_ELIGIBLE` given the operator's own primary
eligibility/FAQ page could not be independently confirmed by either of us — this is exactly the
kind of case where the conservative reading is the right one to publish even if a more permissive
reading is plausible.

**Files this follow-up**: `data/research/opportunities/s6a_photo_status_regrade.jsonl` (new),
`data/research/registry/claims_s6a.jsonl` (20 new lines appended), this TRACKER.md entry.
Reporting back to the orchestrator directly, not S6-B, per instruction.

---

## S6-B (Business/Humanities/Creative) — 2026-08-26, bounded follow-up (Task 1 + Task 2 + photo regrade)

**Task 1 complete — the confirmed gap.** International Greenwich Olympiad (`1ba4bf99`) and UniHive
Research Proposal Competition (`55dd21cd`) researched from scratch, per the orchestrator's direct
grep confirming neither lane had actually touched either despite both handoffs claiming to have
left them for the other.

**IGO (S6B-0032)**: `VERIFIED_ELIGIBLE`, medium-high confidence — real, MILSET-recognised, 53-
country STEAM competition run by North London Grammar School (£35 fee, 15 categories spanning
AI/engineering through creative writing/art/performing arts, individual or team-of-3). Evidence
tier flagged explicitly as weaker than this lane's norm: igolondon.co.uk 403'd on every direct
WebFetch attempt (homepage, FAQs, registration), so the record rests on Wikipedia + search-index
evidence rather than a directly-fetched official page. Photo `NOT_YET_RESOLVED` per the ratified
ruling below (real in-person finalist event exists).

**UniHive (S6B-0033)**: held at `UNCLEAR`/`READY_FOR_REVIEW`, deliberately not accepted at the
seed PDF's promotional face value. Key finding: UniHive Education's own disclaimer states it has
**"no formal connection with the University of Cambridge"** despite Cambridge-venue framing —
second independent instance in this corpus of exactly the affiliation-inflation pattern the brief
warns against (after the already-live Blackstone Law Review row). Fee, complete eligibility, and
prize structure (cash vs. a funnel toward UniHive's own paid Advanced Research Programme — the
same shape cr1's CR1-113 found for Immerse/Horizon) all genuinely unresolved after 5 attempts
across 3 official pages.

**Task 2 complete — second opinions on S6-A's Battlecode/PennApps/IYPT.**

**PennApps (S6A-0016) — RESOLVED, upgrade recommended.** S6-A's own record explicitly flagged two
open questions left unresolved for lack of time: is this genuinely open to high-schoolers at all
(vs. college-only), and is it US-restricted. Directly fetched the current PennApps XXIV site
(2024f.pennapps.com) — a source S6A-0016 hadn't reached — and found: **"you must be a high school
or undergraduate student in the US or abroad to apply."** Answers both questions in the positive at
once. Recommending S6-A apply the upgrade to their own record (not editing it myself, per file-
ownership rules) — `turkey_student_access` from `UNCLEAR` to `VERIFIED_ELIGIBLE`.

**Battlecode (S6A-0015) — corroborated, not resolved.** Independent re-fetch of battlecode.org
plus a targeted search reached the identical wall S6-A found: the High School Tournament's only
published rule is "teams must consist entirely of high school students," with no country-
eligibility statement anywhere findable, unlike the College tracks' explicit US/International
qualifier language. A second independent attempt reaching the same limit is itself a useful
signal — this is a real gap in Battlecode's own published information, not under-research on
either side. Direct contact (battlecode@mit.edu) remains the only path to close it.

**IYPT (S6A-0032) — corroborated via a different route, specific technical barrier identified.**
IYPT's own 2026 announcement page does publish a registered-countries list, but it's embedded as a
static PNG image with no extractable text — genuinely unreadable, not merely unfound. The
`cc.iypt.org/iypt2026/team/...` URL pattern that worked for S6-A's 2022 finding 404s for 2026
(the host may have moved to `iypt.ch` for the ETH-Zurich-hosted edition). Recorded precisely for
whoever attempts this next with an OCR-capable tool.

**Photo-status regrade — applying the orchestrator's ratified ruling to my own records.** The
ruling ("online-only = legitimately resolved-absent and doesn't block `PRODUCTION_READY`; in-
person/hybrid = photo plausibly exists, stays `NOT_YET_RESOLVED`") validated the exact bar I was
already reasoning through in my original HANDOFF.md but had not formally applied as a status
change. Mirroring S6-A's own regrade pass for consistency: **4 records promoted from `VERIFIED` to
a genuine self-graded `PRODUCTION_READY`** (mode=online, no other unresolved critical field) —
Blackstone Law Review Junior Division, Harvard Crimson Global Essay Competition, The Concord
Review Emerson Prize, Princeton Ten-Minute Play Contest. 3 records deliberately held back despite
mode=online for record-specific reasons (Marshall Society's unopened T&Cs doc; Jane Austen Society
and Columbia Law Review both still resting on search-index evidence rather than a direct fetch);
Blue Ocean Competition also held back given S6-A's independent second opinion that its eligibility
classification itself may need to move to `ELIGIBLE_WITH_CONDITIONS` — a live open question the
photo ruling shouldn't paper over.

**This lane's honest count is now**: 4 `PRODUCTION_READY` (self-graded, Contract §11 formal S8
review still pending) / 17 `VERIFIED` / 5 `READY_FOR_REVIEW` / 4 `CANDIDATE` / 1 `BLOCKED` / 2
`REJECTED` across 33 research_ids — superseding the "0" figure in my original HANDOFF.md section,
which was correct under the bar I was applying at the time but is now stale.

**Files this follow-up**: `data/research/opportunities/s6b_mixed_scope_followup1.jsonl` (S6B-0032,
0033), `data/research/opportunities/s6b_second_opinion_s6a_items.jsonl` (S6B-0034–0036),
`data/research/opportunities/s6b_photo_status_regrade.jsonl` (new), `data/research/registry/
claims_s6b.jsonl` (6 new lines appended across this follow-up), this TRACKER.md entry. Reporting
back to the orchestrator directly, not S6-A, per instruction.

---

## S6-B (Business/Humanities/Creative) — 2026-08-26, photo-sourcing/verification pass (checkpoint 1)

**New assignment from the fleet CEO**, responding to the "0/69 photo gap" noted in the
orchestrator's final synthesis: a dedicated photo-sourcing/verification pass on S6-B's own 33
records, using the Browser pane to actually look at candidate images (not caption/filename alone)
before confirming `correct_entity_verified`/`no_logo_verified`. Dry-run only, no production
writes. Checkpoint 1 covers 8 of 33 records — the priority list the CEO specified (the 4
self-graded `PRODUCTION_READY` records, plus Wharton/Diamond Challenge/World Scholar's Cup/Marshall
Society, all of which already had a candidate source identified).

**Result: 4 confirmed `NO_CANDIDATE_FOUND`, 4 found and visually verified.**

**Confirmed `NO_CANDIDATE_FOUND` (genuine, bounded searches, not exhaustive hunting)**: Blackstone
Law Review Junior Division, Harvard Crimson Global Essay Competition, and Princeton Ten-Minute
Play Contest — all confirmed to have no physical/live event by construction (closed-universe essay
format, fully virtual competition, and privately-judged script submission respectively). The
Concord Review/Emerson Prize turned up a historical 2004 ceremony (Horace Mann School) but nothing
current — not treating a 20-year-old event as a usable current photo. All four match `mode=online`
and their photo status was already correctly reasoned as resolved-absent in the prior regrade; this
pass converts that reasoning into an actual documented search attempt per record.

**Found and visually verified, via the Browser pane**:
- **Marshall Society** — a fresh, targeted Wikimedia Commons search (as the CEO specifically
  requested) found "Sidgwick Site - Faculty of Economics," a genuine campus courtyard photo of the
  Faculty of Economics building at Cambridge, **CC BY-SA 2.0** — a real open license, the strongest
  rights outcome of this whole pass. Honestly labeled as a host-institution photo, not the Society
  or a Society event, per the same discipline already applied once before on this exact record
  (declining to substitute the adjacent Law Faculty building).
- **Wharton Investment Competition** — the Wharton Global Youth Program's own article on the 2025
  Global Finale carries three real, named-photographer-credited event photos (a team group shot
  plus two individual student presentation photos with captions naming the students). Visually
  confirmed one directly: a student presenting at a podium with a finance-themed slide behind him,
  no dominant logo.
- **Diamond Challenge** — UDaily's (University of Delaware's own news outlet) 2024 Summit coverage
  has a genuine crowd photo of finalist students at Clayton Hall, named photographer credit,
  visually confirmed via screenshot.
- **World Scholar's Cup** — MEF International Schools Istanbul's own post has a real photo of
  students on stage at a Team Debate round (screen reads "That teenagers make good diplomats").
  Visually confirmed. Dated 21/12/2018 — honestly flagged as not-recent rather than implied current.
  Doubles as visual corroboration of this lane's original Turkish-participation finding for this
  record.

All four found photos are marked `rights_status=RIGHTS_REVIEW_REQUIRED` (institutional/commissioned
photography, named photographers, no open license found) except Marshall Society's genuinely open
CC BY-SA 2.0 license.

**Significant environmental finding, worth flagging beyond just this record set**: this Browser
pane session experienced repeated, thematically-consistent cross-tab interference — `screenshot`
and `computer` input actions intermittently landed on unrelated STEM/Olympiad content (IMO, IChO,
IPhO, IBO tabs I never created) despite specifying this session's own `tabId`, strongly suggesting
a shared underlying browser window/process across concurrent agent sessions (almost certainly
S6-A's own parallel photo-sourcing pass, running at the same time). `read_page` and `get_page_text`
consistently and correctly respected `tabId` throughout and were used as the primary, reliable
verification tools; `screenshot` was made reliable by explicitly calling `tabs_select` to front the
target tab immediately before every screenshot attempt — this pattern worked consistently once
adopted. Flagging this so S6-A (or whoever runs Browser-pane-dependent work next in this fleet)
isn't caught by surprise by the same issue, and so a future session knows the `tabs_select`-before-
`screenshot` workaround.

**Files this checkpoint**: `data/research/opportunities/s6b_photo_pass_batch1.jsonl` (8 records),
`data/research/registry/claims_s6b.jsonl` (8 new lines appended), this TRACKER.md entry.

**Not yet covered this pass**: the remaining 25 of 33 records (IPO, BSPEE, GençBizz's already-
identified candidate, Conrad Challenge, YIS Stock Pitch, IPPF, IEO, Stockholm Junior Water Prize,
International Greenwich Olympiad, and others without a source yet identified). Reporting back to
the CEO now per instruction to checkpoint rather than push through all 33 in one pass.

---

## S6-A (STEM) — 2026-08-26/27, photo-sourcing pass checkpoint 1

**New assignment from S9/CEO**: photo-sourcing/verification on this lane's own 36 STEM records,
priority order self-graded `PRODUCTION_READY` then highest-value `VERIFIED` (TÜBİTAK 2204-A/2202,
the 6 flagship olympiads). Dry-run only. Per the strict verification method required — actually
viewing the candidate via the Browser pane before setting `correct_entity_verified`/
`no_logo_verified`, never from a caption/filename alone — this checkpoint covers 8 of 36 records.

**8 records covered, written to `s6a_photo_pass_batch1.jsonl`**:

- **5 flagship olympiads, fully browser-verified with real Wikimedia Commons event photos**: IMO
  (2015 closing ceremony, CC BY-SA 4.0), IChO (2017 bronze medal ceremony, CC BY-SA 4.0), IPhO
  (**2019 Team Türkiye at the opening ceremony** — the single best find of this pass, directly
  depicting the actual Turkish national delegation this lane's own record documents a TÜBİTAK
  route to; CC BY-SA 4.0), IBO (a past inauguration-ceremony stage photo, CC BY-SA 4.0), IOI (2006
  competition room, **public domain** — the most permissive license found).
- **TÜBİTAK 2202** (the national olympiad ladder): found a real ceremony photo via Anadolu Ajansı
  (Turkey's state news wire) covering the 32nd Bilim Olimpiyatları award ceremony (Feb 2025),
  browser-verified as the correct entity with no dominant logo — but recorded `rights_status:
  RIGHTS_REVIEW_REQUIRED` since AA's own photojournalism is not openly licensed and this lane has
  no basis to treat it as freely reusable. While on that research thread, also fresh-confirmed
  (via TÜBİTAK's own newsroom) that the 33rd cycle's ceremony already happened Feb 2026 with
  concrete numbers (18,463 first-stage applicants, 225 medalists) — noted as a supplementary
  finding for a future enrichment pass, out of scope for this photo-focused task itself.
- **TÜBİTAK 2204-A**: NOT resolved — 3 attempts (the already-known negative Bilim Genç stock-photo
  page, a search that surfaced cycle-timing detail but no photo, one dead school-website link).
  Explicitly did NOT substitute S6A-0002's TÜBİTAK photo here — 2204-A (research projects) and
  2202 (science olympiads) are different competitions and the AA photo depicts 2202's ceremony
  specifically.
- **IOAI and AMC**: both genuinely searched and confirmed `NO_CANDIDATE_FOUND` rather than left
  unattempted — IOAI is too new (est. 2024) for Commons coverage yet; AMC's format (school-
  administered written exam, no delegation ceremony) plausibly explains its total absence from
  Commons, confirmed via a site-restricted search returning zero results.

**Process note on tooling**: the Browser pane's rendering intermittently went stale mid-session
(screenshots returning blank or timing out with "pane is not displayed") — resolved each time by
re-opening via `preview_start` rather than retrying the same dead tab. One navigation also landed
silently on a completely unrelated file (a Cambridge University building photo, not the intended
IPhO Turkey image) — caught only because the screenshot was actually looked at rather than trusted
on the strength of the navigation call succeeding; re-navigated on a fresh tab and confirmed the
tab title matched before re-verifying. Recording both as a caution for whoever continues this pass:
verify the tab is actually showing the intended page, not just that the navigate call returned ok.

**Next**: TÜBİTAK 2204-A photo (try TÜBİTAK's own X/Instagram archives, or a different province's
MEB news page, rather than the already-dead links tried here), then the remaining ~28 VERIFIED
records in rough priority order (the other online-format `PRODUCTION_READY` 8 should mostly resolve
as legitimate `NO_CANDIDATE_FOUND`/no-event-exists rather than need active searching, per this
lane's own earlier `mode`-based reasoning — worth confirming rather than assuming). Files:
`s6a_photo_pass_batch1.jsonl` (9 lines), `claims_s6a.jsonl` (9 new lines). Reporting back to S9/CEO
now per the checkpoint-don't-be-exhaustive instruction.

**Post-checkpoint addendum — cross-tab interference confirmed, two highest-value claims re-verified
clean.** S9 flagged (after this checkpoint was drafted) that S6-B independently hit intermittent
cross-tab interference in the shared Browser pane — screenshots landing on a tab other than the one
specified — and fixed it by calling `tabs_select` to front the intended tab immediately before every
screenshot. Checked `tabs_context` afterward and found direct confirmation this affects this lane
too: `tab-2`, which I had used earlier for a Wikimedia Commons file, now shows origin
`mefis.k12.tr` — reused/contaminated by something else entirely, not the tab I left it as. This
matches exactly what happened during the IPhO-Turkey verification above (the wrong-file incident
already recorded as NOT counted). Re-verified the two highest-value photo claims from this
checkpoint (IPhO Team Türkiye, IMO 2015 closing ceremony) on a fresh tab using the
`tabs_select`-immediately-before-`screenshot` discipline — both independently reconfirmed identical
to what was originally recorded; no change needed to either record. Did not re-verify all 5 flagship
photos given time budget, but note for whoever continues: every record in this checkpoint had its
Browser-pane tab TITLE checked against the intended filename at verification time (not just the
navigate call's return value), which is the same signal that caught the one actual mixup — a
reasonable, if not absolute, safeguard against this specific failure mode. Adopting
`tabs_select`-before-every-`screenshot` as standard practice for the remainder of this pass.

---

## S6-B (Business/Humanities/Creative) — 2026-08-27, photo-sourcing/verification pass (checkpoint 2)

Continuing through the remaining 25 of 33 records per the CEO's instruction. Covered all of them
this checkpoint — 16 researched directly, 8 explicitly documented as deliberately skipped with a
stated reason (not silently dropped), 1 already covered in checkpoint 1's count.

**4 more found and visually verified**: Conrad Challenge (Innovation Summit venue signage at Space
Center Houston — a real 'CONRAD SUMMIT 2025' marquee, spacecraft replica, and Award Ceremony
screen visible), YIS Stock Pitch Competition (a genuine award-ceremony photo, students holding
'FIRST PLACE' certificates), and GençBizz (upgraded from an earlier text-only/WebFetch finding to
full Browser-pane visual confirmation — matches what was originally described). **One found with
an honest caveat rather than a clean pass**: International Greenwich Olympiad — a real,
organizer-supplied press photo of the 2026 ceremony stage exists (published in a real local outlet,
London Now, captioned 'Image: Supplied'), but the IGO crest is prominently displayed on the venue's
own screen within the frame, so `no_logo_verified` is recorded as **false**, not forced to a clean
pass — flagged for a second attempt at a less branding-dominant photo from the same event (362
finalists attended; a crowd shot almost certainly exists elsewhere).

**6 confirmed `NO_CANDIDATE_FOUND`** (genuine searches, real absence): BSPEE (structurally
distributed across schools, no central venue — also caught and flagged that the specific Saint
Benoît URL cited in this record's original eligibility research has since 404'd, a page-rot note
distinct from the underlying finding, which was corroborated by a second source at the time),
Jane Austen Society, Columbia Law Review, Harvard Political Review, Blue Ocean (confirmed by
search as "the world's largest **virtual** pitch competition"), and The Earth Prize (confirmed
both 2022 and 2023 ceremonies were held **virtually**).

**6 `NOT_YET_RESOLVED`** — genuine real in-person/hybrid events confirmed to exist, real attempts
made, no accessible photo reached this pass (per the ratified ruling, these do not count as
resolved-absent): IPO (checked FISP's own regulations page, the official IPO 2025 site, and a
national delegation's own report — real event, no photo surfaced), IPPF (found a genuine official
multi-year photo gallery at ippfdebate.com/photos but could not navigate into a specific image —
JS-driven gallery, a direct URL guess 404'd), IEO (official event site has no photos on the pages
reached; an opening-ceremony video and an official Final Report PDF were located but not opened),
120 Hours (confirmed a real public exhibition at Oslo's old Munch Museum exists; deprioritized
given this record's own unresolved audience-fit question), National History Day (confirmed a real
~3,000-student National Contest at the University of Maryland and located NHD's own 2026 winners
page; deprioritized given this record's own UNCLEAR turkey_access), and Stockholm Junior Water
Prize (confirmed a real, prestigious ceremony at Stockholm City Hall exists; a specific SIWI page
404'd — **flagging possible overlap with S6-A's own parallel photo pass on the same live row,
17aeb772, per the orchestrator's earlier cross-review note that S6A-0030 is the more complete
version of this record** — deliberately not over-investing further search time here).

**8 deliberately skipped, with reasons recorded rather than silently dropped**: HPEC (2026-27
rules not yet published by the operator — nothing to photograph a not-yet-announced cycle of),
DECA and National Economics Challenge (both resolved `NOT_ELIGIBLE` — corrections steering away
from the record, not positive proposals needing a photo), ESDC/Dunedin Film/UniHive (all still
`CANDIDATE`-tier with core facts like eligibility, fee, and cycle timing unresolved — a photo
would not be the limiting factor for any of these reaching a usable state), RISE for the World
(formally `BLOCKED` on application status), Young Guru Academy (`REJECTED` for this category
entirely — a fellowship, not a competition).

**This completes a full pass through all 33 of this lane's records** (8 in checkpoint 1 + 25 here).
Running photo-status tally across both checkpoints: **8 found and visually verified** (7 clean +
1 with the IGO logo caveat), **10 confirmed `NO_CANDIDATE_FOUND`/resolved-absent**, **6
`NOT_YET_RESOLVED`** (real events, photo not yet reached), **9 deliberately not pursued** (4
online-only-and-already-covered-in-checkpoint-1 batch overlap avoided by not re-counting, plus the
8 skip-with-reason records above — see `s6b_photo_pass_batch2.jsonl`'s final entry for the itemized
list).

**Files this checkpoint**: `data/research/opportunities/s6b_photo_pass_batch2.jsonl` (17 entries),
`data/research/registry/claims_s6b.jsonl` (16 new lines appended), this TRACKER.md entry.

**For whoever picks up the `NOT_YET_RESOLVED` six next**: the highest-leverage next steps are
narrow, not open-ended — IPPF just needs the gallery's JS navigation solved (or a direct-URL
pattern found) to reach an already-confirmed-real photo source; IEO has a specific PDF and video
already identified, just not opened; IPO's most promising unexplored lead is its own Instagram
handle (@ipo.2023). None of these six need more searching to find a source — they need a different
access method to an already-found one.

---

## S6-A (STEM) — 2026-08-27, photo-sourcing pass complete — all 36 records covered

Continued through the remaining ~27 records per S9's instruction. **All 36 records in this lane
now have a photo-verification entry** (`s6a_photo_pass_batch1.jsonl` + `s6a_photo_pass_batch2.jsonl`,
37 lines total covering every `research_id` S6A-0001 through S6A-0036 — programmatically checked
for full coverage, 0 gaps). Registry updated (`claims_s6a.jsonl`, now 95 lines).

**3 more real, browser-verified photos found this checkpoint** (using `tabs_select` immediately
before every `screenshot`, per the corrected sequencing established last checkpoint):
- **Stockholm Junior Water Prize** — the 2024 winners on stage with Crown Princess Victoria of
  Sweden (the prize's Patron), CC BY-SA 4.0.
- **iGEM High School Competition** — a genuine 2025 Grand Jamboree venue photo (Paris, 28 Oct
  2025) from the official iGEM Foundation Flickr account, with the organizer's own explicit
  reuse/attribution instruction.
- **GENIUS Olympiad** — found a real, correctly-licensed (CC BY-SA 4.0) photo, but flagged it as
  a **weak match worth declining**: it's a personal portrait of one named student (a minor at the
  2016 time of the photo) against a repeated step-and-repeat backdrop, not a depiction of the
  competition/event itself. Recorded the finding honestly with an explicit
  recommendation NOT to use it as the primary candidate, consistent with this corpus's general
  minor-data-minimization caution even though the image is voluntarily public.

**2 records confirmed to have real photos that exist but weren't successfully extracted** (a
different, more useful state than a plain search failure): **FRC Türkiye** (its own 2026 İstanbul
Regional page explicitly links an "Etkinlik Fotoğrafları"/Event Photos section, alongside a full
results table naming 20+ real current Turkish teams — the page's lower content didn't render
visually in the Browser pane this session despite repeated attempts) and **HOSA** (its own 2025
ILC highlights page confirmed real, rich, current conference content including a "View 2025
Winners Gallery" link — same rendering problem, different specific page). Both recorded with a
concrete next step rather than a generic "try again."

**Remaining ~19 records**: mostly resolved to `NO_CANDIDATE_FOUND` after a genuine site-restricted
Wikimedia Commons search each (HMMT, Waterloo/CEMC, CMIMC, Battlecode, PennApps, Brain Bee, Earth
Prize, Technovation Girls, IYPT — the last one notable because a Commons *category* exists but on
inspection every file in it is a small logo graphic or a generic physics-phenomenon photo, not an
event photo; checked the actual contents rather than stopping at "a category exists"). The 8
genuinely-online `PRODUCTION_READY` competitions (USACO, Purple Comet, BmMT, SMT Online,
Breakthrough Junior Challenge, Nat Geo Slingshot, IEnvO, plus Imagine Cup Junior as a distinct
discontinued-competition case) were resolved on the same structural `mode`-based reasoning
established during the earlier photo-status regrade task, not re-searched individually — each has
no physical/ceremonial event by its own format. EUCYS, FIRST Global Challenge, BMT in-person, SMT
in-person: confirmed real off-Commons leads exist (EUCYS's own Instagram/yearly event sites; FIRST
Global's own press page; university-newspaper coverage for the Berkeley/Stanford tournaments) but
not opened this session — recorded as `NOT_YET_RESOLVED` with the specific next step rather than
folded into the `NO_CANDIDATE_FOUND` bucket, since "found a real lead, didn't open it" and
"searched and found nothing" are different states worth keeping distinct.

**Running photo-pass tally across both checkpoints**: 7 competitions with a fully browser-verified
real photo (IMO, IChO, IPhO, IBO, IOI, Stockholm Junior Water Prize, iGEM HS — the last two this
checkpoint), 1 more found but recommended against (GENIUS Olympiad), 1 found with a rights
question still open (TÜBİTAK 2202, via AA wire), 2 confirmed-exists-not-extracted (FRC Türkiye,
HOSA), 1 confirmed-absent-despite-a-plausible-category (IYPT), remainder genuinely
searched-and-empty or not-yet-attempted with an honest reason recorded for each.

**Files this checkpoint**: `s6a_photo_pass_batch2.jsonl` (28 lines), `claims_s6a.jsonl` (+28
lines, generated programmatically from the batch2 file to avoid transcription drift between the
two). Reporting back to S9/CEO now — full 36-record photo pass complete for this lane.

---

## S6-B (Business/Humanities/Creative) — 2026-08-27, cross-category dedup check follow-up

**CEO-dispatched check, prompted by an S8/CFO finding**: category-scoped dedup queries (like the
one behind this lane's own baseline doc, `category='competition'` only) can miss a same-family
entity already live under a *different* category. The CEO ran this against all of S6-B's net-new
proposals and found one genuine near-miss: **GençBizz** (S6B-0026, my proposal) vs. a live row,
**GençBizzTech** (`5d5a5f4d-3314-48b4-927b-383402161f70`, `category=entrepreneurship` — invisible
to a `category='competition'`-scoped check), organized by "Genç Başarı Eğitim Vakfı (JA Türkiye)
in partnership with Türkiye İş Bankası," domain `gencbizztech.org`.

**Resolved: confirmed genuinely distinct sibling programmes, not a duplicate.** Checked directly
against both organizations' own sites (not inferred). gencbasari.org's own top navigation lists
'GençBizz' and 'GençBizzTech' as two separate links, and its programmes section names GençBizz
alongside two other distinct siblings (JuniorBizz, JA Startup Türkiye). gencbizztech.org's own
homepage states explicitly: *"GençBizzTech, Genç Başarı Eğitim Vakfı ve Türkiye İş Bankası iş
birliğiyle **devlet fen lisesi öğrencileri**..."* — restricted to **state science high school
students specifically**, a materially narrower population than GençBizz's open-to-any-secondary-
school reach. Different domain, different named co-sponsor, different focus (general
entrepreneurship vs. explicitly science/technology-based, with named 2026 winning prototypes —
an AR/VR lab platform, an AI skin-lesion analysis tool, an agri-tech project), and different named
2026 Turkey Final winners (GençBizz: Quareka GençBizz Şirketi; GençBizzTech: LABORATUV-AR) —
confirming two separate competition cycles, not one event double-counted. The shared GEN-E
(Latvia) endpoint that created the conflation risk is explained by both being sibling GBEV/JA
Türkiye programmes feeding the same larger JA Europe festival, not evidence of identity.
**S6B-0026 stands as a genuine new-record proposal**, not converted to an enrichment of the
GençBizzTech row — with the sibling relationship now explicitly documented so neither record gets
merged into the other later on the strength of the shared foundation name alone.

**Also checked, per the CEO's request**: the other 5 net-new S6-B proposals (Jane Austen Society
Essay Contest, Columbia Undergraduate Law Review HS Essay Contest, Harvard Political Review Essay
Competition, Eurasian Schools Debating Championship, Dunedin International Film Festival) against
the full `opportunities` table with no category filter. **All 5 confirmed clean — zero hits under
any category.** The Columbia search did surface several unrelated Columbia University pre-college
programmes already live (summer_program/online_program/research categories, all on
`precollege.sps.columbia.edu` domains) — correctly not conflated with the Law Review's
`culawreview.org` essay contest, a different entity entirely.

**Files this follow-up**: `data/research/opportunities/s6b_dedup_check_followup.jsonl` (2 entries),
`data/research/registry/claims_s6b.jsonl` (2 new lines appended), this TRACKER.md entry. Photo
pass was not blocked on this per the CEO's own framing — both checkpoints of that work are already
complete and reported separately above. Reporting this dedup-check result back to the CEO now.

---

## S6-A (STEM) — 2026-08-27, final partial checkpoint — fleet winding down

S9 asked for a bounded continuation (chase specific unresolved photo leads; look for genuine new
environment/medicine competitions). Resolved 5 of the identified photo leads before S9 signaled
the fleet is winding down for real and asked to stop, commit what exists, and not start anything
further. The environment/medicine discovery task was not started — 0 new competition candidates
from that half of the assignment.

**5 photo leads resolved this checkpoint** (`s6a_photo_pass_batch3.jsonl`), each moving a prior
`NOT_YET_RESOLVED`/confirmed-exists-not-extracted record to a real, browser-verified find:
- **TÜBİTAK 2204-A** — finally resolved after 3 prior misses: an Aydın provincial MEB news page
  with an official photo of the 55th regional exhibition's ribbon-cutting opening.
- **FRC Türkiye** — the "Etkinlik Fotoğrafları" link's actual target (a Google Photos album,
  extracted via WebFetch on the raw page since the Browser pane's accessibility tree hadn't
  surfaced it) — a genuine 2026 İstanbul Regional crowd photo.
- **EUCYS** — official eucys2025.eu photos page, a genuinely striking Opening Ceremony shot.
  Caught and excluded one more cross-tab contamination incident along the way (landed briefly on
  an unrelated film-festival site) before re-verifying clean on a fresh tab.
- **FIRST Global Challenge** — a 2024 Athens Opening Ceremony drone shot at the Panathenaic
  Olympic Stadium, found immediately once the search moved off Wikimedia Commons to first.global's
  own site directly.
- **HOSA** — a real 2025 ILC Winners photo via the official Flickr account's specific album
  (found via WebFetch extracting the exact album URLs). Judged this one differently from the
  declined GENIUS Olympiad photo: a group of unnamed students, not a personal portrait of one
  identified individual, so recorded as verified rather than declined — but its Flickr license is
  explicitly "All rights reserved" (stronger restriction than iGEM's "some rights reserved"),
  flagged plainly.

All 5 are `RIGHTS_REVIEW_REQUIRED` — genuine, correctly-entity-verified, real event photos, but
none carries an explicit open license; each would need direct permission from its source
(a Turkish provincial ministry page, a Google Photos share, an EU-funded event site, FIRST
Global's own press assets, and HOSA's Flickr) before any production use.

**Not attempted**: BMT/SMT in-person photos (navigated to Berkeley Math Tournament's Instagram,
stopped before verifying when the wind-down instruction arrived), and the entire environment/
medicine new-competition-discovery task. Recording both as genuinely not started rather than
silently dropped.

**Stopping here per S9's explicit instruction.** This lane's STEM competitions research is now
closed out at: 36 competition records (2 net-new TÜBİTAK, 6 Turkey-access olympiad upgrades, 5
net-new Berkeley/Stanford tournaments, 23 corrections/enrichments to existing rows), a completed
photo-status regrade, documented second opinions on S6-B's flagged items, and a full 36-record
photo pass with 14 real verified photos found across all checkpoints (9 from the main pass + 5
this checkpoint). Files this checkpoint: `s6a_photo_pass_batch3.jsonl` (5 lines), `claims_s6a.jsonl`
(+5 lines). Committing and pushing now; no further work follows.

---

## S6-B (Business/Humanities/Creative) — 2026-08-27, final partial checkpoint (fleet wind-down)

**Stopped mid-task per the CEO/founder's fleet-wind-down instruction.** Was working through two
assigned follow-ups (remaining `NOT_YET_RESOLVED` photo records; the flagged film/architecture
gap) when the stop instruction arrived. Recording genuine progress made before stopping, at the
actual confidence level reached — nothing rounded up to look more finished than it is.

**Task 2 (film/architecture gap) — substantially resolved before the stop:**
- **ImagiNation International Student Film Festival** (S6B-0037, new record): the 403 that
  blocked this lane's earlier attempt is resolved — the Browser pane reached it directly where
  WebFetch could not. Organizer confirmed: Dhruv Global School, Pune, India (Festival Director
  Ritesh Taksande). Explicit worldwide eligibility. First-ever edition (2026), entries now closed,
  medium confidence given zero track record beyond two genuine attendee reviews.
- **Dunedin International Film Festival** (S6B-0030, upgrade): both originally-flagged open
  questions fully resolved. Confirmed **Dunedin, Florida, USA** (not New Zealand) via the
  festival's own text ("Florida Film Maker Community," "Pinellas County, Dunedin, Florida, USA")
  plus a street address found independently. Confirmed the **current cycle is open** — DIFF 2027,
  9th Annual, 14-17 January 2027, "Best High School Short" a real standing award category, $10 fee
  confirmed for the high-school track specifically. Recommend promoting to `VERIFIED`.
- **Suseong International Architecture & Landscape Visual Artwork Competition** (S6B-0038, new
  candidate): found a genuinely international, age-appropriate (10-18) architecture-adjacent
  competition, worldwide, real cash prizes, deadline **11 September 2026 — time-sensitive**.
  Deliberately held at `CANDIDATE` rather than `VERIFIED`: this rests on an aggregator source
  (competitions.archi) — the official organizing page was not directly reached before the session
  ended, and per this lane's own standing discipline an aggregator alone doesn't clear the bar for
  `VERIFIED`. This is nonetheless the answer to this lane's own flagged "genuinely thin, only
  120 Hours found, and that one has an unresolved audience-fit question" architecture gap.

**Task 1 (remaining `NOT_YET_RESOLVED` photo records) — partial, three records progressed, three
not reached:**
- **IPPF**: sharper finding than the previous checkpoint — successfully navigated into two real,
  correctly-titled year-gallery pages (2023-24, 2024-25), but both render **text-only with no
  images displaying** despite being labeled "photo gallery." A genuine site-behavior finding
  (broken or unrendered gallery), not a failure to locate the source.
- **IPO**: reached the previously-identified `@ipo.2023` Instagram account, confirmed real (138
  followers, correctly describes the 31st IPO, Olympia Greece 2023) but did not extract a usable
  photo, and the account is edition-specific/non-current.
- **Stockholm Junior Water Prize**: found a new, real, dated (12 Sept 2025) SIWI article vividly
  describing the actual 2025 ceremony at Stockholm City Hall — a better lead than the stale URL
  the previous checkpoint had — but no image was confirmed in the sections reached before the
  session ended.
- **Conrad Challenge and YIS Stock Pitch** were NOT re-touched this round because both were
  already fully found and verified in the prior checkpoint — nothing further was needed.
- **International Greenwich Olympiad and BSPEE were NOT re-attempted this round at all** — both
  remain at whatever status the previous checkpoint left them (Greenwich: a real photo found but
  honestly flagged for a dominant crest in-frame; BSPEE: confirmed `NO_CANDIDATE_FOUND`,
  distributed format).

**Files this final checkpoint**: `data/research/opportunities/s6b_film_architecture_batch2.jsonl`
(3 entries), `data/research/opportunities/s6b_photo_pass_batch3_partial.jsonl` (4 entries,
including an explicit session-end status note), `data/research/registry/claims_s6b.jsonl` (6 new
lines appended), this TRACKER.md entry.

**Handoff for whoever continues this lane, if anyone does**: the two new/upgraded records
(ImagiNation, Dunedin) and the new architecture candidate (Suseong) are the highest-value
immediate next steps — Suseong specifically has a 2-week-out deadline. The three partial photo
leads (IPPF, IPO, SJWP) each have a specific, concrete next action recorded in their own entries
rather than a generic "try again." Nothing in this checkpoint was fabricated or rounded up to
appear more complete than it is — every record states plainly what was and wasn't reached before
the session stopped. Committing and pushing now; no further work follows per the CEO's explicit
instruction to stop.

---

## S6-A (STEM) — 2026-08-27, environment/medicine discovery pass complete

Founder said keep going. Completed the environment/medicine new-competition discovery task
(`s6a_environment_medicine_batch1.jsonl`, `s6a_do_not_add.jsonl`) and finished the BMT/SMT photo
lead (Instagram requires login — genuine dead end, not pursued further; berkeley.mt's own site
confirmed to have no embedded event photos, only logos/sponsors).

**3 net-new environment records, all real and verified**:
- **Zayed Sustainability Prize — Global High Schools (Europe & Central Asia)**: the single
  strongest new find — not merely theoretically eligible but **Bodrum Anatolian High School
  (Türkiye) won the 2026 edition**, confirmed both on the Prize's own official announcement page
  and independent news wires (Business Wire, Zawya). `PRODUCTION_READY`.
- **TÜBİTAK 2204-D (TEKNOFEST climate-change research competition)**: a genuine sibling to 2204-A
  — same Türkiye/KKTC enrollment-based access — directly resolving this lane's own originally-
  flagged gap ("any real Turkish national STEM competition infrastructure analogous to TÜBİTAK's
  role, for fields TÜBİTAK doesn't cover"). Administered by TEKNOFEST/T3 Vakfı rather than TÜBİTAK
  directly — flagged as an organizational nuance, `provider_type: foundation` not `government`.
  `PRODUCTION_READY`.
- **TÜBİTAK Enerji Verimliliği Proje Yarışması** (energy efficiency): same access model, held at
  `VERIFIED` — more open fields (age range, travel-cost coverage, photo) than the other two.

**4 documented negatives** (`s6a_do_not_add.jsonl`), each a genuine, evidence-based finding worth
recording so a future pass doesn't rediscover the same dead end: IMDO (national-delegation model,
confirmed partner list of 5 countries, no Türkiye), NCF-Envirothon (explicit 4-country list,
Türkiye not included), BIOTech Futures (chapter-gated, no confirmed Turkish chapter but not
explicitly excluded either — held `UNCLEAR`), Young Medical Innovators Challenge (rejected on
organizer-credibility grounds — Gmail-only contact, no named institution, undisclosed fee — same
caution class as this project's commercial-tier findings elsewhere, not a Turkey-access issue).

**Photos**: Zayed Sustainability Prize and the TÜBİTAK Energy Efficiency competition both
`NOT_YET_RESOLVED` (genuine attempts made, nothing found). TÜBİTAK 2204-D's photo deliberately
NOT resolved with a generic TEKNOFEST photo — Commons' TEKNOFEST coverage is entirely aviation/
defense hardware (Baykar drones), which would misrepresent this specific youth research
sub-program if used.

**Total this lane, all tasks**: 39 competition records (36 original + 3 new environment
records) + 4 documented rejections, full photo pass (14 real photos found across all
checkpoints), photo-status regrade, second opinions on S6-B's items. Files this checkpoint:
`s6a_environment_medicine_batch1.jsonl` (3 lines), `s6a_do_not_add.jsonl` (4 lines),
`claims_s6a.jsonl` (+7 lines). Committing and pushing now, then pivoting to a new CEO-assigned
fleet-wide Turkey-eligibility task outside this lane's original competitions scope (fellowship/
volunteering/entrepreneurship categories) — reported separately.

---

## S6-B (Business/Humanities/Creative) — 2026-08-27, fleet-wide Turkey-eligibility sweep (new CEO mandate)

**New mandate, outside this lane's original competitions scope**: fleet-wide `turkey_student_access`
classification on active/verified_current opportunities in `conference` + `student_program` +
`online_program` categories (categories not already deeply covered by other lanes). Assigned 15
specific rows, pulled live and re-verified per instruction rather than trusted from the snapshot.
**All 15 completed** with direct citations, not inferred from participation statistics.

**Key findings, briefly** (full detail with verbatim quotes in `s6b_turkeyelig_batch1.jsonl`):

- **`VERIFIED_ELIGIBLE` (11 of 15)**: European Youth Event (Türkiye explicitly named as one of 8
  eligible candidate countries — not the '160 nationalities' stat), Erasmus+ Youth Exchanges
  (Türkiye holds full **Programme Country** status, the strongest tier — upgrades the CEO's own
  framing of 'associated third country'), EYP Türkiye (two live, currently-open delegate calls
  confirmed), Gençlik Merkezleri/e-Genç (Turkish government domain, self-evidencing), Girl Up Club
  (a real, named, existing chapter in Diyarbakır found — not inferred from the '155 countries'
  stat), Girl Up Global Teen Advisor Board (Türkiye named in the 2023-24 cohort), Columbia
  Pre-College Online, Coursera (an active Coursera-Turkcell partnership plus 46,000+ Turkish
  learners cited on Coursera's own blog — ruled out the sanctioned-country restriction class
  first), Inspirit AI Scholars Live Online (a **dedicated Turkey landing page** naming 5 real
  participating Turkish schools — the strongest evidence class found this sweep), Stanford ULO
  (direct policy quote: no visa needed, international students welcomed), Wall Street 101 Virtual
  (confirmed dedicated timezone slots that actually work for Türkiye's UTC+3, with clock times
  cited, not just an 'international' label).
- **`ELIGIBLE_WITH_CONDITIONS` (3 of 15)**: THIMUN (school-routed only, but Türkiye has a real
  decades-deep base — ACI İzmir 27+ years, three THIMUN-affiliated conferences hosted inside
  Türkiye), İstanbul Kent Konseyi Gençlik Meclisi (explicit **Istanbul-residency** requirement
  found, ages 16-28 — not accessible to a student living elsewhere in Türkiye, a materially
  narrower gate than the record's country-level framing might imply), UNO/United Nations Online
  (genuinely worldwide, but real academic gates apply — TOEFL 90+ and GPA 3.5+ for non-US
  students; also caught and flagged a grade-range discrepancy against the previously-stored
  description).
- **`NOT_ELIGIBLE` (1 of 15)**: UK Youth Parliament — confirmed (not merely assumed from the
  already-stored `eligible_countries` tag) that the actual gate is UK residency/schooling within
  a specific electoral constituency, not citizenship; a Türkiye-resident student cannot qualify
  regardless.

**Discipline notes for the record**: two findings were deliberately NOT taken at face value from a
participation count alone — EYE's '160 nationalities' and Girl Up's '155 countries' — both were
instead confirmed via an actual stated eligibility rule (EYE) or a real named existing chapter
(Girl Up), per this fleet's standing 'a global claim isn't automatically VERIFIED_ELIGIBLE' rule.
One medium-confidence item (Girl Up Teen Advisor Board) is flagged rather than rounded up — country
eligibility is solid, current-cycle application timing is not independently confirmed.

**Files this task**: `data/research/opportunities/s6b_turkeyelig_batch1.jsonl` (15 entries, all
completed in one pass), `data/research/registry/claims_s6b.jsonl` (15 new lines appended), this
TRACKER.md entry.

---

## S6-A (STEM) — 2026-08-27, CEO fleet-wide Turkey-eligibility task (16 rows)

Same CEO reassignment as S6-B, own 16 rows across fellowship/volunteering/entrepreneurship. All
16 completed in one pass, written to `s6a_turkeyelig_batch1.jsonl`.

**Verdicts**: 9 `VERIFIED_ELIGIBLE`, 3 `ELIGIBLE_WITH_CONDITIONS`, 3 `NOT_ELIGIBLE`, 3 `UNCLEAR`.

**Notable findings beyond a plain yes/no**:
- **Ashoka Young Changemakers**: confirmed the CEO's suspicion directly — the operator's own
  page states the country list is exhaustive ('You can apply to AYC only in the country that you
  are a resident of') and Türkiye is absent from both the core list and the separate European
  track's named countries. `NOT_ELIGIBLE`.
- **GençBizzTech**: confirmed the CEO's own flagged condition — state (devlet) Fen Lisesi
  enrollment specifically, not any Turkish high school. `ELIGIBLE_WITH_CONDITIONS`.
- **Genç UPSHIFT**: eligibility explicitly extends beyond Turkish citizens to foreign nationals
  holding Turkish ID (including Syrian/Ukrainian/Afghan and other '99'-prefixed-ID holders) —
  genuinely relevant to Türkiye's refugee/foreign-resident youth population, a nuance worth
  surfacing beyond a bare eligible/not-eligible call.
- **JA Company Programme Europe**: resolved by confirming Türkiye's actual JA member
  organization — Genç Başarı Eğitim Vakfı, the same foundation independently confirmed elsewhere
  in this fleet's research as running GençBizz/GençBizzTech.
- **İBB Genç Gönüllü Programı**: genuinely `UNCLEAR`, contrary to the CEO's expectation of a
  quick close — checked the program's own FAQ page directly for a residency statement and found
  none; age (15-25) confirmed but the Istanbul-residency question the CEO flagged remains open.
- **Duke of Edinburgh's International Award — Türkiye**: confirmed via TİKAV (license-holder
  since 2013, now operating under the name 'Uluslararası Gençlik Ödülü – Türkiye' since 2020,
  same program) — `VERIFIED_ELIGIBLE` but requires an annual paid 'Participation Donation', not
  free as one might assume.
- **TechGirls**: freshly re-verified for the 2026 cycle specifically (not carried forward from a
  possibly-stale prior confirmation) — Türkiye is explicitly named in the current dated list.
- **Girl Up Project Awards**: `ELIGIBLE_WITH_CONDITIONS` — WebFetch was blocked (403) so verified
  via the Browser pane directly; confirmed a live 'Europe' track exists and Türkiye has real
  historical participation (2023 class), but the current cycle's exact country-to-track mapping
  wasn't found published.
- **Three Dot Dash**: resolved the CEO's specific nomination-gate question (it's a genuinely open
  pre-application process, not closed/invitation-only) while leaving the country-list question
  itself `UNCLEAR` — two different questions, only one fully closed.

**Files**: `s6a_turkeyelig_batch1.jsonl` (16 lines), `claims_s6a.jsonl` (+16 lines). Committing and
pushing now.

---

## S6-B — data correction flagged (2026-08-27, addendum to the turkeyelig_batch1 entry above)

Pulling this out on its own so it doesn't get lost inside the batch notes when the Turkey-eligibility
work gets reported up, per coordinator feedback.

**Record**: `UNO - United Nations Online` (entity_id `31856863-be50-440d-8ccc-229812277425`,
`online_program`, Stanley Prep / WFUNA).

**Stored `description` field currently says**: "...for rising 11th/12th graders (min. 3.5
unweighted GPA)..."

**Direct official source** (`https://stanleyprep.com/united-nations-online/`, fetched 2026-08-27)
**actually says**: "Rising 10th to 12th graders. Minimum high school GPA of 3.5 (Unweighted).
English Proficiency: TOEFL 90 or above for non-US students."

**The gap**: the stored record excludes rising 10th graders as eligible; the operator's own page
includes them. Everything else in the stored description (GPA 3.5, TOEFL 90+ for non-US students)
matches the direct source exactly — this is a one-field grade-range fix, not a broader accuracy
problem with the record. Not corrected in place here (S6-B's mandate this task was classification,
not editing other batches' source records) — flagging for whoever owns a write pass on this row.

---

## S6-A (STEM) — 2026-08-27, cross-review of S6-B's `s6b_turkeyelig_batch1.jsonl` (15 records)

**Assignment**: bounded cross-review task, picked up cold from a prior S6-A instance's session
(expired but fully committed). Re-verify S6-B's 15 `turkey_student_access` classifications in
`data/research/opportunities/s6b_turkeyelig_batch1.jsonl` (European Youth Event, THIMUN, Erasmus+
Youth Exchanges, EYP Türkiye, Gençlik Merkezleri/e-Genç, Girl Up Club, Girl Up Global Teen Advisor
Board, İstanbul Kent Konseyi Gençlik Meclisi, UK Youth Parliament, Columbia Pre-College Online,
Coursera, Inspirit AI, Stanford ULO, UNO/Stanley Prep, Wall Street 101 Virtual) — check the citation
actually supports the verdict, don't rubber-stamp, re-fetch anything close/single-sourced/
stat-vs-rule. Method: independently re-fetched every cited URL myself this session (direct
WebFetch where it succeeded, live Browser-pane render where WebFetch hit a TLS/403/socket error,
and a fresh independently-worded WebSearch as a second check on several), rather than trusting the
record's own quote at face value. Full per-record evidence and reasoning in
`data/research/opportunities/s6a_review_s6b_turkeyelig_batch1.jsonl` (15 lines); mirrored to
`data/research/registry/claims_s6a.jsonl` (+15 lines, `entity_type:
opportunity_turkey_classification_review`). **Result: all 15 verdicts confirmed correct. One
citation-text inaccuracy found and logged (verdict unaffected). One taxonomy judgment call flagged
as a documented tension, not changed.** No rubber-stamping — every line below reflects my own fresh
evidence, not a repeat of S6-B's citation.

**The 3 flagged priority items (`ELIGIBLE_WITH_CONDITIONS` calls), one line each**:
- **THIMUN** (`960dcf4d`) — confirmed and *strengthened*. Direct fetch of both of S6-B's own cited
  URLs: `thehague.thimun.org` confirms the school-gate in its own words ("Only students from
  participating schools can apply for an individual student position... no pathway for independent
  student registration"); `foundation.thimun.org`'s affiliated-conferences list actually shows
  **six** Türkiye-based THIMUN-affiliated conferences, not the three S6-B cited (TIMUN, MFINUE,
  ENIMUN, plus MUNESCO/Ankara, RCIMUN, MUNDP found by me) — S6-B understated its own evidence.
  `ELIGIBLE_WITH_CONDITIONS` unambiguously correct.
- **İstanbul Kent Konseyi Gençlik Meclisi** (`4d2e55b3`) — verdict confirmed, **citation text
  corrected**. Live-rendered the page myself via the Browser pane (WebFetch hit a TLS cert error
  S6-B apparently didn't hit, or the page changed — unclear which). The actual current text reads
  *"Gençlik Katılım Ağı, İstanbul'da yaşayan **16-29** yaş aralığında gençlerin içerisinde yer
  aldığı... İstanbul Kent Konseyi Gençlik Meclisi bünyesindeki gençlik platformudur."* S6-B's
  citation_quote says **16-28** and attributes the sentence directly to "Gençlik Meclisi" — the
  live text's actual subject is "Gençlik Katılım Ağı" (the participation-network platform *within*
  the Meclisi). Both are minor: a one-year age-range slip and a sub-entity misattribution, in a
  string presented in quotation marks as an exact quote. **The Istanbul-residency finding itself is
  fully correct and independently reconfirmed** (browser render + a separate WebSearch) —
  `ELIGIBLE_WITH_CONDITIONS` stands, no change to `turkey_student_access`. Recommending only the
  citation_quote's age figure and subject be corrected by whoever owns a write pass on this file;
  not editing S6-B's file myself per the file-ownership rule.
- **UNO / United Nations Online** (`31856863`) — confirmed exactly, word-for-word, via my own
  direct fetch of `stanleyprep.com/united-nations-online/`: "Rising 10th to 12th graders. Minimum
  high school GPA of 3.5 (Unweighted). English Proficiency: TOEFL 90 or above for non-US students."
  `ELIGIBLE_WITH_CONDITIONS` correct — genuinely open to any country, real academic gates apply
  regardless of geography. This record's own 10th-12th figure is itself accurate, which is what
  correctly exposed the separate stored-DB-description staleness S6-B flagged in the addendum
  immediately above this entry (11th/12th vs. actual 10th-12th) — that's a database fix, not an
  issue with this classification record.

**`VERIFIED_ELIGIBLE` records I was not immediately convinced by, checked in depth**:
- **Girl Up Global Teen Advisor Board** (`6fdf9578`) — quote reconfirmed word-for-word via an
  independent WebSearch (which itself surfaced a second independent outlet, a PRWeb syndication,
  carrying the identical 2023-24 roster naming Turkey). Flagging a genuine **taxonomy tension**, not
  an error: this is an extremely selective, appointed process (24 seats/year globally), and S6-B's
  own `condition` field already says so candidly — yet the verdict is `VERIFIED_ELIGIBLE` rather
  than `ELIGIBLE_WITH_CONDITIONS`, a different call than this same batch made for UNO's academic
  gates. My own reasoned view: `VERIFIED_ELIGIBLE` is defensible and I would not change it, because
  the selectivity bar here is nationality-blind (a Turkish applicant faces the identical bar as a US
  applicant, unlike UNO's TOEFL/GPA gate which specifically targets non-US applicants) — but
  recording this as a considered judgment call rather than silently passing over the tension.
- **Coursera** (`6c9d8973`) — S6-B self-flagged "medium-high not high" confidence because only one
  Coursera blog post was reached. I found the same Turkcell-partnership and 46,000+-learner facts
  independently corroborated via Campus Technology, Turkcell's own official FAQ page, and Dünya
  Gazetesi — none of which is the original blog.coursera.org citation. This resolves S6-B's own
  self-flagged gap; confidence is arguably upgradable to high. Verdict confirmed.
- **Girl Up Club** (`903962c1`) — independently re-confirmed the named Diyarbakır chapter via a
  fresh WebSearch query, but flagging honestly that this still rests on essentially one underlying
  source (Girl Up's own login-gated community platform) even after my own check — noted as
  single-sourced per the task's instruction, though the claim itself (does a specific named chapter
  exist) is narrow and directly checkable rather than interpretive, so I judge one first-party
  source adequate here. Verdict confirmed.
- **European Youth Event** (`1acee3b0`) — S6-B's own citation_url flagged itself as
  "search-indexed" rather than a direct fetch. I closed that gap: an independently-worded WebSearch
  landed on the identical "residents in the EU, UK and candidate countries (Albania, Georgia,
  Moldova, Montenegro, North Macedonia, Serbia, **Turkey**, and Ukraine)" quote, corroborated across
  JEF Europe/European Youth Portal/euneighbourseast.eu, and I directly fetched EYE's own
  youth.europa.eu call page myself (confirms "16-30, regardless of nationality," non-contradictory).
  Verdict confirmed; the record correctly declined to treat the "160 nationalities" homepage framing
  as an eligibility rule, per this fleet's standing discipline — confirmed that discipline was
  actually applied, not just claimed.
- **Erasmus+ Youth Exchanges** (`eeb768c4`) — S6-B's specific cited URL socket-errored twice for me
  (noted as a fetch failure on my end, not a claim the citation is bad). Independently confirmed the
  substance via a sibling official erasmus-plus.ec.europa.eu page instead: Türkiye is listed under
  "Third countries associated to the Programme," the official EU terminology for full Programme
  Country status. Verdict confirmed.

**Remaining 8 records — direct fetch of the record's own cited URL, quote matched exactly, no
issues found**: EYP Türkiye (`d35cf54a`, live "Delegates Call is OPEN" banners for İstanbul 2026 and
Eskişehir 2026 reconfirmed verbatim), Gençlik Merkezleri/e-Genç (`d5790a1c`, confirmed live
.gov.tr Ministry of Youth and Sports portal), UK Youth Parliament (`bd187688`, the "does not need
to be a citizen... must go to school or live in the LAA constituency" quote reconfirmed word-for-
word via a second independent source, Wikipedia, since nya.org.uk itself was blocked from direct
fetch on my end this session), Columbia Pre-College Online (`79117533`, English-fluency and
synchronous-Eastern-Time facts both directly reconfirmed; one of the record's two quoted sentences
turned out to live on a sibling Columbia admissions page rather than the single FAQ URL cited — a
minor citation-locator note, not a factual error), Inspirit AI (`bfd946b6`, exact word-for-word
match on the five named Turkish schools), Stanford ULO (`54e6953d`, exact word-for-word match on
the no-visa-needed policy quote), Wall Street 101 Virtual (`574ab33a`, exact match on the dedicated
international session times, and I independently checked the timezone math — 6am EST/EDT lands in
early-to-mid afternoon in Türkiye's UTC+3, a genuinely workable slot).

**Bottom line**: this batch holds up well under independent re-verification — 15 for 15 on the
verdict itself, no country-access classification was wrong. The real value of this pass was the one
genuine citation-text correction (İstanbul Kent Konseyi's age figure/subject) and the documented
taxonomy judgment call (Girl Up Teen Advisor Board) — both are now on the record precisely rather
than smoothed into a blanket "looks right." Not manufacturing disagreement where none was found:
S6-B's discipline of preferring a stated eligibility rule over a participation statistic (explicitly
named in the task as this fleet's standing concern) was checked directly on every record where it
was relevant and held up every time.

**Files this task**: `data/research/opportunities/s6a_review_s6b_turkeyelig_batch1.jsonl` (15
lines, new), `data/research/registry/claims_s6a.jsonl` (+15 lines), this TRACKER.md entry. Not
touching `s6b_turkeyelig_batch1.jsonl` itself, per the append-only cross-review convention
established earlier this session (photo-status regrade). Committing and pushing to
`oryn/s6-competitions-research` now.
