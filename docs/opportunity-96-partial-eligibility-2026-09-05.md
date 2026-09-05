# 96 fırsat: üç boyuttan biri ya da ikisi dolu — sahipsiz dilim, 5 Eylül

`docs/opportunity-zero-eligibility-190-2026-09-05.md`'nin aynı temel filtresi (`status='active'`,
`cycle_status not in ('closed','historical','discontinued')`, `deadline is null or deadline >=
current_date`), aynı 289 satır — ama üçü de boş (190) ve üçü de dolu (3) hariç, **arada kalan
tam 96 satır.** Doğrulama: 190 + 3 + 96 = 289, canlıda ayrıca çalıştırıldı.

## Dağılım (istenen ilk ölçüm)

| eksik boyut(lar) | satır | not |
|---|---|---|
| grade + country | 34 | yaş zaten dolu |
| age + country | 26 | sınıf zaten dolu |
| age only | 15 | grade + country zaten dolu |
| country only | 9 | age + grade zaten dolu |
| grade only | 8 | age + country zaten dolu |
| age + grade | 4 | country zaten dolu |

**96'sının 96'sında da `source_url` dolu** — hepsi en az bir kez araştırılmış, kaynak zaten
biliniyor. Yani iş "sıfırdan bul" değil, "**zaten bilinen kaynağa geri dön, eksik boyutu ara**" —
CEO'nun sorduğu tam bu soru, evet, kaynak genelde ortak.

Ayrıca 13 satır eksik `country` için array boş olsa da `country_eligibility_confirmed_open =
true` — yani country boyutu **zaten çözülmüş** görünüyor (0060 üzerinden), bu satırların gerçek
eksiği listedeki "COUNTRY" etiketine rağmen daha az iş gerektirebilir; araştırma sırasında
doğrulanacak, varsayılmayacak.

## id listesi — çakışma kontrolü için

`id` sırasına göre. **Diğer iki şeridin 190'ıyla kesişim yok** (bu 96, 190'ın ve 3'ün tam
tümleyeni) ama CEO'nun istediği gibi doğrulama için tam liste burada:

İlk: `0412d94f-8b28-4f37-933c-cf6198914c12` (Breakthrough Junior Challenge)
Son: `f3487103-c08f-4d56-8ec1-01f93a7eac94` (Iowa Young Writers' Studio)

| # | id | başlık | eksik |
|---|---|---|---|
| 1 | `0412d94f-8b28-4f37-933c-cf6198914c12` | Breakthrough Junior Challenge | GRADE COUNTRY |
| 2 | `0c8e00c1-b2b7-4039-8021-10a310de62e4` | ODTÜ (METU) Engineering Summer School (Mühendislik Yaz Okulu) | COUNTRY |
| 3 | `0f7a1ef0-004a-4ce8-88a1-7161dbb6bc48` | University of Applied Sciences and Arts of Western Switzerland | GRADE COUNTRY |
| 4 | `10b69474-db59-4b4d-8a48-11526e7220a7` | Congressional App Challenge | AGE |
| 5 | `142a6597-6083-45ba-b9ea-6b92e4a2ab55` | Student Science Training Program | AGE COUNTRY |
| 6 | `16b3d6ae-dfcf-4ac7-b1c8-4a038e552bec` | Dive Into Engineering! | AGE COUNTRY |
| 7 | `17aeb772-5ee4-4448-a4af-36cb508ab305` | Stockholm Junior Water Prize | GRADE COUNTRY |
| 8 | `1acee3b0-eaac-479a-996a-b0a2a0570351` | European Youth Event (EYE) | GRADE COUNTRY |
| 9 | `1d28dd20-3433-407a-a83e-7b71e59c207e` | BRI Student Fellowship | COUNTRY |
| 10 | `1e8e74cf-3bf0-43ad-81a8-c3a4b0e5bc70` | Ashoka Young Changemakers | GRADE |
| 11 | `1f7b2e52-1900-4953-8271-63224c9e1fc0` | Conrad Challenge (Space Center Houston) | GRADE COUNTRY |
| 12 | `2e2f995a-2ac3-4138-a3df-ca4e4033aa36` | Wharton Global High School Investment Competition | AGE COUNTRY |
| 13 | `30a605ab-8c51-4f06-9e66-60cc7347c5df` | The Diamond Challenge | GRADE COUNTRY |
| 14 | `310c976c-1a0f-4566-8df2-2e186c898804` | Tufts Pre-College Programs | COUNTRY |
| 15 | `31856863-be50-440d-8ccc-229812277425` | UNO - United Nations Online | AGE COUNTRY |
| 16 | `31f4ecf4-902c-4636-bcc8-77e300d42ae5` | Girl Up Project Awards | GRADE COUNTRY |
| 17 | `3318dba7-e099-4de2-83db-f27d6697f1be` | NYC Commuter Summer — Columbia University Pre-College Programs | AGE COUNTRY |
| 18 | `35ddfc5e-1bed-4f28-9655-a1aa3422e554` | Technovation Girls | GRADE COUNTRY |
| 19 | `40c69cc2-0567-4ac7-bcb0-553dc63770f7` | European Union Contest for Young Scientists (EUCYS) | GRADE COUNTRY |
| 20 | `41db8ceb-16ea-4215-adc0-7fb7b152649d` | IE University Pre-University Summer Program | GRADE COUNTRY |
| 21 | `437963fb-9002-4481-bd67-f40e9fc953f1` | Interlochen Arts Camp | AGE COUNTRY |
| 22 | `43c0c707-3447-4863-8d0d-64c7354c113f` | Aggie STEM Overnight Camp | AGE COUNTRY |
| 23 | `445f2003-1b9c-4cc9-bc63-22e65e7d8f85` | University of Notre Dame Pre-College: Summer Scholars | GRADE COUNTRY |
| 24 | `483c0af4-92e1-4599-a4e9-8ac6eec69a57` | Winchester College - Discover Summer Program | GRADE COUNTRY |
| 25 | `4a1ef2dd-ab26-44e0-b6a5-2e49aca13dc0` | Genesys Works | AGE |
| 26 | `4a54159a-58dd-4304-a139-2b76f2a9fe38` | USC Pre-College Summer Programs | AGE COUNTRY |
| 27 | `4a6c3f9a-bb11-4eb2-b304-f832aeb3799a` | Science Olympiad (Division C) | AGE COUNTRY |
| 28 | `4b9e2c29-c38d-479b-9987-c31501601950` | CyberPatriot - National Youth Cyber Defense Competition | AGE COUNTRY |
| 29 | `4d2e55b3-8e5d-431b-8d5c-d8b3bbad2dbc` | İstanbul Kent Konseyi Gençlik Meclisi — Gençlik Katılım Ağı | GRADE COUNTRY |
| 30 | `4e17909d-ee0f-47c4-a901-44dda548fb9c` | Three Dot Dash Global Teen Leaders | GRADE COUNTRY |
| 31 | `51701db6-f571-4ee9-9387-045eed7bb7d4` | Georgia Tech Summer PEAKS (High School Programs) | AGE COUNTRY |
| 32 | `51c4b57b-7ea1-4503-b9e6-f1468dc9f3f8` | Waterloo Mathematics and Computing Contests | AGE COUNTRY |
| 33 | `5589e4c8-181a-4a2e-bf16-edd13b274846` | Davidson Fellows Scholarship | GRADE |
| 34 | `55a5efea-e280-4176-bf65-49a028b097af` | JA Company Programme (Europe) | GRADE COUNTRY |
| 35 | `574ab33a-abc7-420e-893a-0b3b6f9d341e` | Wall Street 101 - Virtual Wall Street Classes | AGE COUNTRY |
| 36 | `59998106-2a2c-4e35-ba9b-0bdcd5ca586d` | We the People: The Citizen and the Constitution | AGE |
| 37 | `5a583dbf-eca9-4219-b306-463f9704cf04` | RISD Pre-College (On-Campus) | AGE COUNTRY |
| 38 | `5d67ce2b-b627-4d28-a03c-4366acb0e66b` | Millfield School Sixth Form Scholarships and Bursaries | GRADE COUNTRY |
| 39 | `6005b354-84d0-486f-b9bf-9bc7dcc2ea6c` | Partners for the Future | AGE |
| 40 | `600c8ff6-6712-4126-8939-23116b242a03` | Genç UPSHIFT Sosyal Girişimcilik Programı | GRADE |
| 41 | `60184ec3-449b-40ec-bd94-365c115ce612` | NSLC Business & Entrepreneurship | COUNTRY |
| 42 | `61558e02-0b11-4221-bbbb-fc98bc765da8` | International Journal of High School Research (IJHSR) | AGE COUNTRY |
| 43 | `690eba7f-0de9-4298-b746-c3456391b9b5` | Coca-Cola Scholars Program | AGE GRADE |
| 44 | `692aaffc-b50c-4b9d-a91d-8769a7a46e5c` | Parsons Summer Intensive Studies | COUNTRY |
| 45 | `6f8a2189-fae9-4e4c-bc99-3a1babd91477` | Alpha Leo Club (Lions Clubs International) | GRADE COUNTRY |
| 46 | `7081b03a-3e04-4843-8bc5-0078cfd040f2` | TechGirls | GRADE |
| 47 | `7a422fba-db1a-42a1-b96f-d3bcdf6afa56` | The Gates Scholarship | AGE |
| 48 | `838a79c1-151c-4aef-9622-42db328debb4` | International Philosophy Olympiad (IPO) | GRADE COUNTRY |
| 49 | `8a7c89e4-e63a-4f64-a76d-4bae1b31e889` | InvestIN - Immersive Career Experiences | GRADE COUNTRY |
| 50 | `8ff9158a-476a-4f7a-ac5a-de4553dd4d28` | Case Western Reserve University Online Pre-College Program | GRADE COUNTRY |
| 51 | `95b3b7dc-5306-40b5-b2e7-8c769fc68128` | Schoolhouse.world Tutor Certification | GRADE COUNTRY |
| 52 | `96a185f3-09e9-41db-b568-613d512d0e08` | International Physics Olympiad (IPhO) | GRADE COUNTRY |
| 53 | `96a437a7-781b-4046-b7ad-baf0069be8e5` | UK Chemistry Olympiad | GRADE |
| 54 | `995daf25-80ab-4e9a-bcd7-2cd2b2d9d18a` | CU Boulder Precollegiate Development Program (PCDP) | AGE |
| 55 | `9b6aefb3-a33e-45a1-af06-5a770a92c45a` | Caltech Summer Research Connection (SRC) | AGE |
| 56 | `a0571b4a-8d05-4fe1-bb6b-790b1fed786f` | Canada/USA Mathcamp | GRADE COUNTRY |
| 57 | `a073efce-71aa-43a7-b218-3251973e5d0c` | UWC Short Courses | GRADE COUNTRY |
| 58 | `a22bb8af-8c3d-49a3-948b-714a68aed263` | Freie Universität Berlin SommerUNI | COUNTRY |
| 59 | `a2c63505-1481-4a1f-94cc-6ab86dc35405` | QuestBridge National College Match | AGE GRADE |
| 60 | `a37fa810-d142-4c07-b272-b3d58a6e6ea5` | Garcia Summer Research Program | GRADE COUNTRY |
| 61 | `a4c5a08a-f623-4c77-a55f-5782f395c6ec` | Nuffield Research Placements | AGE GRADE |
| 62 | `abe62a46-56f4-449a-b008-d072b1be5dc4` | Ron Brown Scholar Program | AGE |
| 63 | `adce9d5e-c138-49ed-b7ff-370c3828f80e` | Emerging Engineers @ UVA | AGE COUNTRY |
| 64 | `ae174625-5ad8-41b7-9c9a-7f00710c168a` | Summer Science Program (SSP) | COUNTRY |
| 65 | `ae702f36-4442-4979-a65f-4af78f6c1b2e` | İBB Genç Gönüllü Programı | GRADE COUNTRY |
| 66 | `b0432a47-ba80-4de6-a121-11ab10495bcb` | NYLF Medicine & Health Care | AGE COUNTRY |
| 67 | `b0ba4e37-5665-4ed2-b20c-997d3b09cb6e` | Cooke College Scholarship Program | AGE |
| 68 | `b23c2cf0-3c44-40f8-8b0b-67315a066c9f` | Vanderbilt Programs for Talented Youth (PTY) - Summer Institutes & Summer Academy | AGE COUNTRY |
| 69 | `b80369c3-76bd-47c4-9f9a-25f6503a3ff4` | MITES Summer | AGE |
| 70 | `b87aba0b-755d-4802-a294-369db2acccd0` | MIT PRIMES | AGE |
| 71 | `bc303473-ba94-41e4-9b3d-038804858a8c` | International Public Policy Forum (IPPF) | AGE COUNTRY |
| 72 | `bc729c68-0511-40bb-a590-e2fbaa277a56` | Coolidge Scholarship | AGE |
| 73 | `bd187688-b179-42f8-b82b-8c89c40c51d7` | UK Youth Parliament | GRADE |
| 74 | `bdc4bdb5-5893-4e05-bf9c-e520d7da2817` | Pioneer Research Institute | AGE COUNTRY |
| 75 | `c033f1e9-4642-4a5a-94da-739efadff477` | Wharton Global Youth Program: Leadership in the Business World (LBW) | AGE COUNTRY |
| 76 | `c12ce265-c6c4-454b-97f5-680d366813ec` | STEM Racing | GRADE COUNTRY |
| 77 | `c2c3e0e3-9c9a-4d8f-ae67-54b37e4cdd85` | National History Day (NHD) | AGE |
| 78 | `c3a98c43-dcfb-42cc-a23f-02a8a8154358` | Yale Young Global Scholars | AGE COUNTRY |
| 79 | `c582f1d9-ec28-4335-acd0-4140893dd23f` | The Harvard Crimson Global Essay Competition | GRADE COUNTRY |
| 80 | `c64b7050-75f9-45f8-b2ab-5b6ff14953dc` | Science and Engineering Apprenticeship Program (SEAP) | AGE GRADE |
| 81 | `c8cd2706-7afd-45d9-83cd-f88cc514527d` | Major League Hacking | GRADE COUNTRY |
| 82 | `cdb9da8a-3c8d-47ea-bcee-6cf749738246` | The Duke of Edinburgh's International Award — Türkiye | GRADE |
| 83 | `ce587c91-a21f-4359-a535-70a9736494f0` | National High School Ethics Bowl (NHSEB) | AGE |
| 84 | `d38255f3-6ce2-440c-b302-c39ee6b17cde` | Washington University in St. Louis College Prep Program (CPP) | AGE |
| 85 | `d500ecf7-69dd-4ecf-98d2-8828f789b5bb` | Young Enterprise Company Programme | GRADE |
| 86 | `d50285d3-87ea-4f9e-a557-92b2af314c9a` | Tisch Summer High School | COUNTRY |
| 87 | `d5790a1c-1238-4510-bdb4-25ce563595f3` | Gençlik Merkezleri (Youth Centres) membership — e-Genç | GRADE COUNTRY |
| 88 | `d780bc55-41e0-444b-8bcc-3f927b28c4b7` | Istanbul Bilgi University High School Summer School (Lise Yaz Okulu) | AGE COUNTRY |
| 89 | `d9b30fb9-aa85-48ca-ae1b-6c04c5ece736` | Barcelona International Youth Science Challenge (BIYSC) | AGE COUNTRY |
| 90 | `db25d327-ee37-4414-9003-f5654f64d3aa` | FIRST Robotics Competition | COUNTRY |
| 91 | `e6bdef3f-0a99-4eb0-872f-20ffe40416c6` | The Blackstone Law Review Competition — Junior Division | GRADE COUNTRY |
| 92 | `eb956520-51c2-43d1-a57b-ec29dd664315` | JAX Summer Student Program | AGE COUNTRY |
| 93 | `eeb768c4-606a-4d28-91cf-a4a6a7693949` | Erasmus+ Youth Exchanges | GRADE COUNTRY |
| 94 | `f2031650-c1f6-4734-9054-05d3d63fbb69` | Rotary Interact Club | GRADE COUNTRY |
| 95 | `f2d65f7a-0927-4ff7-bcf2-d5f12d6385d4` | FIRST Global Challenge | GRADE COUNTRY |
| 96 | `f3487103-c08f-4d56-8ec1-01f93a7eac94` | Iowa Young Writers' Studio (Summer Residential Program) | AGE COUNTRY |

## Bilinen engel — 190 doc'undan taşınan not

Satır 16 (`31f4ecf4-902c-4636-bcc8-77e300d42ae5`, **Girl Up Project Awards**) muhtemelen 190
doc'undaki "Girl Up Club" ile aynı engellenmiş alan adından (girlup.org) — aynı kural
uygulanacak: **erişilemezse "kaynak susuyor" değil "erişemedim" yazılacak.**

## Sıradaki adım

Her satır için mevcut `source_url`'e dönülüp eksik boyut(lar) aranacak; bulunamayan boş
bırakılacak, "yazmıyor" ≠ "yok" ve "erişemedim" ≠ "kaynak susuyor" ayrımı korunacak. SQL paketi
ayrı bir dosyada hazırlanacak, canlıya yazılmayacak.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
