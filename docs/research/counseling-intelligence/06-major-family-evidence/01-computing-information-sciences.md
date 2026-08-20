# 06.01 — Computing & Information Sciences

Covers the mission's "computer science," "software engineering," "data science," and "artificial
intelligence" raw fields as one family (they share most of their skill base and exploration
pathways; where they diverge — e.g., data science leaning more statistical, AI/ML research leaning
more mathematical — this is noted inline rather than split into separate documents, consistent
with `00-family-taxonomy.md`'s grouping rationale). Onboarding anchor: **Computer Science**.

## 1. Field identity and subfields

Computing spans a genuine range from theoretical (algorithms, computational complexity) to applied
(software engineering, systems) to interdisciplinary (data science, AI/ML, computational biology,
human-computer interaction, cybersecurity). **RULE-COUNSEL-037:** treat "Computer Science" as an
umbrella, not a single skill — a student drawn to competitive-programming-style algorithmic puzzle
solving and a student drawn to building and shipping user-facing products are both legitimately
"interested in CS" but are developing measurably different things, mirroring exactly the
sub-type-heterogeneity problem `02-opportunity-development-mapping.md` already documents for the
`competition`/`hackathon` categories. Named subfields worth distinguishing in counseling
conversations: software engineering (building maintainable systems), data science (extracting
insight from data, statistics-heavy), machine learning/AI (building and training models,
mathematics-heavy), cybersecurity (attack/defense of systems), human-computer interaction
(designing usable interfaces, design-adjacent), and computer science theory/research (algorithms,
complexity, formal methods).

## 2. Core skills (grounded, not universally asserted)

Per O*NET's occupational profiles for **Computer and Information Research Scientists** (15-1221.00)
and **Software Developers** (15-1252.00): quantitative reasoning (the profile explicitly lists
knowledge of "arithmetic, algebra, geometry, calculus, statistics, and their applications" as
important), inductive and deductive reasoning, and — notably, and often underweighted by students —
written and oral communication ("must communicate well with programmers and managers and be able to
clearly explain their conclusions to people with no technical background") [S-ONET-CS]. This
communication requirement is worth surfacing explicitly to students who assume CS is a purely
technical field. Beyond the O*NET profile: programming languages (breadth across a few, depth in
at least one, per `lib/vocabularies/skills.ts`'s own suggestion list which already includes Python/
JavaScript/TypeScript/Java/C++/SQL), systems thinking, and — for the ML/AI subfield specifically —
linear algebra and statistics as genuine prerequisites, not optional extras.

**Do not invent a universal requirement.** Per the mission's own caution, not every computing career
requires deep mathematics (product-focused software engineering leans more on systems design and
communication) and not every path requires extensive prior programming experience before university
(many students start CS coursework with no prior exposure) — this family's exploration pathways
below are for *testing interest and building initial evidence*, not a claimed prerequisite ladder.

## 3. Career families (illustrative, not exhaustive — per mission's "no job-title spam")

Per BLS's Occupational Outlook Handbook overview for Computer and Information Technology
occupations: this occupational group is large and growing much faster than average (BLS projects
about 317,700 average annual openings from growth and replacement combined), with demand drivers
named explicitly as cloud computing, big data, information security, and AI/e-commerce growth
[S-BLS-CIT]. Illustrative career families (not a ranked or exhaustive list): software engineering
(product/platform/infrastructure), data science and analytics, machine learning/AI research and
applied ML engineering, cybersecurity/information security, systems/network architecture,
human-computer interaction and product design, and computational research within another field
entirely (see §5 interdisciplinary — this is the "CS as a tool for X" path, not a CS career per se).

**Counter-stereotypical example (major≠career, per `00-family-taxonomy.md` §5.1):** a CS degree is
also a common, well-trodden path into quantitative finance/trading (algorithmic trading systems),
product management (technical PM roles), and entrepreneurship generally — not only "becomes a
software engineer." Conversely, software engineering roles are regularly filled by graduates of
mathematics, physics, and engineering degrees with no formal CS major at all — the major↔career
relationship here is genuinely many-to-many in both directions, not a pipeline.

## 4. Exploration pathways by stage (cross-referencing `03-recommendation-timing.md`'s two-phase model)

**Phase 1 (exploration, ~4–3 years from graduation):** an introductory personal project (even
small — a script, a simple website, a small game); a beginner-friendly online course; trying more
than one subfield lightly (a data-analysis mini-project *and* a small web app, not committing to one
yet) — this breadth is appropriate and should not be read as unfocused at this stage.

**Phase 2 (deepening, ~2–1 years from graduation):** a sustained project with real scope (something
that took more than a few weekends, ideally with a live demo/repo — directly the
`execution_project_depth` evidence pattern from `01-development-taxonomy.md`'s section on that
dimension); contributing to
an existing open-source project (a genuinely differentiated signal from a solo-only project,
because it demonstrates working within someone else's codebase/constraints and, often, code review);
competitive programming (USACO, national/international informatics olympiads) *specifically*
demonstrates algorithmic/mathematical problem-solving under constraints — **this is a different
skill from software-development capability and should not be treated as interchangeable evidence
for it**, directly the distinction the mission brief itself calls out ("this competition provides
algorithmic problem-solving evidence rather than software-development evidence"). A hackathon
demonstrates rapid-build/teamwork capability under time pressure — again a distinct skill from
either of the above two. **RULE-COUNSEL-038:** when counseling a CS-interested student, distinguish
at least these three evidence types (sustained build, algorithmic competition, time-boxed
hackathon/team build) rather than treating "did something CS-related" as one undifferentiated
signal — this is the concrete, field-specific instance of the general principle
`02-opportunity-development-mapping.md` raises abstractly.

## 5. Interdisciplinary connections (per `00-family-taxonomy.md` §6)

**CS + biology** (computational biology/bioinformatics): a student interested in both should be
pointed toward projects/programs that combine data analysis with a real biological question, not
treated as needing to choose one field prematurely — see `04-life-sciences.md` for the reciprocal
framing. **CS + economics** (computational social science, algorithmic market analysis): a project
analyzing real economic/social data with code is stronger combined evidence than either a pure-CS
or pure-econ project alone for a student with this specific interest combination — see
`07-economics-finance.md`. **AI + medicine**: relevant to a student interested in clinical machine
learning — see `10-medicine-clinical-pathways.md` (peer-authored) for the reciprocal note; this
document flags it here so the connection isn't lost if that document is drafted independently.
**CS + law** (tech policy, intellectual-property/patent law involving software): a student drawn to
both should be pointed toward projects/exploration that engage the actual policy or legal question
directly (e.g., analyzing a real tech-regulation debate, or a mock-legal exercise involving a real
software/IP scenario) rather than treating the two interests as requiring an early either/or choice
— see the peer session's `13-law-oriented-pathways.md` for the reciprocal framing (this combination
is also named from the engineering side in `05-engineering-me-ce-ae-ee.md` §3, via the technical-
background-into-patent-law pathway). **CS + business** (product management, tech
entrepreneurship): see `08-business-management-entrepreneurship.md` §5 for the reciprocal framing —
a technical project with a real user/customer angle (not just working code) is the strongest
combined evidence for this specific interest pair. (Both this entry and the CS + law entry above
were found missing from this document during this session's own cross-reference audit against
`00-family-taxonomy.md` §6, which lists both combinations as belonging in "both family docs" —
fixed here rather than left as a silent gap.)

## 6. Professional/licensure notes

**No general licensure requirement** for software engineering or data science roles in the
countries ORYN currently targets (USA/UK/Europe/Turkey) — unlike medicine, law, or engineering-PE
tracks, this field has no universal credentialing gate. Certain narrow sub-areas (e.g., safety-
critical embedded systems, or roles explicitly requiring a Professional Engineer license in some
US states for "software engineer" as a legally protected title in a small number of jurisdictions)
are real but narrow exceptions, not the general case — flagged here for completeness, not elaborated
further given how small a fraction of the field this affects.

## 7. Country notes (UK / EU / Turkey)

**United Kingdom:** the UK government's own **National Careers Service** (nationalcareers.service.gov.uk,
run by the Department for Education) publishes official job profiles — including qualifications,
typical salary bands, and progression — for this family's roles (app developer, web developer,
computer games developer, and the broader "computing, technology and digital" job category)
[S-NCS-UK]. **RULE-COUNSEL-060 (new):** where a UK-facing student needs career-outlook grounding,
prefer National Careers Service job profiles over BLS/O*NET — they are the UK's own official
equivalent, not a secondary source, and salary/qualification framing does not transfer across
countries even when the occupation name is identical. No licensure gate applies to this family in
the UK, matching the US picture in §6.

**EU:** the European Commission's **ESCO** (European Skills, Competences, Qualifications and
Occupations, esco.ec.europa.eu) classification covers this family's occupations across all EU
languages, describing roughly 3,000 occupations and close to 14,000 linked skills, explicitly built
to support cross-border job/training matching within the EU [S-ESCO]. ESCO is a *classification*
(a structured vocabulary), not a narrative careers-guidance site like NCS or BLS's Occupational
Outlook Handbook — useful for this package's taxonomy purposes but not a source of growth/salary
narrative the way BLS/NCS are. No EU-wide licensure gate applies to this family.

**Turkey (updated in a follow-up research pass — official source found):** İŞKUR's own
"Geleceğin Meslekleri" ("Occupations of the Future") report explicitly lists **Yazılım Mühendisi**
(Software Engineer), **Bilgisayar Mühendisi** (Computer Engineer), **Yapay Zeka Uzmanı** (AI
Specialist), **Büyük Veri Analisti** (Big Data Analyst), **Veri Analisti** (Data Analyst),
**Bilgi Güvenliği Uzmanı** (Information Security Specialist), **Siber Güvenlik Personelleri**
(Cybersecurity Personnel), and **Robotik Kodlama Uzmanı** (Robotics/Coding Specialist) among its
93 named future-oriented occupations [S-ISKUR-FUTURE] — direct, official Turkish government
confirmation that this family is recognized as a growth area, independent of the BLS/O*NET/NCS/ESCO
sources above. This document does not itself give skills/salary detail per occupation (it is a
named list, not a narrative profile page the way NCS/BLS are) — Turkey's more detailed occupational-
information infrastructure (İŞKUR's Meslek Bilgi Sistemi, YÖK Atlas's Meslek Atlası, and MYK's —
Mesleki Yeterlilik Kurumu, the official vocational-qualifications authority — occupational
standards, which include a real "Yazılım Geliştirici" (Software Developer) Level-4 standard
document) exists and is confirmed genuinely official, but this pass could not reliably extract full
text from those specific documents (PDF/JS-rendering access issues, not a claim that the content
doesn't exist) — see `10-open-questions.md` for the remaining gap. No licensure gate is believed to apply to this family in Turkey (software
engineering is not among the title-protected professions under Turkey's engineering-title law,
Law No. 3458 — see `05-engineering-me-ce-ae-ee.md` §6 for that law's actual scope), but this specific
negative claim was not independently verified against Turkish law for this family and should be
treated as a reasonable inference, not a sourced fact.

## Sources referenced in this document

| ID | Source | Type | Confidence | Used for |
|---|---|---|---|---|
| S-ONET-CS | [O*NET Computer and Information Research Scientists (15-1221.00)](https://www.onetonline.org/link/summary/15-1221.00), [O*NET Software Developers (15-1252.00)](https://www.onetonline.org/link/summary/15-1252.00) | Official (US Dept. of Labor-sponsored occupational database) | High | §2 core skills |
| S-BLS-CIT | [BLS Occupational Outlook Handbook — Computer and Information Technology Occupations](https://www.bls.gov/ooh/computer-and-information-technology/), [Computer and Information Research Scientists](https://www.bls.gov/ooh/computer-and-information-technology/computer-and-information-research-scientists.htm) | Official (US Bureau of Labor Statistics) | High — US-specific; not assumed to generalize internationally (mission's own caution against mixing national labor statistics) | §3 career families, growth/demand framing |
| S-NCS-UK | [National Careers Service — App developer](https://nationalcareers.service.gov.uk/job-profiles/app-developer), [Web developer](https://nationalcareers.service.gov.uk/job-profiles/web-developer), [Computer games developer](https://nationalcareers.service.gov.uk/job-profiles/computer-games-developer), [All careers in digital](https://nationalcareers.service.gov.uk/explore-careers/job-sector/digital/view-all-sector-careers) | Official (UK Department for Education-run public service) | High (UK-specific) | §7 |
| S-ESCO | [ESCO — What is ESCO](https://esco.ec.europa.eu/en/about-esco/what-esco), [ESCO Occupations classification](https://esco.ec.europa.eu/en/classification/occupation_main) | Official (European Commission) | High for the classification's existence/structure; not a narrative careers-guidance source | §7 |
| S-ISKUR-FUTURE | [İŞKUR — Geleceğin Meslekleri (Occupations of the Future)](https://statik.iskur.gov.tr/docs/gelecegin-meslekleri.pdf) | Official (Turkish Employment Agency / Türkiye İş Kurumu) | High for the document's authenticity and content (fetched and read directly); the document is a named list without per-occupation skill/salary detail | §7 |

US/UK/EU data points as tabled above; Turkey computing-career sourcing partially strengthened
(official future-occupations list confirms the field's recognized growth status) but still lacks a
detailed official profile source — flagged in `10-open-questions.md` as remaining work.
