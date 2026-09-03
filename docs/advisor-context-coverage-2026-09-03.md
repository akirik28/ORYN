# What the advisor actually knows about a student (2026-09-03)

Measurement only, per oryn-a7's dispatch. No code changed. Scope: `buildStudentAdvisorContext` /
`formatContextForPrompt` (lib/ai/student-context.ts) — the assembler spec Phase 8.1 describes —
plus the two paths that consume it (`lib/ai/advisor-chat.ts` for chat, `lib/ai/weekly-plan.ts`
for the weekly plan; both call the exact same `formatContextForPrompt`, so every finding below
applies to both, not just chat).

Live counts below are from `oryn-qa-scratch` (project `qtcvcflzxbuagvvwahhu`), read-only,
2026-09-03. 8 onboarded profiles, 14 `advisor_chat` calls total — this is a QA/fixture-heavy
dataset, not real production volume, so treat the *shape* of every finding as the point and the
dollar figures as illustrative, not a real forecast.

## The headline finding: six fact categories are already paid for and thrown away

`buildStudentAdvisorContext` calls `assembleScoringFacts`, which fetches **every** row the
scoring engine reads — `educationRecords`, `courses`, `testScores`, `certifications`,
`volunteeringExperiences`, `workExperiences`, plus the five categories that do reach the advisor
(`activities`, `projects`, `researchExperiences`, `awards`, `goals`). Two of the dropped six
(`educationRecords`/`courses`/`testScores`, specifically) directly feed the Academics and
Intellectual Curiosity dimension scores (`lib/scoring/dimensions/academics.ts:54,65,76,83`,
`intellectual-curiosity.ts:11`) — the raw facts are read, scored, and then never carried from
`facts` into `StudentAdvisorContext`. The other three
(`certifications`/`volunteeringExperiences`/`workExperiences`) are fetched into `facts` and
simply never referenced again anywhere in `student-context.ts`.

This is the cheapest possible gap to close, cost-wise: the DB round-trip already happens on
every single call (chat and weekly-plan both). The only marginal cost of surfacing any of these
is prompt tokens, not a new query.

What this looks like on a real (fixture) profile — Robert College, IB Diploma, HL
Economics/Math AA/English, GPA 3.82/4.0; SAT 1470 (Math 780, R&W 690); IELTS 7.5; IB predicted
38/45; a HarvardX CS50x certificate; a weekend numeracy-volunteering role; a summer operations
internship at Getir. Today the advisor sees none of that. It sees `Academics: 82/100,
confidence: high` (an illustrative score) and nothing that explains it. It cannot say "your SAT
math is a real strength but IELTS may be a soft spot for UK direct-entry," cannot say "you have
five HL/SL courses logged, a sixth would round out the profile," cannot say "you have a paid
internship — that's real signal, don't undersell it in essays." Phase 6.2 of the spec names GPA,
rigor, and standardized testing as the primary academic-score inputs; Phase 62's own worked
example ("Research is currently your weakest... at 42/100... your target Economics programs
value academic curiosity") is exactly the kind of concrete, evidence-citing sentence the advisor
cannot currently produce for academics, because it has the score and none of the evidence.

## Everything else, inventoried

| Spec 8.1 field | Fetched into `StudentAdvisorContext`? | Rendered to the model? | Note |
|---|---|---|---|
| `student` | Yes | Mostly | see below |
| `education`/`academics` (raw) | **No** — see headline finding | No | fetched into `facts`, dropped before the context object |
| `profileScores` | Yes | Yes, fully | exceeds spec — state + confidence, not just a number |
| `activities` | Yes | Yes | |
| `projects` | Yes | Yes | |
| `research` | Yes | Yes | |
| `awards` | Yes | Yes | |
| `goals` | Yes | Partially | title only; `category` is fetched and dropped |
| `targetUniversities` | Yes | Yes | but `programId` is never resolved to a program name — see below |
| `upcomingDeadlines` | Yes | Yes | sourced from the unified Deadline Engine, good coverage |
| `savedOpportunities` | **No** (as such) | No (as such) | see below — a related but different mechanism exists |
| `recentActions` | Yes (`recentActionOutcomes` + `recentRecommendationTitles`) | Yes | exceeds spec — structured status + reflection, not a flat list |
| `advisorHistorySummary` | N/A | N/A | see below — not a gap |

Fields inside `student` specifically: `displayName`, `graduationYear`, `curriculum`, `country`,
`weeklyTimeBudget`, `busyMode`/`busyModeUntil` all render. Three don't:

- **`schoolName`** — fetched, never rendered, no comment explaining why. Looks like an oversight,
  not a decision (contrast with `birthYear` below, which has one).
- **`birthYear`** — fetched, never rendered, *and documented*: the code comment (2026-09-02) says
  null on 4 of 11 onboarded profiles including the founder's own account; re-checked live just now
  and it's currently 2 of 8 (profile data has churned since that comment was written — this is a
  fast-moving fixture DB). Same conclusion either way: a quarter to a third of onboarded profiles
  have no birth year, `graduationYear` doesn't, so it was deliberately chosen as the signal that's
  actually present. Not a gap — a reasoned tradeoff, correctly explained in the code, just with a
  stale number in the comment worth a one-line refresh next time someone's in that file.
- **`citizenshipCountries`** — fetched, never rendered. Used elsewhere for Counselor Core
  eligibility gating (opportunity age/citizenship filters) — that's a real, separate consumer, so
  this isn't dead weight the way the six categories above are. Reasonable to leave out of prose;
  a citizenship list is a filter input, not something an advisor needs to narrate.

`interests` (`student_interests`) is fetched into the context object, typed, and then never
rendered by `formatContextForPrompt` — confirmed by reading every caller: `weekly-plan.ts` uses
the same formatter (so it's equally absent there), and `research-generator.ts`'s own interests
parameter comes from a caller-supplied argument at generation time, not from
`context.interests`. So a student who filled in "Economics, AI, Youth Employment" during
onboarding is never reminded of it by the advisor — it has to be re-derived from activity/project
titles instead, or asked again.

## `targetUniversities` never carries a program name

`getTargetUniversitiesForContext` selects `program_id` and passes it straight through
(`{id, universityId, programId, name, status, outlook}`) — `programId` is never joined against
`university_programs` to get an actual program title. The advisor can say "LSE (applying,
Competitive)" and never "LSE Economics" or "LSE, the BSc not the MSc." Live impact today is
exactly zero: `targets_with_program_id IS NOT NULL` = 0 across all 20 live target rows in this
project, so nothing is currently being silently mis-rendered. But the column and the UI path to
set it both exist (`addTargetUniversity(universityId, programId)`), so this is a real latent gap,
not a hypothetical one — it just hasn't been exercised by live data yet.

## `savedOpportunities`: a related mechanism exists, but it isn't this

Spec 8.1 names `savedOpportunities` as its own context field. There's no direct equivalent.
What exists instead: `lib/ai/opportunity-context.ts`'s `buildOpportunityContextText`, called
separately in `advisor-chat.ts` (line 55) and appended after `formatContextForPrompt`'s output.
It sources from Counselor Core's *ranked, currently-relevant* recommendations
(`getCounselorRecommendations`), filtered to opportunity-sourced ones, capped at 8. A student's
own `saved_opportunities.status`/`not_interested_reason` do feed that ranking as a signal
(`lib/opportunities/matching.ts:113,371`), so a save does influence what shows up — but the
advisor only ever sees Counselor's *current top 8*, not the student's actual saved list. A saved
item that's fallen out of the top 8 (profile changed, or it was a low-relevance personal pick)
is invisible: "what did I save again, is the debate competition still worth it" has no path to a
grounded answer today. This is real plumbing (a `saved_opportunities` read + a render block),
not a free unhide — closer in cost shape to the program-name fix than to the six-category
finding above.

## Not a gap: conversation memory

Spec names `advisorHistorySummary`. What's built is better: `app/(app)/advisor/actions.ts`
fetches up to `MAX_HISTORY_TURNS = 40` real prior turns from the current conversation
(`status = 'complete'` only) and passes them as actual message history to the model, not a lossy
summary. This product "surfaces exactly one" conversation per student (existing comment,
`advisor-chat.ts`), so in practice this is full-fidelity memory of the whole relationship,
bounded. Nothing to add here.

## Cost per message

Rough, ~4 chars/token heuristic, not tokenizer-verified — good enough for a go/no-go decision,
not for a budget line. `ai_model_pricing` (migration `0100_ai_model_pricing.sql`, built and
merged this session) is **not yet applied** to `oryn-qa-scratch` — the table doesn't exist
there — so I can't read the founder's own configured live rate; the $ figures below use Anthropic's
public Sonnet-tier list price (~$3/M input tokens) as a labeled placeholder. Input tokens only —
everything below is prompt context, not model output.

| Addition | Per-row estimate | Typical live profile (today's avg, n=8) | A realistic full profile | Added tokens/message (realistic profile) |
|---|---|---|---|---|
| `educationRecords` | ~18 tok | 1.5 rows | 1 row | ~18 |
| `courses` | ~9 tok | 3 rows | 7 rows | ~63 |
| `testScores` | ~16 tok | 1.1 rows | 3 rows | ~48 |
| `certifications` | ~13 tok | 0.13 rows | 1.5 rows | ~20 |
| `volunteeringExperiences` | ~14 tok | 0.25 rows | 1.5 rows | ~21 |
| `workExperiences` | ~14 tok | 0.13 rows | 1 row | ~14 |
| **Six-category subtotal** | | | | **~184 tok/message** |
| `schoolName` | one clause | — | — | ~5 |
| `goals.category` | ~2 tok/goal | — | 2-3 goals | ~5 |
| `interests` | joined list | — | — | ~10-15 |
| **Cheap-fixes subtotal (already fetched, zero marginal DB cost)** | | | | **~205-210 tok/message** |
| `targetUniversities` program name | ~4 tok/target-with-program | 0 today | small | ~0 today, negligible even at scale |
| `savedOpportunities` as its own block (new plumbing, not a free unhide) | ~15-20 tok/item, capped ~5-8 | | | ~75-150 tok/message |

At the placeholder $3/M-input rate: the full ~210-token "everything already fetched, just
render it" bundle costs **≈$0.63 per 1,000 messages**. The `savedOpportunities` block, if built,
adds **≈$0.30-0.45 per 1,000 messages** on top, plus the engineering cost of the new read/render
(not a config flip like the rest of this list). At today's real volume (14 calls total, ever)
the monthly dollar impact of any of this is fractions of a cent — the number that matters is the
per-message shape above, scaled to whatever volume the founder is actually planning against.

For scale: the existing context block this would sit alongside (dimension states + activities/
projects/research/awards/sports/goals/targets/deadlines/checklist/recent-actions, excluding the
separate fixed system prompt and up to 40 turns of history) is very roughly 700-1,200 tokens for
a rich profile today. The six-category bundle is roughly a 15-25% addition to that block specifically.

## Bottom line

The context is not thin because the product doesn't collect the data — it collects all of it.
It's thin because `buildStudentAdvisorContext` stops carrying six already-fetched categories
forward, for reasons nothing in the file documents (contrast `birthYear`, which has one). That's
the one finding here that reads as a real oversight rather than a scoped decision, and it's also
the cheapest possible one to reverse: ~210 tokens/message, no new query, ~$0.63/1,000 messages
at list price. `savedOpportunities` and the target-university program name are real, smaller gaps
behind actual new plumbing rather than a rendering fix — worth doing, but a different kind of
decision than the six-category one.
