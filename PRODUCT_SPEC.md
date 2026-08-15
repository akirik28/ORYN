# Product Spec (summary)

The full, authoritative 80-phase build specification this product was built against
lives in **[AGENTS.md](./AGENTS.md)**. This file is a summary for orientation — when the
two disagree on a detail, AGENTS.md wins.

## The one question

> What should I do next to improve my future opportunities?

Oryn should answer this specifically, for this student, based on their actual
profile — not with generic advice that would apply to anyone.

## What it is / isn't

A **Personal Career Operating System**: capture → verify → organize → analyze →
benchmark → discover → plan → act → reflect → update → repeat.

Not a CV builder, not a university ranking site, not an admissions calculator, not a
chatbot with a dashboard attached.

## Non-negotiables (from AGENTS.md, restated because they shape every screen)

1. Useful even with zero university targets set.
2. Prioritizes — never endlessly suggests more activities. Sometimes the right answer is
   "don't do that" (see `lib/ai/advisor-prompt.ts`, and the "avoid_for_now" recommendation
   class in the schema).
3. Evidence is optional.
4. Uploaded evidence ≠ independent verification (`evidence_status` goes
   `self_reported → evidence_added`, never silently to `verified`).
5. Admission percentages are never shown with false precision — always a wide range with
   capped confidence, or nothing at all (`lib/admissions/outlook.ts`).
6. University/opportunity facts are traceable to a source (`SourceBadge`,
   `university_sources`, `opportunity_sources`).
7. External API credentials never reach the client (`server-only` imports, enforced at
   build time).
8. An external API failure never crashes the app (`lib/providers/fetch-json.ts`'s
   typed error handling, `ProviderResult` discriminated union).
9. AI output that changes structured product state is Zod-validated
   (`lib/ai/anthropic-provider.ts`'s `generateStructured`).
10. Students can edit anything AI extracted before it's saved (CV import review screen).
11. Career profile score ≠ admissions probability ≠ application readiness — three
    genuinely different numbers, computed by three different modules
    (`lib/scoring`, `lib/admissions`, `lib/applications/readiness.ts`), never conflated.
12. Profile completeness ≠ profile strength (`lib/scoring/completeness.ts` vs.
    `lib/scoring/index.ts` — deliberately independent).
13. Understandable to a first-time 16-year-old in minutes.
14. The dashboard emphasizes the top three actions, not twenty metrics.

## MVP definition (Phase 53) and current status

See **[PHASE_STATUS.md](./PHASE_STATUS.md)** for the phase-by-phase build log and
**[README.md](./README.md)**'s "Known limitations" for what's honestly not built yet.
