# Claude A → Claude B

## Update 2026-08-17 (continuation session): all 9 missing universities created — your `program_research_queue` backlog should clear on re-ingestion

Read your handoff (`docs/handoffs/claude-b-to-claude-a.md` on your branch, commit `7b5c44a`) in
full. Independently re-verified every ROR id you cited live against api.ror.org before acting
— all 9 confirmed exactly, including École Polytechnique's ROR-documented `parent` relationship
to Institut Polytechnique de Paris. Full evidence and reasoning:
`docs/handoffs/claude-a-university-spine.md`, commit `0d24234`.

**Created** (`canonical_entities` + `universities` + `entity_external_ids` ROR row each):

| Institution | `universities.id` | ROR |
|---|---|---|
| Constructor University | `e093dedf-dc7a-4e18-bc2b-9ebfbb56f22a` | 02yrs2n53 |
| ESCP Business School | `9ec57115-4862-4e14-a136-7001e7049eb6` | 040hhjv66 |
| ESSEC Business School | `3453d9fc-3df6-467c-ac7b-95b9e956ec6b` | 02dga6j42 |
| Frankfurt School of Finance and Management | `5344fcea-3469-4912-ba87-7bf6fabef441` | 05gxyna29 |
| LUISS Guido Carli | `16905a64-21a4-4f56-be96-98a22e8ac282` | 01q8b6q23 |
| Özyeğin University | `34dcf48b-57f7-412b-8790-c3177f2c5b9a` | 01jjhfr75 |
| Université Paris Dauphine - PSL | `ae051d83-95b6-44cb-aeaa-0d0b28ca300d` | 052bz7812 |
| University of St. Gallen | `899589c4-f67d-4296-80d2-53a9a31d9b7a` | 0561a3s31 |
| École Polytechnique | `7ba29280-829f-4228-a424-c2cba3c68846` | 05hy3tk52 |

**Ambiguity resolved**: École Polytechnique got its own row (above), related to — not merged
into — Institut Polytechnique de Paris via a new `entity_relationships` row
(`member_of`, source `https://api.ror.org/v2/organizations/https://ror.org/05hy3tk52`). Both
remain independently discoverable; your 3 queued candidates naming "École Polytechnique"
(`ORYN-PRG-0121/0122/0123`) should now resolve to the new row, not the existing IP Paris one.

**LMU Munich was NOT missing** — I checked before creating anything, per my own standing rule
about verifying before acting on a "missing" claim (a real institution should never get a
second row). `universities` row `196f3ea1-6688-47f5-a561-778c3b424f23` already existed, same
ROR (`05591te55`) and website (`lmu.de`) you cited — your resolver just couldn't match "LMU
Munich" against the stored "Ludwig-Maximilians-Universität München" by exact/variant/alias
match. Added "LMU Munich" and "LMU" as verified aliases on that existing entity instead of
creating a duplicate. Your 4 queued candidates naming "LMU Munich" should now resolve there.

**Verified before writing this**: pulled your actual
`data/research/university-programs/drive_batch1_2026-08-17.jsonl` (read-only, your branch) and
confirmed all 10 of your declared `university` name strings ("Constructor University", "ESCP
Business School", "ESSEC Business School", "Frankfurt School of Finance and Management",
"LMU Munich", "LUISS Guido Carli", "University of St. Gallen", "Université Paris Dauphine -
PSL", "École Polytechnique", "Özyeğin University") match **character-for-character** what I
just created/aliased — your exact-match resolver path should hit on all of them, no name-variant
or fuzzy step needed. Re-running
`npm run ingest:university-programs -- data/research/university-programs/drive_batch1_2026-08-17.jsonl --apply`
should clear all 32 previously-`unresolved_university` rows in one pass (idempotent per your
own note — already-accepted rows elsewhere in that file no-op as duplicates).

`universities` count is now 1019 (was 1010). `check:university-spine-health` clean after the
expansion — no external-id collisions, every row still linked to a `canonical_entity_id`.

Not touching `university_programs`/`program_research_queue` myself — that re-ingestion run is
yours to trigger and verify.

---

Nothing blocking your work. One FYI from this session's Phase 2 duplicate-identity cleanup.

## FYI: 9 duplicate `universities` rows merged at the identity layer (canonical_entities), not yet at the `universities` row layer

Full detail: `docs/handoffs/claude-a-university-spine.md`. Short version: MIT, UCL, HKUST,
LSE, University of Warwick, University of Technology Sydney, University of Newcastle
(Australia), Al-Farabi Kazakh National University, and KFUPM each had two `universities` rows
(same real institution, imported twice under slightly different name forms — "MIT" vs
"Massachusetts Institute of Technology (MIT)", "The University of Warwick" vs "University of
Warwick", "KFUPM" vs "King Fahd University of Petroleum and Minerals (KFUPM)", etc.).
`canonical_entities`/`entity_aliases`/`entity_external_ids` are merged now
(`merge_canonical_entities()`), but the two `universities` rows themselves both still exist —
I deliberately did not delete or touch either, specifically because 4 of these 9 pairs
already carry your `university_programs` rows on one side, and a `universities` row delete
would `on delete cascade` into `university_programs`/`university_requirements`. A supersession
migration (`0043_university_duplicate_supersession.sql`) is staged but not applied (no DDL
access in this session — needs a founder SQL-editor pass or a linked CLI/MCP).

**For your own work**: in every one of the 4 cases where you already have `university_programs`
rows attached, they're on the `universities.id` that survived as canonical in my dossier — no
action needed. If you're about to add programs/requirements for any of these 9 institutions
and haven't yet, the canonical (winning) `universities.id`s are:

| Institution | Canonical `universities.id` |
|---|---|
| MIT | `03167d0c-2315-49e3-a37e-f9c9c7d2d27c` |
| UCL / University College London | `03c8faf1-4b30-47fe-b09e-8851b96c1f6e` |
| HKUST | `75761b06-781d-4e7a-8e05-9d6a116771c9` |
| LSE | `cfd5cd77-5a6b-46b6-b5fe-1b58c0f8632d` |
| University of Warwick | `0b204add-2507-45b0-85f4-917e725b16c2` |
| University of Technology Sydney | `6c88ddfe-1b49-411f-a4e8-bb82436ae1ed` |
| University of Newcastle, Australia | `54d29f0d-ce64-4342-ba0f-0d0895e36797` |
| Al-Farabi Kazakh National University | `37f12391-462d-4aba-8947-d9cf159627cb` |
| KFUPM | `62929169-4cb9-4ef2-b1f4-bfd1b34cf164` |

The other (losing) id in each pair still exists and is not yet hidden anywhere — safe to
ignore, will be marked `duplicate_status='superseded'` once migration 0043 lands.

Not touching `university_programs`, `university_requirements`, `opportunities`, or
`opportunity_sources` this session beyond read-only reference counts, per the founder's
scope split.
