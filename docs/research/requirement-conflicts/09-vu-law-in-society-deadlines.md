# 09 — VU Amsterdam: Law in Society, 1 April against 1 May against rolling admission

**Records:** `DL-2026-08-21-VUA0020` (`de_nl_deadlines_vuamsterdam_2026-08-21.jsonl`, line 20);
related rows `VUA0007`, `VUA0019`, `VUA0006`, `REQ-2026-08-21-VUA0031`
**University:** Vrije Universiteit Amsterdam (Netherlands)
**Status:** **Resolved — not a conflict. The source has since been clarified**
**Re-checked:** 2026-08-22

## What was recorded

The Law in Society admissions page, as captured 2026-08-21:

> "To ensure that your application is processed in time to study and register for the exams, we ask
> applicants to apply for the Bachelor's programme before: 15 December if you are applying via the
> 21+ Entrance exam route; 1 April for all other students."

Set against two other VU figures for the same programme: a general **1 May** bachelor's deadline
(`VUA0007`) and a ten-round rolling-admission table running through **1 June 2026** (`VUA0019`).

The original researcher could not tell whether the 1 April guidance superseded the 1 May deadline
or was a sub-case within it, and recorded all three rather than picking. Their recommendation — that
a career-advising product should surface all three and let VU's own adviser resolve the student's
case — was a reasonable stance given what the page then said.

## What I did

Re-fetched the page on 2026-08-22. **The page has been clarified since the original capture**, and
the clarification resolves the ambiguity directly.

## The evidence

The page now states the bachelor's application deadlines as an explicit split by applicant
nationality:

> - **"1 April for non-EU/EEA students"**
> - **"1 May for Dutch and EU students"**
> - **"15 December if you are not directly eligible for admission and are applying via the 21+
>   Entrance exam route"**

The old wording — "1 April for all other students", contrasting only against the 21+ route — did
not carry the EU/non-EU axis at all. That is why 1 April read as though it might be competing with
1 May for the same population. It never was.

## Resolution

**There is no conflict.** Three deadlines, three different applicant populations, all
simultaneously true:

| Applicant | Deadline |
|---|---|
| Non-EU/EEA students | **1 April** |
| Dutch and EU students | **1 May** |
| 21+ Entrance exam route (not directly eligible) | **15 December** |

The earlier non-EU deadline is the ordinary Dutch pattern — non-EU applicants need lead time for
visa and residence-permit processing, so their deadline sits ahead of the EU one. That is why the
gap exists, and it is not a sign that one figure supersedes the other.

**The rolling-admission table is a fourth, orthogonal thing.** The ten monthly Admission Board
rounds running through 1 June 2026 determine *when a decision is issued*, not *when an application
is due*. A student is not "allowed until 1 June"; they are told which board meeting will consider a
file completed by a given date. Recording it alongside the deadlines as if it were a competing
deadline is a category error, and it should be stored as a decision-timing schedule.

**The entrance-exam guidance is a fifth thing, and it is genuinely advisory.** The original capture's
framing — apply early enough to register for and sit the supplementary mathematics/history exams
(`REQ-2026-08-21-VUA0031`) — is real, but it is a recommendation about leaving enough time, not a
binding cut-off. It should not be stored as a deadline at all.

So what looked like one ambiguous fact with three candidate values is five distinct facts of three
different kinds: three deadlines, one decision-timing schedule, one piece of advice.

## Corpus action

- `VUA0020`: `verification_state` → `VERIFIED_CURRENT`; `deadline_date` → `2026-04-01`;
  `applies_to` → `international` (non-EU/EEA specifically); `retrieved_at` → `2026-08-22`; replace
  `deadline_text_verbatim` with the current, clarified wording and note that the source was
  reworded between 2026-08-21 and 2026-08-22.
- `VUA0007` (1 May): re-scope to `applies_to: domestic_and_eu` — "Dutch and EU students" — and set
  `VERIFIED_CURRENT`.
- `VUA0019` (rolling rounds): re-type. This is a decision-timing schedule, not an application
  deadline, and should not sit in the deadline comparison set.
- `VUA0006` (15 December, 21+ route): confirm it applies to applicants not directly eligible for
  admission.
- Retain the `vu.nl` `source_authority_note` on all rows.

## Proposed `requirement_source_conflicts` row

```yaml
university: Vrije Universiteit Amsterdam
subject: "Law in Society bachelor's application deadline"
status: resolved
resolution_note: >-
  Not a conflict — the three dates apply to three different applicant populations, and the source
  has since been clarified. As captured on 2026-08-21 the page read "1 April for all other
  students", contrasting only against the 21+ entrance-exam route, which made 1 April look as
  though it might compete with the general 1 May deadline. Re-fetched 2026-08-22, the page now
  states the split explicitly: 1 April for non-EU/EEA students, 1 May for Dutch and EU students,
  15 December for the 21+ entrance-exam route. The earlier non-EU date reflects visa and residence-
  permit lead time. Separately, the ten monthly Admission Board rounds running to 1 June 2026 are a
  decision-timing schedule, not a deadline, and the entrance-exam timing guidance is advisory, not
  a cut-off — neither belongs in the deadline comparison set.
resolved_at: 2026-08-22
```
