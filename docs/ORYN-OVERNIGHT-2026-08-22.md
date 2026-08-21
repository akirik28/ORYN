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

## Still waiting on you

**`ANTHROPIC_API_KEY`.** The data layer had two very good days. `weekly_plans` and
`advisor_messages` are still zero — the layer that answers *what should I do next* has never run.

**Three decisions**, each with evidence attached rather than a hypothesis:

The **source-authority gate** rejects `teknofest.org`, `eyp.org.tr`, `thehague.thimun.org` and
`teensinai.com` — four of four organisers checked tonight, including Turkey's flagship
state-affiliated youth technology competition. It accepts an American university's summer camp.
The fix is an organiser-domain provenance field, not a lower evidence bar.

**Onboarding has three screens** where the spec sketches five. No Interests screen, and no CV
upload — which is the only entry point to the whole CV extraction pipeline.

**Migrations `0057` and `0058`** are written, validated and unapplied, awaiting your word.
