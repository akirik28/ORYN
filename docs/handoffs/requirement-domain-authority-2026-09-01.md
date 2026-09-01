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

## Update, same day — the sweep this doc left open, done

Reviewed (not re-derived) by a second lane, who independently re-verified both open questions
above before extending the fix — see [[project_oryn_gate_f_domain_authority_sweep]] for the
full write-up. Summary for anyone landing on this doc first:

- **The ROR gap is not MIT-specific.** LMU Munich's own ROR record, checked live the same way,
  lists only `lmu.de` — the same shape as MIT's `mit.edu`-only record. This is a property of
  the registry (it doesn't track an institution's secondary/legacy domains), not something
  particular to MIT.
- **`university_official_domain` should not be trusted generically** — recommended against as
  a blanket auto-accept, not just left unimplemented. The gate's value is being a check the
  research pass can't satisfy by asserting something about itself; trusting the field is
  circular for that reason. Worth knowing concretely: even where the field IS populated, it
  isn't always right — LMU's own records all say `university_official_domain: "lmu.de"` even
  though the actual cited `source_url`s are on `uni-muenchen.de` (UvA's records, by contrast,
  correctly say `auc.nl`). A generic auto-accept keyed on this field would have silently missed
  LMU's real gap while fixing UvA's — evidence the field needs a human check per institution,
  not blanket trust, exactly the argument above already made on principle.
- **LMU (`uni-muenchen.de`, 16 rows) and UvA/AUC (`auc.nl`, 16 rows) are the same defect as
  MIT** — both independently live-verified (not just read from the corpus notes) and added to
  `ADDITIONAL_OFFICIAL_DOMAINS` the same way.
- **VU Amsterdam (`assets-eu-01.kc-usercontent.com`, 14 rows, all one PDF) is NOT the same
  defect and was deliberately left out — do not add it.** That domain is a shared multi-tenant
  CMS asset CDN, not VU-exclusive; allowlisting it would trust infrastructure VU doesn't own.
  The underlying fact is real (the PDF is linked from VU's own official page per the record's
  own note) but the correct fix is re-sourcing those 14 records to the actual `vu.nl` page that
  links it — a research task, not a gate change. Full reasoning is in
  `ADDITIONAL_OFFICIAL_DOMAINS`' own code comment in `lib/acquisition/source-authority.ts`,
  specifically so a future edit doesn't "complete" this allowlist by adding the CDN.
- Verified via the same real-data method as MIT: representative real `source_url`/
  `program_name` values pulled directly from the live `requirement_research_queue` rows, run
  through the actual `decideRequirementIngestion()`, plus the full 32 raw payloads (16+16)
  read in full to confirm none carries an unrelated rejection reason that domain-authority
  alone wouldn't resolve.

## Update, same day — `deadline_research_queue` had the identical gap, now fixed too

`lib/requirements/ingest.ts` was the only call site switched to `officialDomainsFor()` above.
`lib/deadlines/ingest.ts` builds `officialDomains` the exact same website_url-only way and
was still on the old construction — meaning MIT's 7 real `malformed_source` deadline rows
(plus 3 LMU, 2 UvA) were *still* rejected even after the requirements-side fix landed,
sitting on domains already curated and verified, just not consumed here. Wired to
`officialDomainsFor()` the same way, zero new verification needed. Regression coverage added
to `__tests__/deadlines/ingest.test.ts` mirroring the requirements-side tests.

## Update, same day — the review-report tool, and what it found on its first real run

Built `scripts/report-uncurated-domains.ts` (`npm run report:uncurated-domains`): reads every
`malformed_source` row across both queue tables, checks the *actual* `source_url`'s domain
(not `university_official_domain` — see below) against the real `sourceAuthority()` gate with
`officialDomainsFor()` already applied, and prints anything still failing as a review
candidate — university, domain, count, one example URL, and the record's own
`source_authority_note` for context. Strictly read-only: no queue row, no
`ADDITIONAL_OFFICIAL_DOMAINS` entry, no live table is touched by the script itself.

**Checks `source_url`'s domain, not `university_official_domain` — an earlier version of
this script checked the claimed field and it was wrong.** Those two usually agree (MIT, UvA)
but don't always: Harvard's own real deadline rows cite `questbridge.org` while
self-reporting `university_official_domain` as the unrelated, already-fine `harvard.edu`.
Checking the claimed field would have run `sourceAuthority()` against `harvard.edu` — which
trivially passes on its own `.edu` suffix — and silently reported zero candidates for a real,
live gap. Checking `source_url` directly is what the actual pipeline does, so it's what the
report checks; `university_official_domain` is now read only as context, flagged in the
output when it disagrees with the real domain (which happened for both findings below).

**First real run found exactly two candidates, and got both right:**
- **Harvard University / `questbridge.org` (1 row, a binding National College Match
  deadline).** A genuinely new gap, not one of the four already swept. QuestBridge is a
  match/scholarship platform with its own binding deadlines — the same underlying shape as
  `APPLICATION_SYSTEM_DOMAINS`'s existing entries (UCAS, Common App, ...) even though it
  isn't one of the systems migration 0042 originally named. Verified institutional
  participation from Harvard's own `.edu` domain (`college.harvard.edu` links directly to a
  QuestBridge application page) before adding it to `APPLICATION_SYSTEM_DOMAINS` — same bar
  as everything else in that set.
- **Vrije Universiteit Amsterdam / `assets-eu-01.kc-usercontent.com` (14 rows) — correctly
  re-surfaced, correctly not auto-resolved.** The exact same shared-CDN case identified in
  the sweep above. The tool doesn't know that's the reason to leave it alone — it just
  reports "still failing, here's why" — which is exactly right: the human judgment that this
  one needs a different fix stays a human judgment, made once, not re-litigated by the
  report and not silently overridden by it either.

Re-running the report after the QuestBridge fix shows exactly one candidate left (VU), which
is the correct, complete state as of this writing — every other real gap found by hand
tonight is now either curated or correctly still excluded.
