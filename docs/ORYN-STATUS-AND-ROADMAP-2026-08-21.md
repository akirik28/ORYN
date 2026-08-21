# ORYN — Status, Gap Analysis and Roadmap

**Measured:** 2026-08-21, 10:45–11:05 Europe/Istanbul
**Author:** Organization Leader session (coordination-only; no code, schema, or data written)
**Supersedes for status purposes:** `docs/current-state.md` (last measured 2026-08-20)

Every number below was measured directly this morning — live Supabase queries, `git ls-remote`,
and a real local verification run. Nothing is carried forward from another session's claim.
Where a fact comes from another session's self-report rather than my own measurement, it says so.

---

## 1. The one-sentence diagnosis

**ORYN's problem is not a shortage of research. It is a surplus of research that has never been
ingested, merged, or exercised — while the product's actual counseling loop has never run once.**

Six parallel research sessions worked through the night and produced genuinely high-quality,
well-sourced material. Almost none of it has reached the product. Meanwhile the core loop the
whole product exists for — student profile → score → gap → prioritized action — has zero rows
of evidence that it has ever executed.

---

## 2. Measured state

### 2.1 `main` — healthy

| Item | Value |
|---|---|
| `main` tip | `5ec6700` (matches `origin/main` exactly, verified via `git ls-remote`) |
| Lint | Clean |
| Typecheck | Clean |
| Tests | **1140 passed / 98 files** |
| Measured at | 2026-08-21 10:52, full local run in `.claude/worktrees/integration-2026-08-20` |

`main` is genuinely green. This is the one unambiguously good structural fact in this report.

### 2.2 Live database — `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`), measured 10:50

**Reference data (grew materially overnight):**

| Table | Rows | Note |
|---|---|---|
| `universities` | 1,019 | 9 now correctly `superseded` — the 0043 backfill has finally run |
| `university_programs` | 664 | across **54 of 1,019** universities = **5.3% coverage** |
| `university_requirements` | **41** | effectively non-functional at this size |
| `university_deadlines` | **7** | effectively non-functional at this size |
| `opportunities` | 369 | 166 `verified_current` (45.0%), 202 `unverified`, 1 `conflicting` |
| `canonical_entities` | 1,172 | `entity_aliases` 445 |
| `university_statistics` | 128 universities | 12.6% coverage |

**Student-side data — this is the alarming part:**

| Table | Rows |
|---|---|
| `profiles` | 3 |
| `target_universities` | **0** |
| `applications` | **0** |
| `profile_scores` | **0** |
| `advisor_messages` | **0** |
| `weekly_plans` | **0** |

The scoring engine, the AI advisor, the weekly plan generator, and the admission outlook have
**never produced a single row against a real profile.** Every one of them is covered by unit
tests and none of them has been exercised end-to-end. This is the largest unknown in the project.

### 2.3 Data-quality gaps that directly block counseling

These are not cosmetic — each one degrades a specific counseling capability:

| Gap | Magnitude | What it breaks |
|---|---|---|
| `universities.selectivity` null | **1,015 / 1,019 (99.6%)** | Admission outlook cannot differentiate a reach from a likely |
| `opportunities.deadline` null | **323 / 369 (87.5%)** | Deadline urgency and "apply now" prioritization |
| `opportunities.country` null | **235 / 369 (63.7%)** | Geography matching for non-US students |
| `university_requirements` | 41 rows | Requirement Check is a shell |
| `university_deadlines` | 7 rows | University side of the deadline engine is empty |
| `universities.admissions_url` null | 389 / 1,019 (38.2%) | Blocks requirement/deadline acquisition at source |
| `universities.student_size` null | 636 / 1,019 (62.4%) | Institution context for counseling |

**One real improvement to record:** `opportunities.eligible_countries` was 100% missing at the
2026-08-20 checkpoint and is now **0% missing**. That gap is closed.

**Opportunity category distribution is badly skewed:**

```
summer_program   252      internship        8
competition       72      online_program    6
research          13      entrepreneurship  3
scholarship        9      academic_program  3
                          fellowship        2
                          volunteering      1
```

A counselor that must recommend "research exposure" or "an internship" has 13 and 8 options
respectively, worldwide. Summer programs are 68% of the entire table.

### 2.4 Credentials — the hard blocker

Measured directly from `.env.local` (names and value-lengths only, no values read):

| Variable | State |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | set |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | set |
| `SUPABASE_SECRET_KEY` | **EMPTY** |
| `ANTHROPIC_API_KEY` | **EMPTY** |
| `ANTHROPIC_MODEL` | **EMPTY** |
| `TAVILY_API_KEY` | **EMPTY** |
| `COLLEGE_SCORECARD_API_KEY` | **EMPTY** |
| `CRON_SECRET` | **EMPTY** |

`npm run check:integrations` confirms: only OpenAlex reports OK.

**Consequence, stated plainly:** every AI-backed feature in ORYN is dead in this environment.
No advisor, no weekly plan, no CV extraction, no essay outlines, no research generator, no
opportunity discovery, no ingestion writes, no notifications, no admin panel. **This is the
single reason section 2.2's student tables are all zero.** It is a founder-only action.

Note: the Supabase **MCP tooling** works (that is how this report's DB numbers were measured) —
so data work can proceed through MCP even while the app itself cannot run.

---

## 3. The research backlog — high-quality work that has not reached the product

Produced overnight, committed and pushed, **none of it ingested**:

| Lane | Output | Branch | State |
|---|---|---|---|
| University & Program Research | **4,048 program records**, 53 universities, 6 countries (29 batches) | `oryn/programs-pipeline-reconciled` @ `6f3c00d` | Research-only, not ingested |
| Global Opportunities | **51 verified opportunity records**, 21 countries | `oryn/night-opportunities-research-2026-08-21` @ `757e6c1` | Research-only, not ingested |
| Admissions Systems | **8 new countries** (CH/FR/ES/AU/NZ/HK/SG/IE), merged into `admissions-systems-v1.json` → 14 total | `oryn/admissions-intelligence-research` @ `931bcc0` | README matrix still covers only the original 6 |
| Counseling Intelligence (A) | 82 rules / 66 sources / 22 docs | `oryn/counseling-intelligence-research` @ `4ceee4a` | Research-only |
| Counseling Intelligence (B) | 123 rules / 64 sources / 21 docs | `oryn/counseling-intelligence-research-013956` @ `cebe8b9` | Research-only; **rule IDs collide with A** |
| Canonical Entity Intelligence | 18 docs + 12 JSON data files | shares branch with Counseling A | Research-only |

**The gap between 4,048 researched program records and 664 rows in the database is the single
highest-leverage unlock available right now.**

### 3.1 Named research gaps (from the lanes' own closing reports)

**Universities/programs — untouched entirely:** France, Italy, Spain, Switzerland (all named
AGENTS.md priority countries, zero attempts). Essentially all of Asia, Africa, Latin America.
~400 German universities beyond KIT.

**Attempted and blocked, with diagnosed reasons** (valuable — do not re-attempt blindly):
VU Amsterdam (virtualized DOM, renders 10 of 29), Royal Holloway (off-canvas A-Z links),
University of Reading (dropdown-only), Istanbul University (needs ~18-page per-faculty crawl),
Durham/Nottingham/Queen Mary/Bath/Southampton (paginated JS finders), FU Berlin (87–119
programmes, combination-bachelor structure), RWTH Aachen (~190 programmes, no level filter).

**Admissions systems:** batch 3 (Sweden, Belgium, Austria, Poland, Czechia) — zero countries
researched. README cross-country matrix covers 6 of 14. Four proposed new rules never added.

**Opportunities:** the international olympiads slice (IPhO/IChO/IBO/IOI/IOL/iGeo/IOAA) was
dispatched but never completed. Wave 2 (non-US internships/fellowships/scholarships) never
dispatched — which is exactly why those categories show 8/2/9 rows.

### 3.2 The most important research finding of the night

Both counseling sessions independently converged on this, and it is a **product-correctness
issue, not an academic one**:

> ORYN's counseling evidence base is built almost entirely from **US-style holistic admissions**
> sources. Most of ORYN's actual target geographies do not admit that way. For a Turkish student
> on the YKS track, the real lever is exam score — not extracurricular breadth. A counselor
> giving "build a well-rounded activity profile" advice to that student would be **actively
> misleading**.

Verified against official sources across 10 countries. `RULE-COUNSEL-059/060` name it as the
highest-leverage next task. A first qualitative pass exists (`17-dimension-weighting-by-target.md`);
the actual geography-conditional scoring architecture does not exist.

---

## 4. Integration readiness — honest table

From the Integration/Release Manager's own verification, with staleness stated rather than hidden:

| Branch | Candidate? | Last validated | Current tip | Verdict |
|---|---|---|---|---|
| `oryn/counselor-data-quality-v1` | — | — | — | **Already merged** into `5ec6700` |
| `oryn/research-turkey-schools` | — | — | — | **Already merged** into `5ec6700` |
| `oryn/programs-pipeline-reconciled` | Yes | `60d52a3` (full rehearsal, green) | `6f3c00d` | **STALE — 46 commits ahead.** Needs full fresh re-rehearsal |
| `oryn/ui-simplification-v1` | Yes | `7dd046e` (analysis-only, not certification) | `ed54dc5` | **STALE on top of partial.** No browser pass, no mock-data audit |
| `oryn/admissions-intelligence-research` | Inert content | never | `931bcc0` | Purity not independently confirmed |
| `oryn/night-opportunities-research-2026-08-21` | Inert content | never | `757e6c1` | Purity not independently confirmed |
| `oryn/counseling-intelligence-research` | Inert content | never | `4ceee4a` | Carries a **second mandate's** commits (canonical-entity) — merging pulls both |
| `oryn/counseling-intelligence-research-013956` | Inert content | never | `cebe8b9` | Rule-ID collision with the branch above |

**No merge is authorized.** Nothing has been merged and nothing will be without explicit approval.

---

## 5. Why the project feels scattered — structural causes

Not vague; these are the specific mechanisms:

1. **9 git worktrees, 12 branches, 7 unmerged.** Work is spread across parallel universes that
   never converge.
2. **34 documents in `docs/`.** Four of them claim to be the canonical status/plan
   (`MASTER-EXECUTION-STRATEGY.md`, `current-state.md`, `ORYN_WORKSTREAMS.md`, `PHASE_STATUS.md`),
   each with a different last-measured date.
3. **The shared main checkout was used as a workspace by multiple sessions simultaneously.**
   Two sessions overwrote each other's files early in the night; two more had the branch switched
   out from under them mid-work. Three sessions independently escaped into isolated worktrees.
4. **One branch carries two unrelated mandates' commits interleaved** (counseling + canonical-entity).
5. **No lane owned "apply the research."** Six lanes produced; zero consumed.
6. **Rule-ID namespaces collided** because two sessions minted `RULE-COUNSEL-###` independently.

---

## 6. Roadmap — sequenced, not parallel

The lesson from last night is explicit: **six parallel producers with no consumer creates
stranded work.** The fix is fewer simultaneous writers and a real consumption lane.

### Phase 0 — Unblock (founder action, ~15 minutes, blocks almost everything)

1. Populate `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `TAVILY_API_KEY`,
   `CRON_SECRET` in `.env.local`.
2. Confirm Anthropic billing (a prior checkpoint recorded "insufficient credit balance") and
   Tavily plan limit (recorded HTTP 432).

**Until this is done, no AI feature can be built, tested, or demonstrated.**

### Phase 1 — Converge (highest leverage, do first)

| Priority | Work | Why |
|---|---|---|
| P0 | **Ingest the research backlog.** 4,048 program records → `university_programs`; 61 opportunity records → `opportunities`; 4 university candidates → spine. Through `resolveIdentity()`/dedup, with provenance. | Turns a 5.3% program coverage into something a counselor can actually use. Biggest single unlock. |
| P0 | **Exercise the counselor loop end-to-end.** Create real test personas, run scoring → gap → weekly plan → advisor → outlook. Fix what breaks. | Zero rows today. Everything about this loop is currently unverified assumption. |
| P1 | **Re-rehearse and stage Claude A's merge** (46 commits of drift). | Largest unmerged branch; blocks everything downstream. |
| P1 | **Unify the two counseling rule registries** on a fresh branch — mechanical ID-uniqueness pass, peer's `15-executive-summary.md` as guide. | Two colliding registries cannot both be the source of truth. |

### Phase 2 — Fix what blocks counseling quality

| Priority | Work |
|---|---|
| P1 | **Geography-conditional counseling weights** — the YKS/UCAS/holistic problem. Turn `17-dimension-weighting-by-target.md` into a real scoring layer. |
| P1 | **Targeted data-quality remediation** — `selectivity` (99.6% null), `opportunities.deadline` (87.5% null), `opportunities.country` (63.7% null). Not breadth; these specific fields. |
| P2 | **Requirements + university deadlines acquisition** — 41 and 7 rows is a non-feature. |
| P2 | **Integrate the 8 new admissions systems** into the README matrix + ruleset; decide the 2-vs-1 rule question the lane flagged. |

### Phase 3 — Resume research, narrowly scoped

| Priority | Work |
|---|---|
| P2 | **Opportunity categories, not count** — internships (8), scholarships (9), fellowships (2), research (13). Plus the unfinished olympiads slice. |
| P2 | **Programs: France, Italy, Spain, Switzerland** — priority countries with zero coverage. |
| P3 | Admissions batch 3 (Sweden, Belgium, Austria, Poland, Czechia). |

### Phase 4 — Product decisions the founder owes

1. **Drive-doc conflict, still open**: the founder's own "ORYN Programlama" doc excludes messaging
   from V1 and calls for a light/white theme; later chat instructions did the opposite and both
   were built as instructed. Needs a final call. (`docs/known-issues.md` §1)
2. 43 duplicate university identities — merge or leave flagged.
3. Whether Education/GPA appears on public profiles.

---

## 7. Lane structure — proposed, 8 active + 2 reserve

Each lane has an owner, an exclusive scope, and an explicit non-goal. **No two lanes share a
write path.** Lanes marked *sequenced* should not run simultaneously with their dependency.

| # | Lane | Scope (exclusive) | Non-goals |
|---|---|---|---|
| L1 | **Integration / Release** | `main`, merge rehearsals, verification gate, migration ordering | Never authors features; never merges without founder approval |
| L2 | **Ingestion & Pipeline** *(new — the missing consumer)* | `data/research/**` → live tables via `lib/acquisition/**`, dedup, provenance | No new research; no schema changes without L1 sign-off |
| L3 | **Counselor Loop QA** *(new)* | Test personas, end-to-end loop execution, defect list | Doesn't fix product code — files defects for L4 |
| L4 | **Counselor & Product Engineering** | `lib/counselor/**`, `lib/scoring/**`, `lib/admissions/**`, advisor prompts | No data acquisition; no UI restructuring |
| L5 | **Data Quality Remediation** | `selectivity`, deadlines, countries, requirements — targeted fields only | Not breadth expansion; that's L6/L7 |
| L6 | **University & Program Research** | `data/research/university-programs/**`, `data/research/universities/**` | No ingestion (hands to L2); no opportunities |
| L7 | **Opportunity Research** | `data/research/opportunities/**` | No ingestion (hands to L2); no universities |
| L8 | **UI / UX** | `app/**`, `features/**`, design system | No `lib/` logic changes; no data work |
| R1 | *(reserve)* Admissions Systems Research | `docs/research/admissions-systems/**` | Research-only |
| R2 | *(reserve)* Counseling Intelligence | `docs/research/counseling-intelligence/**` | Research-only |

**Recommended concurrency: 3–4 lanes at a time, not 8.** For Phase 1 that means L1, L2, L3 —
plus L4 as defects arrive.

### Operating rules (these are what failed last night)

1. **One worktree per lane. Never work in the shared main checkout.** Three sessions independently
   had to escape it last night; two lost work to overwrites.
2. **Claim your row in `docs/ORYN_WORKSTREAMS.md` before starting.** Update on finish.
3. **Commit and push every coherent checkpoint.** Uncommitted work is invisible to every other
   lane and to Integration.
4. **Namespaced IDs.** Any lane minting `RULE-*` IDs takes an assigned range, never starts at 001.
5. **Research is not production.** `RESEARCHED → EVIDENCE-CHECKED → QA/DEDUP → INTEGRATION-READY →
   PRODUCTION-APPROVED`. Only L2 moves things past stage 3.
6. **Re-fetch live DB state immediately before any write.** The live database is a second,
   non-git collision surface.

---

## 8. What I did not do

- No merges, no pushes, no branch changes, no destructive operations.
- No production database writes — every query this morning was a read-only `SELECT`.
- No research of my own; no edits to any lane's files.
- Two sessions **declined to relay their verbatim mission briefs** to me, on the grounds that they
  could not verify a relayed authority claim and that their instructions are the founder's content
  to share, not theirs. **I consider both refusals correct** and did not press. Those two prompts
  are retrievable by the founder directly from those sessions. Recorded rather than worked around.

---

## 9. Immediate next actions — maximum three

1. **Founder:** populate the five empty credentials in `.env.local` and confirm Anthropic billing.
   Everything in Phase 1 that involves the app is blocked until this happens.
2. **L2 (Ingestion):** stand up the ingestion lane and run the 4,048-record program backlog
   through dedup/identity resolution into a staged, reviewable batch — not a blind insert.
3. **L1 (Integration):** fresh full rehearsal of `oryn/programs-pipeline-reconciled` @ `6f3c00d`
   against `main` @ `5ec6700`, staged and evidenced so a merge is one approved command on return.
