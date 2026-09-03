# Opportunity eligibility signal gap — measured 2026-09-03

Found while building the home page's rotating opportunity strip
(`features/dashboard/opportunity-strip.tsx`). Not a finding about that component — a finding
about the underlying catalogue that the component's design had to account for.

## The numbers

Queried directly against `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`), the live ORYN database,
2026-09-03.

**Catalogue level** — `opportunities` table, `status = 'active'`:

```sql
select
  count(*) filter (where status = 'active') as active_total,
  count(*) filter (where status = 'active'
    and eligible_countries = '{}'
    and coalesce(eligible_citizenships, '{}') = '{}'
    and coalesce(eligible_grades, '{}') = '{}'
    and minimum_age is null and maximum_age is null
    and citizenship_restrictions is null and residency_restrictions is null
    and coalesce(country_eligibility_confirmed_open, false) = false
  ) as fully_unresearched_eligibility,
  count(*) filter (where status = 'active'
    and (eligible_countries != '{}' or coalesce(eligible_citizenships,'{}') != '{}'
      or coalesce(eligible_grades,'{}') != '{}' or minimum_age is not null or maximum_age is not null)
  ) as has_at_least_one_structured_gate
from opportunities;
```

| | count |
|---|---|
| Active opportunities | **366** |
| Zero eligibility signal researched on *any* axis (country, citizenship, grade, age, and no free-text restriction, and not confirmed-open) | **163** (45%) |
| At least one structured gate present on at least one axis | 161 |

**Match level** — `opportunity_matches`, all users, all rows:

```sql
select
  count(*) as total_matches,
  count(*) filter (where eligible = true and eligibility_notes is not null) as eligible_true_with_caveat,
  count(*) filter (where eligible = true and eligibility_notes is null) as eligible_true_no_caveat,
  count(*) filter (where eligible = false) as eligible_false
from opportunity_matches;
```

| | count |
|---|---|
| Total match rows | 2,038 |
| `eligible: true`, carrying an eligibility caveat (`eligibility_notes` non-null) | **1,262 (62%)** |
| `eligible: true`, no caveat — genuinely confirmed on every restricted axis | 547 (27%) |
| `eligible: false` — a confirmed mismatch | 229 (11%) |

## What this means

`computeEligibility` (`lib/opportunities/matching.ts`) is behaving correctly — `eligible: true`
with a note is the honest answer when a restriction axis was never researched, not a bug. The
finding is that **62% of live match rows carry that honest-uncertainty shape**, which is a
statement about how much of the catalogue has actually been researched on
country/citizenship/grade/age, not about the matching logic itself.

One contributing detail, found the same session: the **grade axis has no equivalent to
`country_eligibility_confirmed_open`**. A country restriction can be marked "confirmed open,
no gate" and stay silent; an opportunity with no `eligible_grades` recorded at all *always*
produces a "grade eligibility not verified yet" note, with no way to mark "confirmed, open to
every grade." This isn't necessarily wrong (an unresearched field is genuinely unresearched),
but it means the 62% figure is partly driven by an axis that structurally cannot reach zero
without either real research or a second confirmed-open-style flag for grade.

## Why it matters for the home strip specifically

The strip is framed as the app's highest-confidence recommendation surface, and per-card it
already tells the truth (a caveat badge, never silence — see that component's own header
comment). But a surface where the majority of cards carry a caveat risks the caveat going
unread through habituation, and the founder's own framing of this slot as future ad inventory
makes a caveat-heavy strip a weaker thing to sell. The fix for that is not in the UI — it's
closing the underlying research gap.

## The concrete debt

**163 active opportunities have zero eligibility signal on any axis.** That is a specific,
bounded, workable backlog — closing even a fraction of it (starting with whichever share feed
the highest-traffic matches) directly lowers the 62% figure and the badge's real frequency.
Re-run the two queries above after any research pass to track progress; both are read-only and
safe to run anytime.
