# The `under_review` pool — third pass, what's new since the last one

CEO's dispatch after step 3 activated 78 of 112 `under_review` rows, leaving 34 (at the
time she wrote it): why is each remaining row stuck, and is `under_review` a working state
or a graveyard. Read-only against `oryn-qa-scratch` throughout, no writes.

**This has already been investigated twice, thoroughly, and is already on `main`** —
`docs/under-review-pool-audit-2026-09-03.md` (oryn-6e, citing an even earlier
`docs/known-issues.md` pass from 2026-09-01) already answered the pipeline question at the
code level, already traced the population's origin to two import batches, already
individually resolved the small "direct fetch" sub-batch (3 of 5 promotable, staged as
SQL; 2 — Team Maths Challenge (Junior) and Athena Summer Innovation Institute — genuinely
unresolvable, with real per-page findings), and already recommended the same fix this pass
would otherwise propose from scratch. **This document does not re-derive any of that** —
it cites it, confirms what's changed since, and covers only what's genuinely new: the
population moved again, two more rows are held for a reason that doc couldn't have known
about, and a spot-check of the still-unexamined remainder caught a real mistake before it
became a recommendation.

## The population moved again, and moved correctly

**27 rows are `under_review` right now, not the 34 in CEO's dispatch.** Confirmed live.
The gap is exactly the 7 precollege stubs from the earlier activation check (Cornell,
Brown, University of Toronto, University of Miami, University of Pennsylvania, Columbia:
New York NY, Tulane) — all seven are now `status: active`, matching the verdict that check
already reached for each of them. Noted rather than silently worked around, since the
dispatch's own number was accurate when written and isn't now.

Of the cited doc's 3 staged UKMT promotions (BMO Round 1, BMO Round 2, Senior Team
Mathematical Challenge) — none of the three appear in the current 27. That SQL was staged,
not applied, as of that document's own writing; either it has since been applied, or
those three cleared some other way. Either way, the population reflects it.

## The pipeline finding, reconfirmed a third time, not re-argued

Independently grepped every `under_review` reference in `lib/`, `scripts/`, `app/` before
reading the cited doc, and reached the identical conclusion it already reached and
verified against `pg_proc`: no scheduled job, no automated transition, and the one admin
action touching `opportunities.status` (`setOpportunityDisabled`) is a disable/reactivate
toggle whose only caller never invokes it on an `under_review` row. **The only exit any
record has ever had is a human hand-writing a targeted `UPDATE` naming specific ids** —
step 3's 78, the precollege-stub check's 7, the cited doc's 3 (if applied). Three
independent passes, three different sessions, one answer. The cited doc's own
recommendation — an audited "Approve" action on the existing admin moderation list, same
shape as the disable action — is the right fix and remains unbuilt; this pass has nothing
to add to that beyond confirming it a third time.

## What's actually new in the current 27

**2 rows this pass can explain that the cited doc couldn't have** — they weren't held yet
when it was written:
- **Harvard University (MA, USA)** and **University of Chicago Chicago, IL** — CEO's own
  holds from the precollege-stub activation check, later than the cited doc. Not
  re-litigated: both duplicate an already-active sibling (Harvard Secondary School Program;
  the active "Pre-College Summer Programs" bundle) and are correctly parked pending the
  founder's decision on which record survives.

**2 rows the cited doc already resolved, present in both lists, not re-investigated**:
Team Maths Challenge (Junior) and Athena Summer Innovation Institute — that document's own
per-page findings (a UKMT page showing a stale 2025-26 cycle against three fresh 2026-27
siblings; Barnard's page carrying no dates and a follow-up link that 404s) still hold;
nothing here supersedes them.

**4 rows with a specific, real reason, not covered by the cited doc's scope** (it focused
on the ~107-row Drive-corpus batch and the 5-row direct-fetch batch specifically; these
four sit outside both):
- **Microsoft Imagine Cup Junior** — its own stored record already documents why:
  *"The database's prior official_url now resolves to the unrelated adult/college Imagine
  Cup competition, not Junior. The dedicated Junior URL returns 'resource unavailable',
  Junior is absent from the main Imagine Cup site."* `verification_state: conflicting`,
  consistent with a tier that may no longer run.
- **Vesalius College: Brussels, Belgium** — its own `organization` field states
  *"(institutional successor unclear)"*, a flag already in the row.
- **University of Exeter, United Kingdom** — established earlier tonight
  (`03-firsat-kayit-duzeltmeleri-2026-09-03.sql`'s closing section): stated page 404s, no
  live page matching the described content found, deliberately left out of any SQL rather
  than guessed.
- **Duke University Talent Identification Program 2024** — established earlier tonight:
  untouched on the founder's own explicit instruction, since its real successor (Duke
  Pre-College Programs) is already active under a different brand and renaming the
  identity is his call, not a data fix.

**19 remain in the ~107-row Drive-corpus batch the cited doc explicitly declined to
individually verify**, calling that "a distinct, comparably-sized next package" —
consistent with what this pass found: nothing marks these 19 as bad, nothing has looked at
them since the 2026-08-18 bulk import either. This is that same still-open backlog, now
smaller (107 → 19 in this pool specifically, the rest already resolved elsewhere or
activated), not a new discovery.

**Tested whether any of the 19 could be safely activated from evidence already in hand
rather than assuming the whole bucket needs fresh research — and the one candidate that
looked safest was not.** Google Computer Science Institute's `official_url` was already
corrected earlier tonight (from a dead NEIU page to Google's own
`buildyourfuture.withgoogle.com` page). Read the full row before treating that fix as
sufficient: the *description* is still the old, unrefreshed copy — it still names a
`neiu.edu` contact and links to the same NEIU extension page confirmed dead earlier
tonight — and describes eligibility as **"rising first-year college students,"** genuinely
ambiguous for this product (current high-school seniors on their way to college, or
students already admitted and past that point — never resolved either way). One field
being fixed did not make the row ready. Worth naming precisely because it's the same
lesson as tonight's `eligible_grades` sweep in miniature: a partial fix can look complete
if the rest of the row isn't reread before acting on it.

**One possible overlap, flagged not resolved**: "International Genetically Engineered
Machine Competition (iGEM)" (root `competition.igem.org`) sits alongside the already-active
"iGEM High School Competition" (`competition.igem.org/high-school`). Whether this is the
same competition's general entry point or genuinely covered already by the high-school-
specific active row needs a read this pass didn't have room for.

## What's staged

**Nothing new.** The cited doc's 3-row UKMT promotion SQL already exists
(`data/research/opportunities/under_review_promotions_2026-09-03.sql`) and this pass adds
nothing to it — every row this pass could resolve either already has a specific reason to
stay parked (documented above or in the cited doc) or sits in the 19-row backlog that a
single partial spot-check (Google CSSI) showed isn't safe to rubber-stamp. If the 19 are
worth a dedicated pass, that's sized the same way tonight's other research tasks were —
measured first, not assumed — and is a separate package.

## Answer to the actual question

**Structurally a graveyard, confirmed a third time by three independent sessions reading
the same code and reaching the same conclusion.** The fix the cited doc already named — an
audited approve action on the existing moderation UI — is still the right one and is still
unbuilt. Nothing in tonight's population movement (34 → 27, mostly via hand-picked
activations) changes that; it's further evidence of the pattern, not a counterexample to
it — every exit was still a person naming specific rows by hand.
