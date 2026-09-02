# Sizing "title names a famous institution, organization says someone else" — across all 421

**The headline finding of the null-organization work was 5 independent confirmations of
this pattern, found while researching a 79-row subset.** Assigned: size it against the
whole catalog before recommending anything, because the right recommendation for 8 rows
in 421 is not the right recommendation for 80. **Read-only. Nothing staged — none was
needed; see why below.**

## Method

Pulled all 421 `opportunities` rows (`title`, `organization`, `official_url`,
`category`), live from `oryn-qa-scratch`. Merged in the not-yet-applied organization
values from this task's own chain of staged work, since ignoring them would undercount
what's actually known: the 224 rows with a live `organization`, the 109 staged in
`organization_backfill_2026-09-02.sql`, and the 69 staged across this task's four
batches. **402 of 421 rows (95%) now have a known-or-proposed organization** — only 19
remain fully unknown.

Flagged every row whose **title** contains one of ~55 widely-recognizable institution
names (Harvard, MIT, Stanford, the rest of the Ivy-plus set, Oxbridge, UCL/LSE/Imperial,
a handful of major Turkish universities, plus Microsoft/Google/NASA/UN) — the kind of
name a 16-year-old would recognize and read as an endorsement. **112 of 421 rows (27%)
name one.** This is a bounded proxy, not an exhaustive census — a title naming a less
globally-famous institution wouldn't trigger the same trust concern and isn't counted
here, which is deliberate: the risk this task cares about is specifically "sounds
prestigious enough that a student takes it as fact."

For each of the 112, checked whether the *organization* field actually says that
institution (allowing for abbreviation forms — UCSB/"UC Santa Barbara", Caltech/"California
Institute of Technology" — which a naive string match misses but are the same fact).

## Result: zero confirmed live errors, not "small" — zero

| | Rows | |
|---|---|---|
| Title names a well-known institution | 112 | |
| — Organization matches (incl. abbreviation forms) | 101 | 90% |
| — Organization not yet known (already tracked: 1 dead, 4 unresolvable) | 5 | 4% |
| — Title names the *venue*, organization correctly names the *actual operator* | 6 | 5% |
| — **Organization is simply wrong** | **0** | **0%** |

**The 6 "title names venue, org names operator" rows are not errors — they're already
resolved correctly.** This is the category the brief predicted would be the largest: a
program legitimately hosted at or using a famous name, run by someone else. Checked each
one directly rather than assuming:

- *RSI (Research Science Institute) at MIT* → Center for Excellence in Education (this
  task's own batch 1 finding — MIT hosts it, doesn't run it)
- *Global Issues at Princeton* → Johns Hopkins Center for Talented Youth (CTY runs
  programs at many host campuses; Princeton here is the venue, same as CTY's other
  "Online Programs" row resolved earlier in this task)
- *International Summer Schools St Andrews, Cambridge and Oxford* → "ISSOS" (staged in
  the 109-row backfill with its own honest caveat: "organizing legal entity not
  independently confirmed" — already flagged as uncertain by whoever staged it, not
  silently asserted)
- *The Immerse Cambridge Experience* → Immerse Education (a private company; confirmed
  directly at immerse.education, opened 2026-09-02)
- *UniHive Summer Programmes hosted at the University of Cambridge* → UniHive Education
  (this task's own batch 4 finding)
- *UNO – United Nations Online* → Stanley Prep — **re-verified directly this session**
  (opened stanleyprep.com/united-nations-online/, 2026-09-02) specifically because it
  looked most likely to be a real error rather than a legitimate venue relationship. It
  isn't one: Stanley Prep genuinely runs a program by that name, confirmed the same way
  as batch 1's UNAT finding for the same company.

## What this means: the pattern is a confirmed *risk*, not a confirmed *defect*

Every one of the 5 "independent confirmations" that motivated this sizing pass was found
during **active research** — opening the program's own page instead of trusting the
title. That's exactly why they were caught rather than shipped wrong. Checking the
*already-resolved* 402 rows against the same test finds **zero** rows where the
organization field is factually incorrect. Put plainly: **the failure mode is real and
would happen the moment anyone infers organization from title instead of researching
it** — this task's whole method exists because of that risk — **but nothing currently
live in the catalog has actually failed that way.** The corpus's existing organization
values, wherever they came from, hold up.

**One honest limit on this claim**: 112 is a bounded sample (rows naming one of ~55
widely-recognized institutions), not all 421, and 19 rows still have no organization to
check at all. A title-institution outside that keyword list, or one of the 19 unresolved
rows once it does get an organization, could still turn up a real error later. This
sizing says the *known* rate is zero, not that the risk is retired.

## Recommendation: no new product surface needed — the existing one already covers this

Checked before recommending anything speculative: `components/oryn/source-badge.tsx`
(Phase 36/71's `SourceBadge`) is already built and already wired into
`app/(app)/opportunities/[id]/page.tsx` — the organization field is already shown
prominently (as the page's own description line, directly under the title) and
`SourceBadge` already links to the real source URL with a checked-date. **A student who
reads "RSI at MIT" and then sees "Center for Excellence in Education" one line down,
with a link to verify it, already has what they need to notice the gap themselves** —
the infrastructure this finding would otherwise recommend building already exists and is
live.

Given zero confirmed live errors and an existing surface that already discloses the
organization plainly, the honest recommendation given the current size of this problem
is: **do nothing new to the product.** The one thing worth doing is procedural, not a
build: keep the rule this whole task operated under — organization comes from the
program's own page, never inferred from a title — as the standing rule for any future
research or ingestion pass, since that rule is the entire reason the confirmed-error
count is zero rather than something else. If a later, broader pass (the 19 still-unknown
rows, or titles outside this session's keyword list) turns up a real, live wrong-organization
row, *that* would be the point to reconsider a proactive UI callout — sized against
however many actually turn up, not against this session's 5.

## Sources

Live query: `opportunities` table, `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`), 2026-09-02,
read-only. Staged organization values: `organization_backfill_2026-09-02.sql` (109
rows) and this task's own four batch files (69 rows, all pushed to
`oryn/opportunity-org-research-79-2026-09-02`, now merged to main). Re-verification:
stanleyprep.com/united-nations-online/, opened directly, 2026-09-02.
