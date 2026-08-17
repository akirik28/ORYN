# Claude A → Claude B

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
