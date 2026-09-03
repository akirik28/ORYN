# Rename DB render check — 2026-09-04

CEO's ask: the `08-*` rename ran, row counts confirmed clean — check that the renamed rows
actually *render* correctly, not just count correctly. `/design-preview/*` can't do this: I
checked before starting, and `university-detail`'s preview imports `FIXTURE_REQUIREMENT_EVALUATIONS`
and every other section from `lib/dev/fixtures.ts` — 100% hardcoded, zero live Supabase
reads, so it would show unrelated fixture text and nothing about the real renamed rows. Used
direct SQL reads of the actual stored values instead (read-only, no browser, no live session
touched) plus a read of the real rendering component, which is stronger than a screenshot for
exactly the failure modes asked about — whitespace bugs often collapse invisibly in rendered
HTML but not in a raw string comparison.

## Five of six categories: clean

Read every distinct renamed string in `weekly_actions.reason` (6), `opportunities.description`
(4), `notifications.body` + `weekly_plans.summary` (2 shared sentences), and `ai_recommendations.reason`
(2 — the literal `recommendations` table has zero "proxola" rows; `ai_recommendations` is the
one your count meant). No double spaces, no mid-word splits, no leftover "oryn", correct
capitalization throughout. One stylistic oddity, not a defect: `opportunities.description`
has one instance of `PROXOLA's` in full caps (matching an all-caps `ORYN'S` that was almost
certainly already there for emphasis before the rename — the substitution correctly preserved
the casing rather than introducing it).

## The sixth: 10 of 112 requirement evaluations are grammatically broken in Turkish

`student_requirement_evaluations.reasoning`, confirmed rendered verbatim with no
transformation (`features/universities/requirement-group.tsx:64`, `{evaluation.reasoning}`
straight into a `<p>`):

> **"Bu gereklilik, Proxola'ın otomatik olarak değerlendirmediği gönderilen materyale bağlı — bunu kendin incele."**

**`Proxola'ın` is wrong Turkish — it should be `Proxola'nın`.** "Oryn" ends in a consonant, so
the possessive suffix attaches directly: `Oryn'ın` was correct. "Proxola" ends in a vowel
("a"), and Turkish requires a buffer consonant before a vowel-initial suffix on a vowel-final
stem — the same reason "araba" (car) becomes "araba**n**ın", not "arabaın". A plain
find-and-replace of the name swapped the word but not the grammar around it, because the
buffer letter isn't part of "Oryn"/"Proxola" at all — it's a property of what the *previous*
word ends in. No regex over the name alone catches this class of bug.

The other 102 rows are clean, including a second Turkish sentence (5 rows) that also mentions
Proxola but as a comma-set-off subject rather than with an attached suffix — no buffer-consonant
question there, and it reads correctly.

## Staged, not run

```sql
-- Dry run. 10 rows, all sharing this exact reasoning string.
update public.student_requirement_evaluations
set reasoning = 'Bu gereklilik, Proxola''nın otomatik olarak değerlendirmediği gönderilen materyale bağlı — bunu kendin incele.'
where reasoning = 'Bu gereklilik, Proxola''ın otomatik olarak değerlendirmediği gönderilen materyale bağlı — bunu kendin incele.';
```

## What this pass did not do

Did not check every table the 08 migration touched against every possible Turkish suffix
form (dative -a/-e and accusative -ı/-i also need a buffer consonant on a vowel-final stem —
`Proxola'ya`/`Proxola'yı`, not `Proxola'a`/`Proxola'ı` — but no instance of either appeared in
what actually got renamed, so this wasn't a live bug to chase further). Did not execute the
update above. Did not open a browser at any point — verified through direct SQL reads and the
rendering component's source only.
