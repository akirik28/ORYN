# Programme corpus duplicate audit

**Measured 2026-08-21 against `data/research/university-programs/` as it stands. Nothing was
deleted, merged or modified.**

Reproduce with:

```bash
npm run audit:program-corpus-duplicates
npm run audit:program-corpus-duplicates -- --show legitimate_split
```

The script (`scripts/audit-program-corpus-duplicates.ts`) has no merge, delete or `--apply`
path. Its classification rules live in `lib/programs/corpus-duplicates.ts` and are unit-tested
in `__tests__/programs/corpus-duplicates.test.ts`.

---

## 1. Re-measuring the raw signals

72 files, 10,094 records.

| raw signal | values | records |
|---|---:|---:|
| `research_program_id` appearing more than once | **46** | 95 |
| `official_program_url` appearing more than once | **202** | 4,080 |

The 46 matches the original count exactly. The URL figure is higher than the 181 previously
recorded, and the corpus has grown since — but **the URL number is not a duplicate count and
never was.**

129 of those 202 URL values are pages where **every record on them has a different programme
name**. That is a university publishing one catalogue or search page for its whole list —
Manchester's 294 programmes, the Turkish records on the YÖK Atlas root. It is the normal shape
of the source, not a defect. Treating a shared URL as evidence of sameness is precisely the
mistake that rejected 53 genuine METU programmes to catch one real duplicate.

So a candidate here requires **a shared URL *and* a shared programme name**, or a shared
identifier. Three signals were used:

| signal | groups raised |
|---|---:|
| shared URL + exact normalized name | 90 |
| shared URL + name matching after a trailing `[…]` annotation is stripped | 68 |
| shared `research_program_id` | 46 |

After de-duplicating groups raised by more than one signal: **204 candidate groups covering 414
records** (4.1% of the corpus).

---

## 2. Classification

| class | groups | records | share of groups |
|---|---:|---:|---:|
| **genuine duplicate** | **32** | 64 | 15.7% |
| **legitimate re-research** | **96** | 192 | 47.1% |
| **legitimate split** | **76** | 158 | 37.3% |
| identifier collision on distinct programmes | 0 | 0 | 0% |

**Only 32 groups are duplicates. 172 of 204 candidates (84%) must not be collapsed.**

### Genuine duplicates — 32 groups, all byte-identical

Every one is a `drive_batch1_2026-08-17.jsonl` ↔ `reverify_batch3_2026-08-17.jsonl` pair, and
**all 32 are identical in every field** (keys sorted before comparison, so key order is not
mistaken for content). The same line was written into two files. École Polytechnique, ESCP,
ESSEC, Paris Dauphine, Constructor, Frankfurt School, LMU, LUISS.

These are the only groups where collapsing provably loses nothing — the two records are the
same bytes. Zero groups fall into the harder "nothing discriminating differs, but other fields
do" case.

### Legitimate re-research — 96 groups

The same programme observed twice. Two sub-shapes:

- **28 groups differ by research date.** `drive_batch1` (researched 2026-08-15) against
  `reverify_batch2` / `fr_it_es_ch_batch1` / `fr_it_es_ch_batch2`. Politecnico di Milano, TU
  Delft, Eindhoven, EPFL.
- **68 groups differ only by a degree annotation inside the programme name.**
  `acquire-programs-batch2_2026-08-20` and `independent_batch7_2026-08-21` cover the same
  Glasgow programmes at the same URLs, a day apart, as
  `"Accountancy & Finance [BAcc]"` and `"Accountancy & Finance"` — the degree type annotated
  into the name in the older batch, lifted into `degree_type` in the newer one. Same
  `degree_level`, same URL, and the newer batch adds `language_of_instruction` and `campus`
  that the older one lacks.

**Neither is a duplicate.** The right handling is supersession — keep the later observation,
retain the earlier as history — never deletion of either. The 68 Glasgow pairs are worth
special note because exact name matching misses **every one of them**; they are only visible
once a trailing `[…]` annotation is stripped.

### Legitimate splits — 76 groups

Same name at the same university, genuinely different programmes. What distinguishes them:

| discriminator | groups |
|---|---:|
| `degree_type` | 58 |
| `official_program_url` | 14 |
| `campus` | 9 |
| `language_of_instruction` | 8 |
| `faculty_or_school` | 3 |
| `degree_level` | 2 |

(Groups can carry more than one.) Real examples: Bologna's "Medicine and Surgery" as four
records across two campuses and two languages; Bologna's "Nursing" across three campuses;
Sapienza's "Classics" in two languages; Padua's "GIURISPRUDENZA" across two campuses;
Paris-Saclay's "Chimie" at two degree levels. **Collapsing any of these destroys a distinction a
student actually chooses between** — which is the METU failure repeated.

---

## 3. Two rules this audit had to add, each from a real miss

Both were found by checking the classifier's own output against the source records rather than
trusting the first result.

**`official_program_url` is a last-resort discriminator.** Padua publishes
"MEDICINA E CHIRURGIA" at both `.../medicina-e-chirurgia` and
`.../medicina-e-chirurgia-treviso` — two campuses — but only the Treviso record fills in
`campus`. The classifier deliberately does *not* count "empty on one record, set on the other"
as a difference (otherwise every partially-filled record invents a split). So every structured
discriminator agreed and the pair read as a **genuine duplicate**. The two distinct
per-programme pages were the evidence the other fields lacked. Adding the URL as a final
discriminator moved it, correctly, to `legitimate_split`.

**A trailing `[…]` annotation must be stripped before comparing names — and parentheses must
not be.** Square brackets in this corpus carry degree-type annotation (`[BAcc]`, `[BSc]`,
`[BEng/MEng]`), which is not identity. Parentheses carry identity: Bonn's "Economics (Major)"
and "Economics (Minor)" are different things, and Ankara's "(KKTC Uyruklu)" marks a separate
quota programme. Stripping brackets surfaced 68 real re-research pairs; stripping parentheses
would have merged programmes that differ. Both behaviours are pinned by tests.

---

## 4. The identifier defect, which is not a duplicate question

**46 groups have all their records under one `research_program_id`. 14 of those are legitimate
splits** — distinct, separately-admitted programmes wrongly sharing one identifier.

That 14 matches the earlier lane's finding exactly, arrived at independently here.

The cause is already documented: the `fr_it_es_ch` batch mints one identifier per
*programme-name-and-degree* rather than per *physical programme*, so one identifier spans
Bologna's several campuses of the same course. **The fix is re-minting an identifier for all but
one record in each group. It is not a merge and not a deletion**, and conflating it with the
duplicate question is how a split gets collapsed.

No group was found where one identifier covers two genuinely *different* programmes (different
subject or institution) — 0 in the `id_collision_distinct_programmes` class. The defect is
always same-name-different-instance.

---

## 5. Recommendation

**Collapse nothing automatically. Nothing in this audit authorises a merge.**

1. **The 32 byte-identical groups are the only safe collapse.** All are one
   `drive_batch1` ↔ `reverify_batch3` overlap. Deleting either copy of each pair loses no
   information, provably — they are the same bytes. Even here, prefer removing the duplicated
   *lines from one file* over any record-level merge, and record the decision.

2. **Re-mint identifiers for the 14 split groups sharing one `research_program_id`.** Keep
   every record. This is the only other action with no judgement in it.

3. **Handle the 96 re-research groups by supersession, not deletion** — keep the later
   observation as current, retain the earlier as history. The 68 Glasgow pairs specifically:
   the newer `independent_batch7` records carry `language_of_instruction` and `campus` the
   older ones lack, so the newer record is the better current record in every pair checked.

4. **Leave all 76 legitimate splits alone.** They are the correct state of the data.

5. **Do not build a dedup key that treats a shared URL as identity.** 129 of the 202 shared-URL
   values are catalogue pages carrying no identity at all. `programDedupKey` already folds the
   URL into a *composite* key alongside name/level/language/degree-type rather than using it
   standalone (migrations 0053/0054); that shape is right and this audit found no reason to
   change it.

6. **The degree-annotation-in-name pattern did reach the live table, but barely — 5 rows.**
   Checked directly: `university_programs` holds exactly 5 names ending in a bracketed
   annotation, at 2 universities — Michigan's `Biophysics [B.S.]`,
   `Biochemistry [B.S.]`, `Biomolecular Science [A.B. or B.S.]`,
   `Interdisciplinary Chemical Sciences (ICS) [A.B. or B.S.]`, and Queen Mary's
   `Medicine - Graduate Entry Programme (4 year) [(only open to those who qualify for home
   fees]` (which also carries an unbalanced bracket). None are Glasgow, so the 68 Glasgow
   pairs were not ingested in their annotated form. All 5 already have `degree_type`
   populated, so the annotation is redundant as well as unmatchable — a five-row cleanup,
   worth doing when someone is next in that table, not worth a pass of its own.
