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
