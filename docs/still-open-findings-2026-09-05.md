# Still-open findings across docs/ — 2026-09-05 fleet audit

CEO's dispatch: audit every dated findings/audit doc under `docs/` (319 files), determine which
open findings still hold against the current codebase, mark the closed ones in place with a
verified commit, and bring back "List 1" — the real work backlog.

**Headline**: 319 documents scanned → ~485 concrete findings extracted → **174 confirmed still
open** (this document) + **93 uncertain** (own section below, not merged into the open count —
mostly needs a live DB read or an event this pass couldn't trigger) + ~226 likely closed (24
docs annotated in place with a verified commit; see each doc's own "✅ 2026-09-05 audit"
section — a bare per-batch tally of "likely closed" without a hash is not repeated here, since
an unverifiable "closed" claim is exactly what caused today's dispatch errors).

Every line below cites its source doc — read that doc for full context before acting on any one
item. Grouped by theme, not by doc, so a lane can be handed one section without wading through
the rest.

---

## Security / RLS — the permissive-update sweep (8 unguarded columns, one sweep, none fixed)

All eight from `docs/permissive-update-policy-sweep-2026-09-04.md`, explicitly "nothing fixed"
in that doc and reconfirmed unchanged through migration 0133 today:

1. `target_universities` — 8 admission-outlook columns unguarded, owner can PATCH directly
   (also served verbatim to a parent).
2. `evidence_status` unguarded on 10 achievement tables (only `evidence_files` has the
   equivalent guard).
3. `advisor_conversations.summary`/`.summarized_at` unguarded (admin-only legitimate writer).
4. `recommendations.body`/`author_id`/`relationship` smuggleable via the recipient's own
   visibility toggle.
5. `notifications.title`/`body`/`link`/`category` smuggleable despite the migration's own
   "system-generated" comment.
6. `messages.body`/`sender_id` smuggleable via the recipient's own mark-read update.
7. `connections.requester_id` smuggleable via the recipient's own response action.
8. `advisor_generation_locks` has full owner CRUD, bypassing the RPC pair meant to gate
   concurrency.

Plus, separately:
9. Migration 0048 (`profile_views` RLS gap — any signed-in account can insert a row against an
   arbitrary UUID) still unapplied — `docs/doc-staleness-audit-2026-09-02.md`. Confirmed live:
   `pg_policy`'s WITH CHECK is still bare `(viewer_id = auth.uid())`.
10. `createApplication` inserts `target_university_id` with no check the row belongs to the
    caller — `docs/applications-actions-audit-2026-09-02.md` (data-integrity nuisance, not an
    RLS bypass — the row is still scoped by the caller's own `user_id`).
11. Nothing grants `profiles.is_admin` via UI — still SQL-editor only — `docs/qa-environment-
    readiness-audit.md`.

---

## Legal / compliance

1. `LEGAL_REVIEW.md` §2 still says "the student's school name is not sent" to Anthropic —
   false since `schoolName` entered the advisor context (commit `0833bd54`, 2026-09-03).
   Replacement text already drafted in `docs/legal-review-s2-duzeltme-2026-09-03.md`, never
   applied. (`docs/legal-review-currency-check-2026-09-03.md`,
   `docs/legal-review-s2-duzeltme-2026-09-03.md`)
2. Seven `COMPANY` legal-identity fields still `unresolved()` in `lib/legal/content.ts`
   (legalName, registrationNumber, registeredAddress, privacyContactEmail, verbisRegistration,
   dataProtectionOfficer, governingLaw) — needs founder + counsel input.
   (`docs/founder-blocked-backlog.md` item 43, `docs/kurucu-sirket-bilgileri-eksikleri-
   2026-09-04.md` — same 7 fields, duplicate finding)
3. `companyPrivacyEmail` unresolved placeholder — same root cause as #2.
   (`docs/rename-verification-2026-09-03.md`, `docs/rename-visual-verification-2026-09-03.md`)
4. AI spend-cap silent model degradation isn't disclosed anywhere in Terms/Privacy copy, only
   in-app. (`docs/legal-copy-vs-product-gap-2026-09-02.md`)
5. No marketing-email opt-in consent step or DPIA exists before any promotional email could be
   sent to a student. (`docs/minor-commercial-email-legal-2026-09-04.md`)
6. §4 legal question (dual-consent for parent access) still unanswered; `LEGAL_REVIEW.md` §8
   was never written. (`docs/veli-hesabi-spec-2026-09-04.md`)
7. Guardian-consent/minor-capacity question for Ultra purchases — undecided legal/business
   question, not a code defect. (`docs/ultra-sales-readiness-scope-2026-09-03.md`)
8. No takedown mechanism or public contact channel exists for an opportunity-image rights
   holder — manual DB query + storage delete only. (`docs/opportunity-image-licensing.md`)

---

## Jobs / scheduling

1. Job D (`generate-weekly-plans`) still not armed in `vercel.json` — deliberate, pending a
   tier/pricing decision, but the spend-ceiling prerequisite (`weekly-plan-budget.ts`, migration
   0102) is now built and waiting. (`docs/ai-cost-at-scale-2026-09-02.md`,
   `docs/job-scheduling-decision-2026-09-02.md`, `docs/maliyet-guncelleme-2026-09-03.md`,
   `docs/weekly-plan-recheck-2026-09-04.md`, `docs/scheduled-jobs-phase30-mapping-2026-09-01.md`)
2. `opportunity_reverification` job has real code (fully built, per multiple docs) but no cron
   entry — never scheduled. (`docs/maliyet-guncelleme-2026-09-03.md`)
3. Advisor-conversation retention-summary job: "built, not armed" — `vercel.json`'s crons have
   no entry for it; migration 0112's own columns exist live but the job stays dormant.
   (`docs/advisor-summary-quality-eval-2026-09-03.md`, `docs/ultra-feature-degraded-state-
   2026-09-03.md`)
3. Universities' half of Job B (deadline/opportunity re-validation) has no route at all — the
   opportunities half now does (unarmed). (`docs/scheduled-jobs-phase30-mapping-2026-09-01.md`)
4. `job-budget.ts`'s `JobBudgetFeature` has no aggregate ceiling for `weekly_plan` — if Job D is
   ever armed without this, it has no spend ceiling. (`docs/ai-cost-at-scale-2026-09-02.md`,
   `docs/ai-spend-cap-2026-09-02.md`)
5. The four scheduled routes never log which of 4 distinct 401 causes fired (unset secret,
   mismatch, absent header, malformed header). (`docs/cron-auth-path-verification-2026-09-02.md`)
6. Three `ai_usage` readers all fail open on a table-read outage — named, never restructured,
   explicitly deprioritized. (`docs/ai-spend-cap-2026-09-02.md`)

---

## Opportunity data quality

**Structural/schema gaps:**
1. `opportunities.cost` is a bare numeric — no currency column, can't hold tiered/foreign-
   currency prices. `financial_aid_available`/`funding_available` are duplicate,
   never-reconciled columns. (`docs/ORYN-AI-DEVIR-RAPORU-2026-08-28.md`, `docs/opportunity-
   cost-coverage-2026-09-03.md` + 2 sibling cost docs)
2. `deadline` can't distinguish rolling/no-deadline vs. not-yet-announced vs. unresearched —
   the proposed `deadline_mode` column was approved in principle, deliberately never built.
   (`docs/opportunity-deadline-coverage-measurement-2026-09-03.md`, `docs/opportunity-deadline-
   gaps-2026-09-02.md`)
3. `eligible: boolean` can't represent "unverified" — 3-state redesign proposed, unbuilt (a
   separate, larger migration than the age/grade/country basis columns already shipped).
   (`docs/eligibility-boolean-refactor-notes-2026-09-03.md`)
4. `opportunities.cycle_status` conflates lifecycle-position with date-known axes (`closed` vs.
   `date_not_announced`) — unresolved founder decision. `ApplicationStatus`/`TargetStatus`
   single-enum conflation loses the "was accepted" fact on withdrawal.
   (`docs/feat2-multi-axis-status-audit-2026-08-22.md`)
5. Ingest discards duplicates outright (`{outcome:"duplicate", row:null}`) — 89 enrichment
   proposals have no apply path since ingest can't update-in-place. Dedup itself has a blind
   spot: title-only duplicates slip through when `organization` is null (47% of rows).
   (`docs/opportunity-data-decision-2026-09-02.md`, `docs/opportunity-research-staging-
   2026-09-02.md`, `docs/opportunity-duplicate-pairs-2026-09-03.md`)
6. No promotion path exists from `under_review`/`disabled` back to `active` anywhere in the
   codebase — only the demotion direction was ever built (`canAutoApplyPromotion()` hardcoded
   `false`). Population is "structurally a graveyard" at 27 rows. (`docs/opportunity-
   verification-gate-tightening-impact-2026-09-02.md`, `docs/opportunity-stale-identity-
   measurement-2026-09-03.md`, `docs/under-review-pool-audit-2026-09-03-third-pass.md` ×2,
   `docs/yeniden-dogrulama-karari-2026-09-03.md`)
7. `setOpportunityDisabled` derives target status from a boolean alone, no defense-in-depth
   guard restricting the false→active direction to rows currently disabled. (`docs/under-
   review-pool-audit-2026-09-03.md`)
8. `classify.ts` has no date-currency/date-range-awareness check, and misses two real
   heading-style deadline/date shapes ("Program runs [dates]", "## Important Deadlines") that
   caused real false negatives (Stanford, Harvard SSP). (`docs/opportunity-vocabulary-gap-
   corpus-pass-2026-09-03.md`, `docs/opportunity-excerpt-vocabulary-gap-2026-09-03.md`,
   `docs/opportunity-hidden-live-records-measurement-2026-09-03.md`)
9. `profileNeedScore` is a binary 85/45 flag (doesn't distinguish zero vs. thin evidence); the
   fixed 13-entry `CATEGORY_DIMENSIONS` map can't express per-opportunity relevance; match
   personalization covers only 3 of Phase 12's 7 spec dimensions.
   (`docs/opportunity-match-score-diagnosis-2026-09-03.md`, `docs/phase79-final-audit-
   2026-09-02.md`)
10. Browse's `matchTierKey`/tier ranking is a pure function of `match_score`, ignoring
    eligibility confidence — unlike Counselor's scoring, which damps for unknown eligibility.
    Ranking also can't distinguish "prestigious but unreachable" from "achievable" —
    `matching.ts` has zero `selectivity_tier` references. (`docs/match-confidence-gap.md`,
    `docs/homepage-strip-top5-quality-2026-09-03.md`)
11. Compare page's `selectivityLabel` map omits the real enum value `"unknown"`, rendering
    identically to missing data. (`docs/c7-comparison-thin-data-2026-09-04.md`)
12. 74 active `cycle_status='unverified'` rows pass the verification gate on pipeline-lineage
    timestamps alone — the stricter `source_verified_at` gate exists in code but "excludes
    nothing" on today's corpus yet. (`docs/opportunity-catalog-student-risk-2026-09-02.md`)
13. Deadline-only writes never touch stale "not confirmed" prose sitting in `description` —
    no systemic guard. ~74 rows still carry leaked internal research notes (live spot-check: 6
    active rows still match the leak pattern). (`docs/opportunity-deadline-contradiction-audit-
    2026-09-03.md`, `docs/description-internal-notes-leak-2026-09-03.md`)

**Specific unresolved data rows** (each needs a person to research/apply, not a code change):
14. HKBU's dead official_url, Duke TIP 2024's stale branding, Maastricht's correct-but-unapplied
    URL fix (3 separate docs re-confirm the same 3 rows over 3 days). (`docs/opportunity-
    catalog-closeout-2026-09-02.md`, `docs/opportunity-deadline-coverage-2026-09-03.md`,
    `docs/oku-beni-recheck-2026-09-03.md` ×2, `docs/yedi-kapsanmayan-kayit-2026-09-03.md`
    (Duke TIP + Exeter's official_url pointing to a personal profile page))
15. Marshall Society's wrong organization; Trinity College Dublin's title wrongly says "London."
    (`docs/opportunity-description-org-mismatch-sweep-2026-09-03.md`)
16. Breakthrough Junior Challenge mislabeled `competition` instead of `scholarship`, staged fix
    never applied (12-day-old deadline as of the original finding). (`docs/kararlar-
    2026-09-03.md` item A4)
17. 16 real opportunities left in `under_review` awaiting a founder promotion decision.
    (`docs/drive-import-under-review-triage-2026-09-03.md`)
18. Waterloo/CEMC split: SQL prepared and merged (`docs/waterloo-cemc-split-execute-
    2026-09-04.sql`) but **not applied to the live database** — the bundled row is still the
    only one live. (`docs/waterloo-cemc-split-plan-2026-09-04.md`, re-confirmed 2026-09-05)
19. D2's eligibility-basis fill SQL blocked — none of migrations 0126/0129/0133 are live yet
    (0/5 relevant columns exist), so every prepared fill file for age/grade/country eligibility
    is inert. (`docs/opportunity-eligibility-d2-not-found-2026-09-04.md`, `docs/d2-visible-set-
    fill-2026-09-05.md`, `docs/d6-looks-full-but-empty-audit-2026-09-04.md`, `docs/weekly-plan-
    recheck-2026-09-04.md`)
20. Staged QS top-100 university requirement fills (NUS/Tsinghua/Peking/HKU/CUHK + more) — still
    genuinely 0 live rows for every one checked, re-confirmed as of today even after a same-day
    merge that might have looked like a closure but wasn't (see `docs/d1-qs-top100-fill-
    2026-09-04.md`, cross-checked against the newer `docs/d1-qs-top100-fill-2026-09-05.md`,
    which independently reconfirms the same non-application).
21. MIT and HKUST each still exist as two duplicate opportunity/university rows — the
    supersession-map display fix means students see the right one, but the duplicate rows
    themselves were never merged/removed. (`docs/d1-qs-top100-fill-2026-09-04.md`)

---

## University data quality

1. Whole missing sectors, staged not applied: Finland's 22-institution AMK sector (live count
   still 9), Germany's 192-institution HAW/Fachhochschule sector (live count still 49),
   Ireland's 4 missing Technological Universities (live count still 8), Austria's 21
   Fachhochschule rows (live count still 10). (`docs/finland-amk-sector-2026-09-03.md`,
   `docs/germany-haw-sector-2026-09-03.md`, `docs/ireland-tu-sector-2026-09-03.md`,
   `docs/austria-fh-sector-2026-09-03.md`)
2. `academic_tier` (migration 0108) is live and applied to the schema, but **zero application
   code anywhere reads it** — no badge, no filter, no compare column. The "277 institutions
   backfilled" claim in one doc is wrong; live-confirmed all 1019 rows are still null.
   (`docs/academic-tier-existing-catalog-measurement-2026-09-03.md`, `docs/academic-tier-
   migration-proposal-2026-09-03.md`, `docs/student-core-loop-trace-2026-09-04.md`,
   `docs/bugun-dogrulama-2026-09-04.md`, `docs/kararlar-2026-09-03.md` item E)
3. `institution_type` schema still can't hold an HBO/WO (or equivalent) distinction without
   corrupting existing meaning. (`docs/netherlands-hbo-sector-2026-09-03.md`)
4. Draft `university_statistics` SQL for Oxford, LSE, Erasmus, UvA, Boğaziçi, Bocconi, Caltech
   never applied — live-confirmed LSE/Erasmus/UvA/Boğaziçi/Bocconi/Warwick have **zero**
   `university_statistics` rows at all; Oxford's own row has all 4 admission fields null.
   (`docs/d8-target-universities-stats-completeness-2026-09-04.md`, `docs/d6-looks-full-but-
   empty-audit-2026-09-04.md`)
5. `requirement_groups` is 0 rows — the alternative-requirement grouping schema exists,
   deliberately unauthored. No UI lets a student pick a specific program at target-save time
   (both call sites still call `addTargetUniversity(id)` with no `programId`). (`docs/
   university-requirements-coverage-2026-09-03.md`)
6. Detail page's `lacksResearchDepth` filters to `verification_state='verified_current'`; the
   bulk browse-grid scan counts any row unfiltered — the "Detailed profile" badge on the Browse
   list still runs on the old coarse check, not the newer `lacksCoreAdmissionStats`/
   `lacksApplicationDeadline` predicates (95.3% of badged universities are missing at least
   one). (`docs/d3-fill-priority-2026-09-04.md`, `docs/browse-list-honesty-audit-2026-09-04.md`)
7. 72% of universities carry `data_status='needs_review'`, never surfaced to a student — only
   admin/pipeline code reads the column. (`docs/university-explorer-traceability-audit-
   2026-09-02.md`)
8. `SAT`/`ACT`/`graduation_rate` are fetched for the compare page but never rendered as their
   own comparison row (minor, doc itself calls it "not a bug"). (`docs/c7-comparison-thin-data-
   2026-09-04.md`)
9. Per-program requirement discovery not built (university-wide only); no real Parcoursup
   ingestion pipeline exists (only a classification pattern-matcher). (`docs/feature-
   inventory.md`)
10. `shape-audit.ts`'s stale "no test_scale column" text, unchanged despite migration 0056
    being live for weeks — a one-line cleanup never applied. (`docs/requirements-archive-
    followups-2026-09-03.md`)

---

## Dashboard / advisor / AI

1. `generateText`'s success path never checks `stop_reason` — a truncated-but-present text
   block still returns as success, indistinguishable from a clean finish. (`docs/advisor-chat-
   stability-eval-2026-09-03.md`, `docs/advisor-conversation-audit-2026-09-02.md`)
2. Model still invents "exam period" as the cause for busy mode when none is stated — prompt
   text literally contains the example. Low severity, plausible guess, but still a fabrication
   pattern. (`docs/advisor-chat-stability-eval-2026-09-03.md`)
3. `targetUniversities.programId` never resolved to a program name in the advisor's context;
   `savedOpportunities` isn't its own context block at all. (`docs/advisor-context-coverage-
   2026-09-03.md`)
4. Admission-outlook explanation (`notApplicableReason`/`Kind`) recomputed live on every page
   view, never persisted — the advisor can't answer "why is Oxford not-applicable" from stored
   state. (`docs/advisor-context-freshness-audit-2026-09-04.md`)
5. `reason_codes` are stored but never surfaced to students as narrative text on the progress
   page — only used as a boolean gate. (`docs/progress-history-audit-2026-09-02.md`)
6. `ultra-ambient.tsx`'s `prefers-reduced-motion` check runs once at mount, not live-reactive to
   a mid-session OS setting change (a `useSyncExternalStore` pattern already exists elsewhere
   in the codebase for this exact problem). (`docs/reduced-motion-standard-2026-09-02.md`)
7. Dialogs still don't confirm a focus trap / `aria-modal` — flagged "safe to fix, not started,"
   never independently re-tested with a live keyboard pass. (`docs/ui-audit-2026-08-22.md`)
8. No dedicated mobile filter sheet exists for Opportunities Browse. (`docs/product-ux-audit-
   2026-08-18.md`)

---

## Onboarding / profile

1. CV import (both onboarding and post-onboarding paths) is pure insert with no diff/merge/
   dedup on re-upload, and the post-onboarding path still lacks runtime Zod validation.
   (`docs/ORYN-AI-DEVIR-RAPORU-2026-08-28.md`)
2. "Enter manually" and "Skip for now" are still the identical code path
   (`setMethod("manual")`) despite different subtitle copy — re-confirmed across two separate
   audits a day apart. (`docs/onboarding-audit-2026-09-02.md`, `docs/onboarding-first-
   experience-audit-2026-09-04.md`)
3. Migration 0079's `evidence_status` read-side is still never wired for `education_records`/
   `test_scores` — types are missing it, portfolio/profile pages hardcode `null`.
   (`docs/three-unverified-migrations-2026-09-02.md`)
4. `ACTIVITY_FIELDS.organization_scope` is still the weakest remaining free-text
   canonicalization candidate (plain text, no combobox). (`docs/product-ux-audit-2026-08-18.md`)
5. Interests have no post-signup edit surface at all (onboarding-only, read-only everywhere
   else). Recommendation dismiss/history exists only for opportunities — no skip/dismiss
   affordance for weekly-plan actions or requirement-checklist items. (`docs/ui-feature-
   preservation-matrix.md`)
6. `updateBirthYear` (Settings) still lets an existing account edit its birth year down below
   14 with only a log line, no block — the only hard stop remains onboarding's own one-time
   check. (`docs/age-gate-mechanism-verification-2026-09-02.md`)

---

## Admin tooling / operational

1. Impersonation / view-as-student is still just a comment ("deferred, pending founder
   decision") — nothing built. (`docs/admin-growth-panel-2026-09-02.md`)
2. No disposable test-account seed script exists (`scripts/seed-test-users.ts` was proposed,
   never written). (`docs/qa-environment-readiness-audit.md`)
3. `markConversationRead` still fires unconditionally on mount (light confidence — not
   independently re-verified this pass as a live bug, just confirmed the code is unchanged).
   (`docs/qa-environment-readiness-audit.md`)
4. Admin's status→color map still bypasses `StatusBadge`/design tokens (raw hex/Tailwind
   classes). `components/ui/card.tsx` remains nearly unused (2 consumers vs. ~24 hand-rolled
   containers). (`docs/shared-ui-primitives-audit.md`)
5. `lib/opportunities/cycle-label-quality.ts` still has 4 real "Oryn" string literals (not
   comments) — low-priority, admin/ingestion-only tool, never reaches a student.
   (`docs/rename-sweep-blind-spots-2026-09-04.md`)
6. `signIn()`'s error messages always read from the `auth.login` namespace even for a parent
   caller — a parent's own login failure shows student-register copy. Explicitly scoped out
   when found. (`docs/parent-turkish-voice-pass-2026-09-04.md`)
7. `revokeStalePendingLinks` has no direct unit test; the accept-invite page's happy-path form
   has never been verified live. (`docs/parent-invite-flow-design-2026-09-04.md`)

---

## Payments / pricing (mostly founder decisions, not code defects)

1. No real payment provider adapter exists — `getPaymentProvider()` returns `null` for every
   configured value; the provider-agnostic interface + migration 0123 (`payment_events`) are
   built, but no concrete provider (iyzico/PayTR/Stripe) has been chosen or wired in.
   (`docs/payment-provider-seam-2026-09-04.md`, `docs/ultra-sales-readiness-scope-2026-09-03.md`)
2. Whether to add a 3rd pricing tier ("Max") is still undecided; `plan_tier`'s check constraint
   only allows `('standard','ultra')` today — adding a 3rd value needs a migration.
   (`docs/uc-katman-karari-2026-09-03.md`)
3. Migration 0058 (`social_posts`) is still deliberately unapplied, with no CI control
   preventing a fresh deploy from silently activating it by default — a real gap between
   "deliberately gated" and "actually can't happen." (`docs/migration-0058-social-layer-audit-
   2026-09-02.md`, `docs/migration-gap-audit-2026-08-31.md`, `docs/would-a-fresh-deploy-match-
   live-2026-09-02.md`)
4. `birth_year_changes` (migration 0072, live) is still wrongly listed in
   `EXPORT_EXCLUDED_TABLES`. (`docs/would-a-fresh-deploy-match-live-2026-09-02.md`)

---

## Test coverage gaps

1. No Playwright/e2e happy-path suite exists anywhere in the repo. (`docs/test-coverage-vs-
   spec.md`)
2. `passesLiveVerificationGate`/`getVerificationReality` (`lib/admin/queries.ts`) has no test.
   (`docs/vacuous-gate-test-sweep-2026-09-03.md`)
3. `searchApplications` and the full `/search` page component have no test coverage.
   (`docs/search-audit-2026-09-02.md`)
4. `requirement-chip-grid`/`requirement-checklist`'s raw-DB-value fallback has no exhaustiveness
   test against `DEFAULT_REQUIREMENTS`. (`docs/internal-detail-leak-sweep-2026-09-03.md`)
5. `mock-supabase-table.ts` is still missing `.rpc()`/`.delete()`/`.gt`-`.lt`-`.gte`-`.lte`/
   `.like`-`.ilike`/joined `.select()` support (`.upsert()` was added 2026-09-04).
   (`docs/render-test-vs-browser-verification-2026-09-04.md`)
6. Server-layer/RLS integration testing (Server Actions against real Supabase/PostgREST + RLS)
   still can't be built without Docker — an environment limitation, not a code gap.
   (`docs/production-route-audit.md`)

---

## Misc

1. 15 files' `.data ?? []` pattern (swallows a read error as "empty") was fixed in the 3
   highest-priority files, but the systemic decision was never made — 5+ more files
   (`story-bank/actions.ts`, `universities/actions.ts`, `monthly-review.ts`, `search/index.ts`,
   `social/posts.ts`) remain unmigrated, and the raw pattern count across the codebase is now
   107. (`docs/absence-as-known-value-inventory-2026-09-03.md`)
2. `browse.ts`'s eligibility notes are deliberately English-only — locale never threaded
   through. (`docs/eligibility-notes-codes-2026-09-03.md`)
3. Search's per-source result caps (5/8) aren't communicated to the student anywhere in copy.
   (`docs/search-audit-2026-09-02.md`)
4. `weekly_actions.status` has no transition validation — any status can be written over any
   other; `skipped`/`expired` remain unreachable from the UI (no skip control exists).
   (`docs/feat2-loop-audit-2026-08-22.md`)
5. A stale-but-real `weekly_actions` row (`c621406c…`) still carries a raw
   `"Career_exploration is at 9/100"` prompt-artifact leak as of today, predicted to persist
   until its own 2026-09-07 rollover. (`docs/stale-stored-output-sweep-2026-09-02.md`, live-
   reconfirmed 2026-09-05)
6. The canonical-entity-resolution function's two-key tie is a known, deliberately-deferred
   residual (lower severity than the fixed home-strip bug — a write-time backend dedup
   decision, not a live student-facing ranking). (`docs/ranking-tiebreaker-fix-2026-09-05.md`)

---

## Uncertain — needs a live check this pass couldn't do, not a guessed verdict (93 items, grouped loosely)

Per CEO's explicit instruction, these are **not** claimed as open or closed — most need either
a live Supabase read this pass didn't run, a real event (a plan-generation cycle, an eval run)
this pass couldn't trigger without cost/side effects, or a founder-only fact (a legal decision,
an account state). Listed by rough category so a future pass can pick the cheap ones off first.

**Needs one batch of live DB counts** (cheapest to resolve — a single read-only SQL session
could close most of these in one sitting): TAVILY/COLLEGE_SCORECARD key validity; whether 14
migrations (0093-0106) are actually applied; `supabase/seed_drive_batch1.sql` ever run; 43
duplicate canonical university entities + 78 zero-evidence `official_verified` entities;
`ai_model_pricing`/`weekly_plan_budget_settings` applied; Netherlands HBO (36 rows) / WO (2
rows) staged fills applied; several small opportunity-data staged-SQL batches (category-balance,
deadline-contradiction, description-org-mismatch, eligibility-signal-fill, cost-field-handread);
migration 0029 (`story_notes`), 0069 (`_backup_*` drop), 0072-adjacent stray indexes; Caltech's
37-row requirement batch; `profiles.ultra_gift_granted_at`; 10/112 bad-grammar reasoning rows;
40/77 past-due active deadlines uncleaned; 109/197 backfillable null-organization rows.

**Needs a real triggered event, not just a read**: the reflection→next-plan consumption loop
closing with genuinely-timed real data; `advisor_chat`'s conciseness weakness after 3
prompt-tuning attempts; the act→reflect→advisor-adjusts loop observed fully end-to-end; the
parent-commentary over-claim criterion checked against real model output; a live keyboard pass
for dialog focus-trap/`aria-modal`.

**Founder/account-state facts only the founder can settle**: founder's real account `is_admin`
status and whether it should change; founder's own `birth_year IS NULL` state; EU per-country
age threshold + DOB-vs-year precision; whether Ultra's "not currently purchasable" framing still
matches intent now that a payment-provider interface exists but no provider is chosen.

**Everything else** (single-item, lower-priority, or genuinely inconclusive on a quick check):
`admin-panel`'s "last 500 calls" aggregation; 6 QA-scratch rows with stale bogus outlook;
float→integer upsert error location; dev-preview four-persona fixture switch; `0062`/`0063`
header-vs-trigger bookkeeping; 163 drive-import rows missing fields; `ActionStatus`'s latent
expired-vs-progress conflict; `auth_rls_initplan` performance pattern; `AlertDialog` coverage
gap; 43 duplicate-university-identity backlog item; hardcoded-color sweep's smaller items
(avatar, bell, palette, evidence rows); job-dry-run's mute-vs-failure collapse; "nothing
deployed, external_sync_jobs empty" (partially superseded — manual runs are confirmed, scheduled
production execution isn't); 5 opportunity records blocked by crawler-refusing hosts; IE
University's uncertain duplicate pair; broader `under_review` bare-institution-name cluster
(Cornell, Harvard, Brown); HKBU/İTÜ Tasarım Atölyesi 404 status; 3 named transport failures;
disposable-branch live-Postgres proof for migration 0123; `featured_items.item_id` ownership
check; systemic raw-value/enum-leak guard; Confirm-Email dashboard toggle; Ankara alias + UvA/VU
programme backlog + 45 misfiled deadline records; `AdvisorMessage` UI `meta.degraded` slot;
`MonthlyUsageMeter`'s stale 300-message-quota color thresholds; E2E checks B1-B12 run status;
migration 0080 + its scheduling decision; birth_year editable downward post-creation; job-budget
concurrent-invocation race; $25/$15 job-budget estimates now possibly exercised; "Summer at
Stanford" sentence-selection bug; university-surface's `sync-us-universities.ts` + 10 dev
scripts; bad FK data in `target_universities`/`applications` referencing superseded university
ids; ~57 other branch-specific findings from the unmerged-branch audit (out of reasonable-
confidence scope this pass — that audit likely deserves its own dedicated re-check, not a
same-day guess).
