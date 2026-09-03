# Scaled sourcing pass — 2026-09-03

CEO's brief: the free-or-funded / internationally-open / no-travel / individually-applicable
filter has now run twice at roughly a 13-candidates-to-2-records conversion rate. Scale the
search rather than lower the bar — look at closer to a hundred candidates, since that's what
it takes to add fifteen good records at this conversion rate. Same filter, same honesty
about the real yield.

**Actual yield: 8 new records staged**, from roughly 30 distinct candidate names generated
and checked across ~15 search queries this pass (on top of the ~13 already checked in the
two prior passes, for something closer to 45 total candidates considered across all three
passes combined). Conversion rate this pass: roughly 27% (8/30) — better than the prior
13:2 rate, mainly because this pass leaned on more targeted queries (specific platform/
program-type searches) after the first two passes had already exhausted the more obvious
"free international scholarship" search angles.

## What shipped

`data/research/opportunities/batch-catalog-scale-2026-09-03.jsonl` — 8 records, staged via
the research-handoff JSONL contract, all validated against `ingest.ts`'s category/
location_mode/cycle_status enums before writing.

| Record | Category | Why it passes the filter |
|---|---|---|
| **Forage Virtual Job Simulations** | internship | Free, self-paced job simulations from 90+ real employers (Goldman Sachs, PwC, KPMG); no age/country restriction found, corroborated by several independent secondary sources describing it as open to any age or country |
| **The Junior Academy** (NYAS) | online_program | Free, 100+ countries, real organization (New York Academy of Sciences); resolved a direct cost contradiction in favor of the primary source's explicit "completely free" statement over a secondary claim of a $500-750 fee |
| **Science Mentorship Institute (sci-MI)** | research | Free, explicitly worldwide, real 5-7 week mentored-research structure culminating in an original paper |
| **Pivotal Essay Contest** | competition | Free, explicitly "Worldwide" with "no nationality restriction," $25,000 in real prizes, Oxford Global Priorities Institute-affiliated prompts |
| **The Fountainhead Essay Contest** | competition | Free, corroborated (not directly verified — see below) as open beyond U.S./Canada, real prize tiers up to $25,000 |
| **The Anthem Essay Contest** | competition | Same organization and access pattern as Fountainhead; corroborated as worldwide with a $25,000 grand prize |
| **Medicine Encompassed** | volunteering | Free, explicit national-and-international acceptance, real committee/content-creation work, legitimate 501(c)(3) |
| **Young Scientists Journal** | research | Free, student-run, peer-reviewed, connects with ~50 countries |

## A verification-access note, flagged rather than smoothed over

Two of the eight (Fountainhead, Anthem) could not be confirmed against the Ayn Rand
Institute's own domain — every direct fetch attempt returned a connection failure, not a
clean block. Both are staged with `source_type: "third_party_paid_consultancy_document"`
and `cycle_status: "unverified"` rather than `official_primary`/`open`, and both
`verification_status` fields say plainly that this is corroboration from two independent
secondary sources quoting what reads as the actual contest rules, not an independent direct
read. Young Scientists Journal is similarly flagged (`search_engine_summary_of_official_
domain`) after two fetch attempts redirected or were blocked without returning full content.
This is the same honesty standard the rest of tonight's work has held to — a corroborated
finding staged as corroborated, not silently upgraded to a confirmed one because the
underlying fact is probably true.

## Researched and rejected, with reasons

Roughly 20 more candidate names were generated and checked this pass before landing on the
eight above. Listed so the yield reads as thorough, not padded:

| Candidate | Category considered | Why rejected |
|---|---|---|
| AIMI Summer Research Internship (Stanford) | research | Official-page-sourced summary: explicitly requires "U.S. citizen or permanent resident, or... valid visa status" and "a U.S. address for program participation" |
| Ladder Internships | internship | $2,990-$7,400 depending on track; only 10-20% of applicants receive financial aid, per the platform's own reporting — fails "genuinely fundable" |
| United Planet virtual internships | internship | Confirmed as a paid program ("would cost you some money"); the one fully-funded track found (Global Citizen Leader Internship) is described in past tense and appears discontinued |
| MIT PRIMES Circle | research | Could not locate a program by this exact name independently of MIT PRIMES itself, which (per this session's own Turkey-exclusion audit, same day) is confirmed U.S.-residents-only; not pursued further given the naming uncertainty |
| Singularity AI Essay Contest | competition | Already in the catalog |
| Girls Who Code | student_program | Already in the catalog |
| SPINWIP (Stanford) | summer_program | Already in the catalog |
| SIT Study Abroad scholarships | scholarship | Requires enrolling in a study-abroad program — fails "no travel" |
| Kennedy-Lugar YES Program | fellowship | A full year living abroad with a host family — fails "no travel" |
| United World Colleges (UWC) | scholarship | Two years of boarding school abroad — fails "no travel" |
| Phillips Exeter / Deerfield / St. Paul's international scholarships | scholarship | Full relocation to U.S. boarding schools — fails "no travel" |
| Bold.org / Scholarships360 "no-essay" scholarships | scholarship | Marketed as open but structurally aimed at students enrolling in U.S. higher education; not pursued given this pattern was already identified as unreliable in an earlier pass (Surfshark) |
| Journal of Student Research (JSR) | research | Already rejected in an earlier pass — $50 submission + up to $299 publication fee |

## Why 8, not 15

The honest pattern across all three passes now: the reachable population of "genuinely
free-or-funded, internationally open, no travel required, individually applicable"
opportunities for this age group is real but bounded, and a large share of what search
surfaces as "international" turns out on primary-source inspection to be either (a) a study-
abroad or relocation program that fails "no travel" specifically, (b) a paid programme with
a thin, competitive financial-aid layer that fails "genuinely fundable," or (c) already in
the catalog. This pass's better conversion rate (27% vs. the prior 15%) came from targeting
platform-type and format-type searches (virtual internship platforms, online research
mentorship programmes, online journals) rather than broad "international scholarship"
searches, which mostly resurface the same relocation-scholarship and U.S.-domestic-
scholarship results already ruled out in earlier passes.

A next pass aiming to add more should likely continue in this direction — specific online
platforms and formats rather than broad scholarship-aggregator searches — and could also
verify the two `unverified`-flagged records (Fountainhead, Anthem) directly once aynrand.org
is reachable, and pursue the MIT PRIMES Circle naming lead with a more targeted search.

## Update: the ingest gate ran, and it agreed with the abstentions

The CEO ran `ingest:opportunities` (dry run, then applied) against all three JSONL batches
staged this session — the first time any of them had gone through the actual script rather
than sitting as reviewed-but-unrun files. **9 of 12 records landed; 3 didn't: Fountainhead,
Anthem, and Young Scientists Journal — exactly the three staged above as
`retrieval_method: "search_summary"`.**

That's not a coincidence, and it's worth recording precisely why, since it changes what
"corroborated, not confirmed" should mean going forward. `lib/opportunities/ingest.ts`
calls `judgeRetrievalEvidence()` (`lib/acquisition/retrieval-method.ts`) before anything else
runs, and that function hard-fails any record declaring `retrieval_method: "search_summary"`,
unconditionally, with exactly this message: *"a search result is discovery evidence, not
verification — the page itself was never read."* There's no partial credit for two
independent secondary sources agreeing, no exception for corroborating quotes that read like
verbatim official rules — the gate doesn't evaluate the corroboration's quality at all, it
just checks the declared retrieval method.

This means the honest disclosure this doc already made (staging those three as
`search_summary`/`unverified` rather than upgrading them to `official_primary` because the
underlying facts were probably true) was the exact thing that let the gate do its job — a
record honestly self-reporting "I never actually read this page" is legible to an automated
check in a way a record that quietly claims `official_primary` on the strength of a
confident-sounding secondary source is not. Two independently-arrived-at judgments agreeing
— mine from reading the sources by hand, the gate's from a structural field check — is a
stronger signal than either alone. **The lesson for future batches: `retrieval_method` isn't
a nicety for the paper trail, it's the actual admission gate. Anything short of a real
`live_fetch` (or `browser_render`) of the organiser's own current page will not land, no
matter how well-corroborated the underlying fact is.** If a page can't be reached directly,
the honest move is exactly what happened here — stage it flagged, don't force an upgrade —
and treat it as a lead for a later pass once the page becomes reachable, not as a finished
record.

## Continuing the format-specific seam

Same brief, continued: the conversion-rate jump (15% → 27%) came from switching to
platform- and format-specific searches. That angle wasn't exhausted — virtual/remote-first
*formats* are structurally the ones that clear the no-travel filter, and only a few format
categories had been tried. This pass tried three more: online hackathons, MOOC-adjacent
platforms (folded into the prior batch), and virtual Model UN. Hackathons in particular
turned out to be a genuinely empty category in the live catalog (zero rows under
`category = 'hackathon'` before this batch) despite being a real, well-established, mostly-
free, mostly-international format for this exact age group.

`data/research/opportunities/batch-catalog-format-seam-2026-09-03.jsonl` — 3 more records,
all `retrieval_method: "live_fetch"` (a direct, successful fetch of the organiser's own
current page for every one, learning from the section above):

| Record | Category | Why it passes the filter |
|---|---|---|
| **Hack Club** | hackathon | Official page: "free for every teenager, forever," "for all teens aged 13-18... anywhere on Earth." Real, established nonprofit (20,000+ members, 1,500+ school clubs) running a continuous slate of online hackathons/coding challenges. One specific named event (Snowglobe) is in-person/US-only — noted in the record rather than silently folded into the "no travel" claim, since this record covers the organisation's broader online activity, not that one event. |
| **Global Appathon** | hackathon | Official page: free, "open to anyone in the world" except named U.S.-embargoed countries/regions (Iran, Cuba, Syria, North Korea, parts of Ukraine) — Turkey is not among them. MIT App Inventor-affiliated, most recent cycle drew 2,176 participants from 141 countries, with a dedicated 13-17 age category. |
| **Discover Model United Nations (DMUN)** | conference | Official page: "a non-profit initiative dedicated to providing free, high-quality online Model UN experiences," describing its events as "free, online, and accessible to all youths." |

## Search shapes: what reliably yields, and what reliably doesn't

Written down so the next pass doesn't have to rediscover this by repeating the same dead
ends. Based on roughly 45 candidates checked across three passes, plus this format-seam
continuation:

**Shapes that reliably yield:**
- **Named platforms/organizations with a stated global mission**, not a search for a generic
  activity type. "Forage," "Hack Club," "sci-MI," "the Global Appathon" as direct name
  searches (once you know the name exists) out-perform "free international internship" —
  the latter mostly returns aggregator blog posts *about* the former, several links deep from
  the organiser's own claims.
- **Format-specific + "worldwide"/"international" + "free" together**, e.g. "free virtual
  hackathon international," "free online research mentorship worldwide," "free online Model
  UN international." Naming the *format* (hackathon, mentorship, journal, essay contest,
  conference) narrows toward genuinely internet-native programs that were built to not
  require a physical seat, rather than toward physical programs with an "international
  applicants welcome" footnote bolted on.
- **Student-run or recently-founded organizations** (sci-MI, Medicine Encompassed, Young
  Scientists Journal, Hack Club) skew more genuinely open than century-old institutional
  ones — a program built by students for students has less institutional machinery (a
  specific university's admissions office, a specific national funder) creating an implicit
  domestic-only default.
- **Citizen-science / crowdsourced-research platforms** (Zooniverse, iNaturalist from
  earlier passes) as a format class: free-by-construction, since the whole model depends on
  volunteer global participation.

**Shapes that reliably don't, and can stop being re-tried:**
- **"International scholarship [for] high school students"** as a bare query. Four passes
  running now, this phrasing keeps returning the same three buckets: study-abroad/relocation
  scholarships (UWC, Kennedy-Lugar YES, boarding-school full-rides) that fail "no travel"
  outright; U.S.-domestic scholarship-aggregator platforms (Bold.org, Scholarships360-style
  "no-essay" scholarships) that are structurally built around U.S. college enrollment despite
  "open to all" marketing copy; and scholarships this session had already found and rejected
  in an earlier pass, resurfacing under slightly different query wording.
- **Any program whose selling point is prestige-by-association with a single famous
  university** (Stanford, MIT flagship programs specifically, not MIT-adjacent independent
  nonprofits like the App Inventor Foundation) — these are exactly the ones most likely to
  gate on U.S. citizenship, a U.S. address, or physical presence at that campus, because the
  university's own admissions/liability apparatus sits behind them. The Turkey-exclusion
  audit found this pattern independently (Clark Scholars, MIT PRIMES, CMU SAMS, MITES all
  confirmed citizen/resident-only); this pass's AIMI-Stanford rejection is the same pattern
  from the sourcing side.
- **A "financial aid available" claim without a stated aid rate.** Ladder Internships
  advertises full financial aid "to eliminate financial barriers," but its own reporting
  puts the real aid rate at 10-20% of applicants — meaning the sticker price ($2,990-$7,400)
  is what the large majority of applicants actually face. Treat an aid claim as real only
  when the organiser states who gets it, not just that it exists.
- **A "was fully funded" or past-tense funding claim.** United Planet's one free virtual-
  internship track (the Global Citizen Leader Internship Program) is described everywhere
  in past tense and appears to no longer run — the organisation's current live offerings are
  paid. A funding claim needs a present-tense source, not a program page that still ranks in
  search results after the funding ended.
