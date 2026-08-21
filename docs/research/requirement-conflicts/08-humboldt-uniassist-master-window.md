# 08 — Humboldt: two official pages, two uni-assist master's windows — UNRESOLVED

**Records:** `DL-2026-08-21-HUM0018`, `HUM0020`, `HUM0030`, `HUM0031`
(`de_nl_deadlines_humboldt_2026-08-21.jsonl`, lines 18, 20, 30, 31)
**University:** Humboldt-Universität zu Berlin (Germany)
**Status:** **UNRESOLVED — and it should stay that way today**
**Re-check attempted:** 2026-08-22

## What was recorded

Two official `hu-berlin.de` pages giving different Winter-semester application windows for the same
uni-assist pre-check track (applicants whose entrance qualification was obtained outside Germany):

| Source | With NC (`Zulassungsbeschränkung`) | Without NC (`zulassungsfrei`) |
|---|---|---|
| `fristen-termine` (dated, Wintersemester 2026/27) | **18.05. – 14.06.2026** | **18.05. – 28.06.2026** |
| `further-study-programmes` (English, undated) | **02.05. – 31.05.** | **02.05. – 15.06.** |

Roughly two weeks apart at both ends, in both categories. Both official, both on the institution's
own domain, both fetched 2026-08-21.

## What I attempted

**1. Re-fetch both pages.** Both now return an **Anubis proof-of-work challenge** — anti-scraping
protection that HU Berlin has deployed since the original capture. The page bodies are not served.

**2. I did not attempt to bypass it.** Anubis exists specifically to stop automated AI scraping.
Working around a bot-detection mechanism is not something this lane will do: the site operator has
expressed a preference through a technical control, and defeating it to extract data would be
wrong regardless of how much it would help this document. This is recorded as a deliberate choice,
not a technical failure.

**3. Route to the process operator instead.** uni-assist e.V. runs the pre-check and publishes
deadlines, so it was a plausible owner-of-the-fact. This did **not** work: uni-assist publishes
general guidance ("usually 15 July for winter semester, but many universities set earlier deadlines,
especially for master's programmes") and directs applicants back to each university's own
programme pages for exact dates. It does not carry HU's per-category windows, so it cannot
adjudicate between them.

## Why it stays unresolved

No new evidence was obtained. The only sources that state these windows are the two HU pages that
disagree, and both are currently unreadable by this lane.

What is *not* sufficient to resolve it:

- **Recency.** The dated page names Wintersemester 2026/27 and the English page is undated. It is
  tempting to prefer the dated one — but "dated" is not the same as "current", and an undated page
  may be the actively-maintained one. This is precisely the heuristic the lane's rules forbid, and
  the Heidelberg case ([11](11-heidelberg-uniassist-medicine.md)) is a live demonstration of it
  failing.
- **Plausibility.** German universities commonly set uni-assist deadlines earlier than direct-
  application deadlines to allow processing time, which might seem to favour the earlier
  (02.05.–31.05.) window. That is an argument from what is typical, not evidence about HU.

Note also that both windows are now in the past — WiSe 2026/27 applications closed in June 2026 —
so the operative question for a student today concerns **WiSe 2027/28**, for which neither page's
figures have been confirmed at all.

## What both readings say, kept intact

Neither of these is to be presented as settled fact.

**Reading A** (`fristen-termine`, dated Wintersemester 2026/27): the uni-assist master's window ran
18 May – 14 June 2026 for NC programmes and 18 May – 28 June 2026 for non-NC programmes. The end
date is the `Ausschlussfrist` (cut-off).

**Reading B** (`further-study-programmes`, English, undated, recurring): the window runs 2 May –
31 May for NC programmes and 2 May – 15 June for non-NC programmes, as a cut-off deadline.

A further complication that survives either reading: the English page splits only by NC/non-NC and
does not distinguish Master of Education from Master of Arts/Science, so its figures apply to
"Master's" generically while the dated page's do not.

## What would actually resolve this

In rough order of authority:

1. **HU's binding statute.** German admission deadlines are fixed in legally binding regulations
   (`Zulassungssatzung` / `Amtliche Mitteilungen`), published as PDFs. That document owns the fact
   outright and would settle it in one read — the strongest available route.
2. **A single HU page stating both categories together** for a named semester, making the
   comparison internal rather than cross-page.
3. **Direct confirmation from HU's `Studierendenservice`**, which is what a student would do.

A human researcher can reach the two pages in an ordinary browser without defeating anything —
Anubis blocks automated fetching, not people. This is a good candidate for manual follow-up.

## Corpus action

Leave all four records at `verification_state: CONFLICTING_EVIDENCE`. Add to each:

- `retrieved_at` unchanged at `2026-08-21` — nothing was re-verified, and bumping the date would
  falsely imply it was.
- A note that re-verification was attempted on 2026-08-22 and blocked by anti-scraping protection,
  which was deliberately not circumvented.
- A note that both windows now describe a closed cycle (WiSe 2026/27) and that WiSe 2027/28 figures
  are unconfirmed from either page.

**Freshness implication worth surfacing separately:** these four records are now effectively
un-refreshable by automated means. Any freshness architecture that assumes a source stays
machine-readable needs a state for "source still exists but is no longer automatically retrievable"
— distinct from `unavailable` (gone) and from `stale` (readable but old). Without it, these rows
will silently age while the refresh job records failures.

## Proposed `requirement_source_conflicts` row

```yaml
university: Humboldt-Universität zu Berlin
subject: "Master's application window for international (uni-assist) applicants"
status: unresolved
resolution_note: >-
  UNRESOLVED — both readings stand, neither is settled fact. Two official hu-berlin.de pages give
  different Winter-semester uni-assist master's windows: the dated fristen-termine page (WiSe
  2026/27) says 18.05.-14.06.2026 for NC and 18.05.-28.06.2026 for non-NC; the undated English
  further-study-programmes page says 02.05.-31.05. for NC and 02.05.-15.06. for non-NC. Re-fetch on
  2026-08-22 was blocked: HU Berlin now serves an Anubis anti-scraping challenge on both URLs, and
  this lane deliberately did not circumvent it. uni-assist e.V. was checked as the process operator
  but publishes only general guidance and refers applicants back to each university's own pages, so
  it cannot adjudicate. No new evidence was obtained, so the conflict stands. Resolving it by
  preferring the dated page over the undated one would be the recency heuristic the evidence
  standard forbids. Both windows now describe a closed cycle; WiSe 2027/28 figures are unconfirmed
  from either page. Resolution route: HU's binding Zulassungssatzung, or manual browser check —
  the pages remain reachable by a person.
resolved_at: null
```
