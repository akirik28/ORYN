# Austria — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package (see [`README.md`](./README.md)
for the cross-country matrix, source standard, and ruleset). Added 2026-09-03, eighth entry in
the same single-country expansion line as [`sweden.md`](./sweden.md), [`norway.md`](./norway.md),
[`portugal.md`](./portugal.md), [`greece.md`](./greece.md), [`poland.md`](./poland.md),
[`denmark.md`](./denmark.md) and [`hungary.md`](./hungary.md) — same scope discipline: one
research session, official sources plus corroborating institutional pages, unresolved questions
listed rather than guessed, not folded into the README's 15-country cross-country matrix.

**Trigger:** continuation of the founder-requested corridor expansion. Like the previous seven,
Austria was picked because ORYN's database already holds institutions there with zero admissions
depth (`shape: "unknown"` in every outlook computation until this entry lands).

## A. Admissions architecture — open access is the default, restriction is the named exception

**Different in kind from every other country added this session so far — the default posture is
non-competitive.** Austrian public universities operate under **freier Hochschulzugang** (open
university access): confirmed via Austria's Federal Ministry (bmfwf.gv.at) and corroborating
institutional pages, meeting a programme's stated entry requirement (the Matura/Reifeprüfungszeugnis,
an equivalent foreign qualification, IB Diploma, or European Baccalaureate) is generally
**sufficient for admission — no competitive ranking, no essay, no interview**. This is the same
"eligible functionally equals admitted" posture already documented for the Netherlands' and
Italy's non-restricted programmes and Switzerland's general route in the original 15-country
package (RULE-ADMISSIONS-001) — Austria's general track is `academic_threshold`, matching that
established pattern directly, not a new shape.

**Restriction is the named exception, not the rule**, and where it exists it is a real,
score-only competitive process — most concretely documented for Medicine and Dentistry, via a
national entrance exam (see section C). There is no single national application platform of any
kind: each of Austria's public universities runs its own direct application process.

## B. General/open-access track — threshold, not competition

Meeting the general university entrance qualification (an Austrian Matura, an automatically-
recognized equivalent EU diploma — German Abitur, French Baccalauréat, Italian Maturità and
similar — an IB Diploma, or a European Baccalaureate) grants admission to most programmes with
no further competitive step. Applicants whose qualification is not directly recognized as
equivalent may need to sit a **Studienberechtigungsprüfung** (a university entrance examination)
or complete a **Berufsreifeprüfung** first — this is an *eligibility-establishing* step (proving
the qualification is Matura-equivalent), not a competitive ranking against other applicants once
established. No essay, interview, or reference letter appears anywhere in this track.

## C. Restricted fields — Medicine/Dentistry via MedAT, genuinely rank-competitive

Confirmed via Austria's four public medical universities' own news pages (MedUni Vienna, MedUni
Graz among them): Medicine and Dentistry require an **Aufnahmeverfahren** (admission procedure)
built around the **MedAT**, a single nationwide entrance test held once a year, with admission
"decided purely by score" against a fixed place count (1,950 places nationally for 2026/27,
split across Vienna/Innsbruck/Graz/Linz) and roughly 17,000 applicants competing for them — a
genuinely competitive rank mechanism, not a threshold. Two quota rules apply within that fixed
pool: at least 95% of places reserved for EU citizens/equivalent-access holders, and at least 75%
for Austrian-or-equivalent-school-leaving-certificate holders — quota structure affecting *who
competes in which pool*, not a change to the score-only ranking mechanism itself. Recorded as a
`fieldOverride` for medicine, the same mechanism already used in this registry for Switzerland's
EMS and Germany's NC-Medicine entries.

## D. International (non-EU/non-EEA) applicants — an added eligibility gate, not a different mechanism

Austria's Federal Ministry's own official information (oesterreich.gv.at) confirms non-EU/EEA
applicants face an additional requirement beyond qualification recognition: proof they "must have
a place to study their chosen subject" in a way recognized in their home country (commonly
referenced elsewhere as a **Studienplatznachweis** — this exact term was not independently
confirmed on the specific official page fetched this pass, flagged in "Unresolved questions"
below). This reads as an *added eligibility gate* layered on top of the existing mechanism, not a
change to it: the general track remains threshold-based once eligibility (including this
additional proof) is established, and MedAT remains score-only rank-competitive with the same
95%/75% quota structure applying regardless of EU status within its own terms. This registry
entry therefore records the same shapes for both pathways, with the international mechanism text
noting the added eligibility step rather than a different mechanism.

## Standardized tests

No general-track role. MedAT is the sole confirmed standardized instrument, exclusively for
Medicine/Dentistry.

## Language requirements

Not independently verified to a specific numeric threshold this pass — programmes taught in
German require German proficiency, English-taught programmes require English proficiency, but
exact IELTS/TOEFL-equivalent thresholds were not confirmed against a specific university's own
page.

## Essays / recommendations / extracurriculars

No confirmed requirement in either the general open-access track or the MedAT-restricted track —
both are credential/score-only mechanisms per every source reviewed this pass.

## Safe inferences

Austria's default admissions posture is threshold-based, not competitive — open access once a
recognized qualification is held, the same category already established for the Netherlands,
Italy and Switzerland's general routes in the original 15-country package. Restriction exists as
a specifically named exception (most concretely Medicine/Dentistry via MedAT), which is genuinely
score-only rank-competitive with a fixed place count and real oversubscription (roughly 17,000
applicants for ~1,850 places). Non-EU/EEA applicants face an additional eligibility-proof step,
not a different underlying mechanism.

## Unsafe inferences

Do not assume every Austrian programme is open-access — Medicine and Dentistry are confirmed
restricted, and this pass did not exhaustively check whether other fields (Psychology, Veterinary
Medicine, some Business programmes at specific universities) carry their own restrictions;
absence of a finding here is not confirmation none exists. Do not assume the exact term
"Studienplatznachweis" or its precise document requirements without checking a specific
university's own current page — the underlying eligibility-gate concept is confirmed, the exact
official terminology and document list were not independently verified against a primary source
naming that specific term this pass.

## Counselor actions

For most programmes, explain that Austria works on eligibility, not competition — a recognized
qualification (Matura-equivalent, IB, or EB) is generally sufficient, and there is no essay or
activities component to prepare. For a Turkish applicant with no automatically-recognized
qualification, flag the possible need for a Studienberechtigungsprüfung or Berufsreifeprüfung to
establish equivalence before the open-access mechanism applies. For any Medicine/Dentistry
applicant, treat MedAT preparation as the entire admissions question — there is no channel for
essays, activities, or interviews to matter there either, only the exam score against a real,
oversubscribed fixed quota. For all non-EU/EEA applicants, confirm the current home-country
eligibility-proof requirement directly with the target university, since the exact document and
its scope were not independently verified to primary-source precision this pass.

## E. The Fachhochschule (FH) sector — a confirmed second subdivision, not an assumption

**2026-09-03 addendum.** Everything above describes the university (Universität) sector. Checked
separately, prompted directly by Finland's AMK divergence and the Netherlands' HBO convergence —
neither outcome was assumed to carry over; the question was asked fresh for Austria's own 21
Fachhochschulen (6e's institution research, `docs/austria-fh-sector-2026-09-03.md`).

**Confirmed: Austria's FH sector genuinely diverges, at the statute level, not just by
reputation.** § 11 of the Fachhochschul-Studiengesetz (FHStG) — a separate law from the one
governing universities — fetched directly, primary confidence: legally requires an admission
procedure ("Aufnahmeverfahren") whenever applicants exceed places, mandates a documented,
verifiable interview with every applicant "nach Maßgabe organisatorischer Möglichkeiten," and
does not specify grades as the sole criterion. In practice (FH Kärnten's own applicant guide,
fetched directly): a multi-stage aptitude test (general knowledge, logical reasoning, verbal
comprehension) plus an admission interview explicitly built around motivation and personal fit —
sample questions given verbatim include "Wie würdest du dich beschreiben?" and "Warum genau
dieses Programm?" The same source states plainly that Austrian universities historically had *no*
entrance requirement at all, naming the FH aptitude test as a defining, structural difference
between the two sectors — not this document's own inference.

**Why this reads as Finland's shape, not the Netherlands':** Austria's FH sector has its own
governing statute (FHStG) and its own self-governance body (FHK, Österreichische
Fachhochschul-Konferenz — the same body that supplied 6e's institution list) distinct from the
university sector's. This is the identical structural signature — two separate governing Acts —
that made Finland's AMK sector a genuine divergence, and the opposite of the Netherlands, where
HBO and WO share one framework (WHW) and were confirmed to converge for exactly that reason.

**Eligibility, checked separately from the selection mechanism:** oesterreich.gv.at names a
Turkish diploma specifically as needing proof of the university entrance exam (YKS) before an FH
application is considered — the same added-recognition-step pattern already documented for the
university sector in §D above, layered on top of, not instead of, the FH-specific interview and
aptitude test everyone (EU or not) goes through once eligible.

**Not checked this pass:** whether the group-quota split §11 FHStG mandates for Bachelor's
programmes (at least one group reserved for vocational/Berufsreifeprüfung-qualified applicants,
distinct from Matura holders) materially changes an individual applicant's odds — the law
requires the split exist, not what size it is per programme. Whether Fachhochschule für
angewandte Militärwissenschaften's housing at the Theresian Military Academy changes anything
about its own FHStG-governed admission procedure specifically — nothing found suggests it does,
but it wasn't independently checked beyond confirming it's open to civilian applicants and
appears identically to the other 20 FHs on all three of 6e's source lists.

Registry entry: shipped in `lib/admissions/system-shape.ts`, `subdivisions: [{ key: "fh", ... }]`
on Austria's existing entry, covering all 21 real institution names.

## Sources

- Austrian Federal Ministry of Education, Science and Research (bmfwf.gv.at), "Access to higher
  education in Austria (General University Entrance Qualification)" —
  `https://www.bmfwf.gv.at/en/science/recognition-of-qualifications/access-to-higher-education-in-austria.html`
  — retrieved 2026-09-03. Primary source for the open-access/threshold mechanism in section B.
- oesterreich.gv.at (Austrian government portal), "Admission requirements for non-EU and non-EEA
  nationals" — `https://www.oesterreich.gv.at/en/themen/bildung_und_ausbildung/hochschulen/universitaet/Seite.160102`
  — retrieved 2026-09-03. Source for the added eligibility-gate framing in section D.
- MedUni Vienna, MedAT admissions-process news pages — `https://www.meduniwien.ac.at/web/en/` —
  retrieved 2026-09-03. Primary source for the MedAT mechanism, place counts and quota structure
  in section C.
- MedUni Graz, corroborating MedAT admissions-process news page — retrieved 2026-09-03.
- Secondary corroboration only (general application-process orientation, language thresholds):
  general web search summarizing institutional guidance — not independently primary-verified for
  every specific claim this pass.
- (§E addendum) JUSLINE Österreich, § 11 FHStG (Fachhochschul-Studiengesetz) full text —
  `https://www.jusline.at/gesetz/fhstg/paragraf/11` — fetched directly 2026-09-03, primary
  confidence, for the legal admission-procedure requirement.
- (§E addendum) FH Kärnten, applicant guide to the Aufnahmeverfahren —
  `https://fresh.fh-kaernten.at/das-aufnahmeverfahren-alles-was-du-wissen-musst/` — fetched
  directly 2026-09-03, primary confidence, for the practical aptitude-test/interview mechanism
  and the explicit university-sector contrast.
- (§E addendum) oesterreich.gv.at, "Zulassung zum Fachhochschul-Studium" — search-summary sourced
  2026-09-03, for the Turkey-specific YKS-proof eligibility requirement; not independently
  re-fetched from the primary page.
- (§E addendum) FHK (Österreichische Fachhochschul-Konferenz) and 6e's own institution research,
  [`docs/austria-fh-sector-2026-09-03.md`](../../austria-fh-sector-2026-09-03.md) — source of the
  21-institution FH identity list used in the shipped `matchNames`.

## Unresolved questions

The exact official term and document requirements for the non-EU/EEA eligibility-proof step
(referred to elsewhere as Studienplatznachweis) — confirmed conceptually via an official
government page, not confirmed by that exact name from a primary source this pass. Whether fields
beyond Medicine/Dentistry (Psychology, Veterinary Medicine, certain Business programmes) carry
their own restricted-admission mechanisms — not surveyed this pass. Numeric language-proficiency
thresholds. Current-cycle deadlines for the open-access track specifically (MedAT's own July
timing was found; the general track's was not).
