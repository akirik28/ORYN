# Turkey — counselor knowledge

Evidence base: Turkey-country records within `requirements_batch1-9` (Sabancı, METU, Bilkent,
Hacettepe, Ankara, İTÜ, Boğaziçi, plus the raw YÖK "Yurt Dışından Öğrenci Kabulüne İlişkin
Esaslar" national-policy text in batches 7-9) and `uk_tr_requirements_batch*` (VERIFIED tier), and
`docs/research/admissions-systems/turkey.md` — the R3.1 country doc that treats Turkey
structurally differently from every other country in the package (SYSTEM-LEVEL BACKGROUND tier).
Also see `docs/research/university-requirements-uk-tr/blocked-and-partial-sources.md` for two
institutions (İstanbul Üniversitesi, Yıldız Teknik Üniversitesi) this corpus could not reach.

## The single fact that reframes everything else: Turkey is not a threshold or holistic system

Every other country doc in this package describes either eligibility-threshold or holistic
review. **Turkey's domestic pathway is neither.** A single national exam (YKS) feeds a single
national algorithm (run by ÖSYM) that places students directly into programme seats — there is no
application file, no university admissions office ever reviews an individual domestic applicant,
and no essay/reference/extracurricular channel exists anywhere in this pathway (confirmed
independently by both this research pass and the separate counseling-intelligence research lane,
RULE-COUNSEL-057/109). **The single highest-value counselor error to avoid**: recommending
extracurricular, leadership, or research investment as an admissions lever for a domestic-YKS-
track student — zero channel exists for that evidence to matter. Do not import a US/UK holistic
mental model here even by default.

The mechanism: after sitting YKS, a candidate submits one ranked preference list (tercih, up to
24 programme codes, associate and Bachelor's programmes together) directly to ÖSYM, not to any
university. Placement runs in strict descending national score order within each programme's own
applicant pool — the highest-scoring candidate nationally is placed into their own highest-ranked
programme that still has a seat, then removed from consideration, and so on. **Score, not
preference order, determines who wins a contested seat** — ranking a reach programme first costs
nothing if the student doesn't score high enough for it; being placed depends purely on score
rank, not on gaming preference order.

## Which pathway a student is even in: schooling location, not citizenship, is the determining fact

This is the finding most likely to be gotten wrong by intuition: **as of the 2026 cycle, every
candidate registered at or graduated from a secondary institution in Turkey or the TRNC must
enter through YKS — with only three narrow named exceptions** (embassy-school students,
MOBİS-listed international private institution students, and students relocated to Turkey under a
specific MEB project). This applies **regardless of curriculum** — a Turkey-registered student who
completed IB, A-Level, or AP coursework at a Turkish school is not, on that basis, exempt from YKS
and gains no access to TR-YÖS or a diploma-equivalency bypass. This runs directly counter to the
pattern in nearly every other country in this package, where holding IB/A-Level/AP typically opens
an easier or separate track (contrast the Netherlands, Italy, Switzerland docs) — in Turkey's
domestic pathway it does not.

Symmetrically: **dual Turkish/foreign citizens and Mavi Kart (Blue Card) holders are sorted by
where secondary school was completed, not by the presence of a Turkish passport.** A dual citizen
who finished secondary school in Turkey cannot use the foreign-national quota and must sit YKS
like any other Turkey-registered candidate; one who finished secondary school entirely abroad can
use the foreign-national pathway without renouncing citizenship. This is precisely the "Turkey's
own row" structural pattern the cross-country matrix's schema captures for Turkey: unlike every
other country's row (which describes how a Turkish applicant is treated abroad), Turkey's own row
describes how a **foreign-schooled** applicant — of any nationality — enters Turkish universities.

## The foreign-national pathway: fully decentralized, university sets its own rules

For a genuinely foreign-schooled applicant, ÖSYM's role stops at TR-YÖS exam logistics — there is
no centralized placement algorithm for this population. Each university independently sets which
credentials it accepts (TR-YÖS, SAT, GCE A-Level, IB Diploma, Abitur, or a diploma-score-only route
common at many foundation universities), its own minimum thresholds, and its own evaluation
process. Boğaziçi's own pages publish programme-specific SAT/TR-YÖS/A-Level minimums and note
"additional criteria" including a statement of purpose may be considered — genuinely
university-discretionary, inside the *same* institution that has zero discretion over its
YKS-placed domestic seats.

### Ankara's high-demand programmes accept only TR-YÖS — an SAT applicant is ineligible at any score

Ankara University's own published table (dated 2026/07, its freshest Turkish source in the corpus)
lists Medicine, Medicine (English), Dentistry, Dentistry (English), Computer Engineering (both
tracks), Electrical-Electronics Engineering (English), Artificial Intelligence and Data
Engineering, and Software Engineering under a **TR-YÖS-only minimum of 440 points**
(REQ-2026-08-21-9320) — no SAT, A-Level, or IB row exists for these programmes at all. A separate
heading, "VALID EXAMINATIONS AND REQUIRED SCORES FOR PROGRAMMES EXCLUDING THE ABOVE-LISTED"
(REQ-2026-08-21-9321), governs a *different* set of programmes (Pharmacy, Biomedical Engineering,
Civil Engineering, Nursing, Midwifery, Law, Veterinary, Physics/Food/Geophysical/Geological/
Chemical Engineering), which accept TR-YÖS (min 200, REQ-2026-08-21-9323), SAT (min 1100 total
**and** min 650 Math — the Math sub-score, not just the total, drives placement,
REQ-2026-08-21-9324), or IB (min 30 points, REQ-2026-08-21-9325). **A student holding only an SAT
score, however high, cannot be placed into Ankara Computer Engineering or Medicine — the
requirement exists as the absence of an SAT row, not a failing threshold, which is exactly the
shape a naive "does the student's score clear the bar" checker cannot represent.** The correct
verdict for an SAT-only applicant to one of the TR-YÖS-only programmes is "not eligible on this
credential," not "score too low."

The TR-YÖS threshold itself varies sharply by programme within one university — 200 for the
general pool vs. 440 for Medicine/Dentistry/the listed engineering programmes, more than double —
so a single per-university TR-YÖS number should never be quoted without naming the programme.

### Hacettepe splits its international quota 60/30/10 across TR-YÖS/SAT/A-Level

Hacettepe University's own admission directive states the accepted-credential quota weighting
explicitly: **60% TR-YÖS, 30% SAT, 10% GCE A-Level** (REQ-2026-08-21-9306, extracted from a PDF
`WebFetch` could not parse directly — recovered via `pypdf`). This is the single most
counselor-relevant fact in the whole Turkey corpus and one a plain requirement-check UI would
never surface: **an A-Level applicant to Hacettepe is not competing against the whole applicant
pool — they are competing for one tenth of the seats.** This changes the honest competitiveness
assessment materially versus telling the student only "you meet the minimum requirement." Present
this as an opportunity-cost fact, not just an eligibility fact — a TR-YÖS-track applicant to the
same programme is drawing from six times the seat allocation.

### METU refuses IELTS certificates taken on or after 24 December 2022 — the fresh certificates are the invalid ones

Middle East Technical University's own minimum-application-requirements PDF states plainly:
"IELTS exams taken on or after the 24th of December 2022 will not be anymore accepted"
(REQ-2026-08-21-9102, VERIFIED_UNDATED, recovered via `pypdf` from a PDF `WebFetch` could not
parse). This is the inverse of the usual staleness problem — normally an *old* certificate is the
one to distrust; here METU requires a specific *older* IELTS version and rejects anything newer
than the cutoff. **Never assume "recent test date" is automatically safer** for a Turkish
university's English-proficiency requirement without checking the specific cutoff — this is a
named exclusion, not a general recency rule (contrast the two-years-old exclusions below, which
run the opposite direction).

### Score validity: exam scores expire, diploma grades do not — a pattern that recurs enough to suspect it is national policy, not institutional choice

METU (REQ-2026-08-21-9103), Ankara (REQ-2026-08-21-9305/9323/9324), and Koç University
independently state the same structure: **admission test scores (TR-YÖS, SAT) are valid for two
years from the exam date; diploma grades carry no time limit.** Three institutions converging on
an identical rule independently suggests this descends from YÖK-wide practice rather than being
each university's own choice, though this was not independently confirmed against a single YÖK
source this pass — treat as a strong pattern, not yet a confirmed national mandate.

### Bilkent rejects predicted grades outright — a direct contrast to the UK

"Please note that applications with predicted grades/results/scores will not be evaluated"
(REQ-2026-08-21-6008, VERIFIED). This is a sharp, explicit contrast to the UK counselor-knowledge
doc's central finding that predicted grades are the defining UK admissions mechanic — the same
student's IB or A-Level predicted grade that carries an offer in the UK is worth nothing at
Bilkent. Only final, confirmed results are evaluated.

### Boğaziçi's TOEFL requirement carries the same unmeetable-post-cutover defect found in the UK

Boğaziçi's own page states "TOEFL iBT (minimum 79 total, 22 writing)" with no cutover date
(REQ-2026-08-21-0020/4006, `NEEDS_REVIEW`) — unambiguously the pre-21-January-2026 scale. Per
`scalar-thresholds-are-not-enough.md`'s corpus-wide audit, the 79-overall half survives via ETS's
two-year comparable-score bridge, but the "22 writing" subtest figure cannot be satisfied by any
TOEFL report issued after the cutover, because ETS does not restate section scores on the old
0–30 scale post-rescale. Treat as `needs_manual_review`, not a clean pass/fail — same defect,
same fix, as Glasgow's identical-shaped requirement in the UK doc.

### GPA and score scales must never be converted across systems

Ankara's general high-school-diploma pathway requires "GPA of at least 80 out of 100" — the
**Turkish 100-point scale**, recorded as published (REQ-2026-08-21-9326). This must never be
converted to a US 4.0 scale by ratio; ORYN's own code already refuses cross-system grade
conversion (RULE-ADMISSIONS-004), and this is exactly the kind of number an LLM might be tempted
to "helpfully" rescale. The demotion embedded in this same record is itself counselor-relevant:
this GPA-only route is explicitly used only to fill quota seats that remain vacant *after*
exam-score-based placement — a diploma-only applicant is not competing on equal terms with an
exam-score applicant, and should be told that plainly.

## SYSTEM-LEVEL BACKGROUND: how the domestic system works generally

- **ÖSYM** (Ölçme, Seçme ve Yerleştirme Merkezi) administers YKS, computes every candidate's
  placement score from a published formula, and runs the actual placement algorithm — a genuinely
  different role from UCAS/Studielink/Universitaly, which register and route but never decide.
  ÖSYM's placement step **is** the admission decision for the domestic pathway, with no university
  sign-off at all (RULE-ADMISSIONS-017: the same organization holds a deciding role for one
  population — domestic YKS — and a purely logistics-administration role for another — TR-YÖS —
  within the same country, at the same time).
- **YÖK** (Yükseköğretim Kurulu) sits one layer up — approves each programme's national quota,
  weighing university-submitted capacity and (per its 2026 policy) labour-market data. YÖK does
  not decide individual placements.
- **Foundation (vakıf) and state (devlet) universities use the identical YKS mechanism** for
  domestic-pathway seats — the difference is financial, not procedural. A foundation university's
  scholarship tiers (full/50%/25%/discounted) are separate programme-quota codes within the same
  national tercih guide, each with its own cutoff score, not a separate application or committee.
- No essay, no reference, no interview, no extracurricular channel exists in the domestic YKS
  pathway — confirmed independently by two research lanes. The narrow exception is a small set of
  named talent-exam programmes (state conservatory, fine arts, sports sciences, some
  education-faculty performance programmes), which combine a TYT threshold with a talent/audition
  exam rather than YKS score alone.
- **Dominant counselor risk (per the cross-country matrix)**: applying a holistic-review or
  threshold-eligibility mental model — the shape every other country in this package uses — to a
  system that is neither. Concretely: (1) treating a diploma grade or OBP as a "narrative to
  strengthen" when it is a fixed numeric input to an algorithm; (2) recommending
  extracurricular/leadership/research investment for a domestic-YKS-track student, where no
  channel exists for it to matter; (3) conflating the domestic YKS pathway with the foreign-
  national pathway — assuming TR-YÖS results are centrally placed the way YKS is, or assuming a
  Turkish citizen/resident is automatically YKS-track when their actual schooling was foreign.
