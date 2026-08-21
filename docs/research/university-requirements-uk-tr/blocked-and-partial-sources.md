# UK/TR lane: sources that could not be verified, and why

**Written:** 2026-08-21. **Lane:** UK/Turkey requirements and deadlines (`uk_tr_*.jsonl`).
**Purpose:** stop the next lane repeating attempts that already failed, and record what each
failure would need in order to succeed. Companions: `../university-requirements/source-authority-gap.md`
and `../university-requirements/scalar-thresholds-are-not-enough.md`.

Every URL below was fetched directly on 2026-08-21. None produced a record.

## Hard-blocked: server refuses automated fetch

| Institution | URLs attempted | Result |
|---|---|---|
| Durham University | `/study/international/entry-requirements/english-language-requirements/`, `.../direct-entry-band-a/`, `/study/undergraduate/how-to-apply/entry-requirements/` | HTTP 403 twice, socket hang up once |
| UCAS | `/undergraduate/applying-university/.../ucas-undergraduate-key-dates` | HTTP 403 (consistent with the prior lane's note that ucas.com 403s automated fetch) |

Durham is the only institution on the priority list that blocked every attempt. Its band structure
is known from search discovery (Direct Entry Band A / Band B, plus a two-year validity rule) but
**no Durham record was written**, because a search snippet is discovery, not evidence. Durham needs
a rendered-browser fetch or a human paste.

UCAS's 2027 dates are already in the corpus via its dated `/events/` pages
(`deadlines_batch3`), which do not 403 — use those, not the key-dates hub.

## JS-rendered: server returns a shell with no content

| Institution | URLs attempted | Result |
|---|---|---|
| İstanbul Üniversitesi | `yos.istanbul.edu.tr/tr/content/basvuru/basvuru-kosullari`, `/en/content/application/application-requirements` | Page header only ("İstanbul Üniversitesi \| Yös", "Açık Kapı, Açık Bilim"); body never delivered |
| Yıldız Teknik Üniversitesi | `ogi.yildiz.edu.tr/ogi/7/Yurtdışından-Öğrenci-Kabulü/90`, `/en/page/Admission-of-International-Students/90` | HTTP 404 on both |
| Yıldız Teknik Üniversitesi | `www.admissions.yildiz.edu.tr` | TLS failure — hostname not in certificate altnames (`*.yildiz.edu.tr` does not cover `www.admissions.`) |
| Hacettepe (web pages) | `internationalstudent.hacettepe.edu.tr/tr/menu/basvuru_kosullari-25`, `/en/menu/application_requirements-25` | In-page "Sayfa bulunamadı"; only the banner "2026–2027 uluslararası öğrenci başvuruları devam ediyor" rendered |

Hacettepe was nonetheless captured **in full** — see below. The other two produced nothing.

Two of ORYN's ten priority Turkish institutions are unreachable by plain HTTP fetch. Both would
likely yield to a rendered browser; neither should be re-attempted with WebFetch.

## Recovered: PDF, after WebFetch could not parse it

WebFetch returns "compressed/encoded PDF, cannot extract" for Turkish university PDFs, but it
**saves the binary to disk**, and `pypdf` extracts those files cleanly. This is the single most
useful technique found this session — Turkish universities publish their real rules as PDFs, so a
lane that stops at the WebFetch failure loses the entire market.

| Document | Outcome |
|---|---|
| Hacettepe `Ogrenciyurtdisindanbasvurukayit230525.pdf` (admission directive) | Fully extracted; 10 records, MADDE 5 through MADDE 12 |
| Ankara `2026/07/gecerli-sinavlar-ingilizce.pdf` (valid exams table) | Fully extracted; 7 records, both pages |
| METU `odtu_iso_requirements.pdf` (minimum application requirements) | Fully extracted; 7 records, incl. country categories and footnotes |

`Read` on a PDF fails in this environment (`pdftoppm` not installed). Use `pypdf` directly.

## Partial: structure captured, numbers behind another document

| Institution | What is held | What is missing |
|---|---|---|
| University of Southampton | Band system A–I exists and is per-course (`REQ-9210`) | Per-band numbers live in a per-entry-year PDF (`All bands English language test requirements 202627 entry_v3.pdf`) — not attempted |
| University of Exeter | Profile E in full (7 records) | The profile-to-programme mapping. `/study/englishlanguagerequirements/` socket-hung; without it, Exeter's rows cannot be attached to any programme |
| University of Liverpool | Three IELTS bands, exclusions, validity | Which band applies to which programme — `REQ-9034` is flagged `NEEDS_REVIEW` for exactly this |
| İstanbul Technical University | Eligibility, closed-list rule, English table | The per-cycle accepted-exam announcement (`/duyuru_ekler/yabanci/202710/EN/index.php` → 404). `REQ-9113` records that the list is closed without recording its contents |
| The University of Manchester | 14 course-level records for BSc Computer Science | Any evaluable university-wide threshold. Manchester publishes only "usually the equivalent of IELTS 6.0–7.0" centrally (`REQ-9015`) and pushes everything else to 294 individual course pages |

## Correctly absent — checked, and nothing is published

Not failures. Recorded as `CURRENT_CYCLE_NOT_PUBLISHED` or equivalent.

- **Manchester, 2027-entry deadlines.** The international application-process page still carried
  2026-entry dates on 2026-08-21 (`DL-9005`). Its 2027-entry *course* pages are live, so
  requirements were updated ahead of deadlines.
- **CAO dated deadlines.** `cao.ie/index.php?page=keydates` returned CAO's own "page does not
  exist"; `page=importantdates` exposed navigation only. TU Dublin's year-less restatements
  (`DL-9112` to `DL-9115`) therefore stay year-less, which is the correct outcome, not a gap.

## One source that contradicts itself

Manchester's international undergraduate application page states, in a single sentence:
"the deadline is 15 October 2026 (6pm, UK time) for September 2024 entry." Both halves cannot be
true, and the rest of the page is written for September 2026 entry. Recorded as
`CONFLICTING_EVIDENCE` with `deadline_date` and `cycle_year` both null (`DL-9004`) — choosing a
half would be silent resolution.
