# Verification verdict — RES-R2 orphaned P2 + P3 (RES-V1, package V1-5)

**Verifier lane:** RES-V1 (contract / schema / ID / monotonicity — NOT source truth)
**Verified:** 2026-08-22 · **Branch:** `oryn/res-v1-validation` · **Tool:**
`scripts/validate-research-records.ts --lane=dlopp`
**Subject:** `origin/oryn/res-r2-summer-programs` (PR #32, `dlopp_sp_batch1-6.jsonl` +
`dlopp_sp_rcheck1.jsonl`, summer_program category) and
`origin/oryn/res-r2-remaining-categories` (PR #41, `dlopp_p3_batch1-2.jsonl`,
volunteering/entrepreneurship/conference/student_program/online_program).
**116 raw records, 114 distinct opportunities** (2 are corrections, not new coverage —
see §1). **This is a one-way check: RES-R2 is gone.** Any defect below has nowhere to be
sent back to — it is reported for whoever inherits this territory, not returned for a
fix. Only P1's 74 records (`docs/research/verification/v1_dlopp_verdict.md`) have ever
had a verification pass before this one. Researcher files **not modified**, live DB
**not written**, every check read-only.

## Overall verdict: **FAIL on contract conformance — but the research itself checks out**

325 hard defects, entirely concentrated in two specific, well-characterized field-format
issues — **not in the underlying facts.** `finding_type`, the field that actually carries
each record's classification, is **100% clean and controlled across all 116 records**
(§4). What's broken is narrower and more fixable than the raw defect count suggests:

1. **All 116 records are missing `record_type` and `lane`** — administrative metadata
   P1's contract required, silently dropped somewhere between packages. Zero factual
   impact (§2).
2. **92 of 116 records (79%) write free-text descriptive prose into `cycle_status_found`
   instead of the short controlled vocabulary P1 established** — a real ingestion
   blocker for a direct field mapping, and a materially different, larger problem than
   P1's 9/74 "unknown"-value gap. Full mechanism in §5, since the scale changes what
   needs to happen before this can be ingested.

Also found: one high-value, self-flagged genuine year-ambiguity conflict on a dated
deadline (§6) that deserves to be the first thing anyone touches this batch reads: a
built-and-discarded monotonicity check, kept in the record for anyone re-deriving this
work (§7); and independent confirmation of two things BASORG specifically asked to be
checked rather than assumed (§8, §9).

## 1. Reconciliation: 116 raw records, 114 distinct opportunities, matches BASORG's count exactly

| | count |
|---|---|
| `dlopp_sp_batch1-6.jsonl` (summer_program) | 87 |
| `dlopp_sp_rcheck1.jsonl` | 2 |
| `dlopp_p3_batch1-2.jsonl` (5 remaining categories) | 27 |
| **Raw JSONL records, all files** | **116** |
| minus: rcheck records that supersede an already-counted batch3 record | −2 |
| **Distinct opportunities researched** | **114** |

The 2 `dlopp_sp_rcheck1.jsonl` records (`DLOPP-RCHECK-04`, `DLOPP-RCHECK-05`) carry an
additive `supersedes_record_id` field pointing at `DLOPP-SP-B3-33`/`DLOPP-SP-B3-31` — an
explicit, self-declared correction pass (re-checking 2 originally-deferred rows via a
rendered browser per a since-standing rule), not new coverage. `DLOPP-RCHECK-04` upgrades
Koç University Summer Academy from `deferred` to `closed_historical` (access confirmed
not blocked; exact deadline date still unconfirmed). `DLOPP-RCHECK-05` (Johns Hopkins
CTY) stays `deferred`, now for a confirmed reason (an active Cloudflare bot-challenge,
not merely a curl-unfriendly server — a genuinely stronger block than the first pass
recorded). Both are legitimate, well-reasoned outcomes — recorded as findings, not
defects.

## 2. Contract validation — 232 defects, entirely `record_type`/`lane` absence

Every one of 116 records is missing two fields P1's own contract required:
`record_type` (always the literal string `"opportunity_deadline_cycle_status"` in P1 —
constant, not informative) and `lane` (always `"RES-R2"` — also constant). **This is a
100% pattern, uniform across P2 and P3 alike**, meaning it happened once, consistently —
not scattered data entry variance. Checked the P2/P3 README docs for any note explaining
this as an intentional contract change: **none found.** Recorded as an unexplained
administrative-metadata regression, not a data-integrity defect — every other field
(including the ones that actually carry the deadline/cycle-status finding) is present
and populated as expected.

One additive, legitimate variation (not counted as a defect, `allowKeysetVariation`
handles it correctly): the 2 rcheck records' `supersedes_record_id` field (§1).

## 3. ID discipline — PASS (0 defects)

116/116 unique `research_record_id`. **Corpus-wide collision check** against `DLOPP-`
(covers P1/P2/P3/rcheck together, scoped per RULE-CORPUS-ID-001): zero real collisions.
**Supersession-aware**: the engine's within-batch duplicate-`opportunity_id` check now
recognizes `supersedes_record_id` as an intentional, pointer-declared correction (the
same principle RULE-CORPUS-ID-001 already established for research IDs, generalized to
foreign keys) — without that fix, the 2 rcheck records would have produced 2 false
"same live row researched twice" defects. Checked before shipping, not after.

## 4. `finding_type` — the classification that actually matters — is 100% clean

| `finding_type` | count |
|---|---|
| `closed_historical` | 53 |
| `nothing_published` | 42 |
| `deferred` | 15 |
| `dated_current_cycle` | 6 |

All 116 records use one of exactly these 5 values (well, 4 — `undated_recurring` never
occurs in this pool), matching P1's exact taxonomy, no drift. **This is the reason §5's
finding is a format problem, not a trust problem**: whatever an ingester ultimately does
with `cycle_status_found`'s prose, `finding_type` alone is enough to know what happened
with every one of these 114 opportunities.

## 5. `cycle_status_found` format drift — 92 of 116 records, the batch's real issue

P1's README defines this field's contract explicitly: "the cycle the page describes and
its state (`open`/`closed`/`upcoming`/`date_not_announced`/`unknown`)" — a short,
5-value controlled vocabulary. **79% of P2/P3 instead write full descriptive sentences**:

- `"open (rolling)"`, `"closed (full)"` — short, but not in the vocabulary
- `"page reads "Registration is now open" under a "Looking Ahead to Summer 2026" heading"` (98 chars)
- `"mixed — in-person high school sessions full/closed; the separate Pre-College Online Program remains open"` (107 chars)
- `"unknown — deadline content lives on a separate dates-and-deadlines page not reached this pass"` (96 chars)

Average length of the 92 non-vocabulary values: 60 characters (max 206). These are not
low-effort — they're careful, evidence-dense explanations of genuinely nuanced page
states. **The problem is entirely mechanical**: none of them can be written into the live
`opportunities.cycle_status` CHECK constraint (`open|upcoming|closed|date_not_announced|
historical|discontinued|unverified`) as-is, and there are far too many distinct values
(92 largely-unique strings) to hand-map one at a time the way P1's 9 "unknown" values
were handled.

**What this is not**: a research-quality problem. Every one of these 92 prose values is a
legitimate, well-evidenced description of what the source page actually said — several
are *more* accurate than a 5-value enum could express (e.g. the "mixed" example above:
one program's in-person track is full while its online track remains open — a real fact
a single enum value can't capture). The fix belongs at the *contract* level (should this
field go back to a short controlled vocabulary, or should the vocabulary itself grow to
admit qualified/compound states — a product/schema decision) or at the *ingestion*
mapping level (derive `cycle_status` from `finding_type` + a human/LLM read of the prose
instead of a direct field copy) — neither is this verifier's call to make; flagging the
scale and the mechanism is.

## 6. The one record that most needs a human before anything else: Interlochen Arts Camp

`DLOPP-SP-B2-28` is the only record failing the `finding_type=dated_current_cycle
requires found_deadline` logical rule — and reading it in full shows the researcher
already knew, flagged it explicitly (`"HIGH PRIORITY for verifier review"`), and made the
conservative choice rather than hiding the problem:

- `db_state_at_research`: `deadline=2027-01-15`, `cycle_label="2027"`.
- The official page's own heading: *"Key dates for **Camp 2026** are listed below...
  Priority Application Deadline: Jan. 15."*
- **Genuine, unresolved one-year conflict**: either the live 2027 date is a full year
  ahead of what the (possibly stale) page currently shows, or the page's "Camp 2026"
  framing means the January 15 deadline is 2026 — already elapsed by the 2026-08-22
  retrieval date — and the live 2027 value is wrong. The record's own `conflicts` array
  states both readings and explicitly declines to guess: *"Not enough evidence to pick
  between these; recording both sides."*
- `found_deadline` correctly left null (never synthesize a year) — which is exactly what
  trips this contract's own `dated_current_cycle`-needs-a-date rule. **The rule and the
  researcher are both right; the taxonomy has no bucket for "a dated deadline exists,
  but which year is genuinely unconfirmed."**

Recorded as a logical-consistency defect per the letter of the contract, but the
substance is: this is the single highest-priority row in the batch for a human or V2 to
resolve before either date is trusted — a full one-year discrepancy on a deadline is
exactly the shape of error that would mislead a student if ingested wrong in either
direction, and it is already flagged, sourced, and waiting.

## 7. A monotonicity check built for this package, checked, and removed — not shipped unexamined

Per BASORG's instruction to check monotonicity in **both** directions (erasure and
replacement — the class RES-I2's guard found 79 holds in on P1 that the original
erasure-only checks couldn't see), added a `deadline` replacement check (both populated,
different — kept, found 0 hits, harmless) and a `current_cycle_label` replacement check
(same shape). **The label check produced 43 "findings" on the first run. Read a sample
before trusting the count, the same discipline as every other package this session, and
removed it rather than report it:**

- 37 of 43 were paraphrase, not disagreement — e.g. `"2026 (July 13-24, 2026)"` vs. live
  `"2026 session (July 13-24, 2026); registrations closed"` — same fact, more detail on
  the live side. `current_cycle_label` is free text; RULE-INGEST-004 puts content
  judgments on free text outside this guard's domain, and exact-string inequality is a
  bad proxy for "meaningfully different."
- The other 6 looked like real year disagreements (record says 2026, live says 2027) —
  checked one in full (`DLOPP-SP-B2-23`, Hampshire College Summer Studies in
  Mathematics) rather than trust the pattern: its own `db_state_at_research` already
  matched live's 2027 label, and its own `researcher_notes` said so explicitly —
  *"db_state was already correct about 2027 being unannounced."* The record was never
  proposing a replacement; `cycle_label_found` on a `closed_historical` finding describes
  the **historical** cycle being reported on, not a proposed value for the **current**
  label. A structural mapping-context problem, not a content-comparison one, and no
  string-diff check catches it.

Removed the check; the reasoning stays in the tool's own code comments so a future lane
extending this contract doesn't rebuild the same mistake. `deadline`'s equivalent check
is safe to keep — a date is structured and exact-comparable, not free text.

## 8. Status breakdown — cleaner than ECW3, checked the same way

| status | count |
|---|---|
| `active` | 115 |
| `disabled` | 1 (`DLOPP-P3-08`, Diamond Challenge) |

Only 1 of 116 references a non-active row — a sharp contrast with ECW3's 27%
`under_review` rate, and worth noting precisely because it shows the finding there was
real and specific to that bulk-discovery batch, not an artifact of how this project's
`status` field works in general.

## 9. `academic_program` zero rows — independently confirmed honest, not unexplained

BASORG asked specifically to confirm P3's own claim that `academic_program` contributed
zero rows because all 3 of its candidates are `unverified`, not silently absent.
Queried live directly rather than trust the report: **exactly 3 `academic_program` rows
exist, all 3 `verification_state='unverified'`** (1 `active`, 2 `under_review`) — none
meet this lane's `verified_current` scope gate. Confirmed, not assumed.

## 10. Scope: what this verdict covers, and what it does not

**Covered:** contract conformance against P1's established field set (§2); ID discipline,
corpus-wide and supersession-aware (§3); `finding_type` taxonomy integrity (§4);
`cycle_status_found` live-vocabulary conformance (§5); monotonicity, both directions,
on `deadline` and `cycle_status` (erasure) — `current_cycle_label` erasure only, by
design, after the replacement variant proved unreliable for free text (§7); `status`
breakdown (§8); the `academic_program` honesty check (§9); supersession handling (§1, §3).

**NOT covered — open, not confirmed-absent:**
- **Source truth** — whether the 92 prose `cycle_status_found` values, or any other
  quoted fact, are actually correct on the cited pages. V2's half entirely.
- **The Interlochen year conflict's actual resolution** (§6) — flagged with maximum
  precision, not resolved; needs a direct (non-summarizing) re-fetch.
- **Whether `cycle_status_found`'s format drift also affects other DLOPP-lane fields**
  not checked here (e.g. `confidence_reason`, `year_convention_note` free text) — not
  audited; §5's finding is the one field checked against its own documented contract.
- **What the correct ingestion mapping for the 92 prose values should be** — a design
  decision for whoever owns the schema/ingestion path, not this verifier's to propose.

## 11. The reusable tool, extended a third and fourth time

`scripts/validate-research-records.ts`'s `dlopp` lane gains: `allowKeysetVariation`
(reused from AU-R1, now covers the `supersedes_record_id` additive field);
supersession-awareness in the ID-discipline engine check (generic, available to any
lane with a similar correction-pass pattern); a `customLiveChecks` addition reusing the
AU-R1-introduced escape hatch, for status-breakdown and supersession reporting; and a
documented negative result (§7) — a check that was tried, found unsound for a free-text
field, and removed with the reasoning kept in place rather than either shipped unexamined
or discarded silently.

**A fifth engine fix, found by accident and worth recording because it's generic, not
DLOPP-specific**: routine regression-testing this package's changes against the other
two lanes (ECW, AU-R1) surfaced a real false-positive in the corpus-wide ID-collision
check itself — `ECW4-021` was flagged as colliding with two new RES-R3 batches
(`ecw4_batch5.jsonl`, `ecw4_batch6.jsonl`) neither of which actually contains a record
with that ID. Traced it: the check did a raw substring search across each candidate
file's whole text, and `"ECW4-021"` appeared inside a *different* record's `notes`
field — a legitimate cross-reference ("...the CTY Residential Program, ECW4-021,
succeeding earlier this wave") — not a duplicate. Fixed to parse each line as JSON and
match only against known id-field *values* (`research_record_id`/`record_id`/
`research_program_id`), never raw file text — a prose mention of an ID can never trigger
this check again, in any lane. (Separately, AU-R1 showed 149 ID-discipline hits on this
same regression run even after the fix — traced that one too: RES-R1 pushed a real fix
to Sydney's `degree_level` classification, `1593e04 fix(research): Sydney degree_level —
missing Master/Doctor title tokens`, directly addressing the V1-4 finding — since acted
on, so my local snapshot from that verdict is now stale relative to the branch. Not a
tool bug, and not this package's concern; noted here only because it surfaced in the
same pass.)

```bash
npm run validate:research -- --lane=dlopp data/research/opportunities/dlopp_sp_batch*.jsonl data/research/opportunities/dlopp_sp_rcheck1.jsonl data/research/opportunities/dlopp_p3_batch*.jsonl
```
