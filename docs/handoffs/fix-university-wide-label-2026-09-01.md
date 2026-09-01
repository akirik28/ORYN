# Fixing the "University-wide" label — nothing else

Branch `oryn/fix-university-wide-label-2026-09-01`, based on `4188bada` (the tip main was
at when this task started). CEO's exact instruction after the unit-scope-risk report:
"Fix the label. Nothing else." A `program_id IS NULL` requirement was rendering under a
heading that literally says "University-wide" — an affirmative claim Oryn has no basis for.
Koç's five conflicting SAT-equivalent thresholds (1200/1260/1300/1420/1450), all shown
under that heading, are the concrete proof it actually misleads.

## The change

`app/(app)/universities/[id]/page.tsx`, the two touched spots:

1. `RequirementGroup` gained one new, optional prop: `description?: string`, rendered as a
   `<p className="text-xs text-muted-foreground">` under the existing `<h3>` title, only
   when passed. Every other call site (the genuinely program-linked groups) passes no
   `description` and is byte-for-byte unchanged — same JSX, same title source
   (`programNameById.get(programId) ?? "Program"`), same conditional. Koç's own "Law"
   requirement, correctly linked, still renders under its own clean "Law" heading with
   nothing extra — checked live, not assumed.

2. The one call site that used to read `title="University-wide"` now reads, locale-aware
   (the page already has `const locale = await resolveLocale()` in scope, and this file's
   own established convention for a static label is an inline `locale === "tr" ? ... : ...`
   at the JSX call site — matched exactly, not a new pattern):

   ```tsx
   title={locale === "tr" ? "Program kaydedilmemiş" : "Program not recorded"}
   description={
     locale === "tr"
       ? "Üniversitenin kendi sayfalarından alındı — Oryn bunların her birinin hangi programa ait olduğunu kaydetmedi."
       : "Sourced from the university's own pages — Oryn hasn't recorded which specific program each of these belongs to."
   }
   ```

Both strings say only what's true — that Oryn didn't record which program each item
belongs to — and stop there. No claim about which of them are actually general and which
are program-specific; task 13 already established that isn't knowable per-row without more
research, and asserting it now would just be a differently-shaped version of the original
bug (a confident claim standing in for something Oryn doesn't actually know).

## Coordination, not assumption

Per explicit instruction, asked oryn-3f (who owns this page's i18n) before writing any
Turkish, rather than inventing a second convention:

- They confirmed this exact section — the whole "Requirement check" block, including the
  heading being fixed here — had never been translated before (their own earlier pass only
  covered `evaluation.reasoning`, a different string from a different module). No
  collision, no existing Turkish to match.
- They named the right pattern (inline ternary off the page's own `locale`, not next-intl,
  not `lib/requirements/copy.ts` — wrong domain boundary for a page-level static label) and
  gave the heading translation directly: *"Program kaydedilmemiş"*, deliberately reusing
  the "kayıt/kaydetmedi" word family already present in the adjacent reasoning text, so the
  new string doesn't read as a second translator's voice.
- They flagged the app's known uppercase-CSS + Turkish dotted-İ bug before I asked, checked
  both elements this change touches, and confirmed neither needs a `lang` attribute — no
  `uppercase`/`tracking-wide` styling on `SectionHeader`'s `<h2>` or `RequirementGroup`'s
  `<h3>`.
- I sent my drafted English sentence before they translated anything, so the Turkish
  matches what I actually meant to assert rather than a guess at my intent. They translated
  it, restructured the opening participial fragment into something that stands on its own
  in Turkish (added "alındı"), and kept the same passive/active heading/sentence split the
  English has ("kaydedilmemiş" / "kaydetmedi").

## Verification

- Live in the running app, both locales — not assumed from the diff. Started this
  worktree's own dev server directly via backgrounded `next dev -p 3512` (the
  `preview_start`/`.claude/launch.json` path collided with another chat's already-running
  server on this machine, a known quirk; the direct-Bash workaround is documented in this
  lane's own memory from earlier tonight) and hit Koç University in the Browser tool. Read
  the live accessibility tree, not a screenshot: English shows heading "Program not
  recorded" and the full sourced-from-pages sentence; setting the `oryn_locale` cookie to
  `tr` and reloading shows "Program kaydedilmemiş" and the Turkish sentence, and the rest of
  the page (sidebar nav, "Üniversiteler", etc.) switched with it, confirming the cookie
  mechanism actually drove the change rather than a coincidence. Koç's genuinely-linked
  "Law" requirement group was re-checked in the same pass and renders exactly as it did
  before this change — no description text, own clean heading.
- `npm run lint` / `npm run typecheck` / `npm test` (189 files, 2864 tests) / `npm run
  build` — all clean.
- Diff is two spots in one file: the new optional prop and its render, and the one call
  site that sets it. No schema change, no other page or component touched, no data written.
- No `opportunities` table touched.
