# Unresolved content conflict — `00-overview.md` and `02-opportunity-development-mapping.md`

**Raised 2026-08-21 during the research-branch integration wave. Not resolved. Do not delete
either version without reading both.**

## What happened

Two counseling-intelligence research sessions ran concurrently overnight on 2026-08-21 and
collided early, before they had established a document-ownership split. Both independently
wrote `00-overview.md` and `02-opportunity-development-mapping.md`. Each version is
substantial, internally coherent, and genuinely different from the other — not a near-duplicate.

When those two lineages were merged into `main`, git produced an add/add conflict on both files.

## How it was handled, and why

**Nothing was discarded.** Both versions are preserved:

| Path | Origin |
|---|---|
| `00-overview.md`, `02-opportunity-development-mapping.md` | `oryn/counseling-intelligence-research-013956` lineage (the peer session) |
| `00-overview.ALT-main-lineage.md`, `02-opportunity-development-mapping.ALT-main-lineage.md` | `oryn/counseling-intelligence-research` lineage |

The peer session's version was placed at the canonical filename for two evidence-based
reasons, **not** because it was judged better on the merits by whoever ran the merge:

1. **The two sessions' own agreed ownership split assigns `00` and `02` to the peer session.**
   Recorded in `docs/handoffs/research-counseling-intelligence.md` ("The real, working split"),
   confirmed by both sides over a live cross-session channel.
2. **That same handoff records the peer's version of these files as the stronger one** — its
   own account of the early collision states the peer had "independently written a *better*,
   schema-grounded version of the same two files," which was then overwritten on disk by the
   other session's write (both survive in git history).

Placing one version at the canonical path was a mechanical necessity of completing the merge.
It is **not** a determination that the other version's content is wrong or superseded.

## What still needs to happen

A counseling-intelligence lane should read both versions side by side and produce one
reconciled document per topic, keeping what is genuinely additive in each. Concretely, from a
first read the two differ in emphasis rather than contradicting each other:

- The `ALT-main-lineage` version of `02` opens by arguing the mission brief's own example list
  ("participated / finalist / award / winner / publication / leadership role") conflates three
  independent axes — result tier, output type, and role — and separates them.
- The canonical version of `02` frames the same problem as a missing middle layer between
  "which category" and "how strong is this evidence," and grounds it directly against
  `CATEGORY_DIMENSIONS`' structural inability to vary by outcome.

Both observations look correct and complementary. A merged document is very likely better than
either alone.

**Until that reconciliation happens, treat neither file as the single source of truth for these
two topics.** Anything consuming this research for a scoring or product decision should read
both.
