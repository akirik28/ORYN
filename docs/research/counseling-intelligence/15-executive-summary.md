# Executive Summary — Counseling Intelligence Research (Overnight, 2026-08-21)

**Read this if you're reading exactly one document from this whole package.** Everything below is
a claim made and sourced in full somewhere in the 20+ documents across both branches — this page
exists to save you from having to find which one. Cross-references point to where to go for the
full reasoning/sourcing on anything you want to push on.

## What this package actually is

Two Claude sessions independently assigned the identical overnight mission, collided in a shared
working directory ~15 minutes in, resolved it live via direct agent-to-agent messaging (not by
waking you up), and then split the work explicitly and coordinated continuously for the rest of
the night — including catching bugs in each other's work, independently verifying each other's
factual claims, and cross-checking each other's frameworks against hard cases neither had
individually tested. Full blow-by-blow account: `docs/handoffs/research-counseling-intelligence.md`
(this branch) and its counterpart on `oryn/counseling-intelligence-research`. **Nothing was lost**
— every version of every document either session produced is still in git history somewhere, even
where one superseded another.

The result is a **research/reasoning layer**, not code — no schema changes, no migrations, no
edits to the already-shipped `lib/counselor/` engine. It's meant to be read by whoever next works
on Counselor Core's reasoning content, not deployed as-is.

## The single most important finding

**Most of this research (both branches') is built from US-style holistic-admissions sources. Most
of ORYN's actual target countries don't run US-style holistic admissions.** Directly verified
against official government sources for 10 countries:

| Tier | What it means | Countries verified |
|---|---|---|
| 1 — Full holistic | Activity profile is a real, independently-weighted input | USA |
| 2 — Partial/subject-focused | Some activity evidence matters, narrowly | UK (subject-relevant "super-curricular" evidence specifically), France (5 officially-defined, formation-weighted evaluation fields — grades, academic competencies, soft skills, motivation, activities/engagement), Canada (grades-first, holistic layer only in named competitive programs) |
| 3 — Credential/exam-gated | Activity profile carries little-to-no formal weight | Germany, Netherlands, Switzerland, Italy (public), Spain, **Turkey** (no application file exists at all) |

**Product implication**: a counselor that gives the same "build a well-rounded activity profile"
advice regardless of a student's target country/system will be actively misleading for a large
share of ORYN's actual users — most concretely, a Turkey-YKS-track student whose real lever is
exam score, not extracurriculars. Even within a mostly-Tier-3 country, specific fields can carry
their own exception (Turkish state conservatories require both a score threshold *and* an
audition — verified against official guidance). Full detail:
`11-geography-admissions-systems.md` (this branch).

**Sharper still, found on a follow-up pass**: "holistic layer" is not one mechanism even within a
single country's named exceptions. Direct-fetching each of Canada's four named competitive
programs' own pages found real heterogeneity — Waterloo's AIF explicitly rewards documented
activities, while Queen's Commerce and McMaster's Honours Health Sciences Program score a written/
video response to specific prompts with **no activities-list criterion in their own rubric at
all**. Checking whether this generalized turned up a genuine structural pattern spanning both
branches: **standardized third-party situational-judgment testing (CASPer in the US/Canada, the
UK's UCAT) is now confirmed across 5 fields and 2 continents** — medicine, health sciences, nursing,
teacher education, and undergraduate engineering (Western University, ~7,500 applicants/year) —
each requiring not "more evidence" but a different, currently-unmodeled kind of preparation
(rehearsing timed situational judgment, not activity accumulation). Full detail:
`17-dimension-weighting-by-target.md` (this branch, includes the cross-branch tracker) and
`09-persona-testing.md` Persona J (where the gap was first surfaced).

**Highest-leverage next engineering step, already scoped**: a geography-conditional recommendation
-framing layer, keyed off data ORYN already collects (`target_universities` → university country,
falling back to `profiles.target_geographies`) — no new data collection required. **Now available
in two layers**: tier-level framing language (`11`) and, new this pass, a qualitative per-dimension
weighting proposal for what to emphasize *within* that framing (`17` — e.g. subject-relevant vs.
generic evidence for a UK target), staying strictly qualitative (no invented numeric weights) per
`AGENTS.md`'s own prohibition on LLM-guessed scoring parameters. Full prioritized build order:
`13-implementation-readiness.md` (this branch).

## What else is validated and safe to build on

- **The shipped 9-dimension taxonomy needs no changes.** Checked against Common Data Set, NACAC,
  MIT's official admissions guidance, and Harvard GSE's "Turning the Tide" — the taxonomy holds up,
  and "depth over performative breadth" is real, sourced, institutional consensus, not an
  invented product philosophy. (`01-development-taxonomy.md`)
- **An achievement-tier evidence model** (registered → participated → finalist → award → winner →
  publication → leadership/founder role) is fully specified and would let the product stop
  conflating "entered a competition" with "won it" — currently a real, confirmed scoring gap
  (`02-opportunity-development-mapping.md`). Cheapest version: one new optional enum field.
- **Redundancy/saturation logic should be tier-aware, not the current flat `0.75` constant** —
  and, per cross-branch testing, needs to be *both* stage-aware (don't discount healthy breadth-
  seeking in younger students) *and* target-tier-aware (the "this won't read well to an evaluator"
  justification doesn't apply where no evaluator reads an activity file at all, e.g. Turkey).
  (`05-redundancy-saturation.md`)
- **A profile-gap framework distinguishes real gaps from harmless, explainable absences**: economic/
  geographic access (empirically real, large peer-reviewed study), health/disability and caregiving
  context (with real precedent — Common App's own "Challenges and Circumstances" section exists for
  exactly this), and curriculum-mandated structure (IB's CAS component is a real diploma
  requirement — IBO removed its old fixed 150-hour rule around 2017 and doesn't mandate a specific
  number now, but still describes the expected engagement as roughly 3-4 hrs/week over 18 months,
  with individual schools setting their own targets — enough that a "thin" non-CAS activity list
  from an IB student may not be thin at all). None of this requires
  collecting new sensitive data — only reading what's voluntarily disclosed and never inferring
  from its absence. (`04-profile-gap-framework.md`)
- **20 major-field evidence docs** now exist (grown from an initial ~14-field estimate as both
  sessions kept finding genuine gaps: education/teaching, social work, performing arts/music were
  all added *after* the "complete" set felt done) — each sourced against official admissions/
  professional-body guidance, most now including US/UK/EU/Turkey country-specific licensure and
  career-outlook notes. (`06-major-family-evidence/`, both branches)
- **A concrete, sourced multi-year activity-progression model** exists for how depth should
  actually accumulate over 4 years, distinguishing genuine escalation from lateral repetition, with
  explicit handling for a student who starts an interest late. (`12-activity-progression-pathways.md`)

## Verification, not just self-report

This branch independently re-checked **7 specific factual claims** from the peer branch against
primary sources (O*NET, BLS, an internal repo citation, official UK career-service pages) — **all
seven were accurate**, including one exact quote match. The peer branch reciprocated, stress-
testing this branch's own redundancy framework against the Turkey finding and catching a real
scope limit in it. Neither branch trusted the other's self-report without checking.

**A second, distinct kind of verification ran through the rest of the night**: upgrading this
branch's own weaker-sourced claims to direct official-source fetches rather than leaving them at
their original secondary-source confidence — UCAS's own guidance pages (peer-fetched), ÖSYM's own
domain (peer-fetched), Waterloo/Queen's/UofT's own admissions pages (this branch, one 403'd),
France's DGESIP CGEV framework document (this branch, required a `pypdf` workaround after
WebFetch's extractor failed on the PDF), and Germany's Bundesärztekammer (this branch) — several of
which **corrected**, not just confirmed, a prior claim (UofT's general process was found not to
match its own earlier "explicitly holistic" characterization; a chronic-illness prevalence figure
was found understated; a social-work sub-claim was found unconfirmed by the specific regulation
checked). The pattern held across both kinds of checking: primary-source verification found real
things to fix roughly as often as it confirmed what was already there — worth knowing when
deciding how much to trust any single `medium`-or-below-confidence claim that hasn't been
specifically re-checked yet.

## What's genuinely unresolved (don't skip this)

1. **Cross-branch rule-ID numbering.** Both branches independently minted rules 034-059 for
   different content; the peer branch has since renumbered its own copy to 200-230 (same-branch
   only, not merged). A third, pre-existing registry from a fourth overnight session also exists
   on the shared branch with rules that were found to be genuinely different content under the
   same numbers as this branch's originals (not just wording drift — verified by direct diff).
   **A real integration pass, by a human or a fresh session with authority to make final calls, is
   required before treating either branch's `rules.json` as canonical.** Full collision map:
   this branch's handoff doc.
2. **The mixed-target-geography explanation question** (a student applying to both a Tier-1 and
   Tier-3 system needs the same recommendation explained differently per target) is a genuine
   product/UX decision neither branch could resolve — flagged on both sides, not answered.
   **Sharpened, not resolved, by a follow-up persona test**: `09`'s Persona J found that even a
   fully separate, per-target explanation isn't automatically sufficient — it must also name the
   *mechanism* (direct evidence vs. indirect raw material for a differently-scored response), not
   only the tier-appropriate framing register, or a student can reasonably draw the wrong
   conclusion about how to prepare for one of their targets even when the recommended action is
   correctly identical for both.
3. **Neither branch independently re-verified every claim in every document** — spot-verification
   (this branch checked 7 of the peer's claims) is not the same as exhaustive audit. Treat
   `confidence: medium` and lower as exactly that.
4. Data ORYN doesn't yet have to fully execute several of these rules (school-level curriculum
   availability, a structured achievement-tier field, opportunity selectivity) — full list with
   what each would take to add: `10-open-questions.md` and `13-implementation-readiness.md`.
5. **A new recommendation-type gap, found late in the night and not yet resolved**: ORYN's entire
   recommendation vocabulary is built around logged achievements. The situational-judgment-test
   category above (CASPer/UCAT and similar) needs a genuinely different recommendation type —
   "rehearse a structured response" — that doesn't fit the existing achievement-tier model at all.
   Checked against the actual shipped types (`RecommendationClass` governs strength, not kind;
   `CandidateAction.category` is an unstructured string) — confirmed as a real gap, not
   pre-decided how to close it. A founder/engineering scoping question, same category as item 2.

## If you read nothing else

Read `13-implementation-readiness.md` for what to build first, and the geography-tier table above
for why the counselor needs to know *where* a student is applying before it decides how much any
of the rest of this research should shape what it says.
