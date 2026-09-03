# The 25 `under_review` rows from the 2026-08-15 Drive import — triage

Follow-up to [`drive-import-completeness-2026-09-03.md`](drive-import-completeness-2026-09-03.md).
Not a research pass — a sort, so whoever opens the review queue next sees 25 one-line
judgments instead of 25 records that each look, read alone, like they should be rejected.

## Confirmed independently first, not assumed

Re-ran the source-string query myself rather than trust the number handed over:

```sql
select status, count(*), min(created_at::text), max(created_at::text), count(distinct source)
from public.opportunities
where source = 'Founder school-counselor Drive corpus, cross-checked against official/provider pages 2026-08-15'
group by status;
```

**214 total, exactly as reported: 163 active, 25 `under_review`, 25 `disabled`, 1 `expired`.**
All four groups share one `source` string, and every one of the 214 rows was `created_at`
within a **90-second window** on 2026-08-18 (23:56:41–23:58:11 UTC) — tighter than "same
day," this is one transaction. Re-verified the "worse than the active set" claim on the 25
specifically, not taken on faith: **25/25 no deadline, 25/25 no cost, 25/25 no
selectivity_tier, 24/25 no eligibility signal, 24/25 no `fields`** — matches what was
reported, and adds one thing that wasn't measured yet: **3 of the 25 are also missing
`organization`**, a field that was 100% populated across the entire active 163. The
`under_review` slice isn't just thinner on the same five axes — it's thinner on identity
too.

## The 25, one line each

Judged from each record's own existing content (title, organization, official_url,
description) — not a fresh research pass. A handful of spot-checks below are marked
where a live fetch actually happened; everything else is read directly from what's
already on the row.

### Genuinely worth reviving (16) — real programme, findable, just unresearched

| Title | Why |
|---|---|
| Boğaziçi Üniversitesi Lise BOUN 101 | Real institution (Boğaziçi/BÜYEM), real URL, detailed course list — dates are last year's (July 2025), needs a refresh, not a rewrite. |
| Bogazici University BOUN 101 Online Kış Okulu | Same real institution as above. |
| Civic Leadership Institute (CTY, Johns Hopkins) | Real, major org (Center for Talented Youth), real URL. |
| CTY Online Programs Courses | Same real org. |
| **Durham University Global Futures Summer School 2026** | Description already carries real 2026 facts — age 16-17, fee £5,000, dates 19-28 July 2026 — more complete than most *active* rows. Live-check attempted, blocked (see below). |
| **Fordham University** | Description shows an *in-progress* prior fix: URL already corrected 2026-08-24 (was pointing at an unrelated faculty CV PDF), real 2026 session dates already found and deliberately held pending confidence. Further along than "unresearched." |
| **Harvard University (MA, USA) — Harvard Summer School** | Description already has exact 2026 deadlines (Jan 7 / Feb 11 / Apr 1) and precise age rule (16 by June 20, under 19 by July 31). One of the strongest-documented records in this entire batch of 25. |
| Institute for Advanced Critical and Cultural Studies (CTY, Carlisle PA) | Same real CTY/Johns Hopkins org. |
| International Genetically Engineered Machine Competition (iGEM) | Real, well-known international synthetic-biology competition. |
| International Summer School for Young Physicists (ISSYP) | Real, prestigious (Perimeter Institute for Theoretical Physics); one internal reference to "ISSYP 2023" is stale but the eligibility criteria described (grade 11-12, physics background) reads as durable. |
| **Lise Kış Tıp Okulu (Koç Üniversitesi)** | Real institution, description already has exact 2026 dates (19-23 Ocak / 26-30 Ocak) and deadline (2 Ocak 2026). Live-check attempted, blocked (see below). |
| New York Times Student Editorial & Essay Contests | Real, recurring, well-known (NYT Learning Network); URL points at the *2025-26* calendar, needs the current cycle's link, not new research. |
| NEW! The Immerse Cambridge Experience | Immerse Education is a real org, independently confirmed twice elsewhere in this catalogue tonight; this specific 1-week program's 2025 dates are stale. |
| The Juilliard School — Juilliard Pre-College | Real, extremely well-known conservatory program. |
| Tufts College Experience | Real institution, real contact email; deadline stated is May 2025, stale but a clear recurring program. |
| University of Exeter, United Kingdom | Description is substantive and specific (age 15-18, subject areas, reference requirement) — but `official_url` is wrong (see Fixable data errors, below); the correct URL is sitting in the description text itself. |

### Genuinely not (6) — dead, duplicate, mis-scraped, or wrong audience

| Title | Why |
|---|---|
| **Duke University Talent Identification Program 2024** | Title itself is 2 years stale. Description doesn't describe a specific program — it points at Duke TIP's "Opportunity Guide," a directory of *other* programs, not an opportunity in its own right. **Live-checked**: the stored URL now 301-redirects twice (`tip.duke.edu/resources/opportunity-guide` → `learnmore.duke.edu/precollege/` → `provost.duke.edu/pre-college-programs/`), landing on a page with **zero mention of "TIP," "Talent Identification," or "Opportunity Guide" anywhere.** Duke pre-college programs are real and current; this specific record's identity is not. |
| Google Computer Science Institute | Own description states it's "for rising first-year **college** students" — not a high school opportunity at all. Wrong audience for this product, not a data gap. |
| Koç University Research Program KUSRP (`9c0e300e`) | Same program name/acronym as the already-**active** `Research Program KUSRP 2026` (`2116709f`, `research.ku.edu.tr/.../kusrp/2026-highschool-projects/`) — this row's URL is `vprd.ku.edu.tr/kusrp-lise-programi-ozellikleri/`, a different subdomain for what reads as the same program. Likely duplicate, not confirmed identical — flagged, not merged. |
| Microsoft Imagine Cup Junior | Already self-classified by an earlier pass — the description field itself *is* the verdict: "Classified discontinued based on this evidence… last confirmed edition found was January 2024." `verification_state: conflicting`. Nothing left to triage; already triaged, just never promoted out of the queue. |
| Robomaster High School Summer Camp (Shenzhen, China) | Title and description don't match — the description is a garbled mix of *three* unrelated programs (University of Nottingham Malaysia, SCAD Hong Kong Rising Star), none of them Robomaster or Shenzhen. Clear mis-scrape. |
| University of Chicago Chicago, IL (`16ab0b91`) | `official_url` field is corrupted (`.../summer.uchicago.ehttps://summer.uchicago.edu/international-studentsdu/apply` — two URLs mangled together). Description also names the exact same program set ("Immersion/Stones and Bones/Summer Bridge/Summer College") as the already-**active** `9f1b802e` UChicago record. Likely duplicate on top of the corruption. |

### Can't tell without a research pass (3)

| Title | Why |
|---|---|
| Columbia Writing Academy | Real institution (Columbia SPS Pre-College), but `official_url` is a login-gated redirect page, not the program page itself, and dates are last year's (July 2025). Not clearly dead, not clearly current. |
| Harvard Alumni for Global Women's Empowerment Essay Contest | Description states a deadline of **March 10, 2023** — three and a half years stale — with no signal about whether later cycles ran. Real-sounding org and site; genuinely unknown whether it's still active. |
| Vesalius College: Brussels, Belgium | The `organization` field itself already carries a prior researcher's own caveat: *"Vesalius College (institutional successor unclear)"* — someone already flagged this as ambiguous and left it unresolved. Not re-derivable from a one-line read; needs the actual research pass. |

## Blocked — reported as blocked, not as "not found"

Two spot-check fetches (Durham University, Koç University's `ku.edu.tr` domain) returned a
network/security block before any content was read — the same class of block this session
hit repeatedly tonight on `.edu`/institutional domains. **Not evidence against either
record** — Durham and Lise Kış Tıp Okulu are both still classified "worth reviving" above,
on the strength of what's already written into their own description fields, not on a live
recheck this pass couldn't complete.

## Fixable data errors — pure data fixes, not moderation, staged for the founder to run

One real, mechanical correction came out of this read: University of Exeter's stored
`official_url` points at an individual staff profile page (`experts.exeter.ac.uk/35701-fatima-naveed`),
not the program. The correct URL is already sitting in the row's own description text
(`www.exeter.ac.uk/preunisummerschool`). This is a data-hygiene fix, same shape as the
deadline/description corrections earlier tonight — not a decision about whether the row
should be reviewed or published.

```sql
-- University of Exeter -- official_url was a staff bio page, not the program; the correct
-- URL is already written into this row's own description. STAGED ONLY. Not executed.
update public.opportunities
set official_url = 'https://www.exeter.ac.uk/preunisummerschool'
where id = '9b013735-8ae8-4175-8861-6022b3aaf9ce'
  and official_url = 'https://experts.exeter.ac.uk/35701-fatima-naveed';
```

## The 16 revive candidates — this needs your decision, not your keystroke

**Deliberately not staged as one runnable block.** Moving a row from `under_review` to
`active` is a publish decision — it puts a program in front of students — not a data
correction, even when the underlying facts are solid. Listed here by id for review, not as
SQL to run:

```text
3900e10b-dc11-4d4d-ba69-7f9a630cf602  Boğaziçi Üniversitesi Lise BOUN 101
4d866643-6a6d-481a-add3-e29b6a163592  Bogazici University BOUN 101 Online Kış Okulu
8a302e54-e237-49f7-9757-9b5262ae592b  Civic Leadership Institute (CTY)
a18a12db-6e7d-4d1f-9243-de94ae621ed8  CTY Online Programs Courses
5af50558-fcb5-4390-a8ff-5a6946e65862  Durham University Global Futures Summer School 2026
76a53c74-ea3a-4951-84af-a3e108a62d2c  Fordham University: New York, NY
66c76976-90e5-4637-8afe-6828992e838a  Harvard University (MA, USA)
4c7f5a9f-79d0-42df-8343-fc6a4983fe8d  Institute for Advanced Critical and Cultural Studies (CTY)
931e7fc2-ee58-4904-958e-f2655c1b5c9d  International Genetically Engineered Machine Competition (iGEM)
8980e51b-9889-4cb0-a6dc-e11a60a59e51  International Summer School for Young Physicists (ISSYP)
2b09924c-c758-4375-b7b1-215009e50d8e  Lise Kış Tıp Okulu (Koç Üniversitesi)
d24e59bd-43b7-4e7e-83ab-aadb02e2a971  New York Times Student Editorial & Essay Contests
dc0b92eb-5887-4163-8b71-1c3a4ab3bf80  The Immerse Cambridge Experience
382cab93-7abd-4d0b-b7f8-d566395c056a  The Juilliard School — Juilliard Pre-College
52a60b8e-7ac5-4258-b91f-09a34b9ad35d  Tufts College Experience
9b013735-8ae8-4175-8861-6022b3aaf9ce  University of Exeter, United Kingdom
```

If the founder wants to move any of these to `active`, the mechanical part is one line each
(`update public.opportunities set status = 'active' where id = '<id>'`) — withheld here
deliberately so approving them is a decision he makes, not a batch he inherits.

## Bottom line

**Not "the import's rejects were correctly rejected."** 16 of 25 (64%) are real, findable
programs from real institutions — several (Durham, Harvard, Koç's Lise Tıp Okulu) already
carry more researched fact in their description than most of the *active* 163 do in their
structured columns. The review queue isn't wrong to be cautious about a thin record with no
deadline and no eligibility data — it's wrong to read that thinness as evidence the program
itself is fake. It's the same import-shape finding as the active 163, one level further
into the pipeline: real identity, missing research, now also carrying a queue that reads the
second symptom as the diagnosis.

**6 of 25 are genuinely bad** — one live-confirmed dead link (Duke), one wrong-audience
record, two likely duplicates of already-active rows, one mis-scrape, and one already
self-diagnosed as discontinued by an earlier pass that just never got promoted out of the
queue. Real signal, not a queue artifact.

**3 need the actual research pass** this triage deliberately didn't do.
