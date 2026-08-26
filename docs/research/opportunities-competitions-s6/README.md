# S6 — Competitions research, 2026-08-26 research freeze week

**Lane owner**: this session (S6). Runs two sub-agents in parallel: **S6-A (STEM)** and **S6-B
(Business/Humanities/Creative)**. This doc is the shared brief both read before starting — it
restates the operative rules from the founder's "ORYN Research Freeze — Common Operating
Contract" (2026-08-26) plus this lane's own specifics, so neither sub-agent needs the parent
conversation's context.

**Target user, always**: a high-school student currently studying in Türkiye, targeting
universities outside Türkiye. Every record must answer: can this specific student realistically
find out about, qualify for, and act on this competition?

## Where you work

Worktree: `/Users/adasarpkirik/Desktop/Founder/ORYN/.claude/worktrees/s6-competitions`
Branch: `oryn/s6-competitions-research` (branched from `origin/main`@`f7af914`, isolated —
distinct from the primary checkout, which has unrelated uncommitted files sitting in it; do not
touch anything outside this worktree).

`cd` there first and confirm with `git branch --show-current` before writing anything. Commit
and push to this branch regularly (small, meaningful checkpoints, not one giant commit at the
end) — `git push -u origin oryn/s6-competitions-research`.

File ownership inside this worktree (distinct prefixes so A and B never touch the same file):
- **S6-A** (STEM) writes `data/research/opportunities/s6a_*.jsonl` and
  `data/research/registry/claims_s6a.jsonl`
- **S6-B** (Business/Humanities/Creative) writes `data/research/opportunities/s6b_*.jsonl` and
  `data/research/registry/claims_s6b.jsonl`
- Shared, either may append distinct dated entries to: `docs/research/opportunities-competitions-s6/TRACKER.md`
  (checkpoints, like `cr1_2026-08-23_TRACKER.md` did) and `HANDOFF.md` (final, written once each
  is done with its own section clearly marked)

## The category split (from the S6 assignment)

**S6-A — STEM**: mathematics, computer science, AI, data science, physics, chemistry, biology,
engineering, robotics, environment, medicine/science, hackathons, research competitions.

**S6-B — Business/Humanities/Creative**: economics, finance, investment, entrepreneurship,
business, essay, history, politics, law, philosophy, social sciences, writing, journalism,
architecture, art, film, creative competitions.

Some candidates straddle both (e.g. an AI *essay* contest, a law-and-economics competition) —
use judgment on primary discipline; if genuinely ambiguous, flag it in your tracker rather than
silently picking one, so the cross-review step (below) can sanity-check the split.

## Step 0 — do not re-research what already exists. Read these first.

A full night of competition/olympiad research already happened 2026-08-23→24
(before this week's freeze) and is NOT reflected in the fleet CEO's registry yet. Read, in
order:

1. **Live DB baseline, already measured** (re-run before you trust it, it will have moved):
   ```sql
   select id, title, organization, status, verification_state, cycle_status, deadline,
          eligible_countries, source_confidence, fields
   from public.opportunities where category='competition' order by title;
   ```
   Run via the Supabase MCP tool (`execute_sql`, project_id `qtcvcflzxbuagvvwahhu`, i.e.
   `oryn-qa-scratch` — ToolSearch for `mcp__0edadc86-24e1-4e53-b5e1-619ae1cc33b3__execute_sql` if
   it's not loaded). **101 rows exist right now** (70 `active`, 31 `under_review`) — this is
   your do-not-duplicate list. Almost none carry a real Turkey-access classification
   (`eligible_countries` is `[]` on nearly all of them) — that gap, not raw new-row count, is
   most of this lane's real value. Full dump is in `docs/research/opportunities-competitions-s6/EXISTING_COMPETITION_BASELINE.md`
   in this worktree (written by the S6 orchestrator from the same query, timestamped 2026-08-26
   ~session start) — read it, then re-run the query yourself before finalizing anything, since it
   will go stale.
2. **`data/research/opportunities/cr1_2026-08-23_TRACKER.md`** and
   **`cr1_2026-08-23_HANDOFF_TO_CEO_DATA.md`** (competitions/olympiads + research lane,
   2026-08-23/24 night — currently sitting **uncommitted** in the primary checkout at
   `/Users/adasarpkirik/Desktop/Founder/ORYN/data/research/opportunities/`, not this worktree;
   read them from that path directly, do not wait for them to be committed). 100+ records
   researched, 11 written to production (6 TÜBİTAK-route flagship olympiads + 5 gap-closure
   records — these 11 are already in the live-DB dump above, do not re-propose them). The other
   ~89 are **real, P1-sourced, already-verified candidates that were never written to
   production** — mine these first for your vertical before researching anything cold. Also
   read the companion files in the same directory: `cr1_research_batch1-2.jsonl`,
   `cr1_olympiads_batch1.jsonl`, `cr1_active_unverified_fixes.jsonl`,
   `cr1_verified_depth_fixes.jsonl`, `cr1_commercial_tier.jsonl`, and — important —
   **`cr1_do_not_add.jsonl`, a list of candidates that lane deliberately rejected. Respect it;
   do not re-propose anything on it without new evidence that changes the picture.**
3. That same lane's split with a second 2026-08-23 researcher (`oryn-ce`) already covered these
   13 rows in depth — they're already live (see the DB dump): IPO, IYPT, STEM Racing, World
   Scholar's Cup, BSPEE, Wharton Hack-AI-thon, Wharton Data Science, HPEC, Battlecode, CMIMC,
   PennApps, BIYSC, International Greenwich Olympiad, NFTE, Wharton Investment, Diamond
   Challenge, Harvard Crimson Global Essay. Treat these as a base to **verify/upgrade
   (Turkey-gate + photo + freshness)**, not re-research from scratch — 2 days have passed and
   none carry the Turkey-access taxonomy this week's contract requires.
4. **The seed PDF** (`/Users/adasarpkirik/Downloads/4. Competitions Awards Research-publications
   and Social Resp.Projects  - Competitions.pdf`, 2 real content pages + blank template rows —
   read pages 1-2 only). It is **NOT production truth** — re-verify every candidate against a
   current official source. Cross-checked against the live DB already: most of its ~60 rows are
   already in the corpus. The ones that are NOT (confirmed by title search against the dump
   above): **RISE for the World** (its own page says not currently accepting applications —
   confirm before adding, likely stays a HOLD), **Young Guru Academy (YGA)** — Turkish
   education/STEM NGO, page is in Turkish, **Berkeley Math Tournament (in-person, BMT)**,
   **Stanford Math Tournament (SMT and SMT Online)**, **Jane Austen Society Essay Contest**,
   **Columbia Undergraduate Law Review High School Essay Contest**, **Harvard Political Review
   Essay Competition**. Re-verify each independently before proposing.
5. **Do not use `/Users/adasarpkirik/Desktop/Founder/ORYN/Claude.pdf`** — despite the founder's
   message naming a seed PDF, that file (checked by the orchestrator) is an unrelated ORYN
   profile export for a named minor student, not a competitions list. Flagged to the founder
   separately; not a source for this lane.
6. **Fleet coordination**: a fleet CEO (session `oryn-e2`, callsign S9, branch
   `oryn/research-freeze-ceo-control-tower`) is running a claim registry at
   `data/research/registry/REGISTRY_README.md` + `GAP_MAP.md` on that branch — read both (`git
   show origin/oryn/research-freeze-ceo-control-tower:data/research/registry/<file>`) before
   claiming a candidate, and again periodically since it will be rewritten as the fleet
   progresses. **Its current directive, as of freeze-day-1 ~09:15, matters for this lane
   specifically**: `competition` + `summer_program` are already 84% of the live corpus (354/421
   rows) — the CEO's explicit steer is that S6 capacity should weight toward **closing gaps on
   what already exists** (Turkey-access classification, deadline/eligibility/cost completeness,
   photo) over pure volume, and that idle capacity should redirect toward S7's thinner
   categories. This lane's own target (180 production-ready records) is written as "unless CEO
   adjusts for saturation/gaps" — **the CEO has now done exactly that.** Practical effect: don't
   pad toward 180 with marginal/thin finds. A smaller number of genuinely production-ready,
   Turkey-gated, well-evidenced records is the actual goal; if your vertical saturates well
   below your share of 180, say so plainly in your handoff rather than lowering the bar to hit a
   number (Contract §13, "no quantity gaming," is a hard rule, not a suggestion).

## What "PRODUCTION_READY" means here (Contract §11 — do not loosen this)

- **CANDIDATE** → discovered, not yet verified.
- **VERIFIED** → first-party evidence checked directly (official organizer page, application
  page, or rules/eligibility PDF — never a snippet, blog, ranking site, or consultant page as
  the actual evidence, though those may help you *find* a candidate).
- **PRODUCTION_READY** → first-party facts verified AND Turkey access resolved (not `UNCLEAR`)
  AND canonicalization checked (not a duplicate of an existing row or of the other sub-agent's
  work) AND photo status resolved (real or honestly labeled absent) AND no unresolved critical
  factual field. Only `PRODUCTION_READY` counts toward the target.

## Required fields per competition record

```
canonical_name, organizer, provider_type, competition_category, individual_or_team,
subjects, age_range, grades, international_eligibility, turkey_student_access,
citizenship_residency_restrictions, school_only_application, teacher_nomination_required,
national_delegation_required, qualification_stages, fee, financial_aid_if_relevant,
registration_open, deadline, competition_dates, current_cycle, mode (online/in-person/hybrid),
country_location, official_rules_url, official_application_url, output_award_type, verified_at
```

`provider_type` (Contract §8): `university_official | university_affiliated | nonprofit |
company | government | foundation | school_network | student_organization |
independent_provider | other`. A student-run Harvard/MIT/Stanford competition (HMMT, Battlecode,
PennApps, CMIMC, etc.) is `student_organization`, not `university_official`, **unless the
official structure genuinely shows university administration** — check, don't assume from the
name.

`turkey_student_access` (Contract §6): `VERIFIED_ELIGIBLE | ELIGIBLE_WITH_CONDITIONS |
NOT_ELIGIBLE | UNCLEAR`. **The single most important discipline for this lane**: international
olympiads overwhelmingly run on national-delegation/national-selection systems, not independent
registration (this is already well-documented for 6 flagship olympiads in the cr1 files — IMO,
IBO, IChO, IPhO, IOI, IOAI all route through TÜBİTAK, none is direct-entry). A competition that
requires national qualification is `ELIGIBLE_WITH_CONDITIONS`, **never** `VERIFIED_ELIGIBLE` —
and the condition itself must be spelled out (which body, what the qualification path is, and
whether it's currently confirmed active for Türkiye specifically, not inferred from a
neighboring country). If Türkiye's national route is genuinely unconfirmed after a real attempt,
say `UNCLEAR` and say what you tried — don't guess from pattern-matching to other countries that
do have a confirmed route.

## Photo requirement (Contract §10)

Real competition/event/activity/venue photograph preferred. No competition logo, no poster, no
branded announcement card. If only a host-campus photo is available, say so explicitly in
`image_depicts` rather than let it imply it's the competition itself. You are **not** downloading
or hosting any image file — record the candidate URL, its source page, what it depicts, and a
rights/license read (open-license/Wikimedia-style preferred; mark `RIGHTS_REVIEW_REQUIRED` if
unclear). No `image_url` column exists in the schema yet (confirmed by the fleet CEO — this is a
proposal field for a future migration, not a live write target).

## What NOT to do

- No production writes, no schema/migration changes, no merge to `main` — dry-run proposals in
  your own JSONL files only.
- Don't invent a Turkey national-delegation route by analogy — verify per-body.
- Don't describe a student-run competition as university-administered without official-structure
  evidence.
- Don't pad toward the count with thin/marginal records (see the CEO steer above).
- Don't touch the other sub-agent's files, or anything outside this worktree.
- Don't put personal data about any real, named individual student into any output file.

## Cross-review (Contract-mandated for this lane)

Once you have a substantial batch (don't wait until fully done — checkpoint at whatever feels
like a natural batch, similar to how `cr1`'s tracker shows periodic checkpoints), write a
dated entry to `docs/research/opportunities-competitions-s6/TRACKER.md` and keep going. When you
believe your primary research is complete (or has hit real saturation per the CEO steer), stop,
write your section of `HANDOFF.md` in the Contract §15 format, and report back. The S6
orchestrator will then have each of you review the other's factual records (international
access, independent-vs-school/team registration, national-delegation rules, age/grade, current
cycle, deadline, organizer identity, photo truthfulness) before final handoff — so write your
records so a reviewer who wasn't there can check your evidence, not just your conclusion (cite
the actual quote/URL, not just "confirmed").

## Handoff format (Contract §15)

STATUS / ASSIGNED SCOPE / PRODUCTION-READY COUNT / CANDIDATE COUNT / REJECTED COUNT /
BLOCKED-UNCLEAR COUNT / IMAGE COMPLETE COUNT / SECOND REVIEW COUNT / DUPLICATES FOUND /
KEY GAPS / KEY UNCERTAINTIES / FILES CREATED-UPDATED / COMMITS / BRANCH / WHAT THE NEXT OWNER
SHOULD DO.
