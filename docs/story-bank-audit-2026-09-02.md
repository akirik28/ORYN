# Story bank & essay outlines audit — 2026-09-02

Two AI surfaces that have never appeared in `ai_usage`: `/profile/story-bank` and the essay
outline generator it drives. First question, per oryn-a7's framing: never used, or used and
silently not logged — the second would be a real hole in the per-user spend cap and the admin
spend screens, one level worse than Job D's missing-artifact case, since it's spend with no
*record* rather than spend with no artefact.

**Method shared with oryn-31**, who was independently checking the identical question for the
research generator at the same time — compared notes rather than each deriving it separately
(steps below are theirs, applied here):

1. **Census first.** `ai_usage` distinct features, live: `achievement_refinement` (1),
   `advisor_chat` (13), `cv_extraction` (2), `weekly_plan` (112). `essay_story_bank`: **zero**,
   confirmed independently before opening any code.
2. **A second, independent signal.** For a feature whose output gets saved, oryn-31 checked a
   provenance column on the save target. Essay outlines don't have one to check —
   `generateStoryOutlines` never persists its result anywhere (see "isolated," below) — so the
   nearest analog is the *input* side: `story_notes`, the field the whole feature exists to
   read. Checked all 58 rows across the 7 tables that carry it (`activities`, `projects`,
   `awards`, `research_experiences`, `volunteering_experiences`, `work_experiences`,
   `sports_experiences`). **Zero non-empty `story_notes` anywhere, on any account.** Not a
   perfect equivalent to a source-column check, but the same spirit: a second, independent
   trace, and it also comes up empty.
3. **Is the call path even capable of silent failure?** `generateEssayOutlines`
   (`lib/ai/essay-outlines.ts`) calls `logAIUsage` directly after a successful
   `generateStructured` — the older, unconditional-on-success pattern (not yet migrated to
   `withUsageLogging`, same as research_generator). That's actually the useful case: it means
   *if a generation ever succeeded*, logging was always attempted, no conditional branch to
   skip it. Read `logAIUsage` itself (`lib/ai/usage.ts`) and found a real bug: the insert was
   `await`ed with no `{ error }` destructure — a PostgREST-level rejection resolves normally
   with an `error` field rather than throwing, so the surrounding `try/catch` (which the
   function's own comment says exists specifically to "swallow errors after a console
   warning") only ever caught client-construction/network failures, never a rejected insert.
   Checked the schema for a plausible rejection (no CHECK constraint on `feature`, all NOT
   NULL columns covered by the payload) and found none — so there's no evidence this
   specifically explains the empty table. **Fixed anyway**: it's a real defect, matches the
   exact class oryn-3f's fleet-wide sweep fixed 16 instances of tonight (this file wasn't
   among them — confirmed via `git log -- lib/ai/usage.ts`, no fix commit touches it), and it
   closes the one theoretical way a real generation could vanish without trace. This makes the
   finding complete either way: genuinely unused (most likely, per points 1-2 and 4), or used
   once and this bug is the precise, sufficient explanation — no third possibility remains.
4. **Reachable?** Yes, cleanly. `generateStoryOutlines` is a real server action, correctly
   rate-limited (`assertWithinAIRateLimit`, `essay_story_bank`, 10 calls/60min), re-reads the
   student's own experiences server-side rather than trusting client content. The UI
   (`features/profile/story-bank.tsx`) genuinely calls it on submit. Reachable in-product via
   the Features catalog (`/features` → "Essay Story Bank" card, `features/catalog/features-view.tsx`)
   — the same catalog Portfolio lives in, not a uniquely buried path. Not a broken button;
   genuinely never clicked through to success by any of the 11 pre-launch accounts.
5. **Spec check, structural vs. prompt-only** (oryn-31's framing: say precisely which is
   which, not "enforced" for something that only a prompt asks for). Zod-structural: `candidates`
   capped `.min(1).max(3)`, `outlines` per candidate capped `.min(1).max(3)` — a real, enforced
   ceiling, matches the UI's "Angle 1/2/3" labels exactly. The single most load-bearing rule in
   this feature — "NEVER invent an event, feeling, quote, person, outcome, or detail... every
   element must trace back to something in the experiences given to you" — is **prompt-only**,
   no schema or code check that a returned string actually traces to the input. Same shape as
   oryn-31's own finding for the research generator: a well-grounded instruction, not a
   verifiable guarantee. Stating it exactly that way rather than either overclaiming
   enforcement or treating an unenforceable safety rule as equivalent to a missing one — the
   system prompt is genuinely careful and specific about this (see the file itself), which is
   the only lever this class of requirement has.

## What is the story bank for, and is that clear?

Genuinely well-scoped and well-written, better than "half-built" — worth saying plainly since
zero usage could otherwise read as low quality. The catalog card: *"The moments behind your
achievements, kept in your own words — raw material for application essays, never
auto-written for you."* The page description repeats the same honest framing, and the footer
disclaimer closes the loop: *"Oryn never writes the essay for you — and never adds a detail
you didn't record yourself."* The system prompt backs this up structurally (`lib/ai/essay-outlines.ts`'s
own header: *"Deliberately NOT an essay writer... The student writes the essay"*) — the
product is consistent about its own restraint at every layer, copy and code both.

One real, load-bearing input is tucked away, but the product already compensates for it in
copy: `story_notes` is not part of the "quick add" flow for any achievement type (checked
`features/profile/field-config.ts` — `STORY_NOTES_FIELD` is spread into every achievement
form but never marked `quickAdd: true`, so it only surfaces via "Edit" on an
already-saved record). The story-bank page's own helper text names this directly: *"Entries
with story notes give far better results — add yours from the Profile page."* Not a gap to
fix — the page is already doing the pointing; a design call for whether `story_notes` should
ever graduate to quick-add is a separate, real question, not raised here as a defect.

**One citation gap worth flagging precisely**: both `essay-outlines.ts` and
`field-config.ts` describe this as *"founder-confirmed MVP scope... see
docs/product-decisions.md"* — that file exists and is substantial, but contains no section
about story bank or essay outlines under any heading (checked all of them). Can't independently
confirm the "founder-confirmed" framing from the cited source; may simply predate the current
doc, or the decision was made outside a written record. Not asserting the claim is false —
only that I couldn't verify it the way the comment points to.

## Essay outlines — Phase 55, confirmed built

Phase 55 lists "essay planning" explicitly under **future architecture — do not implement
now**. It is implemented, and both the code (the MVP-scope comment above) and the actual
behavior (deliberately narrow — outlines, not drafts; structural prompts, not paragraphs) read
as a considered, scoped-down departure from that instruction rather than scope creep that
missed the line. Reporting this plainly, as asked: it exists, it's real, and it's a
meaningfully smaller thing than "essay planning" might suggest — a story-material finder with
structural scaffolding, not an essay assistant.

## Does either write anything a student sees elsewhere?

**No — fully isolated, on both ends.** `story_notes` is deliberately excluded from
`lib/portfolio/build.ts`'s CV/portfolio mapping (private reflections, not CV content, per
that file's own comment) — confirmed structurally, not just from the comment: none of its 9
mapping loops reference `story_notes`. And the *output* — the generated candidates and
outlines — is never persisted anywhere; `generateStoryOutlines` returns data straight to the
client with no database write. Reload the page, and a result is gone. This is the one AI
surface in the product whose output isn't saved anywhere (weekly plans, advisor messages, CV
extractions all persist); worth naming as a real asymmetry, not fixing — adding history/
persistence is a real feature addition, not a small correction, and squarely a founder/CEO
call about whether it matters before launch.

## Gate

`npm run typecheck`, `npm run lint`, `npm test -- --run` (3484/3484, 247 files) all pass.
