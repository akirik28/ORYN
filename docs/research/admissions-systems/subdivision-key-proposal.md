# A sub-country admissions key — proposal, not implementation

**Status: design proposal only. Nothing in this document has been built.** Written 2026-09-03
after hitting the same gap twice while researching the admissions-system expansion line
([`sweden.md`](./sweden.md) through [`belgium.md`](./belgium.md), plus the unshipped
[`finland.md`](./finland.md)). Checked against `lib/admissions/system-shape.ts` on
`origin/main`@`36f38146` — re-verify line numbers before acting if `main` has moved.

## The problem, stated from two real instances, not in the abstract

`AdmissionSystemEntry` (`system-shape.ts:179-195`) resolves a shape from `(country, pathway,
institution, field)` — see `resolveAdmissionSystem`'s precedence chain at `system-shape.ts:815-873`:
institution+field override, then institution-wide override, then field override, then the
country/pathway default. This key has been sufficient for every one of the 25 shipped countries.
It stopped being sufficient twice this session, along two different axes:

1. **Belgium** ([`belgium.md`](./belgium.md)): the general shape (`academic_threshold`) is
   confirmed the same in both the Flemish and French Communities — a real convergence, shipped
   as one entry. But the two Communities' *restricted-fields lists differ by name* (Flanders:
   medicine, dentistry, veterinary sciences, arts schools; French Community: medicine, dentistry,
   civil engineering, physiotherapy, speech therapy) and, where they overlap (medicine), the
   *mechanism specifics differ* (the French Community's is confirmed centralized and
   rank-competitive with a quantified 15% non-resident cap; Flanders' entrance-exam mechanism was
   never independently confirmed as rank-competitive or threshold). The shipped entry has one
   `fieldOverrides: [{field: "medicine", ...}]` whose mechanism text has to hedge across both
   Communities in prose, because there is nowhere in the schema to say "this differs by
   Community" structurally.
2. **Finland** ([`finland.md`](./finland.md), never shipped): the divergence is one level more
   fundamental — not just which fields are restricted, but which *general* mechanism applies at
   all. A Turkish MEB diploma holder gets grades-only, no-exam evaluation at a UAS institution
   (Turkey is explicitly named eligible) and a SAT/ACT-gated evaluation at a university
   institution (Turkey is not on the matriculation/IB/EB list). This isn't a field-level
   exception on top of a shared general shape the way Belgium's medicine override is — it's two
   different general shapes, and the existing key has no way to express that without either
   picking one sector and being wrong for the other, or not shipping an entry at all (what
   `finland.md` does).

**Both are the same underlying gap: the real world sometimes divides admissions law below the
country level, along a line that is not geography and not (necessarily) a named individual
institution.** `institutionOverrides` already handles "this *specific, named* institution
differs" (Canada's UBC/Toronto/Waterloo, Norway's NTNU) — it does not handle "*all* institutions
of category X differ from category Y" without enumerating every institution in category X by
name and maintaining that list as the database grows.

## What was checked and ruled out before proposing new schema

Before designing a new key, checked live (`oryn-qa-scratch`) whether existing data already
carries a usable classifying signal, so this proposal isn't inventing a column that already
exists:

```sql
select column_name, data_type from information_schema.columns
where table_name = 'universities' and table_schema = 'public';
```

`universities.institution_type` exists, but its actual values for Finland's and Belgium's rows
are ownership/legal-status labels — `"Public"`, `"Private not for Profit"`, or a generic
`"university"` — not sector (university/UAS) or Community (Flemish/French). It does not solve
either case as populated today. `universities.application_system` — the "UCAS, Common App,
Studielink, Parcoursup, ÖSYM/YKS, uni-assist, direct" column the implementation-gap analysis
already flagged as under-used — is `null` for every single Finnish and Belgian row. **Neither
existing column is a free win here.** Whatever key gets built needs either new classification
data (populated per institution, a research task, not just a code change) or a name-based
classifier maintained inside `system-shape.ts` itself, the same way `institutionOverrides`
already is.

## Design options

### Option A — treat it as `institutionOverrides`, just accept the enumeration cost

Do nothing new. Represent Belgium's Community split and Finland's sector split by naming every
known institution in each category as an `institutionOverride`, the same pattern already used for
Canada and Norway.

- **Cost to build:** zero — the schema already supports this today.
- **Cost to adopt:** re-author Belgium's entry (currently 1 `fieldOverrides` entry) into ~15-20
  named `institutionOverrides` (Belgium's universities split roughly evenly across two
  Communities); author Finland's entry the same way across its ~9+ institutions once the
  remaining unresolved shapes (`finland.md` §C) are found.
- **The real problem:** silent, not loud. A new Belgian or Finnish institution added to the
  database later falls through every named override and lands on the country-level default —
  which, for Finland specifically, doesn't even have a safe default to fall back to (there isn't
  one general shape that's honestly right for both sectors). This is exactly the kind of
  confident-badge-from-absent-classification bug this entire research line exists to prevent,
  just moved one layer down. Cheap to build, and the failure mode is the one this whole night was
  about closing, not opening a new instance of.

### Option B — a named subdivision dimension, classified by name-list inside the entry

Add an optional layer between the country entry and its `domestic`/`international`/
`fieldOverrides`: each `AdmissionSystemEntry` may declare `subdivisions?: SubdivisionEntry[]`,
where each `SubdivisionEntry` carries its own `domestic`/`international`/`fieldOverrides` (i.e.,
structurally a full nested `AdmissionSystemEntry` minus `countryNames`/`sources`) plus a
`matchNames: string[]` list functioning exactly like `InstitutionOverride.names` does today —
classification by exact-after-normalization name match, not fuzzy matching, for the same reason
`matchesInstitution` (`system-shape.ts:777-780`) is exact today: a near-miss silently borrowing
another institution's/subdivision's mechanism is worse than an honest "unknown."

Resolution would slot in as a new precedence layer, most naturally *above* the country/pathway
default and *below* `institutionOverrides` (a specifically-named institution's own confirmed
exception should still win over a general subdivision guess) — concretely, a new step between
the field-override check (`system-shape.ts:845-857`) and the `pathway === "unknown"` fallback
(`system-shape.ts:859+`), or possibly interleaved with institution overrides depending on whether
a subdivision-level field override should outrank an institution-wide (non-field) override from a
*different* layer — this ordering question is itself something the founder/implementer should
settle explicitly, not something this proposal presumes.

An institution not matched by any `matchNames` list falls through to the country-level
`domestic`/`international` — which only works if the country entry still has an honest default to
fall back to. For Belgium, it does (the confirmed-convergent `academic_threshold`). **For Finland,
it does not** — there is no confirmed general shape safe to fall back to, so a Finland entry built
this way would need every institution classified, with no safe unclassified default, which is
functionally close to Option A's enumeration cost anyway, just organized differently (grouped by
subdivision rather than flat).

- **Cost to build:** a new interface, a new optional field on `AdmissionSystemEntry`, a new
  resolution branch, new `ResolutionBasis` member(s) (e.g. `"subdivision"` /
  `"subdivision_field"`, extending the existing `no_entry | country | country_pathway |
  country_field | institution | institution_field | pathway_undetermined` union at
  `system-shape.ts:115-122`) — contained entirely within `system-shape.ts` and its own test file.
- **Cost to adopt:** re-author Belgium (2 subdivisions, each inheriting the shared
  `academic_threshold` default plus its own `fieldOverrides`) and Finland (2 subdivisions, each
  with genuinely different `domestic`/`international`, once the remaining unresolved shapes are
  found) — less duplication than Option A for Belgium specifically, since the shared general
  shape doesn't need repeating per institution.
- **The real problem:** same silent-fallthrough risk as Option A for any institution not named in
  a `matchNames` list, mitigated only by discipline in keeping the lists current as the database
  grows — this proposal does not have a mechanism to *guarantee* that discipline, only to make it
  cheaper than Option A's flat enumeration.

### Option C — a real classifying column, populated per institution

Add (or properly populate) a DB column — e.g. `universities.admissions_subdivision` — with
country-specific values (`"flemish" | "french"` for Belgium; `"university" | "uas"` for Finland),
populated as part of the same research pass that builds the registry entry, and pass it through
`AdmissionSystemQuery` as a new optional field the resolver can match against directly, no
name-list needed.

- **Cost to build:** a migration, a `types/database.ts` addition, a new optional
  `AdmissionSystemQuery` field, and — the part Options A/B don't need — a data-population task:
  someone (a person or a future research pass) has to actually set this value on every affected
  row, not just write code.
- **The real advantage:** removes the silent-fallthrough risk structurally. A `null` subdivision
  on a new institution is a visible, queryable gap (`where admissions_subdivision is null`) an
  admin or a future research pass can find and close, the same way this whole night's work found
  and closed gaps by querying `university_statistics`/`university_programs` coverage rather than
  guessing. Not a design opinion — a fact checkable in the same style as this entire package.
- **The real cost:** it's the only option that isn't free to try. It commits to a schema change
  and a data-entry obligation before knowing whether more than two countries will ever need it.

## Recommendation, offered not decided

**Option B**, with the explicit caveat that it doesn't remove Option A's core risk, only makes it
cheaper to represent — and a note that if a *third* country turns up needing this (the corridor
list in `README.md`'s "Countries added outside the core matrix pass" table will keep growing),
Option C's per-institution column stops being a speculative cost and starts being the more honest
one. Two confirmed instances (Belgium, Finland) is enough to justify designing the key; it is not,
on its own, enough to justify committing to a schema migration and a data-population task for a
pattern that might not recur. This is a judgment call about how much to build ahead of evidence,
which is exactly the kind of call this document is deferring to the founder rather than making
unilaterally.

## What this costs `computeAdmissionOutlook` and every other consumer

**Nothing, by design, if Option A or B is chosen.** `AdmissionSystemResolution`
(`system-shape.ts:124-135`) — the only thing `resolveAdmissionSystem` returns, and the only thing
`computeAdmissionOutlook`, `explainOutlook`, `counseling-adapter.ts`, and the university detail
page actually consume — does not need to change shape. A subdivision layer resolved *inside*
`resolveAdmissionSystem`, before it returns, is invisible to every downstream consumer; they
already treat `shape`/`pathway`/`basis`/`mechanism`/`sources` as opaque, resolved facts. The one
consumer-visible change either option implies is additive: new `ResolutionBasis` members (e.g.
`"subdivision"`), which is the same kind of non-breaking addition `"institution_field"` already
was when institution-level field overrides were added. No existing test in
`__tests__/admissions/system-shape.test.ts` asserts an exhaustive `ResolutionBasis` union, so
none should break from an addition — confirmed by reading the file, not assumed.

**Option C is different**: it adds a new field to `AdmissionSystemQuery`, which every current call
site would need to know exists (though not necessarily populate — an optional field with no
subdivision-aware entries yet behaves identically to today). The actual cost there is not code,
it's the data-population obligation described above.

## What would need to change if this is approved

Not built as part of this proposal. If Option B is chosen: a new `SubdivisionEntry` interface, a
`subdivisions?` field on `AdmissionSystemEntry`, a new resolution branch in
`resolveAdmissionSystem` with its own precedence decision (see Option B's open ordering
question), new `ResolutionBasis` members, re-authored Belgium and Finland entries, and test
coverage proving an unclassified institution still falls through safely to the country default
rather than silently picking a subdivision. Finland specifically still needs its two remaining
unresolved questions closed first (`finland.md` §C: the university sector's SAT/ACT-track shape,
and the UAS sector's certificate-based/entrance-exam shape) — the architecture can be designed
without them, but a Finland entry can't ship without them regardless of which option is chosen.
