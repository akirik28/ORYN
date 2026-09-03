# ORYN → Proxola rename inventory (2026-09-03)

Research only. **Nothing in this repository or the database was edited.** The founder is
buying `proxola.com` tonight but has not said go on the rename itself — this is the count,
the risk map, and a recommendation on what to do with it, not an execution.

Method: three parallel research passes (student-facing UI/code, docs/historical records,
internal code/infrastructure) plus a direct, full-database scan of every text-bearing column
in `oryn-qa-scratch` (project `qtcvcflzxbuagvvwahhu`) for the literal substring "oryn" —
the half of this a `git grep` structurally cannot see. Every number below was independently
verified against the live repo/database, not assumed from the original estimate.

## Top-line numbers, reconciled against the original count

| Metric | Original estimate | Verified |
|---|---|---|
| Message-catalog lines (en.json / tr.json) | 83 / 83 | **88 / 87** (85/84 after excluding 2 camelCase false positives per file — see Collisions) |
| Files mentioning "oryn" (.ts/.tsx) | 386 | **385** files, case-insensitive |
| Occurrences, exact brand casing "Oryn" | 478 | **478** — exact match; this was always a case-sensitive count, not a total (see below) |
| docs/ markdown files | not counted | **676** files (555 contain "oryn", 3,169 total occurrences) — far more than the "60-100" this task's own brief guessed |
| supabase/ files touching "oryn" | 28 | **37 of 114 migrations**, 92 lines |
| Git commits matching "oryn" | not counted | **1,168 of 3,448** (full history + all branches) |
| Database rows/columns | not counted | **~15 columns, ~950+ rows** across 2 real schema objects and ~10 data columns |

The 478 code-occurrence figure is exactly the case-sensitive count of "Oryn" (brand casing)
in `.ts`/`.tsx` files — it does not include `ORYN` (88 more, mostly env-var/constant names)
or lowercase `oryn` (500 more, mostly paths/kebab-case identifiers and the "oryn-XX" fleet
codenames explained below). Reporting all three casings separately turned out to matter: they
sort into very different buckets.

---

## Bucket 1 — Must change (a student or admin reads this)

- **`app/layout.tsx`'s metadata** (verified directly): `title.default`, `title.template`
  ("%s — Oryn" — propagates to every route's tab title and, since no `openGraph`/`twitter`
  block overrides it, every social-preview card too), and `description`. Single highest-
  leverage fix in the codebase — three lines, sitewide effect.
- **9 hardcoded `alt="Oryn"` logo instances** across `app/page.tsx`, `not-found.tsx`,
  confirm-age/onboarding/auth layouts, both dev-preview pages, and the desktop/mobile nav
  sidebars. The image assets themselves (`public/brand/logo-full.png`, `logo-mark.png`) have
  generic filenames — only the alt text needs it, not the asset path (the visual mark is a
  separate design decision).
- **85/88 en.json + 84/87 tr.json message-catalog lines** (real count after excluding the 2
  collisions per file) — full namespace breakdown below.
- **`lib/legal/content.ts` — 60+ occurrences, and the one a UI-only sweep would have missed
  entirely.** This file lives in `lib/`, not `components/`, but it *is* the full rendered
  Terms of Use and Privacy Notice text, in English and Turkish, as string data: `"Oryn helps
  you record what you have done..."`, `` `© ${year} Oryn` ``, `productName: "Oryn"`,
  `backToHome: "Oryn'e dön"`. A sweep scoped to `.tsx` files alone would never find this.
- **`ADVISOR_SYSTEM_PROMPT`** (`lib/ai/advisor-prompt.ts:26`) and the other AI prompts
  (`lib/ai/cv-extraction.ts`, `lib/ai/eval/judge.ts`, `lib/ai/counselor-explain.ts`) — **a
  functional risk, not a cosmetic one.** "You are the Oryn Advisor..." If this isn't updated,
  the AI keeps introducing itself as "Oryn" in live conversation after a full rebrand,
  regardless of what the UI says elsewhere.
- **Hardcoded bilingual ternary strings that bypass the message catalog entirely** — real,
  rendered, but invisible to a `messages/*.json`-only fix: `features/dashboard/dashboard-view.tsx`
  alone has 10 of these; also `app/(app)/opportunities/[id]/page.tsx`,
  `app/(app)/universities/[id]/page.tsx` (including `"Oryn tahmini:" / "Oryn estimate:"`),
  `app/(app)/applications/[id]/page.tsx`, `app/(app)/advisor/actions.ts`,
  `app/(app)/entities/actions.ts`, `features/opportunities/opportunity-card.tsx`,
  `features/profile/profile-signal.tsx`.
- **Three separate hardcoded component-level `{en, tr}` dictionaries**, each its own small
  shadow-i18n system outside `messages/*.json`: `components/oryn/advisor-message.tsx:22-25`
  (the label over every AI-advisor chat bubble), `components/oryn/next-move.tsx:7-10` ("What
  Oryn is reading" — appears on Home, Profile Analysis, Counselor, university positioning, and
  opportunity-fit pages per its own doc comment), and `features/admin/control-rail.tsx:101`
  (the `/kumanda` admin sidebar wordmark, plain hardcoded JSX text).
- **`features/profile/field-config.ts:178,567`** — a fourth, *different* translation
  mechanism: a plain object keyed by the literal English string itself. **Rename gotcha**: if
  the English label changes but the dictionary key isn't updated to match exactly, the Turkish
  lookup silently breaks and falls back to showing the renamed English string, untranslated.
- **Two GDPR/export filenames a real student sees in their downloads folder**:
  `app/api/export-data/route.ts:120` (`oryn-export-<userId>.json`, the student-facing "download
  everything Oryn has stored about you" feature) and `app/api/admin/export-cohort/route.ts:21`
  (admin-only).
- **Database-layer generated text** — see the dedicated section below; this is real,
  student-facing, AI-generated content that no code search can find at all.

### Message-catalog breakdown by surface (en.json, 85 real hits)

| Surface | Namespace | Count |
|---|---|---|
| Profile / development-assessment (largest cluster) | `profile.*` | 23 |
| AI-advisor/counselor voice, usage meter | `advisor.*` | 14 |
| Settings/privacy/data-export | `settings.*` | 10 |
| University research pages | `universities.*` | 7 |
| Opportunity matching/browsing | `opportunities.*` | 5 |
| Onboarding flow | `onboarding.*` | 5 |
| Dashboard headings/empty states | `dashboard.*` | 4 |
| Nav/search chrome | `nav.*`, `search.*` | 4 |
| Social (connections, public profile) | `connections.*`, `publicProfile.*` | 3 |
| Age-gate | `confirmAge.*` | 2 |
| Marketing catalog page | `catalog.*` | 2 |
| Auth, landing, feedback, entities, admin, maintenance | 1 each | 6 |

`tr.json` mirrors this exactly (the two files have byte-identical key structure, verified by
diff) except for one semantic gap — see below.

---

## Bucket 2 — Should change (internal, cosmetic, but ages badly left alone)

- **`package.json`'s `"name": "oryn"`** — low risk in itself (`"private": true`, never
  published to npm; `package-lock.json` regenerates automatically on next install), but worth
  doing for consistency.
- **The `components/oryn/` directory** (27 files) — the only directory whose *name* contains
  "oryn" within the UI layer. **Cross-scope dependency, caught by cross-referencing the two
  research passes**: two files under `lib/` import from it directly —
  `lib/admin/queries.ts:17` and `lib/profile/evidence-status-presentation.ts:2` — so this
  rename touches outside its own directory.
- **194 import statements** referencing `@/components/oryn/...` — pure plumbing, but all need
  updating in lockstep with the directory rename above.
- Internal identifiers with no user visibility: `DisplayTier`'s `"oryn_fallback"` member
  (`lib/universities/image-coverage.ts`), `PostVisibility`'s `"oryn_public"` member at the
  **code level** (`lib/social/posts-input.ts`, `lib/social/posts-visibility.ts`,
  `types/database.ts`) — see Dangerous below for the schema-level twin of this one.
- Non-dangerous cookie/storage-key names: `oryn_locale` (live, i18n), `oryn_dev_tier_preview`
  (dev-only), `oryn:upgrade-prompt-shown`, `oryn:compare-opportunities`,
  `oryn:compare-universities` (all `localStorage` keys).
- **Ordinary prose comments** naming the product ("ORYN's users are 14-18") — internal
  documentation, doesn't affect runtime, but reads as half-renamed to future engineers if left.
- The **Turkish suffix inconsistency**, found while cataloguing brand mentions rather than
  being the point of the search: `tr.json` treats "Oryn" as back-vowel 26 times
  (`Oryn'ın`/`Oryn'a`) and front-vowel 7 times (`Oryn'in`/`Oryn'e`/`Oryn'de`) — both
  conventions coexist for the same word today. "Proxola" ends in a back vowel, so the
  replacement suffixing is unambiguous — worth fixing this pre-existing inconsistency in the
  same pass rather than propagating it.

---

## Bucket 3 — Must NOT change (the record, not the copy)

- **~520 of 676 docs/ files (77%)** — audits, verifications, handoffs, dated measurements.
  Classified by *reading content*, not filename pattern: filename-dating turned out to be a
  poor proxy (326 of 676 files carry no date in the filename but are still point-in-time by
  genre — e.g. every one of 169 `docs/handoffs/` files, 41 `docs/research/verification/`
  verdicts, the entire root `*-audit.md` family). Several already self-mark as superseded
  ("SUPERSEDED — do not use the counts below as current") — that marking is itself a historical
  fact that a retroactive edit would erase.
- **`AGENTS.md` — read the exact preamble before touching anything near it**:
  > "The original founder prompt this product was built against, **verbatim except for the
  > product name (was 'Career AI' throughout — renamed to 'Oryn' for consistency with the rest
  > of the codebase; nothing else changed)**."
  The file's entire authority rests on being verbatim except one named, already-consumed
  exception. A silent second find-and-replace inside the verbatim block would make that
  sentence false — it explicitly says "the product name" (singular), describing one specific
  change. Two honest paths, not one: **(a)** leave the verbatim block alone and let the
  historical claim stand exactly as scoped ("Career AI → Oryn, nothing else"), or **(b)**
  rewrite the preamble itself to disclose a *second* documented exception, rather than quietly
  editing the body while the header still claims singular fidelity. Silently rewriting the body
  while leaving the header unchanged is the one option that isn't honest.
- **`docs/founder-spec.md`** — makes the identical claim ("permanent, protected copy of the
  original... spec") and carries the same risk. Should be decided alongside `AGENTS.md`, not
  separately.
- **`docs/ORYN-PROMPT-ARCHIVE.md`** — explicitly self-declared "permanent record of the actual
  instructions given to every Claude session working on ORYN."
- **Git commit messages — 1,168 of 3,448, and these cannot be edited at all without rewriting
  git history**, a categorically different and more dangerous operation than any file edit
  (every downstream hash changes, every clone/fork/PR/CI reference breaks, the chain of custody
  that makes history trustworthy is gone). Worth knowing the real shape of that 1,168 before
  anyone treats it as "1,168 things to fix": only **42 are genuinely deliberate prose** ("Build
  Oryn student career operating system" is commit `c09f5693`, the **second commit in the
  repository's entire history**). The other 1,126 are either body-only matches invisible in
  `--oneline`, or git-mechanical merge-commit subjects reflecting the `oryn/*` branch-naming
  convention and the `akirik28/ORYN` repo slug — not deliberate word choice. The honest framing
  for the founder isn't "should we edit 1,168 commits," it's "we structurally can't, and 42 of
  them are the only ones that were ever really about the word."
- **Internal fleet/dev-session codenames — found independently by all three research passes**,
  which is itself a signal this pattern is real and pervasive: `oryn-a7`, `oryn-45`, `oryn-31`,
  `oryn-d0`, `oryn-f5`, `oryn-3f`, `oryn-4e`, `oryn-b9`, `oryn-11`, `oryn-60`, `oryn-e2`,
  `oryn-d5`, plus role tags `ORYN-CEO`/`ORYN-CFO`/`ORYN-PRODUCT`/`ORYN-BASORG`. These appear in
  code comments, commit messages, migration comments, and one live database row
  (`admin_action_log.admin_label`: "Ada Sarp KIRIK (sabah paketi, **oryn-d0** hazırladı)").
  **These are not the product brand — they're this fleet's own session-naming convention**,
  which happens to derive from the product name but is a separate, tooling-level thing. A
  mechanical find-and-replace would mangle them into nonsense ("proxola-a7"). Whether the
  fleet's own naming convention should also change is the founder's call, not implied by a
  product rename.

---

## Bucket 4 — Dangerous (breaks a live reference if mishandled)

- **The Supabase project itself.** Project ref `qtcvcflzxbuagvvwahhu`, dashboard name
  `oryn-qa-scratch` (lowercase — "ORYN" does not appear in it, capitalized or otherwise). Zero
  hardcoded refs anywhere in application code — the app resolves its connection exclusively via
  `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SECRET_KEY` env vars, which is the safe pattern. **A
  striking, independent corroboration**: `data/morning/00-OKU-BENI.md` already carries a
  founder-facing Turkish warning about this *exact* ambiguity — "before pasting, check the tab:
  that Supabase project's name as shown in the panel is `oryn-qa-scratch` — 'ORYN' doesn't
  appear in it" — written to stop the founder pasting SQL into the wrong project. This is a
  real, already-recognized risk, not a hypothetical one. This project is currently running real
  (QA) auth users and real stored files (`DATA_RIGHTS_AUDIT.md` confirms a file with no owning
  account currently sits in the `evidence` bucket right now). Renaming a *string* in code does
  nothing to this live resource — actually renaming or re-provisioning it means acting on
  Supabase's own infrastructure directly, and getting it wrong risks disconnecting the app from
  its real data.
- **`oryn_public` — a live Postgres enum label used in two RLS policies**
  (`supabase/migrations/0058_social_posts.sql:62,447,469`, `create type post_visibility as enum
  ('private', 'connections', 'oryn_public')`). Renaming it needs `ALTER TYPE ... RENAME VALUE`
  plus both policy definitions plus every application read/write of the literal string
  (`lib/social/*`) updated in lockstep. **Status caveat**: per the code-layer research pass,
  migration 0058 (which creates this enum) has not yet been applied to the live database —
  so this enum label doesn't exist as a *live* schema object yet, only in the migration file.
  It will become live whenever that migration runs, so it still needs to be decided now, just
  with the correct current status: pending, not yet baked in.
- **`oryn_global_id` — a real, currently-live column, constraint, JSONB key convention, and
  view field**, confirmed independently two ways (a direct database query found the column;
  the migrations research pass traced it to its exact origin). Defined in
  `supabase/migrations/0038_canonical_entity_registry.sql:372` as a column on
  `university_profile_verification_queue`, wrapped in a unique constraint
  (`unique (oryn_global_id, required_metric)`) at line 384, reused as a JSONB key convention on
  `universities.external_ids` and re-exposed as an output column of the
  `current_university_student_counts` view at line 858. This one **is** live — confirmed via a
  direct query, it currently holds real values in `current_university_student_counts.notes`
  provenance text (see database section). Renaming needs a real migration
  (`ALTER TABLE ... RENAME COLUMN`, updating the view, updating the JSONB key convention
  wherever it's read) and updating whatever code writes/reads it — not found in the code-layer
  pass's four target directories, worth a direct grep for `oryn_global_id` before touching it.
- **Three environment variable names, deliberately absent from `.env.example`**:
  `ORYN_ENABLE_SOCIAL_FEED`, `ORYN_ENABLE_CONNECTIONS`, `ORYN_ENABLE_MESSAGING`
  (`lib/social/posts-feature-flag.ts`, `lib/social/connections-feature-flag.ts`,
  `lib/messaging/messaging-feature-flag.ts`). Every code reference goes through an exported
  constant, not a re-typed literal — good practice that limits blast radius in the repo itself.
  **The real risk is external**: each flag is read as an exact-match `env[NAME] === "true"`,
  fail-closed by explicit design. If the constant's *name* is renamed in code
  (`PROXOLA_ENABLE_SOCIAL_FEED`) without the real deployment's environment variable being
  renamed to match, the feature doesn't error — **it silently reverts to disabled, with no
  warning anywhere.** This repo has no visibility into the live deployment's actual env config
  to confirm either way.
- **The GitHub repository identity**, distinct from the trivial local folder rename. Local
  folder rename (`mv ORYN proxola`) is zero-risk, single-machine, instantly reversible — git
  doesn't care what its working directory is called, and the only thing that would actually
  break locally is one hardcoded absolute path
  (`scripts/rls-verify-surface1-u-id.ts:39-40`, `/Users/adasarpkirik/Desktop/Founder/ORYN/...`).
  **Renaming `akirik28/ORYN` on GitHub is a different tier entirely**: GitHub's redirect is a
  safety net, not a substitute — every existing clone/worktree on this machine (11+ sibling
  worktrees share the same remote config) keeps pointing at the old URL until manually updated;
  three scripts hardcode the literal URL
  `https://github.com/akirik28/ORYN` as outbound `User-Agent` headers to real external data
  APIs (OpenAlex, government sources) — `scripts/acquire-admissions-facts.ts`,
  `acquire-programs.ts`, `acquire-university-facts.ts`; and any CI/CD integration or Vercel
  Git-based auto-deploy hook wired to this exact repo path would need re-pointing. This belongs
  in the same risk tier as the Supabase project rename, not as "a bigger version of the trivial
  folder rename."
- **The live Vercel project** — `vercel.json` itself has zero "oryn" occurrences (clean), but
  the actual project name/slug/domain lives in Vercel's own dashboard or a local
  `.vercel/project.json` link file, which is correctly gitignored and therefore genuinely
  invisible to this repo. **Open item only the founder can close** by checking the Vercel
  dashboard directly — parallel in kind to the Supabase-project-name question above.
- **`oryn.app` as a domain** — appears in outbound `User-Agent` strings and one `mailto=`
  parameter sent to OpenAlex (`scripts/acquire-university-facts.ts:228` and four other
  acquisition scripts). Whether the founder actually owns/operates this domain is unconfirmed
  from the repo alone — flagging as a direct question rather than an assumption, since if real,
  it's another piece of external infrastructure (domain, DNS, email) outside this repo's
  control that a full rebrand would eventually have to address, separate from `proxola.com`.

---

## The database layer — what a code search structurally cannot find

Queried every `text`/`character varying`/`jsonb` column across all ~110 tables in
`oryn-qa-scratch`'s public schema for the literal substring "oryn," then read the actual
values for every column that matched — not just the counts.

**Caveat stated plainly**: this is the QA/scratch project used for every live-model check all
night, not a project labeled "production." `list_projects` shows exactly 3 Supabase projects on
this account; the other two are unrelated products by name. Whether a separate production
database exists that I don't have visibility into is genuinely unconfirmed — the structural
finding below (AI-generated per-student text *can* and *does* embed the brand name in stored
data) is real regardless of whether these specific rows are QA fixtures or would-be-live ones.

### Real, AI-generated, student-facing text stored as data — the finding this check exists for

- **`student_requirement_evaluations.reasoning` — 112 rows**, all the identical sentence:
  *"This requirement depends on submitted material Oryn doesn't evaluate automatically —
  review it yourself."* This reads directly on the requirement-checklist feature (AGENTS.md
  Phase 69). A code-level prompt fix does not retroactively fix these 112 existing rows —
  they'd stay stale until regenerated or explicitly backfilled.
- **`weekly_actions.reason` (6 rows)**, `notifications.body` (2), `weekly_plans.summary` (2),
  `ai_recommendations.reason` (2) — all real per-student AI output, e.g. *"Oryn needs basic
  facts about you on record,"* *"Oryn has flagged as low priority,"* *"Oryn can't yet tell if
  this is even a strategic fit."* Same shape as the finding above: generated once, stored, and
  invisible to any `git grep`.
- **`opportunities.description` (4 rows)** — real, live, student-facing opportunity cards,
  where "Oryn"/"ORYN" appears woven into what reads as researcher provenance notes
  concatenated into the same field as the actual description prose (*"an operator-quoted age
  band matching ORYN's own target range,"* *"this restriction should not be read as applying to
  Oryn's core international users"*). Two separate concerns worth flagging together: the brand
  mention itself, and — independent of any rename — whether internal analyst annotations should
  be commingled with student-facing description text in the first place.

### A real schema-level identifier, confirmed live

- **`oryn_global_id`** — exists today as an actual column (confirmed via `information_schema`
  and a direct data query) holding real values, referenced in provenance text like *"Fudan
  statistics... ORYN total is the arithmetic sum..."* across `current_university_student_counts`
  and `university_profile_verification_queue`. Full schema footprint (column, constraint, JSONB
  key, view field) traced above in Bucket 4.

### An internal ID-scheme prefix, baked into ~230+ rows

- **`ORYN-PRG-NNNN`** — `program_research_queue.research_program_id` (221 rows) and its
  provenance text in `research_program_queue`/`university_programs`/`global_university_
  discovery_queue`/`current_university_student_counts`/`university_profile_metrics` "notes"
  columns (another ~600 rows referencing the same ID scheme). Sibling research-queue tables
  follow the identical `research_<type>_id` naming convention (`deadline_research_queue.
  research_deadline_id`, `requirement_research_queue.research_requirement_id`) — very likely
  cross-reference keys, not just labels. Treat as dangerous until someone confirms whether
  application code joins on these string values; not confirmed either way in this pass.

### Internal research-pipeline provenance — should NOT change, same logic as docs/

~750 rows across ~10 columns (`verification_status_input`, most "notes" fields,
`evidence_summary`) consistently use "ORYN" (usually all-caps, a distinct casing convention
from the "Oryn" brand-styling used in student-facing text) as a self-reference when documenting
how a data point was sourced and verified — e.g. *"Checked against ORYN's 4 pre-existing
Erasmus University Rotterdam records and confirmed distinct."* This is the database-layer
equivalent of a `docs/*.md` audit record: a snapshot of what was verified and how, at a point in
time. Rewriting ~750 rows for zero user-facing benefit is the same category of mistake as
retroactively editing a dated audit doc.

### Test/QA fixtures, not really a rename question

"Oryn Test High School" (`canonical_entities`, `entity_aliases`, `entity_verification_queue`),
`profiles.display_name` values "oryn.qa.a" / "oryn.qa.b" / "Oryn QA Sweep", `test@oryn.dev`
(`contact_info.email`), `ORYN_QA_Test_Evidence_Economics_Club.pdf`
(`evidence_files.file_path`) — clearly test fixtures from tonight's own QA activity, candidates
for cleanup on their own merits, not really part of a brand-rename decision either way.

---

## Collisions and naive find-and-replace hazards — full enumeration, not a guess

1. **`storyNotes`/`storyNotesCount`/`hasStoryNotes`** (camelCase — contains "oryN"):
   `messages/en.json:594-595`, `messages/tr.json:594-595`, `features/profile/story-bank.tsx:30,79,89,90`.
   The *values* ("story notes," with a space) don't match — only the keys do.
2. **`categoryNavAriaLabel`** (contains "goryN"): `messages/en.json:1049`,
   `messages/tr.json:1049`, `features/opportunities/opportunity-filter-bar.tsx:63`. No brand
   mention in the value at all.
3. **`OrynMark`** — a real but *unused* PascalCase reference to the original Figma source's
   placeholder component name, in comments only (`app/page.tsx:59`, `app/(auth)/layout.tsx:21`).
4. **The fleet/dev-session codenames** (see Bucket 3) — confirmed as a real, pervasive
   collision class by all three research passes independently, in code comments, commit
   messages, migration comments, and one live database row. A mechanical replace would corrupt
   all of them.

This was checked exhaustively where "exhaustively" was tractable (every non-import lowercase
`oryn` code line, every case-sensitive-casing split, a full case-insensitive/case-sensitive
diff on both message catalogs) — not a spot check. **No occurrence of "oryn" as a substring of
an unrelated English or Turkish word was found anywhere** outside the four items above.

---

## Should any part of this not be renamed at all?

Two candidates, both already covered above but worth stating as a direct answer to the
question asked:

- **Git commit history — not a "shouldn't," a "structurally can't"** without a repo-history
  rewrite, which is a categorically different, far riskier decision than anything else in this
  document and shouldn't be bundled into a rename plan as if it were one more file to edit.
- **The historical docs/ corpus (~520 files) and the database's own provenance/audit text
  (~750 rows)** — these should specifically **not** be rewritten, for the same reason a company
  doesn't reissue old press releases under a new name: they're a record of what was true and
  decided at the time, and several already explicitly self-mark as superseded. The founder gets
  more value from an accurate history than a cosmetically consistent one.

Everything else in Bucket 3 (`AGENTS.md`, `docs/founder-spec.md`, `docs/ORYN-PROMPT-ARCHIVE.md`)
is not "don't rename" so much as "don't rename *silently* — the honest move is disclosure, not
find-and-replace," per the reasoning under each.

---

## Scope and limitations

- Database check covers `oryn-qa-scratch` only — the one project every check tonight has used;
  a separate production project, if one exists, is unconfirmed from here.
- The DB scan covered `text`/`character varying`/`jsonb` columns; it does not cover `enum` type
  labels directly (the `oryn_public` enum finding came from the migrations research pass, not
  the data scan — worth noting this as a real gap in the data-layer method itself, closed only
  because a second, independent pass happened to catch it).
- `.env.local`/`.env.qa-accounts.local` (real, set env values) are correctly gitignored and were
  not and should not be inspected for this inventory — only variable *names* referenced in
  tracked code were checked.
- Two ambiguous docs genres (`docs/research/canonical-entity-intelligence/` and
  `docs/research/counseling-intelligence/`, 61 files combined) are genuinely hybrid — produced
  as one dated research session, but structured as a reusable framework the product still reads
  from going forward. Left as a named judgment call rather than forced into a bucket.
- Vercel project identity (name/domain/org slug) is invisible to this repo by design
  (`.vercel/` gitignored) — open item for the founder to check directly.
- Whether `oryn.app` is a real, founder-owned domain is unconfirmed — a direct question, not an
  assumption.

## Spend

Three parallel Explore-agent research passes (~580K combined subagent tokens, 200 tool calls,
~2,600s total agent runtime) plus roughly 15 direct read-only SQL queries against
`oryn-qa-scratch`. Zero writes anywhere — code, database, or git history.
