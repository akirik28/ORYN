# S7 — Other High-Value Turkey-Accessible Opportunities — Master Closeout

Per the ORYN Research Freeze Common Operating Contract §15 final handoff format.

## STATUS

Wave 1 complete: 4 sub-lanes dispatched (S7-A1 scholarships/awards, S7-A2 publications/
journals, S7-B1 leadership/fellowships/social-impact, S7-B2 online/year-round/Türkiye-based),
each independently cross-reviewed by S7 (parent session), cross-lane deduped, and consistency-
normalized into one consolidated file. **Below target (67 vs ≥140)** — see Key Gaps for why,
and the recommendation to CEO on a possible Wave 2 sent separately via SendMessage.

## ASSIGNED SCOPE

Scholarships, student/merit awards, research-paper opportunities, academic journals, essay/
literary publication, leadership programs, fellowships, youth councils, social-impact programs,
social entrepreneurship, year-round/online academic programs, online mentorship, and
Türkiye-based opportunities with credible international relevance. Target user: a high-school
student based in Türkiye applying to universities abroad.

## PRODUCTION-READY COUNT

**0, by design.** Per the contract, `PRODUCTION_READY` requires (among other things) an S8/
second-agent review this session did not perform on behalf of S8 — S7's own cross-review is a
first pass, not that independent second review. The closest honest analog: **41 of 67 records
are `verification_state: VERIFIED` with `turkey_student_access` resolved to either
`VERIFIED_ELIGIBLE` or `ELIGIBLE_WITH_CONDITIONS`** — i.e., ready for S8 to review toward
`PRODUCTION_READY`, pending S8's own independent pass and an image pass (see Image Complete
Count).

## CANDIDATE COUNT

**26** — `verification_state: CANDIDATE` (real, evidence-backed, but at least one material fact
could not be confirmed via a direct fetch of the organizer's own official page this session;
each record's `notes_uncertainties` states exactly what's unconfirmed and why).

## REJECTED COUNT

**74** substantive rejections across all 4 sub-lanes (A1: 27, A2: 3, B1: 27, B2: 17), each with
cited reasoning and a source URL — logged specifically so no future lane re-researches them.
Plus 1 non-rejection traceability note (A2: an old domain superseded by a new one for the same
already-accepted entity). Rejection reasons span: citizenship/country-restricted (several,
including a caught aggregator-vs-official-source discrepancy on a Czech government scholarship),
graduate-only, not-a-distinct-opportunity, defunct/dormant, redundant with existing DB/corpus
coverage, access-blocked-not-yet-confirmed (flagged for retry, not a quality rejection), and one
documented conflict-of-interest finding (Scholar Launch, via ProPublica).

## BLOCKED / UNCLEAR COUNT

**7** records carry `turkey_student_access: UNCLEAR` (not production-ready per the contract's
own rule) — each because too many material eligibility facts were unconfirmable this session,
not because Turkey-ineligibility was found. Full list in `s7_MASTER_consolidated.jsonl`
(filter `turkey_student_access=="UNCLEAR"`); includes Youth Medical Journal (domain-safety
complication, see Key Uncertainties), Cogito (TLS certificate failure), Voices of Youth/UNICEF
(unresolved platform-merger redirect), Ocean Heroes Bootcamp (couldn't confirm a currently-
running 2026/2027 cycle).

## IMAGE COMPLETE COUNT

**0 — deliberately deprioritized, not an oversight.** The live `opportunities` schema has no
image column at all (confirmed before dispatch; matches GAP_MAP.md's independent finding for
university photos). Sourcing real, rights-clear, non-logo images for 67 records with no schema
to write them into would have traded real research capacity for artifacts nobody could use yet.
Deferred until the schema question S1-S4/CEO are already escalating to the founder is resolved.

## SECOND REVIEW COUNT

**67 of 67 (100%)** reviewed by S7 (parent session) — this satisfies my own mission brief's
"cross-review 100%" instruction, but is explicitly *not* the same as S8's independent QA pass
per the fleet's own role division (S8 = Research QA). S7's review included: file/JSONL validity
checks on all 4 sub-lanes; independent re-fetching of A1's flagged aggregator-vs-official
discrepancy and A2's two safety findings (both confirmed real, not sub-agent artifacts);
independent re-attempts of all 11 of A2's blocked CANDIDATE URLs (8 confirmed still blocked,
1 partially upgraded); full-file reads of B1's 17 records; resolution of one flagged duplicate-
risk record (GençBizz vs. GençBizzTech/JA Company Programme); a full cross-lane duplicate scan
(script-based, canonical-name normalized); and a consistency normalization pass (see Duplicates
Found). **S8's independent review has not yet happened — that is the literal next step, not
something this closeout is claiming to substitute for.**

## DUPLICATES FOUND

**3 cross-lane duplicates**, all between S7-A1 and S7-B1 (genuinely borderline "award" vs.
"social-impact recognition" shapes both lanes independently reached): The Diana Award,
International Young Eco-Hero Awards, International Children's Peace Prize. Resolved by keeping
the more complete copy in each case (B1's copy in all three — strictly better evidence on the
Peace Prize, equal on the other two) and dropping the other; both original copies remain in the
per-lane batch files for audit trail, only `s7_MASTER_consolidated.jsonl` reflects the
dedup. **Zero duplicates found against the live DB** (all 67 were checked against the ~45-entity
dedup baseline built pre-dispatch, documented in `docs/handoffs/s7-other-high-value-
opportunities-claim.md`) or against the ~200+ pre-existing-corpus titles S7-B2 independently
discovered inside `dlopp_*`/`ecw2/3/4_*` files already in this directory.

**One labeling-consistency issue found and fixed fleet-relevant beyond just S7**: 7 records
across A1/B1 carried `turkey_student_access: VERIFIED_ELIGIBLE` while `verification_state` was
still `CANDIDATE` — i.e., stronger eligibility-confidence than the underlying fact-verification
supported. Normalized all 7 down to `ELIGIBLE_WITH_CONDITIONS` (see `_s7_normalization_note` on
each affected record in the master file). **Flagging to S8/S9 as a check worth running on other
lanes' self-assessed output too**, not just this one — the failure mode (a researcher's
subjective confidence in a field outrunning what was actually fetched) seems structural to how
the sub-agent prompts were written, not specific to S7.

## KEY GAPS

1. **Landed at 67 net-new unique records vs. the ≥140 target.** Every sub-lane closeout
   attributes this to genuine, specific, non-corner-cutting causes: (a) real category
   thinness for Turkey-eligible study-abroad scholarships (Turkish foundations largely don't
   fund it; most famous international scholarship names are citizenship-restricted or
   graduate-only — A1); (b) a real structural finding that essentially no multi-month
   fellowship in this space is Turkey-accessible (B1); (c) B2 discovering ~200+ already-
   covered titles in this same directory before spending search budget, correctly avoiding
   padding (B2); (d) WebSearch tool-call budget (200/session) exhausted before full category
   coverage in A1/A2/B1, each with specific named unexplored leads recorded in their own
   closeouts. **This reads as genuine partial saturation + a real tool constraint, not
   corner-cutting** — recommending a scoped Wave 2 to CEO separately (see message sent via
   SendMessage) rather than deciding unilaterally to pad or to stop.
2. **8 URLs remain blocked to every fetch attempt tried so far** (both the sub-agents' and
   my own independent re-attempts): `jsr.org/hs`, `youthmedicaljournal.com`, `theschola.org`,
   `foyleyoungpoets.org`, `hangingloosepress.com`, `bluemarblereview.com`,
   `jhss.scholasticahq.com` (JS-rendering, not a block), `wwf.org.tr`. A human/real-browser
   check is needed before any of these can move past CANDIDATE.
3. **Grade-band/subject-family coverage not measured** (matches GAP_MAP.md's own open item
   #4) — this batch wasn't organized to guarantee even coverage across STEM/humanities/arts/
   grade-9-vs-12, though A2 in particular deliberately chased diversity across science/
   humanities/creative-writing.

## KEY UNCERTAINTIES

1. **`youthmedicaljournal.org` (note: `.org`) currently redirects to an online gambling
   platform** — independently reconfirmed by S7, not a sub-agent artifact. The legitimate org
   is at `.com`, which itself returned 403 to every fetch attempt (sub-agent's and mine). Never
   surface the `.org` URL. The `.com` record is CANDIDATE, not VERIFIED, pending a human
   visiting it directly.
2. **`cogitojournal.org` fails TLS certificate verification** — independently reproduced by
   S7 with a fresh fetch. Concrete technical red flag, not a bot-block; needs a human check
   before ever being surfaced.
3. **Several fee-charging "pay upon acceptance" journals** (The Curieux Review $200-250, The
   Schola $180, Journal of Student Research–HS Edition $349) are real and not flagged as
   predatory by any independent source checked, but the fee model itself needs an explicit
   product-side decision on how to present "pay to publish" alongside free venues.
4. **GençBizz Lise Girişimcilik Programı** kept as its own record following the JA-Company-
   Programme-per-country-brand precedent already in the live DB (JA Europe, Young Enterprise
   UK) — flagged for a human to confirm this precedent should extend to Türkiye's brand too
   before DB ingestion, not silently assumed correct.
5. **Several "2026" deadlines found during research had already elapsed** relative to the
   2026-08-26 research date. None were projected forward as guessed 2027 dates — every such
   record carries `deadline: null` + `deadline_status: next_cycle_not_published`, with the
   elapsed date preserved only in `current_cycle_label`/notes. A reviewer refreshing this
   data later should expect several next-cycle dates to have since become public.

## FILES CREATED/UPDATED

All under `data/research/opportunities/` unless noted:
- `s7a1_batch1-3.jsonl`, `s7a1_rejected.jsonl`, `s7a1_CLOSEOUT.md`, `s7a1_S7_CROSSREVIEW.md`
- `s7a2_batch1-3.jsonl`, `s7a2_rejected.jsonl`, `s7a2_CLOSEOUT.md`, `s7a2_S7_CROSSREVIEW.md`
- `s7b1_batch1-2.jsonl`, `s7b1_rejected.jsonl`, `s7b1_CLOSEOUT.md`, `s7b1_S7_CROSSREVIEW.md`
- `s7b2_batch1.jsonl`, `s7b2_rejected.jsonl`, `s7b2_CLOSEOUT.md`, `s7b2_S7_CROSSREVIEW.md`
- `s7_MASTER_consolidated.jsonl` (67 deduped, normalized records — the actual deliverable)
- `s7_MASTER_CLOSEOUT.md` (this file)
- `docs/handoffs/s7-other-high-value-opportunities-claim.md` (lane claim + pre-dispatch dedup
  baseline, written before research began)

## COMMITS

On branch `oryn/s7-other-high-value-opportunities`: lane claim commit, A1+A2 batch commit
(`fa340b2`), and this consolidation commit (see git log on the branch for the current HEAD).

## BRANCH

`oryn/s7-other-high-value-opportunities`, isolated worktree, based on `origin/main`@`f7af914`.
Not merged — held for CEO/S8/DATA review per contract (no research lane merges to `main`).

## WHAT THE NEXT OWNER SHOULD DO

1. **S8**: independent QA pass on all 67, prioritizing the 41 already at VERIFIED+resolved-
   Turkey-access (closest to `PRODUCTION_READY`) before the 26 CANDIDATE/7 UNCLEAR tier.
2. **A human with an unrestricted browser**: resolve the 8 persistently-blocked URLs listed
   under Key Gaps #2, and directly confirm `youthmedicaljournal.com` and `cogitojournal.org`
   (Key Uncertainties #1-2) before either is ever surfaced to a student.
3. **CEO**: decide on the Wave 2 proposal (sent separately) — each sub-lane closeout names
   specific, already-identified unexplored leads rather than requiring blind re-search, so a
   scoped Wave 2 should be efficient if capacity allows.
4. **DATA/founder**: the `turkey_student_access` and opportunity-image columns still don't
   exist live (matches GAP_MAP.md's founder-escalation items #1-2) — this batch's research is
   ready to backfill both the moment schema exists.
5. **Whoever ingests this**: `category_hint` values are all valid against the live enum, but
   "award"/"publication"/"leadership" as distinct concepts have no enum value of their own —
   confirm the `category_hint` mapping (scholarship/research/student_program/volunteering/
   entrepreneurship/online_program/academic_program) is the right compromise before writing,
   or raise the enum-expansion question to DATA/founder first.
