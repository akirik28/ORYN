# S7 Photo-Sourcing Pass — Master Closeout

Dry run per Common Operating Contract §10 (Photo Standard). Same methodology/schema convention
as S6's photo pass on their own records (Wikimedia Commons + Browser-pane visual verification
before proposing any image — never inferred from filename/caption alone).

## Scope

42 priority records: the 26 S8-confirmed `PRODUCTION_READY` opportunities plus 16 further
`VERIFIED`/Turkey-access-resolved records, out of S7's 71-record corpus. The 29 `CANDIDATE`
records and the 3 DATA-flagged possible-live-DB-overlaps were intentionally skipped — sourcing
images for records not yet settled on their own facts would be wasted effort.

Split across 3 sub-agents by content type (scholarships/STEM journals; essay/literary
publications; leadership/social-impact/online/Türkiye-based), 14 records each.

## Results

| Outcome | Count |
|---|---|
| **Verified** (real photo, visually confirmed) | **13** |
| **NOT_YET_RESOLVED** (real-world component exists, no matching photo found — a genuine gap) | **11** |
| **Terminal, correctly resolved** (no photographable component exists) | **18** |
| **Total** | **42** |

## The 13 verified images

Mostly host-institution/organizer-HQ fallbacks (explicitly labeled as such in `image_depicts`,
per the contract's own allowance) rather than program-specific event photos — genuine
program-specific photos exist for only 4 of the 13: Genç Kızılay (2023 earthquake relief,
visible Kızılay emblem), International Children's Peace Prize (KidsRights' own 2014 ceremony
photo), and two government-ministry-building shots with visible official signage (MEXT Japan,
Taiwan MOE) that at least depict the actual awarding body, not just an adjacent institution.

**One honest mismatch, flagged for human sign-off, not silently passed as a match**: TED-Ed
Student Talks' proposed image is a TEDxYouth event photo (a related but different program — no
TED-Ed-Clubs-specific photo exists on Commons), `correct_entity_verified` explicitly set to
`false` rather than glossed over.

**Two borderline no-logo calls worth a second look**: Rising Explorer Grant (Explorers Club HQ)
and Foyle Young Poets (Poetry Society's actual HQ building) — both have real architectural
signage spanning much of the frame; the sourcing agents judged this genuine building signage
rather than a logo card, but it's a closer call than the other 11 and worth a human glance
before shipping.

**Two same-family-wrong-entity rejections** (correctly caught, not shipped): Zonta and Varkey
Foundation searches surfaced real, correctly-licensed ceremony photos, but for a *different*
award within the same parent organization — rejected on correct-entity grounds rather than
accepted as close enough.

## The 11 NOT_YET_RESOLVED gaps (real, not silently closed)

Global Student Prize, Stipendium Hungaricum, Zonta Young Women in Leadership Award, Global
Korea Scholarship, International Young Eco-Hero Awards, TKS (in-person track), Round Square,
GençBizz, Türkiye Ekonomi Olimpiyatları, WRO Türkiye, The Pollination Project. Each has a
confirmed real-world ceremony/event/activity but no correctly-matching photo was found after a
genuine, multi-round search — per the S6-established convention, this blocks treating the
record as photo-complete; it is explicitly not the same state as "no photo needed."

Two of these (TEO, WRO Türkiye) involved rejecting same-family-wrong-country photos (Turkey's
national round vs. the international/German equivalents) rather than settling for a mismatch —
same discipline as the Zonta/Varkey rejections above.

## The 18 correctly-resolved no-candidate cases

Genuinely online-only opportunities with no physical component to photograph: Üçok Family
Scholarship Fund, National High School Journal of Science, The Curieux Review, Whitman Journal
of Psychology, IYNA Journal, Polyphony Lit, Bow Seat, Skipping Stones, Cathartic Youth Literary
Magazine, WEIGHT Journal, Adroit Journal, Teen Ink, One Teen Story, Sine Theta, IJSCAR, TKS
Virtual, picoCTF, Science Mentorship Institute. Each was searched on Commons (MediaSearch and
full-text, often multiple phrasings) with zero or ruled-out-noise results, not a single
shallow attempt.

## Operational finding, both applicable and independently reproduced by 2 of 3 agents

**The Browser pane was shared with at least one other concurrent session** during this pass —
unprompted tab/search-box content changes mid-task. Both G1 and G2's agents independently
noticed this, moved to dedicated tabs, and re-verified via fresh navigate+screenshot before
recording anything, rather than trusting content from a contested tab state. Documented here
in case it recurs for other concurrent photo-sourcing lanes (S1-S4 on universities, or a future
S7 photo pass) — the fix (claim a dedicated tab, pin `tabId` on every call, re-verify after any
unexpected page state) held up and nothing in the final 13 verified images came from an
unverified moment.

## What's still missing / next steps

1. **Live schema still has no image columns** (matches GAP_MAP.md's founder-escalation item —
   unresolved as of this pass). All 42 records here are proposals, nothing was or could be
   written to production.
2. **The 11 NOT_YET_RESOLVED records** are the highest-value next photo-sourcing target if
   capacity allows — real events likely exist, just not yet found on Commons specifically
   (worth trying official-site press pages, national Wikipedia editions for the Türkiye-based
   ones, or a different search tool).
3. **TED-Ed's mismatch and the 2 borderline no-logo calls** need a human decision before
   shipping, not an automatic pass.
4. **29 CANDIDATE-tier and 3 DATA-flagged records** were not attempted — revisit once their
   own facts are settled.

## Files

`s7photo_g1_batch1.jsonl`, `s7photo_g1_CLOSEOUT.md` (scholarships/STEM journals),
`s7photo_g2_batch1.jsonl`, `s7photo_g2_CLOSEOUT.md` (essay/literary publications),
`s7photo_g3_batch1.jsonl`, `s7photo_g3_CLOSEOUT.md` (leadership/social-impact/online/Türkiye),
`s7_photo_MASTER.jsonl` (all 42, consolidated — the actual deliverable), this file.
