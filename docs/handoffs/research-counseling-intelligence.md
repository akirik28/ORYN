# Handoff — Counseling Intelligence Research (this session's branch)

**Read this first if resuming this specific branch cold.** This is the resumption record for
`oryn/counseling-intelligence-research-013956`, one of (at least) two branches carrying this
mission tonight — see "Branch topology" below before assuming this is the only relevant handoff.

## What happened tonight (full account, so nobody has to reconstruct it from git archaeology)

1. **01:21 Europe/Istanbul, 2026-08-21**: this session started the "ORYN NIGHT RESEARCH —
   COUNSELING INTELLIGENCE" mission, read `AGENTS.md`/`docs/counselor-core.md`/`docs/counselor-
   core-plan.md`/`lib/counselor/**`/`lib/scoring/**` in full, branched `oryn/counseling-
   intelligence-research` off `oryn/programs-pipeline-reconciled`, and committed `148a2d6`
   (00-overview.md scaffold) and `51b1978` (01-development-taxonomy.md) — both pushed.
2. **~01:33-01:35**: a **live collision** was discovered — `01-development-taxonomy.md` and then
   `02-opportunity-development-mapping.md` changed on disk mid-session, in a different voice/
   citation style, referencing a sibling "career-intelligence" package. Investigation (`ps aux`,
   `git worktree list`, `ListAgents`) confirmed: **the founder had launched a large fleet of
   parallel overnight sessions** (7+ peers visible via `ListAgents` alone; `git worktree list`
   showed 8 active worktrees; other sessions independently reported 8-9 concurrent
   worktrees/checkouts when they checked) — at least one other session had been assigned the
   *identical* counseling-intelligence mission, working in the *same non-worktree main checkout*
   as this session, both unaware of the other until commits started interleaving.
3. **~01:35-02:00**: coordinated live via `SendMessage` (not founder mediation — genuinely
   resolved session-to-session) with the colliding peer (socket `uds:/tmp/cc-socks/71534.sock`,
   self-identified variously as "7" in its messages). Also made brief contact with: a third,
   unrelated session doing "canonical-entity-intelligence" research on the *same* shared branch
   (socket `71384`, self-identified "6" — confirmed no file overlap, just branch-sharing noise);
   a fourth session that **also** independently rewrote `01`/`02` on the shared branch with its
   own `RULE-COUNSEL-001-033` numbering (socket `70608`, "Design student profile evidence taxonomy
   for ORYN" — acknowledged the numbering wouldn't be reconciled live, each side kept its own
   version); and three genuinely unrelated sessions (admissions-systems research, global-
   opportunities research, university/program-catalogue research) that each separately confirmed
   being caught by the same shared-checkout problem and independently fixed it the same way
   (isolated worktree).
4. **Resolution**: this session forked a clean branch, `oryn/counseling-intelligence-research-
   013956`, from its **own** last good commit (`51b1978` — deliberately *not* built on top of the
   peer's rewrite, since it hadn't been evaluated yet), in an isolated worktree
   (`.claude/worktrees/counseling-intelligence-research-013956`), recreated `02` from this
   session's own conversation memory (the only file lost to the live overwrite before it could be
   committed — content fully reconstructed, nothing substantive lost), and agreed an explicit
   division of labor with the "7" peer, who remained on the original shared branch
   (`oryn/counseling-intelligence-research`):
   - **This branch owns**: `00`, `01`, `02`, `04`, `05`, `06-major-family-evidence/10` through `17`
     (medicine, psychology, poli-sci/IR/policy, law, sociology/history/philosophy, literature/
     journalism/communication, architecture/design, visual/media arts), `09`, `10`.
   - **Peer's branch (`oryn/counseling-intelligence-research`) owns**: `03`
     (recommendation-timing), `06-major-family-evidence/00` (taxonomy umbrella) through `09`
     (computing, math/stats, physical sciences, life sciences, engineering ME/CE/AE/EE, biomedical
     engineering, econ/finance, business/entrepreneurship, environmental science), `07`
     (explainability), `08` (unsafe-inference, consolidated across both branches).
5. **~02:00 onward**: both sessions worked their halves independently, checking in via
   `SendMessage` at natural checkpoints (not blocking on replies). This session finished its full
   assigned scope by approximately 02:35 (all times approximate, not logged precisely turn-by-
   turn) and used remaining time to test both halves together (`09-persona-testing.md`, which
   reads the peer's `03`/`08` via `git show` without editing that branch) and to research the
   single highest-leverage gap the persona-testing found (see "What's next" below).

## Branch topology — READ THIS BEFORE ASSUMING ANYTHING IS "the" branch

| Branch | Owner | Contains |
|---|---|---|
| `oryn/counseling-intelligence-research-013956` (**this branch**) | This session | `00`,`01`,`02`,`04`,`05`,`06/10-17`,`09`,`10`, this file, `data/research/counseling-intelligence/{rules,sources}.json` (this session's half only) |
| `oryn/counseling-intelligence-research` | Peer session ("7") + two unrelated sessions sharing the same checkout | `03`,`06/00-09`,`07`,`08`, the peer's own `rules.json`/`sources.json` (its own half), **plus** an entirely separate `docs/research/canonical-entity-intelligence/**` tree from an unrelated mission, **plus** this branch's own early, now-superseded commits (`3bbedb3`, `57d45f2`, `fab74a3` — competing early drafts of `01`/`02` from two different sessions, never reconciled, still in that branch's history) |

**Neither branch is individually complete.** This branch has no `03`/`06/00-09`/`07`/`08`. The
peer's branch has no `04`/`06/10-17`/`09`/`10`, plus carries unrelated noise from the
canonical-entity mission. **A real integration pass is required** — see "Integration instructions"
below. Do not merge either branch into `main` as-is and call it done.

## Integration instructions for whoever does the merge

1. This branch (`-013956`) is the recommended merge *target* — it has no unrelated noise, unlike
   the shared branch. Cherry-pick or merge the peer branch's path-scoped commits
   (`docs/research/counseling-intelligence/03-*`, `06-major-family-evidence/0[0-9]-*`, `07-*`,
   `08-*`, and its own `data/research/counseling-intelligence/*` — **check exact filenames first,
   there will be a `rules.json`/`sources.json` collision to resolve, not a clean merge**) onto this
   branch, explicitly excluding `docs/research/canonical-entity-intelligence/**` and that mission's
   `data/research/canonical-entities/**` (unrelated, belongs on its own branch).
2. **Rule-ID collision, known and NOT resolved**: `RULE-COUNSEL-056` was independently minted by
   both branches for two different rules (this branch: exempt breadth-dimension candidates from
   redundancy discounting for Phase-1 students, in `09`; peer's: never present a secondary-sourced
   opportunity as confirmed/current, in `08`). **Renumber one of them before merging `rules.json`
   files** — do not silently pick one and discard the other, both are real, validated rules.
   Re-scan for any other collisions in the 001-060 (this branch) vs. the peer's range before
   assuming only one exists.
3. **This branch's rules.json/sources.json cover only this branch's own 8 documents** (60 rules,
   26 sources) — deliberately not merged with the peer's own registry live, per an explicit
   mutual agreement to avoid a second live-collision risk on shared JSON files. The unified
   registry is genuinely unbuilt — budget real time for this, it is not a trivial concatenation
   given the ID collision above and likely cross-references between the two halves' rules that
   were written without seeing each other's exact final numbering.
4. Update `docs/ORYN_WORKSTREAMS.md`'s `COUNSEL-RESEARCH` row (this branch's copy already reflects
   the collision/split; the peer's copy may say something different — reconcile, don't assume
   either is more current without checking timestamps).

## What's actually in this branch, and what it's worth reading first

Start with `docs/research/counseling-intelligence/00-overview.md` for the package's scope/method,
then `01-development-taxonomy.md` (validates the shipped 9-dimension `ProfileDimension` taxonomy
against Common Data Set/NACAC/MIT/Harvard-GSE research and all 9 `lib/scoring/dimensions/*.ts`
files read in full — proposes zero schema changes). Each subsequent doc builds on it; see `00`'s
own table of contents.

**The single most important finding in this branch, read this even if nothing else**:
`10-open-questions.md` §1 — most of this package's evidence base (and, by its own admission, likely
much of the peer branch's too, though not independently confirmed) is drawn from **US-style
holistic-admissions research**. Direct verification this session (Turkish YKS system, UK UCAS
guidance) found that **Turkey's admission is exam-score-dominated with minimal extracurricular
weight, and the UK rewards subject-relevant "super-curricular" evidence very differently from
generic US-style activity breadth** — two of ORYN's five explicit target geographies
(`AGENTS.md` §0: USA/UK/Europe/Turkey/international) are **not** well-served by this package's
development taxonomy applied as admissions strategy without a geography-conditional layer on top.
This is flagged, not resolved, in the committed package — see "What's next" for this session's own
continued work on exactly this gap, done *after* this handoff was first drafted (check this file's
own git history / the commit log below for whether that work landed).

## Verification status

Every claim about the ORYN codebase itself (scorer logic, config values, schema fields) was
verified by direct file reads this session, not assumed from prior docs — file paths/line
references are cited throughout and should still be spot-checked if this handoff is read more than
a few days after 2026-08-21 (code changes fast on this repo; multiple other lanes are actively
modifying `lib/counselor/`, `lib/scoring/`, and `types/database.ts` concurrently, per
`docs/ORYN_WORKSTREAMS.md`). External research claims carry per-claim confidence ratings in each
document and in `data/research/counseling-intelligence/sources.json` — read the confidence level
before treating any claim as settled, especially anything marked `medium` or lower.

## Commit log, this branch (chronological)

`148a2d6` scaffold → `51b1978` doc 01 → `abe4248` doc 02 (recreated after collision) → `99a7459`
workstreams row update → `be55634` doc 05 → `0b5b0e2` family docs 10-12 → `1146f88` family docs
13-17 → `bf89f1b` doc 09 (persona testing) → `0b0563e` doc 10 (open questions) → `c48c472`
rules.json + sources.json → `91f3a8e` this handoff (first draft) → `79b4eda` doc 11
(geography-conditional admissions systems — France/Germany/Netherlands/Italy/Switzerland
researched, USA/UK/Turkey deepened) → `ffeb51c` rules.json/sources.json updated with doc 11's
entries (now 68 rules, 31 sources) → this update.

## Doc 11 landed — geography-conditional admissions systems

The "What's next" this handoff originally pointed to is done: `11-geography-admissions-systems.md`
researched France (Parcoursup dossier, official sources), Germany (Abitur/Numerus-Clausus,
including the large `zulassungsfrei`/open-admission category), Netherlands (diploma-based open
admission + decentralized selection for `numerus fixus` programs), Italy (IMAT-driven public
medicine vs. more holistic private), and Switzerland (Matura pass/fail admission to nearly
everything including ETH/EPFL, no activity review at all outside medicine's separate aptitude
test) — and cross-verified the peer session independently reached the same YKS/UCAS conclusion via
its own research (their `03` §6/`RULE-COUNSEL-062`, cross-indexed into their `08` §9; note their
`RULE-COUNSEL-062` is a **different rule** from this branch's `RULE-COUNSEL-062**, another
numbering collision for the final-integration pass to resolve, same pattern as the already-flagged
`RULE-COUNSEL-056` collision).

**Core finding**: every system checked sorts into one of three tiers by how much a holistic
activity profile actually affects admission — Tier 1 (USA, full holistic), Tier 2 (UK/France,
partial/subject-focused), Tier 3 (Germany/Netherlands/Italy-public/Switzerland/Turkey,
credential-or-exam-score-gated, minimal-to-no activity weight). Proposes (research only, not
implemented) that ORYN's counselor key recommendation *framing* off this tier, conditioned on the
student's **stated target institution**, never on nationality/residence — a Tier-3-track student
should be led toward exam/grade preparation as the primary admissions lever, with development-
dimension guidance reframed honestly as growth/alternative-pathway value rather than implied
primary-admission relevance.

## What's next (if this session continues further, or for whoever resumes)

This session's own assigned scope plus its self-identified highest-leverage extension are both
complete as of this update. Genuinely good next steps if more time/a future session picks this up,
roughly in priority order: (1) the final cross-branch integration this handoff's own
"Integration instructions" section describes — not something either research session should do
unilaterally; (2) deepen doc 11 with primary-source (official government/ministry, not
admissions-consulting-secondary) verification for Germany/Netherlands/Italy specifically, which
this pass sourced mostly from secondary admissions-guide consensus rather than each country's own
ministry/UCAS-equivalent page; (3) extend doc 11's tier framework to the remaining
`AGENTS.md`-named "generic Europe fallback" case and to Canada (mentioned in onboarding's target-
geography options, `AGENTS.md` Screen 4, but not in the original mission's five explicit
geographies) if ORYN's actual user base shows meaningful Canada-track demand.

**Founder-level decision this package cannot make on its own**: whether/how to reconcile this
branch with the peer's — both are real, validated, non-overlapping-in-content work, and the
"right" merge is a judgment call (matches this repo's own standing rule, `[[feedback-parallel-
session-reconciliation]]`-style: measure live state, don't auto-merge, don't force-push, escalate
genuinely ambiguous calls) rather than something either research session should resolve
unilaterally by picking a winner.
