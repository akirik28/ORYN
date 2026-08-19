> **RESOLVED — 2026-08-17, later same day.** All 10 institutions below (9 missing + the École
> Polytechnique ambiguity) now exist in `universities` with matching ROR ids — thank you.
> Verified live and re-ran `data/research/university-programs/drive_batch1_2026-08-17.jsonl`'s
> 32 previously-`unresolved_university` candidates against them (`universities` 1010 → 1019 is
> exactly the 9 new rows; École Polytechnique confirmed as its own row, distinct from Institut
> Polytechnique de Paris, matching the recommendation below). Result: 30 accepted, 2 still
> `insufficient_evidence` (Frankfurt School Business Administration + Management Philosophy and
> Economics — genuinely blocked pages, a Claude B follow-up, not a registry issue). No
> `SUPABASE_SECRET_KEY` in this session either, so applied the same way as `reverify_batch2`:
> `decideIngestion()` run locally against a small hardcoded candidate set (read via the
> Supabase MCP, since RLS blocks anonymous PostgREST reads on `universities` — worth knowing
> for any future session hitting the same wall), writes applied via `execute_sql`.
> `university_programs` 152 → 182, universities represented 39 → 49. Batch recorded at
> `data/research/university-programs/reverify_batch3_2026-08-17.jsonl`. Nothing below needs
> further action from you — left as-is for the historical record.

# Handoff: Claude B (programs/opportunities) → Claude A (university intelligence spine)

Claude B owns `university_programs`, `program_research_queue`, `opportunities`, and related
product surfaces — not `universities`/`canonical_entities`/`entity_aliases`/
`entity_external_ids`/dedup/rankings/metrics. Everything below was found while resolving the
`program_research_queue`'s `unresolved_university` backlog and needs action in the university
registry, which is your side. Claude B has **not** created, merged, or aliased anything in
`universities` — every item is left queued (`outcome = 'unresolved_university'`,
`university_id = NULL`) pending your decision.

Read `docs/research-handoff-university-programs.md` for the identity-resolution contract these
records were run through (`lib/acquisition/identity.ts`'s `resolveIdentity()` — exact
name+country, then name variants, then registered aliases; country-scoped throughout; no
fuzzy matching).

## Status as of 2026-08-17

Verified against the live `oryn-qa-scratch` project (not from memory or an old report):
`universities` = 1010, `program_research_queue` = 211 (152 accepted / 32 unresolved_university
/ 27 insufficient_evidence — the insufficient_evidence rows are now historical; Claude B
re-verified and separately re-submitted 22 of the original 27 this pass, so the still-live
insufficient_evidence backlog is really the 5 uchicago.edu rows below, plus one NYU row that
needs a narrower program identity, not a blocked page). None of the 32 `unresolved_university`
rows have moved — all 32 are below, grouped into 9 missing-institution requests + 1 identity
ambiguity, matching what a prior pass already flagged this file would need.

---

## AMBIGUITY

**Description:** École Polytechnique (Palaiseau, France — "l'X") vs. Institut Polytechnique de
Paris, which already has a `universities` row (`id b4d06de5-204b-47bb-8803-75593291b316`,
`canonical_entity_id b4d8af04-ade6-4559-b077-c5aaae68a625`, `entity_external_ids.ROR =
042tfbd02`). 3 queued program candidates (`ORYN-PRG-0121/0122/0123`, all citing
`programmes.polytechnique.edu`) name "École Polytechnique," which does **not** currently
resolve to that row (different name, different country-scoped exact/variant/alias match — the
resolver correctly reported `unresolved` rather than guessing).

**Why unsafe to resolve on Claude B's side:** this is exactly the university-identity-registry
judgment call this handoff protocol exists for, not a program-pipeline decision.

**Evidence (ROR, an accepted open registry for identity per `lib/acquisition/source-authority.ts`):**
École Polytechnique has its **own** ROR id, `https://ror.org/05hy3tk52`, distinct from Institut
Polytechnique de Paris's `042tfbd02` — ROR's `relationships` field marks Institut Polytechnique
de Paris as École Polytechnique's *parent* (the 2019 consortium structure: IP Paris federates
École Polytechnique, ENSTA Paris, ENSAE Paris, Télécom Paris, and Télécom SudParis, each
retaining its own legal identity and, for École Polytechnique specifically, its own
220-year-older admissions/degree-granting history). Wikidata separately confirms both as
distinct entities.

**Recommendation (Claude B's read, not a decision — yours to make):** create École Polytechnique
as its own `universities` row (ROR `05hy3tk52`) related to, not merged into, Institut
Polytechnique de Paris — matching how the authoritative registries themselves model it. Once
created, re-run `data/research/university-programs/drive_batch1_2026-08-17.jsonl`'s three
`ORYN-PRG-0121/0122/0123` rows (already git-committed, no re-research needed) through
`npm run ingest:university-programs -- <path> --apply`.

---

## MISSING UNIVERSITY BACKBONE (9 institutions, 32 queued program candidates)

Every one below: zero name/alias match anywhere in the current 1010-row `universities` table
(checked by ILIKE search across name, and across the obvious German/French/Turkish spelling
variants — not just an exact-string miss). All are real, prominent institutions a
university-bound student in ORYN's stated markets (Europe, Turkey, international applicants)
would plausibly target — 5 of the 9 are specifically business/econ-focused schools in exactly
the disciplines AGENTS.md Phase 4 prioritizes.

### 1. Constructor University
- **Country:** Germany (Bremen)
- **Official URL:** https://constructor.university
- **ROR:** https://ror.org/02yrs2n53
- **Note:** formerly Jacobs University Bremen / International University Bremen — do **not**
  alias to the existing `Universität Bremen` row (a large, unrelated public university in the
  same city; confirmed distinct institutions).
- **Queued candidates:** `ORYN-PRG-0169/0171/0172` — Computer Science, Global Economics and
  Management, Industrial Engineering and Management (all Bachelor/first-cycle).

### 2. ESCP Business School
- **Country:** France (Paris, multi-campus)
- **Official URL:** https://escp.eu
- **ROR:** https://ror.org/040hhjv66
- **Queued candidates:** `ORYN-PRG-0133` — Bachelor in Management.

### 3. ESSEC Business School
- **Country:** France (Cergy)
- **Official URL:** https://www.essec.edu
- **ROR:** https://ror.org/02dga6j42 (registered legal name "École Supérieure des Sciences
  Économiques et Commerciales")
- **Queued candidates:** `ORYN-PRG-0129/0130` — Global BBA, AI Data and Management Sciences.

### 4. Frankfurt School of Finance and Management
- **Country:** Germany (Frankfurt am Main)
- **Official URL:** https://www.frankfurt-school.de
- **ROR:** https://ror.org/05gxyna29
- **Queued candidates:** `ORYN-PRG-0165/0166/0167` — Business Administration, Computational
  Business Analytics, Management Philosophy and Economics.

### 5. LMU Munich (Ludwig-Maximilians-Universität München)
- **Country:** Germany (Munich)
- **Official URL:** https://www.lmu.de
- **ROR:** https://ror.org/05591te55
- **Note:** genuinely distinct from the Technical University of Munich (TUM, ROR
  `02kkvpp62`), already in the registry — same city, both prestigious, not the same
  institution. Do not alias.
- **Queued candidates:** `ORYN-PRG-0157/0158/0159/0160` — Economics, Business Administration,
  Computer Science, Political Science.

### 6. LUISS Guido Carli
- **Country:** Italy (Rome)
- **Official URL:** https://www.luiss.edu
- **ROR:** https://ror.org/01q8b6q23 (legal name "Libera Università Internazionale degli Studi
  Sociali Guido Carli")
- **Queued candidates:** `ORYN-PRG-0113/0114/0115/0116` — Economics and Business, Management
  and Artificial Intelligence, Politics Philosophy and Economics, Global Law.

### 7. Özyeğin University
- **Country:** Türkiye (Istanbul)
- **Official URL:** https://www.ozyegin.edu.tr
- **ROR:** https://ror.org/01jjhfr75
- **Queued candidates:** `ORYN-PRG-0197/0198/0199/0200` — Economics, Business Administration,
  Computer Science, Entrepreneurship.

### 8. Université Paris Dauphine - PSL
- **Country:** France (Paris)
- **Official URL:** https://dauphine.psl.eu
- **ROR:** https://ror.org/052bz7812
- **Note:** part of the PSL (Paris Sciences & Lettres) grouping, same family of
  consortium-vs-member-institution question as École Polytechnique above, but Dauphine has no
  existing PSL row in the registry at all (checked — no "PSL" or "Paris Sciences" match), so
  this one is a clean missing-institution case, not an ambiguity.
- **Queued candidates:** `ORYN-PRG-0125/0126/0127/0128` — Organizational Sciences, Applied
  Economics, Mathematics and Computer Science of Organizations, Economics and Management.

### 9. University of St. Gallen (HSG)
- **Country:** Switzerland (St. Gallen)
- **Official URL:** https://www.unisg.ch
- **ROR:** https://ror.org/0561a3s31
- **Queued candidates:** `ORYN-PRG-0145/0146/0147/0148` — Business Administration, Economics,
  International Affairs, Law and Economics.

**Once any of these rows exist:** the corresponding `ORYN-PRG-*` records are already sitting in
`data/research/university-programs/drive_batch1_2026-08-17.jsonl`, git-committed — re-running
`npm run ingest:university-programs -- data/research/university-programs/drive_batch1_2026-08-17.jsonl --apply`
will pick them up automatically (idempotent — already-accepted rows elsewhere in that file
correctly no-op as duplicates). No re-research needed on Claude B's side.

---

## Remaining insufficient_evidence backlog (not a Claude A item — noted for continuity)

Left for Claude B's own next pass, not yours: 5 University of Chicago
`collegecatalog.uchicago.edu` URLs (`ORYN-PRG-0029/0030/0031/0032`... — Economics, Computer
Science, Data Science, Public Policy Studies) returned `ECONNRESET` on every fetch attempt this
session (both direct fetch and a real browser session) — genuinely still blocked from this
session's network, not evidence the pages don't exist. Retry in a future session. Separately,
NYU's `ORYN-PRG-0039` ("Business") turned out to point at a directory page listing ~15 distinct
Stern/Tandon/CAS/Gallatin majors and concentrations, not one program identity — needs a
researcher to pick a specific concentration's own URL before it can be resubmitted, not a
retry of the same URL.
