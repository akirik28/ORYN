# Migration 0058: what it creates, what wakes up, and whether "don't apply it" actually holds

Investigation only, exactly as assigned — 0058 was not applied, not removed, not re-gated.
Read the full 565-line migration, the feature flag and its test, the deploy tooling, and
every file oryn-a7 named as possibly related, live, one at a time.

## What 0058 actually creates

A complete, mature feature — not a stub:

- **3 enums**: `post_visibility` (`private`/`connections`/`oryn_public`, deliberately no
  default — every insert must name an audience), `post_kind` (`original`/`repost`),
  `post_attachment_kind` (`image`/`document`).
- **3 tables**: `posts` (author, visibility, body, optional attachment, denormalized
  like/repost counters, edit tracking, moderator-removal fields), `post_likes`
  (`(post_id, user_id)` primary key — idempotent by construction), `post_revisions`
  (append-only edit history, no INSERT policy for anyone but the trigger).
- **6 trigger functions**: two `SECURITY DEFINER` counter-maintainers (likes, reposts), a
  nested-repost collapse (LinkedIn-style, flattens repost-of-a-repost to the root), a
  system-column guard (stops an author PATCHing their own `like_count` or clearing a
  moderator's `removed_at` through the update policy), a revision-recorder, and the usual
  `set_updated_at`.
- **RLS on all three tables**, fail-closed by construction (an unrecognized visibility falls
  through to author-only), with an explicit `to authenticated` restriction on the public-read
  branch specifically because this project's `anon` role holds a schema-wide default grant
  that would otherwise make it readable by nobody-signed-in — the same class of leak
  migration 0061 fixed on `public_profiles`, pre-empted here rather than repeated.
- **One ALTER on an existing table**: `message_reports` gets a `post_id` column (`on delete
  set null`), extending the same moderation queue migration 0035 already extended for
  recommendations, rather than forking a second queue.
- **A private storage bucket** (`post-media`) with owner-only read/write policies — viewer
  access to someone else's attachment is a short-lived signed URL minted server-side after an
  RLS-filtered read, never a storage policy.

## What's dormant and would become reachable — corrected against what I actually found, not the candidate list as given

- **`lib/social/posts.ts`, `post-actions.ts`, `posts-feed.ts`, `posts-visibility.ts`,
  `posts-input.ts`** — the entire read/write core. Confirmed dormant via five independent,
  verified layers (see next section), not just the architecture's own claim.
- **`features/admin/post-removal-control.tsx`** — real and wired: `features/admin/sections/
  reports-section.tsx` (a live admin page today) imports it. It's dormant only because no
  post-type report can exist yet — the moment 0058 applies and a real post gets reported,
  this control starts doing real work with no further wiring needed.
- **`public-profile-authorization.ts` — correcting my own earlier characterization from the
  age-gate audit.** I previously called this file "dead code, zero live callers" while
  checking a different, narrower question (whether it gates a null `birth_year`). That was
  wrong at the file level, and worth stating plainly rather than letting a wrong claim stand
  once relayed onward: `canViewPortfolio` and `canShowMessageButton` are both live today,
  wired into the *already-shipped* `/u/[id]` professional-profile page (skills, endorsements,
  recommendations, connections) — a real, unrelated-to-0058 feature. Only one function in the
  file, `canViewBasicProfile`, is genuinely unused, and it isn't part of the social layer
  either: its own comment says it exists to *document* the `public_profiles` SQL view's WHERE
  clause for readability and regression-signal, not to enforce anything — the view and RLS do
  the real work, this function is a mirror nothing calls. `birth_year` appears in this file
  exactly once, in a comment listing fields the view never exposes — not as something any
  live or dormant function reads.
- **`app/(app)/u/[id]/page.tsx`** — confirmed via the feature's own mechanical test
  (`posts-hidden.test.ts`, "no file under app/, features/ or components/ imports a
  student-facing social module") that this page imports none of the five modules above. It's
  a live, independent, already-shipped page, not something 0058 wakes up — it would likely be
  *where* a future "their posts" section gets added, but nothing about it changes today or
  the moment 0058 applies on its own.
- **`connection`/`message` notification categories** — not created or gated by 0058 at all.
  These belong to the pre-existing `connections`/`messages` tables that 0058 *reuses* as
  infrastructure (the social graph, via `connections`; the moderation queue, via extending
  `message_reports`) without creating or touching either table's own gating. Both categories
  already have real writers today, confirmed in tonight's own notification-category work —
  unrelated to whether 0058 is ever applied.

## The five-layer kill switch — verified layer by layer, not trusted from the comment

`lib/social/posts-feature-flag.ts` documents five independent layers making the feature
"provably unreachable, not merely unlinked." Checked each one directly:

1. **No route** — `__tests__/social/posts-hidden.test.ts` walks every directory under `app/`
   and asserts no segment is named `feed`/`posts`/`post`/`social`/`timeline`. Ran it: passes.
2. **No nav entry, no import anywhere** — same test greps every file under `app/`, `features/`,
   `components/` for an import of any of the five student-facing modules; zero offenders
   today. The one deliberate exception (`posts-moderation.ts`, admin-only) has an *exact*
   two-file allowlist, not a directory prefix.
3. **No Server Action** — none of the six social modules carry a `"use server"` directive
   (mechanically checked). **Went further than the test does here**: the test only checks
   file-level presence of the string `"assertSocialFeedEnabled"`, which would still pass even
   if only one of several exported functions in a file called it — exactly the "control on
   one call site out of three" shape from tonight's other findings. Manually mapped every
   exported function in `post-actions.ts` against every call site: each mutation is split
   into a `<verb>ForUser(client, ...)` core (DB-touching, unit-testable, does **not** assert
   itself) and a `<verb>(...)` wrapper (session + rate limit + `assertSocialFeedEnabled()` +
   delegates to its own paired core) — verified this pairing directly for `createPost`/
   `createPostForUser` and `likePost`/`likePostForUser`, both hold. The "ForUser" cores are
   unreachable regardless, independently, via layer 2 (nothing imports this file at all) —
   so even if one pairing were wrong, the file-level import ban is the layer actually doing
   the work today.
4. **The flag itself** — exact-match on the literal string `"true"`, defaults to `false` when
   unset, throws (never silently degrades to an empty result) via `assertSocialFeedEnabled()`,
   never `NEXT_PUBLIC_`-prefixed, absent from `.env.example`. All asserted by the test; spot-
   verified the exact-match logic by reading the function body directly.
5. **Migration not applied** — the tables do not exist in the live database (confirmed:
   `information_schema.tables` has no `posts`/`post_likes`/`post_revisions` row).

**29/29 tests pass in `posts-hidden.test.ts` today.** All five layers hold, right now.

## Does a fresh deployment switch this on? Yes, the schema — no, not the feature, and here's the difference

**The schema: yes, with certainty, proven by this repo's own CI, not inferred.**
`.github/workflows/migrations.yml` runs `supabase db push --db-url ... --include-all --yes`
against an empty database on every push to `main` — the exact command the founder would run
against a real project — and then explicitly asserts `on_disk` migration file count equals
`recorded` count in `supabase_migrations.schema_migrations`, specifically to catch a migration
being silently skipped. There is no per-file exclusion anywhere in this repository's tooling.
**"Do not apply 0058" is not a technical control today — it is a step someone has to
remember to take by hand at the moment of the first real deployment**, and this repo's own CI
is actively proving, every time it runs, that the default path applies it along with
everything else.

**The feature itself: no, not automatically — that requires a second, separate, deliberate
action.** A fresh deploy creates the tables (layer 5 stops holding), but layers 1-4 are
independent of the schema and don't fall with it: there is still no route, no nav entry, no
registered Server Action, and — the one that actually matters here —
`ORYN_ENABLE_SOCIAL_FEED` still defaults to unset/false on any environment where nobody has
explicitly set it, which nothing about applying a migration does on its own. Someone would
have to *also* set that variable, in production, on purpose. The comment in `post-actions.ts`
states the intended order for switching on for real: create a `"use server"` wrapper, set the
flag, apply the migration, wire the nav — and notes doing it in that order matters, since the
flag alone does nothing. Applying 0058 alone, by accident or otherwise, does not either.

**Net answer to "is 'don't apply it' durable": no, as a deployment instruction it is a
deferral, exactly as suspected — but the feature's actual reachability by a student rests on
four other, independently-verified layers that don't depend on that instruction being
remembered.** Losing layer 5 alone (schema exists) does not, on its own, make this reachable.

## One adjacent thing worth naming, found while tracing the feature this migration reuses

`features/app-shell/nav-items.ts` has its own comment, separate from 0058 entirely: **1:1
messaging and Connections are *also* hidden — from navigation only, by the same founder
decision (2026-08-21), for the same minor-safety reason (student-to-student messaging is
named twice in AGENTS.md as out of scope for V1).** Unlike the social layer, this feature has
already-applied tables, live routes (`app/(app)/connections/page.tsx`,
`app/(app)/messages/page.tsx`, `app/(app)/messages/[userId]/page.tsx` all exist and render for
any authenticated user who types the URL), and, per tonight's own notification-category work,
real writers already wired up — **it is missing four of the five layers 0058 has, and is
protected by "not linked" alone.** The comment's own justification ("all at zero rows, so no
user is affected") still holds — checked live just now: `connections`/`messages`/
`message_reports` are all still at 0 rows today. Flagging this because it's the same shape of
question this whole audit was about, adjacent to 0058 rather than part of it, and because the
gap between how thoroughly the *unbuilt* feature is sealed versus how thinly the *already-
built* one is hidden is itself worth the founder seeing — not proposing a fix; not in scope
for this pass.

## Summary

| Question | Answer |
|---|---|
| What does 0058 create? | 3 enums, 3 tables, 6 trigger functions, RLS throughout, one column added to an existing table, a storage bucket |
| What's currently dormant and would wake up? | The 5 core social modules, and `post-removal-control.tsx` (already wired into a live admin page, just never triggered yet) |
| What did I initially get wrong that's now corrected? | `public-profile-authorization.ts` is mostly live already (`/u/[id]`), unrelated to 0058 — only one function in it is unused, for an unrelated reason |
| What's *not* related to 0058 despite looking like it? | `/u/[id]/page.tsx` (mechanically confirmed no import), `connection`/`message` notification categories (pre-existing, reused not created) |
| Does a fresh deploy apply 0058? | Yes — proven by this repo's own CI, no technical exclusion exists |
| Does a fresh deploy make the feature reachable? | No — four independent layers (route, nav, Server Action, env flag) stay off regardless, verified per-function not just per-file |
| Is "don't apply it" durable as written? | No — it's a deferral that depends on someone remembering, at deploy time, to act against what the tooling does by default |
