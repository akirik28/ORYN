# Oryn → Proxola rename verification (2026-09-03)

Report only — this document contains no fixes. Findings go back to the owning lane.
Written as a second pair of eyes on docs/rename-inventory-proxola-2026-09-03.md's four
buckets, per the same "nobody checks their own rename" logic as every other gate this
fleet has built tonight: four lanes editing hundreds of strings across files they don't
own, verified independently rather than trusted because the diff looks plausible.

Lanes: 48 (catalogs), 44 (legal + prompts + metadata), ab (logos + alt text), a4
(internals + disclosure files), 05 (database SQL, staged not written). None had pushed
when this baseline was captured. Base commit: `1aba4625` (main, after the inventory's
own go-ahead status banner was stamped on).

## Methodology, by question

**1. Forbidden-touch check** — mechanical, needs no lane content, no authorization
question. `oryn_global_id`, `oryn_public`, the three `ORYN_ENABLE_*` constants,
`ORYN-PRG-`, the fleet's own `oryn-XX`/`ORYN-CEO` style codenames: exact-string line
counts captured on `main` before any lane landed, re-checked against each lane's diff.
Kept as a scratch shell helper (not part of this commit — a one-off checker doesn't
belong beside the repo's TypeScript acquisition scripts), reproducible from the raw
commands under "Baseline capture" below: for each forbidden string, `git grep -Fc
'<string>' <ref> -- .` on `main` vs. the lane branch.

**Correction after Lane 5**: a raw count delta is a *lead*, not a verdict — it isn't
down-weighted by authorization (per oryn-45: "No amount of founder authorization makes
those safe"), but it also isn't self-interpreting once any file discusses the rename in
prose. Lane 5's merge moved every forbidden-string count by 1-5, which first read as a
wall of violations; every single one turned out to be this report's own methodology
section naming the strings, plus Lane 5's own Turkish SQL comments explaining *why*
`oryn_global_id`/`oryn_public`/`ORYN-PRG-` were correctly left alone (confirmed by
reading each hit's actual line — every occurrence is on a `--` comment line, zero on an
executable `ALTER`/`RENAME` statement). The check from here on is: read what each
delta's line actually says before recording it as a finding, not just whether the count
moved.

**2. Collision survival** — `storyNotes`/`storyNotesCount`/`hasStoryNotes` (contain
"oryN") and `categoryNavAriaLabel` (contains "goryN") are a closed set per the
inventory's own exhaustive enumeration. Same script, same baseline-vs-lane diff: a
count drop means a naive find-and-replace mangled one of these identifiers.

**3. Turkish correctness** — not scriptable. The final vowel goes y → a, so vowel
harmony on every attached suffix shifts with it (`'e` → `'ya`, `'in`/`'ı` → `'a`, etc.).
Every changed Turkish string gets read individually once lane 48/44 land, checked
against real Turkish suffix rules, not just "does it contain Proxola."

**4. Whole-tree reconciliation** — the number that answers "is the rename finished."
Baseline captured now, on `main`, before any lane touched anything:

| Casing | Occurrences | Files |
|---|---|---|
| `Oryn` | 1,084 | 309 |
| `ORYN` | 3,957 | 609 |
| `oryn` | 3,172 | 755 |

(Whole tracked tree, all file types — wider than the inventory's 478/88/500 figures,
which were scoped to `.ts`/`.tsx` only. Different scope, not a contradiction.)

Once all five lanes have merged, re-running the same `git grep -Fc` sweep (for `Oryn`,
`ORYN`, `oryn` each) against the merged result gives the after-count. Every remaining hit then gets
reconciled by hand against the allow-list: Bucket 3 (docs/ historical corpus, AGENTS.md
family, git history, fleet codenames), Bucket 4 (`oryn_global_id`, `oryn_public`,
`ORYN_ENABLE_*`, `oryn-qa-scratch` project name, `oryn.app` domain references), and the
two-collision set. Anything left over after that reconciliation is the gap — that
residual count is the deliverable, not the raw before/after diff.

**5. Functional check — rendered, not read.** `features/profile/field-config.ts`'s
dictionary is keyed by the literal English label string. If a lane renames the English
label but not the dictionary key (or vice versa), the lookup breaks silently and
Turkish falls back to showing the renamed English text. Verified by starting the dev
server, switching locale to `tr`, and reading the actual rendered profile page —
grepping the file for matching keys would only prove the two strings look equal in the
editor, not that the runtime lookup succeeds.

## Baseline capture

```
$ git grep -Fc '<pattern>' main -- .   # summed per pattern, main vs. itself (zero-diff check)
oryn_global_id            7
oryn_public               65
ORYN_ENABLE_SOCIAL_FEED   8
ORYN_ENABLE_CONNECTIONS   3
ORYN_ENABLE_MESSAGING     5
ORYN-PRG-                 579
oryn-a7 .. oryn-d5         (12 codenames, 2-313 hits each)
ORYN-CEO/CFO/PRODUCT/BASORG (147/28/4/87)
storyNotes / storyNotesCount / hasStoryNotes / categoryNavAriaLabel / OrynMark
                           10 / 4 / 4 / 4 / 3
docs/ files touched:      (none)
Bucket-3 sentinel files:  (none)
```

All zero-diff against itself, as expected — this is the reference point every lane
gets checked against, not a finding.

## Results, per lane

_(filled in as each branch lands)_

### Lane 48 — catalogs
Not yet pushed.

### Lane 44 — legal + prompts + metadata
Not yet pushed.

### Lane ab — logos + alt text
Not yet pushed.

### Lane a4 — internals + disclosure files
Not yet pushed.

### Lane 05 — database SQL — merged `e03becc4` — CLEAN

Two new files: `data/morning/08-isim-degisikligi-veri-2026-09-03.sql` (the staged
`replace()` backfill, idempotent by construction) and a founder-facing brief,
`data/morning/08-OKU-BENI-isim-degisikligi.md`. No code file touched.

- **Forbidden-touch**: every one of the 7 pattern counts that moved (oryn_global_id,
  oryn_public, ORYN-PRG-, oryn-45, oryn-d0, oryn-a7, oryn-d5, ORYN-CEO) resolved to
  either this report's own prose or a SQL `--` comment. Read every changed line by hand
  rather than trusting the count: `oryn_global_id` and `oryn_public` each appear twice
  in the SQL, both times in comments stating the file does *not* touch them ("bu
  dosyanın işi değil" / "bu dosyanın kapsamı dışında" — not this file's job / outside
  this file's scope). No `ALTER TABLE`, `ALTER TYPE`, or `RENAME` statement anywhere in
  the file.
- **Collision survival**: unaffected — neither `story-bank.tsx` nor
  `opportunity-filter-bar.tsx` nor either message catalog appears in this diff, so the
  four collision identifiers were structurally not at risk from this lane.
- **Scope**: matches its own commit message — six tables of AI-generated student-facing
  text (112 `student_requirement_evaluations.reasoning` rows plus weekly_actions,
  weekly_plans, notifications, ai_recommendations, opportunities.description), staged
  as idempotent `replace()`, both casings handled, the ~750 provenance/audit rows and
  the `oryn_global_id`/`oryn_public`/`ORYN-PRG-NNNN` identifiers explicitly excluded.
  Consistent with Bucket 3/4 of the inventory.
- **Side note, not this lane's doing**: the founder-brief doc records that oryn-45
  independently closed the open "is there a separate production Supabase project"
  question from the inventory's Bucket 4 (checked all three projects on the account;
  only `oryn-qa-scratch` is this product). Worth knowing for the final reconciliation —
  the database-layer scope is fully accounted for, not partially unknown.

## Whole-tree reconciliation (after all lanes land)

Pending.

## Functional check result

Pending.
