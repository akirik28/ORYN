# S7 Photo Sourcing — Batch G2-1 Closeout

**Date:** 2026-08-27
**Scope:** 14 essay/literary/research publication records (S7-oryn4d-0023, 0028, 0030–0035, 0037–0039, 0041, 0071, 0073)
**Output:** `s7photo_g2_batch1.jsonl` (14 lines, all valid JSON, all research_ids accounted for)
**Mode:** DRY RUN per Research Freeze Common Operating Contract §10 — no DB writes, no git commands, no other files edited.

## Counts

| Outcome | Count | Records |
|---|---|---|
| **Verified** (image proposed, visually confirmed) | 4 | 0023, 0030, 0035, 0071 |
| **NOT_YET_RESOLVED** | 0 | — |
| **No-candidate, terminal** (searched, genuinely nothing to find) | 10 | 0028, 0031, 0032, 0033, 0034, 0037, 0038, 0039, 0041, 0073 |

This matches the brief's expectation: the large majority of this batch is online-only submission venues with no photographable real-world component, and a bounded, genuine search confirming that is treated as a correctly-resolved terminal state, not a failure.

## The 4 verified records — all are host/organizer-building fallbacks, NOT program-specific photos

None of the 14 records had a genuine program-specific photo (an actual contest event, ceremony, or reading) available on Commons. All 4 "verified" results are the **host-institution / organizer-headquarters fallback** pattern explicitly permitted by the brief, each clearly labeled as such in `image_depicts`:

1. **0023 Harvard International Review Academic Writing Contest** → Harvard Yard campus photo (CC BY 3.0). This is the exact example the brief itself names as the intended special case. HIR's own Commons footprint is only its logo (disqualified).
2. **0030 Foyle Young Poets of the Year Award** → exterior of The Poetry Society's actual headquarters building in Covent Garden, London (CC BY-SA 4.0). Not a university, but the organizing charity's real premises — same logic as the host-institution fallback, applied to a nonprofit's HQ instead of a campus.
3. **0035 Apprentice Writer** → Selinsgrove Hall, Susquehanna University (CC BY-SA 4.0), the record's own stated host_institution.
4. **0071 The Louisville Review — Cornerstone** → Spalding University's administration building (Public Domain), the record's own stated host_institution.

All 4 were **visually confirmed by navigating to the actual Commons File: page and screenshotting it** — not proposed from filename/caption alone. All 4 show a genuine building/campus photo with no logo card or branded graphic as the subject.

## Flag for reviewer: one borderline no-logo call

**0030 (Foyle Young Poets)** — the Poetry Society HQ photo has "THE POETRY SOCIETY" as physical shopfront signage spanning most of the storefront's width. It's real architectural street photography (not a logo graphic), which I judge as passing the no-logo-dominant rule, but the sign is more prominent than the other three fallbacks (which show plain building exteriors with a small or no sign). Flagged explicitly in that record's `image_depicts` and `no_logo_reasoning` for a human to weigh in on if a stricter bar is wanted.

No other RIGHTS_REVIEW_REQUIRED flags. All 4 proposed images have clear, standard Commons licenses (CC BY 3.0, CC BY-SA 4.0 x2, Public Domain) with identified authors, and none depict identifiable minors or sensitive content — all are building/campus exteriors only.

## Terminal no-candidate records — search basis (all genuinely online-only, no host institution)

- **0028 Polyphony Lit** — teen-run nonprofit, fully online (Submittable). Zero Commons hits.
- **0031 Bow Seat Ocean Awareness Student Contest** — nonprofit, "entirely online submission." Zero genuine hits (9–24 raw hits, all rowing/nautical "bow seat" noise).
- **0032 Skipping Stones** — only Commons hit is a small logo SVG (disqualified as a wordmark, not a photo).
- **0033 Cathartic Youth Literary Magazine** — tiny independent Weebly site. Zero Commons hits.
- **0034 The WEIGHT Journal** — one-editor independent journal. Zero genuine hits (27 raw hits, all unrelated old scientific-journal scans).
- **0037 The Adroit Journal — General Submissions** — independent, Submittable-based. Zero Commons hits.
- **0038 Teen Ink** — online platform (Young Authors Foundation). Zero Commons hits.
- **0039 One Teen Story Contest** — Submittable-based; parent org "One Story" too generic a phrase to search directly, filtered search also came up empty.
- **0041 Sine Theta Magazine** — online, themed print issues, no event. Only hits are the unrelated math function sin(θ).
- **0073 IJSCAR** — academic e-journal (Zenodo-indexed); editorial board spans 4 different universities with no single host institution, so no institutional fallback was proposed either (would be arbitrary/overreaching to pick one of four). Zero genuine Commons hits.

## Anything odd

- **Shared/contested browser environment:** partway through this run, the Commons search box and active tab changed to content I hadn't searched for ("Explorers Club", then "Action for Nature Eco-Hero"), and tab IDs jumped from tab-1 to tab-3/tab-5 without my creating them — consistent with another concurrent Claude session (per this repo's known parallel-lanes setup) actively driving the same shared browser pane at the same time. I moved to my own dedicated tabs and re-verified state (via fresh navigate + screenshot) before trusting any page content from that point on; nothing in the final output was sourced from a tab I hadn't personally just navigated and screenshotted myself. Worth knowing if another agent's photo-sourcing output looks like it has unexplained gaps — the pane contention was real and intermittent (`computer`/`screenshot` calls frequently errored with "Browser pane is not displayed" / "currently hidden" and had to be retried, sometimes via a fresh `preview_start` call to force redisplay).
- No other data-quality surprises. The batch matched the brief's own prediction closely: 10/14 genuine terminal no-candidates, 4/14 lower-confidence institutional fallbacks, 0/14 program-specific photos, 0/14 not-yet-resolved gaps.
