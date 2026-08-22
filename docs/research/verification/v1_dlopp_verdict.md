# Verification verdict — DLOPP opportunity deadlines & cycle status, package 1 (RES-V1)

**Verifier lane:** RES-V1 (contract / schema / ID validation) · **Verified:** 2026-08-22
**Branch:** `oryn/res-v1-validation` · **Tool:** `scripts/validate-research-records.ts --lane=dlopp`
**Subject:** RES-R2's `origin/oryn/res-r2-opportunity-deadlines` @ `f6dd24d` —
`data/research/opportunities/dlopp_batch1.jsonl` … `dlopp_batch5.jsonl` (DLOPP-B1-01
… DLOPP-B5-15, 74 records). This batch merged to `main` via PR #13 partway through this
verification (commit `03f7937`); content is byte-identical on both refs (confirmed by
git blob hash), so the batch validated here and the one now on `main` are the same
artifact. Researcher files were **not modified**. Live DB was **not written** — every
check below is a read-only query (Supabase MCP, project `qtcvcflzxbuagvvwahhu`).

## Overall verdict: **PASS — research and contract sound; ingestion is GATED**

74/74 records pass contract, ID, and live-identity validation. Zero fabrication defects,
zero synthesized years, zero ID collisions. **Nothing here is a defect in RES-R2's
research** — every record is an honest, internally-consistent account of what its source
did or didn't say, including the 9 records that correctly recorded "I could not
determine this."

The gate is downstream, at ingestion: **9 records use a research-vocabulary value that
has no live-schema equivalent, and a monotonicity audit across all 74 records × all
3 candidate write-target fields found 21 cases where a naive field-by-field write would
replace real, informative live data with something less informative.** This is not
hypothetical — 6 of the 9 vocabulary-gap records would strip an already-determined,
already-student-facing `cycle_status` (including "open" on one row) down to
"unverified." **RES-I2 may not ingest this batch by direct field mapping until the
monotonicity guard below (RULE-INGEST-003, ORYN-BASORG, 2026-08-22) is implemented as a
precondition, not a per-record judgment call.** This is the same disposition
ORYN-BASORG has already confirmed live in this verification's back-and-forth; recorded
here for the written record and for RES-I2/BASORG to hand off against.

---

## 1. Contract validation — PASS (0 defects)

74/74 records parse. One consistent 27-key field set across every record (no mid-batch
contract drift). All required fields present per
`docs/research/opportunities-deadlines/README.md`'s record contract.

## 2. ID discipline — PASS (0 defects)

- 74/74 unique `research_record_id` (`DLOPP-B<n>-<nn>`) within the batch.
- 74/74 unique `opportunity_id` within the batch (no row researched twice).
- **Corpus-wide collision check** (every remote branch, `data/research/**`, exact-ID-string
  reuse — not prefix reuse, since the program-research corpus has ~536 *intentional*
  ID recurrences from revision/re-pass pairs; a global-uniqueness assertion would have
  produced false positives there, per ORYN-BASORG's RULE-CORPUS-ID-001 note. Scoped
  correctly here: does a `DLOPP-` ID appear, byte-identical, under someone else's
  content?): **zero real collisions.** First pass of this check had a bug that produced
  74 false positives — the `DLOPP-` prefix legitimately appears on both the researcher's
  own feature branch and (post-PR-#13-merge) on `main`, and my initial path-string
  exclusion didn't recognize "same content, different ref" as the same file. Fixed to
  dedupe by git blob hash before shipping; see the script's own comments for detail —
  recording the bug here rather than silently, per this org's own evidence standard.

## 3. Live identity — PASS (0 defects)

Queried all 74 `opportunity_id`s live in one pass (chunked REST, `id=in.(...)`):
- 74/74 exist.
- 74/74 `opportunity_title` matches the live `title` exactly.
- 74/74 `category` matches the live `category` exactly.
- 74/74 live `verification_state = 'verified_current'` (matches RES-R2's stated scope).
- 74/74 live `status = 'active'`.
- 74/74 `db_state_at_research` (the researcher's own baseline snapshot of
  `deadline`/`cycle_status`/`current_cycle_label`) is byte-identical to what's live right
  now — nobody has written to these 74 rows since the researcher captured them, so the
  baseline is trustworthy and nothing has drifted underneath this verification.

## 4. Live vocabulary check — 9 records, no live-schema equivalent

`cycle_status_found` uses the value `"unknown"` on 9 records. This is a **legitimate
value in RES-R2's own research contract** (the README documents it: "the cycle the page
describes and its state (`open`/`closed`/`upcoming`/`date_not_announced`/`unknown`)") —
the researcher used it correctly, on records where a source genuinely couldn't be read
(the 5 `deferred` rows) or read but gave no interpretable cycle signal. The problem is
one level down: `opportunities.cycle_status` carries a live CHECK constraint whose
vocabulary is `{open, upcoming, closed, date_not_announced, historical, discontinued,
unverified}` — **`"unknown"` is not a member.** A record contract and a live schema
disagreeing about vocabulary is exactly what this pass exists to catch before it reaches
a write.

| record_id | opportunity | finding_type | live `cycle_status` right now |
|---|---|---|---|
| DLOPP-B1-03 | Baltic Sea Philosophy Essay Event (BSPEE) | deferred | `date_not_announced` |
| DLOPP-B2-06 | International Psychology Olympiad (IPsyO) | closed_historical | `closed` |
| DLOPP-B3-02 | STEM Racing | nothing_published | `unverified` |
| DLOPP-B3-03 | Technovation Girls | deferred | `date_not_announced` |
| DLOPP-B4-10 | Ashoka Young Changemakers | deferred | `open` |
| DLOPP-B4-12 | Girl Up Project Awards | deferred | `date_not_announced` |
| DLOPP-B5-02 | Genesys Works | nothing_published | `unverified` |
| DLOPP-B5-04 | Nuffield Research Placements | nothing_published | `date_not_announced` |
| DLOPP-B5-05 | Partners for the Future | deferred | `unverified` |

## 5. Monotonicity audit (RULE-INGEST-003) — 21 findings across 74 records × 3 fields

**Ruling, ORYN-BASORG, 2026-08-22, superseding its own narrower cycle_status-only
RULE-INGEST-002:** *"An ingestion write may (a) populate an empty field, (b) replace a
populated field with a MORE informative value backed by evidence, or (c) correct a
populated field where evidence shows the live value is wrong. It may NEVER replace a
populated field with a LESS informative one merely because this research pass could not
determine it. Inability to determine is a fact about the research pass, not about the
opportunity."*

This was ratified after this exact check, run against the first real batch, surfaced a
live, quantified, non-hypothetical risk — not a hypothetical audit exercise. Per BASORG's
own framing, that near-miss is itself informative: a verified, source-checked, zero-
fabrication batch was still one naive vocabulary mapping away from degrading live data,
and the evidence bar caught it at the verifier stage, one stage later than ideal, which
is the argument for the research→verify→ingest separation existing at all rather than
being compressed.

### 5a. `cycle_status` — 6 of the 9 vocabulary-gap records are destructive if naively mapped

Extending §4's table: of the 9 `"unknown"` records, **6 currently hold a live
`cycle_status` other than `unverified`** — meaning `unknown → unverified` would strip a
real, previously-established status down to "nobody checked," on rows already visible to
students:

| record_id | live `cycle_status` | destructive if `unknown`→`unverified`? |
|---|---|---|
| DLOPP-B1-03 | `date_not_announced` | **YES** |
| DLOPP-B2-06 | `closed` | **YES** |
| DLOPP-B3-02 | `unverified` | no — already unverified |
| DLOPP-B3-03 | `date_not_announced` | **YES** |
| DLOPP-B4-10 | `open` | **YES** |
| DLOPP-B4-12 | `date_not_announced` | **YES** |
| DLOPP-B5-02 | `unverified` | no — already unverified |
| DLOPP-B5-04 | `date_not_announced` | **YES** |
| DLOPP-B5-05 | `unverified` | no — already unverified |

Concretely: Ashoka Young Changemakers is live `open` — a student filtering for open
opportunities currently sees it. A naive write would silently remove it from that view,
not because anything changed about the program, but because this research pass couldn't
pin down a cycle date. The 3 rows already at `unverified` make the guard free insurance
there; the 6 above make it load-bearing.

**Two further, narrower cases** — `cycle_status_found` values that ARE in the live
vocabulary but propose an uninformative state over a currently-determined one:

- **DLOPP-B1-01 (120 Hours):** proposes `date_not_announced` over live `closed`. The
  researcher's own notes frame this as *confirmatory*, not corrective ("Consistent with
  the DB's existing note... Finding: no current-cycle deadline published") — they were
  describing the *next* cycle's silence, not disputing the *current* cycle's closed
  state. A naive same-column write would still lose the "definitively concluded"
  information. No conflict was recorded, meaning nothing currently stops an ingester from
  making this substitution.
- **DLOPP-B5-13 (Ron Brown Scholar Program):** proposes `date_not_announced` over live
  `upcoming`. Here the researcher explicitly cast doubt on the live value itself
  ("stored 2026-12-01 rests on projection... ingester should treat as
  unconfirmed-projected") — this one may be a legitimate correction rather than a
  downgrade, but that is a policy call RES-R2's own handoff already asked a human/ingester
  to make, not something either the researcher or this script should decide silently.

Both need explicit sign-off before ingesting, not a silent same-field write in either
direction.

### 5b. `deadline` — 5 records where a naive mapper would erase a real date

All 5 have `found_deadline = null` (correctly — no year-bearing date was found or
re-confirmable) but a live `deadline` that is currently populated. Every one of these
was independently confirmed, by reading the full record, to be a *deliberate, evidence-
respecting* omission — not a research gap:

| record_id | opportunity | live `deadline` | why `found_deadline` is null (record's own reasoning) |
|---|---|---|---|
| DLOPP-B1-12 | CyberPatriot | 2026-10-01 | Page states "October 1st!" with no year; researcher notes the live date is *consistent* with the undated pattern but correctly won't assert a year the page didn't state |
| DLOPP-B2-07 | International Public Policy Forum | 2026-10-13 | Page says "mid-October," no year |
| DLOPP-B3-04 | The Concord Review – Emerson Prize | 2026-11-01 | Page gives a standing year-less quarterly schedule; researcher notes the live date is a *computed next-occurrence*, not page-published |
| DLOPP-B5-01 | ASSIP (George Mason) | 2026-02-15 | Page confirms closed but no longer prints the exact date; researcher declined to re-assert a value the current page doesn't restate, even though they believe it's still right |
| DLOPP-B5-13 | Ron Brown Scholar Program | 2026-12-01 | Award-year labeling trap — the stored date is an unconfirmed projection onto a not-yet-opened cycle |

A mapper that writes `deadline = found_deadline` unconditionally would null out all 5.
The correct ingestion behavior — skip the field when `found_deadline` is null, never
write null over a populated value — is implicit in how RES-R2 evidently expects this to
work (their own handoff explicitly flags the Ron Brown case as needing an ingester
decision), but nothing enforces it structurally today.

### 5c. `current_cycle_label` — 5 records where a naive mapper would null out real content

`cycle_label_found` empty while live `current_cycle_label` already holds substantive
content (>15 chars) — all 5 are among the same 9 vocabulary-gap records from §4, i.e.
this is the same underlying "the researcher couldn't determine X" fact reaching a
*second* column, which is exactly why BASORG's ruling generalized from a `cycle_status`-
only guard to an all-columns principle:

| record_id | live `current_cycle_label` (truncated) |
|---|---|
| DLOPP-B1-03 | "2025 cycle: essay topics ordered from FETO by Sept 25, papers due Oct 18…" |
| DLOPP-B3-03 | "2025-2026 season registration ran Aug 13, 2025-Mar 18, 2026 (already closed)…" |
| DLOPP-B4-10 | "Open year-round as of 2026-08-21, in six countries only (nominations accepted…)" |
| DLOPP-B4-12 | "2025 round — closed for MENA, Canada, South Asia & the Pacific and Europe…" |
| DLOPP-B5-04 | "Summer placements; exact current-cycle application window not confirmed…" |

(Not flagged as a hard violation, but worth noting: DLOPP-B2-06 and DLOPP-B3-02 propose a
*non-empty* `cycle_label_found` that reads as less specific/more stale than the live
label — e.g. IPsyO's proposed label describes the *prior* cycle the researcher found on a
same-site conflict, vs. the live label's current-cycle framing. Both are already captured
in RES-R2's own recorded `conflicts` array (see §6) and correctly left unresolved rather
than auto-applied — this is the researcher doing the right thing, not a defect. Flagging
only so the pattern is visible: same-rank content replacement is where evidence-
correctness (V2's remit) does the real work; monotonicity alone can't judge it.)

---

## 6. RES-R2's own flagged items — all reviewed, no contract defects

RES-R2's handoff asked a verifier to scrutinize six things first. All six reviewed:

1. **The 5 recorded conflicts** (Conrad, IPsyO, IPPF, CEMC, Özyeğin) — all structurally
   sound: `kind`/`note`/evidence-on-both-sides present, genuinely left unresolved rather
   than silently picked. One minor, non-blocking contract-consistency note: the
   `source_vs_stored_db_value` conflicts use `stored_db_deadline` on one record
   (DLOPP-B1-11) and `stored_db_state` on another (DLOPP-B2-06) for the same `kind` —
   worth a fixed sub-schema in a future contract revision, not a defect in this batch
   (the `conflicts` array has no declared field contract to violate today).
2. **`fetch_method: webfetch_summarized` caveat** — 72/74 records; confirmed this is
   RES-V2's remit (byte-verification), not mine. RES-V2 has independently reported
   14/14 dated records confirmed byte-exact by direct re-fetch (not read before forming
   this verdict, per BASORG's instruction — compared only after).
3. **SIP (DLOPP-B4-08):** reviewed in full — internally consistent, high confidence,
   explicit page quote ("SIP 2026 Has Officially Concluded"), researcher's own delta note
   is accurate against the live row. No contract defect; a real, well-evidenced fact the
   live row doesn't yet reflect.
4. **Ron Brown:** covered in §5a/§5b above — genuinely needs an ingestion policy decision,
   correctly flagged by the researcher, now doubly load-bearing since it also trips the
   monotonicity guard on two separate fields.
5. **The 5 deferred rows:** independently re-verified the two `robots.txt`-block claims
   by fetching `robots.txt` directly (not the blocked content) —
   `technovationchallenge.org` and `www.cshl.edu` both confirmed blocking
   `anthropic-ai`/`Claude-Web`/`ClaudeBot` with `Disallow: /`, exactly as recorded.
   `fetch_method` is internally consistent with each row's actual block status
   (`not_fetched_robots_block` only for the 2 robots-blocked rows; `webfetch_summarized`
   for the 3 that 403'd server-side despite a clean robots.txt). No contract defect.
6. *(the sixth scrutiny item, "spot re-fetches for the 14 dated records," is RES-V2's
   completed byte-verification pass — see item 2.)*

## 7. Other observations (non-blocking)

- **`source_domain` vs `source_url` host:** 32/74 records store `source_domain` without
  the `www.` prefix that the paired `source_url` actually has (e.g. `120hours.no` vs.
  `www.120hours.no`). Checked for any *non-www* mismatch (a genuinely wrong domain) —
  zero found. Purely cosmetic; worth normalizing in a future contract pass since
  `source_domain` is meant to support provenance display (`SourceBadge`, AGENTS.md
  Phase 36) and an inconsistent format there is a paper cut, not a trust issue.
- **Near-false-alarm, resolved before escalating:** a broad opportunity-id grep initially
  matched 367 hits against `night2_2026-08-21_dq*` files on four other opportunities-
  branches. Traced to ground: those files are already-merged on `main` (commit
  `4f1f3dd`), and their dry-run SQL's proposed values are byte-identical to what's live
  now — prior, already-landed remediation that RES-R2 correctly built its baseline on
  top of, not a pending cross-lane conflict. No action needed; recorded per this org's
  "report the check even when it clears" norm (mirrors the ECW2 verdict's disposition).

## 8. Handoff notes for RES-I2 (via ORYN-BASORG)

**Do not ingest by direct field mapping.** Concretely, before any write from this batch:

1. Implement the monotonicity guard (RULE-INGEST-003) as a precondition in the mapping
   layer, not a per-record judgment call: for `cycle_status`, `deadline`, and
   `current_cycle_label`, skip the field when the proposed value is empty/no-live-
   equivalent AND the live value is already populated with something more informative.
   The 21 findings in §5 are the full, concrete test set for that guard.
2. The 9 `cycle_status_found = "unknown"` records (§4): never write `cycle_status` for
   these. Every other field on these 9 records may ingest normally (only `cycle_status`
   and, for the 5 in §5c, `current_cycle_label`, are affected).
3. The 2 quiet-downgrade-within-vocab records (120 Hours, Ron Brown) and the 2 remaining
   same-rank label conflicts (IPsyO, STEM Racing) need an explicit decision, not a silent
   write — flag to BASORG/founder rather than defaulting either direction.
4. The 14 `dated_current_cycle` records are the highest-value, lowest-risk ingestion
   target (pure field population, no live value at risk) — 7 are open and
   student-actionable now per RES-R2's own handoff. Safe to prioritize once RES-V2's
   already-completed byte-verification is factored in.
5. `scripts/validate-research-records.ts --lane=dlopp <files>` reproduces every check in
   this document and re-runs live against whatever `cycle_status`/`deadline`/
   `current_cycle_label` values are live at the time it's run — rerun it immediately
   before ingesting, since live values may have moved since 2026-08-22.

## 9. The reusable script

`scripts/validate-research-records.ts` — built per this lane's brief. Four passes
(contract / ID discipline / live identity & vocabulary / monotonicity), generic engine
with a per-lane `LaneContract` config; only `dlopp` is implemented so far. Adding the
next lane (RES-R2 package 2, a future RES-R3 wave, etc.) means adding one config object,
not new engine code. Two real bugs found and fixed against this batch before trusting its
output (see the script's own comments): a bare-`origin`-ref filter gap and a path-string
same-file exclusion that a blob-hash-based rewrite fixed properly — recording that here
because this batch's `main`-merge-mid-verification is exactly the scenario that exposed
both, and a future lane rerunning this script against a similarly-in-flight batch will
hit the same shape of problem if the fix ever regresses.
