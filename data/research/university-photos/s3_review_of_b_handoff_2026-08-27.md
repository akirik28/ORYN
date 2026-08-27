# S3-Review-B — Independent QA Review of S3-B's University Photos — Handoff

Agent: S3-Review-B | Date: 2026-08-27 | Reviewing: `s3_photos_agent_b_2026-08-26.jsonl` (127 records, research agent S3-B)
Output: `s3_review_of_b_2026-08-27.jsonl` (in progress)

**Status: IN PROGRESS.** This is a partial handoff, updated as review batches land. First batch (all 40 VERIFIED-tier records) is complete and committed.

## Progress so far

### Batch 1 — all 40 `verification_state: VERIFIED` records (complete)

Every one downloaded and independently viewed at full/near-full resolution (via WebFetch on the raw `upload.wikimedia.org` URL — direct `curl` is being blocked/rate-limited by Wikimedia from this environment for all but one request; WebFetch reliably fetches and caches the binary locally for direct visual inspection, same net effect). Every license_evidence_url page was independently checked and the stated `license_type` confirmed to match what the Commons file page actually says.

Result: **39 CONFIRMED, 1 REPLACED, 0 plain DOWNGRADED** (one further record was investigated as a likely downgrade and resolved back to CONFIRMED after finding corroborating evidence — see below).

**REPLACED — rn 659, Al-Ahliyya Amman University.** The live image was a real, correctly-licensed, correctly-identified photo (Arabic banner names the university explicitly) — but it is an indoor graduation-ceremony crowd shot, not a campus/building photo. Zero architecture visible. This is the same defect category S3-B itself used to reject other records in this same dataset (Massey University's ice-cream photo, Rice University's mascot photo — both explicitly rejected as "not a campus photo"), so by the project's own standard this shouldn't have been marked VERIFIED as a clean representative image. Found and substituted a real replacement from the same Commons category: `Al_Ahliyya_Amman_University_Gate.jpg`, an elevated/aerial photo of the actual campus entrance and grounds, CC BY-SA 3.0/GFDL confirmed. New `image_url`/`image_source_url`/`license_evidence_url` set accordingly.

**Investigated as a likely downgrade, resolved to CONFIRMED — rn 672, Yeungnam University.** The live image shows a large abstract bronze statue dominating the frame in front of a generic glass tower with a small illegible emblem — a composition that closely echoes S3-B's own stated reason for rejecting the *prior* DB photo on this same record ("statue-dominated... unclear glass tower... illegible logo... identity not verifiable"), which read as a possible inconsistency worth chasing. Traced it down: the Commons file page confirms title/category/uploader note all tie it to "Yeungnam University [Central] Library." More importantly, found a second, independently-sourced Commons photo in the same category (`Main_Library_of_Yeungnam_University.jpg`, different photographer, different year) showing the *same distinctive tower* from a clean angle without the statue. Two independent contributors photographing the same tower and tagging it to Yeungnam is real corroborating evidence — this is a genuine, recurring, recognizable Yeungnam building, not a mismatch. Net: composition is weaker than ideal (statue-dominated) but the identity concern is resolved. Kept as CONFIRMED with the full reasoning in `review_notes` so a future reviewer doesn't have to re-derive it.

**Notable correction (no status change) — rn 737, LUT University.** S3-B's own notes describe the replacement image as "a corridor rather than an exterior building shot (weaker than ideal)." This is factually wrong: the actual photo is a wide *exterior* panorama with the building facade carved/lettered "LAPPEENRANNAN TEKNILLINEN YLIOPISTO" (LUT's Finnish name) in full — a strong exact-name match, stronger than the original notes gave it credit for. Confirmed independently via the Commons license page too, which describes it as exterior. Left `verification_state` at VERIFIED (already the ceiling) but flagged this in `review_notes` since a future reader relying on S3-B's own note would undervalue this record.

All other 37 VERIFIED records checked out cleanly: real photos, institution identity confirmed either by legible on-image text/signage (the majority — e.g. Stony Brook's "ENGINEERING" sign, Yale's Harkness Tower, Paris-Dauphine's carved building name, TU Dortmund's "tu" logo on the Mathetower, Aston's foundation stone, Alberta's "Arts Building & Convocation Hall" sign) or by Commons caption/category where no on-image text existed (a minority, consistent with how S3-B itself operated), no dominant logos, and every claimed license confirmed word-for-word against the actual Commons file page.

## Remaining scope (not yet done)

- All 14 records named in S3-B's own handoff "worth double-checking" list (rn 653, 654, 678, 681, 683, 689, 709, 715, 723, 726, 734, 741, 758, 759)
- Random spread sample of ~35 of the remaining `RIGHTS_REVIEW_REQUIRED`/`CANDIDATE` records
- All 4 `NOT_FOUND` records (rn 663, 694, 717, 742) — fresh search attempt each

## Process note for whoever picks this up

`curl` against `upload.wikimedia.org` from this environment reliably returns a Wikimedia rate-limit error page (not the image) for essentially every request except one. `commons.wikimedia.org` (the wiki page domain, not the upload/image domain) and the `qtcvcflzxbuagvvwahhu.supabase.co` storage domain both work fine with `curl`. Workaround used throughout: `WebFetch` on the raw `upload.wikimedia.org/...` URL — its text description of the binary is usually useless ("corrupted data"), but it reliably fetches and saves the actual image bytes to a local `tool-results/webfetch-*.jpg` path, which `Read` can then open normally for real visual inspection. This is slower (two tool calls instead of one) but fully reliable.
