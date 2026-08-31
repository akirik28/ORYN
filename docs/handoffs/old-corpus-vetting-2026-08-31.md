# Vetting the pre-2026-08-31 research corpus — 2026-08-31

Assigned by CEO after the university-depth pass ([[project_oryn_university_depth_lane]]):
a dry run of `data/research/university-requirements/` before that pass showed 68
requirement + 21 deadline records `accepted` (would insert cleanly) but never applied.
Brief: sample it, report countries/universities/source age, flag dead `source_url`s or
passed `cycle_year`s, say whether the `accepted` verdict came from a human or a script —
report numbers before writing anything.

## What's actually in the accepted set

89 records total (68 requirements + 21 deadlines), from files dated 2026-08-21 and
2026-08-22 — 9-10 days old. All `confidence: high`, all `text_fidelity:
verbatim_quoted`, all `source_type: official_primary`.

**Countries — this is the headline finding**: Denmark (22), Belgium (15), Finland (17),
Austria (12), Sweden (9), Norway (10), **Turkey (4)**. That's it. Nothing from Germany,
France, Spain, Switzerland, Italy, the US, or Canada made it into the accepted set —
every record for those countries in this same directory resolved to `duplicate`
(meaning it was already applied in an earlier pass) or another non-accepted outcome, not
because I filtered them out. Only the 6 Nordic/Alpine countries above, plus 4 Turkey
rows, are actually sitting here unapplied.

None of Denmark, Belgium, Finland, Austria, Sweden, or Norway are in the founder's
target list for the university-depth work that was just finished (Turkey, UK, US,
Netherlands, Italy), and the founder's own instruction for that work was explicit:
"YENİ ÜLKE EKLEME" — do not add new countries. Applying 85 of these 89 records would do
exactly that, regardless of how good the data is. That's a scope call, not a quality
one, and it's the founder's or CEO's to make, not mine — so I did not apply them. See
"What I did" below.

The 4 Turkey records ARE in scope: they're for Ankara Üniversitesi, one of the 40
institutions from the just-finished depth pass, and non-duplicate against what's already
there.

## Source freshness — checked, not assumed

26 unique `source_url`s across all 89 records. Checked every one directly (`curl`,
follow redirects, real browser user-agent) rather than sampling: **26/26 return HTTP
200.** No dead links in this corpus.

Every record's `cycle_year` was also checked against today (2026-08-31):
- **4 deadline records have a `dated_specific` date already in the past**: Helsinki
  (2026-01-16, 2026-03-24), Lund (2026-01-15), Vienna (2026-05-04). All four are also
  self-labeled `verification_state: VERIFIED_HISTORICAL` by the research pass itself —
  the researcher who wrote these already knew, at the time, that they were recording a
  closed cycle's date, not a live one.
- 3 more deadline records (Aalto ×3) are also `VERIFIED_HISTORICAL`, each with a real,
  extractable January-2026 date in `deadline_text_verbatim` ("7 January 2026...
  Application period starts", etc.) — but marked `recurrence: recurring_annual_undated`
  rather than the `VERIFIED_RECURRING_UNDATED` label used elsewhere in this same corpus
  (Copenhagen, DTU, NTNU) for facts the researcher was confident recur every year. The
  researcher's choice of the more cautious `VERIFIED_HISTORICAL` label here reads as "this
  was true for one specific past round, not confirmed as a stable annual pattern" — a
  meaningful distinction, and the reason to exclude these three rather than write them in
  as if they were the same kind of fact as the confirmed-recurring ones.
- 1 requirement record (Helsinki, `REQ-2026-08-22-FI-HEL-001`) is also
  `VERIFIED_HISTORICAL`.
- Everything else (58 requirements `VERIFIED_UNDATED`, 11 deadlines
  `VERIFIED_RECURRING_UNDATED`, remaining `VERIFIED_CURRENT`) is either dateless-by-
  nature (an eligibility floor doesn't expire the way a deadline does) or still
  forward-looking. Spot-checked one `VERIFIED_UNDATED` record (KU Leuven, A-level
  eligibility floor) in full: verbatim-quoted, correctly resolves to `kuleuven.be` as an
  authoritative source via the matched university's own `website_url` even though the
  record's own self-reported `source_authority_passes_gate: false` says otherwise — the
  live ingestion-time check is the one that actually runs, and it's right; the record's
  self-assessment was written without that check available. Not a defect, just a note
  for anyone reading these records' own fields at face value.

**On the 7 `VERIFIED_HISTORICAL` deadline records specifically**: writing these to
`university_deadlines` is not unsafe by this codebase's own design —
`NON_ACTIONABLE_VERIFICATION_STATES` in `lib/deadlines/ingest.ts` already exists
precisely so `lib/deadlines/upcoming.ts` and `lib/deadlines/scan.ts` correctly exclude
`VERIFIED_HISTORICAL` rows from "Due soon" and notifications (confirmed working, per
`docs/feat2-loop-audit-2026-08-22.md`). So the app wouldn't mislead a student even if
these were inserted as-is. I excluded them anyway, on the CEO's own stated standard
("drop anything ... whose cycle year has passed") — a safely-hidden dead fact still adds
nothing for a current student, and reporting "genuinely closed one gap" is a truer
description of this pass's actual value than "inserted 89 rows, 7 of which nothing will
ever show."

**On the 1 `VERIFIED_HISTORICAL` requirement record**: this one IS a real display gap,
already documented elsewhere in this exact codebase —
`lib/requirements/shape-audit.ts:206-212` flags precisely this: `university_requirements`
has no equivalent "non-actionable" filter the way deadlines do, so a `VERIFIED_HISTORICAL`
requirement would render on a university page with no distinguishing treatment, looking
exactly like a current one. Excluded it from this pass for that reason. Worth a small
follow-up ticket on its own — `lib/requirements/shape-audit.ts` already names the fix
(`UNSAFE_VERIFICATION_STATES` in `lib/requirements/ingest.ts` doesn't list
`VERIFIED_HISTORICAL`, on the strength of a stale comment asserting the state "never
appears on a requirement record in this corpus" — which this one record now disproves).

## Human or script?

Script, at both steps, and worth being direct about since it was asked plainly. The
`accepted` verdict itself is 100% mechanical — `decideRequirementIngestion` /
`decideDeadlineIngestion` are pure functions with no human review step in the loop. And
the underlying facts (`verification_state`, `confidence`, `text_fidelity`) are
self-declared by whoever produced the JSONL — an earlier research pass (almost certainly
another Claude session, going by the file-naming and comment style, not a human reading
these 26 pages and typing JSON). Neither layer is human-checked. That's not unique to
this corpus — it's how every batch in this pipeline works, including the one I produced
for the 40-institution depth pass, and I said so plainly when I reported that one too.

One structural clue worth naming: `docs/research/university-requirements/` has summary
docs for `de-nl`, `fr-it`, and `us` batches — each with its own per-university review
table — but none for the Nordic/Alpine batch (`nordic_requirements_*`,
`2026-08-22`) that makes up 85 of these 89 accepted records. The other three regions'
batches show up in this corpus as `duplicate` (already applied, presumably after that
review). The Nordic batch looks like research that was done and never got its review
pass — which is a coherent explanation for why it's sitting here unapplied, not evidence
of a data problem.

## What I did

**Applied**: 4 Ankara Üniversitesi requirement rows (standardized-test and minimum-grade
facts, all verbatim-quoted from `isoidb.ankara.edu.tr`, confirmed live, non-duplicate).
In scope, high quality, no reason to hold them.

**Not applied — flagging for a scope decision, not a quality one**: the remaining 85
records (Denmark, Belgium, Finland, Austria, Sweden, Norway). The data itself checks out
— live sources, verbatim quotes, high confidence, and (setting aside the 8 flagged
`VERIFIED_HISTORICAL` rows above) forward-looking. The only reason they're not applied
is that inserting them would expand ORYN's country coverage on the same day the founder
told this exact initiative not to. If the founder wants Nordic/Belgian/Austrian depth as
a next phase, this corpus is ready to go with minimal further work — closing this gap is
a scope decision, not a data-quality one, so it's reported rather than decided here.

## Verification

`npm run lint`, `npm run typecheck`, `npm run test` (2657/2657 passed, 180 files),
`npm run build` all green on branch `oryn/corpus-vet-2026-08-31`, branched from
`origin/main` (post-merge, `5fda1492`).
