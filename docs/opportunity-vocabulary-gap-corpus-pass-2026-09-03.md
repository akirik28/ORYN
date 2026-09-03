# The 47-page corpus pass: the vocabulary gap is real, and shipping a pattern for it would make things worse

**Date:** 2026-09-03. **Author lane:** this session. Dispatch: measure both candidate
vocabulary gaps (the "program runs [dates]" shape from Stanford, the colonless "##
Deadlines" heading shape from Harvard) in one real-page sweep, come back with counts not a
pattern, and scope the date-currency question as its own deliverable.

## Method

47-row sample, stratified across the real active catalogue by category (not the
priority-ranked due-set, not this session's own already-flagged rows — a fresh,
representative pull, matching the sampling discipline the original English/Turkish phrase
passes used). 43 fetched and passed all three content guards. Two loose probes run in one
sweep — a markdown heading containing "date(s)"/"schedule", and a heading containing
"deadline(s)" with no colon immediately after — both deliberately loose, since this pass
exists to find and read real variants, not to pre-filter them.

## The raw counts

**8 of 43 (18.6%) hit the dates-heading probe. 2 of 43 (4.7%) hit the deadline-heading
probe.** Both real, both larger than the smaller 17-row check found earlier today (1 and 0
respectively) — a broader, more representative sample surfaced more of both shapes, as
expected.

## Every hit, read by hand — and the raw count overstates the real signal badly

**None of the 8 dates-heading hits are a clean, safe "this reveals a currently-open
opportunity."** Read individually:

- **GENIUS Olympiad, AMC-AIME**: false positives from the probe's own looseness — "Stay up
  to date" (an idiom, not a schedule section) and a "Schedule" heading with no date content
  nearby at all.
- **Columbia University (NY)**: `## [Dates and Deadlines](/admissions/dates-and-deadlines)`
  — a *link to a sub-page*, not the content itself. A third, distinct problem: sometimes the
  real answer is genuinely on a different page a single fetch never reaches.
- **NYU Tandon ML Summer Program**: real session dates, **no year anywhere nearby** — exactly
  as uninterpretable as BRI Student Fellowship's dateless "Applications Open October" from
  earlier tonight.
- **SEAP**: real content, but explicitly tentative — *"We expect the online application
  portal to open in September 2026... please check back."* A projection about a future
  opening, not evidence of a current one. A meaningfully different, weaker shape than
  Stanford's definite "program runs."
- **JAX Summer Student Program**: *"**2026 Application Closed**... Applications are now
  closed for 2026."* **This is the critical one.** A current-looking year (2026) sitting
  directly next to explicit closure language. Any pattern that read "a dates heading with a
  2026/2027 year nearby" as evidence of *opening* would get this row backwards — the year
  being current says nothing about direction without also parsing the words around it.
- **UNO — United Nations Online**: *"## Start Date Spring 2026"* — a season, not a specific
  date. Spring 2026 (roughly March–May) had already ended by the time of this fetch
  (2026-09-03). A naive "year matches, must be current" check reads this as live; it isn't.

**Two of eight (JAX, UNO) are not neutral misses — they are traps a naive year-comparison
pattern would get actively wrong**, more common in this sample than the one clean-looking
hit (SIP, below). That is the number that decides safety, and it argues against shipping,
not for it.

**The deadline-heading probe's 2 hits are both false positives for intent**: Columbia's is
the same nav-link problem above; THIMUN's `## DEADLINES & CANCELLATIONS` is about
badge-change and cancellation *fees*, not the program's own application status at all.

## The corrective finding: even the "clean" hits don't survive checking against today's actual date

SIP (Science Internship Program) looked like the one genuine miss — a real `## SIP 2026
Schedule Overview` with concrete dates (*"Week 1: June 15–19, 2026... SIP 2026 Kickoff:
Monday, June 22, 2026"*). But SIP's own program, by this description, runs roughly June
through mid-August 2026. **Today is 2026-09-03.** That session has already concluded. Read
correctly — comparing the described dates against *today*, not merely checking whether
"2026" appears — this content would confirm SIP's already-stored `closed` state, not
contradict it. It was never evidence of a hidden-open opportunity.

**The same check, applied back to the two confirmed instances from earlier today, changes
what they mean.** Koç University Summer Academy: *"June 29 – July 10 2026"* — also already
concluded by today. **Summer at Stanford Program for High School — the row that started this
entire investigation — described a program running "June 20–August 16, 2026." Also already
over.** A perfectly working vocabulary fix, without any date-currency awareness, would not
have resolved this row to "open." Read correctly against today's date, the honest
conclusion is closer to "confirms a 2026 cycle ran and has now concluded" — nearer to its
own stored `historical`/closed-shaped reality than to the "it's actually open" framing this
thread carried since the row was first found.

(Worth being precise about which Stanford row this is: **Stanford Anesthesia Summer
Institute (SASI)** — a different opportunity, found earlier today with page text *"Summer
2027 · SASI Applications Now Open"* — is a genuinely different, temporally valid case. 2027
is still ahead of today; that finding stands. This section is specifically about "Summer at
Stanford Program for High School," the excerpt-bug row.)

**Across every real hit surfaced by 62 total pages checked today (10 + 17 + 43, allowing for
overlap) — Stanford, Koç, SIP, JAX, UNO — not one represents a currently-open opportunity a
vocabulary fix would have correctly surfaced as newly open.** Every one either needed
explicit closure language right next to the date (JAX), described an already-elapsed window
(Koç, SIP, Stanford, UNO), or lacked a year entirely (NYU Tandon, BRI from earlier).

## The date-currency deliverable, scoped as asked — and it is not a small addition

Every function in `classify.ts` today is a pure comparison of two given inputs (fetched
content, stored state) — nothing in the file depends on the current wall-clock date. A real
date-currency check would be the first thing in this module that does, and what today's
corpus shows it actually needs is harder than "is the year >= 2026":

- **It needs to parse a date *range*, not a year.** Every real example found today (Stanford,
  Koç, SIP) had its own concluded-vs-current status determined by whether a specific
  multi-month window had passed, not by which calendar year was printed. "2026" alone was
  wrong evidence in 2 of 8 real hits (JAX, UNO) and misleading by omission in the "clean"
  one (SIP) once actually checked.
- **It needs to distinguish a *projection* from a *statement*** (SEAP's "we expect... to
  open" versus Stanford's "runs June 20–August 16") — a real, observed distinction with no
  existing machinery to make it.
- **It needs the same corpus-derivation discipline as everything else in this file** before
  shipping, at comparable scale to this pass — not a one-line utility.

**Where it would live**: closer to a new deterministic guard alongside `checkContentGuards`
and `isFabricatedPlusOneYear` than to a new `OPENING_PATTERNS` entry — it answers "is this
evidence stale," a different question from "does this excerpt say anything at all,"
and belongs as its own named check rather than folded into the existing pattern lists.

## The answer, stated plainly rather than left open for a sixth pass

**Do not ship the vocabulary pattern.** Not because the evidence is merely thin — because
the evidence collected specifically to test it shows a naive version would be actively
wrong more often than it would be right, on real pages, today. The Stanford-shaped miss is
real and confirmed twice more (Koç, and now understood more precisely on Stanford's own
row), but the actual missing capability is not "recognize a Dates heading" — it's
date-range-awareness, a genuinely separate, harder, more valuable piece of infrastructure
that this file does not have anywhere yet. That is the concrete next deliverable, not a
regex addition.

## What this pass does not do

No pattern written. No verdict changed. No writes anywhere. Two scratch scripts used to run
this pass were not committed.

## Gates

`npm run typecheck` / `npm run lint` to run before push. 43 real fetches this pass (plus 27
from the two earlier checks today, ~70 total pages read across the whole investigation) —
real Tavily/browser-UA calls throughout, zero database writes.
