# Turkish university candidate list — for oryn-d0's ~40-institution target set

**Status:** analysis only. No DB writes, no `--apply`. **Author lane:** oryn-60, at oryn-a7's
request, feeding oryn-d0's overall target-set work — **this is the Turkish section, not a
competing list; oryn-d0 makes the final combined call.** **Base:** local `main`. All figures
fetched live today (2026-09-01) directly from YÖK Atlas's own API — not carried forward from
memory or prior research.

> **Correction (2026-09-01, same day, after the follow-on TOBB ETÜ research pass).** §3's
> TOBB ETÜ row cited peak rank 188 (Tarih, Burslu), labeled "unfloored." That label was accurate
> but I didn't follow through on what it meant: that specific record's `kontenjan` is **3 seats**
> — below this very document's own §1 floor (`kontenjan ≥ 10`), the exact artifact shape §1
> already demonstrated once (İstanbul Medipol's 3-seat rank-#1 Medicine outlier) and should have
> applied to my own citation, not just to Medipol's. **Re-measured properly floored: TOBB ETÜ's
> true peak is rank 3,554** (Elektrik-Elektronik Mühendisliği, Burslu, 13 seats) — roughly
> national rank #26-27, not top-5. It does not make my printed top-25 floored table at all.
>
> **Tier-1 status stands, but on different grounds than originally written.** TOBB ETÜ's breadth
> signal (#17 nationally, 28 programmes ≤50k, untouched by this correction — breadth sums across
> every fee tier, so one thin scholarship seat can't distort it the way peak-on-one-record can) is
> the real basis for its inclusion, the same shape as Marmara's own Tier-1 justification (breadth
> #3, peak only #19) already was. TOBB ETÜ was never a Koç/Sabancı/Galatasaray-tier peak pick; it's
> a strong-breadth, solid-not-extreme-peak pick, and should have been described that way from the
> start.
>
> **Gebze Teknik is unaffected — checked, not assumed.** It's `DEVLET`, carries no fee-tier
> structure at all (devlet tuition is nationally set, not per-seat — §4), so both its original
> weak numbers (breadth #106, peak #148) were single-track measurements from the start, the same
> clean shape as Galatasaray's or Marmara's own numbers. Nothing about this correction changes
> §0/§2's read of it.
>
> **Yeditepe's peak figure (§3: "744, floored") was not independently re-verified against this
> specific failure mode before this correction was written** — flagged rather than asserted either
> way; will be confirmed against its own per-programme kontenjan data in the upcoming Yeditepe
> research pass rather than carried forward unchecked.
>
> **The larger point, which is why this isn't just a TOBB ETÜ fix:** a vakıf university's
> selectivity can span three orders of magnitude *within one programme* by fee tier alone — TOBB
> ETÜ's own İktisat is rank 838 on its scholarship seat and rank 818,411 on its full-price seat,
> found independently in the follow-on TOBB ETÜ research pass. A single peak-selectivity number
> per institution is genuinely ambiguous for any vakıf university until it's clear which tier it
> describes — the same class of finding as this project's Gate F report naming the placement table
> with no reader: a number that looks like an answer but needs a stated caveat before anyone
> designs a UI or a ranking around it. Worth the founder/oryn-d0 knowing before either happens, not
> after.

---

## 0. The direct answer first: is 12 closer to right than it looks?

**Mostly yes, with one clear weak member and one conspicuous absence.** 10 of the current 12
land in the top ~26 nationally by at least one of the two independent selectivity signals below,
and the devlet/vakıf split (6/6) looks deliberate, not accidental. This was not assembled from
nothing.

But: **Gebze Teknik Üniversitesi ranks #106–148 nationally on both signals** — a real, respected
engineering-focused devlet university by reputation, but the data doesn't support the "top-12"
company it's currently keeping the way it supports the other 11. And **Galatasaray Üniversitesi**
— top-10 on both signals, nationally famous, French-medium, one of Turkey's most selective public
universities — **is not in the catalogue at all.** That is the sharpest single gap, not a diffuse
one.

## 1. Method — two signals, neither one alone, and why

Fetched YÖK Atlas's full national dataset live today: **21,493 records, 12,239 at LISANS
(bachelor's) level, across 224 universities with at least one bachelor's programme** (128
`DEVLET`, 74 `VAKIF`, 22 KKTC/abroad — excluded from the ranking below; a Turkish student's
domestic YKS comparison set is the 202 devlet+vakıf institutions, not Cyprus/abroad quota routes).

**Signal A — breadth: count of a university's LISANS programmes with `basariSirasi` (placement
rank) ≤ 50,000** (roughly the top 2% of ~2.4M annual YKS candidates). Measures how many
genuinely competitive fields a university offers, not just one.

**Signal B — peak selectivity: the single best (lowest) `basariSirasi` among a university's
programmes, restricted to programmes with `kontenjan` ≥ 10.** The floor matters and was checked,
not assumed: an unfiltered pass put İstanbul Medipol at rank #1 nationally on a **3-seat**
scholarship Medicine seat (`basariSirasi=1`) — real (verified against the record's own
eligibility condition, a standard national top-50k Medicine floor, not a data error), but a
3-seat outlier is not evidence the university broadly is elite. Floored to ≥10 seats, Medipol
drops to a defensible #5.

**Why both, not one collapsed score:** they measure different things and disagree in informative
ways. Sabancı is #2 on peak selectivity (284) but only 9 total programmes — a small, elite,
narrow institution. Marmara is #3 on breadth (50 programmes under the 50k bar) but only #19 on
peak — huge and broadly strong without one standout flagship programme. Collapsing these into one
number would hide exactly the distinction a founder deciding "which kind of gap is this" needs.

## 2. Where the current 12 sit

| University | Breadth rank (of 202) | Peak-selectivity rank (of 202, floored) |
|---|---|---|
| Ankara Üniversitesi | 1 | 14 |
| İstanbul Üniversitesi | 2 | 15 |
| İstanbul Teknik Üniversitesi | 4 | 13 |
| Hacettepe Üniversitesi | 6 | 10 |
| Yıldız Teknik Üniversitesi | 8 | 18 |
| Bilkent Üniversitesi | 10 | 3 |
| Orta Doğu Teknik Üniversitesi | 11 | 12 |
| Koç Üniversitesi | 12 | 1 |
| Boğaziçi Üniversitesi | 15 | 6 |
| Özyeğin Üniversitesi | 24 | 9 |
| **Gebze Teknik Üniversitesi** | **106** | **148** |
| Sabancı Üniversitesi | 150 | 2 |

Sabancı's breadth rank looks bad in isolation (150th) but its peak rank (2nd) explains why:
it's a small, deliberately boutique research university, not a weak one — the same shape as
Koç, just more concentrated. Gebze Teknik has no equivalent story in the data; it's simply not
selective by either measure this cycle, which doesn't mean the institution is wrong to model,
just that its presence in a "top 12" company isn't evidenced the way its neighbors' is.

## 3. What to add — evidenced, tiered, not a round number

**Tier 1 — strong on both signals, clear adds:**

| University | Type | City | Breadth rank | Peak rank | Why |
|---|---|---|---|---|---|
| Galatasaray Üniversitesi | DEVLET | İstanbul | 9 | 4 | 13 programmes, **all 13** under the 50k bar — the most concentrated selectivity profile in the entire dataset outside Koç/Sabancı. French-medium, nationally recognized as one of the hardest public universities to enter. The single clearest absence. |
| Marmara Üniversitesi | DEVLET | İstanbul | 3 | 19 | 126 programmes, 50 under 50k — broader than Ankara Üniversitesi's own footprint. Major comprehensive İstanbul devlet flagship, currently entirely absent. |
| Yeditepe Üniversitesi | VAKIF | İstanbul | 5 | 8 (floored) | 142 programmes, 40 under 50k, best=744 (floored). Comparable scale and selectivity profile to Bahçeşehir/Bilgi but stronger on both axes than either. |
| TOBB Ekonomi ve Teknoloji Üniversitesi | VAKIF | Ankara | 17 | ~26-27 (floored, 3554 — see correction note above; originally miscited at 188 on a 3-seat record) | 22 programmes (62 raw fee-tier records), strong breadth comparable to Bilkent's — the real basis for inclusion, not peak. |

Devlet/vakıf split of this add-list: 2/2 — keeps the current catalogue's own 6/6 balance intact
rather than skewing it.

**Tier 2 — real signal, more of a judgment call:**

| University | Type | Peak rank (floored) | Note |
|---|---|---|---|
| İstanbul Medipol Üniversitesi | VAKIF | 5 | Selectivity is real but concentrated in Medicine specifically (162 total programmes, only 38 under 50k) — a narrower reputation than Tier 1's four. |
| İstanbul Üniversitesi-Cerrahpaşa | DEVLET | 7 | **Institutionally a 2019 split from İstanbul Üniversitesi**, already in the catalogue — worth deciding whether this is "a second university" or "the medical-sciences half of one already-modeled one" before adding it as an independent row. |
| İbn Haldun Üniversitesi | VAKIF | 11 | Small (16 programmes), newer (founded 2017), growing reputation in humanities/social-science circles specifically — real but narrower signal than Tier 1. |
| İstanbul Bilgi Üniversitesi | VAKIF | 16 | Solid breadth (91 programmes, 24 under 50k) without a standout peak; a "large and decent" rather than "elite" profile. |

**Named but a different question, not "more elite names" — regional devlet flagships:**
Gazi (Ankara), Marmara (already Tier 1), Ege (İzmir), Dokuz Eylül (İzmir), Akdeniz (Antalya),
Anadolu (Eskişehir) — all large, genuinely well-known devlet universities with real breadth
(18-29 programmes under 50k each) and moderate peak selectivity (1,800–2,800 range, a full order
of magnitude behind Tier 1). These are universities real Turkish students absolutely consider —
just for a different reason (regional/comprehensive strength) than the İstanbul/Ankara elite-name
cluster the current 12 and this report's Tier 1/2 both draw from. **Whether Oryn's Turkish user
base is nationally representative or specifically the most-competitive-track segment is a product
question this data can inform but not answer** — flagging it explicitly rather than folding these
in as if they were the same kind of gap as Galatasaray's absence.

## 4. Devlet/vakıf and the admission-mechanism model

`lib/admissions/system-shape.ts` has one Turkey entry (domestic + international pathway), no
devlet/vakıf split — correctly: both go through YKS's identical rank-and-cutoff placement
mechanism, and Gate 1 (`reviewsNonAcademicEvidence`) returns `false` for both alike. The real
devlet/vakıf difference this dataset surfaces is **financial, not mechanistic** — every vakıf
placement record carries a `bursOraniAdi` tier (`Burslu`/`%50 İndirimli`/`Ücretli`/etc.) that
devlet records never do, since devlet tuition is nationally set rather than per-university. That
distinction already lives correctly in `university_program_placement_cycles`'
`burs_orani_adi` column (per §3 of `tr-university-depth-gate-f-2026-09-01.md`) — nothing new
needed here, just confirming the model doesn't need a devlet/vakıf axis it's missing.

## 5. What's missing per candidate — the honest, short version

Every university named in §3 has **zero** rows in `university_programs`,
`university_requirements`, `university_deadlines`, and `university_program_placement_cycles` —
none of them exist in Oryn's catalogue at all yet, so there is no partial-depth table to extend;
"what's missing" is uniformly "everything," the same shape §0 of the Gate F report already
described for the existing 12's placement-cycle gap, one layer earlier (these don't have
`university_programs` rows to attach placement cycles to in the first place). The only real
question at this stage is **priority order** — which of Tier 1's four to research first — and the
data above is the ordering evidence: Galatasaray's absence is both the most defensible add and,
at 13 total programmes, the cheapest to fully populate.

## 6. What this does NOT do

- No universities added to the live catalogue. No `university_programs`/`university_requirements`
  rows created for any Tier 1/2 candidate.
- No re-classification or removal of Gebze Teknik — §0/§2 name the data's honest read, the
  decision whether to keep, deprioritize, or research it further belongs to whoever owns the
  combined target-set call.
- No resolution of the İstanbul Üniversitesi-Cerrahpaşa split question (§3, Tier 2) — named, not
  decided.
- No answer to the regional-flagship strategic question in §3 — named as a real, distinct
  question for the founder/oryn-d0, not decided here.
