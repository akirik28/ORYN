# S3-Review-B — Independent QA Review of S3-B's University Photos — Handoff

Agent: S3-Review-B | Date: 2026-08-27 | Reviewing: `s3_photos_agent_b_2026-08-26.jsonl` (127 records, research agent S3-B)
Output: `s3_review_of_b_2026-08-27.jsonl` (93 records)

**Status: COMPLETE.** All four assigned scopes are done, independently visually verified, and committed.

## Headline numbers

93 of 127 records reviewed (targeted, not exhaustive, per the assigned scope):

| Scope | Count | Result |
|---|---|---|
| All `verification_state: VERIFIED` records | 40 | 39 CONFIRMED, 1 REPLACED |
| S3-B's own "worth double-checking" handoff list | 14 | 14 CONFIRMED (3 with meaningfully strengthened confidence) |
| Random spread sample of remaining CANDIDATE/RIGHTS_REVIEW_REQUIRED | 35 | 35 CONFIRMED |
| All `NOT_FOUND` records | 4 | 2 UPGRADED (real photo found), 2 CONFIRMED as genuinely not found |

**Final verdict tally: 90 CONFIRMED, 2 UPGRADED, 1 REPLACED, 0 DOWNGRADED.**

No record was found to have the wrong institution, a hidden logo/crest problem, or a license that didn't match its citation. The one real content defect found (rn659) was a wrong-content-type problem (an event photo, not a campus photo) that was fixed directly with a real replacement rather than merely flagged. This matches the orchestrator's own spot-check finding that S3-B's underlying work is high quality — this review's job was confirming that at scale, and it holds up.

## The 3 records that actually changed (read these first)

**REPLACED — rn 659, Al-Ahliyya Amman University.** The live "VERIFIED" image was real, correctly licensed (CC BY-SA 2.0, from the university's own Commons/Flickr account), and correctly identified (an Arabic banner explicitly names the institution) — but it is an indoor graduation-ceremony crowd shot (rows of robed graduates, a stage, no architecture at all visible anywhere in frame). This is the same defect category S3-B itself used to reject other records in this exact dataset (Massey University's ice-cream-eating photo, Rice University's mascot photo — both explicitly rejected in S3-B's own notes as "not a campus photo"), so by the project's own established standard this shouldn't have been marked VERIFIED as a clean representative image. Found and substituted a real replacement from the same Commons category: `Al_Ahliyya_Amman_University_Gate.jpg`, a genuine elevated/aerial photo of the actual campus entrance and grounds, CC BY-SA 3.0/GFDL confirmed on its own file page. `image_url`/`image_source_url`/`image_depicts`/`license_evidence_url` all updated in the output record.

**UPGRADED — rn 663, Tashkent Institute of Irrigation and Agricultural Mechanization Engineers (TIIAME-NRU).** S3-B recorded this as NOT_FOUND after a real search attempt. Redid the search and found a real, correctly-licensed photo S3-B's English-language search missed: a Russian-titled Commons file (`Ташкентский институт инженеров ирригации.jpg`) sitting in a Commons category that explicitly links to the same English Wikipedia article as this institution. Visually confirmed: real photo, entrance gate carved with the institution's Uzbek-language acronym ("TIQXMMI") and full name. CC BY 4.0, uploaded 2024-10-13 — well before S3-B's research session, so this was a findable miss caused by the language of the source file, not a case of the photo not existing. Record upgraded from NOT_FOUND/CANDIDATE to OPEN_LICENSE_VERIFIED/VERIFIED.

**UPGRADED — rn 694, Princess Sumaya University for Technology.** Same story: S3-B correctly found that the Wikipedia infobox only has the university's logo, and correctly concluded the infobox fallback didn't apply — but a direct Commons full-text search (rather than following the Wikipedia infobox link) turns up a real campus photo not linked from that infobox: `PSUT-Image.jpg`, showing the actual campus courtyard with a bilingual banner naming the university, Jordanian flag, olive and palm trees. CC BY-SA 4.0, uploaded 2022 — also predates S3-B's session. Record upgraded from NOT_FOUND/CANDIDATE to OPEN_LICENSE_VERIFIED/VERIFIED.

The other 2 NOT_FOUND records (rn717 Central European University Vienna, rn742 Gulf University for Science and Technology Kuwait) were re-searched fresh and confirmed as genuinely not found — nothing usable exists on Commons or in the Wikipedia infobox for either.

## Notable non-status-changing findings (worth knowing, nothing to fix)

- **rn 672, Yeungnam University** — investigated as a likely downgrade (the live image's statue-dominated composition closely echoes S3-B's own stated reason for rejecting the *prior* DB photo on this exact record), but resolved back to CONFIRMED after finding a second, independently-sourced Commons photo of the same distinctive tower from a different photographer/year, which corroborates the building's identity. Full reasoning is in the record's `review_notes` so nobody has to re-derive it.
- **rn 737, LUT University** — S3-B's own notes describe this image as "a corridor... weaker than ideal." That's factually wrong: it's a wide exterior panorama with LUT's full Finnish name carved on the facade, a stronger match than the notes credit. No status change (already at VERIFIED ceiling) but the notes undersell it.
- **rn 678 (École Centrale de Lyon), rn 723 (Czech Technical University), rn 758 (Northwestern Polytechnical University)** — all three of S3-B's own low/moderate-confidence handoff flags were meaningfully strengthened with new corroborating evidence (confirmed the exact building code "W1B" is a real ECL building; confirmed a real CTU building at that exact Prague corner since 1875; found Chinese-language sources directly tying the "Xingtianyuan Building C" dormitory name to NPU's Chang'an campus). Left at CANDIDATE since rights/license are still separately unknown for all three, but identity confidence is now much higher than S3-B's original flag.
- **rn 654 (Michigan State), rn 689 (Universita Politecnica delle Marche)** — the two handoff items I could **not** improve on. Both remain genuinely low-confidence after a real search attempt; agree with S3-B's own calibration.

## Everything else

The other 84 records (37 of the 40 VERIFIED, 9 of the 14 handoff-flagged, all 35 sampled) checked out cleanly on independent review: real photos (not logos/graphics), institution identity confirmed either by legible on-image text/signage (the majority — e.g. Stony Brook's "ENGINEERING" sign, Yale's Harkness Tower, Paris-Dauphine's carved building name, Politecnico di Milano's "1863 POLITECNICO DI MILANO" facade inscription, Plekhanov's full Cyrillic name in gold letters) or by Commons caption/category where no on-image text existed (a substantial minority, consistent with how S3-B itself operated throughout), no dominant logos or crests, and every claimed license on the 40 VERIFIED + 4 upgraded/replaced records independently confirmed word-for-word against the actual Commons file page (not just trusted from the record).

## Process note for future reference

`curl` against `upload.wikimedia.org` from this environment reliably returns a Wikimedia rate-limit HTML error page (not the image) for nearly every request — confirmed across dozens of attempts, only 2 of roughly 80 raw-image curl attempts actually got real bytes. `commons.wikimedia.org` (the wiki page domain, not the upload/image domain) and the `qtcvcflzxbuagvvwahhu.supabase.co` storage domain both work fine with `curl` every time. Workaround used throughout for Wikimedia images: `WebFetch` on the raw `upload.wikimedia.org/...` URL — its own text description of the binary is consistently useless ("corrupted data," reading only EXIF metadata), but it reliably fetches and saves the actual image bytes to a local `tool-results/webfetch-*.jpg` path, which `Read` then opens normally for real visual inspection. This is slower (two tool calls instead of one) but fully reliable, and was used for all ~60 Wikimedia-hosted images checked in this review.

## Scratchpad contamination (environment note, not a review finding)

This session's scratchpad directory (`/private/tmp/.../scratchpad/`) was **not empty at the start of this task** — it already contained batch files, decision logs, downloaded images, and an orchestrator notes file (`s3-final-review-notes.md`) spanning rn ranges belonging to S3-A's research and the coordinator's own cross-shard spot-checks, none of which were from this review task. None of that pre-existing content was used as a shortcut here — every one of the 93 records in this output was independently downloaded and visually inspected fresh by this session. Flagging this because scratchpad directories are supposed to be session-isolated, and this one evidently was not; worth a look if reproducibility of per-session scratch state matters going forward.
