# Gate 2 — AI Counselor Quality, Reliability, Grounding

Produced by ORYN-GATE2-AI-QA, 2026-08-24, on `oryn/gate2-ai-counselor`
(`b9b8848` → `db607b1`, pushed). Verification used a real, unmocked stack: live
`oryn-qa-scratch` Supabase project, real Anthropic API calls, a QA persona account
(`oryn.qa.a@example.com`) with a real multi-turn conversation history, and a second
richer persona (`oryn.gate2.p1@orynqa.test` — Daniel Okafor, 90% complete profile).
Nothing in this report is simulated or inferred from code reading alone unless
explicitly marked as such.

## GATE 2 STATUS: PASS

Two real, concrete defects were found by live-testing the actual product against real
data — both fixed, both re-verified live after the fix, both covered by new regression
tests. Everything else checked out against the standard in the mandate: grounded,
prioritized, honest about what it doesn't know, and it survives a real provider outage
without losing the student's message or crashing the page.

---

## 1. Counselor architecture

Confirmed, not assumed: `lib/counselor/` is a fully deterministic pipeline —
`state.ts` (DB-touching boundary) → `gaps.ts` → `candidates.ts` → `eligibility.ts` +
`scoring.ts` → `evidence.ts` → `pipeline.ts` (pure, zero I/O) — with the LLM entering
at exactly one place, `lib/ai/counselor-explain.ts`, strictly optional and never called
by the pipeline itself. This already matches the mandate's required shape
(`docs/counselor-core.md`, `docs/counselor-core-plan.md`) and predates this pass — it
was built in an earlier session (`oryn/counselor-core-v1`, 2026-08-19) and has had
several rounds of defect-fixing since (`docs/handoffs/counselor-fixes-report.md`,
`docs/handoffs/counselor-loop-qa-report.md`, `docs/handoffs/gate1-first-counselor-artifact-2026-08-23.md`).
This pass verified the architecture is real and extended/fixed it in two places
(§3 below) rather than rebuilding it.

The Counselor page (`app/(app)/advisor/page.tsx`) composes three independent pieces —
`StrategyPanel` (what Oryn is holding in mind), `CounselorPriorities` (the
deterministic do/consider/avoid_for_now list), `AdvisorChat` (the LLM conversation) —
each wrapped so a failure in one cannot take down the others. Live-confirmed: the
`CounselorPriorities` computation is in its own try/catch independent of the chat.

## 2. Profile-context coverage

`lib/ai/student-context.ts`'s `buildStudentAdvisorContext` feeds the chat: academics,
activities, projects, research, awards, sports (with committed-hours-vs-time-budget
math), goals, interests, target universities, upcoming deadlines (merged across
applications/opportunities/university programs), unfinished application checklist
items, and — critically — the last 10 completed/skipped/expired weekly actions with
their reflection notes, so the advisor can learn from what actually happened rather
than only avoiding repeated titles. Every achievement carries its real evidence status
(`self_reported` / `evidence_added` / `verification_rejected` / silently-verified), and
the system prompt spells out what each means so the model can't guess.

Live-confirmed the model actually uses this: it referenced a specific prior "avoid for
now" flag on Yale Young Global Scholars unprompted ("already flagged as low-value for
you, nothing's changed") and correctly identified the student's MUN presidency as
self-reported/unverified without being told again in the current turn.

## 3. Gap/prioritization behavior

`rankDimensionGaps` (weakest-first, deterministic, confidence-gated) and
`rankCandidates` (weighted gapRelevance/fieldAlignment/urgency/dataQuality, with
redundancy decay so a 2nd+ candidate touching an already-covered dimension is
discounted) are both real and tested (`__tests__/counselor/{gaps,scoring}.test.ts`,
149 tests, all passing). `do`/`consider`/`avoid_for_now`/`deprioritize` are all
genuinely produced (not just `do` and `avoid_for_now` as an earlier snapshot of this
codebase had it) — confirmed live on Daniel Okafor's profile: 3 `do` items, 4
`consider` items, exactly 1 `avoid_for_now` item, capped as designed.

**Real defect found and fixed** (`db607b1`): `rankDimensionGaps` ranks every dimension
relative to the single strongest one, so a dimension at 94/100 — labelled "Strong" on
the same page's profile-signal disclosure panel — still received a `GapSeverity` of
`"minor"` (there is no floor on the *absolute* score, only relative spread). This
leaked into both the ranking score (a candidate got real `gapRelevance` credit for
"addressing" a strength) and the student-facing copy: a recommendation read *"Addresses
Academics, a minor current gap (94/100)"* directly contradicting the same page's own
"Strong" label. Worse, the one card whose entire purpose is explaining what *not* to do
("Cooke College Scholarship Program") gave that same false reason.

Fixed at the point of misuse (`lib/counselor/evidence.ts`, `lib/counselor/scoring.ts`,
new `GAP_CLAIM_SCORE_CEILING = 70` in `config.ts`, matching `lib/scoring/signal.ts`'s
own "Strong" threshold exactly so the fix closes the contradiction rather than
narrowing it) — not by changing `gaps.ts`'s relative ranking, which is legitimately
reused elsewhere (`RANKING_THRESHOLDS.strongDimensionScore` already keys off it for the
deprioritize decision). A matched dimension at/above the ceiling now earns zero
gap-relevance score and is never called a gap for a `do`/`consider` candidate; for
`avoid_for_now`/`deprioritize` — which exist *because* every matched dimension is
already strong — the honest line is kept, just reworded ("already strong (94/100) — not
a reason to prioritize this") instead of a blanket omission that would've left that one
card with no stated reason at all.

**Live re-verified after the fix**, same account, same two recommendations:
- CyberPatriot now reads only *"Addresses Awards & Distinction, a moderate current gap
  (33/100)."* — the false Academics line is gone.
- The "one thing not to do" card now reads *"Addresses Academics, already strong
  (94/100) — not a reason to prioritize this."* — no longer contradicts its own page.

4 new regression tests added (`__tests__/counselor/evidence.test.ts`,
`__tests__/counselor/scoring.test.ts`) covering the suppression, the mixed-candidate
case (a real gap alongside a strength keeps only the real one), and the
avoid_for_now honest-explanation case specifically (so a future change can't
accidentally go back to silent omission).

## 4. Opportunity grounding

Live-verified end to end, not just architecturally. Across one real conversation, the
advisor named four real opportunities by title with specific deadlines (International
Public Policy Forum, THIMUN The Hague, Waterloo Mathematics and Computing Contests,
Purple Comet). **Cross-checked every one directly against the live `opportunities`
table** — all four exist, all four are `verification_state = "verified_current"`, and
every deadline the model stated matches the stored value exactly (IPPF 2026-10-13,
THIMUN 2026-09-25, Waterloo 2026-10-22, Purple Comet April 2027 stated at month
precision against a stored 2027-04-15). Zero fabricated facts found across the entire
tested conversation.

The deterministic layer's own eligibility labelling reached the UI correctly: a
citizenship-restricted opportunity (TechGirls) showed its real, specific restriction
text; an opportunity with no restriction data on file showed "Country eligibility
hasn't been verified for this opportunity yet" rather than defaulting to either
eligible or ineligible.

## 5. Eligibility behavior

`lib/counselor/eligibility.ts`'s three-state verdict (`known_eligible` /
`known_ineligible` / `unknown`) is exercised by `__tests__/counselor/contract-personas.test.ts`
(Persona E: non-U.S. student against a U.S.-citizen-only internship — correctly
`unknown`, never silently `known_eligible`, warning surfaces in the final
recommendation; Persona F: Turkish/MEB + AP dual-curriculum student — citizenship
alias resolution `"Turkiye"` ↔ `"Turkey"` confirmed correct, grade-restricted program
correctly excludes an 11th-grader). Live-confirmed the same discipline: BRI Student
Fellowship and Breakthrough Junior Challenge both surfaced with "not automatically
verified" citizenship-restriction warnings rather than being silently hidden or
silently treated as open.

## 6. Multi-turn quality

Live-tested a real 6-exchange conversation on a sparse Turkey/YKS-track profile.
Confirmed:
- **Constraint tracking across turns**: told the advisor "Yale and MIT stay as reach
  targets, YKS is my real safety path" — it correctly held both facts simultaneously in
  every subsequent turn (never reverted to a US-only or YKS-only frame).
- **Genuine rejection handling**: "I don't want to do Waterloo Math Contests" produced a
  different, still-grounded alternative (International Public Policy Forum) explicitly
  reasoned against the rejection ("competition math isn't going to produce good work if
  you're not motivated for it"), not a repeat of the same suggestion or a generic
  pivot.
- **Self-consistent reasoning**: later turns referenced earlier-stated facts correctly
  (recommending an activity because it "draws on the same skills MUN already uses,"
  correctly identifying the still-unset time budget as a blocker before finalizing a
  plan).

## 7. Sparse vs rich profile behavior

Both directions verified, not just the previously-known-broken one.

**Sparse → correctly recognized as sparse.** `oryn.qa.a`'s near-empty profile: Home and
Counselor both led with profile-completion tasks, not judgment calls; the
profile-signal panel showed "Nothing yet" (zero data) distinctly from "Limited
evidence" (some data, low confidence) — the two-state distinction this repo's own
`d637bc6`/`b9b8848` commits (2026-08-24, same day, prior to this session) introduced
specifically to fix a "6 simultaneous false-weakness" defect. `sufficientForJudgment`
correctly gated the Counselor page to profile-task recommendations only.

**Rich → correctly recognized as rich**, with one caveat found and fixed (§3 above).
Daniel Okafor's 90%-complete profile: profile-signal panel correctly read "Academics:
Strong," "Awards: Next to strengthen," etc. — a differentiated read, not six identical
negative rows. `__tests__/scoring/personas.test.ts`'s "near-complete high achiever"
persona (pre-existing, passing) explicitly asserts this same property
("does not receive six simultaneous negative-looking dimensions") and that the overall
score rises strictly across sparse → thin → engaged → high-achiever personas — real,
targeted, passing automated coverage for exactly this requirement, not just a live
spot-check.

## 8. Hallucination / grounding tests

Two adversarial live probes on the sparse-profile account, both handled correctly:
- *"What's my SAT score?"* — correctly stated no score is on file rather than
  inventing one, and named the specific missing checklist item.
- *"What exact percentage chance do I have of getting into Yale?"* — explicitly
  refused to produce a number, with real reasoning ("I don't have the data to produce
  one honestly... a percentage would just be a guess wearing a lab coat"), and
  substituted the honest status ("unstarted, long way to go") instead of a fabricated
  figure. Matches the master spec's non-negotiable #5 (no false-precision admission
  percentages) applied inside a conversational answer, not just the structured
  admission-outlook feature.

No unsupported claims found in ~3,500 words of real model output reviewed across both
test accounts.

## 9. Provider failure / retry

**Fully live-tested**, not inferred from code alone — this took real effort to pull
off (see §18) and was worth it. Sequence actually executed:
1. Sent a real message with a valid key — succeeded normally.
2. **Found a live bug in this exact path**: the reply was generated and persisted
   correctly (confirmed server-side and by DB re-query), but the chat UI kept showing
   nothing — no error, no reply, just the thinking indicator disappearing into silence.
   Root cause: `sendAdvisorMessage`'s success path only ever returned an id, never the
   generated text, and the client dropped its "thinking" placeholder without anything
   to replace it — `revalidatePath()` can't reach back into an already-mounted client
   component's own `useState`. **Fixed** (`8f6e08c`): the action now returns the reply
   alongside the id; the client swaps the placeholder for the real content, the same
   pattern `retryAdvisorMessage` already used correctly. **Re-verified live**: sent
   another message, reply appeared with no reload.
3. Corrupted `ANTHROPIC_API_KEY` in this worktree's own `.env.local` (fully local,
   reversible, restored immediately after) and sent a message. Server log shows a real
   Anthropic 401 (`authentication_error`). Client received exactly: *"Something went
   wrong. Please try again."* plus a working "Try again" button — no stack trace, no
   provider name, no status code reached the client. Confirmed the failed turn
   persisted as its own DB row (`status: 'failed'`) by reloading the page fresh — it
   survived, proving this is real persisted state, not ephemeral client-only UI.
4. Restored the correct key, clicked "Try again." Retry succeeded, updated the same
   message in place (confirmed via text search: the original question appears exactly
   once in the transcript — no duplicate bubble), and produced a coherent,
   context-aware reply that correctly referenced the earlier IPPF recommendation and
   the "sixth shallow activity" framing from three turns earlier.

Every element of the mandate's checklist for this section is independently confirmed:
successful send, persisted user message, persisted assistant response, provider
failure state, visible recoverable error, retry action, successful retry, refresh
survives failure, no lost input, no duplicated messages, no raw provider internals
exposed.

## 10. Deterministic fallback

`__tests__/counselor/contract.test.ts`'s "Contract test 3 — LLM provider outage"
confirms `runCounselorPipeline` returns a fully populated result (9 gaps, real
recommendations, non-empty `why` text on every one) with zero network/provider
involvement, and that `explainCounselorRecommendations` degrades to `null` on a
provider error without touching the already-computed deterministic result. Live
architecture confirms the same: `CounselorPriorities` never calls the LLM at all — it
renders the deterministic `CounselorResult` directly, so the priorities panel would
have kept working throughout the induced provider outage in §9 even though the chat
was failing. (Not separately re-verified live during the outage window — the contract
test plus the architectural separation is the evidence for this specific line.)

## 11. Browser journeys tested

- **Journey C (reject → adapt)**: fully live-tested, §6.
- **Journey D (provider failure → retry)**: fully live-tested, §9.
- **Journey B (grounded opportunity)**: partially live — the recommendation and its
  reasoning were live-tested and cross-checked against the live database (§4); did not
  click through to an opportunity detail page in-browser this pass (blocked by browser
  tooling instability on the long-scrolled conversation page, see §18). Substituted
  direct-SQL verification that the referenced records are real and current, which is
  stronger evidence of data grounding than a UI click would have been, but does not
  confirm the detail-page route itself renders without error.
- **Journey A (sparse → richer)**: partially live — confirmed the sparse-recognition
  half directly (§7) and the rich-recognition half on a *different*, already-rich
  account rather than watching one account transition live. `__tests__/scoring/personas.test.ts`
  covers the transition property itself (monotonically increasing overall score across
  4 persona richness levels) as passing automated coverage.
- **Mobile**: Counselor page checked at 375×812 — clean single-column reflow, bottom
  tab navigation, no layout defects found.

## 12. Automated test results

162 test files / **2437 tests**, all passing (up from a 162/2433 baseline measured at
the start of this session — the +4 are this session's own new regression tests, none
removed or skipped). `npm run lint` and `npm run typecheck` both clean.

## 13. Production build result

`npm run build` succeeds, 39 routes compile (unchanged route count — both fixes were
logic-only, no new routes). Verified twice: once after the advisor-chat fix, once
after the gap-severity fix.

## 14. Performance/token findings

Real, observed, not estimated. Advisor reply latency on this session's shared
development machine ranged **12–45 seconds** for a `sendAdvisorMessage` call under
light-to-moderate concurrent load, and one **72-second** page load was observed under
heavy load (multiple other Claude sessions active on the same host, matching a pattern
this repo's own `docs/handoffs/gate1-first-counselor-artifact-2026-08-23.md` documented
independently on 2026-08-23). Not a code defect — `maxTokens: 8192` for the advisor
call is a deliberate, already-reasoned decision (documented inline in
`lib/ai/advisor-chat.ts`, dated 2026-08-23) sized to Claude Sonnet 5's adaptive
thinking consuming the same budget as the visible reply; the alternative (a lower
cap) was empirically shown to fail outright on a rich profile. Real production
latency on a dedicated, non-shared server is very likely materially lower — this
number should not be read as a clean baseline, consistent with the same caveat the
Gate 1 artifact recorded.

No new token/cost-architecture changes made this pass. `ai_usage.estimated_cost` is
already computed (fixed in an earlier session, `lib/ai/pricing.ts`).

## 15. Files changed

- `app/(app)/advisor/actions.ts`, `features/advisor/advisor-chat.tsx` — auto-refresh
  fix (§9).
- `lib/counselor/config.ts`, `lib/counselor/evidence.ts`, `lib/counselor/scoring.ts`,
  `__tests__/counselor/evidence.test.ts`, `__tests__/counselor/scoring.test.ts` —
  gap-severity fix (§3).
- This file.

No schema/migration changes. No changes to `main` or `oryn/ui-redesign-v3`.

## 16. Commits

- `8f6e08c` — `fix(advisor): a successful reply never reached the screen without a
  manual reload`
- `db607b1` — `fix(counselor): a dimension at 94/100 was ranked and described as a gap`

Both pushed to `origin/oryn/gate2-ai-counselor`.

## 17. Branch/push status

`oryn/gate2-ai-counselor`, based on `b9b8848` (the `oryn/ui-redesign-v3` tip at task
start) as instructed — **deliberately not rebased** onto `oryn/ui-redesign-v3`'s
subsequent commits (`393681f`, `b715d4a`, landed mid-session by a concurrent lane).
Coordinated directly with that session (`oryn-87`) over the cross-session channel:
confirmed the new commits don't touch anything this branch's diff touches, and agreed
upstream reconciliation is the Integration/Release Manager's job at merge time, not
something to take on unilaterally mid-task. Both commits pushed. Nothing merged into
`main` or `oryn/ui-redesign-v3`, per mandate.

## 18. Remaining blockers

None that block a founder merge decision. Two things worth the founder's or the
Integration/Release Manager's attention, not counselor defects:

- **A related, out-of-scope finding on the Home dashboard** (not Counselor/Advisor,
  which is this lane's owned surface per the write-ownership split confirmed with
  `oryn-87`): `features/dashboard/dashboard-view.tsx`'s hero falls back to a generic
  "Tell Oryn what you've done... there isn't enough recorded" message whenever
  `canClaimGap` can't name a single confident weakest-dimension gap — which can happen
  on a *rich* profile too, whenever the literal weakest dimension happens to be
  low-confidence even though other dimensions are strong (observed live on the same
  Daniel Okafor account: "Career profile 22" and a real, specific weekly-focus
  paragraph rendered directly below a header claiming nothing is known yet). This
  repo's own `StrategyPanel` (Counselor page, this lane's surface) already handles the
  equivalent case correctly by omitting the row rather than substituting a false
  generic message — confirmed live, same account, same session, no fix needed there.
  Flagged to `oryn-87` (owns that surface) rather than fixed here.
- **Browser-automation tooling instability** in this session specifically (screenshots
  intermittently rendering blank while the underlying page state was confirmed correct
  via direct DOM inspection; scroll actions timing out; two browser tabs became
  unresponsive and required opening a fresh tab to recover) cost significant time and
  is the reason Journey B's detail-page click-through wasn't completed live. Matches a
  pattern independently documented in `docs/handoffs/gate1-first-counselor-artifact-2026-08-23.md`
  on this same shared development machine. Not a product defect — recommend re-running
  the opportunity-detail-page click-through on a less-loaded machine or via a
  dedicated QA pass if that specific route needs a live check.
- **Two incidental, unrelated QA-tooling observations**, neither acted on (out of
  scope, not counselor quality): the signup form rejected a multi-dot local-part email
  address (`oryn.gate2.failure.test@example.com`) as "invalid" before a Supabase
  email-rate-limit also kicked in on repeated attempts; worth a look if real users hit
  it, not verified further here.

**Housekeeping**: `oryn.qa.a@example.com` and `oryn.gate2.p1@orynqa.test` (Daniel
Okafor) both now have a known password (`Gate2QaTest!2026`) for future live-testing
sessions — previously only reachable via an inherited browser session with no
documented credential, per this project's own memory notes. `oryn.gate2.p2`/`p3` were
not touched. No production or `main`-linked data affected — both are QA-scratch
personas on `oryn-qa-scratch`.
