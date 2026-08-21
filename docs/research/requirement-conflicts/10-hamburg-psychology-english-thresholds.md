# 10 — Hamburg: Psychology English thresholds, two pages, two numbers each

**Records:** `REQ-2026-08-21-HAM0012`, `REQ-2026-08-21-HAM0013`
(`de_nl_requirements_hamburg_2026-08-21.jsonl`, lines 12–13)
**University:** Universität Hamburg (Germany)
**Status:** **Split — one half resolved, one half unmeasurable**
**Re-checked:** 2026-08-22

## What was recorded

Two official `uni-hamburg.de` pages giving different TOEFL thresholds for the same Psychology
programme, both certifying the same stated level (CEFR B2):

| Source | TOEFL iBT | TOEFL paper-based | IELTS |
|---|---|---|---|
| Institute of Psychology department page | **72** | **567** | 5.5 |
| Central campuscenter page | **70** | **550** | 5.5 |

IELTS agreed; only the TOEFL figures diverged.

## What I did

Re-fetched both pages on 2026-08-22 and separated the record into its two axes, because they turn
out to have **different truth values** — which is not visible while they are treated as one
disagreement.

## Axis 1 — the paper-based figures: unmeasurable, not disputed

**ETS discontinued the paper-based TOEFL.** The original PBT (the 310–677 scale that 550 and 567
belong to) was retired in 2017; the revised paper-delivered replacement was discontinued in 2021.

So a student applying to Hamburg in 2026 **cannot sit either test**. Neither 550 nor 567 is right;
neither is wrong; the question of which page has the better number has no answer because the
instrument they both name no longer exists.

This is worth stating plainly because no amount of comparing the two figures would ever have
produced it. "Which page is right?" is unanswerable here, and the useful finding — that both pages
list a test nobody can take — is only visible once you stop asking it. **Unmeasurable is a real
answer.** It maps to the schema's `possibly_discontinued_instrument`, and it should block automated
evaluation rather than resolving to either number.

The practical consequence for a student is that this row cannot gate anything, and the practical
consequence for Hamburg is that both of its pages need editing.

## Axis 2 — the iBT figures: resolved, on the instrument owner's own boundary

Hamburg's stated requirement, on both pages, is **English at CEFR level B2**. The TOEFL number is
not the requirement; it is Hamburg's attempt to express the requirement in TOEFL terms. So the
question is not "which page is more current" but **"which number actually delivers B2?"** — and
that is a question ETS owns.

ETS's published CEFR mapping for TOEFL iBT puts **B2 at 72–94** on the 0–120 scale. **72 is exactly
the B2 floor.** ETS revised this mapping downward from a previous B2 minimum of 87.

So:

- The department page's **72** is precisely the ETS B2 boundary. It implements Hamburg's own stated
  rule exactly.
- The central page's **70** sits *below* B2 and corresponds to no ETS CEFR boundary, current or
  historical. It does not implement the rule the same page states.

That is corroboration from the authority that defines the scale, and it is a materially different
kind of evidence from preferring a fresher page.

**On the recency signal, which I am deliberately not using.** The central page's footer reads *last
updated 22 April 2019*; the department page's reads *17 March 2026*. That points the same way as
the conclusion above. It is recorded here as context and it is **not** the reason — because a rule
that resolves on page dates would have got Heidelberg ([11](11-heidelberg-uniassist-medicine.md))
exactly wrong, in this same corpus, on this same pass. The conclusion rests on the B2 boundary; the
dates merely fail to contradict it.

An honest residual: 72 matching the B2 floor is strong evidence that the department page was
derived from the current ETS mapping, but Hamburg has not *stated* that derivation anywhere. A
university may set a threshold slightly below a CEFR floor deliberately. The finding is that 72 is
the number consistent with Hamburg's own stated rule — not that Hamburg has confirmed it.

## A further wrinkle: the department page also carries the wider test list

The department page lists **Oxford Test of English 111**, **Pearson PTE Academic 59**, **telc English
B2** and a Cambridge figure, none of which appear on the central page at all. The central page
offers only Cambridge First, IELTS, TOEFL and UNIcert II.

This is not a conflict — a longer list is not a contradiction of a shorter one — but it matters for
the student: an applicant holding a PTE Academic 59 is admissible per the department page and finds
no route on the central page. The two pages should be treated as one union of accepted evidence,
with the caveat that the central page appears simply not to have been extended.

## Corpus action

- `HAM0012` (department page, iBT 72 / PBT 567):
  - iBT portion → `VERIFIED_CURRENT`, `test_scale: TOEFL_IBT_0_120_LEGACY`,
    `scale_ambiguity: resolved_unambiguous`, with the ETS B2 boundary recorded as the evidence.
  - PBT portion → `scale_ambiguity: possibly_discontinued_instrument`; must not gate evaluation.
  - `retrieved_at` → `2026-08-22`.
- `HAM0013` (central page, iBT 70 / PBT 550):
  - Psychology iBT portion → superseded by `HAM0012`; do not evaluate against 70.
  - PBT portion → `possibly_discontinued_instrument`.
  - **The Human Movement Sciences portion is untouched by this resolution** — it was never
    contested, no department-level page was checked against it, and it should not inherit the
    Psychology outcome. It stays unconfirmed-but-uncontested, and its own PBT figure is equally
    unmeasurable.
  - `retrieved_at` → `2026-08-22`.

## Proposed `requirement_source_conflicts` row

```yaml
university: Universität Hamburg
subject: "English proficiency threshold for Psychology"
status: resolved
resolution_note: >-
  One recorded conflict, two axes, two different outcomes. PAPER-BASED (567 vs 550): not a
  disagreement to resolve. ETS discontinued the paper-based TOEFL (original PBT 2017, revised
  paper-delivered 2021), so a 2026 applicant cannot sit either test. Both figures name a
  non-existent instrument; the honest state is possibly_discontinued_instrument and neither number
  may gate evaluation. IBT (72 vs 70): resolved on the instrument owner's boundary. Hamburg's own
  stated rule on both pages is CEFR B2, and ETS's published mapping puts B2 at 72-94 on the 0-120
  scale, revised down from a previous floor of 87. The department page's 72 is exactly that floor
  and implements Hamburg's stated rule; the central page's 70 sits below B2 and matches no ETS
  boundary. NOT resolved on page dates - central page reads 22 April 2019 and department page
  17 March 2026, which agree with this conclusion and were deliberately not used as its basis.
  Separately: the department page lists Oxford 111, PTE 59 and telc B2, which the central page
  omits entirely; treat as a union of accepted evidence, not a contradiction. The central page's
  Human Movement Sciences figures were never contested and do not inherit this outcome.
resolved_at: 2026-08-22
```
