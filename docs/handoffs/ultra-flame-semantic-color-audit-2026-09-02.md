# Ultra-flame semantic-color audit — 2026-09-02

CEO's ask ahead of oryn-4e's live `[data-tier="ultra"]` flame edit: every color carrying
meaning (destructive, deadline urgency, error/validation, verification-status, match-tier,
good/warning/critical) — what follows the flip, what independently collides with flame by
hue. Read-only, report don't fix. Full report: `docs/ultra-flame-semantic-color-audit-2026-09-02.md`.

## Headline

Mechanism check first, since it reframes the whole ask: `[data-tier="ultra"]` as it stands
today overrides only `--tier-accent`/`--tier-grad-1/2/3`/`--tier-glow` — **not**
`--brand-primary`. A dedicated, already-scoped token family already exists for Ultra-only
flame color. Worth 4e/CEO confirming explicitly whether the plan is to extend that existing
family or to newly override `--brand-primary` itself — the latter pulls in everything below.

**Top finding**: `features/dashboard/profile-signal.tsx`'s `developing`/`emerging` profile-
dimension tones use `bg-brand-primary` with an explicit code comment explaining *why*: chosen
over warning-amber specifically because amber read as alarming for a non-problem state
("Amber here is what turned a thin profile into a page of red flags"). Flame is warmer and
closer to the error hue family than amber ever was — this doesn't just recolor the component,
it reverses the documented reason the color was chosen.

**Second finding**: `--destructive`/`--error` (one literally-aliased token driving the delete
button, the account-deletion dialog, the 3-day deadline tier, "Extreme Reach" outlook,
"Rejected" applications, and "Not met" requirements) sits only **3.3-6.1° of OKLCH hue** from
flame red (`#e8342c`, computed at H=28.3°). Fully independent of `--brand-primary` — invisible
to a code-derivation read — but visually nearly the same color family as Ultra's own red the
moment flame ships. This is CEO's named "collision" concern, precisely quantified.

**Third**: three status ramps (deadline urgency, admission outlook, application/requirement
status) each embed a `"brand"` tone as their *middle* tier, flanked by fixed error/warning/
success steps. If only the brand tone moves, each ramp's visual ordering may invert (a
14-day deadline or "Competitive" outlook reading hotter than the more-urgent step next to it).

**Clean**: verification-status badges (`evidence_added`/`verified`/`verification_rejected`)
use only neutral/success tones — zero `"brand"` usage, unaffected by either risk mechanism.
`--success` and `--info` are both hue-independent and far from flame. `--warning` is the
closest of the "safe" tokens to flame (27-31° gap) — provisionally fine, not zero-risk.

One pre-existing, unconfirmed-in-browser note (Category D in the full report): `EvidenceSignal`
already layers `.tier-grad-text` over `text-success`/`text-ink-1` for two of its three states;
whether the gradient visually wins is the same open cascade question `globals.css`'s own
"KNOWN ISSUE" comment documents for a sibling class. Not reproduced this pass — flagged as a
30-second visual check worth doing once flame is live, not a confirmed bug.

Also folded into this branch: the `lib/requirements/shape-audit.ts` stale-comment correction
from last pass's unwritten-columns sweep (docs/unwritten-columns-sweep-2026-09-02.md finding
#2) — a dated "STATUS, corrected" note above the `is_exclusion` finding's `lossIfWritten`
string, same treatment as the ten migration headers earlier tonight. Comment-only, verified via
`git diff | grep -E "^[+-]"` showing no non-comment lines changed.

## Gates

`npm run typecheck` / `npm run lint` / `npm run test` — see commit. No `next build` per current
policy. No `npm ci`/`npm install` in this worktree — symlinked `node_modules` from the main
checkout. Zero `app/globals.css` edits, per CEO's explicit read-only/report-only constraint.
