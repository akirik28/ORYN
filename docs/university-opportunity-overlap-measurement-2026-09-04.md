# Does target_universities carry new signal beyond target_geographies + student_interests?

CEO's explicit branch: measure first, and if country + field both overlap nearly completely,
show it wouldn't change any ranking and stop there — that's the expected outcome. If low,
report back before building anything. **This came back low on country, and unmeasurable-as-framed
on field** — landing in the "we talk" branch, not the "task ends here" one.

## Method

Reused the real, already-shipped matching code rather than reimplementing country-alias logic
by hand: `isWithinTargetGeography` (`lib/opportunities/matching.ts:646`, landed today per CEO's
own note) is the exact function opportunity relevance already uses to expand
`target_geographies` into real countries. Pulled live data for every student with at least one
real `target_universities` row (8 students, 21 target rows — the same population D5/D8 already
established), ran it through that real function via a standalone script, not a hand-written SQL
approximation of its alias/region logic.

## 1. Country — measured, and it disagrees with the "probably high overlap" hypothesis

```
026e9295  geographies=["usa"]                targeted=["United States"]                          -> fully covered
46dd6f7e  geographies=["uk","turkey"]         targeted=["Turkey","United States"]                 -> NEW: United States
49de3083  geographies=["turkey"]              targeted=["Netherlands","United States"]            -> NEW: Netherlands, United States
6e2f0ff1  geographies=["uk","europe","usa"]   targeted=["Italy","Netherlands","United Kingdom"]   -> fully covered
7722ebe9  geographies=["usa","uk","europe"]   targeted=["Italy","Netherlands","United Kingdom"]   -> fully covered
96f3274c  geographies=["usa"]                 targeted=["United States"]                          -> fully covered
ccf2161e  geographies=["usa","uk"]            targeted=["United Kingdom","United States"]         -> fully covered
e9eba798  geographies=["usa"]                 targeted=["United States"]                          -> fully covered
```

**2 of 8 students (25%) have at least one targeted university's country NOT covered by their
stated `target_geographies`** — 4 of 21 individual target rows (19%). Not near-total overlap.
Concretely: a student who said "UK, Turkey" is also targeting MIT (US) — their stated geography
preference gives zero signal about that real, specific target. A student who said only "Turkey"
is targeting both MIT (US) and Erasmus (Netherlands) — neither covered at all.

## 2. Field — the intended measurement path is entirely empty, not merely low

```sql
select tu.user_id, tu.program_id, up.field
from target_universities tu
left join university_programs up on up.id = tu.program_id;
```
**0 of 21 target rows have `program_id` set.** Every real student target is university-level,
never program-specific — `university_programs.field` cannot answer "does the targeted
university's field overlap with this student's interests" for a single real row today, because
the join it would require doesn't exist for anyone.

**A proxy exists (`university_profile_metrics.research_topics_top5`) but is unreliable, not
just unhelpful — worth flagging on its own.** Pulled it for all 21 targeted universities
alongside each student's real `student_interests` and read them side by side. For at least 3 of
8 students, the top-5 topics show essentially zero relevance to genuinely business/
economics-focused interests, even though the target is a real, well-reasoned one:
- A student with interests `[Economics, Business, Computer Science, Mathematics,
  Entrepreneurship]` targeting Oxford and Caltech — both universities' top-5 topics are
  entirely genomics/astrophysics/particle-physics. Zero overlap.
- A student with interests `[Economics, Business, Politics]` targeting Amsterdam — top-5 topics
  are entirely astrophysics (pulsars, gamma-ray bursts, gravitational waves).
- A student with interests `[Mathematics, Computer Science, Economics]` targeting Caltech —
  same astro-heavy pattern.

This looks like a systematic property of how `research_topics_top5` was sourced (very plausibly
publication-count-weighted, which would naturally over-represent large physics/astronomy
collaborations regardless of a university's actual undergraduate strengths in a student's
field) rather than noise. **If this metric were used as the "field" side of a cross-link, it
would risk actively misleading rather than merely adding no new information** — the same shape
of risk as tonight's self-contradicting-badge findings, just in a different surface. Not
measured rigorously (free text, no controlled vocabulary, read qualitatively not counted) — this
is a flag for the next step, not a clean number the way the country side is.

Where topics were populated AND relevant, they clearly can be: Bocconi's top-5 (Corporate
Finance, Monetary Policy, Banking, Financial Markets) genuinely matches an Economics/
Entrepreneurship-interested student well, and Stanford's biology/immunology topics matched a
Biology/Medicine-interested student well. The signal isn't worthless — it's inconsistent
university-to-university in a way that would need real filtering before it's trustworthy.

## What this means for the "don't build" hypothesis

Not confirmed. Country overlap is real but partial (75% already covered, 25% genuinely new) —
enough that a straight "do nothing" isn't obviously right, but not so low that a full
scoring-engine change is obviously justified either. Field can't be assessed the way it was
framed at all; the one available proxy needs its own reliability work before it could safely
feed a ranking decision. Per CEO's own branching, this is the "we talk" outcome, not the
"task ends here" one — reporting back rather than building anything.

## The cheaper, separate option CEO named — not measured, kept in view

A non-scoring display ("opportunities in this country/field" on a university's own page) sidesteps
the field-reliability problem entirely — it doesn't need a trustworthy relevance *score*, just a
real, honestly-labeled list. Stays viable regardless of what this measurement found, and doesn't
touch the ranking engine at all. Not built here — measure-only per the assignment — but worth
weighing against the scoring-side option given what showed up above.

## What was not covered

- Didn't examine whether the 25%-new-country finding correlates with anything (e.g., students
  who set `target_geographies` before adding target universities, vs. after) — pure
  cross-sectional counts, no causal/sequencing read.
- Didn't check `research_topics_top5`'s actual sourcing method (OpenAlex-derived is a plausible
  guess based on the pattern, not confirmed by reading the ingestion code for this metric).
- Didn't measure whether this same country/field-overlap question looks different for the full
  1019-university corpus vs. just the 21 real targeted rows — deliberately scoped to real
  student data only, since that's what the ranking-change question actually depends on.
