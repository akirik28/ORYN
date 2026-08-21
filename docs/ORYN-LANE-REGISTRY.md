# ORYN — Lane Registry

**One question this file answers: who owns what, right now.**

Maintained by the coordination session. Every row was **confirmed by the lane itself**, not
inferred from a branch name or a session slot. Last verified: 2026-08-21 11:50 Europe/Istanbul.

## The rule that produced this file

Twice in one hour the coordination session assigned work by session-slot without first asking
what a session was already doing, and twice a lane pushed back rather than silently switching.
Both times the lane was right. The rule, adopted in the words of the lane that stated it best:

> **Ask what a session is already doing before assigning, and treat "already assigned by the
> founder" as occupancy.**

A new assignment that conflicts with an existing one is a **reconciliation event**: the receiving
lane should flag it and keep working, not switch silently and not stop. This registry exists so
that the conflict gets caught before the work starts, not after.

## Active lanes

| Lane | Branch / worktree | Owns (exclusive) | Status |
|---|---|---|---|
| **Integration / Release** | `main`, `.claude/worktrees/integration-2026-08-20` | `main`, merge rehearsals, the verification gate, migration ordering, release readiness | Active. Fixed the post-merge lint break; rewriting `ORYN_WORKSTREAMS.md`, then release-readiness. |
| **Programme acquisition** | `oryn/programs-pipeline-reconciled` | `data/research/university-programs/**`, the acquisition/ingestion engine | Active. Reconciling the 4,539 ingested rows against its own dry-run prediction. |
| **Priority-country programmes** | `worktree-priority-country-programs` | `data/research/university-programs/fr_it_es_ch_*.jsonl`, `docs/research/university-programs-priority-countries/` — **France, Italy, Spain, Switzerland**; later, requirements for those same four | Active. Politecnico di Milano (29) and Carlos III (~64) in hand. |
| **University requirements & deadlines** | `oryn/university-requirements-research` | `data/research/university-requirements/`, `docs/research/university-requirements/` — **UK, Ireland, Turkey, Netherlands, Germany, US** | Active. Cambridge 2027-entry deadline calendar verified. |
| **Opportunity data quality** | `oryn/night-opportunities-research-2026-08-21` | `data/research/opportunities/night*` | Active. 35-row update batch **awaiting the founder's direct authorization** to write; staleness audit of already-populated deadlines running meanwhile. |
| **Admissions systems** | `oryn/admissions-intelligence-research` | `docs/research/admissions-systems/**`, `data/research/admissions-systems/**` | Active. 14 countries integrated into the cross-country matrix; writing **Turkey/YKS**, the one destination system missing from the set. |
| **Counselor engineering** | branch off `main` | `lib/admissions/**`, `lib/scoring/**`, `lib/opportunities/matching.ts` | Active. Fixing the 5 defects its own QA pass found, each with a regression test. |
| **Requirements audit** | own branch | `docs/research/requirements-audit/` | Active. Auditing the founder's Drive documents against what the code actually does. |

## Background research agents (coordination-session subagents, isolated worktrees)

| Agent | Owns (exclusive) | Purpose |
|---|---|---|
| Turkish exams | `docs/research/turkish-exams/`, `data/research/turkish-exams/` | YKS/TYT/AYT/YDT, OBP, LGS, YÖS, YDS/YÖKDİL, MEB diploma recognition. Also asked to identify **"UDSP"** — an acronym the founder named that could not be verified; instructed to report honestly if no such exam exists rather than substitute a different one. |
| Thin-category opportunities | `data/research/opportunities/thincat_*.jsonl` | Internships (8 live rows), scholarships (9), fellowships (2), research (13) — worldwide, Turkey/Europe first. |
| Leadership & impact | `data/research/opportunities/leadership_*.jsonl` | Closing the `community_impact` = 0 / `leadership` = 2 catalogue hole. |

## Dormant / closed

| Branch | Disposition |
|---|---|
| `oryn/ui-simplification-v1` | **Founder-rejected 2026-08-21.** "Do not merge it under any circumstances, that UI is very bad, let's continue with the old one." Not a hold — rejected. Do not revive. |
| `oryn/counseling-intelligence-research`, `-013956`, `oryn/counseling-registry-unification`, `oryn/geography-conditional-weighting`, `oryn/counselor-loop-qa`, `oryn/admissions-intelligence-research`, `oryn/night-opportunities-research-2026-08-21` | Merged into `main` @ `3a5c63f`. Lanes that continue working do so on new commits. |
| `oryn/counselor-data-quality-v1`, `oryn/research-turkey-schools` | Merged earlier into `main` @ `5ec6700`. |
| `oryn/university-intelligence-spine`, `oryn/counselor-core-v1`, `oryn/integration-2026-08-19`, `oryn/recovery-pre-integration-2026-08-19`, `oryn/product-ux`, `oryn/programs-opportunities-intel`, `oryn/programs-pipeline` | Historical. Confirm content has already landed before building on any of them. |

## Standing operating rules

1. **One worktree per lane. Never work in the shared main checkout.** Three sessions had to
   escape it overnight; two lost work to concurrent overwrites.
2. **Claim your row here before starting substantial work.** Update it when you finish or hand off.
3. **Commit and push every coherent checkpoint.** Uncommitted work is invisible to every other
   lane and to Integration.
4. **Namespaced IDs.** Any lane minting `RULE-*` identifiers takes an assigned range and states
   which; never start at 001. Two lanes independently minted `RULE-COUNSEL-001`–`033` overnight
   and produced 33 colliding IDs for 33 genuinely different rules.
5. **Research is not production.** `RESEARCHED → EVIDENCE-CHECKED → QA/DEDUP → INTEGRATION-READY
   → PRODUCTION-APPROVED`. A researched record is not approved data.
6. **Re-fetch live database state immediately before any write.** The live database is a second,
   non-git collision surface with no branch signal.
7. **The gate runs against the final tree after a merge wave, not only per-branch.** Adopted after
   seven individually-green branches produced a red `main`.
8. **Never resolve a content conflict by silently picking a side.** Preserve both and escalate —
   see `docs/research/counseling-intelligence/CONFLICT-NOTICE-00-and-02.md` for the worked example.

## Open escalations — founder decisions, not agent decisions

1. **`ANTHROPIC_API_KEY` is empty.** Every AI-backed surface is dead: advisor, weekly plan, CV
   extraction, essay outlines, research generator. Requires paid credit. `TAVILY_API_KEY` also
   empty (free tier exists) — opportunity discovery is dead without it.
2. **Source-authority gate is too narrow.** `lib/acquisition/source-authority.ts`'s
   `looksOfficial()` accepts only `.edu` / `.ac.` / `.gov` domains, and the `opportunities` fact
   class is official-domain-or-nothing. This rejects **UCAS, CAO, Studielink, Hochschulstart and
   Common App** — the application systems ORYN's own briefs name as valid deadline authorities —
   and nearly every Turkish/European youth organisation (`.org.tr`, `.com.tr`). The fix is an
   organiser-domain provenance field feeding `sourceAuthority()`'s existing `officialDomains`
   parameter. **This is a provenance problem, not a reason to lower the evidence bar.**
3. **Scalar columns that cannot hold real values.** `opportunities.cost` is `numeric` but 25
   researched records carry genuine multi-tier/multi-currency pricing. `university_programs.
   duration_years` is numeric against durations like "3 years (4 with placement)". Decide: widen
   to text, add a structured companion field, or accept lossy extraction only where unambiguous.
4. **Unweighted 9-dimension average** in `lib/scoring/index.ts` — a strong founder/leadership
   persona scores 21 overall because untouched dimensions drag a flat mean down. Design question,
   deliberately not changed unilaterally.
5. **Drive-vs-chat product conflicts** — messaging scope and light-vs-dark theme. See
   `docs/known-issues.md` §1; an audit lane is establishing what the app actually does today.
