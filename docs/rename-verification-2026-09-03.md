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

**Classification method, stated plainly, because every artifact this rename produces
(this doc, five lane commit messages, oryn-45's merge commits, the inventory itself,
Lane 5's SQL comments) names the forbidden strings in order to explain why they weren't
touched — so counts alone rise from documentation regardless of whether any lane does
anything wrong:**

- **Markdown (`.md`) files are excluded from this check entirely.** The whole genre is
  prose about the rename, not the rename itself. Mentions are not tallied as touches.
  This doesn't create a blind spot for Bucket 3's sentinel files (`AGENTS.md`,
  `docs/founder-spec.md`, `docs/ORYN-PROMPT-ARCHIVE.md`) — those are covered by the
  separate file-level "Bucket-3 sentinel files touched" check below, which fires on the
  file being touched *at all*, independent of string counting.
- **Every other file (code, SQL, JSON): no automated comment-stripping.** I considered
  a naive strip (drop `--`-to-end-of-line in SQL, `//`-to-end-of-line in TS) and rejected
  it after finding a real line in this exact codebase it would mishandle:
  `scripts/acquire-university-images.ts:499` builds a User-Agent template literal,
  `` `Oryn-ImageAcquisition/1.0 (https://oryn.app...) node` `` — a real, load-bearing
  Bucket-4 brand reference (the `oryn.app` domain) sitting on the same line as a `//`
  inside `https://`. A same-line `//`-strip truncates right there and would hide or
  miscount exactly the kind of reference this check most needs to catch. Instead: every
  line where a forbidden-string count changes gets read individually, classified by what
  the line actually does (statement vs. comment vs. string literal that's a real
  functional reference — e.g. `lib/social/posts-feature-flag.ts:37`'s
  `export const SOCIAL_FEED_FLAG_ENV = "ORYN_ENABLE_SOCIAL_FEED"` is a string literal
  and *is* the live reference, not prose, and must never be excluded by any future
  version of this check that tries to skip "just a string").
- **Why manual reading scales here but wouldn't everywhere**: this is only tractable
  because the forbidden list is narrow — baseline occurrence counts per pattern range
  2-579 across the *entire* repo, so a lane's diff touching hundreds of files still
  produces a small, readable number of candidate lines for these specific identifiers
  (Lane 5 produced 13 total). Item 4's whole-tree reconciliation (below) deliberately
  does **not** use this method — "Oryn"/"ORYN"/"oryn" have 1,000+ hits each, and manual
  line-reading at that volume doesn't scale. That check stays a count reconciled against
  known-safe buckets, which is a different and coarser instrument by design, not an
  oversight.
- **Named blind spot**: this method reads what a human/AI can see in a diff. A forbidden
  string reconstructed at runtime (string concatenation, a base64 blob, a value only
  present in an environment variable or database row this repo can't see) would not
  surface in any text-based check, automated or manual. Not found so far, not
  structurally ruled out either.

**Second self-caught bug, same night, same shape as the field-index one**: implementing
the `.md` exclusion above (`git grep ... ':(exclude)*.md'`) with `set -euo pipefail`
still on caused the checker to die silently mid-list the moment any single pattern had
zero non-markdown hits — `git grep` exits 1 on no-match, `pipefail` propagates that
through the `| awk` pipe, and `set -e` kills the script with no error text, output just
stops. It stopped right after `oryn-4e`; the next pattern, `oryn-b9`, turned out to have
zero real-code hits (this fleet session's own codename, apparently only ever mentioned
in dated docs). A truncated pattern list and a fully-clean one look identical unless you
count how many lines came back. Fixed with `|| true` on the pipeline (the value is
unaffected — `awk`'s `END` block still prints `0` on empty input; only the exit-code
propagation was wrong). This is the third instance tonight of a verifier that returns a
falsely-clean signal by failing silently, per oryn-45's count — caught the same way as
the first two: by not trusting a suspiciously-tidy result until it's been forced to
prove itself against a case where the answer is already known.

**2. Collision survival** — `storyNotes`/`storyNotesCount`/`hasStoryNotes` (contain
"oryN") and `categoryNavAriaLabel` (contains "goryN") are a closed set per the
inventory's own exhaustive enumeration. Same script, same baseline-vs-lane diff: a
count drop means a naive find-and-replace mangled one of these identifiers.

**3. Turkish correctness** — not scriptable. The final vowel goes y → a, so vowel
harmony on every attached suffix shifts with it (`'e` → `'ya`, `'in`/`'ı` → `'a`, etc.).
Every changed Turkish string gets read individually once lane 48/44 land, checked
against real Turkish suffix rules, not just "does it contain Proxola."

**4. Whole-tree reconciliation** — the number that answers "is the rename finished."
Baseline captured on `main` before any code lane touched anything (refreshed after Lane
5, whose database-only changes were independently verified clean above — measuring the
4 code lanes against a baseline that already includes Lane 5 avoids re-explaining its
noise on every subsequent diff):

| Casing | Occurrences | Files | at `1aba4625` (pre-Lane-5) |
|---|---|---|---|
| `Oryn` | 1,116 | 312 | 1,084 / 309 |
| `ORYN` | 3,983 | 612 | 3,957 / 609 |
| `oryn` | 3,203 | 758 | 3,172 / 755 |

(Whole tracked tree, all file types — wider than the inventory's 478/88/500 figures,
which were scoped to `.ts`/`.tsx` only. Different scope, not a contradiction. This sweep
is intentionally *not* `.md`-excluded like item 1 — item 4 is a reconciled count against
known-safe buckets, not a pass/fail delta, so the docs corpus has to stay in it or the
reconciliation couldn't account for Bucket 3 at all.)

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

Original capture, at `1aba4625` before Lane 5, unfiltered (`.md` included — this is the
version that later motivated the exclusion, see "Classification method" above):

```
oryn_global_id 7 · oryn_public 65 · ORYN_ENABLE_SOCIAL_FEED/CONNECTIONS/MESSAGING 8/3/5
ORYN-PRG- 579 · oryn-a7..oryn-d5 (12 codenames, 2-313 hits each) · ORYN-CEO/CFO/PRODUCT/BASORG 147/28/4/87
storyNotes/storyNotesCount/hasStoryNotes/categoryNavAriaLabel/OrynMark: 10/4/4/4/3
```

Current baseline, at `origin/main` post-Lane-5, `.md`-excluded (`git grep -Fc
'<pattern>' <ref> -- . ':(exclude)*.md'`, summed per pattern) — **this is the reference
point the 4 remaining code lanes get checked against**:

```
oryn_global_id            5
oryn_public               60
ORYN_ENABLE_SOCIAL_FEED   4
ORYN_ENABLE_CONNECTIONS   1
ORYN_ENABLE_MESSAGING     2
ORYN-PRG-                 565
oryn-a7 121 · oryn-45 8 · oryn-31 27 · oryn-d0 15 · oryn-f5 6 · oryn-3f 7 · oryn-4e 3
oryn-b9 0 · oryn-11 3 · oryn-60 13 · oryn-e2 0 · oryn-d5 0
ORYN-CEO 25 · ORYN-CFO 1 · ORYN-PRODUCT 1 · ORYN-BASORG 20
storyNotes 9 · storyNotesCount 3 · hasStoryNotes 3 · categoryNavAriaLabel 3 · OrynMark 2
docs/ files touched:      (none)
Bucket-3 sentinel files:  (none)
```

Zero-diff against itself, as expected — this is the reference point every remaining
lane gets checked against, not a finding. Three codenames (`oryn-b9`, `oryn-e2`,
`oryn-d5`) are legitimately `0` outside markdown — real, not a script failure (see the
silent-truncation bug above, which is exactly the failure mode a `0` like this could
have masked).

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
