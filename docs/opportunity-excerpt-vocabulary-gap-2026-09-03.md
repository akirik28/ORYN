# The Stanford excerpt bug: characterized, and a class — but a narrow one

**Date:** 2026-09-03. **Author lane:** this session (fleet restarted mid-task; continuity
confirmed with the integrator against live `origin/main`). Dispatch: characterize why Summer
at Stanford has been missed three times by the same wrong excerpt, on all three fetch rungs,
find out whether it's one bug or a class, and don't ship a fix that flips settled rows.

This document covers two separate findings from the same investigation, kept apart
deliberately — they are not the same defect.

## 1. The Stanford mechanism, reproduced live: a vocabulary gap, not a ranking gap

An earlier relay in this thread suggested the cause was `findPatternMatches`/`findPhrases`
picking the wrong one among multiple candidate matches. Reproduced against the real page
before accepting that: **there is exactly one "apply now" match on the whole fetched page**
(3,436 characters). Ranking cannot be the mechanism — there is nothing to rank against.

The real, correct sentence — *"Our 8-week program runs June 20–August 16, 2026"* — sits at
character 503, under a clean `## Dates` heading. The wrong match — *"Summer Session 2024
Apply Now"*, a generic testimonial-adjacent CTA — sits at character 3339, **later** in the
page. So it isn't "picks the first match" (the real sentence is earlier) and it isn't "the
window closes too soon" (the real sentence would be reached first if anything were looking
for it).

**The actual mechanism: `OPENING_PATTERNS`/`OPENING_PHRASES` in `classify.ts` contain nothing
that matches a plain "program runs [dates]" statement.** The vocabulary only recognizes
explicit CTA/status language — "apply now," "now open," "registration open." A structured,
current-dated, genuinely decisive section is invisible to it, while an unrelated, undated,
evergreen CTA elsewhere on the same page wins by default because it's the only thing that
fires at all.

## 2. Is it a class? Measured, not assumed — yes, but narrow

Checked two ways, both against real live pages:

**A 10-row check** across other rows this session already flagged as stale/off-topic
tonight (ODTÜ, EYP Türkiye, Harvard SSP, Girl Up, Ron Brown, BRI, Cornell, GençBizzTech,
NHSEB, LaunchX) — the Stanford shape (an informative, current-dated statement sitting
elsewhere, missed entirely) did not recur. **0 of 10.**

**An 18-row stratified sample** from the `p2_unreadable` bucket (121 rows in the pool,
every 7th taken) — checked for the same shape with a real, evidence-derived probe (a
`#`-heading containing "date(s)"/"schedule", with a 2025+ year within 200 characters, and no
existing opening/closing match already found). **1 of 17 successfully-fetched rows hit it**:
Koç University Summer Academy — `## Program Date & Details` / `## June 29 – July 10 2026`,
a clean, real second instance of the identical shape. The other 16 showed neither this nor
any near-miss — genuinely thin, liveness-silent pages, consistent with tonight's own earlier
established 67%+ liveness-silent finding.

**Combined: 1 real hit in 27 rows checked specifically for this shape, plus Stanford itself
— 2 confirmed real instances total.** Real, not hypothetical, and not Stanford-unique. But
not dominant either: this is a genuine, narrow class, not a large share of the
liveness-silent bucket.

**Why no pattern was written this pass, despite two real instances in hand:** every existing
pattern addition tonight (the English 49-page pass, the Turkish 21-page pass) was derived
from a real corpus at that scale before being written into `classify.ts`, specifically
because a pattern derived from too few examples risks exactly the failure this dispatch
warned about — a change that catches Stanford and Koç but silently flips a row whose
current verdict is correct. Two real instances is real evidence that the class exists; it
is not yet the same evidentiary bar the file's own prior additions were held to. A
"structured dates statement" pattern also introduces something no existing pattern in this
file needs: **a comparison against today's real-world date**, not just the stored value —
every prior finding tonight (ODTÜ, EYP Türkiye, Ron Brown) showed a specific, real date
sitting on a page is *not* by itself proof of current status; a "2026" heading needs the
same scrutiny a "2025" one already got, and confirming that scrutiny is safe needs more than
2 examples to calibrate against.

**Recommended next step, scoped and cheap, not attempted here:** extend the corpus check to
the size the prior two passes used (~40-50 pages) before writing a production pattern, and
pair any resulting pattern with a full re-run over every row with an already-known verdict
(the exact guard this dispatch asked for) before it ships. This is a real, bounded follow-up
task, not an open question left for a fifth pass.

## 3. A separate finding, from the same rows, kept apart as asked: "matched nothing" is real but not new instability

Four rows in tonight's 10-row check (Harvard SSP, Cornell, GençBizzTech, NHSEB) matched
**nothing at all** — no opening, no closure, empty excerpt. Checked directly rather than
assumed: **all four fetched cleanly** (HTTP 200, 3,000–15,000+ real characters, pass all
three content guards). This is not a fetch failure and not a block.

**For Harvard SSP and Cornell specifically, this is not new instability** — both were already
in this session's own 15-row, 3-reads-each stability measurement earlier tonight, where both
came back `p2_unreadable` with an empty excerpt **3 of 3 times, consistently.** This check's
"nothing matched" result for those two is the same stable state repeating, not a new flip.

**Harvard SSP's underlying content did genuinely change since an earlier fetch, hours ago in
this same session** — the specific "Application Opens: Monday, December 1, 2025... Deadline:
Wednesday, January 7, 2026" text that produced a real `p1_changed` verdict in the
supplementary run is no longer present in the current fetch (checked directly: "December",
"January 7", and "Opens" no longer appear anywhere in 15,211 characters of fresh content).
This is real, but it does not contradict the stability measurement — that measurement showed
repeated reads *close together in time* return identical content; hours have passed since
(and the whole fleet restarted in between), which is exactly the kind of gap where a live
page or an extraction service's own index can genuinely move. Different claim, not a broken
one.

**And checking what changed surfaced a second, distinct, narrower pattern gap, from a real
page rather than a guess:** Harvard's current page has `## Important Deadlines` as a section
heading — the word "deadline" is present, clearly relevant, but the literal `"deadline:"`
substring pattern requires a colon immediately following, which a heading never has. **Checked
this specific shape against the same 18-row sample as the Stanford probe: 0 of 17.** Real on
Harvard's own page, not confirmed to recur elsewhere yet — one instance, the same
too-thin-to-ship-a-pattern situation as above, for the same reason.

## What this pass does not do

No pattern written to `classify.ts`. No verdict changed for any row. No writes anywhere.
Both findings above are characterized and quantified, not fixed — matching the explicit
instruction to retire the question with a real, evidence-based answer rather than leave it
open, when the honest answer is "real, narrow, and not yet safe to ship from what's in hand."

## Gates

Read-only throughout — real fetches (28 rows total across both checks, `checkContentGuards`/
`findOpeningPhrases`/`findClosurePhrases` called directly against real content), zero
database writes, zero code changes to the repository. Two scratch investigation scripts used
to reproduce this were not committed.
