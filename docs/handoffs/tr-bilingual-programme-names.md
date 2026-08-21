# Turkish English↔Turkish programme-name bridge — 6 universities

Branch `oryn/tr-bilingual-programme-names`. Assigned 2026-08-22 by the coordination session
to close the gap `docs/handoffs/yok-atlas-placements-scale-12-universities.md` Finding 1
identified: Bilkent, Boğaziçi, Koç, Özyeğin, and Yıldız Teknik's `university_programs.name`
values are recorded entirely in English, while YÖK Atlas's live `birimAdi` is Turkish-only —
so none of these five universities' placement records could be matched, and Gebze Teknik's
already-embedded bilingual names had never been independently verified against the
university's own site.

## Result

**175/175 programmes researched, 174 paired to a sourced official Turkish name, 306 YÖK
Atlas `kilavuzKodu` values captured.**

| University | Rows | Paired | Unpaired/ambiguous | kilavuzKodu captured |
|---|---|---|---|---|
| Bilkent University | 33 | 33 | 0 | 72 |
| Boğaziçi University | 30 | 29 | 1 | 34 |
| Gebze Technical University | 23 | 23 (22 verified, 1 conflict flagged) | 0 | 26 |
| Koç University | 22 | 22 | 0 | 53 |
| Özyeğin University | 24 | 24 | 0 | 62 |
| Yıldız Teknik Üniversitesi | 43 | 43 | 0 | 59 |
| **Total** | **175** | **174** | **1** | **306** |

Every pairing was sourced from the university's own official pages placing both the English
and Turkish name on the same programme (language-toggle department pages, bilingual PDFs, or
explicitly cross-referenced pages) — never from translating the English name ourselves. Where
no such source existed, the row is `pairing_method: "unpaired"` with `turkish_name: null`
rather than guessed.

## Files

- `data/research/university-programs/tr_bilingual_names_bilkent_2026-08-22.jsonl`
- `data/research/university-programs/tr_bilingual_names_bogazici_2026-08-22.jsonl`
- `data/research/university-programs/tr_bilingual_names_gebze_teknik_2026-08-22.jsonl`
- `data/research/university-programs/tr_bilingual_names_koc_2026-08-22.jsonl`
- `data/research/university-programs/tr_bilingual_names_ozyegin_2026-08-22.jsonl`
- `data/research/university-programs/tr_bilingual_names_yildiz_teknik_2026-08-22.jsonl`

Schema per line (fields vary slightly per file where a university-specific nuance required
it — Gebze Teknik additionally carries `language_of_instruction` and its source, since that
was the second half of its assignment):

```json
{
  "university": "...",
  "program_id": "<ORYN university_programs UUID>",
  "english_name": "...",
  "faculty_en": "...",
  "turkish_name": "... or null",
  "faculty_tr": "... or null",
  "source_url_en": "... or null",
  "source_url_tr": "... or null",
  "pairing_method": "language_toggle | bilingual_document | cross_referenced_pages | unpaired",
  "confidence": "high | medium | low",
  "kilavuz_codes": [{"kilavuz_kodu": "...", "tier_label": "Burslu|%50 İndirimli|Ücretli|...", "yok_birim_adi": "..."}],
  "notes": "..."
}
```

## The one genuinely unpaired case

**Boğaziçi's "Mathematics and Science Education"** (program_id
`d15fa653-b6f9-4254-a1f3-890209bc34a6`) is exactly the department-vs-programme trap this
project's YÖK Atlas reference memory already flagged: the department
(`Matematik ve Fen Bilimleri Eğitimi Bölümü`) coordinates **five** separately-admitted YÖK
programmes (Chemistry Education, Physics Education, Science Education, and two distinct
Mathematics Education tracks — Primary/İlköğretim and Secondary). Recorded as unpaired with
all five candidate kilavuzKodu values listed in `notes` for whoever splits this DB row into
its real admission units.

## Real findings that go beyond simple pairing

- **A likely DB misclassification**: Gebze Teknik's "Strategy Science"
  (`0042ab63-53b0-4ae6-be36-5d87415bb535`) has **no bachelor's programme at all** — Strateji
  Bilimi at GTU is graduate-only (a thesis Master's running since 1999, plus a non-thesis
  track), confirmed via GTU's own site and absent entirely from YÖK Atlas's 2026 bachelor's
  results. Flagging for whoever owns `university_programs` data quality — this row's
  `degree_type`/level looks wrong at the source.
- **Gebze Teknik's language-of-instruction gap, closed with real sources**: the handoff this
  lane picked up from had 22/23 GTU rows with `language_of_instruction: null` and flagged
  guessing the "(İngilizce)" YÖK suffix as unacceptable. Sourced from GTU's own ECTS/AKTS
  system instead: 13 English, 4 partial-English-30%, 3 Turkish, 3 genuinely left unknown
  (GTU's own language-of-instruction page is "under update" for 2 of them; the third,
  Strategy Science, has no bachelor's programme to have a language of instruction for).
- **Harita → Geomatik rename, confirmed still-pending at Yıldız Teknik**: YTU's Turkish site
  and YÖK Atlas both still say "Harita Mühendisliği" despite the November 2023 national
  rename (this project's YÖK Atlas reference memory already flagged this pattern from the
  İTÜ case); YTU's own English page has already switched to "Geomatic Engineering." Recorded
  the currently-live Turkish name, not the renamed form — the DB should track the source's
  actual current string, not what it will eventually become.
- **A structural mismatch in Yıldız Teknik's Faculty of Education**: 6 of our DB "programs"
  there are actually department-level entities, each covering 2 distinct YÖK-admitted
  teaching majors (e.g. "Temel Eğitim" → Okul Öncesi Öğretmenliği + Sınıf Öğretmenliği).
  Recorded informationally in `notes`, not force-matched to a single kilavuzKodu — same
  discipline as the Boğaziçi case above, flagged for product review rather than resolved
  unilaterally.
- **Bilkent's Economics faculty was wrong in our DB**: recorded as a guess of "Faculty of
  Business Administration"; confirmed via Bilkent's own site to actually be "Faculty of
  Economics, Administrative, and Social Sciences" (Business Administration at Bilkent
  contains only Management).
- **Özyeğin's Computer Science is internally inconsistent on the university's own site**: the
  department's own bilingual subdomain brands the English degree "Computer Science (BSCS)"
  while its Turkish name is literally "Bilgisayar Mühendisliği" (Computer *Engineering*), and
  the main site's faculty listing glosses the same department as "(Computer Engineering)" in
  English too. Recorded both readings at medium confidence rather than picking one — the
  disagreement is real and a reviewer needs to see it, not have it silently resolved.
- **Six kilavuzKodu-less programmes are a real admission-track difference, not a matching
  gap**: Bilkent's Fine Arts/Music/Performing Arts and Yıldız Teknik's Aviation
  Electronics/Art/Music and Performing Arts/Sociology/Western Languages/Educational Sciences
  have no active 2026 YÖK Atlas Lisans row because they admit via talent exam (no
  `basariSirasi`/national rank), not central YKS score — absence from a rank-sortable API,
  not a data quality problem.

## Known operational hazard for future parallel lanes

One agent (Özyeğin) hit a scratchpad-file collision mid-task: a concurrent session's
unrelated Yıldız Teknik data briefly overwrote its intermediate working files. Caught via a
sanity check inside the agent, which re-fetched fresh data with uniquely-named files and
rebuilt the output; independently re-verified the final committed file afterward (0/24 rows
mislabeled). Background agents' scratch space is not fully isolated across concurrent
sessions on this machine — future lanes dispatching parallel sub-agents should use
uniquely-named scratch files per agent and a sanity check that output data matches the
institution it claims to describe.

## Wiring pass (2026-08-22, same lane, second package)

The bridge above is now wired into the actual matching pipeline.

`lib/programs/yok-atlas-matching.ts`'s `matchYokPlacements` gained an optional
`kilavuzBridge: Map<number, string>` parameter (YOK `kilavuzKodu` -> `university_programs.id`).
An exact identifier is checked and resolved *before* any name-based heuristic — it's the only
path that can ever match a university whose `university_programs.name` and YOK's `birimAdi`
are recorded in different languages, since name-equality can never bridge that gap. Defended
against a bad bridge entry: the target program must exist in the provided `dbPrograms` and
belong to the same university, or the record is reported unmatched rather than trusted
blindly. Defaults to an empty map, so every university this function already matched by name
(Ankara, Istanbul, METU, Hacettepe, ITU, Sabancı) is completely unaffected.

`lib/programs/tr-bilingual-name-bridge.ts` builds that map from the six `tr_bilingual_names_*`
files above. **Only `confidence: "high"` entries are wired in.** The fee tier
(Burslu/%50 İndirimli/Ücretli) rides inside the same kilavuzKodu record a medium/low
confidence name pairing produced, so an uncertain pairing there is a money-error risk, not
just a labeling one — see Özyeğin's "Computer Science" case below. Every excluded entry is
returned in a `heldBack` list with a specific reason, never silently dropped.

`scripts/ingest-yok-atlas-placements.ts` now loads every `tr_bilingual_names_*.jsonl` file
automatically and reports the held-back set alongside its existing per-university breakdown.
Absent entirely on a checkout with no bilingual research yet (returns an empty bridge, not an
error), so this is additive.

### Dry-run predicted yield (2026-08-22, live YÖK fetch + live DB state via Supabase MCP)

This worktree has no working local `SUPABASE_SECRET_KEY` (the known cross-branch 401
regression documented in `docs/ORYN_WORKSTREAMS.md`'s "known cross-branch facts"), so the
dry run was computed by feeding the real `matchYokPlacements`/`buildKilavuzBridge` production
code a fresh live YÖK Atlas fetch and DB state pulled via the Supabase MCP tool directly,
rather than running `scripts/ingest-yok-atlas-placements.ts` end-to-end. Same matching logic
either way — this is the identical precedent the original placement-schema pass used for the
same reason.

**288 of 306 sourced kilavuzKodu values wired** (18 held back across 8 medium-confidence
programmes that do have real codes — see the reason breakdown below). **Predicted: 288 new
`university_program_placement_cycles` rows, zero ambiguous groups, zero bridge-safety
rejections** (every wired kilavuzKodu resolved to a program that actually exists and belongs
to the right university).

| University | Predicted new rows | Unmatched (LISANS) | Ambiguous |
|---|---|---|---|
| Bilkent University | 72 | 0 | 0 |
| Boğaziçi University | 27 | 13 | 0 |
| Koç University | 53 | 0 | 0 |
| Özyeğin University | 59 | 3 | 0 |
| Yıldız Teknik Üniversitesi | 53 | 10 | 0 |
| Gebze Technical University | 24 | 2 | 0 |
| **Total** | **288** | **28** | **0** |

Of the 288: 277 filled (real quota/score/rank), 11 unfilled (real unfilled-quota outcome, not
missing data), 184 carry a burs/fee tier, all 4 `puan_turu` values present (DİL, EA, SAY,
SÖZ).

**The 28 unmatched are all real, explained gaps, not a matching failure**:
- Boğaziçi's 13: the 5 sub-majors under the deliberately-unpaired "Mathematics and Science
  Education" department (Okul Öncesi Öğretmenliği, İngilizce Öğretmenliği, Matematik
  Öğretmenliği, etc.) plus `(KKTC Uyruklu)` Northern-Cyprus-quota variant rows this pass's
  bridge doesn't cover (a separate admission unit YÖK Atlas gives its own code, per this
  project's YÖK Atlas reference memory — real information with nowhere to live in the current
  schema, not a bug here).
- Yıldız Teknik's 10: the sub-majors under its own 6 department-level DB rows (Sınıf
  Öğretmenliği, Okul Öncesi Öğretmenliği, Türkçe Öğretmenliği, Sosyal Bilgiler Öğretmenliği,
  Rehberlik ve Psikolojik Danışmanlık — the structural mismatch flagged in the research pass
  above) plus 2 departments genuinely absent from our catalogue entirely (Fransızca Mütercim
  ve Tercümanlık, Fotoğraf ve Video / Sanat ve Kültür Yönetimi).
- Özyeğin's 3: exactly the "Computer Science"/"Bilgisayar Mühendisliği" medium-confidence case
  — correctly held back rather than risking a wrong-department fee-tier insert.
- Gebze Teknik's 2: an `(İngilizce)` English-medium tier of Management Information Systems
  this pass's bridge didn't capture a code for (only the base entry was captured at high
  confidence).

**Not applied.** `matchYokPlacements`/`buildKilavuzBridge` are fully tested (25 tests total
across the two files, several against real sourced pairs — e.g. Bilkent's Information Systems
and Technologies, kilavuzKodu 202190193, verified live against YÖK Atlas before writing the
test) and the dry run is complete, but the actual insert into
`university_program_placement_cycles` stays pending explicit coordinator sign-off — no
`--apply` run, no DB writes this pass.

## What this does NOT do

- No `university_programs` rows were edited, added, or renamed.
- No `university_program_placement_cycles` rows were inserted — the matching/bridging code is
  wired and dry-run-verified, but nothing has been applied. `0057` (or whatever the current
  live migration number is) stays untouched.
- No Supabase/database writes, no migrations, no application code changes beyond the matcher
  and ingestion script wiring described above.
