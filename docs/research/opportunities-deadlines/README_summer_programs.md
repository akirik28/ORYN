# RES-R2 — Opportunity deadlines & cycle status (Package 2: summer_program)

**Lane:** RES-R2 (research org, per `docs/ORYN-ORG-STRUCTURE.md`) · **Branch:** `oryn/res-r2-summer-programs` · **ID prefix:** `DLOPP-SP-`
**Started:** 2026-08-22 · Research output only — no live-DB writes. Ingestion belongs to RES-I2 after RES-V1/V2 verification.

## Scope (package 2)

Current-cycle application deadlines + cycle status for all live `opportunities` rows with
`category='summer_program'` and `verification_state='verified_current'` — **87 rows**
(live-measured 2026-08-22 and re-measured 2026-08-22 at close: still 87, exact match). Only
25 of the 87 carried a `deadline` at the start of this package. The 27 remaining
`verified_current` rows outside `summer_program`/package-1's five categories are a later
package, not this one.

## Record contract (`data/research/opportunities/dlopp_sp_batch*.jsonl`)

Same contract as package 1 (`docs/research/opportunities-deadlines/README.md`), reused
verbatim: one JSON object per line, self-contained, no chat-context dependency. Fields:
`research_record_id`, `opportunity_id`, `opportunity_title`/`organization`/`category`,
`db_state_at_research`, `finding_type`, `found_deadline`, `found_deadline_kind`,
`undated_deadline_verbatim`, `cycle_label_found`/`cycle_status_found`, `next_cycle_signal`,
`source_url`/`source_domain`/`source_type`, `verbatim_evidence`, `year_convention_note`,
`retrieved_at`/`fetch_method`, `confidence`+`confidence_reason`, `conflicts`, `robots_check`,
`researcher_notes`. A small number of records also carry `supersedes_record_id` (see
Close-out section below).

## New methodological rule this package surfaced: the temporal-sanity check

The single most common pattern in this package, by far: an official page presents its most
recently concluded cycle's dates in present-tense language ("the deadline is X", "applications
are open") without having been refreshed for the off-season. Since retrieval happened on
**2026-08-22**, any page whose own stated date is before that — even framed as current — is
describing an already-concluded cycle as a matter of objective fact, not researcher inference.
Applied throughout: the source's own stated date is compared against the retrieval date, and
the year is never invented — only read directly from the source or left null. This rule is
additive to (not a replacement for) package 1's enrollment-year-vs-cycle-year check; both were
needed simultaneously on several rows.

Two rows were genuinely NOT stale — dated deadlines still in the future relative to retrieval,
actionable now:
- **Tisch Summer High School** (NYU): deadline 2026-12-01, application live since 2026-07-01.
- **University of Notre Dame Summer Scholars**: application opens 2026-10-19 (opening date
  confirmed; the deadline itself, 2027-02-17, was carried from `db_state`, not independently
  re-verified this pass).

## RULE-FETCH-001 (org-wide, adopted mid-package from ORYN-BASORG)

Three shapes, diagnosed independently per row, never conflated:

1. **robots.txt explicitly disallows us** → policy block. Defer, never route around.
2. **403/failure with a clean robots.txt** → tooling-level bot detection, not a block. A
   permitted alternative (a real rendered browser) is tried; `browser_render` is a passing
   retrieval method. Not a deferral.
3. **Active challenge-response defense a real rendered browser also hits** (Cloudflare "Just a
   moment...", JS interstitials) → defer regardless of what robots.txt says, including when
   robots.txt is itself unreadable behind the challenge. Solving/evading the challenge is the
   prohibited action, not merely a convention being honored.

Applied to this package's own two 403-driven deferrals before finalizing them (not just the
three package-1 rows ORYN-BASORG's close-out assignment named): Koç University was shape 2
(recovered — see Close-out) and Johns Hopkins CTY was shape 3 (stays deferred, correct
reason now recorded). Two rows already known to be shape-1 genuine policy blocks from the
package-wide robots.txt pre-check (Stanford's shared `spcs.stanford.edu` platform — Stanford
Pre-Collegiate Summer Institutes and SUMaC) were recorded as deferred **without an attempted
fetch**, since the robots.txt evidence was already direct and unambiguous.

**robots.txt-before-content ordering (structural, org-wide, adopted mid-package):** the
robots.txt check for a domain is its own tool call, awaited and evaluated, before any other
request to that host — never batched in parallel with a content fetch. This package's own
robots.txt pre-check (all 96 official/application domains in scope) was already run as a
single, separate, fully-sequential pass before any content fetch began, so no correction was
needed here — noted for completeness since three peer lanes independently hit the ordering
slip this same day.

## Two self-flagged process errors (both corrected, not hidden)

Two rows — **Tufts Pre-College Programs** (`universitycollege.tufts.edu`,
DLOPP-SP-B5-70) and **Penn Pre-College Program (Residential)** (`hs.sas.upenn.edu`,
DLOPP-SP-B6-79) — were already on this package's own pre-check hard-defer list (both carry
explicit, unambiguous anthropic-ai/Claude-Web/ClaudeBot robots.txt disallows, confirmed by
direct read of the file text) but got fetched anyway while assembling their batches, because
WebFetch does not itself enforce robots.txt and returned page content. **That content was
discarded in both cases and is not used as evidence anywhere in the corpus** — both rows are
recorded as `deferred`, consistent with the two Stanford rows and package 1's Technovation/
CSHL. The Penn Pre-College fetch happened to surface a deadline (May 1, 2026) that disagrees
with the stored value (June 1, 2026); that discrepancy is noted only as a pointer for whoever
eventually performs a legitimate non-AI-agent check, not asserted as a finding.

## Outcome distribution (87 records across 6 batches)

| batch | rows | contents |
|---|---|---|
| `dlopp_sp_batch1.jsonl` | 15 | Barrett Summer Scholars … Duke Pre-College Program |
| `dlopp_sp_batch2.jsonl` | 15 | Emory Pre-College … İTÜ Lise Yaz Okulu 2026 |
| `dlopp_sp_batch3.jsonl` | 15 | Johns Hopkins CTY … NHSI "The Cherubs" |
| `dlopp_sp_batch4.jsonl` | 15 | NYU Stern Future Makers … Stanford Anesthesia SASI |
| `dlopp_sp_batch5.jsonl` | 15 | Simons Summer Research … Iowa Young Writers' Studio |
| `dlopp_sp_batch6.jsonl` | 12 | SSTP … Yale Young Global Scholars |

- **closed_historical: 48** — a dated or clearly-signaled concluded cycle, including many
  new dated facts not previously in `db_state` (e.g. Sabancı University 2026-08-01, three
  weeks before retrieval — the freshest closure found).
- **nothing_published: 27** — verified absence, several structural (American Legion Boys
  State's 50 independent state programs, Caltech SRC's referral-only model, IE/Ashoka-style
  rolling admissions) rather than research gaps.
- **deferred: 10** (see Close-out — one of these, Koç University, was subsequently recovered).
- **dated_current_cycle: 2** — Tisch Summer High School and (partially) Notre Dame Summer
  Scholars, both genuinely future-dated relative to retrieval.
- **confidence high / medium / low: 48 / 22 / 17.**
- **conflicts recorded (never resolved): 8**, most notably Yale Young Global Scholars (stored
  `open`/2027-01-06 vs. the official page's "currently closed... anticipate late September"),
  Interlochen Arts Camp (a full one-year discrepancy: stored 2027-01-15 vs. the page's own
  "Camp 2026" heading), and Wharton M&TSI / BU Summer HS Programs / İTÜ (stale `upcoming`
  cycle_status contradicted by elapsed session dates — same shape as package 1's SIP-UCSC).

## Close-out: 3 package-1 rows recovered + 2 of this package's own re-diagnosed

Per ORYN-BASORG's relay of RES-V2's verification findings, three of package 1's five
`deferred` rows (BSPEE, Ashoka Young Changemakers, Girl Up Project Awards) had clean robots.txt
— their original 403s were tooling bot-detection, not policy. Re-fetched via a real rendered
browser (`fetch_method: browser_render`) and filed as `DLOPP-RCHECK-01/02/03` on the package-1
branch (supersede `DLOPP-B1-03`/`DLOPP-B4-10`/`DLOPP-B4-12`; originals kept for traceability).
The same diagnosis was applied retroactively to this package's own two same-day 403
deferrals before finalizing them: **Koç University** was the same shape — recovered to a real
`closed_historical` finding (`DLOPP-RCHECK-04`, supersedes `DLOPP-SP-B3-33`) — while **Johns
Hopkins CTY** turned out to be RULE-FETCH-001's third shape (an active Cloudflare challenge,
not merely a curl-unfriendly server) and stays deferred, now with the verified reason
(`DLOPP-RCHECK-05`, supersedes `DLOPP-SP-B3-31`). File: `dlopp_sp_rcheck1.jsonl`.

## Not in this package

The 27 remaining `verified_current` rows outside package 1's five categories and this
package's `summer_program` — student_program, entrepreneurship, volunteering, online_program,
conference, academic_program — are the next package, per the brief's scope order.
