# Requirement-ingestion domain-authority gap — MIT unblocked

**2026-09-01. Branch `oryn/requirement-domain-authority-2026-09-01`. Pushed, not merged.**

## What this is

A side-finding surfaced while scoping the Gate F target-set document (checking the staged
corpus before writing anything, per instruction): all 44 of MIT's `requirement_research_queue`
rows — MIT is the single most-targeted school in the pilot cohort's real `target_universities`
data, 5 of 8 students — were rejected `malformed_source`. Every one of them cited an official
`mitadmissions.org` page. `lib/requirements/ingest.ts` built the `officialDomains` set passed to
`sourceAuthority()` from `matchedUniversity.websiteUrl` alone (`web.mit.edu`), and
`mitadmissions.org` carries no `.edu`/`.gov` suffix for `looksOfficial()` to catch on its own.

This is the same gap class documented 11 days ago in
`docs/research/university-requirements/source-authority-gap.md` (Piece A: institution
official-domain provenance) — confirmed still live against current code, not assumed from the
old doc.

## What I checked before writing any code

- **ROR does not have this domain.** MIT's real ROR record (https://ror.org/042nb2s44, queried
  live) lists exactly one domain: `mit.edu`. So implementing Piece A's proposed fix in full
  (ROR-sourced official-domain provenance) would **not** have closed this specific gap — the
  fact `mitadmissions.org` is MIT's real admissions site isn't something ROR encodes at all.
  Worth knowing before anyone spends real effort on the ROR-integration piece expecting it to
  fix MIT.
- **`mitadmissions.org` is genuinely MIT's official domain**, verified live, not guessed: it
  resolves (HTTP 200), and is directly cross-linked from MIT's own already-`.edu` page
  (`web.mit.edu/admissions`).
- **The existing `universities.admissions_url` column doesn't already hold this.** MIT's real
  row has `admissions_url: "http://web.mit.edu/admissions"` — same domain as `website_url`, not
  `mitadmissions.org`. Wiring up that column as-is would not have closed the gap either.
- **Production has two MIT rows** — `03167d0c-2315-49e3-a37e-f9c9c7d2d27c` (real, populated,
  the one all 44 queue rows actually reference) and `ba3a30b2-c6e2-4a0f-ba32-6da028175d35`
  ("Massachusetts Institute of Technology (MIT)", both URLs null, **zero** queue rows
  referencing it — an orphan duplicate, not on the blocking path). Not fixed here — a live-table
  data-quality cleanup, founder-gated, and outside this fix's scope. Flagging it, not touching it.

## The fix

`officialDomainsFor(university)` in `lib/acquisition/source-authority.ts` — builds the same
website-domain set every call site already built inline, plus a new small hand-curated constant
`ADDITIONAL_OFFICIAL_DOMAINS` (one entry: MIT → `mitadmissions.org`), keyed by exact
`universities.name` so it can't cross-match the orphan duplicate above. Same verification bar as
`APPLICATION_SYSTEM_DOMAINS` — "live-fetched, not guessed" — documented in the constant's own
comment with the ROR/`admissions_url` findings above, so the next person doesn't have to
re-derive them.

Only `lib/requirements/ingest.ts` was switched to use it — the one call site with a confirmed,
live-demand institution actually blocked by this today. **Five other call sites build the same
website_url-only set and share this exact limitation**, left untouched rather than widening this
fix on spec: `lib/programs/ingest.ts:267`, `lib/deadlines/ingest.ts:277`,
`scripts/verify-safe-subset.ts:83`, `scripts/acquire-university-images.ts:327`,
`scripts/acquire-programs.ts:413`. `officialDomainsFor` is exported and ready for any of them to
adopt the same way.

## A bigger, separate finding — not implemented, flagged for review

Each research record in this corpus already carries its own `university_official_domain` field
— for all 44 MIT rows, correctly `mitadmissions.org`, with a `source_authority_note` the original
research pass wrote itself: *"mitadmissions.org is MIT's official admissions site but carries no
.edu suffix, so looksOfficial() returns false. Same gap class as the application systems."* The
research pass had already identified and documented this exact gap. **The ingestion pipeline
never reads this field at all** — `ResearchRequirementRecord`/`decideRequirementIngestion` has no
reference to `university_official_domain` anywhere.

If the other three institutions I'd earlier flagged as domain-gap-affected (LMU Munich, 16
records; University of Amsterdam, 16; VU Amsterdam, 14 — not independently re-verified the way
MIT was) carry the same field, consuming it generically would unblock all four at once, and any
future one, without a hand-curated entry per institution. **I did not implement this.** It's a
real trust-boundary decision — a per-record, research-pipeline-declared domain is a different
kind of claim than a hand-reviewed, individually-verified code constant, and deciding how much to
trust it is exactly the kind of call this session's standing discipline says to surface rather
than make unilaterally mid-task. Flagging it here as the more scalable follow-on; not mine to
decide alone.

## Verified, not applied

Ran the actual, already-gated `decideRequirementIngestion()` against all 44 real
`requirement_research_queue.raw_payload` rows for MIT (read-only — pulled via SQL SELECT, fed
through the function in-process, zero writes, zero AI credits spent):

```
Outcome counts across all 44 real MIT queue payloads, run through the fixed gate:
{ accepted: 44 }
```

Zero remaining rejections. **I did not promote these 44 records to the live
`university_requirements` table.** That is a founder-gated live-table write, not a code fix, and
is a separate action from what's in this branch. The queue rows themselves are also untouched —
their `outcome` still reads `malformed_source` in the database; only the code that will evaluate
the *next* ingestion run is fixed. Re-running the real ingestion script
(`scripts/ingest-requirements-deadlines.ts` or equivalent) against this corpus is the actual next
step, and needs founder sign-off before touching `university_requirements`, per standing policy.

## What this changes for the Gate F target-set document

MIT — the #1-demand school in the pilot cohort — was about to be scoped as "needs requirement
research from scratch." It doesn't. It has 44 already-fetched, already-correctly-sourced,
now-provably-passing official-page facts sitting one founder-approved promotion step away from
live. The target-set document will reflect MIT's true status as "researched, blocked by a fixed
ingestion bug, pending promotion" rather than "thin."

## Gates

All 4 green in the worktree: lint clean, typecheck clean, full suite 212 files / 3102 tests
passing (2 new files' worth of regression coverage: `officialDomainsFor` unit tests in
`__tests__/acquisition/source-authority.test.ts`, and an end-to-end
`decideRequirementIngestion` regression in `__tests__/requirements/ingest.test.ts` proving the
fix is MIT-specific, not a blanket relaxation — a same-shaped record for an uncurated university
still correctly fails). Build clean.

## How to apply

- Founder/engineering: decide whether to (a) promote MIT's 44 records now that they're verified
  to pass, and (b) whether/how to consume `university_official_domain` generically rather than
  growing `ADDITIONAL_OFFICIAL_DOMAINS` one hand-curated entry at a time.
- Whoever picks up LMU/UvA/VU Amsterdam depth: check whether their own queue rows carry
  `university_official_domain` before assuming they need the same one-off treatment MIT got here.
