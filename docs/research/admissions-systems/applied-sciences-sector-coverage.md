# Applied-sciences sector coverage — a catalogue-composition measurement, not an admissions finding

**Status: measurement and recommendation only. No ingestion, no new institution rows.** Written
2026-09-03, triggered by a side observation while writing [`finland.md`](./finland.md): all 9 of
ORYN's Finnish institutions are, by name, research universities — zero are universities of
applied sciences (UAS/ammattikorkeakoulu), the sector `finland.md` found is, for at least one
realistic Turkish applicant, the *more* accessible route into Finland. This document asks whether
that's a Finland-specific fact or a pattern across the corridor, and whether it matters.

This is a different kind of gap from everything else in this expansion line. Every other document
here is about *institutions ORYN already has* and *how they admit*. This one is about
*institutions ORYN does not have at all* — closer in kind to the corridor-scope question already
in front of the founder (institutions outside the stated US/UK/Europe/Turkey focus) than to the
admissions-mechanism research. Not placed in the README's country table for that reason.

## Method, stated plainly, with its error bars

Classification is by **institution name pattern**, checked against `universities.institution_type`
and `.application_system` first and confirmed neither already carries this distinction — see
[`subdivision-key-proposal.md`](./subdivision-key-proposal.md)'s "What was checked and ruled out"
section for the query and result (both columns are either unusable labels or `null` for every
row checked). Name-pattern classification means: an institution whose name contains a
country-specific applied-sciences marker (Fachhochschule/"University of Applied Sciences" for
Germany/Austria/Switzerland, Hogeschool for the Netherlands/Belgium, ammattikorkeakoulu/UAS for
Finland, Instituto Politécnico for Portugal, Erhvervsakademi/professionshøjskole for Denmark,
Høgskole for Norway, Technological University/Institute of Technology for Ireland) is counted as
applied-sciences; everything else, university. This is **imperfect** in two specific, named ways:
(1) a small number of institutions have rebranded to include "University" in their name as part
of a real legal status change (Ireland's Technological Universities, created 2019+ by merging
former Institutes of Technology) — these correctly read as a *new*, blended category, not a
misclassification; (2) an institution with an ambiguous or English-translated name could be
missed either direction — spot-checked against known institutions per country, not exhaustively
verified against an official registry for every one.

## What was queried

```sql
select country, name from universities
where country in ('Germany','Netherlands','Switzerland','Austria','Ireland','Finland',
  'Belgium','Portugal','Denmark','Norway','United Kingdom','UK')
order by country, name;
```

Run live against `oryn-qa-scratch`, all rows read (not a sample), full name list classified by
hand against each country's real applied-sciences naming convention — not estimated.

## The measurement, per country

| Country | In catalogue | Applied-sciences by name | National AS-sector size (sourced) | Catalogue AS coverage |
|---|---|---|---|---|
| Germany | 43 | 0 | 243 UAS institutions; ~37% of all German HE students enrolled there (DAAD-sourced figure) | 0/243 |
| Netherlands | 13 | 0 | 40+ Hogescholen; 462,130 HBO students vs. 340,179 WO (university) students — HBO is the *larger* sector by enrollment | 0/40+ |
| Austria | 10 | 0 | 21 FH institutions (Austrian Ministry list, via Eurydice) | 0/21 |
| Switzerland | 11 | 1 (ZHAW) | At least 8 major FH/HES networks; HES-SO alone comprises 28 institutions | 1/dozens |
| Belgium | 10 | 0 | Not independently counted this pass; Hogeschool/Haute École sector confirmed to exist and to be substantial in both Communities (belgium.md's own research) | 0/unknown-but-real |
| Portugal | 9 | 0 | Not independently counted this pass; Instituto Politécnico sector confirmed to exist nationally | 0/unknown-but-real |
| Denmark | 5 | 0 | Not independently counted; Erhvervsakademi/professionshøjskole sector exists but skews shorter-cycle/more vocational than the German/Dutch UAS model — a genuine difference in kind, not just degree, flagged rather than treated as equivalent | 0/unknown, lower-relevance |
| Norway | 6 | 0 | Not independently counted; Norway's Høgskole category has been actively blurring for ~15 years as many were upgraded to full university status — the cleanest binary of any country checked, and the least stable one | 0/unknown, blurring category |
| Ireland | 8 | 1 (TU Dublin) | 5 Technological Universities exist nationally post-2019 reform (TU Dublin, Munster TU, Atlantic TU, South East Technological University, TU of the Shannon) — catalogue has 1 of 5 | 1/5 |
| Finland | 9 | 0 | Not independently counted this pass; confirmed via `finland.md`'s own research to be a real, named-eligible-for-Turkish-applicants sector | 0/unknown-but-real, confirmed favorable for Turkish applicants specifically |
| **UK (control case)** | 79 | ~20+ (post-92/former-polytechnic universities: Manchester Metropolitan, Nottingham Trent, Oxford Brookes, Coventry, De Montfort, Kingston, Middlesex, London South Bank, Liverpool John Moores, Northumbria, Ulster, UWE Bristol, Greenwich, Westminster, Brighton, Hertfordshire, Huddersfield, Edinburgh Napier, Bournemouth, Aston, Bangor, among others) | N/A — UK law grants these full "University" status since the 1992 reform; no separate legal category exists to be missing | Not applicable — this is why it's the control case |

Germany and the Netherlands are the two precisely-sourced, most severe cases: **zero
representation of a sector that enrolls more students than the sector ORYN does have** (Netherlands)
or **over a third of a country's entire higher-education population** (Germany). Every other
continental European country checked shows the identical zero-or-near-zero pattern by name; only
Switzerland (1 of dozens) and Ireland (1 of 5) show any representation at all.

## A pattern in *why*, not just *that* — worth stating because it's actionable

The two partial exceptions are not random. **Zurich University of Applied Sciences (ZHAW)** and
**Technological University Dublin** are both institutions whose English name contains the word
"University" despite belonging to their country's applied-sciences category — ZHAW by translation
convention, TU Dublin by an actual 2019 legal rebrand (the former Institutes of Technology were
specifically renamed to include "University" as part of that reform). The UK control case
reinforces the same read at scale: the UK's ~20+ "post-92" institutions are fully present because
UK law made them universities in name and status in 1992, unlike Germany's Fachhochschulen or the
Netherlands' Hogescholen, which remain a legally and nominally distinct category to this day.

**This suggests the gap correlates with whether an institution is styled "University" in the
name ORYN's source data used, not with prestige, selectivity, or curriculum type.** That's a
different, more specific, and more fixable-sounding finding than "the catalogue skews toward
prestige institutions" — it points at *how the original institution list was built* rather than
at a deliberate curation choice, though this pass did not investigate that build process directly
and this reading is offered as the best-supported hypothesis from the data available, not a
confirmed mechanism.

## Does it matter — offered as a genuine two-sided answer, not a lean dressed up as balance

**The case that it does:** the scale is not marginal — Germany's UAS sector alone is larger by
enrollment than most entire countries' higher-education systems. `finland.md` already confirmed,
concretely, that the applied-sciences route can be the *more* accessible one for a Turkish
applicant specifically (grades-only, named-eligible, no exam) — a plausible, not yet
independently confirmed, hypothesis for Germany/Netherlands/Austria/Switzerland too, given the
generally lower-barrier, more vocationally-integrated design of UAS admission across the region.
AGENTS.md's own stated product principle (§2) is that Oryn should reason about a student's actual
opportunity set, not just the prestige tier — a catalogue that structurally cannot see an entire
parallel higher-education sector is reasoning with half the picture for exactly the corridor
countries (Germany, Netherlands, Austria, Switzerland) this product is supposed to serve well.

**The case for real caution, not just quick action:** AGENTS.md's stated user is a student
"preparing for competitive universities" — and the Netherlands' own national data shows
international students specifically already skew toward WO/university (over two-thirds), even
though HBO enrolls more students domestically. ORYN's actual population may already be
self-selecting toward the tier the catalogue currently has, softening (not eliminating) the
practical size of the gap for ORYN's specific users versus the national population. More
importantly: **closing this gap is institution ingestion, a fundamentally different and much
larger undertaking than tonight's admissions-mechanism research** — Germany's 243 UAS
institutions, done at the same non-negotiable sourcing standard the rest of this codebase holds
(Phase 7 of AGENTS.md, the standard this entire research line has followed), is not a follow-on
task to the ten countries in this expansion line, it is a project on its own scale. Adding bare
institution rows without real programme/requirement/statistics data behind them would not close
this gap — it would recreate, at a much larger scale, the exact "confident output from absent
data" problem this whole night's admissions-registry work exists to fix.

## Recommendation

This is a real, confirmed, well-sourced gap, large enough in scale (Germany, Netherlands
specifically) to be worth the founder's attention — and it is a *catalogue-composition* decision,
not an admissions-research one, so it belongs beside the corridor-scope question already in front
of him rather than folded into this research line's own backlog. Both are versions of the same
underlying question: **which institutions should ORYN's catalogue represent at all.** Suggest it
be surfaced to him as its own item, not actioned unilaterally — this document does not recommend
starting ingestion, and explicitly was not asked to.

## Sources

- Live query against `oryn-qa-scratch` (`universities` table, full read, not sampled) — see
  "What was queried" above.
- DAAD (German Academic Exchange Service), on Germany's UAS count and enrollment share —
  retrieved via search 2026-09-03, not independently primary-fetched from daad.de directly this
  pass.
- CBS (Statistics Netherlands) and general web search, on hogescholen count and HBO/WO enrollment
  figures — retrieved 2026-09-03.
- Eurydice Austria (EU official education-systems database) and the Austrian Federal Ministry's
  own FH list (bmfwf.gv.at), on Austria's 21-FH count — retrieved via search 2026-09-03.
- General web search on Switzerland's FH/HES network structure and HES-SO's own institution
  count — retrieved 2026-09-03, medium confidence (not independently primary-fetched from a
  single authoritative Swiss federal source).
- Ireland's Technological University count (5, post-2019 reform) — general knowledge,
  corroborated by the visible naming pattern in ORYN's own catalogue (TU Dublin) rather than
  independently re-verified against an Irish government source this pass.

## Unresolved questions

Whether the Belgium/Portugal/Denmark/Norway applied-sciences sectors' actual national scale
matches Germany/Netherlands' (large, comparable-or-larger enrollment) or is meaningfully smaller
— not independently counted this pass, flagged rather than assumed. Whether the "more accessible
for a Turkish applicant" finding confirmed for Finland's UAS sector specifically generalizes to
Germany/Netherlands/Austria/Switzerland's applied-sciences sectors — a reasonable hypothesis
given the general pattern, not independently confirmed for any of them this pass. What ORYN's
actual institution-list build process was, and whether the "styled as University in the name"
hypothesis for the coverage gap is the real mechanism or a coincidental correlation — not
investigated directly.
