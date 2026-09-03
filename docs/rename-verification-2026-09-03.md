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

_(filled in as each branch lands — Lanes 1 and 2 appear below, after Lane 5, in the
order they actually landed)_

### Lane 3 — brand assets (logos + alt text) — merged `4627e37e` — CLEAN

All 9 hardcoded `alt="Oryn"` instances confirmed changed to `alt="Proxola"` by direct
grep (`app/page.tsx`, `not-found.tsx`, both dev-preview pages, confirm-age/onboarding/
auth layouts, sidebar, mobile-nav) — zero `alt="Oryn"` remain anywhere except the
inventory doc's own prose describing the finding. Logo files (`logo-full.png`,
`logo-mark.png`, `icon.png`, `apple-icon.png`, `favicon.ico`) replaced from crops
isolated by color-channel difference rather than eyeballed, per the commit message —
not independently re-verified pixel-by-pixel (a design-quality judgment, not a
rename-correctness one, and out of this report's scope), but the two things that *are*
this report's business check out: forbidden list untouched (confirmed via the combined
script run above), and the width replacements for the new aspect ratio are real
arithmetic, not guessed numbers. Read the actual diffs rather than trust the commit
message's framing, which called these "height" replacements — they're not: `height` is
the fixed dimension in both changed lines (sidebar.tsx: `height={31}` unchanged,
`width={92}`→`{100}`; auth layout: `height={35}` unchanged, `width={104}`→`{113}`), and
checking `height × (664/205)` against the new width in each case: 31 × 3.239 ≈ 100.4 →
100 ✓, 35 × 3.239 ≈ 113.4 → 113 ✓. Correct, just mislabeled in the commit message —
worth a one-line correction back to the lane, not a finding.

Two things flagged by the lane itself, correctly left alone rather than fixed out of
scope: a blue-mark/purple-accent color clash (a founder design decision, not a rename
defect) and the auth screen's "New to ORYN? Create an account" string, which lives in
`messages/*.json` — explicitly Lane 1/2's territory. **Closed**: confirmed
`messages/en.json:1399-1400` now reads `"newToProxola": "New to Proxola?"` /
`"createAccount": "Create an account"` — the named waiting item, checked rather than
assumed.

### Lane 6 — directory rename (`components/oryn/` → `components/proxola/`) — merged `a55c035c` — CLEAN, typecheck/tests confirmed below

`git mv` of 28 files plus 115 import repoints. Matched specifically on the
`components/oryn/` path, never on the bare word — confirmed two ways: the four
collision identifiers are exactly unchanged (storyNotes 9, storyNotesCount 3,
hasStoryNotes 3, categoryNavAriaLabel 3 — all identical to baseline), and
`__tests__/oryn/` (a different directory that happens to share the word) had its
*imports* fixed but was not itself renamed.

Verified that second point isn't a gap: `oryn/rename-lane7-tests-2026-09-03` exists as
a branch (not yet started — zero commits ahead of main), consistent with `__tests__/`
being a separate lane's named territory rather than something Lane 6 missed. Correct
lane-boundary discipline, not an omission — the same distinction this fleet's own gate
work drew between "found and fixed" and "found and correctly left for someone else."

One judgment call worth naming rather than just accepting: the lane fixed 10 files'
stale `components/oryn/...` path references inside developer doc-comments, past the
letter of an import-only brief. Own reasoning was "a doc-comment pointing at a moved
file is a broken pointer, not a record of anything" — checked this against Bucket 3's
actual rule (historical *record* is protected, not incidental *pointers* that happen to
predate a move) and it holds: a doc-comment saying "see components/oryn/foo.tsx" is a
navigation aid that becomes actively wrong after the file moves, not a record of a
decision made at a point in time. Different in kind from editing AGENTS.md's verbatim
block.

**Typecheck/test result**: `npx tsc --noEmit` clean, zero errors — the 115 import
repoints all land correctly. Full suite: 1 timeout in
`refresh-matches-admin-degradation.test.ts` on the first run; re-ran that file alone on
the latest main and it passed in 1.34s (vs. a 30s timeout under the full-suite run).
Confirmed environmental, not a regression: that test exercises a sibling function in
`persist-matches.ts` to the one the i18n fix touched, in a file the fix never changed,
and the isolated pass was fast and clean. The full suite and a full typecheck were
running concurrently on a machine with several other active sessions — resource
contention, not logic.

### Lane 8 — data/ triage — merged `83b8eaa6` — CLEAN (report only, zero files touched)

Concludes the entire `data/` living-reference group is empty — everything in `data/` is
historical record, nothing renamed. Independently spot-checked the central claim
("nothing outside `data/` reads these files at runtime, only cites them in comments")
rather than trusting the doc's own count of 45 citations: grepped `lib/`, `app/`,
`scripts/` for any `readFileSync`/`require`/`import` against a `data/research` or
`data/morning` path — zero matches, consistent with the claim. Also disclosed its own
discrepancy against the founder's cited count (4,235 vs. 3,397 occurrences) rather than
silently adopting the higher-authority number — noted, not material to the conclusion,
and the right instinct either way.

### Lane 5 — database SQL — merged `e03becc4` — CLEAN

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

### Lane 9 — scripts — merged `561a4278`

### Lane 1 — catalogs (233 lines, the text layer) — merged `bd1d7b65`

### Lane 2 — legal text, sitewide metadata, all four AI prompts — merged `e29a6426`

Not individually broken out — their combined effect (together with the i18n fix, Lane
6, and everything before) is what the whole-tree reconciliation below actually
measures, and that reconciliation is where their real gaps surface. Two things
independently confirmed as part of that work: the auth screen's `newToProxola`/
`createAccount` catalog keys (noted under Lane 3 above), and `ADVISOR_SYSTEM_PROMPT`
itself (below) — both correct.

## Whole-tree reconciliation — the deliverable

**Bottom line first: this is not finished.** Every forbidden identifier and all five
collisions survived intact through every lane (re-confirmed above). But the sweep
surfaces a real, unclaimed category of gap: hardcoded, rendered, sometimes bilingual
strings living in `lib/` business-logic files that none of lanes 1/2/3/6/9 owned,
because none of their briefs covered "any file with a hardcoded user-facing string,"
only the specific files the inventory happened to name. Confirmed live, not just read.

### The count

| Casing | Baseline (post-Lane-5) | Now | In `.md` or `data/` | Outside both |
|---|---|---|---|---|
| `Oryn` | 1,116 / 312 files | 799 / 281 files | 472 | **327** |
| `ORYN` | 3,983 / 612 files | 3,973 / 606 files | 3,537 | **436** |
| `oryn` | 3,203 / 758 files | 2,990 / 664 files | 2,639 | **351** |

`.md`/`data/` is Bucket 3 by construction (historical record — the inventory's own
argument, independently re-confirmed for `data/` by Lane 8) — not reconciled
line-by-line here, consistent with item 1's stated reason manual reading doesn't scale
past the narrow forbidden list.

**Reconciling the "outside both" columns** — how much of 327/436/351 is accounted for
by the forbidden list, the five collisions, and the three newly-named known-open items:

| Category | Oryn | ORYN | oryn |
|---|---|---|---|
| Forbidden identifiers (oryn_global_id, oryn_public, ORYN_ENABLE_*, ORYN-PRG-, 12 codenames, 4 role tags) | 0 | 356 | 216 |
| `OrynMark` (unused Figma-source comment reference) | 2 | — | — |
| `oryn_locale` cookie (9 lines — 1 definition, 8 descriptive comments; 48 has it report-only) | — | — | 9 |
| `what-oryn-is`/`what-oryn-is-not` URL anchors (4 lines, deliberately kept — anchor renames break inbound links) | — | — | 4 |
| `docs/reports/2026-08-28-oryn-evidence.json` (dated report, same genre as `.md` corpus — my exclusion pathspec only covers `*.md`, missed this one file; read it, it's exactly Bucket 3) | 0 | 0 | ~1 file's worth |
| **Remainder — real candidates** | **~325** | **~80** | **~121** |

The `ORYN`/`oryn` remainders (80, 121) are overwhelmingly developer-facing comments —
sampled 5 files in that range (`lib/admissions/system-shape.ts`,
`lib/universities/counseling-adapter.ts`, `lib/scoring/signal.ts`,
`lib/admissions/outlook.ts`, `features/opportunities/opportunity-card.tsx`) and all
five were comment-only, same register as the docs corpus, just not in a `.md` file.
Lower priority, not zero — a future pass could sweep these for consistency, but they
don't render and don't reach the AI.

**The `Oryn` remainder (~325) is where the real gap lives**, because exact brand-casing
in live code is disproportionately likely to be an actual rendered or AI-fed string,
not a comment. Read every file with a meaningful count rather than assume the pattern
from the two biggest hits:

### Confirmed real gaps (rendered and/or fed to the AI, zero lanes touched)

- **`lib/requirements/copy.ts` (32 hits)** — the single largest concentration, and the
  most important: real, bilingual, live requirement-check explanation strings,
  including the *exact* sentence Lane 5 backfilled in the database
  (`student_requirement_evaluations.reasoning`, 112 rows): *"This requirement depends
  on submitted material Oryn doesn't evaluate automatically — review it yourself."*
  **Lane 5 fixed the 112 existing rows. This file is what generates every new one.**
  The backfill and the code source were two different lanes' territory and neither
  crossed into the other's file.
- **`lib/counselor/copy.ts` (5 hits)** — same pattern, same "copy.ts" naming
  convention. These are the only two files in the whole repo named `copy.ts`
  (`git ls-tree | grep 'copy\.ts$'` — exactly these two), and both slipped through.
- **Four files that feed the AI's own context window, separate from
  `ADVISOR_SYSTEM_PROMPT`**: `lib/ai/fee-text.ts`, `lib/ai/opportunity-context.ts`,
  `lib/ai/student-context.ts`, `lib/ai/weekly-plan.ts`. This is the sharpest finding
  against oryn-45's own question 5 — **the system prompt itself is correctly fixed
  ("You are the Proxola Advisor" — confirmed below), but these files inject sentences
  like "Oryn has not assessed this" and "Oryn's Counselor Core has already identified
  these..." directly into the same context the model reads.** A fixed system prompt
  doesn't stop the model from seeing and repeating a brand name its own injected
  context still uses.
- **A second real AI system prompt**: `lib/opportunities/reverification/adjudicate.ts:32`
  — `const SYSTEM_PROMPT = `You are adjudicating...between what Oryn has stored...``.
  Nobody's brief was "find every `SYSTEM_PROMPT` constant in the repo," only "fix
  `ADVISOR_SYSTEM_PROMPT`" — this one is a different, smaller LLM call (reverification
  adjudication) that was never in scope for any lane.
- **Three feature-flag disabled-messages**, one per social feature:
  `lib/social/posts-feature-flag.ts:52` ("The Oryn social layer is not enabled..."),
  `lib/social/connections-feature-flag.ts:60` ("Oryn's Connections feature is not
  enabled..."), `lib/messaging/messaging-feature-flag.ts:60` ("Oryn's 1:1 messaging is
  not enabled..."). Shown to an admin/developer when a disabled feature is probed, not
  to students — real but lower-traffic surface.
- **A scattered set of single/double-occurrence files, each a real returned or
  rendered string**: `lib/opportunities/cycle-label-quality.ts` (2), `lib/opportunities/
  lifecycle.ts` (3, bilingual — "Oryn bu fırsatı şu anda göstermiyor." / "Oryn isn't
  showing this opportunity right now."), `lib/validation/requirements.ts` (1),
  `lib/benchmarking/compute.ts` (1, "All Oryn students" — a real cohort-description
  string in the benchmarking UI), `lib/benchmarking/index.ts` (1, same string),
  `lib/entities/resolve.ts` (1, an error message).
- **`lib/dev/fixtures.ts` (2)** — dev-only fixture data (AGENTS.md Phase 49: "Use
  fixtures for testing only"), not production-reachable. Lower priority, same logic as
  the database layer's own QA-fixture carve-out (the inventory's "Oryn Test High
  School" rows), just in code instead of the database.
- **`app/(dev-preview)/design-preview/university-detail/page.tsx` (4)** — real,
  rendered strings on a real (if dev-preview) page, and this is the one I verified live
  rather than by reading: navigated to `/design-preview/university-detail` on the
  running dev server and read the actual page. Result: **"Oryn estimate: 15–25%
  (medium confidence)"** renders directly under "Your outlook / Reach" — one of the
  most prominent spots on the page — right alongside correctly-fixed text elsewhere on
  the same screen ("Proxola's read of your profile", "Degree programs Proxola has
  verified", title metadata "Proxola — Your Personal Career Operating System"). Also
  rendered: "Source: Oryn's admissions-system research" and two requirement-check
  lines ("...but Oryn can't confirm Mathematics is one of your three A-levels...",
  "...Oryn hasn't recorded which specific program..."). This is the same underlying
  string source as `lib/opportunities/lifecycle.ts`/`lib/admissions/*` above, now
  confirmed by rendering, not inference.

### False positives ruled out, not just assumed

A broad "does this line look like a quoted string" heuristic over-flagged several
files before individual reading corrected it — worth naming so the corrected list
isn't mistaken for the raw grep output:

- **`app/(app)/universities/[id]/page.tsx`** — the inventory's own named Bucket-1 item
  (`"Oryn tahmini:" / "Oryn estimate:"`) is **already correctly fixed** to `"Proxola
  tahmini:" / "Proxola estimate:"` (line 421). Every remaining "Oryn" in this file is
  inside a multi-line `{/* ... */}` JSX comment block — invisible to a per-line
  comment check that only recognizes a leading `//` or `*`, which is precisely the
  blind spot item 1's methodology section already named in advance. Confirmed by
  reading each hit, not by the heuristic.
- **`features/onboarding/onboarding-wizard.tsx`** — same shape, one multi-line JSX
  comment.
- The five sampled `ORYN`/`oryn`-remainder files above — comment-only.

### The two rendering-specific checks

- **`ADVISOR_SYSTEM_PROMPT`** (`lib/ai/advisor-prompt.ts:26,58`) — **correctly fixed**:
  `` `You are the Proxola Advisor...` ``, `"...Proxola checked this specific claim..."`.
  Direct source read is sufficient here (this is a static template string, not
  behavior) — no live model call needed to confirm what the text literally says. (The
  AI-context-injection gap above is a separate, real finding about *other* files in
  the same conversation, not a contradiction of this one.)
- **`features/profile/field-config.ts`** — zero remaining `Oryn` (confirmed by
  `git grep -c`). The one brand-mentioning label
  (`"Proxola program/opportunity this matches (optional)"`, line 178) has its Turkish
  dictionary key updated to the identical string verbatim (line 585) — read both sides
  character-for-character, which is the actual failure mode this check exists for (a
  key/label drift causing a silent English fallback). **Attempted to confirm by
  rendering** (`/design-preview/quick-add`, per oryn-45's shared-session-hazard
  guidance — never touched a real app route): the generic "Activity" quick-add form
  doesn't surface this specific `scope: "opportunity"` field, and the tool's
  accessibility-tree reads returned an empty/0×0 viewport against the hidden pane
  despite `get_page_text` working fine on the same tab — a tool friction, not a app
  bug. Falling back to the source check above, which directly tests the one thing that
  can go wrong (key ≠ label), rather than leaving this unverified.
- **`lib/legal/content.ts` Turkish rendering** — **deliberately not live-rendered**.
  This is the exact route (`/kvkk`) where 44 found the shared browser pane carrying a
  persisted session for the founder's real account tonight; no `/design-preview`
  equivalent exists for legal content. Verified by source instead: zero remaining
  `Oryn` in the file, and every Turkish suffix on "Proxola" sampled is grammatically
  correct back-vowel harmony — `Proxola'ya dön` (dative, not `Proxola'e`),
  `Proxola'nın` (genitive), `Proxola'da` (locative), `Proxola'yı` (accusative) — all
  consistent with a vowel-final back-vowel stem. This closes both 44's unfinished
  Turkish check and this report's own item 3 for this file.

### Recommendation

Two copy.ts files, four lib/ai/ context files, one more system prompt, three
feature-flag messages, and a handful of singletons — a bounded, nameable list, not a
vague residue. Whoever picks this up next doesn't need to re-run the sweep: the file
list above is the work order.
