# Duplicate universities audit — 2026-08-22

Assigned by the coordination session: finish the job migration 0043's supersession mechanism
half-did. Three parts — trace the live MIT leak, resolve the Al-Farabi rename-vs-duplicate
question, audit for further undetected duplicates.

## 1. The MIT leak — traced, not assumed

**Symptom reported:** researching MIT, a lane found two live `universities` rows
("Massachusetts Institute of Technology" and "...(MIT)") and had to hand-pick which to target,
despite migration 0043's `superseded_by_id`/`duplicate_status` correctly marking the pair
9/9 months ago.

**Not the cause:** the app's own read paths (`app/(app)/universities/page.tsx`,
`lib/universities/alias-search.ts`, `lib/requirements/discover.ts`,
`lib/entities/search.ts`) all correctly filter superseded rows via
`lib/universities/canonical.ts`'s `getSupersededUniversityIds()`. The UI was never the leak.

**Actual cause:** the acquisition/ingestion layer. Five scripts share a near-identical
`loadUniversityCandidates()` function that builds the identity-resolution candidate pool
straight from the raw `universities` table, then hands it to
`lib/acquisition/identity.ts`'s `resolveIdentity()`. Before this fix, only 2 of 5 excluded
superseded rows from that pool:

| Script | Before this fix |
|---|---|
| `scripts/ingest-university-programs.ts` (the actual `npm run ingest:university-programs` path) | **No filter at all** |
| `scripts/ingest-university-programs-batch.ts` | **No filter at all** |
| `scripts/ingest-requirements-deadlines.ts` | **No filter at all** |
| `scripts/ingest-university-requirements-batch.ts` | Pre-filtered via a hand-rolled `Set` + `getSupersededUniversityIds()` |
| `scripts/stage-programs-ingestion-dryrun.ts` (a dry-run *preview* of the exact same `decideIngestion()`/`resolveIdentity()` path `ingest-university-programs.ts` uses) | Post-hoc `canonicalUniversityId()` redirect only |

`resolveIdentity()` is deliberately conservative — a name matching more than one candidate
returns `unresolved` rather than a guess. That refusal logic is correct and untouched. The bug
was that the loser row was still a live candidate at all: a record naming the institution
"Massachusetts Institute of Technology (MIT)" has its parenthetical stripped by
`nameVariants()`, producing a second key that exact-matches the *winner's* raw name, while the
record's own unstripped form exact-matches the *loser's* raw name — two equally valid exact
matches, correctly refused, wrongly forced onto a human.

**Fix applied:** every `loadUniversityCandidates()` now wraps its output in the shared
`excludeSupersededUniversities()` helper (`lib/universities/canonical.ts`) — one mechanism, not
five (or two) divergent ones. Chose pre-filtering over post-hoc redirect because it fixes the
actual reported symptom (the ambiguity never occurs) rather than only repairing an
already-clean-but-wrong match. `ingest-university-requirements-batch.ts`'s hand-rolled filter
was replaced with the shared helper for the same reason: two correct-but-different
implementations drift again.

**Live data check (done before any code change, per the coordinator's stated priority):** zero
rows in `university_programs`, `university_requirements`, or `university_deadlines` reference a
superseded `university_id`. No data repair needed — the failure mode cost lanes time
(hand-picking, or an `unresolved_university` audit row), not data correctness, because
`resolveIdentity()`'s refusal-over-guessing behavior held throughout.

**Tests added** (`__tests__/programs/ingest.test.ts`): a regression reproducing the real MIT
ambiguity end-to-end through `decideIngestion()` — asserts an unfiltered pool still resolves as
`unresolved_university` (proves the scenario is real, not synthetic) and that
`excludeSupersededUniversities()` on the same pool resolves cleanly to the winner id. A prior
version of this test used a record name without the "(MIT)" suffix and passed even against the
unfiltered pool — caught by running the test before assuming it was correct; the real trigger
is specifically the parenthetical-suffixed record name, not the bare name.

**Gate:** `npm run lint` clean, `npm run typecheck` clean, `npm run test` — 110/110 files,
1577/1577 tests (1574 baseline + 3 new).

## 2. Al-Farabi — duplicate, not a rename

Live pair: `Al-Farabi Kazakh National University` (`37f12391-...`, canonical, has
`website_url = https://farabi.university`) supersedes `Farabi University (former Al - Farabi
Kazakh National University)` (`6f0df596-...`, superseded, no website). Both share
`canonical_entity_id = 07c13be2-...`, whose own `canonical_entities.canonical_name` already
reads "Al-Farabi Kazakh National University".

The loser row's name asserts a rename occurred ("former Al-Farabi Kazakh National
University", implying "Farabi University" is the current name). Checked against three
independent sources, not assumed:

- **ROR** (`ror.org/03q0vrn42`): primary `ror_display` name is "Al-Farabi Kazakh National
  University". No "Farabi University" label or alias in any language.
- **Wikidata** (`wikidata.org/wiki/Q427677`): primary label "Al-Farabi Kazakh National
  University". Aliases include "Al-Farabi University" (with the "Al-" prefix) — bare "Farabi
  University" does not appear anywhere.
- **The institution's own site**: `farabi.university` is the domain KazNU's official site
  self-titles under ("Al-Farabi Kazakh National University — KazNU"), not a separate
  institution's site. The DB's own `website_url` on the winner row already records this domain.
  The KazNU-published history (name changed to "Al-Farabi Kazakh State University" in 1991,
  then "Al-Farabi Kazakh National University" since 2001) has no "Farabi University" stage.

**Conclusion: this is a duplicate with a fabricated/garbled name on the loser row, not a
rename.** No schema change needed — `duplicate_status`/`superseded_by_id` is the right model
here, and the current winner/loser direction is already correct. `superseded_by_id` as a schema
does not need to distinguish rename-vs-duplicate for this pair specifically, since there was no
rename to represent.

(If a genuine rename case surfaces elsewhere: `superseded_by_id` alone can't say "these are the
same institution across time" vs. "these are two separately-created rows for one institution" —
that would need either a `supersession_reason` enum (`'duplicate' | 'rename'`) or reusing
`entity_aliases.alias_type = 'legacy'` on the *entity*, not the university row, since a rename
is an entity-level fact, not a duplicate-row fact. Not built, because no case needs it yet.)

**Write made (authorized, sourced):** added `Al-Farabi University` to `entity_aliases` for this
canonical entity (`alias_type = 'translation'`, `verified = true`, `source_url` = the Wikidata
record), so a future name-variant match recognizes it instead of risking a third row being
created for it. Did not add bare "Farabi University" — no source recognizes that exact string,
so adding it would be inventing evidence rather than recording it.

## 3. Broader duplicate audit — no new leads found

All checks read-only against the live `qtcvcflzxbuagvvwahhu` project, 1,019 `universities` rows:

- **Same `canonical_entity_id`, >1 row:** exactly the known 9 pairs. No unbackfilled pair exists.
- **Leading "The" collision** (same country, names equal after stripping): 1 hit (Warwick) —
  already one of the 9.
- **Trailing-parenthetical collision** (same country, names equal after stripping): 3 hits
  (Newcastle, HKUST, MIT) — all already in the 9.
- **Exact normalized-name collision** (unaccented, lowercased, whitespace-collapsed), regardless
  of entity or country: **zero**.
- **Shared `website_url` across different rows:** **zero**.
- **Trigram similarity (`pg_trgm` + `unaccent`) > 0.5, same country, different entity:** ~60
  hits, all checked — every single one is two genuinely distinct institutions sharing common
  structural words ("University of Science and Technology of China" vs "...Beijing",
  "Nottingham Trent University" vs "University of Nottingham", "University of Pennsylvania" vs
  "Pennsylvania State University", etc.). Zero real duplicate candidates. This is the same false-
  positive shape the standing rule already names (Girne Üniversitesi/Girne American University,
  Turgut Özal/Malatya Turgut Özal) — trigram similarity is not a productive method for this
  identifier space; institutional-type and subject words dominate the score, not identity.
  Nothing merged, nothing flagged for merge — no candidate cleared the bar for "certain."

**Conclusion: the duplicate-detection surface is fully accounted for by the known 9 pairs.** No
new merge candidates found or proposed.
