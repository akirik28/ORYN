# `publication_venue` category — schema package + 6-row reclassification dry-run

**Status**: approved in principle by the founder 2026-08-23. **Nothing applied.** Migration SQL
and the reclassification statement are written out below and deliberately not added to
`supabase/migrations/`.

---

## 1. Why

`opportunity_category` is a Postgres enum with 13 values — competition, research, internship,
summer_program, fellowship, scholarship, volunteering, entrepreneurship, hackathon,
academic_program, conference, student_program, online_program — and **none of them describes a
journal you submit finished work to.**

Six rows are therefore filed as `research`, which is the one category that actively misleads.
`research` means "a way to *do* research"; a journal is a way to *publish* research already
done. The two are not the same product and they are not interchangeable advice: telling a
student with no completed project to "submit to JEI" is not a weaker recommendation, it is an
impossible one.

`academic_program` and `student_program` were considered and rejected — both describe
something a student attends.

## 2. Migration (not applied)

```sql
-- 00XX_opportunity_category_publication_venue.sql
alter type public.opportunity_category add value if not exists 'publication_venue';
```

**Caveat that will bite if ignored**: `ALTER TYPE ... ADD VALUE` cannot be followed, in the same
transaction, by a statement that *uses* the new value. Supabase wraps a migration file in one
transaction, so this must ship as **two migrations** — one adding the value, a later one doing
the reclassification in §4. Attempting both in one file fails with `unsafe use of new value`.

## 3. Code wiring — the type system forces most of it

`CATEGORY_DIMENSIONS` ([lib/opportunities/matching.ts:203](../lib/opportunities/matching.ts:203))
is a total `Record<OpportunityCategory, ProfileDimension[]>`, so once the union in
`types/database.ts` gains the value, **typecheck fails until every site is updated**. That is the
desired behaviour, not an obstacle — it is what stops a new category silently scoring zero.

Sites to update: `types/database.ts`, `lib/opportunities/matching.ts`,
`lib/opportunities/ingest.ts`, `lib/ai/opportunity-extraction.ts`, `lib/counselor/config.ts`.

Proposed mapping:

```ts
publication_venue: ["research"],
```

One dimension, deliberately. A venue *recognises* completed work rather than building
capability, so crediting it with `intellectual_curiosity` as well — the way `research` is
credited — would overstate what submitting to a journal develops.

## 4. The 6 rows (dry-run)

All six are publication venues by their own description. Verified live 2026-08-23.

| id | title | cost | status | reaches students |
|---|---|---|---|---|
| `19ebc71c` | American Journal of Student Research (AJSR) | 496 | active | 7 |
| `61558e02` | International Journal of High School Research (IJHSR) | 350 | active | 7 |
| `51ea0b34` | Journal of Research High School (JRHS) | 350 | active | 7 |
| `b51bf24f` | STEM Fellowship Journal | — | active | 7 |
| `e0e1584c` | Columbia Junior Science Journal (CJSJ) | — | under_review | 0 |
| `35f7475c` | Journal of Emerging Investigators (JEI) | — | under_review | 0 |

```sql
-- Ships AFTER the enum migration, never in the same transaction.
update public.opportunities
set category = 'publication_venue', updated_at = now()
where id in (
  '19ebc71c-1997-41aa-aeb1-728ec5be176c',  -- AJSR
  '61558e02-0b11-4221-bbbb-fc98bc765da8',  -- IJHSR
  '51ea0b34-7396-4a4b-89e7-fd4b776b79fa',  -- JRHS
  'b51bf24f-42c2-419f-a456-ca86dff0ad8e',  -- STEM Fellowship Journal
  'e0e1584c-5d96-41d6-a3a0-a62eaffa37d6',  -- CJSJ
  '35f7475c-2567-4dde-ab61-c427059ff180'   -- JEI
) and category = 'research';
```

The `and category = 'research'` guard makes the statement idempotent and makes a re-run a no-op
rather than a silent overwrite of a later correction.

### Not in this set

- **Interlochen Review** (`95093e1a`) — a literary magazine, not a research venue. The founder
  ruled it a separate entity from Interlochen Arts Camp and not covered by that hold; it is
  being evaluated independently on P1 evidence and will be classified on its own findings.
- **Georgetown Pre-College Online** (`948b2e5f`) — also miscategorised as `research`, but it is a
  taught course, not a venue. A separate correction.

## 5. Expected effect

Three of the six (AJSR, IJHSR, JRHS) are already retired from core recommendations by the
pay-to-enroll gate (#154, #156) because they charge 350–496 with no selectivity on file. This
change is therefore **not** what stops them being recommended — it stops them being *counted and
described as research opportunities*, which is a separate defect. `STEM Fellowship Journal`
carries no fee and is still recommendable; after this change it is recommendable as what it is.

It also fixes a metric. Research currently reads as 13 rows; six of them are venues, so the real
count of ways to *do* research in the corpus is 7, of which 5 are genuine opportunities.

## 6. Known follow-up, not solved here

A publication venue is only actionable for a student who already has finished work. Nothing in
the schema expresses that precondition, so after this change the counselor can still propose a
journal to a student with no research. Categorising correctly is the prerequisite for fixing
that; the fix itself is prerequisite modelling and should be decided from records later.
