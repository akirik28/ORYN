# ORYN Master Execution Strategy

**Canonical execution source for all Claude/Codex/engineering sessions**  
**Last reset:** 2026-08-20  
**Founder direction:** use the available Claude 20x capacity aggressively, but never at the cost of coordination, data trust, or leaving work stranded locally.

This document governs how ORYN is built from now on. Every agent must read it before starting work. Product intent and long-lived founder decisions live in the canonical Drive document **“ORYN — Product & MVP Decision Register.”** Live product/data reality lives in Supabase. Repository code, migrations and tests are implementation truth. This file is the operating system that keeps all of those aligned.

---

## 1. North Star — what ORYN actually is

ORYN is **not primarily a university catalogue, ranking site, opportunity directory, or search engine**.

The database is foundational, but it is not the product identity. The product is an **AI counseling / student decision system** that uses a very large, current and trustworthy student/university/opportunity graph to answer one question better than anything else:

> **Given this student’s current profile, goals, constraints and target universities, what should they do next to materially improve their future options?**

The mental model is **“Google is the database; ORYN must behave like Gemini.”** Discovery matters, but the differentiated value is interpretation, prioritization and action.

A good ORYN recommendation is not “Here are 20 summer schools.” It is closer to:

- your academics are already strong enough for the next stage;
- another generic club has low marginal value;
- your largest current weakness is research depth;
- these three verified opportunities fit your age, geography and calendar;
- this one is the best next action because it closes the gap most relevant to your target program;
- spend four weeks on this, not on a fifth low-impact activity.

The advisor must understand **opportunity cost, diminishing returns, time budget and target-specific gaps**. It must sometimes say **do not do this**.

---

## 2. Non-negotiable build principles

1. **Database first, counselor always.** Data quality is the prerequisite; counselor intelligence is the reason the data exists.
2. **No fabricated production facts.** Unknown is acceptable. Invented admissions, tuition, deadline, student-count or program data is not.
3. **Official evidence first.** For high-impact/current facts use official university, organizer, government or official application sources whenever possible. Store source URL and retrieval/verification time.
4. **Canonical identity everywhere.** Aliases such as `UCL` are search keys, not duplicate entities. Product-visible duplicates are correctness bugs, not cosmetic issues.
5. **Current cycle must be explicit.** Historical opportunity dates may seed research, but cannot be displayed as current truth without re-verification.
6. **One structured student graph.** CV imports, profile forms, recommendations and matching should converge on canonical structured entities rather than creating parallel text silos.
7. **Light, modern, calm UX.** Generous whitespace, ORYN logo blue as the primary accent, no dark/gloomy default, no dense admin-console feel.
8. **No broken code carried forward.** A package is not done until lint/typecheck/tests/build and relevant data audits pass.
9. **Nothing valuable stays only local.** Every safe checkpoint is committed and pushed to a remote branch. Finished work is integrated to `main` through the integration gate below.
10. **Do not let documentation drift.** If code, Supabase, Drive and a handoff disagree, measure live reality, reconcile, then update the canonical source.

---

## 3. Parallel operating model — two computers, maximum useful throughput

The default is **two active writer agents total**, one per computer. Extra chats are used as reviewers/researchers, not additional uncontrolled writers.

### Computer A — DATA / RESEARCH / CANONICAL GRAPH

**Primary writer: A1**  
Owns data acquisition, canonicalization, provenance, refresh, university/program/opportunity coverage and data-quality tooling.

**Optional second chat: A2 — verifier/researcher**  
May research sources, inspect fixtures, review A1 diffs, run audits, propose fixes and prepare evidence. It should not simultaneously edit the same files as A1. If A2 needs to become a writer, A1 must first checkpoint/push and explicitly hand over the work package.

Primary ownership areas:

- `lib/acquisition/**`
- data/provider code
- `scripts/**` data audits/imports
- canonical entity and dedup pipelines
- university/program/opportunity ingestion
- provenance/freshness logic
- data migrations and data-quality tests
- data handoff/status docs

### Computer B — PRODUCT / COUNSELOR / UX / INTEGRATION

**Primary writer: B1**  
Owns counselor intelligence, student-facing product behavior, canonical selector consumption, UI, matching/recommendation surfaces and integration to main.

**Optional second chat: B2 — QA/reviewer**  
Runs browser QA, tests flows, reviews B1/A1 commits, identifies UX/data-contract defects and prepares concrete bug lists. Same rule: no concurrent edits to B1’s active file set.

Primary ownership areas:

- `app/**`
- `features/**`
- advisor/counselor layers
- recommendation/matching UX
- canonical search/autocomplete UI
- university/opportunity presentation
- Connections/social discovery
- browser QA and integration tests

### Shared-file rule

The following are **integration-owned** and must not be edited concurrently by both computers:

- `types/database.ts`
- `package.json` / lockfiles
- cross-cutting migrations
- `README.md`
- `PHASE_STATUS.md`
- `CLAUDE.md`
- this strategy file
- central schemas/contracts used by both workstreams

If Computer A needs a shared-file change, include it in a small isolated commit and call it out in the handoff. **Computer B is the default integration owner** and merges shared changes sequentially after validation.

---

## 4. Git / branch discipline

Every session begins with:

1. `git status`
2. `git branch --show-current`
3. `git fetch --all --prune`
4. inspect the latest remote commits and the relevant handoff
5. confirm the tree is clean or understand every existing local change before touching files

Use separate branches/worktrees per computer. Do not have both computers commit to the same branch.

Recommended durable lanes:

- Computer A: a data/research branch (reuse the current active data branch if one already exists rather than creating a duplicate lane)
- Computer B: a product/counselor branch
- `main`: integration only

Rules:

- commit by coherent work package, not one giant end-of-day commit;
- push each validated checkpoint;
- never reset/discard another agent’s uncommitted work;
- before integrating, fetch the other branch and inspect the diff;
- resolve conflicts by preserving the newer product contract and verified data behavior, not by blindly choosing “ours/theirs”;
- after merge/rebase, rerun the full verification gate.

A local-only success does not count as progress.

---

## 5. Work-package contract

Every work package must have:

**Goal** — one concrete outcome.  
**Scope** — explicit files/tables/features owned.  
**Non-goals** — what is deliberately not being touched.  
**Evidence** — source URLs / measured live state / failing test or reproducible bug.  
**Implementation** — smallest reversible change that solves the actual issue.  
**Validation** — exact commands/checks.  
**Handoff** — what changed, commit SHA, branch, remaining blockers, exact next action.

A package is complete only when:

- relevant unit/integration tests pass;
- `npm run lint` passes;
- `npm run typecheck` passes;
- `npm test` passes where relevant;
- `npm run build` passes for code touching the application bundle;
- data changes have before/after counts and invariant checks;
- migrations are either actually applied and verified, or clearly marked pending with no false claim that live DB changed;
- commit is pushed;
- handoff/status is updated.

---

## 6. Priority roadmap

### P0 — Coordination and reality check

Before new feature expansion, both computers independently confirm current branch/live state. Recent documents are useful context but may be stale. Remeasure Supabase and current `main` before treating old counts as current.

Known recent context to re-check, not blindly assume:

- university corpus is roughly top-1000 scale;
- prior passes identified/merged canonical university duplicates but some product-visible university-row duplicates depended on a pending supersession migration;
- admissions URL, application-system, student-count and research-topic coverage were incomplete;
- Tavily / Anthropic / OpenAlex had intermittent billing/rate/HTTP blockers in prior sessions;
- some migrations required founder/DDL access.

If a blocker is gone, continue immediately. If it remains, isolate it and move to the highest-value unblocked work.

### P1 — Canonical identity and data correctness

Finish this before trusting scale.

- no product-visible duplicate universities;
- aliases resolve to one canonical entity;
- audit every university read/search/select path;
- extend the same architecture to schools, companies/employers, internship organizations, volunteering organizations, research institutions/labs, NGOs, clubs, opportunity organizers, programs, competitions, sports clubs/teams, countries and cities;
- AP/IB/A-Level/SAT/ACT/IELTS/TOEFL/Duolingo and similar controlled vocabularies must use canonical searchable options;
- manual fallback is allowed only as explicitly marked custom/unmapped data feeding a reconciliation queue;
- regression tests cover known duplicate/alias cases and ambiguous institutions.

### P2 — University intelligence spine: broad and genuinely useful

Target: **top 1000+ universities with a trustworthy, structured profile**, not a shallow row count.

For each canonical university, pursue where official/reliable evidence exists:

- canonical identity, aliases, official website;
- country/city/campus and coordinates;
- institution imagery suitable for cards/profile hero;
- total students and defensible enrollment metrics;
- admissions URL and application system;
- tuition/cost with year/currency/scope;
- undergraduate and postgraduate program catalog;
- degree level;
- faculty/school/department;
- official program name;
- official program URL;
- campus;
- language;
- duration;
- program tuition when officially published;
- requirements/deadlines where defensible;
- source URL and retrieval year/date.

**Important:** `research_topics_top5` is not the same thing as academic programs/majors. Never use research topics as a substitute for the full program catalog.

A university page must never look as if the university has four departments merely because only four rows were ingested.

### P3 — Opportunity graph: flagship-quality discovery

Build one opportunity system with type-aware data contracts for:

- summer / pre-college programs;
- internships;
- research programs and independent research opportunities;
- competitions and Olympiads;
- scholarships/awards;
- publication/journal opportunities;
- entrepreneurship programs and other high-value youth programs.

Immediate summer-program target remains **at least 350 high-quality, deeply structured programs**, but quality beats padding.

The uploaded UAA/curated source packs are **discovery corpora, not current truth**. They contain excellent leads such as RSI, PROMYS, SIP, Wharton, YYGS, LaunchX and many competitions, but their own material repeatedly tells readers to check program websites for current dates. Every published/current record must therefore be re-verified from the official organizer/program source.

Common fields where known:

- type/category and subject;
- organizer/provider canonical entity;
- description/scope;
- age/grade;
- international/Turkish-student eligibility;
- country/city/online/hybrid/in-person;
- session dates, duration, weekly commitment;
- deadline and application status;
- price/cost and currency;
- financial aid/scholarship/stipend;
- selectivity/application requirements;
- outcome (credit, certificate, research output, publication, prize, etc. only when explicitly offered);
- official source;
- current-cycle/historical status;
- verification timestamp;
- image plus image provenance.

Do not collapse all opportunity types into one shallow filter set. The UI can share a common explorer, but the data model must support type-specific facets.

### P4 — Counselor core: turn the database into decisions

This is the central product differentiator and Computer B’s highest-value lane while Computer A grows data.

The counselor should reason from:

1. verified student profile;
2. target universities/programs and their requirements;
3. profile dimension strengths/gaps;
4. student age/grade and curriculum;
5. weekly time budget and busy mode;
6. geography and eligibility;
7. current deadlines/calendar;
8. opportunity quality/selectivity and expected developmental value;
9. prior recommendations/actions so it does not repeat itself.

Required behavior:

- identify strongest and weakest dimensions;
- distinguish a real gap from “more of the same”;
- explain why a recommendation matters for this student;
- rank next-best actions, not dump lists;
- make recommendations time-bounded and executable;
- connect recommendations to real opportunities when appropriate;
- recognize diminishing returns;
- explicitly deprioritize low-value actions;
- update after the student completes/rejects an action;
- never imply a false individualized admissions probability.

The output loop is:

**Capture → Verify → Analyze → Compare → Identify gap → Find options → Rank next action → Execute → Reflect → Update.**

### P5 — Search, filters and product UX

After the data contracts are stable enough:

- typing `Har` suggests Harvard;
- typing `UCL` returns one canonical University College London;
- Enter submits search everywhere it should;
- filters actually affect results and persist cleanly;
- maps do not hard-cap or visually break the university corpus;
- selected-country behavior is visually correct;
- university cards are spacious, not cramped, and have useful imagery;
- all summer programs/competitions/opportunities get appropriate images where possible;
- default UI remains light/open with the ORYN blue used consistently;
- mobile is first-class;
- no dead buttons or fake interactions.

### P6 — CV/profile sync and canonical structured input

CV upload must remain available after signup, not only onboarding.

Flow:

**Upload → extract candidate facts → canonical resolution → diff against existing profile → NEW / UPDATE / DUPLICATE / CONFLICT → user confirms → save.**

Re-uploading the same CV should be effectively idempotent. A newer CV should merge, not silently replace newer manual data.

### P7 — Connections/social discovery

Keep in MVP, but do not let it outrank counselor/data quality.

- people search;
- suggested-for-you / people-you-may-know;
- defensible reason labels such as same school, mutual connections or shared verified experience;
- connect/follow behavior;
- recent profile activity only where privacy-safe.

### P8 — Pilot and quality hardening

Pilot sequence:

1. internal two-account end-to-end QA;
2. approximately 10 student pilot;
3. fix trust/data/flow defects;
4. approximately 50 student pilot;
5. only then optimize for broader acquisition/growth.

The 10-person pilot is for finding broken flows, confusing copy, weak recommendations, missing data and trust failures — not proving network effects.

### P9 — Freshness and operations

This database is a living system, not a one-time scrape.

Use source-aware refresh cadences:

- identity: slow cadence;
- program catalog: medium cadence / academic-cycle checks;
- admissions requirements: cycle-aware;
- tuition: annual/cycle-aware;
- opportunities/deadlines/open status: frequent;
- images: on failure/change;

Refresh logic should use **PLAN → VALIDATE/REVIEW → APPLY → VERIFY**, especially for material changes. Provider failure is never equivalent to “the value disappeared.”

---

## 7. Data trust model

For any high-impact fact, prefer a record shape equivalent to:

- normalized value;
- canonical entity id;
- source URL;
- source domain/type;
- retrieved/verified at;
- cycle/year if applicable;
- confidence/status;
- raw evidence or structured evidence reference;
- superseded/historical state when replaced.

Never silently overwrite a strong verified fact with a weaker source.

Useful states include:

- official_verified;
- source_verified;
- needs_review;
- historical;
- unresolved/unknown.

Unknown is better than wrong.

---

## 8. Integration cadence

Do not wait until both computers have huge branches.

Recommended rhythm:

- each primary writer checkpoints every coherent package;
- push at least whenever a package passes its own validation;
- B1/integration owner fetches A regularly;
- integrate low-conflict completed packages early;
- after each integration batch: full lint → typecheck → tests → build → targeted browser/data audit;
- tag/document the new baseline before both computers continue.

If a package is long-running (e.g. 350-program research), commit the **pipeline/contract/tooling first**, then data in validated batches. This makes progress reviewable and prevents one giant opaque import.

---

## 9. Session-start prompt contract for every Claude

Before doing work, every Claude must:

1. read `CLAUDE.md` / `AGENTS.md` and this file;
2. read the relevant current-state/handoff docs;
3. inspect branch, dirty files and recent commits;
4. identify which computer/workstream it belongs to;
5. state the one work package it is taking and the files it owns;
6. avoid overlapping an active package owned by the other machine;
7. implement rather than merely write a plan;
8. push a validated checkpoint before ending;
9. leave a precise handoff.

If the latest handoff conflicts with measured live state, live state wins and the handoff must be corrected.

---

## 10. What “perfect” means here

Perfect does **not** mean endless polishing. It means:

- the product knows what it is;
- the data is large, current enough and evidence-backed;
- the system does not lie when data is missing;
- aliases/duplicates do not corrupt the experience;
- the advisor gives specific, profile-aware next actions rather than generic chatbot advice;
- important opportunity categories are broad and deeply structured;
- the UI makes the intelligence easy to understand;
- every important flow is tested;
- every finished package is pushed;
- two computers increase throughput instead of creating merge chaos;
- every next agent can resume from repository + Drive without needing chat-history archaeology.

That is the operating standard from this point forward.
