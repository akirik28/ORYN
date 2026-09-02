# Does the cron auth path actually work? — 2026-09-02

CEO's framing: a bug here produces a symptom identical to ORYN never having been deployed at
all, which is exactly the state nobody would recognise as new. Verified rather than trusted —
against Vercel's own documented contract, against a real test (`__tests__/jobs/
verify-cron-request.test.ts`, new — this had zero coverage before), and against every one of
the four actually-scheduled routes' source, not one representative sample.

## Would a real Vercel cron request be accepted? Yes — checked against the documented contract.

Fetched Vercel's own docs (`search_vercel_documentation`, topic "Cron Jobs authentication
headers CRON_SECRET"), not assumed from this codebase's own comments. Vercel's recommended
Route Handler is:

```ts
const authHeader = request.headers.get('authorization');
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

`lib/jobs/verify-cron-request.ts` is the same logic, split into two statements instead of one
boolean expression:

```ts
export function verifyCronRequest(request: NextRequest): boolean {
  if (!env.cron.secret) return false;
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${env.cron.secret}`;
}
```

Functionally identical. And Vercel's own example is a `GET` handler — confirming what this
codebase's routes already assume (Vercel Cron invokes via `GET`, not `POST`) is correct, not
an untested assumption. `lib/jobs/schedule.ts`'s own comment references "the GET/405 bug this
session already found" — a prior session already discovered Vercel sends GET and fixed it via
the `export const GET = POST;` alias present in every route today. Confirmed that fix is
still in place on all four scheduled routes (read every one directly, not sampled).

**New test suite, 8 cases, all passing**, using a real `NextRequest`/`Headers` (not a
hand-rolled fake) so header lookup goes through the actual Fetch API implementation Vercel's
real request would use: accepts the correct `Bearer <secret>`, rejects unset secret /
mismatched secret / absent header / missing-prefix header / wrong-case scheme. One assumption
in the first draft was wrong and is worth keeping visible rather than quietly fixed: trailing
whitespace on the header value does **not** break the match — the `Headers` class strips HTTP
whitespace from values per the Fetch spec before this file's own comparison ever runs, making
the real behavior more robust than assumed, not less. Also pinned: header-name lookup is
case-insensitive (a property of `Headers`, not this file's own code).

## All four actually-scheduled routes, read individually, not sampled

`lib/jobs/schedule.ts`'s `JOB_DEFINITIONS` is the authoritative list of what's really
cron-scheduled — matches `vercel.json` exactly: `discover-opportunities`,
`discover-requirements`, `sync-university-data`, `deadline-reminders`. (Four more job routes
exist — `detect-stale-data`, `generate-weekly-plans`, `notify-university-changes`,
`refresh-admission-outlooks` — each individually documents, in its own top comment, that it's
deliberately not wired into `vercel.json`, a founder deployment decision. Checked each one's
comment rather than assuming symmetry with the others; this is confirmed intentional, not a
gap.)

All four scheduled routes are structurally identical where it matters: `verifyCronRequest`
gate → `runWithTracking` → `export const GET = POST` → `export const dynamic =
"force-dynamic"`. No route has drifted from the pattern.

## Failure modes: what's silent, what isn't

| Failure | App-level response | App-level log |
|---|---|---|
| `CRON_SECRET` unset | 401 | **None** |
| Secret mismatched | 401 | **None** |
| Header absent | 401 | **None** |
| Header malformed | 401 | **None** |

Every one of the four routes returns `NextResponse.json({ error: "Unauthorized" }, { status:
401 })` with no `console.error`/`console.warn` before it. **This codebase's own code never
distinguishes these four failure modes from each other, and never logs any of them.** Not
fixed here — CEO asked what's true, not for a fix, and adding logging changes production
behavior in a way that should be a deliberate decision, not a side effect of an audit.

**What I can't verify without a live deployment, and what would:** whether Vercel's platform
itself records these 401s in a way an operator would see (Vercel's dashboard does log
function-invocation status codes generally, by platform default — but I have no live
deployment to confirm this project's dashboard actually shows it, or that anyone would look).
**What establishes this**: after deploying, check the Vercel dashboard's Cron Jobs tab for a
recent invocation and its status code, for all four jobs, not just that they're listed as
"scheduled" — `lib/jobs/schedule.ts`'s own comment already names why listed-as-scheduled
isn't proof of anything ("the Vercel dashboard keeps showing a cron 'scheduled' whether or
not it actually executes").

**The real, load-bearing signal that would eventually catch this — already built and wired,
verified end to end, not assumed:** `lib/jobs/schedule.ts`'s `isJobStale` (a job with no
recorded run, or one further past its expected interval than `STALE_MULTIPLIER` allows, is
stale) is consumed by `lib/jobs/job-health.ts` → `lib/admin/queries.ts` →
`features/admin/sections/scheduled-jobs-section.tsx`, rendered on the real `/admin` page
(`app/(app)/admin/page.tsx`) — traced the whole chain, not just confirmed the pure function
exists. A `CRON_SECRET` misconfiguration that makes every invocation 401 would mean every
scheduled job's `external_sync_jobs` row never advances past `null`/stale — `isJobStale`'s own
comment is explicit that `null` (no run ever recorded) is always stale, not a special case.
**This is real, but passive**: it surfaces on `/admin` for whoever looks, not as a push
alert. Silence at the request layer is real; it is not the only signal that would exist.

## The manual admin-trigger path does not undercut the cron check — confirmed, not assumed

Checked `app/(app)/admin/actions.ts` directly. The four `trigger*` Server Actions
(`triggerOpportunityDiscovery`, `triggerUniversitySync`, `triggerDeadlineScan`,
`triggerRequirementDiscovery`) **never call the HTTP routes at all** — each calls the
underlying job logic function directly (`discoverOpportunitiesForQuery`, `scanDeadlines`,
etc.), wrapped in the same `runWithTracking(jobName, ...)` used by the real routes. That's
the entire reason `deadline_reminders` (and the others) can show more than one
`external_sync_jobs` row without the cron having fired twice — a manual admin "run now" and a
real cron invocation both write to the same `job_name`, independently.

Each `trigger*` action calls `requireAdmin()` itself — the file's own top comment states the
reasoning explicitly: calling job logic directly means "no need to hand the server-only
CRON_SECRET to client code" at all. Checked `requireAdmin()` (`lib/security/require-admin.ts`)
directly: server-side session check via `getCurrentProfile()` + `isAdminProfile()`, 404s
rather than redirects for a non-admin (doesn't reveal the admin panel exists). **The two
entry points share the underlying job function and the tracking table, and nothing else** —
neither can be used to bypass the other's check, and `CRON_SECRET` is never exposed to any
client-reachable code path.

## What this doesn't and can't cover without a real deployment

- Whether `CRON_SECRET` is actually set in the real Vercel project, and how strong the chosen
  value is — a deployment-time configuration fact, not a code question. **Establishes**:
  confirm it's set in Vercel's project environment variables before the first real deploy: use
  a long, random value, since this file's comparison is a plain `!==`, matching Vercel's own
  recommended (non-constant-time) pattern — not a defect, just worth a strong secret given
  that's the only hardening this mechanism gets.
  \
- Whether Vercel Cron is actually enabled/available for this project's plan. **Establishes**:
  confirm in the Vercel dashboard after the project exists there.
- Whether a real invocation actually reaches the deployed function with the exact header
  shape documented (vs. some platform-specific quirk not in the public docs). **Establishes**:
  `vercel crons run /api/jobs/deadline-reminders` (documented Vercel CLI command for
  triggering a deployed cron immediately) right after deploy, then check for a new,
  `succeeded` `external_sync_jobs` row — the same real end-to-end check for all four, not
  just the one that happens to fire first on schedule.

These three are genuine gaps in what local verification can establish — named here so they
become lines in the founder's post-deploy checklist rather than a silent assumption that
"the code looked right" was the same thing as "it works."
