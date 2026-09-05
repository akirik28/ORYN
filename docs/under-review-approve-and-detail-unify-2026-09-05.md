# The under_review graveyard: an Approve button, a unified detail page, and one explicit exclusion

**Date:** 2026-09-05. Closes the open item from `docs/under-review-pool-audit-2026-09-03.md`,
its `-third-pass.md`, and `docs/drive-import-under-review-triage-2026-09-03.md` — all three
independently recommended "an audited Approve action on the existing admin moderation list,
same shape as the disable action" and left it unbuilt. Measurement-only pass first
(`docs/still-open-findings-2026-09-05.md` item 6); this is the follow-up build CEO assigned
after that measurement, live-confirmed against real data before any code was written: zero real
students currently have any of the 27 `under_review` rows saved or matched (CEO's own query),
so this closes a real inconsistency, not an active incident.

## What shipped

**1. An Approve button on the moderation list**, for `under_review` rows specifically.
`setOpportunityDisabled` (`app/(app)/admin/actions.ts`) already writes `status: "active"` for
*any* prior status when called with `disabled: false` — this needed no backend change at all.
The actual gap, found by reading the function's only caller rather than assumed from its name:
`OpportunityDisableControl` only ever showed "Disable" for a non-`disabled` row, so an
`under_review` row's one visible action moved it the wrong direction. `isUnderReview` is the
new prop; the write it triggers is byte-identical to reactivate (`disabled: false`), only the
copy ("Approve" vs "Reactivate" — "reactivate" would wrongly imply the row was ever visible
before) and styling (non-destructive, no reason required, matching reactivate) differ. Proven
red-to-green (diff+checkout, not `git stash` — see the standing rule below): 10 new component
tests fail against the unfixed control, pass after.

**2. The detail page's two faces, unified.** `app/(app)/opportunities/[id]/page.tsx` only
computed eligibility `if (match)` — a real `opportunity_matches` row for this exact student.
Without one (a student who found and saved the opportunity directly via Browse, never had it
algorithmically matched), the standing badge defaulted to `eligible: true, notActionable: false`
regardless of the opportunity's real status, so a non-active opportunity rendered as if nothing
were wrong. A student reached via a real match saw the correct "Not open right now" for the
identical status. Same status, two different pages, decided by an implementation detail neither
student could see. Fixed by extracting `resolveDetailPageStanding` (`lib/opportunities/
lifecycle.ts`) as the one function both branches now go through — when no match exists, it
derives `eligible`/`notActionable` from `isOpportunityActionable(opportunity)` directly instead
of defaulting. 5 new unit tests, red-to-green proven the same way.

## What must NOT be approved with this button

**The 19-row Drive-corpus backlog is explicitly excluded from this button's intended use**,
per CEO's own instruction on this exact pass. These are the `under_review` rows that trace to
the 2026-08-18 bulk import and have never been individually verified since (measured in
`docs/under-review-pool-audit-2026-09-03-third-pass.md` and re-measured this pass):

Google Computer Science Institute, Durham University Global Futures Summer School 2026, Tufts
College Experience, International Genetically Engineered Machine Competition (iGEM), Koç
University Research Program (KUSRP), New York Times Student Editorial & Essay Contests,
Boğaziçi University BOUN 101 Online Kış Okulu, Boğaziçi Üniversitesi Lise BOUN 101, CTY Online
Programs Courses, Civic Leadership Institute, Fordham University, Institute for Advanced
Critical and Cultural Studies, International Summer School for Young Physicists (ISSYP), The
Immerse Cambridge Experience, Robomaster High School Summer Camp, The Juilliard School Pre-
College, Columbia Writing Academy, Lise Kış Tıp Okulu, Harvard Alumni for Global Women's
Empowerment Essay Contest.

**Why this button is the wrong tool for these 19 specifically**: measured live this pass —

- **All 19 have zero deadline on file.** `official_url` and `source_url` are both present for
  all 19 (not a provenance gap), but nothing tells a student when to act.
- **10 of the 19 carry a description of exactly 900 characters** — Immerse Cambridge, Civic
  Leadership Institute, Robomaster, Juilliard, Columbia Writing Academy, Lise Kış Tıp Okulu,
  ISSYP, Institute for Advanced Critical Studies, Durham, Boğaziçi Lise BOUN 101. Identical
  length across ten independent records is not a natural writing coincidence — it reads as a
  truncation ceiling from the original import/generation pipeline, meaning the stored
  description is very likely cut off mid-sentence for a third of this backlog.

The Approve button is correct and safe for a row a human has actually read and confirmed —
that is what it does, faithfully. It is not a substitute for that reading. Clicking it on any
of these 19 without first fixing the underlying data would activate a record for students with
no deadline and, for ten of them, a truncated description — publishing the exact "structurally
a graveyard" quality problem the third-pass audit already diagnosed, just with a different
`status` value. Treat these 19 as needing real re-research (the third-pass doc's own Google
CSSI spot-check found a "safest-looking" candidate in this exact set was still not ready once
the whole row was reread, not just the field that had already been fixed), not a rubber stamp.

## Gates

Red-to-green proven for both changes independently (diff+checkout method — this session's
standing rule as of today is **never `git stash` for this**, confirmed the hard way earlier
today: it's a shared stack across every concurrent lane). `npm run typecheck` / `npm run lint`
clean on every changed file. Full suite run before push.
