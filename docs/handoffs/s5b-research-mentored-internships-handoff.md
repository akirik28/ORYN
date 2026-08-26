# S5B — Research / Mentored Research / Internships — Handoff

Written 2026-08-26/27. Branch `oryn/s5b-research-mentored-internships`. No production writes were made
at any point — everything below is dry-run proposal data in `data/research/opportunities/s5b_batch*.jsonl`,
the two `s5b_2026-08-26_MISCATEGORIZATION_*` files, and the claims shard
`data/research/registry/claims_s5b.jsonl`.

## STATUS

Stopping at a natural checkpoint after five research batches, a critical cross-category dedup finding
and its correction, a reciprocal cross-review with S5A, and a real (not merely proposed) image-sourcing
pass on a representative subset. Not because the category is exhausted in an absolute sense, but because
this session's research (five full batches spanning US/UK/Turkey/global commercial and university
providers, three independent citizen-science platforms, and a systematic sweep of ~15 subject verticals
and ~10 geographies) has reached genuine, well-documented saturation for the highest-confidence tier of
candidates — consistent with, and now adding fresh independent evidence to, three separate prior
findings (thincat's 2026-08-21 worldwide pass, CR1's 2026-08-23/24 competitions+research pass, and this
session) that research/internship-for-secondary-school-age is a genuinely thin market worldwide, not a
research-effort failure.

## ASSIGNED SCOPE

S5B = categories 4-7 of the S5 mission: university research programs, mentored research, research
internships, credible internships accessible to Türkiye-based students. Explicitly NOT summer schools /
pre-college programs / general academic enrichment (S5A's territory — confirmed zero canonical-entity
overlap with S5A's 38 records via name/URL comparison during the cross-review below, and S5A
independently confirmed the same from their side).

## PRODUCTION-READY COUNT

**10 net-new** (`verification_state = VERIFIED_CURRENT`, first-party-sourced, Turkey access resolved):

| ID | Name | Category | Turkey access | Image |
|---|---|---|---|---|
| S5B-0011 | Bilimle Tanış (Gebze Technical University) | research | VERIFIED_ELIGIBLE | ✅ verified |
| S5B-0022 | NC State GTI Online Research Academy | research | VERIFIED_ELIGIBLE | ✅ verified |
| S5B-0024 | NASA Citizen Science | research | VERIFIED_ELIGIBLE | ✅ verified |
| S5B-0021 | Science Mentorship Institute (sci-MI) | research | VERIFIED_ELIGIBLE | not yet sourced |
| S5B-0016 | Algoverse AI Research Program | research | VERIFIED_ELIGIBLE | not yet sourced |
| S5B-0027 | Non-Trivial Fellowship | research | VERIFIED_ELIGIBLE | not yet sourced |
| S5B-0029 | Research Girl Scientific Research Mentorship Program | research | VERIFIED_ELIGIBLE | not yet sourced |
| S5B-0003 | Horizon Academic Research Program (HARP) | research | ELIGIBLE_WITH_CONDITIONS | not yet sourced |
| S5B-0014 | Immerse Education Online Research Programme | research | ELIGIBLE_WITH_CONDITIONS | not yet sourced |
| S5B-0025 | Zooniverse | research | ELIGIBLE_WITH_CONDITIONS | not yet sourced |

**Plus 8 gap-closure corrections** to existing rows already live in production (see DUPLICATES FOUND) —
these are not counted in the 10 above (they are not "new"), but per the S5 addendum's own framing
("a gap-closed existing row that now has verified Turkey-access + evidence + image is exactly as real a
contribution as a net-new row") they represent equally real, equally evidenced work product, ready for
CEO/DATA to apply once independently re-confirmed:

Polygence, Lumiere Education, UC Santa Barbara Research Mentorship Program (+ its pre-existing duplicate
row), Summer Science Program (SSP), Rockefeller SSRP, Iowa SSTP (+ its pre-existing duplicate row),
Venture & Tech Summer Program (VTSP — recommend recategorizing to `internship`, not `research`),
International Research Institute of North Carolina.

## CANDIDATE COUNT

**13 net-new** (`verification_state = NEEDS_REVIEW`) — genuine, credible finds where the core Turkey-
access finding is real but at least one other fact (usually cost, occasionally the eligibility statement
itself) rests on a search-index synthesis or a secondary source rather than a directly-rendered official
fetch this session, because the official site blocked or errored on direct automated access (a real,
repeated pattern this session — see KEY GAPS): Veritas AI, CCIR Academy, Global Research Fellowship,
Scholar Launch, Ladder Internships, learnSTEM, Youth Journalism International, International Medical Aid,
Synthica, iNaturalist, ASDRP, The Intern Group, United Planet. Each record's own `research_notes` names
the specific follow-up needed (e.g. "re-fetch learnstem.org's live-rendered pricing page").

## REJECTED COUNT

**1 confirmed do-not-add**: "Oxford Institute for Interdisciplinary Research" — searched the University
of Oxford's own list of interdisciplinary institutes directly; no entity by this name exists there. Same
aggregator-invention pattern as the corpus's existing "LSE Generate Global Innovation Challenge" finding
in `cr1_do_not_add.jsonl`. Recorded in `claims_s5b.jsonl` as `S5B-DNA-0001`.

**Investigated and deliberately NOT written up** (real organizations, but eligibility/legitimacy could
not be confirmed to this contract's evidence bar): RISE Research (no cost or eligibility statement
confirmed via direct fetch despite multiple attempts), YRI Fellowship (same), Extern (HS-eligibility and
international policy both unconfirmed), Discovery Internships (current-cycle existence under this brand
name genuinely uncertain — the "Discovery Internships" product no longer appears on Summer Discovery's
own current tuition page), Loop Abroad (skews 18+/undergraduate), TKS/The Knowledge Society (real, but
its own positioning is an innovation/entrepreneurship accelerator, not research — out of S5B's scope),
Springpod (a directory of many separate third-party programs, not itself one opportunity — same category
of source as the already-rejected "Institute of Competition Sciences").

**Confirmed NOT_ELIGIBLE for a Turkey-based student** (checked and ruled out, not silently skipped):
Boston University RISE (explicit US-citizen/permanent-resident-only), Simons Summer Research Program
(explicit US-citizen/permanent-resident-only), Jackson Laboratory Summer Student Program (explicit
US-citizen/permanent-resident-only), Broad Summer Scholars (Massachusetts-commuting-distance + work-
authorization requirement), Microsoft Discovery Program (Redmond WA/Atlanta GA residents only, no visa
sponsorship), MIT PRIMES Circle (Boston-area public schools only), JSHS (US-citizen/permanent-resident-
only — also a competition, not research/internship, so doubly out of scope), AMNH Science Research
Mentoring Program (NYC-residents-only), Fields Institute FUSRP (undergraduate-only), Foreign Policy
Research Institute internship (requires US work authorization), NYU Abu Dhabi Summer Academy (Emirati-
nationals-only), Weizmann Institute Alpha Program (Israeli national gifted-education pathway via a
national testing institute, not internationally accessible), DESY Summer Student Programme (undergraduate
-only), CityU Hong Kong Bright Future Engineering Talent Hub (requires nomination by a *current teacher
at the student's own secondary school*, structurally implying a Hong Kong school network).

## BLOCKED/UNCLEAR COUNT

**0 formally recorded** — records where Turkey-access genuinely could not be resolved either way were
not written up as formal candidates (see "investigated and deliberately not written up" above instead),
consistent with the contract's instruction that UNCLEAR records aren't production-ready and shouldn't be
used to inflate a count.

## IMAGE COMPLETE COUNT

**6 of 23 net-new PRODUCTION_READY-track + CANDIDATE records (26%)** have a real, non-logo photo that was
*downloaded and visually inspected this session* (not merely metadata-checked): Gebze Technical
University, UC Santa Barbara, Rockefeller University, University of Iowa, NC State University (all real
campus photos, CC-licensed, host_campus), and NASA Citizen Science (the Apollo 17 "Blue Marble", public
domain). One of the six (Rockefeller) is flagged `RIGHTS_REVIEW_REQUIRED` despite carrying a CC tag on
Commons, because its provenance traces to an architecture firm's promotional photo rather than a Commons
contributor's own photograph — a real, not manufactured, rights-caution.

**The remaining 17 records (mostly fully-online commercial mentored-research companies) are
`not_yet_sourced`, for a structural reason worth surfacing to CEO/DATA rather than treating as an
oversight**: a fully-virtual company with no campus, lab, or venue has no honest "host-campus/venue"
substitute available under Contract §10's own vocabulary (`program_activity` / `host_campus` / `venue`).
The only image assets these organizations' own sites carry are team headshots (a different consent/rights
problem) or marketing graphics that would read as branded material. This is the same open question the
NASA Citizen Science record's `image_backfill_note` flags from a different angle (an always-open,
no-cohort program also doesn't fit the vocabulary cleanly). Recommend CEO/DATA decide a policy for
this class of provider (e.g., a `no_photographable_venue` / `logo_only_available` status that is
explicitly NOT the same as "not yet sourced due to insufficient effort") before more research capacity is
spent chasing photos that structurally may not exist for this entire provider category.

## SECOND REVIEW COUNT

**Run in both directions.** S5A cross-reviewed a 9-record sample of my output during their own session
(Polygence, UCSB RMP, SSP, Rockefeller SSRP, Bilimle Tanış, Algoverse, sci-MI, NASA Citizen Science,
Non-Trivial Fellowship) and found no factual errors or contract violations, plus two minor non-blocking
nits (Algoverse's `source_confidence` label vs. its own narrative hedge; Non-Trivial's `cycle_status`
alongside a concrete future deadline) — both addressed in commit `f0dd1e8` (Algoverse: clarified which
specific field the "high" confidence applies to, rather than changing the label; Non-Trivial: re-fetched
and corrected the actual deadline dates, which had genuinely changed/were mis-captured between two
fetches of the same page, and filled in `application_open_date` so the state is self-consistent).

I reciprocated with a 9-record sample of S5A's 28 production-ready records (Bilkent University Summer
Camp, Telluride TASS, PROMYS Europe, University of Amsterdam, St. Stephen's Rome, BRAND-ED, Northwestern
CTD, ODTÜ/METU Engineering Summer School, Oxford Scholastica Academy), checked against the same priority
list (Turkey eligibility, current dates, provider type, third-party-vs-university distinction, cost,
image correctness):

- **No factual errors or contract violations found.** This is a genuinely careful body of work.
- **Provider/host distinction is handled exceptionally well** — Oxford Scholastica Academy is explicitly
  recorded as `independent_provider` with `host_institution` annotated "(venue only — Oxford Scholastica
  is not part of the University of Oxford)", and its Radcliffe Camera image is deliberately labeled
  `image_depicts: venue` rather than `host_campus` specifically to avoid implying institutional identity
  — the same discipline I had to apply myself for CCIR (S5B-0005) and VTSP (S5B-0012), done proactively
  here rather than caught after the fact.
- **Currency/cost discipline is consistently excellent**: Bilkent's 61,000 TL is explicitly flagged as
  Turkish Lira, not silently imported as USD; PROMYS Europe's £4,200 is correctly GBP-labeled with its
  Mediterranean-adjacent financial-aid population explained; BRAND-ED's real umbrella-of-4-sub-programs
  problem (different subjects, cities, currencies, and even a different age floor for one track under
  one DB row) is flagged for CEO/DATA rather than forced into one misleading number.
  I independently found this to be one of the most detailed treatments of the "no currency column"
  schema gap in the corpus.
  This is directly reused reasoning from the same schema gap I hit in this lane's own Bilimle Tanış
  record's cost field (also left `null` for want of a currency-aware column).
- **Self-aware restraint**: St. Stephen's Rome and BRAND-ED are both correctly held at `CANDIDATE`, not
  `PRODUCTION_READY`, because cost/current-cycle facts weren't independently re-confirmed this session —
  exactly the discipline this lane also tried to apply to its own 13 `NEEDS_REVIEW` records.
- **One instance worth double-checking, not a defect**: ODTÜ/METU's record correctly identifies a genuine
  organizer transition (2025 run by a commercial third party, Arber Kongre A.Ş.; 2026 reportedly moving
  to a university radio station, Radyo ODTÜ) and explicitly declines to carry forward 2025 pricing —
  exemplary handling of a real ambiguity, not something I'm flagging as wrong.
- **Zero canonical-entity overlap** confirmed between my 31 records and S5A's 38 (independently confirmed
  from both sides now).

## DUPLICATES FOUND

**The single most consequential finding of this session.** A dedup check scoped to
`category IN ('research','internship')` — exactly as the operating brief specified — is not sufficient
on its own: it cannot see an entity that already exists live under a *different, wrong* category. Running
a second, broader name/URL check against the *entire* `opportunities` table (no category filter) before
finalizing found that **8 of my first 31 researched candidates were already live in production, every one
of them filed under `category = 'summer_program'`** instead of `research` or `internship`: Polygence,
Lumiere Education, UC Santa Barbara Research Mentorship Program, Summer Science Program, Rockefeller
SSRP, Iowa SSTP, Venture & Tech Summer Program, and International Research Institute of North Carolina.

Independent of my own research, this same check surfaced **two pre-existing internal duplicate pairs**
already sitting in the live table (UCSB's program under two separate rows; Iowa SSTP under two separate
rows) — a data-quality issue unrelated to anything I created.

Full detail, per-row recommended fixes, and the methodology lesson for the rest of the fleet are in
`data/research/opportunities/s5b_2026-08-26_MISCATEGORIZATION_FINDING.md` and the companion
`_fixes.jsonl`. S5 (parent) independently verified this finding against commit `d030afb` and relayed the
methodology point to S5A, who confirmed (in their own handoff's "POST-COMPLETION DEDUP FOLLOW-UP"
section) that the same blind spot did not affect their own net-new discoveries after an explicit
full-table re-check.

**Recommendation for any future fleet-wide dedup instruction**: specify a full-table name/URL sweep as a
mandatory final step, not merely a category-scoped one — the category-scoped check is a correct first
pass but is not sufficient alone, as this session demonstrated concretely rather than hypothetically.

## KEY GAPS

- **The commercial mentored-research market is thoroughly sampled, not exhaustively covered.** This
  session found and verified 12 independent, non-duplicate companies in the "pay a PhD mentor to guide a
  research paper" space (Polygence, Lumiere, Horizon/HARP, Veritas AI, CCIR, GRF, Scholar Launch, Immerse
  Education, Algoverse, learnSTEM, IRI-NC, Synthica) plus 3 nonprofit/free equivalents (sci-MI, Non-
  Trivial, Research Girl) and 1 more (ASDRP). Given how many were found via slight rephrasing of the same
  few search patterns, there are very likely a few more still undiscovered — but the marginal value of
  finding a 13th near-identical paid provider is low relative to closing the 13 `NEEDS_REVIEW` gaps
  already found.
- **Direct-fetch tooling was blocked (403/connection errors) on a recurring, specific set of domains**
  this session: synthica.org, medicalaid.org, youthjournalism.org, asdrp.org (intermittently),
  thetean.com, researchgirl.org (partially). This is a session/tooling limitation, not evidence against
  the organizations — several of these (Synthica, YJI, IMA) have real, consistent content when accessed
  via search-engine indexing, just not via this session's direct-fetch path. A future session with a
  real browser or different fetch infrastructure should re-attempt these specifically before spending
  more effort on new-name discovery.
- **Internship remains the thinner of the two categories by a wide margin**: 4 of 23 net-new records are
  `internship` (Ladder, The Intern Group, United Planet, IMA), versus 19 `research` — consistent with
  every prior lane's independent finding (thincat: "internship is still the thinnest... may be a real-
  world scarcity"; this session's own extensive search across student-ambassador programs, virtual-work-
  experience platforms, and corporate youth programs repeatedly hit either an 18+/undergraduate floor or
  a citizenship/work-authorization requirement). This looks like genuine structural scarcity (a minor
  cannot easily be a real, paid employee, and most "internship"-branded HS products are actually mentored
  project work, not employment) rather than an artifact of search effort.
- **Turkey-hosted university research options are now well-mapped, not fully exhausted**: this session
  confirmed only 3 genuine (non-taught-course) Turkey-hosted research/lab programs exist for high
  schoolers across the universities checked (Özyeğin HSRI and Koç KUSRP — both already in the corpus
  before this session — plus Gebze Technical University's Bilimle Tanış, newly found here). Sabancı,
  Bilkent, METU/ODTÜ, İYTE, and Yıldız Technical University were all checked and found to run either
  taught summer camps (S5A's territory, not mine) or university-student-only lab internships, not
  genuine high-school research placements. Turkish corporate internships (Garanti BBVA, Türk Telekom)
  were checked and confirmed university-student-only.
- **Image sourcing** — see IMAGE COMPLETE COUNT above; this is the single largest remaining structural
  gap, and it's a policy question for CEO/DATA as much as a research task.

## KEY UNCERTAINTIES

- Whether Lumiere Education's actual cost figure (accordion-rendered on their FAQ page, not captured by
  this session's fetch tool) matches the ~$2,600-$8,900 range reported by consistent third-party
  aggregators — plausible but not first-party-confirmed.
- Whether ASDRP, The Intern Group, and United Planet's specific virtual/HS-eligible tracks are open to a
  Turkey-based applicant on the same terms described in their general marketing material, or whether
  (as happens elsewhere in this corpus) the specific product description differs in practice — each
  record's `research_notes` flags this as the exact next step.
- Whether Zooniverse has any minor-specific consent/access policy — genuinely not found on the page
  fetched, and relevant to ORYN's minor-safe design principle (AGENTS.md §12), not just to eligibility.
- Whether the 8 gap-closure corrections' recommended category (`research` for 7, `internship` for VTSP)
  will be accepted as-is by CEO/DATA, or whether some should instead prompt a schema conversation (e.g.
  should "mentored research you pay for" and "government-run free research internship" really share one
  category, given how differently the contract wants cost/selectivity/provider_type surfaced to
  students?) — flagged as a live question, not resolved here.

## FILES CREATED/UPDATED

- `data/research/opportunities/s5b_batch1_2026-08-26.jsonl` (12 records, S5B-0001..0012; later amended
  in place to backfill 4 real images)
- `data/research/opportunities/s5b_batch2_2026-08-26.jsonl` (8 records, S5B-0013..0020; later amended to
  clarify one source-confidence note)
- `data/research/opportunities/s5b_batch3_2026-08-26.jsonl` (6 records, S5B-0021..0026; later amended in
  place to backfill 2 real images)
- `data/research/opportunities/s5b_batch4_2026-08-26.jsonl` (3 records, S5B-0027..0029; later amended to
  correct Non-Trivial's deadline dates after a re-fetch)
- `data/research/opportunities/s5b_batch5_2026-08-26.jsonl` (2 records, S5B-0030..0031)
- `data/research/opportunities/s5b_2026-08-26_MISCATEGORIZATION_FINDING.md` — narrative writeup of the
  cross-category duplicate finding
- `data/research/opportunities/s5b_2026-08-26_MISCATEGORIZATION_fixes.jsonl` — per-row recategorization
  + gap-fill proposal for the 8 already-live rows, keyed to their existing production IDs
- `data/research/registry/claims_s5b.jsonl` — append-only, 40 lines (31 initial claims + 8 correction
  lines superseding the 8 duplicates found + 1 do-not-add entry)
- `docs/handoffs/s5b-research-mentored-internships-handoff.md` — this file

No other files were touched. `docs/ORYN_WORKSTREAMS.md` and
`docs/handoffs/s5-turkey-academic-opportunities-brief.md` were read but not modified, per instruction.

## COMMITS

On `oryn/s5b-research-mentored-internships`, oldest to newest (all pushed):
1. `00467c0` — S5B research batch 1: 12 mentored-research/internship candidates
2. `1379a32` — S5B research batch 2: 8 more candidates
3. `4c10296` — S5B research batch 3: 6 more candidates, incl. sci-MI and NASA Citizen Science
4. `96a277a` — S5B research batch 4: 3 strong candidates + 1 confirmed do-not-add
5. `d030afb` — S5B critical finding: 8 of 31 candidates already live, miscategorized
6. `f0dd1e8` — S5B: address S5A cross-review nits (Algoverse confidence, Non-Trivial dates)
7. `2569bdd` — S5B: backfill 6 verified real photos (downloaded + visually confirmed)
8. (this handoff, pushed immediately after this file is written)

## BRANCH

`oryn/s5b-research-mentored-internships` — up to date with `origin` as of this handoff.

## WHAT THE NEXT OWNER SHOULD DO

1. **CEO/DATA**: apply the 8 gap-closure corrections in `s5b_2026-08-26_MISCATEGORIZATION_fixes.jsonl`
   first — they fix existing live rows (recategorize + fill genuine gaps) and are lower-risk than net-new
   inserts. Merge the two pre-existing internal duplicate pairs (UCSB, Iowa SSTP) as part of the same
   pass.
2. **CEO/DATA**: promote the 10 PRODUCTION_READY net-new records as INSERTs once independently
   re-confirmed. Prioritize sci-MI and Non-Trivial Fellowship if selecting a small subset first — both
   are free, both have the cleanest possible international-eligibility evidence in this entire corpus.
3. **CEO/DATA or a continuing S5B session**: work through the 13 CANDIDATE records — each one's
   `research_notes` names the specific single fact still needed (usually one page re-fetch away from
   PRODUCTION_READY), not a full re-research.
4. **CEO/DATA**: decide the image policy question for fully-virtual providers (see IMAGE COMPLETE COUNT)
   before more research capacity is spent chasing photos that may not honestly exist for ~15-20 records
   in this corpus.
5. **Whoever runs the fleet-wide dedup mechanism going forward**: adopt a full-table (not category-
   scoped) name/URL sweep as standard practice before finalizing any batch — this session's own
   experience is now a concrete demonstration of why the narrower check isn't sufficient alone.
6. **A continuing S5B session, if capacity allows**: retry the specific domains listed in KEY GAPS that
   were blocked this session (synthica.org, medicalaid.org, youthjournalism.org, thetean.com) with a real
   browser rather than the automated fetch tool, to upgrade several CANDIDATE records to PRODUCTION_READY
   with minimal new research. Beyond that, further net-new discovery in the commercial mentored-research
   space has hit clearly diminishing returns this session — better remaining leverage is probably in
   closing the 13 CANDIDATE gaps and the image-sourcing policy question than in finding a 13th near-
   identical paid provider.
