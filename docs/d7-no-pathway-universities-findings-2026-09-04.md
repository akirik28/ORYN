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

---

## Addendum, 2026-09-04 — the corpus-wide measurement CEO asked for after Copenhagen

D1's Copenhagen finding (also zero undergraduate English pathway — entire bachelor's level is
Danish-taught) made this doc's section 4 conclusion ("Kyoto doesn't share it, one data point
argues against a pattern") outdated: two QS-top-100-caliber cases out of the 18 D1 actually
researched is not one spot-check anymore. CEO asked for a real measurement instead of another
spot-check: how big is the catalog's exposure, how populated is the relevant data already, how
many real students it actually touches today, and a fresh sample to check whether the rate
holds. All against live data (`qtcvcflzxbuagvvwahhu`), 2026-09-04.

### 1. Upper bound — how many universities could plausibly have this problem

```
Total universities:                                        1,019
In a native-English-speaking country (US/UK/AU/CA/IE/NZ):     290
Everywhere else (crude upper bound):                           729  (71.5%)
```

That crude number over-counts: it includes Singapore, Hong Kong SAR, and Macao SAR (this
session's own D1 work tonight directly confirmed NUS, NTU, HKU, CUHK, PolyU, CityU are all
English-medium), plus India/Malaysia/Pakistan/Nigeria/Ghana/Philippines/South Africa, where
English-medium higher education is well-documented as the norm rather than the exception.
Excluding those too:

```
Refined upper bound (excludes known/plausible English-medium-at-scale systems): 626  (61.4%)
```

Still large either way — this alone doesn't settle "widespread" vs. "coincidence," it just
says the *exposure* is big. The next three sections narrow it.

### 2. How populated is the language dimension, really

CEO's own same-day number (`international_eligible` used in 0 of 17,046 `university_programs`
rows) already showed this dimension is unresearched in one direction. Measured the other
direction too, scoped to the 626-university "genuinely uncertain" set:

```
Zero university_programs rows at all (fully unresearched, Tokyo's own shape):   559  (89.3%)
Has program rows, but none marked English (Copenhagen's own shape):              24  ( 3.8%)
Has at least one program row confirmed English:                                  43  ( 6.9%)
```

**A real caveat, not swept under the rug:** this table-based measure misses research that
landed somewhere else. Tokyo and Kyoto both now carry real, sourced findings on exactly this
question — Tokyo in this doc and in tonight's D1 `university_requirements` row, Kyoto in
tonight's D1 fill — but neither wrote a `university_programs` row, so both still show up as
"0 program rows" above. The true unresearched count is a couple of institutions lower than 559,
not meaningfully different at this scale, but it confirms CEO's own point independently: even
where real research now exists, `university_programs.language_of_instruction` isn't where it's
being captured. Whatever representation gets built should not assume this column will fill in
on its own as fill passes continue.

### 3. Real student impact today

```
Of the 626 "uncertain" universities, how many have a real target_universities row: 4
  Bocconi (Italy) -- 2, Erasmus University Rotterdam (Netherlands) -- 2,
  Boğaziçi University (Turkey) -- 1, University of Amsterdam (Netherlands) -- 1
```

Same shape this doc's original section 2 found for Tokyo specifically, now confirmed at the
corpus level: **real usage is concentrated on well-known institutions, not a random draw from
the corpus.** All four are independently well known for having substantial, established
English-taught bachelor's programs (not re-verified individually this pass — flagged as an
assumption, not a checked fact, unlike everything else in this addendum). Nobody has targeted
a university with Tokyo/Copenhagen's specific shape yet, as far as `target_universities`
shows.

### 4. Six-institution sample, verified against official pages, not corpus metadata

Picked one QS-recognized university each from six countries in the "uncertain" bucket, deliberately
spread across regions (East Asia, Latin America, Eastern Europe, Scandinavia, Middle East,
Western Europe) rather than clustering — avoiding the trap of drawing conclusions from
similar/adjacent institutions only.

| University | Country | Finding | Confidence |
|---|---|---|---|
| Fudan University | China | **Real pathway.** 50+ English-taught programs, several explicitly freshman undergraduate (UIPE, IOGG, GBF, UIPDB) | High — official `iso.fudan.edu.cn` domain |
| University of Warsaw | Poland | **Real pathway.** 100+ English-taught programs across multiple faculties, named bachelor's degrees (Economics, Political Science, Psychology, Computer Science) | Medium-high — corroborated across sources incl. Poland's official study-in-Poland government site, not independently page-verified this pass |
| KTH Royal Institute of Technology | Sweden | **Narrow, real, but the exception.** Exactly one English-taught bachelor's programme (ICT); explicitly stated the general bachelor's level (years 1-3) is Swedish-medium, English only standard from master's level | Medium — search-corroborated, not page-verified |
| King Saud University | Saudi Arabia | **Unclear.** English-medium majors exist (Medicine, Engineering, some Sciences) per general sources, but the university's own general bachelor's admission page is explicitly titled for Saudi students, and the international-students page rendered no substantive content this pass | Low — genuinely unresolved, not a confirmed yes or no |
| Technische Universität Dresden | Germany | **No real bachelor's pathway.** Bachelor's programmes are primarily German-taught; English-taught offerings are concentrated at master's level | Medium — search-corroborated, not page-verified |
| Universidad Nacional Autónoma de México (UNAM) | Mexico | **No pathway.** Confirmed directly on UNAM's own official international-cooperation page (`unaminternacional.unam.mx`) — the entire "undergraduate" offering for international students is semester exchange/mobility alongside Spanish-medium Mexican degree programs, no standalone English-taught degree track | High — direct official-page read |

**Result: 2 clear yes, 2 clear no, 2 narrow/unclear — out of 6, spread across 6 different
countries.** This is not two coincidences. It is also not "most of the catalog is broken" —
the pattern is real and recurs at something like a third to half of a random draw from the
exposed set, with genuine texture (fully open / one narrow exception / nothing) rather than a
clean yes-or-no split.

### 5. Verdict — the number, not a guess

**Real and recurring, not a coincidence — but not a live product problem today.** The exposure
is large (up to 626 universities) and the pattern reproduces in a fresh, geographically-spread
sample at a meaningful rate, so this isn't "two unlucky QS-top-100 picks." At the same time,
zero students today have targeted a university confirmed to share this shape, and the
underlying data needed to resolve it (which of the 626 actually lack a pathway) does not exist
yet at any real coverage — only 8 of 626 are now confirmed either way by this session's actual
research (Tokyo, Copenhagen: no; Kyoto, Fudan, Warsaw: yes; KTH: narrow-yes; UNAM: no; King
Saud: unresolved).

This argues for building the mechanism this doc's section 5 already designed (hand-curated
lookup table, `not_applicable` reuse, no migration) **scoped as prevention, not urgent
remediation** — populate it as fill passes keep discovering real cases (the same way
`admission_rate_basis` was populated by research, not backfilled speculatively), rather than
commissioning a dedicated audit of all 626 before shipping anything. The mechanism protects the
next fill pass or the next student target from repeating Tokyo/Copenhagen's exact failure mode;
it doesn't need every case pre-loaded to be worth having.

### UTS — closed, and the duplicate-scan's "zero new pairs" result is trustworthy

Checked `duplicate_status`/`canonical_entity_id`/`superseded_by_id` directly for both rows —
something the original D1 flag never checked, which is why it was raised as an open question
in the first place:

```
"The University of Technology Sydney (UTS)": duplicate_status='superseded',
  superseded_by_id -> "University of Technology Sydney"
"University of Technology Sydney":            duplicate_status='canonical'
Both share canonical_entity_id = 0b13f9c6-533d-4869-89c8-20e7c6e4cd98
```

**This was a false alarm on my own part, not a real gap.** UTS is already resolved through the
identical mechanism as MIT/HKUST/UCL. The D1-session flag was raised from a name-pattern match
alone (`ilike '%technology%'` turning up two rows) without checking the actual resolution
columns — exactly the shortcut this whole session's "verify identity, not pattern-match"
discipline exists to catch, and I didn't apply it to my own finding before passing it up. Net
effect: today's four-method duplicate scan finding zero new pairs is corroborated, not
contradicted — one specific check against a real candidate came back clean.
