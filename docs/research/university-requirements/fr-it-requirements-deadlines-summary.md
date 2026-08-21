# France & Italy admission requirements and deadlines

Research lane: `oryn/fr-it-requirements-research` (isolated worktree at
`.claude/worktrees/fr-it-requirements`, branched from `origin/main`)
Researched: 2026-08-21
Data files: `data/research/university-requirements/fr_it_requirements_*.jsonl`,
`data/research/university-requirements/fr_it_deadlines_*.jsonl`

Research output only. No application code, no migrations, no schema changes, no Supabase writes.

---

## Why this lane exists

Assigned by the coordination session as the sibling task to the DE-NL-REQUIREMENTS lane
(`docs/research/university-requirements/de-nl-requirements-deadlines-summary.md`), covering the
11 French and Italian institutions already researched for programme catalogues
(`data/research/university-programs/fr_it_es_ch_batch1-6_2026-08-21.jsonl`) but with zero
requirements/deadlines coverage. France and Italy were specifically called out because both run
admission systems that don't reduce to a simple scalar threshold — see
`scalar-thresholds-are-not-enough.md` in this directory, and the note below on how that played out
in practice.

---

## Verified counts

**61 records across 11 universities**: 39 requirements + 22 deadlines.

| University | Country | Requirements | Deadlines | Historical (`VERIFIED_HISTORICAL`) |
|---|---|---:|---:|---:|
| Sciences Po | France | 6 | 6 | 5 |
| Sorbonne Université | France | 6 | 2 | 2 |
| Université PSL | France | 2 | 2 | 2 |
| Université Paris Cité | France | 4 | 1 | 1 |
| Université Paris-Saclay | France | 3 | 0 | 0 |
| Politecnico di Milano | Italy | 3 | 0 | 0 |
| Bocconi University | Italy | 4 | 4 | 0 |
| Sapienza University of Rome | Italy | 2 | 1 | 1 |
| Politecnico di Torino | Italy | 5 | 1 | 1 |
| University of Bologna | Italy | 2 | 0 | 0 |
| University of Padua | Italy | 2 | 5 | 5 |
| **Total** | | **39** | **22** | **17 (77%)** |

Three institutions (Paris-Saclay, Politecnico di Milano, Bologna) have no deadlines file at all —
each is a genuine, disclosed absence (portal-driven dynamic dates, a PDF that could not be
fetched as text, or content not cleanly locatable this pass), not an oversight. Every such gap is
explained in its own requirements file's `researcher_notes` / trailing print statement, not
silently dropped.

---

## The central finding: France and Italy both have real requirements that are not thresholds, for different structural reasons

This was the brief's core warning (`scalar-thresholds-are-not-enough.md`), and both countries
produced concrete instances rather than a hypothetical risk:

**France — pass marks set after the fact, by the field, not published in advance.** Sciences Po's
own page states its 4-evaluation admissions score (`/50` then `/100`) is graded against "a minimum
mark defined by Sciences Po each year... after examination of the results and in view of the
quality of applications" — the same structural shape as a *concours* (rank against that year's
field) even though Sciences Po's own process isn't formally called one. No number exists to record
in advance; recording one would be inventing it. Sciences Po also has **no required language test
score at all** — proficiency is assessed through the interview and submitted texts, not a
submitted certificate.

**Italy — a numerical cap on places, not a qualification bar.** Confirmed directly from Sapienza's
own International Student Office page: for numerus-clausus (restricted-access) programmes, "the
Universitaly application will only be validated if the candidate is among the winners in the
official ranking" — a competitive quota, independently re-confirmed at Politecnico di Torino with
the same three-gate structure (academic admission / visa issuance / final enrolment are three
separate decisions; none guarantees the next, and a granted visa can be actively cancelled if
enrolment ultimately fails). A student can meet every stated academic requirement and still not
get a place because the quota is full — there is no number in this fact for a `structured_rule`
scalar to hold.

Italy also produced a second non-scalar shape not anticipated in the brief: the **OFA mechanism**
(obbligo formativo aggiuntivo / additional educational obligation), found independently at
Politecnico di Milano and University of Bologna. Whichever language (Italian or English) is *not*
a programme's medium of instruction is not an admission gate — its absence instead triggers a
deferred remedial obligation with real downstream consequences ("certain career limitations"),
assigned either automatically or via the same CISIA test (TOLC/CEnT-S) used for restricted-access
admission itself. The same test can be a hard gate or an OFA diagnostic depending on the
programme's admission type — not one threshold semantics university-wide.

---

## Deadline dating: France mostly closed, Italy mixed — and neither should set the other's expectation

Per the coordinator's specific caution: France's Parcoursup-driven deadlines turned out to be
well-dated (exact days, e.g. 19 January – 12 March 2026, confirmed independently and identically
at Sorbonne and PSL) but almost entirely **`VERIFIED_HISTORICAL`** as of retrieval — the 2026-27
France entry cycle had already closed by 2026-08-21, and Sciences Po's own page states outright
that the 2027 cycle "will open mid-September 2026," a `CURRENT_CYCLE_NOT_PUBLISHED` fact recorded
explicitly rather than left blank.

Italy's dating behavior varied by institution rather than following one national pattern:
Sapienza and Politecnico di Torino both stated a specific Universitaly deadline (30 June 2026,
identical at both — very likely one shared national date, not coincidence), but Torino's own page
called it "indicative" with the portal "remain[ing] open" past it — a materially softer framing
than France's DAP "délai de rigueur." Bocconi's 2027-28 AY calls were still genuinely open/future
as of retrieval (Early Session through 29 Sept 2026, Winter Session through 26 Jan 2027). Padua
published a full multi-call calendar with a real structural asymmetry between programme types
(unlimited-places calls exclude non-EU-abroad applicants from the *last* round; limited-places
calls reserve the *first* round for them exclusively) — not a copy-paste error, a genuinely
different admission shape per programme type. University of Bologna's own PDF states it "has not
set a general deadline for pre-enrolment" at all — found via search but **not recorded as a
formal record**, since it could only be verified in a PDF that returned a file-download response
rather than a fetchable page (direct navigation was not retried, per the tool's own instruction),
and a search snippet alone does not meet this lane's evidence bar (`research-handoff-university-
requirements.md`, "search discovers, fetch verifies").

---

## Evidence discipline held throughout

- **No AI-summarized fetch was treated as verbatim.** `text_fidelity` is `verbatim_quoted`
  wherever the exact source string was captured (including via a JS-triggered accordion expansion
  at Bocconi and Politecnico di Torino, where the real rendered content — the same text a human
  visitor sees after clicking — was not present in the page's static HTML/text response until the
  control was activated. This is reading real content, not fabricating it).
- **Never accepted a search snippet as a record.** Confirmed twice: once positively (Sapienza's
  Universitaly section was relocated and independently re-verified via DOM anchor navigation
  after a snippet first surfaced it), once negatively (Bologna's "no general deadline" finding was
  left out entirely rather than recorded on snippet confidence alone, because the only source was
  an unfetchable PDF).
- **Grades and tests stayed on their own source's scale**, with test name and administering body
  recorded explicitly per the brief's specific instruction — TOL (Politecnico di Milano itself),
  TOLC-I/CEnT-S (CISIA consortium), TIL (Politecnico di Torino itself), SAT (College Board, with
  Politecnico di Torino explicitly excluding it for Architecture), IMAT (registered via
  Universitaly for Medicine), Bocconi's own test, LSAT, ACT — no cross-system conversion attempted
  anywhere.
- **No year was ever synthesised.** Where a source gave only a day/month or deferred entirely to a
  not-yet-published annual call (Politecnico di Milano's and Padua's IMAT/TOLC registration
  windows), the record says so explicitly rather than guessing a year from pattern.
