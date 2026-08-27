# S7 Photo Sourcing for S5B Gap — Closeout

**Date:** 2026-08-27
**Scope:** 16 records from S5B (research/mentored internships) that S5B had not yet photo-sourced themselves. S5B had already sourced photos for 6 of their 23 verified records, and one more (Science Mentorship Institute) was already resolved by a different lane — this batch covers the remaining 16.
**Output:** `s7_photo_for_s5b_gap.jsonl` (16 lines, one per record, all valid JSON, consistent flat schema matching S5B's own shape)
**Mode:** DRY RUN per ORYN Research Freeze Common Operating Contract §10 (Photo Standard). No database writes, no git commands, no other files edited (S5B's own files were not touched — this is a proposal for them to merge).

## Counts

| Outcome | Count | Records |
|---|---|---|
| **Verified** (image proposed, visually confirmed) | 2 | 0025 (Zooniverse), 0026 (iNaturalist) |
| **NOT_YET_RESOLVED** (real gap — plausible/confirmed real-world component, no matching photo found) | 3 | 0020 (IMA), 0028 (ASDRP), 0030 (The Intern Group) |
| **NO_CANDIDATE_FOUND** (genuinely online-only, terminal, resolved) | 11 | 0001, 0003, 0006, 0012, 0014, 0016, 0019, 0023, 0027, 0029, 0031 |
| **Total** | **16** | |

This matches the brief's own prediction closely: the large majority of this batch is online-only mentored-research / virtual-internship programs, and a bounded, genuine search confirming that is a correctly-resolved terminal state, not a failure.

## Verified (2)

1. **S5B-0025 — Zooniverse** → Adler Planetarium exterior (aerial/drone photo of the domed rotunda building on the Chicago lakefront). CC BY-SA 4.0, geocoded to the real coordinates, used on Wikipedia's "Adler Planetarium" article. **This is the host-institution fallback the brief explicitly anticipated** — Adler Planetarium is one of Zooniverse's two leading/founding institutions (with University of Oxford). `image_depicts` explicitly labels it as depicting the host institution, not Zooniverse itself or any specific citizen-science project. Zooniverse's own 121 Commons search results were checked and are entirely logos/avatars (the top hit is literally captioned "Zooniverse Logo") — no genuine photographic content exists for the platform itself, which is why the fallback was needed.
2. **S5B-0026 — iNaturalist** → "Using the iNaturalist app in the field.png": three people in woodland, each holding up a smartphone to photograph/identify an organism. CC BY-SA 4.0, used as the lead image on ~25 Wikipedia language editions of the iNaturalist article. **This is NOT a host-institution fallback** — it is a genuine, program-specific photo of the platform actually being used, which is a stronger match than falling back to a photo of California Academy of Sciences or National Geographic Society would have been.

Both were navigated to and screenshotted in the browser pane, not proposed from filename/caption alone.

## NOT_YET_RESOLVED — real gaps (3)

These have a genuine, confirmed real-world component but a bounded search did not surface a correctly-matching, verifiable photo. Per the brief's instructions, these are explicitly flagged as different from the terminal no-candidate group below — **do not treat them the same as the online-only records**:

- **S5B-0020 — International Medical Aid (IMA) High School Healthcare Internship.** Confirmed via medicalaid.org that this is a genuine in-person healthcare internship abroad (flagship East Africa site: Mombasa, Kenya; also Cusco, Peru), which is IMA's core offering, not a side option. Searched "International Medical Aid" (0 results) and "Medical Aid" + internship (40 results, all confirmed generic noise on inspection — unrelated organizations' medical-mission photos). No specific partner-hospital name is given precisely enough by IMA's own materials to search for individually, and "Mombasa"/"Kenya hospital" alone is too generic to reliably identify this specific program.
- **S5B-0028 — Aspiring Scholars Directed Research Program (ASDRP).** This is literally the brief's own named example. Confirmed via asdrp.org: "a nonprofit, private research institution in Fremont, California" with its own physical lab, independently run (not university-affiliated, so no natural host-institution fallback applies). Searched "ASDRP" (0 results) and "Aspiring Scholars" (2 results, both unrelated — 19th/20th-century Jewish historical library photos from Lithuania, matched on generic phrase overlap only). "Fremont, California" alone is too generic to specifically identify ASDRP's facility.
- **S5B-0030 — The Intern Group.** Confirmed via theinterngroup.com: genuine in-person internships in 9 cities (London, Dublin, Madrid, New York, Tokyo, Bangkok, Hong Kong, Melbourne, Medellín), a central and not incidental part of the offering, alongside remote/virtual options. Zero Commons results for the company name. No single host institution/campus/notable building of its own exists to search for; a generic city photo would not correctly and specifically identify this particular company, so none was proposed.

## No candidate — terminal, resolved (11)

Genuinely online-only programs, confirmed via a bounded search (org name on Commons, cross-checked against the program's own site for format/location):

- **S5B-0001 — Polygence.** Fully online 1-on-1 mentor-matching platform, mentors drawn from many universities, no single host institution. 0 Commons results.
- **S5B-0003 — Horizon Academic Research Program (HARP).** Confirmed online via horizoninspires.com ("a selective, online program..."); founded by Columbia researchers but no campus of its own. 1 Commons result, unrelated (Kerala college principal portrait).
- **S5B-0006 — Global Research Fellowship (GRF).** Confirmed "Online, worldwide" via globalresearchfellowship.com; operated by Calm Compute, LLC. 0 Commons results.
- **S5B-0012 — Venture & Tech Summer Program (VTSP).** Confirmed "This selective online program" via vtsp.com. 0 results for the full name; 46 results for "VTSP" alone, inspected and confirmed to be unrelated Thailand airport/transit photos.
- **S5B-0014 — Immerse Education Online Research Programme (ORP).** 0 Commons results for "Immerse Education." Note: Immerse also runs unrelated in-person Cambridge/Oxford summer schools, but this specific record is their online-only ORP variant — a photo of the in-person program would misrepresent this specific product, so it was not pursued even as a fallback.
- **S5B-0016 — Algoverse AI Research Program.** Confirmed via algoverseairesearch.org: 12-week remote team research program culminating in conference submission (NeurIPS/ICML/ICLR/ACL are publication venues, not campuses). 0 Commons results.
- **S5B-0019 — Youth Journalism International (YJI).** Global volunteer-run network of teen correspondents submitting online, no central office. 0 results for full name; 1 result for "Youth Journalism" alone, unrelated (2011 Occupy Wall Street protest photo).
- **S5B-0023 — Synthica.** Confirmed via synthica.org: free, Discord-based global research community (93+ countries), no physical campus. 0 Commons results.
- **S5B-0027 — Non-Trivial Fellowship.** Confirmed via non-trivial.org: "Online incubator," fully remote, eligibility requires only being "on earth." Parent entity has a London registered office (administrative only, not a program site). 0 Commons results for both hyphenated and spaced phrasing.
- **S5B-0029 — Research Girl Scientific Research Mentorship Program.** Confirmed via researchgirl.org: Zoom-based lectures/mentorship, "161+ countries reached," no physical campus. 0 Commons results.
- **S5B-0031 — United Planet Virtual Internship for High School Students.** Explicitly online by design (distinct from United Planet's separate in-person "Quest" program). 6 Commons results for "United Planet": 3 are logos, 3 belong to the different "Quest" program (one inspected — a promotional world-map graphic, not a photo, and the wrong program regardless).

## RIGHTS_REVIEW_REQUIRED flags

None. Both verified images (0025, 0026) have unambiguous CC BY-SA 4.0 licenses with identified authors, confirmed via direct Wikipedia-article usage plus (for 0025) geocoding to the real building location and structured-data "depicts" tagging. Neither depicts an identifiable minor or any sensitive content.

## Anything odd

- **Zooniverse's Commons footprint is entirely non-photographic.** All 121 search results for "Zooniverse" are logos or small square sub-project avatar icons (Milky Way Project, Whale FM, Bat Detective, Old Weather, etc. — each individually named "avatar"), not photographs of any kind. This made the host-institution fallback (Adler Planetarium) necessary rather than optional — there was no photographic candidate to reject in favor of it.
- **United Planet's own Commons files are not photographs either** — 3 logos plus a promotional world-map graphic (captioned "United Planet's Volunteer Areas"), filed under Commons category "Maps of the world without Antarctica." Worth knowing in case another lane encounters United Planet's other (in-person "Quest") program records — even that program's own uploaded files aren't real photography.
- **Acronym/generic-name noise:** "VTSP" (46 hits, all Thailand airport photos) and "Medical Aid" + internship (40 hits, generic unrelated noise) are the two clearest examples in this batch of raw hit counts being misleading without opening the actual thumbnails — consistent with a pattern other S7 photo-sourcing lanes have already flagged (e.g. "NIIED," "Curieux Review" in earlier batches). Neither was mistaken for real coverage.
- **Distinguishing "real gap" from "online-only terminal" mattered a lot in this batch** — 3 of the 16 records (IMA, ASDRP, The Intern Group) have confirmed, central, in-person/physical components but still resolved to no-candidate. All three are explicitly labeled `NOT_YET_RESOLVED` (not `NO_CANDIDATE_FOUND`) with the real-world component stated plainly in `verification_method`, per the brief's instruction not to silently conflate them with the genuinely-online programs. ASDRP in particular was the brief's own named example of this exact case.
- **Shared/contested browser environment:** consistent with prior S7 photo-sourcing sessions' notes on this repo's parallel-lanes setup, the Commons search tab count climbed to 9 concurrent `commons.wikimedia.org` tabs mid-task, and one `screenshot`/`scroll` call briefly failed with "Browser pane is not displayed" before recovering after re-selecting the dedicated tab. Every verified image (0025, 0026) was independently confirmed by screenshot on this session's own tab (`tab-12`, explicitly passed on every call) immediately before being recorded; nothing was sourced from a tab this session hadn't personally navigated.
