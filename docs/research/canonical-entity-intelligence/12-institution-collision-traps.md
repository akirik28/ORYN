# 12 — Institution Collision Traps

A companion to `01`–`04`: instead of asking "what makes two records the same entity," this
document works the opposite failure mode — real cases where two or more **genuinely distinct**
institutions share a name, a common short form, or an abbreviation closely enough that a naive
matcher (fuzzy string match, token-overlap dedup, or a tired human researcher working fast) could
plausibly conflate them. Every case below was checked against each institution's own official
site and/or ROR (Research Organization Registry, `ror.org`) — never against Wikipedia or Wikidata
as a value, only as a discovery index to find the real source, matching this package's `00`
method note and `lib/acquisition/source-authority.ts`'s exclusion of both domains as fact sources.
ROR ids are cited as `ror.org/<id>`; every one below was fetched live this session via ROR's
public API (`api.ror.org/v2/organizations`), not recalled from memory.

**Scope note:** this document does not touch `docs/research/counseling-intelligence/` (a separate,
unrelated concurrent research effort in this repo) and does not edit `00`–`11` or their JSON
companions. It adds only this file and `data/research/canonical-entities/institution-collision-traps.json`.

## How to read each case

For every case: what the trap is and why it looks dangerous, a table of the institutions actually
checked (country, official site, ROR id where one exists), a confidence rating, and a one-line
recommendation for how ORYN's live `canonical_entities` / `entity_aliases` / `entity_relationships`
schema (per `01`–`04`) should treat it. "No relationship" means: separate `canonical_entities` rows,
no `entity_relationships` row between them, and the shared name string handled entirely at the
`entity_aliases`/search-ranking layer (per `02`'s abbreviation-collision guidance) rather than by
any inference about the institutions themselves. Where a real `entity_relationships` candidate
exists, it is named using the live `relationship_type` constraint from `03` — never a type the
schema doesn't have, though two cases below (marked explicitly) surface a genuine vocabulary gap
the way `03` already flagged `partner_of`.

---

## 1. The Sorbonne cluster (France) — the sharpest trap in this document

**The trap:** four legally separate public universities are each routinely called "the Sorbonne"
in English-language casual usage, and unlike every other cluster in this document, **country- or
even city-scoping does not disambiguate them** — all four sit in Paris. This is a strictly harder
case than `02`'s already-documented `UM`/`UP`/`UPM` abbreviation collisions, where a country field
alone resolves the ambiguity.

| Institution | Official site | ROR |
|---|---|---|
| Sorbonne Université | sorbonne-universite.fr | `ror.org/02en5vm52` |
| Université Paris 1 Panthéon-Sorbonne | pantheonsorbonne.fr | `ror.org/002t25c44` |
| Université Sorbonne Nouvelle (Paris 3) | sorbonne-nouvelle.fr | `ror.org/03z6jp965` |
| Université Sorbonne Paris Nord | univ-spn.fr | `ror.org/0199hds37` |

Verified: four distinct ROR ids, four distinct official `.fr` domains, four distinct governing
bodies. Sorbonne Université was created 1 January 2018 from the merger of Paris-Sorbonne (former
Paris-IV, humanities) and Pierre-et-Marie-Curie (former Paris-VI, science/medicine) universities —
well corroborated across multiple independent sources, though this session did not independently
fetch Sorbonne Université's own history page to confirm the exact date in its own words (one fetch
attempt 404'd). Université Paris 1 Panthéon-Sorbonne (law, economics, humanities) and Université
Sorbonne Nouvelle (languages, arts, humanities) are both continuations of pre-2018 University of
Paris successor institutions (Paris was split into 13 numbered universities in 1970-71) and were
not part of the 2018 merger. Université Sorbonne Paris Nord (formerly Paris-XIII) is a fourth,
separate institution in the northern suburbs. A fifth, historical "Sorbonne Paris Cité" (`ror.org/001z21q04`)
was a *COMUE* (community of universities, a looser coordination structure) active roughly 2013–2019
that no longer functions as a live grouping post-dissolution — not verified further, flagged only so
a source dated in that window is not mistaken for a fifth live candidate.

**Confidence:** high on the four-way distinctness (direct ROR + domain evidence). Medium on the
specific founding-history narrative (well-corroborated by multiple independent secondary sources,
not independently confirmed against each institution's own "history" page in this pass).

**Recommendation:** keep as four fully separate `university` entities, no `entity_relationships`
row among them. This is the one case in this package where an `entity_aliases` row for plain
"Sorbonne" / "La Sorbonne" should probably **not** be created as a `common` alias on any of the
four without a disambiguating qualifier attached at write time (subject/faculty is the only real
signal — law/economics point to Paris 1, sciences/medicine to Sorbonne Université, languages/arts
to Sorbonne Nouvelle) — auto-resolving bare "Sorbonne" to any one of the four is the exact failure
mode this whole document exists to prevent. Genuinely needs human disambiguation per occurrence,
not a registry fix.

## 2. Sciences Po network (France)

**The trap:** "Sciences Po" (no qualifier) almost always means the Paris institution in casual
English usage, but it is also the shared public brand of at least eight separately-chartered
French public institutions ("IEP," *Institut d'études politiques*), each with its own admissions,
own campus, and own ROR record.

| Institution | Official site | ROR |
|---|---|---|
| Institut d'Études Politiques de Paris ("Sciences Po") | sciencespo.fr | `ror.org/05fe7ax82` |
| Sciences Po Lyon | sciencespo-lyon.fr | `ror.org/02h3vcz70` |
| Sciences Po Bordeaux | sciencespobordeaux.fr | `ror.org/01b5nw197` |
| Sciences Po Lille | sciencespo-lille.eu | `ror.org/05dm31p35` |
| Sciences Po Toulouse | sciencespo-toulouse.fr | `ror.org/022scmy89` |
| Sciences Po Grenoble | sciencespo-grenoble.fr | `ror.org/03c7zyj82` |
| Sciences Po Aix | sciencespo-aix.fr | `ror.org/0406m4x33` |
| Sciences Po Rennes | sciencespo-rennes.fr | `ror.org/01fmctt82` |

Eight distinct ROR ids and eight distinct official domains, confirmed directly. Secondary sources
(French Wikipedia-adjacent aggregators, not cited as fact sources here) additionally name Sciences
Po Strasbourg and a campus at Saint-Germain-en-Laye — **not found in this session's ROR queries**
and not independently confirmed; recorded as unconfirmed rather than asserted. The Paris institute
itself carries a specific French legal status (*"grand établissement"* since a 1984 decree) and is
administratively/financially linked to a *separate* private foundation, the Fondation nationale des
sciences politiques (FNSP) — meaning "Sciences Po Paris" is arguably two linked legal bodies under
one brand even before counting the seven regional IEPs. Six to seven of the regional IEPs (Aix,
Lille, Lyon, Rennes, Strasbourg, Toulouse, and reportedly Saint-Germain-en-Laye) share a *common
entrance examination* since 2008 — real cooperation, but explicitly not shared legal identity;
Paris, Bordeaux, and Grenoble sit outside that specific exam-sharing arrangement.

**Confidence:** high on the eight verified as distinct (ROR-confirmed). Medium on the legal-status
detail (grand établissement, 1984 decree, FNSP linkage, common-exam-since-2008) — corroborated by
multiple independent secondary sources but not independently confirmed against the original legal
text this pass.

**Recommendation:** keep all eight as fully separate `university` entities, no relationship rows
among them by default — they are not currently one legal parent, only cooperating peers. If ORYN
later wants to model the shared-admissions cooperation explicitly, that is a candidate for a new
"Réseau ScPo" `organization` entity with `member_of` rows from the participating IEPs (mirroring
the École Polytechnique / Institut Polytechnique de Paris pattern in `03`) — flagged as a future
candidate only, not created here, consistent with how `03` treated the PSL federation.

## 3. "American University of ___" (global)

**The trap:** at least six separately-chartered institutions worldwide use "American University"
as their full or leading name, following a recognizable naming convention (an American-liberal-arts-
model university operating outside the US, or a Spanish-language "Universidad Americana") rather
than shared ownership.

| Institution | Country | Official site | ROR |
|---|---|---|---|
| American University | US (Washington, DC) | american.edu | `ror.org/052w4zt36` |
| American University of Beirut | Lebanon | aub.edu.lb | `ror.org/04pznsd21` |
| American University in Cairo | Egypt | aucegypt.edu | `ror.org/0176yqn58` |
| American University of Paris | France | aup.edu | `ror.org/05t197591` |
| American University of Central Asia | Kyrgyzstan | auca.kg | `ror.org/03vvzk644` |
| American University / Universidad Americana | Nicaragua | uam.edu.ni | `ror.org/038e47q18` |

Six distinct ROR ids, six distinct official domains, six distinct and independently verifiable
founding stories: American University (DC) was chartered by a US Act of Congress in 1893.
American University of Beirut traces to an 1863 charter from the State of New York (as the Syrian
Protestant College; renamed 1920) — a different chartering jurisdiction entirely. American
University in Cairo was founded 1919 and is chartered in the United States in addition to being
recognized in Egypt (this session confirmed "chartered and accredited in the United States and
Egypt" via AUC's own site but did not independently confirm the specific US jurisdiction — some
secondary sources say District of Columbia; recorded as unconfirmed rather than asserted). American
University of Paris was founded 1962, privately, and has been MSCHE-accredited since 1973. American
University of Central Asia was founded 1993 in Bishkek, became independent in 1997, renamed 2001.
Universidad Americana (Managua) is ROR's own English rendering of the *same, unrelated* "American
University" string. **No shared parent entity or ownership structure exists across any of these** —
several (AUB, AUC, AUP) do share the same US regional accreditor, Middle States Commission on
Higher Education, which is a real but *non-ownership* connection (an accreditor, not a parent). Many
more institutions use the identical naming convention and were not individually re-verified this
pass — American University of Sharjah, American University of Armenia, American University in
Bulgaria, American University of Nigeria, American University of Afghanistan, American University
of Kuwait, and American University of Malta are all known to exist under this same pattern; listed
here as awareness only, not verified with the same rigor as the six above.

**Confidence:** high for the six institutions actually checked.

**Recommendation:** keep as fully separate `university` entities, no relationship rows. Never
auto-resolve a bare "American University" (no city/country qualifier) to the Washington DC
institution by default — treat it exactly like `02`'s `UM`/`UP`/`UPM` pattern: return all matches,
resolve by country. A shared accreditor (MSCHE) is not evidence for any `entity_relationships` row —
accreditation is a fact about the institution, not a relationship between institutions, and ORYN's
schema correctly has no place to model it as one.

## 4. German "TU" prefix cluster

**The trap:** "TU [City]" is a live, productive naming pattern across Germany and Austria for
technical universities, all colloquially interchangeable in speech ("TU Berlin," "TU Munich").

| Institution | Country | Official site | ROR |
|---|---|---|---|
| Technische Universität Berlin | Germany | tu.berlin | `ror.org/03v4gjf40` |
| Technical University of Munich (TUM) | Germany | tum.de | `ror.org/02kkvpp62` |
| Technische Universität Dresden | Germany | tu-dresden.de | `ror.org/042aqky30` |
| Technische Universität Darmstadt | Germany | tu-darmstadt.de | `ror.org/05n911h24` |
| TU Wien (Vienna University of Technology) | Austria | tuwien.at | `ror.org/04d836q62` |

Five distinct ROR ids, five distinct domains — confirmed directly. Unlike the Sorbonne cluster,
this is a genuinely **soft** trap: every instance carries a distinguishing city name as part of its
own standard short form ("TU Berlin" vs "TU Munich," never bare "TU"), and TU Wien's country field
alone correctly separates it from the five German institutions even if a researcher forgets it is
Austrian, not German. `LMU Munich vs TU Munich` was already confirmed correctly separated by the
parent research package (`03`/`04`) and is not re-litigated here.

**Confidence:** high.

**Recommendation:** keep fully separate, no relationship rows. Low practical risk once city is
captured as part of the alias string (which it already naturally is in how people write "TU Berlin") —
recorded here mainly as a contrast case to Sorbonne (case 1), showing the same "shared institutional
prefix" shape does not always carry the same collision risk.

## 5. Berlin's universities

**The trap:** three major, independently-chartered Berlin universities plus a jointly-run medical
school are all reducible to "Berlin University" by an international student describing them loosely
in English — a distinct trap from case 4 (TU Berlin is one of the three, but HU and FU carry no
disambiguating institute-type prefix at all).

| Institution | Official site | ROR |
|---|---|---|
| Humboldt-Universität zu Berlin | hu-berlin.de | `ror.org/01hcx6992` |
| Freie Universität Berlin | fu-berlin.de | `ror.org/046ak2485` |
| Technische Universität Berlin | tu.berlin | `ror.org/03v4gjf40` (= case 4) |
| Charité – Universitätsmedizin Berlin | charite.de | `ror.org/001w7jn25` |

Four distinct ROR ids. Charité is the genuinely interesting case here, and is **not** simply a
fourth peer: it is the joint medical faculty of Freie Universität Berlin and Humboldt-Universität
zu Berlin, formed as a single joint corporation in 2003 (Department of Medicine at FU + Medical
Faculty at HU united under one Charité entity) — well corroborated across independent sources,
consistent with Charité's own ROR record showing organizational links to both HU and FU, though
this session did not fetch Charité's own official "about" page text directly to quote its
self-description.

**Confidence:** high on the four-way distinctness. Medium on the precise 2003 joint-formation detail.

**Recommendation:** HU, FU, and TU Berlin — no relationship rows among them, fully separate peers.
Charité is a genuine two-parent case: the schema's existing `part_of` type (per `03`'s semantics
table) is not restricted to a single object per subject, so two rows — `Charité part_of
Humboldt-Universität zu Berlin` and `Charité part_of Freie Universität Berlin` — are both schema-legal
today and would correctly capture the joint structure without needing a new relationship type. This
is a genuinely populatable candidate, not just a flagged gap (contrast with cases 12 and 13 below).

## 6. Trinity College (global) — six things, at least three different kinds of thing

**The trap:** "Trinity College" is claimed by a university, two constituent colleges of other
universities, two unrelated small American colleges, and a UK exam board — the widest *variety* of
entity shape in this document, not just the largest count.

| Institution | Country | Official site | ROR | Notes |
|---|---|---|---|---|
| Trinity College Dublin | Ireland | tcd.ie | `ror.org/02tyrky19` | Same ROR record as "University of Dublin" — one entity, two names |
| Trinity College, Cambridge | UK | trin.cam.ac.uk | none found | Constituent college of University of Cambridge (`ror.org/013meh722`) |
| Trinity College, Oxford | UK | trinity.ox.ac.uk | none found | Constituent college of University of Oxford (`ror.org/052gg0110`) |
| Trinity College (Hartford, CT) | USA | trincoll.edu | `ror.org/03j3dbz94` | Independent liberal arts college, est. 1823 |
| Trinity College of Florida | USA | trinitycollege.edu | `ror.org/01w466f66` | Independent small college, est. 1932 |
| Trinity College London | UK | trinitycollege.com | `ror.org/02gcnpr25` | Exam/awarding board for music, drama, English; not a degree-granting university |

Trinity College Dublin's own site self-describes as **"Trinity College Dublin, the University of
Dublin"** — confirmed directly (tcd.ie), and ROR's record for it lists "University of Dublin" as an
alias within the *same* record, not a second one: this is one institution with two names, not two
institutions, and the "University of Dublin never expanded beyond one constituent college" framing
in the seed brief is correct. Trinity College, Cambridge and Trinity College, Oxford, by contrast,
have **no independent ROR record at all** — confirmed by direct query (a GB-scoped search for
"Trinity College" returns only Trinity College London; a similar King's College check below finds
the same pattern for King's College, Cambridge) — because they are not independently degree-awarding;
degrees are conferred by the University of Cambridge / University of Oxford, not by the college.
Trinity College London was founded in 1872 as the external exam board of Trinity College of Music
(today part of Trinity Laban Conservatoire — a fourth "Trinity" naming layer, not deeply verified
this pass) and has operated under its current standalone brand since 2012; it is an "independent
education charity," not a university at all.

**Confidence:** high across the board — this is a case where the institutions themselves are
unambiguous once checked; the risk is purely in a matcher that does not distinguish entity *kind*.

**Recommendation:** Trinity College Dublin and "University of Dublin" — one `university` entity,
never two. Trinity College (Hartford) and Trinity College of Florida — separate `university`
entities, no relationship to Dublin or to each other (no shared history found). Trinity College,
Cambridge and Trinity College, Oxford — do **not** create `university`-type entities for these at
all unless ORYN specifically needs college-level granularity within Oxbridge; the schema has no
"constituent college" `entity_type` today (a gap analogous to `03`'s unpopulated `campus_of`), so
the safe default is to represent only "University of Cambridge" / "University of Oxford" and treat
individual college names as a research/`school_of`-adjacent question to revisit only if a real
product need (e.g. college-specific admissions data) arises. Trinity College London — separate
entity, but flag for whoever assigns `entity_type` that `university` is the wrong type; it is an
exam/awarding body, closer to `organization`.

## 7. Oxford- and Cambridge-branded institutions beyond the flagship university

**The trap:** both UK "flagship" university names have at least one genuinely independent,
similarly-named institution in the same city (not merely elsewhere in the world), plus a separate,
much larger risk specific to K-12 records: a globally licensed curriculum brand that puts the word
"Cambridge" inside thousands of unrelated schools' own institutional names.

| Institution | Official site | ROR |
|---|---|---|
| University of Oxford | ox.ac.uk | `ror.org/052gg0110` |
| Oxford Brookes University | brookes.ac.uk | `ror.org/04v2twj65` |
| University of Cambridge | cam.ac.uk | `ror.org/013meh722` |
| Cambridge College (Massachusetts, USA) | cambridgecollege.edu | `ror.org/036qj5r13` |

Four distinct ROR ids, four distinct domains. Oxford Brookes University (formerly Oxford
Polytechnic, university status since 1992) is a full, independent university physically located in
the same city as — and with zero governance relationship to — the University of Oxford; this is a
real, well-known, and well-documented UK trap. Cambridge College (Massachusetts) is a small,
independent, non-selective adult-education-oriented college in Cambridge, MA — unrelated to
Harvard or MIT (also in Cambridge, MA) and unrelated to the University of Cambridge, UK.

**A second, differently-shaped Cambridge risk, specific to ORYN's K-12/curriculum data:** Cambridge
International (formerly "Cambridge Assessment International Education," CAIE) genuinely *is* a
department of the University of Cambridge, confirmed via its own materials — so it is not a
collision in the same sense as the pairs above. The actual risk is that "Cambridge International"
is a *licensed curriculum and examination brand* used by an estimated 10,000+ independently-owned
K-12 schools worldwide, many of which put "Cambridge" directly in their own institutional name
(e.g., "Cambridge International School (Moscow)"). None of those schools are owned, operated, or
governed by the University of Cambridge — they are independent local schools licensed to teach the
syllabus and administer the exams. Medium confidence: this session confirmed Cambridge
International's status as a University of Cambridge department and confirmed the general
licensing/registration model from Cambridge International's own materials, but did not individually
verify any specific school's licensing terms.

**Confidence:** high on Oxford Brookes / Cambridge College (MA). Medium on the curriculum-brand
framing (directionally well-supported, not exhaustively checked against Cambridge International's
own legal/licensing language).

**Recommendation:** Oxford Brookes and Cambridge College (MA) — fully separate `university`
entities, no relationship rows, straightforward once checked. For any `entity_type='school'` row
whose name contains "Cambridge International" (or similar curriculum-brand strings): do not create
any `entity_relationships` row to University of Cambridge on the strength of the name alone — a
curriculum license is a fact about the school's `curriculum` field (already in ORYN's `profiles`
schema per `AGENTS.md`), not an organizational relationship. If ORYN later ingests IB-style
"authorized school" data for Cambridge International the way it already has for Turkish IB schools
(`03`), the same discipline applies: authorization/licensing is not ownership.

## 8. University of London federation — a live, current `member_of` candidate

**The trap:** four of the most commonly student-searched UK universities (Imperial, King's, UCL,
LSE) were historically colleges of one federal "University of London," and popular usage still
sometimes treats "University of London" as if it were their shared parent brand today. The current,
verified reality is more precise than that — and is a good real-world match for the schema's
existing `member_of` type, which `03` already flagged as under-populated (one live example,
École Polytechnique / IP Paris).

| Institution | Official site | ROR | Current status |
|---|---|---|---|
| University of London (central body) | london.ac.uk | `ror.org/04cw6st05` | Federal body, est. 1836 |
| Imperial College London | imperial.ac.uk | `ror.org/041kmwe10` | **Fully independent** — withdrew entirely from the federation, own Royal Charter, first Imperial-conferred degrees July 2007 |
| King's College London | kcl.ac.uk | `ror.org/0220mzb33` | Federation member; own degree-awarding powers since 2006/2007; reported to have separately obtained formal "university" title in October 2024 |
| University College London (UCL) | ucl.ac.uk | `ror.org/02jx3x895` | Federation member; own degree-awarding powers since 2005 (first used 2007/08) |
| London School of Economics (LSE) | lse.ac.uk | `ror.org/0090zs177` | Federation member; reported to have obtained independent "university status" in May 2022 |

Imperial's 2007 full withdrawal is confirmed directly from imperial.ac.uk's own news pages (Council
agreed to negotiate withdrawal Dec 2005; University of London accepted the withdrawal request Oct
2006; independent Royal Charter and first Imperial degrees, July 2007). King's, UCL, and LSE
remaining federation members *while* holding independent degree-awarding powers is confirmed via a
combination of each institution's own domain (self-service.kcl.ac.uk) and the University of
London's own federation pages (london.ac.uk/federation/*), which still list all three as current
members. The University of London Act 2018 is the enabling mechanism cited consistently across
sources for members "seeking university status in their own right while remaining part of the
federation" — confirmed via LSE's own official page, though that page (dated Feb 2019) describes
the Act's effect prospectively and does not itself state LSE's exact grant date. **The specific
dates "King's, October 2024" and "LSE, May 2022" are reported consistently across multiple
searches but were not independently confirmed by this session against one clean primary/official
document carrying that exact date** — recorded as medium confidence on the dates specifically,
high confidence on the underlying status (independent degree-awarding, federation membership
retained for King's/UCL/LSE, fully exited for Imperial).

**Confidence:** high on structure and current status; medium on the two specific 2022/2024 dates.

**Recommendation:** this is a genuinely populatable, schema-ready case. Add `member_of` rows —
King's College London `member_of` University of London, UCL `member_of` University of London, LSE
`member_of` University of London — mirroring the École Polytechnique pattern `03` already
validated, and directly answering `10`'s open request for a second `member_of` example. Do **not**
add any relationship row for Imperial College London to University of London — it fully exited, and
(same observation as case 12's schema gap) the current `relationship_type` enum has no clean way to
express "formerly a member, now fully independent" (`predecessor_of`/`successor_of` is the wrong
shape per `04` — no institutional discontinuity occurred, membership simply ended); flagged as
lower-priority than the case-9 split gap since it is a historical-fact-not-needed-for-resolution
case, not an active ambiguity risk. Separately: King's College, Cambridge has no independent ROR
record (same pattern as Trinity College, Cambridge in case 6) and should not be confused with King's
College London — same recommendation as case 6's Oxbridge colleges.

## 9. Erasmus — a university, a university of applied sciences, and an EU funding brand

**The trap:** "Erasmus" names a Dutch research university, a separate Belgian university of applied
sciences and arts, and the EU's flagship student-mobility funding program — three different *kinds*
of thing, exactly the live confusion risk the seed brief called out for opportunity-provider
canonicalization.

| Entity | Kind | Official site | ROR |
|---|---|---|---|
| Erasmus University Rotterdam | University (NL) | eur.nl | `ror.org/057w15z03` |
| Erasmus Brussels University of Applied Sciences and Arts (Erasmushogeschool Brussel) | University of applied sciences (BE) | erasmushogeschool.be | `ror.org/01767d733` |
| Erasmus+ / Erasmus Mundus | EU funding programme, not an institution | education.ec.europa.eu | n/a — not an organization |

Confirmed directly from the European Commission's own education portal: Erasmus Mundus is "a
specific part of Erasmus+, the EU's overarching programme supporting education, training, youth,
and sports," funding joint master's degrees delivered by *consortia of universities* rather than
being a university itself. Erasmus University Rotterdam (est. 1913) is a genuine, separate Dutch
research university that happens to be an active Erasmus+ participant — a participant in the
program, not the program's namesake institution. Erasmus Brussels University of Applied Sciences
and Arts (est. 1995, from a merger of roughly ten Brussels-area colleges under a 1994 Flemish
decree) is a third, separate Belgian institution at a different tier (university of applied
sciences, not a research university) — confirmed via its own ROR record and its own domain
(erasmushogeschool.be), which does not mention Erasmus University Rotterdam at all.

**Confidence:** high — the "university vs. EU program" distinction is unambiguous and confirmed
from the EU's own source; the Rotterdam/Brussels distinction is ROR- and domain-confirmed.

**Recommendation:** Erasmus University Rotterdam and Erasmus Brussels University of Applied
Sciences and Arts — fully separate `university` entities, no relationship row. Erasmus+ and
Erasmus Mundus must never be modeled as, or aliased to, any `university`-type entity — per `08`'s
existing framework, these belong as `entity_type='opportunity_provider'` (or `program`/`scholarship`
records `provider_for` the European Commission / European Education and Culture Executive Agency),
since ORYN's `opportunities` table will very plausibly ingest Erasmus Mundus joint-degree programs
and scholarships directly. This is a concrete, live risk for the same
`opportunities.organization_entity_id` canonicalization gap `08`/`09` already flagged as 0/369
populated — a raw "Erasmus" organizer string here must never resolve to Erasmus University
Rotterdam's entity id.

## 10. Amsterdam cluster (Netherlands)

**The trap:** four Amsterdam institutions carry "University of Amsterdam"-adjacent names, one of
which is a genuine two-parent joint venture of two of the others — a second real candidate (after
case 5's Charité) for the "does `part_of` support two parents" question.

| Institution | Official site | ROR | Notes |
|---|---|---|---|
| University of Amsterdam (UvA) | uva.nl | `ror.org/04dkp9463` | Research university |
| Vrije Universiteit Amsterdam (VU) | vu.nl | `ror.org/008xxew50` | Research university, independently founded (1880, Protestant tradition) |
| Amsterdam University College (AUC) | auc.nl | `ror.org/03dpjfc73` | Joint venture of UvA + VU, est. 2009 |
| Amsterdam University of Applied Sciences (HvA) | hva.nl | `ror.org/00y2z2s03` | University of applied sciences, different tier |

Four distinct ROR ids. AUC's own official site (auc.nl, "Joint initiative" page) states directly
that it is a joint undertaking of UvA and VU and that its Liberal Arts and Sciences Bachelor's is
"a joint Bachelor's (Honours) degree issued by the UvA and VU" — confirmed from AUC's own domain,
not a secondary source. This is a **softer** trap than it first appears: AUC is not a rogue
similarly-named impostor, it is a real, jointly-governed institution whose own evidence explicitly
states the joint relationship, making it easy to model correctly rather than merely easy to avoid
conflating.

**Confidence:** high.

**Recommendation:** UvA, VU, and HvA — fully separate entities, no relationship rows among them
(HvA is a different institutional tier entirely, same distinction as ZHAW vs ETH/UZH in case 11).
AUC — same two-parent pattern as Charité (case 5): two `part_of` rows, `AUC part_of University of
Amsterdam` and `AUC part_of Vrije Universiteit Amsterdam`, both schema-legal today under the
existing `part_of` semantics and directly evidenced by AUC's own official page. A genuinely
populatable candidate, not just a flagged gap.

## 11. Zurich "University" cluster and other Swiss pairs

**The trap:** the English translation "[Zurich] University" is shared by four institutions of
three different kinds, plus a lower-confidence addendum on Geneva.

| Institution | Official site | ROR |
|---|---|---|
| ETH Zurich | ethz.ch | `ror.org/05a28rw58` |
| University of Zurich (UZH) | uzh.ch | `ror.org/02crff812` |
| ZHAW Zurich University of Applied Sciences | zhaw.ch | `ror.org/05pmsvm27` |
| Zurich University of the Arts (ZHdK) | zhdk.ch | `ror.org/05r0ap620` |
| EPFL (École Polytechnique Fédérale de Lausanne) | epfl.ch | `ror.org/02s376052` |

Five distinct ROR ids, five distinct domains, three distinct institutional tiers (ETH and EPFL are
both federal institutes of technology — Switzerland's two, and *not* a naming collision with each
other since their names/abbreviations don't overlap at all; UZH is the cantonal research
university; ZHAW is a university of applied sciences; ZHdK is a university of the arts). The seed
brief's ETH/EPFL pairing turns out to be a **soft** trap on closer inspection — they are routinely
mentioned together as "Switzerland's two federal institutes" but their actual names and
abbreviations do not overlap, so a naive string matcher is not actually at risk here; the real
Zurich risk is the four-way "Zurich University" translation-collision above, which is not centered
on ETH/EPFL at all.

**Geneva addendum (lower confidence, included for completeness):** University of Geneva
(unige.ch, `ror.org/01swzsf04`) is Switzerland's public research university in Geneva. Geneva
Business School (gbsge.com) is a separate, private, tuition-funded business school — real and
accredited (IACBE-accredited since 2003, per its own site) but **no ROR record was found for it**
in this session's queries, and it sits at a clearly different regulatory/prestige tier than a
cantonal public university. Recorded as medium confidence: the distinctness itself is not in doubt
(different ownership, different site, different regulatory status), but the absence of independent
registry coverage means this pair rests on official-domain evidence alone rather than the
ROR-plus-domain double confirmation every other case in this document has.

**Confidence:** high for the five-institution Zurich/EPFL table. Medium for the Geneva addendum.

**Recommendation:** ETH Zurich, University of Zurich, ZHAW, ZHdK, EPFL — fully separate `university`
entities, no relationship rows; true peers, not a federation. University of Geneva and Geneva
Business School — also fully separate, no relationship, but flag Geneva Business School (and,
generally, any private institution absent from ROR) for extra scrutiny before it is treated as an
equally authoritative source for prestige/selectivity-proxy signals elsewhere in ORYN's scoring —
not because anything is wrong with it, but because the registry double-check this document relies
on everywhere else isn't available for it.

## 12. İstanbul University split (Turkey) — a genuine schema vocabulary gap

**The trap:** two of Turkey's most-referenced universities in English-language admissions writing
share the literal string "İstanbul University," because one was created by *splitting* the other in
2018 — and unlike a rename (`04`'s decision rule), the original institution kept operating under its
original name, so this is neither a simple rename nor a clean succession.

| Institution | Official site | ROR |
|---|---|---|
| İstanbul University | istanbul.edu.tr | `ror.org/03a5qrr21` (est. 1453) |
| İstanbul University-Cerrahpaşa | iuc.edu.tr | `ror.org/01dzn5f42` (est. 2018) |

Confirmed directly via ROR: two distinct, currently active records, two distinct domains. The
mechanism is confirmed via multiple independent Turkish news sources (secondary, not fetched from
the Turkish Official Gazette/parliamentary record itself — medium confidence on the mechanism
specifically, high confidence on the current two-entity outcome, which ROR independently confirms
regardless of mechanism): in April 2018 the Turkish Grand National Assembly passed a law splitting
İstanbul University's medical, nursing, education, forestry, health-sciences, sports-sciences,
veterinary, and engineering faculties into a new entity, briefly proposed as "İbn-i Sina University"
before being named İstanbul University-Cerrahpaşa. The same 2018 law restructured nine other
existing universities (Selçuk, Kütahya Dumlupınar, İnönü, Gazi, Sakarya, Mersin, Karadeniz Teknik,
Erciyes, Kahramanmaraş Sütçü İmam) into a total of 16 new state universities plus 4 new private
ones — but **İstanbul is the only one of the ten where the spun-off entity's new name retained the
parent's full name**, which is why this document treats it as the standout naming-collision case
from that reform rather than covering all ten splits individually. A lower-severity, place-name-only
echo of the same reform is Sakarya University vs. the newly created Sakarya University of Applied
Sciences — noted, not separately verified in depth.

**Confidence:** high on current distinctness (ROR-confirmed); medium on the specific legislative
mechanism (Turkish-news-sourced, not fetched from primary legal text).

**Recommendation:** keep as two fully separate `university` entities — this was already correct in
ROR and should be already-correct in ORYN's registry if both were created from independent research
passes, but is worth an explicit check given how easy the string-similarity failure would be. **This
case exposes a real, evidence-backed vocabulary gap** the same way `03` already flagged `partner_of`:
neither `successor_of`/`predecessor_of` (reserved by `04` for cases where the original ceases to be
independently referenceable — not true here, İstanbul University kept operating) nor `part_of` (no
ownership hierarchy between them post-split) cleanly fits "split from." Recommend flagging a future
`split_from` (or symmetric `split_into`) relationship type as a migration candidate in `11`-style
follow-up, and until then leaving the pair with no `entity_relationships` row rather than forcing an
inaccurate one.

## 13. Fatih-prefix collision (Turkey) — one live, one closed, same first word

**The trap:** two Istanbul foundation universities share the name "Fatih" (a common Turkish given
name and honorific, also the name of a central Istanbul district) — one closed by government
decree in 2016, the other founded in 2010 and still operating. This is the highest-stakes case in
this document precisely because one side no longer exists to correct a wrong resolution.

| Institution | Official site | ROR | Status |
|---|---|---|---|
| Fatih University | (formerly fatih.edu.tr) | `ror.org/02wbrth70` (est. 1996) | **Closed** — statutory decree, July 2016; ROR still shows it "active" |
| Fatih Sultan Mehmet Vakıf University (FSMVU) | fsm.edu.tr | `ror.org/04mma4681` (est. 2010) | Operating |

Confirmed via ROR that these are two distinct records with different founding years (1996 vs.
2010) and no cross-reference between them. Fatih University's closure is corroborated across
multiple independent Turkish news sources (secondary — this session did not fetch the original
decree text; medium confidence on the specific decree number reported, "KHK 667"): following the
July 2016 coup attempt, Fatih University was one of roughly 15 foundation universities closed for
alleged links to the Gülen movement; its rectory building and land were transferred to İstanbul
University by decree, and its students were reassigned — medical/health-vocational students to
Bezmialem Foundation University, others to İstanbul University. Fatih Sultan Mehmet Vakıf University
is unrelated: established under a 2010 law (No. 5981) following an August 2009 Foundations Council
decision, funded by five founding *vakıfs* (foundations) — Fatih Sultan Mehmet Han Foundation,
Sinan Ağa bin Abdurrahman Foundation, Nurbanu Valide Sultan Foundation, Hatice Sultan Foundation,
and Abdullahoğlu Hacı Abdülaziz Ağa Foundation — none of which this session found any connection to
the closed Fatih University's foundation. **A concrete, useful side-finding:** ROR's own "active"
status field for the closed Fatih University is stale/wrong as of this session — a directly
confirmed, live example of exactly the kind of external-registry lag `04` already flagged for
Constructor University's ROR record, now with a second, independent instance.

**Confidence:** high that these are two distinct institutions (different founding years, different
founding foundations, different ROR records). Medium on the specific closure mechanism/decree
number (secondary-sourced).

**Recommendation:** keep as two fully separate entities, no relationship, no shared alias. For
whichever session owns write access: Fatih University is a strong candidate for
`verification_state='inactive'` (a value the live `canonical_entities` check constraint already
supports per migration 0038) once its 2016 closure is confirmed against a primary source — **do
not** merge it into İstanbul University despite the asset transfer; a land/building/student
transfer by government decree is not institutional succession in `04`'s sense (İstanbul University
did not become "the same entity" as Fatih University — it simply received transferred assets and
students), so no `successor_of` row is appropriate either. Do not trust ROR's `active` flag alone
for any Turkish foundation-university closed in the 2016 purges — a wider check of the ~15
similarly-closed institutions (Zirve University, Turgut Özal University, and others) against ROR's
status field is a reasonable, scoped follow-up task, not attempted here.

## 14 & 15. Two US "name-order inversion" pairs — no institutional connection at all, purely a matching-algorithm hazard

**The trap:** unlike every other case in this document, these two pairs have **zero shared
history, ownership, or founding connection** — the only risk is a fuzzy/token-based matcher that is
blind to word order.

| Case | Institution A | Institution B |
|---|---|---|
| 14 | Washington University in St. Louis — wustl.edu, `ror.org/01yc7t268` | University of Washington (Seattle) — washington.edu, `ror.org/00cvxb145` |
| 15 | University of Miami (Florida, private) — welcome.miami.edu, `ror.org/02dgjyy92` | Miami University (Oxford, Ohio, public, est. 1809) — miamioh.edu, `ror.org/05nbqxr67` |

Four distinct ROR ids across the two pairs, confirmed directly. Both pairs are well-known,
frequently-confused US institution names precisely because they invert the same two words around
"University of" vs. "[Name] University" — a bag-of-words or token-overlap similarity score would
likely rate each pair as a near-perfect match, which is exactly backwards.

**Confidence:** high — the absence of any connection is as clear as the presence of one is in other
cases; there is no ambiguity to resolve, only an algorithmic blind spot to guard against.

**Recommendation:** keep fully separate, no relationship rows — nothing to model, no ambiguity to
track. Recorded here specifically as a caution for whoever implements or tunes ORYN's fuzzy
duplicate-candidate scorer (`05`'s territory): a similarity function that is not sensitive to word
order will misrank these pairs as likely duplicates. `05`'s existing `classifyDuplicateCandidate()`
requiring agreeing external ids before ever reaching `SAFE_TO_CANONICALIZE` already protects against
this at the merge-decision layer — this case is evidence for why that conservatism is warranted, not
a gap in it.

---

## Checked and found clean (or softer than expected)

Matching this package's own standard of recording a clean negative result rather than omitting it
silently (`09` does the same for the parts of the registry it found correctly modeled):

- **Boğaziçi Üniversitesi / ODTÜ (METU):** the mission brief for this document suggested checking
  whether the parent package's docs `02`/`03` already covered a "common confusion" between these two
  well-known Turkish universities. On inspection, `02` and `03` only use Boğaziçi as a worked example
  of the `translation` alias type (Turkish name vs. English form of the *same* institution) and
  ODTÜ/METU as a worked example of a cycle-varying opportunity *operator* (`08`) — neither document
  claims, and this session found no evidence for, an actual naming collision between Boğaziçi
  University and METU. They are two well-known, clearly distinct universities with no shared name,
  abbreviation, or naming pattern; this session did not find a real trap here and is not inventing
  one to fill the seed list.
- **ETH Zurich / EPFL (case 11):** seeded as a likely collision pair; on verification their names
  and abbreviations do not actually overlap, so the pairing is a *conceptual* grouping ("Switzerland's
  two federal institutes") rather than a *naming* collision. Recorded in case 11 rather than as a
  separate false-positive entry.
- **TU-prefix cluster (case 4):** looks superficially as sharp a trap as the Sorbonne cluster, but
  the city name embedded in each institution's own standard short form means it resolves cleanly in
  practice — a useful contrast case, not a clean miss, but softer than it first appears.

## Summary table

| # | Case | Countries | Verified distinct | Confidence | Recommendation |
|---|---|---|---|---|---|
| 1 | Sorbonne cluster | FR | Yes (4-way) | High / Medium | No relationship; human disambiguation needed per occurrence |
| 2 | Sciences Po network | FR | Yes (8-way) | High / Medium | No relationship; future `member_of` to a network entity is a candidate, not created |
| 3 | American University of ___ | US, LB, EG, FR, KG, NI | Yes (6-way) | High | No relationship |
| 4 | German TU prefix | DE, AT | Yes (5-way) | High | No relationship; soft trap |
| 5 | Berlin's universities | DE | Yes (4-way) | High / Medium | No relationship among HU/FU/TU; Charité = two `part_of` rows (populatable now) |
| 6 | Trinity College | IE, UK, US | Yes, but 3 different entity kinds | High | Dublin = one entity; Cambridge/Oxford colleges = don't model as `university`; London = wrong entity type if modeled as one |
| 7 | Oxford/Cambridge beyond flagship | UK, US | Yes | High / Medium | No relationship; curriculum-brand schools ≠ relationship to University of Cambridge |
| 8 | University of London federation | UK | Yes | High / Medium | `member_of` for King's/UCL/LSE (populatable now); nothing for Imperial (fully exited) |
| 9 | Erasmus | NL, BE, EU | Yes | High | No relationship; EU programs must never alias to Erasmus University Rotterdam |
| 10 | Amsterdam cluster | NL | Yes | High | No relationship among UvA/VU/HvA; AUC = two `part_of` rows (populatable now) |
| 11 | Zurich cluster + Geneva | CH | Yes | High / Medium | No relationship; Geneva Business School flagged for extra scrutiny (no ROR record) |
| 12 | İstanbul University split | TR | Yes | High / Medium | No relationship; exposes a genuine `split_from` vocabulary gap |
| 13 | Fatih-prefix collision | TR | Yes | High / Medium | No relationship; closed side is an `inactive`-status candidate, not a merge target |
| 14/15 | US name-order inversions | US | Yes (no connection at all) | High | No relationship; algorithmic caution for fuzzy matching only |

Fifteen cases, all independently verified this session against official sites and/or ROR — none
asserted on the strength of a seed-list description alone, and one seeded pair (Boğaziçi/ODTÜ)
explicitly ruled out rather than force-fit into the list.
