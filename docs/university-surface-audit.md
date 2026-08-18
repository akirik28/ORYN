# University surface audit — product-visible duplicates (2026-08-18)

Full-repository audit for the founder-reported bug ("UCL" search surfacing both "UCL" and
"University College London" as separate results) and every other place `universities` is read,
searched, browsed, selected, or referenced. Produced by an exhaustive repo search (27
`.from("universities")` call sites across 20 files), not a sample.

Root cause: `merge_canonical_entities()` merges the identity layer only — both sides of a merge
end up with the same `universities.canonical_entity_id`, but the `universities` rows themselves
are deliberately left alone (FK safety — several pairs have real `university_programs`/
`university_requirements` data on one side). Every surface that queried `universities` filtered
by `canonical_entity_id` therefore returned both rows. Fix: `lib/universities/canonical.ts`, an
application-layer equivalent of the not-yet-DDL-applicable `superseded_by_id` column (migration
`0043`, still blocked — no DDL access this session). See `docs/handoffs/claude-a-university-spine.md`
for the full mechanism and `docs/handoffs/claude-a-to-claude-b.md` for the cross-team note.

## Legend

- **Canonical filter?** — does this surface exclude/resolve known-duplicate rows via
  `lib/universities/canonical.ts`?
- **Fix required?** — Yes (real risk, now fixed) / No (display-only or already safe) / N/A (not
  a `universities` surface) / Handoff (Claude-B-owned, requested via their handoff doc instead
  of edited directly).

| Surface | File | Query/API | Current behavior | Canonical filter? | Alias search? | Duplicate risk | Fix required? | Owner |
|---|---|---|---|---|---|---|---|---|
| University Explorer — browse | `app/(app)/universities/page.tsx` | `.from("universities").select("*")...` | Ordered/limited browse, country/region-scoped | **Yes** (fixed) | No | Was: two cards for one institution | Fixed | Claude A |
| University Explorer — country counts | `app/(app)/universities/page.tsx` | `.from("universities").select("country")` | Per-country count for the region hero | **Yes** (fixed) | No | Was: inflated per-country counts | Fixed | Claude A |
| University Explorer — text search / global search / command palette | `lib/universities/alias-search.ts` (`searchUniversityRows`) | `.rpc("search_canonical_entities")` then `.from("universities").in("canonical_entity_id", ...)` | Alias/accent-aware search via canonical registry | **Yes** (fixed) | Yes | Was: exact bug reported ("UCL" search) | Fixed | Claude A |
| University detail page | `app/(app)/universities/[id]/page.tsx` | `.from("universities").eq("id", id).single()` | Fetch by raw path id | **Yes** (fixed — redirects) | N/A | A loser-id link/bookmark rendered a full working page with no indication it wasn't canonical | Fixed | Claude A |
| Save University action (write path) | `app/(app)/universities/actions.ts` (`addTargetUniversity`) | `.from("target_universities").insert({university_id, ...})` | The one place a selection becomes permanent | **Yes** (fixed) | N/A | **Critical**: any unfiltered caller could permanently store a loser id | Fixed | Claude A |
| SaveUniversityButton / UniversityCard save | `features/universities/save-university-button.tsx`, `features/universities/university-card.tsx` | Calls `addTargetUniversity(id)` | Client components, no id logic of their own | N/A (protected by the action) | N/A | Inherits the now-fixed action's protection | No further action | Claude A |
| Admin "add requirement" form | `features/universities/admin-requirement-form.tsx` + `app/(app)/universities/[id]/requirement-actions.ts` | Writes `university_requirements` scoped to the detail page's `universityId` | Admin-only, operates on whatever the parent page resolved | **Yes** (protected — detail page now redirects before this ever renders on a loser) | N/A | Was: an admin could source real data onto a loser row | Fixed (via detail-page redirect) | Claude A |
| Shared entity combobox — university-scope search | `lib/entities/search.ts` (`searchUniversities`) | `searchCanonicalRegistry` then `.from("universities").in("canonical_entity_id", ...)`, `Map` keyed by entity id | Same shape as the original bug; `Map` could non-deterministically keep the loser | **Yes** (fixed) | Yes | Currently unreachable (no field uses `scope="university"` yet) — a dormant landmine, now defused | Fixed | Claude A |
| Shared entity combobox — university-scope resolve | `lib/entities/resolve.ts` (`resolveUniversity`) | `.from("universities").eq("id", id).maybeSingle()` | Server-side re-verification of a client-submitted id | **Yes** (fixed) | N/A | Same dormant-landmine status | Fixed | Claude A |
| Onboarding wizard — school step | `features/onboarding/onboarding-wizard.tsx` | `<EntityCombobox scope="school">` | Resolves against `canonical_entities` type `school`, a distinct K-12 registry | N/A | N/A | Not a `universities` surface at all | N/A | Claude A |
| Global search — program results | `lib/search/index.ts` (`searchPrograms`) | `.from("university_programs").ilike("name", pattern)`, links to `/universities/${university_id}` | Reads `university_programs` (read-only), links to parent university | **Yes** (fixed — canonicalizes the link) | N/A | A student could be routed straight to a loser's detail page from a program search hit | Fixed | Claude A (read-only touch on a Claude-B table; no query/write change to `university_programs` itself) |
| Global search — application results | `lib/search/index.ts` (`searchApplications`) | Batch-fetch `applications` → `target_universities` → `universities` | Builds "{name} application" result titles | **Yes** (fixed) | N/A | Display-only, inherited from write path | Fixed | Claude A |
| Applications list | `app/(app)/applications/page.tsx` | Batch-fetch `target_universities` → `universities` | University name per saved target | **Yes** (fixed) | N/A | Display-only, inherited | Fixed | Claude A |
| Application detail page | `app/(app)/applications/[id]/page.tsx` | `.from("universities").select("name").eq("id", ...)` | University name for one application | **Yes** (fixed) | N/A | Display-only, inherited | Fixed | Claude A |
| New Application dialog — university dropdown | `features/applications/new-application-dialog.tsx` | `<Select>` over the student's own already-saved targets | Not a fresh table search | N/A (upstream-protected) | N/A | Low — picks from the student's own (now-protected) saved list | No further action | Claude A |
| Dashboard — target universities / "University outlook" | `lib/universities/queries.ts` (`getTargetUniversitiesWithDetails`) | Batch-fetch `target_universities` → `universities` | Feeds `app/(app)/dashboard/page.tsx` | **Yes** (fixed) | N/A | Display-only, inherited | Fixed | Claude A |
| AI Advisor context — target universities | `lib/ai/student-context.ts` (`buildStudentAdvisorContext`) | Was a nested `universities(name)` PostgREST embed | Feeds the AI Advisor's prompt directly | **Yes** (fixed — restructured to batch-fetch, since an embed can't be post-filtered) | N/A | Advisor could reason using a loser row's (possibly thinner) data | Fixed | Claude A |
| AI Advisor context — pending application requirements | `lib/ai/student-context.ts` (`getPendingApplicationRequirements`) | Batch-fetch `application_requirements` → `applications` → `target_universities` → `universities` | Feeds the AI Advisor's prompt | **Yes** (fixed) | N/A | Same as above | Fixed | Claude A |
| Deadline scan job — applications | `lib/deadlines/scan.ts` (`scanApplications`) | Batch-fetch, builds push-notification body text | Scheduled/triggered job | **Yes** (fixed) | N/A | A notification could name the loser university | Fixed | Claude A |
| Deadline scan job — target-university deadlines | `lib/deadlines/scan.ts` (`scanTargetUniversityDeadlines`) | Batch-fetch + queries `university_deadlines` by university id | Scheduled/triggered job | **Yes** (fixed — also fixes which row's deadlines are read) | N/A | Was: could read deadlines off the wrong side of a pair, or link to a loser page | Fixed | Claude A |
| "Due soon" widget / upcoming deadlines | `lib/deadlines/upcoming.ts` (all three internal functions) | Read-side mirror of the scan job above | Feeds the dashboard widget and the AI Advisor context | **Yes** (fixed) | N/A | Same as the scan job | Fixed | Claude A |
| Requirement-discovery batch selection | `lib/requirements/discover.ts` | `.from("universities")` — all rows, oldest-first, minus ones with `university_requirements` | Selects which universities get Tavily+AI discovery | No | N/A | Would independently discover requirements for both sides of a pair once Tavily/Anthropic unblock — wasted spend, not a display bug | **Handoff** | Claude B (`university_requirements` is their table — requested in `docs/handoffs/claude-a-to-claude-b.md` instead of edited directly) |
| US university sync job | `lib/universities/sync-us-universities.ts` | Matches by exact `ilike(name)` + country before insert/update | Admin-triggered, College-Scorecard-key-gated (also currently blocked) | No | N/A | Low — matches by exact name, but a re-sync could keep refreshing a loser row if its name happens to match | Not fixed (low priority — job is credential-blocked anyway; noted for later) | Claude A |
| Admission-outlook refresh | `lib/admissions/persist.ts` | Reads `university_statistics` scoped by an already-stored `target.university_id` | Per-target computation, no `universities` table read itself | N/A directly | N/A | Inherits from write path (now fixed); statistics could live only on the winner row | No further action needed | Claude A |
| Dev-engineering scripts (10 files: `check-integrations`, `acquire-admissions-facts`, `university-data-report`, `enrich-student-counts-us`, `expand-university-spine`, `import-university-facts`, `university-spine-health`, `audit-admissions-quality`, `university-duplicates-audit`, `resolve-university-duplicates`) | `scripts/*.ts` | Various — manual `npm run` tooling | Not reachable by students | No (except the fix's own generator) | N/A | Coverage/health reports count both sides of a pair (report-accuracy issue, not student-facing); acquisition scripts independently enrich both rows | Not fixed — noted as a follow-up; `resolve-university-duplicates.ts` *is* the fix's generator | Claude A |
| Export data route | `app/api/export-data/route.ts` | Exports raw `target_universities` rows | Never joins to `universities`, no name resolved | N/A | N/A | None — no name shown in the export itself | N/A | Claude A |
| Design-preview fixtures | `app/(dev-preview)/design-preview/page.tsx`, `lib/dev/fixtures.ts` | Hardcoded stub data | Never touches the real table | N/A | N/A | None | N/A | N/A |

## What's genuinely still open

1. **`lib/requirements/discover.ts`** (Claude-B-owned) — handoff sent, not edited directly.
2. **`lib/universities/sync-us-universities.ts`** and the 10 dev-engineering scripts** — real
   but low-priority (admin-only / credential-blocked / not student-facing). `resolve:university-
   duplicates` should be re-run whenever a new pair is merged via `merge_canonical_entities()`;
   the other scripts consuming `universities` broadly weren't individually updated to exclude
   superseded ids this pass.
3. **Existing bad data**: if any `target_universities`/`applications` row already references a
   loser id (this session found no evidence either way — no live query was run specifically to
   check), every fixed read path now self-heals it at display time (shows the winner's name),
   but the stored id itself isn't corrected. Not attempted this pass — a genuine data-migration
   decision (rewrite the stored id vs. leave the read-time resolution as the permanent fix)
   that's more Phase Q-shaped than Phase D-shaped.

## Verification

Live-verified against all 9 known pairs (UCL, MIT, LSE, Warwick, HKUST, KFUPM, UTS, Newcastle
Australia, Al-Farabi): each search now returns exactly one canonical result. Confirmed the fix
does not over-suppress — "UCL" also surfaces genuinely different institutions (UCLA, Université
catholique de Louvain, ...) ranked below it by score (1.0 exact-alias match vs. 0.97 fuzzy
neighbors), per the product requirement that real distinct institutions stay distinct and
separately selectable.

`npm run lint` / `npx tsc --noEmit` / `npm test` (643 tests) / `npm run build` all clean after
every commit in this pass.
