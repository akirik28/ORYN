# S8 — Independent Research QA Gate

**Role claimed:** 2026-08-26, per the Common Operating Contract (Research Freeze Week) and a
direct role assignment message ("ROLE: ORYN RESEARCH SERVER S8 — INDEPENDENT RESEARCH QUALITY
ASSURANCE"). Not a discovery/production lane — this session does not add records, source photos,
or fix data. It independently inspects what other lanes (S1-S7) claim, and can downgrade
`PRODUCTION_READY` claims that don't hold up.

**Worktree/branch:** `.claude/worktrees/s8-qa-gate`, branch `oryn/s8-qa-gate`, off
`origin/main`@`f7af914`. Writes are confined to this worktree and to files under
`data/research/qa/` — never edits another lane's proposal/tracker files directly (flag, don't
edit). No Supabase writes; every DB touch is a read-only `SELECT`.

## Two QA tracks (per the contract)

- **Track A — Fact / eligibility / currentness**: Turkey eligibility, international eligibility,
  citizenship/residency restrictions, age/grade, school nomination, national delegation, current
  cycle, deadline, application dates, cost, financial aid, organizer/provider_type/host
  institution, official/application URL correctness, program status. Watches specifically for
  stale (2024/2025) dates presented as current, dead programs, US-resident/citizen-only programs
  shown as open, unresolved international restrictions, commercial programs mislabeled as
  official university programs, unsupported prestige/selectivity claims.
- **Track B — Image / duplicate / canonicalization / link integrity**: exact/fuzzy/yearly/
  umbrella duplicates, alias and organizer/domain collisions; for images specifically — real
  photograph vs. logo/crest/seal/poster/banner/screenshot/AI-image/stock, correct entity depicted,
  source URL present and resolving, rights status captured, honest host-campus labeling where
  used.

## Baseline measured live, 2026-08-26 (before auditing any new research-freeze output)

Project `qtcvcflzxbuagvvwahhu` (`oryn-qa-scratch`), measured directly via `execute_sql`:

- `universities`: 1,019 rows. **CORRECTED (first pass missed this — see below): a real image
  pipeline already exists**, hidden in an EAV-style table (`university_profile_metrics`, rows
  keyed by `metric_code`) rather than a named column, which is why the initial
  `information_schema.columns` name search reported a false "zero infrastructure" finding — the
  CEO session's independent migration-grep check made the identical mistake for the identical
  reason, caught by a peer (S1/S2/CFO), not by either of us. Real state, queried directly:
  `primary_image_status` across universities — `wikimedia_verified`=525, `official`=194,
  `needs_review`=180, `verified`=2 (901/1,019 touched). 721 have a resolved `primary_image_url`
  in Supabase Storage bucket `university-images/<id>/campus.webp`, sourced from Wikimedia Commons
  (license + attribution + checksum captured) or an official university page
  (`source_type='official_primary'`). 118/1,019 have no entry at all (real backlog). No
  `metric_code` yet exists for the contract's specifically-named `no_logo_verified`/
  `correct_entity_verified`/`rights_status` fields — `status`+`license` partially cover that
  ground but not at that granularity. `verified_at` timestamps run ~2026-08-18, over a week
  before this freeze — this is prior art from an earlier session, not this week's output.
  `opportunities` genuinely has no image-adjacent column or EAV entries of its own (checked after
  this correction, not assumed) — that half of the original finding held up. Track B (S8-B) is
  now auditing this real pipeline's actual quality (sample-verify real-photo-of-correct-entity,
  characterize the `needs_review` backlog, check whether `official`-sourced images have any
  captured usage right at all) rather than confirming a gap that isn't real.
- `opportunities`: 421 rows. `(status, verification_state)` breakdown:
  `active/unverified=73`, `active/verified_current=203`, `expired/unverified=1`,
  `under_review/conflicting=1`, `under_review/unverified=123`, `under_review/verified_current=2`,
  `disabled/unverified=17`, `disabled/verified_current=1`. Per `lib/counselor/state.ts` and
  `lib/counselor/eligibility.ts` (confirmed by RES-CR1 2026-08-23, re-trusted not re-derived here
  yet), only `verification_state='verified_current'` rows reach real recommendations regardless
  of `status` — so **203 rows are the actual harm surface**, not 277/421.
- `university_programs`: 17,046. `canonical_entities`: 1,174.

As of this baseline, no S1-S7 output had landed on any pushed branch yet (checked
`git log --all --since` and sibling worktrees `research-ceo-control-tower` /
`s7-other-high-value-opportunities`, both still at the `origin/main` tip). So this pass opened
with a **baseline audit of the pre-existing live corpus** — most of which has never been
checked against this specific rigorous framework — rather than sitting idle. Two agents dispatched
for Track A and Track B; findings land in this directory as `s8_qa_track_a_*.md` /
`s8_qa_track_b_*.md`, each with per-record verdicts and a rollup count. A consolidated Final Full
Audit (per the contract's exact requested format) follows once there's real S1-S7 output to fold
in, or at the founder's request before the freeze closes — whichever comes first.

## Track A — complete, 2026-08-26

Full report: [`s8_qa_track_a_2026-08-26.md`](./s8_qa_track_a_2026-08-26.md). 38 rows checked
(live SQL + live re-fetch on every verdict, none pattern-matched from a prior doc without
independent re-check): **17 `PRODUCTION_READY`, 11 `VERIFIED`, 10 `REJECTED`, 0 `BLOCKED`.**

**Most important finding**: 5 of the 10 `REJECTED` rows are on live `status='active' AND
verification_state='verified_current'` records — the actual 203-row recommendation harm surface,
not just Browse. İTÜ Lise Yaz Okulu 2026, Özyeğin Summer Research Program, Istanbul Bilgi
University Summer School, THIMUN, InvestIN — real students are being shown wrong deadlines/cycle
status or a false "no cost information" on a confirmed-paid program, right now. Reported to S9
for routing to whichever lane can apply the fix, including the exact row ids and citations in a
copy-paste-ready format for founder escalation.

**Self-correction, logged for the record**: the report originally said 7, naming Interlochen
Review and JEI alongside the 5 above — sourced from the subagent's own completion summary rather
than its written file. Before finalizing the founder-bound list, re-verified all 6 candidates
directly via live SQL and found both are actually `unverified`/`under_review` — Browse-only, not
harm-surface. Corrected in the source report and re-sent to S9 before it reached the founder in
the wrong form; S9 confirmed the correction landed in time. Standing lesson for this lane: a
subagent's own spoken summary is not the artifact — re-check the written file, and for anything
founder-bound, re-verify the specific claim directly regardless of how well-evidenced the rest of
the report is.

**Second finding, structural not per-row**: two 2026-08-24 dry-run documents
(`GAP_CLOSURE_5RECORD_DRYRUN_2026-08-24.md`, `TUBITAK_6OLYMPIAD_DRYRUN_2026-08-24.md`) still read
"awaiting review / no production write yet" in their own closing lines, but live SQL confirms all
11 proposed records were written to production on 2026-08-23, hours before either document's file-
save time. The documents are stale about their own execution status — a real process gap, not a
data defect. Recommended fix: a one-line "APPLIED [timestamp]" stamp the moment a write actually
happens.

Two items re-confirmed still broken from the 2026-08-23/24 corpus (HMMT deadline still null, AMC-
AIME `official_url` still wrong) and one wrong-entity row still unfixed (Stockholm Water Prize) —
all three are currently `verification_state=unverified`, so Browse-only, not in the harm surface,
but still visibly wrong to anyone browsing and still open 3 days after being flagged with evidence.

## Track B — complete, 2026-08-26

Full report: [`s8_qa_track_b_2026-08-26.md`](./s8_qa_track_b_2026-08-26.md). Confirms and sharply
extends the mid-session correction — this is no longer provisional.

**The rights-gap question is now answered, not provisional: 0 of 194 `official`-sourced university
images have any captured usage right — 100%, confirmed by a control check (the `wikimedia_verified`
path captures license reliably, so this isn't a query bug).**

**New, more important finding: `status='official'` is not a reliable quality signal at all.** A
20-image direct visual inspection (7 `official`, 13 `wikimedia_verified`, deliberately not
overlapping S3's 3 IDs) found 3-4 of 7 `official` rows are a flat logo/crest/mascot photo, not a
campus photo, while 13 of 13 `wikimedia_verified` rows passed clean. `official` status currently
only confirms the source fetch succeeded, not what the image actually shows — combined with S3's
independent 2-of-3 failure, the fleet now has 23 non-overlapping spot-checks pointing the same
way. The `needs_review` gate is purely dimensional (resolution/aspect-ratio) with no content-based
logo detector — concretely proven by one real campus photo (King Faisal University) stuck in
`needs_review` over an 8%-narrow technicality while a real logo (Alfaisal University) was only
caught because it happened to also be undersized.

Also: `opportunities` image gap reconfirmed as genuinely 0% (not a blind spot this time) — zero
image-shaped table or column anywhere for that table, and the UI call sites never pass `imageUrl`
regardless. Boston University and SAIC duplicate fixes both **confirmed holding**. 11 URL-collision
clusters found on `opportunities` (3 legitimate coincidences, 8 real duplicates — 8 already
resolved by disabling the weaker row, 5 more still unresolved). 362 URLs live-checked: 5 confirmed
404 (one record, UWC Short Courses, has both its URLs dead), 1 confirmed unstable (522), CJSJ
confirmed **still** broken (never fixed despite being flagged 2026-08-24), Mathworks and Fordham
confirmed fixed. `opportunities.official_url` has no unique constraint, unlike `university_programs`.

## Standing rules this lane follows

- Never fixes a fact by guessing. A downgrade recommendation always cites the evidence that
  contradicts the current claim (a live re-fetch, a SQL result, a contradiction between two
  official sources) — never a hunch.
- Verdicts use the contract's states: `CANDIDATE` / `VERIFIED` / `PRODUCTION_READY` /
  `REJECTED` / `BLOCKED` (`BLOCKED` = evidence conflict or access issue that needs a human, not a
  quality failure). A downgrade is a recommendation in this lane's own report, not a live DB
  write — the owning lane or CEO applies it.
- Cross-checks worker status labels against live state directly (DB query or a real re-fetch),
  never trusts a status label or a peer's claim at face value.
