# The 2026-08-15 Drive-corpus import — what else it arrived missing

Follow-up to [`opportunity-eligibility-signal-fill-2026-09-03.md`](opportunity-eligibility-signal-fill-2026-09-03.md):
that doc found 137 of the 163 eligibility-gap rows share one exact `source` string. This
checks the actual import itself — every row carrying that source, not just its overlap with
the eligibility gap — against every other structured field, to answer CEO's question
directly: is this one import's worth of gaps, or four/five separate ones that happen to
share a source. One characterization query, not a new research pass.

## The import, precisely

```sql
select count(*), left(created_at::text,10) as created_date
from public.opportunities
where status = 'active'
  and source = 'Founder school-counselor Drive corpus, cross-checked against official/provider pages 2026-08-15'
group by 2;
```

**163 rows, all sharing this exact `source` string, all sharing the same `created_at` date
(2026-08-18).** A clean, atomic, single import — not an approximation. (This total happens
to equal the eligibility-gap doc's own 163; the two are related but not identical sets —
137 rows overlap, 26 rows are in this import but already have some eligibility signal from
later work, 26 rows are in the eligibility gap but came from elsewhere. Both real, both 163,
independently.)

## What's missing, across the same 163 rows

| Field | Missing | % |
|---|---|---|
| `fields` (subject tags) | 147 | 90% |
| `selectivity_tier` (unknown/null) | 144 | 88% |
| `deadline` | 141 | 87% |
| `cost` | 139 | 85% |
| Eligibility (country/citizenship/grade/age, no confirmed-open) | 137 | 84% |

## What's *not* missing — this isn't a garbage import

| Field | Populated |
|---|---|
| `organization` | 163/163 — 100% |
| `official_url` | 163/163 — 100% |
| `description` | 163/163 — 100% |
| Has *some* verification timestamp (`last_verified_at` or `verified_at`) | 163/163 — 100% |
| `verification_state = verified_current` | 147/163 — 90% |
| `cycle_status` is a real value, not `unverified` | 152/163 — 93% |

## What this means

**One fix, not four or five.** Cost, deadline, selectivity, subject tags, and eligibility
are five structurally different columns, populated by five different research steps in
every pipeline this session has read tonight (the DLOPP batch treats them as entirely
separate `MonotonicityCheck`s; `acquire-opportunity-eligibility.ts` only ever touches
eligibility). Finding all five empty on the *same* 163 rows, sourced from the *same* import,
created on the *same* day, isn't five coincidentally-overlapping backlogs — it's one import
that wrote real program identity (org, URL, description — all 100%) and a general existence
check (verification timestamp, 100%; `cycle_status`, 93%) but never ran any of the five
structured-research passes at all. Whoever schedules the next research lane against this
import gets to treat it as one 163-row job with five output columns, not four separate
163-ish-row jobs independently discovered by four different future audits the way tonight's
was.

**Not measured here, flagged for whoever picks this up**: whether the same rows are missing
signal on axes this pass didn't check (`minimum_age`/`maximum_age` specifically beyond the
eligibility rollup, `remote_allowed`, `financial_aid_available`, `citizenship_restrictions`
prose vs. structured) — the five above were CEO's own named candidates plus the two already
measured tonight; a genuinely exhaustive column-by-column sweep wasn't run.
