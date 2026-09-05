# Batch 2 results (rows 115-133 of slice 96-190) — recovered after environment reset

Environment reset wiped all scratchpad state (all session scratchpads empty as of ~20:30-20:38).
This is batch 2's completed agent output, preserved from conversation context before it could
be lost too. Batches 1, 3, 4, 5 were never completed and must be redispatched.

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
