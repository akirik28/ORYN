# Does `discover_opportunities` fill eligibility data, or is today's fill effort a leaking bucket?

**Status: measurement only, per explicit instruction ("Ölç, kod yazma"). No code changed.**

CEO's dispatch: today three lanes filled `minimum_age`/`eligible_grades`/`eligible_countries`
for 190+96=286 existing opportunities. `discover_opportunities` is not yet armed via cron, but
will start adding new opportunities once it is. If it adds them with eligibility data empty,
today's fill effort is a bucket that refills forever; if it fills that data itself, today's 286
is a one-time historical backlog. Three explicit questions, answered below in order.

## Q1 — What fields does the discovery pipeline actually write?

Traced the full chain: `lib/ai/opportunity-extraction.ts` (`OpportunityCandidateSchema`, the AI
extraction contract) → `lib/opportunities/discover.ts` (the insert).

**`OpportunityCandidateSchema` has no `eligibleGrades` field at all.** Its full field list:
`isRealOpportunity, title, organization, description, category, country, remoteAllowed,
minimumAge, maximumAge, eligibleCountries, fields, cost, fundingAvailable, deadline, startDate,
endDate, applicationUrl`. This isn't a mapping gap at insert time — the model is never asked to
determine grade eligibility in the first place.

The insert in `discover.ts` writes exactly the candidate fields the schema produces:

```ts
minimum_age: candidate.minimumAge,
maximum_age: candidate.maximumAge,
eligible_countries: candidate.eligibleCountries,
```

`eligible_grades` is absent from the insert object entirely. Since `Opportunity.eligible_grades`
is typed `string[]` (non-nullable) in [`types/database.ts:1774`](types/database.ts:1774), the
column must carry a `NOT NULL DEFAULT '{}'` at the DB level — so a discovery-created row doesn't
get a wrong value, it gets the same empty array every genuinely-unresearched row gets. No false
claim is made; the row is just indistinguishable from "nobody has looked," forever, because
nothing downstream ever revisits it for this specific field.

The insert also writes nothing to any of the later honest-default eligibility columns added by
migrations 0047/0059/0060/0103/0126/0129/0133 (`eligible_citizenships`, `access_channel`,
`country_eligibility_confirmed_open`, `age_eligibility_confirmed_open`,
`grade_eligibility_confirmed_open`, `age_eligibility_basis`, `grade_eligibility_basis`,
`country_eligibility_basis`, `source_verified_at`, etc.) — all fall back to their column
defaults (`false`/`null`), which is the correct, honest behavior for an unresearched field, not
a gap specific to this pipeline.

**Answer: `minimum_age`, `maximum_age`, `eligible_countries` are attempted (present in both the
AI schema and the insert). `eligible_grades` is never attempted — absent from the AI schema
itself, not just the insert.**

## Q2 — Live evidence: can discovery-produced rows be distinguished by `source`?

`discover.ts` hardcodes `source: "tavily"` as a literal on every row it inserts, plus a
companion `opportunity_sources` row with `source_type: "web_search"`. Queried both live
(project `qtcvcflzxbuagvvwahhu`, `oryn-qa-scratch`):

```sql
select source, count(*) as total,
  count(*) filter (where minimum_age is not null) as has_min_age,
  count(*) filter (where eligible_grades is not null and array_length(eligible_grades,1) > 0) as has_eligible_grades,
  count(*) filter (where eligible_countries is not null and array_length(eligible_countries,1) > 0) as has_eligible_countries
from opportunities group by source order by total desc;
```

422 total live opportunities across **17 distinct `source` values** — zero of them is `tavily`,
and a case-insensitive `ilike '%tavily%'` / `ilike '%discover%'` sweep across the whole table
also returned zero rows. The companion table tells the same story: `opportunity_sources` has 382
rows total, **zero** with `source_type = 'web_search'`.

| source | total | has min_age | has eligible_grades | has eligible_countries |
|---|---:|---:|---:|---:|
| Founder school-counselor Drive corpus (cross-checked 2026-08-15) | 214 | 10 | 6 | 1 |
| official_primary | 171 | 73 | 77 | 36 |
| UK Mathematics Trust (direct fetch) | 14 | 0 | 0 | 0 |
| manual_research | 10 | 6 | 7 | 0 |
| 13 single-organization "official site, direct fetch" sources | 13 | 1 | 6 | 4 |
| **Total** | **422** | **90 (21%)** | **97 (23%)** | **40 (9.5%)** |

**Answer: yes, unambiguously — `source = 'tavily'` would identify a discovery-produced row, and
zero live rows carry it.** `discover_opportunities` has not merely been throttled or run
infrequently; by this evidence it has never successfully inserted a single row into this
database. Every one of the 422 live opportunities traces to a curated Drive corpus, a hand-
verified "official_primary" pass, or an individually-checked official-site fetch — none of it
automated discovery output.

This directly answers the "other 45" question: CEO's cited 190-opportunity batch (145 from the
Drive corpus) cannot have drawn its remaining ~45 from discovery, because discovery's signature
appears nowhere in this table. Whichever specific rows they were, they came from one of the
other 16 real source values above — most likely `official_primary` (171 rows, the largest
non-Drive-corpus source) or `manual_research` — not from `discover_opportunities`. I can't
reconstruct the exact pre-fill 190-row snapshot from a live table (that figure was presumably a
point-in-time measurement made earlier today by another lane, before this session's fill
lanes ran), but the source-distribution evidence rules out discovery as the origin of any part
of it.

## Q3 — Is the 45's fill rate different from the manually-filled ones?

**Not measurable as framed — n=0.** There is no discovery-sourced population currently in the
live database to compare against the manually-sourced one. This isn't an inconclusive
measurement; it's a direct consequence of the Q2 finding. Reframing the comparison to something
that *is* answerable now, before any live discovery run: which fields does the pipeline even
attempt, versus never attempt (Q1's answer) — that's knowable today and is the more decision-
relevant question, since it doesn't depend on data that doesn't exist yet.

## Synthesis — this isn't quite either of CEO's two framed outcomes

CEO's framing was binary: discovery adds opportunities empty (today's fill is a bucket that
refills forever) or discovery already fills them (today's 286 is a one-time backlog, done when
cleared). The evidence supports a third, more precise answer that mixes both:

**Not currently leaking, because it has never run.** Today's 190+96=286 fill was against
opportunities that are, without exception, curated or hand-verified. With respect to the actual
live data, today's effort is a clean historical backlog — zero of it will be undone by anything
discovery has already done, because discovery has done nothing here yet.

**Will leak, guaranteed and by construction, specifically on `eligible_grades`, the moment cron
is armed.** This is not a probabilistic risk to be measured after the fact — it's structural.
The AI is never asked to extract grade eligibility, so every future discovery-created row will
carry an empty `eligible_grades` forever, regardless of how clearly the source page states grade
eligibility, until the extraction schema itself is extended. No amount of re-running the
pipeline fixes this without a code change.

**May also under-fill `minimum_age`/`maximum_age`/`eligible_countries`, but this is a genuinely
different, empirical risk.** The pipeline does attempt these three — they're in both the
extraction schema and the insert — so whether they actually get populated depends on how often
the AI finds these facts stated on a typical discovered page. That success rate is unmeasured
and unmeasurable without a live run; it is not a guaranteed-zero the way `eligible_grades` is.

**One more thing worth flagging, not asked but adjacent**: today's fill was itself a manual/
semi-manual one-time pass (sources: Drive corpus, `official_primary`, `manual_research`,
individual official-site fetches) — there is no existing *automated, repeating* job that fills
`eligible_grades` for any opportunity, discovery-sourced or not. Even after fixing the
extraction schema gap above, a newly-discovered opportunity would still need some equivalent of
today's fill pass to reach the same completeness as the current catalog — the gap isn't only
"discovery doesn't fill this," it's "nothing does, on a recurring basis." Current catalog-wide
fill rates, for context, are already low even after today's effort: `minimum_age` 21%,
`eligible_grades` 23%, `eligible_countries` 9.5% (90/97/40 of 422 — table above).

## What this changes about arming cron

Not my call to make, per the measurement-only instruction — but the evidence says the two
outcomes CEO named aren't actually in tension the way the dispatch framed them. Arming cron
today would not "reopen" the age/country gap today's effort closed (no discovery rows exist to
have reopened anything), but it would open a **new, permanent, 100%-guaranteed gap** in
`eligible_grades` specifically, on every opportunity discovery adds from that point forward —
distinguishable from the other two fields' gap, which is a real but unmeasured risk rather than
a certainty.
