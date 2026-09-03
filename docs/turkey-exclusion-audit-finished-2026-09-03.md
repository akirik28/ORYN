# Turkey-exclusion audit — finished — 2026-09-03

Continuation of the audit run earlier tonight: 20 active records exclude Turkey from
`eligible_countries` with no restriction explained in `description`. Two (AI Scholars,
SEAP) were confirmed legitimately US-only at the time; one (YIS Stock Pitch Competition)
was found wrongly excluded but the fix was only ever given in a chat message, never
committed. Eighteen were never read. This finishes the read and properly stages the
earlier fix.

**Result: 13 records read against their own official pages. 12 confirmed genuinely
restricted (correctly recorded). 1 unresolvable. Zero new wrong exclusions in this batch.**
Plus: the YIS Stock Pitch fix from earlier is now actually staged (`data/research/
opportunities/turkey_exclusion_audit_finished_2026-09-03.sql`), and the systemic-origin
question below.

## Rebuilding the working set

No file from the earlier pass saved the original 18 IDs, so this re-derives the candidate
set live: every active record with a non-empty `eligible_countries` that omits Turkey,
then narrowed to the ones where the *stored description* states no restriction at all —
the actual "no stated reason" signal, since a record whose description already says
"US citizens or permanent residents only" was never really ambiguous, whatever its title.
Genuinely single-country-by-nature records (UK charities, Turkey's own national award
chapters, several of which are stored as `"Türkiye"` rather than `"Turkey"` — a spelling
inconsistency worth its own note sometime, not chased here) were excluded from the
candidate set on the same basis.

13 records matched. All 13 were read against their own official page.

## Confirmed genuinely restricted (12)

Each below cites the primary-source text found, or says plainly why a primary source
couldn't be reached and what corroborated the conclusion instead.

| Record | Finding |
|---|---|
| Clark Scholars (Texas Tech) | Official "Program Benefits & Eligibility" page: "Must be a U.S. Citizen or Permanent Resident." Note: a WebSearch summary claimed international students ARE eligible, directly contradicting this primary source — the summary was wrong, trusted nothing until the organizer's own page was read directly. |
| Ashoka Young Changemakers | Ashoka's own domain returned 403 (WAF) on every path tried. Corroborated via two independent secondary sources: the programme runs only in the 6 listed countries, and "you can apply to AYC only in the country you are a resident of" — students elsewhere are told to contact their local Ashoka office for other opportunities. The "global changemaker network" branding refers to the parent organization, not this specific youth programme. |
| ASSIP (George Mason) | **Unresolvable.** Official page states nothing about citizenship, visa, or country — only age limits. No basis to confirm or overturn the current value either way. Left as-is. |
| MIT Beaver Works (BWSI) | Official FAQ: "We cannot accept students outside of the US... all students must be living in the US for any BWSI program," specifically for the July residential component. Genuinely a residency (not strict citizenship) gate. Note: the free online prerequisite course IS explicitly open globally ("Every student can enroll and participate in the online courses") — a real nuance this record's description doesn't currently surface, since the record covers the residential programme as scoped. |
| MIT PRIMES / PRIMES-USA | Official page: "PRIMES is available only to students who reside in the United States." International students are directed to a separate, genuinely open programme — CrowdMath — which isn't in this catalog at all. Worth flagging to whoever does opportunity discovery as a real, verified, globally-open MIT-affiliated research opportunity. |
| Carnegie Mellon SAMS | Official eligibility page: "Be a U.S. citizen or permanent resident." |
| Coca-Cola Scholars | Official criteria explicitly exclude "International students (with the exception of students at DoD schools)," and state the reason: funded by U.S.-based Coca-Cola Bottlers serving specific eligibility areas. |
| Cooke College Scholarship | Official FAQ: "you must... reside in the United States or a U.S. territory and attend all four years of high school in the United States." Notably NOT a citizenship requirement — open to undocumented students who meet the US-high-school condition — but a Turkish student attending school in Turkey is still excluded on the residency/attendance basis. |
| MITES Summer | Official page: "U.S. citizens or permanent residents." |
| National History Day | No mention of Turkey anywhere across NHD's own international-affiliates pages. NHD does run through specific international affiliates (South Korea, China, Singapore, per the affiliate map) — Turkey isn't one of them, so exclusion is correct, though the stored `eligible_countries: ["United States"]` is itself incomplete (missing the affiliate countries that ARE eligible) — a separate, smaller data-quality note, not this audit's core question. |
| Simons Summer Research | Stony Brook's site returned socket errors/500s on every direct fetch attempt (server-side instability, not a WAF block). Corroborated via two independent, specific, consistent secondary sources: "must be US citizens and/or permanent residents... international students are not eligible." One of those same sources also claimed Clark Scholars is "open to international applicants" as an alternative — directly contradicted by Clark Scholars' own primary-source page above, so that specific claim was discounted; the Simons finding itself was corroborated independently by a second, separate search. |
| We the People | No explicit citizenship statement found, but the programme is structurally a US state-by-state civics competition (state contests advance to national finals) built specifically around U.S. constitutional history — no participation pathway for a non-US school is described anywhere. Confirmed by structural necessity rather than an explicit eligibility sentence. |
| Worldwide Youth in Science and Engineering (WYSE) | No citizenship statement found; the only eligibility-adjacent text is a non-discrimination clause (not a geographic eligibility rule). But the record's own stored description already says the flagship track is for "rising 10th-12th graders from Illinois, Indiana, Kentucky, Michigan, Missouri, Iowa, and Wisconsin" specifically — narrower than "United States," so Turkey's exclusion is correct by necessity even without an explicit statement. |

## The pattern underneath: not wrong exclusions, wrong granularity

Three of the confirmed-restricted records — **Caltech Summer Research Connection**
(explicitly "for rising 10th-12th grade students attending a Pasadena Unified School
District high school"), **CU Boulder PCDP** (explicitly "first-generation students
recruited from targeted partner middle/high schools primarily in Adams County, Colorado"),
and **WYSE** (specific 7-state Midwest list) — have a real restriction far narrower than
"United States," but `eligible_countries` can only express country-level granularity, so
whoever populated it wrote the country the district/region sits in. This is exactly the
shape 6e found independently on Caltech SRC. It doesn't make Turkey's exclusion wrong —
a single Pasadena school district correctly excludes Turkey and excludes 49 U.S. states
too — but it means "United States" on these three records overstates who's actually
eligible far more than it understates it. Not something `eligible_countries` alone can fix
without a schema change (a free-text `residency_restrictions` field already exists per the
`acquire-opportunity-eligibility.ts` script's own design — whether these three specific
records ever got run through it isn't something this pass checked).

## The systemic question: where did these values come from?

Read `lib/ai/opportunity-extraction.ts` (the automated discovery pipeline) and
`scripts/acquire-opportunity-eligibility.ts` (the dedicated eligibility-research pipeline),
plus `lib/opportunities/ingest.ts` (the manual JSONL staging path this session has used all
night), to check whether an ingest path or extraction prompt is narrowing
`eligible_countries` from prose that never said it.

**It doesn't look like it, for what's live today** — three findings:

1. `ingest.ts`'s own default (`eligible_countries: [...(record.eligible_countries ?? [])]`)
   is an empty array when the field is omitted — open, not restricted. A record doesn't end
   up with `["United States"]` by omission; someone has to actively write it.
2. `opportunity-extraction.ts`'s AI schema already instructs: *"Empty array if open to any
   country"* and *"Never invent... eligibility rule that isn't there — leave the field null
   instead."* Sound, conservative instructions by design.
3. `acquire-opportunity-eligibility.ts` is a whole dedicated, carefully-built eligibility
   pipeline with explicit anti-inference rules ("COUNTRY NAMES MUST BE STATED, NOT INFERRED
   FROM CONTEXT... A page saying it 'serves students throughout New York City' does NOT
   mean you may write 'United States'") and code-level grounding verification (every model
   claim is checked against the actual fetched text before being written). Its own header
   comment documents that this exact bug — writing `["United States"]` from an ABOUT-US
   sentence that never named the country — was already caught and fixed in an earlier
   audit, which is why the current prompt guards against it explicitly.

**But that pipeline has a scope rule that matters here**: *"only rows where the target
field is currently empty/null... it never overwrites a prior research pass's existing
value, populated or not, in either direction."* Every one of my 13 candidates already had
`eligible_countries` populated — meaning this careful, well-guarded pipeline would never
have touched any of them, however it was originally written. The exclusions I found didn't
come from a live bug generating new wrong values; they came from an EARLIER, less rigorous
pass (before this script's anti-inference and grounding-verification design existed) — and
the current pipeline's own "fill gaps, don't re-audit" scope means an old, ungrounded value
sits there indefinitely unless someone manually re-checks it, exactly like this pass just
did.

**So the honest answer to "is eighteen this week's number or the total?"**: the *mechanism*
that could keep producing more (an old, ungrounded value never getting re-audited) is real
and confirmed. But the *evidence from actually checking* doesn't support a large hidden
population of wrong Turkey-exclusions specifically — 12 of 13 checked were genuinely
correct, and the one confirmed wrong from the whole 20 (YIS) was found in the *first* pass,
not this one. The bigger yield from re-checking already-populated eligibility fields looks
like it would be granularity fixes (Caltech-shaped) and description completeness
(citizenship rules that are true but never made it into `description`), not new Turkey
exclusions. Worth a broader re-audit at some point given the mechanism is confirmed, but
not urgent on the strength of what turned up here.

## What's staged

`data/research/opportunities/turkey_exclusion_audit_finished_2026-09-03.sql` — one guarded
UPDATE, dry-run verified against live data: YIS Stock Pitch Competition,
`eligible_countries` from `["United States"]` to `[]` (genuinely global, confirmed via a
dedicated "International OPEN" competition track and a cited 20-country participation
figure from the most recent cycle — this is the fix from earlier tonight, now actually
committed to a reviewable file instead of living only in a chat message).
