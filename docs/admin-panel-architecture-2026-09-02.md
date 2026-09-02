# Admin panel architecture — decided 2026-09-02

The founder asked for an admin account where they can see and manage everything, cost
included, "as easy as possible, without it getting complicated", and asked me to settle the
architecture. This is that decision. It is binding for the sections being built now and for
whatever gets added next.

## What exists, measured rather than assumed

`app/(app)/admin/page.tsx` is **271 lines**: one server component that authenticates,
fetches every section's data in a single `Promise.all`, and renders four sections inline —
Reports, Provider health, Scheduled jobs, AI usage.

It is genuinely good work. Job health distinguishes `never_run` / `stale` / `stuck` from
`failed`, and the empty-streak detector separates "found nothing new" from "hasn't
accomplished anything in a week" — that distinction is the whole reason the section is
worth having. Provider health shows last-failure alongside last-success specifically so a
recovered provider doesn't read the same as one that never broke. None of that gets
touched.

Three things are wrong for what the founder now needs.

### 1. It already reads `ai_usage` — I told a lane it didn't

The "AI usage (last 500 calls)" section reads `ai_usage` and aggregates calls and
input/output tokens by feature. **My dispatch to oryn-d0 said "not one screen reads it".
That was false**, and it was the kind of false that produces a duplicate section rather
than an extended one.

What the section actually omits is narrower and sharper: it reads tokens and never reads
**`estimated_cost`**, which is populated on every row. So the panel can tell you the shape
of usage and not what it cost. There is no per-user view and no time window.

### 2. "Last 500 calls" is a window that will start lying

There are 128 rows in `ai_usage` today, so the section currently shows everything and the
label is harmless. At any real volume it shows a shrinking slice of recent history while
still being titled "AI usage", and nothing on screen says which slice. It also fetches 500
rows to sum them in JavaScript — the wrong shape for a number a database can aggregate.

### 3. The order answers the wrong question first

Sections run Reports → Providers → Jobs → Usage. **Reports is first and is always empty**:
the social layer that generates them is switched off and unreachable by students, which the
code says outright. Money is last. The founder's sentence was "krediden tut her detaya
bakabiliyim" — from the credit onward. The panel is ordered against that.

Also: `PageHeader` says "Not linked from navigation." The founder cannot reach their own
admin panel without typing the URL.

---

## Decisions

### D1 — One file per section, page composes only

`page.tsx` keeps `requireAdmin()` and composition. It does no fetching. Each section becomes
an async server component that fetches its own data, wrapped in `<Suspense>` with the
existing skeleton treatment.

```
app/(app)/admin/page.tsx        auth + composition, target under 60 lines
features/admin/sections/*.tsx   one file per section, each self-fetching
lib/admin/queries.ts            every admin read, one module
```

Reason: the current single `Promise.all` is efficient and it is why the file is 271 lines.
Five more cards makes it ~550 in one function, and every future section makes it worse. With
Suspense the queries still run in parallel; the difference is that a slow one degrades its
own card instead of the page, and a section can be read, moved or deleted without reading
the other seven.

**This is a refactor of existing sections, not only a home for new ones.** Adding five cards
to a file that is already at its limit is how the limit stops being noticed.

### D2 — Three groups, money first

| group | answers | contents |
|---|---|---|
| **Spend** (default) | what is this costing me | spend summary, per-user spend, credit remaining, budget warnings |
| **System** | is it working | provider health, job health, manual triggers |
| **People** | who is using it | user list, moderation queue |

Reports moves out of first position. It is not deleted — the report → queue → removal path
is deliberately wired ahead of the feature, and that reasoning stands.

Tabs, not one long scroll. Group membership is the durable decision; if tabs prove wrong for
three groups, the grouping survives the change.

### D3 — Explicit time windows, aggregated in SQL

Replace "last 500 calls" with **today / 7 days / 30 days / all time**, computed as SQL
aggregates. Never fetch rows to sum them in the page. Every figure states its window on
screen; no figure is shown whose window the reader has to infer.

### D4 — Credit remaining is an estimate and must say so

The Anthropic balance is not readable from the API. The card shows a manually-entered
starting figure minus measured spend, labelled as an estimate, with the date the starting
figure was entered. **A derived number is never presented as an account balance.** If the
starting figure is missing the card says so rather than rendering a total that reads as
authoritative.

### D5 — Unattributed spend gets its own line, never an aggregate

Three `ai_usage` rows have `user_id = NULL`. A per-user budget that reads this table cannot
see them. Folding them into a total is how they stay invisible, so they get a visible line
of their own — and if the count is zero, the line says zero rather than disappearing.

### D6 — Reachable, from the user menu

Add an admin entry to the user menu, rendered only when `is_admin`. Not the main sidebar:
the sidebar is the student's product and spec Phase 42 caps its top level deliberately.

### D7 — New strings are bilingual; existing English is a separate package

Every heading in the panel today is a hardcoded English literal, while the rest of the app
runs through `next-intl` and the founder reads Turkish. **New sections ship with `en` and
`tr` from the first commit.** Retrofitting the four existing sections is real work with no
new capability, so it is its own package rather than a tax on this one — but it is a real
gap and it is written down here so it does not become invisible.

### D8 — Read-only, and the boundary between reading and enforcing

The panel reads and renders. It does not gate a model call, change a budget, or alter a
user's tier. Enforcement lives in `lib/ai/limits`. The admin surface may later *set* a
value, but the decision about what to do with that value stays in one place, so the rule
that stops a call is never split between a screen and a library.

---

## What this does not decide

**UPDATE, 2026-09-02, superseding the paragraph below:** the premise turned out not to
apply. `profiles.plan_tier` (migration 0089) shipped as a visual skin — "standard" | "ultra"
— explicitly not a billing/subscription entity (that migration's own header: "no payment,
no upgrade flow... per CEO's own explicit scope for this pass, 'skin only'"), so the
minor-as-payer question this section was blocked on never actually applies to it: there is
no payer to attach it to yet. D8 above ("the admin surface may later *set* a value") is now
true — the user list renders the real tier and a control to change it
(features/admin/plan-tier-control.tsx, 2026-09-02), per the founder's own direct request
after being stuck running raw SQL to set their own tier by hand. The paragraph below is kept
for the history, not as current guidance.

Tiers. Free/mid/premium exist in the plan and the user list carries a tier column, but what
the tiers *are* depends on the minor-payment legal research now in progress — if the payer
must be a parent, "tier" attaches to a different entity than the student, and the user list
would be wrong to assume otherwise. The column renders "—" until that is settled.
