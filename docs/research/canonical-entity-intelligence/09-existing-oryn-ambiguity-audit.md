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

**Cross-validated independently, late in this session (`17`)**: running `lib/entities/audit.ts`'s
production code (the live Canonical Entity Autocomplete System's own audit tool, a completely
different code path than the `entity_verification_queue` re-query above) against a fresh
registry snapshot rediscovered nine of these 41 pairs on its own — via `entity_aliases` sharing
an identical alias string, not via matching names — with no prompting from this finding. The
nine: UCLA, UC Berkeley, UC San Diego, UC Santa Barbara, NYU, Caltech, City University of Hong
Kong, National Cheng Kung University, National Yang Ming Chiao Tung University. Worth naming
explicitly since several are exactly the high-application-volume US institutions ORYN's own
users are most likely to search for — a reasonable basis for sequencing which of the 41 pairs
to merge first once `10`/`11`'s recommended ROR-enrichment pass runs. See `17` §5 for the full
detail, including a methodology note on how this was nearly mis-presented as a new finding
before the overlap was caught.

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
four are consistent with that cleanup having already run and correctly resolved them. **Confirmed,
not just consistent-with, later this same session**: `scripts/university-duplicates-audit.ts`'s
hardcoded `MANUALLY_VERIFIED` list (found while researching `05`'s recommendation, not at the
start of this investigation — worth naming as a process gap) names these exact four institutions
by exact `canonical_entities` id, run via `npm run audit:university-duplicates -- --merge-verified`
on 2026-08-18. Not a mystery after all; see `05`'s dedicated section on this discovery for the
fuller picture, including what it means for this document's own P1 recommendation.

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

## Finding 8 (cross-lane observation, not this package's table to act on): `program_research_queue`
carries 32 stale `unresolved_university` rows for 9 institutions that now fully exist

`program_research_queue` (530 accepted / 32 `unresolved_university` / 29 `insufficient_evidence`
/ 1 rejected / 1 duplicate) is owned by the programs/opportunities lane, not this package — noted
here only because verifying it touches this package's exact subject matter and the finding is
concrete. All 32 `unresolved_university` rows (`university_id` is `null` on every one) name
exactly the same 9 institutions this exact package independently confirmed already exist as
fully-enriched `canonical_entities`/`universities` rows: Constructor University, École
Polytechnique, ESCP Business School, ESSEC Business School, Frankfurt School of Finance and
Management, LMU Munich, LUISS Guido Carli, Özyeğin University, Université Paris Dauphine - PSL,
University of St. Gallen — the identical 9 (plus the École Polytechnique identity question) a
prior handoff (`docs/handoffs/claude-b-to-claude-a.md`) already recorded as resolved on
2026-08-17. Direct check confirms all 9 now carry ROR (`University of St. Gallen` has ROR only;
the rest have ROR+GRID+ISNI+Wikidata, several also CrossRef Funder) — this is not a genuine
identity gap. These 32 rows were created `2026-08-17T12:56:49Z`, timed close to when the fix
landed, and appear to be a second wave of program candidates citing the same universities that
was never re-run through the resolver after the fix. **This package makes no recommendation about
`program_research_queue` itself** (not its table, not its lane) beyond surfacing the exact
evidence — whoever owns that pipeline can decide whether to re-run it.

## Finding 9: alias coverage outside the actively-researched corpus is thin-to-absent (Italy 3/38,
Netherlands 0/13), plus one isolated data-entry defect

Spot-checking a target country not otherwise covered in depth by this session's own live-data
work (France/Germany/Turkey got the most direct attention; `12`, produced by a background agent
this session, separately covers France/Germany/Netherlands/Switzerland from a collision-risk
angle): all 38 active Italian university entities have full ROR coverage, but only **3/38 (7.9%)
carry any `entity_aliases` row at all** — meaning well-known English forms a student would
actually search with ("La Sapienza" for Sapienza University of Rome, "Milan Polytechnic" for
Politecnico di Milano) are very likely missing, the same class of gap `02` documents generally,
now confirmed concretely for one specific country. Separately, **one isolated data-entry defect**:
`canonical_entities.display_name` for one row reads `"Universit degli Studi della Campania Luigi
Vanvitelli"` — missing the `à` entirely (should read "Università..."), not merely a normalization
artifact but a malformed stored display name a student would see rendered incorrectly. Checked
whether this is systemic (a broader dropped-diacritic import bug) via a regex sweep for other
truncated words across the whole registry — **found only this one row**; recorded as an isolated
defect worth a direct fix, not a pattern requiring a broader audit.

**The same gap, more complete, in a second country: the Netherlands.** All 13 active Dutch
universities have full ROR coverage and **zero aliases each** (0/13, not merely thin) — every one
is stored only under its English name (`"Delft University of Technology"`, `"University of
Amsterdam"`) with no `translation`-type alias for the Dutch original (`"Technische Universiteit
Delft"`, `"Universiteit van Amsterdam"`). This is a meaningfully different shape than the Turkish
registry's own pattern (`02`'s 27 live `translation` rows, e.g. Boğaziçi Üniversitesi ↔ Bogazici
University both captured) — the Dutch-language forms are not merely thin, they are entirely
absent, and critically **`nameKey()`/normalization would not bridge this gap even if tested**: a
Dutch-language source citing "Universiteit van Amsterdam" shares almost no tokens with "University
of Amsterdam" (different word order, different language), unlike an accent-only variant. A third
data point, checked the same way: **Germany, 5/49 (10.2%)** — thin, in the same range as Italy,
despite Germany otherwise getting real attention this session (`07`'s `ß` finding, the
resolved encoding-variant pairs in `09` Finding 6) — that attention was on normalization
mechanics, not alias research, and the two turn out not to correlate. Three countries now checked
this way (Italy 7.9%, Germany 10.2%, Netherlands 0%), all far below Turkey's near-universal
`translation` coverage — this looks like a real pattern worth stating generally rather than
treating each country as an isolated spot-check: **alias coverage in this registry currently
correlates with how much *dedicated alias-research* attention an entity has received, not with
normalization/identity attention generally, and not with how commonly a non-English form is
actually used.** Worth flagging as a general expectation for whoever prioritizes future alias
research: assume near-zero non-English-name coverage for any country/institution set that hasn't
had dedicated *alias* research specifically, regardless of how much other kinds of attention
(ROR enrichment, normalization fixes) that set has already received.

**Context for interpreting every finding in this document:** `activities`, `work_experiences`,
`volunteering_experiences`, `research_experiences`, `projects`, `awards`, `certifications`,
`sports_experiences`, and `education_records` are all currently **empty** (0 rows), and `profiles`
has only 2 rows, neither with `school_entity_id` set. This is expected pre-launch state, not a
gap — but it means every `canonical_preferred_custom_fallback` field this package discusses (`01`)
has never yet been exercised by a real student, and `create_or_resolve_user_submitted_entity()`'s
only 3 live `user_submitted` aliases are almost certainly from testing, not real usage. Worth
knowing before treating any of this package's findings as validated against real product traffic —
they are validated against the reference-data registry, which is what currently exists.

## Finding 10: `country_code` on `canonical_entities` has no input validation — confirmed by 3 real
malformed rows, all `user_submitted`

Direct query for any `country_code` that isn't a clean 2-letter uppercase code found exactly 3
rows, and all 3 share the same `verification_state='user_submitted'`: **"Sasmo"**
(`entity_type='organization'`) has `country_code='singapour'` — the *French* word for Singapore,
lowercase, stored where an ISO alpha-2 code (`SG`, matching every other row's convention) belongs.
**"EUROPE YOUTH PARLİMENT"** (`organization`) and **"Titan Akademi Spor Kulübü"**
(`sports_team`) both have `country_code='Türkiye'` — a country *name*, not a code. This is a small
(3-row) but precise finding: the one write path a student has into this registry,
`create_or_resolve_user_submitted_entity()`, accepts `p_country_code` as a raw parameter with no
validation against a real code list — because, per `15`, no such list (`entity_type='country'`)
exists yet to validate against. This is the exact, concrete, live illustration of why `15`'s
country-entity gap is not merely a theoretical infrastructure problem: **once country becomes a
real, pickable canonical entity, this class of bug becomes structurally impossible** (a student
could no longer type "singapour" into a field expecting a code — they would select "Singapore"
from a resolved list, the same custom-fallback flow already gives them for schools). Until then,
this is a live, if minor, data-quality gap worth a direct fix (validate/normalize `p_country_code`
in the function, or upstream in whatever client-side flow collects it) independent of the larger
`15` recommendation. Secondary, cosmetic note on the same row: **"EUROPE YOUTH PARLİMENT"** is
also both all-caps and misspelled ("PARLİMENT," missing the second `A`) — likely a raw,
un-corrected user-typed string (the real organization is the European Youth Parliament, a
well-known international NGO) — worth a `display_name` correction whenever this row is reviewed,
unrelated to the `country_code` issue but found in the same query.

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
- **`entity_external_ids`' `unique(id_system, external_id)` constraint holds with zero exceptions**
  in the live data — no external id value is ever shared across two different `canonical_entities`
  rows within the same registry. A structural integrity check on the constraint itself, not an
  assumption that it works.
- **`entity_evidence` (110+ rows) is in real, healthy use** — entirely from the Turkish IB-schools
  research effort, consistently `official_primary`/`official_registry`/`official_government`
  source types across field groups like `IB_WORLD_SCHOOL`, `IDENTITY_PROFILE`,
  `INTERNATIONAL_OUTCOMES`. Named here so this package's coverage of what's *working well* isn't
  only university-registry examples.
