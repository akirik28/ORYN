# ORYN — Chat briefs (workspace set up 2026-08-22)

**How to use this file (founder):** open one new Claude chat per job below, paste that job's
brief verbatim as the first message. Each brief is self-contained — the chat claims its own
row in `docs/ORYN_WORKSTREAMS.md`, works in an isolated worktree, and ends with a PR, never a
direct merge to `main`. The RESEARCH GROUP briefs (R-1…R-4) can all run in parallel — their
file/data scopes don't overlap. The CODE lane (C-1) is independent of all of them.

**Why these jobs:** every one is derived from a live measurement taken 2026-08-22 against
`oryn-qa-scratch` (not from stale docs). The numbers are in each brief; each brief also tells
the chat to re-measure before starting, because another session may move them.

**Coordination rules every brief already embeds** (do not strip them when pasting):
re-measure live state before writing · claim a `docs/ORYN_WORKSTREAMS.md` row first ·
isolated worktree off `origin/main` · commit+push every coherent package, never one giant
commit · official sources only, no LLM prior knowledge as evidence · record conflicts, don't
resolve them silently · verify returned identity against the query on every name lookup
(rank/substring match is discovery, not evidence) · end with a PR + handoff doc.

---

## RESEARCH GROUP

### R-1 — Australia programme catalogue (highest-yield zero-coverage country)

```
ORYN repo (/Users/adasarpkirik/Desktop/Founder/ORYN). Read CLAUDE.md/AGENTS.md,
docs/MASTER-EXECUTION-STRATEGY.md (§P2, §7 data trust model), and docs/ORYN_WORKSTREAMS.md
first. Claim a workstream row (suggested: AU-PROGRAMMES, branch oryn/au-programmes-research,
isolated worktree off origin/main) before starting.

Job: undergraduate programme-catalogue research for Australia. Live measurement 2026-08-22:
35 canonical Australian universities in the DB, ZERO university_programs rows — the largest
English-language coverage hole in the corpus (China/India have more universities but harder
sources; Australia is the highest expected yield per hour). Re-measure before starting.

Method: follow the CA-PROGRAMMES lane's exact record contract and file conventions — read
docs/research/university-programs-ca/README.md and one of its ca_programs_*.jsonl files as
the template. Output: data/research/university-programs/au_programs_*.jsonl +
docs/research/university-programs-au/README.md. Research/evidence only — no schema, no app
code, no Supabase writes (ingestion is a separate lane).

Start with the 8 highest-QS-ranked Australian universities (verify which from the live
university_rankings table, don't assume). Per-programme: official name, official URL, degree
level, faculty/school, campus, language, duration, source URL + retrieval date. Dedup within
your own files AND against the full existing corpus before every commit. Known trap from the
Canada lane: co-op/placement status is a per-programme fact with no institutional default.
Known trap from this repo's history: a name lookup's top hit is not identity — verify the
returned institution against the query (e.g. "University of Newcastle" Australia vs UK — the
DB already had this exact confusion once).

Wave discipline: ~2 universities per sub-batch, commit+push each. If a site blocks AI
crawlers in robots.txt, respect it and record the block — find a permitted alternative
official host or mark the university deferred with the reason; never route around it.
End: PR to main (never merge yourself) + handoff doc in docs/handoffs/.

NOTE: a branch oryn/asia-programmes-research exists with uncommitted local changes (worktree
.claude/worktrees/asia-programmes). Before starting, check via git log/ORYN_WORKSTREAMS
whether it claims Australia — if it does, report the collision and switch to Spain (29
universities, only 3 with programmes) using this same brief's method instead of duplicating.
```

### R-2 — eligible_countries Wave 2 (small high-stakes categories)

```
ORYN repo (/Users/adasarpkirik/Desktop/Founder/ORYN). Read CLAUDE.md/AGENTS.md,
docs/MASTER-EXECUTION-STRATEGY.md §7, docs/ORYN_WORKSTREAMS.md, and — mandatory, this is
your direct predecessor — docs/research/opportunities-eligible-countries/README.md plus
docs/handoffs/opportunities-eligible-countries-gap.md (both on main since PR #3). Claim a
workstream row (suggested: ELIGIBLE-COUNTRIES-W2, branch oryn/eligible-countries-wave2,
isolated worktree off origin/main).

Job: Wave 2 of the opportunities.eligible_countries backfill, exactly as scoped by Wave 1's
own plan: the small, high-stakes categories — research (13 rows, 1 populated), scholarship
(9/7), fellowship (5/1), internship (8/6) — plus Wave 1's two named open sub-questions
(TechGirls' 37-country list — needs a successful fetch, 2 prior attempts failed; Erasmus+'s
citizenship_restrictions text tightening — NOT its eligible_countries, which stays null by
design per RULE-ELIGIBILITY-009). Re-measure all counts live before starting; Wave 1 moved
them and other sessions may too.

Hard rules proven by Wave 1, do not relearn them: title/org keyword matching measured 0%
safe-apply rate — never use it. Empty array means "not restricted" in this codebase, so a
confirmed-open program MUST stay empty (never write a fabricated all-countries list).
Populate only from an explicit official statement; verbatim language, source URL + retrieval
date; unresolved stays null. Write via idempotent, id+predicate-guarded SQL exactly like
data/research/opportunities/eligible_countries_step1_2026-08-22_dry-run-update.sql (dry run
with ROLLBACK first, confirm the exact row count, then COMMIT). Apply against the live
qtcvcflzxbuagvvwahhu project via the Supabase MCP tools; verify before/after counts.
End: PR + handoff doc following Wave 1's format.
```

### R-3 — Opportunity deadlines backfill (cycle-sensitive, most user-visible gap)

```
ORYN repo (/Users/adasarpkirik/Desktop/Founder/ORYN). Read CLAUDE.md/AGENTS.md,
docs/MASTER-EXECUTION-STRATEGY.md §7, docs/ORYN_WORKSTREAMS.md. Claim a workstream row
(suggested: OPPORTUNITY-DEADLINES, branch oryn/opportunity-deadlines-backfill, isolated
worktree off origin/main).

Job: opportunities.deadline is null on the vast majority of live rows. Live measurement
2026-08-22 by category (total → has_deadline): summer_program 252→26, competition 72→15,
research 13→1, fellowship 5→0. Deadlines are the product's most user-visible data gap
(dashboard "Due soon", deadline engine, weekly plan all starve without them) and the most
freshness-critical field in the schema. Re-measure before starting.

Scope THIS pass: verified_current rows only (deadline on an unverified row is false
precision), competitions + research + fellowship + internship + scholarship first (~70 rows),
then summer_program's verified subset (87 rows) as a second wave if time allows. Per row:
fetch the official organizer page, extract the CURRENT cycle's application deadline. The
DE-NL requirements lane proved many real deadlines are genuinely undated recurring
day-months ("applications open each September") — record those verbatim in the appropriate
field/notes convention, NEVER synthesize a year. A closed-for-this-cycle deadline is a real,
recordable fact (mark historical/closed per the existing cycle_status vocabulary), not a
blank. Known trap from the US requirements lane: financial-aid subdomains label by
enrollment year, admissions/organizer pages by cycle year — one year apart under
identical-looking strings; check which convention the page uses before recording.

Write via idempotent guarded SQL (same pattern as
data/research/opportunities/eligible_countries_step1_2026-08-22_dry-run-update.sql — dry run
with ROLLBACK, verify count, then COMMIT) against qtcvcflzxbuagvvwahhu via Supabase MCP.
Also update last_verified_at/cycle_status where the fetch confirms them. Batches of ~15,
commit+push each. End: PR + handoff doc.
```

### R-4 — Opportunities data-quality queue (garbled rows, duplicates, small fixes)

```
ORYN repo (/Users/adasarpkirik/Desktop/Founder/ORYN). Read CLAUDE.md/AGENTS.md,
docs/MASTER-EXECUTION-STRATEGY.md §7, docs/ORYN_WORKSTREAMS.md, and
docs/handoffs/opportunities-eligible-countries-gap.md's "INCIDENTAL FINDINGS" section —
that's your work queue. Claim a workstream row (suggested: OPPORTUNITIES-DQ, branch
oryn/opportunities-data-quality, isolated worktree off origin/main).

Job: the opportunities data-quality queue that the eligible_countries lane found but
correctly didn't act on (out of its scope):
1. Duplicate pair: "The Diamond Challenge" (id 30a605ab…, category competition) vs "Diamond
   Challenge" (cb1ae3e2…, entrepreneurship) — same org, same official domain. Re-verify both
   rows live, decide the survivor by data richness (which row has more populated
   fields/references), merge the better fields into it, and mark or remove the loser
   following whatever suppression convention the opportunities table already has (check the
   schema first — do NOT invent a new mechanism, and do NOT hard-delete if anything
   references the row).
2. Three garbled/multi-program scrape rows: 69be38ed… (Robomaster China row mixes unrelated
   Malaysia/Hong Kong program text into its description), b10444c7… (titled "Netherlands",
   body describes an Italian program), 87f773f9… (description ends mid-sentence in a stray
   "EUROPE" token). For each: re-fetch the official source, rewrite the row's text fields to
   describe ONE program accurately, or if the row is unsalvageable mark it per the existing
   verification_state vocabulary rather than deleting.
3. Then sweep for more of the same shape: scan all 391 rows' title/description for
   country-name/title mismatches and truncated descriptions; fix what you find with the same
   method, report the rest.

Every fix: official source, verbatim language, source URL + retrieval date, idempotent
guarded SQL (dry-run-then-COMMIT pattern from
data/research/opportunities/eligible_countries_step1_2026-08-22_dry-run-update.sql) against
qtcvcflzxbuagvvwahhu via Supabase MCP. End: PR + handoff doc.
```

---

## CODE LANE

### C-1 — Honest counselor copy for restricted-but-unknown opportunities

```
ORYN repo (/Users/adasarpkirik/Desktop/Founder/ORYN). Read CLAUDE.md/AGENTS.md,
docs/MASTER-EXECUTION-STRATEGY.md, docs/ORYN_WORKSTREAMS.md. Claim a workstream row
(suggested: ELIGIBILITY-HONEST-COPY, branch oryn/eligibility-unknown-honesty, isolated
worktree off origin/main). This is a code lane — full validation gate applies (lint,
typecheck, test, build; node needs
PATH="/Users/adasarpkirik/.local/share/fnm/node-versions/v24.19.0/installation/bin:$PATH"
prefixed per command in this sandbox).

Context — a real trust finding from the eligible_countries research lane (PR #3, see
docs/handoffs/opportunities-eligible-countries-gap.md Key Finding 1): in
lib/opportunities/matching.ts computeEligibility() and lib/counselor/eligibility.ts
evaluateOpportunityEligibility(), an EMPTY eligible_countries array means "not restricted by
country" — the check is skipped entirely. But ~352/391 live rows are empty because the data
was never researched, not because the program is open. Consequence: a genuinely restricted
program with unresearched data is presented as eligible to every student with zero warning.
This contradicts the product's own core rules (AGENTS.md Phase 68 "Oryn should know when it
does not know enough", Rule 4 no fake production behavior, non-negotiable #5 no false
precision).

Job: make the product honest about this uncertainty WITHOUT breaking the existing
convention. Constraints discovered by the research lane, verify them yourself first:
(a) empty-means-open is load-bearing — genuinely open programs are deliberately stored
empty, so you CANNOT reinterpret empty as unknown at the matching layer without a data
signal distinguishing "confirmed open" from "never researched"; (b) the free-text
citizenship_restrictions/residency_restrictions columns are already surfaced as advisory
notes in evaluateOpportunityEligibility — extend that pattern rather than inventing a
parallel one. Design options to weigh (your call, document the decision per
docs/product-decisions.md conventions): a tri-state/confirmed_open marker on the
opportunity row (needs a migration — numbering: check the latest applied migration live
first and read docs/ORYN_WORKSTREAMS.md's migration-numbering notes; a schema change also
needs a founder-visible note in the PR, and per repo convention you write the migration but
do NOT apply it live without it being called out in the PR body), vs. a copy-level fix
(when eligible_countries is empty AND no restriction prose exists, the match card/counselor
says "Eligibility not verified for your country yet" instead of implying openness). Prefer
the smallest honest change; do not silently mark 352 rows ineligible — that's the opposite
overcorrection and would gut the opportunity surface.

Include unit tests for whatever rule you ship. End: PR + handoff doc. Do not merge yourself.
```

---

## Already running / recently closed (do not duplicate)

| Lane | Status |
|---|---|
| CANONICAL-LIVE-COLUMN | merged to main (PR #2, `b36214b`) — closed |
| OPPORTUNITIES-ELIGIBLE-COUNTRIES Wave 1 | merged to main (PR #3, `8f0b145`) — closed; Wave 2 is brief R-2 |
| oryn/asia-programmes-research | branch exists with uncommitted local work — status unknown, R-1 checks it before starting |
| Evidence-gate false rejections (2,097 blocked records) | founder decision pending (docs/handoffs/evidence-gate-false-rejections-2026-08-22.md) — do not implement unilaterally |
| Migration 0057 (kilavuz_kodu) | founder-blocked-backlog item 26 — do not apply |
