# Does the admission-system research actually reach a student? — surfacing audit

**Status: measurement only, nothing built.** Written 2026-09-03 after the ten-country
admissions-registry expansion line, to answer one question the research itself never checked:
does any of it reach a student, the advisor, or the counselor — or does it sit in a registry only
`computeAdmissionOutlook` consults internally? Checked against `origin/main`@`b8a36604`, with
every cited line re-verified against that exact commit before this was written up (not carried
over from an earlier read) — re-verify again if `main` has moved further. Continuation of, not a replacement for,
[`README.md`](./README.md)'s own Gaps 1-5 — those were about whether `resolveAdmissionSystem`
computes the right *shape*; this is about whether anything downstream *shows* it. Gaps 1-3 there
are the reason `resolveAdmissionSystem` now has the pathway/institution/field granularity it
does — this audit found that granularity is real and correctly computed, and then mostly unused.

## Method

Traced every real (non-test, non-script, non-dev-preview) call site of `resolveAdmissionSystem`,
`computeAdmissionOutlook`, and `explainOutlook`, found via `grep`, then read forward from each to
see what happens to `notApplicableReason`, `admissionSystemMechanism`, and `sources` — the three
fields that carry tonight's actual research (a real, sourced sentence like Greece's "the criterion
is the applicant's existing secondary-school graduation grade," not just a shape label).

## The three real surfaces, and what each one does

### 1. University detail page (`app/(app)/universities/[id]/page.tsx`) — half-wired, precisely

Computes a fresh `AdmissionOutlookResult` on every render (`refreshAdmissionOutlook` at line 173,
which calls `resolveAdmissionSystem` + `computeAdmissionOutlook` inside `lib/admissions/persist.ts`).

- **When the outlook is `not_applicable`** (line 415-429): renders `notApplicableReason` — which,
  per `outlook.ts:326-328`, is the sourced mechanism sentence concatenated with the generic
  reason — plus an "Unknowns" list. **This works.** A student targeting a Swedish, Greek,
  Polish, Austrian, or Belgian university (the 42 institutions this expansion line moved to
  `not_applicable`) sees the real explanation.
- **For every other outcome** (line 431-477, the `else` branch): renders Strengths/Gaps (from the
  student's own profile scores) and a generic Unknowns list (`UNKNOWNS_BY_SHAPE`, e.g. "Essays,
  Recommendations, Applicant pool in this admission cycle"). **`outlook.admissionSystemMechanism`
  and `outlook.sources` are never referenced anywhere in this file** — confirmed by grep, not
  inferred. A student targeting a university in Norway (international pathway), Portugal
  (international), Denmark (either pathway), Hungary (international), or Czechia (either
  pathway) — the 33 institutions this expansion line moved from blank to a real sourced
  mechanism — sees a "Reach"/"Competitive"/"Likely" badge and a generic Unknowns list that could
  belong to any holistic-review country. The specific sentence ("Charles University's own page
  confirms this varies even by programme within one institution... check the specific target
  programme," for one live example) is computed and discarded. Same is true for every UK
  institution and every institution in a country with no registry entry at all — none of those
  ever reach `not_applicable` either, so none of them get the mechanism sentence.
- **`SourceBadge`** appears 3 times on this page (lines 563, 617, 716) — confirmed by reading each
  call site, all three cite `stats.source` (institutional statistics), `researchTopicsMetric`
  (OpenAlex), and `sourcesRes.data` (a general `university_sources` table). **None of the three
  cite `outlook.sources`** — the admission-system registry's own citation
  (`docs/research/admissions-systems/greece.md`, for example) has no `SourceBadge` anywhere,
  regardless of outcome. A student who reads the mechanism sentence in the `not_applicable` case
  has no way to see it came from real research rather than a generated guess.

### 2. `buildUniversityCounselingView` / `deriveOutlook` (`lib/universities/counseling-adapter.ts`) — fully built, zero callers

`deriveOutlook` (line 445-499) is the *best*-wired of the three: its return type carries
`notApplicableReason`, `admissionSystemMechanism`, and `sources` in full (lines 493-497), richer
than what the detail page actually renders. **`grep -rl "buildUniversityCounselingView"` across
the entire app returns exactly two files: the module itself and its own test.** No page, no API
route, no advisor context builder calls it. This is the same shape of finding
[`README.md`](./README.md)'s own top-line gap already described for `admissionSystemType` — a
fully-built, unit-tested capability with zero live callers — recurring one layer up, after that
original gap was fixed.

### 3. AI advisor context (`lib/ai/student-context.ts`) — never touches the registry at all

The advisor's student-context builder does not call `resolveAdmissionSystem`,
`computeAdmissionOutlook`, or `buildUniversityCounselingView` — confirmed by grep, zero hits for
any of the three in this file. It reads `target_universities` directly
(`student-context.ts:390`: `.select("id, status, outlook, university_id, program_id")`) and
formats only the bare persisted `outlook` enum through `outlookLabel()` into a short string —
`student-context.ts:758`: `` `${t.name} (${t.status}${t.outlook ? `, ${outlookLabel(t.outlook, locale)}` : ""})` ``.
For a target in Greece, the advisor's context contains a line that reads, in full, something like
"University of Athens (target, Not rated on this scale)" — no mechanism, no reason, no source,
regardless of whether the outlook is `not_applicable` or a real reach/competitive/likely label.
**The advisor cannot currently explain, reference, or reason about any country-specific
admissions mechanism this expansion line researched — not even the sourced sentences that DO
reach the detail page.** Also checked and confirmed empty for the same reason:
`lib/ai/weekly-plan.ts`, `lib/ai/opportunity-context.ts`, `lib/ai/advisor-chat.ts`,
`lib/counselor/eligibility.ts`, `lib/counselor/state.ts` — none reference
`admissionSystemMechanism`, `resolveAdmissionSystem`, `computeAdmissionOutlook`, or
`buildUniversityCounselingView`.

## What this means, concretely, for tonight's ten countries

Split by what a student targeting each pathway actually sees on the detail page (the advisor sees
none of it either way, per surface 3):

- **Reaches the student (`not_applicable`, mechanism shown):** Sweden (both), Greece (both),
  Poland (both), Austria (both, general track), Belgium (both, general track) — 42 institutions.
- **Computed, discarded (real badge shown, mechanism never rendered):** Norway (international),
  Portugal (international), Denmark (both pathways), Hungary (international), Czechia (both
  pathways) — 33 institutions, plus every UK institution (79) and every institution in a country
  with no registry entry at all (458, per the corridor-scope re-measurement).

## What this document is not

Not a recommendation to build the fix, and not a design for one — that's a deliberately separate
step from measuring whether the gap exists, per the same "measure first, report before building"
discipline the corridor-scope and applied-sciences-coverage measurements this session already
followed. Two shapes of fix are visible from what was traced (wire `admissionSystemMechanism` +
`sources` into the detail page's non-`not_applicable` branch and add a `SourceBadge` for
`outlook.sources`; separately, decide whether `buildUniversityCounselingView` is the intended path
into the advisor's context and wire it in, or whether it should be retired as unused) — named
here for completeness, not sized or committed to.

## Sources

- Direct reading of `app/(app)/universities/[id]/page.tsx`, `lib/admissions/persist.ts`,
  `lib/admissions/outlook.ts`, `lib/universities/counseling-adapter.ts`, and
  `lib/ai/student-context.ts` against `origin/main`@`3b2f23f0`, plus `grep` confirming caller
  counts for `buildUniversityCounselingView`, `resolveAdmissionSystem`,
  `computeAdmissionOutlook`, and `admissionSystemMechanism` across the full app tree (excluding
  `node_modules`, `__tests__`, and dev-preview-only routes).
- Institution counts (42 / 33 / 79 / 458) from this session's own live re-measurement, not
  recomputed separately for this document.

## Unresolved questions

Whether `lib/ai/weekly-plan.ts` or `lib/ai/opportunity-context.ts` should carry admissions
mechanism context at all, given AGENTS.md Phase 27's cost-control discipline (context trimming,
not dumping every available fact into every prompt) — checked that they currently don't, not
whether they should. Whether the fix belongs on the detail page, in the advisor context, or both
— a product decision this document doesn't make. Whether `buildUniversityCounselingView`'s
non-adoption is an oversight or an earlier, undocumented decision to hold it back — not
investigated beyond confirming it has no live callers.
