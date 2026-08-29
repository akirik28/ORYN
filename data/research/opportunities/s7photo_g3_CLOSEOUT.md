# S7 Photo Sourcing — Group 3, Batch 1 — Closeout

**Date:** 2026-08-27
**Scope:** 14 records (leadership / social-impact / online / Türkiye-based lane), dry run per Research Freeze Common Operating Contract §10.
**Output:** `s7photo_g3_batch1.jsonl` (14 lines, all validated as well-formed JSON; all research_ids match the assignment exactly, no missing/extra)

## Counts

| Outcome | Count | Records |
|---|---|---|
| **Verified** (image proposed, visually confirmed) | 4 | 0050 (TED-Ed, illustrative), 0053 (Genç Kızılay), 0054 (Children's Peace Prize), 0064 (Northwestern CTD, host-institution fallback) |
| **NOT_YET_RESOLVED** (real-world component exists, no suitable photo found) | 7 | 0043 (Eco-Hero Awards), 0048 (TKS in-person), 0049 (Round Square), 0051 (GençBizz), 0065 (TEO), 0067 (WRO Türkiye), 0075 (Pollination Project) |
| **NO_CANDIDATE_FOUND — terminal** (genuinely online-only, bounded search confirmed empty) | 3 | 0059 (TKS Virtual), 0060 (picoCTF), 0063 (sci-MI) |

All 4 proposed image URLs were re-fetched via `curl` after writing the JSONL and confirmed to return HTTP 200 with `Content-Type: image/jpeg`.

## Verified images — brief rationale

- **0053 Genç Kızılay**: Strongest, cleanest match. `Afet Birlik ve Genç Kızılay Gönüllüsü.jpg` — 2023 Kahramanmaraş earthquake relief photo, Kızılay emblem visibly on the volunteer's vest (genuine uniform patch, not a logo card), CC BY-SA 4.0. One honest caveat noted in the record: the "youth-branch" specificity relies on the uploader's Turkish caption rather than visible "GENÇ KIZILAY" text in-frame — org identity (Kızılay) is visually confirmed, the youth sub-branch is caption-sourced.
- **0054 International Children's Peace Prize**: Excellent match. Official 2014 award-ceremony press photo sourced directly from KidsRights' own commissioned image library (photographer credited), CC BY 4.0, no logos, clearly the correct ceremony with identifiable dignitaries.
- **0050 TED-Ed Student Talks**: No TED-Ed-Clubs-specific photo exists on Commons (checked; one weak "TEDed-IHT event" candidate was visually rejected because the image itself showed no verifiable TED-Ed content — just a cameraman in an auditorium, relying entirely on caption text, which the methodology explicitly disallows). Used the brief's explicit permission to substitute a clearly-labeled illustrative TEDxYouth photo instead. `correct_entity_verified` is honestly set to **false** with reasoning explaining this is a sanctioned illustrative substitute, not a same-entity match — flagged for human sign-off before production use.
- **0064 Northwestern CTD Online**: Used the brief's explicit host-institution fallback. A clean, generic, geotagged Northwestern Evanston campus walkway photo, no people/branding. Labeled explicitly as depicting the host institution, not the online program itself.

## RIGHTS_REVIEW_REQUIRED flags

None. All 4 proposed images carry unambiguous CC BY or CC BY-SA licenses with either (a) direct organizational provenance (KidsRights' own image library for 0054) or (b) standard Commons "own work" self-attestation by named uploaders (0050, 0053, 0064) — the normal, accepted provenance tier for Commons content. Nothing here needed escalation beyond what's already noted in each record's `rights_status`.

## Anything odd / worth flagging to the next reviewer

1. **TED-Ed (0050) is a deliberate entity substitution, not a same-entity match.** This is the one record in this batch where I'm proposing an image that does NOT depict the actual named program (TED-Ed Clubs) — it depicts a related-but-different TED-family program (TEDxYouth). This was explicitly pre-authorized in the task brief for this specific record, and I've labeled it as clearly as I can (`image_depicts` starts with "ILLUSTRATIVE ONLY, not a TED-Ed Clubs/Student-Talks-specific photo", `correct_entity_verified: false` with explanation) — but a human should make the final call on whether an illustrative substitute is acceptable in the live product, since a student browsing opportunities could reasonably assume any photo shown is of the actual program.

2. **Genç Kızılay (0053) youth-branch identification is caption-sourced, not visually independent.** The photo genuinely shows a Kızılay-branded vest (visually confirmed), but the "this specific person is a *youth* volunteer, not a regular adult volunteer" claim comes from the Turkish uploader caption, since both figures are shot from behind with no visible age indicator or "GENÇ" text. I judged this an acceptable, honestly-flagged risk given (a) the org affiliation IS visually verified, (b) the content (disaster relief) matches the record's own documented Genç Kızılay activities, and (c) it's the *only* Commons hit for the exact phrase "Genç Kızılay" after a genuinely broad search of the parent org's full category (53 files). Flagging in case a reviewer wants a stricter bar than "org confirmed, sub-branch caption-only."

3. **Two records where I explicitly rejected a same-org-family photo for being the wrong specific entity**, worth confirming the next reviewer agrees with the call rather than assuming I just didn't search hard enough:
   - **TEO (0065)**: Found 5 good International Economics Olympiad (IEO) photos, but IEO is the *international* event Turkish winners advance to — not Türkiye's own national selection process (TEO) that this record is about. Not proposed.
   - **WRO Türkiye (0067)**: Found several World Robot Olympiad photos, all from Germany's national competition (Wro2012/WRO 2015/Deutschlandfinale) — a different country's national program, not WRO Türkiye. Not proposed. The organizer's own Commons asset (Bilim Kahramanları Derneği) is a logo only.

4. **Eco-Hero Awards (0043)**: One candidate existed and was visually inspected (not just caption-read) — a CC-licensed portrait of a single named 2017 winner, sourced from the award's own site. I judged a random past laureate's headshot an inappropriate representative image for an evergreen program listing (also touches on not wanting to make one specific ex-participant the permanent "face" of the opportunity) and rejected it. This is a judgment call a reviewer may want to revisit — the candidate does exist and is properly licensed if the product team decides individual-laureate portraits are acceptable representative imagery elsewhere in ORYN.

5. **7 of 14 records landed on NOT_YET_RESOLVED** — higher than might be expected, but consistent with the task brief's own prediction that this is "the MOST LIKELY correct answer for the Turkey-based real-world programs in this batch." Small/private-company organizers (A Plus Academy for TEO, Genç Başarı for GençBizz) and school-specific or company-specific programs (Round Square's single Istanbul school, TKS's accelerator) simply have little to no Wikimedia Commons footprint — this reflects genuine absence, not under-searching. Each NOT_YET_RESOLVED record's `verification_method` documents the specific queries run (typically 2-3 per record, including Turkish-language and alias variants) so the gap is auditable.

No git commands were run and no database/Supabase writes were made — this is a proposals-only dry run as instructed.
