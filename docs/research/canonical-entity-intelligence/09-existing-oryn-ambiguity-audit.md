# 09 — Existing ORYN Ambiguity Audit

Every number in this document came from a direct, read-only `execute_sql` query against the live
`oryn-qa-scratch` project (id `qtcvcflzxbuagvvwahhu`) during this session, not from a prior
report. **This registry is live and actively written by other concurrent sessions** — one query
mid-session found the duplicate-pair count had shifted between two runs of an equivalent query,
consistent with concurrent writes elsewhere, not a bug in this audit's method. The final,
highest-confidence numbers below were captured together, in the same short window
(`snapshot_time 2026-08-20 22:54:10 UTC`), specifically to keep this document internally
consistent; treat every count here as accurate as of that timestamp, not as a permanently fixed
fact.

## Finding 1 (highest severity): Turkish-script `normalized_name` drift is live, not historical

Full detail and reproduction in `07`. Restated here as an audit finding because it is the one
item in this document that is not merely "unresolved backlog" but an ongoing, silent gap in the
registry's core uniqueness guarantee: **26/26 sampled `canonical_entities` rows whose
`display_name` contains a Turkish `ı`/`İ` have a stored `normalized_name` that disagrees with
`lower(unaccent(display_name))`** — the database's own documented convention for that column.
`canonical_entities_identity_uq` cannot protect against a duplicate insert for any of these
institutions today. Severity: **P0** — this is a structural gap affecting an entire script/
language's worth of entities, not a bounded backlog.

## Finding 2: 41 live university duplicate pairs, fully explained by two bulk-import timestamps

Re-running the Phase 6 audit query (migration 0039) directly finds **41 pairs** of
`entity_type='university'` canonical entities sharing an exact `normalized_name`, all still
`queued`/`P1`/`possible_duplicate` in `entity_verification_queue` since that migration. Every
pair, without exception, resolves to the same two-part mechanism once `created_at` and
`universities` linkage are checked together:

- **One side was created `2026-08-16 21:42:51.3+00`**, carries a ROR external id, and has exactly
  one matching `universities` row.
- **The other side was created `2026-08-16 23:29:46.9+00`** (1 hour 47 minutes later), carries
  **no external id of any kind**, and has **zero matching `universities` rows**.
- One pair (Victoria University of Wellington) has its "complete" side at a third timestamp,
  `22:09:19.8+00` — noted precisely rather than silently folded into the pattern, though it does
  not change the pair's classification (ROR present, `universities` row present).

Read together with a separate query (every `entity_type='university'` canonical entity with no
matching `universities` row: **45 rows**, all but a handful sharing the `23:29:46.9` timestamp),
the diagnosis is precise: **two bulk canonical-entity-only import batches ran 1h47m apart on
2026-08-16; the later batch's ~45 rows never received a `universities` row or any external-id
enrichment at all**, unlike the rest of the registry (93.4% ROR coverage otherwise). This is an
**enrichment/completeness gap, not a genuine identity ambiguity** — see `05` for why the existing
`classifyDuplicateCandidate()` correctly, conservatively reports all 41 as `AMBIGUOUS` today, and
why that is the right conservative default rather than a defect.

**A previously-undocumented product-surface risk this pattern implies:** because
`search_canonical_entities()` reads `canonical_entities`/`entity_aliases` directly and does not
require a matching `universities` row to return a hit, a raw entity search for e.g. "Yale
University" can surface an `entity_id` that has **zero** rows in `universities` — a caller that
(reasonably) assumes every non-merged `entity_type='university'` search hit joins to at least one
`universities` row would silently get nothing back for roughly 4% of university-type search
results (45 of ~1,100). This is a different failure shape than the already-known,
already-partially-fixed "UCL shows twice" bug (two `universities` rows sharing one entity — see
`lib/universities/canonical.ts`'s header comment) — this is one entity with *zero* backing rows.
Not verified against the actual product UI this session (no write/browser access exercised
against this specific path); flagged as worth a direct check, not asserted as an active bug.

Full 41-row table, both sides' ids/cities/timestamps/ROR values: `duplicate-candidates-university.json`.

## Finding 3: `entity_relationships` is almost entirely unpopulated

**9 rows total** against 1,135 active (non-merged) canonical entities of every type, as of the
snapshot. All 9 are real, well-evidenced, and already covered as worked examples in `03` — this
is not "9 wrong rows," it is "the mechanism works and has been used carefully exactly 9 times."
The gap is coverage, not correctness: no `campus_of` row exists anywhere in the live registry
(the relationship type most directly named in the mission brief's "campus" framing), no
`successor_of`/`predecessor_of` row exists anywhere (see `04`'s Constructor University gap), and
no candidate consortium beyond École Polytechnique/IP Paris (PSL, the University of California
system, any Turkish foundation-university holding company beyond the three already modeled) has
been evaluated for a relationship row yet.

## Finding 4: `opportunities.organization_entity_id` is 0/369 populated

Confirmed at the same snapshot. 171 distinct non-null organizer strings exist in
`opportunities.organization` (198 rows have no organizer text at all); full analysis in `08`,
including the University-of-Pennsylvania/Wharton six-way granularity cluster and the METU/
Arber-Kongre-A.Ş./Radyo-ODTÜ cycle-operator case. `country_entity_id` is equally at 0/369.

## Finding 5: `entity_verification_queue` has 54 queued items, most already well-diagnosed

Beyond the 41-43-item Phase 6 duplicate-audit slice, the remainder is dominated by an active,
in-progress Turkish IB-school research effort (source hints citing `ibo.org` school/directory
pages, `P0`/`P1` priority, several with precise, well-written blockers — e.g. the Terakki
Levent-granularity item quoted in full in `03`). This queue is **not neglected** — it shows
active, careful work with specific, evidence-cited blockers, not a pile of unexamined rows. This
package's contribution is the 41-pair diagnosis above and the normalization finding, not a
re-triage of the Turkish-schools queue, which another concurrent effort already owns and is
visibly handling well.

## Finding 6: the accent-folding duplicate shape (distinct from Finding 2) was already found and
correctly resolved — verified by direct query, not assumed

While extending `07`'s normalization testing to German, this session initially suspected a
*second*, distinct duplicate pattern: four major German universities (Eberhard Karls Universität
Tübingen, Friedrich-Alexander-Universität Erlangen-Nürnberg, Humboldt-Universität zu Berlin,
Ludwig-Maximilians-Universität München) each appeared to have two `canonical_entities` rows with
the same `display_name` but *different* stored `normalized_name` — one ASCII-folded
("universitat...tubingen"), one not ("universität...tübingen"). Direct inspection of each pair
(not just the aggregate count) found this was a false alarm: in all four cases, the ASCII-folded
row is already `verification_state='merged'` (tombstoned, zero `universities` rows, zero external
ids) and the un-folded row is the live, fully-enriched one (full ROR/GRID/ISNI/Wikidata/CrossRef
coverage). **This is `isPureEncodingVariant()` working exactly as designed** — its own code
comment claims "26 of 28 name-variant pairs in one pass turned out to be exactly this," and these
four are consistent with that cleanup having already run and correctly resolved them.

Broadening the check to every entity type, active rows only
(`group by entity_type, display_name having count(distinct normalized_name) > 1`): **zero
results.** No entity of any type currently has two active rows sharing a `display_name` with
disagreeing `normalized_name` values. This precisely re-scopes Finding 1: the Turkish `ı` gap is
confirmed to be exactly what `07` describes — **a single-row stored-value/live-convention
mismatch, a protection gap against a *future* duplicate insert — not a currently-manifested
duplicate row**, for any entity, Turkish or otherwise. Worth recording precisely rather than
loosely, since this session's own first read of the German case briefly overstated it before a
second, more careful query corrected it — the kind of self-correction this package's method
section commits to rather than hides.

## Finding 7: 70 active university entities lack any ROR id — including MIT, UCL, and LSE,
which turn out to belong to a different, already-known gap

Broadening Finding 2 beyond the 41 exact-duplicate pairs: **70 of 1,055 active
`entity_type='university'` canonical entities (6.6%) have no ROR external id at all** — a
different cut than the 41-pair count, since this one also catches under-enriched rows with no
duplicate at all. This splits cleanly into two distinct, differently-actionable groups:

- **8 famous universities — MIT, UCL, LSE, University of Warwick, KFUPM, The Hong Kong University
  of Science and Technology, University of Technology Sydney, The University of Newcastle
  (Australia)** — turn out to belong to a *different* known gap than Finding 2's duplicate pairs:
  each has **one** `canonical_entities` row but **two** `universities` rows pointing at it
  (`created_at 2026-08-16T14:06:40Z`, earlier than either bulk-import timestamp in Finding 2 —
  consistent with these being part of the original small hand-seeded pilot set, per
  `docs/handoffs/claude-a-university-spine.md`'s own account of a "30-roster pilot" predating the
  full ROR/OpenAlex pipeline run). This is precisely the shape `lib/universities/canonical.ts`'s
  header comment describes as the original "UCL search returns both rows" bug — these are
  **already flagged and application-layer-patched** via `duplicate-supersessions.json`, but the
  *underlying* `canonical_entities` row for each still has no ROR id, unlike the 985 that do. UCL
  and LSE specifically have **zero** external ids of any kind (not even Wikidata); MIT has
  Wikidata but no ROR. Worth flagging precisely because a prior session's own account states a
  full-registry ROR re-run reached "1018/1019 ok" — this finding doesn't contradict that (the run
  likely iterated `universities` rows, which these 8 entities also have, just pointing at an
  already-consolidated identity that the run's write path may not have revisited); it just means
  the claimed coverage figure and this session's direct, entity-level query diverge for exactly
  these 8, worth Claude A's own look rather than this session guessing at the mechanism further.
- **18 single-row universities with no duplicate involved at all** — genuine, uncomplicated
  enrichment gaps, spanning several of ORYN's explicit target countries: Université de
  Franche-Comté and Université Paul Sabatier Toulouse III (France), University Duesseldorf
  (Germany), plus Al-Quds University, Eastern Mediterranean University, European University of
  Lefke, Khoja Akhmet Yassawi International Kazakh-Turkish University, Lingnan University (Hong
  Kong), Moscow Institute of Physics and Technology, National Chung Hsing University, Near East
  University, Northwest Agriculture and Forestry University, Rutgers University–New Brunswick,
  Rutgers University–Newark, The New School, University of the Philippines. Full list with ids:
  `data/research/canonical-entities/university-ror-gaps.json`.

## What this audit deliberately checked and found clean

- **No duplicate pairs found outside `entity_type='university'`** via the same exact-name
  self-join (checked across all 14 entity types). Weakly powered (non-university types total
  under 80 active rows), but a real, reproducible negative result, not an assumption. `05`
  discusses why this method would still miss an alias-level (not canonical-name-level) collision.
- **No incorrect existing `entity_relationships` row found.** Every one of the 9 live rows was
  read and checked against its own cited evidence (`03`); all 9 hold up.
- **`citiesCompatible()` correctly classified all 41 live city pairs** as compatible (the "Boston"
  / "Boston, MA" shape) — no false negative found in this specific function.
- **The `İ`/ASCII-`I` question that motivated this session's normalization deep-dive turned out to
  already be handled correctly** (`07`) — recorded as a validated non-issue so it is not
  re-investigated by a future session.
- **École Polytechnique / Institut Polytechnique de Paris, Constructor University / Universität
  Bremen, and LMU Munich / TU Munich** — three previously-flagged same-city-different-institution
  risks from `docs/handoffs/claude-b-to-claude-a.md` — were all independently re-checked this
  session and confirmed correctly resolved (right relationship or correctly kept separate, per
  `03`/`04`).
