# UDSP — Identification and Verification

**Question posed:** the founder asked us to research **"UDSP"**, described as an exam in Turkey. A prior session could not confirm the acronym and hypothesised it might be a misremembering of the abolished **ÜDS**, or a confusion with **YDS / e-YDS / YÖKDİL**.

**Answer: "UDSP" is real, current, and correctly remembered.** It is not ÜDS, and it is not a foreign-language proficiency exam for adults. The hypothesis in the task brief is wrong, and it is worth being explicit about why: UDSP's governing directive was signed **7 August 2025** and its first centrally-administered sitting was **27 June 2026**. It is new enough that it postdates most reference material about Turkish exams.

More importantly for ORYN: **UDSP is arguably the single most directly relevant Turkish exam to our product's core user.** It gates 14-16 year-olds out of IB, AP and IGCSE/A-Level programs inside Turkey. Every other exam in this research package concerns university entry; this one concerns whether a student can enter the international-curriculum track in the first place.

Researched 2026-08-21. All facts below are from MEB primary sources (the official guide PDF, the official directive on mevzuat.meb.gov.tr, and MEB announcement pages).

---

## What UDSP is

| Field | Value |
|---|---|
| Acronym | UDSP |
| Full name | Uluslararası Diploma ve Sertifika Programı (UDSP) Yabancı Dil Yeterlilik Sınavı |
| English | International Diploma and Certificate Programs Foreign Language Proficiency Exam |
| Administrator | Millî Eğitim Bakanlığı (MEB) — Ölçme, Değerlendirme ve Sınav Hizmetleri Genel Müdürlüğü (ÖDSGM) |
| **Not** administered by | ÖSYM (ÖSYM runs YKS/YDS; UDSP is a MEB central-system exam) |
| Purpose | Language-proficiency gate for admission to international diploma/certificate programs run inside MEB-affiliated public and private secondary schools |
| First central sitting | 27 June 2026 |

Note the acronym collision that likely caused the earlier confusion: in the directive, **"UDSP" denotes the *programs* themselves** ("Uluslararası Diploma ve Sertifika Programı"), while the exam's full name appends "Yabancı Dil Yeterlilik Sınavı". Both the program and the exam get called "UDSP" colloquially. The directive defines it as:

> "g) UDSP: Millî Eğitim Bakanlığı Talim ve Terbiye Kurulu Başkanlığınca kabul edilen, uluslararası diploma ve sertifika programlarını" — Yönerge MADDE 4(1)(g)

---

## Which programs it gates — `RULE-TR-EXAM-001`

The directive's annexes provide school-accreditation checklists for exactly three named program families:

- **EK-4/a** — `KONTROL LİSTESİ (IBDP)` → International Baccalaureate Diploma Programme
- **EK-4/b** — `KONTROL LİSTESİ (AP)` → Advanced Placement
- **EK-4/c** — `KONTROL LİSTESİ (IGCSE- AS/A LEVEL)` → IGCSE and AS/A Level
  (the "AS/A LEVEL" wording was **added** by the 07/08/2025 amendment)

Beyond these three, MADDE 6(2)(b) allows any *other* program accepted by the Talim ve Terbiye Kurulu Başkanlığı (TTKB) to operate under a checklist prepared by OGM. So the set is open-ended, but only IBDP, AP and IGCSE/AS-A-Level are named in the regulation.

> **Explicitly NOT verified:** several secondary sources (prep-company blogs, news aggregators) list **Abitur** among the covered programs. **No MEB primary source I examined names Abitur.** The exam being offered in German is suggestive but is *not* evidence for this claim — a German-language IB or IGCSE stream would equally explain it. ORYN must not assert that UDSP gates Abitur. Status: `UNVERIFIED`.

---

## The admission gate — `RULE-TR-EXAM-002`

This is the load-bearing rule. From the directive, Öğrenci kabulü, MADDE 8(1):

> "(1) Okul içinden veya dışından UDSP'ye başvuracak öğrencilerde;
> a) Uygulanacak programın başladığı sınıf düzeyinde olmak,
> **b) Bakanlıkça yapılacak yabancı dil seviye tespit sınavı sonucunda en az 70 puan almak,**
> c) Gerekli görülmesi hâlinde yabancı dilde okutulacak diğer derslerden okul yönetimince yapılacak hazırbulunuşluk sınavında başarılı olmak,
> şartları aranır."

Three separate conditions, all of which must hold:
1. Be at the grade level where the program starts.
2. **Score at least 70** on the ministry's language exam (= UDSP).
3. *If the school requires it*, pass a school-run readiness exam (`hazırbulunuşluk sınavı`) in the other subjects that will be taught in the foreign language.

Condition (c) is easy to miss and matters: **clearing 70 on UDSP does not by itself guarantee a place.** The school may impose its own subject-readiness test on top.

### The 70 is a floor, not a target — `RULE-TR-EXAM-003`

This is the most counseling-relevant clause in the entire directive, and it is the one a student is most likely to get wrong. MADDE 8(3):

> "(3) UDSP'ye başvuru yapan öğrenci sayısının ilgili program için belirlenen kontenjandan fazla olması durumunda **önce yabancı dil seviye tespit sınavı sonucuna**, eşitlik olması durumunda hazırbulunuşluk sınavı yapılmışsa bu sınavların sonucunda alınan puana bakılır, **puanı yüksek olan öğrenciye öncelik verilir.** Yine eşitlik olması hâlinde bir önceki sınıfın yılsonu başarı puanı esas alınır."

When applicants exceed the program quota, ranking is:
1. **UDSP score** (primary)
2. readiness-exam score, if one was held (tiebreak)
3. previous year's `yılsonu başarı puanı` — school year-end average (second tiebreak)

So at an oversubscribed school, the difference between 72 and 94 is the difference between a place and no place. A student who treats 70 as "the number I need" is optimising for the wrong thing. See `06-counseling-implications.md`.

### Transfer students carry an extra condition — `RULE-TR-EXAM-004`

MADDE 8(4): students coming **from outside the school** must additionally meet the school's `taban puan` (the LGS-derived cutoff score recorded in e-Okul), and those admitted this way are not counted against the school's vacant quota.

> "(4) Okul dışından gelecek öğrencilerde birinci fıkrada belirtilen şartları taşımanın yanında merkezi sınav puanına göre oluşan taban puan şartı da aranır…"

This is the link between LGS and UDSP: **a student's LGS result constrains which schools' international programs they can transfer into, years later.**

### When the central exam became mandatory — `RULE-TR-EXAM-005`

GEÇİCİ MADDE 3 (added 07/08/2025):

> "(1) Bu Yönergenin 8 inci maddesinin birinci fıkrasının (b) bendinde yer alan düzenleme, **2026-2027 eğitim ve öğretim yılından itibaren uygulanır.** 2025-2026 eğitim ve öğretim yılında UDSP'ye kayıt olacak öğrencilerin belirlenmesine yönelik yabancı dil seviye tespit sınavı **okul müdürlüklerince** yapılacaktır."

Before 2026-2027, each school ran its own language placement test. The June 2026 sitting is therefore **the first cycle in which a single central score governs entry** — which is exactly why this exam is absent from older guidance and why students, parents and even school counselors may still be operating on the old school-by-school model.

---

## 2026 cycle — verified facts

All `VERIFIED_HISTORICAL` as of 2026-08-21 (the 2026 cycle has completed; results were published 20 July 2026).

| Item | Value | Source clause |
|---|---|---|
| Application window | 11–22 May 2026, at `basvuru.meb.gov.tr`, in person by the student | Kılavuz 5.1 |
| Entrance document | from 22 June 2026 | Kılavuz 9.1 |
| **Exam date** | **27 June 2026, 10:00 Türkiye time**, single session | Kılavuz 3.3 / 11.1 |
| Results | from 20 July 2026, electronic only (no postal result slip) | Kılavuz 13.1 |
| Languages | English **or** German, student's choice | Kılavuz 3.2 |
| Format | 50 questions, 5 options each, 110 minutes | Kılavuz 11.2 |
| Booklets | two types, A and B | Kılavuz 11.14 |
| Fee | **2,000 TL** incl. VAT, non-refundable if application/exam invalidated | Kılavuz 5.3 / 5.4 |
| Objection fee | 75 TL incl. VAT, within 5 calendar days, via ÖDSGM e-İtiraz | Kılavuz 15.1 / 15.2 |
| Centres | 81 provincial centres; student picks 5 provinces, ≥1 must be a metropolitan (büyükşehir); **no exam held in a province with fewer than 50 applicants** | Kılavuz 5.2 |
| Score validity | **2 years from the exam date** | Kılavuz 3.4 |
| Sitting the exam | **voluntary** (`isteğe bağlı`) — but required in practice to enter a UDSP | Kılavuz 3.5 |

### The exam-date change — resolved, not a conflict

Sources disagree on the 2026 date because it genuinely moved. The original date was **4 July 2026**; MEB announced on **14 May 2026** that it would instead be held **27 June 2026**:

> "4 Temmuz 2026 tarihinde gerçekleştirilmesi planlanan 2026 yılı Uluslararası Diploma ve Sertifika Programı (UDSP) kapsamında gerçekleştirilecek Yabancı Dil Yeterlilik Sınavı **27 Haziran 2026 Cumartesi** günü gerçekleştirilecektir."

The final published guide carries 27 June throughout, so **27 June 2026 is the operative date** and 4 July is superseded. Recorded as a resolved supersession rather than `CONFLICTING_EVIDENCE`.

A note on document versions: MEB published a file named `..._Kilavuz_2026_Guncel.pdf` ("updated"). I downloaded both it and the earlier ÖDSGM-linked copy and compared them — **SHA-256 identical** (`c56242de63d213112cb374e49018118e605dc6f97cde74fa690649b0b2f4a9ca`). There is only one guide version in circulation despite the "Güncel" filename.

---

## Scoring — `RULE-TR-EXAM-006`

Kılavuz 12.1, quoted exactly:

> "12.1. Değerlendirme 100 (yüz) tam puan üzerinden yapılacaktır. Sınavın değerlendirmesinde **yalnızca doğru cevaplar dikkate alınarak** 70 (yetmiş) ve üzeri puan alan öğrenciler başarılı sayılacaktır.
> Başarı puanı hesaplamasında **[Puan=(Doğru Sayısı/Soru Sayısı)x100]** formülü kullanılacaktır.
> Tam puan virgülden sonra ondalık dilim ne olursa olsun bir üst puana tamamlanmayacaktır."

Three consequences, each independently actionable:

1. **No negative marking.** Only correct answers count. Wrong answers cost nothing relative to blanks. This is the opposite of YKS, where wrong answers cancel correct ones (see `02-yks-and-obp.md`, `RULE-TR-EXAM-009`). **A student should never leave a UDSP question blank.** This single fact is worth real points and is routinely mis-transferred from YKS habits.
2. **Each question is worth exactly 2 points** (100/50). The 70 threshold is therefore **exactly 35 correct answers out of 50** — a concrete, checkable target rather than an abstract percentage.
3. **No rounding up**, whatever the decimal. With 50 questions every score is a whole multiple of 2, so this clause has no practical effect on a full-length paper; it bites only if questions are cancelled and the denominator changes (see 12.3).

Question-cancellation handling (12.2 / 12.3): an erroneous **answer key** is corrected and the question is *kept*; an erroneous **question** is removed from scoring and the remaining questions are re-weighted, per Law 6114 art. 7/2.

### What the exam actually tests — `NEEDS_REVIEW`

The guide specifies only count, options and duration. It does **not** publish a skills breakdown (reading / grammar / vocabulary / listening weighting), nor a CEFR alignment. MEB did publish the question booklets and answer keys after the exam, which would settle this empirically, but I did not obtain and analyse them within this pass.

**ORYN must not state or imply a CEFR level for UDSP, a skills split, or a difficulty rating.** None is officially published. Status: `NEEDS_REVIEW` — see README "Not yet researched".

---

## Eligibility — `RULE-TR-EXAM-007`

Kılavuz section 4. Four disjoint routes; a student qualifies via any one:

- **4.1** enrolled in grade 8 of a formal public/private middle school, **or** prep class / grade 9 / grade 10 of a secondary institution — including students whose 2025-2026 enrolment is under an intercultural exchange program (KÜDEP).
- **4.2** at a **private international school** (özel milletlerarası okul): final year of middle school, or the equivalent of grades 9–10. MOBİS registration is authoritative for these students.
- **4.3** at a **MEB-affiliated school abroad**, at the level equivalent to grade 8 / prep / 9 / 10.
- **4.4** abroad at a school **not** registered in the MIS: apply through Turkish embassies/consulates, with schooling documents checked under the MEB Denklik Yönetmeliği (RG 9/7/2024, No. 32597), confirming enrolment at a level equivalent to Turkish grade 8, 9 or 10.

**Age is never mentioned.** Eligibility is defined purely by grade level and enrolment status. ORYN must not infer an age band from grade — grade repetition, early enrolment and the denklik route all break that mapping.

Route 4.4 has hard deadlines that are easy to miss: consulate e-mail submission by **22 May 2026 23:59**, and **physical originals reaching ÖDSGM in Ankara by 22 June 2026 17:00**. Incomplete documents = barred from the exam; faxed applications rejected outright.

### Accessibility provisions

Documented in section 10 and genuinely substantive — ORYN should surface these rather than treat the exam as one-size-fits-all. Students with a diagnosed need receive individual exam rooms and, in most categories, **+20 minutes**. Notably:

- Low-vision and total-blindness candidates: single room, +20 min, reader/coder options, 18-point booklets. **No question exemption** — scored over all questions.
- Hearing impairment: single room, +20 min.
- Fine-motor/limb-loss affecting writing: single room, +20 min, coder per RAM assessment.
- **Gross-motor difficulties using orthoses/prostheses/mobility aids: ground-floor room, but explicitly NO extra time.**
- **Chronic illness: single room where medically required, but explicitly NO extra time.** Type-1 diabetes, asthma, hypertension and epilepsy candidates on continuous medication are placed in *normal* rooms; T1D candidates may keep and consume carbohydrate/juice, use a glucose meter, and get escorted toilet access for hyperglycaemia.

The process is school-driven with a hard cutoff: schools must file the `Sınav Tedbir Hizmetleri Bildirim Formu` (EK-2) with the local RAM by **5 June 2026, 17:00** — roughly three weeks before the exam and *after* the application window closes. A student who needs accommodations must act well before the exam.

---

## 2027 cycle — `CURRENT_CYCLE_NOT_PUBLISHED`

As of 2026-08-21 I found **no** published 2027 guide, date, fee or application window. Given the directive is permanent and the requirement became binding in 2026-2027, an annual sitting is a reasonable *expectation* — but it is an expectation, not a fact.

**ORYN must not project 2027 dates or fees from the 2026 cycle.** The 2026 date itself moved by a week after publication, and the fee is a nominal TRY amount in a high-inflation economy — carrying 2,000 TL forward into 2027 would very likely be wrong. Show the 2026 facts labelled with their cycle, and show "2027 details not yet published" rather than an inferred value.

---

## The rejected hypotheses, for the record

The task brief asked whether "UDSP" might be a garbled **ÜDS**, or **YDS / e-YDS / YÖKDİL**. Having verified UDSP directly, these are no longer live interpretations — but the distinction is worth stating because the two families are easy to conflate and serve completely different people:

| | UDSP | ÜDS / YDS / e-YDS / YÖKDİL |
|---|---|---|
| Run by | **MEB** | **ÖSYM** (YÖKDİL: ÖSYM for YÖK) |
| Taken by | Students in grades 8–10 | University graduates, academics, civil servants |
| Purpose | Enter IB/AP/IGCSE inside a Turkish school | Postgraduate admission, academic promotion, civil-service language allowance |
| Relevance to a 14–18 student | **Direct and decisive** | Essentially none |

Details and sourcing for the ÖSYM family are in `04-foreign-language-exams.md`, including verification of whether ÜDS was in fact abolished.

---

## Sources

All retrieved 2026-08-21.

1. **2026 UDSP Başvuru ve Uygulama Kılavuzu** (official guide, 16pp PDF, MEB) — `https://www.meb.gov.tr/meb_iys_dosyalar/2026_06/12144226_UDSP_Basvuru_ve_Uygulama_Kilavuzu_2026_Guncel.pdf` — SHA-256 `c56242de…b2f4a9ca`. Primary source for format, fee, scoring, eligibility, calendar, accessibility.
2. **MEB Uluslararası Diploma ve Sertifika Programları Uygulama Yönergesi** (consolidated directive incl. 10/02/2025 №125470808 and 07/08/2025 №137181115 amendments, 20pp PDF) — `https://mevzuat.meb.gov.tr/dosyalar/2257.pdf`. Primary source for the 70 gate, quota ranking, transfer rule, transitional article, program annexes.
3. **ÖDSGM announcement** — `https://odsgm.meb.gov.tr/www/2026-udsp-yabanci-dil-yeterlilik-sinavi-basvuru-ve-uygulama-kilavuzu-yayimlandi/icerik/1623`
4. **ÖÖKGM announcement (8 May 2026)** — `https://ookgm.meb.gov.tr/www/uluslararasi-diploma-ve-sertifika-programlari-yabanci-dil-yeterlilik-sinavi-duyurusu/icerik/2302/tr`
5. **MEB news, exam date** — `https://www.meb.gov.tr/2026-udsp-yabanci-dil-yeterlilik-sinavi-27-haziranda-yapilacak/haber/40755/tr`
6. **Date-change announcement (14 May 2026)** — `https://dakar.meb.gov.tr/www/2026-yili-uluslararasi-diploma-ve-sertifika-programlari-udsp-yabanci-dil-yeterlilik-sinavi-tarihi-degisti/icerik/73/tr`

Discovery leads that were **not** used as evidence: prep-company pages (pergaegitim.com, iienstitu.com), an agency blog (endlessabroad.com.tr), CNN Türk, and a politician's X post. Each was checked against MEB primary sources; the Abitur claim appearing in some of them could not be confirmed and is recorded as `UNVERIFIED`.
