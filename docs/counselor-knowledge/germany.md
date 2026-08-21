# Germany — counselor knowledge

Evidence base: 366 requirements + 233 deadlines across 10 German universities (LMU Munich,
Heidelberg, TU Berlin, Bonn, Humboldt, Freiburg, Göttingen, Hamburg, TU Darmstadt, Stuttgart —
part of the shared 991-record DE/NL corpus,
`data/research/university-requirements/de_nl_{requirements,deadlines}_*.jsonl`), plus
`docs/research/university-requirements/de-nl-requirements-deadlines-summary.md` (VERIFIED tier),
and `docs/research/admissions-systems/germany.md`, which builds directly on the DSD≠Abitur
distinction established in `docs/research/secondary-education-systems/germany-abitur-dsd.md`
(SYSTEM-LEVEL BACKGROUND tier). A dedicated conflicts-verification pass has since closed most of
the German/Dutch corpus's originally-flagged conflicts (see `docs/research/requirement-conflicts/`
once merged) — **the Heidelberg uni-assist question below is confirmed still genuinely open**
(not merely unverified); a second case, Humboldt's two Winter-semester uni-assist-track deadline
windows, is blocked by an anti-scraping challenge on both source URLs and describes an
already-closed cycle — flagged for manual browser follow-up, not counselor-actionable today.

## The single highest-stakes finding in the whole research programme: DSD resolves language, never academic recognition

**DSD (Deutsches Sprachdiplom) satisfies German-language proof — nothing else.** DSD I (~A2/B1)
satisfies the language requirement for *admission to* a Studienkolleg; DSD II (~B2/C1) satisfies
the language requirement for *direct enrollment* in a German-taught programme. **Neither level
changes whether the underlying secondary diploma (e.g. a Turkish MEB Lise Diploması) is classified
H+, H-, or H+/- in Anabin** — Germany's authoritative qualification-recognition reference. A DSD II
holder with a standard, non-hybrid foreign diploma and no other qualifying credential still
generally needs Studienkolleg + the Feststellungsprüfung (FSP) for the *academic* side, even
though DSD II already fully satisfies the *language* side of both Studienkolleg and direct
enrollment. **Never tell a student that DSD II means they're academically cleared for direct
university entry — it means their German is strong enough, which is a separate question from
whether their diploma is recognized at all.** This is RULE-ADMISSIONS-009 (language requirements
and academic-qualification eligibility are separate facts) in its sharpest, highest-stakes form
across the entire admissions-systems research package.

For a Turkish applicant specifically: a standard 12-year Lise Diploması alone generally grants only
restricted, subject-specific access to Fachhochschulen (applied-sciences universities), and only
when combined with a qualifying Turkish placement-exam result *and* proof of an actual assigned
place at a Turkish university-affiliated Yüksekokul. Without that combination, Studienkolleg + FSP
is required for any German university access. The pathways that most reliably unlock fuller
access: (a) 1-2 years of completed credit at an Anabin-H+ Turkish university; (b) holding IB
Diploma alongside/instead of MEB — **IB is explicitly exempt from the Studienkolleg requirement**
per DAAD, functioning as a full Hochschulzugangsberechtigung; (c) graduation from a
German-curriculum school in Turkey with its own KMK-recognized Abitur-equivalent (e.g. Deutsche
Schule Istanbul's DSD II + DIA track). **Freshness caveat inherited from the source research**: the
specific numeric Anabin Turkey threshold found ("more than 180,000 points on YGS") predates
Turkey's 2018 exam reform to YKS and is likely stale — reconfirm against a live Anabin Turkey page
before quoting a specific number to a 2026/27-cycle applicant; the underlying H+/H-/H+/- logic is
sound even if that one figure isn't.

## Predicted grades do not exist here — Germany decides on the final result, never a forecast

Unlike the UK, no official German source (DAAD, hochschulstart, uni-assist, Anabin) uses a
predicted-grade mechanism. Admission for direct-entry-qualified applicants is decided on the
**final** Abiturnote or Anabin-equivalent, or a completed FSP for Studienkolleg-track applicants.
Near-completion applicants may apply and be provisionally processed, but Immatrikulation requires
the final certificate before the semester starts. **Do not import UK-style "conditional on
predicted grades" language when advising a student on a German application** — Germany's
conditional-admission concept is structurally different (Studienkolleg-conditional-on-FSP,
pending-final-results, or NC's provisional-pending-Abiturnote-confirmation), not a forward-looking
grade target.

## Undated recurring deadlines are the norm here, and the rate is a page-property, not a country-property

Just over half of every German/Dutch deadline found (201 of 396, 51%) carries a day and month with
**no year at all** — `deadline_date` stays null, `recurrence: recurring_annual_undated`, real text
preserved in `deadline_text_verbatim`. The spread within Germany alone makes the point: Heidelberg
is 92% undated, TU Berlin is 0% undated — both German comprehensive universities of similar
profile, both publishing on central admissions pages, with opposite conventions. **Never assume a
"Germany" or "Netherlands" default rate — check the specific institution's own page-maintenance
habit.** hochschulstart itself runs on an earlier, separate schedule for the 4 NC subjects: a 31
May Wintersemester deadline, confirmed directly from hochschulstart's own FAQ, notably earlier than
the general university deadline (commonly 15 July, though TU München sets an earlier internal
deadline, sometimes May).

## uni-assist has three genuinely different relationships to a given university, not one

Every German university in this corpus was checked directly against uni-assist's own published
member list, with three distinct outcomes:

1. **Doesn't use uni-assist at all**: Bonn, LMU, Göttingen (REQ-2026-08-21-GOE0003, confirmed by
   absence from uni-assist's own member list plus university-side corroboration), TU Darmstadt
   (REQ-2026-08-21-DAR0029), Stuttgart.
2. **Uses it, but uni-assist explicitly defers to the university's own dates**: Humboldt, TU
   Berlin — uni-assist's own page states verbatim "uni-assist's deadline is the deadline set by
   the university." This is the **opposite** relationship from UCAS/Glasgow (see the UK doc) —
   there, the platform is the independently authoritative source; here, it explicitly is not. The
   "an official application system is HIGH authority for the facts it owns" rule only applies
   where the system actually owns the fact — check which direction the deference runs before
   citing an application-processor's date as authoritative.
3. **Doesn't require it, but accepts its evaluation reports as fallback evidence**: Hamburg
   (REQ-2026-08-21-HAM0003, the VPD/Vorprüfungsdokumentation) — a genuine third shape, neither
   "uses" nor "doesn't use."

**Heidelberg has a genuine, still-open conflict on this exact question — confirmed by a dedicated
conflicts-verification pass, not just flagged and left.** A 2018 official PDF (REQ-2026-08-21-
HEI0009) describes a mandatory uni-assist step for non-EU Medicine/Pharmacy/Dentistry applicants;
a current live page (REQ-2026-08-21-HEI0010) says those applicants apply directly with no
uni-assist mention. This is **not** the same shape as Harvard's closed 2021 testing conflict in
the US doc — that page superseded itself against five *current* pages stating the live policy.
Heidelberg has **no current dated source at all** on this question, only an undated faculty page
whose *silence* about uni-assist is the entire counter-evidence — and absence of mention is weak
proof of absence, not confirmation. It got worse on re-verification: a search result confidently
asserting uni-assist is current 2026 guidance turned out to trace back to a *third* Heidelberg PDF,
from **winter semester 2011/12**, still live on the official domain and paraphrased in the present
tense. **The counselor-relevant rule this earns: when a requirement's real-world consequence is
asymmetric, advise toward the safer side.** If uni-assist is actually required and a student
applies directly instead, the application may not be considered at all — so **never present direct
application as sufficient** for a Heidelberg non-EU Medicine/Pharmacy/Dentistry applicant; tell
them to complete uni-assist as well, even though the current live page doesn't explicitly demand
it. Full write-up: `docs/research/requirement-conflicts/` (once merged).

## The TOEFL rescale trap: good and bad handling inside the same university, same day

Confirmed 124 times across this corpus (both Germany and the Netherlands), with the sharpest
same-institution contrast at Stuttgart: the **Information Technology (INFOTECH) M.Sc.** page
states both scales explicitly with the cutover date printed — "95 or better" (legacy) and, from
2026, "5 or better" on the new 1-6 scale (REQ-2026-08-21-STU0018/STU0019, `resolved_unambiguous`).
The **Air Quality Control/Waste Water (WASTE) M.Sc.** page at the *same university*, fetched the
same day, states only "TOEFL (iBT): 88" with no rescale acknowledgment at all
(REQ-2026-08-21-STU0027, `undated_scale_assumption`) — unsafe to evaluate as a naive threshold once
post-cutover reports are the only kind available. **This is conclusively a page-maintenance
property, not an institutional one** — never assume "this university handles TOEFL correctly"
generalizes from one programme page to a sibling programme at the same university. TU Delft
(Netherlands, same corpus) shows the identical pattern at MSc-vs-BSc granularity.

**Hamburg's Psychology department page and its central admissions page were originally recorded
as conflicting on English-test thresholds — closed on verification as a union, not a
contradiction.** Both figures are real; the department page additionally accepts Oxford Test of
English 111, PTE Academic 59, and telc B2, which the central page omits entirely. A student
holding PTE Academic 59 is admissible via the department's own accepted-test list and would find
no route at all if only the central page were consulted — read the specific programme's own page,
not just the university-wide one, before telling a student they don't qualify on English
proficiency.

## Subject-track gates inside Studienkolleg: passing the FSP doesn't open every door

Studienkolleg course tracks are themselves subject-prerequisite gates, not a generic
foundation-year pass: the T-Kurs (technical) FSP only qualifies a student for
technical/engineering/natural-science programmes, not law or humanities. The same logic applies to
M-Kurs (medicine/biosciences), W-Kurs (economics/social sciences), G-Kurs (humanities), S-Kurs
(languages). **A student who completes Studienkolleg is not thereby cleared for any German
Bachelor's programme — only for the field family matching their specific track.**

## SYSTEM-LEVEL BACKGROUND: how the system works generally

- **Two parallel routes**: the 4 nationally-coordinated NC subjects (Humanmedizin, Zahnmedizin,
  Tiermedizin, Pharmazie) go through hochschulstart.de via the DoSV, centrally allocating seats;
  everything else is decentralized, direct-to-university.
- **Post-2020 Medicine allocation model** (after the Bundesverfassungsgericht's December 2017
  ruling struck down the old waiting-time-heavy system): roughly 20% Vorabquote for special
  applicant groups, then Abiturbestenquote (~30% of the remainder, Abiturnote-only ranking, NC
  around 1.0 in most Länder), AdH/Auswahlverfahren der Hochschulen (~60%, each university's own
  weighted mix of Abiturnote plus TMS/HAM-Nat/vocational experience/interview — genuinely varies
  by institution), ZEQ (~10%, a non-grade path for weaker-Abiturnote applicants). These percentages
  are consistently reported by secondary sources but were not independently confirmed against
  hochschulstart's own primary quota table — reconfirm before treating as precise.
- **Local NC (örtlicher Numerus Clausus)** is a completely different, decentralized mechanism from
  national NC — individual universities set their own thresholds for popular local programmes
  (commonly Psychology, BWL/Business Administration), fluctuating yearly, uncoordinated by any
  national body. The same nominal "NC subject" at two universities can mean two unrelated
  processes — never treat "NC" as one mechanism.
- No personal statement or recommendation letters for the great majority of direct-entry
  bachelor's admission — absent from DAAD's official overview, consistent with the
  qualification-threshold-based dominant model. The exception is programme-level, not national:
  some English-taught international-degree tracks and some Studienkolleg-track applications may
  request a motivation letter.
- Extracurriculars are not a primary factor for most programmes; the one meaningful exception is
  NC Medicine's AdH quota, where some universities (reportedly Hannover heavily) weight
  health-related professional/vocational experience specifically — not a general US-holistic
  breadth factor.
- **Dominant counselor risk (per the cross-country matrix)**: conflating DSD language
  certification with academic qualification recognition (covered above in full), or assuming any
  12-year diploma is Abitur-equivalent when Anabin's H+/H-/H+/- classification is genuinely
  country- and sometimes diploma-type-specific.
