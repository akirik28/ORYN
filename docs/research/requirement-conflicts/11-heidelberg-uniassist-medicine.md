# 11 — Heidelberg: is uni-assist required for Medicine/Dentistry? — UNRESOLVED

**Records:** `REQ-2026-08-21-HEI0009`, `REQ-2026-08-21-HEI0010`
(`de_nl_requirements_heidelberg_2026-08-21.jsonl`, lines 9–10); related rows `HEI0011`–`HEI0013`
**University:** Universität Heidelberg (Germany)
**Status:** **UNRESOLVED — and the re-check made the case for leaving it open stronger**
**Re-checked:** 2026-08-22

## What was recorded

Two official Heidelberg sources describing the application procedure for non-EU applicants with a
foreign entrance qualification to Medicine, Pharmacy and Dentistry (Staatsexamen):

- `HEI0009`, a PDF on `uni-heidelberg.de` explicitly dated *Wintersemester 2018/19*: a **mandatory
  two-step procedure**. Applicants must obtain a `Vorprüfungsdokumentation` from uni-assist e.V. in
  Berlin, and "without the Vorprüfungsdokumentation, the application for a place at Heidelberg
  University cannot be considered."
- `HEI0010`, a live faculty page carrying no date: "Non-EU foreigners apply directly to Heidelberg
  University via the online portal for prospective international students." **No mention of
  uni-assist at all.**

The original researcher noted correctly that absence of mention is not proof of absence — the page
may simply not restate every step — and recorded a genuine conflict rather than a resolution in
either direction.

## What I did, and what went wrong

**1. Re-fetched the faculty page (2026-08-22).** Unchanged: direct application, no uni-assist,
no `Vorprüfungsdokumentation`, no date beyond a "© 2026 Medical Faculty of Heidelberg" footer.

**2. Searched for current guidance.** Search results asserted confidently that for 2026,
Medicine/Dentistry/Pharmacy non-EU applicants still use the two-step uni-assist procedure with a
1 July deadline for the winter semester. **This looked like a resolution in favour of the older
document.**

**3. Checked the source behind that claim — and it collapsed.** The page the search was
summarising is another Heidelberg PDF (`.../int_bewerbung/verfahren/uniassist_engl.pdf`). Extracted
in full, its own title page reads:

> "at Heidelberg University for the **winter semester 2011/12**"

with deadlines "until **July 1st, 2011**" for the uni-assist step and "July 15th, **2011**" for the
university application.

So the "current 2026 guidance" was a **fifteen-year-old document**, still live on the official
domain, being paraphrased by a search engine in the present tense. Its content is genuinely
consistent with `HEI0009` — both describe the same two-step procedure — but it is not independent
corroboration of anything current. It is a second stale artefact of the same era.

**4. Attempted Heidelberg's central international-applicant pages.** Two candidate URLs returned
HTTP 404.

## Why it stays unresolved

**No current dated source states the procedure.** The evidence available is: two stale PDFs (2011/12
and 2018/19) saying uni-assist is mandatory, and one undated live page saying apply directly. There
is no document from the current admission cycle to adjudicate between them.

The near-miss in step 2–3 is the most useful thing this re-check produced. Had the search summary
been accepted at face value, this conflict would have been "resolved" in favour of `HEI0009` on the
strength of a 2011 document being mistaken for current guidance — a wrong resolution published as
truth, arrived at through an entirely plausible-looking research path. **A search engine's
present-tense paraphrase of an undated PDF is not evidence of currency.** Search discovers; fetch
verifies; and verification means reading the document's own date, not the summary's tense.

**And note which way the recency heuristic would have pointed.** It would have preferred `HEI0010` —
the live, undated, modern-looking faculty page — over a dated PDF. Yet the substantive evidence,
such as it is, leans the *other* way: two independent Heidelberg documents describe the uni-assist
step, and the faculty page's silence is a single page's omission on a page that is not primarily
about procedure. This is the Groningen-direction counterexample the lane's rule exists for, sitting
in the same corpus as the Erasmus case that points the opposite way.

That said, leaning is not resolving. Neither reading is confirmed.

## What both readings say, kept intact

Neither is to be presented as settled fact.

**Reading A** (`HEI0009`, 2018/19 PDF, and the 2011/12 PDF): non-EU applicants with a foreign
entrance qualification must complete a two-step procedure — apply to uni-assist e.V. for a
`Vorprüfungsdokumentation`, *and* apply to Heidelberg. Without the Vorprüfungsdokumentation the
application cannot be considered. Associated requirements recorded in the same document: TestAS
(`HEI0011`), APS certificate for applicants from Mongolia, Vietnam and PR China (`HEI0012`), and a
motivation letter (`HEI0013`) — all of which inherit this conflict's uncertainty.

**Reading B** (`HEI0010`, live faculty page): non-EU applicants apply directly to Heidelberg
University through the online portal for prospective international students.

The stakes are asymmetric and worth flagging: if Reading A is right and a student follows Reading
B, **their application is not considered at all**. Missing a required uni-assist step is not a
degraded outcome, it is a rejected one. Until this is settled, the product must not tell a student
that direct application is sufficient.

## What would resolve it

1. **Heidelberg's current `Zulassungssatzung`** for Staatsexamen programmes — the binding statute,
   which owns the fact.
2. **uni-assist's own member-university listing** for Heidelberg, showing which programmes are
   handled through it. (`uni-assist.de/en/universities/detail/universitaet-heidelberg/` returned
   404 on 2026-08-22; the correct current path was not located.)
3. **Heidelberg's International Students Office**, directly.

A useful side-finding for whoever picks this up: Heidelberg has **at least two long-obsolete
procedural PDFs still published on its live domain with no superseding notice** — from 2011/12 and
2018/19. Any ingestion treating a `uni-heidelberg.de` PDF as authoritative because of its domain
will pick up fifteen-year-old admission procedures. These documents should be added to a
known-stale exclusion list.

## Corpus action

Leave `HEI0009` and `HEI0010` at `verification_state: CONFLICTING_EVIDENCE`. Add to both:

- A note that re-verification was attempted 2026-08-22; the faculty page is unchanged; no current
  dated source was found.
- The newly discovered 2011/12 PDF, recorded as a **third stale source**, with an explicit warning
  that search engines paraphrase it as current guidance.
- `retrieved_at` for `HEI0010` → `2026-08-22` (it *was* re-fetched and is unchanged);
  `HEI0009` unchanged.
- Propagate the unresolved state to `HEI0011`–`HEI0013`, which derive from the same 2018 document.

## Proposed `requirement_source_conflicts` row

```yaml
university: Universität Heidelberg
subject: "Application procedure for non-EU applicants to Medicine, Pharmacy and Dentistry"
status: unresolved
resolution_note: >-
  UNRESOLVED — both readings stand, neither is settled fact. Reading A (Heidelberg PDFs dated
  Wintersemester 2018/19 and Wintersemester 2011/12): a mandatory two-step procedure, requiring a
  Vorprüfungsdokumentation from uni-assist e.V. without which the application "cannot be
  considered". Reading B (live, undated Medical Faculty page, re-fetched unchanged 2026-08-22):
  non-EU foreigners apply directly via Heidelberg's online portal, with no mention of uni-assist.
  No current dated source was found to adjudicate; two candidate central URLs returned 404.
  IMPORTANT near-miss: search results asserted the uni-assist step is current 2026 guidance, but
  the document behind that claim is Heidelberg's own PDF for winter semester 2011/12 with July 2011
  deadlines — a fifteen-year-old file still live on the official domain, paraphrased in the present
  tense. Accepting it would have produced a wrong resolution via a plausible research path. Note
  also that a recency heuristic would prefer the modern-looking faculty page, while such
  substantive evidence as exists leans the other way — the Groningen-direction counterexample.
  Stakes are asymmetric: if uni-assist is required and a student applies directly, the application
  is not considered at all, so the product must not present direct application as sufficient.
  Resolution route: Heidelberg's binding Zulassungssatzung, uni-assist's member listing, or the
  International Students Office. Side-finding: at least two obsolete procedural PDFs remain live on
  uni-heidelberg.de with no superseding notice and should be excluded from ingestion.
resolved_at: null
```
