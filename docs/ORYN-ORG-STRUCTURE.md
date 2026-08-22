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

    Second sub-rule, same day, and the most expensive instance so far: **the pipeline's state
    is not the database's state.** BASORG reported a student-facing deadline as stranded and
    hours from expiring; the CEO relayed it into three founder-facing documents, where it stood
    as the founder's number-one priority. Neither had queried the row. It was live, `active`,
    and correct the whole time — only a provenance timestamp was missing. The reasoning error
    is specific and worth naming: *a research record sitting unmerged* was read as *the fact not
    being live*, which confuses the artifact describing reality with reality. **Before escalating
    any claim about live data — especially an urgent one — query the row.** One query would have
    cost seconds. Urgency is exactly the condition under which this check gets skipped, which is
    exactly why it must be mechanical.

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

### Amendment, 2026-08-22: merge authority granted to ORYN-CEO

**The founder granted ORYN-CEO full merge authority**, in chat, verbatim: *"merge gerekiyorsa
ben sana merge yetkisi de veriyorum gerekiyorsa her yetkin var tam yetki senin."* Recorded
here so a later auditor reads the CEO's merges as authorised rather than as a breach of the
single-merger rule above.

**Why it was needed**: MERGE-1 hung mid-turn at 15:42 — `isRunning: true` with no activity for
85 minutes — which is indistinguishable from silence over the message channel, because queued
messages only process when a turn ends. Four questions from two senders went unanswered by
construction, not by choice. `main` stopped moving with 27 PRs open, including a four-day-out
deadline and the three documents the founder needed that evening. Only the founder can un-hang
a session, at its terminal.

**The standing constraint this does NOT remove**: single-party validation is weaker than two,
and the CEO merging its own PRs is weaker still. When the CEO merges under this grant it must
say so, and for its *own* work it should seek an independent check first — ORYN-CFO performed
that accuracy pass on the three founder-facing documents before they merged. **Restore the
normal flow the moment MERGE-1 is available**: the grant is a continuity measure, not a
simplification of the org.

24. **Select by an identifier the author minted, never by a predicate over shared mutable
    state.** Proposed by ORYN-CFO after the CEO's merge script chose its target with
    "the first open PR numbered >= 73", raced with another lane's PR created seconds earlier,
    and merged that lane's work through a gate that verified nothing. The open-PR list is
    shared mutable state; so is a `ListAgents` ref. **Both identify a moment, not an identity.**

    Mechanically: pass `gh pr merge` the **head branch name** — minted by the author, unraceable.
    Where a number is unavoidable, capture the expected `headRefName` at creation time from
    `gh pr create`'s own output (never re-derive it), re-read it immediately before merging, and
    hard-fail on mismatch. For docs-only merges, assert the file list against an allowlist too.

    This generalises: the same class produced today's three ref-based identity misreads — a
    session declared dead, a resumed session mistaken for a stranger, and a lane's PR merged in
    place of another's. Rule 23 says a rule that depends on remembering it needs a mechanical
    check; this is that check for anything addressed by position.

25. **Trace the callers, not the artifact, when reviewing anything that guards behaviour.**
    Migration `0062` was read line by line by its author and again by the CEO, and merged. It
    would have silently frozen score recompute, because the defect was not visible in the file
    — it was in *who else writes those columns and with which client*. BUG-1 found it by going
    to the call sites. A reviewer who checks text and a reviewer who checks callers are
    different disciplines, and security-relevant changes need the second one.

26. **A gate is not green until its worktree is gone.** Reclaiming the verification worktree is
    part of the verification, not cleanup afterwards. Proposed by ORYN-CFO after the CEO ran
    twenty-one PR gates in one evening — each in a fresh worktree with its own clean `npm ci`,
    roughly 900MB apiece, exactly as rule 18 requires — and removed none of them. The volume
    reached **143MB free / 99% full**. Three lanes halted under rule 13, and the CEO's own Bash
    tool stopped working entirely: it could no longer create its own output file, so it could
    not even run `df` to diagnose the problem, let alone `rm` to fix it.

    **This was a ruleset gap, not one session's untidiness.** Rule 18 mandates creating a fresh
    worktree and nothing mandated reclaiming it, so following the rules correctly and often
    enough was sufficient to exhaust the machine. A correctness rule with no paired reclamation
    rule is a slow resource leak with a mandate.

    Also learned here, and it colours how every report tonight should be read: **disk exhaustion
    can surface as a permission denial.** FEAT-1 had three actions refused as "denied by the
    classifier" and then found a plain `Edit` failing with a literal ENOSPC. Treat any "blocked
    by classifier" report during resource pressure as unconfirmed cause until disk is verified
    healthy — including blocks that were already reasoned about and acted on.

27. **After a squash-merge, do not read a diff — compute the merge result.** Squash-merging
    rewrites what a branch's relationship to `main` means, and both diff forms then lie, in
    opposite directions. Measured on one branch inside one minute:

    - `git diff origin/main...origin/<branch>` (three dots) showed ~750 already-merged records
      as **new additions**, because the merge-base predates them.
    - `git diff origin/main origin/<branch>` (two dots) showed **15,638 deletions**, including
      migrations `0061`–`0063` — reading as though the PR would revert the evening's security
      work.

    Neither was true. The actual answer was **+20 lines, 0 deletions**:

    ```bash
    tree=$(git merge-tree --write-tree origin/main origin/<branch>)
    git diff --stat origin/main "$tree"
    ```

    The CEO came within one command of escalating "a PR is about to delete our security
    migrations" on the strength of a stat line.

    **This is the fourth trap of one species on a single day**, and the species is what matters
    more than any of the four: *a tool's output standing in for the question you actually
    asked.* The others were bare `git merge-tree`'s exit-0 on conflict (twice), selecting a
    merge target by a predicate over the open-PR list (rule 24), and a `ListAgents` reference
    read as an identity (rules 24, 26). In each case the tool answered honestly — a different
    question. **Before trusting any tool output as evidence, state the question you meant and
    check that the command answers that one.**

    **Variant, contributed by ORYN-BASORG: the check was correct and the timing wasn't.** It read
    a per-university count *mid-apply*, saw 102 where 107 was expected, and briefly read the
    five-row shortfall as an identity defect. It was a table read during a write. It verified the
    canonical row and the batch reconciliation **before reporting**, and the discrepancy
    dissolved. This is the mirror of the cases above: there, the tool answered a *different*
    question; here it answered the **right** question at an instant that made the answer wrong.

    Same species, same day: a `ListAgents` ref read as an identity, a `current-state.md` liveness
    line read as current, React state read before it committed, a table read mid-write. **Four
    true answers, each taken at the wrong instant.** When a measurement disagrees with an
    expectation, establish *when* it was taken before concluding *what* it means.

28. **A shared test account is a shared resource. Claim it, name it, never share it
    concurrently.** Any lane doing live verification states in its report **which account it is
    using**, and no two lanes use the same account at the same time. The CEO allocates.

    Earned expensively. Three lanes — FEAT-1, FEAT-2 and UI-1 — were assigned live browser work
    on the same evening with two QA accounts between them and **no allocation from the CEO**.
    All three ended up driving onboarding on `oryn.qa.b` simultaneously. The result was a
    profile row reading `country: United States` with `school_name: MEF Lisesi`, a Turkish
    school — one lane's US selection interleaved with another's Turkish one.

    **That row was then escalated as a confirmed product defect.** The CEO argued the
    self-contradiction *ruled out* measurement artifacts, on the reasoning that a mis-aimed
    click yields a wrong record rather than a self-inconsistent one. True as far as it went, and
    wrong — it enumerated one class of artifact and stopped. **A second writer produces exactly
    that signature.** A third lane was sent to diagnose a defect that the evidence did not
    support, and two lanes independently retracted findings built on the same contaminated row.

    Two lessons, and the second is the general one:

    - **Contamination is not corruption.** The account was never damaged, it was crowded. The
      fix is exclusivity, not a fresh account — under sole access, every observation becomes
      attributable again. Reaching for a new fixture is usually solving the wrong problem, and
      it may require permissions no session holds.
    - **Before concluding that data is corrupted, ask who else was writing.** Shared fixtures
      manufacture defects that look exactly like real ones, and look *most* convincing when the
      resulting record is internally inconsistent — the very feature that seems to prove a
      single-writer bug is the signature of two writers.

    **AMENDED, same evening — allocation alone does not work.** Within an hour of this rule
    being written, a lane holding a correct exclusive allocation still wrote to another lane's
    account. **Cookies are shared across tabs within one browser instance**, so a session can
    follow this rule exactly, open a tab for an unrelated reason, and have a write land on a
    different account with no error, no prompt and nothing visible — it surfaced only because an
    unexpected redirect happened to expose it. The lane self-reported it, verified the blast
    radius against the live database before assuming anything, and removed exactly one row.

    **So: verify identity at the point of write, not at login, and by cookie rather than by
    screen content.** Screen content renders a session that may since have changed; the cookie is
    what the server will actually act on. "I logged in as X" and "this write will land on X" are
    different claims, and only the second one matters.

    This is rule 27's timing variant again — **a true answer taken at the wrong instant** — and
    it is the fifth instance in one day, across four sessions, and the first to cause a write.

    Note what did survive: UI-1's independent diagnosis, which rested on **static source code**
    rather than on the live row, and which it had explicitly declined to corroborate against an
    account it noticed was moving under it. When a fixture is shared, the artifact that cannot
    be contaminated is the one to reason from.

29. **Live browser verification is serialized. One lane at a time, allocated by the CEO.**
    The Browser pane appears to be a **single shared browser instance across concurrent sessions
    on this machine**, not one private instance per session. A lane logging in as account X
    silently rewrites the session cookie in *every other lane's tabs* on that origin — no error,
    no prompt, no signal until something happens to expose it.

    Evidence: FEAT-2 had its identity change twice. The second time was on a **single tab it was
    driving continuously**, with no new tab, no login, and no action that touches auth. It
    checked the cookie immediately before a write, with the form already filled, and found it
    had become another account's. It did not save. UI-1 was logging into that account, in the
    same window, for an unrelated investigation.

    **This defeats rule 28 entirely.** Allocating accounts exclusively assumes a session controls
    which identity its browser presents; it does not. It also defeats rule 28's own amendment:
    checking the cookie before a write narrows the window but cannot close it, because identity
    can change between the check and the write. As FEAT-2 put it, **"'before' isn't 'at'."**

    So the control is exclusivity of the *browser*, not of the account. **Ask the CEO before any
    live browser verification; do not start because your account is unshared.** Keep checking the
    cookie before each write anyway: under exclusive use it becomes a detector — a flip while you
    hold the browser alone would falsify this and point somewhere worse.

    **The general lesson is the expensive one.** This is the third tooling failure in one day that
    disguised itself as something else: disk exhaustion surfaced as a permission denial, a dev
    server died while keeping its port, and identity was reassigned mid-session. **None was
    visible from inside the affected session**, and all three were found by a lane checking
    something it had no particular reason to doubt. When an observation is inexplicable in terms
    of your own actions, suspect the environment before suspecting your reasoning — and report it
    rather than explaining it away.

## 6. Known founder-pending items no lane may act on unilaterally

- Evidence-gate false rejections (2,097 blocked records) — `docs/handoffs/evidence-gate-false-rejections-2026-08-22.md`
- Migration 0057 `kilavuz_kodu` — backlog item 26
- GPA on public profiles (item 16b) · Drive-doc messaging/theme conflict (item 11) —
  relevant to UI-1: **no unilateral re-theming**
- Anything else in `docs/founder-blocked-backlog.md`
