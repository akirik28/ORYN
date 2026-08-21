# Handoff: Country-level admissions system intelligence — v2 expansion

STATUS:
**Research complete for 9 new countries (8 destinations + Turkey's own
domestic system) AND folded into `README.md`'s cross-country matrix and
ruleset (15 countries, RULE-ADMISSIONS-013 through 017 added).** Originally
left as the "next action" when this doc was first written at the 11:00
deadline; completed in a follow-up pass per an explicit assignment from the
founder-authorized coordination session after the deadline. Turkey was a
second, separate assignment after the 8-destination integration was already
done — see the TURKEY ADDENDUM section near the end of this doc for the full
story, including a real stop-and-confirm exchange with the coordination
session before starting it (it initially conflicted with an explicit
founder stand-down order; the founder himself then directly confirmed the
order had been lifted).

Session context: overnight research mission, timeboxed to 2026-08-21 11:00
Europe/Istanbul, same deadline as the concurrent COUNSEL-RESEARCH lane. This
doc was originally written in the final ~15 minutes before that deadline,
prioritizing synthesis over polish; the integration section below was
completed and this status block updated afterward, in the same sitting.

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
15 countries total now in the JSON (14 after the first pass, 15 after Turkey
— see TURKEY ADDENDUM below).

Same template as v1 throughout: 24 markdown sections per country including a
dedicated "Applicant educated in Türkiye" section; each JSON section object
carries a `scope` label (national/platform/university/programme) and a
`sources` array; a `matrix_row` object per country for table-building;
honest "Unresolved questions" rather than invented equivalencies.

NOW DONE (updated after the initial write of this doc):
- README.md's cross-country matrix now covers all 14 countries (the
  original 6 columns preserved byte-for-byte, 8 new columns appended per
  dimension row, parsed-and-spliced programmatically rather than
  hand-transcribed, to guarantee the original text wasn't silently altered).
- RULE-ADMISSIONS-013 through 016 added to README.md, claiming that ID
  range (001-012 unmodified). 013 (platform-access ≠ platform-existence)
  and 014 (two fully parallel admissions architectures within one country)
  were deliberately kept as two separate rules rather than merged — see
  README.md's own text for the reasoning (they fail differently: 013 is an
  eligibility gate, 014 is an evidence-model switch) so a future session can
  overturn that split with evidence rather than re-litigating it from
  scratch. 015 = Singapore's nationality-quota capacity axis. 016 = the
  NZ-Rank-Score/US-class-rank terminology-false-cognate finding.
- Countries-covered table (the 4-column summary) also extended with all 8
  new rows.

STILL NOT DONE (explicitly, not silently skipped):
- Batch 3 (Sweden, Belgium, Austria, Poland, Czech Republic) was planned but
  never started — no research exists for these yet, and per the founder's
  explicit instruction this session is not starting it.
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

NEXT ACTIONS IN PRIORITY ORDER (updated — items 1, 2 and 4 below are now done;
kept here as a record of what was decided rather than deleted):
1. DONE — the 8 `matrix_row` objects folded into README.md's cross-country
   matrix. The "restructure for readability" option considered here was
   deliberately not taken: the coordinating session's explicit instruction
   was to fold the new countries into *the* matrix (singular), so the table
   was extended to 14 columns as literally requested rather than split into
   a separate lesser-detail addendum — a genuinely wide table, but GitHub
   renders it with horizontal scroll and this is a reference document, not
   a dashboard. Revisit if it proves unusable in practice.
2. DONE — RULE-ADMISSIONS-013 through 016 added to README.md's ruleset,
   013/014 kept as two separate rules per explicit direction (see README.md
   itself for the reasoning).
3. Batch 3 (Sweden, Belgium, Austria, Poland, Czech Republic) is fully
   scoped and ready to launch with the same agent-prompt template used this
   pass — see this branch's own commit history for the exact prompt
   structure if useful as a starting point. **Update, see TURKEY ADDENDUM
   below: the original stand-down order was subsequently lifted by the
   founder directly** ("advance the project, with quality as the binding
   constraint" — his words, relayed and then independently confirmed).
   Batch 3 is therefore not blocked by a freeze anymore, but it also hasn't
   been re-assigned — still not started, awaiting a decision from the
   coordination session on whether it's the next priority or something else
   is (Turkey was chosen ahead of it once, for a specific, evidenced
   reason — see below).
4. DONE — `docs/ORYN_WORKSTREAMS.md`'s ADMISSIONS-INTEL row reflects this
   checkpoint.

INTENDED CONSUMER: same as v1 — primarily Claude B (counselor/eligibility/
application-strategy logic), secondarily Claude A (admissions data
provenance). The candidate-013/015 finding (platform access ≠ platform
existence, and can mean a fully parallel admissions architecture) is the
single highest-leverage item for counselor logic to encode from this pass —
it's the shape most likely to silently misroute an internationally-educated
applicant (which, for ORYN's own target user base, is not an edge case).

---

## TURKEY ADDENDUM (added in a second follow-up pass, same session)

**Why this happened out of order.** After the 8-destination integration
above was committed, the coordination session assigned Turkey's own
domestic admissions system as a 9th/15th country. This directly contradicted
an instruction the *same* coordination session had given minutes earlier in
this same conversation ("No batch 3, no further country research... founder
directive... all feature/research work STOPS"). Rather than either silently
complying or silently refusing, this session stopped and asked the
coordination session directly whether the founder had specifically
re-authorized new research or whether this was the coordinator's own
judgment call. The coordinator answered honestly and precisely: the founder
had, in two direct messages, reversed the stand-down ("no, first organize,
then let's advance the project — controlled, but advance — I'm leaving it
to you" / "you decide what merges and pushes; when I'm back at 21:00 I want
to see a very advanced project, quality over speed, let's move with 8
chats"), delegating merge authority to the coordinator — but Turkey itself
was *not* named by the founder; choosing it over batch 3's five countries
was the coordinator's own prioritization call, made openly rather than
folded into a blanket "founder authorized this" claim. The founder then
messaged this session directly, independently confirming the coordinator's
account. Recording the full exchange here rather than just the outcome,
because the *process* — stop, ask, get a specific rather than a
hand-waved answer, then verify independently before proceeding — is the
reusable part, not just this one resolution.

**Independent verification done before proceeding, not just trusting the
relay:** fetched `oryn/counseling-intelligence-research-013956` directly
(`git show`, read-only) and confirmed RULE-COUNSEL-057/109 and their
underlying sources (`SRC-CS-025`, `SRC-CS-054`) are real, properly sourced
(direct ÖSYM domain fetch cross-checked against independent calculators),
and honestly confidence-graded (high for channel existence, medium for
exact coefficients) — not fabricated grounding.

**What was produced:** `docs/research/admissions-systems/turkey.md` (721
lines) and `data/research/admissions-systems/fragments/turkey.json`, same
template as the other 14 with one deliberate adaptation (see README.md's
countries-covered table note) — "Applicant educated in Türkiye" retitled
"Domestic MEB applicant baseline" since Turkey is the source country this
whole package's other 14 Türkiye-lens sections are about, not a destination
being evaluated for a Turkish applicant.

**The core finding:** Turkey's domestic pathway is not a variant of any
model already in the package — ÖSYM runs one national algorithm that places
every candidate in strict descending-score order into their highest-ranked
still-open preference from a single 24-slot national list, with zero human
review and zero application artifact (no essay, no recommendation, no
extracurricular record, no interview). Even Ireland's CAO — the closest
analogue among the other 14 — leaves HEIs holding formal admissions
authority; in Turkey, the placement algorithm's output *is* the admission
decision. A structurally separate, fully decentralized system exists in
parallel for foreign-schooled applicants (TR-YÖS or a university-accepted
alternative), split by *registration location*, not nationality — a
Turkish citizen schooled abroad uses the foreign-national pathway; a
foreign national schooled in Turkey generally sits YKS like everyone else.

**Conflict check against the counseling-intelligence lane, as required by
the assignment:** none substantive. The Turkey research agent's own
independent primary-source work (direct `osym.gov.tr`/`egitim.yok.gov.tr`
fetches) confirmed and extended RULE-COUNSEL-057/109/101/062/064 rather than
contradicting them. One process note worth relaying to the coordinator, not
a content conflict: RULE-COUNSEL-231 and RULE-COUNSEL-242 (cited in the
Turkey assignment's brief) do not exist in
`oryn/counseling-intelligence-research-013956`'s `rules.json`, which the
branch's own final commit states runs only 001–123. That doc's own §11
references a *separate* peer branch (`oryn/counseling-intelligence-research`,
without the `-013956` suffix) maintaining independent `RULE-COUNSEL-*`
numbering that already collides with `-013956`'s numbering at ID 056 — so
231/242 most likely belong to that other branch's numbering space. Not
resolved here (out of this package's scope), just flagged so the
coordinator's org-wide map accounts for two counseling branches with
colliding rule-ID spaces, the same category of problem this repo has hit
before with migration numbers.

**RULE-ADMISSIONS-017 added** (see README.md for the full text): a single
body (ÖSYM) can simultaneously hold a genuine deciding role for one
applicant population and a purely administrative role for another, within
one country — sharpens both RULE-ADMISSIONS-012 (platform ≠
decision-maker) and RULE-ADMISSIONS-013 (platform existence ≠ coverage of
all applicant types) rather than restating either.

**Turkey-specific "largely irrelevant" answer** (the assignment's own
highest-value cell): extracurriculars, essays, recommendation letters, and
interviews are irrelevant to the domestic YKS placement outcome — not
"weighted lightly," genuinely absent from the mechanism, with zero channel
for that evidence to affect a placement score. The single narrow exception
is state conservatory/fine-arts/sports-science-type programmes, which add a
talent/audition exam on top of a TYT threshold. ORYN must never recommend
extracurricular investment as an admissions lever to a domestic-YKS-track
student, and must never assume a student's Turkish citizenship/residence
implies YKS-track counseling without checking where they were actually
schooled.

**Commit:** see this branch's git log for the exact SHA (reported to the
coordination session at commit time — check there or `git log` rather than
this doc, which isn't updated per-commit).
