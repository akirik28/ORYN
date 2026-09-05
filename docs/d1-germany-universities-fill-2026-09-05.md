# D1 — Germany universities fill, 2026-09-05

Founder's instruction relayed by CEO, assigned after the United Kingdom batch merged
(`35a9fd15`, 53 universities). **This session's lane: Germany.**

## Measured live before writing anything (own query, reconciled against CEO's number)

49 canonical German universities. CEO's own live count named 32 as "missing content":

```
neither university_requirements nor university_programs:   32
university_requirements only:                                0
university_programs only (no requirements):                   6
both tables populated:                                       11
```

32 matches CEO's number exactly. **Per the same precedent set in the UK batch, the 6
programmes-only universities are included as cheaper wins** — three of them are genuinely
high-value: Freie Universität Berlin (QS 98), RWTH Aachen (QS 104), and KIT (QS 110) all
already carry real programme data (75/77/45 rows) but zero requirements, the single most
surprising finding in this measurement — three of Germany's most recognizable technical/
research universities were completely missing the one thing the browse filter actually checks.
38 universities total in scope.

**Ordering:** by QS World University Ranking ascending, same convention as the UK batch.

## Two Germany-specific challenges, per CEO's explicit heads-up

**1. Abitur equivalency is not computed here.** German admission requirements are defined
per-state (Bundesland) and per-institution, almost always expressed relative to the Abitur
(Germany's own secondary-leaving qualification) rather than as a portable international
threshold. This session does **not** attempt to translate a source's Abitur-relative statement
into an equivalent for a Turkish curriculum or any other — whatever the official source states
is recorded as stated, in its own terms.

**2. Uni-assist usage is recorded when the source states it, not inferred.** Uni-assist e.V. is
a centralized pre-application document-checking service used by many but not all German
universities. Whether a given institution uses Uni-assist is real, actionable information for
an applicant (it changes where documents are submitted and when the process starts) — recorded
explicitly whenever an official source states it, left NULL when not confirmed, never assumed
either way.

**3. German-taught vs. English-taught programs need different language tests, and this is a
real source of confusion to guard against:** DSH or TestDaF for German-taught programs, IELTS
or TOEFL for English-taught programs. Every entry below states which language a given fact
applies to, rather than listing a language-test score without saying what it's a score for.

## A specific count CEO asked this session to keep: cycle-dependent policy

CEO named a specific number from the US lane (12% of institutions had a policy that genuinely
differs by admission cycle — e.g. a different deadline or requirement for Wintersemester vs.
Sommersemester intake, not just an evergreen figure) and asked whether Germany's own rate is
similarly high, since it bears on a decision made today. **Tracked per-entry below and totaled
at the end of this document.**

## Standing methodology (unchanged from every prior batch)

Official source only · `source_url` + retrieval date on every fact · unfound fields left NULL,
never guessed · an inaccessible official page (HTTP 403/404, or JavaScript-rendered content
this session's tools can't extract) is marked `data_confidence='medium'` with the reason
stated · program or requirement content is what the browse filter actually checks now
(`d8e6fa43`) — a bare source-citation row does not move a university into the "detailed
profiles" list.

**SQL below is staged, not applied** — CEO packages, applies, and assigns the migration number.

---

## 1. Freie Universität Berlin — cheaper win: already has 75 programme rows, only requirements missing

`id = '587182b4-7f99-438c-95d6-dc772488d1a7'` — QS rank =98. **Cycle-dependent policy: NO**
(single intake, see below — recorded as a structural fact, not a cross-cycle variation).

**Sources actually used:**
1. `https://www.fu-berlin.de/en/studium/bewerbung/bachelor/allgemein/informationen/index.html`
   — official page, directly fetched.
2. A general search confirming the July 2025 winter-semester filing window and language-test
   names, not independently re-verified by direct fetch of that specific sub-page.

**Uni-assist: confirmed used, directly on the official page.** Applicants holding a foreign
(non-German) higher education entrance qualification must apply "via uni-assist" -- FU Berlin's
own term for the general qualification is "Higher Education Entrance Qualification (HZB)," the
umbrella category Abitur and its foreign equivalents both fall under. Fee: EUR 75 for the first
programme applied to, EUR 30 for each additional one (per a general search, not independently
confirmed by direct fetch).

**A real structural fact, not a data gap:** FU Berlin only admits to its standard Bachelor's
subject programmes for the Winter Semester -- there is no Summer Semester intake for these
programmes. Not counted as "cycle-dependent" in this document's tracked count (there being one
annual intake is a stable fact, not a policy that varies cycle-to-cycle).

**What was checked and NOT found:** a specific numeric GPA threshold on the official page
itself (a general search cites 3.0/4.0 as a rough US-GPA-scale figure, not independently
confirmed and not directly transferable to a German-context decision, so not recorded as an
official figure); application deadline was not independently re-verified via direct fetch of
FU Berlin's own deadlines page.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('587182b4-7f99-438c-95d6-dc772488d1a7', 'international_requirement',
   'Applicants with a foreign (non-German) Higher Education Entrance Qualification (HZB) must apply via uni-assist e.V., which pre-checks documents before FU Berlin''s own admissions process',
   'FU Berlin''s official application-information page states that applicants holding a foreign higher education entrance qualification must submit their application "via uni-assist" -- a centralized, external document-checking service used before the university''s own admissions process runs. Applicants who already hold a German qualification and are only adding modules use an internal FU Berlin procedure instead, not uni-assist.',
   true, 'high', 'https://www.fu-berlin.de/en/studium/bewerbung/bachelor/allgemein/informationen/index.html', now()),
  ('587182b4-7f99-438c-95d6-dc772488d1a7', 'language_proficiency',
   'German-taught programmes: TestDaF TDN 4, DSH-2, or Goethe-Zertifikat C1 (per a general search, not independently confirmed by direct fetch of the specific requirements page)',
   'For programmes taught in German, accepted proof of language proficiency reportedly includes TestDaF at TDN 4 in all sections, DSH Level 2, or the Goethe-Zertifikat C1 -- this specific detail comes from a general search rather than this session''s own direct read of FU Berlin''s dedicated language-requirements page. English-taught programmes would instead require IELTS/TOEFL, not checked in this pass since this session did not confirm which of FU Berlin''s programmes are English-taught.',
   true, 'medium', 'https://www.fu-berlin.de/en/studium/bewerbung/bachelor/allgemein/informationen/index.html', now());

insert into public.university_deadlines
  (university_id, deadline_type, deadline_date, application_cycle, source_url, retrieved_at, deadline_text_verbatim)
values
  ('587182b4-7f99-438c-95d6-dc772488d1a7', 'application', '2026-07-15', 'Winter Semester 2026/27 (via uni-assist)',
   'https://www.fu-berlin.de/en/studium/bewerbung/bachelor/allgemein/informationen/index.html', now(),
   'A general search (not independently confirmed on FU Berlin''s own deadlines sub-page) states the uni-assist filing window for a recent winter semester ran 1 June to 15 July; FU Berlin admits to standard Bachelor''s subject programmes for Winter Semester only, with no Summer Semester intake for these programmes.');
```

---

## 2. RWTH Aachen University — cheaper win: already has 77 programme rows, only requirements missing

`id = 'cbbbed73-34f9-4cbf-abfc-2c0594bda8cd'` — QS rank 104. **Cycle-dependent policy: NO.**

**Source actually used:** `https://www.rwth-aachen.de/cms/root/studium/vor-dem-studium/
zugangsvoraussetzungen/~bxip/besonderheiten-internationale-studienint/?lidx=1` — official page,
directly fetched.

**Uni-assist claim checked and corrected before writing anything:** a general search stated
RWTH Aachen international applications go through uni-assist -- the official page itself states
the opposite: **applications are submitted directly through RWTHonline**, RWTH's own portal,
with no mention of uni-assist anywhere on this page. Given CEO''s explicit instruction that
uni-assist usage is real, actionable information for a student, getting this specific fact
backwards would be worse than leaving it blank -- used the directly-fetched official statement,
not the search summary.

**Grade threshold recorded exactly as the source states it, not converted:** "an average grade
of 2.5 or better" on RWTH's own German grading scale (where lower is better) -- per CEO's
explicit instruction, this session does not compute what 2.5 corresponds to on any other
country's scale.

**A genuinely notable structural fact:** RWTH "currently does not offer any fully
English-taught bachelor's degree programmes" -- every Bachelor's applicant needs German
proficiency, a clean, unambiguous, officially-stated fact rather than a gap.

**What was checked and NOT found:** specific German-language proficiency test/score
(DSH/TestDaF level) for Bachelor's entry -- this page states German is required but does not
itself name a specific test threshold; application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('cbbbed73-34f9-4cbf-abfc-2c0594bda8cd', 'minimum_grade',
   'University entrance qualification average grade of 2.5 or better, on RWTH''s own German grading scale; a lower average may be compensated for by a TestAS result',
   'International applicants to a Bachelor''s or Staatsexamen (state examination) programme must have an average grade of 2.5 or better for their university entrance qualification, stated on RWTH''s own German grading scale (lower is better) -- not converted to any other country''s scale here. A lower overall grade can be compensated for by submitting a TestAS (Test for Academic Studies) result; TestAS is mandatory (not merely a compensating option) for state-examination applicants to Medicine and Dentistry specifically.',
   true, 'high', 'https://www.rwth-aachen.de/cms/root/studium/vor-dem-studium/zugangsvoraussetzungen/~bxip/besonderheiten-internationale-studienint/?lidx=1', now()),
  ('cbbbed73-34f9-4cbf-abfc-2c0594bda8cd', 'international_requirement',
   'Applications are submitted directly through RWTHonline, RWTH''s own portal -- NOT through uni-assist',
   'Unlike some other German universities, RWTH Aachen does not route international Bachelor''s applications through uni-assist e.V.; applications are submitted directly through RWTHonline, the university''s own application system.',
   true, 'high', 'https://www.rwth-aachen.de/cms/root/studium/vor-dem-studium/zugangsvoraussetzungen/~bxip/besonderheiten-internationale-studienint/?lidx=1', now()),
  ('cbbbed73-34f9-4cbf-abfc-2c0594bda8cd', 'language_proficiency',
   'RWTH currently offers NO fully English-taught bachelor''s degree programmes -- German proficiency is required for every Bachelor''s programme',
   'RWTH Aachen states it "currently does not offer any fully English-taught bachelor''s degree programmes" -- every Bachelor''s applicant needs German-language proficiency; a specific DSH/TestDaF score threshold was not stated on this page. Some Master''s programmes may be taught in English, not detailed further in this pass.',
   true, 'high', 'https://www.rwth-aachen.de/cms/root/studium/vor-dem-studium/zugangsvoraussetzungen/~bxip/besonderheiten-internationale-studienint/?lidx=1', now());
```

---

## 3. KIT, Karlsruhe Institute of Technology — cheaper win: already has 45 programme rows, only requirements missing

`id = '6bbfe7ba-1d03-4679-a86c-eabca0024870'` — QS rank 110. **Cycle-dependent policy: NO**
(winter-only, same structural pattern as FU Berlin and RWTH Aachen).

**Source actually used:** `https://www.intl.kit.edu/istudies/3167.php` — official page, directly
fetched.

**A second confirmed non-uni-assist German technical university:** like RWTH Aachen (#2), KIT
applications go directly through KIT''s own online portal, with no mention of uni-assist on this
page -- a real, emerging pattern (both are technical/engineering-focused universities) worth
tracking as this batch continues, per CEO''s explicit interest in which institutions actually
use uni-assist.

**A genuinely distinctive two-stage German-language requirement:** B1 German is required just
to submit the application; the higher DSH-2 or TestDaF level 4-4-4-4 is required only by
enrollment (not application) -- a real staged structure, not a single fixed threshold.

**What was checked and NOT found:** English-taught bachelor programmes -- this page discusses
none, consistent with the pattern already seen at RWTH Aachen; tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('6bbfe7ba-1d03-4679-a86c-eabca0024870', 'international_requirement',
   'Applications are submitted directly through KIT''s own online application portal -- NOT through uni-assist; bachelor admission occurs only once per year, for the Winter Semester (no Summer Semester intake for first-semester bachelor entry)',
   'KIT does not route international bachelor applications through uni-assist e.V.; applications are submitted directly through KIT''s own portal. Applying for a bachelor''s place at KIT is possible only once a year, for the Winter Semester -- there is no Summer Semester admission for first-semester bachelor''s study (Summer Semester intake exists only for preparatory courses and higher-semester entry).',
   true, 'high', 'https://www.intl.kit.edu/istudies/3167.php', now()),
  ('6bbfe7ba-1d03-4679-a86c-eabca0024870', 'language_proficiency',
   'German-taught programmes, two-stage requirement: German level B1 required to APPLY, rising to DSH-2 or TestDaF 4-4-4-4 required by ENROLLMENT (not at application stage)',
   'For German-taught programmes, applicants need German language proficiency at level B1 to submit the application itself; by the time of enrollment, the higher threshold of DSH Level 2 or TestDaF level 4-4-4-4 (score 4 in all four sections) is required. This is a genuinely staged requirement -- B1 does not remain sufficient through enrollment. No English-taught bachelor programmes are discussed on this page.',
   true, 'high', 'https://www.intl.kit.edu/istudies/3167.php', now());

insert into public.university_deadlines
  (university_id, deadline_type, recurrence, recurrence_month, recurrence_day, application_cycle, source_url, retrieved_at, deadline_text_verbatim)
values
  ('6bbfe7ba-1d03-4679-a86c-eabca0024870', 'application', 'recurring_annual_undated', 7, 15, 'Winter Semester (annual, only intake for first-semester bachelor entry)',
   'https://www.intl.kit.edu/istudies/3167.php', now(),
   'Official page: "Applying for a place in a bachelor''s degree course at KIT is possible only once a year (for the winter semester)" with a deadline of July 15.');
```

---

## 4. Technische Universität Dresden

`id = '9b957f10-d9d0-4a64-b28e-601bd6cc8a61'` — QS rank =185. **Cycle-dependent policy:
unconfirmed** (not established either way in this pass).

**Source actually used:** `https://tu-dresden.de/studium/vor-dem-studium/bewerbung/online-
bewerbung/bewerbungsverfahren-ueber-uni-assist?set_language=en` — official page, directly
fetched.

**First confirmed uni-assist-member university in this batch** (a real contrast with RWTH
Aachen and KIT, both confirmed NOT using uni-assist) -- TU Dresden explicitly states it "is a
member of" the uni-assist application service, and international applicants with foreign
credentials must apply through it.

**What was checked and NOT found:** the specific DSH-2/TestDaF-4x4 language-test names --
confirmed only as a general search finding, not independently verified on the official page
itself (which states German proficiency is required "except for English-taught master's
programmes" but does not itself name the specific test/level); application fee amount (the page
confirms fees exist but not the figure); processing timeline; application deadline.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('9b957f10-d9d0-4a64-b28e-601bd6cc8a61', 'international_requirement',
   'TU Dresden is a confirmed member of uni-assist e.V. -- applicants with international (non-German) credentials must apply through uni-assist, which checks document completeness before forwarding the application to TU Dresden for final assessment',
   'TU Dresden''s own page states it "is a member of" the uni-assist application service for international students; applicants holding international school or university certificates must apply via uni-assist rather than directly. Uni-assist checks whether submitted documents are complete and meet programme requirements, then forwards the completed application to TU Dresden for the final admission decision. Handling fees apply and must be paid when the uni-assist application is created; the specific fee amount was not confirmed on this page (a general search separately cites EUR 75 for the first programme, EUR 30 each additional, not independently verified here).',
   true, 'high', 'https://tu-dresden.de/studium/vor-dem-studium/bewerbung/online-bewerbung/bewerbungsverfahren-ueber-uni-assist?set_language=en', now()),
  ('9b957f10-d9d0-4a64-b28e-601bd6cc8a61', 'language_proficiency',
   'German-language proficiency required for all programmes except English-taught Master''s; a general search (not independently confirmed) reports the specific thresholds as DSH Level 2 or TestDaF 4x4, submitted WITH the application rather than afterward',
   'The official page confirms applicants must provide proof of sufficient German language skills, with an explicit carve-out for English-taught Master''s programmes (implying Bachelor''s entry generally requires German). A general search separately reports the specific accepted thresholds as DSH Level 2 or TestDaF level 4x4 (or a comparable certificate), and states this certificate must be enclosed with the application itself and cannot be submitted later -- this specific detail was not independently confirmed by this session''s own direct fetch.',
   true, 'medium', 'https://tu-dresden.de/studium/vor-dem-studium/bewerbung/online-bewerbung/bewerbungsverfahren-ueber-uni-assist?set_language=en', now());
```

---

## 5. Friedrich-Alexander-Universität Erlangen-Nürnberg (FAU)

`id = '49d066e3-52e6-4372-95ce-24212ecd96bb'` — QS rank =218. **Cycle-dependent policy:
unconfirmed.**

**Source actually used:** `https://www.fau.eu/studying/international-students/application-and-
enrollment-for-international-applicants/` — official page, directly fetched.

**A third confirmed non-uni-assist German university this batch** (after RWTH Aachen and KIT):
FAU routes applications through its own "campo" portal, with no mention of uni-assist on this
page.

**What was checked and NOT found:** a specific German proficiency level/test name for German-
taught programmes (the page confirms German is the teaching language "with the exception of a
small number of degree programs" but defers the specific certificate/level to a separate linked
page not fetched in this pass); English proficiency requirement for FAU''s English-taught
International Degree Programmes (a general search separately mentions CEFR/IELTS/TOEFL without
a specific score); application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('49d066e3-52e6-4372-95ce-24212ecd96bb', 'international_requirement',
   'Applications go through FAU''s own "campo" portal, not uni-assist; processing fee of EUR 100 per application for non-EU applicants (confirmed directly, notably higher than the ~EUR 75 uni-assist fee seen at other German universities in this batch)',
   'FAU is a third German university in this batch confirmed NOT to use uni-assist -- applications are submitted via FAU''s own "campo" portal. A processing fee of EUR 100 per application applies to applicants from non-EU states; no fee is stated for EU applicants. FAU offers over 275 degree programmes; most require German (see below), a small number of International Degree Programmes are taught exclusively in English.',
   true, 'high', 'https://www.fau.eu/studying/international-students/application-and-enrollment-for-international-applicants/', now()),
  ('49d066e3-52e6-4372-95ce-24212ecd96bb', 'language_proficiency',
   'German is the teaching language for all but a small number of degree programmes -- specific proficiency level/test not confirmed on this page; International Degree Programmes taught exclusively in English do NOT require German proficiency for application/enrolment, and instead require English proficiency evidence (CEFR/IELTS/TOEFL, specific score not confirmed)',
   'FAU states "with the exception of a small number of degree programs, German is the teaching language" -- implying most Bachelor''s programmes require German proficiency, though this page defers the specific level/test to a separate document not fetched here. For FAU''s International Degree Programmes taught exclusively in English, German proficiency is explicitly NOT required at application or enrolment and will not count against the application; English proficiency is instead required via CEFR, IELTS, or TOEFL, though a specific score threshold was not confirmed in this pass.',
   true, 'medium', 'https://www.fau.eu/studying/international-students/application-and-enrollment-for-international-applicants/', now());
```

---

## 6. Eberhard Karls Universität Tübingen

`id = 'f1d89d6d-ef0c-4ba6-83cf-29efeb9f9723'` — QS rank =230. **Cycle-dependent policy: BOTH
Winter and Summer intakes confirmed to exist** (portal opens June for WS, December for SS) --
but whether the actual requirements differ between the two, as opposed to just the calendar,
was not confirmed in this pass. Not counted in the tracked total without that confirmation.

**Access note:** Tübingen''s dedicated international-applicant pages returned HTTP 404 (one
URL) or lacked the relevant content (a second, contact-focused page) when fetched directly.
Recorded at `medium` confidence from a general search's summary instead.

**A fourth confirmed non-uni-assist German university this batch**, with a genuinely useful
exception: applications generally go through Tübingen''s own ALMA portal, EXCEPT for restricted
(numerus clausus) programmes such as Medicine, which route through the national
hochschulstart.de platform instead -- a real, program-dependent split in application channel,
not a single rule for the whole university.

**What was checked and NOT found:** whether requirements (not just the calendar) genuinely
differ between Winter and Summer Semester intake; a specific German/English proficiency score;
application deadline (exact date, beyond "opens June/December").

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('f1d89d6d-ef0c-4ba6-83cf-29efeb9f9723', 'international_requirement',
   'Applications generally go through Tübingen''s own ALMA portal; restricted (numerus clausus) programmes like Medicine instead route through the national hochschulstart.de platform; both Winter (portal opens June) and Summer (opens December) Semester intake exist for at least some programmes',
   'For most programmes, international applicants apply directly through ALMA, Tübingen''s own online portal -- not uni-assist. Restricted-admission (numerus clausus) programmes, Medicine among them, instead require application via hochschulstart.de, Germany''s national centralized platform for such programmes. The ALMA portal opens at the beginning of June for Winter Semester and the beginning of December for Summer Semester -- both intakes exist for at least some programmes, though whether admission requirements themselves (rather than just the calendar) differ between the two was not confirmed in this pass. Restricted programmes reportedly reserve a 5-10% quota of places specifically for non-EU citizens (not independently confirmed by direct fetch).',
   true, 'medium', 'https://uni-tuebingen.de/en/international/study-in-tuebingen/degree-seeking-students/application-for-international-students/index.html', now()),
  ('f1d89d6d-ef0c-4ba6-83cf-29efeb9f9723', 'international_requirement',
   'A grade-improvement mechanism reportedly exists for non-EU applicants to restricted programmes: above-average German language skills can improve the average grade used for ranking by 0.5 or 1.0 points on the German scale; applicants with a university entrance qualification from mainland China, India, or Vietnam reportedly need a certificate from the relevant Academic Evaluation Center',
   'For restricted-admission programmes, non-EU applicants can reportedly improve the average grade used in the selection process by 0.5 or 1.0 points on the German grading scale (where lower is better) by demonstrating above-average German language skills -- a genuinely distinctive mechanism, not independently confirmed by this session''s own direct page fetch. Separately, applicants whose university entrance qualification was obtained in mainland China (excluding Hong Kong, Taiwan, and Macao), India, or Vietnam reportedly must submit a certificate from the relevant Academic Evaluation Center as part of their application -- also not independently confirmed by direct fetch in this pass.',
   false, 'medium', 'https://uni-tuebingen.de/en/international/study-in-tuebingen/degree-seeking-students/application-for-international-students/index.html', now());
```

---

## 7. University of Cologne (Universität zu Köln)

`id = '85b3379b-bf33-4411-98e4-86d0199b0a02'` — QS rank 269. **Cycle-dependent policy: NO** —
two intakes exist (Winter/Summer) with a symmetric 6-month deadline offset (15 July / 15
January), but the actual requirement (DSH-2, TestAS) is identical for both; only the calendar
date shifts. Per this document''s own working definition, a shifted date alone does not count
as "cycle-dependent" -- only a case where the substance of the requirement differs by cycle
would.

**A claim checked and clarified rather than taken at face value:** a general search stated
DSH-2 German is required "regardless of the language the programme is taught in," which read
as a possible overgeneralization -- resolved by confirming directly: **the teaching language
of every Bachelor's programme at Cologne is German**, so there simply are no English-taught
bachelor's programmes for the claim to be an exception to.

**TestAS is confirmed MANDATORY here, not merely a compensating option** (a real contrast with
RWTH Aachen, entry #2, where TestAS only compensates for a grade below 2.5): every non-EU
Cologne bachelor applicant must submit a TestAS certificate, used directly on the ranking list,
regardless of home grading system.

**What was checked and NOT found:** the specific APS-certificate requirement for applicants
from China/India/Vietnam mentioned by a general search -- not independently confirmed by a
successful direct fetch (the specific procedure page returned HTTP 404); tuition, admission
rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('85b3379b-bf33-4411-98e4-86d0199b0a02', 'international_requirement',
   'Non-EU applicants must apply via uni-assist AND submit a mandatory TestAS certificate, used directly on the ranking list regardless of home grading system; every Bachelor''s programme at Cologne is German-taught, with no English-taught bachelor''s option',
   'Non-EU citizens applying for a Bachelor''s or state-examination programme starting in the first semester must apply through uni-assist e.V. TestAS (a standardized academic aptitude test) is mandatory, not optional or merely compensating -- every applicant must have already completed it and submit the certificate with the uni-assist application; the ranking list used to allocate places is based directly on the TestAS result, applied uniformly regardless of the applicant''s home education/grading system. The teaching language of every Bachelor''s programme at the University of Cologne is German -- there is no English-taught bachelor''s option under this "Studienstart International" pathway.',
   true, 'high', 'https://uni-koeln.de/en/studying-teaching/international/study-in-cologne/studienstart-international', now()),
  ('85b3379b-bf33-4411-98e4-86d0199b0a02', 'language_proficiency',
   'DSH-2 (or equivalent) German proficiency required, certificate due by the same deadline as the rest of the application: 15 July for Winter Semester, 15 January for Summer Semester -- both intakes use the identical language threshold, only the calendar date shifts',
   'A minimum of DSH-2 level (or an equivalent recognised German-language certificate) is required, submitted by the same deadline as the rest of the application -- 15 July for Winter Semester or 15 January for Summer Semester. Both intakes carry the identical DSH-2 requirement; only the filing date differs by six months, a standard symmetric structure rather than a substantive requirement change between cycles.',
   true, 'high', 'https://uni-koeln.de/en/studying-teaching/international/study-in-cologne/studienstart-international', now());

insert into public.university_deadlines
  (university_id, deadline_type, deadline_date, application_cycle, source_url, retrieved_at)
values
  ('85b3379b-bf33-4411-98e4-86d0199b0a02', 'application', '2026-07-15', 'Winter Semester 2026/27 (Studienstart International, non-EU with formal HZB)', 'https://uni-koeln.de/en/studying-teaching/international/study-in-cologne/studienstart-international', now()),
  ('85b3379b-bf33-4411-98e4-86d0199b0a02', 'application', '2027-01-15', 'Summer Semester 2027 (Studienstart International, non-EU with formal HZB)', 'https://uni-koeln.de/en/studying-teaching/international/study-in-cologne/studienstart-international', now());
```

---

## 8. University of Münster (Universität Münster)

`id = '6da7db50-14d0-4e34-9d09-fafdbf303492'` — QS rank 370. **Cycle-dependent policy: NO** —
same symmetric WS(15 Jul)/SS(15 Jan) deadline pattern as Cologne, no stated difference in
substance between the two.

**Source actually used:** `https://www.uni-muenster.de/studieninteressierte/en/bewerbung/
nichteu_bewerber_ba.html` — official page for non-EU/EEA applicants without a German Abitur,
directly fetched.

**A fifth confirmed non-uni-assist German university this batch:** Münster uses its own online
application system, explicitly not uni-assist.

**The APS certificate requirement (China/India/Vietnam) is now confirmed officially for the
first time this batch** -- Tübingen and Cologne''s versions of this same fact came from
unconfirmed general searches; Münster''s own page states it directly, corroborating that the
pattern is real rather than a search artifact repeated across sources.

**What was checked and NOT found:** a specific German-proficiency test/level (the page states
a certificate is required "depending on the degree programme" without naming DSH/TestDaF
directly); English-taught programme language requirements; tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('6da7db50-14d0-4e34-9d09-fafdbf303492', 'international_requirement',
   'Applications go through Münster''s own online portal, not uni-assist; applicants may apply to up to 3 bachelor''s programmes per application; applicants from mainland China, India, or Vietnam must submit an APS certificate; Studienkolleg attendees submit their Studienkolleg assessment test instead',
   'Non-EU/EEA applicants without a German Abitur apply online for both restricted and non-restricted bachelor''s programmes directly through Münster''s own portal -- not uni-assist. Up to three bachelor''s degree programmes may be included in one online application. After submission, applicants receive an emailed check-sheet PDF listing their application number and remaining steps. Applicants whose university entrance qualification is from mainland China, India, or Vietnam must provide an APS (Akademische Prüfstelle) certificate for document authentication. Applicants who attended a German Studienkolleg (preparatory college) instead submit their Studienkolleg assessment test result.',
   true, 'high', 'https://www.uni-muenster.de/studieninteressierte/en/bewerbung/nichteu_bewerber_ba.html', now()),
  ('6da7db50-14d0-4e34-9d09-fafdbf303492', 'language_proficiency',
   'A certificate of sufficient German language proficiency is required, with the specific level/test depending on the degree programme; may be submitted after the initial application, by the same 15 July (Winter) / 15 January (Summer) deadline as the rest of the application',
   'German language proficiency is mandatory; the required level/test is not fixed university-wide but depends on the specific degree programme (specific DSH/TestDaF thresholds not stated on this page). The proficiency certificate can be uploaded after the initial online application, by the same overall deadline: 15 July for Winter Semester, 15 January for Summer Semester.',
   true, 'medium', 'https://www.uni-muenster.de/studieninteressierte/en/bewerbung/nichteu_bewerber_ba.html', now());
```

---

## 9. Goethe-University Frankfurt am Main

`id = 'c18c3469-e340-4406-b593-169153cb21a2'` — QS rank 376. **Cycle-dependent policy: not
established** (only one deadline window found, no Summer Semester intake confirmed either way).

**Access note:** the international-applicants landing page fetched directly was a generic hub
with no procedural specifics; the facts below come from a general search of Goethe University's
own uni-frankfurt.de sub-pages (per the search's own domain attribution), not independently
re-confirmed by this session's own successful fetch of those specific sub-pages. Recorded at
`medium` confidence for that reason.

**What was checked and NOT found:** independent confirmation of uni-assist usage, DSH level,
and APS requirement via direct fetch (search-derived only); tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('c18c3469-e340-4406-b593-169153cb21a2', 'international_requirement',
   'International applicants with non-German credentials apply via uni-assist; APS certificate mandatory for applicants from India, Vietnam, and mainland China; some uni-assist documents must arrive as certified hard copies by the deadline, not only uploaded',
   'Per a general search of Goethe University''s own pages: international applicants with non-German academic credentials apply through uni-assist. An APS certificate is mandatory for applicants from India, Vietnam, and the People''s Republic of China -- consistent with the same requirement independently confirmed this batch at Münster (#8). Some uni-assist documents, particularly for international degrees, must arrive as certified hard copies by the deadline date, not merely uploaded online -- a distinctive procedural detail.',
   true, 'medium', 'https://www.uni-frankfurt.de/en/studium/bewerbung-einschreibung/internationale-studierende', now()),
  ('c18c3469-e340-4406-b593-169153cb21a2', 'language_proficiency',
   'German proficiency at DSH-2 or DSH-3 level (or recognized equivalent) reportedly required for German-taught study',
   'A general search reports Goethe University requires German proficiency at DSH-2 or DSH-3 level (or an equivalent certificate) for German-taught programmes; this session''s own direct fetch of the international-applicants page confirmed only the general statement that "sufficient knowledge of German is required" without naming the specific test level itself.',
   true, 'medium', 'https://www.uni-frankfurt.de/en/studium/bewerbung-einschreibung/internationale-studierende', now());
```

---

## 10. Ruhr-Universität Bochum (RUB)

`id = '36b88c27-6604-4afe-ae70-c3fe04e63b28'` — QS rank 402. **Cycle-dependent policy: NO** —
same symmetric deadline-shift pattern as Cologne/Münster, same language requirement year-round.

**Source actually used:** `https://studium.ruhr-uni-bochum.de/en/application-international-
prospective-students` — official page, directly fetched.

**A correction to a search summary caught before writing anything:** a general search had
named "Goethe-Zertifikat C1" as an accepted qualification; the official page itself states
**Goethe-Zertifikat C2**, a materially higher level -- used the directly-fetched figure, not
the search's.

**Uni-assist status: genuinely unconfirmed, not asserted either way.** Unlike RWTH Aachen, KIT,
FAU, and Münster (all of which explicitly stated their own portal), this page simply never
mentions uni-assist -- silence is not the same as an explicit "we don't use it," so this is
recorded as unconfirmed rather than joining the confirmed non-uni-assist list.

**What was checked and NOT found:** whether Bachelor's programmes here are genuinely NC-free
(no numerus clausus) as a general search claimed -- not found on the page actually fetched;
tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('36b88c27-6604-4afe-ae70-c3fe04e63b28', 'language_proficiency',
   'German-taught programmes: TestDaF at least 16 points total, DSH level 2 or 3, Goethe-Zertifikat C2, or telc Deutsch C1 Hochschule',
   'Accepted proof of German proficiency for German-taught programmes: TestDaF with at least 16 points total across the examination, DSH at level 2 or 3, Goethe-Zertifikat C2, or telc Deutsch C1 Hochschule. Whether uni-assist is used for the application itself was not stated on this page (unconfirmed either way, unlike several other universities in this batch that explicitly named their own portal).',
   true, 'high', 'https://studium.ruhr-uni-bochum.de/en/application-international-prospective-students', now());

insert into public.university_deadlines
  (university_id, deadline_type, deadline_date, application_cycle, source_url, retrieved_at)
values
  ('36b88c27-6604-4afe-ae70-c3fe04e63b28', 'application', '2026-07-15', 'Winter Semester 2026/27 (Bachelor/State Examination, filing opens beginning of May)', 'https://studium.ruhr-uni-bochum.de/en/application-international-prospective-students', now()),
  ('36b88c27-6604-4afe-ae70-c3fe04e63b28', 'application', '2027-01-15', 'Summer Semester 2027 (filing opens beginning of December)', 'https://studium.ruhr-uni-bochum.de/en/application-international-prospective-students', now());
```

---

## 11. Universität Konstanz

`id = '3e96d145-e116-4a9e-8ada-60d457428cc9'` — QS rank 425. **Cycle-dependent policy:
unconfirmed.**

**Source actually used:** `https://www.uni-konstanz.de/en/study/before-you-study/application-
and-enrolment/faq-application-process/` — official page, directly fetched.

**A search claim quietly corrected rather than repeated:** a general search stated applicants
"must demonstrate proficiency in both German and English" for undergraduate programmes -- the
official FAQ instead describes a normal per-programme split: DSH (or similar) for German-taught
programmes, with TOEFL/IELTS/Cambridge accepted for whichever programmes are English-taught.
Not the same claim as "both languages required simultaneously," which is not asserted here.

**What was checked and NOT found:** uni-assist usage (not mentioned either way); a specific
English score threshold; the Sports Entrance Exam for Bachelor of Education/Sports Science
(mentioned by a general search, not found on the FAQ page itself); application deadline.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('3e96d145-e116-4a9e-8ada-60d457428cc9', 'language_proficiency',
   'German-taught programmes: DSH certificate (or similar) submitted with the application; English-taught programmes: TOEFL, IELTS, or Cambridge English accepted -- requirement is per-programme, not a simultaneous dual-language requirement',
   'Applicants must document German language skills by submitting a DSH certificate or similar along with the application, for German-taught programmes. The university states it "generally accepts all of the usual language certificates, such as TOEFL, IELTS and Cambridge English" -- implying these apply to whichever specific programmes are English-taught, rather than every applicant needing both languages simultaneously. The FAQ explicitly directs applicants to check each specific programme''s own page for its language requirement rather than stating one university-wide rule.',
   true, 'medium', 'https://www.uni-konstanz.de/en/study/before-you-study/application-and-enrolment/faq-application-process/', now());
```

---

## 12. Universität Mannheim — cheaper win: already has 4 programme rows, only requirements missing

`id = '3c48effe-f883-4907-bb0b-5911eb39e021'` — QS rank 425. **Cycle-dependent policy: NO**
(single Winter-Semester-focused deadline found, no Summer Semester substance difference).

**Source actually used:** `https://www.uni-mannheim.de/en/academics/before-your-studies/
applying/bachelors-program/citizens-from-outside-of-the-eu-eea/` — official page, directly
fetched.

**A sixth confirmed non-uni-assist German university this batch, and the most explicit
statement yet:** "The University of Mannheim does not work with uni-assist. All international
applicants must therefore apply directly to the University of Mannheim."

**An internal naming inconsistency in the extracted text, flagged rather than silently
resolved:** the page pairs "level C1" with "(Goethe Zertifikat C2)" -- CEFR C1 and Goethe C2 are
not the same level (Goethe C2 corresponds to CEFR C2, a higher level than C1). This may be an
extraction artifact or a genuine inconsistency on the source page itself; not resolved further
in this pass, recorded exactly as extracted.

**What was checked and NOT found:** a specific minimum percentage/grade for the Class 12/HSC
qualification -- a general search states "no specific minimum score" is required but advises
60%+ informally, not itself an official threshold and not recorded as one; admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('3c48effe-f883-4907-bb0b-5911eb39e021', 'international_requirement',
   'The University of Mannheim explicitly does NOT work with uni-assist -- all international applicants apply directly; applicants from China, Vietnam, or India must provide an original APS certificate',
   'Mannheim''s own page states directly: "The University of Mannheim does not work with uni-assist. All international applicants must therefore apply directly to the University of Mannheim." Applicants who obtained their university entrance qualification or degree in China, Vietnam, or India must provide the APS certificate in its original version -- consistent with the same requirement confirmed elsewhere in this batch (Muenster, #8).',
   true, 'high', 'https://www.uni-mannheim.de/en/academics/before-your-studies/applying/bachelors-program/citizens-from-outside-of-the-eu-eea/', now()),
  ('3c48effe-f883-4907-bb0b-5911eb39e021', 'language_proficiency',
   'German-taught programmes: TestDaF level 4, DSH 2, or Goethe-Zertifikat (page''s own text pairs "C1" with "Goethe Zertifikat C2" -- an internal naming inconsistency, recorded as extracted); language proof must be received before the application deadline (15 July referenced)',
   'For German-taught programmes, accepted proof of German proficiency includes TestDaF level 4, DSH level 2, or a Goethe-Zertifikat -- the official page''s own text describes this as "level C1 (Goethe Zertifikat C2)," an internally inconsistent pairing (CEFR C1 and Goethe C2 are different levels) not resolved further in this pass. Proof must be received by the university before the application deadline; 15 July is referenced as a key date for submitting the language certificate specifically.',
   true, 'medium', 'https://www.uni-mannheim.de/en/academics/before-your-studies/applying/bachelors-program/citizens-from-outside-of-the-eu-eea/', now());
```

---

## 13. Julius-Maximilians-Universität Würzburg (JMU)

`id = 'bb06ba15-8664-456a-a960-0115f0dd5307'` — QS rank 430. **Cycle-dependent policy: not
established.**

**A more efficient source found and used going forward: uni-assist's own member-university
list.** Rather than relying on each individual university''s own page (silent or ambiguous on
uni-assist status at several universities already this batch), uni-assist.de itself publishes
a searchable directory of its member institutions --
`https://www.uni-assist.de/en/tools/uni-assist-universities/detail/hochschule/568/` confirms
JMU Würzburg directly. This is the more authoritative source for this specific fact and will
be checked directly for any remaining ambiguous cases in this batch.

**What was checked and NOT found:** which specific degree levels (bachelor/master/all) JMU''s
uni-assist membership covers -- the directory page didn't specify; a general search separately
suggests it applies to bachelor''s programmes specifically; a specific DSH/TestDaF level number;
tuition (confirmed as none, standard for German public universities) and the semester
contribution amount (~EUR 130-150, not independently confirmed by direct fetch).

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('bb06ba15-8664-456a-a960-0115f0dd5307', 'international_requirement',
   'Confirmed via uni-assist''s own member directory: JMU Würzburg is a uni-assist member university -- applicants obtain a Vorprüfungsdokumentation (VPD) preliminary review document from uni-assist and submit it to the university as part of the application',
   'Julius-Maximilians-Universität Würzburg is confirmed as a member university on uni-assist''s own official directory. Applicants apply through uni-assist, which issues a Vorprüfungsdokumentation (VPD) -- a preliminary review document confirming the foreign qualification''s equivalence to the German Abitur -- submitted alongside the rest of the application to the university.',
   true, 'high', 'https://www.uni-assist.de/en/tools/uni-assist-universities/detail/hochschule/568/', now()),
  ('bb06ba15-8664-456a-a960-0115f0dd5307', 'language_proficiency',
   'German-taught programmes (most bachelor''s programmes at JMU): German proficiency via TestDaF or DSH, specific level not confirmed',
   'Most bachelor''s programmes at JMU are taught in German, requiring proficiency typically demonstrated via TestDaF or DSH -- the specific minimum level/score was not confirmed by direct fetch in this pass. Application deadline for most programmes is reportedly 15 July, though some programmes may differ (not itemized here).',
   true, 'medium', 'https://www.uni-assist.de/en/tools/uni-assist-universities/detail/hochschule/568/', now());
```

---

## 14. Leibniz University Hannover (LUH)

`id = '313b02bc-932e-441b-8901-2b28504e5c01'` — QS rank 470. **Cycle-dependent policy: not
established.**

**Source actually used:** `https://www.uni-hannover.de/en/studium/vor-dem-studium/bewerbung-
zulassung/voraussetzungen-zum-studium/voraussetzungen-fuer-internationale-bewerber` — official
page, directly fetched.

**Uni-assist/VPD confirmed directly and officially.** Non-EU applicants must submit a
preliminary examination documentation (VPD) from uni-assist, covering both Bachelor''s and
Master''s programmes -- if the VPD determines the qualification is insufficient for direct
admission, further steps (such as a Studienkolleg assessment test) may be required.

**What was checked and NOT found:** the reported 5% non-EU admission quota, awarded purely on
grades -- not found on the official page fetched, recorded at `medium` confidence from the
general search only; application deadline, tuition (standard German public-university semester
contribution, amount not confirmed here).

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('313b02bc-932e-441b-8901-2b28504e5c01', 'international_requirement',
   'Non-EU applicants must apply via uni-assist, which issues a Vorprüfungsdokumentation (VPD) determining whether the qualification permits direct admission or requires further steps (e.g. a Studienkolleg assessment test); a reported 5% non-EU quota, awarded by grade, was not confirmed on this page',
   'Non-EU applicants to both Bachelor''s and Master''s programmes must submit a preliminary examination documentation (VPD) from uni-assist. The VPD determines whether the applicant''s school-leaving certificate is sufficient for direct admission, or whether further qualification (such as an assessment test at a Studienkolleg preparatory course) is required first. A general search separately reports a 5% quota of study places reserved for non-EU applicants, awarded purely on grades -- this specific quota mechanism was not found on the official page fetched in this pass.',
   true, 'medium', 'https://www.uni-hannover.de/en/studium/vor-dem-studium/bewerbung-zulassung/voraussetzungen-zum-studium/voraussetzungen-fuer-internationale-bewerber', now());
```

---

## 15. University of Bayreuth

`id = 'da15770e-4e7a-4804-b909-2c1b1ac4a38a'` — QS rank 472. **Cycle-dependent policy: not
established.**

**Uni-assist confirmed via two independent official-domain signals:** Bayreuth''s own
International Office maintains a page whose URL literally is
`international-office.uni-bayreuth.de/.../uni-assist/`, and uni-assist''s own directory lists
Bayreuth as a member university (`uni-assist.de/tools/uni-assist-hochschulen/hochschul-
details/hochschule/452/`). Applicants upload documents via uni-assist and receive a VPD, then
submit it to the university; uni-assist states its own preliminary review can take 6-8 weeks.

**What was checked and NOT found:** a general search reports German C1 (DSH-2/TestDaF 4) for
German-taught bachelor''s degrees, IELTS 6.5 specifically for the bilingual Philosophy and
Economics BA, and a distinctive German A1 requirement even for English-taught programmes (with
a grace period to submit by the end of the second semester) -- none of these specific figures
were independently confirmed by this session''s own successful fetch of a Bayreuth requirements
page, recorded at `medium` confidence.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('da15770e-4e7a-4804-b909-2c1b1ac4a38a', 'international_requirement',
   'Confirmed via Bayreuth''s own International Office page and uni-assist''s member directory: Bayreuth is a uni-assist university; the VPD preliminary review can take 6-8 weeks, so early application is advised',
   'International applicants with a foreign degree upload their application documents through uni-assist, which issues a Vorprüfungsdokumentation (VPD); this is then submitted, alongside the rest of the application, directly to the university. Uni-assist itself states the preliminary documentation review may take 6-8 weeks, so applicants are advised to start as early as possible.',
   true, 'high', 'https://www.international-office.uni-bayreuth.de/de/come-to-bayreuth/degree-students/uni-assist/index.html', now()),
  ('da15770e-4e7a-4804-b909-2c1b1ac4a38a', 'language_proficiency',
   'Reportedly: German C1 (DSH-2 or TestDaF 4) for German-taught bachelor''s degrees; IELTS 6.5 specifically for the bilingual Philosophy and Economics BA; a distinctive German A1 requirement even for English-taught programmes, submittable by the end of the 2nd semester -- none independently confirmed by direct fetch',
   'A general search reports German proficiency at C1 (DSH Level 2 or TestDaF level 4) for German-taught bachelor''s programmes. The bilingual Philosophy and Economics BA reportedly requires IELTS 6.5 specifically. A genuinely distinctive reported fact: even Bayreuth''s English-taught programmes reportedly require German A1 proficiency, though the certificate may be submitted as late as the end of the second semester of study rather than at application. None of these specific figures were independently confirmed by this session''s own successful fetch of a Bayreuth-specific requirements page.',
   true, 'medium', 'https://www.international-office.uni-bayreuth.de/de/come-to-bayreuth/degree-students/uni-assist/index.html', now());
```

---

## 16. Johannes Gutenberg-Universität Mainz (JGU)

`id = '1445766d-14d9-45e8-9a57-8b7425c17d6b'` — QS rank 500. **Cycle-dependent policy: not
established.**

**A name-collision risk caught before being repeated as fact:** searching uni-assist''s own
directory for "Mainz" returns results for **Hochschule Mainz (University of Applied
Sciences)** and **Mainz Catholic University of Applied Sciences** -- both real but entirely
different institutions from Johannes Gutenberg-Universität Mainz (JGU), the one actually in
scope here. Not conflated; JGU''s own uni-assist membership status was left unconfirmed rather
than borrowed from a same-city, differently-named institution''s listing.

**What was checked and NOT found:** definitive confirmation of uni-assist usage for JGU
specifically (a general search states "the uni-assist portal is normally used," but this
session could not independently verify it against JGU''s own official page, which returned
HTTP 404); the specific IELTS/TOEFL/PTE figures for English-taught programmes and DSH/TestDaF/
Goethe-Zertifikat for German-taught ones, both mentioned by a general search but not
independently confirmed; application deadline, tuition.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('1445766d-14d9-45e8-9a57-8b7425c17d6b', 'international_requirement',
   'Applications begin on JOGU-StINe, JGU''s own application platform; international applicants need a JGU certificate of recognition confirming their qualification''s equivalence, with a conversion of their grades into JGU''s own grading system; whether uni-assist is also involved was not independently confirmed',
   'International applicants start their application on JOGU-StINe, JGU''s own platform. Applicants with international certificates require a certificate of recognition from JGU confirming their university entrance qualification and converting their grades into the system JGU uses -- distinct from (and not confirmed to be the same as) a uni-assist VPD. A general search states uni-assist is "normally used," but this was not independently confirmed against JGU''s own official page (404 on direct fetch), and should not be assumed identical to the JOGU-StINe/certificate-of-recognition process actually confirmed. JGU also hosts a preparatory German-language course and a Studienkolleg for applicants not yet meeting direct-entry requirements.',
   true, 'medium', 'https://www.studium.uni-mainz.de/en/your-application/applying-with-international-certificates/applying-as-an-international-student/', now()),
  ('1445766d-14d9-45e8-9a57-8b7425c17d6b', 'language_proficiency',
   'German language proficiency required for German-taught programmes (specific test/level not independently confirmed); for English-taught programmes, a general search reports IELTS 6.5, TOEFL iBT 90, or PTE 58+',
   'Proof of German language proficiency is required for German-taught programmes; the specific test and level (a general search separately mentions TestDaF, DSH, or Goethe-Zertifikat) were not independently confirmed by this session''s own successful page fetch. For English-taught programmes, the same general search reports IELTS 6.5, TOEFL iBT 90, or PTE 58+ as accepted thresholds, also not independently confirmed.',
   true, 'medium', 'https://www.studium.uni-mainz.de/en/your-application/applying-with-international-certificates/applying-as-an-international-student/', now());
```

---

## 17. Universität Potsdam

`id = '0d02f20f-ff7e-47dd-bdae-cc09d94cf7cf'` — QS rank 500. **Cycle-dependent policy: not
established.**

**Access note:** uni-potsdam.de could not be fetched directly in this pass (blocked at the
domain level by this session''s own tooling, not an HTTP error from the site itself). Recorded
at `medium` confidence from a general search's summary instead.

**A labeling confusion noticed in the search summary and NOT repeated as fact:** the summary
stated the winter-semester deadline as "January 15," which is backwards from the July-15(WS)/
January-15(SS) pattern independently confirmed at essentially every other German university in
this batch. Most likely a summarization mixup rather than a genuine Potsdam-specific reversal --
not resolved (uni-potsdam.de itself was inaccessible), so no deadline row is written below at
all rather than risk recording it backwards.

**What was checked and NOT found:** the specific July/January deadline dates directly (not
written, per above); uni-assist confirmation independent of this search; English-taught
programme score thresholds; tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('0d02f20f-ff7e-47dd-bdae-cc09d94cf7cf', 'international_requirement',
   'International bachelor applicants need a secondary qualification equivalent to the Abitur (e.g. A-Levels, IB); international qualifications may require uni-assist evaluation for equivalence -- not independently confirmed against the official domain, which was inaccessible to this session''s tools',
   'International bachelor applicants need a secondary school-leaving certificate equivalent to the German Abitur, such as A-Levels or the IB diploma. International qualifications reportedly may require evaluation via uni-assist to verify equivalence, though this session could not independently confirm it (uni-potsdam.de was inaccessible to this session''s own fetch tooling, not merely a page-level error).',
   true, 'medium', 'https://www.uni-potsdam.de/en/international/incoming/international-students/degree', now()),
  ('0d02f20f-ff7e-47dd-bdae-cc09d94cf7cf', 'language_proficiency',
   'German-taught programmes: TestDaF, DSH, Goethe-Zertifikat, or equivalent, reportedly; English-taught programmes reportedly accept TOEFL/IELTS instead -- neither independently confirmed',
   'For German-taught programmes, proof of language proficiency (TestDaF, DSH, Goethe-Zertifikat, or equivalent) is reportedly required. Some English-taught programmes reportedly require only English proficiency evidence (TOEFL, IELTS) instead of German. Neither was independently confirmed by this session''s own direct fetch, since the official domain was inaccessible to this session''s tooling.',
   true, 'medium', 'https://www.uni-potsdam.de/en/international/incoming/international-students/degree', now());
```

---
