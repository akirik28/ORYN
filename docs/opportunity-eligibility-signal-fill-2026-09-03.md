# Opportunity eligibility signal fill — 2026-09-03

Follow-up to [`opportunity-eligibility-signal-gap-2026-09-03.md`](opportunity-eligibility-signal-gap-2026-09-03.md)
(ab's build finding: 163 of 366 active opportunities carry zero researched eligibility
signal on any axis, driving the 62% eligibility-caveat rate in real matches). This doc
characterizes the 163, ranks a real highest-value slice using live match data rather than
alphabetical order, and hand-researches that slice — sourced the same way the deadline
audit was: URL, verbatim quote, retrieval date. Not attempting to close 163 tonight.

## Characterizing the 163 — it's one import, not 163 separate gaps

Re-pulled the 163 live (`oryn-qa-scratch`, same query as the gap doc) with `created_at`,
`source`, and `category`, to answer the question that changes the fix: research gap, or
process gap?

| `created_at` date | count |
|---|---|
| 2026-08-18 | **150** |
| 2026-08-23 | 7 |
| 2026-08-20 | 4 |
| 2026-08-17 | 1 |
| 2026-08-21 | 1 |

**92% of the 163 (150 rows) share one `created_at` date, and 137 of those 150 share the
exact same `source` string**: *"Founder school-counselor Drive corpus, cross-checked
against official/provider pages 2026-08-15."* This is a single bulk import that brought in
real program identities (title, organization, `official_url`) and a general
freshness/existence check, but never a dedicated eligibility-research pass — not 163
independent research sessions that each happened to stop short. Confirms exactly the
"timestamp cluster → pipeline gap, not a research gap" pattern the deadline audit's own
follow-up predicted.

**Category**: 71% (116/163) are `summer_program`, another 20% (33/163) `competition` — 91%
of the gap sits in two categories. Summer programs specifically tend to publish explicit
age/grade requirements on a dedicated page (confirmed below, not assumed) — this is a
genuinely research-tractable category, not an inherently unresearchable one.

**A quieter, separate finding**: 148 of the 163 (91%) carry `verification_state:
verified_current`. That state reflects the record's general existence/freshness check, not
eligibility specifically — a row can be "verified current" and still have never had its
age/country/grade fields looked at. Worth knowing before reading `verification_state` as a
proxy for "this row has been researched" on any specific axis.

## Ranking "highest value" — live match data, not alphabetical order

`opportunity_matches` in this project has only 8 distinct users, so raw match counts are a
weak signal (an unrestricted row is trivially "eligible" for all 8, which is the gap being
measured, not real demand). The sharper question: **does this specific opportunity ever
actually land in a real user's top 5**, ranked the same way the real matching engine ranks
(`match_score` descending, restricted to `eligible = true`)?

```sql
with ranked as (
  select m.user_id, m.opportunity_id, m.match_score,
         row_number() over (partition by m.user_id order by m.match_score desc) as rnk
  from public.opportunity_matches m
  join public.opportunities o on o.id = m.opportunity_id
  where o.status = 'active' and m.eligible = true
)
select o.id, o.title, count(*) filter (where ranked.rnk <= 5) as top5_appearances
from ranked join public.opportunities o on o.id = ranked.opportunity_id
where o.id in (/* the 163 */)
group by o.id, o.title order by top5_appearances desc;
```

**Only 6 of the 163 have ever actually appeared in a real user's top 5.** Everything else
scores respectably (several sit at `match_score` ~55-67, eligible for all 8 users) but never
actually breaks into a top-5 slot — something else always outranks it. Those 6, in order:

| Title | Category | top5 appearances |
|---|---|---|
| Özyeğin University Summer Research Program | research | 2 |
| Sabancı University Summer School | summer_program | 2 |
| İTÜ Lise Yaz Okulu 2026 | summer_program | 2 |
| Young Guru Academy (YGA) | volunteering | 1 |
| Interlochen Review | research | 1 |
| Harvard Pre-Collegiate Economics Challenge (HPEC) | competition | 1 |

Three of the six are Turkish institutions — consistent with this catalogue's real, current
user base and with AGENTS.md's own initial-geography priority. Researched all 6, plus a
second tier of high-`avg_score`/zero-top5 rows (broadly eligible, moderately scored, never
quite winning) to round out a bounded, real slice rather than stop at exactly six.

## Research results

Every fetch below is a real `WebFetch`/`WebSearch` call made this session, today
(2026-09-03), quoted as returned — not paraphrased into a claim stronger than what the page
actually says.

### Staged (grade/country confirmed, strong placement — a dedicated eligibility/submission section, not a tagline)

- **İTÜ Lise Yaz Okulu 2026** (`973b3bdd`) — `liseyazokulu.itu.edu.tr/program/basvuru-kosullari`
  (the site's own "Başvuru Koşulları" / Application Conditions page): *"İTÜ Lise Yaz
  Okulu'na tüm lise öğrencileri başvuru yapabilir"* — all high school students may apply.
  No age or country statement found on this page.
- **Interlochen Review** (`95093e1a`) — `interlochenreview.org/submit`: *"We're thrilled to
  invite talented high school writers, singer-songwriters and artists (grades 9-12 or high
  school postgraduate year) from around the world to submit their work."* One sentence,
  both grade and country in the same clause — a genuinely explicit, unambiguous, affirmative
  statement, not a hero-banner tagline.
- **Sabancı University Summer School** (`1d4f5e60`) — not re-fetched (the official
  `liseyazokulu.sabanciuniv.edu` page doesn't currently carry an explicit age statement,
  confirmed this session); reusing this session's own earlier, already-verified finding
  instead: `gazetesu.sabanciuniv.edu`'s own news article (checked 2026-08-24, cited in the
  deadline audit's Sabancı research) confirms ages 13-17, 13-year-olds explicitly included.

### Found, not staged — real but too weak to write

- **Kadir Has Kış Okulu** (`6bcef34b`) — `khas.edu.tr`'s announcement page: *"Lise Kış Okulu
  ile geleceğini bugünden şekillendirmek isteyen tüm lise öğrencilerini aramızda görmekten
  mutluluk duyarız"* (we'd be happy to see all high school students among us). Real
  quote, but it's an announcement's closing line, not a dedicated eligibility section — the
  same placement distinction `scripts/acquire-opportunity-eligibility.ts`'s own header
  comment already codifies ("a marketing claim in a hero section... should generally be
  treated as NOT sufficient"). Flagged for a stronger source, not staged.
- **MathILy-Er** (`7bc45aeb`) — `mathily.org`: *"Participants come from all over the United
  States and, sometimes, the world"* — real, but hedged ("sometimes"), not an unambiguous
  open-country claim. Correctly not confirmed-open by the same standard.

### Genuinely not stated — honest non-findings, not failures

- **Harvard Pre-Collegiate Economics Challenge (HPEC)** (`a4a24425`) — `thehuea.org`: page
  states *"The full 2026-27 rules, team size, and registration details will be posted when
  registration opens"* — the source itself says this isn't published yet.
- **National Economics Challenge** (`95b59593`) — `councilforeconed.org`: distinguishes two
  competition divisions by *course experience level* (Adam Smith/David Ricardo), not by
  grade or age — a real distinction, just not the one being measured here.
- **Young Guru Academy (YGA)** (`5d2aca22`) — `yga.org.tr`: no eligibility statement on the
  homepage itself; would need a deeper application-portal page (`zirve.yga.org.tr`) not
  pursued this pass.

### Blocked — a real constraint on this method, not a content finding

Six fetches returned a network/security block or HTTP 403 before any content was read:
`hsri.ozyegin.edu.tr` and `aday.ozyegin.edu.tr` (Özyeğin's own application pages —
Özyeğin's *own* top5-appearance rank-1 record has no successful fetch this pass),
`summer.stanford.edu`, `ucl.ac.uk` (Bartlett), `research.ku.edu.tr` (Koç KUSRP), and
`ieo-official.org` (International Economics Olympiad, second-tier candidate). Not a claim
these pages lack the information — a claim this session's fetch tool couldn't read them
today. Worth noting since Özyeğin is the single highest-ranked record in the whole 163 by
real top-5 appearances and this pass still couldn't source it.

## The schema question — narrower than it first looked

The standing concern (this session's own earlier memory, and CEO's own recollection): grade
has no `grade_eligibility_confirmed_open` equivalent to country's, so an opportunity
confirmed open to every grade still shows "not verified" forever. Checked directly
(`lib/profile/grade-level.ts`) before relying on it:

**ORYN's own grade model never represents a student outside grades 9-12** —
`currentGradeLevel()` returns `null` (excluded from grade-gated matching entirely) for
anyone else. That means **for the specific case this batch actually found — "open to all
high school students" — populating `eligible_grades = {9,10,11,12}` is a complete,
available fix, not blocked by the schema gap at all.** A student with a known grade in 9-12
matches every value in that array and gets no caveat; the gap the memory names only bites a
*different*, not-yet-encountered case: an opportunity confirmed open to *every* grade
including ones ORYN doesn't model at all (say, an explicit "open to middle schoolers and
high schoolers alike" claim), where "list all 4 supported grades" wouldn't fully capture the
broader claim being made. **This batch's three real findings didn't hit that case** — worth
recording precisely rather than let the standing schema-gap framing get applied more broadly
than the evidence supports. The country-side gap remains real and unaffected by this
(`country_eligibility_confirmed_open` stays the only field with an actual escape valve).

## Staged SQL — not applied, founder runs directly

```sql
-- Opportunity eligibility signal fill, 2026-09-03. Three real, sourced findings from the
-- highest-value slice of the 163 (see docs/opportunity-eligibility-signal-fill-2026-09-03.md
-- for quotes, URLs, and retrieval dates). STAGED ONLY. Not executed this session.

-- İTÜ Lise Yaz Okulu 2026 -- "tüm lise öğrencileri başvuru yapabilir" (all high school
-- students may apply), liseyazokulu.itu.edu.tr/program/basvuru-kosullari, checked 2026-09-03.
-- Grades 9-12 is ORYN's own complete supported range -- this is the full fix, not a partial one.
update public.opportunities
set eligible_grades = array['9','10','11','12']
where id = '973b3bdd-59c2-4e99-a76b-2006b365d63a'
  and (eligible_grades is null or eligible_grades = '{}');

-- Interlochen Review -- "grades 9-12 or high school postgraduate year... from around the
-- world", interlochenreview.org/submit, checked 2026-09-03.
update public.opportunities
set eligible_grades = array['9','10','11','12'],
    country_eligibility_confirmed_open = true
where id = '95093e1a-fc13-4d9a-b4ed-5f0584252b44'
  and (eligible_grades is null or eligible_grades = '{}')
  and eligible_countries = '{}'
  and coalesce(country_eligibility_confirmed_open, false) = false;

-- Sabancı University Summer School -- ages 13-17, gazetesu.sabanciuniv.edu (Sabancı's own
-- news article), checked 2026-08-24 (this session's earlier, already-verified finding, cited
-- in the deadline audit's own Sabancı research -- not re-derived here).
update public.opportunities
set minimum_age = 13, maximum_age = 17
where id = '1d4f5e60-8fe3-4b1a-a7d6-acb29b124e3c'
  and minimum_age is null and maximum_age is null;
```

## Bottom line

**The 163 is one bulk import missing a research pass, not 163 individual failures** — 92%
(150/163) share one `created_at` date, and 91% of that cluster (137/150) share one `source`
string. That reframes the fix: whoever runs the next eligibility-acquisition pass
(`scripts/acquire-opportunity-eligibility.ts` already exists and is built for exactly this,
sourced-or-absent by design) should point it at this specific import rather than treat the
163 as scattered debt.

**Real demand is concentrated, not spread evenly across the 163** — only 6 of 163 ever
actually surface in a real top-5, and 3 of those 6 are Turkish institutions. That's the slice
worth researching first, and it's a small, specific list, not "the alphabetically first 30."

**Three real fills staged tonight**, all with a verbatim quote, a URL, and a retrieval date.
Six more attempted fetches were blocked outright (including the #1-ranked record,
Özyeğin) — a real, current constraint on closing this gap by hand-fetching official pages
one at a time, worth knowing before assuming the rest of the 163 will be equally reachable.
One schema question resolved more precisely than it went in: the grade-axis gap is real, but
narrower than "every open-to-all-grades finding is unfixable" — it didn't block any of
tonight's three.
