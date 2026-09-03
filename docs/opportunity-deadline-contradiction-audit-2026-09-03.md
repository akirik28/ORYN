# Opportunity deadline contradiction audit — 2026-09-03

Scope: every `active` opportunity carrying a non-null `deadline` — the minority the
[homepage-strip measurement](homepage-strip-top5-quality-2026-09-03.md) identified (26% of
the catalogue, 94 of 366 rows) — checked against what that same row's own `description`
says about dates. **Every one of the 94 was read in full, not sampled and not
pattern-matched.** Regex over free text was deliberately not used to derive a verdict — dates
in this corpus appear as prose, in different formats and structures ("scripts uploaded
2027-03-19", "closes November 11, 2026", "next cycle not yet posted"), and a pattern search
would both over-match structure that isn't actually a corroborating claim and under-match
phrasing that is. Doc + staged SQL only — nothing below has been applied. No writes.

## Method

- **Source**: `oryn-qa-scratch`, `opportunities` table, `status = 'active' AND deadline IS
  NOT NULL` — 94 rows, read via SQL this session (`id, title, organization, deadline,
  cycle_status, description` — the full `description` column, not the 200-character
  snippet used in the prior homepage-strip pass, since a truncated snippet can cut off
  exactly the sentence that would settle the verdict).
- **Buckets**, exactly as assigned: **Contradicted** (the description says no date is
  published, says the evidence doesn't support one, or names dates that don't match what's
  stored), **Unsupported** (nothing in the description corroborates or contradicts — most
  descriptions don't discuss the application deadline at all, describing program content
  instead), **Corroborated** (the description names the same date, or the same date pattern,
  as what's stored).
- Full set was hand-readable at 94 rows — no sampling was needed.

## Result

| Bucket | Count | % |
|---|---|---|
| **Contradicted** | **12** | 12.8% |
| Unsupported | 54 | 57.4% |
| Corroborated | 28 | 29.8% |

## Contradicted (12) — staged corrections below

For every one of these 12, the row's own `description` affirmatively undercuts its own
`deadline` value — either stating no date was found/published, stating the deadline was
deliberately left unresearched, stating the only evidence on file is stale, or naming dates
that don't match what's stored. **None of the 12 has an alternate, description-confirmed
date to substitute** — so per instruction, every proposed fix is a null, not a guess.

1. **Baltic Sea Philosophy Essay Event** (`7d573141`) — deadline `2026-09-24`. Description:
   *"Most recent confirmed cycle (2025) completed Nov 2025; 2026 cycle not yet announced as
   of verification."*
2. **Blue Ocean Competition** (`cb4a1030`) — deadline `2027-02-21`. Description: *"Site
   invites registration for the next cycle but no deadline/dates published yet."* (Already
   flagged in the homepage-strip doc; repeated here for completeness of this audit.)
3. **BMO Round 1** (`f6dbce16`) — deadline `2026-11-19`. Description: *"Deadline not yet
   researched — deliberately left unset rather than guessed."* The strongest case in this
   set: the description states in its own words that null was the deliberate original
   choice. Something wrote a date into this field after that sentence was written.
4. **BMO Round 2** (`e5a8555d`) — deadline `2027-01-21`. Same sentence, verbatim, as Round 1.
5. **BrUMO (Brown University Math Olympiad)** (`6f0daac1`) — deadline `2026-02-15`,
   `cycle_status: closed`. Description: *"exact next-cycle dates not confirmed from the
   fetched page."*
6. **GENIUS Olympiad** (`27274e04`) — deadline `2026-03-07`, **`cycle_status:
   date_not_announced`**. Description: *"2026 cycle closed (awardees announced); 2027 not
   yet announced."* The stored value is last cycle's already-closed date, sitting in a field
   every consumer (deadline engine, dashboard, digest) reads as the next actionable one —
   `cycle_status` already says the honest thing here; `deadline` doesn't yet agree with it.
7. **International Public Policy Forum (IPPF)** (`bc303473`) — deadline `2026-10-13`.
   Description: *"the qualifying-essay deadline was not yet posted at verification."*
8. **Sabancı University Summer School** (`1d4f5e60`) — deadline `2026-08-01`. Description:
   *"the fetched page snippet did not include current-cycle date evidence."*
9. **The Rockefeller University SSRP** (`2bbea7da`) — deadline `2026-01-02`. Description
   names only a 2024 recommendation-letter date (Jan 8, 2024) as *"from a past cycle — check
   the official page for the current year's schedule."* No 2026 date is named anywhere in
   the description; `2026-01-02` has no stated origin.
10. **University of Notre Dame Pre-College: Summer Scholars** (`445f2003`) — deadline
    `2027-02-17`. Description: *"the fetched page noted only that applications go live
    'mid-October', which does not on its own confirm 2026 program dates."*
11. **World Wildlife Day International Youth Art Contest** (`13d9416e`) — deadline
    `2026-02-01`. Description: *"exact submission deadline not confirmed from captured
    evidence."*
12. **Zero Robotics** (`8bb401fa`) — deadline `2026-05-22`. Description names two other 2026
    dates instead — *"Both 2026 cycles (High School Feb, Middle School Aug) have already
    concluded"* — neither of which is May. The stored value doesn't match either date the
    description actually names.

### Staged SQL — not applied, founder runs directly

Full UUIDs below are the exact ids returned by this audit's own query (`select id, title,
organization, deadline, cycle_status, description from public.opportunities where
status='active' and deadline is not null`) — not reconstructed or re-fetched separately, so
there is no id/title matching step for the founder to trust; each line is checkable against
its own title comment.

```sql
-- Opportunity deadline contradiction audit, 2026-09-03. Each row's own description contradicts
-- its stored deadline (see docs/opportunity-deadline-contradiction-audit-2026-09-03.md for the
-- quoted evidence per row). No alternate date is confirmed by any description, so every fix is
-- a null, not a guess -- an absent deadline is honest; a wrong one is not.
-- STAGED ONLY. Not executed by this session. Review and run manually.

update public.opportunities set deadline = null where id = '7d573141-bca6-459d-a206-43aebae178c4'; -- Baltic Sea Philosophy Essay Event (BSPEE)
update public.opportunities set deadline = null where id = 'cb4a1030-d035-4c1f-8579-37c458a88b0e'; -- Blue Ocean Competition
update public.opportunities set deadline = null where id = 'f6dbce16-a6cb-4e8c-9ebd-01a57489879f'; -- BMO Round 1
update public.opportunities set deadline = null where id = 'e5a8555d-7e5b-4fd4-8406-812efbe1de91'; -- BMO Round 2
update public.opportunities set deadline = null where id = '6f0daac1-7f07-45da-a330-dc900be73ab9'; -- BrUMO (Brown University Math Olympiad)
update public.opportunities set deadline = null where id = '27274e04-50f4-4e82-9b7e-c5dbaace4bbe'; -- GENIUS Olympiad
update public.opportunities set deadline = null where id = 'bc303473-ba94-41e4-9b3d-038804858a8c'; -- International Public Policy Forum (IPPF)
update public.opportunities set deadline = null where id = '1d4f5e60-8fe3-4b1a-a7d6-acb29b124e3c'; -- Sabancı University Summer School (Lise Yaz Okulu)
update public.opportunities set deadline = null where id = '2bbea7da-09bb-4eca-b46b-c3b5363e3b92'; -- The Rockefeller University Summer Science Research Program (SSRP)
update public.opportunities set deadline = null where id = '445f2003-1b9c-4cc9-bc63-22e65e7d8f85'; -- University of Notre Dame Pre-College: Summer Scholars
update public.opportunities set deadline = null where id = '13d9416e-d2a7-4f55-b851-7d76acab2cb3'; -- World Wildlife Day International Youth Art Contest
update public.opportunities set deadline = null where id = '8bb401fa-d53f-45ae-8968-241ef641ccf4'; -- Zero Robotics
```

## Two flagged separately — not corrected, not in the 12

- **Summer Science Program (SSP)** (`ae174625`) — deadline `2027-01-30`, `cycle_status:
  date_not_announced`. Kept in **Corroborated**, not Contradicted: the description names the
  same date (*"2027 international deadline (Jan 30) per secondary source, not yet
  independently re-confirmed"*) rather than disclaiming one — the value isn't unsupported,
  it's weakly sourced. Nulling it would discard real, if imperfect, evidence. Worth a
  re-verification pass (confirm on the official page), not a null.
- **GENIUS Olympiad** is also the second row where `cycle_status = 'date_not_announced'`
  coexists with a non-null `deadline` (see #6 above) — both of this corpus's two
  `date_not_announced` rows carry this exact tension. Worth checking as a class if
  `date_not_announced` is meant to imply `deadline IS NULL` anywhere downstream — it
  currently doesn't, on this evidence.

## Two patterns worth naming beyond the three buckets

**Rolling-admission programs modeled as a single fixed deadline.** Two Corroborated-bucket
rows (**Inspirit AI Scholars**, **Polygence**) describe genuinely rolling or continuous
admissions (*"Rolling admissions, limited seats"*; *"we offer start dates throughout the
year"*) while still carrying one specific stored `deadline`. Not wrong enough to call
Contradicted — no claim in the description conflicts with the stored date — but a single
date doesn't represent what the program's own text describes. Contrast with two rows that
handle the identical situation correctly: **The Concord Review** explicitly documents its
recurring quarterly deadlines (Aug 1 / Nov 1 / Feb 1 / May 1) and states the stored value is
*"the next upcoming one, not a one-time cutoff"*; **Waterloo Mathematics and Computing
Contests** explicitly documents that it's an umbrella record for 9 contests and the stored
date is *"the earliest 2026/27-cycle registration deadline."* Both show the fix is cheap —
a sentence of explanation — and two rows in this same 94-row set already do it. Not staging
a correction for Inspirit AI/Polygence (no wrong value to null), just naming the gap.

**Self-correction already works when the research is done properly.** Two positive examples
worth citing precisely because this audit is otherwise a list of problems: **University of
Edinburgh Pre-University Summer School**'s description says its own re-check *"superseded
stale 2023/2024 dates that had appeared in earlier source material"* with a confirmed
2026-05-19 value; **Conrad Challenge**'s description names the same Oct 29/30 window as the
stored deadline while proactively flagging a 1-day discrepancy between two official pages.
Both are exactly what the 12 Contradicted rows should look like once corrected — not
silence, a dated, sourced correction.

## Unsupported (54) — not itemized

The majority bucket. In each of these 54, the description simply describes the program
(content, cost, structure, eligibility) without naming an application-deadline date at all —
not evidence the stored `deadline` is wrong, just nothing on file that confirms it either.
Not listed individually here since none require action; available on request if useful for a
future targeted re-verification pass (e.g., prioritizing the ones nearest in time, since an
unsupported near-term deadline carries more downside than an unsupported one a year out).

## Corroborated (28) — not itemized beyond the two pattern call-outs above

The description names the same date (or, for the UKMT competitions — 10 of the 28, the other
2 UKMT rows in this corpus being BMO Round 1/2 in the Contradicted bucket above — the same
"scripts uploaded" date the multi-stage entry process resolves to) as what's stored. No
action needed; these are the rows doing exactly what this system is supposed to do.

## Bottom line

**Blue Ocean wasn't alone — 12 of 94 deadline-bearing rows (13%) contradict their own
description, concentrated in exactly the field the deadline engine, the dashboard, and (per
the founder's own AI-safety rule) the advisor are each forbidden from fabricating.** The
sharpest cases aren't ambiguous: two rows (BMO Round 1 and Round 2) carry a description that
says, in the record's own words, the deadline was *deliberately left unset* — and a date is
there anyway. That's not a stale value, that's evidence something wrote over a deliberate
null. The other 10 range from "no evidence found" to "evidence points somewhere else
entirely" (Zero Robotics). Proposed fix for all 12 is uniform and conservative: null, not a
replacement guess — the founder can review and run the staged SQL above directly.
