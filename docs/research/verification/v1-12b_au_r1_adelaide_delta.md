# Delta verdict — Adelaide's post-V1-9 changes (RES-V1, package V1-12b)

**Scope note, per this lane's own principle applied to its own prior work:** V1-9
(`docs/research/verification/v1-9_au_r1_adelaide_verdict.md`, commit `78e4879`) certified
Adelaide at 119 records. The file has changed twice since — that verdict no longer covers
the current file, exactly as this lane would say about anyone else's stale verdict. This
package verifies the **delta only**, not a repeat full pass. **Verified:** 2026-08-22 ·
**Branch:** `oryn/res-r1-au-programmes`, commits `5d855e6` and `66f8ba3`.

## Verdict: delta confirmed, with one imprecision in how it was described — not in the data

Every structural claim checks out against an independent field-by-field diff. The
research and the fix are sound. One number in how the fix was *summarized* doesn't match
the file precisely — reported below because the whole point of a delta check is to read
the diff, not the summary of it.

## Independent diff, not RES-R1's self-report

Diffed `78e4879`'s Adelaide file against the current one on `oryn/res-r1-au-programmes`,
field by field, programmatically — not reading RES-R1's "0 unexpected changes" claim and
moving on. Result: **exactly 1 record added (`AU-R1-adelaide-120`, UniStart), 0 removed,
and changes confined to exactly 4 fields** (`degree_type`, `researcher_notes`,
`entry_requirements`, `study_mode`) **across the 119 records present in both files. No
other field touched on any record.** This is itself the independent confirmation of "0
unexpected changes" — checked, not taken on trust.

## Claim 1 — `degree_type` nulled, `program_code` preserved in `researcher_notes`: confirmed, 119/119

`degree_type` is `null` on all 119 original records (120th — UniStart — is also null,
consistent with the same non-award-pathway category). All 119 carry
`program_code='XXXXX'` verbatim in `researcher_notes` (e.g. `program_code='ATSIP'` on
record 001). Matches the claim precisely: Adelaide's own page labels this field "Program
code," and the values (`BCOMP`, `HECON`, etc.) are programme codes, not post-nominals —
correctly distinguished from Monash's genuine post-nominal `BE(Hons)`/`BDigBus` pattern.

## Claim 2 — UniStart added as record 120: confirmed

`AU-R1-adelaide-120` = "UniStart" is the only added ID; no IDs removed. File count moved
119 → 120, matching exactly.

## Claim 3 — pathway records' `international` key rewritten: confirmed for 3, not 4 — and the README itself says 3, not 4

Diffed `entry_requirements`/`study_mode` directly: **exactly 3 records** changed —
`AU-R1-adelaide-001` (ATSIP), `-085` (CASM Foundation Year), `-089` (Foundation Studies).
Each `international` value moved from duplicated domestic text to: *"No distinct
international variant published for this pathway — confirmed live (2026-08-22): the bare
URL and the explicit /int/ path both 301-redirect to the /dom/ variant, returning
byte-identical 'Information for Domestic students' content."* Searched the **current**
file directly for this exact marker text (not just the diff, in case a record already had
it before this delta): **3 records, 6 field-hits, no more.**

**The message describing this package said "four pathway records." The file says three,
and so does Adelaide's own README** (`docs/research/university-programs-au/README.md`,
same branch): *"the `international` key on all 3 (and on UniStart, added in the same
category) now states that explicitly."* The README distinguishes "3" (rewritten) from
"UniStart" (added directly in the corrected form, not rewritten) — it does not say four
records were rewritten. Checked UniStart's own structure to see why it isn't a 4th
instance of the same edit: its `entry_requirements`/`study_mode` carry **only a
`domestic` key, no `international` key at all** — a different shape from the other
three's rewrite (which kept the `international` key and replaced its text), consistent
with UniStart being newly added rather than corrected. **This is a minor imprecision in
how the change was summarized in the message this package received, not a defect in the
research or the fix** — the underlying work matches the file and matches the file's own
documentation exactly; only the round number in the summary overstated it by one.
Reporting it because verifying the artifact instead of the description of it is the same
standard this package holds every other claim to, including this session's own past
mistakes (the `--all` vs. per-file `git log` fix came from exactly this kind of check).

## Claim 4 — Foundation Studies self-caught missing `domestic` key: confirmed

`AU-R1-adelaide-089`'s **old** `entry_requirements`/`study_mode` carried an
`international` key only — no `domestic` key existed in the V1-9-certified version at
all (confirmed directly: the old record's field is a single-key object). The current
version has both. Matches the claim exactly, and the README's own account (self-caught
while applying the other fix, not part of RES-V2's original two findings) is consistent
with this being a same-batch, same-cause correction rather than a separate incident.

## Restated reconciliation: confirmed against the README directly, not the message's paraphrase

Read `docs/research/university-programs-au/README.md` on the working branch directly.
Confirmed verbatim:

| Line | Value |
|---|---|
| In scope | 120 |
| Excluded (majoring-in + standalone postgrad + Grad Dip/Cert + blank title) | 215+126+98+1 |
| **Total accounted for** | **560** |
| Stage-1 fetch failure | 1 |
| **Subtotal — original enumeration** | **561** |
| Missing from the original enumeration entirely (UniStart) | 1 |
| **True grand total** | **562** |

Matches the claimed restatement exactly, including the two-part structure (the
560/561 subtotal describes what the *original enumeration* covered; 562 is the *true*
total once UniStart — which the original 560-URL sitemap filtering never caught at all —
is added back). The README states this plainly as its own line, not folded into "in
scope," matching the claim that this is a stated defect in the original enumeration
itself, not a reclassification.

## Scope

**Covered:** every specific claim in the V1-12b assignment, checked against an
independent field-by-field diff and against Adelaide's own README, not against the
summary message alone.

**NOT covered:** re-verifying the 3 pathway records' redirect behavior live (RES-V2 and
this lane both already did this for the same finding, referenced in V1-9 and in the
README; not repeated here since the file's own claim — 301 to `/dom/`, byte-identical —
was the thing already confirmed, not something this delta reopened); source-truth
re-verification of anything outside the 4 changed fields.
