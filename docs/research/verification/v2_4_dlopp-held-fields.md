# Package V2-4 — RES-I2's 34 held DLOPP fields

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
**Read-only — no writes.** Robots.txt fetched and evaluated as its own step before any
other request to a host, throughout. New rules acknowledged and applied: RULE-FETCH-005
(bare `Disallow: /` for `User-agent: *` blocks us regardless of a record's own
`robots_check` claim) and shape 5 (an explicit CAPTCHA gate defers immediately — none
encountered this pass, noted for the record).

## Scope of this verdict

**Covered**: for each held field, does today's official source support the live value,
the originally-proposed value, or neither. **Not covered**: re-deriving RES-I1/RES-I2's
exact "34" count mechanically — no committed file has the itemized per-field list (the
full-batch guard run that produced it was reported in prose, not committed as data; the
only committed script, `scripts/dryrun-dlopp-monotonic-guard.ts`, covers just the
original 15-record sample, not the full 74). I reconstructed my own working set instead
of asserting a false match to "34" — documented below so the gap is visible, not papered
over.

## Reconstruction method, and what it found

Re-pulled live `cycle_status`/`current_cycle_label` for all 74 DLOPP opportunity ids
(fresh, this session) and diffed against each record's original proposal (with the
RCHECK-01/02/03 substitutions for BSPEE/Ashoka/Girl Up). Two lessons from a first,
too-naive pass, corrected before trusting any output:

1. **A literal string-inequality check on `current_cycle_label` produced 56 "holds" —
   almost all false.** Most of those are cases where the live label is already a fuller,
   already-written version of the same fact as the proposal (e.g. live "EUCYS 2026,
   September 22-27, Kiel, Germany" vs. proposed "EUCYS 2026 (37th edition), 22-27
   September 2026, Kiel, Germany" — the same fact, already applied). This is exactly
   what RULE-INGEST-004 already warned about — free text has no clean equality check —
   and it's why I'm not presenting a label-hold list at all: doing so would manufacture
   the same false-positive risk BASORG flagged on my own url_repair tooling slip
   earlier today, at a larger scale.
2. **`cycle_status_found: "unknown"` is not a proposal** — it's the researcher's own
   "couldn't determine" marker (IPsyO, STEM Racing, Technovation Girls, Genesys Works,
   Nuffield, Partners for the Future all use it). A monotonicity guard should treat it
   as no-information, same as null — I excluded these from anything needing resolution.

After both corrections, the **genuinely-populated-vs-differently-populated
`cycle_status` set** is 18 records (down from the initial naive 26): the two BASORG
named, plus 16 that only ever surfaced in the full-batch guard run and that this
package hadn't individually checked before. Every one below was independently
re-verified against a fresh fetch, not decided from the records' own descriptions.

## The pattern underneath most of them — a fourth instance of "the field may be the wrong shape"

**11 of the 18** are the same shape: the *current* cycle just closed (a real, sourced
fact) and the *next* cycle's date genuinely isn't announced yet (also a real, sourced
fact) — and `cycle_status` can only hold one of "closed" or "date_not_announced" for
what is honestly two true facts about two different points in time. This is the same
class of finding as Concord Review's `open`/`upcoming`, Girl Up's unwritable multi-
pathway deadline, and Glasgow's multi-award `degree_type` — a verifier keeps finding
it because it's a real, recurring shape in how this schema meets these facts, not
because any one research pass got it wrong. Not deciding it here; naming it because
it's now recurred enough to be a pattern rather than a one-off.

## Resolved

**IPPF (`bc303473-...`) — cycle_status: recommend `upcoming` → `open`.** Freshly
re-fetched (third independent check today, after the researcher's original and my own
V2-2 pass): "Free early bird registration for the 2026–27 IPPF is open! General
registration will remain open through mid-October." Registration is unambiguously,
currently open — `upcoming` undersells an already-actionable window, the same shape as
Concord Review's resolved case. Confirms the researcher's own `open` finding exactly.

**CyberPatriot (`4b9e2c29-...`) — not fetched, stays refused.** Per your instruction,
did not spend a call rediscovering the `Disallow: /` block; robots.txt shows `302` on
the bare domain today (redirect target not followed, consistent with "don't fetch,"
not investigated further) — live value stands, this is a closed question, not a hold.

**Scholastic Art & Writing Awards (`59f1e29b-...`) — restating, not re-deriving.**
Already established in package V2-2: live `cycle_status='open'` is the one that's
wrong here, contradicted by the source's own "opens... in the fall" language, and
self-contradicted by the row's own `current_cycle_label`. The *proposed* value in this
batch (`upcoming`) is closer to correct than the *live* one — an unusual direction for
this package (live wrong, not the researcher), flagged already, restated here only so
it isn't lost inside the 34's larger count.

## The 16 newly-checked, each independently re-fetched today

| Record | Live | Proposed | Fresh finding | Recommendation |
|---|---|---|---|---|
| **BIYSC** | `date_not_announced` | `closed` | Neither is right anymore: "Applications for BIYSC 2027 Open" + a "December 2026" key-date + live "Pre-register for BIYSC 2027" all present now — the 2027 cycle has a date attached, and pre-registration is active today. | **Recommend `upcoming`** (a third value, differing from both — situation has moved since the original research) |
| **HOSA** | `date_not_announced` | `upcoming` | "2027 - June 22-25 – Pennsylvania Convention Center, Philadelphia, PA" confirmed on the live page — a real future date is published, matching the researcher's original finding exactly. | **Recommend `upcoming`** (matches original proposal; live is stale) |
| **Wharton Data Science Competition** | `date_not_announced` | `closed` | "Registration for the 2026 Wharton High School Data Competition, presented by Google Gemini, is closed." — verbatim, present-tense, on the official page today. | **Recommend `closed`** (matches proposal; the source uses the word directly, stronger footing than the dual-truth cases below) |
| **CMIMC** | `date_not_announced` | `closed` | Page still reads "CMIMC Math will happen... March 28, 2026 [Register now]" and "...April 18-20, 2026 [Register now]" — both dates are 4-5 months in the past as of today; footer says "© 2025." A stale page, not an ambiguous one. | **Recommend `closed`** (proposal direction correct; live understates it) |
| **USACO** | `date_not_announced` | `closed` | 2025-2026 season confirmed concluded ("Finalists Announced"); zero mention of 2026-2027 anywhere on the page. | **No change** — live's `date_not_announced` is at least as informative as `closed` here; the dual-truth pattern above, no fresh evidence favors either |
| **Battle Code MIT** | `date_not_announced` | `closed` | "Battlecode 2026 ended on January 31st, 2026!" confirmed; "Want to sponsor Battlecode 2027?" is a sponsor CTA, not a registration-open signal. | **No change** — same dual-truth shape as USACO; `closed` isn't wrong but isn't more informative than live |
| **BRI Student Fellowship** | `date_not_announced` | `closed` | "Applications Open October" banner present, but the specific window text ("October 15-November 30") is explicitly labeled "2025-2026" — i.e. already-elapsed, and it's ambiguous whether this is stale copy or a genuinely recurring annual pattern not yet relabeled for 2026-27. | **No change** — genuinely ambiguous, same bar as 120 Hours |
| **DNA Day Essay Contest** | `historical` | `closed` | **Could not verify** — `ashg.org` refused the connection on both direct fetch and a rendered browser (not a robots block; robots.txt itself couldn't be reached either — a genuine connectivity failure, distinct from a policy or bot-detection block). | **No change** — and note `historical` is arguably *more* specific than the proposed `closed`, not less informative, so this may not need to be a real hold at all |
| Blue Ocean, Breakthrough Junior, DECA, GENIUS Olympiad, Özyeğin, TechGirls, Girl Up | `upcoming`/`date_not_announced` | `open`/`closed` | Already independently verified in earlier packages (Part 1/2/4 of the DLOPP verdict, V2-2's random sample) — no new fetch needed. All fall into the two named patterns above (open-vs-upcoming-with-a-real-deadline-already-shown, or closed-vs-date_not_announced dual-truth). None showed a live value contradicted by its source. | **No change recommended for any of these 7** — restated for completeness of the 18, not because anything new was found |

## Summary

- **1 resolved with a clean recommendation**: IPPF → `open`.
- **1 restated from an earlier package**: Scholastic Art & Writing — live is the wrong
  one, already flagged, not re-litigated.
- **1 permanently closed, not re-attempted**: CyberPatriot.
- **3 newly resolved toward the original proposal** (source now more clearly supports
  it than when first researched, or always did): HOSA, Wharton Data Science, CMIMC →
  recommend applying `upcoming`/`closed`/`closed` respectively.
- **1 resolved toward neither original value**: BIYSC → recommend `upcoming` (the
  situation moved since the original research; the source itself has changed).
- **4 resolved toward keeping live unchanged**: USACO, Battle Code MIT, BRI Fellowship
  (genuinely ambiguous or dual-truth, live is at least as good), DNA Day (unreachable;
  live's `historical` is plausibly fine regardless).
- **7 already covered by earlier packages**, no new work needed, no change recommended.
- **`current_cycle_label` holds**: not resolved as a list — see the false-positive
  finding above. If BASORG wants specific labels checked, naming the field's actual
  proposed-vs-live pairs (not a mechanical diff) would be the way to ask for it; a
  blanket pass would reproduce the 56-false-positive problem at a larger scale.

Recommend routing IPPF, HOSA, Wharton Data Science, CMIMC, and BIYSC to RES-I2 as
resolved corrections; the rest either stay as explicitly-considered no-changes or
remain outside this pass's reach (CyberPatriot, DNA Day, the `current_cycle_label`
question).
