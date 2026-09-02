# Batch 2 (of the 79): hit rate dropped 93% → 74% — here's why, and it's a real pattern

Batch 1 was the 15-row sample: 14/15 successfully determined. This batch is the next 23
rows from the same pool. **17/23 resolved cleanly — a real drop, not noise, and it has a
specific, nameable cause.** Flagging per the standing instruction rather than pushing
through silently.

**No writes.** Every value sourced from the program's own official page, opened directly
this session. Full per-row detail and sourcing is in
`organization_research_batch2_2026-09-02.sql`'s comments — this page is the summary.

## Why it dropped: one real pattern, not six unrelated misses

Of the 6 unresolved rows this batch, **4 share one exact shape**: the row's title is just
an institution name ("American University, Washington DC," "Lehigh University," "Lehigh
University: Bethlehem, PA") or fully generic ("Pre-College Program"), and the stored URL
lands on a generic institutional page — an academic calendar, an international-affairs
office, a college homepage — that isn't a specific youth program of any kind. This is the
same shape as batch 1's "Purdue University" miss, just more of it in this batch (4 of 23
vs. 1 of 15) — not a new problem, a denser concentration of an already-known one.

**The other 2 are a different, more concerning shape**: the stored `official_url` points
at something real, but the *wrong kind* of thing entirely — an academic publication-
repository entry (King's College London) and an unrelated university's unrelated degree
page (Google Computer Science Institute → a Northeastern Illinois University CS degree
page that has nothing to do with Google). Batch 1 had one instance of this too (Young
Founders Lab's official_url pointing at a third-party review blog) but that at least
described the right program; these two don't describe anything related.

**Read together: this batch happened to draw more of both known-risky shapes than batch
1's sample did.** The corpus is genuinely non-uniform, exactly as expected — not evidence
the method is failing, but real information about which rows in the remaining pool are
worth researching versus which need the original source instead.

## Three defect classes now confirmed across two batches, not one

Worth writing down explicitly, since whoever eventually re-verifies this catalogue needs
to know the source data is unreliable in three distinct, specific ways — not just
"sometimes wrong":

1. **Title implies the wrong parent organization.** RSI (batch 1) and Harvard CURE
   (batch 2) both have titles naming a famous host institution (MIT, Harvard) that isn't
   actually the organizer (Center for Excellence in Education; Dana-Farber/Harvard Cancer
   Center, respectively). Two independent instances now, not a one-off — title-inference
   would get both wrong, which is exactly why this task's rule requires the program's own
   page.
2. **`official_url` is stale but the domain still identifies the real organization.**
   The most common failure this batch (6 of the 17 resolved rows had a 404 on the exact
   stored URL) — recoverable by checking the parent domain, which is what every "stale
   URL" resolution in the SQL file did.
3. **`official_url` points at something unrelated to the program entirely** — a
   third-party review (Young Founders Lab), an academic publication (King's College
   London), or a different institution's unrelated page (Google CSI). Not recoverable
   from the stored URL at all; needs a fresh search for the real source, or the original
   researcher's own source, per row.

## Running totals (batches 1+2, 38 of ~79)

- **Resolved**: 13 + 17 = 30
- **Confirmed dead/renamed**: 1 (Duke TIP)
- **Unresolvable without the original source**: 1 + 6 = 7
- **Successfully determined (resolved + dead)**: 31/38 = 82%
- **Genuinely stuck**: 7/38 = 18%

## Recommendation

Not a "stop and say so" in the sense of the effort being unproductive — 82% successfully
determined is still well above a reasonable continue bar. But the batch-to-batch variance
(93% → 74%) is real enough that I'm reporting rather than assuming the next batch looks
like either prior one. Holding here for the same reason as after batch 1: ready to
continue immediately, want the checkpoint on record given the swing.
