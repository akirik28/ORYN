# RES-V1 close-out — 2026-08-22

Written for a cold session: no conversational memory of tonight assumed. Five items in
priority order (BASORG's ranking, by transferability), then V1-13's result stated
plainly so it isn't re-derived. Everything below is checkable in git — commit hashes are
load-bearing, not decoration.

## 1. Rule 28 — a delta check compares a change against its intent; it cannot detect that the intent was wrong

Verified generally, first found as a specific miss: V1-12b (`docs/research/verification/v1-12b_au_r1_adelaide_delta.md`,
commit `902d5f2`) checked that Adelaide's 3 rewritten pathway records' new
`international`-key text matched its own stated purpose (a "no distinct variant"
explanation) and matched the README's description of the fix. It did. **The check
passed, and the fix was still a defect** — the new text didn't belong in
`study_mode`/`entry_requirements`'s value domain at all (those fields hold study-mode and
admission-criteria values on every other record; the "fix" put a provenance sentence
there instead). BASORG and RES-V2 found this by reading the field's own siblings
corpus-wide, not by re-checking the edit against its intent — the addendum in the same
file (`20ac5b8`) records the miss directly. **A delta/diff-against-intent check is
structurally blind to "the intent itself was wrong," no matter how carefully run.**
Before trusting any change-verification as complete, ask whether the new value belongs
in the field's domain, not just whether it matches what the change said it would do.

## 2. `findValueDomainOutliers` — reusable, and its false-positive rate is measured, not assumed

`scripts/validate-research-records.ts`, unit-tested (`__tests__/scripts/validate-research-records.test.ts`,
4 tests), wired into both `au-r1` and `ca-r1` as a **finding**, never a defect. Two
signals: (1) length outlier, judged against a field's own corpus median, not a fixed
schema; (2) provenance-language marker regex, calibrated on Adelaide's real phrasing
("confirmed live", "301-redirect", "byte-identical", a parenthetical date-stamp).

**Measured on V1-13's sweep (`docs/research/verification/v1-13_value-domain-sweep.md`,
`345ebdd`): the length signal alone fired 13 times, 0 were real defects** (all genuine
dual-campus programmes and multi-band ATAR cutoffs, read in full before dismissing).
**The provenance-language signal fired 0 times everywhere, including on the 3 records
known to have the defect before they were fixed** — it only matches Adelaide's specific
wording, so it's precise but not exhaustive; a differently-worded instance of the same
class would need signal 1 (weak, high-recall) followed by a read of the actual content
(BASORG's exact framing: *"a check that fires is not a defect that exists"* — see #3).
**Anyone reusing this check without this number will report 13 defects on a clean
corpus.** Length alone is a lead, not a verdict.

## 3. A check that fires is not the same as a defect that exists

`findTaxonomyConsistencyGaps` (built for AU's AQF-based "integrated master's"
classification, unit-tested pre-existing) was reused as-is against Ottawa
(`docs/research/verification/v1-12a_ca_r1_ottawa_verdict.md`, `902d5f2`) and fired 28
times. **Canada has no AQF and no "integrated master's" level in its own vocabulary at
all** — importing the AU framing wholesale would have mischaracterized this as 28 missing
labels. The real finding, reframed in Ottawa's own terms: ~23 of Ottawa's own combined
Bachelor+Master-shape titles get a `degree_level` indistinguishable from a plain Honours
bachelor's, while a handful (the joint LLL+MBA, 3 JD combinations) get one that
acknowledges the graduate component — an internal inconsistency, not a label mismatch.
**Before treating any reused check's output as a defect list, confirm the check's
assumption (here: that a specific target label exists in this corpus's own vocabulary)
actually holds for the corpus it's now running against.**

## 4. The blind-pass / informed-pass control (Ottawa)

Ottawa was verified clean under `ca-r1` before it went live (`902d5f2`). It went live
mid-way through V1-13, changing what any finding there would mean (source fix →
Path A / founder decision). **Re-ran the sweep on Ottawa specifically after learning
this, and got the same zero result as the pass that ran before the stakes changed**
(`v1-13_value-domain-sweep.md`, "Explicit live/not-live split" section). This is a
control against motivated leniency — nobody asked for it, and comparing a
before-you-knew-it-mattered pass against an after-you-knew pass is the only clean way to
answer "would I have looked as hard if it mattered less." Worth deliberately repeating on
any future corpus that changes live-status mid-verification, not just remembering the
result.

## 5. `ca-r1` contract exists

`scripts/validate-research-records.ts`, `CA_R1_CONTRACT` — added V1-12a (`902d5f2`),
modeled directly on `AU_R1_CONTRACT`. Covers Ottawa's 24-field schema (AU-R1's 23 +
`status_note`, a free-text field for source-stated program status like "admission
suspended"). Same `field_provenance` closed-vocabulary check, same null-fence, same
duplicate-URL and university-resolution logic. Canada's first formalized lane — any
future Canadian research package should run through `--lane=ca-r1`, not a fresh ad-hoc
script. (A Calgary pilot looked imminent earlier tonight; it isn't — see "Resume
condition" below, corrected after this doc's first push.)

## V1-13's result, stated plainly — do not re-run this sweep

**The value-domain defect class (§1/§2 above) is Adelaide-only.** Swept all 6 corpora
delivered as of tonight — UNSW, Sydney, Monash, UWA, Adelaide, Ottawa, 1,047 records —
with both signals. **Zero instances outside Adelaide's 3 records, which are already
fixed** (commit `871bbc9` on `oryn/res-r1-au-programmes`, confirmed directly, corroborated
independently by RES-V2's own sweep of Adelaide's other 116 in V2-12). A successor
verifying a **new** corpus should run `findValueDomainOutliers` on it (per #2's own
`ca-r1`/`au-r1` wiring, this happens automatically) — but should not re-sweep the six
corpora already covered here unless one of them changes again.

## Resume condition (corrected after first push — read this, not §5's original line)

**No pending trigger.** This doc originally named "RES-R1's 8–10 record Calgary pilot" as
the resume condition. It's dead: Calgary was deferred (source-authority gate passed;
feasibility didn't — sustained 429s against a host rate-limiting at ~50 requests/15min,
against 493 programmes needing a browser render each), and the follow-up attempt,
Dalhousie, came back inconclusive (no response in a generous budget, cause undetermined).
Verified live before writing this correction: both `University of Calgary` and
`Dalhousie University` show 0 rows in `university_programs` today. **Resume condition is
now: a new corpus reaching contract/ID verification** — 15 Canada targets remain,
re-queried at zero programmes as of tonight, none currently in flight.

**A trigger is a claim about the future, and goes stale the same way any other claim
does** — BASORG had to retract this same kind of dead trigger twice tonight (this one,
and a separate one left standing for RES-V2). Whoever sets a trigger owns retracting it
when the world changes; whoever reads one on a cold resume should still verify it's still
live before treating it as the next task, the same way every other claim in this doc is
checked against a commit rather than asserted.

## Session tally

Three packages: V1-11 (Canada URL defect characterization, `734aad1`), V1-12a/b (Ottawa +
Adelaide delta, `902d5f2` + addendum `20ac5b8`), V1-13 (value-domain sweep, `345ebdd`).
All gate-green (typecheck/lint/tests) at time of push. Idle at close, no open task.
