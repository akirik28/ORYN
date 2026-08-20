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
directly the `execution_project_depth` construct from `01-development-taxonomy.md` §2.9 — a
physical or simulated prototype that was actually built/tested is stronger evidence than a design
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
evidence type across this whole family, per `01-development-taxonomy.md` §2.9 — a design sketch
that was never built is materially weaker evidence than a smaller project that was actually
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
inferred from subfield alone. **Outside the US**, engineering licensure/chartered-status structures
differ by country (e.g., Chartered Engineer status via the UK's Engineering Council, through a
professional institution such as the IET or ICE) — **not independently verified in this research
pass**; flagged in `10-open-questions.md` rather than assumed equivalent to the US PE structure.

## Sources referenced in this document

| ID | Source | Type | Confidence | Used for |
|---|---|---|---|---|
| S-BLS-ENG | [BLS Career Outlook — Engineers: Employment, pay, and outlook](https://blsmon1.bls.gov/careeroutlook/2018/article/print/engineers.htm), [BLS OOH — Aerospace Engineering and Operations Technologists and Technicians](https://www.bls.gov/ooh/architecture-and-engineering/aerospace-engineering-and-operations-technicians.htm) | Official (US BLS) | High for skills framing; the Career Outlook article's publication date (2018) predates the growth figures below — treat the two S-BLS-ENG* sources as different vintages, not one consistent snapshot | §2 |
| S-BLS-ENG-GROWTH | [BLS OOH — Mechanical Engineers](https://www.bls.gov/ooh/architecture-and-engineering/mechanical-engineers.htm), [BLS OOH — Aerospace Engineers](https://www.bls.gov/ooh/architecture-and-engineering/aerospace-engineers.htm), [BLS OOH — Architecture and Engineering Occupations overview](https://www.bls.gov/ooh/architecture-and-engineering/) | Official (US BLS), current 2024-2034 cycle per search results | High (US-specific) | §3 |
| S-NSPE-PE | [NSPE — How To Get Licensed](https://www.nspe.org/about/about-professional-engineering/how-get-licensed), [NSPE — What Is a PE?](https://www.nspe.org/about/about-professional-engineering/what-pe), [NCEES — Exams](https://ncees.org/exams/) | Official (National Society of Professional Engineers; NCEES, the exam administrator every US state uses) | High for the US process; explicitly not verified for non-US jurisdictions | §6 |

US-specific labor-market and licensure data throughout. UK/EU/Turkey engineering licensure/
chartership structures not independently verified this pass (flagged in `10-open-questions.md`).
