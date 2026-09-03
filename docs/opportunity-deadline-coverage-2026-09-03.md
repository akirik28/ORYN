# The 112-row deadline-coverage population — individually verified

2026-09-03, oryn-6e. CEO's framing: 314 of 394 active+under_review opportunity records have no
`deadline` — "the largest single gap left... because a student cannot plan against a blank."
`docs/opportunity-deadline-gaps-2026-09-02.md` (a prior 25-row sample) supplied the category taxonomy
used as a map here, not a list to redo.

**Result: 5 real, stageable deadlines found and staged. 1 more found but deliberately not staged —
the page it came from was already flagged by an earlier task tonight as possibly the wrong program
entirely. 106 rows genuinely yield nothing to store, for reasons that split cleanly into four
categories below.** Zero SQL was force-fit; the split itself, and the two cross-task consistency
catches, are as much the finding as the 5 dates.

## Scoping math: 314 → 150 → 112

The 314 figure is CEO's own framing from before tonight's under_review verification work and is
already stale — most of it has since been individually re-verified (74 rows in the unverified-cycle
task, 107 in the under_review bulk task), just not yet *applied* to the live database, so those rows
still show `deadline IS NULL` live even though SQL for many of them is already staged.

This task's own live query today, `status in ('active','under_review') and deadline is null`,
excluding the 143 IDs already individually touched by name in the two prior under_review tasks and
the 25 IDs already covered by the 2026-09-02 sample doc, returned **150**. Of those, **38** carry
`cycle_status in ('closed','historical','discontinued')` — `NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES`
in `lib/opportunities/lifecycle.ts` already excludes these three from every student-facing
recommendation surface regardless of `deadline`, so they were characterized by the exclusion query,
not individually web-verified — spending live-fetch budget confirming a deadline for a competition
already marked historical/discontinued would not have changed anything a student sees. That leaves
**112**, split into 8 batches of 14 for parallel verification.

## Method

8 parallel background agents, 14 rows each, same taxonomy and rules as the two prior under_review
tasks: official page > official institutional page > secondary source > search snippet; cite the
exact URL and today's date; never force a verdict when the evidence doesn't support one; a known
blocked-domain list supplied up front so agents record a block as a block rather than re-discovering
it. The 2026-09-02 doc's four categories carried over unchanged (A = rolling/no-deadline-by-design,
B = real deadline that can't fit one field, C = page reachable, genuinely states nothing forward-
looking, D = blocked/unreachable), plus a new **Category E = a real, specific, stageable deadline
found**.

## The tally — self-consistent across all 8 batches

```
A (rolling, correct null)              3
B (real deadline, wrong shape)         7
C (reachable, genuinely nothing yet)  68
D (blocked / unreachable)             28
E (real, stageable deadline found)     6  →  5 staged, 1 found-not-staged (see below)
                                     ---
                                      112
```
The four category counts sum to exactly 112 independently of any deliberate targeting — a clean
internal check that no batch silently dropped or duplicated rows.

## Category E — the 6 real deadlines found

### 5 staged

| Program | Deadline | Source |
|---|---|---|
| Baltic Sea Philosophy Essay Event (BSPEE) | 2026-09-24 | [bspee.wordpress.com, invitation letter dated 2026-09-02](https://bspee.wordpress.com/2026/09/02/invitation-letter-2026/) |
| JAX Summer Student Program | 2027-01-25 | [jax.org admission page](https://www.jax.org/education-and-learning/high-school-students-and-undergraduates/learn-earn-and-explore/admission) |
| Ron Brown Scholar Program | 2026-12-01 | [ronbrown.org](https://ronbrown.org/ron-brown-scholarship/) |
| NYC Commuter Summer — Columbia Pre-College | 2027-04-01 | [Columbia dates-and-deadlines](https://precollege.sps.columbia.edu/admissions/dates-and-deadlines) |
| Columbia Pre-College Online Summer | 2027-04-01 | same page as above |

BSPEE's letter was published the day before this check (2026-09-02) — found by opening the site's
most recent post rather than trusting a stale homepage summary, the same lesson the reference doc
already named for WordPress-style organizer sites. Ron Brown and JAX both had their `cycle_status`
corrected alongside the deadline (`date_not_announced` → `open`/`upcoming`) since the same source page
that gave the deadline directly contradicted the stored cycle_status — not an inference, the page said
so outright. The two Columbia rows share one official "Dates and Deadlines" page and both resolved
cleanly with no identity ambiguity — title, official_url, and the matched program section on that page
all agree.

**Anomaly worth flagging, not chased further tonight**: 5 of these 6 rows (all but the Spring
Immersion one below) already carried `verification_state = 'verified_current'` with `verified_at`
dates from **2026-08-15 through 2026-08-20** — meaning they were marked "verified current" three
weeks ago while simultaneously holding a null `deadline` and, for 3 of them, a `cycle_status` the
live page directly contradicted. "Verified current" evidently described the row at some point in the
past, not "no gaps remain" — worth someone's attention if that label is read as a completeness signal
anywhere in the product, not just a staleness one.

### 1 found, deliberately NOT staged — Columbia Spring Immersion Program

id `f912de6d-7da6-4e21-811b-1da09b10c86c`. Tonight's batch-5 agent found a real Spring 2027 General
Application Deadline of **2026-12-21** on the program's linked "Dates and Deadlines" page, and flagged
its own wrinkle: the same page also lists a nearer Fall 2026 deadline (2026-09-11) that might better
match this row.

That wrinkle turned out to be the smaller problem. **`docs/opportunity-deadline-gaps-2026-09-02.md`'s
sibling task — the unverified-cycle-verification task run earlier this same night — already examined
this exact ID and reached UNRESOLVABLE**, for a more fundamental reason than which cycle to pick:

> "stored URL resolves to a different real Columbia program ('Academic Year Weekend'), not the stored
> title ('Spring Immersion Program'). A plausible intended match ('Academic Year Immersion,' Spring
> 2027 session) exists but a follow-up fetch to confirm it failed."

Tonight's deadline-focused agent fetched the same "Academic Year Weekend" page and extracted a real
date from it — but extracting a real date from a page doesn't resolve whether that page is even the
right program for this catalog row. Staging 2026-12-21 as *this row's* deadline would launder an
already-flagged identity gap into a confident-looking date. **Not staged.** The 2026-12-21 figure is
recorded here as a lead for whoever next resolves the underlying official_url ambiguity, not as a
verified fact about this specific row.

This is the second time tonight two independent passes over the same ID produced a materially
different confidence level — worth naming as a pattern: **a fresh verification pass that doesn't know
about an earlier pass's finding can rediscover the same page and reach a shallower conclusion just by
not asking the identity question the earlier pass already asked.** Neither agent was wrong about what
was on the page; only one of them had already established that the page might be the wrong page.

## Cross-task consistency check — BMO Round 1/2 and Senior Team Mathematical Challenge

Tonight's batches 4 and 5 independently re-researched three rows that the **under_review-pool-audit**
task (also tonight, earlier) had already resolved:

| Row | Earlier task's staged value | Tonight's independent finding |
|---|---|---|
| BMO Round 1 (`f6dbce16…`) | `deadline = 2026-11-19` (the answer-sheet-upload date, chosen as the student's actual last actionable moment) | Same page, same dates — read as "exam-day logistics, not an entry/registration cutoff," landed in Category C |
| BMO Round 2 (`e5a8555d…`) | `deadline = 2027-01-21`, same reasoning | Same page, same dates, same Category C read |
| Senior Team Mathematical Challenge (`1cd3d046…`) | `deadline` left null — "no single clean deadline date to store, left null rather than guessed" | Independently reached the identical conclusion (Category B, capacity-gated not date-gated) |

No contradiction in the underlying facts — both passes found the same dates on the same pages. The
difference is purely interpretive: the earlier task deliberately chose the answer-sheet-submission
date as "deadline" (reasoning: the last actionable moment for a student already registered, matching
how `deadline` is used elsewhere in the schema), while tonight's fresh agents, working blind to that
reasoning and told to look specifically for a registration/application cutoff, correctly reported that
BMO publishes no such date. **Nothing new staged for these 3 IDs** — the earlier task's values stand,
confirmed rather than contradicted. Checked against all three prior tasks' SQL files before writing
this one; no other ID overlaps found.

Two more rows independently reconfirmed already-DEAD verdicts from the 107-row under_review bulk task
— **Duke University Talent Identification Program 2024** and **Robomaster High School Summer Camp
(Shenzhen)** both turned up again in this population (their SQL was only staged, never applied, so
they still show live as `deadline IS NULL`) and both batches reached the same dead/no-successor
conclusion a third time, independently, down to matching details (Duke's TIP branding absent from its
own redirect chain; Robomaster's stored description confirmed as a jumbled concatenation of unrelated
programs). No new action — the existing DEAD recommendation stands.

## Category B — 7 real deadlines that don't fit a single field

Consistent with the 2026-09-02 doc's Category 2, these are the more informative half of the "no"
answers — a deadline genuinely exists, just not as one date:

- **Erasmus+ Youth Exchanges** — two real EU-wide annual deadlines, 12 Feb and 1 Oct (Brussels
  noon), recurring twice yearly. `cycle_status` also flagged stale (`date_not_announced` when the
  dates are in fact published, just biannual) — not corrected here since fixing it without a
  deadline value to pair it with would just relocate the same ambiguity.
- **Senior Team Mathematical Challenge** / **Team Mathematical Challenge (Junior)** (UKMT) — one
  closes on first-come-first-served capacity, the other three weeks before each region's own event
  date. Neither is a calendar date.
- **Science Olympiad (Division C)** — "start a team at any time"; timing set independently by 50
  state chapters.
- **DECA**, **International Chemistry Olympiad**, **International Mathematical Olympiad** — all
  three gated through decentralized bodies (state associations for DECA; national delegations for
  IChO/IMO). IMO and IChO share the exact same underlying deadline for Turkish students — April 21,
  2026, 17:30 Turkey time — because both run through the identical TÜBİTAK Bilim Olimpiyatları
  first-stage exam. Real, dated, confirmed on TÜBİTAK's own page — but Turkey-only, not a global
  Olympiad-level date.

Same recommendation as the 2026-09-02 doc: these are candidates for a `deadline_note` free-text field
or per-region/per-cohort child rows, not for forcing one date into `deadline`. Not implemented here —
a schema conversation, not a research-pass output.

## Category A — 3 confirmed genuinely rolling

**NSLC Business & Entrepreneurship**, **RISD Pre-College (On-Campus)**, **Global Achievers Academy**
— each organizer's own page states admission is capacity-gated or rolling with no fixed cutoff, in
NSLC's and RISD's cases checked across 2-3 separate official pages to make sure no "seasonal deadline"
was hiding elsewhere. Global Achievers Academy additionally reconfirms a prior session's
open-enrollment finding.

## Category D — blocked/unreachable (28 of 112)

Every previously known block reproduced exactly as documented (cty.jhu.edu, ku.edu.tr family,
insidetheperimeter.ca, my.ctd.northwestern.edu, ringling.edu, hmmt.org, igem.org, nytimes.com,
arts.princeton.edu, durham.ac.uk, summer.gwu.edu, juilliard.edu, universitycollege.tufts.edu,
boun.edu.tr/bogazici.edu.tr TLS mismatches, exeter.ac.uk) — zero surprises there.

**New blocks/unreliable domains found tonight, worth adding to the running list:**
- **fordham.edu** — not previously listed; CAS login-wall redirect (not a 403) on two distinct URLs
  plus a browser-tool refusal, now confirmed across two separate task sessions (the row's own stored
  description already flagged it from an earlier pass).
- **girlup.org** — 403 via WebFetch + denied browser navigation, two independent confirmations.
- **ie.edu** — WebFetch redirect-loops (2/2 today, consistent with a prior session's 3/3); a browser
  session got through once but then self-redirected to an unrelated third-party site
  (immerse.education) on the very next action. A soft/unreliable domain, not a hard block — worth a
  name if it recurs.
- **stem.org.uk** (STEM Learning/Nuffield's application portal) — Cloudflare human-verification gate,
  already found in the 107-row task, reconfirmed identically tonight.

## Other data-quality defects surfaced, not fixed (out of this task's deadline-only scope)

- **Wrong-program official_url, not just a wrong page**: two rows (Google Computer Science Institute,
  Hochschule Bremen) had a reachable, non-blocked official_url that pointed to a *different, real
  program* at the same institution — a failure mode the A-E taxonomy doesn't name: the page loads,
  isn't blocked, and carries a real deadline, just for the wrong thing.
- **University of Exeter** — official_url looks like an individual faculty profile page, not any
  summer-school page (independent of the domain also being blocked).
- **University of Maastricht** — official_url is a third-party aggregator (summerschoolsineurope.eu),
  not the university's own site. This pass located and confirms the real one:
  `https://www.maastrichtsummerschool.nl/courses/` — no deadline stated there either, but this
  resolves the "abandoned, no clean URL" gap the 107-row bulk task explicitly left open for this same
  row. Not staged as an official_url correction here (out of scope), but the clean URL is now on
  record for whoever next runs a URL-fix pass.
- **Search-snippet unreliability, caught twice**: Barnard/Athena and Georgetown both had search
  snippets claiming a flat "April 15" deadline; neither real page said any such thing (Barnard's said
  Dec 1 *open* date, Georgetown's said May 15/31 with no year attached). Both correctly discarded —
  exactly why snippets are never cited as sources here.
- **UK Youth Parliament** — page's own stated term length (1 year, "April 2026 to March 2027")
  conflicts with the stored description's "Two-year terms." Flagged, not resolved.
- Two rows (Parsons' two New School domains) disagree with each other on stale prior-cycle deadline
  numbers — a data-quality issue on the organizer's own site, not ours to fix.

## What's not done, named rather than silently skipped

- **The 106 non-staged rows were not retried with an alternate access path or a different taxonomy
  read.** Several of the 28 Category D rows are plausibly resolvable with different tooling.
- **Columbia Spring Immersion Program's underlying official_url identity question was not resolved**
  — flagged twice now (unverified-cycle task, this task), still open.
- **The Category B schema question (a `deadline_note` field or child rows) was not designed or
  proposed as a concrete migration** — recommendation only, matching the 2026-09-02 doc's own stance.
- **New/soft blocked domains (fordham.edu, girlup.org, ie.edu) were not retried with alternate
  tooling** — recorded as blocks, not chased further, per the standing no-bypass rule.
- **Maastricht's corrected official_url was not applied** — supplied as a lead only.

## Gates

Docs + SQL only — `git status` confirms no source, schema, migration, or test file touched in this
worktree. Nothing for lint/typecheck/test/build to gate against; the actual gate here was the live
begin/rollback dry-run against the Supabase connector (project `qtcvcflzxbuagvvwahhu`), confirmed
against the exact 5-statement file that was committed, with a follow-up read-only query confirming
`deadline IS NULL` for all 5 rows again post-rollback before this file was written.
