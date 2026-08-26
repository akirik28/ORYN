# S3-B University Photo Research — Handoff

Agent: S3-B | Date: 2026-08-26/27 | Output: `s3_photos_agent_b_2026-08-26.jsonl` (127 records), `data/research/registry/claims_S3-B.jsonl` (127 records)

## Headline numbers (127/127 current-territory universities processed)

| rights_status | count |
|---|---|
| OPEN_LICENSE_VERIFIED (fresh Commons/Wikipedia find, clean license) | 43 |
| RIGHTS_REVIEW_REQUIRED (content passed audit, original license/source unknown) | 80 |
| NOT_FOUND | 4 |

| verification_state | count |
|---|---|
| VERIFIED | 40 |
| CANDIDATE | 87 |

Of the 92 universities that had an existing `campus.webp` in storage, I downloaded and viewed every one (not just spot-checked):
- **79 passed** the real/correct/non-logo content audit and were kept as-is, but since no metadata records their original source or license, all 79 are marked `RIGHTS_REVIEW_REQUIRED` / `CANDIDATE` rather than upgraded to verified — a human needs to either trace each to a real source or accept them on a different rights basis.
- **12 failed** the audit and were replaced with a fresh, license-verified Commons/Wikipedia photo (see "Audit failures" below).
- **1 more** (UNAM, rn 745) had an existing photo too, but I had already sourced and verified a better Commons replacement for it before the audit-vs-fresh distinction existed in my process; it's recorded as a clean `OPEN_LICENSE_VERIFIED` fresh find.

Of the 35 universities with no existing photo, I found a usable, license-verified Commons/Wikipedia photo for **31**, and could not find anything usable for **4** (recorded `NOT_FOUND`, not forced).

## NOT_FOUND (4) — no Commons/Wikipedia/official-media photo located

- **rn 663** — Tashkent Institute of Irrigation and Agricultural Mechanization Engineers (TIIAME-NRU), Uzbekistan. No Commons category exists; Wikipedia article has no photo.
- **rn 694** — Princess Sumaya University for Technology, Jordan. Only the institution's logo exists on Commons; no campus photo anywhere I could find.
- **rn 717** — Central European University, Vienna. Commons only has the 2019 campus-inauguration *event* photos (people/speakers at a venue called Expedithalle) and the logo — no confirmed clean exterior photo of the actual ongoing Vienna campus building. I deliberately did not use an event photo since I could not confirm Expedithalle is the real permanent campus building rather than a one-off event space.
- **rn 742** — Gulf University for Science and Technology, Kuwait. No Commons coverage found at all.

All four are legitimate "not found," not corner-cutting — each had a real search attempt (Commons category guesses, `site:commons.wikimedia.org` searches, Wikipedia infobox trace) that came up empty.

## Audit failures — 12 existing DB images rejected and replaced

Every one of these had a `campus.webp` already in storage that failed a real/correct/non-logo check on direct inspection, and was replaced with a verified open-license photo:

| rn | University | What was wrong with the existing image |
|---|---|---|
| 636 | Tecnológico de Monterrey | Pure flat logo graphic, not a photo |
| 640 | University of Amsterdam | Artsy tilt-shift photo of generic Amsterdam rooftops, nothing UvA-specific |
| 664 | University of Southern California | Generic lecture-hall photo of students, no identifiable building |
| 665 | Washington University in St. Louis | Marketing collage/banner with large overlaid text, not a clean photo |
| 672 | Yeungnam University | Abstract statue dominated the frame; unclear/unconfirmable tower behind it |
| 710 | Massey University | Close-up of a student eating an ice-cream bar; a lifestyle portrait, not a campus photo |
| 721 | IE University | Pure flat logo graphic |
| 736 | TU Dortmund University | Pure flat logo graphic |
| 737 | LUT University | Staged artistic/stock photo (person + giant fabric banner over a lake), no campus content at all |
| 747 | National Taipei University of Technology | Pure flat logo graphic |
| 751 | University of Colorado Denver | Generic students-socializing stock-style photo, no identifiable architecture |
| 752 | Rice University | Costumed sports-mascot photo, not the actual place |

This confirms the fleet's finding (Bristol/Stanford/Heidelberg spot-check, relayed by the coordinator) that the existing `campus.webp` corpus has a real, recurring defect rate — my own sample says roughly **13%** of existing images (12 of 92) were unusable on inspection, spanning at least four distinct failure shapes: pure logo, generic/unidentifiable stock scene, marketing collage with text, and off-topic photo (mascot/portrait) rather than the institution's real place.

## Identity-collision / verification judgment calls worth double-checking

- **rn 653 Utrecht University** — audit-passed on an anniversary banner ("370 jaar") matching the university's 1636 founding year, not on-image text of the institution's name. Reasonable but indirect evidence.
- **rn 683 Memorial University of Newfoundland** — audit-passed after a web search corroborated "Clock Tower and University Centre" as a real MUN landmark; not confirmed from the image's own text.
- **rn 654 Michigan State, rn 678 École Centrale de Lyon, rn 689 Universita' Politecnica delle Marche, rn 709 Institut Polytechnique de Paris, rn 723 Czech Technical University in Prague, rn 741 Ahlia University, rn 758 Northwestern Polytechnical University** — all kept as `CANDIDATE`/`RIGHTS_REVIEW_REQUIRED` with an explicit low/moderate-confidence flag in `notes` because the existing image shows a real, non-generic building but nothing in-frame independently ties it to *that specific* institution over a plausible neighbor. rn 723 in particular looks architecturally similar to other prominent Prague civic buildings, not distinctively CTU. rn 689's existing image is a generic Italian streetscape (McDonald's storefront, no signage) with no tie to Ancona specifically — the weakest-confidence pass in the whole set.
- **rn 759 Sofia University "St. Kliment Ohridski"** — the existing image is unambiguously Sofia University's real, iconic flagship building (exact carved name match), but the **manifest's own city field says "Burgas,"** not Sofia. This is very likely a manifest data-quality issue (Sofia University's main and best-known seat is in Sofia; I'm not aware of a Burgas branch), not a photo defect. Flagged for the manifest owner, not silently corrected.
- **rn 681 SEGi University** — manifest city is "Kuala Lumpur," but SEGi's real flagship campus (the one the verified photo shows) is in Kota Damansara, Selangor — a distinct locality from KL proper, though colloquially "greater KL." Downgraded to `CANDIDATE` for this reason.
- **rn 734 Catholic University of Korea** — manifest city is "Gyeonggi" (i.e. the Bucheon/Songsim campus), but the only building photo I could verify on Commons is the Seocho (Seoul) Medical College. Same institution, different specific campus. Downgraded to `CANDIDATE`.
- **rn 726 Université de Rennes** — the verified photo/caption predates the January 2023 merger that created "Université de Rennes"; it's the former Rennes-1 economics faculty building, very likely still part of the merged institution today but not re-captioned. Flagged, not silently assumed.
- **rn 715 Bocconi University** — the existing-fail replacement I sourced (Grafton Building) carries a nominal CC BY-SA 4.0 tag from the photographer, but its own Commons subcategory explicitly warns that Italy provides no freedom-of-panorama for copyrighted architecture in public spaces — meaning the photographer's tag may not actually clear the underlying building design's rights. I deliberately did **not** mark this `OPEN_LICENSE_VERIFIED` despite the tag; it's `RIGHTS_REVIEW_REQUIRED`/`CANDIDATE` and needs a real legal judgment call, not just a license-field read.

None of these are me guessing — each is the specific, named reason in that record's `notes` field, so a reviewer doesn't have to re-derive it.

## A note on `verification_state` usage

Per the task's own rule ("VERIFIED only when genuinely confident on all three of real/correct/non-logo AND the license is clear"), the 87 `CANDIDATE` records break down as: 79 audit-passed existing images (content fine, source/license genuinely unknown), 4 NOT_FOUND placeholders, and 4 fresh finds downgraded despite a clean nominal license because of a city/lineage/legal caveat (SEGi, CUK, Rennes, Bocconi) described above. I did not use `CANDIDATE` for ordinary "I'm slightly unsure" hedging beyond what's already flagged in `notes` — the confidence-level language in `notes` (e.g. "LOW-MODERATE CONFIDENCE") is the finer-grained signal for a reviewer to triage which `CANDIDATE`s to check first.

## Process incident: mid-task file corruption and shard-boundary change (both now resolved, but worth knowing)

Two things happened during this run that a reviewer should be aware of, both already fully resolved in the final output:

1. **File corruption, recovered.** After my first commit of 8 records, a second, unexpected commit (`2588226`) appeared on this same branch — not made by me — that both rewrote the shard manifest and clobbered my in-progress output: my photos file lost 7 of its first 8 records and the 8th had its `rn` silently changed (632 → 745) while keeping the wrong record's other fields; the claims file gained 7 duplicate, out-of-order entries for the same range. I rebuilt both files from my own untouched scratchpad source-of-truth JSON (never lost, since I'd been keeping per-batch JSON files alongside the JSONL output) and verified no duplicates/gaps before continuing. From that point on I switched to a full rebuild-from-source script after every batch instead of blind appends, specifically to make this self-healing if it happened again. It didn't recur.
2. **Shard boundary changed mid-task, reconciled.** The same external commit corrected the manifest's sort order from name-ascending to id-ascending, which reshuffled which universities fall in S3-B's window (`rn 632-757` under the old order → `rn 633-759` under the new one) — not a simple endpoint shift, since the sort key itself changed, so almost every rn now maps to a different university. Of the first 19 universities I'd fully researched under the old numbering, only 2 (UNAM, Vanvitelli) remained in S3-B's territory after reconciliation (at new rn 745 and 724); 3 (UNLP, Universidade de Brasília, UFSC) moved to S3-A; the other 14 fell outside the whole S3 window (507-759) entirely and now belong to S1/S2/S4. I dropped those 14+3 from my output file to respect single-writer-per-territory, but the full researched detail for all of them (photo, license, source) is preserved in this session's history in case whichever shard now owns them wants to reuse the work instead of re-researching from scratch — ask if useful, I didn't want to guess at writing into another shard's file.

Everything in the final `s3_photos_agent_b_2026-08-26.jsonl` (127 records) is cross-verified against the manifest's *current* state — same `rn`, same `university_id`, same `canonical_name` — with a script-driven check after every batch, so this output should be fully consistent with whatever the fleet reconciles to next, short of another boundary change.

One more small thing worth flagging: partway through a batch I once wrote a record with a plausible-looking but fabricated `university_id` instead of pulling it from the manifest (caught before committing, via the same cross-check script, and then used to re-audit every already-committed batch — no other instances found). Mentioning it because it's the kind of mistake that would be bad if it had slipped through, not because it's still present anywhere in the output.

## Constraints observed

No application code touched. No Supabase/DB writes. No new branches created or merges performed. Stayed strictly on photo research (no ranking/admissions/requirements work, even where I incidentally saw relevant-looking pages). Only wrote to the two assigned files plus this handoff, with commits roughly every 15-20 records.

`data/research/registry/REGISTRY_README.md`, referenced in my original task instructions as "already in this worktree," does not actually exist at that path — I proceeded using the schema given directly in the task instructions instead, which was fully specified.
