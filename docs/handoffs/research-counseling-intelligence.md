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

## CORRECTED, complete rule-ID collision map (supersedes earlier "just RULE-COUNSEL-056" notes below)

A self-consistency audit run late in this session (checking that every `RULE-COUNSEL-###` this
branch cites is minted exactly once) found the true scope of the numbering collision is much
larger than the single instance originally flagged. **The collision is not one rule — it is nearly
the entire 034-059 range (26 numbers), independently minted by both branches for completely
different content**, because the peer branch started its own numbering at 034 (a reasonable guess,
made before either branch could know this branch's family docs alone would consume 032-051) and
both branches kept minting sequentially through their own remaining documents without further
live coordination on exact numbers. Verified by fetching and reading the peer branch's `03`,
`07`, `08`, and family docs `02`,`03`,`05`,`06`,`07`,`08`,`09` directly (`git show`, not trusted
from memory of earlier messages):

| # | This branch (`-013956`) | Peer branch (`oryn/counseling-intelligence-research`) |
|---|---|---|
| 034 | Never cite MCAT/med-school benchmarks to a HS student (`06/10` medicine) | Derive `yearsUntilGraduation` from `graduation_year`, never claim precision (`03` §1) |
| 035 | APA HS research pathways as official channel (`06/11` psychology) | Stage determines recommendation *type*, time budget determines *size* (`03` §4) |
| 036 | Apply achievement-tier ladder to psychology-track research (`06/11`) | A student outside the typical phase pattern isn't automatically a gap (`03` §5) |
| 037 | Don't extend "research needs institutional access" uniformly (`06/11`) | CS is an umbrella, not one skill (`06/01` computing) |
| 038 | Official UN MUN guidance is authoritative (`06/12` poli-sci) | Distinguish sustained-build / algorithmic-competition / hackathon as different evidence types (`06/01`) |
| 039 | Don't treat MUN alone as sufficient evidence (`06/12`) | "I like math" is ambiguous — probe what a student actually means (`06/02` math) |
| 040 | Don't read absent campaign-internship evidence as a motivation gap (`06/12`) | Applied-chemistry / materials-science-adjacent distinction (`06/02` or `03`) |
| 041 | No required "pre-law" major (`06/13` law) | "Biology" spans wet-lab / field / computational work (`06/04` life sciences) |
| 042 | Recommend broad skill-building, not a narrow law-track path (`06/13`) | A biology major is not required for medicine (`06/04`) |
| 043 | Court observation as a low-access-barrier evidence channel (`06/13`) | *Not independently confirmed by this session this pass — likely `06/03` physical sciences* |
| 044 | National History Day as an official evidence source (`06/14` soc/hist/phil) | PE-licensure necessity varies by context (`06/05` engineering) |
| 045 | Ethics Bowl as a legitimate, distinct-format evidence source (`06/14`) | Biomedical engineering is not a subset of [X] (`06/06` biomedical eng) |
| 046 | Favor substantive edited journalism pieces over volume (`06/15` lit/journ) | Economics quantitative-mismatch is a real, mild, non-disqualifying signal (`06/07` econ) |
| 047 | Scholastic Awards as a well-established tiered channel (`06/15`) | Entrepreneurship = originating/testing a venture, distinct from general business (`06/08`) |
| 048 | Architecture/design evidence is portfolio-and-process-centered (`06/16`) | DECA/FBLA-style simulated competition ≠ real entrepreneurship evidence (`06/08`) |
| 049 | A thin design portfolio ≠ an access barrier the way a paid program would (`06/16`) | "Environmental science" ≠ "sustainability" — different activity profiles (`06/09`) |
| 050 | National Portfolio Day as the reference model (`06/17` visual arts) | Never state a probability without a validated statistical basis (`07` §1) |
| 051 | Never suggest equipment/production value is a priority gap for film (`06/17`) | Never let a `ProfileGap` imply a university "requires" anything (`07` §1) |
| 052 | Tier-aware redundancy is honestly executable only for `research` today (`09`) | Never hide low confidence behind confident-sounding phrasing (`07` §1) |
| 053 | Don't assume US-style curriculum-context mechanisms do/don't exist elsewhere (`09`) | Distinguish "verified information" from "Oryn analysis" (`07`, spec Phase 28) |
| 054 | Check concurrent research lanes before treating a gap as unowned (`09`) | An opportunity-cost observation is not a judgment about an activity's inherent worth (`07`) |
| 055 | Recognize paid part-time work as `career_exploration` evidence (`09`) | Every piece of this package's reasoning should be traceable (`07`) |
| 056 | Exempt breadth-dimension candidates from redundancy decay for Phase-1 students (`09`) | Never present a secondary-sourced opportunity as confirmed/current (`08`) |
| 057 | Turkish YKS admission is exam-score-dominated (`10`) | Never infer aptitude/fit from a demographic attribute (`08`) |
| 058 | UK UCAS rewards subject-relevant evidence over general breadth (`10`) | Never present one career family as objectively "better" than another (`08`) |
| 059 | This package's taxonomy/redundancy findings are general development guidance, not admissions-strategy, outside US-holistic systems (`10`) | Never equate a career family's popularity/growth with an individual student's fit (`08`) |

**None of these are errors** — every rule on both sides is independently valid, sourced, and
correct on its own branch. The only problem is the shared numeric namespace. **Whoever integrates
must renumber one side's 034-059 range before merging `rules.json` files** — this table is the
exact, ready-to-execute input for that pass; it does not need to be re-derived. This session
deliberately did **not** renumber its own rules unilaterally, consistent with this whole package's
standing principle (see "Protect everything first... never auto-merge" in this project's own
`[[feedback-parallel-session-reconciliation]]` memory) — a mechanical renumbering across 8+
documents and two JSON files, done under time pressure while the peer branch is still actively
changing, risks introducing reference errors for a problem that has to be re-checked at
integration time regardless of which branch does the renumbering.

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

## Process note: a real near-miss, caught by routine verification, not luck

`04-profile-gap-framework.md` was written early in this session (right after the collision
resolution) but a `git commit` for it was **skipped** in the busy flow of handling incoming
cross-session coordination messages — it sat correctly on disk, but uncommitted and unpushed, for
roughly the next two hours of work while five more documents were written and committed on top of
that gap without anyone (including this session) noticing. It was caught by a routine
`git status --short` sanity check run before committing `12-activity-progression-pathways.md`, not
by any specific suspicion — nothing on disk looked wrong, only `git status` revealed the file was
untracked. **Fixed** at commit `939be07`, with an honest commit message describing exactly what
happened, and a full `git ls-files` vs. `find` cross-check confirmed no other file had the same
problem. Recorded here deliberately, not smoothed over: this is a concrete instance of exactly the
discipline this project's own memory (`[[feedback-parallel-session-reconciliation]]`: "measure
live state directly before claiming anything... never trust a memory of what should be true")
exists to enforce, including against this session's own assumptions about its own prior actions,
not only a peer's.

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

**Peer-branch spot-verification, done, positive result**: rather than leave `10` §5's "read and
found reasonable, not independently re-verified" caveat about the peer branch unaddressed, this
session independently re-checked three specific, falsifiable factual claims from the peer's
`06-major-family-evidence/01-computing-information-sciences.md` and `04-life-sciences.md`: (1) the
O*NET Software Developers knowledge-profile quote ("arithmetic, algebra, geometry, calculus,
statistics, and their applications") — confirmed **word-for-word accurate** against a direct fetch
of the O*NET page; (2) the BLS "about 317,700 average annual openings" figure for computer/IT
occupations — confirmed accurate against BLS's own 2024-2034 projection cycle; (3) the
International Biology Olympiad "70+ countries" participation figure — confirmed accurate (current
sourcing puts it at 78-81 countries depending on year, so "70+" is a safe, correct
characterization). **All three checks passed with precision, including one exact quote match.** Extended further on a
later pass: (4) peer's `06/05-engineering-me-ce-ae-ee.md` claim that civil engineering accounts for
the largest share of new engineering-occupation jobs per BLS — confirmed directionally accurate,
with the same "older BLS cycle, worth re-checking against the live page" caveat peer had already
self-flagged for a similar figure in their own life-sciences doc, so this isn't even a new gap,
just a second confirmed instance of a caveat peer had already applied to itself; (5) peer's `07`
citation of `AGENTS.md` Phase 28 ("distinguish verified information from Oryn analysis") — checked
directly against this repo's own `AGENTS.md` (not a web source) and confirmed to match the actual
Phase 28 text precisely. **Five for five checks now, spanning four different peer documents and
two different source types (external web sources and an internal repo citation) — all accurate.**
This materially upgrades this session's confidence in the peer branch's overall sourcing
discipline beyond the earlier, more cautious "read and found reasonable" framing. Not an
exhaustive audit (5 claims across 4 of the peer's 21 total documents), but a genuine, positive,
independently-obtained data point for whoever does final integration.

Doc 11's Germany/Netherlands mechanism claims were upgraded to official DAAD/government.nl/
Studielink sources on a follow-up pass (commit `ae9e942`) — item (2) below from this handoff's
prior version is now done; Italy/Switzerland's medicine-specific and ETH-specific sourcing was
already official-tier from the first pass. `12-activity-progression-pathways.md` (commit
`765c68a`) is also done — three sourced multi-year pathway examples (STEM/research,
entrepreneurship, creative/arts) plus explicit late-start handling, connecting `02`'s evidence-
tier ladder, `05`'s redundancy model, and peer's `03` timing phases into concrete worked cases,
grounded in a directly-verified official source (Simons Summer Research Program's "current
11th-grade junior, no exceptions" eligibility rule) rather than only the aggregate pattern peer's
own `03` had sourced at lower confidence.

This session's package is now **14 documents** (`00`-`13`, with `06` as 8 sub-files), **81
`RULE-COUNSEL-###` entries, 38 registered sources**. All three "next steps" this handoff previously
listed here are now done: peer-branch spot-verification (5/5 claims checked, all accurate — see
above), doc 11's Canada + generic-Europe-fallback extension (commit `5139681`), and — found only
by actually doing a self-consistency audit, not anticipated in an earlier version of this list —
the corrected, complete rule-ID collision map (26 numbers, not 1) documented above. Also added
since: `13-implementation-readiness.md` (a prioritized punch-list synthesizing everything `00`-`12`
propose for a future engineering session) and a health/disability-context extension to `04`
(`RULE-COUNSEL-079-081`, held carefully against `AGENTS.md` Phase 12's minor-safe privacy
commitments — explicitly recommends against collecting any new health data, only against assuming
a thin profile reflects low effort).

Genuinely good remaining next steps if more time/a future session picks this up, roughly in
priority order: (1) the final cross-branch integration this handoff's own "Integration
instructions" section describes — not something either research session should do unilaterally,
now with both the file-topology map and the full rule-ID collision table ready as direct inputs;
(2) further peer-branch spot-verification beyond this session's 5 checks, for even broader
coverage; (3) primary-source (not secondary-consulting-source) verification for Canada/Spain,
mirroring the upgrade already done for Germany/Netherlands.

**Founder-level decision this package cannot make on its own**: whether/how to reconcile this
branch with the peer's — both are real, validated, non-overlapping-in-content work, and the
"right" merge is a judgment call (matches this repo's own standing rule, `[[feedback-parallel-
session-reconciliation]]`-style: measure live state, don't auto-merge, don't force-push, escalate
genuinely ambiguous calls) rather than something either research session should resolve
unilaterally by picking a winner.
