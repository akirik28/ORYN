# S4-B — University Photo Coverage — Shard Summary

Shard: positions 886-1010 (125 universities) of 1010 live universities, id-ascending.
Output: `claims_S4_B.jsonl` (125 lines, one per university).
All work is dry-run/proposal-only. Nothing was written to Supabase; the acquisition script was never run with `--apply`.

## Overall counts

| task_type | count |
|---|---|
| audit (had existing image_url) | 88 |
| source (no usable image_url) | 37 |
| **total** | **125** |

## Bucket 1 — Audit (88 universities)

| verdict | count |
|---|---|
| PASS | 75 |
| FAIL_LOGO_OR_CREST | 6 |
| FAIL_GENERIC_OR_UNRELATED | 6 |
| FAIL_WRONG_ENTITY | 1 |

**Logos/crests that slipped through the campus-vs-logo split** (recommend `replace`):
Universidad de los Andes (rn 903), Manchester Metropolitan University (911), University of Exeter (917), University of Tartu (943), Pontificia Universidad Católica de Chile (957, a hero-banner graphic with a crest+wordmark overlay and heavy blue color-grading over the photo), Nanyang Technological University Singapore (977).

**Generic/unrelated stock images that slipped through** (recommend `replace`):
Technical University of Darmstadt (920, a stock photo of a hand playing chess — looks like a completely mis-scraped og:image), Swinburne University of Technology (945, generic VR-headset stock photo), Vrije Universiteit Brussel (962, generic lab-coats-and-microscope stock photo), University of Eastern Finland (963, blurred-crowd stock photo with "UEF" letters composited over it), Chandigarh University (987, a marketing composite graphic with a tagline, not a photograph), University of Victoria (1004, a photo of a person sitting on a couch with a poster — appears to be a completely unrelated/mis-scraped og:image).

**Wrong entity — needs founder/CEO-lane judgment call** (recommend `escalate_to_ceo`):
University of Utah (rn 924) — the og:image scraped from utah.edu is a tight close-up of a monumental Corinthian-columned pediment that closely resembles the **Utah State Capitol** (a well-known Salt Lake City landmark that is a few blocks from campus but administratively separate from the university), not an identifiable University of Utah building. I could not positively confirm or rule this out from the image and page alone — flagging rather than guessing.

**Rights note:** every university whose prior `status` was `official` (26 of the 88 audited) has `primary_image_license = null` by construction (the acquisition script never populates license/attribution for official-site scrapes). Per this week's Common Operating Contract §10, I flagged **all 26** as `rights_status: RIGHTS_REVIEW_REQUIRED`, independent of whether the photo itself passed — including ones that otherwise look like clean, correct campus photos. This is a real, systematic gap the pipeline doesn't track today, not a defect specific to this shard.

## Bucket 2 — Source (37 universities)

| verdict | count |
|---|---|
| CANDIDATE_FOUND | 32 |
| STILL_NO_CANDIDATE | 5 |

For every one of the 37, I first re-ran the automated pipeline (`--only "<name>"`, dry run). Two had no `website_url` or Wikidata QID at all in this DB copy (Purdue University, Northwest Agriculture and Forestry University — likely a data gap, not a real absence of an official site). For the rest, the retry mostly reproduced the same specific, legitimate validation failures as before (undersized images, extreme panoramas, portrait/near-square aspect, broken downloads) — i.e., the automated tiers *did* find something, it just wasn't usable. Where a retry looked like it might hang on a slow site, I bounded it to 40s and fell back to manual research rather than waiting arbitrarily long.

**32 new candidates found** via manual Wikimedia Commons research (same discipline as the script's own Oxford/Cambridge `MANUAL_IMAGE_OVERRIDES`: real, identifiable, openly-licensed photos, verified visually and cross-checked against the Commons file description/category). All are CC-licensed (BY, BY-SA, or GFDL) with attribution recorded — none are license-blank. Full list with source URLs, licenses, and per-case reasoning is in the JSONL (`recommended_action: replace`).

One worth flagging explicitly: **Université libre de Bruxelles** (rn 974) — the best candidate I could confirm is a real, correctly-attributed photo, but it's an *interior* shot (main aisle of ULB's Museum of Zoology and Anthropology) rather than an exterior campus building. It passes "real photo, correct entity" but is a weaker representative image than the others; worth a second look before promotion.

**5 genuine "still no candidate" outcomes** (recommend `needs_manual_source`) — extensive Commons search turned up nothing usable, not just nothing I happened to find quickly:
- **Universidade Federal de São Paulo (UNIFESP)** — only the university's logo exists on Commons; no photo under any of its six campus names.
- **INTI International University** — Commons has only 6 files; the two tagged to the Nilai campus (this DB row's entity) are too small to pass validation, and the one large file is for the Penang branch, whose relationship to the canonical entity I couldn't confirm with confidence.
- **Ajman University** — no dedicated Commons category or files found at all.
- **Alfaisal University** — no building photos found, only a logo.
- **Cyprus University of Technology** — no building photos found; searches kept surfacing the separate University of Cyprus instead.

## Things the parent session should look at

1. **University of Utah (rn 924)** — possible wrong-entity (State Capitol vs. campus building). Needs either a human who knows the campus or a more targeted search than I could do from the image + homepage alone.
2. **ULB (rn 974)** — accepted candidate is an interior museum shot, not an exterior building. Real and correctly attributed, but worth deciding if that's good enough for the "campus photo" slot or if someone should look harder for an exterior shot.
3. **Systematic rights gap on `official`-status rows** — 26 in this shard alone have no license on file by construction. This isn't a per-university defect; it's a pipeline-wide gap worth fixing upstream (either populate a license field for official-site scrapes when determinable, or make `RIGHTS_REVIEW_REQUIRED` a first-class tracked status rather than something each audit has to re-derive).
4. **INTI International University** — the Penang-vs-Nilai entity question is a genuine "is this the same legal institution" call that I didn't feel confident making unilaterally; flagged as `STILL_NO_CANDIDATE` rather than guessed.
5. Purdue University and Northwest Agriculture and Forestry University had **no `website_url` in this DB copy** at all — worth checking whether that's a real spine gap (both are large, well-known institutions that obviously have official websites) independent of the photo question.
