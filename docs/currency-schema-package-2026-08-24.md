# Currency support — schema package

**Status**: proposed, nothing applied. Migration SQL below is written but deliberately not
added to `supabase/migrations/`. Prepared at founder request, 2026-08-24.

**Scope**: make a stored money amount carry its unit. Nothing else.

---

## 1. The defect

`opportunities.cost` is a bare `numeric`. Every renderer reads it as USD, because
`formatCurrency` ([lib/i18n/format.ts:16](../lib/i18n/format.ts:16)) declares
`currency = "USD"` as its default and no caller overrides it.

Measured live: **47 rows carry `cost > 0`, and 10 of them are almost certainly not USD** —
5 GBP, 3 EUR, 1 CHF, 1 TRY. Concretely, a British programme's £365 renders to a Turkish
family as `$365`, and Bocconi's €2,700 as `$2,700`.

This has already produced two corrections. Bilkent stored `68000` meaning ₺68.000 and rendered
as `$68,000`; Koç stored `80000` meaning ₺80.000 — confirmed P1 from Koç's own fees page,
*"The Summer Academy 2026 program fee is TRY 80.000"* — and rendered as `$80,000`, a ~40×
overstatement. Both were resolved by nulling `cost` and keeping the verified figure in prose,
which is a workaround: it discards a real number because there is nowhere to put its unit.

### 1a. The same bug already exists where the data is available

`university_statistics.cost_currency` and `university_programs.tuition_currency` **already
exist** ([0006_universities.sql:40,76](../supabase/migrations/0006_universities.sql)). Two call
sites ignore them and take the USD default anyway:

- [app/(app)/universities/[id]/page.tsx:318](<../app/(app)/universities/[id]/page.tsx>) —
  `formatCurrency(stats.cost_of_attendance)`
- [lib/universities/counseling-adapter.ts:360](../lib/universities/counseling-adapter.ts) —
  `formatCurrency(tuition.costOfAttendance)`

So this is not only a missing column. The rendering contract is wrong independently, and
fixing it is worth doing whether or not the column below is added.

## 2. Migration (not applied)

Mirrors the existing columns' shape — plain nullable `text`, no enum, same as
`university_statistics.cost_currency`. A `check` is added here because, unlike 2024's
columns, this one is being introduced with a known writer set.

```sql
-- 00XX_opportunity_cost_currency.sql
alter table public.opportunities
  add column cost_currency text
    check (cost_currency is null or cost_currency ~ '^[A-Z]{3}$');

comment on column public.opportunities.cost_currency is
  'ISO 4217 code for `cost`. NULL means the currency was never recorded — it does NOT mean USD.
   Renderers must not assume a unit when this is null.';

create index opportunities_cost_currency_idx
  on public.opportunities(cost_currency) where cost_currency is not null;
```

`text` + regex rather than an enum, deliberately: the corpus already spans GBP/EUR/CHF/TRY/USD
and will keep growing, and an enum makes every new currency a migration.

## 3. Backfill — a research task, not a migration

**Do not derive currency from country.** A Turkish institution can price in EUR or USD, and
several already do. Deriving would reintroduce exactly the inference the Koç hold existed to
prevent; the only reason Koç was resolvable is that its own fees page states TRY explicitly.

The backfill is therefore 47 rows of P1 lookup, and it is small enough to do by hand. Two rows
(Bilkent, Koç) already have P1 evidence recorded in their descriptions and can be restored to
a real `cost` + `cost_currency` the moment the column exists — recovering data the workaround
discarded.

Rows whose currency cannot be established stay `NULL` and must render as unit-less.

## 4. Rendering contract

`formatCurrency`'s defaulted parameter is the root cause: it lets a caller omit the unit and
still get a confident symbol. Change it so the unit cannot be omitted silently.

```ts
// currency is required; null means "not recorded" and renders without a symbol
export function formatMoney(value: number, currency: string | null): string {
  if (!currency) return formatNumber(value); // e.g. "80,000" — no unit claimed
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(value);
}
```

Then migrate the four call sites, passing the currency column that already exists for the two
university ones. Keeping the old defaulted `formatCurrency` around would let the bug
reappear, so it should go.

**A number with no symbol is the honest failure mode.** `80,000` tells a student to check the
official page; `$80,000` tells them something false with confidence.

## 5. Deliberately excluded

The three axes cost still cannot express — fee **type** (application / participation /
publication / programme), **payer** (student / school / team), **unit** (per person / per team
/ per bundle) — and a fourth found on 2026-08-23, **timing**: JRHS takes 350 at submission and
publishes ~30% of papers, IJHSR takes the same 350 only on acceptance. `cost` renders those
identically.

Those are real and evidenced, but they are a modelling change, not a unit fix, and bundling
them would turn a one-column migration into a redesign. Currency is separable and blocking
today; the rest should be decided from records later.
