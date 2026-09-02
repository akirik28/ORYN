# Dialog focus-guard bug — reproduced live with a real keypress, still not contained to fix

**Status:** documentation only, no code change. Gates green (typecheck/lint; no test/build
impact — nothing under test coverage was touched). **Author lane:** oryn (this session), at
oryn-a7's request. **Branch:** `oryn/focus-trap-repro-2026-09-02`.

## The ask

A focus-trap bug was found and tracked (`docs/known-issues.md`, 2026-09-01) but never fixed,
and never confirmed with a real keypress — every prior check used programmatic `.focus()`
against a stub harness, because the session's Browser pane ran hidden throughout both
accessibility passes. Reproduce it live now that an authenticated dev server is reachable,
check for new dialogs since, and decide whether a contained fix exists.

## What was confirmed live

Read `docs/accessibility.md` and `docs/known-issues.md`'s existing entry first, per
instruction, rather than reproducing blind. Attached to the already-running dev server
(`preview_start {url: "http://localhost:3000"}`, did not kill or restart it), reused an
existing `oryn.qa.b` session already signed in.

Opened `upload-evidence-dialog.tsx` (`/documents` → "Kanıt ekle") — a plain `Dialog`, not
`AlertDialog`. Focus auto-landed on the first control. A real `Shift+Tab` keypress (the
`computer` tool, not `javascript_tool`'s `.focus()`) moved focus to
`<span data-base-ui-focus-guard aria-hidden="true">`, clipped to 1px, exactly the previously
documented signature — held there through a 2-second poll. `Escape` closed the dialog
cleanly and returned focus to the trigger button. This matches the original finding exactly,
now with a real keypress behind it rather than a stub-harness inference.

**Could not close the equivalent gap for `AlertDialog`.** The Browser pane went hidden
mid-session (`document.visibilityState: "hidden"`, checked directly) while navigating to
`delete-account-dialog.tsx`, and stayed hidden through several waits — the same failure mode
both prior passes hit, this time only partway through rather than for the whole session.
`computer` key events are documented as unreliable in that state; didn't report a result I
couldn't trust. `AlertDialog`'s coverage stays at the accessibility.md's own strong
structural proof (`AlertDialogPrimitive.Popup` is a verbatim re-export of the identical
`DialogPopup` module) — real, just not independently re-confirmed with a keypress this pass.

## What's new since the last audit: nothing

Grepped every file rendering `Dialog`/`AlertDialog` fresh (13 total) and checked each one's
creation date against git history. All 13 predate both accessibility passes — the newest,
`quick-add-entry.tsx`, is from 2026-08-29, two days before the first pass. `components/ui/
dialog.tsx` and `alert-dialog.tsx` themselves are also unchanged since 2026-08-29.
`@base-ui/react` is still `1.7.0` — still the latest published version per `npm view`, so
there's no upstream release to adopt yet either.

## The decision: still not a contained fix

Re-derived this rather than accepting the prior pass's conclusion by default. Considered a
narrower intervention than the previously-rejected dialog-wide keydown handler — an `onFocus`
listener on the guard span itself, firing only when that specific known-problematic element
receives focus, rather than intercepting every `Shift+Tab` press dialog-wide. The narrower
trigger doesn't change the actual risk: whichever way it fires, the handler still has to
compute "the last tabbable element in this dialog's current content" correctly, and that's
genuinely hard to get right across roughly 13 heterogeneous dialog bodies — several nest
their own complex interactive primitives (a Base UI `Select` inside
`upload-evidence-dialog.tsx` itself, confirmed live this pass) that may manage focus or
render through their own portals in ways a generic computation can't safely assume.
Verifying a patch doesn't subtly break a different dialog needs live keyboard coverage of
all of them in one sitting — exactly what this session's pane-visibility trouble made
impossible to deliver today, which is itself evidence for why "looks correct on the one
dialog it's tested against, breaks subtly in another" (the prior pass's own risk framing)
is a real risk here, not just caution for its own sake.

**Not fixed. Tracking maintained in `docs/known-issues.md`**, updated in place with today's
live confirmation rather than filed as a new entry — this is the same bug, better evidenced,
not a new finding. The founder/CEO's standing choice (file upstream using the existing
from-scratch minimal repro, or wait for a Base UI release) is unchanged by anything found
today.

## What this deliberately did not do

- No code change to `components/ui/dialog.tsx`, `alert-dialog.tsx`, or any dialog call
  site — the decision above is precisely "don't," not "ran out of time to."
- No attempt to Tab-walk the full six-step keyboard journey `docs/accessibility.md`'s own
  "what's still open" list names — that's a broader, separate gap than what this task asked
  about; closed the one piece with real product-safety weight (is the reported trap real on
  a real keypress), not the whole list.
- No re-verification of the `--accent` contrast fix, `aria-live` on compare bars, or any
  other item in `docs/accessibility.md`'s open list — out of scope for this specific ask.

## Verification

```
typecheck   clean
lint        clean
```

No test or build impact — no source file was touched, only `docs/known-issues.md` and
`docs/accessibility.md`.
