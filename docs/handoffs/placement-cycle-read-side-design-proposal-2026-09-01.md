# Reading `university_program_placement_cycles` — a design proposal, not an implementation

**Status:** design proposal only. No implementation, no DB writes, no code in `app/`/`features/`.
**Author lane:** oryn-60, at oryn-a7's request, following directly from this project's own Gate F
report finding that this table has no reader anywhere in the product. **Base:** local `main`.

A visual mockup accompanies this document — see the link in the message this was delivered with.
It renders the two surfaces §3 proposes using this product's real design tokens (dark-mode OKLCH
values from `app/globals.css`) and the real component vocabulary (`EvidenceSignal`, `StatusBadge`,
`ConfidenceIndicator`) so it reads as *this product*, not a generic mockup.

---

## 0. What already exists — checked, not assumed

Before designing anything, read `app/(app)/universities/[id]/page.tsx` end to end.
**The "Your outlook" panel already does the right thing for Turkey.** `lib/admissions/system-shape.ts`
→ `lib/admissions/outlook.ts` → `lib/admissions/persist.ts` → the page's `notApplicableReason`
rendering is a complete, working chain: a Turkish target already shows the sourced mechanism
sentence ("ÖSYM's YKS placement algorithm is the admission decision itself... no essay, no
interview...") instead of a fabricated reach/competitive label. **This proposal does not touch
that chain.** It's correct, it's shipped, and Gate 1 is exactly the discipline that makes it
correct. Naming this up front matters because it narrows the actual gap: not "Turkey's outlook is
wrong," but "the mechanism is explained in prose and nothing concrete is attached to it."

**The actual gap is the Programs section** (same file, `groupProgramsBySubject` + the plain `<li>`
card). Today it renders a programme's name, degree level, faculty, and an external-link icon —
nothing about placement, cutoff rank, seats, or fee tier, for any university, Turkish or
otherwise. `university_program_placement_cycles` (migration 0055) has no caller anywhere in
`app/` or `features/` — confirmed by grep, see the Gate F report.

## 1. The principle everything below follows from

**Never compute or display a single derived "the rank" for a programme. Always show the distinct
rows that actually exist, however many there are.**

This isn't a stylistic preference — it's the direct, mechanical fix for a real defect this
project found in its own work tonight: `docs/handoffs/tr-university-candidate-list-2026-09-01.md`'s
same-day correction, where citing "TOBB ETÜ's peak rank: 188" without stating it was a **3-seat**
scholarship record made a mid-tier university look near-elite. `docs/handoffs/yeditepe-research-2026-09-01.md`
found the same shape sharper: a **%50-discount** tier (not even the cheapest one) with a filled
placement at rank **1,187,801**. A vakıf programme with three fee tiers is not one thing with one
rank — it's up to three different admissions outcomes sharing a subject name. Devlet institutions
don't have this problem (no `burs_orani_adi` tier structure at all — see §4 of
`tr-university-candidate-list-2026-09-01.md`), so the design has to handle "1 row" and "up to 3
rows" as the *same* pattern, not two different UI treatments for two different data shapes — a
devlet programme just happens to have exactly one row.

**Consequence for layout:** anywhere this data appears, it renders as a *list* of facts (one per
`(cycle_year, puan_turu, burs_orani_adi)` combination that exists), never collapsed into a range,
an average, or a "best of."

## 2. Real components, not new ones

`components/oryn/evidence-signal.tsx` already exists for exactly this shape: "a single supporting
fact, shown citation-style" with a `missing` tone specifically designed so "an absent piece of
evidence... should read as neutral-but-noted, not as an error" — this is the literal component
description, and it is the literal problem `university_program_placement_cycles`'s empty read
side has. `components/oryn/status-badge.tsx`'s `info` tone ("a distinct-but-not-bad state") is the
right fit for `placement_status: 'unfilled'` — a real, meaningful, non-failure outcome (every
qualified applicant who wanted the seat got it) that migration 0055's own header explicitly
distinguishes from "not yet captured."

**One deliberate non-use, named rather than silent:** `ConfidenceIndicator` (the lit/unlit 3-bar
meter) exists and would be the obvious reach for "how sure is Oryn of this number" — but YÖK
Atlas's placement data is uniformly `data_confidence: 'high'` whenever a row exists at all (it's a
national government API, not a research-pass estimate). The bar meter would sit at 3/3 forever
and communicate nothing. **The load-bearing freshness signal here is the cycle year, not a
confidence tier** — a 2024 rank shown without its year is the false-precision failure this
project has spent two days removing elsewhere (the `formatRecurringDate` comment in this same
file makes the identical argument for deadline dates). Every placement fact this design shows
carries its cycle year in the source line, unconditionally, the same way `EvidenceSignal`'s
`source`/`timestamp` props already work.

## 3. Two surfaces, not one — different value, different density

### Surface A (primary): the outlook panel, for the student's own targeted programme

`target_universities.program_id` already exists. When a student has targeted a specific
programme at a Turkish (or any rank-and-cutoff) university, the "Your outlook" panel currently
shows the mechanism sentence and stops — an abstraction with nothing concrete attached. This is
the highest-value placement for this data: the one number a YKS-track student actually cares
about, sitting directly under the sentence that explains why it's the only number that matters
here.

Proposed: below the existing mechanism-sentence paragraph, when the targeted programme has one or
more placement-cycle rows, render them as a small stacked `EvidenceSignal` list (`bordered`,
matching the pattern the component doc calls out for "stacked evidence lists" — the same anatomy
`NextMove`'s evidence half already uses). One row per tier:

```
YERLEŞTİRME SIRASI (BURSLU)              PLACEMENT RANK (BURSLU)
#744  / 10 seats                          #744  / 10 seats
2026 cycle · İngilizce (Burslu)           2026 cycle · English (Burslu)

YERLEŞTİRME SIRASI (%50 İNDİRİMLİ)
#—  (data not yet available)
```

When the programme has *no* row at all: a single `EvidenceSignal` with `tone="missing"`, value
an em-dash, no fabricated number — exactly the same "read as noted, not failed" treatment the
component already gives a zero-research-projects student.

### Surface B (secondary): the programme grid

Every other programme on the page — 13 to 150+ depending on the institution — cannot carry a
full multi-row `EvidenceSignal` stack each without turning the Programs section into the exact
overwhelming density `docs/design-system.md` explicitly designs against ("generous whitespace,"
"three surface levels... before reaching for a border + radius + shadow, check whether whitespace
already does the job"). Proposed compact treatment, one line added to the existing card:

- **One row of data (devlet, or a vakıf programme with only one active tier this cycle):**
  `#305 · 35 seats · 2026` in `text-ink-3`, tabular-nums, directly under the existing
  degree/faculty line.
- **Multiple rows (a vakıf programme with 2-3 tiers):** `3 tiers · #188–46,234 · 2026`, styled
  identically. The range is not a derived "the rank" — it's the visible boundary of a labeled
  set, and "3 tiers" is load-bearing: it's what stops the range from reading as one continuous
  scale. Clicking/expanding reveals the same per-tier `EvidenceSignal` stack Surface A uses — one
  component, two contexts, not two designs.
- **No row at all:** `Placement data not yet available` in `text-ink-4`, present but quiet —
  matching this file's own `t("unavailable")` convention already used four times on this same
  page for missing stats.
- **`placement_status: 'unfilled'`:** a small `StatusBadge` (`tone="info"`, per §2) reading
  "Seats unfilled, 2026" rather than a rank number — this is real information, not an absence.

## 4. What "how it says what it doesn't know" resolves to, concretely

Four distinct states, each with its own honest treatment — never collapsed into "no data":

| State | Meaning | Treatment |
|---|---|---|
| No row exists | Never ingested for this programme | `EvidenceSignal tone="missing"` / grid: muted "not yet available" text |
| Row exists, `placement_status='filled'` | A real cutoff, dated | `EvidenceSignal` value + seats + cycle year in the source line |
| Row exists, `placement_status='unfilled'` | Quota not fully claimed — a real, different fact | `StatusBadge tone="info"`, no rank number shown |
| Multiple tiers, values diverge widely | The institution's actual admissions shape | Never one number — always the per-tier list or an explicitly-labeled range |

## 5. Open questions — named, not decided

1. **Should the programme grid re-sort by selectivity once this data exists?** Today's order is
   alphabetical within subject group. A student skimming 100+ programmes might want the most
   competitive first. Out of scope for this proposal (asked to design *what a programme shows*,
   not *page-level ordering*) — named so it isn't silently assumed either way.
2. **Does a range ever mislead more than it clarifies?** `#188–818,411` (TOBB ETÜ's own İktisat)
   is a genuinely enormous span. Whether the grid's compact treatment should show the range at
   all, or *only* the tier count + a "varies widely" note with no numbers until expanded, is a
   real design call this proposal doesn't make unilaterally — leaning toward showing the range
   (a hidden number reads as evasive, not careful), but flagging the alternative.
3. **Per-programme detail page or in-place expansion?** §3 assumes a click-to-expand within the
   grid card. A dedicated programme detail route is a larger, real alternative not evaluated here.
4. **`puan_turu` (SAY/EA/SÖZ/DİL score type) — worth surfacing at all in the compact view, or only
   in the expanded one?** It's real information (which national exam track this seat draws from)
   but adds a second axis of variation on top of fee tier. Proposed: expanded view only, to keep
   the compact line to the three numbers that matter most (rank, seats, year).
5. **This design generalizes past Turkey** — any rank-and-cutoff country with `AdmissionSystemShape
   === "academic_rank_competitive"` (Ireland/CAO, Spain, Australia, New Zealand, Hong Kong/JUPAS —
   see `system-shape.ts`'s registry) would benefit from the identical treatment once/if their own
   cutoff data exists in a comparable per-programme table. Not designed for here — named so the
   next person doesn't have to re-derive it from scratch when that data shows up.

## 6. What this does NOT do

- No code written in `app/`, `features/`, or `components/`.
- No `university_program_placement_cycles` rows read, written, or queried by any new code.
- No change to the outlook panel's existing (correct) mechanism-sentence logic — only a proposed
  *addition* below it.
- No decision on the five open questions in §5.
- No claim that this is the only reasonable design — it's the one that follows most directly from
  what this project already found tonight (the fee-tier correction, the unread-table finding, and
  the existing component vocabulary), offered for review, not commitment.
