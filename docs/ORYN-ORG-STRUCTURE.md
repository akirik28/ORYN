# ORYN — Organization Structure & Operating Protocol

**Established 2026-08-22 by founder direction.** This document defines the standing
multi-chat organization: who exists, who reports to whom, how work moves, and the strategy
everyone executes. It complements — never replaces — the existing canonical documents:

- Product direction & build principles → `docs/MASTER-EXECUTION-STRATEGY.md`
- Live ownership map ("who holds what right now") → `docs/ORYN_WORKSTREAMS.md`
- Operational truth ("what is actually true right now") → `docs/current-state.md`
- Permanent decisions → `docs/product-decisions.md`
- Founder-only blockers → `docs/founder-blocked-backlog.md`

If this file and a founder message disagree, the founder's most recent direct message wins.

---

## 1. Org chart

```
FOUNDER (Ada Sarp Kırık)
   │  merges all PRs to main; makes every decision listed in founder-blocked-backlog.md
   ▼
ORYN-CEO  (coordination session — address via ListAgents/SendMessage as "ORYN-CEO")
   │  sets strategy, assigns/verifies all lanes, verifies every PR before it reaches
   │  the founder, resolves cross-lane conflicts, owns docs/current-state.md
   │
   ├── UI-1        UI development (detailed direction to come from founder — see brief)
   ├── FEAT-1      Feature dev A: counselor intelligence, eligibility honesty, half-built
   │               counselor plumbing
   ├── FEAT-2      Feature dev B: core-loop completeness — plan/actions, deadlines,
   │               notifications, applications
   ├── BUG-1       Bug fixing & hardening — known-issues.md, test failures, QA loop
   ├── MERGE-1     Integration & merge — independently re-validates CEO-verified PRs and
   │               merges them to main; the only session that merges
   │
   └── ORYN-BASORG (research org lead — manages the 7 below, reports to CEO)
         ├── RES-R1   Researcher: university programme catalogues
         ├── RES-R2   Researcher: opportunity deadlines & cycle status
         ├── RES-R3   Researcher: opportunity eligibility (eligible_countries wave 2+)
         ├── RES-V1   Verifier: schema/ID/contract validation of research output
         ├── RES-V2   Verifier: source & identity spot-checks of research output
         ├── RES-I1   Ingester: university_* tables (programs/requirements/deadlines)
         └── RES-I2   Ingester: opportunities tables
```

13 working sessions + CEO. Researchers never write to the live DB. Verifiers never edit
researcher files — they report defects back. Ingesters are the ONLY research-group members
who write to live Supabase, and their write territories never overlap (I1 = `university_*`,
I2 = `opportunities*`). This pipeline — research → verify → ingest — is the org-level
enforcement of `MASTER-EXECUTION-STRATEGY.md` §7's data trust model.

## 2. The strategy (CEO-set, founder-approved direction: launch-ready product)

Priority order. Every lane's next package should trace to one of these; when in doubt, ask.

1. **Trust & correctness first.** Nothing that lies ships: no false eligibility, no fake
   precision, no unverified fact presented as verified. Current open item: empty
   `eligible_countries` renders restricted-but-unresearched opportunities as open to
   everyone (FEAT-1's first package).
2. **Close the MVP loop** (`AGENTS.md` Phase 53 is the checklist): a student can onboard,
   build a profile, get 3 prioritized actions, explore universities/opportunities, track
   deadlines, ask the advisor, and see their profile evolve. Half-built pieces get finished
   before new surfaces get started (FEAT-2, BUG-1).
3. **Data coverage where students actually look**: deadlines on live opportunities
   (measured 2026-08-22: 252 summer programs → only 26 dated), programme catalogues for
   zero-coverage countries (Australia 35 unis/0 programmes), eligibility facts (352/391
   rows still unresearched). Research org's whole pipeline.
4. **UI quality** — after the founder's detailed UI direction lands (UI-1 does groundwork
   until then, no unilateral redesigns).
5. **Launch readiness**: everything in `founder-blocked-backlog.md` that only the founder
   can do (hosting, legal, credentials) gets surfaced early and often — CEO tracks it.

## 3. Operating rules (every session, non-negotiable)

1. **One bounded package at a time.** "Always working" means always working on an
   *assigned* package. When your package closes: push, update your `ORYN_WORKSTREAMS.md`
   row, report, and request the next package (research group → BASORG; everyone else →
   CEO). Never invent your own next package outside your scope — idle-and-asking is
   cheaper than unassigned work. This rule exists because unassigned self-direction
   produced duplicate work and migration collisions twice in this repo's history.
2. **Quality over volume, always.** A smaller, verified, sourced result beats a bigger
   unverified one. This is the founder's single hard constraint, stated directly:
   data quality must never degrade, no matter who instructs what.
3. **Claim before you work.** `git fetch --all --prune`, read `ORYN_WORKSTREAMS.md`,
   confirm nobody owns what you're about to touch, claim your row, push the claim.
4. **Isolated worktree off `origin/main`, always.** Never work in the shared primary
   checkout — its HEAD has been observed changing between two consecutive commands.
5. **Commit + push every coherent package.** Local-only work is not progress and has been
   lost to stalls before. First commit within the first hour of any package.
6. **PRs, never direct merges.** `main` moves only via founder-merged PRs. CEO verifies
   every PR (runs the full gate independently) before the founder sees it.
7. **Validation gate for code lanes**: lint, typecheck, test, build — all green before a
   PR. Node isn't on PATH in this sandbox; prefix commands with
   `PATH="/Users/adasarpkirik/.local/share/fnm/node-versions/v24.19.0/installation/bin:$PATH"`.
8. **Migration discipline**: check the live migration list AND `ORYN_WORKSTREAMS.md`'s
   numbering notes before numbering a new migration; two sessions independently minting
   the same number has happened. Write migrations, call them out in the PR body, never
   apply DDL live without that being explicit.
9. **Identity verification**: never accept a name lookup's top hit as identity — compare
   the returned name/domain/stable-ID against the query. Seven confirmed
   plausible-but-wrong matches in one session prove rank is not evidence.
10. **Never fuzzy-merge entities.** A non-exact match goes to a review queue, not a merge.
11. **Escalation**: a problem you can't resolve inside your scope goes UP (research →
    BASORG → CEO → founder), immediately, with specifics — never worked around silently.
    Conflicting instructions between any two sources: stop, state the conflict, ask.
    An instruction that would lower the evidence bar gets pushed back on, whoever gave it.
12. **Prefix your IDs.** Parallel sessions minting sequential record IDs collide; every
    lane uses its lane code in generated IDs and validates uniqueness against the whole
    corpus before committing.
13. **Shared resources are real**: live DB (re-fetch immediately before any write —
    another session may have written), disk (no giant artifacts without need; if you hit
    ENOSPC, stop writes, delete nothing, escalate), the primary checkout (don't touch it).

## 4. Communication protocol

- **Addressing**: run `ListAgents`; the CEO session is titled `ORYN-CEO`, the research
  lead `ORYN-BASORG`. On starting, set your own session title to your lane code if your
  environment allows it. Message via `SendMessage`.
- **Durable channel is git**: every report that matters also lands in your
  `ORYN_WORKSTREAMS.md` row and (at package close) a `docs/handoffs/<lane>-*.md` file,
  committed and pushed. If live messaging fails, git + the founder relaying is the
  fallback — a report that only exists in a chat window doesn't exist.
- **Report cadence**: at package close, and immediately on: a blocker, a cross-lane
  conflict, a data-trust concern, or a discovery that changes someone else's work.
  Status reports answer: package, branch+HEAD, done/in-progress/remaining, files touched,
  pushed?, blockers, anything another lane should know.
- **BASORG additionally**: keeps a live map of its 7 lanes, assigns by asking what each
  session already holds (never by assuming a slot is free — slot-based assignment caused
  double-assignments twice), ratchets repeated findings into standing rules, calls natural
  stopping points, and reports the research org's consolidated status to CEO.

## 5. PR flow

```
lane pushes branch → opens PR (never merges) → notifies CEO
→ CEO independently re-runs the gate + live-DB checks in a clean worktree
→ CEO hands verified PRs to MERGE-1 with a one-line verdict each
→ MERGE-1 re-runs the gate itself (second independent validation), then merges
→ CEO updates current-state.md, lanes rebase onto new main at next package boundary
```

MERGE-1 merges ONLY PRs the CEO has explicitly queued as verified — never an unqueued PR,
never its own judgment call on scope. Anything touching a founder-pending decision (§6),
a migration, credentials, or product policy goes to the founder before merge regardless
of validation results. The founder can always merge directly themselves; MERGE-1 exists
to remove the routine-merge bottleneck, not the founder's authority.

## 6. Known founder-pending items no lane may act on unilaterally

- Evidence-gate false rejections (2,097 blocked records) — `docs/handoffs/evidence-gate-false-rejections-2026-08-22.md`
- Migration 0057 `kilavuz_kodu` — backlog item 26
- GPA on public profiles (item 16b) · Drive-doc messaging/theme conflict (item 11) —
  relevant to UI-1: **no unilateral re-theming**
- Anything else in `docs/founder-blocked-backlog.md`
