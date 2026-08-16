# Feature Inventory

Every production feature discovered by reading the actual code (not the spec), organized
by product area rather than by route (see `docs/production-route-audit.md` for the
route-centric view — this doc groups routes under features and adds current readiness).
Compiled 2026-08-16.

**Automated tests** column names the actual test file(s), not just "yes/no" — most cover
the underlying logic (scoring math, authorization predicates, dedup) rather than the
route/component itself, per this codebase's established pure-function-test convention
(see `docs/production-route-audit.md`'s "Known gaps" for why).

**Current readiness**: `Working` (code-complete, no missing credential), `Env-blocked`
(code-complete, needs a credential/migration from `docs/founder-blocked-backlog.md`),
`Content-empty` (code-complete, works, but has no real data to show yet).

| Feature | Route/UI | Server action/API | DB dependency | Automated tests | Env dependency | Readiness |
|---|---|---|---|---|---|---|
| Signup / login / logout | `/signup`, `/login` | `app/(auth)/actions.ts` | `auth.users`, `profiles` (trigger-created) | `security/safe-redirect.test.ts` (redirect-target validation) | Supabase | Env-blocked (email confirmation) |
| Password reset | `/forgot-password`, `/reset-password` | `app/(auth)/actions.ts` | `auth.users` | None | Supabase + SMTP (none configured) | Env-blocked |
| Onboarding | `/onboarding` | `app/(onboarding)/onboarding/actions.ts` | `profiles`, `career_goals`, `student_interests`, 6 achievement tables (CV import) | None for the route | Supabase; Anthropic for CV import step | Env-blocked |
| Profile / Digital Twin (achievements) | `/profile` | `app/(app)/profile/actions.ts` (`crudCreate`/`crudUpdate`/`crudRemove`, shared across all 7 types) | `activities`, `projects`, `awards`, `research_experiences`, `volunteering_experiences`, `work_experiences`, `sports_experiences` | `scoring/*` (11 files — the math, not the CRUD), `errors/friendly-db-error.test.ts` | Supabase; Anthropic for "improve with AI"/research-generator | **Env-blocked (migration 0029)** — every save currently fails |
| Essay Story Bank | `/profile/story-bank` | `app/(app)/profile/story-bank/actions.ts` | Same 7 tables' `story_notes` column | None for the route | Supabase (0029) + Anthropic | Env-blocked |
| CV Generator | `/profile/cv` | None (read-only, reuses `buildPortfolio`) | Read-only across achievement tables | None | Supabase | Working (once achievements exist) |
| Portfolio view | `/profile/portfolio` | None (read-only) | Read-only across achievement tables | None | Supabase | Working |
| Profile history (monthly progress) | `/profile/history` | None (read-only) | `profile_score_snapshots` | None | Supabase | Content-empty (no snapshots yet) |
| Public profile | `/u/[id]` | `lib/social/public-profile.ts`, `getConnectionWith` | `public_profiles` view, `profiles`, achievement tables (via admin client) | `social/public-profile-authorization.test.ts` (41 cases) | Supabase | Working |
| Connections | `/connections` | `app/(app)/connections/actions.ts` | `connections` | `social/connection-transitions.test.ts` | Supabase | Working |
| Messaging | `/messages`, `/messages/[userId]` | `app/(app)/messages/actions.ts` | `messages`, `blocked_users` | `messaging/authorization.test.ts`, `messaging/realtime.test.ts` (23 cases total) | Supabase | Working; realtime needs migration `0031` |
| Block / report | Inside messages thread | `app/(app)/messages/actions.ts` | `blocked_users`, `message_reports` | Covered by `messaging/authorization.test.ts` (block) | Supabase | Working (report submission); moderation of reports needs `0030` |
| Moderation (admin) | `/admin` | `app/(app)/admin/actions.ts` (`updateReportReview`) | `message_reports` | `security/is-admin.test.ts`, `moderation/report-status.test.ts` | Supabase secret key + migration `0030` | Env-blocked |
| AI Advisor | `/advisor` | `app/(app)/advisor/actions.ts` | `advisor_conversations`, `advisor_messages` | None for the route (ownership-check logic mirrors already-tested `resolveConversationAccess` pattern) | Anthropic | Env-blocked — never run against a live model |
| Weekly plan | `/plan` | `app/(app)/plan/actions.ts` | `weekly_plans`, `weekly_actions` | None for the route | Anthropic | Env-blocked |
| Dashboard | `/dashboard` | Read-only aggregation | Reads plan/scores/deadlines/opportunities | None for the route | Supabase (+ Anthropic indirectly, via plan) | Works once upstream data exists |
| University discovery | `/universities` | `app/(app)/universities/actions.ts` | `universities`, `university_programs` (read) | None for the route (`lib/universities` sync logic untested at route level) | Supabase | **Content-empty** until seed batch applied |
| World map explorer | `/universities` (desktop only) | None (client-side) | None (renders from props) | None | None | Working (`@vnedyalk0v/react19-simple-maps`, migrated off the abandoned React-16-18-only original this pass) |
| University detail | `/universities/[id]` | Read-only + admin requirement form | `universities`, `university_programs`, `university_requirements`, `university_statistics`, `university_sources` | `requirements/evaluate.test.ts`, `dedup.test.ts` | Supabase | Content-empty until seed batch applied |
| Admission outlook | `/universities/[id]`, `/applications` | `lib/admissions/outlook.ts`/`explain.ts` | `university_statistics`, `profile_scores` | `admissions/outlook.test.ts` | Supabase (no AI — confirmed deterministic, see `docs/data-readiness.md`) | Content-empty until university_statistics is populated (not in the current seed batch) |
| Requirement checking | `/universities/[id]` | `lib/requirements/evaluate.ts` | `university_requirements`, student facts | `requirements/evaluate.test.ts` | Supabase | Content-empty until seed batch applied |
| University sync job | `/api/jobs/sync-university-data`, admin trigger | `lib/universities/sync-us-universities.ts` | `universities`, `university_statistics`, `university_sources` | None | `CRON_SECRET` + College Scorecard | Env-blocked, never run |
| Opportunities browse | `/opportunities` | `app/(app)/opportunities/actions.ts` | `opportunities`, `saved_opportunities`, `opportunity_matches` | `opportunities/matching.test.ts`, `dedup.test.ts` | Supabase | Content-empty until seed batch applied |
| Opportunity discovery job | `/api/jobs/discover-opportunities`, admin trigger | `lib/opportunities/discover.ts` | `opportunities`, `opportunity_sources` | Covered indirectly via dedup tests | `CRON_SECRET` + Tavily + Anthropic | Env-blocked, never run |
| Requirement discovery job | `/api/jobs/discover-requirements` | `lib/requirements/discover.ts` | `university_requirements`, `university_sources` | `requirements/dedup.test.ts` | `CRON_SECRET` + Tavily + Anthropic | Env-blocked, never run |
| Deadline reminders job | `/api/jobs/deadline-reminders` | `lib/deadlines/scan.ts` | `notifications`, cross-source deadlines | None | `CRON_SECRET`; secret key for notification writes | Env-blocked |
| Applications tracker | `/applications`, `/applications/[id]` | `app/(app)/applications/actions.ts` | `applications`, `application_requirements`, `target_universities` | Indirectly via `admissions/outlook.test.ts` | Supabase | Working |
| Peer benchmarking | On Profile page | `lib/benchmarking/` | `profile_scores` cross-user aggregate | `benchmarking/compute.test.ts` | Supabase secret key | Working, but every cohort is n=0 pre-launch by design (shows "not enough students yet") |
| Global search | `/search` + ⌘K command palette | `app/(app)/search/actions.ts` | Cross-table (`lib/search/`) | `search/rank.test.ts` | Supabase | Working |
| Notifications | Nav bell | `app/(app)/notifications/actions.ts` | `notifications` | None | Supabase secret key (writes); reads work without it | Env-blocked (writes only) |
| Settings / privacy | `/settings` | `app/(app)/settings/actions.ts` | `profiles` | None for the route (auth-gate fixed this pass — was `verifySession`, now `requireUser`) | Supabase; secret key for account deletion | Working (deletion env-blocked) |
| Data export | Settings → export | `app/api/export-data/route.ts` | Nearly every user-owned table, explicit per-table filters | `export/tables.test.ts` (12 cases) | Supabase | Working |
| Account deletion | Settings → delete | `app/(app)/settings/actions.ts` | Cascades from `profiles` | None | Supabase secret key | Env-blocked |
| Documents (evidence uploads) | `/documents` | `app/(app)/documents/actions.ts` | `evidence_files`, Storage `evidence` bucket | None | Supabase Storage | Working |
| Admin panel (non-moderation) | `/admin` | `app/(app)/admin/actions.ts` | `provider_health`, `external_sync_jobs`, `ai_usage` | None | Supabase secret key | Env-blocked |
| CI | GitHub Actions | `.github/workflows/ci.yml` | None | N/A | None (deliberately credential-free — verified via a real `npm ci`, not assumed) | **Working — confirmed green on GitHub Actions**, not just locally |

## Not yet built (confirmed absent, not just undiscovered)

- **Per-program requirement discovery** — the requirement-discovery job is university-wide
  only; attributing a found page to one specific program needs more targeted queries than
  exist today (documented limitation, not a bug).
- **Parcoursup/France-specific admissions ingestion** — `AGENTS.md` names this
  specifically; no code path for it exists.
- **Opportunity moderation/review-before-publish state** — new discoveries are stored
  directly as `active`; see `docs/data-readiness.md`.
- **Suspension/ban enforcement** — the moderation panel can track a report's review state
  but has no punitive action; see `docs/founder-blocked-backlog.md` item 12.
