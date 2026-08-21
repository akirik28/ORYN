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

### Update: peer completed its own renumbering (partial resolution)

Once both branches were "functionally complete on core deliverables" (peer's own framing, several
hours into the session, both branches still adding material but no longer in the fast-moving
early-collision phase), peer proposed and — with an agreed refinement from this session, to use a
safe numeric buffer rather than a number immediately adjacent to this branch's then-current top —
executed a **same-branch-only renumbering**: peer's own `034`-`064` → `200`-`230`, on the peer
branch, no merge or cross-branch write attempted. Peer separately caught a real bug in its own
renumbering pass (rule IDs split across a markdown line-wrap, e.g. literally
`"RULE-COUNSEL-\n035"`, missed by a naive string-match and caught by a second whitespace-tolerant
regex sweep plus final verification) — a good example of exactly the kind of self-verification
discipline this whole night has depended on.

**A third rules.json/sources.json artifact was also discovered and consolidated into (by peer, on
peer's branch)**: the shared main checkout already had its own pre-existing
`data/research/counseling-intelligence/{rules,sources}.json` — left there by the fourth session
("70608" / "Design student profile evidence taxonomy for ORYN," §"What happened tonight" point 3
above) — containing `RULE-COUNSEL-001-033` (claimed by that session to be faithful copies of this
branch's actual `001-014`/`023-031` rule text, fetched via `git show`, not independently re-minted
content) plus a `901`/`902` reconciliation pair that session added. Peer merged its own
renumbered `200-230` (+45 sources) directly into that pre-existing file, same-branch, no new
cross-branch risk. Peer's branch now has a single consolidated registry (66 rules / 52 sources)
covering: the 70608 session's copy of this branch's early rules, the 70608 session's own two
reconciliation rules, and all of peer's own family/timing/explainability/unsafe-inference rules.

**Not yet verified by this session**: whether the `001-033` entries in peer's consolidated file
still faithfully match this branch's current `001-014`/`023-031` text (they were copied hours ago;
this branch's originals are authoritative if they've since drifted in wording, even slightly).
Flagged to peer directly, not independently re-checked by this session as of this update — a
concrete, bounded task for whoever picks this up next, not a blocker for anything else.

**What remains unresolved**: this branch's own registry (`90` rules, `42` sources as of this
update) is still entirely separate from peer's now-consolidated one. The two still need a genuine
merge — de-duplicating the `001-014`/`023-031` overlap (same content, now living in both files),
reconciling the `901`/`902` block against this branch's own later numbering, and deciding a final
canonical numbering scheme — which is exactly the "final integration pass" both sessions have
consistently deferred to whoever does real cross-branch integration, not something either research
session should finish unilaterally mid-flight.

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

## Strategic checkpoint: both sessions agreed to stop adding new major-family docs

After both branches independently found several genuine new families in succession (education/
teaching, social work, performing arts/music — all found *after* the "original" 17-family set felt
complete), peer proposed and this session agreed: stop hunting for new top-level families and
redirect remaining time to **deepening** what exists (more countries per family, more persona
stress-testing, tightening medium-confidence sourcing) rather than continuing to fragment the
taxonomy. Reasoning: the last three finds were increasingly hard to surface (cross-checking against
each other's docs, re-reading our own) — a signal of diminishing real gaps — and further
granularity (nursing distinct from medicine, criminology distinct from law) is better handled as
subfield detail *within* existing docs than as new top-level files. Both sessions independently
converged on this before explicitly coordinating on it, for what that's worth.

Since that checkpoint, this branch: added Social Work as family `19` (already decided before the
checkpoint conversation, let it land since it was a genuine, already-in-flight major gap, not new
fragmentation); folded a cross-branch finding (Turkish conservatory admission as a named Tier-3
exception) into `11` directly (`RULE-COUNSEL-101`); added a persona (`I`) specifically to validate
that exception against a concrete case rather than trust the abstract principle
(`RULE-COUNSEL-102`); and caught and corrected a real factual error in its own `04` (the original
"~15-20%" chronic-illness prevalence figure was a weak secondary estimate that understated actual,
peer-reviewed prevalence — corrected to 22.57%→30.21%, 1999-2018, with the old source kept in the
registry marked superseded rather than deleted). Package now **102 rules, 48 sources**.

Added `15-executive-summary.md` — a genuinely short (5-minute) consolidation of both branches'
highest-impact findings, for anyone who won't read all 20+ documents. Start there if pressed for
time; this handoff is the operational/coordination record, not the content summary.

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
Phase 28 text precisely. Extended twice more against the new family `18` (Education & Teaching): (6) BLS's elementary-
teacher median-pay figure ($62,340, May 2024) — confirmed exact; (7) UK QTS's two-year Early
Career Teacher induction period (changed from one year, September 2021) — confirmed exact,
including the specific policy-change date. **Seven for seven checks now, spanning five different
peer documents and two different source types (external web sources and an internal repo
citation) — all accurate.**
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

This session's package is now **14 documents** (`00`-`13`, with `06` as 8 sub-files), **86
`RULE-COUNSEL-###` entries, 41 registered sources**. Also since the last update: fixed a stale
"14 major families" count in `00-overview.md` (now correctly says 17, and the doc table now marks
which rows are peer-branch-only, since this branch's directory alone doesn't contain `03`/`06`
families `00`-`09`/`07`/`08`); upgraded Italy's mechanism sourcing to an official MUR (Italy's
actual university ministry) source; sharpened the Canada finding after Ontario-specific research
showed the general case is closer to Tier 3 than this document's first-pass "Tier 2" framing, with
holistic review concentrated in a specifically-named subset of competitive programs
(`RULE-COUNSEL-082`); and added Turkey career-outlook notes (explicitly bounded as career-outlook
context, never admissions-evidence) to all 8 family docs, using İŞKUR's official "Geleceğin
Meslekleri" list — a source the peer session found first and shared; this session independently
downloaded and extracted it itself (`pypdf`, after both WebFetch and the Read tool's PDF renderer
failed in this environment) rather than trusting the peer's characterization of its contents, and
wrote down honest "no direct match" notes for the 3 families (poli-sci, soc/hist/phil,
lit/journ/comm — a weak/tangential match only) the vocational-skewed list doesn't actually cover,
rather than forcing weak citations everywhere for consistency's sake.

**Reciprocal cross-branch stress-testing, both directions**: peer independently tested this
branch's own `05-redundancy-saturation.md` against `11`'s Turkey/YKS finding and found a real
scope limit — the "signal quality to evaluators" justification (§2) doesn't apply where no
application file exists to be read at all, leaving only the opportunity-cost justification (§3)
for that target. Folded directly into `05` (`RULE-COUNSEL-093`) rather than left only on peer's
branch. Also added a full-integration `Persona H` to `09` (IB curriculum + mixed UK/Germany
targets + a newly-found IB-CAS access category, `RULE-COUNSEL-091/092` in `04` §8) — composed
cleanly with no new contradiction, but surfaced that mixed-target students need *multiple
target-conditioned explanations for the same recommendation*, a real input for peer's `07`. Package
now **93 rules, 43 sources**. Peer separately found teaching/education entirely missing across all
17 combined family docs and is adding it as family `18` on its own branch.

**Full UK/EU/Turkey country-notes consistency achieved across all 8 family docs** (matching the
peer's own established pattern for its 9): added official UK National Careers Service profiles
(GP, Clinical/Forensic Psychologist, Solicitor, Barrister, Architect — direct hits for medicine/
psychology/law/architecture; honest "no NCS profile reviewed this pass" notes for the other 4) and
generic ESCO/EU notes, and fixed a real structural bug introduced while adding the Turkey notes
earlier (the "Country notes" section had landed *after* "Rules established" in all 6 of the docs
where it was appended rather than inserted — every doc's section ordering is now verified
consistent: `grep`-checked across all 8 files, "Country notes" always immediately before "Rules
established"). Package is now **90 rules, 42 sources**.

**Second file-numbering collision caught and resolved quickly**: the peer session began a new
`13-field-opportunity-mapping.md` on its own branch, not realizing this session's `13` was already
taken (`13-implementation-readiness.md`). Caught and flagged before much was written; peer
renamed to `14-field-opportunity-mapping.md` (their commit `b8a120a`) and both sessions now
explicitly agree **new documents on either branch start at 14+** going forward, to prevent a third
occurrence. All three "next steps" this handoff previously
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

## Catch-up: five commits since the last checkpoint (`102 rules/48 sources` → `109 rules/54 sources`)

This handoff wasn't updated after every single commit in this stretch (unlike most of the session)
— logging it here in one batch rather than pretending it was kept continuously current:

1. **CAS phrasing tightened in `15-executive-summary.md`** (`6fc200d`) — peer flagged that the
   summary's one-line compression of `04` §8's IB/CAS finding read as implying a fixed IBO-mandated
   hour count; `04`'s own underlying text was already correct (no fixed number, school-set targets,
   the ~150-hour figure removed circa 2017), only the summary's lossier one-liner needed fixing.
2. **Germany added as a 4th country to `10-medicine-clinical-pathways.md` and
   `13-law-oriented-pathways.md`** (`67a45a1`, `RULE-COUNSEL-103-104`) — Approbation/Staatsexamen
   for medicine, the unified Staatsexamen-plus-Referendariat pathway (no US-style flexible
   major-then-law-school equivalent) for law. **104 rules / 50 sources.**
3. **Germany added to `11-psychology-behavioral-science.md` and `16-architecture-design.md`**
   (`844bf71`, `RULE-COUNSEL-105-106`) — Approbation under the Psychotherapeutengesetz for
   clinical/therapeutic psychology specifically (not psychology generally); Architekt as a
   chamber-based, state-by-state title-protection system (16 regional Architektenkammer under the
   federal Bundesarchitektenkammer). **106 rules / 52 sources.**
4. **Social-work Turkey claim upgraded and precisely split** (`78ed5c8`,
   `RULE-COUNSEL-107-108`) — peer directly fetched the actual MEB "Rehberlik Hizmetleri
   Yönetmeliği" regulation text. Confirmed `RULE-COUNSEL-099`'s core claim (Art. 3(p): "sosyal
   çalışmacı" requires a bachelor's degree) verbatim, upgraded to primary-source/high confidence.
   Could **not** confirm the associate-degree-titling sub-claim in that same regulation (it's
   silent on that point) — rather than let the confirmed part blanket-validate the whole original
   claim, that unconfirmed part got its own new rule (`RULE-COUNSEL-107`) explicitly downgraded to
   low-medium/secondary-source-only. Also added `RULE-COUNSEL-108` (Turkey psychology: MEB Art.
   3(i) requires a bachelor's-level psychology education for "Psikolog," same primary source).
   **108 rules / 52 sources.**
5. **`RULE-COUNSEL-057`/`058` upgraded to official-source confidence, `RULE-COUNSEL-109` added**
   (`303e8d9`, this update) — peer directly fetched UCAS's own personal-statement guidance pages
   (confirming `058`'s super-curricular/extracurricular distinction verbatim) and directly fetched
   `osym.gov.tr` plus cross-checked convergent Turkish YKS-calculator sites (confirming `057`'s
   exam-dominance finding and sharpening it: the sole non-exam channel into YKS placement, OBP, is
   itself purely grades-based and capped small, still zero channel for non-academic dimensions —
   captured as its own rule, `RULE-COUNSEL-109`, rather than silently folded into `057`'s existing
   text). Both upgrades and the new rule are peer-reported, not independently re-fetched by this
   session — consistent with this package's established pattern (e.g. the MEB upgrade above) of
   accepting a peer's specific, checkable primary-source citation with exact URLs as upgrade-worthy
   even without independent re-verification, while saying so explicitly in each source's
   `limitations` field. **109 rules / 54 sources — current count as of this commit.**

Peer separately reported (not yet independently checked by this session) sharpening its own
`03-recommendation-timing.md` §6 with the same ÖSYM/YKS finding as its `RULE-COUNSEL-242`.

## Canada primary-source pass + new doc 17 (dimension weighting by target)

Two more commits since the catch-up above:

**Canada's 4 named "holistic" programs verified against their own official pages**
(`379144b`, `RULE-COUNSEL-110-112`) — direct-fetched Waterloo's AIF, Queen's Commerce's rubric,
and UofT's own assessment page (McMaster HHSP via search-summary, direct fetch 403'd). Found the
four programs are not one mechanism: Waterloo's AIF explicitly invites activity/accomplishment
description; Queen's Commerce and McMaster HHSP score written/video responses on reflective
competencies with **no activities-list criterion at all** in their own rubrics. Also found UofT's
own page does not support this document's earlier "UofT runs explicitly holistic review weighing
leadership/EC" characterization of its general process — **withdrew** that claim rather than
merely downgrading it, since the primary source directly contradicts it (same discipline as the
social-work associate-degree correction, `RULE-COUNSEL-107`). Also fixed a doc/registry sync bug
found in the process: `11`'s "Rules established" list still had `RULE-COUNSEL-073`'s
pre-correction "Tier 2, closer to UK" text even though `rules.json` had already been updated to
the corrected version — worth remembering this class of bug can happen (registry updated,
prose list not) and re-checking for it elsewhere if anyone has time. **112 rules / 58 sources.**

**New doc `17-dimension-weighting-by-target.md`** (`b57b611`, `RULE-COUNSEL-113-116`) —
operationalizes the gap `10`/`11` explicitly flagged as unresolved (`RULE-COUNSEL-059`/`060`'s own
text: "no document in this package explicitly operationalizes" which dimensions matter more for
which target system). Stays strictly qualitative (high/medium/low/zero, never a numeric weight)
per `AGENTS.md` Phase 6.1's prohibition on LLM-invented scoring parameters — this is a proposal for
a future scoring-architecture session to consume, not a scoring implementation itself. Gives a
per-dimension table for UK (subject-relevance cuts across all 9 dimensions), an honest
"unresolved" for France (current sourcing insufficient to responsibly assign ordinals — said so
rather than guessing), the Tier-3-general zero-weight case, and generalizes the Canada finding
above into a standing principle (tier alone is insufficient for named carve-outs; the specific
program's own rubric must be checked). A cross-cutting section pulls together medicine's
scattered per-country findings for the first time in one place and shows the "exception direction"
flips by country — activity-rewarding in US/UK, aptitude-test-gated in Switzerland, *more*
exam-dominated than usual in Turkey — demonstrating that country-level and field-level
conditioning must compose together, neither is sufficient alone. **116 rules / 58 sources —
current count as of this commit.**

**Peer taxonomy cross-check**: separately reviewed peer's new
`data/research/counseling-intelligence/major-family-taxonomy.json` (a structured interest→skills→
career-family index over all 20 family docs, built by reading — not modifying — this session's 9
docs). Spot-checked 3 of this session's 9 entries (11-psychology, 19-social-work,
16-architecture) for accuracy, including the hardest ones to get subtly wrong (the 099/107 upgrade/
downgrade split, Germany's clinical-only Approbation scope). All accurate; one cosmetic gap found
(family 16's `credential_gated_career` field was `null` despite the adjacent `licensure` field
correctly describing UK/Germany architect title-protection) and already fixed by peer (`5ac811e`).
Peer separately read and integrated doc 17 into its own docs (`08-unsafe-inference-rules.md` §9,
`16-worked-example-full-chain.md` Step 5, commit `2eb2efc`).

## France's Parcoursup gap resolved (`7f74f63`, `RULE-COUNSEL-114` updated + `117` new)

Doc 17's France row originally, honestly, said "unresolved — insufficient sourcing to assign
per-dimension ordinals." A follow-up pass found the actual official mechanism: DGESIP (French
Ministry of Higher Education) publishes a "Critères Généraux d'Examen des Vœux (CGEV)" framework
document naming exactly 5 nationally-defined evaluation fields every Parcoursup formation must use
and percentage-weight (summing to 100%) — académiques, compétences académiques/méthodologiques,
savoir-être, motivation/projet, and **engagements/activités et centres d'intérêt** (explicitly
naming school-council leadership and civic service as example criteria). WebFetch's built-in
extractor returned only binary noise for this PDF; worked around with a direct `curl` download +
`pypdf` extraction, the same technique used earlier tonight for the CDC chronic-illness PDF. This
substantially resolves the gap — activities are confirmed as one of exactly 5 structurally-
guaranteed evaluation categories, not a vague or optional consideration — while still honestly
leaving the *exact* percentage any one named formation assigns unresolved (formation-specific, not
general knowledge; the worked example's own remaining-3-of-5 percentages were in a graphic on the
source PDF's page 9, not extractable text, so left unextracted rather than guessed). **117 rules /
59 sources.**

**Runway status, ~05:10 Europe/Istanbul**: about 6 hours left before the 11:00 timebox. Both
sessions' explicit mission-brief deliverables have real coverage now (confirmed with peer). Next
planned: a persona stress-test of doc 17 against a mixed-target case (peer's suggestion, agreed) —
likely a UK+Canada-Queen's-Commerce mixed target, since that combination now has genuinely
different per-dimension guidance from two different documents (`17`'s UK table vs. the Canada
carve-out heterogeneity) and is a real test of whether the frameworks compose without
contradiction, consistent with `09`'s existing pattern of using personas to find composition bugs
(e.g. the original redundancy/timing contradiction, `RULE-COUNSEL-056`).

## Persona J lands (`27ceaef`, `RULE-COUNSEL-118-119`) — no contradiction, but a genuine new gap

Mixed UK + Queen's Commerce target, chosen specifically because the two now have
*mechanism*-different guidance from `17` (direct scored evidence for UK vs. reflective-response-
only scoring for Queen's), not just different framing language. **Result: `11`'s per-target-
explanation principle and `17`'s per-dimension tables compose correctly — no contradiction.** But
the persona surfaces something sharper sitting on top of both: per-target explanations must name
the *mechanism* by which each target values a recommended action (direct evidence vs. indirect raw
material for a differently-scored response), not just the framing register `RULE-COUNSEL-066`
already covers — a mechanism-silent explanation risks a student over-investing in the wrong kind of
prep for one target even when the underlying action is correctly identical for both.

**More structurally**: this package's entire recommendation vocabulary (the achievement-tier
ladder, `01`/`02`) is built around logged achievements. Queen's/McMaster-style assessment requires
a preparation activity — rehearsing a structured reflective response — that isn't really an
achievement-tier evidence item at all, closer to interview/personal-statement practice. **ORYN's
recommendation model has no clean category for this today**, and no document in this package named
the gap before this persona surfaced it. Cross-referenced into `10`'s data-gaps table (§2).
**119 rules / 59 sources.**

## CASPer generalizes the Persona J gap into a 3-way typology (`ea39a20`, `RULE-COUNSEL-120`)

Checked whether `RULE-COUNSEL-118`'s "no recommendation category for rehearsed structured
response" finding was a Queen's/McMaster idiosyncrasy or something broader — it's broader.
**CASPer** (Acuity Insights) is a standardized, timed, third-party situational-judgment test used
across 500+ programs (medicine, health sciences, PA, nursing, dental hygiene currently; the
vendor's own page describes expansion into education/business/engineering) — structurally
different from *both* achievement-evidence review *and* Queen's/McMaster's own institution-authored
reflective prompts (CASPer's scenarios are standardized/hypothetical, not about the student's own
past experience). ORYN's model now needs to distinguish three assessment types, not two. Added
directly to `06-major-family-evidence/10-medicine-clinical-pathways.md`, which previously didn't
mention CASPer at all despite ~50 US medical schools using it. **120 rules / 60 sources.**

## Implementation-readiness (`13`) synced with tonight's new findings (`2e7b8b3`, `eea357e`)

Item 1 (geography-tier weighting) now points to `17`'s richer per-dimension version. New item 13
places the `RULE-COUNSEL-118`/`120` recommendation-type gap precisely: checked against the actual
shipped types (`types/database.ts`'s `RecommendationClass` is orthogonal — governs strength, not
kind; `lib/counselor/types.ts`'s `CandidateAction.category` is an unstructured `string`, no
existing room for this) — flagged as a founder-level scoping decision, not pre-decided by this
research package. Also fixed two stale counts found in the same pass: item 12's "17 families" (now
20) and `00-overview.md`'s "19+, performing-arts-music in progress" (now confirmed 20, cross-checked
against both branches' file trees and peer's own `major-family-taxonomy.json`, which independently
indexes exactly 20).

## Self-consistency audit: clean

Ran a full check of this branch's own `[[RULE-COUNSEL-###]]` citations against `rules.json`: every
citation resolves to a real entry, every one of this session's 120 entries is mentioned somewhere
in the docs (no orphans), and every entry's `doc` field points to a file that actually exists. No
issues found — noted here as a completed QA pass, not a change.

**Runway status, 04:49 Europe/Istanbul (checked directly, not estimated)**: about 6h10m left.
Both sessions' explicit mission-brief deliverables have real coverage; remaining time being spent
on genuine deepening — primary-source verification, cross-framework stress-testing, and following
up gaps this package finds in itself — rather than new breadth for its own sake.
