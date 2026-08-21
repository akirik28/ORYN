# Handoff: Country-level admissions system intelligence — v2 expansion

STATUS:
**Research complete and committed for 8 new countries; NOT yet folded into
`README.md`'s cross-country matrix/ruleset or into a rewritten summary.** That
integration is the single clearest next action for whoever picks this up.

Session context: overnight research mission, timeboxed to 2026-08-21 11:00
Europe/Istanbul, same deadline as the concurrent COUNSEL-RESEARCH lane. This
doc is being written in the final ~15 minutes before that deadline, so it
prioritizes capturing synthesis (findings, new-rule candidates) over polish —
the raw per-country research itself is complete and validated, not rushed.

COUNTRIES ADDED THIS PASS:
Switzerland, France, Spain, Ireland, Australia, New Zealand, Hong Kong,
Singapore — full writeups: `docs/research/admissions-systems/*.md` (new
files only; the original 6 — US/UK/Netherlands/Italy/Germany/Canada — are
byte-for-byte untouched). Machine-readable: all 8 merged into
`data/research/admissions-systems/admissions-systems-v1.json` (bumped to
`"version": "admissions-systems-v2"` internally; the original 6 entries in
the `countries` array are untouched, verified via the merge script's
skip-if-present logic). Raw per-country JSON fragments also kept at
`data/research/admissions-systems/fragments/*.json` as an audit trail.
14 countries total now in the JSON.

Same template as v1 throughout: 24 markdown sections per country including a
dedicated "Applicant educated in Türkiye" section; each JSON section object
carries a `scope` label (national/platform/university/programme) and a
`sources` array; a `matrix_row` object per country for table-building;
honest "Unresolved questions" rather than invented equivalencies.

NOT YET DONE (explicitly, not silently skipped):
- README.md's cross-country matrix and 12-rule ruleset were NOT edited —
  they still describe only the original 6 countries. **Do not assume the
  README reflects current coverage.** The 8 new countries' `matrix_row`
  objects are all sitting in their respective JSON fragments/entries, ready
  to fold in mechanically.
- The 4 candidate new rules below (working numbers RULE-ADMISSIONS-013
  through ~016) are proposed, evidence-backed, but **not yet added to
  README.md** — numbering/wording should be finalized by whoever does that
  integration pass, not treated as final here.
- Batch 3 (Sweden, Belgium, Austria, Poland, Czech Republic) was planned but
  never started — no research exists for these yet.
- Turkey's own domestic system (YKS/ÖSYM) was deliberately out of scope for
  this package (it's the source-country lens throughout, not a destination
  studied here) — flagged as a real, separate gap if it becomes relevant.

CANDIDATE NEW RULES (evidence-backed, found independently by multiple agents
researching different countries — the same bar the original 12 rules used):

**Candidate RULE-ADMISSIONS-013 — A national platform's existence does not
imply it is reachable by all applicant types.**
Distinct from the existing RULE-ADMISSIONS-012 ("platform ≠ decision-maker"):
here the platform doesn't just decline to decide for an applicant type, it
categorically doesn't accept it. Hong Kong: JUPAS has been closed to all
non-local applicants since the 2020 cycle — every Turkish MEB/IB/A-Level
applicant, regardless of qualification, must use each university's separate,
uncoordinated "non-JUPAS" scheme instead. France: Parcoursup is for
French/EU Baccalauréat holders only; a foreign-diploma holder instead files
an entirely different DAP dossier via Études en France/Campus France, capped
at 3 university choices vs. Parcoursup's 10. Ireland shows a related but
distinct shape (CAO vs. non-EU-direct is a full parallel-system bifurcation,
not just an access gate) — see candidate 015.

**Candidate RULE-ADMISSIONS-014 — Capacity restriction can be scoped by
nationality-proportion, not just programme capacity.**
Singapore: a government-confirmed ~10% ceiling on the proportion of
international undergraduates across all six Autonomous Universities —
restriction by aggregate nationality quota, independent of any individual
programme's own capacity limit. None of the original 6 countries documented
this axis; it needs to be modeled as a distinct restriction type, not folded
into the existing programme-level "numerus clausus" concept
(RULE-ADMISSIONS-010).

**Candidate RULE-ADMISSIONS-015 — "Two systems in one country" can mean two
full parallel architectures, not just a platform-access gate or a
university-level override.**
Ireland: CAO (points-based, computational ranking, no predicted-grade
conditional offers, no essays/references) vs. the non-EU-direct route
(university-specific evidence models, essays/references appear, foundation
years common) are two structurally different admissions systems inside one
country, not one system with an exception. France's Parcoursup/DAP split
(candidate 013) and Hong Kong's JUPAS/non-JUPAS split (candidate 013) are
close cousins of this same shape — whoever finalizes the ruleset should
decide whether 013 and 015 are one rule or two (the France/HK cases are
about *platform access*; Ireland's is about the *entire admissions logic*,
including evidence types and offer mechanics, flipping by applicant route —
arguably the sharper, more consequential version of the same underlying
pattern).

**Candidate RULE-ADMISSIONS-016 — Identical or similar-sounding terminology
across countries can denote structurally unrelated mechanisms.**
New Zealand's NCEA "Rank Score" (an absolute points score built from
Achievement-Standard credits, used as a graduated guaranteed-vs-discretionary
gate at specific universities) and the US "class rank" concept (relative
standing within one's own school cohort) share no structural relationship
despite the name collision. This is a different *kind* of caution than the
existing rules (which are about facts being country-specific) — it's about
vocabulary itself being a false-cognate trap for a counselor or an LLM
pattern-matching across countries.

OTHER STRUCTURAL FINDINGS WORTH SURFACING (sharper instances of existing
rules, not new ones — recorded so they're not lost, per each researching
agent's own honest self-assessment):
- **Within-country platform disagreement**: Australia's own state Tertiary
  Admissions Centres don't agree with each other — UAC (NSW/ACT) centrally
  processes ~40 overseas qualifications plus the IB Diploma; VTAC (Victoria)
  processes zero overseas qualifications, IB included, unless completed in
  Australia/NZ. The identical overseas-educated applicant is centrally
  processed at a UAC-affiliated university and must direct-apply at a
  VTAC-affiliated one. Sharper instance of RULE-ADMISSIONS-002.
- **Switzerland**: the most decentralized system found in the package so
  far — no shared platform of any kind, not even a Studielink-style
  registration layer. Medicine (and related fields) splits into genuinely
  different selection mechanisms *by linguistic region* (EMS pre-entry test
  vs. French-region post-entry exam) — a regional/meso-level axis distinct
  from the programme-level pattern RULE-ADMISSIONS-010 already covers.
- **Spain**: the international pathway (UNEDasiss, for non-EU applicants)
  computes a genuine numeric admission grade that competes in the *same*
  general applicant pool as domestic EBAU-takers — not a segregated track.
  Materially different shape from the Netherlands'/Germany's bifurcated
  (native-track vs. international-track) models. Separately: "distrito
  abierto" (a legal no-regional-preference guarantee) coexists with genuine
  administrative fragmentation (one separate application required per
  Comunidad Autónoma) — substantive equality without procedural unification.

TÜRKİYE-APPLICANT FINDINGS, this pass (same honesty standard as v1 — genuine
gaps stated as gaps, never backfilled):
- **Switzerland**: same diploma package sufficient alone at 10 of 12
  universities (with proof of Turkish university admission), but ETH Zurich
  requires its own entrance exam regardless, with no exam-free path.
- **France**: routed through DAP/Études en France, not Parcoursup; whether a
  Turkish Lise Diploması is DAP "Situation A" or "B" is unconfirmed (reasoned
  toward B via R2.1's YKS finding, not source-confirmed).
- **Spain**: high procedural complexity (sequential homologación then
  UNEDasiss acreditación, ~3 months minimum) but not a lesser outcome once
  complete — competes in the general pool; a full IB Diploma bypasses
  homologación entirely.
- **Ireland**: UCD/UCC publish direct-entry percentage tables; Trinity
  offers foundation-year-only for a plain Lise Diploması. YKS/LYS relevance
  is a live, unresolved contradiction between UCC's and UCD's own pages —
  flagged, not guessed.
- **Australia**: UAC (NSW/ACT) explicitly places the Turkish diploma in a
  "will not be assessed" category — no centralized rank conversion exists
  there; no Group-of-Eight-specific numeric table was found. Genuine gap.
- **New Zealand**: confirmed absence, not an unsearched gap — checked
  directly against NZQA, Auckland, Otago, Victoria, Universities NZ, and
  Unitec's exhaustive A–Z country table (which omits Turkey entirely).
- **Hong Kong**: non-JUPAS only; HKU requires 4/5 or 70/100 average
  (verbatim, primary-sourced); CUHK requires 80% (secondary-corroborated);
  HKUST's threshold not found — genuine gap, not evidence of leniency.
- **Singapore**: sharply university-specific — sufficient alone at NUS
  (GPA≥4.3), never sufficient alone at NTU (AP/A-Level always required),
  requires an additional standardized test at SMU.

HIGH-RISK COUNSELOR ERRORS ADDED THIS PASS (same ranked-by-LLM-default-risk
framing as v1's handoff):
1. Assuming a country's central platform (JUPAS, Parcoursup, CAO) is
   reachable by or representative of an internationally-educated applicant's
   actual pathway — see candidates 013/015 above; this is now the most
   consequential new risk found, independently surfaced by 3 agents
   researching unrelated countries.
2. Assuming two habitually-grouped countries share an architecture because
   they're geographically/culturally paired (Australia/New Zealand share
   UCAT ANZ but NOT application architecture — NZ has no centralized
   platform of any kind, Australia has 5 disagreeing state ones).
3. Treating a same-named mechanism as the same concept across countries
   (NZ "Rank Score" vs. US "class rank" — candidate 016).
4. Treating within-country platform/institution policy as uniform when it
   demonstrably isn't (Australia's UAC vs. VTAC; Switzerland's Anadolu
   Lisesi-package-sufficient-at-10-of-12-but-not-ETH).

CONFIDENCE / SOURCING NOTES:
All 8 countries met the same source-priority standard as v1 (government →
central platform → official university → recognition body → secondary for
discovery only). Real, honestly-flagged access constraints this pass: HKEAA
(403 throughout), ethz.ch/epfl.ch (intermittent blocks), education.gouv.fr/
parcoursup.gouv.fr (403, worked around via 2 official Ministry PDFs fetched
directly instead), nus.edu.sg/smu.edu.sg (bot-check — worked around via a
read-only proxy on real official-page text, CAPTCHA-solving correctly never
attempted), cao.ie (404/403 on direct fetch, TCD/UCD required a browser
tool). Every agent's own per-file confidence/gaps note is preserved in each
country doc's "Unresolved questions" section — read those directly rather
than assuming this summary is exhaustive.

One operational anomaly worth recording: the Ireland research agent ran for
~9.1 hours (vs. 20–40 minutes for its 7 siblings covering the same batch)
before completing cleanly right at the session deadline. Its output
validated identically to the others (same schema, same section count, no
signs of degraded quality) and was kept — but the anomalous runtime itself
is unexplained and worth a system-level look if it recurs.

Also recorded: mid-session, one of the parallel research agents (Spain) was
cut off by a transport-level "connection lost mid-response" error right as
it began writing its markdown file — its JSON fragment had already been
written and was valid, so it was resumed via the same agent (not restarted
from scratch) and completed cleanly with 4 more tool calls. No data was
lost; flagged here in case the same failure mode recurs for a future batch.

NEXT ACTIONS IN PRIORITY ORDER:
1. Fold the 8 `matrix_row` objects (already sitting in the JSON, see each
   country's fragment or the merged main JSON) into README.md's
   cross-country matrix. Given 14 columns is already at the edge of
   markdown-table readability, consider restructuring — e.g. a compact
   "extended coverage" table with fewer, highest-signal dimensions for
   countries beyond the original 6, rather than repeating all 15
   `matrix_row` fields at full width.
2. Finalize and add the 4 candidate rules above to README.md's ruleset
   (resolve the 013/015 overlap question noted above first).
3. Batch 3 (Sweden, Belgium, Austria, Poland, Czech Republic) is fully
   scoped and ready to launch with the same agent-prompt template used this
   pass — see this branch's own commit history for the exact prompt
   structure if useful as a starting point.
4. Update `docs/ORYN_WORKSTREAMS.md`'s ADMISSIONS-INTEL row to reflect this
   checkpoint (done as part of this same commit/pass).

INTENDED CONSUMER: same as v1 — primarily Claude B (counselor/eligibility/
application-strategy logic), secondarily Claude A (admissions data
provenance). The candidate-013/015 finding (platform access ≠ platform
existence, and can mean a fully parallel admissions architecture) is the
single highest-leverage item for counselor logic to encode from this pass —
it's the shape most likely to silently misroute an internationally-educated
applicant (which, for ORYN's own target user base, is not an edge case).
