# Spain — counselor knowledge

Evidence base: national-system requirements/deadlines in
`data/research/university-requirements/es_ch_requirements_spain-system_2026-08-21.jsonl` plus
Universidad Carlos III de Madrid (`es_ch_requirements_uc3m_*.jsonl`) and Universidad Complutense de
Madrid (`es_ch_requirements_ucm_*.jsonl`) — no dedicated summary doc exists for this country yet,
so all VERIFIED claims below cite corpus record IDs directly — and
`docs/research/admissions-systems/spain.md` (SYSTEM-LEVEL BACKGROUND tier).

## Two sequential steps for a foreign diploma, run by different bodies that do not talk to each other

For a non-EU/non-agreement foreign qualification (a standard Turkish MEB Lise Diploması falls
here), **two sequential steps are required, not one**: first **homologación** (official equivalence
to the Título de Bachiller), issued by the Ministerio de Educación (Catalonia, Galicia and the
Basque Country handle it regionally instead), processed via the Spanish Embassy's Consejería de
Educación for applicants abroad; only once homologación is **"definitiva" (final)** does
**acreditación UNEDasiss** become available, which computes an actual numeric admission grade.
UNEDasiss's own FAQ states explicitly it "does not homologate or validate titles" — **the two
processes are run by different bodies and are not interchangeable.** Never tell a student that
UNEDasiss accreditation alone resolves their diploma-recognition question, and never assume a
"provisional" homologación is sufficient to proceed to acreditación — Catalonia's own guidance
specifically requires the "definitiva" status before the June preinscripción cycle.

**A bilateral cooperation agreement between Spain and Türkiye exists but does not shortcut this.**
Spain and Türkiye have a bilateral educational cooperation agreement (BOE-A-2014-6393, signed
Istanbul 3 October 2013) — but its own Article 6 commits both countries only to "facilitate" future
mutual recognition through information exchange; it does **not** establish automatic diploma
equivalence. This is a genuine negative finding worth stating plainly to a Turkish family who might
assume the agreement's existence eases the homologación requirement — it doesn't.

## Once homologación is granted, UNEDasiss computes a full numeric grade — not a yes/no eligibility check

This is the single most important, non-obvious fact for a Turkish applicant specifically. The
confirmed formula, from UNEDasiss's own FAQ: **nota de acceso = (0.2 × NMB + 4) + 0.1×M1 + 0.1×M2 +
0.1×M3 + 0.1×M4**, where NMB is the homologated Bachillerato-equivalent average and M1-M4 are the
best scores (minimum 5/10 each, same calendar year) from up to four optional **PCE (Pruebas de
Competencias Específicas)** — UNEDasiss's own subject-specific exams, functionally parallel to
EBAU's voluntary-phase subject exams (REQ-2026-08-21-0006, `NEEDS_REVIEW` in the corpus — verify
the exact current formula before quoting it as final to a student). The result is a grade between 5
and 10 without any PCE, extendable toward 14 with weighted PCE for competitive programmes —
mirroring the domestic nota de admisión ceiling exactly. **At the University of Zaragoza,
UNEDasiss-accredited students are explicitly folded into the same general admission quota as
domestic EBAU-takers, ranked purely by admission grade** — not a segregated or lesser
"international" track. A student and family should understand PCE exams as an optional
score-improvement lever, not a mandatory hurdle — taking them can raise an otherwise-capped
homologación-based grade into genuinely competitive territory.

**A full IB Diploma materially simplifies the pathway** — per UAM's own admissions page, IB holders
(including those educated in Türkiye) go straight to UNEDasiss acreditación, **skipping
homologación entirely**. This is the same "IB simplifies access" pattern already confirmed in the
Netherlands and Germany research, not something unique to Spain — worth checking for any student
who holds IB alongside a national diploma, in any country in this package.

**Two genuine open gaps, flag rather than guess**: whether Turkey's YKS national entrance-exam
score plays any role in homologación or acreditación was not addressed, pro or con, in any official
source reviewed. No Spain-specific bridge/foundation-year mechanism (comparable to the
Netherlands' "one year of Turkish Lisans credits" or Germany's Studienkolleg) was identified — treat
as an unresearched gap, not confirmation that no such route exists.

## Homologación/acreditación are centralized, unlike the Netherlands' or Germany's university-by-university judgment

Recognition in Spain is notably **more centralized** than in the Netherlands or Germany at the
eligibility-determination step — homologación and acreditación are single national (or
designated-regional) processes, not a university-by-university judgment call. **A Turkish applicant
does not face a Tilburg-vs-VU-style problem** of different Spanish universities setting different
acceptance bars for the same diploma — once national homologación and acreditación are complete,
the resulting grade is portable across Spanish universities in the same way a domestic EBAU score
is. University-level discretion re-enters only at the ranking-parameter level (which subjects a
university weights for admission, and that degree's admitted capacity that cycle), not at the
eligibility-gate level.

## Nota de corte is a floating, retrospective number — not a target a student can be told in advance

Every specific cutoff score in this corpus is explicitly the score achieved by the *last admitted
student* the *previous* cycle, never a pre-set threshold — e.g. UCM's 2026-2027 Medicina cutoff of
13,053/14 (REQ-2026-08-21-2006, `VERIFIED_CURRENT`) is the retrospective floor set by demand that
specific cycle, not a number the university decided in advance. The same self-adjusting mechanism
applies at UC3M — its Ingeniería Informática cutoff (11,27x/14, REQ-2026-08-21-1011) and
Inteligencia Artificial cutoff (11,6x/14, REQ-2026-08-21-1012) reflect that cycle's actual demand,
not a published bar. **Never tell a student "you need an X to get into this programme" as a forward
commitment** — the honest framing is "last cycle's floor was X; this cycle's floor depends on that
cycle's applicant pool," the same caution that applies to any floating cutoff system in this
package (contrast Ireland's CAO points, which work identically).

## A general research-technique finding worth carrying: a PDF that extracts cleanly can still be stale

Not specific to one Spanish record, but found during this research programme specifically on a
Spanish admissions document: the PDF extracted perfectly and read as fully current, but its
embedded `CreationDate` metadata showed **2022** — four years stale against a 2026-27 cycle.
`retrieved_at` records when the research *fetched* the page, not when the source last meant the
content; for a PDF specifically, the document's own creation metadata is a second, independent
freshness check that a clean-looking extraction does not substitute for. Worth applying to any PDF
source used for Spain, Turkey, or Switzerland requirements (`pypdf` extraction was used across all
three) before treating its content as current.

## SYSTEM-LEVEL BACKGROUND: how the system works generally

- **EBAU** (domestic exam) and **UNEDasiss's PCE** (international) are Spain's own bespoke
  instruments — SAT/ACT play no found role in the Spanish admission formula. IB and the European
  Baccalaureate are explicitly **exempt from sitting EBAU** per Real Decreto 534/2024 Article 6,
  routing straight to UNEDasiss accreditation instead.
- No single national application platform exists — one "Distrito Único" portal per Comunidad
  Autónoma; a student targeting universities in multiple regions must apply separately to each
  region's own portal, an administrative constraint rather than a legal quota on preferences within
  one region.
- No formal numeric predicted-grade concept, domestic or international — EBAU is sat only after
  Bachillerato is fully complete, and UNEDasiss requires a final ("definitiva"), not provisional,
  homologación before scoring — structurally the opposite of the UK's forward-looking mechanic.
- Spanish B2 (DELE/SIELE/official language school, or embedded in the UNEDasiss accreditation
  process itself) is required for Spanish-taught programmes, independent from the separate
  academic-qualification-recognition question — the same RULE-ADMISSIONS-009 separation found in
  Germany's DSD case, just lower-stakes here since Spain's process doesn't let a language
  credential substitute for or bypass homologación the way DSD's ambiguity risks in Germany.
- **Dominant counselor risk (per the cross-country matrix)**: conflating homologación
  (Ministry-level diploma recognition) with UNEDasiss acreditación (the actual admission-grade-
  generating step) as one process, when they are sequential and run by different bodies — and
  separately, assuming "distrito abierto" (no legal regional-residence preference) means a single
  national application exists, when each region requires its own separate Distrito Único
  application.
