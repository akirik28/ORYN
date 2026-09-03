# Turkey's own schooling-location gap — what the product says today, and to whom

**Status: measurement and a proposal sketch. Nothing built**, per explicit instruction — the
resolver has no field to read a student's own school, and the profile has no structured way to
record one. Written 2026-09-03, following directly from
[`foreign-curriculum-schools-in-turkey-2026-09-03.md`](../foreign-curriculum-schools-in-turkey-2026-09-03.md),
which found the same structural gap (pathway resolved from residence, not schooling location)
already existed, unfixed, in Turkey's own shipped entry — discovered while researching Germany
and Italy, not the original target.

## A. What `resolvePathway` actually does, traced precisely

`lib/admissions/system-shape.ts`'s `resolvePathway` (line 972) takes exactly one input beyond
the registry entry itself: `studentCountry`, sourced from `profiles.country` and documented on
`AdmissionSystemQuery.studentCountry` as "residence/school location, never citizenship." For
Turkey's entry, whose `domestic` and `international` systems genuinely differ (`isSplit` is
true), the logic is a single equality check:

```ts
return {
  pathway: matchesCountry(domesticSide, studentCountry) ? "domestic" : "international",
  basis: "residence",
};
```

`matchesCountry` calls `isSameCountry` (`lib/opportunities/matching.ts:99`), a pure string-
canonicalization equality — no institution awareness, no exception list, nothing beyond
comparing two country strings. **There is no code path anywhere in `resolvePathway` or
`resolveAdmissionSystem` that reads a student's school name, institution type, or anything
resembling "where was this specific qualification earned."**

Applying this to the founder's four named cases — all four physically resident in Turkey, so
`studentCountry = "Turkey"` for all four:

| Case | What `resolvePathway` returns | What `turkey.md` §B says is actually correct | Match? |
|---|---|---|---|
| Ordinary MEB/Turkish-curriculum student | `domestic` (YKS) | `domestic` (YKS) | **Correct** |
| Embassy-school student | `domestic` (YKS) | `international` (foreign-national pathway) | **Wrong** |
| MOBİS-listed international institution student | `domestic` (YKS) | `international` (foreign-national pathway) | **Wrong** |
| MEB-project-relocated foreign national | `domestic` (YKS) | `international` (foreign-national pathway) | **Wrong** |

**All four cases produce the identical resolver output.** One of the four gets the right answer
by construction (the ordinary case is what residence-based resolution is built for); the other
three get the wrong one, not as an edge-case miss but as a direct, mechanical consequence of the
resolver having no way to distinguish any of the four from each other. This isn't a probabilistic
or fuzzy-matching failure — it's a hardcoded impossibility given the current input set.

## B. Does the shipped copy mislead, or is it merely incomplete?

**It actively misleads for the three exception cases — this is stronger than incompleteness.**
An embassy-school (or MOBİS-listed, or MEB-project) student querying Turkey today receives the
`domestic` `PathwaySystem`, whose shipped mechanism text reads: *"ÖSYM's YKS placement algorithm
is the admission decision itself: exam scores plus your school grade average produce one number,
and places are filled in strict rank order against each programme's quota."* This is not a vague
or hedged claim that happens not to cover their case — it's a specific, confident, actionable
assertion about which mechanism decides their admission, and per `turkey.md`'s own sourced
research, it is the wrong mechanism for exactly these three populations. A merely *incomplete*
text would fail to mention their case while still being true as far as it goes (the way the
`international` text doesn't enumerate every accepted credential but isn't wrong about what it
does say). This is different: **a student in one of the three exception categories is told a
specific, wrong thing about their own admission process**, not left with an unaddressed
question. That distinction is the reason this sits above "add it to the backlog" — a counselor
or a student reading this today would form the wrong plan (preparing for/registering for YKS)
when their own actual best-available route is the separate foreign-national pathway.

## C. Is anyone affected right now — checked against live data, not assumed

`oryn-qa-scratch`, checked live 2026-09-03: **11 total profiles, 5 with `profiles.country` in
('Turkey', 'Türkiye', 'Turkiye')** — all 5 hold a non-Turkish curriculum value (`ib` ×4, `ap`
×1), meaning all 5 are in the population `turkey.md` describes as needing the schooling-location
distinction checked before assuming a pathway. Their `education_records` (`stage = 'high_school'`)
name exactly three schools:

| School | Profiles | Checked |
|---|---|---|
| Robert College | 3 | **Confirmed not an exception case.** The school's own published university-results page and independent secondary sources both describe its graduates as entering Turkish universities via **YKS** — the domestic pathway, which is also what the resolver currently (and, per this finding, correctly) returns for them. Robert College does carry a real, MEB-recognized "yabancı özel lise" (foreign private high school) institutional classification — a genuinely different legal category from an ordinary Turkish özel lise — but that governance/founding-history classification is not the same thing as "MOBİS-listed for admissions-pathway purposes," and a direct source confirms its graduates use YKS regardless. **The resolver's answer for these 3 profiles is correct, not wrong.**
| Üsküdar American Academy | 1 | **Not confirmed either way, leaning toward also-correct.** Same structural profile as Robert College — old (1876), foreign-founded, MEB-accredited alongside CIS/IB — and independently confirmed to place graduates at Boğaziçi, Koç, Sabancı and İTÜ (named domestic Turkish universities, with no mention of a separate foreign-student track). No source found that states the specific YKS-vs-TR-YÖS mechanism as directly as Robert College's own page does. Held to lower confidence than the Robert College finding — inferred from a strong structural parallel, not independently confirmed the same way.
| Kadıköy International College | 1 | **Genuinely unconfirmed.** No source found addressing this school's admissions-pathway treatment either way. Not assumed in either direction.

**Honest answer: no confirmed case of a real profile currently receiving the wrong pathway.**
The one case checked with a direct, independent source (Robert College, 3 of 5 profiles) turns
out to be correctly resolved. The other two are unconfirmed, not confirmed-wrong — this is a
different, more honest state than either "yes, N students are affected" or "no, nobody is,"
and it's stated as such rather than rounded to either. This changes urgency (real evidence, not
a purely hypothetical scenario, and a genuine unresolved tail of 2 profiles), not correctness —
the mechanism gap in §A is real regardless of whether these specific 11 profiles happen to
land in it today.

**What would raise this from "unconfirmed" to "confirmed":** a maintained list of MOBİS-registered
institutions (MEB's Özel Öğretim Kurumları Genel Müdürlüğü would be the authoritative source;
not fetched this pass) checked against Kadıköy International College and Üsküdar American
Academy by name — the same kind of per-institution verification
`docs/finland-amk-sector-2026-09-03.md` already did for AMK identity, just for a different
registry and a different country.

## D. What fixing it would touch

**Not a text-only fix, for the routing itself — the mechanism sentences are not where the defect
lives.** The `international` mechanism text ("students who completed secondary school outside
Türkiye...") is accurate as far as it goes; the `domestic` text is accurate for the population it
was written for. The actual defect is upstream of either sentence: `resolvePathway` decides
*which* `PathwaySystem` to return before any text is chosen, and it decides using only
`studentCountry`. No wording change to either sentence changes which one a given student sees.

**A real, cheap, honest partial mitigation is text-only, though — a caveat, not a fix.** The
`domestic` mechanism sentence could name the three exceptions directly ("...unless you attend an
embassy school, a MOBİS-listed institution, or are in Turkey under an MEB relocation project, in
which case check your target university directly") — this converts §B's "actively misleading"
into "honest about its own limit," at effectively zero engineering cost, without touching the
resolver or any schema. It does not fix the routing: an affected student would still see the YKS
mechanism as their primary, resolved answer, just with a flag attached rather than none.

**Actually fixing the routing needs a new signal the resolver can check.** Unlike the Germany/
Italy/France finding (where `CurriculumType` had no value that could even hold the relevant fact),
Turkey's case has a real, existing, structured-enough starting point: `education_records
.school_name`, already collected today, already free text. A workable shape, sketched and not
designed: a new optional field on `AdmissionSystemQuery` (something like `studentSchoolName`),
and a new resolution check inside Turkey's own entry — structurally similar to the
`subdivisions`/`institutionOverrides` name-match pattern already proven for Finland and Canada,
just matching the *student's own* school rather than the *target* university. This needs (1) the
new query field, (2) a matched-name list of known embassy/MOBİS/MEB-project institutions
(a research task, not a code task — see §C's "what would raise this to confirmed" for the same
underlying list), and (3) a decision on precedence if a school name doesn't match any known
institution — falling through to the current residence-based default is the safe choice, the
same "unclassified falls through to the honest default" principle `subdivision-key-proposal.md`
already established.

**Not designed here, per instruction** — this is the shape and the cost class, not a spec.

## E. The 130-row trap, and how it connects here specifically

Independently verified live (`oryn-qa-scratch`): `university_requirements` has **130 rows**
tagged `requirement_type = 'curriculum'`, **zero** with `structured_rule` populated —
`lib/requirements/evaluate.ts`'s `case "curriculum":` evaluator (reading `structured_rule
->>'kind' = 'curriculum'`, validated by `lib/validation/requirements.ts`'s `CurriculumRuleSchema`
against the same `CurriculumType`/`CURRICULA` enum already found missing Abitur/maturità/
baccalauréat values) has never executed against real data.

**The connection to this specific finding:** fixing Turkey's schooling-location gap doesn't touch
`university_requirements` directly — that table is per-university program requirements, a
different mechanism from `system-shape.ts`'s country-level registry. But the natural next step
after correctly identifying "this Turkey-resident student's real qualification is a recognized
foreign curriculum, not MEB's" is exactly the kind of fact someone would want to encode as a real
per-program requirement rule (e.g., a German university's own "recognized foreign curriculum:
A-Level or IB" requirement, now structured rather than prose). **The day that first rule is
written, it reads `facts.curricula` against the same enum this whole research line has found
lacking Abitur/maturità/baccalauréat/Matura values** — so a Bildungsinländer-status Abitur holder
(confirmed real and material in the Germany research) or a Turkey-schooled embassy/MOBİS student
correctly identified via whatever mechanism eventually gets built here would still fail that
rule with a confident `"not_met"`, not `"unknown"`, because their real qualification has nowhere
to be recorded. **Both gaps — the pathway resolver's missing schooling-location signal, and the
dormant curriculum-requirement evaluator — resolve to the same root cause: `CurriculumType` (and
by extension anything downstream that reads it) has no vocabulary for a qualification earned
outside the six values it currently holds.** Fixing one without the other leaves a real trap in
place; naming both here rather than treating this as Turkey-specific.

## Sources

- Direct reading of `lib/admissions/system-shape.ts` (`resolvePathway`, `resolveAdmissionSystem`,
  the shipped Turkey entry) and `lib/opportunities/matching.ts` (`isSameCountry`) — confirmed
  against the file at commit `ee350118`, not recalled from earlier research.
- `docs/research/admissions-systems/turkey.md` §B — existing research, cited for the three named
  exceptions and their sourcing.
- Live queries against `oryn-qa-scratch` (`profiles`, `education_records`, `university_
  requirements`) for every number cited above — run, not estimated.
- Robert College's own published university-placement page and independent Turkish-language
  secondary sources (school-review sites) — search-summary sourced, 2026-09-03, for the
  YKS-vs-TR-YÖS finding and the "yabancı özel lise" institutional classification.
- Üsküdar American Academy's own history/accreditation profile and a Turkish-language search
  result naming its own domestic (Boğaziçi/Koç/Sabancı/İTÜ) placements — search-summary sourced,
  2026-09-03; not independently primary-fetched.
- A Turkish-language search result quoting MOBİS/embassy-school/MEB-project exemption language
  from what appears to be an official or official-adjacent YÖS-guidance source — search-summary
  sourced, 2026-09-03; the exact source page was not independently re-fetched, and no full MOBİS
  institution list was located or checked this pass.

## Unresolved questions

Whether Üsküdar American Academy or Kadıköy International College graduates specifically use
YKS or the foreign-national pathway — genuinely unconfirmed, not leaned into either direction
without better sourcing. Where the authoritative, current MOBİS institution list lives and
whether it's practically fetchable (MEB's Özel Öğretim Kurumları Genel Müdürlüğü was named as
the likely source, not checked). Whether "yabancı özel lise" institutional status correlates with
MOBİS-admissions-listing status more generally, beyond the one negative data point (Robert
College carries the institutional label but is confirmed YKS-track) found this pass.
