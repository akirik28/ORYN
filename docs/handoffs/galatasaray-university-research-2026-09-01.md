# Galatasaray University — research staged for catalogue addition

**Status:** staged, not applied. No DB writes. **Author lane:** oryn-60, continuing the Gate F /
Turkish-depth thread at oryn-a7's steer. **Base:** local `main`.

**This is a catalogue addition, not a depth pass.** Every other Turkish-university research
package tonight (`tr-university-depth-gate-f-2026-09-01.md`) enriched an *existing*
`universities` row. Galatasaray has none — `select id from universities where name ilike
'%galatasaray%'` returns nothing live. Applying this staged data means creating the institution
itself first (identity, aliases, canonical domain) before any programme/placement row can
reference it. **Say this plainly to whoever authorizes it: this is not "add 26 requirement rows
to a known university," it's "add a university."**

---

## 1. Source-authority gate, checked before writing anything

Per oryn-a7's instruction — confirmed against `lib/acquisition/source-authority.ts` directly,
not assumed:

```
looksOfficial('gsu.edu.tr')             -> true
looksOfficial('international.gsu.edu.tr') -> true
sourceAuthority('programs', 'https://gsu.edu.tr') -> { tier: 'HIGH', sourceType: 'official_primary' }
```

`.edu.tr` matches the `.includes(".edu.")` branch — the same gate that already accepts every
other Turkish university in the catalogue. No gap here, unlike the MIT/`mitadmissions.org` case
this same check was modeled on. (Checked, did not touch `source-authority.ts` itself —
`oryn-4e`'s territory tonight per oryn-a7.)

## 2. The domain itself — one real complication, resolved

`https://gsu.edu.tr` (no `www`) resolves cleanly: HTTP 200, a valid Sectigo-issued certificate
whose subject reads `O=GALATASARAY UNIVERSITESI` — this is genuinely the institution's own site,
confirmed by certificate identity, not just a plausible-looking domain name.

**`https://www.gsu.edu.tr` fails TLS certificate-chain verification in every tool tried** (curl,
WebFetch, the browser pane) — an incomplete intermediate-certificate chain served specifically on
that vhost, not a wrong or fake domain; the leaf certificate itself is the same genuine one.
Recommend the bare domain (`gsu.edu.tr`) as the stored `website_url` if this is applied — it's
the one that actually verifies — and flagging the `www` subdomain's cert gap to whoever
administers Galatasaray's own infrastructure is out of this project's scope, not something to
route around by disabling verification here.

## 3. Programmes and placement data — P1, direct from YÖK Atlas

Fetched live today: **13 LISANS-level programmes**, all with real 2026-cycle placement records
(quota, cutoff score, cutoff rank). Full structured data in
`data/research/galatasaray-university-staging-2026-09-01.json`.

**Every one of the 13 is French-medium instruction.** This is the single most important fact
about how Oryn should represent this institution — not an incidental detail. No English-medium
or Turkish-medium bachelor's track exists at Galatasaray. A student profile that matches on
"top Turkish university" without surfacing this would be recommending something materially
different from what the placement suggests.

Faculties: Hukuk (Law) · İletişim (Communication) · İktisadi ve İdari Bilimler (Economics/
Administrative Sciences — İktisat, İşletme, Uluslararası İlişkiler, Siyaset Bilimi) · Fen-Edebiyat
(Arts & Sciences — Fransız Dili ve Edebiyatı, Sosyoloji, Felsefe, Matematik) · Mühendislik ve
Teknoloji (Engineering — Endüstri Mühendisliği, Bilgisayar Mühendisliği). Cutoff ranks span 305
(Hukuk) to 39,022 (a 1-seat KKTC national-quota variant of İletişim) — all comfortably inside the
genuinely-competitive range this project's own candidate-list analysis already used to rank it #4
nationally on peak selectivity.

## 4. Requirements and deadlines — weighted per oryn-a7's steer, not forced into US shape

Turkey's domestic pathway is `academic_rank_competitive` (`lib/admissions/system-shape.ts`,
unchanged, no Galatasaray-specific override needed) — placement is the whole decision, so a
`university_requirements` table modeled on holistic-review criteria has little to hold for the
domestic pathway. Effort went to the two places real, sourced facts existed instead:

**Galatasaray runs its own named foreign-national admission exam: GSÜYÖS** (Galatasaray
Üniversitesi Yabancı Uyruklu Öğrenci Sınavı). Sourced directly from `international.gsu.edu.tr`
(passes the gate at HIGH/`official_primary`, §1). This is the concrete, institution-specific
instance of what `system-shape.ts`'s general Turkey/international entry already describes in the
abstract ("each university sets its own accepted credentials") — not a contradiction of that
entry, a real example under it.

**A real, dated deadline exists for the international pathway specifically**: the 2026-2027
cycle's second application session runs **1–4 September 2026**, quoted verbatim from the source
page (French-language original in the staging JSON). This is NOT the domestic YKS calendar,
which is nationally set by ÖSYM and shared across every Turkish university — it would be wrong to
store it as if it were Galatasaray-specific, and the staging file says so explicitly.

**Left unresolved, stated rather than guessed:** whether YKS-placed domestic students go through
a mandatory French-language preparatory year before their 4-year programme starts. The site
references a general "Yabancı Dil Eğitimi" unit but no page found describes a French-specific
placement/prep pathway for new admits. Absence of a page is not evidence there's no prep year —
just that this pass didn't find one. Named as an open question in the staging file's
`explicitly_not_established` array rather than silently omitted or invented.

## 5. What this does NOT do

- No `universities` row created. No `university_programs`, `university_requirements`,
  `university_deadlines`, or `university_program_placement_cycles` rows inserted.
- No change to `lib/acquisition/source-authority.ts` — checked only, per the territory boundary
  oryn-a7 set.
- No French-prep-year claim made either way — named as unresolved, not guessed at.
- No claim about GSÜYÖS's actual content (scoring, format, accepted prior qualifications) beyond
  its name and that it exists — the source page that names it doesn't describe it further, and
  nothing here invents past what was actually read.
