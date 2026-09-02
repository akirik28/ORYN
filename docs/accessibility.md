# Accessibility (Phase 46)

Standing status doc for AGENTS.md Phase 46 — keyboard navigation, semantic HTML, labels,
contrast, focus states, accessible dialogs and forms. This is the first version of this
file; it didn't exist before 2026-09-01, even though a substantial pass had already
happened and landed in code. That pass was reported to CEO over chat and never written up
— this document closes that gap and extends the pass into what it didn't cover.

Every finding below says how it was checked: **live** (driven in a real browser this
session), **stub-harness** (driven against a real component mounted on a dev-only
`/design-preview/*` route with a fake, non-writing submit handler — same component as
production, fake backend), or **source** (read, not driven — stated as such, not implied
otherwise). A defect behind a dev-only preview route is flagged as such; it is not reachable
by a real student.

**Environment note that shaped this pass's methodology**: this session's Browser pane ran
backgrounded/hidden throughout (no user watching, overnight autonomous work). Layout
measurement while hidden is a known false-positive trap, worked around with an explicit
`resize_window` call (see [[reference_browser_a11y_testing_gotchas]]). New this pass: with
the pane hidden, `computer` click/key actions silently fail to land at all — no error, no
DOM change, nothing. Confirmed by opening the QuickAddEntry picker via `ref`-based click
and checking `read_page`/`get_page_text` immediately after: no state change. Worked around
by driving interaction through `javascript_tool` instead — real `element.click()` (which
does dispatch a full, React-visible event, unlike `computer`'s OS-level synthetic input)
and `element.focus()` for focus-state tests. This is reliable for confirming *whether* an
interaction fires and *what* state it leaves behind, but is not a perfect stand-in for a
real native Tab keypress — noted per-finding below where that distinction mattered.


## Fixed this pass

**Both "compare" trays had no landmark or accessible name.** `features/opportunities/
opportunity-compare-bar.tsx` and `features/universities/compare-bar.tsx` are near-identical
components (intentionally not shared — see the comment in the opportunities one) that
render a persistent `fixed`-position bar once a student selects 1+ items to compare. Neither
had a `role` or `aria-label` on the bar itself — a screen-reader user had no way to discover
it as a distinct region short of stumbling into it during linear Tab/swipe navigation, and
no way to know what it was once reached beyond its visible text. **Fix**: added
`role="region"` + `aria-label={t("ariaLabel")}` to both, with a new translated key in each
`compareBar` namespace (`messages/en.json` / `messages/tr.json`, both already had the
`selected`/`clear`/`compare` keys — `ariaLabel` follows the exact same pattern
`universities.sortSelect.ariaLabel` already established one section below it). Purely
additive — no visual change, confirmed by the diff being label/role only. Live-verified the
opportunities bar renders and both compare bars share the identical markup shape via source
diff, not independently re-driven (same component, same one-line change, same before/after).

**Did not add `aria-live` to either bar.** The bar's count text changes every time a student
adds/removes a comparison item; an `aria-live="polite"` region would announce every single
click during a fast multi-select session. That's a real UX judgment call (announce each
change vs. only the region's existence), not a clear defect — flagged below, not decided.


## Verified — the dialog focus-guard bug also reproduces on `AlertDialog`, not just `Dialog`

[[project_oryn_accessibility_audit]] already found and tracked (`docs/known-issues.md`,
"Tracking upstream — every Dialog silently loses focus on the first Shift+Tab") that
`components/ui/dialog.tsx`'s `Dialog` wrapper has an upstream Base UI bug: Shift+Tab from
the first focusable element lands on an off-screen focus-guard span and never redirects,
leaving a keyboard user with no visible focus indicator anywhere (Escape still closes the
dialog cleanly, so nobody is stuck — but there's a real window with no indicator at all).
That write-up explicitly inferred (not tested) that every dialog in the app shares it, since
the wrapper has no per-instance customization. CEO's brief for this pass asked for that
inference to actually be checked, dialog by dialog, rather than carried forward untested.

Checking closed the loop faster than expected: **`AlertDialog` and `Dialog` are not two
implementations that happen to behave alike — `AlertDialogPrimitive.Popup` is a verbatim
re-export of the exact same `DialogPopup` module** (`node_modules/@base-ui/react/alert-
dialog/index.parts.mjs`: `export { DialogPopup as Popup } from "../dialog/popup/
DialogPopup.mjs"`, likewise `Backdrop`, `Portal`, `Title`, `Description`, `Close` — only
`Root` and `Trigger` are AlertDialog-specific). There is no separate `alert-dialog/popup/`
directory in the package at all. This is stronger evidence than a click-through could be on
its own: it rules out a per-instance difference by construction, not by observation.

**Also live-confirmed** (stub-harness: a temporary `<AlertDialog open={true}>` mounted on
`/design-preview/quick-add`, tested, then fully reverted — `git diff` confirmed zero net
change before moving on): focusing the "before" guard span (the element real Shift+Tab from
the first focusable element would land on) leaves focus stuck there, polled out to 2.3s, same
signature as the original Dialog finding. **Caveat on the forward direction**: the same
technique applied to the "after" guard (simulating Tab-off-the-last-element) also showed
stuck focus, which would contradict the original finding's confirmed-clean forward direction
for the identical shared module — a contradiction that only makes sense if programmatic
`.focus()` isn't equivalent to a real Tab keypress for this specific guard (plausibly because
the guard's redirect logic reads `event.relatedTarget`, which a real browser populates
differently for native traversal than for a scripted `.focus()` call). Not re-asserting
"forward is also broken" on that basis — noting the discrepancy and deferring to the
already-real-Tab-verified Dialog result, since there is no plausible mechanism for the
identical shared component to differ between two of its own instances.

**Net effect**: every confirmed-destructive-action dialog in the app (`delete-account-
dialog.tsx`, `save-university-button.tsx`'s remove confirmation, and every other
`AlertDialog` call site) carries the same tracked, not-yet-fixed upstream bug as `Dialog`.
No new tracking entry needed — `docs/known-issues.md`'s existing entry already describes the
mechanism and the reasoning for not hand-patching it; this pass's job was confirming scope,
and scope is now "all of them," source-provable, not inferred.

### The other two dialogs CEO named aren't dialogs

Checked before assuming — genuinely useful to have checked, not just process box-ticking:

- **The "not interested" reason picker is a `DropdownMenu` (`@base-ui/react/menu`), not a
  Dialog or AlertDialog.** Different primitive family, not in this bug's blast radius.
  **Live-verified** (`/design-preview/opportunities`, `el.click()` on the "Not interested"
  trigger): opens with correct `role="menu"`, 7 `role="menuitem"` children, `aria-haspopup`
  and `aria-expanded` toggling correctly on the trigger. **Not independently verified this
  pass**: keyboard-driven open-autofocus and Escape-to-close. Both attempts via dispatched
  synthetic events left focus on the trigger rather than reaching the menu's own listeners —
  the same programmatic-vs-real-Tab gap as above, compounded by `computer` key presses not
  landing on the hidden pane at all. Relying on Base UI's own `Menu` implementation for
  these two (unlike the Dialog guard, no known defect, no ORYN customization that could
  introduce one) rather than asserting either way.
- **The "compare tray" is not a modal at all** — a plain `fixed`-position `<div>`
  (`opportunity-compare-bar.tsx` / `compare-bar.tsx`), no Base UI dialog primitive, no focus
  trap of any kind. Its actual gap (missing landmark/label) is fixed above.

Read together, 2 of CEO's 4 named dialogs share the tracked upstream bug (now proven, not
inferred); the other 2 were never in scope for it and had a different, smaller, now-fixed
gap instead.


## Verified clean — forms and errors

**`features/profile/quick-add-entry.tsx` (the "add an achievement" form) already renders
its error with `role="alert"`** (line 131: `{error ? <p role="alert" className="text-sm
text-destructive">{error}</p> : null}`) — the same pattern [[project_oryn_accessibility_audit]]
put on 22 other files. **Live-verified, stub-harness**
(`/design-preview/quick-add`, `SIMULATE_ERROR` toggled to `true` temporarily and reverted
after — `git diff` confirmed zero net change): submitting produces a visible, `role="alert"`
element with the expected text, which fires a screen-reader announcement independent of any
focus movement — that's what `role="alert"` is for, and it works.

**Real `<label htmlFor>` / `<input id>` pairs, live-confirmed** on the same form: `title` and
`organization` both resolved a matching `<label for>` via `document.querySelector`, not just
visual placeholder text standing in for a label.

**What this didn't test, and why, per CEO's explicit instruction**: this sandbox's local dev
points at the same live Supabase project the founder's real account and every quoted `docs/`
metric live in — there is no separate database to write test rows into (`supabase start`
hangs in this environment, see [[reference_local_pgtap_no_docker]]). A full, successful
"add an achievement" submission would write a real `activities` row. **Did not do this.**
The dev-preview harness's `stubCreate` doesn't touch the database at all — it's the real
`QuickAddEntry` component (same file production imports) wired to a fake, logging-only
submit handler, which is why the `role="alert"` / label checks above are trustworthy despite
using it, but it can't test the real Server Action's own field-specific Zod errors or
whether focus moves to a *specific* offending field on a real validation failure — the stub
returns one generic string unrelated to any field, by construction. **Untested, stated as
such rather than inferred**: per-field error targeting and focus movement on the real
Server Action path. Login and onboarding's own forms were checked structurally only (real
`<Label htmlFor>`/`<Input id>` pairs, real `<Button type="submit">`, confirmed via source in
`app/(auth)/_components/login-form.tsx`) — not click-driven this pass, since an actual
sign-in attempt is not a safe no-op action to take on the founder's account and no test
account was available to use instead (signup has an independent, previously-documented
Confirm-Email/rate-limit issue — not re-investigated this pass).

**Opportunity "Save"**: verified reachable and keyboard-activatable, not verified by
completing it, per explicit instruction not to write through to the live opportunity-match
tables. **Source-confirmed**: `features/opportunities/opportunity-card.tsx`'s Save button is
a real `<Button>` (`components/ui/button.tsx` renders `@base-ui/react/button`'s own
`Button` primitive, a real native `<button>` by default — the `nativeButton={false}` escape
hatch used elsewhere in the same file for link-styled-as-button cases is conspicuously absent
here), so it's keyboard-focusable and Enter/Space-activatable without any custom wiring.
Not live-clicked.


## Contrast — light mode (the only reachable theme)

**Dark mode is defined in `globals.css` but structurally unreachable in production** —
`app/layout.tsx`'s own comment: light is "the product's one deliberate default," no
`next-themes` provider is mounted, `<html>` never gets a `.dark` class, and there is no
toggle anywhere in the UI. The `.dark` block's token values were not re-verified this pass;
auditing contrast for a theme no student can currently select would be effort spent on dead
code. Worth a light pass whenever a toggle actually ships, not before.

**Live-measured** (canvas-based `oklch()`/`lab()` → sRGB resolution via `javascript_tool`,
not hand-computed — `getComputedStyle` on this Next.js/Turbopack build serializes computed
colors in their original wide-gamut color space, e.g. `lab(8.83 3.18 -6.72)`, not `rgb()`,
so a plain regex-based reading silently fails; canvas `fillStyle`+`getImageData` normalizes
it reliably) — every real-text token against `--background` and `--muted`:

| Token | vs `--background` | vs `--muted` | Note |
|---|---|---|---|
| `--foreground` (ink-1) | 16.67:1 | 15.72:1 | |
| `--ink-2` | 9.70:1 | 9.14:1 | |
| `--muted-foreground` (ink-3) | 4.89:1 | 4.61:1 | passes AA |
| `--ink-4` | 3.49:1 | 3.29:1 | decorative-only by contract, clears the 3:1 non-text floor — see [[project_oryn_accessibility_audit]] for why this one isn't 4.5:1 on purpose |
| `--destructive` | 6.11:1 | 5.76:1 | |
| `--warning` | 4.90:1 | 4.62:1 | passes AA, tight margin — see below |
| `--brand` | 7.28:1 | 6.87:1 | |

**`--warning` used directly as real text passes AA but with little room.** Two live call
sites found using the raw token (not `StatusBadge`'s own already-darkened override, which
[[project_oryn_accessibility_audit]] confirmed at 7.06:1): `cv-import-flow.tsx:165`
(`text-xs text-warning`, the "unsure about this" flag on a low-confidence CV-import item) and
`universities/[id]/page.tsx:416` (`font-medium text-warning`, the "Gaps" section label,
default text size). Both clear 4.5:1 (4.62–4.90:1 depending on background) — **not a
defect, not fixed** — noting the margin because `StatusBadge` already independently chose to
darken this exact token for the same reason, suggesting whoever wrote that override knew the
raw token runs tight; worth the same treatment if either of these two ever moves to a
smaller size or a warmer background.

**Found and NOT fixed — `--accent`, the dropdown-menu/select focus-and-hover background,
fails WCAG 1.4.11 non-text contrast against the surface it sits on.**
`components/ui/dropdown-menu.tsx`'s `DropdownMenuItem` (and `select.tsx`, the only two
consumers of this token) indicates focus/hover purely via `focus:bg-accent
focus:text-accent-foreground` — no ring, no border, no other cue. Live-measured: `--accent`
(`oklch(0.936 0.015 294.5)`, rgb 234/232/243) against `--popover` (rgb 255/254/253, the
surface `DropdownMenuContent` renders on) is **1.20:1** — nowhere near the 3:1 WCAG 1.4.11
floor for a focus indicator's contrast against its adjacent surface. The text itself is fine
once you're looking at it (`--accent-foreground` vs `--accent` measures 10.11:1) — the
problem is that a sighted keyboard user arrowing through the menu can barely tell which item
is highlighted at all.

Solved for a specific pair of values that clears both constraints at once, live-verified,
not just computed: **`--accent: oklch(0.65 0.02 294.5)`** (3.23:1 against `--popover`) paired
with **`--accent-foreground: oklch(0.25 0.2 272)`** (4.82:1 against the new `--accent`) —
both constraints hold with real margin, not a razor's edge. **Not applied.** This changes
`--accent` from a barely-visible pale wash to a solid, clearly-visible medium-toned fill —
a real, visible change to a shared, named design token used in exactly two places, not an
invisible bug fix. That's a design call, not a mechanical one; the values above are handed
off ready to use if CEO/founder want this exact fix, and a border/left-bar indicator
alongside the current pale wash was considered as a less visually disruptive alternative but
not built (bigger code change, smaller visual change — the opposite trade-off).

**Glass-card (`bg-white/45 backdrop-blur-2xl`) text was not pixel-measured.** Composited/
blurred backgrounds aren't reliably readable via `getComputedStyle` (it reports the
declared color, not the painted composite), and this session's screenshot tool returns blank
frames on a hidden pane, so a visual spot-check wasn't available either. Checked instead by
grepping every `bg-gradient`/background-image usage app-wide for anything saturated or dark
that could sit behind a glass card with body text on it — found none; the only gradients in
the codebase are self-contained card-tint decorations (feature-catalog icon backdrops,
progress-meter fills) that don't underlay any glass-card text region. Combined with the page
background itself already measuring clean above, this is a reasoned inference from source,
not a direct measurement — stated as such.


## Keyboard-only core journey

Sign in → onboarding → add an achievement → dashboard → open an opportunity → save it, per
CEO's brief. Coverage is uneven by design — some steps are safe to fully drive, some aren't,
and this section says which is which rather than presenting one uniform "tested" claim:

1. **Sign in** — source-checked only (real `<label htmlFor>`/`<input id>`, real `<Button
   type="submit">`), not click-driven. See "Verified clean — forms and errors" above for why.
2. **Onboarding** — not driven this pass. Out of time budget for this session; flagged as a
   real gap rather than assumed clean. `features/onboarding/onboarding-wizard.tsx` and its
   `steps/*.tsx` would be the next thing to check.
3. **Add an achievement** — driven, stub-harness, failure path only (see above). The
   success path was not completed against the real database, by design.
4. **Dashboard** — covered by tonight's earlier, separate UI-regression audit pass (real
   `<ul>/<li>`, real headings, `EmptyState` used properly, decorative index numbers correctly
   `aria-hidden`) — not re-driven in this pass, carried forward from that one.
5. **Open an opportunity** — source-confirmed real `<Link>`/anchor-based navigation
   (`opportunity-card.tsx`), natively keyboard-operable, not click-driven this pass.
6. **Save it** — reachability and native keyboard-operability confirmed via source (see
   above); the actual save was not completed, per explicit instruction not to write through
   to live opportunity-match/save tables on the shared database.

**Real native Tab-key traversal across this journey was not driven end-to-end.** `computer`
key presses did not land on the hidden Browser pane this session (see the environment note
at the top), and the fallback — dispatching synthetic events via `javascript_tool` — cannot
replicate the browser's own Tab-focus-traversal algorithm (that's engine-internal, not
something a script can trigger the way a real keypress does). What this pass could and did
check instead, comprehensively: **every interactive control along this journey is a real
native-focusable element** (`<button>`, `<a>`, `<input>`, or a `Button`/`Link`-rendered
equivalent — not a `<div>`/`<span>` with an `onClick`, the pattern that actually breaks
keyboard reachability). [[project_oryn_accessibility_audit]] already ran this exact check
app-wide (`grep -lE "<(span|g|circle|text|li|tr|td)[^>]*onClick"`) and found exactly one
offender, `world-map-explorer.tsx` — not on this journey, and already an explicit CEO-called
backlog item, not re-litigated here. Given that sweep already covers the whole codebase and
this pass's own per-component checks above didn't turn up a second instance, there's good
reason to expect the journey is keyboard-completable — but "reason to expect" is being
stated as exactly that, not upgraded to "confirmed," because the one thing that would
confirm it (a real Tab-key walkthrough) is what this session's tooling couldn't do.


## Carried forward, not re-verified this pass

[[project_oryn_accessibility_audit]]'s three fixed-and-merged findings (`role="alert"` on
22 error-rendering files, the `minorPlaceholderNote` and `ink-4` contrast fixes) are live in
`main` (`6a76baa2`) and not re-checked here. Its one backlog item (`world-map-explorer.tsx`'s
unkeyboardable SVG markers, explicit CEO call to skip) is still backlog, still real, still
has the fix sketched in that memory if anyone picks it up. The dialog close (×) button
sitting last in tab order regardless of its top-right visual position
(`components/ui/dialog.tsx` / `alert-dialog.tsx`, documented in `docs/known-issues.md`) is
still unfixed — considered again this pass and left alone: moving it earlier in the DOM to
fix tab order would also change which element auto-focuses when the dialog opens (Base UI's
auto-focus targets the first tabbable descendant), and `DialogContent` is a shared primitive
used by 11 different call sites, each with a different "right" first-focus target — fixing
tab order without breaking auto-focus needs a per-instance `initialFocus` decision this pass
didn't have the scope to make 11 times over. Flagged, not fixed, same as before.


## What's still open after this pass

- Onboarding's keyboard path — not driven.
- A real Tab-keypress walkthrough of the full journey — blocked by this session's tooling
  (see above), not by anything in the product. Worth an hour with a visible/foregrounded
  pane, or a human, rather than more time spent working around a hidden-pane limitation.
  **Update, 2026-09-02: the specific thing this gap was blocking — a real-keypress
  confirmation of the dialog focus-guard bug — is now closed.** A visible, authenticated
  pane became available; a genuine `Shift+Tab` (not `.focus()`) on `upload-evidence-dialog.tsx`
  reproduced the exact documented signature. Full account in `docs/known-issues.md`'s
  focus-guard entry. This doesn't close the item above in general — the full six-step
  journey still hasn't been Tab-walked end to end, and this same pass's own pane went
  hidden again partway through, blocking a live re-check of `AlertDialog` specifically —
  but the one piece of this gap with real product-safety weight (is the reported trap
  real, on a real keypress) now has a real answer.
- The `--accent` non-text-contrast fix — values ready, needs a design call (see above).
- `aria-live` on the compare bars — real judgment call, not decided (see above).
- Field-specific validation-error focus movement on the real (non-stub) achievement form —
  can't test without either a safe test account or accepting a real write; neither was
  available this pass.
