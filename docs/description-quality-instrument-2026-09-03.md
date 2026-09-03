# The "35" card and the real defective-description count — measurement and proposal

CEO's brief, following oryn-11's grep-confirmed finding: the control centre's "awaiting
decision" card reads **"Hâlâ kirli fırsat açıklamaları: 35"** ("Opportunity descriptions
still contaminated: 35") and has all day, while `known-issues.md` names two much larger,
un-unioned populations (85 rows, 08-22; 51 more, 09-01). Establish the real number, decide
what the card should say, say whether it's live-queryable, and check Tier 2's 22-Aug wording
for staleness. **Measurement and proposal only — the card is unchanged, no row was written.**

## 1. What "35" actually is, read from the code rather than assumed

`lib/opportunities/contamination-cleanup-2026-09-02.ts` — a hardcoded, typed array of exactly
35 `{id, title, guardPrefix, newDescription}` entries, one specific closed batch with
human-written replacement text already prepared. The overview card's number comes from
`app/(admin)/kumanda/page.tsx`'s `pendingCleanupCount` — a live filter of *this same 35-row
array* down to rows whose stored guard still matches (currently 32; see §2). **This was never
designed to be a total.** `docs/catalog-health-actions-design-2026-09-02.md` built it as
Action 1 of four planned admin actions — "the one batch with a fix ready," not "the whole
defective-description problem." The instrument failure isn't in the arithmetic; it's that the
card's own label, `messages/tr.json`'s `"attention.pendingCleanup": "Hâlâ kirli fırsat
açıklamaları"`, makes no reference to that scope and reads as a complete claim on the one
screen built for prioritization.

**One correction to CEO's own brief, worth stating precisely rather than silently
absorbing**: the brief said "the 37-contamination set." The array has **35** entries,
confirmed by counting object literals in the source file directly (not the interface
declaration, which added a false 36th on a naive grep). Noting this because a number a
message away is exactly the kind of drift this whole task is about.

## 2. The real number — measured two ways, since they disagree and both are honest

**Method A — re-run the original detector, live, today.** The 85-row audit
(`data/audit/opportunities-description-defects-2026-08-22.md`) named four deterministic SQL
signatures (title-restate, raw URL, trailing ellipsis, institution-name title). Ran all four
against every `active` row right now, not the 2026-08-22 snapshot:

| Signature | Live count today |
|---|---|
| Title restates itself | 93 |
| Raw URL in description | 70 |
| Trailing `…` | 37 |
| Title is an institution name | 4 |
| **Any signature (deduplicated)** | **106** |

**Method B — union the three named historical passes**, matched against live status:
85-row set (2026-08-22, all 85 ids still resolve, 71 currently `active`) + 35-row cleanup set
(32 currently `active`) + the 51-row set (2026-09-01), re-derived live by its own stated
signature — same `source` batch, description length 899–900 chars — since no persisted id
list for it exists anywhere in the repo (see §4). That signature finds **50** rows today, not
51 (29 `active`, 12 `under_review`, 9 `disabled`) — one row short of the original count, most
likely one row's description length shifted by a later edit; immaterial to the shape of the
finding. Overlaps, computed directly rather than assumed: 85∩35 = 10, 85∩51 = 5, 35∩51 = 0.
**True deduplicated union: 155 rows total, 123 of them currently `active`.**

**The two methods disagree (106 vs. 123) because "defective" isn't one definition.** The
51-row family's own criterion — severely truncated at ~900 characters, missing
deadline/cost/age fields entirely — catches real, badly-thin records that don't necessarily
trip any of the four original signatures (no restated title, no raw URL, no trailing
ellipsis, title isn't an institution name — just thin). Both counts are real measurements of
real problems; neither is *the* number, because the codebase has never agreed on what
"defective" means as one predicate. That disagreement is itself part of the answer to CEO's
question 2, below.

**Either way, the shape is the same and matches CEO's own estimate almost exactly**: the card
shows 35 against a true active-and-visible population of 106–123 — **28–33%, "roughly a
quarter"** as CEO put it, now with a number under it instead of an estimate. And of that true
population, **only 10–32 rows (depending on method) have a prepared fix at all** — the large
majority, 91–96 rows, have never had replacement text written.

## 3. What the card should say — categories, not one number, but not three either

Two states are genuinely different and collapsing them either direction misleads:
- **"N ready to fix now"** — a prepared, guard-checked replacement exists; this is what today's
  35/32 already represents honestly, it just needs an honest label.
- **"M defective, no fix drafted yet"** — 91–96 rows depending on method; this is a research
  backlog, not a one-click action, and showing it next to a disabled "fix" button would be
  its own false affordance.

Recommend the card show **both counts as two lines under one heading**, not a bare number and
not two separate cards — "35 hazır, ~90 henüz araştırılmadı" (or the precise live-queried
figures) rather than either "35" alone (misleadingly total-sounding) or a single collapsed
"125" (technically more honest but erases that 35 of them are one click away, which is
real, useful, actionable information the founder should see first). Which exact method (A's
106 or B's 123) backs the second number is a real open call — recommend Method A (the live
SQL re-run) specifically because it needs no hand-maintained file and can never silently go
stale the way B's 51-row family already has (§4).

## 4. Can the panel compute this live, or does it depend on a hand-maintained file?

**Genuinely split, and the split itself is the finding CEO asked to surface.**

- **"How many are defective" is fully live-queryable, today, with zero new infrastructure.**
  Method A's four signatures are plain SQL predicates already named in an existing audit doc
  — nothing stops `getContaminationCleanupPreview`'s sibling function from running them
  directly against `opportunities` on every page load, the same way `pendingCleanupCount`
  already reads the 35-array live. This was never wired up; it isn't a hard problem, it's an
  unbuilt one.
- **"How many have a fix ready" cannot be a query, ever, structurally — writing a correct
  replacement description needs judgment a predicate can't supply.** This part of the number
  will always depend on a hand-maintained, typed list like `CONTAMINATION_CLEANUP_2026_09_02`
  growing over time as more rows get triaged. That's not a defect in the design; it's the
  actual shape of the work.
- **The 51-row set is the cautionary case, not the model.** It exists only as prose in
  `known-issues.md` — no id list was ever persisted anywhere in the repo. Re-deriving it live
  by signature (§2, Method B) got 50 of 51, close but not exact, and only because its
  criterion happened to be mechanically re-expressible after the fact. If a future
  characterization pass uses a criterion that *isn't* mechanically re-derivable (pure human
  judgment, no SQL signature), its count would be permanently unrecoverable the way this one
  almost was. Recommend: any future defect-characterization pass either commits a real id list
  (like the 85-row audit did) or states its filter as a literal SQL predicate in the doc
  itself (which the 51-row entry in `known-issues.md` came close to doing, just without
  running it as a query at the time) — prose describing a shape, with no reproducible query
  or id list behind it, is a population nobody can ever exactly recount again.

## 5. Tier 2's 22-August wording — checked against today's catalog, not re-argued

*"Do not bulk-retire or bulk-rewrite this set without a founder decision"*
(`known-issues.md`, Tier 2, ~79 rows at the time). **The rule itself still holds and hasn't
been violated** — nothing in the live data shows a bulk action against this population; every
status change found (Tier 1's individually-resolved 6, the 51-set's individually-checked 9
disabled) was a named, per-row decision, not a batch one. **What's stale is the number sitting
next to the rule, not the rule.** Tier 2 was sized against 271 active rows on 2026-08-22; the
active catalog is 366 today, and (per §2) the true defective-and-active population it
describes is 106–123, not ~79 or ~85. The rule doesn't need new wording — "without a founder
decision" is still exactly correct — but a reader seeing "~79 rows" next to it today would
undercount the actual stakes of that decision by roughly a third to a half. Recommend the
number be replaced with a pointer to a live re-count (§4's Method A) rather than a second
hand-typed figure that will go stale the same way.

## What this pass did not do

Did not touch the card, the 35-row array, any opportunity row, or any admin surface. Did not
decide which of Method A or B the card should ultimately use — flagged the tradeoff (§3), not
resolved unilaterally, since it's a real product call about what "defective" means for this
product. Did not attempt to persist the 51-row set's exact original ids — its live
re-derivation (§2) is offered as the best available substitute, not a claim of exact
recovery.
