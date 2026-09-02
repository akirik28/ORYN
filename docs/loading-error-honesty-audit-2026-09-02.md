# Loading and error-state honesty — Phases 44/45, 2026-09-02

**Status:** documentation only, no code change. Gates green (typecheck/lint — no source
file touched, so no test/build impact). **Author lane:** oryn (this session), at oryn-a7's
request, one layer above [[project_oryn_structured_output_failure_audit]]. **Branch:**
`oryn/loading-error-audit-2026-09-02`.

## The ask

Phase 44: skeletons, no frozen buttons, no fake percentage loaders. Phase 45: a
human-readable error, and specifically — when a refresh fails, does the student still see
the stale-but-real data, or an empty page. Walk the advisor, weekly-plan generation, CV
import, and a university detail page with real waits against the live dev server.

## Relationship to prior work — extends, doesn't repeat

`docs/empty-loading-error-state-audit.md` (Phase 43's own pass, earlier) already
established `EmptyState`/`ErrorState`/`PageSkeleton` as the dominant, mature pattern across
16 `loading.tsx` files and fixed 5 hand-rolled empty states plus one frozen-button case
(the applications dialog). It **explicitly scoped out** `app/(app)/dashboard/page.tsx` and
`features/dashboard/**` as reserved for a concurrent package, and it audited empty/error
states, not the active-waiting state specifically (frozen buttons, fake progress). This
pass covers exactly that gap: the dashboard/weekly-plan surface, and the active-loading
moment itself across all four named surfaces.

## The advisor — live-verified with a real message

Attached to the already-running dev server, reused a persisted `oryn.qa.b` session,
navigated to `/advisor`. Typed a real message ("Should I start another entrepreneurship
club?" — AGENTS.md's own Phase 8.3 worked example) and submitted it via a real
`element.click()` on the send button (the Browser pane went hidden partway through this
task, same recurring failure mode three other lanes hit tonight — `javascript_tool`
interaction and `read_page`/`get_page_text` observation both stay reliable in that state,
per the established workaround, so the live check continued rather than stopping).

**Confirmed live**: the submit button disabled immediately on send
(`disabled={!aiConfigured || isPending || !input.trim()}`), and the student's message
appeared optimistically. Read `features/advisor/advisor-chat.tsx` and
`components/oryn/advisor-message.tsx` directly for the exact pending-state UI (the reply
resolved faster than this session's sequential tool-call latency could screenshot mid-wait,
so the source read is what actually confirms the mechanism, not the screenshot):
`AdvisorMessageThinking` renders `aria-busy="true"`, `aria-live="polite"`,
`role="status" aria-label="Composing a response"`, and three `animate-pulse` bars of
decreasing width — a real, accessible, content-shaped indicator, not a generic spinner or
fake percentage. The disabled button is not a "frozen button" in the Phase 44 sense: it's
paired with this real, visible explanation of why.

**The live reply itself was substantively correct**, worth noting as a bonus rather than
noise: it recommended against starting another club, citing the student's already-strong
leadership/entrepreneurship profile — matching AGENTS.md's own worked example for this
exact question almost verbatim, live, not asserted from the prompt alone.

**Failure/degrade path, from source** (not re-triggered live — would need a real induced
failure): a failed message renders its own bubble with the real `errorMessage` (or an
honest `t("couldntComplete")` fallback) and a "Try again" retry button, sourced from the DB
on reload, not just transient state. A degraded (cheaper-model) reply carries a `meta` label
and an explanatory footnote — the exact mechanism `docs/ai-spend-cap-2026-09-02.md`
documented earlier tonight, now confirmed present in the actual render path, not just the
data layer.

## Weekly-plan generation — well-built from source, not live-triggered

`features/dashboard/generate-plan-button.tsx`: a real `Loader2` spinner
(`animate-spin`) replaces the icon and the label swaps to `t("thinking")` ("Thinking…")
during `isPending`; the button disables with that visible explanation, not silently. A
destructive-action confirmation dialog gates "Regenerate" specifically (not first-generate)
because it hard-deletes every current action and reflection with no undo — the component's
own comment reasons through exactly why the default should confirm rather than trust every
future caller to remember. Errors surface via a `sonner` toast, never silently.

**Deliberately not triggered live**: unlike the advisor's single ~$0.03 message,
regenerating a real plan on a QA account would destroy that account's current actions and
reflections (per the component's own documented behavior) for a surface whose loading/error
code is already unambiguous from source — the marginal confidence a live click would add
didn't justify the destructive side effect on shared QA infrastructure.

## CV import — well-built, matches Phase 61 verbatim

`features/onboarding/steps/import-step.tsx`: during `status === "uploading"`, the dropzone
swaps to a real spinner plus `t("readingCv")` ("Reading your CV…") and
`t("readingCvHint")` ("This usually takes a few seconds.") — an honest time expectation,
never a fake percentage. The file input disables during upload (prevents a double-submit).
On failure, `errorMessage` renders as real destructive text next to the dropzone, not
swallowed. The success copy ("We found {count} items. Review before adding them...") is
Phase 60's own spec sentence, live in the actual component.

**Deliberately not triggered live**, same reasoning as weekly-plan generation: a real CV
upload is a real, billed Anthropic call, and the source is unambiguous enough that a live
run would mostly re-confirm what's already clear from the code.

## University detail page — no live "refresh failed" scenario to test, traced precisely

Read `lib/admissions/persist.ts`'s `refreshAdmissionOutlook` (the one function on this page
that recomputes something) directly, not assumed from an earlier pass's summary: it's pure,
deterministic computation over already-fetched data — no AI call, no external network call,
confirmed by its own header comment and by reading the function body. It writes back
through the student's own RLS-scoped client (`target_universities`, gated on the student's
own `user_id`), never an admin client — so it's structurally not exposed to the
`SUPABASE_SECRET_KEY`-missing crash class `refreshOpportunityMatches`/
`refreshRequirementEvaluations` were fixed for earlier this session. Its own persist-back
failure is checked (`{ error: updateError }`, destructured not discarded), logged not
thrown, and — per its own comment — deliberately invisible to the student: the function
returns the freshly *computed* value regardless of whether the cache-column write
succeeded, so the page always renders the correct, current outlook even on a persist
failure. There is no version of this page where stale or fabricated data renders silently,
because there's no failure mode that would produce one.

**Live-checked MIT's real page** (`get_page_text`, since the hero image and layout weren't
reliably screenshottable while the pane cycled hidden/visible): a populated stat grid
(student count, admission rate, cost, test scores, graduation rate) with a real
`SourceBadge` — "Kaynak: College Scorecard (US Dept. of Education, IPEDS-derived)... 15 gün
önce kontrol edildi, Yüksek güven" ("Source:..., checked 15 days ago, High confidence") —
and a genuine Strengths/Gaps/Unknowns outlook structure (Phase 16.2), confirmed live rather
than from source alone.

**The actual live instance of Phase 45's own worked example is elsewhere**: `/opportunities`,
`/opportunities/[id]`, and the dashboard's opportunity preview already show a real
`ErrorState` banner ("We couldn't refresh your matches just now...") when
`refreshOpportunityMatches` degrades, backed by a real `{ refreshed: boolean }` return
value — built and confirmed in an earlier pass this session
(`docs/known-issues.md`'s insert-forgery/admin-degradation history). The university detail
page was the surface oryn-a7's framing named, but it isn't the one with this specific
failure mode; naming that precisely rather than forcing a test onto a page that doesn't
have the scenario.

## No fake-progress pattern anywhere — checked systematically, not just per-surface

Grepped every `features/**` and `components/oryn/**` file for `setInterval`/counter-driven
progress alongside anything progress/percent-labeled. Three matches:
`monthly-usage-meter.tsx` (the advisor's real message-quota bar, live-confirmed
300→299 after the real send above — genuine data, not simulated), `command-palette.tsx`
and `onboarding-wizard.tsx` (neither actually uses `setInterval` — a broader grep
combining two separate patterns matched them on an unrelated `useState(0)`, checked and
ruled out directly rather than left as a false positive). No AI-wait surface anywhere in
the codebase fakes progress with a timer.

## Sizing "honest but generic" vs. "honest and specific," as asked

Across every AI-backed Server Action checked (advisor chat, weekly plan, CV import,
research generator, essay outlines, achievement refinement, requirement interpretation):
every one classifies `RateLimitExceededError`/`AIProviderNotConfiguredError` specifically
and shows accurate text for those. For the residual "everything else" branch (which
schema-validation-exhausted failures fall into, since they carry no `status` field for
`aiServiceFailureMessage` to classify on):

- **Honest but generic** (a fixed sentence, not tailored to what actually failed):
  weekly-plan Regenerate ("Something went wrong generating your plan."), research
  generator, essay outlines, achievement refinement — all show a short, honest, feature-
  named fallback.
- **Honest and specific** (the real error text reaches the surface): the advisor's failed-
  message bubble (`message.errorMessage`), CV extraction (`CVExtractionFailedError`'s
  Phase-61 sentence is itself specific to "couldn't read this document," distinct from
  rate-limit/not-configured), and `requirement_interpretation`'s admin-only Server Action
  (`error.message` reaches the UI directly, unclassified — acceptable specifically because
  this surface is founder/admin-only, not student-facing, so a more technical message
  carries less risk than it would on a student page).

Roughly an even split, and the pattern tracks a real distinction: features have a specific
message where one meaningfully changes what the student would do next (a document genuinely
couldn't be read vs. try again shortly); the generic fallback is used where "try again" is
already the correct, complete advice regardless of the underlying cause.

## What this deliberately did not do

- No live trigger of weekly-plan regeneration or a real CV upload — both are real, billed,
  and (for the former) destructive; the source code for both is unambiguous enough that a
  live run's marginal confidence didn't justify the cost/side effect.
- No full skeleton-vs-content shape audit of all 16 `loading.tsx` files — spot-checked
  `/advisor`'s `variant="detail"` choice specifically (a rough, not exact, match to its real
  two-column chat+sidebar layout) and named it as a minor polish item, not a defect worth a
  fix in this pass.
- No re-litigation of Regenerate's generic-fallback gap — already named in the structured-
  output audit; this pass confirms it's the only instance of its kind, not a new finding.
- No change to `aiServiceFailureMessage` or any component — this pass found the mechanism
  genuinely well-built where it looked, and Phase 26/44/45's own instruction not to fix what
  isn't broken applies here directly.

## Verification

```
typecheck   clean
lint        clean
```

No test or build impact — no source file was touched, only `docs/known-issues.md` and this
handoff doc.
