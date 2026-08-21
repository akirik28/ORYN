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

## What this does NOT do

- No `university_programs` rows were edited, added, or renamed — this is a research
  proposal, same posture as every other research lane in this project.
- No `university_program_placement_cycles` rows were inserted — actually wiring these
  sourced Turkish names + kilavuzKodu values into the ingestion pipeline
  (`lib/programs/yok-atlas-matching.ts`, `scripts/ingest-yok-atlas-placements.ts`) is a
  follow-up for whoever owns that code, not done here.
- No Supabase/database writes, no migrations, no application code changes.
