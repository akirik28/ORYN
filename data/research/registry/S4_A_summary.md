# S4-A — University Photo Coverage — Shard Summary

Shard: positions 760–885 (126 universities) of the 1010 live universities, id-ascending order.
Output: `claims_S4_A.jsonl` (126 lines, one per university, research_id S4-A-0001 through S4-A-0126).
All work is proposal-only — nothing was written to Supabase, and the acquisition script was only ever run in dry-run mode (no `--apply`).

## Totals

| | Count |
|---|---|
| Total universities processed | 126 |
| Bucket 1 — audit (had an existing image) | 91 |
| Bucket 2 — source (no usable image existed) | 35 |

## Bucket 1 — Audit results

| Verdict | Count |
|---|---|
| PASS (real, correctly-identified photo) | 78 |
| FAIL_LOGO_OR_CREST | 10 |
| FAIL_GENERIC_OR_UNRELATED | 3 |
| **Total audited** | **91** |

Of the 13 audit failures, **12 now have a real, validated replacement candidate** found on Wikimedia Commons (direct URL + license + attribution, all checked against the pipeline's own dimension/aspect rules — min 800×450, aspect ratio 1.15–2.6). The one exception is **Southern Cross University**, where no acceptable free campus photo could be found on Commons after a genuine search (Wikipedia's own article uses the logo for the same reason) — recorded as `needs_manual_source`, not forced.

Failures found (all now `recommended_action: replace` except Southern Cross):
- Western University, Australian Catholic University, Wayne State University, Newcastle University, Tampere University, Indian Institute of Technology Gandhinagar, Tallinn University of Technology (TalTech), University of Rochester — standalone logo/wordmark cards with zero photographic content.
- Beihang University — a close-up of a commemorative cornerstone plaque, not a campus depiction.
- RWTH Aachen University, University of Cyberjaya — generic stock-style photos (a chalkboard portrait; a lab-coat microscope shot) with nothing identifying the specific institution.
- Duke University — background was genuinely Duke Chapel, but the image was dominated by an unrelated giant "Space" text overlay from a different webpage, making it unusable as-is.
- Southern Cross University — pure crest+wordmark logo; **no replacement found**.

**Rights flag:** every `official`-status PASS with no recorded license (24 records) is flagged `rights_status: RIGHTS_REVIEW_REQUIRED` per the Common Operating Contract, even though it passed the visual check — an og:image scraped from an official site with no license metadata is a real, separate gap that shouldn't be silently assumed clear.

## Bucket 2 — Source results

| Verdict | Count |
|---|---|
| CANDIDATE_FOUND | 28 |
| STILL_NO_CANDIDATE | 7 |
| **Total sourced** | **35** |

For all 35, the automated pipeline was first retried per-university via `npm run acquire:university-images -- --only "<name>"` (dry run) — every single retry reproduced the same `needs_review`/`no_candidate` result as before (confirms these are real data gaps, not transient network failures). Manual Wikimedia Commons research then found real, validated candidates for 28 of the 35.

The 7 with no candidate found despite genuine effort (Commons category search under English/native-language/alternate names, web search, English Wikipedia infobox check):
- Kazakh National Agrarian Research University (KazNARU)
- Khoja Akhmet Yassawi International Kazakh-Turkish University
- National University of Uzbekistan named after Mirzo Ulugbek (the one Commons file found is an exact 1:1 square crop, fails the aspect-ratio floor)
- Sohar University
- Kyrgyz Russian Slavic University
- Al Ain University
- Taif University

## Things the parent/CEO lane should specifically look at

1. **Southern Cross University** (S4-A-0058) and the 7 Bucket-2 `STILL_NO_CANDIDATE` universities — genuinely no free/acceptable photo exists on Commons; will need either a manual upload, direct outreach to the institution, or acceptance of the gap.
2. **Beirut Arab University** (S4-A-0106) — the best candidate found is a real photo, but of the *interior* atrium of the B3 Engineering building, not an exterior facade (every exterior candidate on Commons was below the 800×450 minimum). Worth a second opinion on whether an interior shot is acceptable for this entity.
3. **Al-Quds University** (S4-A-0112) — candidate is explicitly categorized as the actual Abu Dis main campus, but the photo itself is a broad, hazy hillside view rather than one distinctly recognizable building. Lower confidence than the others; a second look wouldn't hurt.
4. **University of Stavanger** (S4-A-0110) and **Amirkabir University of Technology** (S4-A-0119) — real, correctly-identified candidates, but visually modest (a construction-site photo; a 800px-exactly-at-the-floor resolution walkway photo). Usable but not polished.
5. **Simon Fraser University** (S4-A-0003, PASS) — kept as PASS since the underlying photo is a genuine, recognizable shot of SFU's iconic Academic Quadrangle, but it carries a small "SFU" wordmark badge overlaid in one corner (marketing-banner style). Flagging in case the parent wants a stricter "zero overlay" bar.
6. All 24 `RIGHTS_REVIEW_REQUIRED` records (official-site images with no recorded license, both audited-and-passed and newly-sourced) are real gaps for whoever eventually promotes any of this to production — none should be treated as license-cleared without a real license lookup.

## Process notes

- Bucket-1 images were downloaded from Supabase Storage directly (webp), converted to JPEG via `sips`/`dwebp`, and viewed with the Read tool for the actual visual judgment — nothing was assessed by filename or metadata alone.
- Wikimedia Commons `upload.wikimedia.org` intermittently 429'd under this session's download concurrency (confirmed cross-lane by S2 hitting the same thing) — resolved by setting a descriptive User-Agent and retrying failed downloads individually; every image used in a final verdict was successfully downloaded and visually inspected, not just described by a text tool.
- One process gap I caught on my own follow-up pass: Tallinn University of Technology (S4-A-0054) was initially left as a bare FAIL with no replacement search when I did my batch of "find replacements for the audit failures" — fixed before finalizing this file.
