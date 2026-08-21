# ORYN — day report, 2026-08-21

Written for the founder's 21:00 return. Every number here was measured against the live
database or the repository at 19:45 Europe/Istanbul, not carried over from a morning estimate.

---

## The short version

The project did not have a research shortage this morning. It had **4,048 researched
programme records and 664 live rows** — a pipeline that had been filling a bucket with a hole
in it. Most of today's value came from closing that hole and then pushing everything through
it, not from gathering more.

| | 08:00 | 19:45 |
|---|---:|---:|
| Programmes live | 664 | **9,423** |
| Universities with at least one programme | 41 | **127** |
| Requirements corpus (researched) | ~180 | **1,296** |
| Requirements live | 84 | **84** |
| Deadlines live | 26 | **26** |
| Opportunities live | 391 | 391 |
| Tests passing | 1,155 | **1,279** |

The two rows that did **not** move are the most important thing in this report. See
"The one gap I deliberately did not close."

---

## What actually got fixed

Eight real defects, each found by measuring rather than reading:

1. **Silent ingestion data loss.** Three Radboud records disappeared from both the programme
   table and its audit trail — the ingestion could drop a record without leaving a trace. This
   was the hole in the bucket.
2. **A 53:1 false-positive dedup rule.** "Same URL at this university means duplicate" rejected
   53 genuine METU programmes to catch 1 real duplicate. Replaced with a proper composite key
   across two migrations (0053, 0054) and the 53 replayed back in.
3. **Geography blindness.** `computeAdmissionOutlook` accepted an admission-system parameter
   that neither caller actually passed — the fix had been reported as done and had zero live
   effect. Found by an audit lane, verified myself, corrected the record.
4. **US undergraduate Medicine and Law.** Neither exists as a US bachelor's degree. The product
   would have shown an outlook for a programme a student cannot apply to.
5. **IELTS and TOEFL evaluated independently**, so a student meeting either could be told they
   failed the other.
6. **353 rows with research prose in `language_of_instruction`** — a column being used as a
   notes field. Split into the real value plus evidence in `notes`.
7. **53 more of the same at METU**, written in a 14-second window *the same day* — a recurrence,
   not a leftover. Fixed and backed up separately.
8. **233 English-taught programmes invisible to a search for English**, because the column held
   `İngilizce`, `ENG`, `Eng` and `English` as four different values. Now one.

Both language fixes were backed up to timestamped tables before any write.

---

## What the research found that changes the product

These are not data points. Each one means the product would give a student a confidently wrong
answer, and each was verified against the institution's own page.

**METU's IELTS rule runs backwards.** Certificates taken *on or after* 24 December 2022 are not
accepted. Every recency model assumes "at most N years old." A max-age field gets this exactly
inverted and tells a student their fresh certificate qualifies.

**Ankara's popular programmes accept only TR-YÖS** — Medicine, Dentistry, Computer Engineering,
AI, Software, Law, Veterinary, Pharmacy. The rule exists on the page as a heading and as the
*absence* of any SAT row. A store that holds only positive thresholds matches an SAT applicant
to the general row and returns "met" for someone who is not eligible at all.

**TR-YÖS carries the TOEFL problem inside the home market.** One national exam, one cycle,
three incompatible expressions: Hacettepe 400 of 500; Ankara "440 points" with no denominator
published anywhere; METU "first 5th percentile," which is a rank and not a score. No numeric
column holds all three.

**Score provenance is per-institution.** Southampton accepts IELTS One Skill Retake; Edinburgh
refuses it. Both official, both current, same student, same certificate.

**Hacettepe splits its international quota 60/30/10** across TR-YÖS, SAT and A-Level, unfilled
sub-quotas transferring to TR-YÖS first. A student who clears the A-Level threshold competes
for a tenth of the places. No requirement checklist would ever surface that — but it is exactly
the opportunity-cost reasoning ORYN promises.

**Deadline years are legitimately unknown, per institution, not per country.** TU Berlin
publishes 0% undated deadlines; Heidelberg publishes 92% bare day/month. Same country, same
kind of page. Studielink's national 15 January / 1 May dates were confirmed undated six times
independently against Studielink's own page — so those nulls are a fact about the source, not
a gap in the research.

**Page freshness is not an institutional property.** The TOEFL rescale error appeared 124 times
and split *within* single universities: TU Delft's Master's page handles it correctly, its
Bachelor's page, fetched the same day, does not. There is no shortcut — every page gets checked.

---

## The one gap I deliberately did not close

**The requirements corpus is 1,296 records. The live table holds 84.**

This is the same shape as this morning's programme problem, and I could have run an ingestion
and reported a fifteen-fold increase tonight. I did not, and I want to be explicit that this
was a decision rather than something left undone.

Every finding in the section above describes a requirement shape the current schema cannot
represent. Ingesting 1,296 records into it would not produce an empty result — it would produce
a full table that answers eligibility questions wrongly, in the specific direction of telling
students they qualify when they do not. That is the most damaging output this product has.

A design pass is running now: it inventories every broken shape, proposes the migration, and
produces a **dry-run-only** script whose single most important output is the count of records
the schema cannot hold. That number decides when ingestion is safe. It cannot write to the
database — there is no apply path in it.

An empty table is honest. A wrong "met" is not.

---

## Method — what worked, and where I was wrong

**Seven near-misses of one kind**, all caught by comparing a returned name against the query
instead of trusting rank or substring: `ILIKE '%ITU%'` matched Georgia Tech for İTÜ; ROR's
ranked search returned Uşak University first for "Anadolu," and again for "Afyon Kocatepe";
Sorbonne Université against Paris 1 Panthéon-Sorbonne; Girne Üniversitesi against Girne
American University; Turgut Özal against Malatya Turgut Özal. The rule that came out of it:
**an exact identifier is evidence; rank, substring and name similarity are leads.**

**Agents caught their own errors more often than I caught them.** One lane's dry run reported
zero duplicates across 2,383 records and it read that as *wrong* rather than clean — finding a
bug it had reintroduced by copying a pattern fixed hours earlier. One voided its own completed
run after noticing it had executed against a stale script. One found its own brief
self-contradictory mid-run and corrected three still-running agents plus nine already-written
records by hand.

**Eight mistakes were mine**, and the pattern in them is worth recording. I assigned the same
lane twice by session slot without asking what it was already doing; both lanes pushed back and
both were right. I created a second ownership document against an existing one that explicitly
warns not to. I applied a migration by composing SQL from a pattern instead of reading the file,
which cost a lane 131 audit rows. And I reported the geography fix as done when it had no live
effect at all.

The correction that stuck: **read the whole file, ask before assigning, and verify against the
database rather than against the agent's own report.** Every merge today was checked against
live state, not against what the lane said it had done.

---

## State

`main` = `b81b098`, gate green: lint, typecheck, 1,279 tests.

Waiting on you, and only on you:

- **`ANTHROPIC_API_KEY`** — paid, roughly $5 to start. Every AI surface is dead without it:
  advisor, weekly plan, CV extraction, research generator. This is the single biggest lever
  left on the product.
- **`TAVILY_API_KEY`** — free tier exists. Opportunity discovery is dead without it.
- Migrations **0047** and **0048** were blocked by the tool classifier and have never been
  applied.

Recommended next phase: land the requirements schema changes, then ingest. That converts
1,296 records of verified research — the work of four lanes today — into the requirement checks
students actually see.
