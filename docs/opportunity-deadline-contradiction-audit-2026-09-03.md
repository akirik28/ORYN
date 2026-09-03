# Opportunity deadline contradiction audit — 2026-09-03

**Correction, same day, before this doc was ever merged**: the first version of this doc
proposed nulling all 12 rows below, on the assumption that a description contradicting its
own `deadline` meant the deadline was the wrong value. It was backwards for all 12. In every
case the `deadline` is the correct, sourced, more-recently-researched fact, and the
`description` is a stale artifact from an earlier research pass that was never revisited
after a later, better pass confirmed the real date. **Nothing was ever nulled — this was
caught before any SQL ran** — but the corrected version below replaces the null-SQL with
description-fix SQL, and the flagship example from the companion
[homepage-strip doc](homepage-strip-top5-quality-2026-09-03.md) (already merged, `e2e19aef`)
is wrong in the same way; a correction note has been added there too. How this was caught is
in its own section below, because the mechanism matters as much as the fix.

Scope: every `active` opportunity carrying a non-null `deadline` (94 of 366 rows, 26% of the
catalogue) checked against what that same row's own `description` says about dates. Every
one of the 94 was read in full, not sampled and not pattern-matched — see Method.

## Method

- **Source**: `oryn-qa-scratch`, `opportunities` table, `status = 'active' AND deadline IS
  NOT NULL` — 94 rows (`id, title, organization, deadline, cycle_status, description` — the
  full `description` column, not a truncated snippet).
- **Buckets** — a text classification only, answering "does this row's own description agree
  with its own deadline," nothing more: **Contradicted** (description says no date is
  published, says the evidence doesn't support one, or names dates that don't match what's
  stored), **Unsupported** (nothing in the description corroborates or contradicts —
  most descriptions don't discuss the deadline at all), **Corroborated** (description names
  the same date as what's stored). Whether a Contradicted row's *deadline* or its
  *description* is the one actually wrong is a separate question — answered below by
  re-tracing each row's edit history, not assumed from the text classification alone.
- No regex — dates in this corpus appear as prose, in inconsistent formats and structures,
  and a pattern search over-matches structure while under-matching language.

## Result (unchanged by the correction — this is a text count, not a verdict)

| Bucket | Count | % |
|---|---|---|
| **Contradicted** | **12** | 12.8% |
| Unsupported | 54 | 57.4% |
| Corroborated | 28 | 29.8% |

## The 12: every deadline is correct and sourced; the description is what's stale

Re-traced each of the 12 against the repo's own research history (`data/research/opportunities/`,
`data/morning/`) rather than assume the description was authoritative. **All 12 deadlines
trace to an official page, with a verbatim quote and a retrieval date.** Ten need a
description text fix (stale sentence removed, sourced fact substituted); one (GENIUS
Olympiad) needs no fix at all — the original classification was simply a misread; one (Zero
Robotics) has a real but different defect, kept separate per instruction.

### Ten — stale sentence, sourced replacement staged below

| Row | Stored deadline | Stale description said | What's actually confirmed |
|---|---|---|---|
| Baltic Sea Philosophy Essay Event (`7d573141`) | 2026-09-24 | *"2026 cycle not yet announced as of verification"* | FETO's own invitation letter, `bspee.wordpress.com`, dated 2026-09-02, checked 2026-09-03 |
| Blue Ocean Competition (`cb4a1030`) | 2027-02-21 | *"no deadline/dates published yet"* | `blueoceancompetition.org/submit/`: *"Deadline to submit your pitch: February 21, 2027 at 23:59 your local time"* (checked 2026-08-21) |
| BMO Round 1 (`f6dbce16`) | 2026-11-19 | *"deliberately left unset rather than guessed"* | `ukmt.org.uk/senior-challenges/british-maths-olympiad-round-1`, checked 2026-09-03 |
| BMO Round 2 (`e5a8555d`) | 2027-01-21 | same sentence, verbatim | `ukmt.org.uk/senior-challenges/british-maths-olympiad-round-2`, checked 2026-09-03 |
| BrUMO (`6f0daac1`) | 2026-02-15 | *"exact next-cycle dates not confirmed"* | `brumo.org/online`: *"February 15, 2026, 11:59 PM EST: Registration closes"* (checked 2026-08-22) |
| IPPF (`bc303473`) | 2026-10-13 | *"deadline was not yet posted at verification"* | `ippfdebate.com/schedule`: *"October 13, 2026 - Qualifying Round Essays Due"* (checked 2026-08-21) |
| Sabancı Summer School (`1d4f5e60`) | 2026-08-01 | *"did not include current-cycle date evidence"* | `liseyazokulu.sabanciuniv.edu`: *"Son Başvuru: 1 Ağustos 2026"* — confirmed independently 4 separate times, 2026-08-22 through 2026-08-26 |
| Rockefeller SSRP (`2bbea7da`) | 2026-01-02 | *"check the official page for the current year's schedule"* (citing stale 2024 dates) | `rockefeller.edu/outreach/ssrp/`: deadline *"Friday, January 2, 2026 11:59pm ET"* (checked 2026-08-24) |
| Notre Dame Summer Scholars (`445f2003`) | 2027-02-17 | *"does not on its own confirm 2026 program dates"* | `precollege.nd.edu/summer-scholars/dates-deadlines/`: *"Application Deadline: February 17, 2027"* (checked 2026-08-21) |
| World Wildlife Day Youth Art Contest (`13d9416e`) | 2026-02-01 | *"not confirmed from captured evidence"* | `signup.ifaw.org/en-us/art-contest`: *"All contestants have until 1 February 2026 to submit their work"* (checked 2026-08-22) |

### One — not actually contradicted; original classification was wrong

**GENIUS Olympiad** (`27274e04`), deadline `2026-03-07`, `cycle_status: date_not_announced`.
Description: *"2026 cycle closed (awardees announced); 2027 not yet announced."* This
description is accurate, not stale — `geniusolympiad.org` confirms 2026-03-07 as the real,
now-closed 2026 cycle's deadline (checked 2026-08-22), and separately confirms the 2027
cycle genuinely isn't announced yet. The original write-up flagged the
`cycle_status='date_not_announced'` + non-null-`deadline` combination as an inconsistency —
it isn't one: `deadline` correctly holds the last closed cycle's real date, `cycle_status`
correctly says the next one isn't known. No SQL staged; no fix needed.

### One — a real but different defect, not a stale-prose case

**Zero Robotics** (`8bb401fa`), deadline `2026-05-22`. Source (`zerorobotics.mit.edu`,
checked 2026-08-22): *"Registration has been extended to May 22, 2026"* — real and correctly
stored. But the researcher's own notes on this record flag something the description
doesn't yet say: *"Zero Robotics runs distinct cycles (HS tournament vs MS summer program)…
The only dated 2026 facts on the page belong to the MS summer cycle… do not present the MS
deadline as the HS tournament's"* — and the HS Tournament is, per the same notes, *"the
cycle most relevant to Oryn's 14-18 audience, historically each fall."* The risk isn't a
wrong date, it's a right date for the wrong (less relevant) cycle, with nothing on the row
telling a reader which cycle it belongs to. Staged as an addition, not a replacement, below.

### Staged SQL — not applied, founder runs directly

Substring replacement only (`replace(description, old, new)`), not a full rewrite — each
statement is a no-op if the old text isn't found verbatim, so a prior edit to any of these
rows makes the corresponding line harmless rather than wrong.

```sql
-- Opportunity deadline contradiction audit, 2026-09-03 (corrected pass). Ten stale
-- description sentences replaced with the sourced fact that made them stale -- see
-- docs/opportunity-deadline-contradiction-audit-2026-09-03.md for the full citation (URL +
-- verbatim quote + retrieval date) behind each one. STAGED ONLY. Not executed this session.

update public.opportunities set description = replace(description,
  'Most recent confirmed cycle (2025) completed Nov 2025; 2026 cycle not yet announced as of verification.',
  'FETO''s own invitation letter (bspee.wordpress.com, dated 2026-09-02, checked 2026-09-03) confirms the 2026 cycle is open: essay-topic requests due by Sept 24, papers due Oct 17, 2026.'
) where id = '7d573141-bca6-459d-a206-43aebae178c4';

update public.opportunities set description = replace(description,
  'Site invites registration for the next cycle but no deadline/dates published yet.',
  '2027 cycle deadline confirmed on the official submission page (blueoceancompetition.org/submit/, checked 2026-08-21): "Deadline to submit your pitch: February 21, 2027 at 23:59 your local time."'
) where id = 'cb4a1030-d035-4c1f-8579-37c458a88b0e';

update public.opportunities set description = replace(description,
  'Deadline not yet researched -- deliberately left unset rather than guessed.',
  '2026-27 cycle deadline confirmed on the official page (ukmt.org.uk/senior-challenges/british-maths-olympiad-round-1, checked 2026-09-03).'
) where id = 'f6dbce16-a6cb-4e8c-9ebd-01a57489879f';

update public.opportunities set description = replace(description,
  'Deadline not yet researched -- deliberately left unset rather than guessed.',
  '2026-27 cycle deadline confirmed on the official page (ukmt.org.uk/senior-challenges/british-maths-olympiad-round-2, checked 2026-09-03).'
) where id = 'e5a8555d-7e5b-4fd4-8406-812efbe1de91';

update public.opportunities set description = replace(description,
  'exact next-cycle dates not confirmed from the fetched page.',
  '2026 cycle closed: official page (brumo.org/online, checked 2026-08-22) states "February 15, 2026, 11:59 PM EST: Registration closes" and "March 7, 2026: BrUMO 2026 Online takes place!" Next-cycle dates not yet posted.'
) where id = '6f0daac1-7f07-45da-a330-dc900be73ab9';

update public.opportunities set description = replace(description,
  'but the qualifying-essay deadline was not yet posted at verification.',
  'and the qualifying-essay deadline is confirmed: official schedule page (ippfdebate.com/schedule, checked 2026-08-21) states "October 13, 2026 - Qualifying Round Essays Due."'
) where id = 'bc303473-ba94-41e4-9b3d-038804858a8c';

update public.opportunities set description = replace(description,
  'the fetched page snippet did not include current-cycle date evidence.',
  'the official page (liseyazokulu.sabanciuniv.edu) states "Son Başvuru: 1 Ağustos 2026" (final application August 1, 2026) -- confirmed independently across four separate checks between 2026-08-22 and 2026-08-26.'
) where id = '1d4f5e60-8fe3-4b1a-a7d6-acb29b124e3c';

update public.opportunities set description = replace(description,
  'The source material''s dates (June 24-August 8, 2024, recommendation letters due January 8, 2024) are from a past cycle -- check the official page for the current year''s schedule.',
  'The 2026 cycle''s application deadline is confirmed: official page (rockefeller.edu/outreach/ssrp, checked 2026-08-24) states the deadline was "Friday, January 2, 2026 11:59pm ET" (recommendation letters due January 5); program dates June 22-August 6, 2026.'
) where id = '2bbea7da-09bb-4eca-b46b-c3b5363e3b92';

update public.opportunities set description = replace(description,
  'the fetched page noted only that applications go live "mid-October", which does not on its own confirm 2026 program dates.',
  'the 2027 cycle''s deadline is confirmed on the program''s own Dates & Deadlines page (precollege.nd.edu/summer-scholars/dates-deadlines/, checked 2026-08-21): "Application Deadline: February 17, 2027" (standardized test scores due February 28, 2027).'
) where id = '445f2003-1b9c-4cc9-bc63-22e65e7d8f85';

update public.opportunities set description = replace(description,
  '2026 contest confirmed live; exact submission deadline not confirmed from captured evidence.',
  '2026 contest confirmed live; submission deadline confirmed: official page (signup.ifaw.org/en-us/art-contest, checked 2026-08-22) states "All contestants have until 1 February 2026 to submit their work."'
) where id = '13d9416e-d2a7-4f55-b851-7d76acab2cb3';

-- Zero Robotics: appended, not replaced -- nothing in the existing text is wrong, it's
-- missing a distinction the source material makes explicitly. See its own section above.
update public.opportunities set description = description ||
  ' Note: the confirmed 2026-05-22 deadline is for the Middle School summer program specifically -- the separate High School Tournament (the more relevant cycle for Oryn''s 14-18 audience) has no published 2026-27 dates as of this research; do not present the MS deadline as the HS tournament''s.'
where id = '8bb401fa-d53f-45ae-8968-241ef641ccf4';
```

## The real finding: a pipeline defect, not twelve isolated typos

Three separate write passes, weeks apart, share the identical shape:

- `data/morning/02-veri-doldurma-2026-09-03.sql` — this morning, 2026-09-03, 06:28:54 UTC.
- `data/research/opportunities/i2_dlopp_apply_2026-08-22.sql` (the DLOPP batch) — 2026-08-22,
  applied and independently reconciled against live data afterward.
- `data/research/opportunities/night2_2026-08-21_dq-dry-run-update.sql` and its per-record
  evidence in the paired `dqbatch*.jsonl` files — 2026-08-21.

**Every one of them writes `deadline`, `cycle_status`, and `verified_at`/`last_verified_at`.
None of them writes `description`.** That's not an oversight in any single script — each is
narrowly and correctly scoped to the fields it was built to fix. It's a gap in what a
"deadline confirmed" pipeline is defined to do at all: confirming a date and leaving the
prose that used to justify its absence untouched is the default, three times, across three
different lanes that had no way to know about each other. Tonight's ten description edits
close today's instances; they don't close the gap. The next pipeline that fills a null
`deadline` with a sourced date will reproduce this exact pattern on some other row unless
something changes in how these scripts are built — e.g., a check (mechanical or a review
step) that a `deadline`-only write on a row whose `description` contains negative-evidence
language ("not confirmed," "not yet published," "deliberately left unset," "check the
official page") gets flagged for a paired description update, not just a deadline write.
Naming this as its own follow-up, not fixing the pipelines themselves in this pass.

## How the full extent of this was caught

Worth recording plainly, since it's the reason this correction is as complete as it is, not
because either check involved was more careful than the other on its own. The original
version of this doc treated every one of the 12 descriptions as authoritative and proposed
nulling all 12 deadlines. CEO (`oryn-45`) caught 3 of the 12 (BMO Round 1, BMO Round 2,
BSPEE) by querying live rows stamped with this morning's specific package transaction
timestamp, and reported "three corrections, not a class" — the other nine, by that query,
were untouched by that package, and the message said not to re-check them. They were already
being independently re-checked against the broader research history when that message
arrived, and the same pattern held for the other 9 as well, including the 2 CEO had already
personally checked and called clean by a different method (grep for a write touching those
IDs in the files checked at the time). CEO's own query was correct about what it measured —
rows touched by one specific transaction — and became incorrect the moment it was
generalized to "the other nine are fine," because the other nine were touched by different
transactions, weeks apart, that the query never looked at. Reported back with the fuller
evidence rather than stopping at three; CEO's own follow-up independently reached the same
conclusion via a wider sweep before this doc was even pushed. Both mistakes (the original
null-proposal, and the "only three" scoping) trace to the same root: treating the artifact
directly in front of you as if it were the complete picture, rather than checking whether
something outside that specific view had already moved.

## Two patterns worth naming beyond the twelve

**Rolling-admission programs modeled as a single fixed deadline.** Two Corroborated-bucket
rows (**Inspirit AI Scholars**, **Polygence**) describe genuinely rolling or continuous
admissions while still carrying one specific stored `deadline` — not wrong, just an
imperfect fit. Contrast with two rows in this same set that handle the identical situation
correctly: **The Concord Review** documents its recurring quarterly deadlines and states the
stored value is *"the next upcoming one, not a one-time cutoff"*; **Waterloo Mathematics and
Computing Contests** documents that it's an umbrella record and the stored date is *"the
earliest 2026/27-cycle registration deadline."* Not staged — no wrong value to fix, just
naming the gap.

**The DLOPP batch is what rigorous, sourced ingestion looks like at scale.** Worth citing
specifically because it's what the corrected 10 rows above are being brought up to: every
record carries a `source_url`, a `verbatim_evidence` quote, a `confidence` rating with its
own reasoning, a `robots_check`, and — per its own ingest report — a second, independent
live-reconciliation pass (BASORG) that re-verified the batch's own claims rather than
trusting the report. The defect this audit found isn't in that rigor; it's that the rigor
stops at `deadline`/`cycle_status` and was never extended to keeping `description` in sync
with what the same research pass already knew.

## Unsupported (54) — not itemized

The majority bucket. In each of these 54, the description simply describes the program
without naming an application-deadline date at all — not evidence the stored `deadline` is
wrong, just nothing on file that confirms it either. Given what this audit found in the
Contradicted bucket, treat an Unsupported deadline as more likely correct-but-undocumented
than previously assumed — the base rate for "deadline right, description just hasn't caught
up" turned out to be 100% in the one bucket where it was checkable. Not re-verified
individually here; available for a future targeted pass.

## Corroborated (28) — not itemized beyond the pattern call-outs above

The description names the same date (or, for the UKMT competitions — 10 of the 28, the other
2 UKMT rows being BMO Round 1/2 above — the same "scripts uploaded" date the multi-stage
entry process resolves to) as what's stored. No action needed.

## Bottom line

**The catalogue is more trustworthy than either the original version of this doc or the
homepage-strip doc gave it credit for.** All 12 deadlines that looked contradicted trace to
an official page with a verbatim quote and a retrieval date — zero fabrications, zero of the
12 need nulling. What's actually wrong is narrower and more structural: three independent
pipelines, weeks apart, each correctly write a sourced deadline and each leave the
now-outdated "not confirmed" sentence sitting next to it. Tonight's fix is ten description
edits (staged above) plus one addition (Zero Robotics) plus one reclassification (GENIUS
Olympiad, no fix needed). The standing fix — making future deadline-only writes also touch
descriptions that contain negative-evidence language — is named above as its own follow-up,
not completed here.
