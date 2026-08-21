# ORYN — Prompt Archive

Permanent record of the actual instructions given to every Claude session working on ORYN.
Purpose: the founder should never have to reconstruct "what was this lane told to do?" from a
branch name or a commit message again.

**Provenance rules for this file:**
- `VERBATIM` = the session sent its literal original prompt text.
- `RECONSTRUCTED` = the session's context was compacted and the original text was lost; what
  survived is recorded, explicitly labeled, and must not be treated as exact wording.
- `NOT COLLECTED` = the session declined, was unreachable, or the prompt lives elsewhere.

Two sessions initially declined to relay their briefs through an intermediary, on the grounds
that they could not verify a relayed authority claim and that their instructions were the
founder's content to share rather than theirs. **Both refusals were correct and were not
pressed.** They were resolved after the founder confirmed the coordination role directly.

Collected 2026-08-21 by the Organization Leader session.

---

## 0. Standing project-wide instructions (already in the repo)

| Source | What it is |
|---|---|
| `AGENTS.md` | The original 80-phase founder build prompt, verbatim. The master specification. |
| `CLAUDE.md` | Points at `AGENTS.md`. |
| `docs/MASTER-EXECUTION-STRATEGY.md` | Canonical execution/operating strategy, reset 2026-08-20. |
| `docs/ORYN_WORKSTREAMS.md` | Live ownership map — who owns what, right now. |

These are already permanent and are not reproduced here.

---

## 1. University & Program Intelligence — `VERBATIM`

- **Session:** `70239` · **Branch:** `oryn/programs-pipeline-reconciled`
- **Worktree:** `.claude/worktrees/programs-pipeline-night`
- **Delivery:** fired repeatedly via `/loop` dynamic-wakeup; text re-passed unchanged each time.
- **Output:** 4,048 program records, 53 universities, 6 countries (29 batches); 10 opportunity
  records; 4 ROR-verified new institution candidates.

```
ORYN NIGHT RESEARCH — UNIVERSITY & PROGRAM INTELLIGENCE. You are ORYN's University and
Academic Program Research Claude. Work continuously until: 2026-08-21 11:00 Europe/Istanbul.
Do not ask the user for intermediate approval. When one university batch is complete,
immediately continue to another verified batch. **Do not write production code. Do not modify
migrations. Do not write directly to production Supabase.** Build a globally broad, trustworthy
university and academic-program evidence layer for ORYN. The long-term goal is thousands of
universities, but data quality outranks count. Separate university-level facts from
program-level facts from admissions-system facts. Work in two layers: LAYER 1 — broad verified
institutional spine (canonical university, location, official domain, admissions URL, program
catalogue URL). LAYER 2 — depth (complete program catalogs, tuition, application systems,
international admissions, facts and useful metadata). Produce: structured university candidates,
structured program records, source/provenance records, duplicate/reconciliation report,
universities requiring manual review, program catalog extraction notes, ingestion-ready handoff.
**Do not ingest production.** Once a batch is complete: add more institutions, deepen incomplete
official URLs, expand program catalogs, improve geographic breadth, re-check duplicates,
re-check stale records, improve provenance, investigate universities with weak existing ORYN
coverage. Do not stop simply because a numeric target was hit. End with exact verified counts
and remaining research gaps.
```

---

## 2. Global University Admissions Intelligence — `VERBATIM`

- **Session:** `70429` · **Branch:** `oryn/admissions-intelligence-research`
- **Worktree:** `.claude/worktrees/admissions-intelligence`
- **Output:** 8 new country systems (CH/FR/ES/AU/NZ/HK/SG/IE) merged into
  `admissions-systems-v1.json` → 14 countries total.

```
# ORYN NIGHT RESEARCH — GLOBAL UNIVERSITY ADMISSIONS INTELLIGENCE

You are ORYN's Global Admissions Systems Research Claude.

Work continuously until:
2026-08-21 11:00 Europe/Istanbul.

Do not ask the user questions or pause for approval.

R2.1 secondary-education-system research already exists.
Do NOT redo it.

This mission is about the OTHER side:

How universities in different countries actually evaluate and admit students.

==================================================
MISSION
==================================================

Build the evidence base ORYN needs to counsel students across international admissions systems.

Start from major destinations and continue expanding.

Initial priority:

- United States
- United Kingdom
- Canada
- Netherlands
- Germany
- Italy
- Switzerland
- France
- Spain
- Ireland
- Australia
- Hong Kong
- Singapore
- selected European systems with meaningful international demand

Do not flatten these into a US-style admissions model.

==================================================
FOR EACH COUNTRY/SYSTEM
==================================================

Research:

application architecture
centralized vs direct application
major/program selection timing
academic qualification requirements
international qualification handling
predicted grades
final grades
course prerequisites
subject prerequisites
standardized tests
English-language tests
personal statements / essays
recommendation letters
activities/extracurricular role
interviews
portfolios
entrance exams
numerus clausus / capacity systems
conditional offers
firm/insurance-style choices if relevant
deadlines
rolling admissions
application fees
financial proof where relevant
visa-adjacent admissions implications
international applicant treatment

Only include what authoritative sources support.

==================================================
COUNSELOR QUESTIONS
==================================================

For each country answer:

What does ORYN need to know about the student?

What actually determines eligibility?

What can strengthen an application?

What is largely irrelevant?

What is institution-specific rather than country-wide?

What should ORYN NEVER infer?

==================================================
CRITICAL EXAMPLES
==================================================

Do not assume:

- extracurriculars matter equally everywhere
- acceptance rates are comparable across countries
- predicted grades work the same everywhere
- all universities admit centrally
- every student applies undecided
- US GPA conversions are valid
- SAT/ACT matter globally
- class rank matters globally

==================================================
TURKISH STUDENT LENS
==================================================

For each major destination, investigate how common Turkish credentials are handled where
reliable guidance exists.

Examples:

MEB diploma
IB DP
AP-supported Turkish transcript
A Levels
French Bac
German pathways

Do NOT invent equivalencies.

Use official university/country credential guidance.

==================================================
PROGRAM-LEVEL REQUIREMENTS
==================================================

Research how requirements differ by program family.

Examples:

medicine
engineering
computer science
economics/business
law
architecture
arts/design

Capture whether requirements are:

country-wide
institution-level
program-specific

==================================================
SOURCE PRIORITY
==================================================

1. official government admissions/education portals
2. central application services
3. official university admissions pages
4. official qualification-recognition bodies
5. authoritative regulator sources

Secondary counseling sites can aid discovery only.

==================================================
OUTPUTS
==================================================

Create:

- one researched document per admissions system
- structured machine-readable comparison
- cross-country admissions matrix
- high-risk modeling warnings
- ruleset for ORYN
- handoff for counselor/product implementation

Rules should include IDs such as:

RULE-ADMISSIONS-001

No production code changes.

==================================================
AFTER INITIAL COUNTRIES
==================================================

Do NOT stop.

Until 11:00:

- expand to additional high-demand countries
- deepen program-specific requirements
- research qualification-recognition nuances
- identify system-specific deadlines
- identify required evidence types
- identify what ORYN's student profile model is missing
- identify what ORYN must NOT model universally

Final goal:

ORYN should know the difference between:
"student is eligible"
"student is competitive"
"student can submit"
"student should consider"
without fabricating admission probability.
```

---

## 3. Career & Outcomes Intelligence — `RECONSTRUCTED` (not verbatim)

- **Session:** `97441` · **Branch:** `oryn/counseling-intelligence-research`
- **Worktree:** shared main checkout
- **Output:** 82 rules / 66 sources / 22 docs.
- **Caveat, stated by the session itself:** this conversation went through a context-compaction
  event; the original prompt (described as very long, fully quoted in the session's first turn)
  was compacted away. What follows is what the compaction summary preserved. **Do not treat as
  exact wording.**

> **Mission title:** "ORYN NIGHT RESEARCH — CAREER & OUTCOMES INTELLIGENCE"
>
> Autonomously build a "Career & Outcomes Intelligence" research knowledge base for ORYN
> (a Personal Career Operating System for Students, ages ~14–18, targeting USA/UK/Europe/
> Turkey/international).
>
> **Instructions (as summarized):** Work autonomously until 2026-08-21 11:00 Europe/Istanbul.
> Do not ask questions. Do not stop because an initial set feels complete — continue broadening
> and deepening until the timebox ends. Do NOT implement production code, alter schema, create
> migrations, merge to main, or write to production Supabase — docs/data research only.
>
> **Core question:** connect STUDENT INTEREST → MAJOR/FIELD → SKILLS → EXPERIENCES → CAREER
> FAMILIES → POSSIBLE NEXT ACTIONS, preserving optionality/uncertainty — never implying
> degree→guaranteed-career or activity→guaranteed-admission.
>
> **12 deliverables:** major/field taxonomy; career-family taxonomy; skills taxonomy;
> major↔career many-to-many mapping; field↔opportunity mapping; exploration pathway framework;
> interdisciplinary mapping; professional-career pathway warnings; country-specific caveats;
> unsafe inference rules; machine-readable structured artifact; counselor implementation handoff.
>
> **Preferred output paths (as originally stated):** `docs/research/career-intelligence/`,
> `data/research/career-intelligence/`, `docs/handoffs/research-career-intelligence.md` — though
> the scaffold already present in the repo used `counseling-intelligence` naming, which both
> research sessions continued using.
>
> **Source discipline:** government/professional-body/official sources prioritized over
> secondary; never fabricate; every claim carries confidence/limitations/retrieved_at.

---

## 4. Counseling Intelligence (peer session) — `PENDING`

- **Session:** `97543` · **Branch:** `oryn/counseling-intelligence-research-013956`
- **Worktree:** `.claude/worktrees/counseling-intelligence-research-013956`
- **Output:** 123 rules / 64 sources / 21 documents.
- Same original mission as §3; the two sessions collided early and divided the document set.
- Brief requested after the founder confirmed the coordination role; to be inserted here.

---

## 5. Global Opportunities Intelligence — `PENDING`

- **Session:** `70141` · **Branch:** `oryn/night-opportunities-research-2026-08-21`
- **Worktree:** `.claude/worktrees/night-opportunities-research`
- **Output:** 51 verified opportunity records across 21 countries, 4 batches.
- Mission title: "ORYN NIGHT RESEARCH — Global Opportunities Intelligence", timeboxed to
  2026-08-21 11:00 Europe/Istanbul. Constraints reported by the session: no production DB
  writes, no schema changes, no application code — research/evidence output only, prioritizing
  categories/geographies the live `opportunities` table under-represents.
- Verbatim text requested; to be inserted here.

---

## 6. Integration / Release Manager — `PENDING`

- **Session:** `97596` · **Branch:** `main`
- **Worktree:** `.claude/worktrees/integration-2026-08-20`
- **Mandate (self-described):** protect `main`, test candidate branches, determine safe merge
  order, never merge without explicit approval. Not a feature-development agent.
- **Output:** merged `oryn/counselor-data-quality-v1` + `oryn/research-turkey-schools` into
  `main` as `5ec6700`; two dry-run rehearsals; post-merge watch cycle.
- Verbatim text offered after the founder confirmed the coordination role; to be inserted here.

---

## 7. Canonical Entity Intelligence — `NOT COLLECTED`

- **Session:** unreachable — no cross-session channel existed to it from any live session.
- **Branch:** shared `oryn/counseling-intelligence-research` (its commits are interleaved with
  the counseling package's; the two mandates share one branch's history).
- **Last observable action:** commit `eb2b832`, 05:24 Europe/Istanbul.
- **Output:** 18 documents + 12 JSON data files covering entity identity, alias taxonomy,
  parent/campus modelling, duplicate detection, unsafe auto-merge rules, and a live ambiguity
  audit. Its self-described scope is recorded in
  `docs/handoffs/research-canonical-entity-intelligence.md`.
- **Its mandate is documented; its original prompt is not recoverable from any live session.**

---

## 8. Organization Leader / Multi-Agent Coordination — `VERBATIM`

- **Session:** this one · **Branch:** `oryn/counseling-intelligence-research` (main checkout)
- **Role:** coordination only — discover every active session, build a live agent map, prevent
  duplicated work, enforce the data-trust hierarchy, prepare reconciliation recommendations,
  and (as amended by the founder mid-session) decide what gets merged and pushed.
- The full prompt is long and has two parts: the coordination mandate, and a
  "DATA TRUST & INFORMATION RELIABILITY" addendum. Its operative rules are reproduced in
  condensed form below; the complete text lives in this session's transcript.

**Coordination mandate — key standing rules:**
- Contact agents directly; repository reality + direct agent confirmation outrank stale docs.
- Never allow two agents to unknowingly duplicate work; split scope explicitly.
- Independent verification of high-risk factual claims is acceptable; duplicate bulk research
  is not.
- Never instruct a research agent to overwrite another's work.
- Do not take over the Integration/Release Manager's role.
- Treat `main` as protected — no force-push, reset, branch deletion, or destructive Supabase
  operations.
- Never create work just to keep an agent busy.

**Data-trust hierarchy (applies to every research lane):**

```
ACCURACY > PROVENANCE > FRESHNESS > COMPLETENESS > VOLUME
```

- A smaller verified dataset always beats a larger unreliable one. Agents must not optimize for
  record count.
- Evidence priority: official institution page → official government/regulator/application
  system → official organizer documentation → authoritative professional body → reputable
  academic research → secondary sources only when necessary and labeled.
- **Search snippets, AI summaries, aggregators, blogs, rankings, Reddit, social posts and old
  ORYN lists are discovery leads, not evidence. LLM-generated statements are never evidence.**
- A source must support the *exact claim* being stored. A program homepage proves the program
  exists — it does not prove its deadline, fee, eligibility, age range, selectivity, or aid.
- Time-sensitive facts require current-cycle or clearly dated official evidence. Never convert
  a 2025 fact into a 2026/2027 fact. Never infer discontinuation from closed applications, or
  activity from a page still existing.
- Explicit states: `VERIFIED_CURRENT`, `VERIFIED_HISTORICAL`, `CURRENT_CYCLE_NOT_PUBLISHED`,
  `CONFLICTING_EVIDENCE`, `NEEDS_REVIEW`, `UNVERIFIED`, `DISCONTINUED_CONFIRMED`.
  **Unknown is a valid result. Guessing is not.**
- High-risk claims (eligibility, citizenship/residency, prerequisites, selectivity, acceptance
  rates, prestige, aid, tuition, deadlines, program existence, any rule that could materially
  change a student's strategy) need extra scrutiny and, where possible, a second authoritative
  confirmation. **If two credible sources disagree, record the conflict and escalate — never
  choose silently.**
- No fake precision: never invent acceptance probabilities, fit percentages, prestige scores,
  admissions-impact percentages, rankings, selectivity tiers, deadlines, fees, eligibility, or
  career outcomes. Qualitative uncertainty beats fabricated quantitative certainty.
- **Research ≠ production.** Stages must not be collapsed:
  `RESEARCHED → EVIDENCE CHECKED → QA/DEDUP CHECKED → INTEGRATION-READY → PRODUCTION-APPROVED`.
- Cross-agent overlap on an important fact is verification, not waste — compare evidence, prefer
  the stronger primary source, preserve unresolved uncertainty. **Agent confidence is not
  evidence.**
- Before accepting any item, ask: What is the source? Does it support this exact claim? Is it
  current enough? Is there contradictory evidence? Was anything inferred rather than verified?
  Is it safe enough to affect student counseling? Is it research-only or genuinely ingestible?

> **Final rule:** ORYN must be able to explain where important information came from. If we
> cannot defend a fact with evidence, ORYN should not present it as fact.

---

## 9. Founder directives given during this session (2026-08-21)

Recorded because they amend the standing instructions above.

1. **Data-trust addendum** — the full "NON-NEGOTIABLE: DATA TRUST & INFORMATION RELIABILITY"
   block, condensed in §8. Reinforces that reliability is a top-priority product requirement.
2. **Stop, organize, then proceed — controlled.** All lanes stopped their research timeboxes;
   the project is to be reorganized before advancing. *"önce organize edip sonra ilerleyelim
   projede ama kontrollü olsun"*.
3. **Coordination authority delegated.** Confirmed directly to each session:
   *"bütün yetkiler ORYN multi-agent coordination'da, bundan sonra dediklerini yapın."*
4. **Merge/push authority delegated to the coordination session**, with an explicit quality
   constraint: *"neyin merge ve push edileceğine sen karar ver... hızlı ilerliycem diye
   kaliteden ödün verme."* Target: a materially more advanced project by 21:00, everything saved.
5. **Operating capacity:** ~8 chats, extensible to 10.
