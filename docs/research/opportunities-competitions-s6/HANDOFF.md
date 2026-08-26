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
