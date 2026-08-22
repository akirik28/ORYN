# RES-I1 lane closeout — 2026-08-22

**Package I1-5, assigned by ORYN-BASORG as a stopping point.** This document consolidates
everything from this lane's four prior handoffs (`i1-corpus-reconciliation-2026-08-22.md`,
`i1-batch2-dryrun-2026-08-22.md`, `i1-batch2-apply-2026-08-22.md`,
`i1-supersede-gap-design-2026-08-22.md`) into one place, so a cold session can pick this
territory up without reading all four. Those documents remain the detailed record; this is
the map to them.

Live state re-measured immediately before writing this, 2026-08-22 12:05 UTC:
`university_programs` **16,119**, `university_requirements` **1,254**,
`university_deadlines` **396**, Edinburgh **98**, Waterloo **107**, Glasgow **101** —
unchanged since the last write below, confirmed fresh, not carried forward.

## 1. What is live because of this lane

| Change | Before | After | Package | Executed by |
|---|---|---|---|---|
| Edinburgh +3, Waterloo +2 in `university_programs` | 16,114 | **16,119** | I1-2 apply | **RES-I1 (this lane)**, full re-measure/dry-run/apply/idempotency/invariant procedure. `docs/handoffs/i1-batch2-apply-2026-08-22.md`. |
| CA programme batch: Montréal 679, Queen's 337, Alberta 96, Western 545 (+1,657 total) | 14,457 | 16,114 | pre-existing | **ORYN-CEO, before this lane's session started.** This lane only re-confirmed it live-unchanged at session start and never touched it — flagging explicitly per a namespace note ORYN-CFO raised: `docs/handoffs/i1_ca_1657_ingest-report.md` is filed under this lane's naming convention (`i1_...`) but its own text states ORYN-CEO executed it. Do not attribute it to a RES-I1 session run. |

**Total this lane actually wrote to the live database this session: 5 rows, one apply,
zero migrations, zero schema changes.** Everything else in this lane's output is
measurement, reconciliation, or design — read-only.

## 2. What is blocked, on whom, on what specifically

| Item | Records | Blocked on | What exactly needs to happen |
|---|---|---|---|
| `url_repair_*`'s corrections | 1,429 (of 1,437 target rows; 8 already no-ops) | **V-lane content verification** — not yet assigned, both verifiers mid-package per BASORG | Someone needs to confirm each corrected URL is actually the right page before any apply. The write mechanism (Path A) is designed; the content hasn't been checked. |
| Glasgow's resolvable enrichment set | 62 (of 101; the other 39 have no matching live row or lack a `degree_type` to enrich with) | **V-lane content verification** — same as above, not yet assigned | Confirm each filled `degree_type` is correct before any apply. Identity resolution (URL-exact-match) is designed and verified; content correctness is not. |
| `tr_bilingual_names_*` | 175 | **Founder schema decision** | No column exists on `university_programs` for `turkish_name`/`faculty_tr`-equivalent data at all. Needs a schema design + migration before any ingestion path can even be built, let alone run. |
| `kilavuz_codes` (subset of the same 175 records) | up to 175, several per record | **Founder — and a redesign, not just an approval** | The already-written, founder-pending `migration 0057` is a single flat `text` column; the real data is one-to-many per programme (a Koç International Relations record alone carries 3 tiers). 0057 as written would not represent this even if approved as-is. |
| Michigan/CMU/UCLA retire-and-replace | 160 (52 CMU + 36 UCLA + 72+13 Michigan) | **Founder — a migration** | Path B requires adding `duplicate_status`/`superseded_by_id` to `university_programs`, mirroring `universities`' existing pattern. Design proposed, no migration written; needs founder authorization to write and apply one. |
| Dartmouth | 53 | **Founder — domain-authority gate** | Registrar-contracted vendor catalogue platform fails `sourceAuthority`. Same class as McMaster/Western-Huron below. Gate must not be widened; only a founder decision changes this. |
| McGill | 288 | **Correctly gate-blocked, not actually pending** | `archived_capture` retrieval method, honestly excluded by the evidence gate. Listed for completeness, not because it's waiting on anyone — this one is working as intended. |
| McMaster | 432 | **Founder — domain-authority gate** | Registrar-contracted `romcmaster.ca`. Same class as Dartmouth. |
| Western/Huron | 5 | **Founder — domain-authority gate** | Affiliated-college `huronu.ca`. Same class as Dartmouth/McMaster. |

Nothing in this table is this lane's to resolve next — each row names a specific person
(founder) or role (V-lane verifier) and a specific missing decision or check, not a vague
"blocked."

## 3. The supersede-gap design, final form

Full detail and the underlying measurements: `docs/handoffs/i1-supersede-gap-design-2026-08-22.md`
(original + addendum, both in one file). Summary for a cold reader:

**Three distinct gaps, not one** — treating them as one problem produces the wrong design
for at least two of them:

- **Path A — in-place update by resolved identity.** For `url_repair` (identity given
  directly via `program_id` in the file) and Glasgow's enrichment case (identity not given,
  needs resolving — see below). Two sub-modes with different evidence bars, which the
  proposed audit-queue table must record separately, not identically:
  - **Correction**: replace an already-populated value, on explicit evidence it was wrong
    (`url_repair`'s `previous_official_program_url`/`correction_type`/`evidence_note`).
  - **Enrichment**: fill a currently-`NULL` value only, per RULE-INGEST-003 — makes no claim
    about any existing value being wrong, because there is no existing value.
- **Path B — retire-and-replace.** For Michigan/CMU/UCLA: the old row is a worse capture
  (points at a shared index page), not a single stale field. Mirrors `universities`' existing,
  working `duplicate_status`/`superseded_by_id` pattern exactly rather than inventing a new
  one — a new, better-sourced row goes through the *normal* `decideIngestion` insert path (it
  legitimately has a different dedup key by URL), then a separate step marks the old row
  superseded.
- **Identity resolution rule, binding, verified directly against a real counter-example**:
  when a research record doesn't carry a live `program_id`, resolve identity by **exact
  `official_program_url` match only — never by name, stripped or otherwise.** Confirmed
  directly (not taken on description) that name-based resolution would have merged Glasgow's
  file record "Music [BMus]" (`.../musicbmus/`) into live's "Music" (`.../musicma/`, the MA
  programme) — two different degrees, zero URL overlap, a silent wrong-merge if resolved by
  name. Zero URL matches → falls through to the normal `decideIngestion` path unchanged
  (nothing to enrich). Multiple URL matches → routes to manual review, never auto-resolved.
  Applying this rule to Glasgow's 93 populated-`degree_type` candidates found **62 resolve
  cleanly, 31 don't** (those 31 overlap the already-known partnership/dual-degree/
  graduate-entry variants and stay in RES-V1's research-adjudication queue).
- **`kilavuz_codes`'s one-to-many shape** doesn't fit either path or the pending migration
  0057 — it's a schema question, not routed anywhere here (see §2).

No implementation, no migration, no code change, no writes — proposal only, throughout both
I1-3 and I1-4.

## 4. Corrections to stale docs — so the next session doesn't inherit them

**`docs/ORYN-OVERNIGHT-2026-08-22.md` line ~178: "Michigan, CMU and UCLA each need their old
rows retired... all three had every stored row pointing at a single index page" is no longer
accurate.** Re-measured directly during I1-3: it was true when written, but is not true now
— work landed on these three since then. Current real numbers:

| University | Live rows | Distinct URLs | Largest shared-URL cluster |
|---|---|---|---|
| Carnegie Mellon | 158 | 85 | 52 |
| UCLA | 181 | 146 | 36 |
| Michigan | 226 | 136 | 72 (+ a second 13-row cluster) |

**160 rows across the three, not "every row."** The underlying problem is real and still
needs Path B — just smaller in scope than the overnight doc states. Anyone sizing this work
from that doc alone will overestimate it.

## 5. Verification dependency — stated as a precondition, not an authorization

**Neither `url_repair`'s 1,429 corrections nor Glasgow's 62 resolved enrichment candidates
may be applied on the strength of anything in this lane's design work.** Everything produced
here (identity resolution correctness, the enrichment/correction distinction, the write
mechanism) answers "can this be written safely, mechanically, without ambiguity or
corruption." None of it answers "is the specific content — this URL, this degree_type —
actually correct." That is unverified, is explicitly V-lane work, was never assigned to this
lane, and is a hard precondition: apply nothing from either set until it clears
content-correctness verification, regardless of how sound the mechanism is.

## What this lane did and did not do, for the full session

**Did**: confirmed the CA package unchanged and untouched; ID-level (not count-based)
reconciliation of the university-programs research corpus; found and reported one genuine
gap (`acquire-programs-batch2`); ran a faithful dry-run of that gap; caught nothing itself in
Glasgow's false-clean dry-run result but reported the anomaly rather than treating a clean
gate as authorization, which is what let BASORG catch the actual defect; applied exactly the
5 rows BASORG approved, with full procedure and an invariant check that confirmed the scope
didn't leak; scoped and designed a fix for the insert-but-not-supersede gap across three
distinct sub-problems; verified a binding constraint directly against real data before
building on it, twice (Glasgow's URL/name check, and re-measuring Michigan/CMU/UCLA rather
than trusting the overnight doc).

**Did not**: write to `opportunities*` (not this lane's territory); widen or coach around
the evidence gate for any of McGill/McMaster/Western-Huron/Dartmouth; touch Glasgow's other
39 unresolved records; author any migration; apply anything beyond the one BASORG-approved
5-row batch; invent work outside an assigned package.

## Status

**Lane standing down, per BASORG's explicit call — this is a natural stopping point, not an
idle gap.** Everything remaining in this territory is blocked on the founder or on V-lane
verifiers, neither of which this lane can act as. `oryn/res-i1-ingestion` pushed, `ORYN_WORKSTREAMS.md`
row updated to closed-out. No PR opened (per BASORG's standing no-PR-needed call for this
lane's work); if a future session resumes this territory, this document plus the four it
consolidates are the complete record.
