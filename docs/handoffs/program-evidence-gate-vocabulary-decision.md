# `looksPageConfirmed()` and the 489 Amsterdam records — recommendation

**Date:** 2026-08-21
**Scope:** `lib/programs/ingest.ts` → `looksPageConfirmed()`; the UvA and VU Amsterdam
records in `data/research/university-programs/`.
**Status:** recommendation only. **No code was changed for this item.**

## Recommendation in one line

**Do not widen the vocabulary gate.** It is not the right instrument, and the specific
widening that was proposed would not even fix the stated problem while it would admit at
least one record that says outright that its source could not be retrieved. The 489 records
describe a genuine evidence class the research contract cannot currently express; the fix is
to give the contract a structured field for it, then have UvA/VU re-emit — which is a
re-serialisation of data they already hold, not a re-research.

## The numbers, re-measured today

Every figure below was recounted against the corpus as it stands on 2026-08-21, not carried
over from the brief.

| Claim in the brief | Measured |
| --- | --- |
| "493 UvA and VU Amsterdam records ... are blocked" | **493** is the total UvA+VU record count. **489** are blocked. 4 pass. |
| the records "say 'confirmed' and 'cross-validated'" | True of **326** of them (UvA only). The **163 VU records contain neither word.** |
| the gate "requires the literal substring `verified`" | Confirmed. **0 of the 489** contain it. |

Corpus-wide, 524 records are blocked by this gate. The 489 Amsterdam records are 93% of that.

The 489 break down as:

- 326 from `de_nl_batch8_uva_2026-08-21.jsonl` (University of Amsterdam)
- 163 from `de_nl_batch10_vuamsterdam_2026-08-21.jsonl` (Vrije Universiteit Amsterdam)

## Finding 1 — the proposed widening does not fix the stated problem

The brief describes the blocked records as saying "confirmed" and "cross-validated". Adding
those two tokens to the vocabulary would admit the 326 UvA records and **none of the 163 VU
records**, which contain neither. Roughly a third of the affected corpus would stay blocked
and the gate would look fixed.

Token coverage across the 489:

| token | records containing it |
| --- | --- |
| `verified` | 0 |
| `confirmed` | 326 |
| `cross-validated` | 326 |
| `cross-checked` | 175 |
| `retrieved` | 489 |
| `api` / `endpoint` | 489 |

## Finding 2 — the words are attached to the wrong claims

This is the decisive argument against lexical widening. In these records the accepting words
do not modify the programme fact at all.

**UvA (326 records).** The word `confirmed` appears exactly once, here:

> "network-request inspection in-browser **confirmed** these overview pages are
> client-rendered from this exact JSON feed"

That is a claim about the *page's rendering architecture*. It is not a statement that the
programme fact was confirmed. The record's real evidential strength lives in a different
sentence entirely ("Retrieved via UvA's own official REST JSON API endpoint …"). A
substring gate keying on `confirmed` would be accepting these records for a reason that has
nothing to do with why they are actually trustworthy.

**Erasmus University Rotterdam (1 record, currently blocked).** Its status begins:

> "**No structured factsheet could be retrieved** from either this programme's own page … or
> a Dutch-language mirror."

and ends:

> "Checked against ORYN's 4 pre-existing Erasmus University Rotterdam records and
> **confirmed** distinct."

Here `confirmed` modifies *de-duplication*. Adding `confirmed` to the vocabulary would admit
a record whose own first sentence says the source could not be retrieved. That is precisely
the erosion the brief warns about, and it is not hypothetical — it is one grep away.

## Finding 3 — the gate rewards phrasing, not evidence

4 UvA records pass today. All four are from the older `drive_batch1_2026-08-17.jsonl` and
their entire verification_status is:

> "Verified - official Bachelor/first-cycle page"

Nine words, no method, no date, no URL, no cross-check. Meanwhile the 489 blocked records
document their method in forensic detail — the exact endpoint, the OData filter syntax, the
`@odata.count` reconciliation, which individual pages were re-fetched to cross-validate, and
which two earlier research passes failed and why.

The gate admits the record that says least and refuses the records that say most. That is a
strong argument that the instrument is wrong — but it is equally an argument against
widening its word list, because a wider list is still a list of phrases to conform to. It
would just move the conformity target.

## Finding 4 — what actually distinguishes the 489 is structural

Unlike the prose, the structured fields are unanimous and checkable:

| field | value across all 489 |
| --- | --- |
| `source_type` | `official_primary` (489/489) |
| `source_url` host | `www.uva.nl` (326), `vu.nl` (163) — 100% institution-owned |
| `official_program_url` host | `www.uva.nl` (326), `vu.nl` (163) — 100% institution-owned |
| distinct `source_url` values | **4** — one per (institution × degree level) |

The four:

```
https://www.uva.nl/en/education/master-s/master-s-programmes/masters-programmes.html   266
https://vu.nl/en/education/master/programmes                                           134
https://www.uva.nl/en/education/bachelor-s/bachelor-s-programmes/bachelor-s-programmes.html  60
https://vu.nl/en/education/bachelor/programmes                                          29
```

These already clear `sourceAuthority("programs", …)` — the domain gate is satisfied. What
the records describe is a **bulk retrieval from the institution's own machine-readable
endpoint**, which on the merits is *stronger* than a page fetch, not weaker:

- the fields come from the CMS as typed values, not scraped from rendered DOM text;
- the result set is complete and self-reconciling (VU's feed reports `@odata.count=134` and
  returned exactly 134; UvA's returned 64 bachelor's + 276 master's);
- UvA additionally re-fetched 12+ individual programme pages spanning every URL family and
  reports the feed's language / duration / degree-title matched the pages exactly.

The problem is not that the evidence is weak. The problem is that **the contract has no way
to say this**, so the researcher said it in prose, and prose is what the gate cannot read.

`docs/research-handoff-university-programs.md` states this outright: "`verification_status`
is free text describing what the researcher actually did, **not a fixed enum** — the
ingestion pipeline pattern-matches it." A pattern-matcher over unbounded free text is a
proxy, and this is the proxy failing in the direction it was always going to fail.

## Recommendation

**1. Leave `looksPageConfirmed()` exactly as it is.** It is correctly refusing to certify
prose it cannot parse. Every proposed token — `confirmed`, `cross-checked`, `retrieved
directly`, `fetched` — was measured against the blocked set and each one admits records it
should not (Finding 2), or fails to admit the ones it should (Finding 1), or both.

**2. Add a structured `verification_method` enum to the research handoff contract.**
Proposed values:

| value | meaning |
| --- | --- |
| `official_page_fetch` | the programme's own page was fetched and read |
| `official_api_retrieval` | retrieved from the institution's own machine-readable endpoint |
| `official_index_listing` | fetched from an official index/catalogue carrying per-programme structured fields, but not the programme's own page |
| `search_result_only` | identity found via search; page content never read |
| `retrieval_blocked` | fetch attempted and failed |

The gate then reads an enum instead of sniffing prose, and `verification_status` reverts to
what it should always have been: a human-readable note that no machine depends on. Accept
`official_page_fetch` and `official_api_retrieval`; queue the rest with a truthful outcome.
This is a strictly *narrower* gate than today's substring test, not a wider one — today any
string containing "verified" passes, including strings nobody has seen yet.

**3. Have UvA/VU re-emit the two batches with the new field.** This is a re-serialisation of
records the researcher already holds, with `verification_method: official_api_retrieval` and
the actual endpoint URL (`https://www.uva.nl/_restapi/list-json`, `POST https://vu.nl/api/search`)
promoted out of the prose into `source_url` or a new `retrieval_endpoint` field. It is not a
re-research and should be cheap. **Do not hand-edit the existing JSONL** — the corpus is the
audit trail.

**4. Do not admit TU Delft "Health and Technology" under any variant of this change.** Its
own status reads "Provisional / **NOT YET a live programme** … accreditation pending …
planned to launch in 2027 — it is not yet enrolling students". It is correctly blocked today,
for a reason unrelated to vocabulary, and a `cross-checked` token would have swept it in.
Worth a separate look at whether the contract should carry a `programme_status` field at all.

**5. Interim option, if the 489 are needed before the contract change lands.** The only
defensible short cut is an explicit, auditable allowlist of the four exact `source_url`
values above, scoped to those two batch files, recorded in `program_research_queue` under its
own outcome label so the exception is visible forever. An exact URL is an identifier; a word
in a sentence is not. This is deliberately ugly, because it should not outlive the contract
change.

## What was not done

No code changed. No database writes. `looksPageConfirmed()` is untouched, and the 489 records
remain blocked pending a decision on the above.

## Related, found in passing

- The universities spine contains a genuine duplicate pair, **"University of Warwick"** and
  **"The University of Warwick"** (United Kingdom). It makes 4 corpus records permanently
  `unresolved_university` with "ambiguous exact x2", and it is the only remaining unresolved
  case corpus-wide after the `nameKey` fix in this same branch. Needs a human merge decision;
  not fixable in code.
