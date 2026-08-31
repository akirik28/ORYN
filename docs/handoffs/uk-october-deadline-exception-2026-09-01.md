# The UK October-deadline exception: 5 rows built, 3 confirmed genuinely absent, 3 left unconfirmed — plus the scope sweep and UCL's staleness

Branch `oryn/uk-october-deadlines-2026-09-01`. CEO's finding: eight UK universities stored
one blanket "13 January 2027" deadline whose own verbatim text names a "15 October"
exception for Medicine/Dentistry/Veterinary Science that was never captured as its own row.
`program_id` was null on all eight. Instruction: build the eight UK rows first (sourced,
not inferred — a university's silence is a null, not an assumption), then report (not act
on) how far the same pattern extends, and check whether UCL's existing row is current.

## 1. The eight UK universities — checked individually, not treated as one pattern

Structural signal first: `university_programs` already has real Medicine/Dentistry/Vet
Science rows for five of the eight (Bristol, KCL, Manchester, Queen Mary, St Andrews) and
none for the other three (Warwick, Durham, Loughborough). Checked each of the eight
live — own site first, UCAS second — before deciding what to write.

**Built (5 new, sourced, program-linked rows):**

- **Bristol** — own key-dates page (`bristol.ac.uk/study/undergraduate/apply/dates/`)
  states plainly: *"15 October 2026 — Deadline: applications for courses in medicine,
  dentistry and veterinary science."* One line covers all three; wrote one row per program
  (Medicine, Dentistry, Veterinary Science — all three already have real program rows),
  same date, same source. Note: the same page's general-deadline line reads "13 January
  2026" where every other UK source this pass says 2027 — reproduced verbatim, not
  corrected; it's Bristol's own page's inconsistency, not this pass's.
- **KCL** — own how-to-apply page states it even more plainly: *"The standard deadline...
  is 13 January 2027... but if you are applying for Medicine or Dentistry then the deadline
  is 15 October 2026."* Wrote one row per program (Medicine MBBS, Dentistry BDS). The
  cleanest, least ambiguous source of the eight.

**Confirmed genuinely absent — no row added, and none is missing:**

- **Warwick** — no Medicine/Dentistry/Vet Science program row exists, and Warwick's own
  key-dates page names its only interview-requiring courses (English, Theatre and
  Performance Studies) without mentioning Medicine at all. Warwick Medical School's MBChB
  is graduate-entry only, which runs on different rules outside the standard UCAS
  undergraduate cycle this page describes. The exception genuinely does not apply here.
- **Durham** — no Medicine/Dentistry/Vet Science program row exists (162 Durham programs
  checked by name; nothing closer than "Health and Human Sciences"). Durham's own
  "how to apply" page contains the same sentence CEO quoted, but it reads as generic
  UCAS-system explanation ("if you're applying for Oxford, Cambridge, or Medicine,
  Dentistry or Veterinary Science...") rather than a claim about Durham's own offerings —
  and Durham doesn't offer any of those. Nothing to add.
- **Loughborough** — no Medicine/Dentistry/Vet Science program row exists (only
  "Medicinal Chemistry" and "Biomedical Engineering/Materials", both non-clinical degrees).
  Zero mentions of Medicine, Dentistry, Veterinary, or "15 October" anywhere on
  Loughborough's own apply page. Nothing to add.

**Checked, not confirmed — left as null rather than guessed, per instruction:**

- **Manchester** — Medicine MBChB and Dentistry BDS both exist as real programs, but
  Manchester's own site gave two different, neither-usable answers. Its international-admissions
  page states "15 October 2026... for September 2024 entry" — internally
  contradictory (that entry year doesn't match, and the date sits chronologically after a
  "14 January 2026" deadline stated two sentences earlier on the same page). Its cleaner
  "applying" page is internally consistent but explicitly for **2026 entry**: "15 OCTOBER
  2025 — Medicine and Dentistry deadline for 2026 entry." Neither is a trustworthy, current,
  2027-entry-cycle date. Not built — writing 2026-10-15 from confused source text would be
  exactly the "assumption dressed up as sourced" this pass was told to avoid.
- **Queen Mary** — Medicine and Dentistry both exist as real programs. Own key-dates page
  is clean and internally consistent, but is **still describing the 2026-entry cycle**
  ("15 October 2025 — UCAS application deadline for medicine and dental courses"; general
  deadline "14 January 2026"). Not yet updated for 2027 entry. Not built.
- **St Andrews** — Medicine (two entry routes, A100/A990) exists as a real program. Checked
  three of St Andrews's own Medicine pages (subject overview, entry requirements, selection
  process) — none state an application deadline date at all; a full-text date-pattern scan
  of the entry-requirements page found zero day+month mentions anywhere. UCAS's own
  course-search is behind a CAPTCHA I did not attempt. The existing corpus record for this
  university already flagged its own October claim as "per WebSearch synthesis, not
  independently re-fetched" — that caveat is still unresolved after this pass, not upgraded
  to confirmed. Not built.

Net: 2 of 8 universities get real rows (5 total); 3 of 8 have a confirmed, sourced negative
(no exception applies — that's not a gap); 3 of 8 remain genuinely unconfirmed and are left
alone rather than filled in with an inferred date.

## 2. The real reason `program_id` was null on all 465 rows, not just these eight

Before writing anything, checked why `program_id` was null everywhere rather than assuming
it was a research gap. It isn't one, structurally: `lib/deadlines/ingest.ts`'s
`AcceptedDeadlineRow` types `program_id` as the literal `null` (`ingest.ts:35`) and the row
builder writes `program_id: null` unconditionally (`ingest.ts:279`) — `program_name` is
accepted into the JSONL contract and then silently dropped at write time, every time, for
every record ever ingested through that pipeline. `lib/requirements/ingest.ts` has the
identical pattern. This is a real, standing architectural gap in both shared pipelines, not
a per-record oversight — it explains why the count was exactly zero rather than mostly-zero.

Per instruction ("do not extend the schema"), didn't touch either pipeline — that's shared
infrastructure other lanes are actively ingesting through tonight, and fixing it properly
means safe program-name resolution logic, which is its own scoped piece of work with its
own judgment calls (how fuzzy a match is safe to accept). Instead, the five rows above were
written with a small, standalone script
(`scripts/insert-uk-october-deadlines.ts`, dry-run/`--apply`) that sets `program_id`
directly from a hand-verified mapping — five already-existing, already-confirmed program
rows, checked against `university_programs` by hand before the script existed, not fuzzy
matched at insert time. No new program rows created; no pipeline behavior changed.

**Flagging, not fixing:** if program-linking is wanted at scale beyond these five rows,
teaching `lib/deadlines/ingest.ts` (and its sibling in `lib/requirements/ingest.ts`) to
actually resolve `program_name` against an existing `university_programs` row is the real
fix — worth its own task, its own risk review, and ideally the founder's or CEO's call on
how fuzzy a name match is safe to auto-accept.

## 3. How far the same pattern goes — reported, not acted on

Swept all 465 `deadline_text_verbatim` values for exception-shaped language (`except`,
`deadline for`, `earlier deadline`, `unless`, `excluding`): **47 matches.** Read the ones
that looked like genuine candidates rather than trusting the regex count on its own —
several matches turned out to be a different shape entirely.

**Same shape as the UK-8 (a named program's own date is missing, not just unlinked):**

- **University College Cork (Ireland)** — *"31st May 2026 (except for Medicine and
  Dentistry, Applied Psychology and Pharmacy)."* Three programs named, none of their real
  deadlines captured. Direct match to the pattern, outside the UK.
- **University of Waterloo (Canada)** — Engineering's own deadline is captured as *"...
  (excluding Architecture)"* twice (application and documents deadlines); Architecture's
  own date is not recorded anywhere in the corpus. Same shape, one program.
- **Vrije Universiteit Amsterdam (Netherlands)** — this one is notable: the row's own
  stored `deadline_text_verbatim` contains a literal **"..."** — the original researcher
  themselves elided a longer list of master's programmes with individually extended
  deadlines, keeping only one example ("M Computer Science / 15 July 2026") in the text.
  This is the same shape as the UK-8, self-documented by the research that captured it.
- **McGill (Canada)** — names three programs (Music, Religious Studies, Social Work) with
  their own dates inline in the same sentence as the general deadline — lower severity than
  the others here, since the actual dates ARE present in the verbatim text (a reader could
  extract them), just not split into their own structured rows.

**A different shape, worth naming precisely rather than folding into the same bucket:**

- **Trinity College Dublin** — *"Application deadline for Music, Drama, Dental Science and
  Medicine is February 1st (hard deadline, not just priority, for those programmes)."* The
  date is NOT missing — it's the same February 1st as the general row. What's uncaptured is
  that for these four programmes the deadline is binding while for everyone else it's a
  soft "priority" cutoff with a later true deadline. The schema already has a column built
  for exactly this distinction (`binding_policy`, migration 0056) — this is a
  binding-policy gap, not a missing-date gap. Different fix, don't conflate the two.
- **Purdue, USC, and UCL's existing Medicine row** are the useful negative controls: Purdue
  restates the same date for multiple programs (nothing hidden); USC already has a
  dedicated separate row for its "except performing arts" case; UCL is the working example
  CEO named as proof the shape is representable. Not gaps — evidence the pattern isn't
  universal even among "except"-shaped text.

**The Dutch question specifically, since CEO asked given this lane just spent a pass
there:** the 8 rows re-researched in the previous branch (Delft, Erasmus, UvA x3,
Groningen x2) do **not** have this shape — each was already programme/track-specific by
construction (Delft's row is CSE-only, Erasmus's is IBEB-only, UvA's are Psychology-only,
Groningen's are Psychology- and IB-only respectively), so there was no blanket deadline to
hide an exception inside. The shape **does** recur in the Netherlands, just not in those
8 rows — it's the VU Amsterdam master's-programme list above, previously unexamined.

**Not re-litigated:** the other ~40 of the 47 regex matches were read closely enough to
sort (Canadian/German/US rows using "except"/"excluding" for non-program carve-outs —
audience, timing, or a restated same-date — not a hidden program-specific date). Full
category breakdown is in the commit; didn't write up all 47 individually to keep this
report proportionate to "tell me how deep this goes," not exhaustive to the row.

## 4. Is UCL's own row current? No.

UCL's existing row (`DL-2026-08-23-UCL0002`) is dated `2025-10-15`, labeled "Medicine A100,
2026 entry" — that's demonstrably a closed cycle relative to today regardless of live-page
access, since 2026 entry has already happened. UCL's site (`ucl.ac.uk`) is Cloudflare-gated
today — same interstitial as Tilburg during the Dutch pass and UCAS's own course-search
just now — so a live re-check wasn't possible without attempting to defeat a bot-check,
which wasn't attempted. That doesn't change the answer: the row's own stored metadata is
sufficient on its own to show it's stale, independent of whether the source page is
reachable. No independently-sourced 2026-10-15 (2027-entry) replacement was found — the
original record's own notes already say the "recurring pattern" reasoning was inferred, not
re-confirmed for the current cycle. Left as-is, not silently upgraded — same "null, not
assumption" rule applied to a stale existing row as to a missing one.

## Verification

- Dry run then `--apply` on `scripts/insert-uk-october-deadlines.ts`: validated all 5
  `program_id`s are real, belong to the named university, and no duplicate row already
  existed, before writing. 5/5 inserted, 0 failures.
- Live SQL: all 5 rows confirmed joined to their real `university_programs` row, correct
  date (2026-10-15), correct cycle_label ("2027 entry"), correct `verification_state`
  (`VERIFIED_CURRENT` — matching `university_deadlines`'s own uppercase convention, which
  is NOT the same casing `university_requirements` uses; checked this empirically rather
  than assuming the two tables share a convention).
- Live browser re-check on both Bristol and KCL's actual university pages (attached to
  another session's already-running dev server on this machine, read-only): Bristol shows
  three clearly distinguished rows — "Medicine · 44 days left · October 15, 2026",
  "Dentistry", "Veterinary Science" — each visually separated from the pre-existing general
  "134 days left · January 13, 2027" row by program name and by a materially different
  urgency count. KCL shows both new rows correctly too (took two navigation attempts —
  `document.body.innerText` under-read the page early in a heavier Suspense-streaming load
  on KCL's program-dense page; `find`/`read_page` against the same live page confirmed the
  content was there and correctly labeled once settled — a tool-timing artifact, not a
  render bug).
- `npm run lint` — clean. `npm run typecheck` — clean. `npm test` — 188 files / 2844 tests
  passed. `npm run build` — succeeded, all routes compiled.
- No `opportunities` table touched.

## Scope boundaries (for whoever picks this up next)

- Manchester, Queen Mary, and St Andrews's own 15-October dates are real candidates once
  each site republishes for 2027 entry (Manchester, Queen Mary) or once UCAS's course-search
  is reachable (St Andrews) — not done now, not urgent, just blocked on the source.
- UCC (Ireland) and Waterloo's Architecture deadline (Canada) are the two clearest
  same-shape matches outside the UK-8 — good next candidates if this becomes its own pass.
- TCD's Music/Drama/Dental Science/Medicine row needs `binding_policy` populated, not a new
  date — a different, smaller fix than the others in this report.
- The `program_id`-always-null pipeline gap (§2) is the highest-leverage single fix behind
  all of this, if program-linking at scale is wanted — resolving `program_name` against
  `university_programs` safely in `lib/deadlines/ingest.ts` and `lib/requirements/ingest.ts`.
