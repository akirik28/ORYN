# YÖK Atlas placement data — scaled from 1 university to 12

Branch `oryn/yok-atlas-placement-schema`. Applied 2026-08-21, following the round-trip
validation in `docs/handoffs/yok-atlas-placement-schema-decision.md` (29 Ankara Üniversitesi
rows). This pass covers every Turkish university this project holds `university_programs` rows
for — 779 rows across 12 universities.

## Result

**456 rows live in `university_program_placement_cycles`** (29 from the earlier validation pass
+ 427 new this pass): 425 filled, 31 unfilled, 76 with a real burs/fee tier, all 4 `puan_turu`
values present, zero dangling `program_id`.

| University | Matched (inserted) |
|---|---|
| Ankara Üniversitesi | 124 (+29 already live = 153) |
| Istanbul University | 120 |
| Middle East Technical University | 79 |
| Hacettepe University | 51 |
| Istanbul Technical University | 44 |
| Sabancı University | 9 |
| Bilkent University | 0 |
| Boğaziçi University | 0 |
| Gebze Technical University (GTU) | 0 |
| Koç University | 0 |
| Özyeğin University | 0 |
| Yildiz Technical University | 0 |

**427/887 LISANS-level source records matched (48%).** The zero rows for six universities are
not a matching failure — see the finding below, which is the more valuable result of this pass.

## New tooling (tested, reusable)

- `lib/programs/yok-atlas-matching.ts` — `matchYokPlacements()`, pure function: filters source
  records to `birimTuruAdi === 'LISANS'` (this project's Turkish programme population is
  Bachelor's-level only; mixing in Önlisans/associate-level source records risks exactly the
  "Bitki Koruma" same-name collision the validation pass caught), matches by exact
  `(university, name)`, and falls back to faculty-name pairing (`fymkAdi` vs
  `faculty_or_school`) only when it resolves 1:1 — anything left over is reported ambiguous, not
  guessed. `__tests__/programs/yok-atlas-matching.test.ts` (8 tests) covers the clean-match,
  unfilled, Önlisans-exclusion, no-db-counterpart, faculty-disambiguation-succeeds, and
  faculty-disambiguation-fails-so-flag-not-guess cases directly against the real shapes found
  today.
- `scripts/fetch-yok-atlas-placements.ts` (`npm run fetch:yok-atlas-placements`) — resolves each
  target university's live YÖK `universiteId` against the source's own `universiteler` list (not
  hardcoded blindly; the script fails loudly if a name doesn't resolve, which is exactly how two
  wrong guesses — Bilkent, Gebze — were caught and fixed before this ran for real), fetches the
  full placement dataset in one large page (the `universiteId` request filter does not actually
  filter server-side — confirmed directly, worked around the same way the original validation
  pass did), and writes a trimmed, normalized JSON snapshot to `data/research/`.
- `scripts/ingest-yok-atlas-placements.ts` (`npm run ingest:yok-atlas-placements -- --apply`) —
  the intended reusable path: reads the fetched snapshot, re-queries live DB state, runs the
  matcher, reports a per-university breakdown, and inserts (dry-run by default, same convention
  as every other ingestion script in this repo). **Not the path actually used to write today's
  427 rows** — see below.

## Why today's actual insert went through Supabase MCP directly, not the script above

This worktree's local `SUPABASE_SECRET_KEY` (copied from the main checkout's `.env.local`, which
has the correct project URL) returns `401` against PostgREST — this matches the
"Supabase-secret-key regression" already flagged in `docs/ORYN_WORKSTREAMS.md`'s "known
cross-branch facts," not a new problem introduced here. Rather than spend time on an
already-flagged, unrelated infrastructure issue, DB state was pulled and the final insert was
executed directly through the Supabase MCP tool (`execute_sql`), same pathway as the Ankara
validation pass — the matching logic is identical either way since both paths call the same
tested `lib/programs/yok-atlas-matching.ts`. Whoever picks up local credentials next can run
`scripts/ingest-yok-atlas-placements.ts` directly; it was written and is ready, just unexercised
end-to-end in this session because of the key issue.

## Finding 1 (the important one): six universities' programme names are in a different
language than the live source, not just differently formatted

Bilkent, Boğaziçi, Koç, Özyeğin, and Yildiz Technical's `university_programs.name` values are
recorded **entirely in English** ("American Culture and Literature", "Chemical Engineering",
"Archaeology and History of Art") — zero Turkish-specific characters across all 149 of their
combined rows, confirmed directly, not sampled. YÖK Atlas's live `birimAdi` is Turkish-only
("Amerikan Kültürü ve Edebiyatı (İngilizce) (Burslu)"). No name-based match is possible between
these without translating one side — and translating and asserting equivalence is exactly the
kind of unverified inference this project's standing rule (`feedback_verify_identity_not_pattern_match`;
"a name match is a lead, not evidence") exists to prevent, especially since several of these
foundation universities also bake the burs tier directly into the display name
(`"(Burslu)"`/`"(%50 İndirimli)"`), so a wrong translation could also silently pick the wrong
fee track.

**Not fixed here — this needs a verified English↔Turkish programme-name alias, not a guess.**
Flagging for whoever next works on Turkish programme-name normalization or bilingual aliasing,
the same way `kilavuz_kodu`'s identity-resolution potential was flagged rather than acted on in
the schema pass.

**Gebze Technical University is a related but distinct, partially-recoverable case.** Its 23
rows are recorded bilingually, `"English Name (Türkçe Ad)"` (e.g., `"Computer Engineering
(Bilgisayar Mühendisliği)")`. Extracting the parenthetical recovers an *exact*, already-present
Turkish string — not a translation — and matches the live source directly for 8/23 (Harita
Mühendisliği, Malzeme Bilimi ve Mühendisliği, Endüstriyel Tasarım, Şehir ve Bölge Planlama,
Mimarlık, İşletme, Elektronik Mühendisliği, İktisat). The other 15 are English-medium
programmes at Gebze, and the source appends `"(İngilizce)"` to the Turkish name for those —
`language_of_instruction` is null for 22/23 of Gebze's rows (only "Computer Engineering" has it
set), so there is no independently-recorded fact to justify appending that suffix rather than
guessing it. **Deliberately not implemented in `matchYokPlacements()`**: it would be a real,
narrow, single-university win (8 rows) at the cost of a new fallback path in code every other
university's matching also runs through, for a benefit this pass judged too small to justify the
added surface area. Documented here with the exact extraction and match set so whoever wants
those 8 rows (or the other 15, if `language_of_instruction` gets backfilled for Gebze first) can
add it as a scoped, evidenced follow-up rather than re-discovering this.

## Finding 2: a real `university_programs` coverage gap at Istanbul University, not a matching bug

Three name-groups were left ambiguous (not inserted) because the source has more distinct
programme records than this project has rows for:

- **"İşletme"**: 3 source records (İktisat Fakültesi, Siyasal Bilgiler Fakültesi, İşletme
  Fakültesi) vs. 2 DB rows (İşletme Fakültesi, İktisat Fakültesi) — already known from earlier
  work today; the Siyasal Bilgiler Fakültesi version was never captured.
- **"Siyaset Bilimi ve Uluslararası İlişkiler"** (Turkish-medium): 2 source records (İktisat
  Fakültesi, Siyasal Bilgiler Fakültesi) vs. 1 DB row (Siyasal Bilgiler Fakültesi only).
- **"Siyaset Bilimi ve Uluslararası İlişkiler (İngilizce)"** (English-medium): same shape, same
  gap.

**New finding, not previously documented**: this is not one isolated case — İstanbul
University's İktisat Fakültesi (Faculty of Economics) and Siyasal Bilgiler Fakültesi (Faculty of
Political Science) run parallel programmes under identical names in at least three cases, and
this project's existing research corpus has systematically captured only one faculty's version
each time. Left unresolved and unwritten, per the same discipline as the earlier İşletme case —
inserting placement data against the wrong `program_id` would be worse than not inserting at
all. Flagging for whoever next extends İstanbul University's programme catalogue: check every
İktisat Fakültesi ↔ Siyasal Bilgiler Fakültesi name overlap, not just these three.

## Files

- `lib/programs/yok-atlas-matching.ts`, `__tests__/programs/yok-atlas-matching.test.ts` — new.
- `scripts/fetch-yok-atlas-placements.ts`, `scripts/ingest-yok-atlas-placements.ts` — new.
- `data/research/yok-atlas-placements-2026-08-21.json` — new, trimmed live snapshot (1,005
  records across the 12 universities, all `birimTuruAdi` levels — the LISANS filter happens in
  the matcher, not the fetch, so the raw snapshot stays a complete, re-usable record of what the
  source actually returned that day).
- `package.json` — two new script aliases.
- This file.
