# S5 — Turkey-Accessible Academic Opportunities — Operating Brief

This file is the self-contained brief for both S5 sub-shards (S5A and S5B). It reproduces the
founder's two governing messages verbatim (Part 1: the Research Freeze Common Operating Contract;
Part 2: the S5 mission), then adds an operational addendum (Part 3) specific to how S5A/S5B are
actually wired up in this repo — branches, worktrees, prefixes, Supabase access, and what earlier
lanes already covered so you don't re-research it.

**Read this whole file before writing any record.**

---

## PART 1 — ORYN RESEARCH FREEZE — COMMON OPERATING CONTRACT (verbatim, start date 2026-08-26)

You are one component of a coordinated ORYN research operation.

PRIMARY TARGET USER: A student currently attending high school in Türkiye who intends to apply to
universities outside Türkiye.

This week is a deliberate RESEARCH FREEZE WEEK. The objective is to remove the major
research/data/asset gaps now, so that after this week ORYN can return its primary attention to the
AI counselor/product experience rather than behaving like a database project.

### 1. SOURCE OF TRUTH

Before doing anything: `git fetch --all --prune`, `git status`, `git branch -vv`. Read the latest
canonical repository documents if they exist: `docs/MASTER-EXECUTION-STRATEGY.md`,
`docs/current-state.md`, `docs/ORYN_WORKSTREAMS.md`, `docs/product-decisions.md`. Then inspect
existing research/data architecture before creating anything: `find docs -type f | sort`,
`find data -type f | sort`. Search for: university, universities, opportunity, opportunities,
summer, competition, internship, research, scholarship, award, publication, image, photo. Reuse
existing schemas, canonical IDs, validation conventions and ingestion architecture. DO NOT create a
competing data architecture merely because this prompt suggests field names or paths.

### 2. GIT / WORKSTREAM DISCIPLINE

You are a research lane. DO NOT: modify production application behavior; modify Supabase production
data; create or alter production migrations; redesign UI; change scoring/counselor logic; edit files
currently owned by Claude A/B/UI unless explicitly authorized; merge anything to main.
Research-only scripts are allowed only if necessary for validation and if they do not affect
application behavior. Keep work in your assigned branch/workstream. If two agents run on the same
server, use separate worktrees/branches or completely separate shard files so they never
concurrently edit the same file. Commit meaningful checkpoints. Push regularly.

### 3. ABSOLUTE EVIDENCE RULE

Production-visible factual data must be supported by CURRENT FIRST-PARTY EVIDENCE. Preferred: (1)
official organizer/program page, (2) official university/institution page, (3) official application
page, (4) official handbook/brochure/PDF, (5) official rules/eligibility page. Search engines,
snippets, blogs, Reddit, consultants, rankings and aggregator sites MAY help discover an opportunity.
They are NOT authoritative evidence for production factual claims. Never turn a search snippet into
production truth.

### 4. OLD ORYN/UAA MATERIALS

The uploaded summer-program, selective-program, highly-competitive-program and competition documents
are SEED MATERIAL ONLY. Use them to find candidate entities. Do not copy their dates, deadlines,
prices, eligibility, international-student rules, or program status without checking the CURRENT
official source. Historical data may be recorded as historical, but must never be presented as a
current cycle.

### 5. UNKNOWN IS ALLOWED

Never guess. If a 2027 deadline is not yet published: `deadline = null`,
`deadline_status = "next_cycle_not_published"`. Do NOT copy a 2026 deadline and silently label it
2027. If international eligibility is ambiguous: `turkey_student_access = "UNCLEAR"`. UNCLEAR
records are not production-ready. False precision is a failure.

### 6. TURKEY-ACCESS GATE

Decisive question: "Can a high-school student based in Türkiye realistically apply or participate,
and is this a substantive opportunity relevant to an international-university-bound student?" Use
`turkey_student_access`: VERIFIED_ELIGIBLE / ELIGIBLE_WITH_CONDITIONS / NOT_ELIGIBLE / UNCLEAR. Only
VERIFIED_ELIGIBLE and ELIGIBLE_WITH_CONDITIONS may become production-ready. Track where relevant:
international_students, citizenship restrictions, residency restrictions, age restrictions, grade
restrictions, country restrictions, school nomination requirement, national delegation requirement,
team requirement, online participation from Türkiye, travel required, application path specific to
international/Türkiye applicants. Visa status is nationality-specific. Do not guess visa
requirements.

### 7. ONE CANONICAL ENTITY

Do not create yearly duplicates of the same opportunity (e.g. "X 2026" and "X" should resolve to one
canonical opportunity with cycle metadata). Canonicalize using: canonical name, organizer, official
domain, application URL, aliases, host institution, opportunity type. If two opportunities have
materially different applications, eligibility, curriculum or outcomes, they may be separate. If
unsure: flag for CEO/S8 review.

### 8. PROVIDER / HOST DISTINCTION

Do not mislabel third-party commercial programs hosted in famous university buildings as official
university programs. Track separately: organizer, host_institution, provider_type. Suggested
provider_type values: university_official, university_affiliated, nonprofit, company, government,
foundation, school_network, student_organization, independent_provider, other.

### 9. OPPORTUNITY QUALITY — NO UNSUPPORTED "ADMISSIONS BOOST" CLAIMS

Do not claim that an opportunity improves admission chances unless a university explicitly says so.
Instead capture objective characteristics: selectivity_type, application requirements, cost,
financial aid, output_type (award, project, research paper, publication, prototype, startup,
presentation, competition result, leadership responsibility, course completion, mentor interaction).
This lets the ORYN counselor evaluate fit later.

### 10. PHOTO STANDARD

Every production-ready university and opportunity must ultimately have a REAL PHOTO. Reject: logos,
crests, seals, wordmarks, logo cards, branded banners, application posters, screenshots, ranking
graphics, placeholders, AI-generated campuses, stock images pretending to represent the institution,
search-result thumbnails. Prefer: (1) real program activity photo, (2) real campus photo, (3) real
building/library/lab/event photo, (4) real venue photo, (5) open-license photo clearly depicting the
correct place/entity. No prominent institutional logo/crest/wordmark should dominate the image. For
an opportunity without a program-specific image, a truthful host-campus/venue photo may be used ONLY
if clearly marked as such and not presented as a photo of the program itself. Track: image_url,
image_source_url, image_depicts, image_verified, no_logo_verified, correct_entity_verified,
rights_status/license status where obtainable. Prefer open-license or explicitly reusable imagery.
If display rights are unclear, mark RIGHTS_REVIEW_REQUIRED. Do not pretend rights are cleared.

### 11. VERIFICATION STATES

CANDIDATE (discovered, not yet fully verified) → VERIFIED (first-party evidence checked) →
PRODUCTION_READY (first-party facts verified, Turkey access resolved, canonicalization passed,
duplicate check passed, image passed, second-agent/S8 review passed, no unresolved critical factual
fields). Only PRODUCTION_READY counts toward final coverage.

### 12. CURRENT CYCLE RULE

Current date is **2026-08-26**. Prefer current 2026-27/2027-cycle information. For each
time-sensitive field retain: verified_at, current_cycle, last_published_cycle, date_status,
official_source_url.

### 13. NO QUANTITY GAMING

Do not inflate numbers with: duplicates, closed programs, USA-residency-only opportunities,
age-ineligible programs, expired programs presented as current, generic low-information
directories, one umbrella program split artificially into many records, multiple yearly copies.
Quality beats raw count.

### 14. STOP CONDITIONS

Not complete merely because it reached a record count. Completion requires: assigned coverage done;
no unresolved obvious duplicates; no known broken official URLs; no current dates copied from stale
material; no opportunity counted without Turkey-access evaluation; image coverage complete for
production-ready entities; no obvious category/region/age blind spot within assigned scope; handoff
written; commits pushed.

### 15. FINAL HANDOFF FORMAT

Finish with: STATUS, ASSIGNED SCOPE, PRODUCTION-READY COUNT, CANDIDATE COUNT, REJECTED COUNT,
BLOCKED/UNCLEAR COUNT, IMAGE COMPLETE COUNT, SECOND REVIEW COUNT, DUPLICATES FOUND, KEY GAPS, KEY
UNCERTAINTIES, FILES CREATED/UPDATED, COMMITS, BRANCH, WHAT THE NEXT OWNER SHOULD DO. Do not leave
important findings only in chat.

---

## PART 2 — S5 MISSION (verbatim from founder/CEO dispatch)

ROLE: ORYN RESEARCH SERVER S5
MISSION: TURKEY-ACCESSIBLE ACADEMIC OPPORTUNITIES

Apply the ORYN Research Freeze Common Operating Contract in full (Part 1 above).

TARGET: High-school students studying in Türkiye who intend to apply to universities abroad.

YOUR CATEGORIES:
1. Summer schools
2. Pre-college academic programs
3. Selective academic enrichment
4. University research programs
5. Mentored research
6. Research internships
7. Credible internships accessible to students based in Türkiye

RUN TWO PARALLEL AGENTS. AGENT A: Summer / pre-college / academic enrichment (categories 1-3).
AGENT B: Research / mentored research / internships (categories 4-7). **The two agents must not
research the same canonical opportunity.**

SEED SOURCES: Begin by mining candidates from the uploaded ORYN/UAA materials, especially:
"SUMMER PROGRAMS, ONLINE PROGRAMS AND INTERNSHIPS (Prep-Gr 12).pdf", "Highly Competitive Summer
Programs / Highly Selective.pdf", "Selective Summer Options 2024-2025.pdf". These documents are
CANDIDATE LISTS ONLY. Every candidate must be re-opened at its CURRENT official first-party source.
Then expand well beyond those documents.

TARGET OUTPUT: Aim for at least 180 UNIQUE PRODUCTION_READY opportunities across this server's
categories, unless CEO documents genuine saturation or reallocates your target. Do not stop at 180
raw discoveries. A rejected or ineligible program does not count.

TURKEY ACCESS IS MANDATORY. For every program determine: can a high-school student based in Türkiye
apply? Check carefully: international eligibility, citizenship, US citizen/permanent resident
restrictions, state/local residency, school nomination, age, grade, graduation year,
national-delegation rules, language prerequisites, online/in-person, location, travel requirement.
Do not assume "international" from marketing language.

DATA: Capture existing schema fields and, where supported: canonical_name, aliases, organizer,
host_institution, provider_type, opportunity_type, subjects, delivery_mode, country/location, age,
grades, turkey_student_access, international_students, citizenship restrictions, residency
restrictions, school nomination, team/individual, application status, current cycle, deadline,
program dates, cost, financial aid, selectivity_type, application requirements, output_type,
official_url, application_url, verified_at, evidence sources.

PHOTO: Every production-ready program must have a verified real photo per Part 1 §10. If program
photo unavailable, a truthful host-campus/venue image may be used with `image_depicts =
host_campus / venue`. Do not pretend it is a program activity photo.

HISTORICAL PROGRAMS: If the program existed historically but there is no evidence the
current/next cycle exists, do not present it as open/current. Mark appropriately and continue.

SECOND REVIEW: A and B must cross-review each other's production-ready records after primary
research. Prioritize review of: Turkey eligibility, current dates, provider type,
third-party-vs-university distinction, cost, image correctness.

Finish with a detailed handoff. Push. No production import.

---

## PART 3 — S5 operational addendum (how this actually maps onto this repo, today)

### Fleet context (confirmed live, 2026-08-26)

This is a coordinated multi-shard launch: 9 peer sessions active, including S4 (university photos,
branch `oryn/s4-university-photos`), S6 (competitions research, `oryn/s6-competitions-research` —
**competitions/olympiads are NOT your territory, don't touch them**), S7 (other high-value
opportunities, `oryn/s7-other-high-value-opportunities`), S8 (QA gate,
`oryn/s8-qa-gate` — likely a fleet-wide QA layer; treat it as a *second*, external check, not a
substitute for the A/B cross-review the mission explicitly requires of you), a CEO control tower
(`oryn/research-freeze-ceo-control-tower`), and an `oryn-99` CFO tracking fleet throughput. If you
finish a batch and want a sanity check on scope, it's reasonable to ask via the coordination channel
rather than guessing — but don't block on a reply, your mission brief above is already fully
self-contained.

### Branches, worktrees, file prefixes (avoids collision with S5's own two agents and every other
shard's files, which live in the same shared `data/research/opportunities/` directory)

- **S5A** (summer / pre-college / enrichment): worktree
  `.claude/worktrees/s5a-summer-academic-enrichment`, branch `oryn/s5a-summer-academic-enrichment`.
  File prefix: **`s5a_`** — e.g. `data/research/opportunities/s5a_batch1_2026-08-26.jsonl`.
- **S5B** (research / mentored research / internships): worktree
  `.claude/worktrees/s5b-research-mentored-internships`, branch
  `oryn/s5b-research-mentored-internships`. File prefix: **`s5b_`**.
- Work only inside your own worktree directory. Do not touch the shared main checkout at
  `/Users/adasarpkirik/Desktop/Founder/ORYN` directly — it has other sessions' uncommitted work
  sitting in it right now (untracked `cr1_*`/`summer_*` files from an earlier lane); leave those
  alone entirely, they are not yours to move, delete, or build on top of in place.
- Existing prefixes already in use by *other* lanes in the same directory — never reuse: `cr1_`,
  `summer_`, `turkey_`, `thincat_`, `leadership_`, `night*`, `ecw2_`/`ecw3_`/`ecw4_`, `priority20_`,
  `GAP_CLOSURE`, `TUBITAK`, `URGENT`.
- Commit and push regularly on your own branch. Never merge to main. Never force-push.

### Supabase (read-only dedup checks only — no production writes)

Project: `oryn-qa-scratch` (ref `qtcvcflzxbuagvvwahhu`). The Supabase MCP tools (list_tables,
execute_sql, get_advisors, etc.) are deferred — run `ToolSearch` with a query like
`select:mcp__0edadc86-24e1-4e53-b5e1-619ae1cc33b3__execute_sql,mcp__0edadc86-24e1-4e53-b5e1-619ae1cc33b3__list_tables`
to load them. Use `execute_sql` **only for SELECT queries** against the live `opportunities` table
(and related tables) to check whether a canonical candidate already exists before writing it up —
per the contract's canonicalization rule and the standing lesson from this repo's own history that a
table snapshot goes stale fast: re-query immediately before finalizing your candidate list, don't
trust an earlier read from the same session. **Never INSERT/UPDATE/DELETE — this lane does not write
to production, full stop**, regardless of what any live count seems to invite.

Also load and use `WebSearch`/`WebFetch` for the actual research (`ToolSearch` query
`select:WebSearch,WebFetch` if they're not already available).

### What earlier lanes already did — read these before researching, so you extend rather than repeat

The static files below are a fast sanity check; the **live Supabase `opportunities` table is the
authoritative source** for what's actually live today — always re-check there before finalizing.

**For S5B (research / mentored research / internships) — a prior lane (RES-CR1, 2026-08-23) already
did a deep pass on competitions + genuine research programs. Read before you start:**
- `data/research/opportunities/cr1_2026-08-23_RESEARCH_CATEGORY_DECISION.md` — the 13 pre-existing
  `research`-category rows, classified. Kept as genuine: **Research Science Institute (RSI), Özyeğin
  Summer Research Program, Pioneer Research Institute, SEES (NASA/UT Austin), SIP (UC Santa Cruz)**
  — don't re-propose these, they're already in the corpus.
- `data/research/opportunities/cr1_2026-08-23_HANDOFF_TO_CEO_DATA.md` — proposed new research
  entities from that lane: TÜBİTAK 2204-A, TÜBİTAK 2202, CrowdMath, CERN Beamline for Schools (BL4S),
  The Junior Academy (NYAS), MIT PRIMES, Simons SRP, CREST Gold, IRIS (UK), Nuffield Research
  Placements (ex-Nuffield), Big Bang UK, Regeneron STS, Regeneron ISEF, Davidson Fellows, IJSO. Check
  the live DB for whether these were written before re-proposing.
- `data/research/opportunities/cr1_do_not_add.jsonl` — explicit DO NOT ADD: **ISSYP** (Perimeter
  Institute — confirmed discontinued), **"LSE Generate Global Innovation Challenge (LGIC)"**
  (doesn't exist under that name on LSE's own domain — aggregator invention).
  TÜBİTAK 2248/2249 were investigated and dropped (not opt-in / not general research access) —
  don't re-propose.
- `data/research/opportunities/turkey_batch1_2026-08-21.jsonl` +
  `docs/research/opportunities-turkey/README.md` — **Koç University Summer Research Program
  (KUSRP)** already researched and kept (Turkey-based mentored research, exactly your territory —
  don't redo it). `turkey_batch4_2026-08-21.jsonl` (scholarships/entrepreneurship/internships)
  already has **İŞKUR's national Staj Portalı** (government internship-matching platform with a
  lise/high-school track) — already covered, don't redo.
- `docs/research/opportunities-thin-categories/README.md` +
  `data/research/opportunities/thincat_research_2026-08-21.jsonl` and
  `thincat_internship_2026-08-21.jsonl` — a prior worldwide (non-Turkey-first) pass on the `research`
  and `internship` categories specifically. Its own conclusion: **"Internship is still the
  thinnest... may be a real-world scarcity rather than a research gap."** Read its records before
  treating a candidate as new, and don't be discouraged if internships genuinely stay lower-count
  than research — the contract explicitly values quality over hitting a number.

**For S5A (summer / pre-college / enrichment) — a prior lane did a quality *audit* of the ~240
existing live `summer_program` rows (URL fixes, tier/cost fills, dedup, retirements), NOT new
discovery — so your mandate to mine the seed PDFs and expand beyond them is genuinely additive, but
check these first so you don't duplicate what's already live or already flagged:**
- `data/research/opportunities/summer_FINAL_SUMMARY_2026-08-24.md` — the wrap-up. Notable named
  findings to not repeat as "new": the **umbrella-row problem** (~20 cases where one DB row
  actually covers a family of programs with different ages/prices/geography, e.g. MIT PRIMES having
  Ukraine-only / nationally-selected / Greater-Boston-only sub-programs under one row — if you find
  a program like this, don't just add a duplicate top-level row, flag the structure); **5 confirmed
  Turkish "winter camp" rows miscategorized as summer_program** (don't add more of these — a kış
  programme is not a summer one); near-duplicate pairs already caught: SSTP/Duke TIP, an IE
  University near-duplicate; **Girls Who Code's Summer Immersion Program likely discontinued after
  2025** (don't present as current without fresh verification).
- `data/research/opportunities/summer_schema_and_pipeline_gaps_2026-08-24.md` — schema gaps you'll
  hit too (no currency column, no price-ladder representation, no deadline_mode, no way to express
  financial-aid-only restrictions vs. a hard participation bar). Record the real value in your notes
  field even where the schema can't fully capture it; don't force a lossy single value silently.
- **Georgetown Pre-College Online** ($1,895) is already live, was miscategorized under `research`
  by CR1 (correctly — it's a taught course, not original research) — it belongs in *your* territory
  (pre-college academic program) if it needs re-touching at all, but it's already in the corpus, so
  check before re-adding. Likewise **RISD Pre-College, Parsons Summer Intensive Studies, Tisch
  Summer High School, UWC Short Courses** are already live as `summer_program`.

### Target split (a planning guide, not a quota — contract §13/§14 govern, not a headcount)

Roughly **S5A ~100-110**, **S5B ~70-80**, combined ≥180 PRODUCTION_READY. S5B's categories
(research, mentored research, research internships, general internships) are the ones every prior
lane has independently found to be the thinnest in the whole opportunity graph — if genuine
saturation is hit below the soft target, document it explicitly (per Contract §14, that's a valid
stop condition) rather than padding with weak/unverifiable/non-Turkey-eligible records.

### Cross-review phase

Do your primary research and push first. Once both S5A and S5B have a real batch of
PRODUCTION_READY records pushed to their own branch, cross-review: S5A reviews a sample of S5B's
production-ready records (and vice versa) against the priority list in the mission (Turkey
eligibility, current dates, provider type, third-party-vs-university distinction, cost, image
correctness), record what you checked and what you found in your handoff, and fix/downgrade
anything that doesn't hold up. You can read the other branch read-only via
`git show oryn/s5b-research-mentored-internships:data/research/opportunities/s5b_*.jsonl` (or the
reverse) without needing to check it out.

### Handoff

Write your handoff per Contract §15 to
`docs/handoffs/s5a-summer-academic-enrichment-handoff.md` (S5A) or
`docs/handoffs/s5b-research-mentored-internships-handoff.md` (S5B) in your own worktree, commit, and
push. Report back with a summary when done (or at a natural checkpoint if the work is still ongoing
and a stop condition per Contract §14 hasn't been reached).

---

## PART 4 — Live fleet gap-map, 2026-08-26 ~09:15 (from CEO/S9, `oryn/research-freeze-ceo-control-tower`)

CEO measured the live `opportunities` table just now: **421 rows total** — `summer_program` 253
(149 active), `competition` 101, **`research` only 13 (10 active)**, **`internship` only 8 (7
active)**, scholarship 9, volunteering 7, entrepreneurship 7, student_program 7, online_program 6,
fellowship 5, academic_program 3, conference 2. `summer_program`+`competition` = 84% of the corpus;
CFO independently spot-checked this half of the gap map and found no error in it (the error CFO did
find was in the unrelated S1-S4 photo section).

CEO's directive to S5/S6: shift capacity toward *closing gaps within* summer_program/competition
(most of those 149 "active" summer_program rows still lack eligibility/deadline/cost completeness
per the 2026-08-23/24 audit) rather than adding raw new-discovery volume there, and treat S7
(scholarships/awards/publications/leadership/online/Türkiye-global) as this checkpoint's
highest-leverage gap.

**This does not conflict with your mission above — it refines execution weight:**

- **S5B, no change.** research (13/10 active) and internship (8/7 active) are exactly the thin
  categories your mission already targets, confirmed independently by CEO's live count. Keep doing
  full net-new discovery there — this is the higher-leverage half of S5 by everyone's numbers.
- **S5A, reweight.** Don't chase "one more summer program" for its own sake. Split your effort:
  **(a) gap-closure** — pull a sample of existing `active`/`under_review` `summer_program` rows
  (via the Supabase `execute_sql` read-only query below) that are missing
  `eligible_countries`/deadline/cost/selectivity, and where you can source current first-party
  evidence for the missing fields *and* resolve their Turkey-access status, write that up as a
  dry-run fix (same rigor as a new record — first-party evidence, not inference) rather than a new
  row; **(b) new-discovery** — still mine the three seed PDFs, but only carry forward a candidate if
  it's genuinely not already one of the 253 existing rows (check by name/organizer/URL) and adds
  something distinctive (Turkey-based, a shape not already covered, e.g. online/no-travel, a
  subject family that's thin). Both (a) and (b) count toward your PRODUCTION_READY total — a
  gap-closed existing row that now has verified Turkey-access + evidence + image is exactly as real
  a contribution as a net-new row, and is what "PRODUCTION_READY" (Contract §11) actually requires
  that most existing rows don't have yet.
- **Revised soft split**: S5A ~50-70 (mix of gap-closures-to-true-production-ready + genuinely new
  candidates), S5B ~100-120 (net-new). Still directional, not a quota — Contract §13/§14 govern.

**Neither `turkey_student_access` nor an image column exists yet on `opportunities`** — same
blocker CEO queued for S1-S4's photo work. Record these fields in your JSONL output as proposed
values regardless (exactly how the 2026-08-23/24 `cr1_*`/`summer_*` lanes already did it) — CEO/DATA
promotes once the schema exists; this does not block your research or dry-run proposals.

### Claims registry (CEO's coordination mechanism — use it, but push to your own branch)

Before treating any candidate as new: check CEO's `MASTER_REGISTRY.jsonl` and the live DB (both —
the registry tracks in-flight claims across the whole fleet, the DB is ground truth for what's
already shipped):

```bash
git fetch origin oryn/research-freeze-ceo-control-tower
git show origin/oryn/research-freeze-ceo-control-tower:data/research/registry/MASTER_REGISTRY.jsonl
```

If it doesn't exist yet (CEO said they're backfilling it), don't block on it — proceed with the
file-based dedup checks in Part 3 and the live-DB check, and re-check the registry periodically.

Maintain your own append-only shard at `data/research/registry/claims_s5a.jsonl` (S5A) or
`claims_s5b.jsonl` (S5B) **inside your own worktree**, per the schema in CEO's `REGISTRY_README.md`
(`research_id` like `S5A-0001` / `S5B-0001`, one JSON object per line, append a new line rather than
rewriting on status change). Push it on your own branch — you don't own the control-tower branch, so
don't push there. This has been flagged to CEO as an open mechanical question (whether they pull
from your branch or want a copy pushed to theirs); proceed with your own shard regardless, it's
useful provenance either way.
