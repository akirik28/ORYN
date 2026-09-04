# C3 — the student core loop, walked for handoffs between surfaces

Report only. No code changed, no account created, no live write. Chain: onboarding →
profile → dashboard → universities → opportunities → advisor. Each surface has been
checked individually today by other lanes; this pass is specifically about the seams
between them, since today's four other findings all lived there, not inside a single
surface.

**Method note, since C7's own doc set the bar for this:** the compare-page render
test (`__tests__/universities/compare-page-render.test.tsx`) is the right tool for a
*conditional* rendering question — what text a cell actually shows given a specific
data shape can't be answered by reading a ternary and guessing. The gaps below aren't
that kind of question: each one is "does a `<Link>` element exist around this data, or
not" / "does this Server Action call `revalidatePath` on that route, or not" — both
directly, unambiguously readable from the source itself. Traced by reading for that
reason, not because the render technique wasn't considered. Where reading leaves a
real ambiguity, that's called out below rather than guessed past.

## 1. Onboarding → profile/dashboard gates — clean, checked in depth

Every route-group gate (`app/(app)/layout.tsx`, `app/(onboarding)/layout.tsx`,
`app/(confirm-age)/layout.tsx`) checks the exact same field onboarding's own
`completeOnboarding` action writes: `profiles.onboarding_completed` (boolean), no
alternate or stale field name anywhere. `country`, `curriculum` (a single string on
both sides, not an array-vs-string mismatch), and `birth_year` all read back through
the identical column onboarding wrote. Interests go through a separate table
(`student_interests`, not a `profiles` column) — correct and consistent on both the
write side and every one of its six read sites (profile page, opportunity matching,
advisor context, completeness scoring, people-you-may-know). Traced the full type
chain (Zod schema → Server Action → Postgres column → hand-authored `Profile`
TypeScript type) for all eight fields onboarding writes: no naming or type mismatch
on any of them — a real mismatch here would fail `tsc`, and none does.

**One real gap found, a different shape than a broken handoff: `target_geographies`
is collected and correctly stored, then read by nothing.** Checked dashboard, profile
page, settings, university matching, opportunity matching, and the advisor/counselor
logic directly — zero read sites outside the write itself, the type declaration, and
the onboarding wizard's own local state. The spec's own onboarding screen 4 (target
geography: USA/UK/Europe/Canada/Turkey/Not sure) implies this should shape later
recommendations; right now a student's answer here has no effect on anything they see
afterward. Not a mismatch to fix at a seam — a collected signal with no consumer.

## 2. Dashboard → universities — the outlook rows aren't clickable

`features/dashboard/dashboard-view.tsx`, the "University outlook" section
(lines 530–543): each target university renders as `<li>{target.university?.name}
<OutlookBadge .../></li>` — plain text, no `<Link>`. The section's only interactive
element is the header's "Explore" link, which goes to the generic `/universities`
browse page, not to that specific institution. `target.id` is already in scope
(used as the React `key`), so the data needed to link directly to
`/universities/{id}` is sitting right there, just not wrapped. A student sees
"Bocconi — Competitive" on their dashboard and has to re-search for Bocconi from
scratch to see why, rather than landing on it directly.

## 3. Dashboard → opportunities — same shape, one layer deeper

Same section immediately below (lines 569–590): `opp.title` renders as a bare
`<p>`, no `<Link>`, keyed by `opp.title` rather than an id. Checked the prop shape
feeding this list (`opportunityPreview`, built in `app/(app)/dashboard/page.tsx` and
mirrored in the design-preview fixture): it's `{ title, matchScore, deadline,
cycleStatus }` — **the opportunity's own id was never threaded into this prop at
all.** This is one step past the universities gap: there, the id exists and just
isn't wrapped in a `Link`; here, the id would need to be added to the prop shape
itself before a link could exist.

## 4. Opportunity save → dashboard: doesn't revalidate, unlike its university twin

`app/(app)/universities/actions.ts`'s `addTargetUniversity` calls
`revalidatePath("/universities")` **and** `revalidatePath("/dashboard")` — both
surfaces a student could be looking at get told to refresh. `app/(app)/opportunities/
actions.ts`'s `setOpportunityStatus` (the save/apply/not-interested action) calls
only `revalidatePath("/opportunities")` — the dashboard is not told. If a student
saves or marks an opportunity from the browse page and then goes to the dashboard,
the "Opportunities" preview block may show what was cached before the change,
depending on Next's own cache lifetime for that route — not confirmed to be
user-visible today (didn't render both states side by side to prove staleness, which
would need the same render-test technique C7 used, not just a source read), but the
asymmetry against the university action's own explicit two-path revalidation is real
and looks like an oversight, not a deliberate difference between the two features.

## 5. Dashboard → advisor — clean, and structurally can't be otherwise

`app/(app)/advisor/page.tsx`'s `AdvisorPage()` takes no params and no searchParams —
everything it needs comes from the authenticated session (`requireUser`,
`getCurrentProfile`) and its own database reads. The dashboard's link to it
(`href="/advisor"`) is a bare static link. There is no dynamic state to hand off and
therefore no seam here for a mismatch to hide in — confirmed by reading the page's
own signature, not asserted.

## What this pass did not cover

Did not walk universities → opportunities (no direct cross-link found between them
in this pass, would need a dedicated look), did not verify whether the opportunity
staleness in §4 is actually visible to a real student (would need a render test, not
a source read, to prove one way or the other), and did not re-walk the dashboard's
own internal rendering — C4 already covered that in depth earlier tonight and is not
repeated here. Onboarding's own internal wizard screens (step-by-step) were not
walked individually; only the final handoff (what it writes, what reads it back) was.
