# Triage of PROPOSALS_dryrun.jsonl — 2026-08-24 ~03:00

**⚠️ Point-in-time snapshot, not regenerated — 175 proposals at time of writing, 210+ now.** CEO and I
moved to triaging new proposals through direct dialogue after this, which has worked well; this
document is still useful for the reasoning it captured, just not for current counts. Both contradictions
flagged below as needing a human tie-breaker are now resolved (not by either of us picking a side
unilaterally, but by going back for the specific missing evidence): **John Locke Institute** — the
"no acceptance rate published" caveat is closed, a real ~33% rate was found directly on the institute's
own admissions page. **CMU AI Scholars (`3f7170ba`)** — the "do NOT assert selective" vs "selective"
split is closed, the program's own page states it "utilizes a holistic application review and
admissions process... selecting program participants based on a combination of factors," resolving in
favor of selective. Both writeups are in `findings.jsonl`, searchable by row_id.

Requested by CEO: split the 175 dry-run proposals into ready-to-write / needs-judgment / hold, so
writes aren't gated behind me re-explaining every row one at a time.

**Methodology note, because it changed the result:** I first ran an automated pass (grade-string
matching + comparing proposed values against current DB state) across all 162 distinct row_ids.
That pass alone is NOT trustworthy for the "ready" bucket — cross-checking it by hand against the
actual proposal content and live DB rows surfaced three real problems worth naming before the list
below, because they're the same class of thing this whole session has been catching all night:

1. **Several "ready" candidates were already written.** PROMYS, Mathcamp, MITES, Simons, Bath, and
   CMU's URL fix already match current DB values — CEO (or an earlier pass) already wrote them.
   Nothing to do; listing them again would have wasted a review cycle.
2. **One row_id has two conflicting proposal entries from different points in the session.**
   `f54d2f62` ("Inspirit AI + Healthcare and Medicine") has an earlier, correct entry about Inspirit
   AI itself, and a LATER entry titled "Horizon Inspires — a second published acceptance rate..."
   that is about a **different program** (Horizon Inspires) mistakenly filed under Inspirit AI's
   row_id. The Horizon Inspires evidence (26% acceptance rate, GPA/SAT medians) is real and
   well-sourced — for the wrong row. Do not write `selective` onto Inspirit AI on the strength of
   that entry. Flagging as a data bug, not a proposal.
3. **`3f7170ba` (CMU AI Scholars) contradicts itself across the session.** An earlier proposal
   explicitly says "do NOT assert selective" while a later, independent re-verification (in
   `findings.jsonl`, not yet turned into an updated proposal) found real selection evidence
   (transcript, 2 recommendations, essay) and leaned toward `selective`. Not resolving this myself
   here — flagging so a human picks which read to trust rather than either of us silently
   overwriting the other.

## Bucket 1 — Ready to write (hand-verified, not just grade-matched)

Each of these: single clear proposed value, live-quoted mechanism (not marketing language), current
DB value is genuinely stale/unknown (not already matching), and no known duplicate-row risk.

| row_id | title | write |
|---|---|---|
| `2f842782` | Stanford Anesthesia Summer Institute (SASI) | `selectivity_tier = open_enrollment` — own page: "Anyone is Invited to Apply" |
| `647eb8da` | UCSB Research Mentorship Programs | `selectivity_tier = selective` — "a competitive summer program... qualified, high-achieving" |
| `2bbea7da` | Rockefeller SSRP | `selectivity_tier = highly_selective` — 32 accepted/yr across 4 teams of 8-10, interview stage |
| `e03e1172` | Summer High School Programs - at BU | `official_url = https://www.bu.edu/summer/high-school-programs/` — current value is a Pennsylvania public high school's own site |
| `cfe42a66` | AwesomeMath Summer Program | `selectivity_tier = selective` — real exam gate quoted ("admission test... must be submitted by the deadline", waived only for returners/USA(J)MO qualifiers) |
| `56ca6900` | Wharton M&TSI | `selectivity_tier = highly_selective` — "M&TSI selects 75 participants... based on academic achievement and leadership". **Bonus, not in original cost-triage scope: this row's `cost=9000` is confirmed WRONG — official page says "On-Campus Program Fee: $12,000". Worth fixing alongside the tier.** |
| `8e5c10af` | POLIMI (TECHCAMP) 2026 | `selectivity_tier = open_enrollment` — "Tutti i corsi TECH CAMP sono al completo" (all courses full) — capacity-sold-out, not merit-selected, same shape as Colorado Mines/Idyllwild |
| `ccd1cf71` | Summer at Stanford Program for High School | `selectivity_tier = open_enrollment` — real eligibility gate (sophomore/junior/senior at time of application) but no merit-selection language found. **Do NOT write a single `cost` value** — the two published figures ($8,226 commuter / $18,771 residential) are both explicitly "starts at" floors, not fixed prices; picking one would misrepresent it as a fixed number. |

8 rows. All independently verified live tonight, all single-value, all checked against current DB
state right before this list was written (not from memory of an earlier check).

## Bucket 1b — Same evidence quality, but the row is `under_review`, not `active`

CEO's steer was explore-don't-propose for `under_review`. Listing separately rather than mixing into
Bucket 1, in case that steer was about not spending MORE research time there tonight rather than
about withholding facts already in hand:

| row_id | title | evidence in hand |
|---|---|---|
| `ee5d3870` | Kadir Has Yaz Okulu | free AI-focused summer school in Istanbul — real facts, no selectivity mechanism found |
| `7a2a2aea` | UC Berkeley Business Academy for Youth (B-BAY) | a published ~10% acceptance rate — `highly_selective` supportable if/when promoted |
| `08ee973d` | NYU Tandon Machine Learning Summer Program | real program, tier `open_enrollment` supportable |
| `8f0a8a3f` | SIMR (under_review duplicate of a row also referenced elsewhere) | the famous citizenship-restricted case from earlier tonight — worth checking whether this under_review row and the original SIMR finding are the same program before writing anything |

## Bucket 2 — Needs judgment (106 row_ids)

Too many to enumerate individually here without just re-creating PROPOSALS_dryrun.jsonl — the file
itself, searched by row_id, has the reasoning for each. The shapes that landed here, by pattern:

- **Every D-grade "retire" recommendation** (wrong-audience, wrong-kind, duplicate, aggregator) —
  retiring a row is a real action with real downside if I'm wrong about it, same as this session's
  own dedup near-misses tonight (Pioneer, King's College). Human glance, not auto-write.
- **Every non-USD cost proposal** (TRY, GBP, EUR, CHF) — no currency column exists; writing the raw
  number risks repeating the Bilkent/Koç mistake CEO already corrected once tonight. A DATA/founder
  call on how to represent it (or whether to wait for the schema fix) belongs here, not in "ready."
- **B-grade "real but partial" findings** — genuine evidence, but missing enough (cost, exact
  mechanism, current-cycle confirmation) that writing now would mean writing an incomplete record
  someone else has to revisit anyway.
- **The known dedup-risk rows**: both Lehigh rows (hold both, per tonight's specific finding),
  Edinburgh's duplicate (`30436a92`, retire candidate), Bocconi's wrong-audience row (`e6f4c6d8`).
- The two contradiction cases named above (`f54d2f62`, `3f7170ba`).

## Bucket 3 — Hold (15 row_ids)

Matches the researcher's own `needs_live_recheck` flag or explicit "P2/thin/unverified" language in
`findings.jsonl` — genuinely insufficient evidence to act on either direction. No action implied.

## Already done / no longer relevant (20 row_ids)

15 where the proposed value already matches current DB (PROMYS, Mathcamp, MITES, Simons, Bath,
CMU's URL, etc. — already written, by CEO or an earlier pass) + 5 `disabled` rows (King's College,
St Andrews, USC Info Sessions, RSI's old row, TechGirls' old row, Pioneer's duplicate) that are
already retired and don't need revisiting.

---

*Full reasoning and verbatim quotes for every row above (all three buckets) are in
`summer_findings_2026-08-23.jsonl` and `summer_proposals_dryrun_2026-08-23.jsonl`, searchable by
row_id.*
