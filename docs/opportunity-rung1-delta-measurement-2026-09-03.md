# The rung-1 delta: readability solved, evidence quality did not improve

**Date:** 2026-09-03. **Author lane:** this session. **oryn-a7's dispatch**, after the founder
added a real `TAVILY_API_KEY` this morning (the empty-key finding from
`docs/opportunity-hidden-live-records-measurement-2026-09-03.md` acted on within the hour): re-run
the same 126-row population with rung 1 actually executing, report the delta not a new count,
watch the credit budget, and specifically check whether Summer at Stanford — missed twice — now
resolves correctly.

## Sizing, stated before spending, per instruction

Sent before running: 62 of 126 rows — every row that didn't get a clean answer last time (18
`p4_contradicted` incl. Stanford, 3 `transport_error`, the 2 rows that never got a Tavily attempt
at all, 1 `liveness_silent`, 8 `p1_changed` = 32), a stratified 1-in-3 slice of the large
`p2_unreadable` bucket (25/75, evenly spaced), and a 5/19 consistency check on the already-clean
`p1_confirmed` bucket. 62/1000 ≈ 6.2% of the month. 2 of the 62 (the truly non-active rows) are
unreachable by `loadCandidatePool`'s hard-coded `status='active'` filter, same as last time —
checked directly with the same throwaway-script approach, deleted after use.

## The specifically-named check first: no, Stanford still doesn't resolve

`succeededAtRung: 1` this time — Tavily worked. The matched excerpt is **the same wrong one**:

> *"...Summer Session 2024... Apply Now[Ready to dive in? Start your application today"*

Not the *"program runs June 20–August 16, 2026"* sentence this session read by hand, on the same
page, twice before. **This settles the question the dispatch asked directly: the Stanford miss was
never a fetch-rung problem.** It is a phrase-matching/excerpt-window problem, independent of which
mechanism supplies the raw text — the page apparently contains both sentences, and three separate
passes (rung 2, rung 3, now rung 1) have all landed on the same weaker one. A real, useful, more
precise answer than "we don't know why it's missed" — and a correction to any assumption that
getting rung 1 working would fix it.

## Readability: solved, cleanly

**60 of 60 job-routed rows succeeded at rung 1.** Zero `transport_error`, zero corroboration
checks needed (nothing exhausted the ladder). Of the 2 rows outside the job's reach, one
(XLAB Germany) was rescued from total unreadability by rung 1; the other (Summer Programs in the
Netherlands) failed rung 1 *and* rung 2 for real — a genuine host difficulty, not a missing-key
artifact, confirming not everything was a Tavily-shaped hole. This part of the finding is clean:
**the access problem tonight's whole reverification effort has been running with is gone.**

## Evidence quality: not a clean improvement — 8 rows got worse, 6 got better, 3 stayed thin

43 of 60 (71.7%) kept the same outcome label. **17 of 60 (28.3%) changed — this is not "changed
little."** Read every flip, not just counted them:

**8 degraded** — a row that had *some* signal before now has less or none. Most consequential:
**all three of the prior pass's "solid" findings degraded or turned conflicting.**
- **International Psychology Olympiad**: was `p1_changed` on *"Register for 2027... Qualification
  deadline: before June 30, 2027"* (rung 2). Now `p4_contradicted` on *"...premier psychology
  competition for high school students. [Apply Now]"* (rung 1) — the specific 2027 date is simply
  gone from what Tavily extracted off the same page.
- **Stanford Anesthesia Summer Institute (SASI)**: was `p1_changed` on *"Summer 2027 · SASI
  Applications Now Open"* (rung 3). Now `p2_unreadable` (rung 1) — no signal survives at all.
- **Ron Brown Scholar Program**: was `p1_changed` on *"APPLY NOW - 2027 Application is now open!"*
  (rung 2). Now `p1_confirmed` on *"[APPLY NOW - **2025** Application is now open!](#)"* — a
  **different year**, a placeholder `href="#"` link, and language that reads like a fundraising
  "Run/Walk/Move for Ron Brown" widget rather than the scholarship application itself. Two fetches
  of the same domain surfaced two different years from what look like two different sections of a
  complex page. Neither excerpt is obviously the trustworthy one from text alone.

Also degraded: Cornell Precollege, GençBizzTech, and National High School Ethics Bowl all went from
`p4_contradicted` (some inconclusive content) to `p2_unreadable` (nothing) — Tavily's extraction
returned thinner content than the earlier raw fetch had, for these three specifically.

**6 improved** — İTÜ Lise Yaz Okulu (new *"Kayıtlar Başladı!"* / "Registration Started!" signal,
genuinely clearer), Johns Hopkins CTY and NYU Precollege and JAX Summer Student Program (real
content where a fetch had failed or returned nothing before, though correctly still inconclusive
on the specific tracked cycle), Telluride TASS (more text, though the dates within it are still
stale relative to today — an improvement in volume, not in resolving the actual question), and
XLAB Germany (rescued from total unreadability, though its own new evidence — *"2025, August 2 to
24, is open now"* — is itself a year-old date, the same stale-excerpt shape as everything else in
this investigation).

**3 stayed thin either way** (Battle Code MIT, Penn Medicine — `transport_error` → `p2_unreadable`,
a more honest "no signal" than a fetch failure, but still no signal; BRI Student Fellowship stayed
genuinely undated both times).

## The stability pattern is itself informative

**The 2 rows that stayed `p1_changed` across the recheck — European Youth Parliament Türkiye and
Girl Up Global Teen Advisor Board — reproduced the *exact same* excerpt and the *exact same* stale
date both times** (2026-05-25; "2025-2026... Apply by January 26"). These were already this
session's "uncertain" bucket, not the "solid" one. **The rows that looked most solid were the
least stable under a second, independently-fetched read; the rows that already looked uncertain
were the most stable.** That is backwards from what a naive "more solid evidence should replicate"
prior would predict, and it's a real, if uncomfortable, correction to the prior report's own
confidence ranking — a stale date recurring identically across two different fetch mechanisms is
better evidence of real (if unhelpful) page content than a strong-looking date that vanishes on
the second try.

## The consistency check held where it mattered

The 5-row `p1_confirmed` sample — where rungs 2/3 had already returned a confident "no change" —
stayed `p1_confirmed` **5 for 5** under rung 1. Where the fallback ladder was already confident,
rung 1 didn't contradict it once in this sample. The instability is concentrated in the ambiguous
and "changed" buckets, not spread evenly across everything.

## Revising the prior report's own count, not defending it

`docs/opportunity-hidden-live-records-measurement-2026-09-03.md` reported "3-4 solid" hidden-live
records. Re-checked against a properly-working top rung, on the same rows: **none of the three
held up as cleanly as they looked.** Two lost their signal entirely; the third now shows
conflicting evidence from what appears to be an unrelated part of the same page. The honest
current count from this sample is **zero to one confidently solid**, not three to four — a
downward revision, stated plainly rather than defended, because the evidence that produced the
downward revision is stronger (two independent fetches, not one) than the evidence behind the
original number.

## What this means for the arming decision, stated as a limitation rather than a verdict

This measurement's own instability is the more important finding than any count it produced.
**A single-excerpt, single-fetch check — even with all three rungs working — did not produce a
stable answer for the exact rows this session had the most confidence in.** That's not an argument
for or against arming automated demotion (§9's own closure-direction path, already reviewed
separately) — it's a direct, evidence-based reason to be more cautious than before about trusting
any single reverification pass's "changed" verdict on the opening direction specifically, since
this pass has now twice shown that verdict can flip on nothing more than which rung answered
first.

## What this measurement does not do

Nothing written. No `cycle_status` changed anywhere. The one throwaway script used to reach the 2
non-active rows directly was deleted after use, same as last time — no code added to the repo by
this pass.

## Gates

`npm run typecheck` / `npm run lint` to run before push. 62 real, current fetches (60 via the job,
2 direct) — 61 of 62 successfully reached readable content at rung 1 or rung 2. Zero database
writes.
