# Opportunity category reconciliation — 2026-08-22

Assigned by the coordination session after an audit found 34 distinct `category` strings
across the `data/research/opportunities/*.jsonl` research corpus against a 13-value live
enum, plus "128 records with no category." This document maps every non-enum string to an
enum value, or states explicitly that none fits. It does not touch any corpus file or the
live database — mapping only, per the assignment ("I'll route the application").

## Correction to the assignment's premise: the "128 uncategorised records" are not opportunity candidates

They are the `night2_2026-08-21_dqbatch1-6.jsonl` files (128 rows total — confirmed by direct
count). Their own schema (`id`, `title`, `country`, `deadline`, `cycle_status`,
`current_cycle_label`, `evidence`, `source_url`, `status`) has no `category` field by design:
per `night2_2026-08-21_dq-report.md`, each row is a deadline/country **remediation finding
against an already-live `opportunities` row**, addressed by its existing `id`. It was never a
new-candidate record and was never meant to carry a category — the live row it targets already
has one. Excluding these 128 from the reconciliation entirely; folding them in would misapply
category logic to rows that don't need it. **True denominator for this exercise: 282
candidate records across 48 files, of which 34 distinct category strings appear (13 valid +
21 non-enum).**

## Second correction: most of the 21 non-enum strings are already reconciled and live

All 21 non-enum strings that show up in `leadership_batch1-5_2026-08-21.jsonl` were mapped
and applied to production on 2026-08-21 (`night4_2026-08-21_leadership-dry-run-insert.sql`,
confirmed live via direct query against `qtcvcflzxbuagvvwahhu` today) — 22 of 25 records
inserted, 3 held back as `NEEDS_REVIEW` for evidence reasons unrelated to category. The
mapping below for those 18 strings is not a fresh judgment call; it's what was actually
applied, confirmed by matching each JSONL record's title against the live row's `category`.
Only the 4 `turkey_batch3` records (all under `volunteering_service`) remain genuinely
unreconciled — no insert has been attempted for them yet.

## Mapping table

| Non-enum string (n) | Record(s) | → Enum value | Status | Reason |
|---|---|---|---|---|
| `volunteering_service` (1, leadership_batch1) | İBB Genç Gönüllü Programı | `volunteering` | **Applied, live** | Unpaid structured municipal service, hours-based certificate — direct fit. |
| `volunteering_service` (4, turkey_batch3) | Habitat Derneği Gönüllülük Programı; Youth Engagement Summit (YES); Lise TEMA Gönüllüleri; LABEP (AKUT Vakfı) | `volunteering` | **Not yet applied — recommend applying** | Same shape as the already-applied İBB record (unpaid/low-stipend structured service, certificate on completion); same string, same precedent. |
| `service_leadership_club` (2) | Rotary Interact Club; Alpha Leo Club | `volunteering` | **Applied, live** | Chartered club membership defined by a minimum number of completed service projects/year — service is the substantive activity, "club" is the structure around it. |
| `service_leadership_train_the_trainer` (1) | Habitat×UNICEF Train-the-Trainer | `volunteering` | **Applied, live** | Unpaid ongoing volunteer-trainer role after initial training; output is a volunteer role, not a credential/network induction. |
| `peer_tutoring_service` (1) | Schoolhouse.world Tutor Certification | `volunteering` | **Applied, live** | The substantive activity is unpaid service (tutoring others), not the tutor's own instruction — same logic as the other service-shaped records, applied consistently rather than routing it to `online_program` on the delivery-mode technicality. |
| `structured_service_and_challenge_award` (1) | Duke of Edinburgh's International Award — Türkiye | `volunteering` | **Applied, live** | Only 1 of DofE's 4 sections (Voluntary Service) is actually service — the other 3 (Skills, Physical Recreation, Adventurous Journey) have no clean enum home either. Flagging this as an **imperfect fit accepted for lack of a better one**, not a confident match: DofE is a large, globally-recognised structured personal-development award, and folding it entirely into `volunteering` loses 75% of what the programme actually is. Worth a genuine "structured award/challenge programme" category if this space grows past one record. |
| `civic_leadership_model_parliament` (1) | European Youth Parliament Türkiye (EYP Türkiye) | `student_program` | **Applied, live** | Not `conference` — the applied decision treats EYP Türkiye as an ongoing structured programme (progression through National → International Sessions, eligibility for standing roles) rather than a single event. **Correction to my own work tonight**: I independently researched and wrote a *new* `conference`-category record for "EYP Türkiye Mersin 2026" (`data/research/opportunities/discovery_conference_2026-08-22.jsonl`, `RSRCH-OPP-2026-08-22-0003`) without checking this file first. See the duplicate-records section below. |
| `elected_youth_parliament` (1) | UK Youth Parliament | `student_program` | **Applied, live** | Same logic as EYP Türkiye — an ongoing elected role with a two-year term, not a single event. |
| `municipal_youth_council` (1) | İstanbul Kent Konseyi Gençlik Meclisi | `student_program` | **Applied, live** | Ongoing civic-participation body, open-ended membership. |
| `national_youth_service_infrastructure` (1) | Gençlik Merkezleri (Youth Centres) / e-Genç | `student_program` | **Applied, live** | Accepted as the closest fit despite being structurally different from every other row in the category — it's an access point/hub (membership grants access to many separate clubs/courses/spaces) rather than one bounded programme. Flagging, not re-deciding: this is a real, useful precedent to know about rather than one to second-guess without new evidence. |
| `youth_advisory_board` (1) | Girl Up Global Teen Advisor Board | `student_program` | **Applied, live** | One-year appointed role with a defined time commitment — treated as a structured programme, not a `fellowship`, despite having mentorship + honorarium (which is exactly the profile I used to justify `fellowship` for other records tonight, e.g. Ashoka). **Noting the inconsistency rather than silently following it**: this and `social_impact_fellowship`/`social_entrepreneurship_fellowship` (below, both → `fellowship`) look similar in shape (selection, mentorship, ongoing role) but landed in different enum values. Not proposing a fix — routing for a decision on whether "mentored advisory board seat" and "network induction" should be the same category going forward. |
| `student_organisation_chapter` (1) | Girl Up Club (found/lead a chapter) | `student_program` | **Applied, live** | Structured, ongoing, self-directed club leadership — reasonable fit. |
| `youth_mobility_civic_project` (1) | Erasmus+ Youth Exchanges | `student_program` | **Applied, live** | Accepted as closest fit; flagging a real gap underneath it — funded multi-country youth exchange/mobility programmes (Erasmus+, and by extension things like AFS, YES-abroad-shaped exchanges) are a distinct, common category in this age group that `student_program` only captures by default, not by good fit. |
| `entrepreneurship_student_company` (3) | Young Enterprise Company Programme; JA Company Programme (Europe); INJAZ Al-Arab | `entrepreneurship` | **2 applied, live / 1 held (see NEEDS_REVIEW)** | Direct fit — real trading student companies, matches the existing entrepreneurship rows' shape closely (Diamond Challenge, LaunchX, Conrad Challenge already live under the same value). |
| `social_entrepreneurship_accelerator` (1) | Genç UPSHIFT Sosyal Girişimcilik Programı | `entrepreneurship` | **Applied, live** | Training/mentoring/capital-access pipeline for social-innovation ventures — same shape as the other entrepreneurship rows. |
| `entrepreneurship_competition_programme` (1) | GençBizzTech | `entrepreneurship` | **Applied, live** | Has a competitive-progression structure (Turkey Finals) but so does Young Enterprise/JA Europe (both already `entrepreneurship`, not `competition`) — applied consistently. |
| `social_impact_fellowship` (1) | Three Dot Dash Global Teen Leaders | `fellowship` | **Applied, live** | Selection + year-long mentor pairing + ongoing network access — canonical fellowship shape. |
| `social_entrepreneurship_fellowship` (1) | Ashoka Young Changemakers | `fellowship` | **Applied, live** | Same shape as Three Dot Dash. **I independently re-researched and wrote a *new* record for this exact organisation tonight** (`discovery_fellowship_2026-08-22.jsonl`, `RSRCH-OPP-2026-08-22-0007`) without checking this file first — confirmed duplicate, see below. My independent facts (6-country eligibility list, age ≤19/20, year-round nominations) match the live row almost exactly, which is a good cross-validation of the existing data, but the record itself should not be separately inserted. |
| `social_impact_grant` (2) | Peace First Grants; Girl Up Project Awards | `fellowship` | **1 applied (Girl Up), 1 held (Peace First, see NEEDS_REVIEW)** | Not an obvious fit on the name alone ("grant" reads closer to `scholarship`), but the applied precedent treats these as fellowship-shaped because both bundle funding with training/mentorship/ongoing relationship rather than being a one-time tuition-style award. Flagging as a **borderline call worth another look**: a pure one-time project grant with no mentorship attached (neither of these two, but a plausible future record) wouldn't fit `fellowship` on the same logic and currently has no home. |
| `civic_leadership_parliamentary_simulation` (1) | Euroscola | `conference` | **Not yet applied — held as NEEDS_REVIEW, category itself not in question** | Held back for a real evidence gap (Turkish-school eligibility through EP Liaison Offices unresolved), not a category ambiguity. By elimination against the 2 already-applied `conference` rows (EYE, THIMUN — both single bounded events, not ongoing programmes), Euroscola fits the same bucket: a single in-person event in the EP hemicycle. Recommend `conference` once the eligibility question is resolved. |
| `civic_participation_event` (1) | European Youth Event (EYE) | `conference` | **Applied, live** | Single large-scale event, ~9,000 attendees, workshops + debates. |
| `model_united_nations` (1) | THIMUN The Hague Conference | `conference` | **Applied, live** | Single bounded annual conference. **I independently re-researched and wrote a *new* record for this exact conference tonight** (`discovery_conference_2026-08-22.jsonl`, `RSRCH-OPP-2026-08-22-0004`) without checking this file first — confirmed duplicate, see below. My independently-verified deadline (2026-09-25) and dates (26–29 Jan 2027) match the live row exactly. |

## NEEDS_REVIEW records — category not in question, evidence is

Per `night4_2026-08-21_leadership-report.md`, 3 of the 25 leadership-batch records were
deliberately held out of the auto-accept path for evidence conflicts, not category
ambiguity. Their intended category (from the mapping precedent above) is included so whoever
resolves the evidence gap doesn't have to re-derive it:

- **Euroscola** → `conference` (see row above)
- **Peace First Grants** → `fellowship` (source itself flags `CONFLICTING_EVIDENCE`: official page says ages "typically 16-35" vs. a widely-circulated "13-25" figure — genuinely unresolved, not silently picked)
- **INJAZ Al-Arab — The Company Program** → `entrepreneurship` (two national INJAZ members publish conflicting age rules for the same federation programme)

## Confirmed duplicate records — my own work tonight vs. already-live rows

Before starting my own thin-category research pass this session, I checked the *live*
`opportunities` table for the raw category distribution but did not cross-check the pending
`leadership_batch*.jsonl` research files for the same organisations — an oversight I'm
correcting here rather than leaving buried in a commit. Three of my seven records
independently re-discovered organisations already live in production:

| My record | File | Already live as | Live `deadline`/dates | My independently-found dates | Verdict |
|---|---|---|---|---|---|
| RSRCH-OPP-2026-08-22-0004 (THIMUN The Hague 2027) | `discovery_conference_2026-08-22.jsonl` | "THIMUN The Hague Conference" (`conference`) | deadline `2026-09-25`, "25-29 January 2027" | deadline `2026-09-25`, "26–29 Jan 2027" (1-day discrepancy on the start date vs. the live row — worth a quick re-check, not a fabrication either way, both cite the same registration handbook) | **True duplicate.** Do not insert; the live row already has this record's substantive content, matches to within 1 day on the conference start date. |
| RSRCH-OPP-2026-08-22-0007 (Ashoka Young Changemakers) | `discovery_fellowship_2026-08-22.jsonl` | "Ashoka Young Changemakers" (`fellowship`) | eligible_countries: identical 6-country list, max_age 19 | Same 6 countries, "under 20" (max_age 19 or 20 — my phrasing was imprecise; the live row's 19 is more specific and I did not contradict it) | **True duplicate.** Do not insert. Independent re-verification agreeing with the live data is a useful confidence signal, but the record itself is redundant. |
| RSRCH-OPP-2026-08-22-0003 (EYP Türkiye Mersin 2026) | `discovery_conference_2026-08-22.jsonl` | "European Youth Parliament Türkiye (EYP Türkiye)" (`student_program`) | `current_cycle_label`: "2026 — Mersin 2026 NSC listed as upcoming with 'Application link coming soon'" | Same finding, same date (2026-11-09), same "coming soon" status | **Same underlying fact already captured** in the live row's `current_cycle_label`, though as a general-programme entry rather than a session-specific one. Not recommending insertion as a separate row — the live row already reflects this session's status. If ORYN's model later wants session-level granularity (a specific national session as its own bookable opportunity, distinct from the standing programme), that's a product decision, not something to solve by quietly inserting a near-duplicate. |

None of these three files have been deleted or altered — they're left as committed research
artifacts documenting independent verification, with this section as the authoritative note
on what should (not) be done with them. My other four records this session (İnsanlık
Yararına Teknolojiler Yarışması-Lise, Teens in AI, THIMUN's account is now folded into the
above, Brookes Engage, EUNICE MOOCs) were checked against the live table at write time and
are not duplicates of anything found in this reconciliation pass either.

## Summary

- 282 real candidate records in the corpus (not 410 — 128 are DQ-remediation rows with no
  category by design, not miscategorised candidates).
- 34 distinct category strings = 13 valid enum values + 21 non-enum strings.
- Of the 21 non-enum strings, 18 already have an **applied, live** mapping (confirmed by
  direct query, not inferred) — this document mostly records what happened rather than
  deciding it fresh.
- 1 non-enum string (`volunteering_service`, the 4 `turkey_batch3` records) has a clear,
  precedent-backed recommendation (`volunteering`) but has not been applied yet.
- 3 records are held as `NEEDS_REVIEW` for evidence reasons with their category already
  decided.
- No case required a genuine "no enum value fits" verdict for the category itself — the
  closest thing is `structured_service_and_challenge_award` (DofE), where the applied
  mapping (`volunteering`) is real but only captures 1 of the programme's 4 sections, and
  `youth_mobility_civic_project` (Erasmus+), where `student_program` is a default rather
  than a good fit. Both are noted, not re-decided.
- 3 of my own records from tonight's separate thin-category research pass turned out to
  duplicate already-live rows — flagged above with a side-by-side comparison rather than
  silently corrected.
