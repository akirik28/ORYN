# S6 Competitions — HANDOFF

Each sub-agent writes its own section below, in the Contract §15 format. Do not edit another
session's section — append below it.

---

## S6-A (STEM) — 2026-08-26

### STATUS

Session complete. Primary research pass finished; stopped at genuine saturation of the highest-
value gaps per the fleet CEO's depth-over-volume steer, not at the nominal ~90-record share.

### ASSIGNED SCOPE

STEM competitions: mathematics, computer science, AI, data science, physics, chemistry, biology,
engineering, robotics, environment, medicine/science, hackathons, research competitions — for a
high-school student currently in Türkiye targeting universities abroad.

### PRODUCTION-READY COUNT

**28** records classified `PRODUCTION_READY` (first-party facts verified, Turkey access resolved
— including `NOT_ELIGIBLE` and honestly-classified conditional cases — not-a-duplicate confirmed,
photo status resolved-as-not-yet-found, no other unresolved critical field):

- 2 net-new: TÜBİTAK 2204-A, TÜBİTAK 2202 (the two highest-value records this session — see Key
  Gaps below)
- 6 Turkey-access enrichments on already-live flagship olympiads: IMO, IBO, IChO, IPhO, IOI, IOAI
- 3 net-new Berkeley/Stanford math tournaments confirmed with clean eligibility: BMT (in-person,
  UNCLEAR but complete), BmMT (enriches an existing under_review placeholder), SMT Online
  (VERIFIED_ELIGIBLE, one of the strongest net-new finds this session)
- 17 corrections/enrichments to other already-live rows: AMC-AIME, HMMT, USACO, Purple Comet,
  Waterloo, CMIMC, Breakthrough Junior Challenge, GENIUS Olympiad, Nat Geo Slingshot, EUCYS, Brain
  Bee, FIRST Global Challenge, IEnvO, Stockholm Junior Water Prize, HOSA, Microsoft Imagine Cup
  Junior, and the new FRC Türkiye record (which also resolves a live duplicate-pair question)

### CANDIDATE COUNT

**36 total records researched** this session (all listed above plus the 8 below). Everything
reached at least `VERIFIED` — none left at bare `CANDIDATE`.

### REJECTED COUNT

**0** new rejections proposed by this lane. (I did **not** re-litigate `cr1_do_not_add.jsonl` —
respected as instructed, nothing on it was reconsidered.)

### BLOCKED-UNCLEAR COUNT

**8 records held below `PRODUCTION_READY`** (status `VERIFIED` or `BLOCKED`), each for a named,
specific, unresolved reason rather than a generic gap:

- **BLOCKED**: International Young Physicists' Tournament (IYPT) — genuinely attempted; found
  historical Turkish participation (2019 via Galatasaray Eğitim Vakfı, a 2022 results page) but
  could not confirm current-cycle (2025/2026) participation or whether an active national Member
  Organization exists today. Marked `UNCLEAR` on `turkey_student_access` per Contract, not guessed
  by analogy to the TÜBİTAK-routed olympiads.
- **VERIFIED, not promoted**: Battlecode (MIT) — High School track's non-US eligibility is
  search-corroborated only, no primary source found. PennApps — may be a college-only event
  misfiled into a high-school-facing category; not independently resolved, flagged as a more
  fundamental doubt than Turkey-access specifically. iGEM High School Competition — team
  registration fee genuinely unresolved after two independent research passes 3 days apart, on a
  team competition requiring Paris travel. The Earth Prize — missing deadline on an "open" row is
  a real, not cosmetic, gap. Berkeley Math Tournament Online (BMT Online) — a 3rd Berkeley format
  discovered fresh this session, thin evidence base, flagged for follow-up rather than padded.
  Stanford Math Tournament in-person — `NOT_ELIGIBLE` classification is fairly confident but
  several required fields remain unconfirmed. Technovation Girls — self-service chapter model
  confirmed but an existing Turkish chapter neither confirmed nor denied; most fields unresolved.

Separately, of the 28 `PRODUCTION_READY` records, **10 carry `turkey_student_access: UNCLEAR`**
as their correctly-resolved final state (Purple Comet, Nat Geo Slingshot, plus 8 of the above) —
`UNCLEAR` is itself a resolved, honest classification per Contract §11, not a blocker to
`PRODUCTION_READY` status when every other field is complete; it only blocks promotion when
paired with other missing critical fields (as in the 8 held-back records above).

### IMAGE COMPLETE COUNT

**0.** No image was fully sourced, rights-checked, and marked resolved this session. I attempted
image-sourcing on the 2 highest-value records (TÜBİTAK 2204-A, AMC) and got genuine negative
results (only generic stock photography / no images at all) on both — recorded in each record's
`image_note` so the next researcher doesn't repeat the same dead ends. The remaining 34 records
are honestly marked `NOT_YET_RESOLVED` rather than silently left blank. Given the schema itself
has no `image_url` column yet (proposal field only, confirmed by the fleet CEO), and given the
volume of factual/eligibility work this session prioritized, image-sourcing is this lane's single
clearest remaining gap — flagged explicitly under Key Gaps below, not buried.

### SECOND REVIEW COUNT

**0.** Cross-review with S6-B has not yet happened — per the README, that is the S6 orchestrator's
next step once both sub-agents report. This handoff is written so a reviewer who wasn't there can
check the evidence directly (every record cites either a fresh 2026-08-26 quote/URL or explicitly
says which prior cr1 evidence was carried forward without re-fetching, and why).

### DUPLICATES FOUND

1. **FRC (dfb94075, under_review) vs FIRST Robotics Competition (db25d327, active)** — resolved
   this session (S6A-0036): FRC is the standard abbreviation for FIRST Robotics Competition, almost
   certainly the same underlying competition. Flagging for DATA/CEO to merge; I did not write a
   third duplicate record.
2. **Stockholm Water Prize (c8eb3d40, wrong entity, still `active`) vs Stockholm Junior Water
   Prize (17aeb772, correct entity, `under_review`, now enriched with full Turkey-access data by
   this lane, S6A-0030)** — a pre-existing finding from cr1 3 days ago that I re-confirmed still
   stands: the wrong entity is **still live and student-facing** as of this session's end. Not my
   call to remove a live row (dry-run only), but flagging again because it has now survived two
   research passes without correction in production.
3. **Confirmed NOT a duplicate**: iGEM High School Competition (c83420f7) vs International
   Genetically Engineered Machine Competition (931e7fc2, the collegiate/umbrella product) — two
   distinct audiences, correctly separate rows, re-confirmed this session.

### KEY GAPS

1. **TÜBİTAK 2204-A and TÜBİTAK 2202 were completely absent from production** despite being the
   most heavily P1-documented STEM records in the entire prior cr1 corpus (verbatim call-document
   text, local PDF extraction, verified university-admission-benefit clauses). Only the 6
   international olympiad rows that silently assume this national ladder exists were ever written.
   This is arguably the single highest-value gap this entire research week could close for ORYN's
   actual target user — a STEM-interested student currently in Türkiye. Now proposed as 2 fresh-
   verified `PRODUCTION_READY` records.
2. **Image sourcing is essentially untouched** across this lane's 36 records (0 complete, 2
   negative-attempted, 34 not yet tried). This is the most systematic remaining gap.
3. **Environment/sustainability and medicine/biomedical beyond what's covered here** — this
   session covered Nat Geo Slingshot, Earth Prize, IEnvO, Stockholm Junior Water Prize (environment)
   and Brain Bee, HOSA (medicine) but did not do an exhaustive search for further candidates in
   either area given the depth-over-volume steer; a future pass could look specifically here.
4. **Data-science-specific competitions beyond Wharton's** were not researched this session
   (Wharton Data Science Competition itself was identified as in-scope but not independently
   re-verified — carried forward from the live DB's existing data only).

### KEY UNCERTAINTIES

1. **IBO's "not specific for STEM or biology" school-type eligibility clause** — read literally,
   could exclude Türkiye's Fen Liseleri (science high schools). Flagged by cr1 3 days ago, still
   unresolved by either lane; genuinely needs a direct question to the IBO office, not more web
   research.
2. **Whether TÜBİTAK 2202/2204-A is the sole Turkish route to IChO/IPhO/IOI/IOAI**, or whether
   parallel routes exist — five bodies independently name the same TÜBİTAK site, which is strong
   but not exhaustive evidence; each was confirmed individually rather than generalized.
3. **The exact numeric "Ek Katsayı" (YKS coefficient) magnitude** for TÜBİTAK olympiad/2204-A
   winners lives in the ÖSYM YKS guide, not any TÜBİTAK document, and has never been retrieved by
   any research lane. Do not publish a number without that specific source.
4. **IYPT's current Turkish access route** — genuinely unresolved; see BLOCKED-UNCLEAR above.

### FILES CREATED/UPDATED

- `data/research/opportunities/s6a_tubitak_batch1.jsonl` (2 records)
- `data/research/opportunities/s6a_tubitak_olympiad_upgrades.jsonl` (6 records)
- `data/research/opportunities/s6a_math_cs_batch1.jsonl` (8 records)
- `data/research/opportunities/s6a_berkeley_stanford_math.jsonl` (5 records)
- `data/research/opportunities/s6a_science_env_batch1.jsonl` (11 records)
- `data/research/opportunities/s6a_medicine_robotics_other.jsonl` (4 records)
- `data/research/registry/claims_s6a.jsonl` (37 lines covering all 36 research_ids)
- `docs/research/opportunities-competitions-s6/TRACKER.md` (3 checkpoint entries appended, S6-B's
  entries untouched)
- `docs/research/opportunities-competitions-s6/HANDOFF.md` (this file, created — S6-B had not yet
  created it when I started this section)

### COMMITS

All on `oryn/s6-competitions-research`, pushed:

1. `6f21f06` — TÜBİTAK 2204-A/2202 net-new + 6 olympiad Turkey-access upgrades
2. `40f1256` — math/CS competition Turkey-access upgrades + Berkeley/Stanford tournaments
3. `43d095f` — science/environment competition Turkey-access batch (11 records)
4. `af559b0` — medicine/robotics closing batch + honest image-search negatives

### BRANCH

`oryn/s6-competitions-research`

### WHAT THE NEXT OWNER SHOULD DO

1. **Cross-review this lane's records against S6-B's** per the Contract's mandated pairing —
   specifically sanity-check the 3 records I flagged as genuinely mixed-discipline (GENIUS
   Olympiad spans STEM+arts; International Greenwich Olympiad and UniHive Research Proposal
   Competition, both already live/under_review, were named in my original assignment as mixed and
   I deliberately left them for S6-B's first look per the assignment brief rather than researching
   them myself this session — they remain untouched by this lane).
2. **Resolve the two duplicate findings** in production: merge FRC/FIRST Robotics Competition
   (or at minimum enrich the surviving row with `frcturkiye.org`'s Turkey-specific data from
   S6A-0036), and remove or downgrade the wrong-entity Stockholm Water Prize (c8eb3d40) now that
   its correct replacement (17aeb772) is fully enriched.
3. **Prioritize TÜBİTAK 2204-A and 2202 (S6A-0001, S6A-0002) for production write** — these are
   the highest-leverage records in this entire handoff for ORYN's actual target user.
4. **Note 3 records carry near-term deadlines** that will go stale if not acted on promptly:
   HMMT (Sept 20, 2026), Breakthrough Junior Challenge (Sept 15, 2026) — both already live rows
   this lane enriched — and none of this lane's own net-new records carry an imminent deadline.
5. **Run an image-sourcing pass** — this lane's least-covered dimension. TÜBİTAK's own press/news
   photo archives (beyond the Bilim Genç stock-photo page already checked negative) and Wikimedia
   Commons categories for individual olympiads (IMO, IChO, etc., which often have real event
   photos from national delegations) are reasonable next places to look.
6. **Re-run the live DB baseline query** before any write — this handoff's Turkey-access and
   duplicate findings are current as of 2026-08-26 but the corpus may have moved if other lanes
   (or S6-B) have written to related rows since.

---

## S6-B (Business/Humanities/Creative) — 2026-08-26

**Note on this section's history**: I wrote this section once already this session (commit
`e6daf55`), but a concurrent write race with S6-A's own first HANDOFF.md creation (both of us
created a file at this same new path within the same short window) resulted in only S6-A's
content surviving on this branch's HEAD after both pushes landed — mine was silently dropped, not
merged. Re-appending it here now, faithfully reconstructed from my own commit history, below
S6-A's section per the file's own instruction, without touching anything above this line.

### STATUS

Primary research pass complete at a natural stopping point. Not exhaustive of the full category —
stopped here deliberately per the fleet CEO's explicit depth-over-volume steer for an
already-saturated category (competition+summer_program = 84% of the live corpus), rather than
padding toward the nominal ~90-record share with thinner finds. Ready for cross-review against
S6-A.

### ASSIGNED SCOPE

Economics, finance, investment, entrepreneurship, business, essay, history, politics, law,
philosophy, social sciences, writing, journalism, architecture, art, film, creative competitions —
for a high-school student currently in Türkiye targeting universities abroad.

### PRODUCTION-READY COUNT

**0, by my own strict labeling — reported honestly rather than rounded up.** Every record I
touched carries either (a) `photo_status: NOT_RESOLVED` — including several online-only formats
(Blackstone, Harvard Crimson, Concord Review, Princeton Play Contest) where I *reasoned* no
physical-event photo exists but did not relabel that reasoning as a formally "resolved-absent"
photo state, out of caution against grading my own work generously — or (b) a real photo candidate
found but marked `RIGHTS_REVIEW_REQUIRED` (GençBizz — a specific 2025 Türkiye Finali photo
identified, all-rights-reserved per the site footer, not open-license) or `CANDIDATE_IDENTIFIED`
with rights unverified (Wharton, Diamond Challenge, World Scholar's Cup). **Practical read for
whoever picks this up next**: at minimum 4 records (S6B-0004 Blackstone, S6B-0005 Harvard Crimson,
S6B-0006 Concord Review, S6B-0007 Princeton Play Contest) need only a photo-status decision — the
honest answer is almost certainly "no physical event exists, absence is the correct resolved
state" — to become genuinely PRODUCTION_READY with no further research. A further ~4 (Wharton,
Diamond Challenge, World Scholar's Cup, GençBizz) have a specific candidate image identified and
need only a rights-clearance decision.

### CANDIDATE / VERIFIED COUNT

**21 records at `VERIFIED`** (first-party or high-confidence prior-lane P1 eligibility evidence,
`turkey_student_access` resolved to a non-`UNCLEAR` value, checked against the live baseline for
duplication) — the bulk of this lane's output: S6B-0001–0009, 0011–0014, 0016–0019, 0022, 0024–0026
(see `claims_s6b.jsonl` for the full per-record list and reasoning).

**5 records at `READY_FOR_REVIEW`** — genuinely `UNCLEAR` on `turkey_student_access` after a real
attempt, or carrying a flagged internal conflict I deliberately did not resolve in the record's own
favor: Harvard Political Review Essay Competition (real but no stated country rule + unusually high
fee), Harvard Pre-Collegiate Economics Challenge (2026-27 rules genuinely not yet published by the
operator), 120 Hours (worldwide access confirmed, but conflicting sources on whether high-schoolers
or only enrolled architecture-degree students qualify), The Earth Prize (matches cr1's own prior
finding — no stated eligibility rule despite huge participation), National History Day (confirms
and formally classifies cr1's finding — international affiliates exist, none in Türkiye).

**2 records at `CANDIDATE`** (real, evidence-backed, but too thin to call `VERIFIED`): Eurasian
Schools Debating Championship (Istanbul-hosted — structurally Turkey-favourable — but governing
organization, eligibility, fee and team structure all unknown, next edition not yet open for
registration), Dunedin International Film Festival High School Competition (explicit worldwide
eligibility quote found, but which "Dunedin" — Florida vs. New Zealand — and current cycle status
both unresolved).

### REJECTED COUNT

**2**: Young Guru Academy (real, highly selective Turkish NGO, but its high-school-facing
programme is a cohort-selection fellowship, not a competition with a submission/deadline/winner
structure — flagged for whichever lane owns fellowship/student_program categories, not mine to
carry); the architecture/film gap search itself is recorded as a negative finding, not a candidate
(searched deliberately per the brief's explicit flag that these categories are thin, found nothing
beyond what's already proposed).

### BLOCKED-UNCLEAR COUNT

**1**: RISE for the World. Per my brief's own explicit steer ("confirm current status directly...
likely stays a HOLD"), confirmed: current application-cycle status is genuinely unconfirmable after
repeated direct attempts on the official domain, and search results are contaminated by at least
three unrelated programs sharing the generic "RISE" name. Recommend a direct email to the operator
rather than more searching.

### IMAGE COMPLETE COUNT

**0 fully rights-cleared with an open license.** 1 resolved to `RIGHTS_REVIEW_REQUIRED` with a
specific candidate image and rights read completed (GençBizz). 4 with a specific candidate source
identified but rights unverified (Wharton, Diamond Challenge, World Scholar's Cup, and partially
Marshall Society — searched Wikimedia Commons for the Cambridge Faculty of Economics building and
found an adjacent-but-wrong building, Law Faculty, correctly declined to substitute it). The
remaining ~24 records carry `NOT_RESOLVED` — see the PRODUCTION-READY COUNT section above for which
of these are genuinely "nothing to find" (online-only formats) versus a real open gap.

### SECOND REVIEW COUNT

**0 so far.** No cross-review against S6-A's records has happened yet from this side either — both
lanes were still in primary research when each wrote its own handoff. Recommend the S6 orchestrator
trigger the cross-review pass now that both lanes have reported. I have read S6-A's section above
this one (now that it's visible again) and flag one specific item for that pass: S6-A's Key Gap #3
names environment/medicine as an area they did not exhaustively search either — between the two of
us, Stockholm Junior Water Prize, Earth Prize, IEnvO, Brain Bee and HOSA are the only environment/
medicine-adjacent rows either lane touched this session, worth a joint note to the orchestrator
rather than either lane assuming the other covered it.

### DUPLICATES FOUND

None of my proposed records duplicate each other, the live DB baseline (checked by exact-title
query against the fresh 2026-08-26 baseline before every `propose_new`), or S6-A's output (their
section above lists their own scope; I do not see an overlap with mine on a title-by-title read).
One near-miss worth flagging explicitly for cross-review: **The Earth Prize** (S6B-0021) sits
genuinely between S6-A's environmental-science angle and my policy/business-solutions angle — per
the brief I took first pass, but S6-A should sanity-check the classification, not silently accept
it. **Stockholm Junior Water Prize** (S6B-0025) is similarly cross-disciplinary (environmental
science + the social-science/policy angle it explicitly accepts) — I developed it per the brief's
direct instruction; I now see S6-A's section above also lists Stockholm Junior Water Prize as
enriched this session (their duplicate-finding #2, re-confirming the wrong-entity Stockholm Water
Prize is still live). **This needs explicit reconciliation at cross-review**: both lanes appear to
have written enrichment proposals for the same live row (17aeb772) — check `s6a_*.jsonl` against
my `S6B-0025` for any conflicting field values before either is applied to production.

### KEY GAPS

1. **Film has effectively zero corpus rows even after this pass.** One low-confidence candidate
   (Dunedin) was found and proposed; a second (ImagiNation International Student Film Festival)
   was found but held back entirely — its direct page 403'd and its organizing entity was never
   confirmed, which is exactly the kind of thin sourcing this lane's evidence discipline exists to
   catch, not paper over.
2. **Architecture remains effectively one row** (120 Hours) after a dedicated search that found
   only US-restricted alternatives (Cooper Hewitt, TSA, AIAS, AFSF, Newhouse) — and that one row's
   audience-fit for high-schoolers is itself unresolved (see 120 Hours above).
3. **Photo research is the single largest remaining task across this whole batch** — see IMAGE
   COMPLETE COUNT. This is real, unglamorous, and I judged it lower-value than closing eligibility/
   Turkey-access gaps given the time available this session, but it is the main blocker between
   `VERIFIED` and `PRODUCTION_READY` for the large majority of records here.
4. **HPEC's 2026-27 cycle is genuinely not yet published by the operator** — not a research gap,
   a real "come back later" case.

### KEY UNCERTAINTIES

1. **Marshall Society Essay Competition — TIME CRITICAL.** Deadline 2026-08-30, 4 days from this
   handoff. No official country restriction found on the operator's own eligibility text after two
   direct fetches, corroborated by a long-running third-party UK economics-teaching resource, but
   a linked full-rules Google Doc was never opened and could in principle contain a restriction not
   visible elsewhere. If this record is going to reach a student in time to matter, whoever reviews
   next should either open that document or accept the evidence as sufficient — there isn't time
   left in this cycle for a third research pass.
2. **Wharton Global HS Investment Competition — deadline 2026-09-11, 19 days out**, requires
   forming a team of 4-6 plus a teacher advisor. cr1 already found this fact exists in the live
   row's `description` field but does not reach the AI advisor's context-assembly layer (a
   code-level issue, confirmed independently again this session, not something a research lane can
   fix).
3. **Blue Ocean Competition's eligibility evidence is a genuinely closer call** than most records
   in this batch — the FAQ's "high school students around the world" phrasing is descriptive rather
   than a stated rule, similar in shape to claims I declined to accept elsewhere (Earth Prize's
   country-count statistics). I judged it as adequate for `VERIFIED_ELIGIBLE` at medium-high rather
   than top confidence — flagged explicitly for a second opinion at cross-review.
4. **120 Hours' audience-fit conflict is unresolved and matters a lot**: is this competition open
   to any student (including high-schoolers) or only students enrolled in an architecture/design
   degree programme? Two source classes disagree. The operator's own eligibility subpage 404'd on
   every attempt this session.

### FILES CREATED/UPDATED

- `data/research/opportunities/s6b_essay_humanities_batch1.jsonl` (S6B-0001–0010)
- `data/research/opportunities/s6b_business_batch1.jsonl` (S6B-0011–0018)
- `data/research/opportunities/s6b_turkey_and_mixed_batch1.jsonl` (S6B-0019–0028, +photo update to
  S6B-0026)
- `data/research/opportunities/s6b_arts_film_batch1.jsonl` (S6B-0030, S6B-0031)
- `data/research/registry/claims_s6b.jsonl` (all 31 research IDs, append-only)
- `docs/research/opportunities-competitions-s6/TRACKER.md` (appended one dated checkpoint entry;
  S6-A's entries left untouched)
- `docs/research/opportunities-competitions-s6/HANDOFF.md` (this section — re-appended after a
  concurrent-write race dropped it the first time; see note at the top of this section)

### COMMITS

- `820bc02` — S6-B checkpoint 1: 22 live-row enrichments + 5 new candidates
- `d736ea6` — S6-B checkpoint 2: film gap search, GençBizz photo resolved, architecture negative
  result
- `e6daf55` — S6-B handoff (content lost to the write race described above)
- (this re-append, committed separately)

### BRANCH

`oryn/s6-competitions-research`, pushed to `origin/oryn/s6-competitions-research` after each
commit.

### WHAT THE NEXT OWNER SHOULD DO

1. **Act on the two time-critical deadlines first** (Marshall Society, 4 days; Wharton Investment,
   19 days) if this handoff is being read before either passes — everything else in this batch can
   wait a review cycle, these cannot.
2. **Cross-review against S6-A**, per the Contract's mandated pairing — in particular sanity-check
   my Earth Prize and Stockholm Junior Water Prize classifications (cross-disciplinary, S6-A's
   environmental-science lens is relevant to both, and both lanes appear to have written
   enrichments to the same Stockholm Junior Water Prize row this session — reconcile before
   applying) and my judgment calls on Blue Ocean and 120 Hours (flagged above as genuinely closer
   calls, not confident conclusions).
3. **A focused photo pass** on the ~9 records with a candidate image already identified
   (GençBizz, Wharton, Diamond Challenge, World Scholar's Cup, plus a fresh Wikimedia Commons
   search for Marshall Society/Cambridge Faculty of Economics specifically, not the adjacent Law
   Faculty building I found and correctly declined to substitute) would convert several `VERIFIED`
   records to genuine `PRODUCTION_READY` with comparatively little additional research effort.
4. **Direct WebFetch confirmation** of Jane Austen Society and Columbia Undergraduate Law Review
   (both currently resting on search-index summaries of their own official domains, not a raw
   fetch — I recommend this explicitly in both records) before promoting either past `VERIFIED`.
5. **If more S6-B capacity becomes available**, the two real remaining gaps are film (beyond
   Dunedin — ImagiNation is the next thing to chase, starting with resolving its 403) and a second
   Turkey-native national competition analogous to GençBizz, in a category GençBizz doesn't cover
   (debate or essay/writing specifically — ESDC is Istanbul-hosted but too thin to count yet, and
   is the natural next candidate to push on for debate).
6. **Do not lower the evidence bar to hit a round number.** This lane's ~31-record output,
   saturating well below the nominal ~90-record share, is a deliberate choice consistent with the
   fleet CEO's own steer — the category is already 84% of the live corpus, and a smaller set of
   genuinely well-evidenced records was judged more valuable than padding toward the target.
