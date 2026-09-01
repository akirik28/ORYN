# `requirement_research_queue` triage: the ~466 non-accepted rows, traced

CEO-assigned (Gate F depth pass, 2026-09-01): of the non-`accepted`, non-`duplicate` rows in
`requirement_research_queue`, which are real losses and which are the pipeline working
correctly? Scope: `unresolved_university` (157), `not_ingestible` (219), `rejected` (36).
`malformed_source` (90) is oryn-4e's; `superseded` (20) was not in scope and wasn't examined.

**The headline finding is not "which bucket is real vs. correct" — it's that the pipeline has
been quietly healing itself since 2026-08-21, and the queue's own outcome labels never caught
up.** Of the 193 rows across the two buckets that looked like real losses (`rejected` +
`unresolved_university`), all but **2 queue rows — one single fact** — already have their
content live in `university_requirements` today, captured by later re-ingestion runs that the
original failing records were never matched back against. The third bucket, `not_ingestible`
(219), is close to the opposite finding: sampled broadly, essentially all of it is the shape
audit and evidence-conflict gate doing exactly what they were built to do.

**Net result of the whole ~412-row scope (excluding `malformed_source`): one missing fact, one
housekeeping proposal, zero code changes needed.** No alias or config fix turned out to be
warranted — the reason is in the `unresolved_university` section below.

## Method

Same method as the `under_review` opportunities triage two passes ago: live SQL against
`requirement_research_queue` (`qtcvcflzxbuagvvwahhu`, via Supabase MCP), cross-referenced
against `university_requirements`, plus reading the actual decision code
(`lib/requirements/ingest.ts`, `lib/acquisition/identity.ts`) rather than inferring behavior
from outcome labels alone. `scripts/ingest-university-requirements-batch.ts` — a purpose-built,
write-nothing dry-run tool that exists for exactly this kind of question — needs
`SUPABASE_SECRET_KEY` in `.env.local`, which this worktree doesn't have; direct SQL against the
same tables covers the same ground and is what everything below is built on. No write of any
kind was made to `university_requirements`, `requirement_research_queue`, or `entity_aliases`.

## `rejected` (36) — zero current loss; the bug that caused it is already fixed

Every one of the 36 rows carries the identical detail text: *"Decided 'accepted' but the
university_requirements insert failed: duplicate key value violates unique constraint
'university_requirements_university_type_scope_idx' — reconstructed from the incident run log,
not a fresh insert attempt."* `lib/requirements/ingest.ts`'s own comment names the cause
precisely: migration `0042`'s unique index was keyed on `(university_id, requirement_type,
COALESCE(scope,''))`, which allowed only one requirement per university/type/scope and silently
rejected every legitimate additional one — Edinburgh's English-proficiency alternatives among
them. **Migration `0056` already fixed this**, folding `md5(COALESCE(title,''))` into the key —
confirmed live: `university_requirements_university_type_scope_title_idx` is exactly that index,
today, on `oryn-qa-scratch`.

All 36 rows are timestamped `2026-08-21 11:16:...`, before `0056` landed at `18:49:03` the same
day. **Checked whether each one's exact content exists in `university_requirements` today: 35
of 36 match on `title` or `requirement_detail` exactly; the 36th (Edinburgh's IELTS row) matches
in substance** — the live row carries the same base fact plus an appended correction ("Restored
2026-08-22 after live verification found the corpus had dropped this sentence during a
supersession rewrite"), so it isn't a byte-identical match but is unambiguously the same
requirement, improved. Live `created_at` timestamps for the recovered rows cluster at
`2026-08-21 19:42:5x` — same day, after `0056`, a later run re-ingested this exact set
successfully. **Every one of the 36 pieces of content this bucket represents is already in the
product.** The only thing wrong is that these 36 queue rows still say `rejected`.

Affected universities, all fully recovered (36 total): University of Glasgow (8), Sabancı
University (7), The University of Edinburgh (6), LSE (5), Koç University (5), Boğaziçi
University (2), Bilkent University (2), Imperial College London (1).

## `unresolved_university` (157) — 143 correct, 12 already recovered, 2 genuinely missing (one fact)

Grouped by `university_name_input`, the 157 rows resolve into three completely different
situations:

**69 rows: `university_name_input` is `null`.** `resolveRequirementUniversity` refuses these
before any matching attempt — *"No university_name — a national-level or context/reference
record, not attached to one institution."* This is correct by construction; there is nothing to
resolve.

**74 rows: the "university" named is a national or regional application/coordination body, not
an institution** — `swissuniversities` (24), Ireland's Central Applications Office (18), Spain's
national access system (16), Ontario's OUAC (6), two Québec government bodies (8), British
Columbia's EducationPlannerBC (2). None of these are universities; `resolveIdentity` correctly
finds no match because there is no local university row for a national coordinating body to
match against. Arguably a research-corpus labeling nit (these read like they should have used
`university_name: null` the way the 69 above do, since they're the same kind of national-context
record), but not a resolution bug and not lost data — nothing about the underlying facts is
missing, they're just filed as "unresolved" instead of "not applicable to one institution."

**14 rows: `university_name_input = "Ankara University"`.** This is the one CEO flagged as a
plausible alias gap — reasonably, since Ankara University is unambiguously real. **It turned out
there is no alias gap to fix.** `entity_aliases` already carries `"Ankara University"` as an
alias of the entity behind `Ankara Üniversitesi` (`id 4a9446cc...`), and `sameCountry` already
treats `"Turkey"`/`"Türkiye"` as equivalent (`lib/acquisition/normalize.ts`'s own
`COUNTRY_ALIASES`, confirmed by literal grep, not just the file's comment). The alias-matching
mechanism works today, on this exact university, right now — proven by what happened next:

The 14 rows are actually **7 distinct facts, each logged twice** (two corpus files apparently
both carried the batch). Checked each of the 7 against live Ankara data (which already holds 7
requirement rows from later runs): **6 of 7 are already there.** Three (`REQ-...-9320`
"Minimum 440 points from TR-YÖS", `9322` "Minimum 400 points from TR-YÖS", and one more) are
embedded verbatim inside a later, better-structured consolidated row
(`2a850c44-...`) that tabulates TR-YÖS score tiers by programme — a later pass didn't just
recover these, it improved on them by adding the programme-name context the original flat
records lacked. A fourth (`9321`, the "VALID EXAMINATIONS ... EXCLUDING THE ABOVE-LISTED"
heading) is live with `is_exclusion: true` — the specific exclusion-handling gap a 2026-08-31
code comment in `lib/requirements/ingest.ts` describes as historically dropped is not present in
this row today. `9324`, `9325`, `9326` are live too.

**One fact remains genuinely missing**: `REQ-2026-08-21-9323`, *"TR-YÖS Minimum 200 points.
Valid for 2 years from the exam date."* — Ankara's baseline TR-YÖS admission threshold. The
live consolidated tiers row covers the *elevated* thresholds for named competitive programmes
(440/400/300/275); nothing live states the general baseline (200) or the 2-year validity
window. This is a real, narrow, single-fact gap — not a resolution failure, not a code problem,
just one requirement that hasn't been re-captured since the early run that first found it.

**No alias or config fix is being proposed, because none is needed** — the mechanism already
works, on this exact case, demonstrated by six-sevenths of its own output already being live.

## `not_ingestible` (219) — sampled broadly; this is the gate working, not a loss

164 rows carry `verification_state` refusals (152 `NEEDS_REVIEW`, 12 `CONFLICTING_EVIDENCE`); 48
carry `scale_ambiguity=undated_scale_assumption`; 7 carry the literal text "A newer record in
this same corpus explicitly supersedes this one" — which the current code returns under the
`superseded` outcome, not `not_ingestible` (line 343 of `ingest.ts`), so these 7 are themselves
stale-labeled the same way the `rejected` bucket was — filed under an outcome the code no longer
produces for that exact detail text. Functionally the same as `superseded`: correctly excluded
either way, since a newer record covers the same fact.

Sampled across all three reasons rather than reading all 219 (disproportionate for a bucket
CEO already predicted correctly). Every sample showed the same pattern: careful, specific,
evidence-cited refusals, not arbitrary caution.

- **`CONFLICTING_EVIDENCE` (12, all sampled)**: Harvard's live "SAT/ACT required" FAQ vs. a
  still-undisclaimed 2021–2022 COVID-waiver page; two live, mutually-inconsistent Heidelberg
  pages about whether non-EU applicants need a `uni-assist` pre-check. Each note names both
  sources, explains why neither is safely dismissible, and recommends a specific follow-up
  fetch. Textbook correct behavior — ingesting either side would risk telling a student the
  wrong thing with full confidence.
- **`NEEDS_REVIEW` (152; 130 with an explanatory note, 22 without)**: the noted ones are
  dominated by one well-documented, recurring real-world event — ETS's 21 January 2026 TOEFL
  rescale, which makes several universities' stated per-subtest thresholds (Glasgow, Boğaziçi,
  Bonn, Edinburgh among them) satisfiable on the *total* score but literally impossible to
  satisfy on the *subtest* score, because ETS stopped reporting subtests on the old 0–30 scale
  after that date. Each flagged record traces the specific arithmetic. The 22 without an
  explicit note skew toward the same TOEFL-rescale shape (e.g. "TOEFL-iBT: 100 with minimum
  subscores of 20") even unannotated, plus a few Dutch VWO/numerus-fixus admission-process facts
  that read as legitimately ambiguous rather than mis-flagged.
- **`scale_ambiguity=undated_scale_assumption` (48)**: same TOEFL-rescale shape again — sampled
  Bonn's, which turns out to be **one requirement fanned out across 8 bachelor's programmes**
  (same English-proficiency rule, 8 programme-scoped records), so the 48 count reflects real
  per-programme fan-out, not 48 independently-judged facts. The reasoning is precise: Bonn's
  "72" states a *total* score with no per-section breakdown, so (unlike Glasgow's) it's fully
  satisfiable via ETS's comparable score and doesn't carry the partial-unsatisfiability defect —
  the audit is specific enough to tell the two cases apart, not blocking everything that merely
  mentions a pre-2026 TOEFL number.

**Conclusion: `not_ingestible` needs no fix.** It is the shape-audit and evidence-conflict gate
doing exactly the job `lib/requirements/shape-audit.ts` was built for — refusing to show a
student a threshold that cannot actually be met, or a fact two official sources disagree about.

## What's actually left to do

1. **One missing fact** (not a live write made here — proposed for whoever has
   `university_requirements` write authority): Ankara University, `entrance_exam`, scope
   `international_undergraduate_other_programmes` (matching `9323`'s scope) or a new
   general-admission scope: *"TR-YÖS Minimum 200 points. Valid for 2 years from the exam
   date."* `data_confidence: high` (verbatim-sourced), `source_url`/`retrieved_at` from
   `REQ-2026-08-21-9323`'s own `raw_payload`.
2. **Queue reconciliation, proposed not applied**: 48 `requirement_research_queue` rows (the 36
   `rejected` + 12 of the 14 Ankara `unresolved_university` rows) currently show an outcome that
   no longer matches reality — their content is live, but the audit trail says otherwise. Exact
   `research_requirement_id` list is in this document's history (SQL re-run is one query against
   the criteria above). Whoever next needs to trust this queue as a "what's actually missing"
   source should not have to re-discover this — either update the 48 rows' `outcome` to
   `accepted` with `promoted_requirement_id` backfilled from the matching live row, or at minimum
   leave a pointer to this document next to them.
3. **The 7 mislabeled-`not_ingestible`-but-really-`superseded` rows** are cosmetic only (both
   outcomes mean "correctly excluded") — worth folding into the same reconciliation pass if one
   happens, not worth a separate action.
4. **Everything else in the 412-row scope (`unresolved_university`'s 143 correct rows,
   `not_ingestible`'s 219) needs no action.** They are the pipeline working.

Not touched: `malformed_source` (90, oryn-4e's territory), `superseded` (20, out of scope for
this pass).
