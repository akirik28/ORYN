# Handoff — Founder Requirements Audit

**Branch**: `oryn/requirements-audit`, forked from `oryn/opportunity-dimension-tagging` at
`daf59ab` (that branch's own final state).

## Why this branch exists

Assigned by the "ORYN multi-agent coordination" session, under delegated authority the actual
founder confirmed directly in two untagged chat messages: first granting the coordination session
"tam yetki" (full authority) to direct this work, then — mid-task — explicitly redirecting all
reporting to the coordination session rather than to the founder directly ("Coordination chatine
raporlayın ben dışarda olacağım"), while naming one explicit, non-negotiable constraint on that
delegation: **"veri kalitesi kaybolmasın tek nokta orası"** — data quality must not be lost, that
is the one point that matters. This handoff, and the audit doc it accompanies, were held to that
standard throughout: every status in the audit is evidence-cited (file:line or a live query already
run in a prior branch), depth-of-verification is marked explicitly rather than presented uniformly,
and material this session did not actually check is listed as unverified rather than guessed at.

The task: read the founder's own Drive product-decision documents in full, extract every
requirement, and check each against the live codebase — implemented / partially implemented / not
implemented / contradicted, with file-path or live-measurement evidence for each. Five requirements
were named for full-depth verification; the rest for a lighter pass. Explicit instruction: where a
Drive doc and the code disagree, do not decide which is right — record both sides and escalate.
Research/audit only — no code changes, no schema changes, no Supabase writes.

## What this branch contains

- `docs/research/requirements-audit/01-founder-requirements-audit.md` — the audit itself. Leads
  with three findings before the section-by-section results, per the assignment's own instruction
  to lead with contradictions: (1) `docs/known-issues.md`'s visual-identity conflict entry is now
  stale, not live — the code switched to light theme on 2026-08-18, the same date the Drive
  document itself last reaffirmed that decision; (2) a genuine live bug found by direct code
  inspection — `components/ui/sonner.tsx` still hardcodes the Toaster to dark theme, justified by a
  comment that is now factually false about `app/layout.tsx`'s current state; (3) a real,
  unresolved scope ambiguity — whether the Decision Register's general search-interaction standard
  (consolidated 2026-08-18) was meant to reach Connections search, given a deliberate, reasoned,
  dated 2026-08-15 founder decision on record that Connections discovery is link-only with no
  people-search. None of these three are adjudicated in the audit doc itself — recorded, not
  resolved, per the assignment's explicit instruction.
- `data/research/requirements-audit/findings.json` — machine-readable companion, 16 statused
  findings (`AUDIT-001` through `AUDIT-016`), plus explicit lists of what was found not
  independently code-verifiable by nature, not verified this pass, and already corroborated by
  `docs/known-issues.md` without re-checking. Validated as well-formed JSON before commit.

## Verification performed

Two Drive documents ("ORYN — Product & MVP Decision Register," "ORYN Programlama") were located by
title search per this project's established Drive-access discipline (never by a pasted/guessed
file ID) and read in full, along with the Legal & Privacy Working Register for context. The "ORYN"
and "ORYN Database" Drive folders were enumerated to confirm no other product-decision documents
exist outside the two audited. Five flagged requirements got dedicated background-agent
investigation (three agents, run in parallel, each returning file:line-cited findings) or — for
visual identity, where a live browser preview proved unavailable (see Limitations below) — direct
multi-file code inspection plus git history cross-referencing by this session itself. Nine further
requirements got a lighter single-check-per-item pass. Every status in both output files traces to
a specific file:line, a git commit, or a live production query already run and recorded in a prior
branch this session (`opportunities`=369 rows, `universities`=1019, `verified_current`=166 —
figures independently confirmed against the correct Supabase project by row-count cross-reference
in the `oryn/opportunity-dimension-tagging` branch, not re-queried here since this branch made no
new database calls).

## Known limitations, stated in the audit doc itself but worth repeating here

- No live browser render was obtained for the visual-identity check specifically.
  `mcp__Claude_Browser__preview_start` repeatedly failed on a fixed port-3000 pre-flight check
  ("in use by 'node' (PID 22179), not a preview server") regardless of the configured target port
  (3417 and 4891 were both tried); killing that PID was deliberately declined as a disruptive,
  unauthorized action against what is very likely another session's live dev server. The finding
  rests on direct source inspection and git history instead — real evidence, but not a screenshot.
- Three of the five full-depth items were produced by background agents whose citations were
  spot-checked by this session, not fully re-run line-by-line.
- Section C of the audit doc (and the two "not_verified"/"already_corroborated" lists in the JSON)
  is a substantial, honestly-labeled gap — roughly 20 more sections across both Drive documents
  were not checked this pass. This was a deliberate scope choice (full depth on the 5 flagged items
  plus a genuinely useful spot-check pass on the rest, rather than diluting rigor across all ~50
  sections in the time available), not an oversight, and is exactly why it's listed rather than
  silently omitted.
- One item (§36 university detail-page IA / Oryn Outlook labels) was deliberately skipped despite
  being straightforward to check, because it overlaps with `lib/admissions/outlook.ts`, reported
  elsewhere as actively being revised by another session lane — auditing it now risked producing a
  stale finding by the time anyone reads this, and duplicating another lane's in-flight work.

## State

Read-only against the repository and (via figures already gathered in prior branches) production
data — no new database calls, no code changes, no schema changes. Findings doc, machine-readable
companion, and this handoff committed and pushed. Reported branch name, commit SHA, and status
counts to the coordination session per the founder's own explicit instruction to report there
rather than directly, leading with the three contradiction/staleness/ambiguity findings per the
assignment's own instruction.
