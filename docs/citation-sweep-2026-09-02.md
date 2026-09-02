# Citation-authority sweep — 2026-09-02

Generalized from a gap found in the story-bank audit: two files cited `docs/product-decisions.md`
for "founder-confirmed MVP scope," and the doc doesn't contain that section. The sweep: find
every code comment or migration that cites `docs/product-decisions.md`, `AGENTS.md`, or a spec
Phase number as authority for a claim, and check whether the cited source actually says it.

**Result: one real, systemic pattern, now fixed across 15 files — and otherwise this codebase's
citations are honest.** `docs/product-decisions.md` came back 7/8 clean (the 8th is the
already-reported story-bank gap, not re-touched here). Every `AGENTS.md` citation with a phase
number above 13, and the roughly 200 non-`AGENTS.md` "Phase N" mentions checked across
`lib/`, `scripts/`, and tests — most of which turned out to be citing *other* internal
workstreams' own phase numbering (University Intelligence Spine, Counselor Core, the Cialfo
data-gap work, a "counselor-data-quality-v1" founder prompt — each self-identified, not
AGENTS.md at all, and out of scope for this sweep) — checked out accurate.

## The one real pattern: two numbering tracks share numbers 1-13

AGENTS.md contains **two independent numbering systems**. Before the phased build spec begins,
the document has thirteen plain-numbered intro sections — `0. PRODUCT NAME` through
`13. DESIGN PHILOSOPHY` (`11. PRIVACY-FIRST EVIDENCE SYSTEM`, `12. MINOR-SAFE PRODUCT DESIGN`,
etc.). Then `PHASE 1 — FOUNDATION` begins a **second**, separate track running to `PHASE 80`.
For any citation numbered 14 or above there's no ambiguity — only the Phase track goes that
high. But for numbers 1 through 13, "Phase 12" is genuinely two different things: section 12
(*Minor-Safe Product Design* — evidence, deletion, minimal collection) or Phase 12 in the build
track (*Opportunity Matching* — an unrelated scoring/relevance feature).

**15 files cite a low number as "Phase N" for content that is unambiguously the plain
section's, not the build-track phase's** — verified by reading the cited content directly
against both candidates each time, not assumed from the number alone:

| Citation as written | What the content actually says | The real source |
|---|---|---|
| "Phase 12" ×7 (`0058_social_posts.sql` ×3, `post-actions.ts`, `export/tables.ts`, `tables.test.ts`, `settings/actions.ts`, `u/[id]/page.tsx`, `connection_privacy_manual.sql`, `nav-items.ts`) | "avoid public-by-default profiles," "provide deletion," "minimize data collection," account deletion, data export, a private-profile's generic title | Section 12 — Minor-Safe Product Design (Phase 12 in the build track is Opportunity Matching) |
| "Phase 11" ×2 (`documents/page.tsx`, `0015_storage_buckets.sql`) | the 4-state evidence vocabulary; files never publicly addressable by default | Section 11 — Privacy-First Evidence System (Phase 11 in the build track is the Opportunity Engine) — for the evidence-vocabulary one, retargeted to **Phase 21** instead, which restates the identical vocabulary inside the build track itself, matching the precedent already set correctly by `lib/profile/evidence-status-presentation.ts`'s own "Phase 11/21" citation |
| "Phase 9" ×3 (`admissions.ts`, `acquire-admissions-facts.ts`, `tavily.ts`) | the Tavily search-then-extract workflow | Section 9 — Live Web Information (Phase 9 in the build track is Weekly AI Review) |
| "Phase 10" (`openalex.ts`) | OpenAlex, free/no API key | Section 10 — Research Data (Phase 10 in the build track is the Reflection Loop) |
| "Phase 7" (`college-scorecard.ts`) | College Scorecard as the primary U.S. structured source | Section 7 — United States University Data (Phase 7 in the build track is the Profile Dashboard) |

**Every one of these underlying claims is true** — verified against the real section content,
word for word in several cases (`0058_social_posts.sql`'s "avoid public-by-default profiles"
and section 12's actual text match exactly). Nothing here was a false requirement or an
invented rule. The defect was purely the pointer: a future reader following "Phase 12" into
the build track lands on Opportunity Matching and finds nothing about privacy at all.

**Fixed** by changing "Phase N" to "section N" (or, for the evidence-vocabulary case, to the
correct high-numbered Phase that already states the same thing) at each of the 15 sites — a
comment-only change, zero behavior risk. Left the wording, quotes, and reasoning around each
citation untouched; only the pointer changed.

## What was checked and left alone

- **Citations with N > 13** (Phase 42, 45, 30, 68, 72, 56, 6.1, 16/17, 57/8.2/8.3, 27, 33/45/76,
  and more) — every one checked against the actual phase content and found accurate, including
  several precise multi-phase citations (`lib/ai/eval/judge.ts`'s "Phase 57/8.2/8.3" for tone,
  `lib/admissions/outlook.ts`'s "Phase 16/17" for the outlook/model split) that would have been
  easy to get subtly wrong and weren't.
- **Low numbers (≤13) where content unambiguously matches the build-track phase** — `Phase 2`
  (×4, all correctly the Authentication/User Model phase's birth-year field, never confused
  with section 2's Core Product Principle), `Phase 5` (achievement entry), `Phase 7` (×2, the
  dashboard's own "maximum three primary actions," correctly the Profile Dashboard phase, not
  confused with section 7's US University Data), `Phase 10` (`weekly-focus.tsx`'s "Allow short
  notes," an exact quote from the Reflection Loop phase, not section 10's Research Data), `Phase
  6.1` (no section-6.1 exists, so no ambiguity is possible) — left untouched; the number is
  right.
- **`docs/product-decisions.md`'s 7 clean citations** — several are near-verbatim quotes,
  checked against the doc's actual text, not just its section headings.
- **~200 "Phase N" mentions that aren't AGENTS.md citations at all** — self-identified as other
  documents' own numbering (`scripts/`'s University Intelligence Spine work, Counselor Core's
  phase labels, the Cialfo data-gap audit, a separate counselor-data-quality founder prompt).
  Excluded rather than checked against AGENTS.md, since they never claimed that authority.

## If it recurs

AGENTS.md's two tracks colliding on 1-13 is a standing hazard for any *future* comment, not
just the 15 fixed here — a phase-number citation in that range is worth a second look at what
it's actually citing before trusting the label.

## Gate

`npm run typecheck`, `npm run lint`, `npm test -- --run` (3502/3502, 249 files) all pass.
