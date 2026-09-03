# A Turkish resident with a foreign country's own qualification — does the pathway change?

**Status: research findings for two of four named countries, plus an architecture sketch —
nothing implemented.** Written 2026-09-03, triggered by the founder directly: *"Türkiye'de
Fransız ve Alman okullarında farklı sistemler var, onların da farkında olsun uygulama, İtalyan
lisesi var"* ("There are different systems at the French and German schools in Turkey, the
product should be aware of them too, there's the Italian lisesi"). Scoped by CEO to start with
Germany and Italy specifically — France and Austria are named by the founder but **not
researched this pass**, deliberately, not an oversight.

## The question, precisely

`lib/admissions/system-shape.ts`'s `pathway` (`domestic` | `international`) is resolved from
`profiles.country` alone — **residence/school location**, per that field's own documented
meaning (`resolvePathway`, `system-shape.ts`). Turkey has several schools whose students earn
another country's own secondary-leaving qualification while living in Turkey: Deutsche Schule
Istanbul / İstanbul Alman Lisesi (German Abitur, including its Deutsches Internationales Abitur
variant), Liceo Italiano di Istanbul / İtalyan Lisesi (Italian maturità), Galatasaray Lisesi and
Saint-Joseph (French-track curricula, presumably toward a baccalauréat or an équivalence), and
Avusturya Lisesi (Austrian). If a destination country treats its own qualification, earned
abroad at a recognized school, as equivalent to earning it domestically for **admissions
purposes specifically** — not just cultural/linguistic recognition — then a Turkish citizen
holding one of these can be on the wrong side of the registry's domestic/international split
today, and the registry would currently tell them the wrong thing.

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
(residence) at all, the identical limitation this document is about to describe for Germany and
Italy. **Germany and Turkey turn out to be two instances of one structural gap, not a Germany-
specific curiosity**: Turkey's is "a foreign curriculum delivered *inside* the target country
mostly doesn't change the pathway" (narrow named exceptions aside); Germany's is "the target
country's *own* qualification, delivered *outside* it, does change the pathway" (see §A). Opposite
directions, same missing dimension — residence alone answers neither correctly. Not fixing
Turkey's own entry here — out of scope for what was asked this pass — but flagging it plainly
rather than treating Germany as the first or only case.

**The two countries researched fresh this pass do not answer the same way either.** That's the
finding §A and §B below walk through.

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
  real, KMK-recognized qualification. (Its Wikipedia-sourced profile also notes many students
  receive the Turkish Lise Diploması *in addition to* pursuing the DIA — the two are not
  mutually exclusive, which matters for how the product should ask about this; see §D.)
- A secondary but repeatedly-corroborated framing (DAAD-adjacent guidance, not independently
  primary-fetched this pass): "An Abitur from one of more than 140 German Schools abroad is
  recognized for German higher education... If you have the German Abitur, you are classified
  as a Bildungsinländer" — consistent with, not contradicting, the two primary sources above.

**Why this is the highest-stakes case, as CEO framed it:** Germany is the one country in this
registry whose Medicine/Pharmacy/Veterinary/Dentistry field override is a genuine, nationally
quota-allocated `academic_rank_competitive` mechanism (hochschulstart.de's NC system) with a
separately-sized pool for international applicants (an Ausländerquote, commonly cited around
8% of NC seats, not independently re-confirmed this pass) versus the much larger Bildungsinländer
pool competing on the same terms as German nationals. **Today, a Turkish MEB-diploma-holding
applicant and a Deutsche-Schule-Istanbul Abitur/DIA-holding applicant targeting German Medicine
receive the identical `international` pathway and mechanism text from this registry — and per
the sources above, they should not.** The shape (`academic_rank_competitive`) doesn't change;
which pool the applicant actually competes in does, and that is exactly the kind of "you'd tell
a real student the wrong thing" gap this registry exists to close.

**Not confirmed this pass:** the exact current size/existence of a Germany-wide Ausländerquote
percentage for NC subjects (cited from memory/secondary framing, not independently primary-
sourced); whether a student who holds *both* a Turkish Lise Diploması and a DIA (the Deutsche
Schule Istanbul pattern) can choose which qualification to present, or whether Bildungsinländer
status is automatic once a qualifying HZB exists regardless of also holding a second, non-German
one; state-quota mechanics beyond hochschulstart's own summary language.

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
Italian students." This is a real, plausible, but not independently primary-source-fetched
finding this pass (search-summary sourced; the school's or MIUR's own page was not directly
fetched) — held to medium rather than high confidence pending a direct fetch.

**Does the same diploma move the holder out of the separate "non-EU resident abroad" reserved
quota for numero chiuso programmes (Medicine, Dentistry, Veterinary)? No evidence found that it
does — and the general rule, checked from two independent angles, points the other way.**
Official-decree-sourced framing (MUR/MIM ministerial decrees on Medicine seat allocation,
matching language across a university's own admissions page): seats are split three ways —
EU candidates, non-EU candidates "equiparati" (treated as equivalent), and non-EU candidates
*resident abroad* — with the reserved abroad-quota's unused seats flowing to the other two
pools, not the reverse. **"Equiparato" status itself is defined by residence, not by the
diploma's issuing authority**: one university's own admissions page states non-EU equiparati
are those "regularly resident in Italy for at least one year" and holding "a secondary school
diploma obtained in Italy." A Liceo Italiano di Istanbul graduate living in Istanbul satisfies
neither condition — the diploma is Italian, but it was not obtained *in Italy*, and the student
is not resident *in Italy*. **No explicit carve-out for graduates of scuole italiane all'estero
was found in any source checked this pass, in either direction** — this is an absence, not a
confirmed exclusion; a primary ministerial decree text could not be fetched directly (403 on
the one PDF attempted) to settle it beyond this inference from the general rule.

**Net finding for Italy: general/open admission plausibly gets easier (skips a recognition
step); numero chiuso admission — the Medicine case specifically — most likely does not change
pools, unlike Germany.** This is the country-to-country divergence CEO said to expect and
report plainly rather than assume away in either direction.

## C. France and Austria — not researched this pass

The founder named both. CEO's sequencing was explicit: start with German and Italian. Galatasaray
Lisesi, Saint-Joseph, and Avusturya Lisesi are real, known schools with a real analogous
question (does a French-track diploma or an Austrian Matura earned in Turkey route a holder
through France's or Austria's own domestic-equivalent pathway) — genuinely open, not assumed to
answer like Germany's or like Italy's. Flagged as the natural continuation, not started.

## D. What the profile can't currently say (founder decision, not worked around)

`types/database.ts`'s `CurriculumType` is `"ap" | "ib" | "a_level" | "turkish_curriculum" |
"national_curriculum" | "other"`. **There is no value for Abitur, maturità, baccalauréat, or
Matura.** A student at Deutsche Schule Istanbul today has exactly two honest choices at
onboarding: `national_curriculum` (wrong — erases the German-qualification fact entirely) or
`other` (loses the information just as completely, since `other` carries no further structured
detail anywhere this registry's resolver could read). **Even if the mechanism in §E were fully
built, there is no field in the product today that could feed it a real answer for this case.**

This is stated here, not silently worked around, per CEO's explicit instruction. Two decisions
this implies, neither made here: (1) whether `CurriculumType` should grow new values for these
qualifications specifically (a narrow, additive enum change) versus a more general "qualification
country/type earned abroad" field that could scale past four hardcoded values as more schools are
found; (2) whether onboarding should ask this at all given it only matters for a small subset of
students, versus a later profile-editing surface. Both are product/schema decisions, not
research findings — left to the founder.

## E. The mechanism — a sketch, not a proposal ready to build

**Read from Germany's finding specifically, since it's the only one confirmed material so far:**
this is not well modeled as a new axis parallel to `subdivisions` (which classifies the
*institution*). It is better modeled as a **correction to how `pathway` itself gets resolved** —
today `resolvePathway` reads only `studentCountry` (residence); Germany's finding says the real
determinant, at least there, is **where the qualification was earned and by whom it's issued**,
which can diverge from residence. Concretely, that could look like `AdmissionSystemQuery`
gaining an optional field distinct from `studentCountry` — something like
`qualificationIssuingCountry` — that `resolvePathway` checks first where a registry entry
declares it matters (Germany would; whether Italy's *general* threshold question also wants this
field is a smaller, separate question from whether the *quota-pool* question does, per §B).

**Deliberately not built, even though the two-independent-instances bar is now met.** Counting
Turkey's own already-researched, never-wired finding alongside Germany's, this is arguably at
the same evidentiary point `subdivision-key-proposal.md` was at when it got written up as a real
proposal after Belgium and Finland. Three reasons this still stays a sketch rather than a
proposal doc, not a confidence gap: (1) France and Austria could change the shape of what's
actually needed — a France-shaped answer might look nothing like Germany's Bildungsinländer
concept, and building around two data points when a third and fourth are one country-check away
risks the same "assumed a shared shape" mistake CEO has repeatedly warned against this session;
(2) fixing this properly plausibly touches Turkey's own shipped entry too, not just adding new
countries — a materially larger, riskier change than adding a subdivision, and not something to
scope casually inside a "sketch"; (3) §D means there is no real input data to resolve against
yet regardless of what gets built in `system-shape.ts` — building the resolver before the data
model can hold the answer is exactly the "worked around instead of stated" outcome CEO said not
to produce.

## Sources

- `docs/research/admissions-systems/turkey.md` §B — existing research (not written this pass),
  cited for the embassy-school/MOBİS/MEB-project exceptions and the schooling-location-not-
  citizenship finding described above.
- hochschulstart.de, "Internationale Bewerbende" — `https://www.hochschulstart.de/informieren-planen/internationale-bewerbende`
  — fetched directly 2026-09-03, primary confidence, for the Bildungsinländer definition and
  quota-placement language quoted in §A.
- KMK (Kultusministerkonferenz) and general web search corroboration on the Deutsche Internationale
  Abiturprüfung (DIA) — search-summary sourced 2026-09-03, not independently re-fetched from a
  single KMK page (one direct KMK fetch attempted resolved to the wrong page,
  Fachhochschulreife rather than Abitur); medium-high confidence given cross-corroboration across
  independent search results rather than one source.
- Deutsche Schule Istanbul / İstanbul Alman Lisesi identity and KMK-authorization-to-examine
  history — search-summary sourced (Wikipedia, PASCH-Initiative, doris.school), 2026-09-03, not
  independently primary-fetched.
- Italian numero chiuso Medicine seat-allocation structure (EU / non-EU equiparati / non-EU
  resident-abroad, and the residence-plus-Italy-obtained-diploma definition of "equiparato") —
  search-summary sourced from MUR/MIM ministerial-decree coverage and a university's own
  admissions-office page, 2026-09-03; one direct ministerial-decree PDF fetch attempted and
  blocked (HTTP 403), not independently re-verified against primary decree text.
- Liceo Italiano di Istanbul / İtalyan Lisesi (Liceo Scientifico Italiano I.M.I.) recognition
  status — search-summary sourced (Turkish Wikipedia, English Wikipedia, Turkish
  education-consultancy sites), 2026-09-03, not independently primary-fetched from the school's
  own or MIUR's own page.

## Unresolved questions

Germany: the exact current Ausländerquote size for NC subjects; whether a dual Turkish-Lise/DIA
holder can elect which qualification to present, or whether Bildungsinländer status is automatic
once a qualifying HZB exists. Italy: direct primary confirmation (a fetchable ministerial decree
or MIUR page) of the "equiparato" definition and whether any explicit scuole-italiane-all'estero
carve-out exists, in either direction; whether the general-admission recognition-skip finding
holds beyond the one school checked. France and Austria: not started. The profile-data question
in §D: which of the two shapes (narrow enum addition vs. general field) the founder prefers, and
whether it's worth building before more countries are checked.
