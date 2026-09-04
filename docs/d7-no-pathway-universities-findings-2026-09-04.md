# D7 — universities/programs with no admission pathway for our audience

Measurement only, per CEO's instruction ("önce ölç, kod yazma"). No code changed. This
document is the representation decision brought back before implementing anything, per
"temsil kararını bana getir, uygulamadan önce."

## 1. Verified the Tokyo claim independently (Phase 9: prefer official sources)

CEO's example was relayed from another session's report — the same relay path that produced
the inaccurate Peking University example earlier tonight — so it was checked against official
sources before being used as this doc's anchor case, not assumed correct because it sounded
plausible.

Confirmed via `peak.c.u-tokyo.ac.jp` (PEAK's own admissions pages) and `u-tokyo.ac.jp`:

- **PEAK**: September 2026 is confirmed as its final intake. Applications for that final
  cohort already closed in December 2025. There will be no further intake cycles, ever, after
  this cohort graduates. For a student reading Proxola *today*, PEAK is not "closing soon" —
  its application window is already gone.
- **GSC (Global Science Course)**, the university's other English-taught undergraduate
  program: transfer-only. Admits students who have already completed at least two years of
  university study *outside Japan*, directly into year 3. Not reachable by a first-time
  applicant straight from high school — our entire audience.

So the underlying fact is correct, more so than CEO's own phrasing suggested (this isn't a
future risk — the door is already shut): **The University of Tokyo currently has zero
undergraduate admission pathway usable by a 14–18-year-old international applicant.** A
student can still study there via the Japanese-medium track (with the language proficiency)
or apply as a transfer after two years elsewhere — neither is what "add as a target, see an
outlook" currently implies to this product's stated audience.

Sources: [PEAK 2026 enrollment announcement](https://peak.c.u-tokyo.ac.jp/apply/l3/Vcms3_00000377.html), [PEAK apply overview](https://peak.c.u-tokyo.ac.jp/apply/index.html), [University of Tokyo — Undergraduate Programs in English](https://www.u-tokyo.ac.jp/en/prospective-students/undergraduate_english.html).

## 2. Is this currently live-affecting a real student? No.

```
target_universities rows for The University of Tokyo: 0
university_programs rows:                              0
university_requirements rows:                           0
university_statistics rows:                              0
university_profile_metrics rows:                         10  (generic facts: size, research topics, etc. — nothing pathway-related)
```

Nobody has targeted it. `refreshAdmissionOutlook` only ever runs against a real
`target_universities` row (`app/(app)/universities/[id]/page.tsx`'s `targetRes.data ?
await refreshAdmissionOutlook(...) : null`), so no outlook has actually been computed and
shown to anyone for Tokyo yet. The bug is real and reachable the moment someone targets it —
it just hasn't happened yet.

Checked whether a *different* university with this same shape is already live-affecting
someone. Every university with at least one real `target_universities` row today:

```
MIT (5), LSE (2), Erasmus Rotterdam (2), Bocconi (2), Caltech (2), Carnegie Mellon (1),
University of Amsterdam (1), Oxford (1), Stanford (1), Boğaziçi (1), Yale (1), Warwick (1)
```

All twelve are large, well-known institutions with ordinary, currently-open freshman
direct-entry programs in the language they're famous for teaching in. None plausibly shares
Tokyo's shape. **No student is experiencing this false-precision problem today, for any
university.**

## 3. Does the schema already have a place for this? Partly the vocabulary, not the fact.

Checked before writing anything, per the standing rule (three things already turned out to be
built-but-unwired today) and CEO's specific pointers.

**`admission_rate_basis`** (migration 0119, `university_statistics`) is the right *pattern* to
learn from, not a table I can reuse directly: it's per-university, one row, for a genuinely
different fact (whether a single admission rate exists at all). Its real lesson is
structural — replace an ambiguous null with a tri-state ("not_researched" default /
confirmed-negative / confirmed-positive) — and that its own migration explicitly never
guesses the confirmed-negative value; only a real research pass sets it. That discipline is
what section 4 below follows, not this table.

**`university_programs`** already carries columns that sound like the right place —
`language_of_instruction`, `international_eligible`, and `verification_state` (which
includes a `"discontinued"` member) — but none of them capture the actual fact needed
("does this program admit a first-time freshman applicant, right now"), and in practice
they've never been used for anything close to it:

```
Total university_programs rows:              17,046, across only 150 of 1,019 universities
Rows with language_of_instruction set:        11,593  (68% — reasonably populated where rows exist)
Rows with international_eligible set:          1,159  (6.8%)
Rows with international_eligible = false:          0  (never used, in either direction)
Rows with verification_state = 'discontinued':     0  (never used)
```

869 of 1,019 universities (85%) have **zero** `university_programs` rows at all — Tokyo among
them. So even where program-level research exists, "is this program still accepting new
freshmen" has never once been the thing researched. This isn't an unwired-but-populated field
like `stats_as_of`/`admission_rate_basis` were — it's an unresearched dimension. Grepped the
whole `lib/` tree for `pathway`/`freshman` too, to make sure I wasn't about to rebuild
something that already exists under a different name: `lib/admissions/system-shape.ts`'s
"pathway" is domestic-vs-international *admissions process* (which rulebook applies based on
where a student went to secondary school) — a different concept, no collision.

## 4. How common is this, beyond Tokyo? Spot-checked, not exhaustively researched.

A full audit of all 1,019 universities' pathway availability is its own research project, not
something to do speculatively before knowing whether the shape is worth building for. Spot-
checked the single most likely second case instead: Kyoto University, Japan's other
globally-known research university, the natural next guess if this were a Japan-wide pattern
rather than Tokyo-specific.

**Kyoto does not share this problem.** It runs Kyoto iUP — a real, currently-open,
freshman-entry program taught in English, no prior Japanese required at admission. (Its later
years shift toward Japanese-medium instruction, which is a real caveat worth capturing
*if* Kyoto is ever targeted, but it is a different and much softer problem than Tokyo's "zero
entry point.")

**One data point, but it argues against a country-wide rule**: this looks like an
institution-specific fact (Tokyo's own decision to sunset PEAK), not a Japan-wide or
even a "elite Asian research university" pattern. I did not find a second confirmed case.
Per your own gate — I'm saying so rather than manufacturing generality to justify a bigger
build.

## 5. The two questions you asked

**Should the outlook engine know, or should the university be unable to be targeted?**

Agree with your own lean, and the existing architecture already argues for it independently:
`lib/admissions/outlook.ts`'s `not_applicable` mechanism (migration 0049) was built for
exactly this shape of problem — a Turkish YKS target or a US undergraduate-Medicine target can
still be added to My Universities; only the misleading reach/competitive/likely label is
suppressed, replaced with a specific, sourced explanation
(`notApplicableReason`/`notApplicableKind`). Blocking targeting outright would require
Proxola to know every legitimate reason a student might still add Tokyo (genuinely pursuing
the Japanese-medium track, researching it for a graduate-level interest later, or just
exploring) — the narrower, reversible move is the one the codebase already committed to for
every other "this classification doesn't apply" case. No reason to special-case Tokyo into a
harder rule than field-not-offered-at-undergraduate or credential-gated systems get.

**Representation — recommendation, not yet implemented:**

Not a migration. `field-availability.ts` is the closer precedent than `admission_rate_basis`:
a small, hand-researched, sourced, per-entity lookup table (there: country+field; here:
university, optionally +program), feeding a new optional input into
`computeAdmissionOutlook` exactly the way `fieldAvailability` already does, with one new
`NotApplicableKind` member (e.g. `no_undergraduate_pathway_for_applicant`) and its own
sourced explanation string, in both locales, matching every existing member's shape.

Reasoning for no-migration specifically: a schema column started with a real research pass
behind it (`admission_rate_basis` shipped alongside the fill session that populated two real
rows). Right now this dimension has exactly one hand-verified entry (Tokyo) and zero
population strategy — adding a column today would recreate the exact
default-to-ambiguous-null problem `admission_rate_basis`'s own migration comment warns
against, just one table over. A hardcoded table with one sourced entry, grown the same way
`field-availability.ts`'s Medicine/Law set was grown, doesn't have that problem and ships
today. If this later turns out to need real per-university database rows (once there's an
actual research pipeline for it, not one ad hoc web search), that's a bigger, separate design
decision — and by then there'd be real population data to design the table around, the same
gap `admission_rate_basis` closed only after a real fill pass, not before one.

Concrete integration point, already read: `lib/admissions/persist.ts`'s
`refreshAdmissionOutlook` resolves `target.program_id` → `program.subject_taxonomy` →
`fieldAvailability` today (lines 118–120, 156). A new
`checkUndergraduatePathwayAvailability({ universityId, programId })` would slot in at the same
spot, keyed primarily by `university_id` (Tokyo has no program rows to key against — a
student can only ever target it with `program_id: null`), with room for a future
per-program override once a university has real granular pathway data.

## What I'm not doing without your go-ahead

Not writing the new `NotApplicableKind`, the lookup table, or wiring it into
`persist.ts`/`outlook.ts` yet — that's the implementation this doc is asking permission for,
not describing after the fact. Not auditing the other ~1,000 universities for the same
pattern — flagged as its own possible follow-up if you want broader coverage before this
ships, not assumed necessary.
