# Why Ireland's requirement data went stale — 2026-08-31

CEO-assigned follow-up to the requirement `verification_state` backfill
([[project_oryn_university_depth_lane]]): 43 of the 67 rows that moved to
`verified_historical` are Irish, spanning all 7 Irish universities with any requirement
data — Trinity College Dublin alone at 12. Three questions: why is Ireland different, what
does a page look like now, and is this recoverable by re-researching. Fetching and
reading only — no model-backed tool used anywhere in this pass (no WebFetch, no
WebSearch; direct browser navigation, `curl`, and reading the results myself throughout),
per the constraint that the Anthropic API account is out of credits tonight.

## 1. Why is Ireland different

**Checked every one of the 43 rows directly in the source corpus**
(`data/research/university-requirements/ie_requirements_*.jsonl`), not a sample. Two
distinct causes, not one:

**38 of 43 (88%) are CAO points** — Ireland's Central Applications Office points cutoffs,
present in every one of the 7 files (TCD 7, UCD 8, Galway 5, Maynooth 5, TU Dublin 4, UCC
3, Limerick 2, DCU 4). The researcher's own `limitations` field says essentially the same
thing on every single one of them, independently, across every university:

> "This is the points score at which the last CAO offer was made for 2025 entry — a
> competitive OUTCOME of that year's specific applicant pool and place count, not a
> published pre-set requirement. It will not repeat exactly for any future cycle."

That isn't researcher caution — it's how CAO's points system actually works, confirmed
by CAO's own text, independently captured in the national-level corpus file
(`ie_requirements_cao-system_2026-08-21.jsonl`, `REQ-2026-08-21-IE-CAO-008`, `VERIFIED_CURRENT`):

> "A points scoring system is in operation. It is not possible to forecast how many
> points will be required for a particular course until the [process is complete]."

UCC's page even carries live proof of this while remaining genuinely current: one of its
records (`REQ-2026-08-21-IE-UCC-011`) notes the source page itself displays "Updated 13
March 2026" — actively maintained, mid-way through the *current* cycle — while still
reporting 2025's points as the latest available, because 2026's aren't published yet.
This is structural, not a research-quality gap: UK grade thresholds ("AAA required") and
NL/TR eligibility floors are policy statements that persist across cycles; CAO points are
a market-clearing statistic recomputed from scratch every year, the Irish equivalent of
quoting last year's closing stock price as this year's target.

**5 of 43 (12%), all Trinity College Dublin**, are a different, narrower cause: TCD's own
"Undergraduate Admission Guide for non-EU Students" states on an inside page that it's
"for 2026 entry," and the original researcher correctly flagged that as
`VERIFIED_HISTORICAL` once the 2026 cycle's deadlines had closed — while also noting, in
the same breath, that no 2027 edition existed yet, so this was "the most recently
published complete non-EU admissions guide," not a document that had actually been
superseded. This is closer to a strict-labeling judgment call than a stale fact — see §3.

## 2. What an Irish university's page looks like now, with the suppression live

Not uniform — checked two representative cases live in the running app.

**Trinity College Dublin** (12 of 17 requirements suppressed, the largest cluster): what's
left is thin. Its only `verified_current` row is a tuition-fee table. The rest are 4
`unverified` procedural facts — a 500-word statement of purpose, two academic references,
"IB or A-levels accepted" with no specific score named, and a general English-proficiency
statement with no threshold. A student lands with the *shape* of the process but none of
the numbers that would tell them whether they're competitive — exactly the content that
got swept into the historical bucket.

**University College Dublin** (8 of 14 suppressed): meaningfully better. Its
`verified_current` rows include a real, specific, still-standing policy threshold —
"General non-EU/EEA IB requirement: 24 or more total points and the award of the IB
Diploma," with named subject-level requirements for Maths and English — because that's a
general admissions POLICY, not a CAO points outcome, so it was never swept up. A student
reading UCD's page still gets a genuine bar to clear.

So: not "nothing useful left" as a blanket statement — it depends entirely on whether a
given university also publishes a general policy-level threshold (UCD does) or relies
mainly on CAO points as the de facto requirement (TCD's competitive-band tables did, and
those are exactly what's gone). Worth knowing before pointing a student at any specific
Irish institution's page, since the experience isn't consistent across them.

## 3. Should this be re-researched

**No, not right now, for either part.**

For the 88% (CAO points): re-researching today would find the same thing the original
pass found — 2026 Round 1 results aren't published until this coming August/September,
so there is no newer figure to retrieve. Re-running the research wouldn't fix this; it
would just re-confirm 2025 is still the latest available number, and by next August
today's "fresh" 2026 figure will itself be exactly this same kind of historical fact.
This needs a recurring *refresh cadence* keyed to CAO's actual publication calendar, not
a one-time correction — closer in shape to `CADENCE_DAYS` in
`lib/acquisition/verification.ts` (which already has per-fact-class refresh intervals for
deadlines/cost/policy/etc., just nothing today models an annual "check again after this
country's results season" cycle) than to anything this pass or a re-research pass can
close permanently.

For the 12% (TCD's guide): checked directly rather than assumed. Downloaded TCD's live
PDF at its original URL just now — **byte-identical to what the original researcher
found**: same file, same embedded `CreationDate` (`2025-08-26`, confirmed from the PDF's
own metadata, not re-derived). No 2027 edition exists yet. Re-researching this specific
document today would find nothing new to change the verdict.

Recommendation, if this is worth acting on beyond documenting it: build the recurring
refresh concept for competitive-outcome facts (CAO points and any equivalent elsewhere —
worth checking whether other countries have a similar market-clearing admissions
statistic) rather than treating tonight's backfill as the fix. That's new capability, not
a re-research task, and a decision for whoever owns the ingestion pipeline's roadmap next.

## Verification

Read-only investigation — no requirement rows touched, no code changed. Every claim above
was checked directly: all 43 rows read from their own corpus files (not summarized),
TCD's and UCD's live pages checked in the running app after the backfill, TCD's PDF
re-downloaded and its metadata parsed directly. No WebFetch or WebSearch call made
anywhere in this pass.
