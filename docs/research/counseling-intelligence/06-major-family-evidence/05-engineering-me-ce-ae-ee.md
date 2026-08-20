# 06.05 — Engineering (Mechanical, Civil, Aerospace, Electrical)

Covers the mission's "mechanical engineering," "civil engineering," "aerospace engineering," and
"electrical engineering" raw fields as one family — grouped because they share a licensure
structure (the US Professional Engineer system, §6) and a common core (applied mathematics/physics,
design-build-test iteration) even though their day-to-day subject matter differs substantially.
Biomedical engineering is deliberately **not** included here — it has a distinct regulatory context
(medical-device regulation) important enough to warrant its own document, `06-biomedical-
engineering.md`. Onboarding anchor: **Engineering**.

## 1. Field identity and subfields

**Mechanical**: mechanics, thermodynamics, materials, design of physical systems/machines — the
broadest and most industry-general of the four. **Civil**: structural, geotechnical, transportation,
water-resources, and construction-management subfields; distinctive among the four for its direct
public-safety/infrastructure remit. **Aerospace**: aerodynamics, propulsion, structures, and
controls, specifically for aircraft/spacecraft — the most specialized-industry of the four.
**Electrical**: power systems, electronics, signal processing, and (increasingly) overlap with
computer engineering — the subfield with the most adjacent-family overlap (see §5). **RULE-COUNSEL-
043:** "Engineering" as a stated interest is at least as broad as "Computer Science" or "Biology" —
a student should be encouraged to sample more than one subfield's actual design/build activity
before narrowing, since these four subfields involve meaningfully different day-to-day work despite
sharing a common first-year curriculum in most university systems.

## 2. Core skills

Per BLS's occupational profiles across this cluster: applied mathematics and physics as a
foundation common to all four; for aerospace specifically, BLS names both design-oriented technical
skill and troubleshooting/problem-solving as an engineer moves from design intent to a working
system [S-BLS-ENG]. Beyond BLS: iterative design-build-test practice (common across all four,
directly the `execution_project_depth` construct from `01-development-taxonomy.md`'s section on
that dimension — a physical or simulated prototype that was actually built/tested is stronger evidence than a design
on paper alone), CAD/simulation tooling (already in `lib/vocabularies/skills.ts`'s suggestion list),
and, for civil specifically, an explicit orientation toward public safety and regulatory compliance
that the other three subfields don't share to the same degree.

## 3. Career families

Per BLS: civil engineering is projected to be "the largest engineering occupation" by number of new
jobs among the group, with mechanical/industrial engineering together accounting for roughly a
third of new engineering jobs, and aerospace engineering growth driven specifically by aircraft
redesign for efficiency, satellite-launch cost reduction, and small-satellite commercial viability
[S-BLS-ENG-GROWTH]. Beyond the named engineering-title roles themselves: engineering degrees in this
cluster are a common route into technical project/program management, technical sales/consulting,
patent law (as a technical background feeding into IP law — see the peer session's
`13-law-oriented-pathways.md`), and entrepreneurship in hardware/deep-tech ventures.
**Counter-stereotypical example:** electrical engineering is one of the more common undergraduate
backgrounds feeding into software/computing careers generally (signal processing and systems
thinking transfer directly), not only into traditionally "EE" roles — another concrete major≠career
illustration.

## 4. Exploration pathways by stage

**Phase 1:** an accessible build project (a simple mechanical/electronic build, introductory
robotics or CAD exposure), general physics/math coursework engagement.

**Phase 2:** a sustained build project with a working, tested result (this is the single strongest
evidence type across this whole family, per `01-development-taxonomy.md`'s `execution_project_depth`
section — a design sketch that was never built is materially weaker evidence than a smaller project that was actually
completed and tested); robotics competitions (demonstrate team-based design-build-test under
deadline pressure — structurally similar to a hackathon's evidence profile per
`02-opportunity-development-mapping.md`, but sustained over a season rather than a single event, so
it also carries commitment/duration evidence `hackathon` alone doesn't); a structured pre-college
engineering program; for civil/structural-leaning students specifically, a project engaging with a
real local infrastructure or design problem (even a modest one) is a distinctive, less-generic signal
than a purely theoretical exercise.

## 5. Interdisciplinary connections

**Electrical engineering + CS** (computer engineering, embedded systems, signal processing for
ML): see `01-computing-information-sciences.md`. **Mechanical/electrical engineering + design**
(product/industrial design, human factors): see the peer session's `16-architecture-design.md`.
**Any of the four + environmental science** (sustainable/environmental engineering, renewable
energy systems): see `09-environmental-science-sustainability.md`. **Mechanical/aerospace +
physics** (applied/theoretical mechanics): see `03-physical-sciences.md`.

## 6. Professional/licensure notes — genuinely important, country- and role-specific

**United States:** the Professional Engineer (PE) license is administered at the state level, but
the exam sequence is standardized nationally by NCEES (National Council of Examiners for
Engineering and Surveying) and requires, per NSPE (National Society of Professional Engineers): a
four-year engineering degree from a state-board-approved program, passing the **Fundamentals of
Engineering (FE)** exam (typically taken at or near graduation), four years of qualifying
engineering experience under a licensed PE's supervision, and then passing the **Principles and
Practice of Engineering (PE)** exam [S-NSPE-PE]. **RULE-COUNSEL-044:** licensure necessity varies
substantially *by role and industry*, not just by subfield — civil engineers who stamp/seal plans
for public infrastructure are the clearest case where PE licensure is a practical necessity to
practice independently; many mechanical, electrical, and aerospace engineers working inside large
private companies (especially aerospace/defense and tech-adjacent electrical roles) practice for an
entire career without a PE license, since the legal requirement generally attaches to *offering
engineering services directly to the public* rather than to the job title itself. **This package
does not have a verified, complete breakdown of exactly which roles require it** — a specific
student's situation should be checked against their target industry/employer expectations, not
inferred from subfield alone.

**United Kingdom** (verified in a follow-up research pass, superseding this document's earlier
"not independently verified" flag): the analogous credential is **Chartered Engineer (CEng)**,
administered by the **Engineering Council** through a network of licensed professional
institutions specific to subfield (e.g., the IET for electrical/electronic, the ICE for civil, the
IMechE for mechanical, the RAeS for aerospace). Per the UK-SPEC (UK Standard for Professional
Engineering Competence), the "traditional" academic route requires an accredited integrated
Master of Engineering (MEng), or an accredited bachelor's plus an accredited master's (or
equivalent further learning), followed by demonstrated professional competence built over several
years of postgraduate practice and assessed via professional review — **not exam-sequence-based
the way the US PE system is**, a structural difference worth stating plainly rather than assuming
the two systems merely use different names for the same process [S-CENG]. A non-standard/
experiential route exists for those without the accredited-degree route. As in the US, **chartered
status is not a universal requirement to work as an engineer in the UK** — it is a career
progression/recognition marker, most consequential for civil/structural roles and for senior
positions generally, not a gate on entering the profession itself.

**Turkey** (verified in a follow-up pass): Turkey has its own genuinely distinct,
**legally-mandated title-protection system** — under Law No. 3458 (Engineering and Architecture
Law) and the constitutionally-recognized **TMMOB** (Türk Mühendis ve Mimar Odaları Birliği / Union
of Chambers of Turkish Engineers and Architects, established 1954, organized into 24 discipline-
specific chambers with over 700,000 members as of the most recent figures found), engineers and
architects must register with their discipline's chamber to practice work requiring the
profession and may not use a professional title other than the one they are legally entitled to
[S-TMMOB]. **RULE-COUNSEL-061 (new):** this is structurally distinct from both the US (voluntary-
until-triggered-by-specific-practice PE licensure) and UK (institution-administered chartered
status layered on top of a base, unrestricted right to practice) systems — Turkey's chamber
registration is a more general, title-level gate closer to (though not identical to) medicine/law-
style licensure elsewhere in this package. A Turkey-target student should not have the US/UK
framing above applied to them by default. Separately, İŞKUR's official "Geleceğin Meslekleri"
future-occupations list (see `01-computing-information-sciences.md` §7) independently names
**İnşaat Mühendisi** (Civil), **Elektrik Elektronik Mühendisi** and **Elektrik Mühendisi**
(Electrical), **Makine Mühendisi** (Mechanical), **Mekatronik Mühendisi** (Mechatronics),
**Telekomünikasyon Mühendisi** (Telecommunications), **Harita Mühendisi** (Geomatics/Surveying),
and **Maden Mühendisi** (Mining) among its 93 entries [S-ISKUR-FUTURE] — aerospace engineering
specifically does not appear by name (plausibly reflecting Turkey's much smaller aerospace-industry
base relative to the US, though this document does not have direct evidence for that inference —
flagged as an inference, not a sourced fact).

**EU:** engineering licensure/chartership is not EU-wide; it runs through each member state's own
system (sometimes mutually recognized via EU professional-qualification directives) — not
independently mapped per-country in this pass beyond the UK detail above (noting the UK's own
system now sits outside the EU framework post-Brexit in any case). ESCO's occupation classification
still covers engineering occupations for taxonomy/skills-matching purposes across EU languages
[S-ESCO] independent of any national licensure question.

## Sources referenced in this document

| ID | Source | Type | Confidence | Used for |
|---|---|---|---|---|
| S-BLS-ENG | [BLS Career Outlook — Engineers: Employment, pay, and outlook](https://blsmon1.bls.gov/careeroutlook/2018/article/print/engineers.htm), [BLS OOH — Aerospace Engineering and Operations Technologists and Technicians](https://www.bls.gov/ooh/architecture-and-engineering/aerospace-engineering-and-operations-technicians.htm) | Official (US BLS) | High for skills framing; the Career Outlook article's publication date (2018) predates the growth figures below — treat the two S-BLS-ENG* sources as different vintages, not one consistent snapshot | §2 |
| S-BLS-ENG-GROWTH | [BLS OOH — Mechanical Engineers](https://www.bls.gov/ooh/architecture-and-engineering/mechanical-engineers.htm), [BLS OOH — Aerospace Engineers](https://www.bls.gov/ooh/architecture-and-engineering/aerospace-engineers.htm), [BLS OOH — Architecture and Engineering Occupations overview](https://www.bls.gov/ooh/architecture-and-engineering/) | Official (US BLS), current 2024-2034 cycle per search results | High (US-specific) | §3 |
| S-NSPE-PE | [NSPE — How To Get Licensed](https://www.nspe.org/about/about-professional-engineering/how-get-licensed), [NSPE — What Is a PE?](https://www.nspe.org/about/about-professional-engineering/what-pe), [NCEES — Exams](https://ncees.org/exams/) | Official (National Society of Professional Engineers; NCEES, the exam administrator every US state uses) | High for the US process | §6 |
| S-CENG | [Engineering Council / IET — Becoming a Chartered Engineer (CEng)](https://www.theiet.org/career/professional-registration/chartered-engineer), [Engineering Council — Chartered Engineer (CEng)](https://www.engc.org.uk/professional-registration/our-professional-titles/chartered-engineer-ceng) | Official (UK Engineering Council and its licensed member institutions) | High (UK-specific) | §6 |
| S-TMMOB | [TMMOB official site](https://www.tmmob.org.tr/), [Law No. 6235 (TMMOB's founding law)](http://www.tmmob.org.tr/hukuk/yasal-cerceve/6235-sayili-turk-muhendis-ve-mimar-odalari-birligi-kanunu) | Official (Turkish state-recognized professional body, constitutionally referenced) | High (Turkey-specific) | §6 |
| S-ESCO | ESCO classification (see `01-computing-information-sciences.md` §7) | Official (EU) | High for classification structure | §6 |
| S-ISKUR-FUTURE | İŞKUR Geleceğin Meslekleri (see `01-computing-information-sciences.md` §7) | Official (Turkey) | High for the document; names 7 of this family's subfields, not aerospace | §6 |

US, UK, and Turkey engineering-licensure structures now verified and sourced above (a correction
from this document's earlier draft, which had flagged UK/Turkey as unverified). EU-wide licensure
remains a member-state-by-member-state question not fully mapped in this pass.
