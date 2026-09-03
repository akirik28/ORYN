# Denmark — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package (see [`README.md`](./README.md)
for the cross-country matrix, source standard, and ruleset). Added 2026-09-03, part of the same
single-country expansion line as [`sweden.md`](./sweden.md), [`norway.md`](./norway.md),
[`portugal.md`](./portugal.md), [`greece.md`](./greece.md) and [`poland.md`](./poland.md) — same
scope discipline: one research session, official/institutional sources, unresolved questions
listed rather than guessed, not folded into the README's 15-country cross-country matrix.

**Trigger:** continuation of the founder-requested corridor expansion. Like the previous five,
Denmark was picked because ORYN's database already holds institutions there with zero admissions
depth (`shape: "unknown"` in every outlook computation until this entry lands).

## A. Admissions architecture — one centralized portal, two genuinely different tracks

Applications run through **Optagelse.dk**, a single national portal (opening 1 February,
deadline 15 March for both tracks, up to 8 ranked programme choices) — but unlike every other
country added in this expansion line so far, Denmark does not resolve to one mechanism per
applicant population. It resolves to **two structurally opposite tracks that exist in parallel**,
and — this is the finding worth stating plainly — **the applicant, not the country or the
programme, chooses which one governs them** (subject to eligibility). This is confirmed
consistently across multiple official university pages (University of Copenhagen, Roskilde
University, Aarhus University) describing the identical two-track structure.

## B. Kvote 1 (Quota 1) — grades only, rank-competitive

Confirmed via University of Copenhagen's and Aarhus University's own admissions pages: Kvote 1
admits purely on grade point average from upper secondary education. **Eligibility for Kvote 1
itself is restricted** — open only to applicants whose secondary education is from within the
EU, or who hold an International Baccalaureate (IB) or European Baccalaureate (EB); a foreign
GPA is converted onto the Danish 7-point grading scale for direct comparison. Each programme's
required grade point average is published **after** the admission cycle (28 July), the same
"floating threshold determined by that cycle's applicant pool" pattern already confirmed for
Portugal and Greece in this expansion line — not a fixed, published-in-advance cutoff. No essay,
interview, or non-academic evidence plays any role in Kvote 1.

## C. Kvote 2 (Quota 2) — genuinely holistic, not a smaller version of Kvote 1

**Confirmed as real holistic review, not a euphemism.** Multiple official and institutional
sources converge: Kvote 2 involves an application requiring a personal statement/motivational
essay ("the most important part of your Quota 2 application" per one guide, corroborated by
Copenhagen Business School's own admissions page), and, at many programmes, a **Kvote 2 test
and admission interview**. Selection considers "personal background, experience, and motivation"
alongside academic qualifications — every application is evaluated individually. This is the
first genuinely `holistic_review` finding in this session's expansion line; the previous five
countries (Sweden, Norway, Portugal, Greece, Poland) were all confirmed `academic_rank_competitive`
or (for Norway/Portugal's international tracks) honestly `unknown`.

## D. Why this does not reduce to one shape — and why "unknown" is the honest domestic answer

**A Danish (or other EU/IB/EB-eligible) applicant genuinely chooses which track to apply
through**, and can often apply through both in parallel — nothing in Oryn's available student
data (residence, school country) determines which one a given student is actually pursuing. This
is structurally different from every prior "unknown" finding in this package: Canada's and
Portugal's international "unknown" reflect *institutional* variation Oryn hasn't mapped; Denmark's
domestic "unknown" reflects a **real, applicant-chosen fork** within one centralized system, where
either shape genuinely could be correct for a specific student and picking one by default would
misdescribe the other half. This is recorded as `shape: "unknown"` for the domestic pathway,
consistent with `AdmissionSystemShape`'s own documented purpose: "a country whose pathways
genuinely disagree with each other and Oryn lacks the fact that decides which one applies" — that
sentence was written about domestic-vs-international ambiguity, but the same underlying
principle is exactly what's happening here, one level down, inside the domestic pathway itself.

## E. International (non-EU/non-IB/non-EB) — a confident answer, unlike the domestic case

**Genuinely less ambiguous than the domestic case, and worth stating with confidence rather than
also defaulting to unknown.** Multiple sources state plainly that "all international applicants
are automatically assessed in quota 2" — meaning an applicant whose secondary qualification does
NOT convert onto the Danish scale (a Turkish MEB diploma, for the realistic ORYN population) is
**restricted to Kvote 2 only**; Kvote 1 is not an available choice for them at all, since Kvote 1
eligibility itself requires an EU/IB/EB qualification. This registry entry records the
international pathway as `holistic_review` on that basis. The one honest exception: a
Turkish-schooled applicant who specifically holds a full **IB Diploma** (not the ordinary MEB
Lise Diploması) would also qualify for Kvote 1, reintroducing the same genuine ambiguity found
domestically — not represented separately in the registry entry (there is no field-taxonomy
signal for "holds an IB Diploma" to key an override on), and noted here instead.

## Standardized tests

No SAT/ACT role found in Kvote 1. A "Kvote 2 test" is mentioned at several programmes as part of
the holistic Kvote 2 process, but this pass did not confirm its name, content, or whether it is
universal across all Kvote-2 programmes or programme-specific — flagged as unresolved.

## Language requirements

Not independently verified to a specific numeric threshold this pass for either track — flagged
as a gap, not asserted.

## Essays / recommendations / extracurriculars

**Track-dependent, sharply.** Absent entirely from Kvote 1 (grades only). Central to Kvote 2: a
motivational essay/personal statement is explicitly described as the most important single
component of a Kvote 2 application at multiple institutions, alongside relevant experience and
an interview at many programmes. This is the clearest track-dependent essay/interview finding of
any country in this expansion line — most others are essay/interview-absent uniformly across
whichever tracks they have.

## Safe inferences

Denmark's Optagelse.dk is a single national application portal, but it is not a single admissions
mechanism — Kvote 1 (grades-only, rank-competitive, EU/IB/EB-restricted) and Kvote 2 (genuinely
holistic: essay, experience, often an interview, open to all) are structurally opposite tracks
that exist in parallel, and eligible applicants choose between them. A non-EU/non-IB applicant
(the realistic Turkish MEB case) is restricted to Kvote 2 only, making `holistic_review` a
confident answer for that population specifically, even though the general domestic case is not
reducible to one shape.

## Unsafe inferences

Do not assume a Danish domestic applicant's shape can be inferred without knowing which quota
they are pursuing — presenting Kvote 1's rank-competitive framing to a Kvote 2 applicant (or the
reverse) would misdescribe the actual mechanism governing their application. Do not assume every
Kvote 2 programme requires the same test/interview format — this pass found the general pattern
but did not verify it is universal or programme-specific. Do not assume a Turkish IB-Diploma
holder is restricted to Kvote 2 the way an ordinary MEB diploma holder is — IB eligibility for
Kvote 1 was confirmed generally, just not resolved as a distinct registry override.

## Counselor actions

Establish early which quota a Danish-track student is actually pursuing (or planning to pursue
both) — the two tracks need almost entirely different preparation: Kvote 1 is a pure grades
conversation, Kvote 2 is fundamentally about the personal statement, relevant experience, and
interview readiness. For a Turkish MEB-diploma applicant with no IB, explain plainly that they
are on the Kvote 2 (holistic) track by default, with no Kvote 1 alternative available — the
opposite framing from most of this expansion line's other countries. For a Turkish applicant who
does hold a full IB Diploma, flag that they may have a genuine choice between both tracks and
should investigate both rather than assuming Kvote 2 is their only option.

## Sources

- University of Copenhagen, "Quota 1 and quota 2" —
  `https://www.ku.dk/studies/bachelor/quota-1-and-quota-2` — retrieved 2026-09-03.
- Roskilde University, "Admission through quota 1 or 2" —
  `https://ruc.dk/en/admission-through-quota-1-or-2` — retrieved 2026-09-03.
- Aarhus University, "All about Quota 1 and 2" —
  `https://bachelor.au.dk/en/admission/all-about-quota-1-and-2` — retrieved 2026-09-03.
- Copenhagen Business School, "Get ready to apply in Quota 2" —
  `https://www.cbs.dk/en/study/bachelor/news/get-ready-to-apply-in-quota-2` — retrieved
  2026-09-03. Corroborates the motivational-essay emphasis in section C.
- Secondary corroboration only (application timing, general orientation): general web search
  summarizing institutional guidance — not independently primary-verified for every specific
  claim this pass.

## Unresolved questions

The exact content/format of the "Kvote 2 test" mentioned at several programmes, and whether it
is universal or programme-specific. Numeric language-proficiency thresholds for either track.
Whether a Turkish IB-Diploma holder's dual Kvote 1/Kvote 2 eligibility should eventually be
represented as a distinct registry state — not attempted this pass, since no existing
`AdmissionSystemQuery` field signals "holds an IB Diploma" to key an override on. Current-cycle
deadlines beyond the general 15 March figure found across sources. Whether any restricted/
high-demand programme (Medicine, for instance) layers additional criteria on top of either
quota.
