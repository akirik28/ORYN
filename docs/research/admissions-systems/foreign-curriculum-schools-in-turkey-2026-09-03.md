# A Turkish resident with a foreign country's own qualification — does the pathway change?

**Status: research findings for all four named countries, an explicit aggregate verdict, and an
architecture sketch — nothing implemented.** Written 2026-09-03, triggered by the founder
directly: *"Türkiye'de Fransız ve Alman okullarında farklı sistemler var, onların da farkında
olsun uygulama, İtalyan lisesi var"* ("There are different systems at the French and German
schools in Turkey, the product should be aware of them too, there's the Italian lisesi").
Germany and Italy researched first per CEO's sequencing; France and Austria added in a second
pass, same standard.

## The question, precisely

`lib/admissions/system-shape.ts`'s `pathway` (`domestic` | `international`) is resolved from
`profiles.country` alone — **residence/school location**, per that field's own documented
meaning (`resolvePathway`, `system-shape.ts`). Turkey has several schools whose students earn
another country's own secondary-leaving qualification while living in Turkey: Deutsche Schule
Istanbul / İstanbul Alman Lisesi (German Abitur, including its Deutsches Internationales Abitur
variant), Liceo Italiano di Istanbul / İtalyan Lisesi (Italian maturità), Galatasaray Lisesi,
Saint-Joseph d'Istanbul, and Notre Dame de Sion Istanbul (French-track curricula), and
St. Georgs-Kolleg / Avusturya Lisesi (Austrian Matura/Reifezeugnis). If a destination country
treats its own qualification, earned abroad at a recognized school, as equivalent to earning it
domestically for **admissions purposes specifically** — not just cultural/linguistic recognition
— then a Turkish citizen holding one of these can be on the wrong side of the registry's
domestic/international split today, and the registry would currently tell them the wrong thing.

**This is not a hypothetical gap-class — Turkey's own entry already found one real instance of
it, unresolved.** `turkey.md` §B (existing research, not written this pass) confirms YÖK's own
policy is explicit: pathway is "gated by registration/schooling location, not by curriculum
content **or nationality**." A Turkey-registered IB/A-Level/AP student still sits YKS — holding
a foreign curriculum *delivered in Turkey* does not open the foreign-national pathway. Three
narrow named exceptions do: embassy-school students, MOBİS-listed international institution
students, and MEB-project-relocated foreign nationals — who use the foreign pathway "not because
of the curriculum itself but because of where it was delivered," *even while resident and
schooled in Turkey*. The same research separately confirms this is decoupled from citizenship:
a dual Turkish/foreign citizen or Mavi Kart holder is foreign-pathway-eligible if schooled
entirely abroad, and is not if schooled in Turkey, "the presence of a Turkish passport" being
beside the point either way.

**That finding was never wired through.** The shipped `international` mechanism sentence for
Turkey says only "students who completed secondary school outside Türkiye" — no mention of the
three named exceptions, no mention of the citizenship-independence finding — and `resolvePathway`
has no field to check "where was secondary school completed" distinctly from `studentCountry`
(residence) at all, the identical limitation this document describes for Germany, Italy, Austria
and France below. **Germany and Turkey are two instances of one structural gap, not a Germany-
specific curiosity**: Turkey's is "a foreign curriculum delivered *inside* the target country
mostly doesn't change the pathway" (narrow named exceptions aside); Germany's is "the target
country's *own* qualification, delivered *outside* it, does change the pathway" (see §A).
Opposite directions, same missing dimension — residence alone answers neither correctly. Not
fixing Turkey's own entry here — out of scope for what was asked — but flagging it plainly
rather than treating Germany as the first or only case.

## A. Germany — real, material, and exactly where the founder's framing was right

**Confirmed: a German Abitur (or its DIA variant) earned at a recognized Deutsche Auslandsschule
makes the holder a *Bildungsinländer* — a distinct, defined legal/administrative status that
routes them through the domestic admissions track, not the international one — regardless of
citizenship or country of residence.**

- **hochschulstart.de** (the federal NC-subject allocation body — the same body this registry's
  Medicine `fieldOverride` already cites) defines Bildungsinländer directly: "all foreign
  applicants and stateless persons who acquired a German university entrance qualification...
  that entitles them to pursue the desired degree programme" — no residence or citizenship test,
  only where/how the qualification (Hochschulzugangsberechtigung) was acquired. Bildungsinländer
  "are treated identically to domestic applicants with German university entrance qualifications"
  and are placed "in the selection in the quota of the federal state in which they acquired
  their certificate" — fetched directly, primary confidence, 2026-09-03.
- **KMK** (Kultusministerkonferenz — the German federal-state education ministers' conference,
  the body that accredits Auslandsschulen and authorizes them to administer the Abitur) confirms
  the Deutsches Internationales Abitur specifically — the variant most Auslandsschulen,
  including Deutsche Schule Istanbul, actually issue — "is recognized at German and
  international universities just like the traditional German Abitur," following "the same
  standards as in Germany." Mandatory at all German schools abroad since 2016/17.
- **Deutsche Schule Istanbul** (İstanbul Alman Lisesi's German-administered division) has held
  KMK authorization to conduct Abitur exams in Turkey for over 50 years — this is not a
  language-immersion school issuing a Turkish diploma with German instruction; it issues the
  real, KMK-recognized qualification.

**Why this is the highest-stakes case, as CEO framed it:** Germany is the one country in this
registry whose Medicine/Pharmacy/Veterinary/Dentistry field override is a genuine, nationally
quota-allocated `academic_rank_competitive` mechanism (hochschulstart.de's NC system) with a
separately-sized pool for international applicants versus the much larger Bildungsinländer pool
competing on the same terms as German nationals. **Today, a Turkish MEB-diploma-holding
applicant and a Deutsche-Schule-Istanbul Abitur/DIA-holding applicant targeting German Medicine
receive the identical `international` pathway and mechanism text from this registry — and per
the sources above, they should not.**

**Not confirmed this pass:** the exact current size of a Germany-wide Ausländerquote percentage
for NC subjects; whether a dual-qualification (Turkish Lise + DIA) holder can elect which to
present; state-quota mechanics beyond hochschulstart's own summary language.

## B. Italy — real, but narrower, and answers differently than Germany

**A genuinely different result, not a weaker version of Germany's.** Two separate questions,
two different answers:

**Does a Liceo Italiano di Istanbul (İtalyan Lisesi, e.g. Liceo Scientifico Italiano I.M.I.)
maturità skip the foreign-qualification-recognition step this registry's `international`
mechanism currently names ("plus proof that the origin qualification is complete")? Plausibly
yes.** The school is recognized by the Italian state as one of its own schools abroad — sources
describe it as materially supported by Italy with Italian-government-appointed teachers, and
its maturità as "a legal certificate recognized throughout the European Union... without
requiring certification equivalence," with Turkish graduates holding "the same rights as
Italian students." Search-summary sourced, held to medium rather than high confidence pending a
direct fetch.

**Does the same diploma move the holder out of the separate "non-EU resident abroad" reserved
quota for numero chiuso programmes (Medicine, Dentistry, Veterinary)? No evidence found that it
does — and the general rule, checked from two independent angles, points the other way.**
Official-decree-sourced framing (MUR/MIM ministerial decrees on Medicine seat allocation,
matching language across a university's own admissions page): seats are split three ways — EU
candidates, non-EU candidates "equiparati" (treated as equivalent), and non-EU candidates
*resident abroad*. **"Equiparato" status is defined by residence, not by the diploma's issuing
authority**: one university's own admissions page states non-EU equiparati are those "regularly
resident in Italy for at least one year" and holding "a secondary school diploma obtained in
Italy." A Liceo Italiano di Istanbul graduate living in Istanbul satisfies neither condition.
**No explicit carve-out for graduates of scuole italiane all'estero was found in either
direction** — an absence, not a confirmed exclusion; a primary ministerial decree text could not
be fetched (403 on the one PDF attempted).

**Net finding for Italy: general/open admission plausibly gets easier; numero chiuso admission —
the Medicine case specifically — most likely does not change pools, unlike Germany.**

## C. Austria — the cleanest, strongest confirmation of the four

**Confirmed by name, in statute, on Austria's own government site: St. Georgs-Kolleg (Avusturya
Lisesi / Sen Jorj Avusturya Lisesi ve Ticaret Okulu) graduates are placed on equal footing with
Austrian citizens for admission to any Austrian university.** This is not a general category
(Germany's Bildungsinländer) requiring separate application to this specific school — it names
the school directly.

- **bmeia.gv.at** (Austria's Federal Ministry for European and International Affairs, the
  Istanbul Cultural Forum's own page — fetched directly, primary confidence, 2026-09-03) quotes:
  "Gemäß des Österreichischen Allgemeinen Hochschul-Studiengesetzes sind Inhaber\*innen eines
  Reifezeugnisses des St. Georgs Kollegs Österreichern gleichgestellt und zum Studium an jeder
  österreichischen Universität berechtigt" — holders of the school's Reifezeugnis are placed on
  equal footing with Austrians and entitled to study at any Austrian university, per a named
  Austrian statute. (The exact current name/citation of the operative provision was not
  independently cross-checked against Austria's consolidated federal law text this pass — quoted
  as the source states it, not re-verified further.)
- St. Georgs-Kolleg is one of a small, explicitly named set of Austrian schools abroad (sister
  institutions cited alongside it: Guatemala City, Prague, Budapest, Shkodra, Santiago de
  Querétaro, Triesen) — search-summary sourced, not independently primary-fetched. Since
  1995/96, students who sit and pass the Austrian Reifeprüfung there receive both a Turkish
  diploma and the Austrian Reifezeugnis; the two are not mutually exclusive, the same pattern
  already found for Deutsche Schule Istanbul (§A).

**What this plausibly means for the registry's two open Austria questions, stated as inference
from the "gleichgestellt" (equal-status) language, not separately confirmed line by line:**
(1) very likely skips the `international` mechanism's "non-EU/EEA proof of a home-country study
place" step — equal status to an Austrian applicant is inconsistent with also being treated as a
non-EU applicant needing that extra proof; (2) very likely counts toward the ≥75%
"Austrian-or-equivalent-certificate holder" pool for MedAT specifically, not the smaller
international pool — the same "equal status" concept applied to the one field where it is
highest-stakes, mirroring Germany's NC-quota finding almost exactly. Neither (1) nor (2) was
independently confirmed against a MedAT-specific source this pass; both are strong, well-grounded
readings of the general statutory language, held at slightly lower confidence than the general
finding itself.

## D. France — three named schools, three different answers, within one country

**The sharpest finding in this whole document: France does not even reduce to one per-country
answer.** Checked three schools CEO named; got three different results.

**Saint-Joseph d'Istanbul — plausibly yes.** Described as "homologué (approved) by the French
Ministry of Education," offering students "a diploma equivalent to the French baccalauréat" —
search-summary sourced, not independently primary-fetched from France Éducation internationale's
own homologated-schools registry. **This matters because france.md's existing research (not
written this pass) already answers the mechanism question directly**: "Parcoursup is the
mandatory registration-and-routing platform for anyone preparing or holding a French or European
Baccalauréat — French nationals, foreign nationals enrolled in a French lycée (in France or
abroad, e.g. an AEFE-network school)... regardless of nationality." Homologation — AEFE-managed
or not — is what makes a diploma a genuine baccalauréat; if Saint-Joseph's homologation status
holds up under direct verification, its graduates should fall under this already-established
rule, not the DAP/Études en France route this registry currently assumes for every Turkey-
resident applicant.

**Notre Dame de Sion Istanbul — plausibly no, and this is a real, useful negative, not a null
result.** Confirmed **not** AEFE-managed and **not** homologated to prepare the French
baccalauréat itself. It instead holds the "FrancEducation" label — a different, lower-tier
French-government recognition of strong French-language/curriculum content, which does **not**
by itself confer baccalauréat status. One search summary's claim that its diploma is "recognized
as equivalent to the baccalauréat by French authorities" reads as a likely conflation of the
FrancEducation label with actual homologation — flagged here as a probable overclaim in the
source material rather than repeated as fact, the same kind of correction this document already
made once for Germany/AMK eligibility in the earlier pass. Under france.md's own stated rule
(requires "preparing or holding a French or European Baccalauréat"), a school that does not
issue one most likely does not qualify — meaning an NDS graduate is most likely DAP-track, the
same as a Turkish MEB Lise Diploması holder, not Parcoursup-track.

**Galatasaray Lisesi — genuinely unresolved, and deliberately not forced into an answer.** The
most famous of the three, and the one with the least reliable evidence trail found this pass.
Search summaries claim a French-Turkish bilateral arrangement grants diploma equivalence and/or
direct French-university registration rights — but the two searches run this pass gave
**inconsistent treaty years** (1992 vs. 1952) for what may be two different agreements or one
misremembered by a source; the school's own French Wikipedia page, checked directly, **does not
corroborate any diploma-equivalency or French-admission claim at all** (it describes only the
1992 protocol establishing the integrated Galatasaray educational institution, with no mention
of French university admission); and the school's own official PDF profile could not be fetched
(SSL certificate error). Given Galatasaray is the single most likely of the four named schools to
come up by name in an actual product conversation, it would be worse to guess confidently wrong
here than anywhere else in this document — recorded as unresolved, not as a soft yes.

## The aggregate verdict — stated explicitly, not left to be totted up

**Not 4 of 4. Not a clean 2 of 4 either.** Forced into a per-country tally: Germany — yes, and
material. Austria — yes, and material, the cleanest evidence of the four. Italy — no, for the
question that actually carries stakes (the quota pool), though a softer yes for general
admission ease. France — **does not resolve to one country-level answer at all**: yes for one
named school (Saint-Joseph), no for another (Notre Dame de Sion), unresolved for the third and
most prominent (Galatasaray).

**That last fact is the real answer to the question CEO asked, and it argues against both of the
two options on the table.** A general "qualification issuing country determines pathway" rule
would be right for Germany and Austria, wrong for Italy's highest-stakes case, and — inside
France alone — right for one named school and wrong for another. **The grain this problem
actually lives at is per-*school*, not per-country.** CEO's own cheaper alternative ("the honest
shape is per-country facts rather than a resolver") is *also* one level too coarse: a per-country
fact for France would have to pick one answer and be wrong for at least one of the three schools
named in this same document. The closest existing precedent in `system-shape.ts` for a fact this
granular is `institutionOverrides` — but that mechanism is keyed on the *target* institution
being applied to, not the *origin* school the applicant's own qualification came from, so it
doesn't directly transfer without inverting which side of the query it reads. Whatever gets built
here, if anything does, needs to hold facts at the individual-school level, sourced and
maintained one school at a time the way `institutionOverrides` already is — not a general
country-level rule inferred from "this destination country recognizes its own diploma issued
abroad," which the France finding shows is not a safe inference even within one country.

## E. What the profile can't currently say — and a live trap this connects to directly

`types/database.ts`'s `CurriculumType` is `"ap" | "ib" | "a_level" | "turkish_curriculum" |
"national_curriculum" | "other"`. **There is no value for Abitur, maturità, baccalauréat, or
Matura.** A student at any of the six schools named in this document has exactly two honest
choices at onboarding: `national_curriculum` (wrong — erases the qualification entirely) or
`other` (loses the information just as completely). **Even if a per-school mechanism existed,
there is no field in the product today that could feed it a real answer.**

**This connects directly to a live trap in the requirements-evaluation system, checked live
against `oryn-qa-scratch` this pass, not assumed from the schema alone.** `requirement_category`
(the enum backing `university_requirements.requirement_type`) has a real `"curriculum"` value,
with real supporting code — `lib/requirements/evaluate.ts`'s `case "curriculum":` handler reads
a student's `facts.curricula` array and checks it against a structured rule's own
`rule.curricula` list (drawn from the same `CurriculumType` enum), returning `"not_met"` — a
confident, stated failure, not an honest "unknown" — when no match is found. **130 rows in
`university_requirements` are currently tagged `requirement_type = 'curriculum'`** (verified via
direct query) **— but zero of them have any `structured_rule` populated at all**, let alone one
shaped for this handler. The 130 are prose-only, presumably shown to students as read-only text;
the automated evaluator path itself has never actually run once in production data. **The day
someone writes the first real structured curriculum rule — for example, a German programme's
requirement expressed as "recognized foreign curriculum: A-Level or IB" — a Deutsche Schule
Istanbul Abitur holder, whose own `facts.curricula` can only ever contain `national_curriculum`
or `other` today, would be told `"not_met"` for a requirement they in fact satisfy.** Not a
future risk contingent on this document's own mechanism ever getting built — a trap that exists
today, independent of everything else here, and would fire the moment the dormant `"curriculum"`
rule path gets its first real row.

Two decisions this implies, neither made here: (1) whether `CurriculumType` should grow new
values for these qualifications specifically versus a more general "qualification earned abroad"
field; (2) whether onboarding should ask this at all given it only matters for a small subset of
students. Both are product/schema decisions — left to the founder, per CEO's explicit
instruction not to work around this rather than state it.

## F. The mechanism — a sketch, not a proposal ready to build

**The aggregate verdict above changes what this sketch should even look like.** A resolver keyed
on `qualificationIssuingCountry` (the shape sketched in the first pass of this document, after
only Germany and Italy) would already be wrong for France internally. The right-grained sketch,
if this is ever built, looks closer to a **per-origin-school fact list** — conceptually the
mirror image of `institutionOverrides`, keyed on the school the applicant's qualification came
from rather than the institution they're applying to — than a general country-level resolver
input.

**Still deliberately not built.** The reasons from the first pass still hold, and the aggregate
verdict adds a fourth: (1) §D means there is no real input data to resolve against regardless of
what gets built — restated, and now sharper, since it also blocks the *origin-school* shape just
as much as it blocked the *origin-country* shape; (2) a proper fix plausibly touches Turkey's own
shipped entry too; (3) the France finding specifically shows that even the cheaper "per-country
facts" fallback is the wrong grain, so there isn't yet a clearly-right small thing to build
instead of the resolver, either — building the *wrong-grained* cheap version would just relocate
the same mistake, not avoid it.

## Sources

- `docs/research/admissions-systems/turkey.md` §B — existing research (not written this pass),
  cited for the embassy-school/MOBİS/MEB-project exceptions and the schooling-location-not-
  citizenship finding.
- `docs/research/admissions-systems/france.md` §A — existing research (not written this pass),
  cited for the already-established Parcoursup/AEFE-network rule §D builds directly on.
- hochschulstart.de, "Internationale Bewerbende" — fetched directly 2026-09-03, primary
  confidence, for the Bildungsinländer definition quoted in §A.
- KMK/DIA recognition and Deutsche Schule Istanbul identity — search-summary sourced 2026-09-03,
  cross-corroborated across independent results, not independently primary-fetched from a single
  KMK page.
- Italian numero chiuso Medicine seat-allocation structure and the "equiparato" definition —
  search-summary sourced from MUR/MIM ministerial-decree coverage and a university's own
  admissions page, 2026-09-03; one primary decree PDF fetch blocked (HTTP 403).
- Liceo Italiano di Istanbul recognition status — search-summary sourced, 2026-09-03, not
  independently primary-fetched.
- bmeia.gv.at (Austrian Federal Ministry for European and International Affairs), St. Georgs-
  Kolleg Istanbul page — fetched directly 2026-09-03, primary confidence, for the statutory
  equal-status quote in §C.
- St. Georgs-Kolleg / Avusturya Lisesi identity and sister-school list — search-summary sourced
  (German/English Wikipedia), 2026-09-03, not independently primary-fetched.
- Saint-Joseph d'Istanbul homologation status — search-summary sourced, 2026-09-03, not
  independently primary-fetched from France Éducation internationale's own registry.
- Notre Dame de Sion Istanbul's AEFE/homologation/FrancEducation status — search-summary sourced,
  2026-09-03, not independently primary-fetched.
- Galatasaray Lisesi's French-equivalence claims — search-summary sourced with internally
  inconsistent dates (1992/1952); French Wikipedia checked directly and found not to corroborate
  the claim; the school's own PDF profile could not be fetched (SSL error). Recorded as
  unresolved specifically because the evidence trail did not hold up under a second check, not
  left unresolved for lack of trying.
- Live query against `oryn-qa-scratch`, `university_requirements` and `requirement_category` —
  every number in §E's "curriculum" rule-kind finding was run directly this pass, not estimated
  or relayed without verification.

## Unresolved questions

Germany: the exact current Ausländerquote size for NC subjects; dual-qualification election.
Italy: direct primary confirmation of "equiparato" and any scuole-italiane-all'estero carve-out.
Austria: independent confirmation of the MedAT-quota and non-EU-eligibility-step inferences
specifically, beyond the general equal-status statute; the current, exact statutory citation.
France: direct primary confirmation of Saint-Joseph's homologation status and Notre Dame de
Sion's FrancEducation-vs-homologation distinction; **Galatasaray's actual status, which needs a
real primary source (the 1992 protocol/décret text itself, or an official Galatasaray Üniversitesi
statement) before any product-facing claim should be made in either direction.** The profile-data
question in §E: which shape the founder prefers, and whether the dormant `"curriculum"`
requirement-rule trap should be addressed (a `facts.curricula`-empty-should-stay-`unknown`-not-
`not_met` guard, or a genuine equivalence table) independent of whether this document's own
per-school mechanism is ever built — the trap exists regardless.
