# LGS and High-School Placement

Researched 2026-08-21 from MEB primary sources: the **2026 Merkezî Sınav Başvuru ve Uygulama Kılavuzu** (22pp) and the **2026 Ortaöğretime Geçiş Tercih ve Yerleştirme Kılavuzu** (15pp).

LGS matters to ORYN not because our users are taking it — most are past it — but because **it determines which school a student is at, and that constrains everything downstream**: which UDSP programs they can access (`RULE-TR-EXAM-004`), which curriculum track they are on, and therefore which YKS score type is realistically open to them.

For a user already in high school, LGS is a **fixed input, not a lever**. ORYN should read it as context and never as an action item.

---

## 1. Terminology warning — two different "OBP"s — `RULE-TR-EXAM-016`

This is a genuine collision that will cause bugs if ORYN models it naively:

| Acronym | System | Meaning | Formula | Role |
|---|---|---|---|---|
| **OBP** | **YKS** | *Ortaöğretim* Başarı Puanı | high-school diploma grade × 5 → 250–500 | **Added to the score** (×0.12) |
| **OBP** | **LGS** | *Okul* Başarı Puanı | arithmetic mean of year-end scores for grades **6, 7, 8**, carried to 4 decimals | **Tie-break only** |

> "Okul Başarı Puanı (OBP): Ortaokulun 6, 7 ve 8. sınıf seviyelerinde alınan yıl sonu başarı puanlarının aritmetik ortalaması ile elde edilen ve virgülden sonra dört basamak yürütülen puanı" — Tercih Kılavuzu, definitions

**In LGS, school grades do not enter the central placement score at all.** They only break ties. This is the opposite of YKS, where OBP is added directly. ORYN must never carry logic from one to the other.

---

## 2. The exam — `RULE-TR-EXAM-017`

2026 cycle (`VERIFIED_HISTORICAL`): applications 23 March – 10 April 2026; entrance documents 3 June; **exam 14 June 2026**; results 10 July 2026; preferences 13–27 July; placement results 5 August 2026.

**Two sessions, same day, 90 questions total:**

| Session | Start | Subjects | Questions | Duration |
|---|---|---|---|---|
| 1 (sözel) | 09:30 | Türkçe, T.C. İnkılap Tarihi ve Atatürkçülük, Din Kültürü ve Ahlak Bilgisi, Yabancı Dil | **50** | 75 min |
| 2 (sayısal) | 11:30 | Matematik, Fen Bilimleri | **40** | 80 min |

Questions are based on the **8th-grade curriculum** and each has **4 options** — not 5 as in YKS and UDSP.

> Between sessions students are offered a snack pack (oat bar, walnuts, raisins, 330ml water) on parental request. A small detail, but it confirms the two sessions are a single continuous event — relevant if ORYN ever models exam-day logistics.

### Scoring — a third, different penalty rule — `RULE-TR-EXAM-018`

> "Her bir öğrencinin her bir alt testine ait ham puanı, ilgili teste ait doğru cevap sayısından yanlış cevap sayısının **üçte biri** çıkarılarak bulunur."

**Raw = correct − (wrong ÷ 3).**

This gives Turkey three exams with three different rules, which ORYN must keep strictly separate:

| Exam | Options | Wrong-answer penalty | Blind-guess expected value |
|---|---|---|---|
| **UDSP** | 5 | **none** | **Strictly positive — never leave a blank** |
| **LGS** | 4 | **÷ 3** | Exactly zero (1/4 × 1 − 3/4 × 1/3 = 0) |
| **YKS** | 5 | **÷ 4** | Exactly zero (1/5 × 1 − 4/5 × 1/4 = 0) |

Both LGS and YKS are calibrated so that a *blind* guess is EV-neutral. In both, **eliminating even one option makes guessing positive-EV**. Only UDSP rewards unconditional guessing. Generic "don't guess on Turkish exams" advice is wrong on all three counts.

Then:
- Each sub-test is standardised to **mean 50, SD 10**.
- Standard scores are multiplied by **Tablo-2 weights**, summed to a **Toplam Ağırlıklı Standart Puan (TASP)**, and rescaled to **100–500**.

**Tablo-2 weights:**

| Türkçe | Matematik | Fen Bilimleri | T.C. İnkılap Tarihi | Din Kültürü | Yabancı Dil |
|---|---|---|---|---|---|
| **4** | **4** | **4** | 1 | 1 | 1 |

Türkçe, Matematik and Fen together carry **12 of 15 weight units — 80% of the score** — despite being only 60 of the 90 questions. The three "1"-weighted subjects contribute 20% combined. Effort allocation should follow the weights, not the question counts.

**Missing either session voids the whole exam:** "Oturumlardan herhangi birine katılmayan ya da herhangi bir oturumda sınavı iptal edilen öğrenciler için MSP hesaplanmaz."

Students exempt from Yabancı Dil and/or Din Kültürü have those weighted scores **imputed proportionally** from their performance on the remaining tests, rather than being scored as zero.

---

## 3. Placement — three parallel routes — `RULE-TR-EXAM-019`

Students may hold up to **20 preferences** across three categories:

| Route | Preferences | Basis |
|---|---|---|
| **Merkezî** (central) | up to **10** | Central exam score, by score ranking, into quota |
| **Yerel** (local) | up to **5** (first 3 within the registration area) | Residence address, school success score, absence record |
| **Pansiyonlu** (boarding) | up to **5** | Separate boarding-school process |

**Merkezî yerleştirme** covers science high schools, social sciences high schools, Anatolian high schools, Anatolian imam hatip high schools, project schools, and Anatolian technical programs at vocational/technical schools. **Local placement is the universal fallback** — every student participates in it, so no student is left unplaced.

### Central-placement tie-break, in order

> "Sınavla öğrenci alan okullarda merkezî sınav puanının eşitliği hâlinde sırasıyla okul başarı puanı (OBP) üstünlüğüne, 8'inci, 7'nci ve 6'ncı sınıflardaki yıl sonu başarı puanı (YBP) üstünlüğüne, 8'inci sınıfta özürsüz devamsızlık yapılan gün sayısının azlığına, tercih önceliğine ve öğrencinin doğum tarihine göre yaşı küçük olana bakılarak yerleştirme yapılır."

1. Central exam score
2. OBP (grades 6–8 mean)
3. Year-end score in grade 8, then 7, then 6
4. **Fewer unexcused absence days in grade 8**
5. Preference order
6. Younger candidate

Unexcused absence in grade 8 is a real, if late-acting, tie-break criterion — a rare case where attendance carries direct placement weight.

### Registering at a private school forecloses preferences

Students who complete definitive registration at a private secondary institution **cannot make preferences at all**, and any preferences submitted before registering are **cancelled by the Ministry**. Cancelling the registration during the preference window restores the ability to choose. Similarly, placement into a central-exam school **voids that student's local and boarding preferences**.

This is a genuine sequencing trap: a family that secures a private-school place as insurance before results are out may find they have forfeited the state-school route.

---

## 4. What this means for ORYN

- **LGS is history for our users.** For a 15–18 year-old, ORYN must treat LGS as a fixed contextual fact, never as something to improve. Surfacing it as a "gap" would be actively harmful.
- **It explains the student's constraint set.** School type determines available curriculum tracks, whether the school runs a UDSP at all, and the *taban puan* that gates transfers into another school's international program (`RULE-TR-EXAM-004`).
- **The only live LGS-derived lever is the transfer route** — and it is a comparison against a school's historical taban puan, which ORYN must source per-school rather than infer.
- **ORYN must not infer school quality from placement route.** The regulation ranks by score into quota; it does not publish or endorse any quality ordering, and YKS's OBP explicitly ignores school identity (`RULE-TR-EXAM-013`).

### Freshness

2026 figures are `VERIFIED_HISTORICAL`. **2027 LGS dates, weights and format are not published** as of 2026-08-21. Weights and question counts have changed across cycles historically; do not project them.

---

## Sources

Both retrieved 2026-08-21.

1. **Sınavla Öğrenci Alacak Ortaöğretim Kurumlarına İlişkin Merkezî Sınav Başvuru ve Uygulama Kılavuzu – 2026** (MEB, 22pp) — `https://www.meb.gov.tr/meb_iys_dosyalar/2026_04/06110219_LGS_Basvuru_ve_Uygulama_Kilavuzu_2026.pdf` — session structure, scoring formula (§11), Tablo-2 weights, exemption handling.
2. **2026 Yılı Ortaöğretime Geçiş Tercih ve Yerleştirme Kılavuzu** (MEB, 15pp) — `https://cdn.eba.gov.tr/yardimcikaynaklar/genel/2026-yili-ortaogretime-gecis-tercih-ve-yerlestirme-kilavuzu.pdf` — OBP definition, placement routes, preference counts, tie-break order, private-school registration rules.
3. **MEB announcement, 2026 LGS guide published** — `https://www.meb.gov.tr/2026-lgs-kapsamindaki-merkezi-sinav-icin-basvuru-ve-uygulama-kilavuzu-yayimlandi/haber/40200/tr`
4. **MEB announcement, 2026 placement guide published** — `https://www.meb.gov.tr/2026-ortaogretime-gecis-tercih-ve-yerlestirme-kilavuzu-yayimlandi/haber/41329/tr`

> Note on sourcing: an earlier ÖDSGM-hosted URL for the merkezî sınav guide returned HTTP 404 at retrieval time; the meb.gov.tr copy cited above was used instead. Same document, different host.
