# Setting up the migration-replay CI check

**Status: written and verified, not yet installed.** This document exists only because of
a git-permissions gap: this repository's automation currently pushes with a GitHub token
scoped `repo` but not `workflow`, and GitHub hard-rejects any push that adds or modifies a
file under `.github/workflows/` without that scope —

```
! [remote rejected]   ... (refusing to allow an OAuth App to create or update workflow ... without `workflow` scope)
```

So the workflow file below was written and fully verified locally, but could not be pushed
alongside the rest of `oryn/deploy-2026-08-31`. Whoever has broader scope (or the founder,
via `gh auth refresh -s workflow` — an interactive browser step) needs to create it.

## What it's for

`supabase/migrations/` had never been replayed against an empty database before this was
written — every migration had only ever been applied incrementally, to a database already
partway through the sequence. That gap is exactly how the duplicate-`0020`-version defect
(see `docs/deployment.md` §0.1, now resolved as of commit `7e0f74ac`) went undetected: it
only breaks a *fresh* apply, which is precisely what happens when the founder points a new
Supabase project at this repo. This workflow makes that specific failure mode permanently
impossible to reintroduce silently.

It runs two independent paths against a throwaway `postgres:17` container — `psql` in
filename order, and `supabase db push --include-all` — because they fail differently: a
duplicate version number doesn't break the `psql` path (filenames still sort
deterministically) but does abort the CLI path partway through, which is the path the
founder actually uses. It also asserts every `public` table has row-level security
enabled, and that the CLI recorded exactly as many migrations as exist on disk — the
second check specifically catches the `0020a`-style trap (a non-numeric version prefix
gets silently *skipped*, not rejected, by `supabase db push`, which still reports success).

**Re-verified 2026-08-31, against current `main` (post-`7e0f74ac`, 0068 in place):** both
paths apply all 68 migrations with zero errors, and land on the identical schema — 81
tables, 103 policies, 257 indexes, 93 functions. The workflow below is what would have
caught the original defect automatically; it is not itself blocked by it.

## What already exists on `oryn/deploy-2026-08-31` (pushed, no action needed)

`.github/migration-replay/supabase-bootstrap.sql` — the Supabase-owned schemas, roles, and
publication the workflow provisions on the throwaway container before replaying
migrations. This file pushed cleanly; it isn't under `.github/workflows/` so the scope
restriction above doesn't apply to it.

## What's missing: `.github/workflows/migrations.yml`

Create this file with exactly the content below (verified working, unchanged from the
local commit `5dba8f9d` on `oryn/deploy-2026-08-31`):

````yaml
name: Migrations

# Proves supabase/migrations/** still applies to an EMPTY database, which is the exact
# thing that happens when the founder creates the production Supabase project. Nothing
# checked this before: every migration had only ever been applied incrementally to a
# database that was already partway through the sequence, so a break that only shows up
# from zero (a table referenced before it is created, a duplicate version, a dependency on
# platform state) would not have surfaced until production setup — the worst moment.
#
# Two independent paths run, because they fail differently:
#   1. psql, in filename order      — proves the SQL itself is valid and correctly ordered.
#   2. `supabase db push`           — proves the path the founder actually types. This is
#                                     stricter: the CLI records each file's numeric version
#                                     in supabase_migrations.schema_migrations, whose
#                                     primary key is that version, so two files sharing one
#                                     number abort the push midway and leave the database
#                                     half-migrated.
#
# Neither path touches any hosted project; both run against a throwaway container.

on:
  push:
    branches: [main]
    paths:
      - "supabase/migrations/**"
      - ".github/workflows/migrations.yml"
      - ".github/migration-replay/**"
  pull_request:
    paths:
      - "supabase/migrations/**"
      - ".github/workflows/migrations.yml"
      - ".github/migration-replay/**"
  # Schema drift can also be introduced by a migration merged from another branch without
  # this workflow running, so allow an on-demand full replay.
  workflow_dispatch:

concurrency:
  group: migrations-${{ github.ref }}
  cancel-in-progress: true

jobs:
  replay:
    name: Replay all migrations on an empty database
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

    env:
      PGPASSWORD: postgres
      PGHOST: localhost
      PGPORT: "5432"
      PGUSER: postgres

    steps:
      - uses: actions/checkout@v4

      # A duplicate version number does not fail the psql replay (filenames still sort
      # deterministically) but DOES abort `supabase db push`. Checking it explicitly gives
      # a one-line diagnosis instead of a constraint-violation stack from step 4.
      - name: Reject duplicate migration version numbers
        run: |
          dupes=$(ls supabase/migrations/*.sql | xargs -n1 basename | sed 's/_.*//' | sort | uniq -d)
          if [ -n "$dupes" ]; then
            echo "::error::Two or more migrations share a version number: $(echo "$dupes" | tr '\n' ' ')"
            echo "The Supabase CLI keys supabase_migrations.schema_migrations on this number,"
            echo "so 'supabase db push' aborts partway through and leaves the database"
            echo "half-migrated. Renumber the later file to the next free number."
            for d in $dupes; do ls supabase/migrations/${d}_*.sql; done
            exit 1
          fi
          echo "All $(ls supabase/migrations/*.sql | wc -l | tr -d ' ') migrations have distinct version numbers."

      - name: Provision the Supabase-owned schemas, roles and publication
        run: psql -v ON_ERROR_STOP=1 -q -d postgres -f .github/migration-replay/supabase-bootstrap.sql

      - name: Apply every migration in order (psql)
        run: |
          for f in $(ls supabase/migrations/*.sql | sort); do
            echo "--- $(basename "$f")"
            psql -v ON_ERROR_STOP=1 -q -d postgres -f "$f"
          done

      # Every user-owned table must carry RLS. Enforced here rather than only in review
      # because a new table without `enable row level security` is invisible in a diff but
      # is a live data leak (spec Phase 31).
      - name: Assert row-level security is enabled on every public table
        run: |
          missing=$(psql -tA -d postgres -c "
            select t.tablename
            from pg_tables t
            join pg_class c on c.relname = t.tablename and c.relnamespace = 'public'::regnamespace
            where t.schemaname = 'public' and not c.relrowsecurity
            order by 1;")
          if [ -n "$missing" ]; then
            echo "::error::These public tables have no row-level security:"
            echo "$missing"
            exit 1
          fi
          psql -tA -d postgres -c "select 'RLS enabled on all ' || count(*) || ' public tables.' from pg_tables where schemaname='public';"

      - name: Summarize the resulting schema
        run: |
          psql -tA -d postgres -c "
            select 'tables=' || (select count(*) from pg_tables where schemaname='public')
                || ' policies=' || (select count(*) from pg_policies where schemaname='public')
                || ' indexes=' || (select count(*) from pg_indexes where schemaname='public')
                || ' functions=' || (select count(*) from pg_proc where pronamespace='public'::regnamespace);" \
            | tee -a "$GITHUB_STEP_SUMMARY"

  cli-push:
    name: Replay via supabase db push (the founder's path)
    runs-on: ubuntu-latest
    # Gated on `replay` so the duplicate-version check above diagnoses the failure in one
    # line instead of this job surfacing it as a primary-key violation mid-push.
    needs: replay

    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10

    env:
      PGPASSWORD: postgres
      PGHOST: localhost
      PGPORT: "5432"
      PGUSER: postgres

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      # Only the Supabase CLI is needed; a full `npm ci` would pull the whole app for one binary.
      - name: Install the Supabase CLI
        run: npm install --no-save supabase@$(node -p "require('./package.json').devDependencies.supabase.replace(/^[^0-9]*/,'')")

      - name: Provision the Supabase-owned schemas, roles and publication
        run: psql -v ON_ERROR_STOP=1 -q -d postgres -f .github/migration-replay/supabase-bootstrap.sql

      # sslmode=disable because the throwaway container serves plaintext; the CLI defaults
      # to requiring TLS, which is correct against a real hosted project.
      - name: supabase db push
        run: npx supabase db push --db-url "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable" --include-all --yes

      - name: Assert every migration was recorded, not silently skipped
        run: |
          on_disk=$(ls supabase/migrations/*.sql | wc -l | tr -d ' ')
          recorded=$(psql -tA -d postgres -c "select count(*) from supabase_migrations.schema_migrations;")
          echo "on disk: $on_disk / recorded: $recorded"
          if [ "$on_disk" != "$recorded" ]; then
            echo "::error::$on_disk migration files on disk but $recorded recorded. The CLI"
            echo "silently ignores files whose leading version is not purely numeric, so a"
            echo "file like 0020a_foo.sql reports a clean push while never running."
            exit 1
          fi
````

## After adding it

Push directly to `main` or open it as its own small PR — either is fine, since this file
only adds a new CI job and touches nothing else. First run should show two green jobs
(`replay`, `cli-push`) and a step summary reporting `tables=81 policies=103 indexes=257
functions=93`. If a future migration ever breaks this, that's the workflow doing its job —
see `docs/deployment.md` §0.1 for what that failure mode looks like and how to read it.
