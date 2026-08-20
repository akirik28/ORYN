# Persona Testing

Answers: *do the frameworks in this package hold up against concrete hypothetical student
profiles, including edge cases — and where do they contradict each other or the peer session's
docs?*

Tests both this session's own docs (`00`/`01`/`02`/`04`/`05`/`06`-families-`10`–`17`) and, by
reference (via `git show` against `origin/oryn/counseling-intelligence-research`, not by editing
that branch), the peer session's `03-recommendation-timing.md`, `07-explainability-framework.md`,
`08-unsafe-inference-rules.md`, and its 9 STEM/quant family docs — this is the first document in
the package that genuinely needs both halves at once, which is exactly why it was left for last.

Four personas are the founder spec's own fixtures (`AGENTS.md` Phase 49); three are new, chosen
specifically to stress-test the parts of the framework this package flagged as thin (access,
non-US curricula, interdisciplinary interest).

## Persona A — Strong academics, weak extracurriculars

**Profile:** `academics` 88, `intellectual_curiosity` 70, all other dimensions 20-35. US
curriculum, `yearsUntilGraduation = 2` (peer's Phase 2 per `03`).

**Walkthrough:** `04-profile-gap-framework.md` §4 check 2 (goal relevance) — without a stated
goal, every low dimension looks equally "gap-like," which is itself a finding: this persona is
where `career_goals`/`interests` data matters most for prioritizing *which* weak dimension to
surface first. Check 3 (access) — a uniformly weak EC profile with strong academics doesn't fit
the Park et al. access-inequality pattern cleanly (§`04` §3), which more often predicts a
*uniformly* thin profile across both academics and EC for access-constrained students — this
specific shape (strong academics, weak everything else) more often means the student has been
spending available time on schoolwork specifically, a genuine trade-off, not an access gap.
**Correct framing**: not "you have a gap," but an honest opportunity-cost observation — RULE-
COUNSEL-002 (academics weighted highest) has already been satisfied; per `03` §3 (peer), a Phase-2
student should now be shown 1-2 depth-appropriate, access-realistic options in whichever dimension
best matches stated goals, sized to the student's actual time budget (`03` §4) — not a broad push
across all weak dimensions at once (would violate `RULE-COUNSEL-030`'s "not valuable" vs. "not
now" distinction if the real constraint is time, not value).

## Persona B — Strong entrepreneurship/leadership, weak research

**Profile:** `entrepreneurship` 82, `leadership` 78, `research` 24. `yearsUntilGraduation = 2`.

**This is the founder spec's own canonical worked example** (`AGENTS.md` Phase 39/8.3) almost
verbatim. Walkthrough: `05-redundancy-saturation.md` §6 was written to make exactly this case
constructible from evidenced parts — already-strong dimension (entrepreneurship/leadership,
comfortably above `RANKING_THRESHOLDS.strongDimensionScore = 75`) + a candidate proposing *more*
of the same (another club) is a lateral-repeat pattern (§4 of `05`) + opportunity cost against
`research`, currently the clear weakest dimension. Cross-checked against `04`'s access framework:
research access for this persona depends heavily on *which* major-family the student's goals point
to — if economics/business (this persona's implied direction, given entrepreneurship strength),
`06-major-family-evidence`'s peer-owned economics/business family doc's evidence patterns apply,
which this package did not independently re-verify but references by name. **No contradiction
found** — this persona is the cleanest validation case in the whole package, which makes sense
since it's the one the original founder spec was built around.

## Persona C — Research-heavy STEM student

**Profile:** `research` 75 (three logged research experiences, all `output_type = "none"` or
`"presentation"`), `academics` 80, other dimensions lower. `yearsUntilGraduation = 1`.

**Walkthrough — where a real, honest limitation surfaces.** `05-redundancy-saturation.md` §4's
tier-aware model says a *4th* research candidate should be discounted differently depending on
whether it represents **escalation** (e.g., moving from a summer program to an independent project
with a named mentor and a written output) versus a **lateral repeat** (another similar summer
program). **This is not actually computable with today's data**: per `02-opportunity-development-
mapping.md`'s own flagged gap, ORYN's schema has no structured achievement-tier field to compare
against — three `research_experiences` rows with `output_type` set are the *closest* real signal
available, and `output_type`'s own ladder (`none` → `presentation` → ... →
`peer_reviewed_publication`) is a genuine, already-shipped proxy for escalation *specifically
within the research dimension* (not generalizable to other dimensions, which don't have an
equivalent typed field). **Correct, honest framing for this persona**: the redundancy model's
*concept* is sound and partially executable here (via `output_type` specifically), but the general
tier-ladder from `02` remains aspirational outside `research` until more evidence-state data
exists — this package should not claim more precision than that. [[RULE-COUNSEL-052]]

## Persona D — 14-year-old, minimal profile history

**Profile:** all dimensions `confidence: "low"`, most scores near 0. `yearsUntilGraduation = 4`
(peer's Phase 1).

**Walkthrough:** `gaps.ts`'s existing `confidence = "low"` → `insufficient_data` handling already
does the right thing structurally — this persona should trigger `MIN_COMPLETENESS_FOR_JUDGMENT`
(`lib/counselor/config.ts`, `= 40`) and lead with profile-completion candidates, exactly as
`docs/counselor-core-plan.md` already specifies. Cross-checked against peer's `03` §1 exception
handling and `04`'s access framework: **both correctly avoid** treating a 14-year-old's near-zero
profile as a deficiency — `03`'s Phase 1 framing explicitly protects breadth-seeking at this stage,
and `04`'s check 1 (confidence) stops the pipeline before any gap language would even be generated.
**No contradiction found** — this persona is a clean validation of both branches' independently
converging on the same "insufficient data, not weakness" posture.

## Persona E — Turkish (MEB) curriculum, Economics goal, international

**Profile:** `curriculum: "turkish_curriculum"`, `country: "Turkey"`, stated goal "study
Economics in the UK or Europe," `yearsUntilGraduation = 3`.

**Walkthrough — a real, shared, honestly-flagged gap between both branches.** Peer's `03` §1
explicitly flags Turkish curriculum staging as "untested in as much depth" as the US/UK/IB mapping
it built `yearsUntilGraduation`'s label table from. This session's own `04` §2 (School Profile
principle) is sourced entirely from **US** admissions practice — this package did not verify
whether an equivalent contextualizing mechanism exists in Turkish MEB-system applications or in
how European admissions offices read Turkish transcripts, and **should not assume one does or
doesn't**. [[RULE-COUNSEL-053]] Both gaps point to the same underlying limitation from different
angles (peer's: stage/timing; this session's: curriculum-rigor context) — worth recording as one
combined open item rather than two, since a future research pass addressing Turkish-system
admissions practice would likely resolve both at once. Economics/business major-family evidence
(peer-owned family doc) and the UK-specific admissions research a peer session ("night-
opportunities-research" or similar, per this session's own coordination messages) may already be
producing elsewhere in tonight's broader research fleet — flagged for the founder to check for
overlap rather than assumed. [[RULE-COUNSEL-054]]

## Persona F — Access-constrained profile (low-income signal, thin activity list)

**Profile:** 1 logged activity (part-time work, unpaid, family-support framed), no awards, no
research, `academics` solid-but-not-exceptional (76), rural/under-resourced school context stated
in profile notes.

**Walkthrough — the framework's most important test.** `04-profile-gap-framework.md` §3
(Park et al.) and §4's full four-check sequence exist specifically for this persona. Applied:
check 1 (confidence) — likely medium, not low, if the few items present are detailed; check 3
(access) is the load-bearing one here, and per `RULE-COUNSEL-017`/`018`, in the *absence* of
disconfirming information, a thin profile from a stated under-resourced context should default to
**hedged, access-aware language**, never "you should do more." A part-time job, in particular,
deserves explicit positive framing: work experience is real `career_exploration`/execution
evidence (`career-exploration.ts` already scores it), and framing it as a *deficiency* relative to
a padded activity list would be exactly the "unequal access read as unequal effort" error §3 warns
against. **No contradiction found**, but this persona sharpens a gap in the *shipped scorer*
worth naming precisely: `career-exploration.ts` counts "an internship" as a named bonus signal but
does not appear to specifically recognize paid part-time work (distinct from an internship) as
equally legitimate professional-exposure evidence — flagged for `10-open-questions.md`, not fixed
here (no code changes in scope). [[RULE-COUNSEL-055]]

## Persona G — Interdisciplinary interest (AI + medicine)

**Profile:** stated interests span `computer_science` and `medicine`, `research` 60 (a
computational-biology-adjacent summer program), `academics` 82.

**Walkthrough:** neither this session's 8 families nor the peer's 9 map cleanly onto "AI +
medicine" alone — exactly the case peer's `08-unsafe-inference-rules.md` §4 names its
`00-family-taxonomy.md` §6 interdisciplinary-combination table as existing to prevent. This
session did not independently verify that table's specific content (out of this session's owned
scope), but the *existence* of an explicit interdisciplinary-combination mechanism, rather than
forcing a single-family assignment, is structurally the right answer — confirmed by reasoning
through this persona rather than by re-deriving the peer's table from scratch. **Recommendation for
whoever reads both branches together**: verify this specific persona against the peer's actual
table content as a concrete acceptance test, rather than trusting either branch's description of
the other's work uncritically — consistent with this whole package's "verify, don't trust a
prior session's claim" discipline (mirrors `feedback-parallel-session-reconciliation` project
memory, applied here to peer research output rather than peer code).

## Contradiction found: redundancy decay and timing phase interact incorrectly if composed naively

**This is the most important finding in this document.** `05-redundancy-saturation.md`'s
tier-aware model (§4) discounts a *second-or-later* candidate touching a dimension the student
already has evidence in. Peer's `03-recommendation-timing.md` §1 establishes that
`career_exploration`/`intellectual_curiosity` breadth-seeking is **healthy and should not be
discounted** for a Phase-1 (younger) student. **Neither document, read alone, states explicitly
that redundancy decay should be phase-aware** — `05` was written without reference to stage;
`03` was written without reference to redundancy decay specifically. Composed naively, a Phase-1
student trying a 3rd or 4th *different* career-exploration activity (exactly the behavior `03`
wants to encourage) would still hit `REDUNDANCY_DECAY`'s flat per-dimension discount in
`lib/counselor/scoring.ts` today, and would hit this package's own more granular tier-model in
`05` unless explicitly exempted. **Resolution proposed by this document** (reconciling both
branches' work, not just flagging the gap): redundancy/saturation logic should **not apply to
breadth-dimension candidates (`career_exploration`, `intellectual_curiosity`) for Phase-1
students at all**, consistent with those two dimensions already being structurally exempt from
per-item diminishing returns at the *scoring* layer (`01-development-taxonomy.md` §5) — this
extends the same exemption to the *candidate-ranking* layer for the specific stage where breadth
is developmentally appropriate. [[RULE-COUNSEL-056]] (Note: peer's own `08` also independently
minted a `RULE-COUNSEL-056` for a different pattern — an ID collision between the two branches'
independent numbering, itself a concrete instance of this package's own coordination difficulties;
flagged for renumbering at final integration, not resolved here.)

## Rules established in this document

- `RULE-COUNSEL-052` — The tier-aware redundancy model (`05` §4) is honestly executable only for
  `research` today (via `output_type`); treat it as aspirational, not implemented-in-spirit,
  for other dimensions until more evidence-state data exists. Confidence: high (verified against
  actual schema fields).
- `RULE-COUNSEL-053` — Do not assume US-style curriculum-context admissions mechanisms (School
  Profile) exist, or don't exist, in non-US systems without verifying per-system; treat as unknown.
  Confidence: high (explicit acknowledgment of an unverified claim, not a claim itself).
- `RULE-COUNSEL-054` — Before treating a country/curriculum gap as unowned, check whether another
  concurrent research lane already covers it (this package's own experience tonight makes this a
  concrete, not hypothetical, risk). Confidence: high (procedural).
- `RULE-COUNSEL-055` — Recognize paid part-time work as legitimate `career_exploration`/
  professional-exposure evidence on par with an internship, not a lesser or absent signal.
  Confidence: high (direct extension of already-shipped scoring logic's own internship treatment).
- `RULE-COUNSEL-056` *(this session's numbering — see collision note above)* — Exempt
  `career_exploration`/`intellectual_curiosity` candidates from redundancy/saturation discounting
  for Phase-1 (exploration-stage) students, reconciling this session's `05` with the peer session's
  `03`. Confidence: high (resolves a genuine, demonstrated composition error between two
  independently-authored frameworks).
