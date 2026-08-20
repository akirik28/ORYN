# Citizenship, residency, and school-location eligibility taxonomy

Part of R4 (opportunity eligibility intelligence). Full sourcing and quoted evidence:
`data/research/opportunity-eligibility/opportunity-eligibility-v1.json` →
`citizenship_residency_taxonomy`. Methodology: 18 real, currently active programs examined
directly on their own official domains, plus 2 grounding examples already live in ORYN's
database (Simons, Science Olympiad).

## The core finding: three independent axes, not one

Real programs gate eligibility on up to three legally and practically distinct facts about
a student, and these are **not interchangeable**:

1. **Citizenship / immigration status** — a passport or green-card fact about the person,
   unrelated to where they currently live or study.
2. **Residency / domicile** — where the person is legally or physically based; can be
   sub-national (a US state, not just "the US").
3. **Current school-enrollment location** — which school/country the student is physically
   attending right now, independent of both citizenship and domicile.

**Worked example proving the distinction is real**: a Turkish citizen enrolled at a public
high school in North Carolina is —
- **eligible** for MIT PRIMES-USA (school-location test only; citizenship irrelevant),
- **ineligible** for NC Governor's School (requires NC residency/domicile; exchange
  students explicitly excluded even though they attend an NC school),
- **ineligible** for Simons Summer Research or Davidson Fellows (require actual US
  citizenship or a green card; physical school enrollment does not substitute).

Three different verdicts, same student, three real active programs — this is not a
theoretical distinction.

## Pattern taxonomy (8 patterns found, all with real sourced examples)

| Pattern | What it means | Real example |
|---|---|---|
| `open_worldwide_explicit` | Official page affirmatively states any nationality may apply | Yale YYGS: "accepts applications from ALL countries... no citizenship restriction" |
| `restricted_to_citizens_or_pr` | Requires citizenship/PR status of one country, regardless of current location | Simons: "must be US citizens and/or permanent residents... no exceptions" |
| `restricted_by_school_location_or_residency` | Gated on where the student lives/attends school, not passport | MIT PRIMES-USA: "available only to students who reside in the United States" |
| `mixed_school_location_and_citizenship_carve_out` | Two distinct qualifying tests combined as alternate paths | QuestBridge: US high school enrollment, OR US citizen/PR living abroad |
| `eligibility_mediated_through_national_quota_or_nomination` | No direct individual application; routed through a country-specific national committee that may or may not exist for a given country this cycle | EUCYS: "coordinated by National Organisers, who nominate... up to three projects" per country |
| `variable_non_public_eligible_country_list` | Country list is real but organizer-determined and not published as a fixed list | RSI: "does not have a fixed list of eligible countries... check with CEE staff" |
| `visa_documentation_note_not_a_restriction` | International-open program that separately mentions visa logistics — not an eligibility gate | Telluride TASS: "not able to assist with acquiring visas" — eligibility itself unaffected |
| `no_statement_found_on_official_page` | Page addresses other eligibility criteria but doesn't affirmatively address citizenship either way — an honest gap, not evidence of either openness or restriction | Science Olympiad (ORYN's own existing row, re-examined and confirmed correct) |

## Citizenship/residency vs. visa/documentation — a distinction ORYN must not conflate

Eligibility answers "are you the kind of applicant this program accepts at all." Visa
requirements answer a separate, later-stage question: "given you're admitted, what
immigration paperwork must you personally arrange." Conflating them is a real, harmful
error — a program that mentions "F-1 visa" is not thereby restricting nationality.
Researched spectrum: pure logistics disclaimer with zero eligibility effect (Telluride:
"we cannot assist with visas"), a factual visa-category note (PROMYS: "visitor's visa, not
F-1" — purely informational), and a procedural requirement functionally closer to a soft
gate (Johns Hopkins CTY: "must request a nonimmigrant F-1 student visa to attend" — still
not a nationality exclusion, but a higher practical bar than a disclaimer).

## Extraction rules used in this package's audit

- **Mark "appears open" only when**: the page is the program's own canonical
  eligibility/FAQ page (not a marketing page or third-party aggregator) **and** it contains
  an explicit affirmative statement ("open to any country," "students worldwide") — not
  merely the absence of a restriction.
- **Default to "unknown / not stated"** whenever the official page couldn't be found or
  fetched, addresses other eligibility criteria without addressing citizenship either way,
  or only a secondary/aggregator source is available. Never upgrade "unknown" based on
  organizer type, country, or reputation — the sample data disproves that heuristic (Yale
  YYGS, PROMYS, Diamond Challenge, Telluride, and John Locke are all US-hosted and
  explicitly open worldwide; Simons, Davidson, MIT PRIMES, and NASA are US-hosted and
  tightly restricted — same superficial profile, opposite answers).
- **Mark "restricted"** only on an explicit affirmative statement naming a citizenship,
  PR, domicile, or school-enrollment-location requirement. National-quota/nomination
  mechanisms get their own classification (not a binary), since the practical answer
  depends on whether an active national organiser exists for the student's country that
  cycle — itself a fact needing its own sourcing and refresh cadence.

## Schema gap assessment (against ORYN's live `opportunities` table)

ORYN's current 3-field model (`eligible_countries` array + `citizenship_restrictions` text
+ `residency_restrictions` text) cannot represent:

- **Current school-enrollment location** as its own axis, distinct from citizenship and
  domicile — needed for MIT PRIMES, QuestBridge's first path, NC Governor's School's
  exchange-student exclusion, and Sutton Trust's state-school requirement. Today this has
  nowhere clean to live; it would likely get force-fit into `residency_restrictions`,
  conflating domicile with school attendance (these differ for boarding-school/exchange
  students).
- **A structured `restriction_basis` enum** (citizenship | permanent_residency |
  domicile_residency | school_enrollment_location | national_quota_nomination |
  none_stated) — without it, `citizenship_restrictions`/`residency_restrictions` are opaque
  free text with no way to query "is this a citizenship test or a residency test." This is
  exactly how ORYN's own existing Tisch NYU row ended up conflating an age rule, a housing
  rule, and a visa-documentation note into one field.
- **Visa/documentation logistics notes** as a field genuinely separate from eligibility —
  today these have nowhere to go except the restriction fields, risking exactly the false
  "restricted" impression this research was asked to avoid.
- **Sub-national restrictions** (state/region-level, e.g. NC Governor's School) —
  `eligible_countries` is country-granularity only.
- **Organizer-determined, non-public, annually-variable country lists** (RSI) — a snapshot
  array would silently go stale or overstate certainty.
- **National-quota/nomination-mediated programs** (EUCYS/UWC/ISEF) — listing "Turkey" in
  `eligible_countries` for EUCYS would be true only if Turkey currently has an active
  National Organiser sending a winning project that year; the flat list can't express that.

**Recommended direction** (not a schema decision — PROD-B's call): add a
`restriction_basis` enum alongside the existing free-text fields, and consider a separate
`school_location_restrictions` text field distinct from `residency_restrictions`.

## Unsafe inferences

- Assuming a US-university-hosted program defaults to citizens/PR only — directly
  contradicted by 5 of the researched examples.
- Treating absence of eligibility language on a landing page as proof of openness —
  eligibility detail often lives only on a dedicated FAQ subpage.
- Treating "attends school in the eligible country" as satisfying a citizenship
  requirement, or vice versa — these are not substitutable (Davidson/Simons/NASA vs. MIT
  PRIMES).
- Treating a promotional "students from N countries have attended" statistic as a guarantee
  a given country is eligible this cycle (RSI's list is redetermined annually).
- Treating any mention of visa/F-1/immigration language as evidence of a nationality
  restriction.
- Inferring "restricted" purely because the words "citizenship"/"residency" never appear —
  MIT PRIMES never uses the word "citizenship" at all; its restriction is phrased entirely
  in school-enrollment-location terms.

## Unresolved questions

Whether ORYN's actual 352-row dataset contains any program that treats citizenship and
permanent residency differently (none found in this sample — "citizens and/or permanent
residents" was always one bucket). Where visa/documentation notes should live in the
schema, if anywhere structured. How to represent sub-national residency restrictions at
scale. What confidence tier applies to facts sourced only via search-engine paraphrase of a
blocked official page (the RSI case) — likely warrants a "needs second confirmation"
flag rather than standard "medium" confidence.
