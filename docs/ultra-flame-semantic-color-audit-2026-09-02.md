# Ultra-flame semantic-color audit — 2026-09-02

CEO's ask, relaying the founder's own words: **"premiumun ana rengi alev olacak… maviyi
boşver"** ("premium's main color will be flame... forget about blue"). Before oryn-4e wires
the flame palette (`#ff7a1a` orange / `#e8342c` red) into `[data-tier="ultra"]`, find every
color in the codebase that carries **meaning** rather than decoration — destructive/delete,
deadline urgency, error/validation, verification-status, match-tier, good/warning/critical —
and flag (a) what mechanically follows the flip and (b) what stays independent but becomes
visually confusable with flame anyway. **Read-only. A protection list for 4e, not an edit.**

Branch: `oryn/ultra-flame-semantic-audit-2026-09-02`, off `002dd6af`.

## Mechanism check first — this changes the framing

`[data-tier="ultra"]` (`app/globals.css:588-598`), as the code stands right now, overrides
exactly six custom properties: `--tier-accent`, `--tier-accent-strong`, `--tier-grad-1/2/3`,
`--tier-glow`. It does **not** touch `--brand-primary` or any of its
`-hover/-strong/-soft/-subtle/-border` derivatives — those stay indigo even under
`data-tier="ultra"` today. The Ultra-only flame identity already has its own dedicated,
scoped token family (`--tier-*`), built for exactly this purpose (`globals.css:567-571`:
*"Tokens, not hardcoded colors: any component that reads var(--tier-accent) ... already
works correctly today"*).

So "override `--brand-primary` inside `[data-tier="ultra"]`" (as relayed) would be a **new**
mechanism, not an extension of the existing one. Worth confirming explicitly with 4e before
they build it: if flame goes in by redefining `--brand-primary` itself, every item in Category
A below moves, including several that were never designed to be Ultra-tier-aware at all. If
flame instead goes in by widening which components read `--tier-accent` (already flame-scoped,
already isolated), Category A shrinks to only the call sites 4e deliberately migrates. Not my
call to make — flagging because it's the single highest-leverage thing to settle before either
implementation starts.

## Category A — mechanically follows a `--brand-primary` override, if that's the mechanism

### A1. `features/dashboard/profile-signal.tsx:40-43` — the Phase 6/7 dimension spectrum. Top priority.

```ts
const STATE_TONE: Record<EvidenceState, string> = {
  strong: "bg-success",
  developing: "bg-brand-primary",
  // Brand, not warning: "a good next area to strengthen" is a direction, not an alarm.
  // Amber here is what turned a thin profile into a page of red flags.
  emerging: "bg-brand-primary/60",
  ...
```

This is the Academics/Leadership/Research/etc. strength spectrum from the dashboard's
Profile Signal block. The file's **own comment** documents a deliberate design decision:
`developing`/`emerging` were moved from warning-amber to brand-indigo *specifically because*
amber read as alarming for a state that just means "still building evidence here, not a
problem." Flame (H≈29-49°, warmer and closer to the error/destructive hue family — see A2/B1
below — than amber ever was) would flip two of this component's four states back toward
reading as alarm, the exact failure mode this comment says was already tried and rejected.
This is the one finding in this audit that isn't just "a color changes" — it inverts a
stated intent.

### A2. `components/oryn/status-badge.tsx:8` — `TONE_CLASS.brand` and `components/oryn/eyebrow.tsx:66` — `ruleTone.brand`

Both resolve to `border-brand-primary-border bg-brand-primary-soft text-brand-primary-strong`
/ `bg-brand-primary` directly. Every `tone="brand"` call site follows. The ones that carry
real meaning, not just identity:

- **`components/oryn/deadline-badge.tsx:7-12`** — the 3/7/14/30-day urgency ladder CEO named:
  `<=3 → "error"`, `<=7 → "warning"`, `<=14 → "brand"`, `else → "neutral"`. Only the 14-day
  mid-tier would move. The two more-urgent tiers (error, warning) stay fixed — so a
  14-days-left deadline in flame-orange sits one step away from a 7-days-left deadline in
  plain amber, and flame is the more saturated, more attention-grabbing color of the two.
  Worth a visual check on whether "less urgent" ends up reading as "more urgent."
- **`features/universities/outlook-badge.tsx:17-24`** — `OUTLOOK_TONE.competitive: "brand"`,
  sitting inside the full admission-outlook ramp: `extreme_reach: error, reach: warning,
  competitive: brand, strong/likely: success`. This is the exact "Bocconi — Competitive"
  homepage example from the product spec. Same ramp-inversion risk as the deadline badge,
  higher stakes: a "Competitive" outlook (middle of the scale) in flame could visually read
  hotter than a "Reach" outlook (one step worse) in amber.
- **`features/applications/applications-view.tsx:14-23`** — `APPLICATION_STATUS_TONE.in_progress:
  "brand"`, same ramp shape (`rejected: error, under_review/waitlisted: warning, accepted:
  success`). Lower stakes than outlook — "in progress" isn't a good/bad judgment the way
  outlook is — but the same visual mechanism.
- **`features/applications/requirement-checklist.tsx:62`** — `requirement.status ===
  "in_progress" && "text-brand-primary"`, a second, independent call site of the identical
  "in_progress = brand" pattern, applied directly rather than through `StatusBadge` — a
  token-level fix to `StatusBadge` alone would not reach this one.
- **`features/opportunities/opportunity-card.tsx:314`** — `<Eyebrow tone="brand"
  ultra={matchScore >= 80}>` — the match-tier label. This one is **already Ultra-aware by
  design**: it layers `.tier-grad-fill`/`.tier-glow-sm` (the `--tier-accent` chain, already
  flame-scoped) on top of the brand tone specifically for high-confidence (≥80) matches. If
  `--brand-primary` itself also moves, this becomes doubly flame — likely fine, since flourish
  here is the intended product behavior, not an accident. Flagging so it isn't mistaken for a
  new risk when it's the one deliberately-built exception.
- Lower-risk `tone="brand"` uses (no ramp, no risk semantics, identity only): `next-move.tsx`
  (dashboard recommendation-section eyebrow), `cv-import-flow.tsx` ("review before adding"),
  `journey-timeline.tsx` (portfolio story-type marker), `[id]/page.tsx` category label,
  `u/[id]/page.tsx` "looking for" label. Fine to let these follow.

### A3. Everything else reading `bg-brand-primary`/`text-brand-primary`/`border-brand-primary*` directly

~70 call sites across `app/` and `features/` (links, active tab/pill states, avatar
fallbacks, focus rings, CTA accents). Grepped in full; none of the rest carry risk/status
meaning — they're the site's one accent color doing exactly the identity job CEO said is fine
to follow. Not itemized individually here since none change this audit's conclusion.

## Category B — independent tokens, unrelated to `--brand-primary`, that collide with flame by hue

Computed precisely (sRGB → OKLCH), not eyeballed, because this is the direction CEO called
out as the one code-reading alone won't catch:

| Token | Hue | Flame reference | Gap |
|---|---|---|---|
| `--destructive` / `--error` (light) | 25.0° | `--tier-accent-strong` #e8342c → **28.3°** | **3.3°** |
| `--destructive` / `--error` (dark) | 22.2° | same | **6.1°** |
| `--module-action-fg` | 45° | `--tier-accent` #ff7a1a → **48.9°** | **3.9°** |
| `--accent-clay` | 55° | same | 6° |
| `--warning` (light/dark) | 76° / 80° | flame orange 48.9° | 27-31° |
| `--tier-grad-1` (flame's own light stop, #ffc24a) | **80.9°** | `--warning` 76° | ~5° |

### B1. `--destructive` / `--error` vs. flame red — the highest-impact collision, because it's one root token feeding six surfaces

`--error: var(--destructive)` — literally aliased, both light and dark theme
(`globals.css:251, 340`). Not just close in hue to flame red, *the same token* drives:

- `components/ui/button.tsx` / `badge.tsx` `destructive` variant — the actual delete/destroy
  button styling CEO's example named directly.
- `features/settings/delete-account-dialog.tsx` — account deletion, the single most
  irreversible action in the product, styled via that same `variant="destructive"`.
- `deadline-badge.tsx`'s 3-day "error" tier (the *most* urgent deadline state).
- `outlook-badge.tsx`'s `extreme_reach` (the *worst* admission outlook).
- `applications-view.tsx`'s `rejected` status.
- `requirement-evaluation-badge.tsx`'s `not_met` status.

None of these derive from `--brand-primary` — by a pure code read, they look safe. But their
red currently reads as unambiguously "stop / danger / negative" partly *because* it sits far
from the brand's indigo (H 272°). Once flame red (H 28.3°) is the product's own signature
color, all six of the above sit only 3-6° from it — on Ultra tier specifically, "this is
destructive" and "this is your premium tier's own brand color" become nearly the same hue,
differentiated mainly by lightness/chroma rather than the hue difference that currently does
the work. This is the literal version of CEO's "a delete button turning the same orange as
the theme" concern, just red instead of orange, and it's already latent in the codebase today
— nothing new has to break for it to become a problem the moment flame ships.

### B2. `--module-action-fg` vs. flame orange

One of four "module tone" surfaces (`insight`/`evidence`/`recommendation`/`action`) whose own
file comment states their purpose: *"a reader can tell an interpretation from a piece of
evidence from a directive without reading a label."* At 3.9° separation from flame orange,
whatever content sits on the "action" (AI-directive) module surface risks losing that
distinction specifically on Ultra tier, where flame is everywhere else too. Lower stakes than
B1 (not a safety signal, a legibility/distinction one) but same mechanism.

### B3. Ultra's own gradient vs. `--warning`

Not a `--brand-primary` risk at all, an internal note for 4e: `--tier-grad-1` (`#ffc24a`, the
light end of Ultra's own three-stop gradient) sits only ~5° from `--warning`. Ultra's gradient
already spans a hue range that grazes both the warning token (light end) and the
destructive/error token (dark end, via `--tier-accent-strong`). Worth knowing when placing the
gradient near an actual warning or error badge on the same screen.

### B4. Lower-priority: placeholder tints, `--accent-clay`

`[data-tint="3"]` (hue 20°) and `[data-tint="4"]` (hue 55°) — the deterministic-per-id
decorative wash on un-imaged cards (`lib/ui/placeholder-tint.ts`) — sit within 8° and 6° of
flame red/orange respectively. Purely decorative, not a meaning risk, but a flame-tinted
placeholder card on Ultra tier could look like it's trying to signal something it isn't.
`--accent-clay` (hue 55°, used decoratively; call sites not traced in this pass) has the same
6° proximity to flame orange as the tint check above.

### B5. Not a collision, but a related mismatch worth knowing: `--ring`

`--ring: oklch(0.6 0.2 272)` (`globals.css:42`) is a **literal** value, not `var(--brand-primary)`
— it currently matches brand's hue (272°) by construction, not by reference. It will not move
if `--brand-primary` changes. Post-flip, every focus ring in the product would stay indigo
while brand elements turn flame — not a safety issue, but a visible inconsistency worth a
one-line decision (update `--ring` too, or leave it — both are defensible, neither is free).

## Category C — checked and confirmed safe, no action needed

- **Verification-status treatment** (`lib/profile/evidence-status-presentation.ts`) —
  `evidence_added`/`verification_rejected` → `neutral`; `verified` → `success` (the *only*
  success-toned state in that mapping, deliberately, per its own comment). No `"brand"` tone
  anywhere in this mapping — verification status is entirely unaffected by the flip, by either
  mechanism (direct derivation or hue collision). This is the one category CEO named that
  comes back clean.
- **`--success`** (H 160°/152°, green) — `strong`/`likely` outlook, `accepted` application,
  `met` requirement, `verified` evidence. Independent of brand-primary and far from both flame
  hues. Safe.
- **`--warning`** (H 76°/80°) — furthest of the checked semantic tokens from flame (27-31°
  separation). Independent. Provisionally safe — the largest gap found, but not zero, so worth
  a glance rather than a guarantee.
- **`--info`** (H 216°, blue) — far from flame in both directions. Safe.

## Category D — a pre-existing mechanism issue, not caused by this change, but worth a look once flame ships

`components/oryn/evidence-signal.tsx`'s `valueTone` map applies `.tier-grad-text`
(`background-clip: text; color: transparent`, `globals.css:609-615`) **alongside** a semantic
text-color class on the same element, for two of its three states:

```ts
const valueTone = {
  neutral: "text-ink-1 tier-grad-text",
  positive: "text-success tier-grad-text",
  missing: "text-ink-3",
}[tone];
```

Whether `.tier-grad-text`'s `color: transparent` visually wins over `text-success`/`text-ink-1`
on the same element is exactly the kind of cascade behavior `globals.css`'s own **"KNOWN
ISSUE, not resolved tonight"** comment (line ~617) documents as unreliable for the sibling
`.tier-grad-fill` class — confirmed live there that even an inline `!important` failed to
change the computed color. I did not reproduce this in a browser this pass (out of scope for
a read-only, no-build audit), so this is flagged as **worth a 30-second visual check**, not a
confirmed bug. If the gradient does win, a `positive` evidence value (something favorable) and
a `neutral` one (a plain fact) already render identically on Ultra tier today, using the
*current* indigo gradient — pre-existing, not introduced by this change. What does change: the
current gradient is close to the surrounding indigo brand palette and easy to miss; flame's
higher chroma will make the same collision far more visually loud and celebratory-looking,
which is a worse look for a merely-neutral fact ("0 verified research projects" rendering in
triumphant flame gradient) than today's quieter version.

## What this audit did not check

- No inline/arbitrary hardcoded hex or oklch colors exist outside `globals.css` for anything
  semantic — grepped the full `app/`/`features/`/`components/` tree for
  `(text|bg|border|ring|fill|stroke)-[#...]` and `-[oklch(...)]` / `-[rgb(...)]` arbitrary
  Tailwind values; zero matches. Everything semantic routes through a named token. This is
  good news structurally — it means this audit's token-level findings above are the complete
  picture, not a sample of a larger, ungreppable population.
- Did not open every one of the ~70 plain `brand-primary` identity call sites individually
  beyond confirming none carry risk/status semantics by name and context.
- No browser rendering was done — every hue value above is a computed OKLCH conversion from
  the literal color values in source (script and method in the handoff doc), not a visual
  screenshot comparison. Category D explicitly flags where a real render would settle an
  open question this pass couldn't.
- `--accent-clay`'s and `--accent-sand`'s actual call sites were not traced individually:
  flagged by hue proximity alone (B4), not confirmed to carry meaning.

## Bottom line for 4e

Protect, in priority order: **(1)** `profile-signal.tsx`'s `developing`/`emerging` tones —
this one actively reverses a documented design decision, not just a repaint; **(2)**
`--destructive`/`--error` and everything reading it (button/badge `destructive` variant,
delete-account dialog, 3-day deadline, extreme-reach outlook, rejected application, not-met
requirement) — independent of the flip mechanically, but only 3-6° of hue away from flame red
already; **(3)** the three ramp-embedded `"brand"` tones (14-day deadline, competitive
outlook, in-progress application/requirement) — confirm the ramp still reads in the intended
order after the change, don't just confirm each color individually looks fine in isolation.
Confirmed clean and requiring no action: verification-status badges, `--success`, `--info`,
and (provisionally) `--warning`.
