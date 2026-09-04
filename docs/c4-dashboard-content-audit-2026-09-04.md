# C4 — what the student home screen actually shows, checked against real generated content

**Report only. No code changed, no account created, no live write.** Every account referred
to below is anonymized — no name, school, or personal detail; a claim about a reason's
content is described structurally ("references the student's own research-dimension score
and a specific existing project") rather than quoted, per the standing instruction that
these are minors' data.

## The premise didn't hold, checked before assuming it did

The dispatch assumed a fixture exists per spec persona (A–D) and a preview route that can
render the dashboard against any one of them. Neither exists. Checked directly:

- `/design-preview/dashboard` is real and renders the actual `DashboardView`, but has
  exactly **one** hardcoded fixture (`lib/dev/fixtures.ts`'s "Ada") and no persona switch —
  an unread `?persona=` param is silently ignored. That fixture isn't one of the four spec
  personas either; it's a fifth, unrelated hybrid (strong academics *and* leadership *and*
  weak research all at once).
- The actual four Phase 49 personas only exist inside `scripts/qa-counselor-loop.ts`, a
  one-off CLI script not imported anywhere in `app/` or `lib/`. It computes raw
  scores/matches and prints them to stdout — nothing shaped like `DashboardView`'s props.
  This gap is already named, unclosed, in `docs/qa-environment-readiness-audit.md` and
  `docs/ai-quality-eval-2026-09-02.md`.
- Underneath that: the "This week" block's reasoning is **AI-generated** (Phase 9's weekly
  review engine). A hand-written fixture, even a persona-shaped one, can only prove the UI
  renders a static example — it structurally cannot answer whether reasoning is genuinely
  specific to a student or generic, which was the actual question here.

**What this pass did instead, agreed with CEO before building anything:** real,
already-AI-generated `weekly_actions`/`profile_scores`/`ai_recommendations` rows from real
QA accounts, fed into `DashboardView` through a throwaway route (deleted after
screenshotting, same technique as today's B3c check). This tests the real computation
pipeline's actual output, not a static stand-in for it.

**Cost of closing the gap properly, not undertaken here:** building four `DashboardView`-shaped
fixtures matching the spec's persona definitions (reusing `qa-counselor-loop.ts`'s data as a
starting point, since the raw profile shape is already written there) and wiring a
`?persona=` switch into `app/(dev-preview)/design-preview/dashboard/page.tsx` — roughly the
same shape of work as this pass's throwaway route, made permanent and repeatable instead of
one-off. Estimate: half a day, given the fixture shapes already exist in spirit.

## Accounts checked

Five real QA accounts with genuinely AI-generated weekly plans exist in the live database
(out of the total real user count another lane already measured tonight). All five checked;
referred to below as Account 1–5, no other identifying detail.

| Account | Profile shape (real `profile_scores`) |
|---|---|
| 1 | Nine dimensions, one strong (academics ~90s) and one very strong (awards, high-80s/90s); most others weak-to-zero. Closest real analog to "one clear strength, thin elsewhere." |
| 2 | Nine dimensions, all zero or near-zero except one (low single digits). The sparsest profile available — closest real analog to the spec's Persona D (14yo, minimal history), though age itself isn't confirmed. |
| 3 | One dimension maxed (100/100), everything else zero except a mid-range dimension. The most lopsided single-strength profile of the five. |
| 4 | One moderately-strong dimension (mid-70s), the rest weak-to-zero. |
| 5 | Nine dimensions, all zero except one very-low-single-digit entry. Similarly sparse to Account 2. |

**None of the five cleanly matches Persona B** (strong leadership *and* entrepreneurship,
weak research — the spec's own worked example) or **Persona C** (research-heavy, STEM). The
account set skews toward "one strength, broadly thin" and "near-empty" shapes. This is
itself informative: **the persona this task most needed to see (D, sparse/early-stage) has
a real, close analog on hand (Account 2/5); the strong-leadership-weak-research worked
example does not exist in any real account right now.**

## The core question: is the reasoning traceable, or could it apply to anyone?

**Traceable, consistently, across all five accounts and every block checked.** Every
"This week" action's stated reason names a real dimension score, a real specific existing
activity/project, or a real upcoming deadline belonging to that account — never a bare
"you could consider doing X." Concretely, across the 15 actions checked (3 per account):
every single one referenced at least one specific, verifiable fact about that account's own
data (a numeric score, a named existing project to extend rather than replace, or a real
application-checklist deadline) as the stated reason for that specific action's priority.

**The "one thing not to do" block is the sharpest evidence of this**, and it's the one the
spec's own worked example targets directly. Checked ten `avoid_for_now` entries across four
of the five accounts. Every one names the specific declined activity/program, and the reason
given is explicit opportunity-cost reasoning tied to that account's real profile: which
dimension it would move, whether that dimension is already strong or already the account's
actual gap, and — where relevant — the account's own stated time budget. One account's
history shows the same category of recommendation (avoid new external programs) recurring
across multiple weekly cycles; each recurrence explicitly says it was already flagged before
and that the situation hasn't changed, rather than presenting it as a fresh finding. Whether
that's the intended behavior (a genuinely unchanged situation correctly says so again) or
worth tightening (Phase 63's recommendation-history tracking existing more visibly) is a
judgment call, not a verified bug — flagged, not fixed.

**Profile-dimension confidence is honest, not flattened.** For the sparsest account (2),
eight of nine dimensions render "Nothing yet / Not enough evidence" while the one dimension
with a genuine (if small) signal renders "Limited evidence" — distinct copy, not the same
bucket. This is Phase 68's confidence system working as specified: the UI doesn't collapse
"truly nothing recorded" and "a little, weak evidence" into one look.

## What actually renders — the sparsest real account, screenshotted

Account 2's real weekly plan/actions and real `avoid_for_now` entry were fed into
`DashboardView` directly (fixture data substituted only for the deadlines/opportunities/
university-outlook blocks, where this account's own real data was either absent or
incomplete — see the gap below). Result:

- **Hero**: correctly shows the empty/"Getting started" state, not a fabricated low score —
  "Proxola reads your courses, activities, projects and awards to find where your profile is
  thinnest. Right now there isn't enough recorded for it to say anything it could stand
  behind — that's a gap in what Proxola knows, not a judgement about you." Calm, honest,
  not alarming. This is the actual first impression a near-empty real profile gets, and it
  does not look broken or discouraging.
- **"Your focus this week"**: populated, all 3 real actions render with title, reason,
  impact level, and time estimate.
- **"One thing not to do"**: populated with the account's real entry.
- **Profile-dimensions sidebar**: correctly differentiated per dimension, as above.
- **Due soon / University outlook / Opportunities**: rendered using fixture placeholders in
  this throwaway (this account's own real data for these three blocks was either sparse or,
  for outlook specifically, genuinely incomplete — see next section) — so this part of the
  screenshot demonstrates layout only, not this account's authentic content.

No blank gaps, no crashed section, no visibly broken layout anywhere on the page for this
near-empty profile.

## Two things found, not fixed

**1. University outlook isn't always computed for a saved target.** Checked directly: of
the five accounts, two have target universities saved (3 each) with **zero** of them
carrying a computed outlook classification, while the other three accounts' targets are
fully classified. Reading `app/(app)/universities/[id]/page.tsx` earlier tonight (a separate
check, for the B3c task) showed outlook computation (`refreshAdmissionOutlook`) runs at
that detail page's own view time — so a university added as a target but never individually
opened may never get classified. Whether the dashboard's "University Outlook" block then
shows these rows unlabeled, omits them, or degrades some other way wasn't verified — the
real accounts' incomplete state was found via direct query, not by rendering their actual
outlook block (this pass's throwaway substituted fixture data there instead, as noted
above). Worth a follow-up check specifically on that render path.

**2. Recommendation repetition across weekly cycles**, noted above — likely fine (the
underlying situation genuinely not having changed), flagged rather than judged, since
confirming it as a bug vs. correct steady-state needs Phase 63's own recommendation-history
data reviewed on its own, not inferred from this pass.

## What this did not do

Did not build the four-persona fixture/preview infrastructure — cost estimated above,
decision left to CEO. Did not verify Persona B's or C's shape against real data, since no
real account resembles either closely enough to stand in. Did not render any account's real
university-outlook or opportunities-preview block with that account's own real data (fixture
substituted, noted inline each time). Did not touch `lib/dev/fixtures.ts`,
`scripts/qa-counselor-loop.ts`, or any `design-preview` route. No account created, no
migration, no live write — every query was a plain `select`.
