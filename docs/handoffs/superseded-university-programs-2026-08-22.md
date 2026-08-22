# Retiring 160 superseded `university_programs` rows — proposal, not executed

**Status: investigation and recommendation only. No DB writes, no migration applied, nothing
deleted.** Assigned by the coordinator 2026-08-22 to determine exactly which rows are stale,
confirm nothing student-facing references them, and propose (not execute) a retirement
mechanism. The founder decides.

## 1. Inventory — exact match to the coordinator's claim

Three universities each had every stored `university_programs` row pointing at a single
institution-wide index/listing page rather than a real per-programme URL:

| University | `universities.id` | Stale rows | Shared stale URL | Created |
|---|---|---|---|---|
| University of Michigan-Ann Arbor | `5c980e71-8c9d-45a1-b911-bf071dbe085e` | **72** | `https://lsa.umich.edu/lsa/academics/majors-minors.html` | 2026-08-21 08:23:05–08:23:22 |
| Carnegie Mellon University | `ba4093ff-c627-42c3-96c0-6e9973db9f80` | **52** | `http://coursecatalog.web.cmu.edu/degreesoffered/` | 2026-08-21 08:23:48–08:24:01 |
| UCLA | `67b2b3c2-5684-443d-8ff3-4730362eb6cf` | **36** | `https://www.ugeducation.ucla.edu/services-and-resources/tassels-to-the-left/majors/` | 2026-08-21 08:23:39–08:23:48 |
| **Total** | | **160** | | |

Identified by grouping every row for these three `university_id`s by `official_program_url`
and taking the groups with `count(*) > 1` (a real per-programme URL is unique to its own
programme; only an index page collapses many rows onto one URL) — not by "the ones that
aren't new." All three groups were created within an 9–17 second window on 2026-08-21 at
08:23–08:24, consistent with a single original ingestion batch per institution, well before the
2026-08-21 23:1x replacement research. Michigan's set is entirely LSA's college-level majors
page; CMU's is the bare course-catalog root with no per-degree anchor; UCLA's is the
undergraduate-education majors index — none carry a college/school (`faculty_or_school is
null` for all 36 UCLA rows, confirming the assignment's "UCLA's carry no school at all").

**These counts match the coordinator's claim exactly — 72/52/36, no discrepancy to stop on.**

Cross-checked against the replacement records' own claims: every one of the 405 new rows
(Michigan 154, CMU 106, UCLA 145) carries a `SUPERSEDES_EXISTING_ROWS` note in its
`program_research_queue.raw_payload.researcher_notes` stating the exact same counts (72/52/36)
and the exact same stale URLs, independently. Both sides agree.

## 2. What references the 160 stale rows

Five tables carry a foreign key to `university_programs(id)`:
`university_requirements.program_id`, `university_deadlines.program_id`,
`target_universities.program_id`, `university_program_placement_cycles.program_id`, and
`program_research_queue.promoted_program_id`. `applications` has no direct FK to
`university_programs` — it only references `target_universities(id)`, so it's covered
transitively once `target_universities` is confirmed clean.

Checked all five directly against the 160 ids:

| Referencing table | Rows pointing at a stale id |
|---|---|
| `university_requirements` | 0 |
| `university_deadlines` | 0 |
| `target_universities` | 0 |
| `university_program_placement_cycles` | 0 |
| `program_research_queue.promoted_program_id` | **160/160** |

**Zero student-facing references.** No student has saved a target program against any of
these 160 rows, no requirement or deadline is attached to one, and no placement cycle uses one.
The only reference is `program_research_queue`'s own audit trail — the ingestion queue row
that recorded each stale row's original acceptance — which is expected (every accepted row
gets one) and is exactly the reference a non-destructive mechanism needs to keep intact, not a
reason to hesitate.

**This changes the answer from "repoint" to a much simpler "just retire them"** — there is
nothing downstream that would break or need repointing.

## 3. Verifying the replacements are actually complete (the coordinator's caution)

Before recommending any retirement, checked the flagged "unconfirmed URL" subset directly,
since retiring good-but-stale rows in favour of unverified ones would be a net loss.

**CMU**: 11 of 106 replacement rows carry an explicit per-record tag,
`"THIS RECORD'S URL RETURNED 403 AND IS UNCONFIRMED"` — the other 95 were fetched and read
successfully by the original researcher (over HTTP; `coursecatalog.web.cmu.edu` resets HTTPS
connections from a scripted client). I tried to independently open one of the 11 flagged URLs
myself, both HTTPS (connection denied) and HTTP (`403 Forbidden`, generic
`"You don't have permission to access this resource"` — the classic bot-block signature, not a
custom "not found" page). **I hit the identical block the original researcher did** — this
corroborates "bot block, not dead link" as the honest explanation (a real 404 or a redirect to
an error page would look different), but I could not positively load CMU content myself to
independently confirm those 11 specific pages' correctness. That residual uncertainty is real
and should be named as such, not papered over — it's 11 of 106 rows (10.4%), not the whole
CMU batch.

**Michigan**: no per-record tag exists (unlike CMU); the shared `verification_status` note
states "of the 51 distinct host paths in this batch, 20 returned HTTP 200 to a scripted probe
and 31 returned HTTP 403," with 2 of those 31 spot-checked directly in a browser and confirmed
loading with programme-specific titles. **I independently opened two more myself**: an LSA
anchor URL (`lsa.umich.edu/lsa/academics/majors-minors.html#economics-maj`) loaded cleanly, and
a non-LSA college domain (`cee.engin.umich.edu/undergraduate-studies/bse-degree-in-civil-engineering/`)
loaded as a correctly-titled "Major in Civil Engineering" page. Note the "31 of 51 host paths"
figure is a path-level count, not a record-level one (multiple majors can share one path via a
different anchor), so it doesn't cleanly convert into "N of 154 records" — the coordinator's
figure of "29 in the same state" may be a record-level count from a different pass; I could not
locate a record-level tag in the data to reconcile it against, and flag the discrepancy rather
than force a match.

**UCLA**: all 145 replacement rows were individually fetched with HTTP 200 by the original
researcher — zero unconfirmed. I independently spot-checked one
(`catalog.registrar.ucla.edu/major/2026/AerospaceEngineeringBS`) and it loaded as a correctly
titled "Aerospace Engineering BS" page.

**Conclusion: the replacements are real and substantially verified**, with a disclosed,
bounded pocket of residual uncertainty (CMU's 11 rows, and an unquantified subset of
Michigan's 31-of-51-paths) that mirrors a genuine access barrier on the institution's own
domain rather than a research-quality problem — the same kind of honest, disclosed gap this
research programme's other lanes have flagged rather than hidden. This is not a reason to
withhold the 405 replacement rows; it is a reason to record the confidence gap explicitly.

## 4. Recommended mechanism

**A `program_status` flag on `university_programs`, mirroring migration 0043's
`universities.duplicate_status`/`superseded_by_id` shape as instructed — adapted for one real
structural difference.**

0043 solves a **one-to-one** problem: two `universities` rows are the *same* real institution,
so `superseded_by_id` (a single FK to "the other row") is the entire relationship. This is a
**many-to-one** problem: one coarse stale row (e.g. Michigan's single LSA index row) has no
single successor — it's replaced by 154 different granular rows together, as a batch. Forcing
a single `superseded_by_id` FK here would mean picking one arbitrary "winner" among 154
unrelated rows, which would misrepresent the relationship rather than describe it. The real
one-to-one entity in this relationship is the *replacement batch itself*
(`program_research_queue.batch_id`), not any individual new row — so that's what the pointer
targets.

Proposed columns (see `supabase/migrations/0060_university_programs_supersession.sql`,
**written, not applied**):

- `program_status text not null default 'active' check (in 'active'/'superseded')`
- `superseded_at timestamptz`
- `superseded_by_batch_id text` — points at `program_research_queue.batch_id` (a free-text
  field, not itself a FK'd key elsewhere in the schema; stored the same way here for
  traceability, not referential enforcement)
- `superseded_reason text` — human-readable, e.g. *"shared an institution-wide index URL with
  71 other rows; replaced by 154 real per-programme rows in batch
  us_programs_michigan_2026-08-22.jsonl_2026-08-21"*
- A consistency check constraint (status/timestamp/batch-id must agree) and an index on
  `program_status`, both mirroring 0043's own choices exactly.

One deliberate naming departure from 0043: the new column is `program_status`, not
`duplicate_status`. These 160 rows are not duplicates of the 405 new ones — a duplicate is the
same fact stored twice; an index-page row and a per-programme row are different facts at
different granularity (one thin, one real). Borrowing 0043's column name here would describe
the wrong relationship. Flagging this explicitly in case the founder prefers literal naming
consistency with 0043 over semantic accuracy — a one-line rename in the same migration either
way.

### Why not hard delete

`program_research_queue.promoted_program_id` references `university_programs(id)` with
`on delete no action` — a hard delete of any of the 160 rows is **structurally blocked** by
that FK unless the queue's own audit rows are mutated first (nulling `promoted_program_id`),
which would erase the historical record that these rows were once genuinely researched,
accepted, and promoted. Zero student-facing references means hard delete would not corrupt any
*other* workstream's data (the risk 0043's own migration comment cites as its reason not to
delete `universities` rows) — but it would still destroy this table's own audit trail for no
benefit over a reversible flag, and 0043 already established the product's convention for
exactly this situation. Superseding is additive and reversible (clear the columns to undo);
hard delete is neither.

### What applying this migration would NOT finish by itself

Same gap 0043 itself still has, disclosed in `lib/universities/canonical.ts`'s own header
comment: **DDL alone doesn't hide anything from a listing/browse read path.** Every place that
queries `university_programs` for display (university detail pages, program search/filter,
anywhere a program count is shown) would need a `.eq("program_status", "active")` filter added
— the same follow-up shape 0043 left for `lib/universities/canonical.ts`'s 16 read paths, not
done here since it's implementation, not the proposal this task asked for.

## 5. What this lane did and did not do

- Read-only DB investigation via the Supabase MCP (`execute_sql`) throughout — no writes.
- Wrote one migration file, **not applied**: `supabase/migrations/0060_university_programs_supersession.sql`.
- Wrote this document.
- Did **not** touch `docs/ORYN_WORKSTREAMS.md` beyond claiming this lane's own row.
- Made **zero** changes to `university_programs`, `program_research_queue`, or any other table.
