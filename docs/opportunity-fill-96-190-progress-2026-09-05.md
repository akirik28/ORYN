# Opportunity fill 96-190 — progress log

Environment reset wiped all scratchpad state (all session scratchpads empty as of ~20:30-20:38)
partway through the first dispatch. Batch 2 (rows 115-133) had already completed and was
recovered from conversation context before it could be lost too. Batches 1, 3, 4, 5 were
redispatched fresh afterward against the same slice, re-derived live from the DB (boundaries
re-confirmed identical: rn=96 Girl Up Club, rn=190 Warwick). This file is appended to as each
batch completes, committed after every append, so a repeat reset costs at most one batch.

## Batch 2 results (rows 115-133) — first batch, survived the reset

Method: WebFetch on each official page (+ follow-up eligibility/FAQ pages where official_url
was a landing page), explicit verbatim-quote prompting for age/grade/country.

Method: WebFetch on each official page (+ follow-up eligibility/FAQ pages where official_url
was a landing page), explicit verbatim-quote prompting for age/grade/country.

Two additional blocked domains beyond the doc's known three (Girl Up, NYT Podcast, STEM
Fellowship Journal):
- summer.gwu.edu (item 121) — blocked on every URL tried (403 x3, socket-hang-up x1), including
  bare root. Domain-wide block, not source silence.
- STEM Fellowship Journal (item 126) — per doc's existing blocklist, not attempted, marked
  could_not_access without touching it.

```
ID: a5cf4328-7bc1-4ad7-9de5-8bc8b7df9220
TITLE: Downing College University of Cambridge - 2026
STATUS: researched
minimum_age: 15
maximum_age: 17
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.dow.cam.ac.uk/international-programme/downing-college-international-programme-15-18-years
RETRIEVED: 2026-09-05
QUOTE: "Downing College International Specialist Programme (15-17 years)"
CONFIDENCE: explicit_stated
NOTES: URL slug says "15-18-years" (generic category link) but actual page title/content is
specifically "(15-17 years)" for this program -- confirmed via full re-scan of every age
mention on the page. No grade or country restriction stated; confirmed-open international.

ID: a78975de-a35f-4030-b4fd-88a724b653ae
TITLE: Georgetown University HOYA Summer-High School Sessions
STATUS: researched
minimum_age: 15
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://summer.georgetown.edu/programs/SHS18/medical-academy
RETRIEVED: 2026-09-05
QUOTE: "Minimum Age 15 years old"
CONFIDENCE: explicit_stated
NOTES: Only a floor stated, no ceiling, no grade-level statement. "Country of Residence" form
field reads as logistical, not an eligibility restriction.

ID: a7a89e1e-a9e3-4a8e-9850-789c609a769d
TITLE: Lehigh University: Bethlehem, PA
STATUS: researched
minimum_age: 14
maximum_age: 17
eligible_grades: [10,11,12]
eligible_countries: blank
SOURCE_URL: https://academicoutreach.lehigh.edu/pre-college-programs
RETRIEVED: 2026-09-05
QUOTE: "Participant must be 14-17 years old to participate" / "Rising 10th, 11th and 12th
graders who will be 14-17 years old during the program can register."
CONFIDENCE: explicit_stated
NOTES: General pre-college-programs landing page, reflects stated banner eligibility. No
country restriction found.

ID: aa64db8b-6251-4981-9386-ef50fc4ca3ec
TITLE: HOSA Future Health Professionals - Competitive Events
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://hosa.org/about/
RETRIEVED: 2026-09-05
QUOTE: "HOSA provides a unique program of leadership development, motivation, and recognition
exclusively for secondary, postsecondary, adult, and collegiate students..." / "...reaching
over 200,000 members through 51 chartered HOSA Associations, American Samoa, Canada, District
of Columbia, Germany, Italy, and Puerto Rico."
CONFIDENCE: page_silent
NOTES: Membership spans secondary+postsecondary+adult+collegiate, not a clean high-school-only
grade array -- left blank rather than force one. The "chartered Associations" sentence
suggests real participation may structurally skew to US/Canada/Germany/Italy but is
organizational scale language, not an explicit "restricted to" statement -- did not populate
eligible_countries. Also checked hosa.org/ and hosa.org/join/, both silent. Recommend a human
check HOSA's international-charter page directly if this matters for filtering.

ID: aaf5b259-4e72-4cba-85a9-43be675384aa
TITLE: Sabancı University Summer School 2026
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [9,10,11,12]
eligible_countries: blank
SOURCE_URL: https://liseyazokulu.sabanciuniv.edu/okul/lise-yaz-okulu
RETRIEVED: 2026-09-05
QUOTE: "Programa tüm lise öğrencileri katılabilir" (all "lise"/high-school students can
participate)
CONFIDENCE: explicit_stated
NOTES: Source says "lise" generically, not numbered grades. Turkish "lise" is a defined 4-year
national-curriculum stage = grades 9-12 (ages ~14-18) -- mapped accordingly, flagged as an
INFERRED mapping, not literal numbers on the page. No age or country restriction found.

ID: ae5e73f0-43ba-42be-baed-423d3087e7e1
TITLE: University of the Arts London - The UAL International Summer School
STATUS: researched
minimum_age: 11
maximum_age: 18
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.arts.ac.uk/study-at-ual/short-courses/summer-short-courses/ual-international-summer-school
RETRIEVED: 2026-09-05
QUOTE: "With age-appropriate options available for 11 to 15 year olds and 16 to 18 year olds"
CONFIDENCE: explicit_stated
NOTES: *** JUDGMENT CALL, FLAG FOR CEO *** -- program is actually TWO separate age bands
(11-15 and 16-18), not one continuous range. Reported as combined floor/ceiling 11/18 since the
schema has one min/max pair, but this could overstate a continuous 11-18 eligibility when it's
really two distinct cohorts with a described gap. Disclosed, not hidden -- worth a decision on
whether combined floor/ceiling is the right call here or whether this should stay blank instead.

ID: aeeb130a-30f6-440f-867e-861cd723a6db
TITLE: George Washington University: Washington, DC
STATUS: could_not_access
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: attempted https://summer.gwu.edu/pre-college-2026, /summer-immersion,
/apply-pre-college, and bare root -- all blocked
RETRIEVED: 2026-09-05
CONFIDENCE: could_not_access
NOTES: summer.gwu.edu blocked every fetch attempted (403 x3, socket hang up x1), including bare
root -- domain-wide block, not source silence. A generic web search surfaced third-party
snippets suggesting "rising sophomores, juniors and seniors (ages 14-18)" but per task rules
this was NOT verified by reading GWU's own page, so explicitly NOT reported as sourced data --
flagged only as an unverified lead for a browser-based follow-up.

ID: af30653c-94d1-4ce2-8781-b60e659d48ef
TITLE: Northwestern University
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.ctd.northwestern.edu/eligibility
RETRIEVED: 2026-09-05
QUOTE: "Grade 3 - Grade 8" and "Grade 9 - Grade 12" (program-tier categories) / "Students from
India, UAE, Kuwait, or Singapore, interested in above-grade-level testing... please visit the
ASSET Talent Search page."
CONFIDENCE: page_silent
NOTES: CTD spans multiple grade tiers each with different admission criteria -- row links to
general course-offerings catalog, doesn't identify a single course/tier, so no grade array
forced. India/UAE/Kuwait/Singapore mention is NOT a restriction -- it redirects those specific
countries to a DIFFERENT testing pathway; other countries use the standard track. Do not encode
as a restricted list. Recommend data owner confirm which specific CTD program this row
represents.

ID: b399d24d-3606-4d3d-bb59-2b94623c58b2
TITLE: The Diana Award
STATUS: researched
minimum_age: 16
maximum_age: 24
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://diana-award.org.uk/our-programmes-and-initiatives/award-and-development/the-diana-award
RETRIEVED: 2026-09-05
QUOTE: "Young people aged 16-24 who have been leading sustained social action or humanitarian
work for at least 12 months can be nominated"
CONFIDENCE: explicit_stated
NOTES: Nomination-based recognition award, not direct-apply. "80 countries across six
continents" is confirmed-open signal, not a restriction list.

ID: b3e40e31-a82d-4a34-bceb-b841f20d7296
TITLE: Galatasaray University High School Summer Programs 2026
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [9,10,11,12]
eligible_countries: blank
SOURCE_URL: https://gsu.edu.tr/tr/lise-yaz-okulu
RETRIEVED: 2026-09-05
QUOTE: "Galatasaray Üniversitesi Yaz Okulu, lise öğrencilerine üniversite deneyimi
kazandırmayı..." (targets "lise öğrencileri"/high-school students)
CONFIDENCE: explicit_stated
NOTES: Batch's official_url (liseyazokulu.gsu.edu.tr) was silent (only "registration closed"
notice) -- batch's separate source_url used instead, had the real content. Same "lise" = grades
9-12 inferred mapping as Sabancı, flagged as inferred. No age/country restriction on either URL.

ID: b41bf5f5-d2cb-4f5d-84e5-8d9e8630af07
TITLE: International Young Physicists' Tournament (IYPT)
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://iypt.org/regulations/
RETRIEVED: 2026-09-05
QUOTE: "A team consists of three to five secondary school students. Secondary school graduates
can participate in the year of their graduation." / "Each IYPT Member Organisation (IMO) can
nominate one team... An organisation from a country which is not represented by an IMO can
nominate a team, subject to approval by the EC."
CONFIDENCE: explicit_stated
NOTES: Real stated restriction but "secondary school" isn't a fixed numeric range
internationally -- left grades blank rather than guess. Countries run through national Member
Organisations with case-by-case path for non-members -- procedural rule, not enumerable list,
left blank.

ID: b51bf24f-42c2-419f-a456-ca86dff0ad8e
TITLE: STEM Fellowship Journal
STATUS: could_not_access
CONFIDENCE: could_not_access
NOTES: Per doc's known-blockers list, already confirmed 403/blocked. Not touched, per
instructions.

ID: b5d022aa-302a-4712-b960-a5f70386af17
TITLE: Leangap
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.leangap.org/summer-program
RETRIEVED: 2026-09-05
CONFIDENCE: page_silent
NOTES: Checked /summer-program and /faq. Repeatedly says "high school students"/"teenagers",
mentions "10+ countries" (past attendance, not a rule) -- no specific numbers stated anywhere.
Nothing to quote.

ID: b8c1db11-44b7-43db-a79d-3ca5fbd10c45
TITLE: Andrew Jobbings Senior Kangaroo
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: ["United Kingdom"]
SOURCE_URL: https://ukmt.org.uk/senior-challenges/andrew-jobbings-senior-kangaroo
RETRIEVED: 2026-09-05
QUOTE: "England and Wales: Year 13 and below | Scotland: S6 or below | Northern Ireland: Year 14
or below" / "Open to UK schools only."
CONFIDENCE: explicit_stated
NOTES: Country restriction clean and explicit. Grade restriction is a stated ceiling with
explicit "and below" (no floor by design) -- doesn't fit a bounded array, left eligible_grades
blank rather than invent a floor.

ID: ba4d814c-2790-4afd-91d5-b9030dc56549
TITLE: Intermediate Mathematical Challenge
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://ukmt.org.uk/intermediate-challenges/intermediate-mathematical-challenge
RETRIEVED: 2026-09-05
QUOTE: "England, Wales and Overseas: Year 11 and below. Scotland: S4 or below. Northern Ireland:
Year 12 or below"
CONFIDENCE: explicit_stated
NOTES: IMPORTANT DISTINCTION from Senior Kangaroo (128): this page explicitly includes
"Overseas" as ITS OWN regional category -- NOT UK-only, unlike Senior Kangaroo. No UK-only
restriction applies here. Same ceiling-only grade issue, left blank.

ID: bb519c8f-71f8-4e89-83e2-3b7e7a7ebf1f
TITLE: University of Bath International Summer School
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://bath.ac.uk/campaigns/international-summer-school/
RETRIEVED: 2026-09-05
QUOTE: "for students looking to apply for undergraduate degree courses starting in September
2027" / "The International Summer School is open to all international students (as classified
by overseas fee status)."
CONFIDENCE: page_silent
NOTES: Targets prospective undergrad applicants (2027 entry), no age/grade number stated.
"Overseas fee status" is a UK tuition-fee-status statement tied to residency, not a nationality
list -- correctly excluded from eligible_countries.

ID: bbb81017-3570-4a13-8e82-e4bf612b3436
TITLE: Pre-Baccalaureate Program
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [11,12]
eligible_countries: blank
SOURCE_URL: https://globalyouth.wharton.upenn.edu/pre-baccalaureate-program/
RETRIEVED: 2026-09-05
QUOTE: "exceptional high school juniors and seniors"
CONFIDENCE: explicit_stated
NOTES: Clean explicit grade-level statement. No age or country restriction found.

ID: bc678344-c213-4ae8-a4f8-48af2856338f
TITLE: Lumiere Education
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.lumiere-education.com/lumiere-programs
RETRIEVED: 2026-09-05
CONFIDENCE: page_silent
NOTES: Checked /lumiere-programs, /faq (404), /students-application-form, homepage. No page
states flagship program's age/grade range directly. /students-application-form redirects grade
6-8 students to a separate "Junior Explorer" program, implying but not stating flagship is
high-school-only -- not explicit enough to populate. No country restriction ("students around
the world").

ID: c14ee166-0d7a-4c6c-8b78-f92b501dccbb
TITLE: Andover Summer at Phillips Academy 2026
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [7,8,9,10,11,12]
eligible_countries: blank
SOURCE_URL: https://www.andover.edu/summer
RETRIEVED: 2026-09-05
QUOTE: "Five-week on-campus premier academic enrichment program for rising 7-12th graders."
CONFIDENCE: explicit_stated
NOTES: Describes Andover's flagship 5-week Summer Session specifically -- page may list other
sub-programs with different bands not covered by this quote. No age number or country
restriction stated.
```

## Two operational flags from the agent, worth CEO's attention
1. summer.gwu.edu is domain-wide blocked for automated fetches -- add to known-blocked-domains
   list alongside Girl Up, NYT Podcast, STEM Fellowship Journal.
2. Northwestern CTD row (122) links to a general multi-tier PreK-12 course catalog rather than
   one specific program -- likely needs a data-modeling decision (split into per-course rows),
   not a research answer.

## My own spot-check verification of batch 2 (per CEO's explicit instruction: agent summaries
## are not evidence, open the pages myself)

Opened 6 of batch 2's real pages directly via browser, independent of the agent's own fetches.
All 6 confirmed accurate -- quotes matched word-for-word, judgment calls held up:
- Downing College: confirmed the URL-slug-vs-content discrepancy the agent flagged (slug says
  "15-18-years," live page literally reads "(15-17 years)"). Caught my own near-miss doing
  this -- the shared browser pane initially served a stale tab from a different site (Johns
  Hopkins CTY) before I checked tab context and targeted the right one explicitly.
- GWU: confirmed genuinely domain-wide blocked (Cloudflare challenge page, even on bare root).
- UKMT Senior Kangaroo: confirmed "Open to UK schools only" and the exact ceiling-only grade
  quote, word-for-word.
- UAL: confirmed the quote, AND found the source's own page headline ("Summer Short Courses for
  11 to 18 year olds") frames it as one band even more directly than the agent's own hedge
  suggested -- the combined floor/ceiling treatment is better-justified than it first looked.
- STEM Fellowship Journal: confirmed genuinely blocked (Cloudflare "Just a moment..." page),
  not a stale assumption carried over from yesterday.
- Sabancı: confirmed "tüm lise öğrencileri" verbatim, and confirmed the page states no specific
  numbers -- the agent's [9,10,11,12] was correctly flagged as an inferred mapping, not a
  literal page value.

## Batch 5 results (rows 172-190) -- redispatched after the reset

Same method and rules as batch 2. This agent independently hit and correctly handled the same
shared-browser-pane collision I found myself -- noticed its own tab got overwritten mid-task by
a concurrent batch's navigation, reverted to WebFetch for the rest rather than trust corrupted
state, and tightened its verbatim-quote discipline further as a result (declined to fill grade
fields at all on 2 rows where the tool returned a paraphrase, not an actual quoted sentence).

```
ID: e9c4cd39-b514-4975-b010-1c627d7231c8
TITLE: Early College Program (ECP) Courses for High School Students (Ages 14-18)
STATUS: researched
minimum_age: 14
maximum_age: 18
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.saic.edu/high-school-programs
RETRIEVED: 2026-09-05
QUOTE: "Early College Program (ECP) Courses for High School Students (Ages 14-18)" -- title
claim independently verified via direct browser page-text, not just a fetch-tool summary
(this row was specifically flagged for that check since its own title makes an age claim).
CONFIDENCE: explicit_stated
NOTES: Page also lists ECPSI/ECPOSI sub-programs, both "ages 15-18" -- the 14-18 figure is
specifically for the named ECP Courses. No grade numbers given. No country restriction; page
says the institute draws "high school students from all over the world." An Illinois-only
scholarship exists but is a funding perk, not an eligibility gate.

ID: ea0a2569-e027-4d7c-b9b7-a858fb1359a8
TITLE: Research in Biological Sciences (RIBS)
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [10,11]
eligible_countries: blank
SOURCE_URL: https://summer.uchicago.edu/programs/research-biological-sciences-ribs
RETRIEVED: 2026-09-05
QUOTE: "10th Grade, 11th Grade"; "High school biology is required."
CONFIDENCE: explicit_stated (grades); page_silent (age, country)
NOTES: none further.

ID: ee5d3870-77a8-43e5-8800-8738f6318d5f
TITLE: Kadir Has Yaz Okulu
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [9,10,11,12]
eligible_countries: blank
SOURCE_URL: https://liseyazokulu.khas.edu.tr/
RETRIEVED: 2026-09-05
QUOTE: "9. Sınıf 10. Sınıf 11. Sınıf 12. Sınıf" (grade selector)
CONFIDENCE: explicit_stated (grades); page_silent (age, country)
NOTES: Page's own literal numbers, not a translated/inferred curriculum term like the other
Turkish "lise" rows in this slice -- no mapping needed here.

ID: f05643c5-88fa-477c-ac16-8de0b0b547bc
TITLE: Illinois Institute of Technology: Chicago, IL
STATUS: researched
minimum_age: 14
maximum_age: 17
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.iit.edu/academics/elevate-college-prep/summer-programs
RETRIEVED: 2026-09-05
QUOTE: "open to rising high school freshmen through rising seniors (typically ages 14-17)"
CONFIDENCE: explicit_stated
NOTES: Landing page also covers a separate middle-school tier (ages 11-13, not applicable
here). Grades left blank -- page uses class-year language, [9,10,11,12] mapping is standard
if a compiler wants to fill it directly. No country restriction stated.

ID: f069afec-005f-43a8-82f2-6869785ad6f1
TITLE: Phillips Exeter Academy - New Hampshire NH
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://exeter.edu/admissions/apply/
RETRIEVED: 2026-09-05
QUOTE: "The application process is the same for international and domestic students."
CONFIDENCE: explicit_stated (country parity); page_silent (age, grades)
NOTES: A grades-9-12-plus-postgraduate claim was only ever returned as the tool's own
paraphrase, never a verbatim sentence -- per rule 7, NOT treated as sourced, left blank.
Recommend a human check the /apply/ page directly (likely a table the tool couldn't extract).

ID: f3cda419-64ae-4bac-bda9-3d1c6ccbbc37
TITLE: HKUST I·ELITE Pre-University Scholars Program
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://join.hkust.edu.hk/ielite
RETRIEVED: 2026-09-05
QUOTE: "Year 11 / Grade 10 / Form 4 / 高一 or above"; "Applications... are accepted by
nomination only from selected invited schools."
CONFIDENCE: explicit_stated (floor only); page_silent (ceiling, age, country)
NOTES: Floor-only ("Grade 10 or above"), no ceiling -- left blank per the floor/ceiling rule,
real floor noted here. Nomination-only from invited schools -- most students can't just apply
directly, an access gate the three fields don't capture. "Overseas I.ELITE Scholars" suggests
international eligibility exists but no formal country list is stated.

ID: f493d81f-1f4f-43dd-b0d7-ab6d72eef1d9
TITLE: The Institute of Competition Sciences (ICS)
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.competitionsciences.org/
RETRIEVED: 2026-09-05
CONFIDENCE: page_silent
NOTES: *** FLAG FOR HUMAN DECISION *** -- organizational homepage hosting several distinct
competitions (Plant the Moon Challenge, NASA ORBIT, WERC, Virtual Supreme Court, Modeling the
Future Challenge etc.), each with its own eligibility. No single eligibility for "ICS" as a
whole -- needs a decision on which specific competition this row represents.

ID: f52db280-638a-49ec-a972-d1658b046234
TITLE: International Summer Schools St Andrews, Cambridge and Yale Universities (ISSOS)
STATUS: researched
minimum_age: 13
maximum_age: 18
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.issos.com/
RETRIEVED: 2026-09-05
QUOTE: "ISSOS - International Summer School for 13-18 Year Olds" (page title); "Students from
over 100 nationalities each year"; "Each nationality is limited to 10%."
CONFIDENCE: explicit_stated (age); page_silent (grades)
NOTES: Genuinely international, no restrictive country list -- 10%-per-nationality is a cohort
diversity cap, not an eligibility restriction, left eligible_countries blank rather than "open."

ID: f54d2f62-6335-4f19-a05f-f03c3e47bc40
TITLE: Inspirit AI + Healthcare and Medicine
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.inspiritaiprojects.com/healthcare-ai-research-for-high-school-students
RETRIEVED: 2026-09-05
CONFIDENCE: page_silent
NOTES: Page identifies participants only as "high school students" -- no age, grade-number,
or country language found.

ID: f635fad5-3c75-4ce2-b2da-3bc5d70b9554
TITLE: Grey Kangaroo
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: ["United Kingdom"]
SOURCE_URL: https://ukmt.org.uk/intermediate-challenges/grey-and-pink-kangaroos
RETRIEVED: 2026-09-05
QUOTE: "England and Wales: Year 9 and below Scotland: S2 or below Northern Ireland: Year 10 or
below"; "Open to UK schools only."
CONFIDENCE: explicit_stated
NOTES: Ceiling-only (Year 9/S2/Year 10 "or below"), no floor -- left grades blank. UK
year-level labels are NOT the same numbering as US grades (UK Year 9 ≈ US grade 8) -- did not
auto-convert. Invitation/discretionary entry, an access gate beyond plain eligibility.

ID: f6dbce16-a6cb-4e8c-9ebd-01a57489879f
TITLE: BMO Round 1
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://ukmt.org.uk/senior-challenges/british-maths-olympiad-round-1
RETRIEVED: 2026-09-05
QUOTE: "England, Wales and Overseas: Year 13 and below. Scotland: S6 or below. Northern
Ireland: Year 14 or below."
CONFIDENCE: explicit_stated (ceiling); page_silent (floor, age)
NOTES: Notably NOT UK-only -- "Overseas" explicitly included alongside UK nations, unlike Grey
Kangaroo (same organization, explicitly UK-only) -- real, page-specific distinction, left
eligible_countries blank rather than copy Grey Kangaroo's answer.

ID: f8fc69c2-e48f-48d1-9a5f-6323a7c10e34
TITLE: Trinity College London, Ireland
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.tcd.ie/study/other-courses/summer-schools/
RETRIEVED: 2026-09-05
CONFIDENCE: page_silent
NOTES: *** FLAG FOR HUMAN DECISION *** -- official_url lands on a page featuring a STEM club
and an undergraduate-only Nursing/Midwifery program, neither obviously a 14-18 audience.
Title itself is internally odd ("Trinity College London, Ireland" mixes London and Ireland).
Other plausible TCD summer programs exist (TCPID ~16+, TAP restricted to partner Irish
schools) but neither was confirmed by direct fetch. Needs a human to identify the intended
program.

ID: f912de6d-7da6-4e21-811b-1da09b10c86c
TITLE: Columbia Spring Immersion Program
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [9,10,11,12]
eligible_countries: blank
SOURCE_URL: https://precollege.sps.columbia.edu/programs/academic-year/academic-year-weekend
RETRIEVED: 2026-09-05
QUOTE: "For seven weekends, 9-12 grade students in the Academic Year Weekend Program will
study..."
CONFIDENCE: explicit_stated (grades); page_silent (age, country)
NOTES: Minor flag: row is titled "Columbia Spring Immersion Program" but both URLs resolve to
Columbia's "Academic Year Weekend Program" -- no page literally named "Spring Immersion"
found on this domain. Likely a rebrand, but a human should confirm the name match.

ID: f9421944-556f-46ed-b748-cfdce8ed8cf7
TITLE: Tulane University Pre-College, New Orleans
STATUS: researched
minimum_age: 14
maximum_age: blank
eligible_grades: [9,10,11,12]
eligible_countries: blank
SOURCE_URL: https://summer.tulane.edu/admissions
RETRIEVED: 2026-09-05
QUOTE: "you must be at least 14 years old by the first day of your session"; "rising high
school freshman, sophomore, junior or senior" (enrichment courses); "graduating high school
seniors are not eligible."
CONFIDENCE: explicit_stated
NOTES: Eligibility varies by track -- enrichment = grades 9-12 (reported here); credit-bearing
= grades 11-12 only. "Graduating senior" (already has a diploma) explicitly excluded, distinct
from a current/rising senior who IS eligible. No max age stated. No country restriction, but
international applicants face added requirements (English proficiency scores, passport
validity, a US-based emergency contact).

ID: f9b261e6-69fb-4c1e-b7f9-ec9870ba79ac
TITLE: UniHive Summer Programmes hosted at the University of Cambridge
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.unihive.education/research-programme
RETRIEVED: 2026-09-05
CONFIDENCE: page_silent
NOTES: No eligibility facts stated on the page at all.

ID: fad2bef3-80e8-4b7e-a4a5-f7021f34767f
TITLE: Wharton Global Youth Program
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://globalyouth.wharton.upenn.edu/application-information/
RETRIEVED: 2026-09-05
CONFIDENCE: page_silent (age); no reliable single grade figure
NOTES: *** FLAG FOR HUMAN DECISION *** -- page covers many distinct sub-programs (on-campus,
online, keyed to graduation-year cohorts ~2026-2029), each with its own eligibility -- no
single age/grade figure for the program as a whole. Didn't trust the tool's graduation-year
chart summary enough to convert to one array (paraphrase, not verbatim). GPA requirement
(3.3+ unweighted, 3.5+ for two named programs) is real but outside the three target fields.
Recommend a human pick the specific sub-program this row represents.

ID: fd105724-26cf-448f-a595-15b3db2d7f8d
TITLE: Universidad de Navarra - University of Navarra
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: official_url and source_url point to two DIFFERENT programs -- see notes
RETRIEVED: 2026-09-05
CONFIDENCE: explicit_stated for each page's own facts, but the pages describe different programs
NOTES: *** FLAG FOR HUMAN DECISION -- HIGH PRIORITY, DO NOT MERGE *** -- the single most
serious data-integrity issue found in this whole slice. official_url ("Find Your Way. Walk the
Camino") is a high-school-age (rising 10th/11th grade, born 2009-2010), Spanish-language
Camino de Santiago pilgrimage program. source_url ("UNICC") is a university-TEAM (not
individual-student) international business case competition for undergraduates -- 16
universities, not high schoolers. Completely different audiences and subjects. Deliberately
left every field blank rather than guess or blend. If a human confirms this row = the Camino
program: "rising sophomore/junior" maps unambiguously to grades 10/11, but "born in
2009/2010" doesn't convert to one exact age without knowing program dates vs. birthdates --
would still leave age blank rather than compute an approximation.

ID: fd51d7f8-1408-4d58-9558-47520758df3d
TITLE: PreCollege at Ringling College of Art and Design
STATUS: researched
minimum_age: 16
maximum_age: 18
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://catalog.ringling.edu/precollege (stored official_url/source_url --
www.ringling.edu/academics/precollege/ -- returned HTTP 403 on every attempt including
/apply/, confirmed genuinely inaccessible, not a one-off failure)
RETRIEVED: 2026-09-05
QUOTE: "high school students 16-18 years old"
CONFIDENCE: explicit_stated (age, from the alternate URL); could_not_access (the stored URL itself)
NOTES: Substituted a different official Ringling domain since the stored URL is dead. An
unverified web-search lead suggested "10th, 11th, or 12th grade" from a FAQ PDF that was ALSO
403-blocked when fetched directly -- could not confirm, left grades blank rather than use an
unverified snippet. The stored official_url itself may need updating, not just the eligibility
fields.

ID: ff5d9710-80d3-47ae-959a-b8b40406f003
TITLE: Warwick University Pre-University Summer Programme 2026
STATUS: researched
minimum_age: 16
maximum_age: 17
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://warwick.ac.uk/study/summer-with-warwick/pre-university-summer-school/
RETRIEVED: 2026-09-05
QUOTE: "If you are an enthusiastic and motivated 16-17 year old student... our Warwick
Pre-University Summer School is for you."
CONFIDENCE: explicit_stated (age); page_silent (grade, country)
NOTES: Page says students come "from around the world" but that's descriptive, not a formal
eligibility statement -- left eligible_countries blank rather than fill in as "open to all."
```

### Batch 5's own methodology note, worth preserving
Independently hit the same shared-browser-pane collision this session found itself: mid-task,
its own tab's content was silently overwritten by a concurrently-running batch worker's
navigation to a UKMT URL (also present in this batch). Reverted to WebFetch for the remaining
rows rather than trust the corrupted tab state, and in response tightened its own bar further
-- declined to fill grade fields on 2 rows (176, 187) where the tool returned only a paraphrase
of a chart/table, never an actual quoted sentence.

### Six items flagged for human decision across batch 5, not research answers:
1. ICS (178) -- homepage hosts several unrelated competitions, no single eligibility.
2. Trinity "London, Ireland" (183) -- landing page doesn't match a 14-18 audience; internally
   inconsistent title.
3. Wharton Global Youth (187) -- eligibility fragmented across many graduation-year cohorts.
4. **Universidad de Navarra (188) -- HIGHEST PRIORITY: the two stored URLs describe two
   completely different programs (high-school Camino trip vs. university business
   competition). Needs a human decision before this row gets ANY eligibility data.**
5. Columbia Spring Immersion (184) -- likely a title/URL rebrand mismatch, needs confirmation.
6. Ringling PreCollege (189) -- stored official_url is dead; substituted URL used for partial data.

## Batch 1 results (rows 96-114) -- redispatched after the reset

```
ID: 903962c1-dca6-45c2-9c19-593d3b1e7271
TITLE: Girl Up Club (found and lead a chapter)
STATUS: could_not_access
CONFIDENCE: could_not_access
NOTES: girlup.org on known-blocked list (confirmed 403 yesterday) -- not attempted, per instructions.

ID: 9193db16-7a9e-42b1-95b6-74eda83a0ac9
TITLE: International Economics Olympiad (IEO)
STATUS: researched
minimum_age: blank
maximum_age: 19
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://ieo-official.org/regulations
RETRIEVED: 2026-09-05
QUOTE: "Contestants must have been born less than 20 years before 30 June of the year of
participation."; "They must be working toward receiving a high-school (secondary school)
diploma..."; "The contestants should be citizens or residents of the country that their team
represents."; "International students who attend schools in a participating country... can
participate... as part of the officially selected team representing said country."
CONFIDENCE: explicit_stated
NOTES: *** FLAG FOR HUMAN DECISION *** -- age rule is date-relative ("under 20 as of June 30"),
recorded as maximum_age=19 but the real rule is in the quote. Country eligibility is a
team-based model (citizen/resident of ~74-75 listed countries representing that country's
team, OR an international student attending school in a participating country) -- not a simple
restrictive list. Flagging how to encode this "broad, team-structured" model rather than
inventing a partial list.

ID: 93d45f34-4078-4d15-be6f-d6e157a21943
TITLE: The Concord Review - Emerson Prize
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://tcr.org/submit (general rule) + https://tcr.org/page-1826185 (Emerson Prize
page, found via search -- neither given URL pointed to it)
RETRIEVED: 2026-09-05
QUOTE: "You may submit a paper to The Concord Review if you completed the paper before
finishing secondary school."; "we have published essays from 46 countries so far"
CONFIDENCE: page_silent
NOTES: Emerson Prize is only awarded to already-published TCR essays, so TCR's general
submission rule is the real eligibility gate. Did not map "secondary school" to US grades --
TCR is explicitly international (46 countries), where "secondary school" spans different grade
structures by country, so a US 9-12 inference felt unjustified here (contrast with the
single-country "lise" cases elsewhere in this slice, where the mapping is well-defined).

ID: 948b2e5f-1ec8-4838-9a0a-01c928b02a8c
TITLE: Georgetown Pre-College Online Program (Medicine / Journalism & Media)
STATUS: researched
minimum_age: 13
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://georgetown.precollegeprograms.org/medicine
RETRIEVED: 2026-09-05
QUOTE: "For students ages 13 and up"
CONFIDENCE: explicit_stated
NOTES: Row title bundles two tracks (Medicine / Journalism & Media) but only a Medicine URL was
given -- Journalism & Media unresearched. No max age, grade, or country language found.

ID: 95093e1a-fc13-4d9a-b4ed-5f0584252b44
TITLE: Interlochen Review
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [9,10,11,12]
eligible_countries: blank
SOURCE_URL: https://www.interlochenreview.org/submit
RETRIEVED: 2026-09-05
QUOTE: "talented high school writers, singer-songwriters and artists (grades 9-12 or high
school postgraduate year)"; "from around the world to submit their work"
CONFIDENCE: explicit_stated
NOTES: Page also allows a "postgraduate year" beyond grade 12 -- the array doesn't capture
that. Explicitly worldwide, no restriction stated, eligible_countries deliberately left blank.

ID: 960dcf4d-322c-4e72-8c99-0a1d3368b2ea
TITLE: THIMUN The Hague Conference
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://thehague.thimun.org/de-hague-conference/
RETRIEVED: 2026-09-05
QUOTE: "Only students from participating schools can apply"; Terms & Conditions page: "you (i)
are over the age of sixteen (16) or (ii) received the appropriate legal parental or guardian
approval"
CONFIDENCE: page_silent
NOTES: Delegate participation is gated through schools, not direct application -- no numeric
eligibility for delegates on the conference page itself. Found an age-16 clause on the T&Cs
page but judged it a standard website-ToS legal-capacity clause, NOT a stated conference
eligibility rule -- deliberately did not use it to avoid mislabeling a ToS clause as program
eligibility. The real Registration Handbook PDF likely has the actual rules but the fetch tool
couldn't parse it (returned corrupted/binary) -- a human with a PDF reader should check it.

ID: 97da3310-d517-4fea-bdec-2adeb92d3515
TITLE: Penn Apps
STATUS: no_data_found
CONFIDENCE: page_silent
NOTES: Pre-launch placeholder page (PennApps XXVII, "applications open October", email signup
only) -- no eligibility text published yet. Recheck once applications open.

ID: 97ff6f3d-665e-439a-b7b3-cde85267a90f
TITLE: Mathematical Olympiad for Girls
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: ["United Kingdom"]
SOURCE_URL: https://ukmt.org.uk/mathematical-olympiad-for-girls
RETRIEVED: 2026-09-05
QUOTE: "Year 11 and above (younger students may be entered at the school's discretion)"
[England & Wales]; "S4 and above" [Scotland]; "Year 12 and above" [Northern Ireland]; "UK
Schools Only"
CONFIDENCE: explicit_stated
NOTES: Floor differs by UK nation, no stated ceiling -- left eligible_grades blank rather than
invent an upper bound (real per-nation floors recorded in QUOTE). "UK Schools Only" explicit.

ID: 991e6bda-56b9-4b48-9a51-16e9f0ec7c38
TITLE: Maastricht Summer Program
STATUS: could_not_access
CONFIDENCE: could_not_access
NOTES: dreamapply.com application portal returned 403 Forbidden on 2 separate attempts (likely
blocks non-browser/automated traffic). Could not verify any eligibility data.

ID: 9b93f1ce-9114-4a2e-96b7-2823f6145d21
TITLE: Harvard CURE Initiative to Eliminate Cancer Disparities
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://cure.dfhcc.harvard.edu/
RETRIEVED: 2026-09-05
QUOTE: "high school and undergraduate students"; "students residing in or attending school in
Massachusetts"
CONFIDENCE: explicit_stated
NOTES: *** IMPORTANT SCHEMA-LEVEL FLAG *** -- the actual restriction is Massachusetts
residency/school attendance, narrower than any country-level field can express (most US
students outside MA would not qualify). Deliberately left eligible_countries blank rather than
write ["United States"], which would overstate eligibility -- the schema has no state/region
field, but this program needs one to be represented accurately. Worth checking whether other
rows in the full 190 have the same state-level-restriction problem.

ID: 9caff85d-6976-422e-8fa1-6893eaefa54c
TITLE: Cornell University (Precollege Studies)
STATUS: researched
minimum_age: 15
maximum_age: 19
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://sce.cornell.edu/audience/precollege-studies/ + https://sce.cornell.edu/pc-apply-eligibility/
RETRIEVED: 2026-09-05
QUOTE: "you must have completed your sophomore year of high school (grade 10 or the
international equivalent)"; "online summer or winter program... between 15 and 19"; "on-campus
summer commuter program... between 16 and 19"; "residential summer program... between 16 and
18"; "If you will have graduated from high school... you must be under the age of 18"
CONFIDENCE: explicit_stated
NOTES: *** FLAG FOR HUMAN DECISION *** -- landing page bundles 4 tracks with DIFFERENT age
bands (online 15-19, commuter 16-19, residential 16-18, post-grad <18). Reported min=15/max=19
as the outer envelope (union) so no eligible student is wrongly excluded, but no single track
actually spans the full range -- consider splitting into per-track rows. Grade floor (completed
grade 10) is universal but floor-only, left eligible_grades blank.

ID: 9d4f568b-f14b-4925-bf79-753088583ffe
TITLE: PACT Program in Algorithmic and Combinatorial Thinking
STATUS: no_data_found
CONFIDENCE: page_silent
NOTES: Checked homepage + application page; neither states numeric age/grade/country
eligibility -- only "mostly high school students" and a subject-matter prerequisite.

ID: 9e601648-0d30-462e-b9f0-8d069392f29f
TITLE: Bentley University Pre-College Programs
STATUS: researched
minimum_age: 16
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.bentley.edu/precollege/student-experience
RETRIEVED: 2026-09-05
QUOTE: "Students must be 16 years old by September 1 to live on campus, but younger students
can register as commuter students or take online sessions."
CONFIDENCE: explicit_stated
NOTES: The 16-by-Sept-1 rule is specifically for the RESIDENTIAL track -- the same sentence
says younger students CAN participate via commuter/online (no minimum stated for those).
Recording min=16 understates true eligibility -- flagging for a possible track split.

ID: 9f0bb452-86ff-4f7b-93fd-9e23298c2d3b
TITLE: Frontiers Overview (WPI)
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [10,11,12]
eligible_countries: blank
SOURCE_URL: https://www.wpi.edu/academics/pre-collegiate/summer-programs/frontiers
RETRIEVED: 2026-09-05
QUOTE: "Rising 10, 11, and 12th graders"; "TOEFL, IELTS, or Duolingo English Test (international
applicants only)"
CONFIDENCE: explicit_stated
NOTES: International applicants clearly accommodated (dedicated English test requirement) but
no explicit country list, so eligible_countries left blank rather than assumed unrestricted.

ID: 9f1b802e-cbc1-4af2-98f1-ffddfa06140b
TITLE: Pre-College Summer Programs (UChicago -- Immersion/Stones and Bones/Summer
Bridge/Summer College)
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://summer.uchicago.edu/pre-college/
RETRIEVED: 2026-09-05
QUOTE: "All students who apply, regardless of citizenship are considered for admission and
aid."; "You will be asked to indicate your current grade level. Based upon your current grade
level, the application will provide you with programs you are eligible to apply for."
CONFIDENCE: page_silent
NOTES: *** FLAG FOR HUMAN DECISION *** -- row bundles 4 distinct named programs; live site
determines eligibility dynamically per-applicant rather than publishing static numbers.
Third-party aggregators claim "9th-11th grade, age 14+" for Immersion specifically, but per
the task rules this was NOT used as sourced data (every guessed official subpage URL 404'd).
International eligibility IS explicitly confirmed open ("regardless of citizenship") -- a real
finding even without a restrictive list. Recommend a human locate the correct per-program URLs.

ID: 9f611eed-7787-4d26-b1a5-7c9cda0439aa
TITLE: XLAB International Science Camp, Germany
STATUS: researched
minimum_age: 17
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://xlab-goettingen.de/en/
RETRIEVED: 2026-09-05
QUOTE: "If you are at least 17 years old and... interested in natural sciences..."
CONFIDENCE: explicit_stated
NOTES: "From all over the world" reads as a pitch/benefit, not a formal eligibility statement --
no restrictive country language found, eligible_countries left blank. No max age or grade.

ID: a17202b1-b8da-4ed4-8cf7-ee0506d01653
TITLE: Sevenoaks School Summer Program
STATUS: researched
minimum_age: 11
maximum_age: 16
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.sevenoakssummerprogramme.co.uk/
RETRIEVED: 2026-09-05
QUOTE: "bright, ambitious students aged from 11-16"; "60 nationalities join our summer
programmes each year"
CONFIDENCE: explicit_stated
NOTES: Clean explicit age range. "60 nationalities" describes past participation, not a formal
eligibility rule, so eligible_countries left blank.

ID: a4451907-20af-43d3-8498-25a3829254c1
TITLE: Acıbadem Üniversitesi Lise Yaz Programları
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [9,10,11,12]
eligible_countries: blank
SOURCE_URL: https://www.acibadem.edu.tr/merkezler/asegem/egitim-programlari/akademik-gelisim-programlari/lise-yaz-bilim-kampi
RETRIEVED: 2026-09-05
QUOTE: "Lise öğrencileri" ("high school students"); requires signed parental permission form
CONFIDENCE: explicit_stated (for "lise öğrencileri" itself); [9,10,11,12] is an INFERRED
mapping, not literal page numbers
NOTES: Same "lise" = grades 9-12 inferred mapping as Sabancı/Galatasaray elsewhere in this
slice, flagged as inference. No age or country restriction stated (parental-consent
requirement + Turkish-only page suggest a Turkey-resident audience in practice, but did NOT
fill eligible_countries from that inference since it's speculative, not stated).

ID: a4a24425-2a6f-4902-99a4-4fb43dc110dd
TITLE: Harvard Pre-Collegiate Economics Challenge (HPEC)
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.thehuea.org/competitions/hpec
RETRIEVED: 2026-09-05
QUOTE: "for high-school students passionate about economics"; "The full 2026-27 rules, team
size, and registration details will be posted when registration opens."
CONFIDENCE: page_silent
NOTES: Detailed rules explicitly NOT YET POSTED for the 2026-27 cycle -- a "not yet published"
state, distinct from permanently silent; should be rechecked closer to registration opening.
```

### Six items flagged for human decision across batch 1, not research answers:
1. Cornell (rn=106) -- bundles 4 tracks with different age bands (15-19/16-19/16-18/<18);
   reported the non-excluding union, but consider splitting into per-track rows.
2. UChicago Pre-College (rn=110) -- bundles 4 programs, site determines eligibility
   dynamically, no working per-program official URLs found.
3. Georgetown Pre-College (rn=99) -- title names two tracks, only one URL/track researched.
4. **Harvard CURE (rn=105) -- schema-level flag: real restriction is Massachusetts residency,
   which no existing field (country or otherwise) can express without overstating
   eligibility. Worth checking if this pattern recurs elsewhere in the full 190.**
5. THIMUN (rn=101) -- a ToS age clause found but deliberately not used as eligibility; real
   rules likely in a PDF the fetch tool couldn't parse.
6. IEO (rn=97) -- team-structured country model (citizen/resident of ~75 countries OR
   international student in a participating country) doesn't fit a flat list; needs a
   modeling decision.

## Batch 3 results (rows 134-152) -- redispatched after the reset

This agent went further than asked -- cross-checked most claims against raw HTML (curl)
alongside the fetch tool, on its own initiative, in response to the "tool summary is not
evidence" instruction.

```
ID: c2444f7f-e137-411d-9a14-c1ba8052e217
TITLE: Brown University (RI, USA)
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://precollege.brown.edu/programs (hub) + /pre-baccalaureate (verified sub-page)
RETRIEVED: 2026-09-05
QUOTE: "Explore our programs for high school students..."; Pre-Baccalaureate: "Rising or
recently graduated High School Seniors, age 17 by June 14, 2026" (raw-HTML verified)
CONFIDENCE: page_silent
NOTES: *** FLAG FOR HUMAN DECISION *** -- hub links 8 distinct programs, each with different
eligibility. Only Pre-Baccalaureate was independently verified. No single number honestly
represents "Brown University" as a catalog row.

ID: c35f002c-a4b2-4965-b07f-ba775eb0e31e
TITLE: Wharton Sports Analytics and Business Initiative
STATUS: researched
minimum_age: 14
maximum_age: 18
eligible_grades: [9,10,11,12]
eligible_countries: blank
SOURCE_URL: https://wsb.wharton.upenn.edu/wharton-data-competition/rules/
RETRIEVED: 2026-09-05
QUOTE: "'High school' is typically secondary-level (no younger than 14, no older than 18 at
the start of the competition)... e.g., generally 9th-12th grade in the United States."; "open
to all current high school students"
CONFIDENCE: explicit_stated
NOTES: Verified via raw HTML. Grades 9-12 is explicitly the US EXAMPLE within a
country-relative definition, other countries' equivalents accepted but not enumerated -- no
formal country list. *** Same underlying competition as row 150 (cfb32772) -- see that row. ***

ID: c3a16d0e-55d1-4dd7-9c5e-d930a83b0460
TITLE: Kış Bilim Kampı
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [9,10,11,12] (inferred)
eligible_countries: blank
SOURCE_URL: https://www.acibadem.edu.tr/merkezler/asegem/egitim-programlari/akademik-gelisim-programlari/lise-kis-bilim-kampi
RETRIEVED: 2026-09-05
QUOTE: "Hedef Kitle Lise öğrencileri." (Target Audience: High school students.)
CONFIDENCE: explicit_stated (for "lise" itself); [9,10,11,12] inferred, not literal
NOTES: Same lise=9-12 inferred mapping as other Acıbadem/Sabancı/Galatasaray rows in this
slice. No age or country restriction stated.

ID: c406c406-41f7-4ef9-8599-d72cd3f53239
TITLE: Hamilton Olympiad
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [9] (inferred -- see notes)
eligible_countries: blank
SOURCE_URL: https://ukmt.org.uk/intermediate-challenges/cayley-hamilton-maclaurin-olympiad-challenge
RETRIEVED: 2026-09-05
QUOTE: "Hamilton Maths Olympiad: England, Wales and Overseas: Year 10 Scotland: S3 Northern
Ireland: Year 11."; "Entry... is by invitation based on a qualifying IMC score, or by
discretionary entry."
CONFIDENCE: explicit_stated (UK year facts); [9] is an inferred US-grade equivalent, not literal
NOTES: *** FLAG *** invitation-only (qualifying score or discretionary entry), not open
application -- changes what "eligibility" means here. [9] uses standard Year10=S3=NI-Year11
≈ US Grade 9 (~age 14-15); a human may prefer the raw UK year-group text instead. "Overseas"
is one of the three listed categories -- non-UK entrants accommodated, no specific list given.

ID: c4e113c2-6e64-40d0-8251-0031ca86c64a
TITLE: American University, Washington DC
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.american.edu/summer/precollege/
RETRIEVED: 2026-09-05
QUOTE: "Community of Scholars: Designed for rising juniors and seniors"; "High School Summer
Scholars: Rising sophomores, juniors, and seniors"; "Discover the World of Communication: open
to students entering grades 9 through 12"; "Summer Civics Institute: for high school students"
CONFIDENCE: page_silent
NOTES: *** FLAG FOR HUMAN DECISION *** -- hub for 6+ distinct programs, no universal statement.
Site is Cloudflare-protected, could not cross-verify via raw HTML the way most other rows were
-- treat with slightly more caution. Batch's source_url (academic-calendar page) has zero
eligibility content -- likely a data error, flagged as discrepancy.

ID: c640746e-b7df-41df-88ca-31321a430d5b
TITLE: Taiwan International Student Design Competition (TISDC)
STATUS: researched
minimum_age: blank
maximum_age: 29
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.tisdc.org/en/rules/faq/
RETRIEVED: 2026-09-05
QUOTE: "Students who currently enroll at senior high schools or above... entrants must be born
after April 27, 1996, and younger than 30 years of age... Fresh graduates... and new students...
are also eligible."
CONFIDENCE: explicit_stated
NOTES: *** FLAG *** eligibility is "senior high school OR ABOVE" -- includes university
students, broader than a 14-18 audience. max=29 is a reading of "younger than 30"; the real
rule is a birth-date cutoff plus a maternity extension a single integer can't capture. Taiwan's
"senior high school" (3-year track) doesn't map cleanly to a 9-12 array, left blank.

ID: c6b985f9-1a40-4e8a-a2fb-63408263e66e
TITLE: Stanley Prep for Educational Excellence
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [11,12]
eligible_countries: blank
SOURCE_URL: https://stanleyprep.com/united-nations-advanced-training/
RETRIEVED: 2026-09-05
QUOTE: "Eligibility... College students... OR Rising 11th & 12th graders. Minimum GPA: 3.5
(unweighted)"; "TOEFL 90+ for non-US students (if applicable)"
CONFIDENCE: explicit_stated
NOTES: Two eligible tracks exist (college students; high schoolers) -- recorded grades reflect
only the high-school track. TOEFL clause implies international students accommodated, no
specific country list. Also requires 3.5 GPA, outside this schema.

ID: c7223aea-7bb9-4b29-b59d-a054d7bfa02c
TITLE: 67th London International Youth Science Forum (LIYSF) - 2026
STATUS: researched
minimum_age: 16
maximum_age: 21
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.liysf.org.uk/liysf/experience-liysf
RETRIEVED: 2026-09-05
QUOTE: "Students aged 16-21 with a strong interest in STEM subjects from any country."
CONFIDENCE: explicit_stated
NOTES: "From any country" is explicit no-restriction language, left blank per schema.
Caution: live page currently brands itself "LIYSF 2027"/"68th," mid-rollover between annual
editions -- core rule (16-21, any country) reads stable, but this row's "67th/2026" framing
may need a freshness check.

ID: c83420f7-8d0d-48b4-9eee-3659fc39706e
TITLE: iGEM High School Competition
STATUS: researched
minimum_age: 13
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://competition.igem.org/registration/team-roster
RETRIEVED: 2026-09-05
QUOTE: "All participants must be at least 13 years old as of March 31, 2026."; "High School
Competition: All team members are high school students on March 31, 2026."
CONFIDENCE: explicit_stated
NOTES: *** OPERATIONAL FLAG *** competition.igem.org is a pure JS-rendered SPA -- curl and
standard fetch both returned an empty shell; only a real browser render surfaced content. A
naive fetch on this domain looks exactly like could_not_access when content is actually
reachable -- worth noting for future research on this domain. Official /high-school page
itself just says "COMING SOON" for 2026 -- age rule came from the registration/team-roster
page instead. No country restriction found.

ID: c996443d-7360-4197-850a-339ef959d585
TITLE: Singularity AI Essay Contest
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [9,10,11,12]
eligible_countries: blank
SOURCE_URL: https://www.veritasai.com/singularity-ai-essay-contest
RETRIEVED: 2026-09-05
QUOTE: "Students enrolled in grades 9 to 12 as of May 31, 2026 are eligible to apply."; "open
to students from all countries worldwide"
CONFIDENCE: explicit_stated
NOTES: Explicitly a GRADE fact, no age numbers anywhere -- min/max age correctly left blank.
"All countries worldwide" explicit no-restriction, left blank per schema.

ID: cb2e1b38-c154-4cc7-9186-bb1aa4e724a7
TITLE: Stanford Summer Humanities Institute
STATUS: researched
minimum_age: 15
maximum_age: 17
eligible_grades: [10,11]
eligible_countries: blank
SOURCE_URL: https://summerhumanities.spcs.stanford.edu/admissions-humanities
RETRIEVED: 2026-09-05
QUOTE: "Students in grades 10-11... eligible... will be minors (younger than 18 years old)
that are at least 15 years old during the program."; "Financial aid can be awarded to both
domestic and international participants."
CONFIDENCE: explicit_stated
NOTES: Found on the admissions FAQ subpage (more specific than the official_url given).
"Domestic and international" implies non-US accepted, not a formal country list.

ID: cb4a1030-d035-4c1f-8579-37c458a88b0e
TITLE: Blue Ocean Competition
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://blueoceancompetition.org/
RETRIEVED: 2026-09-05
QUOTE: "attracts the very best high school-aged entrepreneurs from all over the world."
CONFIDENCE: page_silent
NOTES: Checked homepage, About x2, FAQ -- none states numeric age/grade. Country list
(Ireland/Uganda/Italy/etc.) describes past participants, not a rule -- not encoded.

ID: ccc1ff13-8673-4ba0-95fc-17050eee4306
TITLE: Mathworks (Honors Summer Math Camp)
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.txst.edu/mathworks/mathworks-camps/hsmc.html
RETRIEVED: 2026-09-05
QUOTE: "HSMC is a six-week, residential camp for high school students."
CONFIDENCE: page_silent
NOTES: Batch's source_url (a faculty CV page) is not an official program page -- data error,
used official_url instead. Only "high school students" stated, no numbers. Country sentence
(mostly US, some international students named) describes past participants, not a rule.

ID: ce680bf5-d52a-444e-a7de-ed1789cfc6aa
TITLE: Immerse Education Essay Competition
STATUS: researched
minimum_age: 13
maximum_age: 18
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.immerse.education/essay-competition/
RETRIEVED: 2026-09-05
QUOTE: "Free for 13-18 year old students worldwide."; "students... will be 13-18 years old
when the programmes for which the scholarships are valid begin."
CONFIDENCE: explicit_stated
NOTES: "Worldwide" explicit no-restriction, left blank per schema. Age measured against
program start, not submission date -- a borderline 18-year-old could be ineligible if they
turn 19 before the program starts; flagging since a flat "18" doesn't fully capture this.

ID: ce7d618b-debf-4508-87e1-f6905540bf8d
TITLE: University of California, Santa Barbara, CA, USA
STATUS: researched
minimum_age: blank
maximum_age: blank
eligible_grades: [9,10,11] (union of 2 sub-programs)
eligible_countries: blank
SOURCE_URL: https://summer.ucsb.edu/programs/research-mentorship-program/admissions +
/summer-research-academies/admissions
RETRIEVED: 2026-09-05
QUOTE: RMP: "High school student in the 10th or 11th grade (outstanding 9th graders accepted
on a case-by-case basis)"; SRA: "High school student in the 9th, 10th, or 11th grade"; both:
"TOEFL/English language proficiency exam scores are NOT needed for International applicants."
CONFIDENCE: explicit_stated
NOTES: *** FLAG FOR HUMAN DECISION *** -- hub for exactly 2 programs. Both exclude
12th-graders/seniors, both waive TOEFL for international applicants (implying no nationality
restriction, no formal list given). [9,10,11] is a union; RMP's 9th-grade path is discretionary
not standard -- a human may prefer two separate rows.

ID: cf169cf4-a589-4743-a70f-e1efd28fbcd2
TITLE: John Locke Institute (JLI) Courses
STATUS: researched
minimum_age: 12
maximum_age: 19
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.johnlockeinstitute.com/jli-courses
RETRIEVED: 2026-09-05
QUOTE: "Our summer schools introduce students aged 12-19 to university-level courses..."
CONFIDENCE: explicit_stated
NOTES: Age statement found on /jli-courses subpage, not the homepage given. A "100 countries"
quote on the homepage describes JLI's separate Global Essay Prize product, NOT this Courses
row -- deliberately not used here to avoid attributing one product's stat to a different one.

ID: cfb32772-6259-4e3a-9ead-bc289b463d08
TITLE: Wharton Data Science Competition
STATUS: researched
minimum_age: 14
maximum_age: 18
eligible_grades: [9,10,11,12]
eligible_countries: blank
SOURCE_URL: https://wsb.wharton.upenn.edu/wharton-data-competition/rules/ (cross-referenced via
https://globalyouth.wharton.upenn.edu/competitions/data-science/)
RETRIEVED: 2026-09-05
QUOTE: globalyouth page: "The Wharton High School Data Science Competition is a free...
competition from the Wharton Sports Analytics and Business Initiative, supported by the
Wharton Global Youth Program."; rules page: same "no younger than 14, no older than 18...
generally 9th-12th grade in the United States" quote as row 135.
CONFIDENCE: explicit_stated
NOTES: *** FLAG FOR HUMAN DECISION, HIGH PRIORITY *** -- this row's official_url is a
directory entry for the SAME "Wharton High School Data Science Competition" as row 135
(c35f002c, wsb.wharton.upenn.edu). The globalyouth page only links to it, doesn't restate
rules itself -- sourced from the same rules page used for row 135. Rows 135 and 150 may be
DUPLICATE catalog entries for one real opportunity.

ID: cfe42a66-3688-43aa-8e7e-61ffca68adb8
TITLE: AwesomeMath Summer Program
STATUS: researched
minimum_age: 12
maximum_age: 18
eligible_grades: blank
eligible_countries: blank
SOURCE_URL: https://www.awesomemath.org/summer-program/overview/program-information/
RETRIEVED: 2026-09-05
QUOTE: "an intensive three-week online summer math camp for gifted middle and high school
students ages 12-18 from around the globe."
CONFIDENCE: explicit_stated
NOTES: Age range explicit; grade given only as "middle and high school" (~7-12), not specific
numbers, left blank. Note: page describes this as ONLINE -- if the catalog's existing
description implies in-person, worth a freshness check.

ID: d12506f1-d77e-49c2-9dc8-55fe610da9b0
TITLE: Lehigh University
STATUS: researched
minimum_age: 14
maximum_age: 17
eligible_grades: [10,11,12]
eligible_countries: blank
SOURCE_URL: https://academicoutreach.lehigh.edu/pre-college-programs
RETRIEVED: 2026-09-05
QUOTE: "Open to rising 10th, 11th, and 12th graders. Participant must be 14-17 years old to
participate."
CONFIDENCE: explicit_stated
NOTES: Single specific program page, no ambiguity. No country restriction found. Batch's
source_url (global.lehigh.edu, general international-affairs site) confirmed unrelated to
this program -- discrepancy noted.
```

### Six items flagged for human decision across batch 3, not research answers:
1. Brown (134) and American University (138) -- both hub pages linking 6-8 distinct programs
   each, no single honest value at this row's grain.
2. UCSB (148) -- hub links 2 programs, merged as a union but blurs a real distinction (RMP's
   9th-grade path is discretionary, SRA's isn't).
3. **Rows 135 and 150 -- likely DUPLICATE catalog entries for the same real Wharton High
   School Data Science Competition, found via cross-reference. Worth checking before
   dispatching further research to either.**
4. Hamilton Olympiad (137) -- invitation-only (qualifying score or discretionary entry), not
   open application like the rest of the batch -- may not belong in an age/grade/country
   "fit" catalog the same way.
5. TISDC (139) -- eligibility extends to university students up to ~29, broader than this
   catalog's 14-18 focus -- worth confirming it belongs at all.
6. Inferred grade mappings on rows 136/137 (Turkish "lise", UK Year/S-levels) -- flagged as
   inference per the rules, human/compiler should decide whether to keep converted numbers or
   store raw source terms.
