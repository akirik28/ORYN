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
