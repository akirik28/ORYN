# 03 — Harvard: five pages say tests required, one live page says optional

**Records:** `REQ-2026-08-21-HAR0001`, `REQ-2026-08-21-HAR0002`
(`us_requirements_harvard_2026-08-21.jsonl`, lines 1–2)
**University:** Harvard University (United States)
**Status:** **Resolved — not a factual conflict, but a confirmed live-page hazard**
**Re-checked:** 2026-08-22

## What was recorded

`HAR0001` — five current Harvard pages (testing FAQ, Application Requirements, First-Year
Applicants, International Applicants, QuestBridge), all consistent, all present-tense, none
carrying a cycle qualifier:

> "Harvard requires the SAT or ACT to meet its standardized testing requirement."

`HAR0002` — a live page on the same official domain, dated 29 January 2021, stating the opposite:

> "Due to the continuing COVID-19 pandemic, Harvard College is extending our standardized testing
> policy through the 2021-2022 application cycle. We will allow students to apply for admission
> without requiring ACT or SAT test results."

The original researcher recorded these as `CONFLICTING_EVIDENCE` under instruction, while noting
their own read was that the 2021 page was self-evidently about a closed cycle.

## What I did

Re-fetched both pages on 2026-08-22, and separately established whether the supersession is
documented by a *dated* action rather than merely implied by the newer pages existing.

## The evidence

**The current requirement, re-confirmed 2026-08-22.** Harvard's testing FAQ still states "Harvard
requires the SAT or ACT", with no end date. It carries narrow accessibility exceptions — where the
SAT/ACT is genuinely inaccessible, AP, IB, GCSE/A-Level or national leaving exam results may
substitute — but students able to sit an SAT or ACT "are still expected to" do so.

**The supersession is dated and specific.** Harvard announced on **11 April 2024** that it was
reinstating the standardized testing requirement beginning with the **Class of 2029** (Fall 2025
entry), reversing a prior commitment to remain test-optional through the Class of 2030. This is a
specific, dated institutional action, not an inference from page freshness.

**The old page's own text scopes it to a closed cycle.** Its first sentence limits the policy to
"the 2021-2022 application cycle" — a cycle that closed in 2022.

## Resolution

**These two statements never contradicted each other.** They describe different, non-overlapping
application cycles, and the older one says which cycle it means in its own opening sentence. A
statement about 2021-2022 and a statement about now cannot be in conflict; they can only both be
true. The relationship is supersession, not disagreement.

`HAR0002` is therefore `VERIFIED_HISTORICAL` for `cycle_year` 2022 — which is what its
`cycle_year` field already said. `HAR0001` is `VERIFIED_CURRENT`.

## The hazard, which is real and is confirmed live

The reason this was right to flag is not the factual content. It is that **the 2021 page is still
live on the primary official domain with no superseding banner and no pointer to current policy** —
re-verified 2026-08-22. It passes every authority check a naive ingestion applies: official
domain, official primary source type, real page, real Harvard text.

What makes it worse is that Harvard's practice of adding such notices demonstrably exists. A
sibling page — the March 2020 `admission-application-considerations-class-2025` announcement —
does carry a self-correcting notice pointing at current requirements. So the absence on this page
is an inconsistency in Harvard's own housekeeping, not a house style.

**Implication for ingestion.** A rule of "prefer the official page" would ingest this and tell a
student that Harvard is test-optional. That would be a serious, actionable error: a student who
believed it would not sit the SAT. Two protections are worth having, and neither is a recency
heuristic:

1. A page whose own text names a specific past cycle must never be treated as evergreen, whatever
   its domain authority. The cycle scope is *in the text* and is machine-detectable.
2. A requirement contradicting five concurrent pages on the same domain should never win on the
   strength of being an official page.

## Corpus action

- `HAR0001`: `verification_state` → `VERIFIED_CURRENT`; `retrieved_at` → `2026-08-22`; record the
  11 April 2024 reinstatement as the dated supersession evidence.
- `HAR0002`: `verification_state` → `VERIFIED_HISTORICAL` (keeping `cycle_year: 2022`);
  `retrieved_at` → `2026-08-22`; keep the full verbatim text and keep the "still live, no banner"
  note — that is the finding, and it must not be tidied away by reclassifying the row.
- Set `supersedes`/superseded-by linkage so `HAR0001` is recorded as governing over `HAR0002`.

## Proposed `requirement_source_conflicts` row

```yaml
university: Harvard University
subject: "Standardized testing requirement (SAT/ACT)"
status: superseded
resolution_note: >-
  Not a factual conflict. The 2021 page's own first sentence scopes it to "the 2021-2022
  application cycle", which closed in 2022, so it never claimed to govern the present and cannot
  contradict a statement about now. Supersession is dated and specific: Harvard announced on
  11 April 2024 that standardized testing is required beginning with the Class of 2029 (Fall 2025
  entry). Five concurrent Harvard pages state the requirement in the present tense with no end
  date, re-confirmed 2026-08-22. The genuine hazard, also re-confirmed live on 2026-08-22, is that
  the 2021 test-optional page remains published on the primary official domain with NO superseding
  banner, while a sibling 2020 announcement does carry one. Any ingestion preferring "official
  domain" without checking for a cycle scope stated in the page's own text would ingest it and
  tell students Harvard is test-optional.
resolved_at: 2026-08-22
```
