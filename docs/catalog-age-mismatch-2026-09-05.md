# Structural age/level mismatch audit — 2026-09-05

CEO's framing, verbatim because it's the actual spec: three categories, and the third one
never had a name before today.

- *"Bilmiyoruz"* → eligibility data missing (the 190-row / Slice A+B work already in
  flight).
- *"Uygun değil"* → excluded correctly once a student's real profile is matched against it.
- **"Bu zaten bu ürün için değil"** → **no 14-18 student could ever apply**, regardless of
  profile. This is the dangerous one: when the eligibility fields are *empty* on a row
  like this, the matching engine has nothing to exclude on, and the row can be scored and
  recommended as if it were open to everyone.

Scope: the **whole active catalog (367 rows)**, not just the two zero-eligibility slices
— this question is about opportunities that are wrong for this product's audience
*regardless* of whether their eligibility fields happen to be filled in or not.

## Method

No single keyword or column predicts this reliably, so five independent angles, each
run against all 367 active rows:

1. Title/description keyword scan (`master`, `graduate`, `postgrad`, `phd`, `doctoral`,
   `bachelor's degree`, `undergraduate`, `college student`, `university student`, etc.)
   → 47 candidates.
2. `official_url` / `organization` pattern scan (`hochschule`, `university of applied
   sciences`, `-msc-`, `master`, `phd`) → this is the angle that actually caught
   Hochschule Bremen a second time from a completely different signal, because its
   `description` column is **empty** — the row has no free text at all for a keyword scan
   to catch. Confirms the single-angle approach would have been an under-match, the same
   *"broad pattern search over/under-matches"* failure mode from other audits this fleet
   has hit before.
3. `eligible_grades` populated but entirely below grade 9 (the Cornell-campus-of-Summer-
   Discovery pattern CEO named) → 0 rows; that specific mismatch lives inside Summer
   Discovery's free-text description, not as its own catalog row (already flagged in the
   Slice A doc).
4. `minimum_age >= 19` or `maximum_age < 14` → 1 row (Major League Hacking) — see "Ruled
   out" below, this one turned out not to need action.
5. "Mentions college/university/undergraduate, never mentions high school/secondary/
   pre-college/teen, AND has empty eligibility fields" → 21 more candidates, almost all
   false positives (pre-college programs whose text just doesn't happen to use the exact
   phrase "high school"). This is the pass that surfaced LSE Summer School as a genuine
   open question.

Every candidate was read in full (not just the matched snippet) before being classified.
Two were re-verified against their live official page rather than decided from stored
text alone, per this fleet's own standing rule (a row's own stored text is not an
independently re-verified source).

## Confirmed mismatch — recommend disable (SQL prepared, reversible)

**Hochschule Bremen (HSB) City University of Applied Sciences** (`8f6e438f-…`) — graduate
M.Sc. programme in Engineering and Management of Space Systems. Confirmed by fetching the
stored `official_url` directly: requires a completed Bachelor's degree (or equivalent) and
B2 English — a realistic applicant is 21+. All three eligibility columns are empty, and
this row is **currently in the visible-289 set** (`cycle_status = 'unverified'`, not
excluded) — a real 14-year-old could be shown this today, not a hypothetical risk.
`status = 'disabled'` prepared, not a delete — reversible if this turns out to be wanted
for some future non-highschool surface.

That is the only row that met the full bar: empty fields, structurally impossible for
*every* age in the 14-18 band, currently live. The other four candidates below are named
individually because each could reasonably be read a different way — exactly the
"needs a decision, don't silently disable" case CEO asked for.

## Needs a decision (not disabled, not ruled out — genuine judgment calls)

**Türkiye Scholarships – Bachelor's Degree Programme** (`34033f8a-…`) — verified directly:
"Under 21 years of age" (matches the stored `maximum_age = 21`) **and** "Graduates or
those who will graduate at the end of the current academic year (before August)." A
14-16-year-old cannot use this — but a **current 12th grader graduating this year
genuinely can**, which is exactly the "senior transitioning to college" pattern CEO said
explicitly to keep, not disable. The real defect isn't that this row exists — it's that
`eligible_grades` is empty when it should be `['12']` (the same shape as the Cooke and
Coolidge scholarship rows elsewhere in the catalog, which already gate correctly to grade
12). That's an eligibility-fill fix, not a disable — flagging it here rather than folding
it into the Slice B pool unasked. Currently `cycle_status = 'closed'`, so not in the
live-289 set today regardless.

**LSE Summer School** (`0f466b31-…`) — the one candidate I could not resolve. Its
description gives no age/grade signal in either direction, its course levels are listed
as "100/200/300" (a numbering convention that at most UK universities denotes
undergraduate-year courses, unlike every genuinely-pre-college row in this catalog, which
all describe themselves in explicit "pre-college"/"secondary school"/named-age terms).
Three separate fetch attempts (the main page, the "how to apply" page, a guessed
"entry-requirements" page) all failed to surface LSE's own stated eligibility criteria —
the real answer is behind a collapsible section this fetch tool can't expand, or a page I
didn't find. I'm naming the circumstantial signal instead of guessing past it. Currently
`cycle_status = 'closed'`, so this is not a live risk today, which is exactly why it's
safe to leave as "needs a human to check" rather than force a call.

## Ruled out (checked, not actually a problem)

**Major League Hacking** (`c8cd2706-…`) — the query that surfaced this looked for
`minimum_age >= 19`, and MLH's stored `minimum_age = 19` is real (MLH's flagship
hackathon circuit is college-only). But that field is **already populated**, which means
the matching engine already correctly excludes every 14-18-year-old from this row today —
this is not the "empty field masks a mismatch" failure CEO named, it's a row that's
already doing its job. A live re-check also found MLH's own event listing tags some
individual hackathons (JAMHacks 10, MasseyHacks) `HIGH SCHOOL` — meaning the platform
itself is a multi-event bundle, not a uniform gate, similar to the Battle Code MIT
bundling in Slice A. No action recommended; noted so it doesn't get re-flagged by a
future pass over the same `minimum_age >= 19` signal.

**~40 more candidates checked individually and confirmed legitimate** — the large
majority of the original 47+21 candidates. Common shapes, none requiring action:
- Pre-college programs that mention "alongside current undergraduates" or "college life"
  as a description of the classroom experience, not a participant requirement (NYU
  Precollege, Purdue Thinksummer, Georgetown Summer, Sutton Trust, Harvard SSP, Penn
  Pre-College, and a dozen more like them — every one of these already states or implies
  a high-school-age population elsewhere in its own text).
- Genuinely mixed HS-and-college populations, where high schoolers are explicitly named
  as eligible alongside (not instead of) college students — AJSR, ASSIP, Harvard CURE,
  UChicago Summer Session, JAX Summer Student Program, UK Chemistry Olympiad (whose
  "college students" means UK sixth-form/further-education colleges, not universities —
  a terminology false-positive worth naming so it isn't miscounted next time). These are
  exactly the "high school senior + college freshman" pattern CEO said to keep.
- Org names containing "Undergraduate" that describe who *runs* the program, not who
  attends it (Harvard Pre-Collegiate Economics Challenge, run by the Harvard
  Undergraduate Economics Association; the program itself is "pre-collegiate").
- Lumiere Education — re-verified live; its own stated mission is "high school students
  around the world," confirming the earlier keyword match was a false positive.
- LIYSF (London International Youth Science Forum) — ages 16-21 stated explicitly. Not a
  mismatch (16-18 genuinely fits), just a partial-overlap case that needs an eligibility
  *fill*, not a disable — noted for completeness, not actioned here.

## Scale

**367 active opportunities total, 289 currently visible to students. One confirmed,
currently-live structural mismatch (Hochschule Bremen). One already-self-correcting
non-issue (MLH). Two genuine judgment calls, neither currently live.** This audit did not
find a large hidden cluster — the catalog is, on this evidence, well-curated for a 14-18
audience already; the danger CEO named is real but narrow. Reporting that directly rather
than padding the disable list to make the finding look bigger than it is.
