# Handoff: Turkey high-schools registry — Wave 1

STATUS:
COMPLETE

BRANCH:
`oryn/research-turkey-schools` (isolated worktree, branched from `origin/main`@`5c59115`)

LATEST COMMIT:
`28d851a` ("research(schools): complete Turkey high-schools Wave 1 registry (100/100)") — research/handoff commits only, no schema/app changes

SCHOOLS:
100 / 100 — **58 already-canonical** (live in production `canonical_entities`, not
re-researched this pass) + **42 new candidates** (this pass's research product)

DATASET:
`data/research/schools/turkey-high-schools-wave1-100.jsonl` — one JSON object per line,
`existing_status: "already_live"` (58) or `"new_candidate"` (42). Methodology:
`docs/research/turkey-high-schools-research.md`.

INTEGRITY AUDIT (re-run 2026-08-20, after this file's first draft): exactly 100 rows, all
valid JSON; 0 duplicate `canonical_name`s; 0 alias/name strings resolving to more than one
distinct school (checked every `canonical_name`/`display_name`/alias across all 100
against each other); city spelling normalized to one consistent Turkish form per city (an
initial mismatch — new candidates used plain-ASCII "Istanbul", existing rows use
"İstanbul" — was caught and fixed, see methodology memo); every `advanced_programs` claim
on a new candidate has at least one matching `program_evidence` entry (0 unsupported
claims found). Every number in this file below was recomputed directly from the dataset
file for this audit, not carried forward from an earlier draft.

IDENTITY VERIFIED:
100 / 100 at `medium` confidence or better — 99 at `high` confidence. The one `medium`:
**Özel Antalya Koleji** — the brand operates multiple campuses (Muratpaşa, Lara) and
available sources didn't establish whether they're one legal school or separate
MEB-registered entities; both campus names are recorded as aliases so autocomplete still
resolves either, but ingestion should treat this one as `needs_review` rather than
`official_verified`.

ACADEMIC CONTEXT VERIFIED:
42 / 42 new candidates researched (primary_curriculum + explicit advanced-program
evidence-or-honest-absence for each). The existing 58 carry academic context from the
2026-08-15/17 pass already live in `school_profiles`/`school_credentials` (42 IB DP rows
plus AP/Cambridge IGCSE/German Abitur-DSD/French Baccalaureate-equivalency rows) — not
re-verified here, per this pass's scope decision (see methodology memo's "starting point"
section).

IB KNOWN:
11 of the 42 new candidates confirmed (IB World School directory and/or official school
page): FMV Ayazağa Işık Lisesi - Fen Lisesi, AlJazari International School of Science and
Technology, Eyüboğlu Eğitim Kurumları, ABC Okulları (Ankara), Aka Koleji, Özel Konya
Nesibe Aydın Fen Lisesi, Özel Balıkesir Açı Koleji, Yeni Yol Okulları, Özel Ankara Zafer
Koleji, Özel Antalya Toplum Koleji Anadolu Lisesi, Çakır Okulları.

AP KNOWN:
5 of the 42: AlJazari International School, TED Eskişehir Koleji, TED İzmir Koleji, İzmir
Özel Türk Koleji, Özel Ankara Zafer Koleji.

CAMBRIDGE / IGCSE / A LEVEL KNOWN:
5 of the 42: Ankara Üniversitesi Geliştirme Vakfı Özel Okulları Anadolu ve Fen Lisesi,
İzmir Özel Türk Koleji, Özel Konya Nesibe Aydın Fen Lisesi, Özel Antalya Toplum Koleji
Anadolu Lisesi, Özel Antalya Koleji.

Plus 4 more with a different named international credential (not IB/AP/Cambridge):
Sankt Georg Avusturya Lisesi (Austrian Matura), Özel İncek Anka Bilim Koleji (German
DSD), Bornova Anadolu Lisesi (German DSD I & II), Özel Kocaeli TED Koleji (Oxford AQA
International GCSE, English-as-Second-Language only). The remaining 22 of 42 have no
advanced program confirmed — an honest null, not a research gap, for schools like
standard public Fen Lisesi/Anadolu Lisesi where no foreign-curriculum program exists.

UNRESOLVED ALIASES:
0 hard-unresolved. 2 of 2 checked have no cited `source_url` on that specific alias
entry (both otherwise backed by sourced evidence elsewhere on the same record): `İzmir
Fen Lisesi` → "Izmir Science High School" (a self-evident literal English translation,
not an independent claim) and `Özel Balıkesir Açı Koleji`'s own "BALIKESIR ACI COLLEGE"
alias (the exact queue-candidate name itself, already evidenced by the record's other
sources). Flagged in case ingestion wants every individual alias row to carry its own
URL rather than relying on the record's other sources.

UNRESOLVED SCHOOL/CAMPUS AMBIGUITIES:
1 — Özel Antalya Koleji (see IDENTITY VERIFIED above). Two secondary/soft gaps worth
tracking, not identity ambiguities: TED Konya Koleji and TED Kayseri Koleji have solid
identity but their program pages returned HTTP 403 during research, so `advanced_programs`
is honestly empty pending a future re-check rather than a confirmed "no program."

RESOLVED FROM ORYN'S PRE-EXISTING `entity_verification_queue` (8/8):
Recomputed directly from the live queue snapshot and the final dataset (not from an
earlier chat summary, which stated this imprecisely) —

- **2 of 8 already had a city on file** in the queue itself: Ankara ABC Okulları
  ("Ankara") and BALIKESIR ACI COLLEGE ("Balıkesir"). Both confirmed correct on
  resolution; official name for the latter is "Özel Balıkesir Açı Koleji" ("Açı" loses
  its diacritics as "ACI" in the queue's transliteration).
- **6 of 8 had NO city on file at all** (null) — the queue itself made no city
  assumption for these; any city hint in this pass's own research-agent dispatch was
  this session's own working guess, not queue data. Of those 6:
  - **2 resolved to what this session's own guess had assumed**: AlJazari
    International School → İstanbul, Anka Bilim Koleji → Ankara.
  - **4 resolved to a different city than this session's own working guess** (i.e.
    this pass's own hypothesis was wrong, not the queue's — the queue had nothing to
    be wrong about): Aka Koleji → **İstanbul** (guessed Ankara/İzmir-Manisa), Cakir
    Schools → **Bursa** (guessed İstanbul/İzmir-Manisa), Yeni Yol Schools →
    **Eskişehir** (no specific city guessed, assigned to the wrong regional batch),
    ZAFER COLLEGE → **Ankara** (guessed Antalya/Kütahya).

CITY DISTRIBUTION (100 total, 14 distinct cities):
İstanbul 51, Ankara 14, İzmir 9, Eskişehir 5, Bursa 4, Kayseri 3, Konya 3, Antalya 3,
Adana 2, Kocaeli 2, Erzurum 1, Gaziantep 1, Mersin 1, Balıkesir 1. Nine cities present for
the first time in ORYN's registry via this pass: Eskişehir, Kayseri, Konya, Antalya,
Adana, Kocaeli, Balıkesir (plus deepened coverage in Bursa/İzmir/Ankara/İstanbul).

MAIN GAPS:
- No live-DB write happened in this pass (by design — see AGENTS.md's research-role rule
  25). The 42 new candidates are a reviewed proposal, not yet ingested.
- Administrative metadata (`meb_institution_code`, street address, district) was not
  collected for new candidates — breadth-before-depth, matches how the existing 58 were
  also seeded thin on those fields.
- `advanced_programs` claims are conservative by design: 22 of 42 honestly carry none, and
  a few explicitly flagged medium-confidence claims (e.g. Özel Antalya Koleji's Cambridge
  page, Özel Ankara Zafer Koleji's self-reported AP) should get one more independent check
  (Cambridge International School Finder, College Board AP Course Ledger) before being
  marked `official_verified` rather than `source_verified`.
- Considered but not chased further, worth a look in Wave 2: "Çamlıca Kız Anadolu Lisesi"
  (Üsküdar, prominent selective public school) and a possible distinct "Boğaziçi Anadolu
  Lisesi" (name surfaced during Istanbul research, could not independently verify as a
  distinct current institution — not included, not fabricated).

INTENDED CONSUMER:
Whoever owns canonical-entity ingestion for schools (Claude A / `DATA-A` per
`docs/ORYN_WORKSTREAMS.md`, or a founder-directed successor). Suggested ingestion mapping:
`new_candidate` rows → `canonical_entities` (+ `entity_aliases`, `school_profiles`,
`school_credentials`, `entity_evidence`) following the exact shape documented in
`docs/research/turkey-high-schools-research.md`'s "canonicalization methodology" section.
The 1 `medium`-confidence row (Özel Antalya Koleji) should land in
`entity_verification_queue` rather than being auto-inserted as `official_verified`.

NEXT RECOMMENDED ACTION:
1. Ingestion owner reviews and applies the 42 new candidates (with the one flagged
   exception routed to manual review).
2. Re-run this dataset's dedup check against live state immediately before ingesting —
   time has passed since this measurement and another session could have written to the
   same tables (per this repo's own parallel-session discipline).
3. Wave 2 candidates below.

WAVE 2 CANDIDATES (not researched this pass, proposed for the next round):
- Second-tier coverage in cities already touched once (a second Adana/Kocaeli/Antalya
  school apiece would round those out).
- Cities still entirely absent: Trabzon, Samsun, Denizli, Muğla, Şanlıurfa/Gaziantep-region
  depth beyond the 1 existing Gaziantep school.
- The two "considered but not chased" names above (Çamlıca Kız Anadolu Lisesi, and
  resolving whether a distinct "Boğaziçi Anadolu Lisesi" exists).
- Deeper FMV Işık network coverage (Florya and Feneryolu campuses were explicitly not
  verified this pass — only Ayazağa was, since it had the clearest IB evidence).
