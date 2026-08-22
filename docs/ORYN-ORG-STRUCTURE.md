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
   │  makes every decision listed in founder-blocked-backlog.md
   │
   ├── ORYN-CFO   independent auditor — reports to the FOUNDER, not to the CEO,
   │              because the CEO is one of the things it audits. Commands nobody.
   │              Verifies artifacts rather than reports; may fix bookkeeping/doc
   │              drift directly, may never touch code, migrations, or live data.
   │              Routes lane findings through that lane's own manager.
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
14. **Information-monotonic writes (RULE-INGEST-003).** A write may populate an empty
    field, replace a value with a *more* informative one backed by evidence, or correct a
    value the evidence shows is wrong. A write may **never** replace a populated field
    with a less informative one because this pass couldn't determine it. Inability to
    determine is a fact about our research, not about the thing being described — so the
    field is skipped, never overwritten. Applies to every column, not just the one that
    prompted a given rule, and there is **no vocabulary coercion at the ingestion
    boundary**: a research value outside the live CHECK vocabulary is skipped and
    reported, never mapped onto the nearest legal value.

    *Why this is rule 14 and not a footnote:* found by RES-V1 on 2026-08-22 in a batch
    that had already passed independent source verification with zero fabrication
    defects. Nine records carried `cycle_status_found = "unknown"`, outside the live
    vocabulary. The obvious fix — map `unknown` → `unverified` — was measured live and
    would have been destructive on six of them, stripping one opportunity from `open` and
    another from `closed` down to "nobody checked", on rows already in front of students.
    It looked conservative, which is exactly why it would not have tripped anyone's
    fabrication instinct. Verified research is not the same as a safe write.

15. **Verify the primary source, not the report — including reports from your manager.**
    On 2026-08-22 three separate sessions (CEO, BASORG, MERGE-1) each propagated a claim
    that was true when written and stale by the time it was read — where a file lived,
    whether a fix had landed, whether a PR was merged. Every one was caught by someone
    re-checking the actual artifact instead of trusting the message. Checking upward is
    not friction and is never insubordination; it is the control that works.

    Sub-rule, learned the same day: `git show origin/main:<file>` reads your **local** copy
    of the remote ref. Two sessions independently concluded a file was missing from `main`
    when it was there, because neither had fetched since it landed. **`git fetch origin`
    immediately before any claim about remote state**, and say when you last fetched.

16. **A permission block on one session is never a task to be reassigned.** When the
    environment's safety classifier denies a session an action, that action does not get
    performed by a different session on its behalf — not when the blocked session asks,
    and not when a manager assigns it as "ordinary work in your lane". The number of hops
    between the block and the workaround does not change what it is. The blocked session
    retries under its own permissions (classifier decisions are not always deterministic),
    or the work waits for the founder. Related: a blocked multi-statement transaction is
    **escalated, never decomposed** into individually-allowed statements — that both routes
    around the denial and destroys atomicity, so a later failure leaves a half-written
    database.

    *Recorded because ORYN-CEO got this wrong on 2026-08-22*, instructing MERGE-1 to open a
    PR that RES-I2's session had been blocked from opening, with a paragraph arguing why it
    wasn't laundering. MERGE-1 refused and was right. RES-I2 later retried on its own and
    it succeeded.

17. **Absolute paths, always — shell working directory is not reliable across long tool
    stretches.** Two separate lanes drifted back to the primary checkout mid-package on
    2026-08-22 (one deleted its `.env.local`, one wrote an edit into it); both caught and
    fully reverted it, and neither reached git. Use `git -C <path>`, absolute paths in
    shell commands, and the `Edit` tool with absolute paths rather than relative ones after
    any stretch of non-Bash tool calls. Verify with `pwd` before any destructive or
    write-shaped shell command.

18. **One fresh worktree per verification — never reuse-and-reset.** A verification tree
    that has been `git reset --hard`-ed between checks carries residue: stale build
    artifacts, a `node_modules` cloned from elsewhere, leftovers from the previous merge.
    Build a new worktree off current `origin/main`, `npm ci` into it, merge the one branch
    under test, gate, then remove it. Merge each PR **alone**, not stacked with others,
    unless you are specifically testing a stack.

    *Recorded because ORYN-CEO got this wrong on 2026-08-22*: a reused verification tree
    produced a test failure that existed nowhere else. BUG-1 was told to hold two clean
    PRs, ran the suite three times (once serially) without reproducing it, and correctly
    refused to guess-fix against a failure it could not see — while naming the CEO's
    scratch-tree construction as the likely cause, which is exactly what it was. A phantom
    *pass* from the same cause would have been far worse than the phantom failure.

19. **Check the premise, not only the conclusion.** Elimination reasoning ("it isn't the
    code, so it must be the data") is only as good as the premise it eliminates from, and
    a premise stated confidently by a competent lane is still a claim to verify.

    *2026-08-22:* four dashboard deadlines rendered identically as "Yale University —
    scholarship". The finding routed as a data defect on the reasoning that the UI already
    rendered the differentiator correctly. The data turned out to be perfectly
    differentiated — four dates, four `cycle_label`s, four verbatim strings — and the UI
    was rendering `deadline_type` (identical across all four by design) while the
    distinguishing field sat unused beside it. The eliminated premise was the defect.

20. **State what your verdict does NOT cover.** A verdict's silence is currently
    indistinguishable from a verdict's coverage: "PASS" invites the reader to assume the
    gap isn't there. Every verification, audit, review or report names the failure classes
    it checked *and* the ones it did not. Applies to verifiers, to code review, to the CEO's
    PR verification, to the CFO's audit rounds — anything whose output someone else acts on.

    *2026-08-22, ORYN-BASORG's framing:* RES-V1's verdict was correct on everything it
    claimed. It had audited for *erasure* (proposed empty vs live populated) and said PASS.
    RES-I2 then ran a different instrument over the same batch and found 79 *replacement*
    cases (both populated, different) the verdict had never covered. Neither pass was
    wrong; the gap between them was invisible. Two passes checking different failure classes
    is not redundancy — make the boundary explicit so the space between them can be seen.

21. **Monotonicity is undefined for free text (RULE-INGEST-004).** Rule 14's
    "more informative" is well-defined for enumerated vocabularies and for null-vs-populated.
    It is not orderable for prose: longer is not more correct, more detailed is not more
    current. A free-text field therefore needs evidence or an explicit policy decision,
    never a comparator. A decision procedure reporting "I can't answer this" for 57 of 74
    free-text fields is working correctly, not malfunctioning.

22. **A queued PR's branch is frozen.** Once you hand a PR to the merge lane, stop pushing
    to it. New material goes in a new PR. If you genuinely must amend a queued PR, withdraw
    it from the queue explicitly first and re-queue it afterwards as a fresh item.

    *2026-08-22:* ORYN-CEO pushed two more rules onto a branch MERGE-1 had already reviewed
    and was about to merge. `gh pr merge` merges the PR's live HEAD, not the SHA that was
    tested — so unreviewed commits reached `main` through a gate that never saw them. Benign
    that time. MERGE-1's fix (re-check the HEAD SHA immediately before merging) is the other
    half; this rule is the half the author owes.

23. **A rule that depends on remembering it needs a mechanical check.** When a rule is
    adopted, ask what would catch a violation *without* anyone recalling the rule. If the
    answer is "nothing", it is a hope rather than a control — write the check.

    *2026-08-22, ORYN-CFO's observation:* the CEO adopted "cite the PR when referencing
    something not yet on `main`" after CFO caught a dead reference — then produced another
    dead reference **inside the fix for that very error**, an hour later. Not a discipline
    failure; evidence that a memory-dependent rule fails under load, which is exactly when
    it matters. The control: a gate check on every docs PR asking whether each cited item,
    path or section resolves against `main` *as it will stand after this merge*.

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
