# S7 Photo Sourcing — Group 1, Batch 1 — Closeout

Dry run per Research Freeze Common Operating Contract §10 (Photo Standard). No database writes. Proposals only, written to `s7photo_g1_batch1.jsonl` (14 lines, one per record).

Date: 2026-08-27

## Counts

| Outcome | Count | Records |
|---|---|---|
| Verified (image proposed, visually confirmed) | 5 | 0002, 0005, 0007, 0012, 0016 |
| NOT_YET_RESOLVED (real gap — plausible photo exists, not found) | 4 | 0003, 0004, 0009, 0010 |
| No candidate — terminal, resolved (genuinely no photographable component) | 5 | 0068, 0013, 0014, 0017, 0018 |
| **Total** | **14** | |

## Verified (5)

1. **S7-oryn4d-0002 — Rising Explorer Grant.** Explorers Club Headquarters (46 East 70th St, NYC), CC BY-SA 4.0, used on ~10 Wikipedia language editions. Organizer's own HQ building — strong candidate.
2. **S7-oryn4d-0005 — MEXT Scholarship.** MEXT ministry building entrance, Tokyo, with visible signage (文部科学省) matching the ministry name directly in-frame. CC BY 2.0 (Flickr, reviewed). One caveat: not currently used on any Wikipedia article, so provenance leans on the in-photo signage match rather than third-party editorial usage.
3. **S7-oryn4d-0007 — Taiwan Scholarship Program (MOE).** ROC Ministry of Education building entrance, Taipei, with visible signage (教育部) matching directly in-frame. Public domain (VOA/US government work). Corroborated by a second independent Commons photo of the same building from a different angle.
4. **S7-oryn4d-0012 — NL Scholarship.** Nuffic office building, The Hague. CC BY-SA 2.5, used as the lead image on Wikipedia's "Nuffic" article. No legible signage in-frame; correct-entity confidence rests on uploader caption + Commons categorization + Wikipedia usage rather than in-photo text.
5. **S7-oryn4d-0016 — Young Scientist Journal (Vanderbilt).** Vanderbilt University campus quad. CC BY-SA 4.0, geocoded to Vanderbilt's actual coordinates, used on Arabic Wikipedia's Vanderbilt article. **This is the SPECIAL CASE** (host-institution fallback per the Photo Standard) — `image_depicts` explicitly flags it as the host campus generally, not the journal itself, and it is recorded as lower confidence than a program-specific photo.

All five were actually navigated to and screenshotted in the browser pane — not proposed from filename/caption alone.

## NOT_YET_RESOLVED — real gaps (4)

These have a genuine real-world component but a bounded, good-faith search (2 search rounds each) did not surface a correctly-matching, verifiable photo:

- **S7-oryn4d-0003 — Global Student Prize.** Searched "Global Student Prize," "Varkey Foundation," "Global Education and Skills Forum." GESF (the actual ceremony venue) is well-photographed on Commons, but only via celebrity red-carpet shots and Global *Teacher* Prize (sibling award) material — nothing that specifically depicts the Student Prize. Also found one private individual's biographical headshot (a past winner) which was rejected as wrong-entity (depicts a person, not the program).
- **S7-oryn4d-0004 — Stipendium Hungaricum.** Searched program name, "Tempus Public Foundation," and the Hungarian name "Tempus Közalapítvány." Zero relevant results. Program spans ~30 partner universities with no single closely-tied host institution, so no fallback was attempted.
- **S7-oryn4d-0009 — Zonta Young Women in Leadership Award.** Zonta International itself has real Commons presence (a Dhaka delegation-meeting photo, a *different* named award's 2014 ceremony photo) but nothing tied to this specific award. Using the unrelated Zonta Science Award ceremony photo was considered and rejected — would misrepresent what this award's ceremony looks like.
- **S7-oryn4d-0010 — Global Korea Scholarship.** Searched "NIIED," "Global Korea Scholarship," "Ministry of Education South Korea building." No relevant matches (the "NIIED" search returned 378,687 generic substring hits — not a real signal). No single host institution (students are assigned across multiple Korean universities).

## No candidate — terminal, resolved (5)

Genuinely no photographable component, confirmed via bounded search:

- **S7-oryn4d-0068 — Üçok Family Scholarship Fund.** Single donor-advised fund at Turkish Philanthropy Funds, no dedicated ceremony/site. Searched both the fund's parent org and the family name (617 hits, all unrelated — common Turkish surname).
- **S7-oryn4d-0013 — National High School Journal of Science.** Independent, purely online, no host institution.
- **S7-oryn4d-0014 — The Curieux Review.** Youth-led online journal, no host institution. Note: "Curieux" is an ordinary French word, so the raw hit count (3,825) is noise, not signal — worth flagging so nobody mistakes that number for relevant coverage.
- **S7-oryn4d-0017 — Whitman Journal of Psychology.** Independent, run by high schoolers, `host_institution: null` in our own record — confirmed there's no named affiliated school to fall back to.
- **S7-oryn4d-0018 — International Youth Neuroscience Association Journal.** The *Journal* specifically (as opposed to IYNA's broader chapter/event activity, which might have its own photos elsewhere) is a pure online publication output.

## RIGHTS_REVIEW_REQUIRED flags

None of the 5 verified images need a rights review — all have unambiguous, standard licenses (3× CC BY-SA, 1× CC BY, 1× US-government public domain), and all 5 were either confirmed via visible in-photo signage matching the entity name, or via direct Wikipedia-article usage / Commons categorization tying the file to the correct entity.

One soft flag for awareness, not action: the MEXT building photo (0005) is not used on any Wikipedia article (no cross-wiki usage signal), unlike the other four verified images which all have that corroboration. I still verified it because the in-photo signage is a direct, unambiguous match — but it's a slightly thinner provenance trail than the others, worth knowing if a reviewer wants to spot-check.

## Anything odd

- **Keyword noise vs. real signal:** Several searches returned large result counts that were pure noise — "NIIED" (378,687 hits) and "Curieux Review" (3,825 hits, matching the French word "curieux" = curious) are the two starkest examples. Both were quickly disqualified on inspection, but a naive "N results found" glance without opening the actual thumbnails would have been misleading. Flagging in case other lanes are tempted to treat raw hit counts as a proxy for "coverage exists."
- **Wrong-award contamination risk:** Both the Zonta and Varkey Foundation searches surfaced photos of *real, verifiable, correctly-licensed* ceremonies — just for the wrong specific award (Zonta Science Award instead of Young Women in Leadership; Global Teacher Prize instead of Global Student Prize). These would have visually "passed" a less careful check since they're genuine, on-brand, logo-free event photos of the same parent organization. Rejected both on correct-entity grounds. Worth a general caution for other lanes working through multi-award parent organizations (Varkey Foundation, Zonta International, and likely others) — the parent org's general photo library is not a safe stand-in for a specific named award/prize within it.
- **Private-individual headshots on Commons:** The Global Student Prize search surfaced a past winner's personal biographical photo (uploaded to illustrate her own Wikipedia bio, not the prize). Did not propose it — it depicts a specific named individual rather than the organization/program, which seems like the wrong category of image for an opportunity-record cover photo regardless of licensing, and sits closer to a privacy/minor-safety edge case than a "logo" edge case. Flagging in case the Photo Standard should say something explicit about this pattern (individual winner/participant photos) for future batches, since it's likely to recur across award-type records.
- **Browser environment was shared with concurrent session(s):** Mid-task, tabs/navigation appeared that I hadn't triggered (a "Harvard University campus" search, tab count climbing from 2 to 5 unprompted). Worked around it by claiming a dedicated tab and passing `tabId` explicitly on every call from then on; did not act on or trust any content encountered that I hadn't personally navigated to. No impact on the findings above — every verified image was independently re-confirmed by screenshot on my own tab immediately before being recorded.
