# S7 — Other High-Value Turkey-Accessible Opportunities — Master Closeout

Per the ORYN Research Freeze Common Operating Contract §15 final handoff format.
Updated after Wave 2 (approved by S9/CEO, scoped to named leads from Wave 1's own closeouts).

## STATUS

**Wave 1 + Wave 2 complete.** Wave 1: 4 sub-lanes (A1/A2/B1/B2). Wave 2 (CEO-approved, scoped
to specifically-named unexplored leads, not blind volume-chasing, per S9's explicit direction
to "stop when the leads are exhausted even if that's still under 140"): 3 sub-lanes
(A1-wave2, A2-wave2, B1-wave2 — B2-wave2 skipped, CEO agreed B2's shortfall was genuine
saturation). All 7 sub-agent runs independently cross-reviewed by S7 (parent session,
including re-fetching flagged URLs myself), cross-lane deduped, consistency-normalized.
Additionally incorporated S8 (Research QA)'s first-pass findings: a real factual correction
(Blue Marble Review's deadline framing), one upgrade (Foyle Young Poets), one resolved
naming-collision check (JHSS vs JRHS).

**Final: 77 unique records — still below the nominal ≥140 target, now via CEO-confirmed
genuine saturation, not an open question.** See Key Gaps for the full per-lane accounting.

## ASSIGNED SCOPE

Scholarships, student/merit awards, research-paper opportunities, academic journals, essay/
literary publication, leadership programs, fellowships, youth councils, social-impact programs,
social entrepreneurship, year-round/online academic programs, online mentorship, and
Türkiye-based opportunities with credible international relevance. Target user: a high-school
student based in Türkiye applying to universities abroad.

## PRODUCTION-READY COUNT

**0, by design.** Per the contract, `PRODUCTION_READY` requires (among other things) an S8/
second-agent review this session did not perform on behalf of S8 — S7's own cross-review is a
first pass, not that independent second review. The closest honest analog: **47 of 77 records
are `verification_state: VERIFIED` with `turkey_student_access` resolved to either
`VERIFIED_ELIGIBLE` or `ELIGIBLE_WITH_CONDITIONS`** — i.e., ready for S8 to review toward
`PRODUCTION_READY` (S8 has already started this pass — see Wave 2 Addendum). Image pass still
outstanding fleet-wide (see Image Complete Count).

## CANDIDATE COUNT

**30** — `verification_state: CANDIDATE` (real, evidence-backed, but at least one material fact
could not be confirmed via a direct fetch of the organizer's own official page this session;
each record's `notes_uncertainties` states exactly what's unconfirmed and why).

## REJECTED COUNT

**112** substantive rejections across all 7 sub-agent runs (Wave 1 — A1: 27, A2: 3, B1: 27,
B2: 17; Wave 2 — A1w2: 19, A2w2: 3, B1w2: 16), each with cited reasoning and a source URL —
logged specifically so no future lane re-researches them. Plus 1 non-rejection traceability
note (A2: an old domain superseded by a new one for the same already-accepted entity).
Rejection reasons span: citizenship/country-restricted (several, including a caught
aggregator-vs-official-source discrepancy on a Czech government scholarship, and a
comprehensive Wave 2 sweep confirming Greece/Norway/Sweden/Denmark/Finland/Estonia/Latvia/
Lithuania/Iceland all lack a usable general undergraduate government scholarship for this
eligibility gate), graduate-only, not-a-distinct-opportunity, defunct/dormant (including
Interlochen's Blue Pencil Online, confirmed on indefinite hiatus), redundant with existing
DB/corpus coverage, access-blocked-not-yet-confirmed (flagged for retry, not a quality
rejection), unverifiable/misattributed (an aggregator-claimed "Young Economists Journal" that
doesn't actually exist under that description), and one documented conflict-of-interest
finding (Scholar Launch, via ProPublica).

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

## CROSS-CATEGORY DUPLICATE ADDENDUM (2026-08-26, post-S8-QA)

S8 relayed a finding from S5B: dedup checks scoped to one's own assigned category miss
entities that already exist live under a **different, wrong category** (S5B found 8
summer_program rows that should be research/internship). Ran the equivalent check against
S7's own output — a whole-table, category-agnostic domain match of all 76 accepted records'
`organizer_domain` values against every row in `opportunities` regardless of category.

**Result: 5 confirmed duplicates, 3 of which were already marked `PRODUCTION_READY`.**
Removed: The International Award for Young People/Duke of Edinburgh (0001 — duplicate of the
live "Duke of Edinburgh's International Award — Türkiye"), Three Dot Dash (0006), The Diana
Award (0044), John Locke Institute Essay Competition (0024 — identical `official_url` to the
live "JLI Global Essay Competition," filed under `competition`), USACO (0061). Full detail and
original records preserved in `s7_livedb_crosscategory_dupes.jsonl`.

**Root cause, stated plainly**: each Wave 1 sub-agent's prompt included a "do not
re-research" list scoped to what seemed relevant to *that sub-agent's own category* (e.g.
B1's leadership/fellowship prompt listed "Duke of Edinburgh Türkiye" and "Three Dot Dash,"
A1's scholarship/award prompt did not) rather than the full ~45-entity cross-category
baseline built pre-dispatch. A1 independently rediscovered two B1-excluded entities under a
plausible "award" framing, because A1 was never told they were already spoken for. **This
is exactly the failure mode S5B/S8 described, just manifesting through prompt-scoping rather
than DB-category-scoping** — the fix for any future multi-agent research wave is the same
either way: give every sub-agent the FULL do-not-duplicate list, not a category-filtered
subset, and run a whole-table domain/title check before finalizing, not just a
category-filtered one.

**3 further records flagged, not removed** (real ambiguity, decision needs a human/DATA
call, not a unilateral merge or deletion by a research lane): UWC Türkiye (0008 — live DB
has a thin, `organization: null`, wrongly-`summer_program`-categorized stub for the same
entity; this record is a far richer verified replacement, arguably should supersede the
stub rather than be discarded — flagging for DATA to reconcile, not deciding this myself);
The Concord Review (0021 — live DB's "Emerson Prize" entry is very likely the same
underlying entity under a `competition` framing rather than `research`); CTY Online
Programs (0062 — likely the same CTY-online offering as a live `academic_program` row,
different specific URL path, not confirmed identical). All 3 demoted to `CANDIDATE`
pending that review rather than left at their prior (higher) state.

**Net effect: 71 unique records (was 76), 26 PRODUCTION_READY (was 29).** Full per-record
detail in `s7_livedb_crosscategory_dupes.jsonl`. This check should be treated as the
template for any future wave, not a one-time fix — see What The Next Owner Should Do.

## WAVE 2 ADDENDUM

CEO-approved, scoped to the specific named leads in each Wave 1 closeout (not blind
volume-chasing). 3 sub-agents (A1w2, A2w2, B1w2 — B2w2 skipped per CEO agreement that B2's
shortfall was genuine saturation). Result: **10 net-new unique records, 38 further rejections,
plus 5 corrections/refinements to existing Wave 1 records.** Zero duplicates found (against
Wave 1 or internally across the 3 Wave 2 lanes) — the dedup discipline held under a second
pass.

**Headline finding**: Wave 1's biggest structural claim — "essentially no multi-month
fellowship in this space is Turkey-accessible" — was **directionally confirmed, not
overturned, but not absolute either**. B1w2 systematically checked all 5 named Turkish
corporate foundations (Koç, Sabancı, Vodafone, Garanti BBVA, TÜSİAD): 4 confirmed no
qualifying program, but **Vodafone Türkiye Vakfı's "AI Startup Studio"** (with Habitat
Derneği) is real — ages 14-18, 3-month duration, genuine mentorship and selection (119
applicants → 25 in the latest cohort). Recorded as CANDIDATE (its own application page
403-blocked every attempt; evidence rests on a co-organizer's page plus a press-agency
article) rather than overclaimed.

**Other Wave 2 highlights**: Üçok Family Scholarship Fund (VERIFIED, up to $50k/year for 4
years, Turkish-citizen women, no US-residency requirement); Global Korea Scholarship upgraded
to VERIFIED/VERIFIED_ELIGIBLE after directly reading the official quota PDF (Turkey: 2 of 150
Embassy Track scholars); an important **correction, not just a refinement**, to UWC Türkiye —
originally implied residency/schooling-based eligibility, actually citizenship-gated (Turkish
citizen or Turkish-citizen parent), corrected in the record without changing its
still-CANDIDATE state; The Pollination Project's Daily Seed Grant (VERIFIED, $500 rolling
worldwide social-entrepreneurship micro-grant, no institutional gatekeeping); a Computer
Science-specific student journal (IJSCAR, VERIFIED, named editorial board, steep $450 fee
honestly disclosed) closing part of A2's STEM-diversity gap, while a chemistry-specific
equivalent was confirmed genuinely absent after three differently-worded search rounds, not
just unfound. One live, time-sensitive item surfaced: **Global Youth Awards' 2026 deadline is
2026-09-01** — 6 days out at research time, worth surfacing promptly if this data ships soon.

**S8 (Research QA) findings incorporated in the same pass** (from S8's independent, real-
browser check of Wave 1's persistently-blocked URLs): Blue Marble Review's deadline framing
was **actually wrong** (recorded as rolling/no-deadline; corrected to closed/reopens-Sept-1,
per S8's direct quote) — a genuine factual fix, not just a confidence upgrade. Foyle Young
Poets upgraded to VERIFIED on S8's independent confirmation. JHSS vs JRHS naming-collision
resolved as genuinely distinct entities via a live DB check. 7 of Wave 1's 8 persistently-
blocked URLs turned out to be tooling limitations, not real unavailability (S8's browser tool
loaded them fine); only `jsr.org/hs` is a confirmed real outage (Cloudflare 523).

## KEY GAPS

1. **Landed at 77 net-new unique records vs. the nominal ≥140 target — now a CEO-confirmed
   genuine ceiling, not an open question.** Wave 1 causes (per-lane, unchanged from the
   original assessment): real category thinness for Turkey-eligible study-abroad scholarships
   (A1), a real structural fellowship-access finding (B1, since partially but not fully offset
   by Wave 2's Vodafone find), B2 correctly declining to pad against ~200 already-covered
   titles, and a hard 200-call WebSearch ceiling per sub-agent session across A1/A2/B1. Wave 2
   was CEO-approved specifically to chase the named leads this produced — 10 more real records
   resulted, and S9 explicitly directed "stop when the leads are exhausted even if that's still
   under 140" rather than manufacturing volume. This gap is closed as an open question, even
   though the number itself remains below nominal target.
2. **1 URL remains genuinely unavailable**: `jsr.org/hs` (Cloudflare 523, origin unreachable,
   confirmed by S8 via network-request inspection — not a tooling gap). 5 more URLs are
   confirmed loadable (by S8) but not yet fact-checked against their specific recorded claims:
   `theschola.org`, `hangingloosepress.com`, `jhss.scholasticahq.com`, `wwf.org.tr`,
   `youthmedicaljournal.com` — S8's substantive re-verification pass on these is in progress.
   `tr.uwc.org`/`uwc.org` and `zonta.org` remain blocked across 9 and 4 cumulative attempts
   respectively (two independent research passes each) — looks like a site-wide bot block;
   flagged for a human/different-tool check rather than further automated attempts.
3. **Grade-band/subject-family coverage not measured** (matches GAP_MAP.md's own open item
   #4) — this batch wasn't organized to guarantee even coverage across STEM/humanities/arts/
   grade-9-vs-12, though A2 in particular deliberately chased diversity across science/
   humanities/creative-writing, and Wave 2 closed part of the STEM gap (CS journal found,
   chemistry confirmed absent rather than just unfound).

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
- `s7a1w2_batch1.jsonl`, `s7a1w2_corrections.jsonl`, `s7a1w2_rejected.jsonl`, `s7a1w2_CLOSEOUT.md`
- `s7a2w2_batch1.jsonl`, `s7a2w2_rejected.jsonl`, `s7a2w2_CLOSEOUT.md`
- `s7b1w2_batch1.jsonl`, `s7b1w2_rejected.jsonl`, `s7b1w2_CLOSEOUT.md`
- `s7_MASTER_consolidated.jsonl` (77 deduped, normalized, S8-corrected records — the actual
  deliverable)
- `s7_MASTER_CLOSEOUT.md` (this file)
- `claims_S7.jsonl` (registry shard, kept on this branch per S9's pull-only convention — not
  pushed directly to the control-tower branch after the first push)
- `docs/handoffs/s7-other-high-value-opportunities-claim.md` (lane claim + pre-dispatch dedup
  baseline, written before research began)

## COMMITS

On branch `oryn/s7-other-high-value-opportunities`: lane claim, Wave 1 A1+A2 batch (`fa340b2`),
Wave 1 B1+B2 + full consolidation (`bce0d16`), claim doc final-status update (`8191518`), S8
QA corrections (`045b963`), and this Wave 2 consolidation commit (see git log on the branch for
current HEAD).

## BRANCH

`oryn/s7-other-high-value-opportunities`, isolated worktree, based on `origin/main`@`f7af914`.
Not merged — held for CEO/S8/DATA review per contract (no research lane merges to `main`).

## WHAT THE NEXT OWNER SHOULD DO

1. **S8**: continuing independent QA pass on all 77 (already delivered one round of findings,
   incorporated above) — prioritize the 47 at VERIFIED+resolved-Turkey-access (closest to
   `PRODUCTION_READY`) before the 30 CANDIDATE/UNCLEAR tier. Substantive fact-check of the 5
   now-loadable-but-unconfirmed URLs (Key Gaps #2) is the named next step S8 already committed
   to.
2. **A human with an unrestricted browser or different tool**: `tr.uwc.org`/`uwc.org` and
   `zonta.org` remain blocked across many cumulative attempts from two different tools — worth
   a genuinely different approach (real browser session) rather than more automated retries.
   Directly confirm `youthmedicaljournal.com` and `cogitojournal.org` (Key Uncertainties #1-2)
   before either is ever surfaced to a student.
3. **CEO**: Wave 2 complete and reported (final numbers above) — no further S7 wave planned
   unless CEO identifies new capacity/priority for it.
4. **DATA/founder**: the `turkey_student_access` and opportunity-image columns still don't
   exist live (matches GAP_MAP.md's founder-escalation items #1-2) — this batch's research is
   ready to backfill both the moment schema exists.
5. **Whoever ingests this**: `category_hint` values are all valid against the live enum
   (checked on every record, both waves), but "award"/"publication"/"leadership" as distinct
   concepts have no enum value of their own — confirm the `category_hint` mapping is the right
   compromise before writing, or raise the enum-expansion question to DATA/founder first. Also
   confirm the GençBizz-as-separate-from-JA-Company-Programme precedent (Key Uncertainties #4)
   before ingestion.
6. **Time-sensitive**: Global Youth Awards' 2026 deadline is 2026-09-01 — if this data ships
   before then, surface it promptly; otherwise note it'll need a next-cycle refresh.
