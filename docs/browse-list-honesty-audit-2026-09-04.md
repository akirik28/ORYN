# Does the university browse/search list keep the same honesty the detail and compare pages now have? — measured, not fixed

CEO's ask, after the compare-page Oxford badge incident: `lacksCoreAdmissionStats`/
`lacksApplicationDeadline` (D6, 2026-09-04) reached the detail page and, after that incident,
the compare page — is the browse/search list a *third* separate path that missed both, the
same way compare missed them until today? Read first, per the assignment:
`docs/handoffs/university-data-depth-honesty-2026-09-02.md`,
`docs/handoffs/university-data-depth-browse-2026-09-02.md`, `docs/search-audit-2026-09-02.md`,
`docs/university-explorer-traceability-audit-2026-09-02.md`. Look and report — no code
changed.

## Short answer

**Two different questions, two different answers.** "Does the list look like a wall of empty
cards given how little data exists?" — no, already handled thoughtfully (09-02 work, confirmed
still in place). "Does the list's one honesty signal — the 'Detailed profile' badge — actually
mean what a click-through to the detail page now says?" — **no.** The badge is real and
positively-scoped (09-02's own good design), but it runs on the older, coarser depth check
D6's own code comments already named as insufficient, not on `lacksCoreAdmissionStats`/
`lacksApplicationDeadline`. Measured: of 316 universities the badge currently marks "Detailed
profile," 301 (95.3%) are missing what the detail page now honestly flags as unresearched on at
least one of the two axes D6 added, and 116 (36.7%) are missing both. This is not a
theoretical risk — MIT and Oxford, D6's own two named discovered instances, are both live
examples of exactly this contradiction today.

## 1. Is the "wall of empty cards" fear real?

**No — confirmed against the actual card component
(`features/universities/university-card.tsx`), not assumed from the 09-02 doc's own claims.**

A university with zero rows anywhere still renders a normal-looking card: photo (or a
monogram fallback — `MediaImage`, never a broken image icon), name, city/country, an
institution-type chip if set, and the Details/Save/Compare button row. Nothing reads
"Unavailable," no error state, no visible negative marker. Every optional line — QS rank,
student size, the depth badge, tuition, research topics — is independently conditional and
simply omits itself when absent, the same "silence is the default state" convention this
card's own doc comments describe. Traced this in the component, not inferred: `{(qsRank ||
university.student_size || hasResearchDepth) && (...)}` for the metadata row,
`{tuition && tuition.kind !== "unavailable" ? ... : null}` for tuition, and so on down the
file — a sparse university produces a sparse-but-clean card, never a broken-looking one.

This matches the 09-02 browse handoff's own explicit design decision: "a marker true for 72%
of rows is noise, so express it as the minority instead" — the badge shows a positive signal
on ~285 (now 316, see §3) cards, never a negative one on the other ~700. That decision is
still in place and still doing its job. **The empty-state fear CEO raised is not what this
audit found — it's a separate, real, but different problem: the badge itself no longer means
what a click-through says.**

## 2. Does the list surface `admission_rate`/deadline data at all?

**No — checked directly, this is structurally different from the compare-page bug's own
shape.** The compare page's Oxford incident happened because that page rendered
`admission_rate` as a bare number, side by side across universities, with no suppression.
The browse card never renders `admission_rate`, SAT/ACT ranges, graduation rate, or any
deadline at all — grepped `university-card.tsx` directly for each field, zero hits. The card
does render tuition (`cost_of_attendance` / `university_profile_metrics`), but that field
already has its own honest "unavailable → omit, never show a bare zero" handling, confirmed
in this same file's own comments and unrelated to D6's two new checks. So the browse card
cannot self-contradict the detail page on admission rate or deadlines **by displaying a wrong
number** — it simply doesn't display those numbers. The actual gap is one level up: a
*summary badge* implying more completeness than the detail page will actually show.

## 3. The real gap: the badge runs on the old check, not D6's new ones

Grepped every call site of `lacksCoreAdmissionStats`/`lacksApplicationDeadline` across the
repo. Both are used in exactly two places:

```
app/(app)/universities/[id]/page.tsx   -- the detail page
app/(app)/universities/compare/page.tsx -- the compare page (fixed today, C7 follow-up)
```

Neither appears in `browse-page.ts`, `university-card.tsx`, `university-browse-grid.tsx`, or
`app/(app)/universities/page.tsx`. The browse card's "Detailed profile" badge is fed by a
different function entirely: `getAllResearchDepthUniversityIds()`
(`lib/universities/queries.ts`) — has-any-row-in-any-of-4-tables (programs, requirements,
sources, statistics). This is **the exact check `data-depth.ts`'s own comments say D6 was
written specifically to replace for render decisions**, because it can't see a wrong-kind row
(a `deadline_type: "scholarship"` row satisfies "has a deadline row" while answering nothing
about when to apply) or an all-null row (a `university_statistics` row with a real `source`
but every actual figure null still satisfies "has a statistics row"). `lacksResearchDepth`
was never meant to answer "would the detail page show this as researched" — the compare page
already learned this the hard way once today; the browse card asks the identical row-count
question the identical wrong way.

## 4. Measured, not assumed — how big is the gap

Live query, `qtcvcflzxbuagvvwahhu`, against the same three predicates the three surfaces
actually use (`getAllResearchDepthUniversityIds`'s union-of-any-row, `lacksCoreAdmissionStats`,
`lacksApplicationDeadline`):

| | count | of 1,019 |
|---|---|---|
| Missing core admission stats (`lacksCoreAdmissionStats`) | 890 | 87.3% |
| Missing a real application/early deadline (`lacksApplicationDeadline`) | 933 | 91.6% |

**Both exactly match the numbers CEO cited** — verified, not taken on faith.

| Of the universities the badge marks "Detailed profile" | count | of 316 |
|---|---|---|
| Total badged "Detailed profile" (the coarse check) | 316 | — |
| ...but missing core stats | 187 | 59.2% |
| ...but missing a real deadline | 230 | 72.8% |
| ...missing at least one of the two | 301 | **95.3%** |
| ...missing both | 116 | 36.7% |
| Genuinely complete on both (badge is accurate) | 15 | 4.7% |

**The badge is accurate for 15 universities and misleading for 301.** This is not a marginal
edge case the coarse check mostly gets right — for this specific badge, being right is the
edge case.

## 5. The two named instances, confirmed live, with the actual text a student sees on each side

**MIT** (`03167d0c-2315-49e3-a37e-f9c9c7d2d27c`): has rows in all four depth tables →
`hasResearchDepth = true` → browse card shows "✓ Detailed profile." Its two
`university_deadlines` rows are both `deadline_type: "scholarship"` — no `"application"` or
`"early"` row exists → `lacksApplicationDeadline` is true → the detail page shows:

> "Proxola hasn't confirmed this university's application deadline yet — check the official
> admissions page for the current date."

(MIT's core admission stats are genuinely complete — admission_rate 0.0455, SAT/ACT ranges,
graduation_rate all populated — so this is specifically the deadline axis, not stats.)

**University of Oxford** (`e5164eb3-88c1-4ecc-81d7-d591ea0c34ea`): also has rows in all four
depth tables → same "✓ Detailed profile" badge. Its one `university_statistics` row has a
real, populated `source` (a real ox.ac.uk citation — the detail page's own D6 comment already
confirms this exact fact independently) but `admission_rate`, `sat_range_low`,
`act_range_low`, and `graduation_rate` are all null → `lacksCoreAdmissionStats` is true → the
detail page shows:

> "This university's admission rate, test scores, and graduation rate aren't in Proxola's
> records yet — that's a gap in our research, not a low number."

(Oxford's deadline data is genuinely complete — an `"application"` row exists — so this is
specifically the stats axis, the mirror image of MIT's gap.)

**The actual student path**: browse or search the list, see "✓ Detailed profile" on either
card, reasonably read that as "Proxola has real information here," click through, and land on
a sentence stating the opposite for the specific fact they came to check. Two of the twelve
universities with a real `target_universities` row today (a real student's own saved
university list) are these two exact cases.

## 6. Global search (⌘K, `/search`) — not exposed to this gap

Per `docs/search-audit-2026-09-02.md`, still true today: `globalSearch()`'s university results
are plain typed match cards (name, a snippet) — no `hasResearchDepth`, no stat, no deadline
rendered on a search result at all. Search can surface a university a student hasn't seen on
the browse list, but it doesn't make any completeness claim about it either way. Not part of
this gap; noted so nobody assumes it needs the same fix.

## 7. What was checked and found already fine — not re-litigating

- **The badge's own minority-only design** (09-02): still exactly as documented, still doing
  its job for the sparse-majority problem it was built for. Not what's broken here.
- **Tuition's own honesty handling on the card**: confirmed unrelated to and unaffected by
  this gap — its own independent `kind: "unavailable"` fallback already omits cleanly.
- **`SourceBadge` usage, freshness, invented-confidence** — all covered by
  `university-explorer-traceability-audit-2026-09-02.md`; not re-checked here, that audit's
  own findings (the stats-badge fix landed, compare-page and tuition-source gaps flagged,
  `data_status` never surfaced to students) still stand as that doc described them.

## Not done here, deliberately — this was a look-and-report task

No code changed. Two shapes of fix are visible from what was found, named here so the actual
call (badge semantics vs. a second-signal risk) is CEO's, not defaulted by whoever picks this
up:

1. **Swap the badge's data source.** Feed `hasResearchDepth`/the "Detailed profile" label from
   `lacksCoreAdmissionStats`/`lacksApplicationDeadline` (bulk-list versions of both, mirroring
   how `getAllResearchDepthUniversityIds` already bulk-versions `lacksResearchDepth`) instead
   of the coarse union. This makes the badge mean the same thing the detail page's own
   honesty notes mean — but would shrink the ~316 badged universities to something close to
   the ~15 "genuinely complete on both" figure above, which is a real product/UX call (a badge
   that fires for 15 of 1,019 is arguably too rare to be worth a badge at all) more than a
   pure bug fix.
2. **Leave the badge as a general-depth signal, add a second, narrower one** specifically for
   "stats and deadline both confirmed" — closer to what 6 above's genuinely-complete 15 measure
   — so the existing badge keeps meaning what it always meant (some real research exists) and
   a new, rarer signal answers the sharper question a student clicking through actually cares
   about. More code, but avoids silently redefining an existing, already-shipped badge's
   meaning out from under it.

Either way needs the bulk-list counterparts of `lacksCoreAdmissionStats`/
`lacksApplicationDeadline` built first (`getAllResearchDepthUniversityIds`'s own pattern:
paginated, exact-count-verified per-table reads, unioned) — that part isn't a judgment call,
just an as-yet-unwritten function.
