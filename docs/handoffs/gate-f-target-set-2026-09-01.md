# Gate F target set — the ~40 institutions the pilot cohort actually looks at

**2026-09-01. Status: scoping document, no DB writes.** Written to replace ad-hoc scoping for
the three active US/UK/Turkey depth lanes with a single empirically-derived list, per oryn-a7's
exit criterion: *"the schools the pilot cohort actually looks at (Turkey + the main UK/US/NL
destinations for Turkish students), each complete with programme + requirement + date +
statistic + source and date."*

**The result is 47, not 40.** I did not force it to round down. Every entry below either has
confirmed demand from a real pilot-cohort student, or clears a disclosed, disclosed-as-such
secondary bar. Cutting real, justified entries to hit a rounder number would be the same
dishonesty as padding a list — see §0 for exactly what "confirmed" and "well-covered" mean here
so the number can be checked, not just trusted.

## 0. Method — three signals, ranked, not blended into one score

**Signal A (unconditional include): real demand.** Every institution with at least one row in
`target_universities` — an actual pilot-cohort student's actual choice — is in, regardless of
programme count, prestige, or anything else. 8 students, 18 rows, 11 distinct institutions:

| University | Country | Students | Status |
|---|---|---|---|
| Massachusetts Institute of Technology | US | 5 | exploring |
| Bocconi University | Italy | 2 | target |
| Erasmus University Rotterdam | Netherlands | 2 | exploring |
| London School of Economics | UK | 2 | target |
| Boğaziçi University | Turkey | 1 | accepted |
| California Institute of Technology (Caltech) | US | 1 | target |
| Carnegie Mellon University | US | 1 | exploring |
| Stanford University | US | 1 | target |
| University of Amsterdam | Netherlands | 1 | exploring |
| University of Warwick | UK | 1 | exploring |
| Yale University | US | 1 | exploring |

**Signal B (broader context, not a membership test by itself): onboarding `target_geographies`.**
6/8 students have USA as a target geography, 4/8 UK, 2/8 "Europe," 2/8 Turkey (this is a Turkish
pilot cohort — "Turkey" here means staying domestic, not the base population). This is real and
matters for *how many* institutions per geography deserve inclusion beyond the named-demand set,
but a region isn't an institution — it doesn't decide which specific schools clear the bar.

**Signal C (disclosed, secondary, geography-by-geography): existing research investment.**
Where the catalogue already carries substantial `university_programs`/`requirements`/`deadlines`
depth for a globally-recognized institution in a signal-B-supported geography, I'm treating that
as evidence a prior research pass already made — and largely defended — the same call I'd
otherwise be making fresh from personal reputation judgment tonight. This is explicitly weaker
evidence than Signal A and I've labeled every institution it produces as such below — it is not
"I think this school is famous," it is "this product already spent real research effort here."
Turkey's own additions use a different, stronger version of this same idea: YÖK Atlas's live
national placement data (oryn-60's work, §1 below), not existing-catalogue depth, since Turkey has
an actual national ranking signal the other three geographies don't.

**What did NOT make the cut, named explicitly rather than silently dropped:** Turkey's regional
devlet flagships (Gazi, Ege, Dokuz Eylül, Akdeniz, Anadolu) and a second Turkish judgment-tier
(Medipol, İbn Haldun, İstanbul Bilgi) — real, well-known institutions, zero demand signal from
this cohort and no Signal-C equivalent (they're not already in the catalogue). Left out on the
same principle applied everywhere else in this document, not a special exception.

**Staged-corpus check, per instruction, before treating anything as "needs research":** checked
`requirement_research_queue`/`deadline_research_queue` outcomes for every candidate before
writing its status below, rather than inferring "thin count = never researched." This is what
caught MIT (§2) and clarified Bocconi (§4) — two institutions that look identically thin in a raw
row count but have opposite actual problems.

---

## 1. Turkey — 17 (12 existing + 4 confirmed adds + 1 my own call)

Turkey section is oryn-60's work (`docs/handoffs/tr-university-candidate-list-2026-09-01.md` and
`docs/handoffs/tr-university-depth-gate-f-2026-09-01.md`), both branched off local `main` today,
live YÖK Atlas data (21,493 records, 224 universities), two independent selectivity signals
(breadth: programmes under national rank 50,000; peak: best rank among programmes with ≥10
seats, floored specifically to exclude a 3-seat scholarship-seat outlier that would otherwise have
put a different university at #1 nationally on a technicality). Credited directly rather than
re-derived — this is stronger evidence than anything I could produce fresh tonight.

**The existing 12** — 10 of 12 land in the top ~26 nationally on at least one signal; the 6/6
devlet/vakıf split looks deliberate. Two exceptions, both real findings:

| University | Programs / Requirements / Deadlines / Placement cycles | Note |
|---|---|---|
| Ankara Üniversitesi | 153/7/2/153 | requirements+deadlines thin, see below — this is uniform across all 12, not this school's problem specifically |
| Orta Doğu Teknik (METU/ODTÜ) | 136/11/2/79 | — |
| İstanbul Üniversitesi | 124/2/1/120 | — |
| Hacettepe Üniversitesi | 101/9/1/51 | — |
| İstanbul Teknik Üniversitesi | 69/6/1/44 | — |
| Yıldız Teknik Üniversitesi | 43/1/1/**0** | 34 placement rows staged, ready |
| Bilkent Üniversitesi | 33/4/1/**0** | 72 placement rows staged, ready |
| **Boğaziçi Üniversitesi** | 30/5/1/**0** | one of the two hardest to enter (peak rank #6), **zero** placement-cycle rows despite 1 real confirmed-accepted student targeting it; 27 rows staged and ready |
| Özyeğin Üniversitesi | 24/2/1/**0** | 59 placement rows staged, ready |
| **Gebze Teknik Üniversitesi** | 23/1/2/**0** | ranks **#106–148 nationally on both selectivity signals** — the data doesn't back its top-12 membership the way it backs the other 11; 20 placement rows staged |
| **Koç Üniversitesi** | 22/17/4/**0** | the other hardest-to-enter school (peak rank #1 nationally), **zero** placement-cycle rows; 53 rows staged and ready |
| Sabancı Üniversitesi | 21/9/1/9 | small/elite by design (peak rank #2, only 9 total programmes) — thin breadth is correct, not a gap |

**Why requirements/deadlines read thin across all 12 and why that's lower-priority than it
looks:** Turkey's domestic pathway is `academic_rank_competitive` in `lib/admissions/
system-shape.ts` — no application file, no essay, no interview at any point. The number that
actually decides YKS admission is the placement-cycle cutoff, not a requirements row. **The real
gap is the zero-placement-cycle rows on Boğaziçi and Koç specifically** — the two most selective,
most-real-demand schools in the set — not the uniformly-thin requirements table.

**265 new placement-cycle rows are staged and verified ready today** (re-fetched live, re-matched
against the same bilingual-name research from 2026-08-22, unchanged and still resolving
correctly). Applying them would take Boğaziçi to ~27/30 and Koç to full 53/22 coverage. **Not
applied** — founder-gated, per standing instruction. One caveat from oryn-60's own audit worth
carrying forward: `university_program_placement_cycles` currently has **no read side anywhere in
the product** — the university detail page never queries it. Applying the 265 rows would not
change what a student sees today; that's a separate, real UI gap, not assumed already closed.

**Confirmed adds (4) — Tier 1, clear on both signals:**

| University | Type | Breadth rank / 202 | Peak rank / 202 | Why |
|---|---|---|---|---|
| Galatasaray Üniversitesi | DEVLET | 9 | 4 | All 13 programmes under the top-50k bar — the most concentrated selectivity profile outside Koç/Sabancı. The single sharpest gap in the whole exercise: nationally famous, top-10 on both signals, entirely absent from the catalogue. |
| Marmara Üniversitesi | DEVLET | 3 | 19 | 126 programmes, 50 under 50k — broader footprint than Ankara Üniversitesi's own. Major İstanbul devlet flagship, currently absent. |
| Yeditepe Üniversitesi | VAKIF | 5 | 8 | 142 programmes, 40 under 50k. Stronger on both axes than Bahçeşehir/Bilgi peers. |
| TOBB Ekonomi ve Teknoloji Üniversitesi | VAKIF | 17 | 5 | Small, elite technical/economics vakıf — same shape as Bilkent one tier down in scale. |

Devlet/vakıf split of the adds: 2/2, preserving the existing catalogue's own balance.

**My own call (1): İstanbul Üniversitesi-Cerrahpaşa — in.** Oryn-60 flagged this as a judgment
call (institutionally a 2019 split from İstanbul Üniversitesi, already in the catalogue) rather
than deciding it. It has its own YÖK Atlas listing, own admissions, own medical-sciences-specific
programmes — a genuine separate institution post-split, not a duplicate row the way MIT's
nameless stub was (§2). Peak rank 7/202 on its own. In.

**Named, not included, on the same evidence bar applied everywhere in this document:**
- Second Turkish tier (Medipol, İbn Haldun, İstanbul Bilgi) — real but narrower signal than Tier 1
  (concentrated-in-one-field selectivity, small/new, or "large and decent" without a standout),
  and zero demand from this cohort. Candidates for a future pass, not this one.
- Regional devlet flagships (Gazi, Ege, Dokuz Eylül, Akdeniz, Anadolu) — large, real, well-known,
  but a *different* question (geographic/comprehensive coverage vs. elite-name depth) than the
  gap this document is closing, and a product-strategy call neither oryn-60 nor I are positioned
  to make unilaterally. Flagged for the founder, not folded in as if equivalent to Galatasaray's
  absence.

---

## 2. United States — 13 (5 confirmed demand + 8 well-covered)

**Confirmed demand (5):**

| University | Students | Programs/Req/Deadlines | Status |
|---|---|---|---|
| MIT | 5 | 55/0→44 fixed/2 | **Fixed, pending promotion** — see below |
| Stanford | 1 | 71/32/11 | complete |
| Yale | 1 | 82/21/7 | complete |
| Carnegie Mellon | 1 | 158/52/17 | complete |
| Caltech | 1 | 26/0/0 | **needs research** — genuinely never attempted, not blocked |

**MIT is the load-bearing finding of this whole document.** It looked like the #1-demand school
needed the deepest fresh research of anything in this set. It doesn't: all 44 of its staged
requirement records were rejected only because `mitadmissions.org` — the domain every one of them
correctly cited — carries no `.edu` suffix, and the ingestion gate built its trusted-domain set
from `website_url` alone. Fixed today (`oryn/requirement-domain-authority-2026-09-01`, commit
`bb73450d`, merged), verified read-only against all 44 real rows: 44/44 now pass. **Not promoted
to the live table** — that's a founder-gated step, separate from the code fix. See
`docs/handoffs/requirement-domain-authority-2026-09-01.md` for the full trace, including why the
"obvious" fix (ROR-sourced domain data) would not have caught this on its own, and a bigger,
deliberately-not-built finding (each research record already carries its own
`university_official_domain` field the pipeline never reads).

**Caltech is genuinely different from MIT, not the same gap twice.** Checked directly:
`requirement_research_queue` has zero rows for Caltech at all — never attempted, not rejected.
Real demand (1 confirmed student), needs a fresh research pass, not a code fix. This is also this
document's answer to the specific test case oryn-a7 posed: **Caltech belongs in the 40**, on the
criterion (confirmed demand from a real student) doing the work, not on Caltech's name.

**Well-covered existing catalogue (8), Signal C — already real, already substantial research
investment, not a fresh reputation pick tonight:**

| University | Programs/Requirements/Deadlines |
|---|---|
| New York University | 230/33/6 |
| University of Michigan-Ann Arbor | 226/42/10 |
| UCLA | 181/35/11 |
| Columbia University | 177/28/8 |
| UC Berkeley | 117/23/8 |
| Harvard University | 79/20/5 |
| Princeton University | 42/15/7 |
| Georgia Institute of Technology | 42/16/8 |

All 8 already `complete` by depth (programmes, requirements, and deadlines all present and
proportionate). Nothing to close here beyond routine freshness upkeep.

**Not included**: the remaining ~30 US institutions with only trace/zero depth (Notre Dame,
UChicago, Duke, Brown, Cornell, Northwestern, Georgetown, Johns Hopkins, several state
flagships) — no confirmed demand, no substantial existing investment. Real, well-known schools;
not in this cohort's evidenced footprint tonight.

---

## 3. United Kingdom — 10 (2 confirmed demand + 8 well-covered)

**Confirmed demand (2):**

| University | Students | Programs/Req/Deadlines | Status |
|---|---|---|---|
| London School of Economics | 2 | 43/17/1 | needs-deadlines (1 only) |
| University of Warwick | 1 | 190/5/2 | needs-requirements (thin vs. 190 programmes) |

**Well-covered existing catalogue (8), Signal C:**

| University | Programs/Requirements/Deadlines | Status |
|---|---|---|
| University College London | 429/16/2 | needs-deadlines |
| The University of Manchester | 294/15/4 | needs-requirements, needs-deadlines |
| University of Glasgow | 101/13/1 | needs-deadlines |
| The University of Edinburgh | 98/12/5 | reasonable, could still deepen |
| Imperial College London | 73/12/4 | reasonable |
| University of Cambridge | 33/7/8 | reasonable — best deadline coverage in the UK set relative to scale |
| University of Oxford | 52/6/3 | needs-requirements |
| King's College London | 152/5/3 | needs-requirements (thin vs. 152 programmes) |

**Pattern worth naming**: every UK institution here — confirmed-demand or well-covered — has a
large programme catalogue and a comparatively thin requirements/deadlines table. Unlike Turkey,
UK admissions genuinely is holistic/file-based (personal statement, references, sometimes
interview), so this thinness is a real informational gap for a student, not a lower-priority one
the way Turkey's is. Flagging this as the UK lane's actual next problem, not a list of individual
schools to research one at a time.

**Not included**: Durham, Bath, Southampton, Nottingham, Exeter, Bristol, St Andrews, York,
Liverpool, Loughborough, Sheffield, Leicester and others — real depth exists for several of these
too (Southampton 248 programmes, Nottingham 215) but requirements/deadlines are near-zero and
there's no demand signal from this cohort. Candidates for a future pass if UK demand broadens.

---

## 4. Netherlands (+ Italy) — 7, my own assigned territory, verified directly

**Confirmed demand (3):**

| University | Country | Students | Programs/Req/Deadlines | Status |
|---|---|---|---|---|
| Erasmus University Rotterdam | NL | 2 | 151/61/22 | **complete, confirmed healthy** |
| University of Amsterdam | NL | 1 | 330/34/13 | **complete, confirmed healthy** |
| Bocconi University | Italy | 2 | 13/4/4 | **needs research — see below, not blocked** |

**Rotterdam and Amsterdam, verified directly, not assumed from an older report.** Both figures
above are fresh queries against live data tonight, matching prior figures exactly — no drift.
Both have real, proportionate depth across all three tables. Nothing to fix here.

**Bocconi specifically investigated per assignment ("why is Bocconi thin despite 2 students
targeting it") — checked the staged corpus before concluding anything, same discipline as MIT.**
Result is the opposite of MIT's: `requirement_research_queue` and `deadline_research_queue` show
**zero rejected/malformed rows for Bocconi** — everything ever submitted was `accepted`. The low
count is not a blocked gate; it's that only 4 requirement facts and 4 deadline facts were ever
actually researched, and all of them are correctly live. One minor, non-blocking oddity found
along the way: each of the 4 accepted requirement rows appears twice in the queue (same
`research_requirement_id`, submitted twice), with only the first of each pair actually holding a
`promoted_requirement_id` — a duplicate-processing artifact, not a data-loss one, same shape as
[[project_oryn_requirement_queue_triage]]'s earlier finding that queue outcome labels lag live
state. Not fixed — cosmetic queue bookkeeping, not a student-facing gap. **Bocconi's real status
is "needs a proper research pass," same as Caltech, not "blocked," same distinction that mattered
for MIT.**

**Well-covered existing catalogue (4), Signal C:**

| University | Programs/Requirements/Deadlines |
|---|---|
| University of Groningen | 190/41/12 |
| Vrije Universiteit Amsterdam | 163/53/27 |
| Tilburg University | 127/46/15 |
| Delft University of Technology | 53/30/11 |

All 4 `complete`. **Not included**: Leiden (70 programmes but only 2/2 requirements/deadlines —
thin, prestigious, no demand signal from this cohort; a reasonable next candidate if NL demand
broadens) and the remaining 7 smaller Dutch institutions (Radboud, Maastricht, Wageningen, Twente,
Eindhoven, Utrecht — all real, all currently near-zero requirements/deadlines, none with demand
signal here).

---

## 5. Summary

| Geography | Confirmed demand | Well-covered / Tier-1-national-signal | Total |
|---|---|---|---|
| Turkey | 1 (Boğaziçi, already counted in the 12) | 12 existing + 4 new + 1 (Cerrahpaşa) | 17 |
| United States | 5 | 8 | 13 |
| United Kingdom | 2 | 8 | 10 |
| Netherlands + Italy | 3 | 4 | 7 |
| **Total** | | | **47** |

**Status legend used throughout**: *complete* (proportionate programmes/requirements/deadlines
present) · *needs-requirements* / *needs-deadlines* (programmes exist, that specific table is
thin) · *needs research* (real demand, effectively zero rows, never attempted) · *fixed, pending
promotion* (MIT only — researched, correctly sourced, blocked by a now-fixed code gate, awaiting
a founder-approved live promotion) · *confirmed healthy* (independently re-verified this session,
not assumed from an older report).

## 6. What this does NOT do

- No universities added to the live catalogue, no new `university_programs`/`university_requirements` rows for any institution named as an add in §1–§4.
- No promotion of MIT's 44 now-passing records to the live `university_requirements` table.
- No resolution of the regional-flagship or second-Turkish-tier strategic questions (§1) — named for the founder, not decided here.
- No UI work on the Turkish placement-cycle read-side gap (§1) — real, named, not this document's scope.
- No re-classification of Gebze Teknik — the data's honest read is given; keep/deprioritize/research-further is oryn-a7's or the founder's call.

## 7. How to apply

The three active US/UK/Turkey depth lanes should scope against this list instead of independent
reads of "what looks thin." Priority order within it, by what's both high-demand and cheaply
closeable: **MIT's promotion decision** (founder) → **Boğaziçi/Koç placement-cycle staging**
(already built, staged, founder-gated) → **Caltech and Bocconi fresh research passes** (real
demand, zero rows, no blocker) → **UK requirements/deadlines depth** (structural gap across the
whole geography, not a per-school problem) → the remaining `needs-requirements`/`needs-deadlines`
cells above.
