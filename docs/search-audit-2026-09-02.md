# Global search audit — 2026-09-02

CEO's ask: Phase 25's spec line ("Global search should eventually search profile items,
universities, and opportunities") is exactly the kind of one-line spec that can silently
cover one of three while looking finished, and nobody had looked at `/search` yet tonight.
Four questions, answered against the actual code and live data rather than assumed.

## What does it actually search?

**All three named in the spec, and more.** `lib/search/index.ts`'s `globalSearch()` fans out
to six sources in parallel: universities (alias/accent-aware — see below), university
programs, active opportunities, nine achievement-shaped profile tables
(activities/awards/certifications/projects/research_experiences/volunteering_experiences/
work_experiences/education_records/test_scores), career goals, and applications (matched by
target-university name or notes, since an application has no title of its own). Results are
ranked (exact match, then prefix, then alphabetical — no AI, deterministic) and returned as
one flat typed list.

This is not a stub. It reuses proven, shared infrastructure rather than being a bespoke,
newly-written path: university search runs through the same `search_canonical_entities` RPC
every entity-autocomplete field in the app already depends on, and correctly resolves aliases
— confirmed live: searching `"MIT"` resolves to `9d9cb092-1276-4e47-9a6d-765a97ba757b`
("Massachusetts Institute of Technology"), a plain `ilike` could not.

**A specific dedup concern checked and found already handled**: the university-entity table
has two rows for MIT — "Massachusetts Institute of Technology" and "Massachusetts Institute
of Technology (MIT)" — sharing one canonical entity (a known-duplicate pattern the code's own
comments describe, citing the exact "UCL returns two cards" bug this mechanism exists to
close). Live-checked both rows' `duplicate_status`: the "(MIT)" row is `superseded`, pointing
at the other as `canonical`. The live search path excludes superseded ids before returning
results, so this correctly surfaces as one card, not two — verified against the real columns,
not assumed from the code comment.

## Does it respect the boundaries the rest of the product enforces?

**Yes, and doubly so.** Every user-owned source (`career_goals`, the 9 profile-item tables,
and `applications`) is explicitly filtered to the searching student's own `user_id` in the
query — confirmed by reading `lib/search/index.ts` directly, not inferred from a comment. On
top of that, checked live against project `qtcvcflzxbuagvvwahhu`: all 11 tables have
`relrowsecurity = true` and a real `"owner full access"` policy (`user_id = auth.uid()`) —
RLS genuinely is the backstop here, not just an assumption. A regression that accidentally
dropped the app-level filter would still be caught by the database, not silently leak another
student's data.

This app-layer scoping for `searchGoals`/`searchProfileItems` (covering 10 of the 11
user-owned tables search touches) previously had zero direct test coverage — pinned now in
`__tests__/search/global-search-scoping.test.ts` (12 cases, one per table plus aggregate
checks), so a future edit that drops the filter fails a fast unit test instead of only ever
being caught by re-reading the code by hand. `applications`' scoping (same `.eq("user_id",
...)` shape, checked by reading the code and via the same live RLS-policy query above, not
separately unit-tested) is the one boundary named rather than covered — its dependency chain
(`target_universities` → `universities` → supersession map) makes a focused test meaningfully
heavier for the same shape of proof the other 10 already give directly.

## What happens on no results, and on nothing typed?

**Thorough on both surfaces.** The command palette (⌘K / topbar / mobile icon) has four
distinct states — empty query ("Search universities, opportunities, applications, and
everything in your profile"), a 1-character query ("Keep typing — at least 2 characters"),
zero results ("No results for..."), and a genuine search failure ("Search isn't available
right now") — the last of these confirming this surface distinguishes "nothing matched" from
"the search itself broke," which matters (Rule 4/28: never present a failure as a normal empty
state). The full `/search` page shows the same "keep typing" hint and a proper `EmptyState`
component (icon, title, "Nothing matched '...'") for zero results. Checked: on a genuinely
empty query, `/search` shows nothing below the input at all, no prompt — a deliberate,
completely standard pattern (a focused search box needing no further explanation), not the
kind of dead end Phase 43 warns about. Not changed.

## Is it reachable?

**The command palette: yes, thoroughly** — mounted in both the desktop topbar (as a
full-width, labelled search bar, not just an icon — `Topbar` renders `CommandPalette
variant="bar"`) and the mobile header (icon variant, in the sticky header every page shows),
plus the global ⌘K shortcut. This is genuinely well-designed and discoverable, not buried.

**The dedicated `/search` page: no — a real, confirmed dead end, now fixed.** Checked every
reference to the literal string `/search` across `app/` and `features/`: before this package,
the only two were the page's own form action and its own "clear" link. Not in `nav-items.ts`
(`PRIMARY_NAV`/`SECONDARY_NAV` — checked directly), not linked from the command palette
itself. A student could reach this complete, well-built page — full-width result list, a
shareable/bookmarkable URL, works without JavaScript — only by typing the URL directly. This
is the same shape of bug as this morning's applications-page finding: a correct surface with
no path in.

**Fixed** (`features/search/command-palette.tsx`): a persistent "View all results for
'{query}'" link at the bottom of the dialog, shown for any query of 2+ characters regardless
of the palette's own state (results, zero results, or a search failure — `/search`'s page
runs its own independent server-side fetch, so a transient client-side failure in the palette
doesn't mean that page would fail too). Both locales. Six new tests
(`__tests__/search/command-palette.test.tsx`) — the surface had zero test coverage before —
covering: the link's presence and href across all three result states, its absence below the
2-character threshold, that clicking it closes the dialog, and that a query with special
characters is correctly URL-encoded rather than passed through raw.

## Not touched, named rather than silently skipped

- **Per-source result caps** (5 for most sources, 8 for universities/programs) are not
  communicated to the student ("showing top 5 of 12") on either surface. Minor, common
  pattern for a quick-search UI; not a functional gap, and Phase 25 itself says "if practical
  during V1."
- **`searchApplications` has no direct unit test** — see the RLS section above for why the
  scope line was drawn there.
- **Neither `search-view.tsx` (the full page) nor the pre-existing parts of
  `command-palette.tsx`** (result rendering, keyboard nav, grouping) had any test coverage
  before this pass. Only the new link got direct coverage plus the scoping tests above — a
  full first-ever suite for the whole feature is a larger, separate undertaking than this
  audit's scope, the same boundary line drawn in
  `project_oryn_cv_import_skills_languages`'s "no `completeOnboarding` suite" call.

## Bottom line

Global search is a genuinely complete, carefully built feature — not the kind of "looks
finished, secretly covers one of three" surface the spec line's brevity could have hidden.
The one real defect found was reachability of the full page, not its content or safety, and
it's now fixed.
