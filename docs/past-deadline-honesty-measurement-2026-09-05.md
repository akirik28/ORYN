# Past-deadline honesty measurement (2026-09-05)

Report only, per CEO's own instruction ("Ölç, düzeltme yazma... Ölçümü bana getir, işi
ben dağıtırım"). Nothing fixed here.

## 1. How many deadlines have already passed

Measured directly against `oryn-qa-scratch`, both sources named:

| Source | Past deadline | Total with a deadline | % past |
|---|---|---|---|
| `opportunities.deadline` (status='active') | 40 | 95 | 42% |
| `university_deadlines.deadline_date` | 186 | 310 | 60% |

## 2. Is there a replacement on file (harmless) or is it orphaned (dangerous)

**University deadlines** — for each past row, checked whether the same
(`university_id`, `program_id`, `deadline_type`) combination has a newer row with
`deadline_date >= current_date`:

- **45 of 186** are replaced by a newer cycle already on file — harmless, the product
  has something current to show once the old row is superseded/hidden correctly.
- **141 of 186 (76%) are genuinely orphaned** — past-only, nothing newer on file for
  that exact university/program/type. This is the dangerous set.

**Opportunities** — no separate "cycle history" table; the same row's own
`cycle_status` is the closest analog to "does the product already know this is over":

| `cycle_status` on the 40 past-deadline rows | count |
|---|---|
| `closed` | 29 |
| `historical` | 5 |
| `open` | 3 |
| `upcoming` | 2 |
| `date_not_announced` | 1 |

34 of 40 already carry a `cycle_status` that correctly marks them non-actionable.
**6 of 40 do not** — `open`/`upcoming`/`date_not_announced` despite a deadline that has
already passed, a real, separate data-quality gap from the display question below (this
`cycle_status` column being stale doesn't by itself cause a false-honest display, since
`isOpportunityActionable`'s own deadline check is independent of `cycle_status` and
would exclude a past-deadline row on recommendation surfaces regardless — but it's
worth fixing on its own, flagged here rather than silently noticed and dropped).

## 3 & 4. Where the product shows a deadline, and whether it says "passed"

Checked every real (non-dev-preview) surface that renders `opportunity.deadline` or
`university_deadlines`/`deadline_date`, tracing each one to its actual render code, not
assumed from the component name.

**Honest — explicitly say "Past due" / "süresi geçti" for a negative days-until, via
the shared `DeadlineBadge` component** (`components/proxola/deadline-badge.tsx`,
`urgencyLabel`: `if (daysUntil < 0) return "Past due"`):
- Saved-opportunity row (`features/saved/saved-opportunity-row.tsx`)
- Opportunity card / strip card (`features/opportunities/opportunity-card.tsx`,
  `opportunity-strip-card.tsx`)
- University detail page's own deadlines list (`app/(app)/universities/[id]/page.tsx`,
  line 1004 — `DeadlineBadge` rendered directly beside the formatted calendar date)
- Homepage deadline strip and weekly-focus card (`features/dashboard/dashboard-view.tsx`,
  `weekly-focus.tsx`)
- Applications **list** view (`features/applications/applications-view.tsx`)
- **All three parent-facing surfaces checked** (`features/parent/parent-panel-view.tsx`,
  `features/parent/opportunity-catalog-browser.tsx`,
  `app/parent/(dashboard)/opportunities/[id]/page.tsx`) — every one uses `DeadlineBadge`.

**CONFIRMED BUG — the raw date renders with zero qualifier, looks exactly like an
upcoming date:**

1. **`app/(app)/opportunities/[id]/page.tsx`** (the student-facing opportunity detail
   page — the single most direct place a student would land on a saved or
   directly-linked past-deadline opportunity). Line 314-320, the only
   *always-rendered* deadline line on the page:
   ```
   {t("deadlineLabel")} <span className="font-medium">{opportunity.deadline}</span>
   ```
   No badge, no color, no "past" wording — just the literal date string. The ONE place
   `urgencyLabel` (which would print "Past due") could have appeared on this page is
   gated OFF for exactly this case: line 263, `daysUntilDeadline !== null &&
   daysUntilDeadline >= 0` — a negative value is explicitly excluded from ever reaching
   that fact, and that fact only renders inside the already-conditional "Proxola's Take"
   block in the first place (`canGiveTake`, itself gated on eligibility/verification/a
   non-empty take), so it would not reliably appear even for an upcoming deadline.
   **Striking confirmation this is a real gap, not a false read**: the PARENT-facing
   version of this exact same opportunity detail page
   (`app/parent/(dashboard)/opportunities/[id]/page.tsx:42`) renders the identical data
   correctly, via `DeadlineBadge`. Same fact, two independently-written pages, one
   honest and one not.
2. **`app/(app)/applications/[id]/page.tsx`**, line 118 — the single-application detail
   page (distinct from the applications *list*, which is one of the honest surfaces
   above):
   ```
   description={`${applicationTypeLabel}${application.deadline ? ` · ${t("due")} ${application.deadline}` : ""}`}
   ```
   Same pattern exactly: the raw date interpolated into a plain string, no badge, no
   qualifier of any kind.

## The `isOpportunityActionable`/`isOpportunityRecommendable` question — verified, not assumed

CEO named this as their own unverified assumption. Checked directly:

- **`lib/opportunities/saved.ts`** (the actual query behind the saved-opportunities
  surface) applies exactly one filter: `.neq("status", "not_interested")` on the
  `saved_opportunities` row's own status. **Zero reference to `isOpportunityActionable`,
  `cycle_status`, or `deadline` anywhere in this file.** A saved opportunity is never
  hidden or removed once its deadline passes or its cycle closes — the student would
  keep seeing it (correctly labeled "Past due" via `DeadlineBadge`, per above, but never
  filtered out) until they manually mark it "not interested."
- The direct-detail-page path (`app/(app)/opportunities/[id]/page.tsx`) has no
  actionability gate either — a past-deadline opportunity reached by URL renders fully,
  with the raw-date bug above as its only deadline-related display.

**So CEO's hint is confirmed exactly as stated**: `isOpportunityActionable` /
`isOpportunityRecommendable` are recommendation-surface-only filters. Saved and
direct-visit paths bypass them entirely — which is fine for the surfaces that still
label the result honestly (saved-row, parent detail page), and is the mechanism that
lets the two confirmed bugs above actually reach a student.

## The "passed" vs. "unknown" distinction

Checked for conflation, per the standing rule this product learned the hard way
elsewhere today. Not conflated anywhere found: `opportunity.deadline === null` (no
deadline on file, i.e. genuinely unknown/rolling) is handled by simply not rendering
any deadline row at all (the `{opportunity.deadline ? ... : ...}` conditionals
throughout), falling back to `current_cycle_label` display text where one exists — a
materially different rendering path from a real, populated, past date. The two
concepts render as visibly different things everywhere checked, not the same thing
worded differently.

## Summary, leading with the worst number as instructed

- **141 university deadlines and up to 40 opportunity deadlines are genuinely past
  with nothing to supersede them on file.**
- **Two confirmed surfaces show a past deadline as a bare, unqualified date** — the
  student opportunity detail page and the single-application detail page — both would
  read to a student exactly like an upcoming date, no different in appearance from a
  deadline three months out. Every other real surface checked (7 of them) already
  handles this honestly via the shared `DeadlineBadge` component.
- Saved opportunities are never filtered by actionability (confirmed, not assumed) —
  they stay in a student's list forever unless manually dismissed, though at least
  labeled correctly where `DeadlineBadge` is used.
- A smaller, separate data-quality gap: 6 of 40 past-deadline opportunities carry a
  `cycle_status` that doesn't reflect the passed deadline (independent of the display
  bug — the recommendation-surface filter doesn't depend on this column being correct,
  but it's still wrong on its own terms).
