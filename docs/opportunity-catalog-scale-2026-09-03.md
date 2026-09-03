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
