# TOBB Ekonomi ve Teknoloji Üniversitesi — research staged for catalogue addition

**Status:** staged, not applied. No DB writes. **Author lane:** oryn-60, continuing the Gate F /
Turkish-depth thread (second of the Tier-1 candidate-list adds, after Galatasaray). **Base:**
local `main`.

**Catalogue addition, same shape as Galatasaray** — no existing `universities` row. Second of
the four Tier-1 candidates from `tr-university-candidate-list-2026-09-01.md`, picked next as
the smallest/most tractable of the remaining three (62 raw records vs. Marmara's 126 and
Yeditepe's 142).

## Gate and domain — checked, no issue found

`looksOfficial('etu.edu.tr')` → `true`, `sourceAuthority('programs', 'https://www.etu.edu.tr')`
→ HIGH/`official_primary`. Both `www.etu.edu.tr` and the bare domain resolve cleanly (200, valid
cert) — no repeat of Galatasaray's `www` chain-verification gap. One honest difference:
the cert is domain-validated (Sectigo DV), not organization-validated, so it carries no
institution name to check against the way Galatasaray's OV cert did — identity here rests on
live page content (address, navigation, and every programme name matching YÖK Atlas's own data
exactly), which is a real confirmation, just a different kind than a certificate subject line.

## Programmes — 22 distinct, deduplicated from 62 raw records

YÖK Atlas returns up to 3 records per programme (`Burslu`/full scholarship, `%50 İndirimli`/half
tuition, `Ücretli`/full tuition) — the fee-tier structure vakıf universities run, absent from
devlet institutions. Deduplicated to 22 actual programmes across 6 faculties (Fen-Edebiyat,
Hukuk, Mimarlık ve Tasarım, İktisadi ve İdari Bilimler, Tıp, Mühendislik) — this is the right
level for `university_programs`, matching how `university_program_placement_cycles`' own
`burs_orani_adi` column already models the tier variation per-programme rather than as separate
programmes, exactly the shape the existing 12-university pipeline already assumes.

Two programmes (Tarih, Türk Dili ve Edebiyatı) show only one Burslu-tier record each in live
data — possibly scholarship-only admission routes, not confirmed against the university's own
site this pass, named as unresolved rather than assumed.

## The real finding: selectivity varies enormously by fee tier, not just by programme

**Raw best rank: 188 (Tarih, Burslu) — but that seat has `kontenjan=3`, below this project's own
≥10-seat floor for a trustworthy peak-selectivity figure** (see the same-day correction added to
`tr-university-candidate-list-2026-09-01.md`, which this finding directly caused). **Properly
floored, TOBB ETÜ's true peak is rank 3,554** (Elektrik-Elektronik Mühendisliği, Burslu, 13
seats) — solid, roughly on par with Yıldız Teknik or Marmara, not the near-Bilkent figure 188
implied.

**Worst filled rank: 1,012,275 (Uluslararası Girişimcilik, Ücretli).** The same programme spans
both ends regardless of which peak number is used: İktisat is rank 838 on its scholarship seat
(7 seats — itself below the floor, a real signal but a thin one) and rank 818,411 on its
full-price seat (23 seats). The institution as a whole is much less uniformly selective than any
single "best rank" figure suggests; most of its seats are reachable by nearly any YKS candidate
willing to pay. Worth surfacing to whoever eventually designs how Oryn represents vakıf-university
selectivity to a student — a single number here needs a stated fee-tier caveat before it's shown
anywhere, the same way this project's Gate F report flagged the placement table having no reader
before anyone builds around it.

## Admission facts — lighter pass than Galatasaray, and said so rather than padded

Domestic pathway needs nothing institution-specific (`system-shape.ts` already covers it).
Checked the international-admissions page (`www.etu.edu.tr/tr/uluslararasi`): a real, structured
portal exists, but **whether TOBB ETÜ runs its own entrance exam or accepts SAT/A-Level/IB/
Abitur/diploma scores directly sits on a linked subpage this pass didn't fetch.** Unlike
Galatasaray, where that same question resolved cleanly (GSÜYÖS), here it's left genuinely
unresolved rather than guessed at or padded out with a placeholder answer.

## What this does NOT do

- No `universities`/`university_programs`/`university_program_placement_cycles` rows inserted.
- No full 62-row placement-cycle staging this pass — only the aggregate best/worst/spread
  finding above. Per-tier placement rows are the natural next increment once the programme rows
  themselves are being created, the same two-step shape the real ingest pipeline already uses
  for the existing 12 universities (programmes first, placement cycles second).
- No international entrance-exam answer — named as unresolved, not guessed.
- No change to `lib/acquisition/source-authority.ts`.
