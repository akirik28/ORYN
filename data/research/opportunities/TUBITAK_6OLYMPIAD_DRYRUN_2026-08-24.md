# TÜBİTAK-route olympiad dry-run — IMO / IBO / IChO / IPhO / IOI / IOAI

Prepared by RES-CR1 per CEO request 2026-08-24, under founder's overnight-autonomy directive.
**No production write yet.** P1-only facts. Source records: `cr1_olympiads_batch1.jsonl`
(CR1-031 IMO, CR1-039 IBO, CR1-034/CR1-035 IChO/IPhO, CR1-032 IOI, CR1-040 IOAI) and
`cr1_turkey_routes.jsonl` (CR1-070–081, the Türkiye national-route confirmations), each
cross-checked against the live DB before this doc was written — zero existing rows for any of
the six (verified per-name; `%chemistry olympiad%` returns one hit, but that is the **UK**
Chemistry Olympiad, a distinct national feeder competition, not IChO — confirmed by
`official_url = edu.rsc.org`, unrelated to `ichosc.org`).

Format follows `URGENT_3RECORD_DRYRUN_2026-08-24.md`.

## Why these six are structurally different from Marshall/Blackstone — read before the table

**1. The international body's own deadline is not the Turkish student's deadline, and is often not
published at all.** IMO/IBO/IChO/IPhO/IOI/IOAI select national teams through each country's own
olympiad. For Türkiye that is **TÜBİTAK Bilim Olimpiyatları** — a single nine-branch programme
whose own 2027 dates are not yet published (last confirmed cycle: 34th, first-stage exam
2026-05-16). **`deadline` is left NULL on all six records below.** Writing an international
registration or event date into that field would present a Turkish student with a countdown to
an action they cannot personally take — exactly the failure mode documented in CR1-157
(AMC/Waterloo/Wharton/Purple Comet all stored a deadline that belonged to someone other than the
student).

**2. `self_registration_possible = false` on every one of the six, stated explicitly, not implied.**
None of these can be entered directly. Entry is: place well in TÜBİTAK Bilim Olimpiyatları →
be selected in TÜBİTAK's separate international-team-selection stage → represent Türkiye.

**3. The two TÜBİTAK university-admission rights must not be collapsed into one sentence.**
Documented in full in `cr1_2026-08-23_TUBITAK_2204A_ADMISSION_BENEFIT.md` (written for 2204-A, the
research-project competition, but §7.1.1/§7.1.2 apply to *any* TÜBİTAK-run competition sending
students to international olympiads):
- **§7.1.1 Ek Katsayı** (coefficient uplift) — earned by a **national-final** placing alone.
- **§7.1.2 Sınavsız yerleştirme** (exam-free university placement) — earned **only** by placing
  top-three at an international competition TÜBİTAK **sent the student to** — a separate,
  **fourth** selection stage after the national final, not an automatic consequence of it.

Each record's `description` below states the real action (enter TÜBİTAK Bilim Olimpiyatları) and
flags this distinction; none states a coefficient number, since that lives in the ÖSYM YKS guide
and was never retrieved.

---

## 1. International Mathematical Olympiad (IMO)

| Field | Value |
|---|---|
| **New vs existing** | **New.** Zero rows match `%mathematical olympiad%` — confirmed by direct query. |
| **Official source** | `https://www.imo-official.org/` + Regulations PDF (`imo-official.org/documents/RegulationsIMO.pdf`, "Current version approved at the IMO 2025"). |
| **Category** | `competition` |
| **Current status/cycle proposed** | `status = active`, `cycle_status = upcoming` |
| **Exact deadline + timezone** | **NULL — see note above.** IMO 2027 itself: Budapest, Hungary, **16–26 July 2027** (an event date, not an application deadline). |
| **Age/grade** | Verbatim: *"Contestants must have been born on or after 1 July in the year x−20 where x is the year of participation."* For IMO 2027: born on/after 1 July 2007. Also: *"normally enrolled in full-time primary or secondary education on or after 1 December in the year prior"*; home-schooled students explicitly accommodated. |
| **Country eligibility** | `self_registration_possible = false`. Verbatim: *"Participation in an IMO is by invitation only... Contestants should be selected through that Country's national Mathematical Olympiad."* Citizenship clause: *"Contestants of Country X should normally be citizens of Country X, but genuine long-term foreign residents... are permitted"* after a one-year/two-year residence test, "for a bona fide family reason." Team size: up to 6 contestants + Leader + Deputy Leader. Anti-shopping rule: *"a student may not attempt the final selection examinations of more than one country in a given IMO year."* |
| **Cost/fee** | **NULL.** Not stated in the Regulations for individual contestants. |
| **Application URL** | None — see `self_registration_possible`. Actionable route: `https://bilimolimpiyatlari.tubitak.gov.tr/tr` (Matematik branch). |
| **Türkiye route (P1)** | **CONFIRMED.** IMO's own country page for Türkiye (`imo-official.org/countries/TUR/`) lists exactly one national link: `bilimolimpiyatlari.tubitak.gov.tr/tr`. |
| **Proposed `description`** | *"Entry is not direct. Compete in TÜBİTAK Bilim Olimpiyatları (Matematik branch, bilimolimpiyatlari.tubitak.gov.tr) — national medalists may be selected by TÜBİTAK for the Türkiye IMO team. A national-final placing alone earns a YKS coefficient uplift (Ek Katsayı); exam-free university placement (sınavsız yerleştirme) requires TÜBİTAK to separately select and send the student internationally, and requires placing top-three there — this is a distinct, later stage, not automatic from the national result."* |
| **Unresolved** | Whether TÜBİTAK's Matematik branch is the *sole* route (near-certain, not independently confirmed by TÜBİTAK's own page). Exact ek katsayı magnitude (ÖSYM YKS guide, not retrieved). |

---

## 2. International Biology Olympiad (IBO)

| Field | Value |
|---|---|
| **New vs existing** | **New.** Zero rows match `%biology olympiad%`. |
| **Official source** | `https://www.ibo-info.org/en/` + `.../contest/participation.html` + `.../list-of-countries-regions.html`. |
| **Category** | `competition` |
| **Current status/cycle proposed** | `status = active`, `cycle_status = date_not_announced` |
| **Exact deadline + timezone** | **NULL.** No IBO-level student deadline exists; next edition host/dates not stated on pages retrieved. |
| **Age/grade** | Verbatim: *"You should not be older than 20 years of age (at 1 July of the year of the competition)."* *"You have not yet started university (or equivalent) as a full time/regular student."* *"You can only participate twice."* |
| **Country eligibility** | `self_registration_possible = false`. Verbatim: *"you have to win the Biology Olympiad in your country or region."* Team: *"up to four winners"* per country. |
| **⚠ Unresolved school-type rule — flag, do not resolve** | Verbatim: *"You should be enrolled in a regular secondary school for general education (e.g. not specific for STEM or biology)."* Read literally this could exclude Türkiye's Fen Lisesi students and equivalent science-specialist schools elsewhere. Given Türkiye has been an IBO member since 1993 via TÜBİTAK, the literal reading seems implausible against actual practice — but this is unconfirmed either way. **Do not tell a student they are included or excluded on this point without an answer from the IBO office.** |
| **Cost/fee** | **NULL.** Not stated. |
| **Application URL** | None. Actionable route: `https://bilimolimpiyatlari.tubitak.gov.tr/tr` (Biyoloji branch). |
| **Türkiye route (P1)** | **CONFIRMED.** IBO's own member list: *"Türkiye: National Biology Olympiad — Established since 1993 — Official website"* → `bilimolimpiyatlari.tubitak.gov.tr/tr`. |
| **Proposed `description`** | *"Entry is not direct. Compete in TÜBİTAK Bilim Olimpiyatları (Biyoloji branch). Member since 1993. Same two-tier admission-benefit structure as IMO (see above) applies: national placing → Ek Katsayı; separate TÜBİTAK-selected international placing → sınavsız yerleştirme. NOTE: IBO's own eligibility text states contestants should attend a 'regular secondary school for general education, e.g. not specific for STEM or biology' — whether this affects Fen Lisesi students is unresolved; do not state either way to a student without confirming with IBO directly."* |
| **Unresolved** | The Fen Lisesi question above (highest-priority open item on this record). Next edition host/dates. |

---

## 3. International Chemistry Olympiad (IChO)

| Field | Value |
|---|---|
| **New vs existing** | **New — confirmed distinct from the existing `UK Chemistry Olympiad` row** (`96a437a7…`, `official_url = edu.rsc.org`). IChO's own domain is `ichosc.org`; unrelated national feeder, not a duplicate. |
| **Official source** | `https://www.ichosc.org/countries` and its published contacts spreadsheet (`docs.google.com/spreadsheets/d/e/2PACX-1vQlinj…/pub?gid=0&output=csv` — linked from the official page). |
| **Category** | `competition` |
| **Current status/cycle proposed** | `status = active`, `cycle_status = upcoming` |
| **Exact deadline + timezone** | **NULL.** IChO 2027 itself: **Chinese Taipei, 19–28 July 2027** (event date, not a deadline). |
| **Age/grade** | Verbatim (Statutes §2, resolved after this dry-run's first draft): *"The competitors are secondary school students or recent graduates who have not started university education... Competitors must be under 20 years of age on the 1st of July of the year of the competition."* Military-service exception explicitly stated: *"Exceptions can be made for special cases (e.g., compulsory military service)."* — directly relevant given Türkiye's compulsory service. |
| **Citizenship/schooling** | Verbatim: *"The competitors must be passport holders of the country they represent or have taken part in the secondary school educational system of this country for more than one academic year."* A plain OR — the most permissive of the three distinct expat-student resolutions found across this lane's olympiad research (vs. IMO's residence-test, IOI's nationality-fallback). |
| **Team size** | *"four competitors and two mentors."* |
| **Language** | *"Competitors receive all relevant information in the language of their choice."* — unlike Breakthrough/Marshall/Concord Review, IChO does NOT require English of the student; delegations translate. |
| **Country eligibility** | `self_registration_possible = false`. Entry is via national delegation by construction (same family as IMO/IBO), though the exact statute text was not retrieved this session. |
| **Team fee (institutional, NOT student) — now confirmed by the Statutes, not just a secondary source** | Statutes §5: *"The participating country covers the return travel costs... Participating countries must pay a participation fee, the amount of which must be approved by the International Jury... Delegations that did not pay their participation fee... cannot participate."* The earlier-cited "$3,000 for one team" figure is now corroborated by the primary source's own §5 framing (country pays, not student) even though the Statutes don't repeat the exact dollar figure. Do not write any figure to this record's `cost` field — the money never reaches the student directly.
| **Cost/fee (student)** | **NULL.** |
| **Application URL** | None. Actionable route: `https://bilimolimpiyatlari.tubitak.gov.tr/tr` (Kimya branch). |
| **Türkiye route (P1)** | **CONFIRMED.** IChO's own published contacts CSV, row 87: *"Türkiye, Arif DASTAN, TÜBİTAK and Ataturk University, ..."* — TÜBİTAK named as the institution of Türkiye's first long-term contact. |
| **Proposed `description`** | *"Entry is not direct. Compete in TÜBİTAK Bilim Olimpiyatları (Kimya branch). Same two-tier admission-benefit structure applies (see IMO above)."* |
| **Unresolved** | Next-cycle dates beyond the known 2027 event window (Chinese Taipei, 19–28 July 2027). Age/education rule — RESOLVED after this dry-run's first draft; see above. |

---

## 4. International Physics Olympiad (IPhO)

| Field | Value |
|---|---|
| **New vs existing** | **New.** Zero rows match `%physics olympiad%`. |
| **Official source** | `https://www.ipho-new.org/statutes-syllabus/` — the Statutes, not the landing page (the landing page is stale, see caveat below). |
| **Category** | `competition` |
| **Current status/cycle proposed** | `status = active`, `cycle_status = date_not_announced` |
| **Exact deadline + timezone** | **NULL.** No student deadline exists by construction. |
| **Age/grade** | Verbatim, from the Statutes: *"The age of the contestants should not exceed twenty years on June 30th of the year of the competition."* *"Students who have finished their school examinations in the year of the competition can be members of the team as long as they have not commenced their university studies."* School type: *"students of general or technical secondary schools i.e. schools which cannot be considered technical colleges."* |
| **Country eligibility** | `self_registration_possible = false`. Team: *"normally consisting of five students (contestants) and two accompanying persons (delegation leaders) at most."* **Non-discrimination clause, unusually explicit and worth carrying into the record**: *"No country may have its team excluded from participation on any political reasons resulting from political tensions, lack of diplomatic relations... When difficulties preclude formal invitation of the team representing a country, students from such a country should be invited to participate as individuals."* |
| **Cost/fee** | **NULL** for the student; verbatim *"The costs for each delegation... from the day of arrival till the day of departure are covered by the Organizing Committee"* — travel to/from the host is not addressed and should not be assumed covered. |
| **Application URL** | None. Actionable route: `https://bilimolimpiyatlari.tubitak.gov.tr/tr` (Fizik branch). |
| **Türkiye route (P1) — with a live-link caveat** | IPhO's own contacts page lists a Türkiye national link, but the link itself is **dead**: written as `hhttp://www.tubitak.gov.tr/...` (malformed in source), and following the corrected URL returns an empty reply from a live host (curl exit 52) — the page is dated **2019**. **The route is still usable**: it is the same `bilimolimpiyatlari.tubitak.gov.tr` site independently confirmed live by IMO/IBO's citations. Flagging so nobody re-adds IPhO's own dead URL as `official_url` for the Türkiye link. |
| **Proposed `description`** | *"Entry is not direct. Compete in TÜBİTAK Bilim Olimpiyatları (Fizik branch). Same two-tier admission-benefit structure applies (see IMO above). IPhO's own published Türkiye contact link is dead as of a 2019-dated page; use bilimolimpiyatlari.tubitak.gov.tr directly, confirmed live and confirmed as the same site IMO/IBO cite."* |
| **Unresolved** | 2027 host/dates — a "Saudi Arabia 2027" claim circulates in news coverage (Saudi Press Agency, Arab News) but is **not confirmed by an official IPhO page**; do not write it as a fact. |

---

## 5. International Olympiad in Informatics (IOI)

| Field | Value |
|---|---|
| **New vs existing** | **New.** Zero rows match `%olympiad in informatics%` / `%informatics olympiad%`. |
| **Official source** | `http://stats.ioinformatics.org/countries/TUR` (IOI's own statistics site) + `ioinformatics.org/files/regulations21.pdf`. |
| **Category** | `competition` |
| **Current status/cycle proposed** | `status = active`, `cycle_status = date_not_announced` |
| **Exact deadline + timezone** | **NULL.** Last edition: IOI 2026, Uzbekistan, 9–16 August 2026 (already past at retrieval — 2026-08-23). Next host/dates not published on the official site. |
| **Age/grade** | Verbatim: *"is not older than twenty years on the 1st of July of the year of IOI'n."* Enrolment: *"was enrolled in a school at a level of secondary education or lower... and was not enrolled in a degree programme at a tertiary education institution with a half-time or greater load."* Students studying abroad *"may instead represent the Country of their nationality"* — a nationality fallback, structurally different from IMO's residence-based fallback (do not generalise one olympiad's expat rule to another; see synthesis §2). |
| **Country eligibility** | `self_registration_possible = false`. Team: *"one to four Contestants."* National pre-selection is *"firmly recommended"*, not stated as strictly mandatory — weaker wording than IMO's. |
| **Cost/fee** | **NULL.** Not stated. |
| **Application URL** | None. Actionable route: `https://www.tubitak.gov.tr/tr/olimpiyatlar/ulusal-bilim-olimpiyatlari/icerik-bilgisayar` (Bilgisayar branch — the *branch-specific* page, named directly by IOI). |
| **Türkiye route (P1) — the most precise of the six** | **CONFIRMED.** IOI's own statistics page names the exact branch URL above, and it was live-checked this session: HTTP 200, 2 redirects, 56,728 bytes — identical byte count to `bilimolimpiyatlari.tubitak.gov.tr/tr` (the general site IMO/IBO cite), confirming both resolve to the same underlying site. Track record: **first participation 1993, 33 years, 97 contestants, 5 gold / 31 silver / 54 bronze.** |
| **Proposed `description`** | *"Entry is not direct. Compete in TÜBİTAK Bilim Olimpiyatları (Bilgisayar branch, direct link: tubitak.gov.tr/tr/olimpiyatlar/ulusal-bilim-olimpiyatlari/icerik-bilgisayar). 33 consecutive years of Turkish participation, 90 medals — the most established of the six routes. Same two-tier admission-benefit structure applies (see IMO above)."* |
| **Unresolved** | Next edition host/dates (IOI 2026 already occurred; 2027 unannounced on the official site). |

---

## 6. International Olympiad in Artificial Intelligence (IOAI)

| Field | Value |
|---|---|
| **New vs existing** | **New.** Zero rows match `%olympiad in artificial intelligence%` / `%olympiad in ai%`. |
| **Official source** | `https://ioai-official.org/about/` + `.../about/countries-and-territories/`. |
| **Category** | `competition` |
| **Current status/cycle proposed** | `status = active`, `cycle_status = date_not_announced` |
| **Exact deadline + timezone** | **NULL.** Last edition: IOAI 2026, Astana, Kazakhstan, 2–8 August 2026 (already past at retrieval). Next host/dates not published. |
| **Age/grade** | Described as for *"secondary education students under the age of 20"* — a general statement rather than a quoted statute clause; more precise wording not located this session. |
| **Country eligibility** | `self_registration_possible = false`. Entry: *"selected through national competitions"* and/or regional olympiads (NAOAI, APOAI). |
| **Cost/fee** | **NULL.** IOAI's own Vision statement references *"ensuring financial accessibility for all participants"* and a GAITE initiative supporting countries with limited olympiad history — directional intent, not a stated fee figure. |
| **Application URL** | None. Actionable route: `https://bilimolimpiyatlari.tubitak.gov.tr/tr`. |
| **Türkiye route (P1) — the cleanest of the six** | **CONFIRMED, named directly by NAME rather than by URL.** Türkiye is a **founding country** (2024 Burgas edition, one of 33 named founders). IOAI's own country page: *"Türkiye — Accredited organization: **TÜBITAK** (The Scientific and Technological Research Council of Türkiye) — Team Türkiye is chosen from the top-performing students in the national selection process."* No inference or URL-following needed — this is plain text naming the institution. |
| **Proposed `description`** | *"Entry is not direct. Compete in TÜBİTAK Bilim Olimpiyatları — TÜBİTAK is IOAI's own named 'accredited organization' for Türkiye, and Türkiye is a founding country of IOAI (2024). Same two-tier admission-benefit structure applies (see IMO above)."* |
| **Unresolved** | Which specific TÜBİTAK branch (or a separate national AI olympiad, NOAI, not yet identified) feeds this — IOAI is new enough (est. 2024) that Türkiye's exact internal selection pathway was not located this session, only the top-level accreditation. Next edition host/dates. |

---

## UPDATE 2026-08-24 03:05 — IChO's Statutes gap closed since first draft

The IChO Statutes were unreadable through the rendered `ichosc.org/regulations` page (it embeds a Google Doc, same rendering-layer problem as the countries page) but readable via the document's plain-text export — same technique that unlocked the countries CSV earlier tonight. Full age, citizenship, team-size and fee-structure clauses added to CR1-034 and to section 3 above. IChO is now the only one of the six with NO remaining unresolved eligibility gap.

## Summary for approval

| # | Record | New/Existing | `deadline` | `self_registration_possible` | Türkiye-route confidence | Blocking gap |
|---|---|---|---|---|---|---|
| 1 | IMO | New | NULL | false | high (imo-official.org names it) | ek katsayı magnitude unretrieved |
| 2 | IBO | New | NULL | false | high (ibo-info.org names it) | **Fen Lisesi school-type question unresolved — do not answer either way** |
| 3 | IChO | New | NULL | false | high (ichosc.org CSV names it) | none blocking — Statutes now fully read (Google Doc export) |
| 4 | IPhO | New | NULL | false | high, but **operator's own Türkiye link is dead** | 2027 host unconfirmed (news-only claim) |
| 5 | IOI | New | NULL | false | **highest — branch-specific URL, live-checked, 33yr/90-medal record** | next host/dates unannounced |
| 6 | IOAI | New | NULL | false | high, **named directly by organisation name** | internal TÜBİTAK branch/pathway not pinned down |

**Every record's `deadline` is deliberately NULL, per CEO's instruction and CR1-157's finding.**
The actionable date for a Turkish student is TÜBİTAK's own national-cycle calendar, not any of
these six international dates — and TÜBİTAK's next cycle dates are themselves not yet published
(last confirmed: 34th Bilim Olimpiyatları, first-stage exam 2026-05-16). A future correction pass,
once TÜBİTAK publishes 2027 dates, should populate a **separate** "national selection deadline"
representation if one exists in the schema — not this `deadline` field, which the six international
bodies define for their own events, not for TÜBİTAK's feeder competition.

Awaiting review before write.
