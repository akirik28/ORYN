# ORYN — overnight report, 2026-08-22

Written for the founder's morning. Every number measured against the live database or the
repository, not carried forward from an earlier estimate. In progress at time of writing —
lanes are still running.

---

## State

`main` is green: lint, typecheck, **1,774 tests across 117 files**. It was 1,155 tests
yesterday morning.

16 lanes ran overnight — 12 chat sessions and 4 background agents, plus this coordination
session merging and verifying.

---

## What landed

**The social layer is built and completely hidden.** Posts, visibility, moderation, an admin
removal path, a feature flag, and seven test files split along the axes that matter — +200 tests
on its own. Migration `0058` is written and deliberately **not applied**. There is no navigation
entry and no route a student can reach.

It is built to the minor-safety standard rather than having it bolted on afterwards: who can see
a post is an explicit stored decision, never an implicit default, because ORYN's users are 14-18
and a child's post must not be world-readable because nobody chose otherwise. The outstanding
legal-review questions are recorded with the migration.

Scope as you confirmed it — posts, likes, **messaging** and reposts, LinkedIn-shaped — is
recorded in the code so nobody deletes it later as dead code.

**Programme catalogues grew where they were emptiest.** Columbia 4 → 177, Oxford 4 → 52,
Cambridge 7 → 33. Wave 2 covering twelve more US universities is running.

**Every one of those was researched the hard way.** Oxford's URLs were read from each page's own
accessibility tree rather than constructed from a slug — which caught a real mismatch where
Oxford's own A-Z page names a course differently from its listing page. That single discipline
is what separates a real catalogue from the 605 rows we found tonight that only look populated.

**A privacy leak was closed.** One opportunity's URL carried a marketing-tracking parameter with
a real person's email address base64-encoded inside it, served to every user browsing that
opportunity. Found, audited corpus-wide (one row affected), stripped to the canonical page. It
was deliberately *not* copied to a backup table first — preserving someone's email address to
guard against a URL edit is the wrong trade.

---

## What the lanes found that changes the product

**Fourteen recorded source conflicts turned out to be six real ones.** Eight dissolved once
someone found the right authority instead of guessing:

CMU publishes three different deadline dates across three official sources — and all three are
correct. CMU shifts deadlines off weekends and holidays to the next business day, and that one
rule predicts all six disputed dates across three admission cycles. The Common Data Set reports
the *nominal* date, the catalog and live page report the *shifted* one.

Spain's UNEDasiss says 7 July while UC3M and UCM say 6 July at 14:00 — and the Comunidad de
Madrid's own calendar says 6 July at 14:00. UNEDasiss is a national credential service that owns
no region's admission calendar. Different levels of the system, not a disagreement.

Glasgow's 92 and Edinburgh's 4.5 are the same standard on two TOEFL scales during ETS's
two-year dual-reporting window. Resolving that as a conflict would have been a category error.

**Two of the resolutions came from refusing an easy answer.** Hamburg's disagreement was settled
against ETS's own published CEFR B2 floor — not against the fact that one page was updated in
2026 and the other in 2019. The lane flagged those dates and explicitly declined to use them,
so the conclusion rests on evidence rather than on a heuristic that happened to agree.

**Manchester's page is still wrong, and now precisely wrong.** It binds "15 October 2026" to
"September 2024 entry". UCAS owns that deadline and confirms 15 October 2026 for 2027 entry. So
the date is right and the entry year is wrong — two findings, both recorded, because a student
reading that page today is still misled even though we now know the correct answer.

---

## The pattern worth knowing

**Three lanes independently found that a plain fetch failing is not evidence a page is empty.**
Hamburg's programme pages render client-side and looked blank; Bocconi and Politecnico di Torino
hide their real content behind JS accordions; Ashoka returns 403 to automated fetching. In each
case the content is there for a human visitor.

One lane took this further and **disproved its own finding**: it had flagged 258 rows across two
universities as defective, then loaded them in a real browser, confirmed they were correct, and
reduced its own defect count. The "defect" was an artifact of its own measurement method.

**A fourth structural finding appeared three times in three countries:** eligibility constraints
that are structural rather than numeric. Ankara's high-demand programmes accept only TR-YÖS.
THIMUN registers delegates through schools, so a student whose school runs no MUN programme
cannot enter. Brookes Engage requires England residency plus school type plus means-testing.
Age, country and cost all say "eligible" for each, and ORYN would match a student who then hits
a wall the product never warned them about.

---

## The catalogue audit

**35% of programme rows carry a source URL that does not describe the programme.** Not missing —
misleading. A null URL would be honest; none of these are.

Manchester's 294 rows all point at one listing page. Bristol's 62 point at one subject index.
St Andrews' 87 pointed at a prior cycle — **repaired tonight**, all 87, verified against the
live catalogue.

**And the opportunities catalogue is honest but stale.** All 29 expired-but-still-active rows
describe real organisations with real, accurate historical deadlines. Nothing is fabricated
anywhere in any sample. What is missing is a state transition: nothing demotes an opportunity
when its cycle closes, so a student is shown things that closed months ago. Being built now.

---

## Later in the night

**Programmes reached 9,912 across 128 universities**, up from 664 yesterday morning. UvA went
4 → 330 and VU Amsterdam 0 → 163 — and the lane that did it took neither path the decision
document offered. It noticed all 489 records already carried their own programme URL, re-fetched
every one, and re-attested from the results: 489 of 489 returned 200 and self-identified both
programme and institution in their own page title; 366 language values were cross-checked
against each page's facts panel and all 366 agreed. **The original research was accurate all
along — only unreadable to a prose-matching gate.** Nothing was reworded and the gate was not
touched.

**1,043 misleading source URLs were repaired** across St Andrews, Manchester, Southampton,
Wisconsin-Madison and TU Dublin, with zero fabricated. Manchester looked like the worst case —
294 rows on one URL — and turned out among the easiest, because the university publishes a
machine-readable course feed nobody had looked for. **Volume of defect says nothing about
difficulty of repair.**

**Eleven counselor-knowledge documents** now distil what a good human counselor knows per
country, every claim tagged either verified against a corpus record or marked as background
researched to a different standard — so when the advisor comes alive it can tell what it knows
from what it believes.

## What the night was actually about

Reading the reports back, the same thing happened over and over in different clothes: **a
measurement that was correct and a conclusion that was wrong.**

Fourteen recorded source conflicts turned out to be six. Nine were two true statements about
different things — two cycles, two applicant populations, two levels of a national system, two
scales — filed as competing answers to one question. CMU publishes three different deadline
dates and all three are right, because it shifts deadlines off weekends and the Common Data Set
reports the unshifted one.

**And our own standing rule was citing the wrong case.** "Trust the newer page" is unsafe — true
— but Groningen was never the counterexample. Its two pages agree exactly; the original record
flattened a 2×2 table into a list and set two cells of the *same row* against each other. A
sixteen-month gap between two deadlines for one programme was never plausible, and that
implausibility was read as evidence of how bad the conflict was rather than as evidence the
comparison was malformed. The real counterexample is Heidelberg. Corrected, with the reasoning
recorded.

Twice, a lane disproved its own finding. One cleared 258 rows it had itself flagged as
defective, after loading them in a real browser and discovering the defect was an artifact of
its own query. Another traced a reported accessibility bug through a library's source and
concluded it was its own tooling — then recommended changing nothing. **A swarm that only
confirms its own findings is not verifying anything.**

## The research reached the product

**Programmes went from 664 yesterday morning to 13,191, across 139 universities.** Not because
more was researched — because what was researched finally landed.

Three batches were ingested and each was verified by *content*, not by count: the US in two
waves (2,345 rows) and the UK (934). Every row carries a real degree level and a real
per-programme URL; the UK's 972 rows have 972 distinct URLs between them. Zero orphans.

That check matters because I got it wrong earlier: I applied 1,254 requirement rows whose every
qualifier column came back null, having verified that the counts moved rather than that the
content arrived, and rolled the whole run back. **An outcome of "accepted" proves a row landed,
not that it landed complete.**

Three things stayed out on purpose. Dartmouth's 53 records are blocked by the authority gate
because its catalogue lives on a registrar-contracted vendor platform. 23 Turkish placement rows
collide because two real admission tracks map onto one programme row. And Michigan, CMU and UCLA
each need their old rows *retired* rather than supplemented — all three had every stored row
pointing at a single index page, and the pipeline can insert but not supersede.

## A security gap, and it was mine

Six backup tables I created during tonight's live fixes had row-level security disabled —
readable by any anonymous or authenticated client. A lane found them while doing something else
entirely and flagged rather than touched.

Closed: RLS on all six, no policy, so every client is denied while the service role can still
restore from them. Nothing dropped — an unreachable backup is still a backup, and deleting them
is a separate decision.

I wrote tens of thousands of rows tonight and verified the content of every batch. Nobody had
checked the tables I made along the way, including me.

## Still waiting on you

**`ANTHROPIC_API_KEY`.** The data layer had two very good days. `weekly_plans` and
`advisor_messages` are still zero — the layer that answers *what should I do next* has never run.

**Three decisions**, each with evidence attached rather than a hypothesis:

The **source-authority gate**, and the evidence is now overwhelming rather than illustrative.
It rejects TEKNOFEST, TEMA, Habitat Derneği, TEGV, EYP Türkiye, THIMUN, Teens in AI, EUNICE —
**the European Commission's own youth programme, and TÜBİTAK**, Turkey's national scientific
research council. TEMA's domain is vouched for by a Turkish ministry's own `.gov.tr` portal and
the gate rejects it anyway. Across one research batch the rejection rate was 88%; the University
of Vienna passes and TU Wien in the same city fails, purely on a `.ac.` infix.

A gate that rejects the European Commission and TÜBİTAK while accepting an American university's
summer camp is not implementing an evidence standard. It is implementing a domain-suffix
heuristic that happens to correlate with one in a single country.

**Nothing was hand-inserted past it.** Roughly 40 verified opportunity records are staged and
waiting. One decision lands all of them through the normal path. The fix is an organiser-domain
provenance field feeding the check that already accepts a caller-supplied domain list — not a
lower bar.

**Onboarding has three screens** where the spec sketches five. No Interests screen, and no CV
upload — which is the only entry point to the whole CV extraction pipeline.

**Migrations `0057` and `0058`** are written, validated and unapplied, awaiting your word.
