# Admin panel i18n — the four moved sections, both locales

**2026-09-02. Branch `oryn/admin-i18n-2026-09-02`, pushed not merged.**

D7 (docs/admin-panel-architecture-2026-09-02.md) deferred translating the four pre-existing
sections deliberately, scoped as its own package. This is that package: `reports-section.tsx`,
`provider-health-section.tsx`, `scheduled-jobs-section.tsx`, and the shared `StatusBadge` all
14 status values render through, now fully bilingual. The `PageHeader` title/description were
already fixed in the prior admin package (confirmed by reading current main before starting,
not assumed) — nothing left to do there.

## What changed beyond a literal translation pass

**`StatusBadge` gained a `statusLabel(status, locale)` accessor**, same shape as this
codebase's established `dimensionLabel`/`evidenceStateLabel` pattern — one flat EN/TR map
covering all 14 values across the three domains that share this component (report status,
provider health, job health), since several mean roughly the same thing per domain
("healthy"/"succeeded"/"resolved" are each "the good state" for their own row) and giving each
domain its own map would just duplicate the same handful of concepts three times.

**`never_run` and `stale` got deliberately careful wording, not a literal translation.** Every
scheduled job on this panel reads one of these two today — ORYN has never been deployed
(`docs/nothing-scheduled-has-ever-run-2026-09-02.md`), not because anything failed. "Hiç
çalıştırılmadı" (was never triggered, passive voice) and "Güncel değil" (not current) were
chosen specifically to read as infrastructure facts rather than "başarısız" (failed) or
"bozuk"/"bayat"-style wording that would read as a defect.

**Added a section-level note in Scheduled Jobs, shown only when every job is `never_run` or
`stale`**, saying plainly in both languages that this is because ORYN hasn't been deployed yet.
This was the specific risk oryn-a7 flagged — four individually red/amber badges on first view,
with nothing on the page explaining why — and a well-chosen status label alone seemed like a
real but incomplete answer to that risk, so this adds the explicit context rather than hoping
the badges carry it on their own.

**Job labels ("Opportunity discovery" etc.) are translated via a small `jobLabel(jobName,
fallback, locale)` lookup keyed on the stable `jobName` identifier**, not by editing
`JOB_DEFINITIONS`' own `label` field in `lib/jobs/schedule.ts` — that file is shared with the
actual cron routes and wasn't part of this package's scope (four *sections*, not the shared job
config). Same stable-key-vs-display-text split this codebase already uses everywhere else this
session for exactly this reason.

**`getReports()` gained an optional `locale` parameter** (defaults to English, same pattern as
`refreshAdmissionOutlook`), used only for the three "no longer available"/repost-placeholder
fallback strings — the two report-content-missing fallbacks (message, recommendation) are real
and reachable today (those features are live); the repost-placeholder is currently unreachable
in practice (the social layer is switched off) but translated anyway for completeness, since
D7's scope was "the sections," not "only the reachable parts of them."

**Reporter/reported names use `t.rich()`, not a flattened ICU string**, to keep the original
design's bold styling on both names. Turkish avoids grammatical case agreement with an
arbitrary interpolated display name (a name needs a vowel-harmony-correct accusative suffix —
"Ahmet'i" vs a differently-harmonized name — which can't be determined generically) by using a
label-value structure ("Bildiren: X · Bildirilen: Y") instead of a fully inflected sentence,
rather than attempting a grammatically risky construction.

**First use of `date-fns/locale`'s Turkish locale anywhere in this app.** `lib/i18n/format.ts`'s
own note that "numbers are not locale-switched yet" is specifically about `Intl.NumberFormat`
number formatting, a separate, deliberate decision — it says nothing about dates, and this
panel's one real user reads Turkish. Applied to every `formatDistanceToNow` call across all
three sections; a mix of translated headings and English "2 hours ago"-style timestamps would
have reproduced the exact half-translated panel this whole package exists to close.

## Verified

`npm run check:i18n` run before and after: the three touched sections no longer appear in its
untranslated-block report. Full suite: 223 files / 3220 tests, lint clean, typecheck clean,
build clean. Both catalogs verified programmatically to hold the exact same 67 `admin.*` keys
on both sides (no orphan, no gap).

**Not verified live in a browser** — same constraint as the prior admin package: the founder's
real account isn't `is_admin`-flagged yet (founder-gated SQL fix, documented separately, not
run), so `/admin` 404s for every account I have access to. Relied on the coverage checker, the
full test suite, and careful manual review of every interpolated string instead.

## What this does NOT do

- Does not touch `lib/moderation/report-status.ts` (4 untranslated strings, flagged by
  `check:i18n`) — a pre-existing, separately-verified decision from earlier this session
  (`ReportReviewControl`'s status options are admin-only, operator-facing, not a real gap).
  Not one of "the four moved sections," and not re-litigated here.
- Does not touch `lib/jobs/schedule.ts`'s own `label` field — translated at the display layer
  instead (see above), since that file is shared with the real cron routes and out of this
  package's stated scope.
- Does not fix the two pre-existing, unrelated `check:i18n` findings in `dashboard-view.tsx`
  and `profile/page.tsx` — neither was touched by this package, both predate it.
