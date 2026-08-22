# FEAT-2 error-surfacing audit — 2026-08-22

Package 4. Package 1's audit (`docs/feat2-loop-audit-2026-08-22.md`) found the `/plan`
page's "Generate my plan" button discarding a correct, complete server error string; UI-1
independently found the same pattern from the button side and is fixing it (separate PR).
This package answers ORYN-CEO's follow-up question directly: **does that pattern — a
Server Action returning a good `{ error: string }`, no client surface rendering it —
repeat anywhere else in FEAT-2's territory?**

Audit only. Nothing fixed here — findings below, ranked, for CEO to sequence.

## Method

Every Server Action file in my territory (`app/(app)/plan/actions.ts`,
`app/(app)/applications/actions.ts`, `app/(app)/notifications/actions.ts`, the Goals
actions in `app/(app)/profile/actions.ts`, and the time-budget/busy-mode actions in
`app/(app)/settings/actions.ts`), cross-referenced against every client call site
(`grep`-verified, not assumed) to check two things: does the action itself return a real,
human-readable error string on failure — and does its caller actually render it.

Measured against `origin/main` @ `c3d1fc0` (re-fetched once more during this pass to
confirm currency — main moved twice in the hour before I started).

## What does NOT have this problem (checked, not assumed)

- `features/applications/requirement-checklist.tsx` (`updateRequirementStatus`) — `if
  (result.error) toast.error(result.error)`.
- `features/applications/status-control.tsx` (`updateApplicationStatus`) — the strongest
  pattern in the codebase: optimistic update, **rollback on failure**, then `toast.error`.
  This is the reference implementation any fix here should copy, not reinvent.
- `features/applications/new-application-dialog.tsx` (`createApplication`) — inline dialog
  error message, correctly rendered.
- `features/settings/capacity-form.tsx` (`updateTimeBudget`, `updateBusyMode`) — inline
  per-field error message, correctly rendered.

Four real, correct precedents already exist in this exact territory. Whoever fixes the
findings below doesn't need to invent a pattern, only apply one of these two (simple inline
message, or optimistic-plus-rollback where the UI updates before the round-trip completes).

## Findings, ranked by severity

### 1. `features/dashboard/weekly-focus.tsx` — `updateActionStatus`, two call sites

```tsx
function toggle() {
  const nextStatus = isDone ? "not_started" : "completed";
  setLocalStatus(nextStatus);              // <- optimistic, unconditional
  ...
  startTransition(async () => {
    await updateActionStatus({ actionId: action.id, status: nextStatus });  // <- result discarded
  });
}

function saveReflection(outcome: ReflectionOutcome) {
  startTransition(async () => {
    await updateActionStatus({ actionId: action.id, status: "completed", reflectionOutcome: outcome });
  });
  ...
}
```

**Worse than a silent failure — an incorrect success claim.** `toggle()` sets
`localStatus` to `"completed"` synchronously, before the network round-trip even starts.
If the server write then fails (RLS denial, transient DB error, a stale `actionId` from a
plan that got regenerated mid-session), the checkbox stays showing done/checked
indefinitely — the UI actively tells the student their action completed when the database
never recorded it. `updateActionStatus` (`app/(app)/plan/actions.ts`) already returns
`{ error: "Couldn't update that action. Please try again." }` on exactly this failure —
the message exists and is thrown away at both call sites.

Direct product-principle hit: this is the surface Phase 10's reflection loop and Phase
63's recommendation history read to decide what the advisor learns from (see this
document's own addendum above on the related status-transition finding) — a completion
that silently didn't persist is invisible to that downstream logic too, not just to the
student.

Fix shape: `status-control.tsx`'s exact pattern (rollback `setLocalStatus` to the previous
value + `toast.error(result.error)` on failure).

### 2. `features/profile/achievement-section.tsx` — `handleDelete`

```tsx
function handleDelete(id: string) {
  setDeletingId(id);
  startTransition(async () => {
    await onDelete(id);          // <- result discarded entirely
    setDeletingId(null);
  });
}
```

**Widest blast radius of the three.** This one component backs delete for every
achievement type sharing the generic CRUD form — Activities, Projects, Awards, Research,
Volunteering, Work, Education, Test Scores, Certifications, Sports, and **Goals**, the one
of those that's actually mine (Phase 66). Every one of those delete actions routes through
the same shared `crudRemove` helper (`app/(app)/profile/actions.ts`), which already
returns a real message: `{ error: friendlyDbError("delete", table, error) }`. Confirmed
this isn't hypothetical for Goals specifically — `deleteGoal` is a two-line wrapper
(`crudRemove("career_goals", id)`) with no error handling of its own to lose the message
at a different layer; the discard happens exactly once, in this shared component.

Notably, this same component's `submit()` function (create/update) handles errors
correctly two functions above `handleDelete` (`if (result.error) { setError(result.error);
return; }`, rendered inline in the dialog) — the fix pattern already exists in the same
file, just wasn't applied to the delete path.

Lower urgency than #1 despite the wider blast radius: a failed delete doesn't lie about
success the way `weekly-focus.tsx` does (the item correctly stays in the list, since
nothing removes it from the server-truthed `items` prop on failure) — it just gives no
explanation for why nothing happened. Silent-and-honest beats silent-and-wrong, but it's
still Phase 45's exact "errors should be human-readable" violation, at the point of
loudest failure (a delete a student explicitly asked for).

Fix shape: `requirement-checklist.tsx`'s simple `if (result.error) toast.error(result.error)`
— no optimistic state to roll back here, `handleDelete` doesn't mutate anything client-side
before the round-trip.

**Not mine to fix alone, flagging the boundary explicitly:** this component and its
`crudRemove` backing serve every achievement type, most of which belong to profile/FEAT-1
territory, not mine. Fixing it only for Goals isn't possible — the component has one
`onDelete` prop, not ten. Any fix here fixes it for everyone at once. Recommend
coordinating with whoever owns `features/profile/` before this one gets picked up, the same
way #29's fix touched only what was strictly mine — this one structurally can't be scoped
that narrowly.

### 3. `features/app-shell/notification-bell.tsx` — `markNotificationRead`,
`markAllNotificationsRead`

```tsx
onClick={() => startTransition(() => void markAllNotificationsRead())}
...
onClick={() => { setOpen(false); if (!notification.read_at) startTransition(() => void markNotificationRead(notification.id)); }}
```

Lowest severity of the three, included for completeness rather than urgency. Both actions
(`app/(app)/notifications/actions.ts`) return `{ error: "Couldn't update notification(s)."
}` on failure, discarded via the explicit `void` here. Self-correcting in practice — read
state is re-derived from the server on every render, so a failed mark-read just leaves the
item unread on next load rather than compounding or losing data — but still genuinely
silent: a student who clicks "Mark all read" and sees nothing happen (RLS hiccup, network
blip) gets no signal to retry versus assume it worked.

## Summary table

| File | Action(s) | Error string exists? | Rendered? | Severity | Fix pattern to copy |
|---|---|---|---|---|---|
| `weekly-focus.tsx` | `updateActionStatus` (×2) | Yes | No | **High** — unrolled-back optimistic UI actively misreports success | `status-control.tsx` (rollback + toast) |
| `achievement-section.tsx` | `onDelete` (10 achievement types incl. Goals) | Yes | No | **Medium-high** — widest blast radius, but honest (no false-success claim) | `requirement-checklist.tsx` (inline toast) |
| `notification-bell.tsx` | `markNotificationRead`, `markAllNotificationsRead` | Yes | No | **Low** — self-correcting, no data loss | `requirement-checklist.tsx` (inline toast) |

Every other client call site in my territory (4 files, listed above) already handles this
correctly. The pattern was real and did repeat, exactly as suspected — three more
instances, not a one-off in the button UI-1 is already fixing.

## What this audit does not cover

Per org rule 20: this checked FEAT-2's territory's Server Actions and their direct client
call sites only. It did not check: FEAT-1's counselor/matching surfaces, UI-1's general
component library, or any Server Action outside the five files listed under Method. A
`toast.error`/`setError` call that exists but shows a *wrong or unhelpful* message (as
opposed to no message at all) was not in scope — this audit only checked presence/absence
of error surfacing, not message quality beyond spot-confirming the underlying strings are
already human-readable (Phase 45 requirement).
