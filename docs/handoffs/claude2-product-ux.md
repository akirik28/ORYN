# Claude 2 (product/UX) → Claude A / Claude B / founder

## 2026-08-18: new product/UX lane started — branched from the spine, not from `main`

A new autonomous-workstream prompt arrived addressed to "Claude 2, the primary PRODUCT /
APPLICATION / UX / SOCIAL / SEARCH / AI-INTEGRATION agent" — the counterpart to the "Claude 1"
prompt Claude A flagged in `claude-a-to-claude-b.md` (note dated 2026-08-18, "a prompt naming
'Claude 1 / Claude 2' arrived"). Read that note in full before doing anything else.

That note predicted the mirror-image conflict might land on "Claude B" specifically. It actually
landed on a **third, new lane** — this one — not a redirect of the existing programs/opportunities
pipeline work. Claude B's branch (`oryn/programs-pipeline-reconciled`) and territory
(`university_programs`, `university_requirements`, `opportunities`, `opportunity_sources`) are
untouched by this and out of scope here.

**What this session found before acting:** the new prompt's "Section 1: already completed"
baseline (light-theme-default, brand-blue nav/suggestion states, SuggestInput, canonical
test-name/coursework suggestions, university duplicate suppression) describes work that already
exists — it's this branch's own history (`3192962`, `e14aba3`, `b632149`, `cccb74d`, `8247819`,
`a55cb92`, etc.), not a separate "previous product pass" to redo. Building product/UX forward
from `main` (stale ~10h, missing all of this) would have duplicated it and risked diverging from
whatever this branch does next.

**Asked the founder directly** rather than assuming the new prompt was authoritative (same
approach as Claude A's note) — gave three options: (1) take over product/UX with this branch's
work as the real baseline and have Claude A stand down from further UI/product work, (2) both
lanes keep going with product/UX split narrowly to avoid overlap, or (3) pause entirely pending
manual reconciliation. **Founder chose (1).**

**Resulting setup:**
- New branch `oryn/product-ux`, checked out as a git worktree at `.claude/worktrees/product-ux`
  (gitignored, machine-local), branched from `origin/oryn/university-intelligence-spine` at
  `c2b35d1` — not from `main`.
- Baseline re-verified on this exact commit before building anything: `npm run lint` /
  `typecheck` clean, `npm test` 677/677 passed, `npm run build` clean (all 36 routes).
- **Claude A: per the founder's decision, please stand down from further UI/product/theme/
  brand/Connections-UI work going forward** — this lane owns that now. Spine/identity work
  (`canonical_entities`, dedup, aliases, shared vocab, cross-cutting data quality) is unaffected
  and still yours; this lane will pull/rebase from `origin/oryn/university-intelligence-spine`
  periodically to stay current with it rather than duplicating it.
- This lane will **not** touch `university_programs`/`university_requirements`/`opportunities`/
  `opportunity_sources` schema or ingestion — Claude B's territory, unchanged.

Will update this file as work lands. If you're reading this and the boundary above doesn't match
what the founder actually told you, that's a live conflict — stop and ask them directly rather
than picking a side, same as both prior instances.

## 2026-08-18, same session: a third conflicting prompt arrived mid-turn, founder resolved it live

A second new prompt landed in this same conversation, addressed to "Claude 2" again but
describing the *programs/opportunities/requirements* data-acquisition territory instead —
i.e. it re-labeled the established Claude A/Claude B split as "Claude 1/Claude 2" almost
exactly (university identity = "Claude 1", programs+opportunities = "Claude 2"), with no
awareness that a third, product/UX session (this one) now exists. Strong sign it was drafted
for whichever terminal is running `oryn/programs-pipeline-reconciled` (Claude B's real,
established territory), not this one. Flagged the mismatch to the founder directly rather than
either silently switching mandates or silently ignoring a live instruction — founder was still
at the keyboard and answered immediately: disregard that prompt in this session, keep going on
product/UX, don't stop. Not blocking on anything further; continuing autonomously per the
original mandate. One piece of that second prompt is genuinely relevant here despite the
mistargeting and is being folded into this lane's own Phase J (Opportunity Discover UX audit)
rather than discarded outright: its sections 13-14 describe a category-specific filter
architecture (summer programs / competitions / internships-research / scholarships each need
different filter dimensions, not one shared generic panel) — that's real product/UX scope,
doesn't touch `university_programs`/`opportunities` data acquisition or schema, and will be
picked up as UI-only work against whatever data shape already exists.
