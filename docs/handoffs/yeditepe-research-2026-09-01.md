# Yeditepe Üniversitesi — research staged for catalogue addition (fourth and final Tier-1 candidate)

**Status:** analysis + verification. No DB writes. **Author lane:** oryn-60, closing out the Gate
F / Turkish-depth Tier-1 thread. **Base:** local `main`.

**Catalogue addition, same shape as the other three** — no existing `universities` row. **Scoped
like Marmara, not like Galatasaray/TOBB ETÜ**: 142 raw LISANS records across 13 faculties is
large enough that a full staged JSON catalogue is its own follow-on task, not attempted here.
This pass verifies structure and, most importantly, **closes the one open item from this
project's own TOBB ETÜ correction** — Yeditepe's peak-selectivity figure was flagged there as
not yet independently re-checked; it now has been.

## Gate and domain — checked, clean

`looksOfficial('yeditepe.edu.tr')` → `true`, HIGH/`official_primary`. Both `www` and bare domain
resolve 200. One minor note: `www.yeditepe.edu.tr` 301-redirects to a **plain `http://`** (not
`https://`) URL for its Turkish homepage — unusual, but the destination itself still resolves and
content-matches the real university, confirmed by page content (tagline, faculty names, "67
Lisans Programı" claim).

## The one item this pass exists to close: Yeditepe's peak figure is correct

**Confirmed directly, not assumed:** floored to `kontenjan≥10`, Yeditepe's true best is
**Tarih (İngilizce) (Burslu), rank 744, kontenjan exactly 10** — matching this project's original
candidate-list citation ("best=744, floored") precisely. **No correction needed.** Unlike TOBB
ETÜ, the record actually cited was already at the floor boundary, not below it.

The same fee-tier spread phenomenon this project already documented for TOBB ETÜ appears here too,
more extreme: the single worst *filled* placement is rank **1,187,801** (Elektronik Ticaret ve
Yönetimi, English-medium, **%50 İndirimli** — not even the cheapest `Ücretli` tier) against
kontenjan 35. Consistent with the standing product-level note already added to the candidate-list
doc: any single selectivity number for a vakıf institution needs its fee-tier stated alongside it.

## Scale, precisely counted

**142 raw records → 64 distinct base programmes** (tier-suffix stripped) — closely matching the
university's own stated "67 Lisans Programı" (the 3-programme gap is plausibly an edge case in
suffix-stripping across less-common tier labels, not chased further this pass). **13 faculties**,
including Diş Hekimliği (Dentistry), Eczacılık (Pharmacy), and Tıp (Medicine) alongside Sanat ve
Tasarım (Arts & Design) — a broad-spectrum comprehensive private university, not narrowly focused
the way Sabancı/Koç are. **Zero KKTC-quota variants** (unlike Marmara's 11) — every one of the 142
raw records is a genuinely independent programme×language×fee-tier offering, no quota-variant
inflation to account for.

**Language spread**: Turkish, English, English-30%, French, German, and **Russian** — the only one
of the four Tier-1 candidates offering Russian-medium instruction, a distinct signal from
Galatasaray's uniform French, TOBB ETÜ's Turkish/English mix, and Marmara's Turkish/English/
German/French/Arabic spread.

## Admission facts — checked, same outcome as TOBB ETÜ

International-admissions page identified correctly this time (`https://international.yeditepe.edu.tr/admission`
— found via the homepage's own navigation, not guessed), and fetched. **Same result as TOBB
ETÜ**: a generic application-portal landing page ("Online applications are open!", links to
Associate/Undergraduate/Graduate degree levels) with no entrance-exam or accepted-credential
detail on the page itself — that content sits on further linked program-specific pages not
fetched this pass. Whether Yeditepe runs its own entrance exam or accepts SAT/A-Level/IB/Abitur/
diploma scores directly for international applicants remains **genuinely unresolved**, same as
TOBB ETÜ, unlike Galatasaray where the equivalent question resolved cleanly (GSÜYÖS).

## What this does NOT do

- No `universities`/`university_programs`/`university_program_placement_cycles` rows inserted.
- No full 64-programme staged JSON catalogue this pass, same reasoning as Marmara's — the raw
  142-record set is reproducible directly from YÖK Atlas's own API, not re-attached here.
- No international entrance-exam answer — checked, found only a generic portal, named as
  unresolved rather than guessed at, same treatment as TOBB ETÜ's identical outcome.
- No domestic-pathway distinguishing facts beyond what §"Scale" and the fee-tier finding above
  already establish — nothing else searched for this pass.
- No reconciliation of the 64-vs-67 programme-count gap against the university's own claim.
