# Reşit Olmayan Kullanıcılara Abonelik Satışı ve Ürün İçi Tanıtım — Hukuki Çerçeve Araştırması

**Tarih:** 2026-09-02
**Kapsam:** Türkiye, Avrupa Birliği, Birleşik Krallık, Amerika Birleşik Devletleri
**Durum:** Araştırma taslağı — avukat görüşmesi hazırlığı

---

## ÖNEMLİ UYARI

**Bu belge hukuki tavsiye değildir ve bunu yazan (bir Claude oturumu) avukat değildir.** Bu belgenin tek amacı, ORYN'in bir avukatla yapacağı görüşmeyi hazırlamaktır — avukatın yerine geçmek değil. Buradaki hiçbir sonuç, bir avukatın yazılı görüşü alınmadan uygulamaya konulmamalıdır. Belgede "belirsiz — avukata sorulacak" ibaresiyle işaretlenen her madde, bilerek çözümsüz bırakılmıştır; bunları doldurmak bu araştırmanın değil, avukatlık görüşmesinin işidir.

### Metodoloji ve kaynak disiplini
- Her iddia, mümkün olduğunca **birincil kaynağa** dayandırılmıştır: mevzuat metninin bizzat okunduğu resmî sayfa (mevzuat.gov.tr, eur-lex.europa.eu, legislation.gov.uk, ecfr.gov, leginfo.legislature.ca.gov, kvkk.gov.tr, ftc.gov, ico.org.uk, developer.apple.com, support.google.com). Hukuk bürosu blog yazıları yalnızca **ikincil kaynak** olarak ve açıkça bu şekilde işaretlenerek kullanılmıştır.
- WebSearch/WebFetch araçlarının ürettiği özetler bu belgeye **doğrudan aktarılmamıştır**; her madde numarası, resmî kaynağın ham metni indirilip okunduktan sonra yazılmıştır. Bunun tek istisnası, aktif olarak dava/mevzuat süreci devam eden birkaç ABD güncel-durum sorusu (aşağıda ayrıca işaretlenmiştir) — bunlarda ikincil hukuk bürosu yorumlarına dayanılmış ve bu açıkça belirtilmiştir.
- Dört yargı alanı **ayrı ayrı** ele alınmıştır. Bir yargı alanında bulunan bir kural, açıkça söylenmediği sürece bir diğerine genellenmemiştir.
- Emin olunamayan her nokta "belirsiz — avukata sorulacak" olarak işaretlenmiş ve belgenin sonundaki soru listesine eklenmiştir.

### Ürünün gerçek durumu üzerine önemli bir düzeltme

Bu araştırma başlarken varsayım "ORYN 14 yaşından itibaren veri topluyor" idi. Eş zamanlı çalışan koordinatör oturum (oryn-a7), kod tabanını inceleyerek şunu doğruladı ve bu araştırmanın çerçevesini değiştirdi:

- Kayıt sırasında **yaş doğrulayan hiçbir alt sınır yok** — 11 yaşında biri sisteme kaydolabilir.
- Doğum **yılı** (tam tarih değil — bilinçli bir minimizasyon kararı, bkz. PRODUCT_SPEC.md: "do not unnecessarily expose full birth date if birth year is sufficient") onboarding'de isteniyor ama zorunlu değil.
- Canlı 11 profilden **7'sinde `birth_year` NULL**; doldurulmuş olanlar yalnızca 2009–2010 doğumlu (2026 itibarıyla 16–17 yaş).

Bunun sonucu: aşağıdaki sorulardan her biri, "eşik kaç?" sorusundan önce, **"yaşı bilmiyorsak yükümlülüğümüz ne?"** sorusuna cevap vermek zorunda. Bu iki soru farklı hukuki mekanizmalara bağlanıyor ve rejimler arasında ciddi şekilde farklılaşıyor — bu yüzden her yargı alanı bölümünde ayrı bir alt başlık olarak ele alınmıştır. Ayrıca doğum *yılı* ile doğum *tarihi* arasındaki fark, bazı rejimlerde önem taşıyabilir; bu da ayrıca işaretlenmiştir.

---

## YÖNETİCİ ÖZETİ

Okumaya vakti olmayan biri için beş bulgu:

1. **ABD federal riski, AB/UK riskinden yapısal olarak daha düşük.** COPPA'nın tetiklendiği eşik kesin olarak **13 yaş altı**dır. ORYN'in beyan ettiği taban 14 olduğu sürece, ABD'de federal "çocuk" rejimi (COPPA) prensip olarak devreye girmez. Buna karşılık GDPR'ın (AB) ve UK GDPR'ın çocuk rızası eşiği üye devlete göre **13–16 yaş** arasında değişir — yani AYNI 14 yaşındaki kullanıcı, ABD'de COPPA'yı tetiklemezken, bir AB üye devletinde (eşiği 15 veya 16 seçmiş olabilir) hâlâ "çocuk" sayılabilir. Bu, dört yargı alanı arasındaki en önemli asimetridir.
2. **Türkiye'de KVKK'nın kendi metninde çocuklara özgü hiçbir yaş eşiği yok** — bunu hem kanun metnini bizzat tarayarak hem de iki gerçek Kurul kararını okuyarak doğruladım. Bu, GDPR'ın net 16/13 ayrımının aksine, gerçek bir boşluk.
3. **"Kendi ürününü tanıtma" (upsell) sorusu iki yargı alanında zıt yönde çözülüyor.** AB'nin DSA'sı, "reklam" tanımını "bir bedel karşılığında" (against remuneration) yapılan tanıtımla sınırlıyor — bu da ORYN'in kendi premium planını kendi arayüzünde göstermesinin muhtemelen DSA'nın reklam tanımına hiç girmediği anlamına geliyor. Türkiye'nin 1 Ağustos 2026'da yürürlüğe giren yepyeni "hedefli reklamcılık" maddesi ise (Ticari Reklam Yönetmeliği m. 25/A) bedel şartı ARAMIYOR — sadece kişisel veriye dayalı profilleme ile kişiye özel içerik sunmayı yeterli sayıyor. Aynı özellik, iki komşu hukuk sisteminde farklı sonuç doğurabilir.
4. **"Veli öder, öğrenci kullanır" modeli ödeme/sözleşme ehliyeti sorununu çözer ama veri rızası sorununu kendiliğinden çözmez.** Apple'ın Ask to Buy'ı veya Google'ın Family Link'i bir ödemeyi velinin onaylamasını sağlar; ama bu, GDPR m. 8 veya KVKK'nın aradığı "veri işlemeye veli rızası" kaydını otomatik olarak üretmez. Bunlar iki ayrı rıza türüdür ve oryn-a7'nin sorduğu gibi bu, "izin var mı" sorusundan çok "veri modelinde ayrı bir veli hesabı türü şart mı" sorusudur — cevap aşağıda her yargı alanı için ayrı verilmiştir.
5. **Reşit olmayanla kurulan bir aboneliğin geri dönüşü (iade), üç yargı alanında da tek taraflı işliyor:** çocuk/veli sözleşmeyi bozabilir ama şirket bozamaz (Almanya BGB, İngiltere ortak hukuku, Kaliforniya Family Code hepsi bu örüntüyü izliyor). Türkiye'de bu tam mekanizma net değil (aşağıda işaretli). Bu, doğrudan reşit olmayana satışın ticari riskini — hukuka aykırılıktan bağımsız olarak — yükseltiyor.

---

## 0. YAŞ BİLİNMİYORSA YÜKÜMLÜLÜK NE? (Yargı alanları arası karşılaştırma)

| Rejim | Tetikleyici standart | Doğrulama yükümlülüğü var mı? | Birincil kaynak |
|---|---|---|---|
| GDPR (AB) m. 8(2) | Rıza (m. 6(1)(a)) bir "bilgi toplumu hizmeti"ni doğrudan çocuğa sunmak için kullanılıyorsa | **Evet, olumlu yükümlülük:** "mevcut teknoloji göz önüne alınarak makul çaba" ile veli rızasının doğrulanması gerekir | Regulation (EU) 2016/679, Art. 8(2) — eur-lex.europa.eu, doğrudan okundu |
| UK GDPR m. 8(2) | Aynı yapı, eşik 13'e sabitlenmiş | **Evet**, aynı "makul çaba" ifadesi korunmuş | legislation.gov.uk/eur/2016/679/article/8 — doğrudan okundu |
| COPPA (ABD) | "Doğrudan çocuğa yönelik" OLUŞTURMA testi + "fiili bilgi" (actual knowledge) | **Hayır, genel bir "gidip öğren" yükümlülüğü yok** — ama zaten sahip olduğunuz veri (ör. doldurulmuş bir `birth_year` alanı) "fiili bilgi" sayılabilir | 16 CFR § 312.2, § 312.3 — ecfr.gov, doğrudan okundu |
| DSA (AB) m. 28(3) | Reklam-profilleme yasağı yalnızca "makul kesinlikle farkında olma" ile tetiklenir | **Hayır, açıkça tersi:** m. 28(3) sağlayıcıyı yaş tespiti için EK veri toplamaya **zorlamıyor** | Regulation (EU) 2022/2065, Art. 28(3) — eur-lex.europa.eu, doğrudan okundu |
| KVKK (Türkiye) | Yok — kanunda hiç düzenlenmemiş | **Belirsiz** — ne kanun ne de Kurul kararları bir eşik veya doğrulama standardı koyuyor | 6698 sayılı Kanun, tam metin taraması; 2020/255 ve 2022/776 sayılı Kurul kararları |
| Ticari Reklam Yön. (Türkiye) m. 25/A(3) | "Bilindiği veya makul olarak bilinmesinin beklendiği" | Metinde açık bir doğrulama yükümlülüğü **yok**, DSA'ya yakın bir "farkındalık" testi | mevzuat.gov.tr, Yönetmelik metni — doğrudan okundu |

**Doğum yılı vs. doğum tarihi:** Hiçbir kaynakta, incelediğim süre içinde, "tam doğum tarihi şart, yıl yetmez" diyen açık bir hüküm bulamadım. Ama bunu "yeterlidir" diye de teyit edemedim — bu, doğrulanabilir bir olumsuzluk değil, sadece bulamamış olmak. **Belirsiz — avukata sorulacak** (bkz. soru listesi #9).

---

## 1. TÜRKİYE

### 1.1 Reşit olmayan geçerli bir abonelik sözleşmesi kurabilir mi? Yaş eşiği ne? Veli onayı hangi biçimde?

**Kaynak:** Türk Medeni Kanunu (Kanun No. 4721) — mevzuat.gov.tr'den resmî PDF, madde madde bizzat okundu.

- **TMK m. 11:** "Erginlik onsekiz yaşın doldurulmasıyla başlar. Evlenme kişiyi ergin kılar."
- **TMK m. 12:** 15 yaşını dolduran küçük, kendi isteği ve velisinin rızasıyla mahkemece ergin kılınabilir (ergin kılınma / emancipation).
- **TMK m. 13:** Ayırt etme gücü — yaşının küçüklüğü yüzünden akla uygun davranma yeteneğinden yoksun olmayan herkes bu güce sahiptir. 14-18 yaş bandındaki bir öğrencinin hemen hemen tamamı bu tanıma girer (aksi, somut bir zihinsel yetersizlik gerektirir).
- **TMK m. 16 (kilit madde):** *"Ayırt etme gücüne sahip küçükler ve kısıtlılar, yasal temsilcilerinin rızası olmadıkça, kendi işlemleriyle borç altına giremezler. Karşılıksız kazanmada ve kişiye sıkı sıkıya bağlı hakları kullanmada bu rıza gerekli değildir."*

**Sonuç:** Bir abonelik ödeme yükümlülüğü doğurduğu için "karşılıksız kazanma" değildir — m. 16'nın istisnasına girmez. Yani **14-17 yaş aralığındaki, ayırt etme gücüne sahip bir öğrencinin, yasal temsilcisinin (anne/baba/vasi) rızası olmadan kurduğu bir abonelik sözleşmesi, TMK m. 16 uyarınca eksik bir işlemdir.**

**Biçim sorusu — belirsiz:** TMK m. 16, velinin rızasının hangi biçimde (yazılı/sözlü/zımni) verilmesi gerektiğini **söylemiyor**. GDPR m. 8(2)'nin "makul çaba ile doğrulama" standardına veya COPPA'nın somut "verifiable parental consent" yöntem listesine (bkz. §3.4) karşılık gelen bir düzenleme TMK'da yok. Bu, dijital bir ödeme akışında velinin rızasını nasıl kanıtlanabilir hale getireceğinizi belirsiz bırakıyor. **Belirsiz — avukata sorulacak** (soru listesi #1).

**Rızasız kurulan sözleşmenin hukuki niteliği:** TMK m. 16 sonucu ne olur — sözleşme yok mu (butlan), yoksa velinin onayına kadar "askıda" mı (Alman hukukundaki "schwebend unwirksam" benzeri)? Bu, TMK'nın kendi metninde açıkça yazmıyor; Türk doktrini ve Yargıtay içtihadı genel temsil/yetkisiz temsil ilkelerinden (Türk Borçlar Kanunu) kıyasen bu sonuca varıyor, ama bunu tek bir madde numarasına bağlayacak kadar derinlemesine bu oturumda doğrulayamadım. **Belirsiz — avukata sorulacak** (soru listesi #3).

### 1.2 Veli onayı olmadan alınan ödeme geri istenebilir mi? Süre sınırı var mı?

TMK'da, İngiltere'nin Minors' Contracts Act 1987 m. 3'üne (bkz. §3.2) karşılık gelen, "reşit olmayanın parasının iadesini" özel olarak düzenleyen bir hüküm bulamadım. Muhtemel yol: sözleşme askıda geçersiz kalır → onaylanmazsa → Türk Borçlar Kanunu'nun sebepsiz zenginleşme hükümleri (TBK genel hükümler) üzerinden iade istenir. Bunu tek bir TBK madde numarasına kadar bu oturumda doğrulayamadım; süre sınırı (zamanaşımı) için de aynı durum geçerli. **Belirsiz — avukata sorulacak** (soru listesi #3).

### 1.3 Cayma hakkı nasıl işliyor? Dijital hizmette farklı mı?

**Kaynak:** 6502 sayılı Tüketicinin Korunması Hakkında Kanun, m. 48 — mevzuat.gov.tr resmî PDF'den bizzat okundu.

- **TKHK m. 48(4):** *"Tüketici, on dört gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir... Tüketici, cayma hakkı konusunda gerektiği şekilde bilgilendirilmezse, cayma hakkını kullanmak için on dört günlük süreyle bağlı değildir. Her hâlükârda bu süre cayma süresinin bittiği tarihten itibaren bir yıl sonra sona erer."*

Bu, AB Tüketici Hakları Direktifi'nin (bkz. §2.3) 14 günlük yapısıyla neredeyse birebir örtüşüyor — Türkiye'nin tüketici hukuku büyük ölçüde AB müktesebatına paralel geliştirilmiş; bu **gözlemlenmiş bir benzerlik**, iki ayrı hukuk sisteminin birbirine dönüştüğü anlamına gelmiyor.

**İstisnalar — Mesafeli Sözleşmeler Yönetmeliği m. 15** (mevzuat.gov.tr, Resmî Gazete metninden bizzat okundu):
- **m. 15(1)(ğ):** *"Elektronik ortamda anında ifa edilen hizmetler veya tüketiciye anında teslim edilen gayrimaddi mallara ilişkin sözleşmeler."*
- **m. 15(1)(h):** *"Cayma hakkı süresi sona ermeden önce, tüketicinin onayı ile ifasına başlanan hizmetlere ilişkin sözleşmeler."*

**Önemli ve dikkat çekici bir fark:** AB'nin (CRD m. 16(m)) ve İngiltere'nin (CCR 2013 reg. 37) karşılık gelen istisna hükümleri, açıkça **"tüketicinin önceden açık rızası VE cayma hakkını kaybedeceğini bildiğini kabul etmesi"** şartını arıyor (iki ayrı unsur: rıza + bilgilendirilmiş kabul). Türkiye'nin m. 15(1)(h) metni sadece "tüketicinin onayı" diyor — kaybedilecek hakkın bilgilendirilmiş biçimde kabul edildiğine dair ayrı bir ibare **yok**. Bu, bir tarafın istisnayı geçerli kılmak için ödeme ekranına yazması gereken metni jürisdiksiyona göre değiştirebilir. **Belirsiz — avukata sorulacak**: Bir aboneliği (tek seferlik dijital teslim değil, süreklilik arz eden hizmet) m. 15(1)(h) kapsamına sokmak için checkout ekranında hangi tam ifade yeterli sayılır?

### 1.4 Veri işleme onayı için yaş eşiği ne?

**Doğrudan doğrulanmış, önemli bir negatif bulgu:** 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun **tüm metnini** ("çocuk", "küçük", "reşit" terimleri için) taradım — kanunda çocuklara/küçüklere özgü **hiçbir yaş eşiği veya özel rıza rejimi yok.**

Bunu iki gerçek Kurul kararıyla da çapraz kontrol ettim:
- **KVKK Kurulu, 03/08/2022 tarih ve 2022/776 sayılı Karar** (kvkk.gov.tr, doğrudan okundu): Bir pazarlama şirketinin, velinin açık rızası alınmadan çocuğun adres/isim bilgisiyle broşür göndermesi olayında, Kurul velinin rızasının gerekliliğini tartışmasız kabul ediyor ama **hangi yaşa kadar** bu gerekliliğin işlediğine dair bir eşik koymuyor.
- **KVKK Kurulu, 02/04/2020 tarih ve 2020/255 sayılı Karar** (kvkk.gov.tr, doğrudan okundu): Bir okulun öğrencilere veli rızası almadan psikolojik test uygulaması olayında da aynı şekilde — veli rızası gerekliliği tartışmasız, ama yaş eşiği tartışılmıyor.

**Sonuç:** GDPR m. 8'in net 16/13 ayrımının Türk hukukunda bir karşılığı **yok**. En yakın çerçeve TMK m. 16'nın "ayırt etme gücü" testi olabilir (kişisel veri rızasının "kişiye sıkı sıkıya bağlı bir hak" sayılıp sayılmayacağı — ki bu, Türk doktrininde tartışmalı bir konu) ama bu, KVKK'nın kendisinde yazan bir kural değil, kıyas yoluyla varılan bir sonuç. **Belirsiz — avukata sorulacak** (soru listesi #1'in bir parçası): ORYN, KVKK rıza akışını hangi yaşa göre tasarlamalı — TMK'nın genel ehliyet çerçevesine mi, yoksa daha ihtiyatlı biçimde GDPR'ın etkisiyle 16'ya mı dayandırmalı?

### 1.5 Reşit olmayanlara ürün içi tanıtım kısıtlı mı?

Burada **iki ayrı ve birbirinden bağımsız** düzenleme var — ikisi de mevzuat.gov.tr'den resmî metinden bizzat okundu (Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği):

**(a) m. 24(2) — genel, profillemeden bağımsız kural:**
*"Mesafeli sözleşmelere ilişkin reklamlar, doğrudan çocukları hedef alan satın alma daveti içeremez."*
Bu madde, AB'nin Haksız Ticari Uygulamalar Direktifi'nin (2005/29/EC) Ek I, madde 28'inden esinlenmiş göründüğü bir çerçevenin parçası (m. 24'ün diğer bentleri de çocuklara doğrudan ikna/baskı içeren reklam unsurlarını tek tek yasaklıyor — m. 24(1)(ı): çocukları veliyi ikna etmeye "doğrudan teşvik" edemez; m. 24(1)(i): sözleşme yapmayı ima edecek ifade içeremez). **Profilleme veya kişisel veri kullanımı şart değil** — herhangi bir reklamın kendisi, "doğrudan çocukları hedef alan bir satın alma daveti" içeriyorsa yeterli.

**(b) m. 25/A — YENİ, 1 Ağustos 2026'da yürürlüğe girmiş "Hedefli reklamcılık" maddesi** (RG-1/7/2026-33297 ile eklenmiş):
*"(1) Satıcı ve sağlayıcılar... tarafından; tüketicilerin çevrimiçi davranışları, tercihlerine ilişkin geçmiş kayıtlar, konum bilgileri, demografik veriler veya benzeri kişisel veriler analiz edilerek belirli kişi veya gruplara özel olarak reklam içeriğinin sunulması faaliyetleri hedefli reklamcılık olarak kabul edilir.*
*(3) Tüketicinin çocuk olduğunun bilindiği veya makul olarak bilinmesinin beklendiği durumlarda, kişisel verilere dayalı profilleme yöntemleri kullanılarak hedefli reklam yapılamaz."*

**Bu maddenin kapsamıyla ilgili kritik gözlem — AB'nin DSA'sıyla doğrudan karşılaştırma:** DSA'nın "reklam" tanımı (Art. 3(r)) tanıtımın **"bir bedel karşılığında" (against remuneration)** yapılmasını şart koşuyor (bkz. §2.5) — bu, üçüncü bir reklamverenin platforma ödeme yaptığı klasik reklam ilişkisini varsayıyor. Türkiye'nin m. 25/A(1) tanımında **böyle bir bedel şartı yok** — sadece "kişisel veri analiz edilerek kişiye özel içerik sunma" yeterli. Bu, ORYN'in KENDİ premium planını, kullanıcının kendi kullanım verisine (ör. "3 aktivite tamamladın") dayanarak kişiselleştirilmiş biçimde tanıtmasının, DSA'da muhtemelen reklam tanımına hiç girmezken, Türkiye'de m. 25/A(3)'ün kapsamına girme ihtimalinin daha yüksek olduğu anlamına gelir. **Bu, iki yargı alanının aynı ürün özelliğine zıt yönde yaklaşabileceği somut bir örnektir.**

Ayrıca: bu Yönetmelik'in tanımlar maddesinde (m. 4) "çocuk" ayrıca tanımlanmamış — bu nedenle muhtemelen TMK m. 11'in genel 18 yaş sınırı geçerli olur, ama bunu Ticaret Bakanlığı/Reklam Kurulu uygulamasıyla teyit edemedim. **Belirsiz — avukata sorulacak** (soru listesi #2).

**Bu madde o kadar yeni ki (bu araştırmadan bir ay önce yürürlüğe girmiş) uygulamaya dair Reklam Kurulu kararı henüz muhtemelen yok.** Bu, hem fırsat (net metin) hem risk (test edilmemiş yorum) taşıyor.

### 1.6 "Veli ödüyor, öğrenci kullanıyor" yapısı sorunları çözüyor mu?

Türk hukukunda bu yapıyı doğrudan tanıyan/muaf tutan bir hüküm bulamadım. Google/Apple'ın küresel mekanizmaları (bkz. §5) Türkiye'de de teknik olarak aynı şekilde çalışır, ama bunlar KVKK'nın aradığı rıza kaydını otomatik üretmez — bkz. §5 sonundaki sentez.

---

## 2. AVRUPA BİRLİĞİ

**Baştan söylenmesi gereken en önemli şey:** AB'de **sözleşme ehliyeti hukuku üye devlet hukukudur, AB düzeyinde uyumlaştırılmamıştır.** Bu, GDPR'ın kendi metninde açıkça yazıyor (m. 8(3), aşağıda). Bu bölümde "AB kuralı" dediğim yerler (GDPR m. 8, Tüketici Hakları Direktifi, DSA) gerçekten AB çapında uyumlaştırılmış kurallardır; sözleşme ehliyeti içinse SADECE TEK BİR üye devletin (Almanya) hukuku **örnek olarak** verilmiştir — bu, "AB'nin kuralı" değil, 27 farklı rejimden biridir.

### 2.1 Reşit olmayan geçerli bir abonelik sözleşmesi kurabilir mi?

**GDPR m. 8(3)** (eur-lex.europa.eu, resmî HTML'den bizzat okundu): *"Paragraph 1 shall not affect the general contract law of Member States such as the rules on the validity, formation or effect of a contract in relation to a child."* — GDPR bilerek bu alana girmiyor.

**Örnek olarak Almanya (BGB) — SADECE ÖRNEK, AB kuralı değil.** Almanya'nın resmî İngilizce çevirisinden (gesetze-im-internet.de, Federal Adalet Bakanlığı) bizzat okundu:
- **§ 106 BGB:** 7 yaşını doldurmuş küçükler, §107-113 kapsamında sınırlı ehliyete sahiptir.
- **§ 107 BGB:** Sadece hukuki yarar sağlamayan bir irade beyanı için küçüğün yasal temsilcisinin rızası gerekir.
- **§ 108 BGB:** Rızasız kurulan sözleşme, temsilcinin onayına kadar **askıda geçersizdir** ("schwebend unwirksam"). Karşı taraf onay talep ederse, temsilci 2 hafta içinde cevap vermezse onay reddedilmiş sayılır.
- **§ 109 BGB:** Onaylanana kadar **karşı taraf** (yani ORYN) sözleşmeden çekilebilir — ama küçük olduğunu bilerek sözleşme kurduysa bu hak sınırlanır.
- **§ 110 BGB ("harçlık maddesi"):** Küçük, kendisine bu amaçla veya serbestçe tasarrufu için verilmiş bir parayla (harçlık) edimini yerine getirirse, sözleşme **baştan itibaren geçerli** sayılır.

Bir Alman öğrenci kendi harçlığıyla ORYN'e abone olursa (kredi kartı velisinin olsa bile, öğrenciye "bu senin harcaman için" diye verilmişse) §110 devreye girip sözleşmeyi geçerli kılabilir — ama bu çok fact-specific bir test. **27 üye devletin her biri farklı bir rejime sahip; ORYN'in gerçekte hangi üye devletlerde doğrudan tüketiciyle sözleşme kurduğu netleşmeden bu bölüm yalnızca örnektir.** (Soru listesi #4)

### 2.2 Veli onayı olmadan alınan ödeme geri istenebilir mi?

Almanya örneğinde: §108 BGB gereği reddedilen/onaylanmayan sözleşme geçersiz sayılır, ödenen para haksız zenginleşme (§812 BGB, bu oturumda ayrıca doğrulanmadı) hükümleri üzerinden geri istenebilir. Süre sınırı, ilgili üye devletin genel zamanaşımı kurallarına tabidir. Bu, yalnızca örnek — 27 rejimden biri.

### 2.3 Cayma hakkı nasıl işliyor? Dijital hizmette farklı mı?

Bu, AB düzeyinde **gerçekten uyumlaştırılmış** bir alan — sözleşme ehliyetinin aksine.

**Tüketici Hakları Direktifi 2011/83/EU** (eur-lex.europa.eu, resmî metinden bizzat okundu):
- **m. 4 (Uyumlaştırma düzeyi):** *"Member States shall not maintain or introduce, in their national law, provisions diverging from those laid down in this Directive..."* — bu bir **azami uyumlaştırma** direktifi; üye devletler burada farklı kural koyamaz.
- **m. 9(1):** 14 gün içinde, gerekçe göstermeksizin cayma hakkı.
- **m. 16(m):** *"the supply of digital content which is not supplied on a tangible medium if the performance has begun with the consumer's prior express consent and his acknowledgment that he thereby loses his right of withdrawal."*
- **m. 16(a):** Hizmetler için de benzer bir istisna — performans tamamlanmış VE önceden açık rıza + kaybedilecek hakkın kabulü şartıyla.

**Türkiye'nin karşılık gelen istisna metninden (§1.3) farkı burada net:** AB'de istisna hem "önceden açık rıza" HEM DE "hakkı kaybedeceğini kabul" unsurlarını **açıkça** arıyor — Türkiye'nin m. 15(1)(h)'si sadece "onay" diyor. ORYN'in checkout akışı, hangi ülkeye satış yapıyorsa o ülkenin tam metin şartını karşılayacak şekilde ayrı ayrı tasarlanmalı.

### 2.4 Veri işleme onayı için yaş eşiği ne?

**GDPR m. 8** (eur-lex.europa.eu, resmî HTML'den madde madde bizzat okundu — tam metin):

> **1.** Where point (a) of Article 6(1) applies, in relation to the offer of information society services directly to a child, the processing of the personal data of a child shall be lawful where the child is at least 16 years old. Where the child is below the age of 16 years, such processing shall be lawful only if and to the extent that consent is given or authorised by the holder of parental responsibility over the child.
> Member States may provide by law for a lower age for those purposes provided that such lower age is not below 13 years.
> **2.** The controller shall make reasonable efforts to verify in such cases that consent is given or authorised by the holder of parental responsibility over the child, taking into consideration available technology.
> **3.** Paragraph 1 shall not affect the general contract law of Member States such as the rules on the validity, formation or effect of a contract in relation to a child.

**Kritik nüans — bu madde HER işlemeye uygulanmaz.** m. 8(1) açıkça "Where point (a) of Article 6(1) applies" diyor — yani sadece **rıza** (Art. 6(1)(a)) hukuki dayanak olarak kullanıldığında devreye girer. ORYN öğrenci profilini "sözleşmenin ifası" (Art. 6(1)(b)) temelinde işliyorsa, bu madde o veri için **hiç uygulanmaz**. Ama pazarlama iletişimi, zorunlu olmayan analitik veya (aşağıda değinilecek) kişiselleştirilmiş upsell hedeflemesi rıza temelinde yapılıyorsa, m. 8 tam burada devreye girer.

**Eşik tek bir sayı değil:** Varsayılan 16, ama her üye devlet kendi eşiğini 13-16 arasında belirleyebilir. Hangi üye devlette hangi sayının seçildiğini bu oturumda tek tek doğrulamadım — bu, "AB eşiği 16" demenin de bir basitleştirme olduğu anlamına gelir. (Soru listesi #4)

**GDPR Recital 38** (bizzat okundu): *"Children merit specific protection with regard to their personal data... Such specific protection should, in particular, apply to the use of personal data of children for the purposes of marketing or creating personality or user profiles..."* — pazarlama/profil oluşturma amacıyla çocuk verisi kullanımına özel dikkat çekiyor; bu, upsell hedeflemesi sorusuna doğrudan bağlanıyor (bkz. 2.5).

### 2.5 Ürün içi tanıtım/pop-up kısıtlı mı? DSA'nın reklam yasağı kendi ürün tanıtımını kapsıyor mu?

Burada İKİ AYRI eşik sorusu var ve ikisi de DSA'nın (Regulation (EU) 2022/2065) resmî metninden (eur-lex.europa.eu) bizzat okunarak doğrulandı.

**Eşik sorusu #1 — ORYN, DSA'nın "çevrimiçi platform" tanımına giriyor mu?**

- **DSA Art. 3(i):** "'online platform' means a hosting service that, at the request of a recipient of the service, **stores and disseminates information to the public**..."
- **DSA Art. 3(k):** "'dissemination to the public' means making information available... to a **potentially unlimited number of third parties**."

ORYN'in ürün tasarımı (kamuya açık profil YOK, sosyal akış YOK, öğrenci-öğrenci mesajlaşma YOK — bunlar ürün şartnamesinde açıkça V1 dışı bırakılmış) göz önüne alındığında, öğrencinin verisini "potansiyel olarak sınırsız sayıda üçüncü kişiye" yaymayan bir ürün, m. 28'in hitap ettiği "çevrimiçi platform" tanımına **hiç girmeyebilir.** Eğer girmiyorsa, Art. 28 (aşağıdaki reklam sorusu dahil) baştan uygulanmaz. **Bu benim kendi metinsel çıkarımım — bir mahkeme veya Komisyon rehberi tarafından teyit edilmiş değil, avukatla teyit edilmeli** (soru listesi #5).

**Eşik sorusu #2 — ORYN bir "çevrimiçi platform" sayılsa bile, kendi upsell uyarısı DSA'nın "reklam" tanımına giriyor mu?**

- **DSA Art. 28(2):** *"Providers of online platform shall not present advertisements on their interface based on profiling... using personal data of the recipient of the service when they are aware with reasonable certainty that the recipient of the service is a minor."*
- **DSA Art. 3(r) ("advertisement" tanımı):** *"information designed to promote the message of a legal or natural person... presented by an online platform on its online interface **against remuneration** specifically for promoting that information."*

Tanımdaki "against remuneration" (bir bedel karşılığında) unsuru kilit nokta: klasik reklam ilişkisi bir reklamverenin platforma ödeme yapıp yer satın almasını varsayar. ORYN kendi premium planını kendi arayüzünde tanıttığında, platforma ayrı bir bedel ödeyen üçüncü bir taraf yoktur — ORYN kendi geleceğe dönük satışını teşvik etmektedir. **Metnin düz okunuşu, bunun Art. 3(r)'nin "reklam" tanımına hiç girmediğini düşündürüyor.** Ama bunu doğrudan teyit eden bir Komisyon rehberi veya içtihat bulamadım — bu benim yorumum, kesin hüküm değil.

**Buna karşın Art. 28(1)'in daha geniş, tanım-bağımsız yükümlülüğü unutulmamalı:** *"Providers of online platforms accessible to minors shall put in place appropriate and proportionate measures to ensure a high level of privacy, safety, and security of minors."* Bu genel güvenlik yükümlülüğü, "reklam" tanımına girmese bile manipülatif bir upsell tasarımını sorunlu kılabilir.

**Art. 28(3):** *"Compliance with the obligations set out in this Article shall not oblige providers of online platforms to process additional personal data in order to assess whether the recipient of the service is a minor."* — Yaşı öğrenmek için ekstra veri toplama zorunluluğu yok; yükümlülük yalnızca zaten "makul kesinlikle" bilindiğinde devreye giriyor. **DSA Recital 71** (bizzat okundu, GDPR'ın kendi Recital 71'inden FARKLIDIR — iki ayrı belgenin aynı numaralı maddesi, karıştırılmamalı): bu farkındalığın "kendiliğinden, örneğin başka amaçlarla zaten yaşını ortaya koyan veri işleniyorsa" oluşabileceğini söylüyor — yani ORYN'in az sayıdaki doldurulmuş `birth_year` alanı, tam da bu tür bir "farkındalık" kaynağı olabilir.

### 2.6 "Veli ödüyor, öğrenci kullanıyor" yapısı sorunları çözüyor mu?

EU düzeyinde bunu tanıyan özel bir statü yok. GDPR m. 8(2)'nin "doğrulama" yükümlülüğü ile ulusal sözleşme ehliyeti kuralları ayrı ayrı bir veli müdahalesi gerektiriyor, ama ikisi de belirli bir "veli hesabı" mimarisi ZORUNLU KILMIYOR — sadece bir sonuç (doğrulanmış rıza / geçerli sözleşme) arıyor. Endüstri pratiği (Apple/Google mekanizmaları, §5) bu sonucu ödeme tarafında sağlıyor ama GDPR m. 8'in aradığı veri-işleme rızası kaydını KENDİLİĞİNDEN üretmiyor — bu iki farklı rıza katmanı, ayrı ayrı tasarlanmalı.

---

## 3. BİRLEŞİK KRALLIK

### 3.1 Reşit olmayan geçerli bir abonelik sözleşmesi kurabilir mi?

Yetişkinlik yaşı 18. Ortak hukuk kuralı: reşit olmayanla kurulan sözleşmeler genel olarak **iptal edilebilir** (voidable) — "zaruri ihtiyaçlar" (necessaries) istisnası dışında, reşit olmayan tarafından bozulabilir ama karşı tarafı bağlar.

**Sale of Goods Act 1979, s. 3** (legislation.gov.uk, resmî metinden bizzat okundu): *"Capacity to buy and sell is regulated by the general law concerning capacity to contract... Where necessaries are sold and delivered to a minor... he must pay a reasonable price..."* — bu madde yalnızca **mallar (goods)** için geçerli; SaaS aboneliği bir "mal" değil "hizmet"tir, dolayısıyla bu maddenin doğrudan kapsamı dışında kalır. Ortak hukukun (case law) daha geniş "necessaries" doktrini teorik olarak gerekli hizmetleri (ör. gerekli eğitim) de kapsayabilir, ama bir kariyer-planlama uygulamasının premium katmanının "zaruri" sayılması zayıf bir iddia olur.

**Belirsiz ve önemli bir boşluk:** Sürekli/tekrarlayan bir abonelik yükümlülüğünün İngiliz ortak hukukunda "baştan geçersiz" mi yoksa (hisse senedi taahhüdü gibi) "bozulana kadar bağlayıcı bir süregelen yükümlülük" kategorisinde mi değerlendirileceği net değil — bu ayrım, tazminat/iade sonucunu doğrudan etkiler. Bu oturumda bunu çözecek doğrudan bir içtihat bulamadım. **Belirsiz — avukata sorulacak** (soru listesi #6).

### 3.2 Veli onayı olmadan alınan ödeme geri istenebilir mi?

**Minors' Contracts Act 1987, s. 3** (legislation.gov.uk, resmî metinden bizzat okundu): *"Where... the contract is unenforceable against the defendant... because he was a minor when the contract was made, the court **may, if it is just and equitable to do so**, require the defendant to transfer to the plaintiff any **property** acquired by the defendant under the contract, or any property representing it."*

Dikkat: bu bir **takdiri** (discretionary — "may... if just and equitable") mekanizma, otomatik değil. Ayrıca metin "property" (mal varlığı) diyor — bir aylık dijital erişim hakkının "acquired property" sayılıp sayılmayacağı belirsiz; bu madde somut mallar düşünülerek yazılmış görünüyor. **Belirsiz — avukata sorulacak** (soru listesi #6): bir SaaS aboneliği için mahkeme bu maddeyi mi, yoksa genel "total failure of consideration" / haksız zenginleşme doktrinini mi uygular?

### 3.3 Cayma hakkı nasıl işliyor?

**Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 (SI 2013/3134)** — legislation.gov.uk, resmî metinden bizzat okundu:
- **Reg. 37(1)-(2):** Dijital içerik için — tacir, cayma süresi bitmeden önce, ancak tüketici **açık rıza verip cayma hakkını kaybedeceğini kabul ettiyse** teslime başlayabilir; aksi halde tüketici cayma hakkını korur.
- **Reg. 36:** Hizmetler için paralel bir hüküm.

Bu, AB'nin CRD m. 16(m)'siyle neredeyse birebir aynı (Brexit sonrası İngiltere bu mekanizmayı "onshore" etti, değiştirmedi).

**Ayrıca not (kapsam dışı ama işaretlenmeye değer):** Digital Markets, Competition and Consumers Act 2024, abonelik sözleşmeleri için genel bir yeni rejim (hatırlatma bildirimleri, kolay iptal) getiriyor — bu, YAŞTAN BAĞIMSIZ, tüm İngiltere abonelikleri için geçerli olacak bir katman. Bu araştırmanın kapsamı reşit olmayanlarla sınırlı olduğu için derinlemesine incelenmedi, ama ürün ekibinin ayrıca kontrol etmesi gerekir.

### 3.4 Veri işleme onayı için yaş eşiği ne?

**Önemli bir düzeltme — bu tam olarak "önce metni oku" kuralının neden var olduğunu gösteren bir örnek:** Data Protection Act 2018'in "Section 9 — Child's consent in relation to information society services" maddesi, genel bilgide sıkça "İngiltere'nin eşiği 13" diye anılır. legislation.gov.uk'den bizzat kontrol ettiğimde, bu maddenin **31 Aralık 2020 itibarıyla (Brexit geçiş süresi sonu) tamamen yürürlükten kaldırıldığını** gördüm — resmî not: *"S. 9 omitted (31.12.2020) by virtue of The Data Protection, Privacy and Electronic Communications (Amendments etc) (EU Exit) Regulations 2019."*

**Güncel ve doğru kaynak: UK GDPR'ın kendi Art. 8'i** (legislation.gov.uk/eur/2016/679/article/8, bizzat okundu, "as amended" versiyonu):

> **1.** Where point (a) of Article 6(1) applies... the processing of the personal data of a child shall be lawful where the child is at least **13 years old**. Where the child is below the age of 13 years, such processing shall be lawful only if and to the extent that consent is given or authorised by the holder of parental responsibility over the child.
> **2.** The controller shall make reasonable efforts to verify... that consent is given or authorised by the holder of parental responsibility over the child, taking into consideration available technology.
> **2A.** The Secretary of State may by regulations— (a) amend paragraph 1 so as to change the age... (but not to an age lower than 13 years or higher than 16 years)...
> **3.** Paragraph 1 shall not affect the general contract law as it operates in domestic law...

Brexit sonrası İngiltere, AB'nin "üye devlet 13-16 arasında seçer" mekanizmasını **doğrudan 13'e sabitledi**, ama İçişleri Bakanı'na (Secretary of State) bunu 13-16 aralığında ikincil mevzuatla (affirmative resolution ile) değiştirme yetkisi bıraktı — yani bu sayı bir gün değişebilir. **ORYN'in beyan ettiği 14 yaş tabanı, bu 13'lük eşiğin HEMEN ÜSTÜNDE** — yani İngiltere'de COPPA'daki gibi rahat bir güvenlik payı yok; eşik değişirse (16'ya çıkarsa) ORYN'in tüm 14-15 yaş kullanıcıları aniden UK GDPR m. 8 kapsamına girer.

### 3.5 Ürün içi tanıtım/pop-up kısıtlı mı?

Burada İngiltere, AB'nin DSA'sından **daha somut ve doğrudan** bir cevap veriyor — çünkü İngiltere DSA kapsamında değil (Brexit sonrası), ama ICO'nun **Children's Code (Age Appropriate Design Code)** düzenlemesi var. Bu Code'un statüsü DPA 2018 s. 123'e dayanıyor (bu madde, s. 9'un aksine YÜRÜRLÜKTEN KALDIRILMAMIŞ).

**Standard 12 — Profiling** (ico.org.uk, resmî metinden bizzat okundu):
> "There is no point in offering a privacy setting if the profiling is essential to the provision of the core service... So most profiling should be subject to a privacy setting... You should always provide a privacy setting for behavioural advertising which is used to fund a service, but is not part of the core service that the child wishes to access."

**Doğrudan uygulanabilir sonuç:** Eğer ORYN'in upsell uyarısı, öğrencinin kullanım verisinin profillenmesine dayanıyorsa VE bu profilleme ORYN'in temel (ücretsiz) hizmetinin sunulması için ZORUNLU değilse, Standard 12 bu profillemenin **varsayılan olarak kapalı** bir gizlilik ayarına tabi olmasını bekliyor. Bu, DSA'nın "reklam mı değil mi" tartışmasından tamamen bağımsız, doğrudan uygulanabilir bir standart.

**Standard 13 — Nudge techniques** (ico.org.uk, resmî metinden bizzat okundu): Başlık standardı açıkça **kişisel veri/gizlilik ayarları** ile ilgili — *"Do not use nudge techniques to lead or encourage children to provide unnecessary personal data or turn off privacy protections."* Okuduğum sayfada satın-alma nudge'larına dair açık bir hüküm YOKTU (bu, bir başka ICO sayfasında olabilir, ama bulduğum ana metinde yoktu). Standardın gerekçesi (GDPR m. 5(1)(a) adillik/şeffaflık ilkesi + Recital 38) benzer mantığın manipülatif satın-alma nudge'larına genişletilebileceğini düşündürüyor ama bu benim çıkarımım, doğrudan yazan bir kural değil.

### 3.6 "Veli ödüyor, öğrenci kullanıyor" yapısı sorunları çözüyor mu?

AB ile aynı sentez: UK GDPR m. 8(2)'nin doğrulama yükümlülüğü ile ödeme-yetkilendirme araçları (Apple/Google) farklı katmanlar. §5'e bakınız.

---

## 4. AMERİKA BİRLEŞİK DEVLETLERİ

**Baştan söylenmesi gereken şey:** ABD'de sözleşme ehliyeti eyalet hukukudur (federal değil). Aşağıda **Kaliforniya** tek bir örnek eyalet olarak kullanılmıştır (en büyük tek eyalet, sıkça referans alınır) — bu "ABD kuralı" değildir.

### 4.1 Reşit olmayan geçerli bir abonelik sözleşmesi kurabilir mi?

**California Family Code** (leginfo.legislature.ca.gov, resmî metinden bizzat okundu):
- **§ 6700:** *"Except as provided in Section 6701, a minor may make a contract in the same manner as an adult, subject to the power of disaffirmance under... Section 6710..."*
- **§ 6701:** Bir küçüğün YAPAMAYACAĞI üç şey: (a) yetki devri, (b) taşınmaz mal sözleşmesi, (c) **doğrudan zilyetliğinde veya kontrolünde olmayan taşınır mal** sözleşmesi.
- **§ 6710:** *"...a contract of a minor may be disaffirmed by the minor before majority or within a reasonable time afterwards..."*

**Sonuç:** Bir SaaS aboneliği ne "taşınmaz" ne de klasik "taşınır mal"dır (bir hizmettir) — §6701'in üç istisnasından hiçbirine açıkça girmiyor gibi görünüyor. Bu da genel kuralın (§6700) işlediği, yani **Kaliforniya'da bir reşit olmayanın doğrudan (veli olmadan) geçerli bir abonelik sözleşmesi kurabileceği** anlamına geliyor — AMA §6710 gereği bu sözleşme her zaman **tek taraflı olarak bozulabilir** kalır (reşit olana kadar veya reşit olduktan "makul bir süre" içinde). Bu, sözleşmenin ORYN'i bağladığı ama öğrenciyi bağlamadığı, asimetrik bir risktir — hukuka aykırılıktan bağımsız, saf ticari bir risk.

**Diğer eyaletler için genel arka plan (bağımsız doğrulanmamış):** Ortak hukukun "infancy doctrine"ı genel olarak benzer bir örüntü izler (reşit olmayanın sözleşmesi kendisi için iptal edilebilir, karşı taraf için bağlayıcı) ama her eyalet kendi istisnalarını, sürelerini kodlamıştır. **Belirsiz — avukata sorulacak** (soru listesi #7): ORYN'in gerçek/planlanan ABD kullanıcı yoğunluğu hangi eyaletlerde? Kaliforniya örneği kaç eyalete genellenebilir?

### 4.2 Veli onayı olmadan alınan ödeme geri istenebilir mi?

Yukarıdaki §6710 disaffirmance hakkından doğar. Ayrıca, tam da bu senaryo için **gerçek bir federal icra emsali** var:

**FTC v. Epic Games** (ftc.gov, resmî basın açıklamasından bizzat okundu — https://www.ftc.gov/news-events/news/press-releases/2023/03/ftc-finalizes-order-requiring-fortnite-maker-epic-games-pay-245-million-tricking-users-making):
> "...used dark patterns to trick players into making unwanted purchases and let children rack up unauthorized charges **without any parental involvement**... Epic must pay **$245 million**, which will be used to provide refunds to consumers."

Ayrı bir emirle Epic, COPPA Kuralı ihlalleri için **$275 milyon** ceza ödemeyi kabul etti. Bu, eyalet sözleşme hukukundan tamamen bağımsız bir ikinci risk katmanı gösteriyor: FTC, manipülatif arayüz tasarımıyla (dark patterns) birleşen, veli onayı olmadan çocuklardan alınan ücretlere karşı, Federal Ticaret Komisyonu Kanunu'nun genel haksız-uygulama yetkisiyle **doğrudan ve ağır** biçimde harekete geçebiliyor. Bu, "kendi ürününü tanıtan bir upsell ekranı" sorusuyla doğrudan kesişiyor — eğer bu ekran manipülatif tasarlanırsa, sadece "reklam mı değil mi" sorusundan bağımsız bir risk doğar.

### 4.3 Cayma hakkı nasıl işliyor?

ABD'de AB/UK tarzı genel bir "cayma hakkı" **yok**. Bunun yerine:

- **ROSCA — 15 U.S.C. § 8403** (Cornell LII üzerinden resmî ABD Kanunu metninden bizzat okundu): İnternet üzerinden "negative option" (otomatik yenilenen) herhangi bir ücretlendirme için üç şart: (1) tüm önemli şartların ücret bilgisi alınmadan önce açıkça bildirilmesi, (2) ücretlendirmeden önce tüketicinin açık ve bilgilendirilmiş rızası, (3) tekrarlayan ücretleri durdurmak için basit bir mekanizma. **Yaştan bağımsız, hâlâ yürürlükte, ORYN'in tüm ABD checkout akışına uygulanır.**
- **FTC'nin "Click-to-Cancel" (Negative Option) Kuralı — İPTAL EDİLDİ.** 8. Daire Temyiz Mahkemesi, Temmuz 2025'te bu kuralı usul hatası (zorunlu ön düzenleyici analiz eksikliği) nedeniyle tamamen iptal etti. **Bu, ikincil kaynaklara (hukuk bürosu uyarıları — Sidley, Mayer Brown, Gibson Dunn vb.) dayanmaktadır, mahkeme kararının kendisi bu oturumda okunmadı.** FTC, Ocak 2026'da yeni bir kural yapım sürecini (ANPRM) başlattı; süreç devam ediyor. **Güncel durum — avukata sorulacak, hızla değişebilir** (soru listesi #7'nin bir parçası).
- **FTC "Cooling-Off Rule" (16 CFR Part 429):** Kapsamı kapıdan-kapıya/işyeri-dışı satışlarla sınırlı olduğu genel bilgiyle biliniyor ama **bu oturumda metnini bizzat açıp doğrulamadım** — bu belgedeki diğer maddelerden daha düşük güvenle aktarıyorum. **Belirsiz — avukata sorulacak.**

### 4.4 Veri işleme onayı için yaş eşiği ne?

**COPPA Kuralı, 16 CFR § 312.2** (ecfr.gov, resmî ve güncel — 31 Ağustos 2026 itibarıyla — metinden bizzat okundu):
> *"Child means an individual under the age of 13."*

**ORYN'in beyan ettiği 14 yaş tabanı, bu çizginin doğrudan üzerinde** — AB/UK'nin 13-16 aralığının aksine, ABD'de COPPA'nın "çocuk" tanımı sabit ve 14 yaşın altında. Bu, §0'daki büyük karşılaştırmalı bulgunun kaynağı.

**Ama iki tetikleyici var, sadece "hedef kitle" değil** (§ 312.3, bizzat okundu):
> *"It shall be unlawful for any operator of a website or online service **directed to children**, or any operator that has **actual knowledge** that it is collecting or maintaining personal information from a child..."*

**"Directed to children" testi** (§ 312.2, çok faktörlü, bizzat okundu) — konu, görsel içerik, animasyonlu karakterler, reklam, ampirik kanıt gibi unsurlara bakıyor. ORYN'in ciddi/profesyonel tonu, çocuk karakteri olmaması, hedef yaşının açıkça 14-18 olması, bu testi karşılamamasını güçlü biçimde destekliyor.

**"Actual knowledge" tetikleyicisi — buradaki asıl risk:** ORYN'in az sayıdaki doldurulmuş `birth_year` alanı şu an 2009-2010 (13 yaş üstü) gösteriyor, yani bugün itibarıyla aktif bir "actual knowledge" senaryosu yok. AMA sistemde **hiçbir alt yaş kapısı olmadığından**, bir kullanıcı 13 yaşın altında bir doğum yılı girip kaydolabilir. Eğer bu veri veritabanında oturur ve kimse ona göre işlem yapmazsa, bunun FTC'nin "actual knowledge" standardını karşılayıp karşılamayacağı **belirsiz** — genel olarak FTC'nin icra pratiğinin, bir operatörün zaten sahip olduğu (ve hareket etmediği) yaş verisini "bilmezden gelme" savunmasına pek izin vermediği yönünde bir izlenim var, ama bunu destekleyen belirli bir FTC kararını bu oturumda tek tek doğrulamadım. **Belirsiz — avukata sorulacak** (soru listesi #8).

**"Mixed audience" statüsü** (§ 312.2, bizzat okundu) — tarafsız bir yaş ekranı KULLANMAYAN bir servis, "mixed audience" statüsünün sunduğu daha esnek muameleyi net biçimde talep edemez. ORYN'in bugünkü hâliyle (yaş ekranı yok) bu daha güvenli kategoriye tam girip girmediği belirsiz.

**Davranışsal reklam için VPC şartı daha katı** (§ 312.2 "internal operations" istisnasının metni, bizzat okundu): kalıcı bir tanımlayıcının "davranışsal reklam" veya "belirli bir kişi için profil oluşturma" amacıyla kullanılması, rızasız-işleme istisnasının **dışında** bırakılıyor — yani COPPA tetiklenirse (yani bir kullanıcı gerçekten 13 yaş altıysa), o kullanıcı için kişiselleştirilmiş bir upsell hedeflemesi tam VPC (verifiable parental consent) gerektirir.

### 4.5 Ürün içi tanıtım/pop-up kısıtlı mı?

Federal düzeyde, COPPA reklam İÇERİĞİNİ değil, çocuktan **veri toplanmasını** düzenliyor (yukarıdaki davranışsal reklam istisnası hariç). Genel-kitleye-uygun bir üründe kendi ürününü tanıtmayı yasaklayan federal bir kural yok.

**Eyalet düzeyinde gelişmekte olan, aktif dava konusu bir katman var:** Kaliforniya'nın Age-Appropriate Design Code Act'i (AB 2273), **NetChoice v. Bonta** davasında kısmen durduruldu. 9. Daire'nin **12 Mart 2026** tarihli en son kararına göre (ikincil hukuki yorum kaynaklarından — Cooley, Holland & Knight, Lexology; mahkeme kararının kendisi bu oturumda bizzat okunmadı): veri-kullanım kısıtlamaları ve "dark patterns" yasağı hâlâ yürütmesi durdurulmuş halde; kapsam tanımı ve yaş tahmini hükmü için dava, alt mahkemeye geri gönderildi. **Bu çok hızlı değişen bir dava durumu — avukatla, karar tarihini kontrol ederek teyit edilmeli** (soru listesi #7'nin bir parçası).

### 4.6 "Veli ödüyor, öğrenci kullanıyor" yapısı sorunları çözüyor mu?

Burada ABD'nin cevabı AB/UK'den yapısal olarak **farklı**: COPPA'nın VPC (verifiable parental consent) mekanizması tam olarak "veli onaylıyor" modelinin resmileştirilmiş hâli — ama bu mekanizma SADECE COPPA tetiklendiğinde (yani kullanıcı gerçekten 13 yaş altındaysa) devreye giriyor. ORYN'in beyan ettiği 14+ tabanı için COPPA'nın VPC makinesi muhtemelen **hiç işlemeyecek** — bu, aynı 14 yaşındaki kullanıcının AB/UK'de (eşik 13-16 arası olduğu için) hâlâ GDPR m. 8 kapsamına girebilecek olmasıyla tam bir tezat oluşturuyor. Kaliforniya'nın §6710 disaffirmance riski ise yaştan bağımsız, COPPA'dan ayrı bir sözleşme-hukuku riski olarak duruyor.

---

## 5. WEB SATIŞI vs. UYGULAMA MAĞAZASI (App Store / Google Play)

### Apple App Store

**App Review Guidelines** (developer.apple.com, güncel metin bizzat okundu):

- **Guideline 1.3 (Kids Category):** Bu kategori, satın alma fırsatlarını/dış bağlantıları bir "parental gate" arkasına saklamayı, üçüncü taraf analitik/reklam kullanmamayı şart koşuyor. **ORYN'in hedef yaşı (14-18) Apple'ın Kids Category yaş bantlarının (5 ve altı / 6-8 / 9-11) üzerinde** — yani ORYN muhtemelen bu kategoriye girmeyecek ve bu maddenin katı kuralları teknik olarak uygulanmayacak.
- **Guideline 5.1.3 — daha geniş, kategori-bağımsız kural:** *"apps in the Kids Category **or those that collect... personal information... from a minor** must include a privacy policy and must comply with all applicable children's privacy statutes."* **Bu, kategoriden bağımsız olarak ORYN'e doğrudan uygulanır** — çünkü ORYN reşit olmayanlardan kişisel veri topluyor.
- **Ask to Buy:** Bir aile organizatörü, "Child" hesap türü için varsayılan olarak, 13-17 yaş için isteğe bağlı olarak açabildiği bir onay mekanizması. (Bu mekanizmanın bölgeye göre tam varsayılan yaş davranışı bu oturumda App Store Connect'in kendi dokümantasyonundan bire bir doğrulanmadı — genel arama sonuçlarına dayanıyor, düşük-orta güven.)

### Google Play

**Play Console Families Policy** (support.google.com, resmî sayfadan bizzat okundu):
> "Apps in the Google Play Families program must protect children's privacy... If your app is for a mixed audience, you must include a neutral age screen to ensure children only see non-personalized ads."

**Kritik nokta:** Bu, geliştiricinin **Play Console'da kendi beyan ettiği hedef kitleye** bağlı, kısmen opt-in bir rejim. ORYN, hedef kitlesini 14-18 / 13+ olarak doğru beyan ettiği sürece, en katı "Families" kısıtlamaları (sertifikalı reklam SDK'ları, vb.) muhtemelen tetiklenmez — COPPA'ya benzer biçimde, GDPR/DSA/Türk hukukunun "gerçek farkındalık" testinden farklı olarak burada **geliştiricinin kendi beyanı** belirleyici. **Family Link'in (Google'ın veli-denetim aracı) tam işleyişi bu oturumda derinlemesine doğrulanmadı** — düşük-orta güven.

### Web (doğrudan) satış vs. mağaza satışı — fark ne?

Mağaza mekanizmaları (Ask to Buy, Family Link) **ödeme yetkilendirmesi** sorununu pratik olarak çözer — bir velinin ödeme yöntemini onaylamasını sağlar, bu da yetkisiz-ücretlendirme riskini (FTC v. Epic Games senaryosu) operasyonel olarak azaltır. AMA bu mekanizmalar, **hiçbiri** GDPR m. 8 / UK GDPR m. 8 / KVKK'nın aradığı türde bir "veri işleme rızası" kaydı üretecek şekilde tasarlanmamıştır — bunlar ödeme onayı araçlarıdır, veri koruma rıza araçları değil. Web üzerinden doğrudan satışta ise bu ara katman hiç yok — tüm yük (yaş ekranı, veli rızası akışı, cayma hakkı bilgilendirmesi, iptal mekanizması) doğrudan ORYN'in üzerinde. **Hangi kanaldan satılırsa satılsın, alttaki hukuki yükümlülükler (sözleşme ehliyeti, veri rızası) ORYN'e aittir — mağaza bunları devralmaz, sadece bazılarını operasyonel olarak kolaylaştırır.**

---

## AVUKATA SORULACAK SORULAR

Her biri, bu araştırmayla çözülemeyen gerçek bir belirsizliğe karşılık geliyor.

1. **(Türkiye)** TMK m. 16 uyarınca gereken veli rızası, dijital bir checkout akışında hangi somut biçimde (yazılı beyan, e-imza, SMS onayı, ödeme kartının velinin adına olması yeterli mi?) verilmiş sayılır? Bu rıza, KVKK'nın veri-işleme rızasıyla aynı akışta mı yoksa ayrı ayrı mı belgelenmeli?
2. **(Türkiye)** Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği m. 25/A'daki "çocuk" tanımı TMK m. 11'in 18 yaş sınırına mı dayanıyor? Bu yepyeni madde (1 Ağustos 2026 yürürlükte), ORYN'in kendi kullanım verisine dayalı, bedelsiz bir upsell uyarısını gerçekten kapsıyor mu, yoksa Reklam Kurulu uygulaması bunu üçüncü taraf reklamıyla mı sınırlı tutuyor?
3. **(Türkiye)** Veli onayı olmadan kurulan bir abonelik sözleşmesi onaylanmazsa, ödemenin iadesi hangi TBK maddesi/doktrini üzerinden, hangi zamanaşımı süresiyle istenir?
4. **(AB)** ORYN'in fiilen veya planlı olarak doğrudan tüketiciyle sözleşme kurduğu belirli üye devletler hangileri? Her biri için GDPR m. 8'in seçtiği yaş (13-16 arası) ve o devletin sözleşme ehliyeti rejimi (Almanya örneği yalnızca örnektir) ayrı ayrı teyit edilmeli.
5. **(AB)** ORYN, DSA'nın "çevrimiçi platform" tanımına (Art. 3(i) — kamuya bilgi yayma unsuru) gerçekten giriyor mu? Giriyorsa, kendi ürününü tanıtan, bedelsiz bir upsell uyarısı Art. 3(r)'nin "reklam" tanımına (bedel şartı) giriyor mu?
6. **(İngiltere)** Sürekli bir SaaS aboneliği, İngiliz ortak hukukunda "baştan geçersiz" mi yoksa "bozulana kadar bağlayıcı süregelen yükümlülük" mü sayılır? Minors' Contracts Act 1987 s. 3'ün "property" diline göre, bir abonelik ücretinin iadesi bu madde üzerinden mi yoksa genel haksız zenginleşme üzerinden mi istenir?
7. **(ABD)** Kaliforniya dışında, ORYN'in gerçek/planlı kullanıcı yoğunluğuna göre hangi eyaletlerin infancy doctrine ve (varsa) eyalet-düzeyi çocuk-tasarım-kodu (AADC tipi) kurallarını ayrı ayrı kontrol etmek gerekiyor? FTC'nin "click-to-cancel" kuralının yeniden-düzenleme süreci (ANPRM, Nisan 2026 yorum tarihi) hangi aşamada?
8. **(ABD)** ORYN'in veritabanında oturan, kimsenin işlem yapmadığı, 13 yaş altını gösteren bir `birth_year` alanı, güncel FTC icra pratiğine göre COPPA'nın "actual knowledge" standardını karşılar mı? Bunu önlemek için hangi teknik önlem (otomatik engelleme/işaretleme) yeterli sayılır?
9. **(Tüm yargı alanları)** ORYN'in şu anda kayıt sırasında hiçbir yaş kapısı kullanmaması ve doğum *yılını* (tam tarih değil) toplaması — (a) COPPA'nın "mixed audience" statüsünü, (b) GDPR/UK GDPR m. 8(2)'nin "makul çaba" standardını, (c) "çocuklara yönelik değildir" savunmasını her rejimde ayrı ayrı nasıl etkiler? Doğum yılı, herhangi bir rejimde yetersiz mi, yoksa tam tarih hiçbir yerde şart değil mi?
10. **(Ürün mimarisi)** "Veli öder, öğrenci kullanır" yapısı için, doğrulanmış ayrı bir "veli" kullanıcı tipi (yeni bir veri modeli varlığı) dört yargı alanının HERHANGİ BİRİNDE hukuken ZORUNLU mu, yoksa yalnızca riski azaltan bir tasarım tercihi mi? Bu, ödeme özelliği inşa edilmeden önce karar verilmesi gereken bir mimari sorudur.

---

## KAYNAKÇA (birincil kaynaklar, erişim tarihi 2026-09-02)

- Regulation (EU) 2016/679 (GDPR) — eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679
- Regulation (EU) 2022/2065 (DSA) — eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2065
- Directive 2011/83/EU (Consumer Rights Directive) — eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32011L0083
- Bürgerliches Gesetzbuch (BGB), §§ 106-113, resmî İngilizce çeviri — gesetze-im-internet.de/englisch_bgb/
- Data Protection Act 2018, s.9 (yürürlükten kaldırılmış hali dahil) — legislation.gov.uk/ukpga/2018/12/section/9
- UK GDPR, Art. 8 (değiştirilmiş hali) — legislation.gov.uk/eur/2016/679/article/8
- ICO, Age Appropriate Design Code, Standard 12 & 13 — ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/
- Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, reg. 36-37 — legislation.gov.uk/uksi/2013/3134
- Minors' Contracts Act 1987, s.3 — legislation.gov.uk/ukpga/1987/13/section/3
- Sale of Goods Act 1979, s.3 — legislation.gov.uk/ukpga/1979/54/section/3
- 16 CFR Part 312 (COPPA Rule) — ecfr.gov (versioner API, 2026-08-31 sürümü)
- 15 U.S.C. § 8403 (ROSCA) — law.cornell.edu/uscode/text/15/8403
- California Family Code §§ 6700, 6701, 6710 — leginfo.legislature.ca.gov
- FTC v. Epic Games basın açıklaması — ftc.gov/news-events/news/press-releases/2023/03/ftc-finalizes-order-requiring-fortnite-maker-epic-games-pay-245-million-tricking-users-making
- Türk Medeni Kanunu (4721 s.) — mevzuat.gov.tr/mevzuatmetin/1.5.4721.pdf
- Tüketicinin Korunması Hakkında Kanun (6502 s.), m. 47-49 — mevzuat.gov.tr/mevzuatmetin/1.5.6502.pdf
- Mesafeli Sözleşmeler Yönetmeliği, m. 9, 11, 15 — mevzuat.gov.tr (mevzuatNo=20237)
- Kişisel Verilerin Korunması Kanunu (6698 s.), tam metin taraması — mevzuat.gov.tr/mevzuatmetin/1.5.6698.pdf
- KVKK Kurulu Karar Özetleri 2020/255, 2022/776 — kvkk.gov.tr
- Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği, m. 24, 24/A, 25/A — mevzuat.gov.tr (mevzuatNo=20435)
- Apple App Store Review Guidelines, 1.3 & 5.1.3 — developer.apple.com/app-store/review/guidelines/
- Google Play Families Policy — support.google.com/googleplay/android-developer/answer/9893335

**İkincil kaynaklar (açıkça bu şekilde kullanıldı, birincil metinle teyit edilmedi):** 8. Daire'nin FTC click-to-cancel kararı ve NetChoice v. Bonta'nın 9. Daire kararı hakkındaki hukuk bürosu müvekkil uyarıları (Sidley, Mayer Brown, Gibson Dunn, Cooley, Holland & Knight) — bunlar dava/mevzuat sürecinin GÜNCEL DURUMUNU özetliyor, mahkeme kararlarının tam metni bu oturumda okunmadı.
