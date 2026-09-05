# D2 opportunity fill — the visible-27 (2026-09-05)

CEO-confirmed scope: fill the 27 currently-gapped rows out of the 28 actually
visible (saved ∪ each student's real top-5, `home-strip.ts`'s own filter
chain). Not the whole 348-row raw stock — that comes after, per D3's own
"invisible column filled last" rule.

**Two files by design, per CEO's explicit dependency requirement**: this
research runs against a codebase where `age_eligibility_basis`,
`age_eligibility_confirmed_open`, `grade_eligibility_basis`,
`grade_eligibility_confirmed_open`, `country_eligibility_basis` do not exist
live yet (migrations 0126/0129/0133, merged to git, never applied to
`qtcvcflzxbuagvvwahhu`). `country_eligibility_confirmed_open` (0060) IS live.

- `d2-visible-fill-additions-2026-09-05.sql` — needs nothing beyond live
  columns: direct fills of `minimum_age`/`maximum_age`/`eligible_grades`/
  `eligible_countries`/`eligible_citizenships` where the official page states
  an explicit bound, plus `country_eligibility_confirmed_open=true` where the
  page makes an affirmative "open internationally" statement.
- `d2-visible-fill-requires-0126-0129-0133-2026-09-05.sql` — **CANNOT RUN
  until 0126, 0129, AND 0133 are applied to the live database first.** Every
  statement in this file targets `*_basis`/`*_confirmed_open` columns that do
  not exist yet. Packaging order per CEO: migrations first, this file second.

**Evidentiary rule, unchanged from the prior session's own bar**: a field only
gets filled from an explicit, positive statement on the actual official page
fetched. "The page doesn't say" -> `checked_not_stated` (0129/0133-dependent),
never a positive bound. A page that defers to a different, unfetched page for
the missing field -> left at `not_researched`, no SQL at all. "Doesn't state a
limit" and "has no limit" are never the same claim.

**Point 2 — the visible set is about to shift.** oryn-b1 is adding a
secondary sort key to `home-strip.ts`'s production query (fixing the exact
zero-tiebreaker gap the prior session's ranking-stability doc found). Once
that lands, today's visible-5-per-student will be stable but different from
today's. Recording per-row visibility context now so a re-measurement after
the fix can trace how many of today's 27 are still visible.

## Visibility context (student id · slot · match_score), captured before the tiebreaker fix

| Opportunity | Student | Slot | Score |
|---|---|---|---|
| Wharton Global HS Investment Competition | e9eba798 | 1 | 97 |
| Breakthrough Junior Challenge | 96f3274c | 3 | 43 |
| Breakthrough Junior Challenge | 49de3083 | 5 | 67 |
| Breakthrough Junior Challenge | 46dd6f7e | 5 | 67 |
| LaunchX | — (saved only, not in any student's top-5) | — | — |
| Yale Young Global Scholars | e9eba798 | 3 | 97 |
| Tufts Pre-College Programs (fully clean, no action) | e9eba798 | 5 | 73 |
| Harvard Pre-Collegiate Economics Challenge (HPEC) | e9eba798 | 2 | 97 |
| BRI Student Fellowship | 026e9295 | 1 | 73 |
| BRI Student Fellowship | ccf2161e | 2 | 73 |
| BRI Student Fellowship | 7722ebe9 | 2 | 67 |
| The Earth Prize Competition | 96f3274c | 1 | 43 |
| The Earth Prize Competition | 46dd6f7e | 3 | 67 |
| The Earth Prize Competition | 49de3083 | 3 | 67 |
| Istanbul Bilgi University HS Summer School | 49de3083 | 2 | 73 |
| Istanbul Bilgi University HS Summer School | 46dd6f7e | 2 | 73 |
| ODTÜ (METU) Engineering Summer School | 46dd6f7e | 1 | 73 |
| ODTÜ (METU) Engineering Summer School | 49de3083 | 1 | 73 |
| ODTÜ (METU) Engineering Summer School | 96f3274c | 5 | 43 |
| DECA Competitive Events Program | 96f3274c | 4 | 43 |
| TechGirls | 026e9295 | 3 | 73 |
| TechGirls | 7722ebe9 | 3 | 67 |
| TechGirls | ccf2161e | 3 | 73 |
| Girl Up Project Awards | — (saved only) | — | — |
| Schoolhouse.world Tutor Certification | ccf2161e | 5 | 59 |
| The Duke of Edinburgh's International Award — Türkiye | — (saved only) | — | — |
| New York Times Audio Stories Podcast Contest | 96f3274c | 2 | 43 |
| New York Times Audio Stories Podcast Contest | 49de3083 | 4 | 67 |
| New York Times Audio Stories Podcast Contest | 46dd6f7e | 4 | 67 |
| STEM Fellowship Journal | 026e9295 | 5 | 67 |
| Interlochen Review | 026e9295 | 4 | 67 |
| Interlochen Review | 7722ebe9 | 5 | 67 |
| Purdue University | 6e2f0ff1 | 5 | 67 |
| The Wall Street 101 Summer Pre-College Program | 6e2f0ff1 | 2 | 67 |
| Young Guru Academy (YGA) | ccf2161e | 4 | 67 |
| Dive Into Engineering! | 6e2f0ff1 | 4 | 67 |
| Student Science Training Program | 6e2f0ff1 | 3 | 67 |
| UCSB Research Mentorship Programs | 026e9295 | 2 | 73 |
| University of Applied Sciences Western Switzerland | 6e2f0ff1 | 1 | 67 |
| InvestIN - Immersive Career Experiences | 7722ebe9 | 4 | 67 |
| JA Company Programme (Europe) | 7722ebe9 | 1 | 78 |
| JA Company Programme (Europe) | ccf2161e | 1 | 75 |
| International Economics Olympiad (IEO) | e9eba798 | 4 | 91 |

(Three rows have no match-table row at all — visible only via
`saved_opportunities`: LaunchX, Girl Up Project Awards, Duke of Edinburgh
Türkiye. These are unaffected by the ranking-tiebreaker fix.)

## Research log

All 27 gapped rows researched (28th, Tufts Pre-College Programs, is the fully-clean row,
no action needed). Full per-row reasoning and exact source quotes live in the two SQL
files' own comments — this is the compact summary.

**Reused from the prior session's own prepared-but-never-applied SQL** (re-verified against
current live values before reuse, not trusted from memory): Yale Young Global Scholars
(age fill + grade correction), TechGirls (grade confirmed_open), IEO (age fill + country
checked_not_stated), HPEC (country checked_not_stated), METU (country checked_not_stated),
Interlochen Review (grade fill + country checked_not_stated — using the prior session's
own CORRECTED classification, not its first-draft confirmed_open=true that was later
withdrawn).

**Real fills/corrections from fresh research this pass**: Earth Prize (age 13-19), Purdue
(age, min 15), Wall Street 101 (grade 11-12, from "juniors and seniors" — not age, despite
the fetch tool's own summary calling it one), Student Science Training Program (age fill
16 + a real grade CORRECTION, 12→11, caught by re-checking the live value against the
source before writing anything).

**A real methodology catch, worth stating plainly**: the fetch tool repeatedly summarized a
grade-worded quote as an "age requirement" (Wall Street 101's "juniors and seniors",
Interlochen's "grades 9-12", the Switzerland camp's and InvestIN's own age-banded
program-description text). Every value in the SQL files was checked against the literal
quoted sentence, not the tool's own framing — this is what caught Wall Street 101 and
Interlochen specifically, where the honest answer for age is "not stated at all," not the
grade-derived number the summary implied.

**Left genuinely untouched, not guessed at**: Girl Up Project Awards, the NYT Podcast
Contest (nytimes.com blocked outright for this tool), and STEM Fellowship Journal (all
real fetch failures — 403 or blocked domain, not confirmed silence). InvestIN's grade
(the page bundles multiple programs with different age bands under one URL — not clear
which this DB row represents) and country (defers to an unfetched "international
students" page — the same finding the prior session already made). The Switzerland
camp's country (a visa-cost mention is real process information, not a policy statement
— same bucket-2 treatment the prior session gave Ross Mathematics/IE University).

**Two-file split, per CEO's explicit dependency instruction**:
`d2-visible-fill-additions-2026-09-05.sql` (no migration dependency) and
`d2-visible-fill-requires-0126-0129-0133-2026-09-05.sql` (needs all three migrations
applied first — stated at the top of that file, not just implied by its name).

## Post-merge re-check (2026-09-05, second pass): the ranking fix, and the badge defect

Merged as `2294f78d`. Ranking tiebreaker landed same day (`c7d7ffb2`, adds
`.order("id", {ascending: true})` after `match_score` in `home-strip.ts`). Re-ran the
identical visible-set query with the new stable ordering: **the set is byte-identical —
same 28 opportunities, same gap flags.** My own original query already used
`opportunity_id asc` as its tiebreak (matching the fix by coincidence, not by design),
so nothing rotated. This also confirms nothing has actually been applied to the live
database yet — not even the dependency-free additions file — since every gap flag that
was true before is still true now (e.g. Yale Young Global Scholars still shows
`age_gap: true`, meaning `minimum_age`/`maximum_age` are still null).

**CEO's third question — does a fill actually remove the badge — required reading the
render path, not re-running the gap query, since nothing's applied yet to observe
directly. Traced it to the source:**

`features/opportunities/opportunity-card.tsx:399` —
`{eligible && eligibilityNotes ? <StatusBadge label={t("eligibilityUnknown")}
tone="warning" /> : null}`. `eligibilityNotes` comes from
`lib/opportunities/matching.ts`'s `renderEligibilityNotes`, which returns `null` only
when the underlying `unknownNotes` array is empty — otherwise it joins EVERY note's
text together, regardless of which code produced it. Confirmed at the message-catalog
level too: `ageEligibilityCheckedNotStated`/`gradeEligibilityCheckedNotStated` (the
calm, "checked and genuinely silent" wording 0129 exists to produce) still populate a
real entry in that same array — they change WHICH sentence appears in the small grey
text below the badge (line 409), but do **not** stop the badge itself from firing,
because the badge's own condition never inspects which code fired, only whether the
array is non-empty.

**Consequence, computed precisely against this file's own two SQL files, not
guessed**: of the 27 researched rows, the badge will disappear ONLY for rows where
*every* dimension ends in a real resolved value (a populated bound, or
`country_eligibility_confirmed_open = true`) — zero `checked_not_stated` anywhere,
since even one is enough to keep the array non-empty. That's exactly **3 of 27**: Yale
Young Global Scholars, TechGirls, Student Science Training Program. The other **24**
rows get a real, honest, sourced improvement in the small print underneath (a calmer
sentence, a correct date) but the exact same orange "Not Verified" badge a student
sees at a glance today — no visible change at all for the majority of tonight's work,
once applied.

Not fixed here — this is the same shared-component defect another lane found
elsewhere today, CEO's own framing, and changing `opportunity-card.tsx`'s badge logic
is a decision with a wider blast radius (every opportunity card, not just these 27
rows) than this task's own scope. Reported precisely so CEO can decide who owns it and
whether the fill's real value gets communicated differently in the meantime (the small
print already does, today, once applied — just not the badge).
