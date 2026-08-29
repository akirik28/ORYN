# ORYN — Kapsamlı Durum, Geçmiş, Mimari ve Gelecek Raporu

**Rapor tarihi:** 28 Ağustos 2026
**Dil:** Türkçe
**Amaç:** Oryn'i hiç tanımayan bir yapay zekânın veya teknik ekip üyesinin ürünü doğru anlayarak devralması.
**İncelenen kod:** `main`, `f7af9140f1255b2436217f1bf8d8fa5a80abd037`
**Son main commit tarihi:** 24 Ağustos 2026, 23:33:26 Türkiye saati.
**Canlı veri ölçümü:** 28 Ağustos 2026, yaklaşık 13:18–13:23 Türkiye saati.
**İç kullanım:** Bu rapor güvenlik açıkları ve operasyonel durum içerir. Açık GitHub deposuna veya halka açık bir belgeye otomatik yayımlanmamalıdır.

**İçerik haritası**

| Bölümler | Konu |
|---|---|
| 0–4 | Kanıt yöntemi, ürün kimliği, ilkeler ve tarihçe |
| 5–9 | Teknoloji, mimari, ekranlar, öğrenci modeli ve CV/portfolyo |
| 10–12 | Skorlar, deterministik Counselor ve AI katmanı |
| 13–17 | Üniversiteler, programlar, kabul değerlendirmesi, fırsatlar ve veri işletimi |
| 18–23 | Güvenlik, sosyal yüzeyler, tasarım, yerelleştirme, operasyon ve testler |
| 24–26 | Git/PR durumu, ek özellikler, iş modeli ve pilot |
| 27–29 | Öncelikli açıklar, gelecek yol haritası ve 80 fazın karşılığı |
| 30–33 | Yeni AI için çalışma kuralları, kaynaklar, hazır devir metni ve sonuç |

---

## 0. Bu rapor nasıl okunmalı?

Bu bir fikir sunumu veya yapılacaklar listesi değildir. Gerçek kod, canlı Supabase veritabanı, GitHub durumu, test çıktıları, kurucu kararları ve geçmiş çalışma raporları karşılaştırılarak hazırlanmış bir devir belgesidir.

İddialar dört farklı düzeyde değerlendirilmiştir:

- **Bugün ölçüldü:** Bu oturumda canlı veritabanı, GitHub veya yerel komutlarla doğrulandı.
- **Kodda mevcut:** İlgili uygulama yolu ve iş mantığı incelendi. Bugün tarayıcıdan uçtan uca denendiği anlamına gelmez.
- **Tarihsel olarak doğrulanmış:** Önceki oturumun tarihli test raporunda kanıtı bulunuyor; bu rapor hazırlanırken aynı kullanıcı akışı tekrarlanmadı.
- **Plan / öneri / açık karar:** Henüz ürün davranışı olarak teslim edilmiş sayılmaz.

“Yapıldı” kelimesini tek başına kullanmak bu proje için tehlikelidir. Bir özellik araştırılmış, kodlanmış, test edilmiş, main'e birleştirilmiş, migration'ı uygulanmış, kullanıcıya açılmış ve gerçek kullanımda doğrulanmış olabilir. Bunlar ayrı aşamalardır.

Bu rapor bütün geçmiş sohbetleri okuduğunu veya bütün kod satırlarını tek tek denetlediğini iddia etmez. Ulaşılabilen depo geçmişi, başlıca kaynak belgeler, güncel uygulama yolları ve canlı ölçümler esas alınmıştır. Tarihsel raporlarda geçen kullanıcıların kişisel ayrıntıları, gerçek anahtarlar ve özel belgelerin içerikleri aktarılmamıştır. Canlı öğrenci tablolarından içerik yerine toplu sayılar okunmuştur.

**Önemli kaynak sırası:** Kullanıcının güncel talimatı ve geçerli `AGENTS.md` bağlayıcıdır. Mevcut davranış için kod ve canlı sistem; tarihsel niyet için tarihli kurucu kararları kullanılır. Bir belgenin adında “current”, “canonical” veya “verified” yazması onun bugün doğru olduğunu kanıtlamaz. Drive dosyasının değiştirilme tarihi de içindeki ölçümün tarihi değildir.

Makinece okunabilir ölçüm eki: [2026-08-28-oryn-evidence.json](reports/2026-08-28-oryn-evidence.json). Bu ek; sayımları, migration geçmişini, güvenlik metadata'sını ve doğrulama sonuçlarını içerir.

---

## 1. Yönetici özeti: Oryn bugün tam olarak nerede?

Oryn, lise çağındaki öğrencinin akademik ve kişisel gelişimini yapılandıran; üniversite, program ve fırsat verileriyle ilişkilendiren; sonra “Şimdi ne yapmalıyım?” sorusuna gerekçeli cevap vermeyi amaçlayan bir öğrenci kariyer işletim sistemidir.

Bugünkü ürün basit bir prototip değildir. Kimlik doğrulama, onboarding, yapılandırılmış profil, CV içe aktarma, puanlama, deterministik danışman, gerçek Anthropic sohbeti, haftalık plan, fırsat keşfi ve eşleştirme, üniversite keşfi, hedefler, başvuru takibi, kanıt belgeleri, portfolyo, CV çıktısı, essay hikâye bankası ve yönetim araçları bulunan geniş bir uygulamadır.

Ancak **halka açık lansmana hazır olduğu kanıtlanmış bir ürün de değildir.** Başlıca nedenler; bazı güvenlik düzeltmelerinin canlıya tam taşınmaması, veri kapsamındaki büyük dengesizlikler, henüz kurulmamış düzenli kaynak doğrulama sistemi, eksik ürün akışları, reşit olmayan kullanıcılar için tamamlanmamış inceleme ve üretim dağıtımının doğrulanamamasıdır.

### 1.1. Bugün doğrulanan özet tablo

| Alan | Gerçek durum |
|---|---|
| Kod sürümü | Yerel main ile GitHub main aynı: `f7af914` |
| GitHub deposu | `akirik28/ORYN`; bugün yapılan sorguda **public** |
| Paket sürümü | `oryn`, `0.1.0`, npm açısından `private: true` |
| Son GitHub CI | Aynı commit için başarılı; 24 Ağustos |
| Yerel lint | Geçti |
| Yerel TypeScript kontrolü | Geçti |
| Mevcut çalışma klasöründe test | 2.476 geçti, 3 başarısız; 167 test dosyası |
| Temiz git klonunda test | **2.479 / 2.479 geçti**, 167 dosya |
| Yerel production build | Bu oturumda tamamlanamadı: önce font ağı, sonra Turbopack yerel port izni engeli |
| Supabase | `oryn-qa-scratch`, aktif ve sağlıklı; PostgreSQL 17 |
| Üniversite | 1.019 toplam; **1.010 canonical**, 9 superseded |
| Program | **17.046**; 150 üniversite ve 14 ülkeye dağılmış |
| Üniversite şartı | **1.280**, 104 üniversite |
| Üniversite son tarihi | **438**, 87 üniversite |
| Fırsat | **421** toplam; 276 active |
| Active + verified_current fırsat | **204** |
| Durum/doğrulama/tarih alt kümesi | **132**; kişiselleştirilmiş önerilebilirlik sayısı değildir |
| Profil | 11; onboarding tamamlayan 8; QA hesapları da dahil |
| Gerçek AI kayıtları | 7 haftalık plan, 19 aksiyon, 26 advisor mesaj satırı |
| Bağlantı ve özel mesaj | Her iki tabloda da 0 satır |
| Açık PR | 3: #150, #155, #157 |
| Görülebilen Vercel hesabı | Oryn projesi bulunamadı; başka hesap veya host ihtimali dışlanmadı |

**En doğru kısa tanım:** Oryn, çalışan çekirdeği ve ciddi veri birikimi olan, gerçek AI ile denenmiş; buna rağmen güvenlik, veri semantiği, operasyon ve pilot doğrulaması açısından tamamlanması gereken bir pre-launch ürünüdür. “Yalnızca maket” demek de “bitti, yayına hazır” demek de yanlış olur.

### 1.2. En önemli beş sonuç

1. **Danışman artık yalnızca bir fikir değil.** Deterministik karar motoru mevcut; gerçek Anthropic çağrıları ve önceki canlı kalite testleri var. “AI hiç çalışmadı” diyen 22 Ağustos belgeleri eskidi.
2. **Satır sayısı kapsam demek değil.** 17.046 program, 1.010 canonical üniversitenin yalnızca 150'sine ait. Program + şart + tarih bulunan kurum sayısı yalnızca 80.
3. **Bütün testler bağlama göre değerlendirilmelidir.** Commit edilmiş kaynak temiz klonda yeşil; ana çalışma klasöründeki izlenmeyen SQL dosyası üç testi kırıyor.
4. **Migration listesi tek başına canlı güvenliği açıklamıyor.** 0061/0062 ile amaçlanan iki koruma canlıda mevcut, ama migration geçmişinde isimleri yok. 0063–0065'in temel korumaları ise canlı metadata'da görünmüyor.
5. **Yeni özellik sayısından önce güvenilir karar kalitesi gelmeli.** Öncelik; gerçek öğrencinin uygun, güncel, kaynaklı ve yapılabilir bir sonraki adımı almasıdır.

---

## 2. Ürünün kimliği, hedef kitlesi ve temel problemi

### 2.1. Kime hizmet ediyor?

İlk hedef kitle yaklaşık 14–18 yaşındaki öğrenciler. Özellikle rekabetçi üniversitelere hazırlanırken hangi deneyimlerin anlamlı olduğunu, neye öncelik vereceğini ve hangi fırsatlara gerçekten uygun olduğunu anlamak isteyenler.

Başlangıç pazar odağı ABD, Birleşik Krallık, Avrupa, Türkiye ve yurt dışına başvuran uluslararası öğrenciler. Kanada onboarding'de açık hedef bölgesi olarak bulunuyor; güncel veri ve araştırma kapsamı Avustralya, Singapur ve başka ülkeleri de içeriyor.

Oryn'in yalnızca Amerikan lise ve kabul sistemine göre düşünmemesi gerekiyor. Türkiye'de MEB müfredatında olup aynı zamanda AP dersleri alan bir öğrenci, Birleşik Krallık'ta A-Level öğrencisi veya Almanya'da diploma tanınmasına bağlı başvuru yapan biri aynı veri modeline zorla Amerikan karşılıklarıyla sokulmamalı.

### 2.2. Hangi problemi çözmek istiyor?

Öğrencinin deneyimleri farklı yerlerde dağınıktır: CV, okul transkripti, sertifikalar, yarışma sonuçları, kişisel notlar, üniversite siteleri, danışman mesajları ve takvimler. Bilgi depolamak tek başına yeterli değildir. Öğrencinin sınırlı zamanı vardır ve yapılabilecek çok fazla şey bulunur.

Oryn'in esas işi, bunları birlikte değerlendirip fırsat maliyetini hesaplamaya yardımcı olmaktır. Öğrenci liderlikte zaten güçlü ise dördüncü kulübü kurmasını önermek yerine mevcut araştırmasını tamamlamasını önerebilmelidir. Bir fırsat ünlü bir üniversiteye bağlı diye iyi seçenek sayılmamalıdır. Ücret, uygunluk, seçicilik, öğrencinin aşaması ve gerçek çıktısı birlikte değerlendirilmelidir.

### 2.3. Ürün döngüsü

```text
Deneyimi kaydet
  → kanıt ve kaynak durumunu ayır
  → yapılandır ve doğru varlığa bağla
  → profili değerlendir
  → hedef ve kısıtlarla karşılaştır
  → uygun fırsatları bul
  → en fazla üç ana öncelik belirle
  → öğrenci uygulasın
  → ne olduğunu kısaca anlatsın
  → profil ve bir sonraki tavsiye güncellensin
```

Bu döngünün parçaları kodda bulunuyor. Ancak tüm döngünün bütün persona ve hata koşullarında sürekli doğru çalıştığına ilişkin kapsamlı üretim kanıtı henüz yok.

### 2.4. Oryn ne değildir?

Birincil olarak CV oluşturucu, üniversite sıralama sitesi, kabul olasılığı hesaplayıcısı, görev yöneticisi, sertifika cüzdanı, sohbet botu veya sosyal ağ değildir. Bunlardan bazılarını içerir; ürünün merkezi, öğrencinin karar verme ve gelişim sürecidir.

Kurucu yöneliminin özeti: veritabanı güçlü olmalı, fakat ürün kimliği veri kataloğuna dönüşmemelidir. Keşif serbest kalmalı; AI öğrenciyi “önce yaz okulu, sonra staj” gibi yapay bir sıraya zorlamamalıdır.

---

## 3. Değişmemesi gereken ürün ilkeleri

### 3.1. Gerçek veri ve belirsizlik

- Üretimde uydurma üniversite istatistiği, son tarih, burs, makale, başvuru bağlantısı veya başarı metriği yok.
- Bilinmeyen alan boş kalabilir. Boşluk, araştırma görevidir; tahminle doldurulacak eksik değildir.
- Resmî üniversite, organizatör, devlet veya başvuru platformu kaynağı önceliklidir.
- Kaynak URL'si, tarih ve kanıt düzeyi birlikte düşünülür.
- Bir kaydın `verified_current` olarak etiketlenmiş olması, kaynak bugün yeniden açılmadan her ayrıntının güncel olduğunu kanıtlamaz.

### 3.2. Öğrenci kanıtları

`self_reported`, `evidence_added`, `verified`, `verification_rejected` ayrı durumlar. Dosya yüklenmesi bağımsız doğrulama değildir. `verified` ve `verification_rejected` şemada bulunsa da gerçek bağımsız belge doğrulama hizmeti tamamlanmış değildir.

### 3.3. Öğrencinin zamanı

Amaç daha çok faaliyet değil, zaman başına daha anlamlı gelişim. Sistem “bunu şimdi yapma” diyebilir. Öğrenciye akademik iş yükünü, mevcut taahhütleri ve haftalık kapasitesini aşan öneriler vermemelidir.

### 3.4. Basitlik

Basitlik, yararlı özellikleri silmek anlamına gelmez. Karmaşıklık doğru hiyerarşi, kademeli açıklama, arama ve filtrelerle yönetilir. Aynı ekranda çok sayıda eşit ağırlıklı kart, düğme ve metin kullanılmamalıdır.

### 3.5. Güvenlik ve küçük yaştaki kullanıcılar

Varsayılan özel profil, özel dosyalar, en az veri toplama, kullanıcıya silme ve dışa aktarma sunma esastır. Sosyal özelliklerde görünürlük, karşılıklı onay, engelleme ve moderasyon ayrı ayrı ele alınmalıdır. Bu rapor hukuki uygunluk görüşü değildir; profesyonel inceleme tamamlanmış kabul edilmemelidir.

---

## 4. Tarihçe: Proje nasıl bugünkü hâline geldi?

### 4.1. 15 Ağustos: İlk ürün ve geniş temel

Git'te erişilebilen başlangıç 15 Ağustos 2026. İlk commit `b2dcf0a`; ürünün ana inşası `c09f569`. Aynı gün temel öğrenci kariyer sistemi, peer benchmarking, şart kontrol listesi, global arama ve şart keşfi işi eklenmiş.

İlk ürün adı master prompt'ta “Career AI” iken Oryn adına geçilmiş. `AGENTS.md`, uzun kurucu ürün tarifini taşıyor; `docs/founder-spec.md` aynı tarifin Next.js tarafından yönetilen dosya bölümünden bağımsız kalıcı kopyası olarak oluşturulmuş.

Aynı gün sosyal profil ve karşılıklı bağlantı kapsamı genişlemiş; ardından gerçek bir bağlantı gizliliği açığı bulunup kapatılmış. `oryn-qa-scratch` başlangıçta QA için kurulmuş, sonra gerçek geliştirme backend'i olarak kullanılmaya başlanmış. Bu isim bugün de değişmemiş.

Görsel yön birkaç kez değişmiş: ilk tasarım, ardından koyu siyah-mavi sistem. Mesajlaşma ve spor deneyimleri, Drive veri import hattı, CV Generator ve Essay Story Bank da erken dönemde eklenmiş. Bu nedenle Oryn, ilk haftasından itibaren saf danışman prototipinden daha geniş bir yüzeye sahip olmuş.

### 4.2. 16–17 Ağustos: Güvenlik, profesyonel profil ve veri uzlaştırması

Engelleme yönlerinin ayrılması, bağlantı kesilince mesaj geçmişinin korunması, veri dışa aktarma kapsamının tamamlanması, ham PostgreSQL hata mesajlarının öğrenciye sızmasının azaltılması, mesaj abuse limitleri, moderasyon ve gerçek zamanlı mesaj güncellemeleri gelmiş.

GitHub Actions CI eklenmiş. Profesyonel profil katmanı; headline/about, öne çıkarılan çalışmalar, beceri onayları, tavsiye yazıları, profil görüntülenmeleri ve iletişim görünürlüğü gibi özelliklerle genişlemiş.

Canonical entity registry ve üniversite veri zenginleştirmesi büyümüş. Canlı veritabanında önceki oturumların yaptığı değişikliklerle depo migration'ları arasında uzlaştırma yapılmış. Bugün hâlâ bu geçmişin izleri var: canlı migration geçmişi ile dosya numaraları bire bir eşleşmiyor.

### 4.3. 18–20 Ağustos: Açık tasarım, veri altyapısı ve Counselor Core

18 Ağustos yönelimi açık, ferah, logo mavisini kullanan tasarıma dönmüş. Üniversite görsel edinimi ve Supabase Storage'da yeniden barındırma sistemi eklenmiş. Canonical arama, üniversite/program verisi ve profil alanları zenginleştirilmiş.

19 Ağustos civarında deterministik Counselor Core ayrı bir sistem olarak kurulmuş. Profil durumu → açıklar → aday aksiyonlar → uygunluk → sıralama → kanıtlı açıklama zinciri ortaya çıkmış. LLM bu zincirin zorunlu hesaplayıcısı yapılmamış.

20 Ağustos'ta kalıcı yürütme stratejisi oluşturulmuş: iki bilgisayar; biri veri/araştırma/canonical graph, diğeri ürün/danışman/UI/entegrasyon. “Veritabanı ürünün kendisi değildir; danışmanı besler” yönelimi netleştirilmiş.

### 4.4. 21–22 Ağustos: Büyük veri büyümesi ve çoklu ajan koordinasyonunun sınırları

Erişilebilen git geçmişindeki commit dağılımı 21 Ağustos'ta 551, 22 Ağustos'ta 405. Bunlar merge ve farklı çalışma dallarının erişilebilir geçmişini de içerir; bağımsız kullanıcı değeri veya insan çalışma süresi metriği değildir.

Program kataloğu hızla büyümüş. ABD, Birleşik Krallık, Kanada, Almanya, Hollanda, Türkiye ve başka ülkelerden programlar alınmış. Kaynak doğrulayıcıları yanlış program URL'leri, okul/bölüm ayrımları, Kanada isim çakışmaları, Avustralya kaynak engelleri ve duplicate anahtarlarının yetersizliği gibi sorunlar bulmuş.

Önemli teknik gelişmeler:

- Program kimliğine öğretim dili, resmî URL ve derece türünün eklenmesi.
- Türkiye için yerleştirme döngüsü modelinin hazırlanması.
- Gereksinimlerde alternatifler, istisnalar ve temsil edilemeyen kurallar için güvenli tutum.
- Kabul sistemlerinin ülke ve başvuru yoluna göre ayrılması.
- Fırsat uygunluğunda “bilinmiyor” durumunun doğru gösterilmesi.
- Son tarihi geçen fırsatların önerilere sızmasının tespiti.
- Hesaplanan değerlerin kullanıcı tarafından değiştirilebildiği güvenlik açıklarının bulunması.
- MVP'nin 16 adımlık akışının ilk kapsamlı tarihsel denetimi.

Koordinasyon maliyeti de büyümüş. Aynı QA hesabına iki oturumun yazması, aynı dosyaya iki farklı araştırma metni üretilmesi, eski “aktif oturum yok” notlarının yanıltması, disk dolması, dal/merge durumlarının yanlış okunması ve yazma yetkisinin belirsizleşmesi kaydedilmiş.

Bu dönemden çıkan kalıcı ders: yazma yetkisi açık ve dar tutulmalı; doğrulama bağımsız yapılabilir. Geçmiş örgüt şemasındaki “CEO”, “CFO”, “DATA”, “PRODUCT”, “BASORG”, “RES”, “FEAT”, “BUG”, “MERGE” isimleri çoğunlukla AI çalışma rolleridir; şirketin gerçek çalışan listesi veya bugün aktif oturumlar oldukları varsayılmamalıdır.

### 4.5. 23 Ağustos: AI'ın gerçek kullanımla sınanması

İlk somut danışman çıktıları gerçek model ve gerçek backend ile incelenmiş. Düşük token tavanının düşünme bütçesi nedeniyle cevapları kesebildiği veya görünür cevap bırakmadığı görülmüş. Advisor için tavan 8.192'ye çıkarılmış; başarısız ama ücret tüketmiş çağrıların kullanım kaydına ilişkin düzeltme yapılmış.

Başlıca merge'ler:

- #135: `ai_usage.estimated_cost` hesaplaması.
- #140/#141: geçmiş deadline ve eski stored match kayıtlarına karşı okuma anında yaşam döngüsü kontrolü.
- #143/#146: doğrulama kapısının eklenmesi ve pipeline kökenini doğrulanmışlık sanan yanlış koşulun düzeltilmesi.
- #147: fırsat kataloğunun advisor bağlamına bağlanması.
- #148: onboarding tekrarının duplicate üretmemesi ve ilgi alanı çakışmasında sessiz veri kaybının giderilmesi.
- #149: haftalık planda aynı şeyi hem önerip hem kaçınılacak iş olarak yazma çelişkisini azaltan kontrol.
- #151: moderasyon statüsünün danışmanda dikkate alınması.
- #152/#154/#156: ücret bilgisinin AI'a taşınması ve pay-to-enroll programların çekirdek önerilerden ayrılması.
- #159: para birimi bilinmeyen fırsat ücretine otomatik dolar işareti koymanın kaldırılması.
- #161: `computer_science` ile `computer science` eşleşmesinin düzeltilmesi.

### 4.6. 24 Ağustos: Editorial Intelligence ve Gate 2

#163 ile UI Redesign V3 ana tasarım yönü hâline gelmiş. #165 puanlama tavanları, diller, beceri taksonomisi ve genel skorun öğrenciye ana sayı olarak gösterilmemesi üzerinde çalışmış. #166, dolu bir profilin yanlışlıkla “nothing recorded” gibi görünmesine yol açan veri eşleme kusurunu kapatmış.

Son merge #167, Gate 2 danışman QA'sından iki düzeltme getiriyor:

1. Sunucu cevabı kaydediyor fakat client state'e metin dönmediğinden sohbet cevabı sayfa yenilenmeden görünmüyordu. Artık başarılı cevap metni client'a dönüyor.
2. 94/100 gibi güçlü bir boyut göreli sıralama yüzünden “minor gap” diye tanımlanabiliyordu. 70 ve üzerindeki boyutların gerçek açık gibi puanlanması ve anlatılması engellenmiş.

Gate 2 tarihsel raporu; gerçek çok turlu sohbet, kaynaklarla çapraz kontrol, seyrek/dolu profil, sahte kabul yüzdesi talebine yanıt, sağlayıcı hatası ve tekrar deneme gibi akışları kapsıyor. Bu, bütün ürünün lansman onayı değildir; danışmanın belirli testlerinin başarılı olduğuna ilişkin tarihli kanıttır.

### 4.7. 25–28 Ağustos: Bu raporun ölçtüğü durum

28 Ağustos sorgusunda GitHub main hâlâ 24 Ağustos commit'inde. Bu, başka dallarda veya başka araçlarda çalışma yapılmadığını kanıtlamaz. Üç açık PR ve yerelde 51 izlenmeyen dosya var.

Yeni ölçümler; eski sayıları, eksik credential iddialarını ve bazı güvenlik notlarını düzeltiyor. Özellikle AI çalışıyor; 0061/0062 davranışları canlıda bulunuyor; 0063–0065 korumaları için iş bitmiş değil.

---

## 5. Güncel teknoloji ve çalışma ortamı

| Katman | Depoda görülen seçim |
|---|---|
| Framework | Next.js **16.3.1**, App Router |
| React | **19.2.8** |
| Dil | TypeScript, strict |
| Stil | Tailwind CSS v4 |
| UI | shadcn/ui, Base UI, Lucide, Sonner |
| Form | React Hook Form, Zod v4, hookform resolvers |
| Hareket | `motion` |
| Tarih | `date-fns` |
| Harita | React Simple Maps türevi, world-atlas, topojson |
| Backend | Supabase PostgreSQL, Auth, Storage, Realtime |
| AI | Anthropic SDK; uygulama içi provider abstraction |
| DOCX okuma | `mammoth` |
| Görsel işleme | `sharp` |
| Test | Vitest 4.1.10, Testing Library, jsdom |
| CI | GitHub Actions, Node 24 |
| Bu makinedeki Node | 24.19.0 |

Sürüm değerleri `package.json` ve mevcut çalıştırmadan alınmıştır; “piyasadaki en son sürüm” iddiası değildir. Çoğu bağımlılık aralıkla tanımlı; lockfile kurulum tutarlılığının önemli parçasıdır.

**Next.js uyarısı:** Bu projede eğitim verisindeki eski Next.js alışkanlıklarıyla kod yazılmamalı. `AGENTS.md`, yazılacak kodla ilgili yerel `node_modules/next/dist/docs/` rehberinin okunmasını açıkça istiyor. `proxy.ts`, asenkron request API'leri, Server Action export kuralları ve route tipleri özellikle önemlidir.

### 5.1. Kodun büyüklüğü

28 Ağustos dosya envanteri:

| Dizin | Sayılan kaynak dosyası | Yaklaşık satır |
|---|---:|---:|
| `app` | 92 | 8.443 |
| `components` | 40 | 2.936 |
| `features` | 76 | 9.659 |
| `lib` | 228 | 26.251 |
| `scripts` | 76 | 19.678 |
| `__tests__` | 169 | 25.103 |
| `types` | 1 | 1.776 |

Bu ölçüm `.ts`, `.tsx`, `.mts`, `.py` dosyalarını kapsar. SQL, CSS ve belgeler bu satır toplamında değildir; test dizinindeki dosya sayısı çalıştırılan test suite sayısıyla aynı değildir. Ayrıca rapor eklenmeden önce 356 Markdown belge, 378 araştırma JSONL dosyası ve 66 SQL migration dosyası bulunuyordu.

Bu hacim olgunluğun tek başına kanıtı değildir. İnşa kadar uzlaştırma, test ve operasyon disiplini gerektiren bir projeye dönüşüldüğünü gösterir.

---

## 6. Mimari: Kod nerede, veri nasıl akıyor?

### 6.1. Dizin sorumlulukları

```text
app/                 URL'ler, Server Components, Server Actions, Route Handlers
components/ui/       Genel UI primitive'leri
components/oryn/     Oryn'e özgü görsel ve anlamsal bileşenler
features/            Alan bazlı arayüzler
lib/                 İş mantığı ve veri erişim sınırları
  ai/                Provider, prompt, context, usage, AI özellikleri
  counselor/         Deterministik öncelik/karar motoru
  scoring/           Öğrenci profil gelişim metrikleri
  admissions/        Kabul sistemi, outlook, bölüm yolu kontrolü
  requirements/      Şart keşfi, değerlendirme, kaynak ve ingestion
  opportunities/     Fırsat yaşam döngüsü, eşleştirme, browse, kalite
  entities/          Canonical kimlik, arama, alias, çözümleme
  acquisition/       Kurumsal veri/görsel edinimi, kaynak otoritesi
  programs/          Program normalizasyonu, dedup ve YÖK eşleştirme
  deadlines/         Birleşik tarih akışı ve hatırlatma mantığı
  security/          Oturum, admin, yönlendirme, request limitleri
  social/, messaging/ Sosyal bağlantılar ve mesajlaşma altyapısı
supabase/migrations/ Şema ve güvenlik değişiklikleri
scripts/             Veri edinimi, import, audit, dry-run araçları
data/research/       Kanıtlı araştırma paketleri ve ara çıktılar
docs/                Kararlar, audit'ler, çalışma devri ve araştırma
types/database.ts    Elle tutulan veritabanı tipleri
```

### 6.2. Tipik kullanıcı değişikliği

1. `features/` içindeki istemci bileşeni Server Action çağırır.
2. Action oturumu `requireUser()` ile doğrular; user ID'yi kullanıcı girdisinden almamalıdır.
3. Girdi ilgili şemayla doğrulanır. Projede bu yaklaşım yaygın olsa da her action'ın eksiksiz aynı disiplini uyguladığı varsayılmamalıdır.
4. Kullanıcıya ait olağan işlemler RLS kapsamlı Supabase client üzerinden yürür.
5. Profil değişmişse skorlar yeniden hesaplanır; bazı sistem tarafından hesaplanan yazımlar admin client üzerinden yapılır.
6. `revalidatePath()` ilgili ekranların yeniden veri almasını sağlar.

### 6.3. Yetki sınırları

`lib/supabase/client.ts` tarayıcı client'ı, `server.ts` oturum/RLS client'ı, `admin.ts` yükseltilmiş anahtarlı server client'ıdır. Admin anahtarı tarayıcıya taşınmamalıdır.

`proxy.ts` yönlendirme ve session refresh için var; nihai yetki kontrolü değildir. `lib/security/dal.ts` içindeki `verifySession()` gerçek `auth.getUser()` kontrolünü yapar. Yalnızca layout'ta oturum kontrolü olması, alt action'ların güvenli olduğu anlamına gelmez.

### 6.4. Veritabanı tipleriyle ilgili özel not

`types/database.ts` otomatik üretilmiş değil, elle yazılmıştır. `Identity<T>` mapped type kullanımı Supabase generic çıkarımındaki `never` problemine karşı bilinçli çözümdür. Önceki belgelerin “sonra db:types çalıştırıp değiştir, hiçbir şey etkilenmez” ifadesi bugünkü şema farkları dikkate alınmadan uygulanmamalıdır.

Canlı şemada olup repoda farklı temsil edilen yapılar ve henüz uygulanmamış migration'lar var. Tip üretimini önce ayrı dosyaya alıp karşılaştırmak, doğrudan ana tipi üzerine yazmaktan daha güvenli bir sonraki çalışma yaklaşımıdır.

### 6.5. Yönetim ve arka plan işleri

`/admin` sayfası `profiles.is_admin` ile korunur. Provider sağlığı, job geçmişi, AI kullanımı, elle job tetikleme ve temel rapor moderasyonu bulunur. Ana navigasyonda yoktur.

Job endpoint'leri bearer `CRON_SECRET` ile korunur. Kodda endpoint olması, dış scheduler'ın çalıştığı anlamına gelmez. Güncel canlı ölçümde `pg_cron` kurulu değil; görülen job geçmişi yalnızca iki başarılı deadline reminder çalıştırmasıdır.

---

## 7. Öğrencinin gördüğü ürün: ekran ve akış haritası

### 7.1. Ana navigasyon

UI V3'te görünen ana başlıklar: **Home, Counselor, Journey, Opportunities, Universities, Plan, Applications.** Eski belgelerdeki “Advisor” artık navigasyonda “Counselor”; “Profile” ise “Journey” olarak adlandırılıyor. URL'ler değişmedi: `/advisor` ve `/profile`.

Documents ve Settings hesap menüsünden erişilen ikincil alanlar. Arama ve bildirimler üst çubukta. Masaüstü sidebar kaldırılmış. Mobilde beş ana hedef ve “More” ile altı yuvalı alt navigasyon var.

Connections ve Messages ana menüden kaldırılmış; **route'ları ve sunucu işlemleri hâlâ var.** “Menüde yok” ile “özellik erişilemez” aynı şey değildir. Posts/likes/reposts katmanı ise daha güçlü biçimde kapalıdır; bu ayrım sosyal bölümde açıklanıyor.

### 7.2. Hesap açma ve oturum

`/signup`, `/login`, `/forgot-password`, `/reset-password` ve `/auth/confirm` yolları mevcut. E-posta/parola, session persistence, çıkış ve korunan uygulama alanları uygulanmış.

Supabase dashboard ayarları, email confirmation davranışı ve gerçek e-posta teslimatı uygulama kodundan bağımsızdır. Eski QA belgelerindeki “Confirm email'i kapat” talimatı üretim güvenlik tercihi gibi uygulanmamalıdır. Bu oturumda kayıt/şifre sıfırlama e-postası gönderilmedi ve dashboard auth ayarları değiştirilmedi.

### 7.3. Onboarding

Beş aşamalı akış:

1. Öğrencinin ne üzerinde çalıştığı: üniversite, kariyer keşfi, profil geliştirme, fırsat bulma, emin değilim.
2. Ülke, okul, mezuniyet yılı, müfredat.
3. İlgi alanları ve özel ilgi girişi.
4. Hedef coğrafya.
5. CV yükleme, manuel giriş veya atlama.

CV yüklemek hesap açmanın ön şartı değil. Okul için canonical öneriler ve custom fallback bulunuyor. Onboarding tekrarının ikincil kayıtları yeniden oluşturmaması için idempotency kontrolü eklenmiş. İlgi alanlarının `(user_id, label)` çakışmasında bütün batch'in sessizce kaybolması da düzeltilmiş.

Tarihsel olarak ilk tıklamanın ilerlememesi ve sonraki tıklamanın iki adım atlaması problemi bulunmuş; animasyon çıkışına bağlı geçişin kaldırılması ve çift etkinleştirme koruması eklenmiş. Bir QA denetiminde aynı hesabı iki oturumun kullanması veritabanı kanıtını kirletmiş; rapor bunu açıkça geri çekmiş. Bu geçmiş, bugünkü onboarding'in bozuk olduğuna dair kanıt olarak yeniden kullanılmamalıdır.

**Açık taraflar:** `birth_year` alanı var fakat incelenen onboarding/settings yollarında normal öğrenciye doğum yılı yazdıran akış bulunmadı. `first_name` ve `last_name` de tam bir düzenleme akışına sahip görünmüyor. İlgi alanları onboarding'de kaydediliyor, sonradan düzenleme deneyimi eksik. “Şemada var” ile “öğrenci doldurabilir” farklıdır.

### 7.4. Home / Dashboard

Sayfa öğrencinin güncel önceliğini anlatmak için yeniden düzenlenmiş. Ana amaç çok sayıda eşit kart göstermek değil; Oryn'in ne düşündüğünü, neden düşündüğünü ve öğrencinin ne yapacağını öne çıkarmak.

Başlıca içerikler:

- Ana next move / haftalık odak.
- En fazla üç ana aksiyon.
- Profilin boyut bazlı sinyalleri.
- En anlamlı gelişim açığı veya önce bilgi tamamlama çağrısı.
- Yapılmaması önerilen düşük öncelikli iş.
- Kısa fırsat önizlemesi.
- Hedef üniversiteler ve yaklaşan tarihler.

Genel 0–100 ortalama artık ana öğrenci değerlendirmesi gibi gösterilmiyor. İçeride hesaplanmaya devam ediyor; görünürde daha anlamlı boyut sinyalleri kullanılıyor. Dashboard için plan yokken deterministik Counselor önceliklerini sunan fallback bileşeni mevcut; bu, AI tarafından üretilmiş ve kalıcı kaydedilmiş haftalık planla aynı nesne değildir.

Fırsat önizlemesi artık kapalı döngü, geçmiş tarih, doğrulama, moderasyon ve ticari kayıt kontrolleriyle uyumlu olmalıdır. Son commit'lerde bu yüzeyin diğer sayfalardan daha gevşek davranması özellikle düzeltilmiş.

### 7.5. Journey / Ana profil

Hem yapılandırılmış veri giriş alanı hem zaman içinde oluşan öğrenci geçmişi. Eğitim, dersler, sınavlar, aktiviteler, liderlik, araştırma, projeler, iş/staj, gönüllülük, spor, ödül, sertifika, beceri ve diller içerir.

Journey timeline, farklı tablolardaki kayıtları aynı kronolojik omurgada sunar. Her kayıt aynı görsel ağırlıkta değildir: liderlik, araştırma ve projeler daha hikâye ağırlıklı; ders ve sertifika gibi unsurlar daha kompakt gösterilir. Tarihsiz kayıtlar bugüne aitmiş gibi gösterilmez. Takvim tarihinin UTC nedeniyle bir önceki yıl/aya kaymaması için özel tarih mantığı var.

### 7.6. Plan ve reflection

`/plan`, haftalık plan ve aksiyonları sunar. Aksiyonlarda başlık, gerekçe, kategori, tahmini dakika, etki, deadline ve durum bulunur. Durumlar `not_started`, `in_progress`, `completed`, `skipped`, `expired`.

Tamamlanınca kısa sonuç/öğrenme notu alınır. Advisor bağlamı son tamamlanan/atlanan/sona eren aksiyonları ve reflection notlarını okuyabilir. Bunun amacı tavsiyenin gerçek sonuçla güncellenmesidir.

Önemli sınır: Haftalık planın üretildiği an ile profilin güncel hâli aynı olmayabilir. Her profil değişikliği AI planını otomatik yeniden üretmez. Haftalık idempotency maliyet ve tekrar kontrolü sağlar; fakat planın hâlâ uygun olup olmadığı için ayrıca ürün davranışı gerekir. “Profilim güncellendi, eski plan niye aynı?” açık bir yaşam döngüsü sorusudur.

### 7.7. Applications

Hedef üniversite/program, başvuru türü, deadline, durum, notlar ve checklist ile sade takip. Transkript, test sonucu, essay, referans, portfolyo, mülakat ve mali yardım gibi başvuru adımları desteklenir.

Oryn üniversiteye başvuruyu otomatik göndermez. Haricî Apply bağlantıları veya tracker durumu, gerçek başvuru platformundan kabul edilmiş bir gönderim teyidi değildir.

---

## 8. Öğrenci veri modeli ve veri girişinin ayrıntıları

### 8.1. Normalizasyon kararları

Master spec'teki her kavram için ayrı tablo açılmamış; bu bilinçli bir tercih:

| Ürün kavramı | Gerçek model |
|---|---|
| Eğitim dönemleri | `education_records` |
| Ders ve ders notu | `courses`; not aynı kayıtta |
| Genel GPA | İlgili `education_records` satırı ve ölçek |
| Standart testler | `test_scores` |
| Liderlik | `activities.is_leadership_role`, kişi sayısı ve kapsam alanları |
| Yaz programına katılım | `activities` kategorisi |
| Staj | `work_experiences.employment_type = internship` |
| Girişimcilik | Proje/aktivite kayıtlarından türeyen sinyaller |
| Araştırma ve araştırma çıktısı | `research_experiences`; output türü ve bağlantısı |
| Spor | Ayrı `sports_experiences` tablosu |
| İlgi alanları | `student_interests` |
| Kariyer hedefleri | `career_goals` |
| Diller / beceriler | `languages`, `skills` |

Her anlamın ayrı tabloya bölünmemesi eksik uygulama olarak değerlendirilmemeli. Öte yandan yayın DOI'si, dergi kimliği, ortak yazarlar veya bir yarışmaya katılım ile alınan ödülü ilişkilendiren zengin model tamamlanmış değildir.

### 8.2. Müfredat ve ders zorluğu

Öğrencinin müfredatı ile tek bir dersin seviyesi bağımsızdır. Türk müfredatında okurken AP almak mümkün. Ders seviyeleri regular, honors, AP, IB HL, IB SL, A-Level, dual enrollment, other şeklinde.

Akademik puanlamada bunun bir sınırı var: Fen Lisesi gibi AP/IB dışındaki zorlayıcı eğitim bağlamlarını mevcut enum aynı ayrıntıda temsil etmiyor. Bu, uluslararası adalet ve bağlam farkı açısından takip edilmesi gereken model eksikliği.

### 8.3. Akıllı başarı girişi

Öğrenci hızlı kaydedebilir; AI ile açıklamayı geliştirmeyi ayrıca seçebilir. Başarı türüne göre kurum, rol, süre, haftalık saat, kişiler, sonuç, kapsam ve benzeri alanlar sunulur. AI'ın olmayan kişi sayısı, gelir, etki veya ödül üretmemesi gerekir.

“President” başlığı tek başına liderlik puanını uçurmamalı; gerçek sorumluluk, süre ve etki gerekir. Aynı şekilde proje fikri ile tamamlanmış çıktı ayrı değerlendirilmelidir.

### 8.4. Beceri ve dil taksonomisi

Son tasarım geçişinde beceri önerileri programlama dillerine aşırı ağırlık veren dar listeden daha geniş öğrenci taksonomisine taşınmış. İşletme/ekonomi, girişimcilik, liderlik, iletişim, yazma, araştırma, veri, programlama, AI, mühendislik, matematik, bilim, tasarım, medya, proje yönetimi, diller, toplumsal etki, sanat ve spor grupları var. Alias'lar canonical yazımlara yakınsamayı destekliyor; serbest giriş hâlâ mümkün.

Dil düzeyleri native, bilingual ve CEFR A1–C2 olarak sunuluyor. Native/bilingual bir CEFR basamağıymış gibi modellenmiyor. Dil sertifikaları için ayrı bir yeni tablo yerine mevcut certifications alanı kullanılıyor. Profilde CEFR bilgisinin bulunması, bütün kabul şartlarının bu alanı otomatik değerlendirdiği anlamına gelmez.

### 8.5. Modelde bulunup deneyimi eksik alanlar

- Yaş/doğum yılı için olağan yazma akışı.
- Onboarding sonrası ilgi alanı düzenleme.
- `test_scores.subscores` için kapsamlı giriş deneyimi.
- Bağımsız intended-major nesnesi; bugün ilgi alanı ve hedef program üzerinden temsil ediliyor.
- Yerleşim şehri var; fırsat şehri ve gerçek yakınlık sıralaması aynı derinlikte yok.
- Okul adı profil düzeyinde ve eğitim kaydı düzeyinde ayrı yaşayabiliyor; otomatik eşzamanlama varsayılmamalı.

---

## 9. CV import, CV üretimi, portfolyo ve Story Bank

### 9.1. İçe aktarma bugün ne yapıyor?

Onboarding sırasında veya sonradan `/profile/import` üzerinden CV yükleme var. PDF, DOCX ve metin dosyası akışları destekleniyor. CV yükleme üst sınırı uygulama tarafında 10 MB.

```text
Dosya → metin/belge çıkarımı → AI yapılandırması
      → öğrencinin gözden geçirdiği aday kayıtlar
      → seçilen kayıtların profil tablolarına eklenmesi
```

Kullanıcı onayı olmadan başarılar doğrudan profile kaydedilmemelidir. Mevcut ortak import helper altı kategoriye yazıyor: eğitim, aktiviteler, ödüller, projeler, araştırma ve iş deneyimi. Her tablonun alanları aynı olmadığı için dönüştürme ayrı yapılmış. Bazı kategorilerin başarısız olduğu kısmi import sonucu kullanıcıya bildirilir; bütün işlem tek transaction değildir.

### 9.2. En önemli açık: import ile sync aynı şey değil

Kurucu kararında istenen ileri akış; NEW RECORD, POSSIBLE UPDATE, POSSIBLE DUPLICATE ve CONFLICT/NEEDS REVIEW ayrımıyla, yeni CV'yi mevcut profile güvenli birleştirmek.

**Bugünkü post-onboarding yol bunu tamamlamıyor.** `insertCvImportItems()` seçilen kayıtları insert ediyor. Mevcut kayıtlarla kapsamlı diff/merge, tekrar yüklemede idempotent dedup veya manuel güncellemenin eski CV tarafından korunması için tam senkronizasyon sistemi yok.

Onboarding tekrarının korunmuş olması, aynı CV'nin daha sonra yeniden yüklenmesinin duplicate üretmeyeceği anlamına gelmez. Bir sonraki AI'ın “CV sync hazır” dememesi gereken en önemli ayrım bu.

Ayrıca post-onboarding `importReviewedCvItems()` action'ında TypeScript tipine dayanmanın yanında kapsamlı runtime input şeması görülmüyor. Bu rapor saldırı denemesi yapmadı; fakat yeni çalışma sırasında kategori/alan/uzunluk/ID doğrulamasının tüm action sınırlarında kontrol edilmesi gerekir.

### 9.3. CV Generator

`/profile/cv`, yapılandırılmış profilden çıktı üretir. İlk yaklaşım tarayıcı yazdırma/PDF kaydetme akışı; ayrı headless PDF üretim servisi değil. Çok sayıda şablon oluşturmaya yatırım yapılmamış. Bu, “PDF CV çıktısı yok” demek değildir; çıktının üretim şekli farklıdır.

### 9.4. Portfolio ve geçmiş

`/profile/portfolio`, öğrencinin seçilmiş veya kategorize edilmiş çalışmalarını toplar. `/profile/history`, skor snapshot'ları üzerinden gelişim sunar. Snapshot bulunmaması veya karşılaştırılabilir geçmiş olmaması, uydurma trendle doldurulmaz.

### 9.5. Essay Story Bank

Başarı kayıtlarından kişisel hikâye malzemesi toplar; öğrenci notları ve AI destekli outline üretimi sunar. Amaç öğrencinin gerçek deneyimlerini anlatmaya hazırlamak. Yeni başarı/hikâye uydurmak ya da otomatik başvuru göndermek değil.

Dosyalar: `features/profile/story-bank.tsx`, `lib/story-bank/collect.ts`, `lib/ai/essay-outlines.ts` ve `/profile/story-bank` action'ları.

---

## 10. Profil puanlama: Ne ölçülüyor, ne ölçülmüyor?

### 10.1. Dokuz boyut

Academics, Intellectual Curiosity, Leadership, Research, Entrepreneurship, Community Impact, Awards & Distinction, Career Exploration, Execution / Project Depth.

Bunlar Oryn'in gelişim metrikleri. Üniversite tarafından verilmiş puan, psikometrik ölçüm veya kabul olasılığı değildir. Sayılar LLM sezgisinden değil, yapılandırılmış kayıtlara uygulanan deterministik kurallardan gelir.

Motor: `lib/scoring/`; sürüm etiketi `career_profile_v1`. Skor, confidence, reason code ve snapshot tutulur.

### 10.2. Akademik puanın gerçek formülü

İncelenen kodda:

- GPA'nın kendi ölçeğine oranından en fazla **45 puan**.
- Ders zorluğu sinyalinden en fazla **35 puan**.
- Farklı standardize testlerin **varlığından**, sayısal başarısından değil, en fazla **20 puan**.
- GPA yoksa kayıtlı ders notu varlığı sınırlı fallback puanı sağlayabiliyor.

Bu nedenle “Akademik 90” ifadesi doğrudan SAT/GPA karşılaştırmalı bilimsel başarı tahmini değildir. Test varlığına puan vermek ve AP/IB zorluğunu ağırlıklandırmak ürün heuristiğidir; ülkeler ve farklı müfredatlar açısından kalibrasyon gerektirir.

### 10.3. Liderlik örneği

Liderlik flag'i olan aktivite için başlık düşük puan, süre, yönetilen kişi sayısı ve organizasyon kapsamı ek sinyal sağlar. Kişi sayısı logaritmik etkili; çok sayıda benzer kayıt diminishing returns ile azaltılır.

Bu tasarım “başkan yazınca güçlü lider sayılma” sorununu azaltır. Fakat yanlış veya eksik girilmiş yapılandırılmış alanlar gerçek deneyimin görünmesini engelleyebilir. Hızlı kayıt UX'i ile puanlama ihtiyacı arasındaki denge ayrıca iyileştirilmelidir.

### 10.4. Reddedilmiş kanıtlar

`verification_rejected` olan başarı kayıtları profil güç puanına dahil edilmez. Öğrencinin kendi profilinde görülmeye ve completeness hesabının bilgi varlığına katkıda bulunmaya devam edebilir. “Biliyoruz” ile “güvenilir başarı kabul ediyoruz” ayrı tutulmuş.

### 10.5. Genel ortalama hâlâ içeride

`computeCareerProfile()` dokuz boyutun ağırlıksız ortalamasını hesaplıyor. Son UI değişiklikleri bu ortalamayı görünür ana skor olmaktan çıkardı; formülü kaldırmadı. Kabul outlook'u ve bazı iç tüketiciler bu sayıyı kullanabiliyor.

Bu yüzden güçlü bir kurucu/lider profiline, dokunulmamış alanlar nedeniyle düşük ortalama çıkması yalnızca görsel sorun değildir. Ülke/bölüm bağlamına göre ayrı anlamlandırma ihtiyacı sürüyor. Coğrafyaya göre bütün puanları kalibre eden tamamlanmış bir model yok.

### 10.6. Completeness ile strength ayrımı

Completeness: Oryn öğrenciyi değerlendirmek için yeterli şey biliyor mu?
Strength: Mevcut kanıtlar hangi gelişim sinyallerini gösteriyor?

About yazmak, profil fotoğrafı veya iletişim eklemek akademik gücü artırmamalı. Bu nedenle danışmana yönelik completeness ile geniş profesyonel profil checklist'i ayrılmış.

### 10.7. Öğrenciye gösterilen sinyal

Beş durum var:

| İç durum | Anlam |
|---|---|
| `not_assessed` | Hiç yeterli kayıt yok; öğrenci hakkında hüküm kurulmaz |
| `limited_evidence` | Kayıt var, confidence düşük |
| `emerging` | Değerlendirilmiş, geliştirilecek alan |
| `developing` | Gelişiyor |
| `strong` | Güçlü |

Sıralama: önce kanıt varlığı, sonra confidence, sonra puan. Yeterli confidence varsa 70 ve üstü strong, 40 ve üstü developing. “Hiç kayıt yok” otomatik olarak “zayıfsın” anlamına gelmez.

Skor kuralları son dönemde değişmiş olmasına rağmen sürüm string'i hâlâ `career_profile_v1`. Geçmiş snapshot karşılaştırmalarında aynı sürüm adı altında farklı formüllerin bulunma olasılığı ayrıca incelenmelidir; bu rapor snapshot'ları yeniden hesaplamadı.

---

## 11. Counselor Core: Ürünün karar motoru

### 11.1. LLM'den ayrı yapı

```text
state.ts                  öğrenci + hedef + fırsat + şart verisini toplar
gaps.ts                   boyut açıklarını sıralar
candidates.ts             aday aksiyonları oluşturur
eligibility.ts            uygunluğu üç durumla değerlendirir
scoring.ts                adayları sıralar ve sınıflar
evidence.ts               neden, uyarı ve kaynak açıklamasını kurar
pipeline.ts               saf fonksiyon olarak akışı birleştirir
counselor-explain.ts       istenirse LLM anlatımı ekler
```

`runCounselorPipeline()` içinde veritabanı veya ağ erişimi yok. Bu yüzden AI sağlayıcısı yokken de deterministik öncelik ve gerekçe üretebilir. Fakat Supabase verisine erişim yoksa öğrenci bağlamını toplamak yine mümkün olmayabilir; “LLM'siz çalışır” ifadesi “backendsiz çalışır” değildir.

### 11.2. Aday türleri

- Gerçek fırsat kayıtlarından opportunity adayları.
- Öğrencinin hedef üniversite şartlarından requirement action'ları.
- Eksik profil bilgilerinden profile completion görevleri.

Motor boşluğu doldurmak için hayalî yarışma veya araştırma programı yaratmaz. AI'ın ürettiği bağımsız araştırma fikri ayrı bir özellik; veri tabanında var olan fırsatla karıştırılmaz.

### 11.3. Uygunluk

`known_eligible`, `known_ineligible`, `unknown`.

Ülke, vatandaşlık, ikamet, yaş, sınıf, lifecycle ve doğrulama bilgileri değerlendirilir. Vatandaşlık okul ülkesinden türetilmez. Bir ülkede yaşamak o ülkenin vatandaşı olmak değildir. Boş ülke listesi “dünyadaki herkes uygun” olarak yorumlanmaz; açık uluslararası uygunluk ayrıca modellenmiştir.

Unknown her durumda hard exclusion değildir. Veri boşluğu nedeniyle bütün kataloğu yok etmek de yanlış olur. Unknown adaylar açık uyarı ve azaltılmış güvenle ele alınabilir. Kesin uygun olmayan veya geçersiz döngüdeki kayıt ise çekirdek öneriye alınmamalıdır.

### 11.4. Sıralamanın gerçek ağırlıkları

Fırsat adayı için `counselor_ranking_v1`:

| Bileşen | Ağırlık |
|---|---:|
| Profil açığına katkı | 0,40 |
| Alan/ilgi uyumu | 0,25 |
| Tarih aciliyeti | 0,15 |
| Veri kalitesi | 0,20 |

Bunlar ürün parametreleri; istatistiksel eğitim sonucu değil. Requirement ve profile task türleri farklı, daha basit formüller kullanıyor. Aynı boyuta tekrar tekrar yönelen adaylarda `REDUNDANCY_DECAY = 0.75` uygulanıyor.

Sınıflar: `do`, `consider`, `deprioritize`, `avoid_for_now`. En fazla üç do, en fazla beş consider; “özellikle yapma” sunumu sınırlı. `considerFloor = 25`, zaten güçlü boyutları deprioritize etme eşiği 75. Güçlü alanı “açık” diye anlatmayı önleyen eşik ayrı: `GAP_CLAIM_SCORE_CEILING = 70`.

### 11.5. Seyrek profil

`MIN_COMPLETENESS_FOR_JUDGMENT = 40`. Bu eşiğin altında sistem hüküm vermekten önce bilgi tamamlama görevlerine ağırlık vermeli. UI ayrıca confidence ve reason code kontrolü yapıyor. 0 puan, gerçekten kötü performansla hiç bilgi olmamasını birbirine karıştırmamalı.

### 11.6. Anlatım ve kanıt

`why[]`, `warnings[]`, `evidence[]`, confidence, impact, effort ve nextAction gibi alanlar var. Temel gerekçeler sabit şablonlarla gerçek veriden üretiliyor. LLM açıklaması isteğe bağlı ve başarısız olduğunda deterministik sonucu bozmamalı.

### 11.7. Henüz tamamlanmamış ürün tarafı

Counselor'ın anlık kararları ile kalıcı AI haftalık planı aynı sistem değil. Fırsata “not interested” vermek gelecekte filtrelemeyi etkiliyor; fakat bütün deterministik öneri türleri için tek, kapsamlı, kalıcı reddetme/öğrenme modeli tamamlanmış değil.

Hedefe göre doğru kabul mekanizması ayrımı gelişmiş olsa da bütün boyutların ülke, alan, bütçe ve öğrenci gelişim evresine göre ampirik olarak kalibre edilmiş olması söz konusu değil. Bu sınır, motorun değerini azaltmaz; ne tür güven iddiasında bulunabileceğini belirler.

---

## 12. AI katmanı: Sağlayıcı, bağlam, kalite ve maliyet

### 12.1. Provider abstraction

`lib/ai/provider.ts` içindeki arayüz, `generateText` ve `generateStructured<T>` işlemlerini hem çıktı hem token kullanım bilgisiyle döndürür. Ürün kodu doğrudan model adıyla bağlanmaz; `ANTHROPIC_MODEL` kullanılır.

Depodaki varsayılan `claude-sonnet-5`. Bu, depoda görülen yapılandırmadır. Bu oturumda mevcut ayarla minimal gerçek Anthropic sağlık çağrısı başarılı oldu; bütün AI özelliklerinin kalite testi yeniden yapılmış sayılmaz.

### 12.2. Structured output

Anthropic tool-call şemasına dönüştürülmüş Zod kullanılıyor. Modelin gerekli tool'u çağırması isteniyor; çıktı `safeParse` ile doğrulanıyor. Şema hatasında bir tekrar var. Önemli verileri rastgele prose içinden regex'le çıkarmak ana yöntem değil.

### 12.3. Öğrenci bağlamı

`buildStudentAdvisorContext()`; profil, akademikler, skorlar, aktiviteler, projeler, araştırmalar, ödüller, spor, hedefler, hedef üniversiteler, yaklaşan tarihler, tamamlanmamış başvuru gereksinimleri ve son aksiyon sonuçlarını toplar.

Sporun etkisi özellikle zaman bütçesinde: haftada on saat antrenman yapan öğrencinin bu zamanı serbest kapasite sayılmamalı. Spor ayrı profil verisi olsa da dokuz boyutlu skor motoruna aynı şekilde dahil edilmiş değil.

Fırsat bağlamı Counselor sonucundan en fazla sekiz fırsatla sınırlandırılır. Ücret, giriş yolu/başvuru koşulları ve uygunluk metni bağlama taşınır. Son aksiyon sonuçları on kayıtla, bazı checklist/recommendation bölümleri on beş kayıt gibi sınırlarla tutuluyor. Bunun yanında bağlamın her bölümünün aynı ölçüde sıkı sınırlandırıldığı varsayılmamalı.

### 12.4. Sohbet hata akışı

Kullanıcı mesajı korunur; AI başarısızlığı bir failed assistant mesaj satırı olarak kaydedilebilir. Tekrar deneme aynı failed satırı günceller; duplicate konuşma balonu üretmemesi amaçlanır. Ham sağlayıcı hatası öğrenciye gösterilmemelidir.

24 Ağustos düzeltmesinden sonra başarılı mesaj metni client state'e doğrudan dönüyor. `revalidatePath()` tek başına client component içindeki mevcut `useState` değerini değiştirmediğinden önceki akış görünmez cevap üretiyordu.

### 12.5. Token bütçeleri ve gecikme

Advisor ve provider varsayılan tavanı 8.192 token. Bunun gerekçesi tarihsel gerçek çağrılarda düşünme tokenlarının düşük tavanı tüketmesiydi. Her özellik aynı değeri kullanmıyor; örneğin haftalık plan yolunda açık 2.048 tavanı görülüyor. Bu ayrı çağrıların davranışı ayrı doğrulanmalı.

Gate 2 raporundaki advisor gecikmeleri ortak geliştirme makinesinde yaklaşık 12–45 saniye; ağır eşzamanlı yük altında daha uzun sayfa süreleri kaydedilmiş. Bunlar temiz üretim performans ölçümü değildir. Üretimin daha hızlı olacağını garanti etmek de doğru olmaz. Gerçek hosting ortamında p50/p95 ölçümü gerekir.

### 12.6. Rate limit

Kodda örnek AI limitleri:

| Özellik | Sınır |
|---|---|
| Advisor chat | 10 dakikada 30 |
| CV extraction | Saatte 5 |
| Weekly plan | Saatte 5 |
| Achievement refinement | 30 dakikada 20 |
| Research generator | Saatte 10 |
| Essay Story Bank | Saatte 10 |

Limiter `ai_usage` kayıtlarını sayıyor. Atomik bütçe rezervasyonu değil; eşzamanlı çağrılar aynı sayıyı okuyabilir. Sayım hatasının `count ?? 0` biçiminde davranması da katı maliyet sınırı için yeterli değildir. Kullanım abuse koruması var, ancak fatura düzeyinde garanti edilen hard cap yok.

### 12.7. Gerçek kullanım kayıtları

Bugün toplu ölçümde `ai_usage` içinde 28 satır görüldü: 13 weekly_plan, 10 gerçek model advisor_chat, 3 `test-model` advisor fixture kaydı, 1 CV extraction, 1 achievement refinement. Bunlar API hesabının tüm geçmişi değildir; yalnızca bu veritabanına yazılan kayıtlar.

Maliyet dolu 22 satırın toplamı **0,5929 USD olarak kaydedilmiş tahmin**. Bu bir fatura değildir. Test kayıtları, geçmişte maliyeti yazılmamış çağrılar, script sağlık çağrıları ve log dışında kalan kullanım dahil olmayabilir. Kodun fiyat tablosu statik; güncel sağlayıcı tarifesi olarak kabul edilmemeli.

Yeni incelemede ayrıca structured-output retry'nin önceki deneme tokenlarını toplam sonuçta biriktirmediği görülüyor. Bu, kayıtlı tahminin bütün retry maliyetini temsil etmeyebileceği bir kod riski; bu raporda gerçek fatura karşılaştırması yapılmadı.

### 12.8. AI güvenilirliği hakkında doğru ifade

Önceki canlı örneklerde kişiselleştirme, kaynaklı fırsat önerisi, çok turlu kısıt takibi ve sahte kesinlikten kaçınma başarıyla gözlenmiş. Bu, bütün olası cevapların doğru olduğuna dair matematiksel garanti değildir. Prompt kuralları, doğrulanmış retrieval ve deterministik doğrulama birlikte gerekir; sürekli değerlendirme sistemi hâlâ değerli bir sonraki yatırım.

---

## 13. Üniversite ve program veri omurgası

### 13.1. Bugünkü gerçek kapsam

Canlı veritabanında 1.019 üniversite satırı var. 1.010'u canonical, 9'u bilinen duplicate'in yerini gösteren superseded kayıtlar. Canonical üniversiteler 89 ülke değerine yayılıyor.

Program kataloğu **17.046 satır**, ama **150 üniversite**. Tüm program satırları veritabanında `verified_current` işaretli. Bu rapor 17.046 resmî program sayfasını yeniden ziyaret etmedi; ölçülen şey kayıtların doğrulama statüsüdür.

| Ülke | Program | Kapsanan üniversite |
|---|---:|---:|
| ABD | 3.722 | 37 |
| Birleşik Krallık | 3.355 | 24 |
| Kanada | 3.306 | 8 |
| Almanya | 2.317 | 17 |
| Hollanda | 1.227 | 13 |
| Türkiye | 779 | 12 |
| İrlanda | 748 | 8 |
| Avustralya | 651 | 4 |
| İtalya | 370 | 7 |
| İspanya | 241 | 3 |
| Fransa | 126 | 9 |
| İsviçre | 78 | 6 |
| Singapur | 65 | 1 |
| Malezya | 61 | 1 |

Bu tablo özellikle Kanada örneğinde önemli: binlerce program az sayıda kuruma yoğunlaşmış olabilir. Bir satır artışı, yeni bir üniversitenin başvuru açısından kullanılabilir hâle geldiği anlamına gelmez.

### 13.2. Karar vermeye elverişli kapsam

- Programı bulunan kurum: 150 / 1.010 ≈ **%14,9**.
- Şartı bulunan kurum: 104 / 1.010 ≈ **%10,3**.
- Son tarihi bulunan kurum: 87 / 1.010 ≈ **%8,6**.
- Program + şart + tarih aynı kurumda bulunan: 80 / 1.010 ≈ **%7,9**.

Son oran bile “80 üniversite eksiksiz” demek değildir. Bir kurumda tek bir genel şart ve tek bir tarih bulunması bu üçlü sayım koşulunu sağlayabilir. Program bazında, başvuru yılına göre, öğrenci vatandaşlığına göre veya bölüm özelinde tamlık ayrıca ölçülmelidir.

### 13.3. Veri tamlığı

Canonical üniversitelerde bugün:

| Alan | Dolu kayıt |
|---|---:|
| Admissions URL | 630 |
| `student_size` | 378 |
| `logo_url` | 338 |
| Enlem + boylam | 984 |

`student_size`, başka öğrenci sayısı/metric tablolarındaki kapsamın tamamını temsil etmeyebilir. Aynı şekilde logo sayısı, kampüs fotoğrafı kapsamıyla aynı değildir; üniversite fotoğrafları `university_profile_metrics` tarafında da tutulur.

Programlarda 3.655 satırın `degree_type` alanı boş. `degree_level` ve `degree_type` aynı şey değil: lisans seviyesi bilinirken BA/BSc gibi unvan bilinmeyebilir. Bu boşluk her zaman yanlış veri değildir; resmî kaynak gerçekten belirtmiyorsa tahmin edilmemeli.

### 13.4. Explorer deneyimi

`/universities` arama, filtre, harita/liste ve karşılaştırma sunar. Üniversite detayında genel bilgi, programlar, akademik/mali veriler, kaynaklar, şartlar, tarihler ve öğrenci outlook'u bir araya gelir.

Desktop map ve sonuç paneli URL parametreleri üzerinden eşzamanlıdır. Mobilde harita yüklenmez; liste ve bölge alternatifleri vardır. Karşılaştırma `/universities/compare` yolunda ayrı yüzeydir.

### 13.5. Duplicate kimliği neden basit değil?

Program dedup anahtarı yalnızca isim değil. Aynı üniversitede aynı isimli fakat farklı derece türü, dil veya resmî sayfa taşıyan gerçek programlar olabilir. Canlı tasarımın kullandığı kimlik yaklaşık olarak:

```text
university_id + normalized_name + degree_level
 + language_of_instruction + official_program_url + degree_type
```

Tek URL'nin birden çok programda kullanılması da otomatik hata değildir. Katalog sayfaları bütün programları aynı URL altında sunabilir. Harvard College ve Extension School örnekleri geçmişte gerçek programların yanlışlıkla duplicate sayılma tehlikesini göstermiştir.

### 13.6. Veri bütünlüğü ölçümü

Bugün kontrol edilen alanlarda orphan program-university ve requirement-university ilişkisi 0. Requirement veya deadline'ın bağlı olduğu programın başka bir üniversiteye ait olduğu kayıt da 0.

Ancak deadline-program eşleşmesi zaten 0 kayıt olduğundan bu son sıfır, deadline ilişkisinin kapsamlı biçimde çözüldüğünü göstermez. Kontrolün paydası önemlidir.

---

## 14. Üniversite şartları, deadline'lar ve kabul sistemleri

### 14.1. Şart değerlendirme

`university_requirements` genişletilmiş; paralel ikinci bir gereksinim tablosu yaratılmamış. Öğrenciye ait sonuçlar `student_requirement_evaluations` içinde tutulabiliyor.

Sonuçlar: `met`, `likely_met`, `not_met`, `unknown`, `needs_manual_review`. Kaynak ve structured rule üzerinden deterministik değerlendirme hedefleniyor; AI önemli şartı serbestçe uyduramaz.

### 14.2. Gerçek dünyanın şartları basit eşik değildir

“IELTS ≥ X” gibi kuralların yanında alternatif diploma yolları, aynı anda gereken dersler, belli vatandaşlık grupları, burs ile program girişinin farklı koşulları, entry year ve bölüm istisnaları vardır.

Depoda alternatif/istisna grupları, rule representability ve kaynak conflict queue tasarımı bulunuyor. Temsil edilemeyen şartı yanlış skaler değere zorlamak yerine review/unknown durumuna almak amaçlanmış. Bu, araştırma ve ingestion tarafındaki en önemli kalite gelişmelerinden biri.

### 14.3. Bugünkü bağlantı boşluğu

1.280 şartın yalnızca **88'i program_id ile bağlı**: yaklaşık %6,9. Geri kalanların bir kısmı gerçekten kurum geneli olabilir; hepsini linkage hatası saymak yanlış. Buna rağmen bölüm özelinde danışmanlık yapmak için kapsamın nerede genel, nerede eksik bağlantı olduğu ayrılmalı.

438 üniversite deadline'ının **hiçbiri program_id ile bağlı değil**. Bu, kurum geneli tarih bilgisinin bulunduğunu fakat program bazında hassas tarihin yapılandırılmış bağlantısının olmadığını gösterir.

Bütün requirement satırları `data_status='fresh'` işaretli. Bu alanın tamamının aynı değerde olması, bugün hepsinin resmî kaynakta yeniden doğrulandığını kanıtlamaz.

### 14.4. Deadline Engine

Uygulama başvuruları, kaydedilen fırsatlar ve hedef üniversite/program tarihlerini birleşik akışta toplar. Dashboard, advisor ve reminder mantığı bunu kullanabilir. Aciliyet için 3, 7, 14, 30 günlük pencereler ürün yaklaşımında var; görsel badge bileşenleri ortaklaştırılmış.

Tarih türleri açısından sabit tarih, rolling, tarih henüz açıklanmadı, yıllık tekrarlanan ama yılı belirtilmeyen tarih, geçmiş cycle ve bilinmeyen ayrımı gerekir. Geçmiş araştırmalarda “tarih var” diye yanlış yıla dönüştürme önemli risk olmuş.

**Hatırlatma ile doğrulama ayrı:** Kullanıcıya eldeki tarihi hatırlatmak, resmî sitede o tarihin hâlâ geçerli olduğunu kontrol etmek değildir. İlk iş mevcut; ikinci işin düzenli scheduler sistemi henüz tamamlanmış değil.

### 14.5. Kabul mekanizması farkları

`lib/admissions/system-shape.ts`, başvuruyu holistic review, academic rank competitive, academic threshold veya unknown gibi mekanizmalarla ifade eder. Bazı sistemler insanın aktiviteleri değerlendirdiği bütüncül bir dosya incelemesi; bazıları akademik sıralama; bazıları yayımlanmış koşulu karşılama yoludur.

Bu ayrım ülke, kurum/program istisnası ve öğrenci başvuru yoluyla ilişkilidir. Türkiye/YKS için güçlü extracurricular profil üzerinden ABD tarzı reach etiketi çıkarmak geçmişte kusur olarak görülmüş; buna karşı `not_applicable` yolu eklenmiş.

ABD/Kanada'da bazı hedef alanların doğrudan lisans başvuru nesnesi olmaması gibi alan-yol sorunları için `field-availability.ts` bulunur. Yine bütün istisnaları kapsayan global kabul uzmanı sistemi tamamlandı denemez; kaynaklı kuralların kapsamı sınırlıdır.

---

## 15. Admission Outlook: En dikkatli anlatılması gereken özellik

### 15.1. Gerçek uygulama

Sürüm `admission_model_v1`. Temel composite formül; genel profil gücünden kurum seçiciliğine bağlı sabit ceza çıkarır. Sonra `extreme_reach`, `reach`, `competitive`, `strong`, `likely` etiketlerinden birine eşler. Uygun olmayan kabul mekanizmasında `not_applicable` dönebilir.

Bu, kurucu spec'inde örneklenen bütün AcademicFit/RequirementFit/FieldAlignment/InternationalAdjustment bileşenlerinin kalibre edilmiş tam modeli değildir. Şart değerlendirme ve kabul mekanizması açıklaması mevcut; esas sayısal çekirdek hâlâ basit heuristiktir.

### 15.2. Sayısal tahmin aralıkları gerçekten var

Kodda kurum acceptance/admission rate değeri varsa ve mekanizma engellemiyorsa:

```text
baseRate = kurumun genel admission rate'i × 100
nudge = (compositeScore - 50) × 0,4
center = sınırlandırılmış(baseRate + nudge)
aralık ≈ center ± 10 yüzde puanı
```

Üniversite detayında “Oryn estimate” etiketi ve güven uyarısıyla gösterilebilen yol var. Bugün 126 istatistik satırında admission rate, dört hedef üniversite kaydında saklanmış tahmin aralığı ölçüldü. Önceki Gate 1 raporunda da bir üniversite için gerçek UI'da 1–11% aralığı görülmüş.

**Dolayısıyla “Oryn hiçbir sayısal kabul tahmini üretmez” demek yanlış.** Chat advisor'ın belirli testte yüzde vermeyi reddetmesi, ayrı outlook fonksiyonunun aralık üretmediği anlamına gelmiyor.

### 15.3. Açık risk / karar

Bu formül için temsili başvuru sonuçlarıyla istatistiksel doğrulama kanıtı bulunmadı. Geniş aralık, düşük confidence veya disclaimer bir heuristiği kalibre olasılığa dönüştürmez.

Bir sonraki ürün/güvenlik incelemesinde şu karar açıkça alınmalı: sayısal aralıklar pilot öncesinde kapatılacak mı, daha güçlü veri yeterlilik kapısıyla mı korunacak, yoksa yalnızca araştırma modunda mı kalacak? Bu rapor kodu değiştirmedi ve kurucu adına karar vermedi; fakat bu alanı yüksek öncelikli güven riski olarak işaretliyor.

Özellikle seyrek profilde sınıflandırmanın ve sayısal aralığın hangi confidence eşiğinde gösterildiği tekrar test edilmeli. “Not enough data” söylerken aynı ekranda anlamlıymış gibi yüzde göstermek çelişki yaratabilir.

---

## 16. Fırsat motoru: Katalog, uygunluk ve öneri birbirinden farklı

### 16.1. Katalog

Tek `opportunities` tablosu; kategori, organizatör, açıklama, resmî ve başvuru URL'si, ülke, remote/location mode, yaş/sınıf/vatandaşlık/ikamet koşulları, alanlar, ücret, aid/funding, tarihler, kaynak ve durumlar içeriyor.

Kategoriler competition, research, internship, summer_program, fellowship, scholarship, volunteering, entrepreneurship, hackathon, academic_program, conference, student_program, online_program. Son kategorinin her facet listesinde tutarlı bulunup bulunmadığı ayrıca kontrol edilmelidir; `getOpportunityFacets()` içinde görülen sabit liste online_program'ı içermiyor.

### 16.2. Bugünkü sayıların doğru anlamı

| Ölçüm | Sayı |
|---|---:|
| Tüm fırsatlar | 421 |
| Active | 276 |
| Under review | 122 |
| Disabled | 22 |
| Expired | 1 |
| Tüm statülerde verified_current | 207 |
| Active + verified_current | 204 |
| Active + unverified | 72 |

Active kayıtların yaklaşık %73,9'u verified_current. Bu, eski stratejide hedeflenen en az %90 seviyesine henüz ulaşmadığını gösterir. Ayrıca “verified_current” satırları da gerçek kaynak tazeliğiyle yeniden sınanmalıdır.

### 16.3. Kategori dengesi

| Kategori | Toplam | Tarih/durum/doğrulama alt kümesi |
|---|---:|---:|
| Yaz programı | 245 | 38 |
| Yarışma | 101 | 50 |
| Araştırma | 20 | 6 |
| Staj | 9 | 5 |
| Burs | 9 | 7 |
| Öğrenci programı | 7 | 6 |
| Gönüllülük | 7 | 5 |
| Girişimcilik | 7 | 3 |
| Online program | 6 | 5 |
| Fellowship | 5 | 5 |
| Akademik program | 3 | 0 |
| Konferans | 2 | 2 |
| Hackathon | 0 | 0 |

Alt küme koşulu: `active`, `verified_current`, cycle `closed/historical/discontinued` değil, deadline yok veya 28 Ağustos'tan önce değil. Toplam **132**. Öğrenciye özel uygunluk, commercial gate, veri kanıtı ve diğer çalışma anı filtrelerini içermez. **“132 fırsat her öğrenciye önerilebilir” anlamına gelmez.**

Yaz programı + yarışma toplamı 346 / 421 ≈ %82,2. Öğrencinin ihtiyacı liderlik, community impact veya araştırma derinliği olduğunda katalog aynı güçlü kapsama sahip değil.

### 16.4. Alan tamlığı

| Alan | Dolu / işaretli |
|---|---:|
| `eligible_countries` listesi | 40 |
| Açık uluslararası uygunluk flag'i | 16 |
| Deadline | 82 |
| Cost | 111 |
| `verified_at` boş | 206 |
| Her iki doğrulama tarihi de boş | 15 |
| `organization_entity_id` dolu | **0** |

40 ülke listesi ve 16 açık uygunluk flag'i aynı satırda bulunabilir; toplanarak benzersiz kapsama oranı çıkarılmamalıdır. Ülke listesi boş diye hiçbir uygunluk bilgisi yok da denemez: vatandaşlık veya açıklama başka alanlarda bulunabilir.

Organizatör canonical bağlantısının sıfır olması özellikle önemli. Registry var ama fırsat organizatörleri ona bağlanmış değil. Bu; güvenilir organizatör filtresi, ortak kimlik, görsel yeniden kullanımı ve deneyim eşleştirmesi açısından eksik bir bağlantı katmanı.

### 16.5. Üç farklı durum ekseni

- `status`: moderasyon/yayın seçimi; active, under_review, disabled vb.
- `cycle_status`: fırsatın başvuru dönemi; open, upcoming, closed, historical vb.
- `verification_state`: bilgiye ilişkin doğrulama durumu.

Aktif olması başvurunun açık olduğunu, doğrulanmış olması deadline'ın geçmediğini, yüksek match skoru da öğrenci uygunluğunun kanıtlandığını göstermez. Son haftanın pek çok düzeltmesi bu eksenlerin birbirine karıştırılmasından çıkmış.

### 16.6. Browse ile For You / Counselor

Browse, aktif katalogdaki bir kaydı kapalı cycle olsa da gösterebilir; çünkü kayıt hâlâ gerçek bir fırsatı temsil eder. Ama “şimdi başvur” veya “senin en iyi sonraki adımın” gibi öneri yüzeyleri daha sıkı kontrol ister.

Eski `opportunity_matches.eligible=true` kaydı koşullar değişince kendiliğinden silinmediği için, okuma anında lifecycle yeniden değerlendirilir. Bu özellikle geçmiş deadline'lı kaydın “Strong match” olarak geri gelmesini önler.

### 16.7. Commercial / pay-to-enroll ayrımı

Kod, ücreti 100'ün üzerinde olup seçiciliği materyal olarak selective sayılmayan fırsatı çekirdek öneriden çıkarıyor. Selective/highly/extremely selective ve competitive award istisnaları var. Browse'dan silinmiyor.

Bu eşik para biriminden bağımsız, çünkü `opportunities.cost_currency` canlıda yok. Ücret null ise pay-to-enroll filtresi devreye girmiyor. Seçicilik kanıtı bazı ingestion yollarında kontrol edilse de ayrı kalıcı alan olarak tutulmadığından okuma anında P1 kanıtı doğrulanamıyor.

Sonuç: iyi niyetli ve yararlı bir koruma, fakat eksik ücret/para birimi/seçicilik kanıtı yüzünden tam güvence değil. Eşik artık tek başına “bilimsel değer” ayrımı gibi sunulmamalı.

### 16.8. Research ile publication venue ayrımı

Bir dergiye çalışma göndermek, araştırma yapma fırsatıyla aynı şey değildir. Öğrencinin tamamlanmış araştırması yoksa dergi önerisi anlamsız olabilir. Bunun için #157 açık PR'ında `publication_venue` kategorisi ve altı kayıt reclassification paketi var.

Henüz main'e birleşmiş veya canlı kategori olarak uygulanmış değil. “Araştırma fırsatı sayısı” bugün bu nedenle semantik olarak da incelenmeli. Publication venue kategori düzeltmesi tek başına “tamamlanmış eser gerekir” ön koşulunu modellemez.

---

## 17. Veri edinimi, canonical kimlik ve araştırma işletimi

### 17.1. Dış sağlayıcılar

| Sağlayıcı | Amaç | Bugünkü bağlantı sonucu |
|---|---|---|
| Anthropic | Advisor, plan, CV, refinement, araştırma fikri, structured extraction | OK |
| Tavily | Search → extract → güncel resmî kaynak bulma | Bu checkout'ta credential yok |
| College Scorecard | ABD kurum istatistikleri | Bu checkout'ta credential yok |
| OpenAlex | Literatür ve araştırma temaları | OK |
| Supabase | Uygulama verisi, auth, storage | Public ve secret client OK |

Eksik Tavily/Scorecard anahtarı katalogdaki mevcut veriyi silmez veya uygulamanın her bölümünü durdurmaz. Yeni keşif ve ilgili senkronizasyon yollarını kısıtlar. Başka worktree'de anahtar bulunabilir; bu ölçüm ana çalışma kopyasına aittir.

### 17.2. Kaynak ekosistemi

Depoda Scorecard ve OpenAlex'in yanında ROR, kurumsal resmî sayfalar, resmî program katalogları, ulusal veri kaynakları, YÖK Atlas, QS kaynaklı çalışma paketleri ve Wikimedia/OpenGraph görsel yolları için araçlar bulunuyor.

Her ülke için tek bir “Avrupa admissions API” varsayılmamış. Ülke bazlı araştırma ve katalog edinim script'leri oluşmuş. Ancak master spec'teki her hayalî provider arayüz adının bire bir concrete class olarak uygulandığı varsayılmamalı; gerçek modüller `lib/providers`, `lib/acquisition`, `lib/admissions` ve `scripts` altında dağılıyor.

### 17.3. Araştırma → canlı veri akışı

```text
Kaynak keşfi
  → resmî sayfa ve kanıt
  → yapılandırılmış araştırma kaydı
  → şema/sözleşme doğrulaması
  → bağımsız kaynak kontrolü
  → canonical kimlik ve dedup
  → dry-run
  → yetkili apply
  → canlı yeniden ölçüm
```

Araştırma dosyası, doğrulayıcı raporu, dry-run ve DB'ye uygulanmış kayıt birbirinden farklı teslimatlar. Adelaide örneğinde doğrulanmış bir Avustralya paketi bilerek yüklenmemiş; “verified file var, öyleyse live count'a ekle” hatası birkaç kez yaşanmış.

### 17.4. Kanıt seviyeleri

Araştırma paketlerinde P1 ve diğer P seviyeleri kullanılıyor. Özellikle P1 doğrudan birincil kaynağa dayalı kanıtı ifade ediyor. P2/P3 gibi etiketlerin tam anlamı ilgili paket sözleşmesinden okunmalı; bütün belgelerde tek ve kusursuz sabit anlamları olduğu varsayılmamalı.

Arama sonucu snippet'i, açılmış resmî sayfa ve kaynağın gerçekten belirttiği veri aynı kanıt düzeyinde değil. Erişilemeyen kaynak için düşük kanıt düzeyini açıkça saklamak, resmî domain gördüğünü doğrulama saymaktan daha doğru.

### 17.5. Canonical Entity Registry

Canlıda 1.174 canonical entity satırı bulunuyor. İlgili tablolar; aliases, external IDs, evidence, record links, relationships, locations, merge kayıtları, field policies ve verification queue.

Amaç UCL ile University College London'ı iki üniversite yapmamak; Türkçe/İngilizce okul adlarını, kısaltmaları ve aksan farklarını doğru aramak. Unicode normalizasyonu ve Türkçe ı/i dönüşümü için özel mantık var.

Canonical öneri ilk seçenek; bulunmazsa custom giriş açıkça işaretlenir. Öğrencinin yeni yazdığı okula sırf registry satırı oluştu diye “verified” denmemeli. Kimlik çözümleme ile doğrulama birbirinden bağımsızdır.

### 17.6. Program pipeline'ındaki özel karmaşıklıklar

- Dil aynı programın kimliğini değiştirebilir.
- Aynı isim farklı derece türü veya okul altında olabilir.
- Türkçe/İngilizce program adı eşleştirmesi gerekir.
- YÖK placement verisi cycle/yıl ile anlam kazanır.
- `kilavuz_kodu` gibi kaynak kimliği olmadan URL ve isim bazlı eşleştirme sınırlıdır.
- 0057 `kilavuz_kodu` migration dosyası var; canlı kolon bu oturumda bulunmadı.
- Yeni enum değeri veya dedup anahtarı, mevcut ingestion ve replay yollarıyla birlikte ele alınmalı.

### 17.7. Araştırma birikimi ile çalışan ürün farkı

Ülkelerin kabul sistemleri, ortaöğretim sistemleri, AP/IB/A-Level, Türkiye sınavları, lise kimlikleri, major family'leri, gelişim boyutları, öneri zamanlaması, doyum/diminishing returns, unsafe inference kuralları ve açıklanabilirlik üzerine geniş belgeler var.

Bu belgelerin varlığı, hepsinin çalışma anında advisor tarafından otomatik okunduğu veya her kuralın executable hale geldiği anlamına gelmez. `lib/` import zinciri ve ilgili fonksiyonun gerçekten tükettiği veri ayrıca izlenmelidir.

İki danışmanlık araştırma dalının aynı belgeleri farklı yazması nedeniyle `.ALT-main-lineage.md` ve conflict notice dosyaları korunmuş. Bunlar silinecek rastgele duplicate değil; uzlaştırılmamış/korunmuş alternatif bilgi geçmişidir.

---

## 18. Güvenlik: Bugün doğrulanan korumalar ve açıklar

### 18.1. Doğru kurulmuş temel

Canlı `public` şemasındaki 87 tablonun tamamında RLS açık. Buna dokuz backup tablosu da dahil; 87, ürünün kullanıcıya görünen 87 özelliği olduğu anlamına gelmez.

Uygulama; kullanıcı kapsamlı sorgular, server-only modüller, yükseltilmiş anahtarın ayrılması, özel dosya bucket'ları, auth DAL, güvenli yönlendirme, rate limit, action ownership ve bazı adversarial regression test'lerine sahip.

**RLS açık olması tek başına yeterli değildir.** “Kullanıcı kendi satırını değiştirebilir” kuralı, aynı satırdaki `is_admin`, sistem skoru veya verification status gibi alanları da değiştirilebilir bırakabilir. Bu proje bu sınıftan gerçek sorunlar yaşamış.

### 18.2. Anonim public profile erişimi — eski iddia güncel değil

Eski belgeler anonim kişinin public profilleri okuyabildiğini söylüyor. Bugün canlı `public_profiles` view tanımında `auth.uid() IS NOT NULL` şartı var. Headline/about dahil sınırlı alanlar ve bağlantı kurallarıyla çalışıyor.

Bu metadata, eski anonim okuma açığını kapatmaya yönelik davranışın mevcut olduğunu doğruluyor. Bu oturumda gerçek anonim HTTP saldırı denemesi yapılmadı; tam penetrasyon testiyle aynı kanıt düzeyi değil. Migration listesinde 0061 adı görünmüyor; görünüm ise değiştirilmiş. Bu durum **şema ile migration ledger arasında drift** olduğunu gösteriyor.

### 18.3. Kendini admin yapma — koruma canlıda var

`profiles_00_guard_protected_columns` trigger'ı canlıda mevcut. `is_admin` update'i sırasında çalışıyor. Fonksiyon, normal doğrudan kullanıcı güncellemesinde eski admin değerini koruyor; service_role ve belirli trigger bağlamlarını ayrı tutuyor.

Bu nedenle “her kullanıcı bugün hâlâ kendini admin yapabilir” diye kesin yazmak güncel ölçümle çelişir. 0062'nin hedeflediği koruma canlı metadata'da var. Yine bu, auth kullanıcılarıyla bütün saldırı yollarının yeniden test edildiği anlamına gelmez.

### 18.4. Hesaplanmış değerlerin değiştirilmesi — açık kalan alan

Canlıda aşağıdaki tablolar için `owner full access` ALL politikası görülüyor:

- `profile_scores`
- `profile_score_snapshots`
- `opportunity_matches`
- `student_requirement_evaluations`
- `evidence_files`
- `ai_recommendations`

0063'te beklenen computed-value guard trigger'ları bu tablolarda bulunmadı. 0065'te tasarlanan INSERT/UPDATE policy ayrımı da görünmüyor. `profiles` üzerindeki mevcut koruma yalnızca `is_admin` güncellemesine bağlı; score/completeness alanlarını kapsamıyor.

Bu, kullanıcıya ait olsa bile sistem tarafından üretilmesi gereken değerlere ham API üzerinden müdahale riskinin sürdüğünü gösterir. Örneğin kanıt statüsü, eligible flag'i, skor veya geçmiş snapshot'ın kullanıcı tarafından yazılabilmesi ürünün güvenilirlik iddiasını zedeler.

Bu raporda yanlış veri ekleyerek exploit yeniden denenmedi. Bulgular canlı politika/trigger incelemesi ile önceki adversarial test raporlarının birlikte değerlendirilmesine dayanıyor. **Pilot öncesi yüksek öncelikli güvenlik kapısıdır.**

### 18.5. Şikâyet kaydının yanlış kişiye yöneltilmesi

Canlı `message_reports` INSERT politikasında yalnızca `reporter_id = auth.uid()` şartı var. Şikâyet edilen kişinin referans verilen mesajın göndericisi veya recommendation yazarıyla aynı olduğunu doğrulayan 0064 kontrolü görünmüyor.

Geçmiş test bunu gerçek yanlış suçlama kaydıyla doğrulamıştı. Bu oturumda tekrar sahte rapor oluşturulmadı. Mevcut politika, tarihsel açık sınıfını hâlâ kapatmıyor. Reşit olmayan kullanıcılar ve moderasyon kararları açısından yalnızca kozmetik hata olarak görülemez.

### 18.6. 0063–0065 için uygulanabilir sonraki adım

Bu dosyalar “tamamlandı” diye körlemesine çalıştırılmamalı. İlgili mevcut schema/policy ile karşılaştırılmalı, bağımlı admin-write kodu kontrol edilmeli, yetkili migration kararı alınmalı, ayrı test hesaplarıyla INSERT ve UPDATE doğrulanmalı ve normal kullanıcı akışının bozulmadığı görülmeli.

Bu rapor hiçbir DDL, migration, policy değişikliği veya öğrenci kaydı değişikliği yapmadı. Kurucunun bu alanlar için geçmişte açık yetki sınırları koymuş olması nedeniyle rapor talebi, değişiklik yapma yetkisi olarak yorumlanmadı.

### 18.7. Supabase security advisor sonucu

28 Ağustos snapshot: **1 ERROR, 6 WARN, 23 INFO**.

- ERROR: `public_profiles` SECURITY DEFINER view.
- WARN: `pg_trgm` ve `unaccent` public şemada.
- WARN: `is_blocked_between` anonim/signed-in rollerden çağrılabilen SECURITY DEFINER fonksiyonu.
- WARN: custom entity oluşturma fonksiyonu signed-in rolünden SECURITY DEFINER olarak çağrılabiliyor.
- WARN: leaked-password protection kapalı.
- INFO: çeşitli iç/backup/queue tablolarında RLS açık, normal kullanıcı policy'si yok.

Bu uyarılar eşit ağırlıkta değildir. İç kuyrukta policy olmaması bilerek normal kullanıcı erişimini kapatıyor olabilir. SECURITY DEFINER view de tasarım nedeniyle seçilmiş olabilir; dar field whitelist ve erişim koşulları ayrıca incelenmelidir. Önceki “accepted” etiketi bugünkü riski kendiliğinden kapatmaz; aynı şekilde linter ERROR tek başına mevcut veri sızıntısı kanıtı değildir.

İlgili resmî açıklamalar: [Security Definer View](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view), [SECURITY DEFINER RPC erişimi](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [parola koruması](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

### 18.8. Dosya güvenliği

Canlı storage:

| Bucket | Public? | Anlam |
|---|---|---|
| `evidence` | Hayır | Öğrenci kanıt belgeleri |
| `cv-uploads` | Hayır | CV belgeleri |
| `university-images` | Evet | Ortak kurumsal görseller |

Evidence upload'da uygulama limiti 15 MB, CV'de 10 MB. Canlı evidence/CV bucket seviyesinde `file_size_limit` null; uygulamadaki limitin bütün doğrudan storage yollarını güvenceye aldığı varsayılmamalı. Üniversite görsel bucket'ında 5.000.000 byte sınır görülüyor.

Kanıt erişimi signed URL ile. Polymorphic `linked_table` + `linked_id` için normal SQL foreign key yok; uygulama allow-list ve target ownership kontrolü kritik. Gerçek antivirüs/malware taraması veya bağımsız belge doğrulaması bu incelemede doğrulanmadı.

### 18.9. Hesap silme ve export

Settings içinde hesap silme ve `/api/export-data` üzerinden dışa aktarma var. Kullanıcıya ait satırlar FK cascade ile silinmek üzere tasarlanmış; global üniversite/fırsat verisi bundan etkilenmemeli. Storage temizliği, session geçerliliği, saklama politikası ve bütün sosyal ilişkilerin silme davranışı ayrı uçtan uca test gerektirir.

Bu oturumda hesap silinmedi, dosya silinmedi, kullanıcı export'u indirilmedi. Kodda bu özelliklerin bulunması, bugünkü bütün kenar durumlarının doğrulandığı anlamına gelmez.

---

## 19. Sosyal özellikler: Yapılmış, gizlenmiş ve gerçekten kapalı olanlar

### 19.1. Geçmiş karar gerilimi

Orijinal spec V1'de öğrenci mesajlaşması istemiyor. 15–18 Ağustos ürün kararlarında Connections ve keşif MVP'ye dahil edilmiş. 21 Ağustos yönelimiyle Connections/Messages ana navigasyondan kaldırılmış. Daha sonra tam sosyal katman için posts/likes/reposts kodu hazırlanmış ama kullanıcıya açılmamış.

Drive Product & MVP Decision Register'ın eski bölümünde hâlâ “Connections MVP'de kalır” yazıyor. Güncel kod navigasyonda gizli. Bir sonraki AI, eski Drive paragrafını gerekçe göstererek özelliği kendiliğinden açmamalı; kapsam tarihi ve geçerli kullanıcı talimatı önemli.

### 19.2. Var olan sosyal yetenekler

- Opt-in görünür profil.
- Karşılıklı onaylı connection request/accept/decline.
- Engelleme ve görünürlük kısıtları.
- İnsan arama ve People You May Know yaklaşımı.
- Ortak okul, deneyim veya bağlantı gibi kısa gerekçeler.
- Skill endorsement ve recommendation yazıları.
- Featured içerik ve contact visibility.
- Profil görüntüleme mantığı.
- 1:1 mesaj altyapısı, realtime güncellemeler ve şikâyet kuyruğu.

Canlı connections ve messages sayısı bugün 0. Bu, gerçek sosyal ürün kullanımının kanıtlanmadığını gösterir; route'ların yok olduğu anlamına gelmez.

### 19.3. Gerçekten kapalı feed katmanı

`ORYN_ENABLE_SOCIAL_FEED` yalnızca tam `true` değeriyle açık kabul ediliyor. Flag tek savunma değil:

1. Feed/post route'u yok.
2. Navigasyon veya mevcut sayfalardan link yok.
3. Mutation fonksiyonları public Server Action olarak export edilmemiş.
4. Data-layer girişleri flag kontrolü yapıyor.
5. 0058 migration'ının gerektirdiği post tabloları canlıda bulunmadı.

Bu tasarım için hidden-state testleri var. Gelecekte açmak yalnızca env değiştirmek değildir; route/action/schema ve hukuki/moderasyon koşullarının birlikte ele alınması gerekir.

### 19.4. Henüz tamamlanmış sayılmayanlar

Tam güvenlik politikası, moderasyon operasyonu, suspension/ban iş akışı, yaşa uygun iletişim kapsamı, kötüye kullanım inceleme kapasitesi ve reşit olmayanlar için gerekli ürün/hukuk kararları tamamlanmış varsayılmamalı.

---

## 20. Tasarım sistemi ve kullanıcı deneyimi

### 20.1. Güncel yön: Editorial Intelligence

UI V3 açık, sıcak kâğıt hissi veren zemin; güçlü fakat sakin tipografi; logo mavisi; gerekçe ve aksiyonu öne çıkaran editoryal hiyerarşi kullanıyor. Eski koyu varsayılan tasarım bugünkü yön değil. CSS'te dark token bulunması kullanıcıya dark mode toggle sunulduğu anlamına gelmez.

Tipografi: Manrope gövde/UI, Fraunces seçilmiş başlıklarda, Geist Mono sayısal/monospace kullanımda. Bütün başlıkların serif olması amaçlanmıyor; yorum ve karar başlığı ile düğme/dialog başlığının görsel rolü ayrı.

### 20.2. Oryn bileşen dili

- `NextMove`: iddia, gerekçe, kanıt, aksiyon ve gerekli caveat'ı birlikte taşır.
- `InsightCard`: veriyi tekrar etmek yerine yorum sunar.
- `ActionCard`: öncelik rayı, süre ve impact ile aksiyon.
- `EvidenceSignal`: destekleyici gerçek/kanıt.
- `ConfidenceIndicator`: güven düzeyini gösterir.
- `SourceBadge`: kaynak, güncellik ve bağlantı.
- `DeadlineBadge`: ortak aciliyet görseli.
- `StatusBadge`: anlamı tutarlı durum etiketi.
- `MediaImage`: gerçek fotoğraf → logo → tasarlanmış fallback.
- `EmptyState` / `ErrorState`: boş veya kullanılamayan veriyi dürüst ve yardımcı anlatır.

Sıcak öneri zemininin ekran başına sınırlı kullanılması hedefleniyor. Her şeyi büyük kutulu kartlara bölmek yerine içerik ağırlığıyla hiyerarşi kuruluyor.

### 20.3. Responsive yapı

Desktop shell breakpoint'i `lg`/1024. Eski `md` sınırında navigasyon taşması yaşanmış. Arama alanı bazı aralıklarda ikon hâline daralıyor; aynı CommandPalette'in iki instance'ı açılıp iki klavye dinleyicisi kurulmamalı.

Mobilde sabit alt bar için padding içerik container'ında; yanlış yere spacer eklemek üstte boşluk yaratıp altta örtüşmeyi çözmeyebiliyor. Uzun etiketler için `shortLabel` ve accessible tam label ayrılmış.

### 20.4. Görseller

Üniversite görselleri edinim hattı ve public storage üzerinden sunulabiliyor. Fırsatlar için aynı seviyede image alanı/edinim hattı yok. Bütün kartlarda anlamsız dev monogram bantları üretmek reddedilmiş; gerçek görsel yoksa sahte stok fotoğrafla doldurulmuyor.

### 20.5. Erişilebilirlik

Reduced-motion global olarak kullanılıyor. Haritanın klavye/screen reader alternatifi var. Ortak UI primitive'leri erişilebilir etkileşim için kullanılıyor.

Tarihsel “dialog focus trap kesin bozuk” bulgusu daha sonra geri çekilmiş; bunu güncel açık gibi taşımamak gerekiyor. Buna karşılık tüm ekranların klavye, ekran okuyucu, kontrast ve dar viewport kontrolleri bugün yeniden yapılmadı. “Tam WCAG uyumlu” iddiası için kanıt yok.

### 20.6. Development preview

`/design-preview` ve onboarding preview gerçek sunum bileşenlerini fixture verilerle gösteriyor. Production'da `notFound()` ile kapalı. Bu fixture'ların üretimde gerçek öğrenci verisi gibi sunulmaması önemli.

Preview screenshot'ı bir veritabanı işleminin çalıştığını kanıtlamaz. UI doğrulama ve canlı kullanıcı akışı doğrulama ayrı olmalıdır.

---

## 21. Uluslararasılaştırma ve yerelleştirme

Kurucu uzun vadede Türkçe, İspanyolca, Rusça, Çince gibi dilleri istiyor; bugün bütün ürünü çok dile çevirmek değil, sonradan yeniden yazmayı gerektirmeyen temel hedeflenmiş.

Mevcut durum:

- İngilizce UI; root `lang='en'`.
- Message catalog/i18n framework kurulmuş değil.
- Çok sayıda kullanıcı metni inline JSX'te.
- `lib/i18n/format.ts` sayı/para biçimlendirme için ortak fonksiyonlar sunuyor.
- Canonical ID ile gösterim etiketi çoğunlukla ayrılmış.
- Unicode/alias arama normalizasyonu mevcut.
- Tarih, çoğul ve metin uzunluğu için bütün ürün boyunca tam locale akışı yok.

Dolayısıyla “global veri modeli var” doğru; “tam localization-ready, sadece çeviri dosyası eklemek yeterli” doğru değil. Ülke, müfredat, dil ve para birimi semantiği; UI çevirisinden daha büyük bir iş.

Konum kişiselleştirmesi şimdilik daha çok ülke düzeyinde. Öğrencinin opsiyonel city bilgisi var; fırsatların şehir bazlı yapısı ve gerçek “yakınımda” sıralaması tamamlanmış değil. Sürekli GPS toplama yok ve bunun eklenmesi sıradan bir polish işi olarak görülmemeli.

---

## 22. Operasyon, hosting ve tazelik sistemi

### 22.1. Environment değişkenleri

`.env.example` temel değişkenleri listeliyor:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
ANTHROPIC_API_KEY
ANTHROPIC_MODEL
TAVILY_API_KEY
COLLEGE_SCORECARD_API_KEY
OPENALEX_CONTACT_EMAIL
CRON_SECRET
NEXT_PUBLIC_APP_URL
```

Gerçek değerler rapora alınmadı. `.env*` dosyaları gitignore'da, `.env.example` istisna. `NEXT_PUBLIC_` anahtarlarının build sırasında tarayıcıya gidebileceği unutulmamalı; yükseltilmiş anahtar bu prefix ile tanımlanmamalı.

### 22.2. Sağlık bilgisi ile gerçek sağlık farkı

`provider_health` tablosunda görülen tek satır OpenAlex için 17 Ağustos tarihli degraded durumuydu. Bugünkü gerçek minimal OpenAlex çağrısı başarılı. Bu, health tablosunun sürekli güncel izleme sistemi gibi yorumlanmaması gerektiğini gösteriyor.

Sağlık kaydı, entegrasyonun en son hangi kod yolunda loglandığını gösterebilir; o andaki gerçek servis erişimini ayrıca sınamak gerekir. “Tabloda degraded, öyleyse bugün çalışmıyor” yanlış.

### 22.3. Job yolları

| Endpoint | İş |
|---|---|
| `/api/jobs/discover-opportunities` | Fırsat keşif pipeline'ı |
| `/api/jobs/discover-requirements` | Üniversite şartı keşfi |
| `/api/jobs/sync-university-data` | Üniversite veri senkronizasyonu |
| `/api/jobs/deadline-reminders` | Mevcut tarihlerden hatırlatma |

Bu listede kaynakları periyodik yeniden doğrulayan kapsamlı ayrı iş tamamlanmış değil. Haftalık plan üretim fonksiyonları var; bütün öğrenciler için düzenli plan üreten dış scheduler'ın çalıştığına ilişkin kanıt bulunmadı.

### 22.4. Tazelik problemi

Bugün iki farklı opportunity timestamp'i var: `verified_at` ve `last_verified_at`. Geçmiş pipeline'lar bunları aynı anlamda kullanmamış. İnsan tarihli review, otomatik import veya search sonucu kaydetme birbirine karışabiliyor.

Doğru gelecek modelinin “resmî kaynak başarıyla açıldı, karar açısından önemli gerçekler doğrulandı ve kanıtı saklandı” anlamına gelen ayrı bir olay/timestamp üretmesi gerekiyor. Kaynağa erişilememesi fırsatın yok olduğu anlamına gelmez; HTTP 200 de sayfanın gerçekten doğru programı ve güncel cycle'ı anlattığını kanıtlamaz.

#150 açık PR'ı scheduler'dan bağımsız bir reverification tasarımını ve daha açık timestamp semantiğini getiriyor. Tasarım dokümanı; çalışan job, uygulanmış migration veya açık scheduler değildir.

### 22.5. Hosting

Görülebilen Vercel takımındaki 10 proje incelendi; Oryn adına veya `akirik28/ORYN` bağlantısına sahip proje yok. Çalışma kökünde `.vercel/project.json` da bulunmadı.

Bu nedenle doğrulanmış bir production URL veya deploy ID verilemiyor. Başka Vercel hesabında, başka host'ta veya tünelde çalışan sürüm ihtimali dışlanmadı. Supabase'in internetten erişilebilir olması, Next.js frontend'in üretime dağıtıldığı anlamına gelmez.

### 22.6. Observability ve maliyet

`ai_usage`, `provider_health`, `external_sync_jobs`, `product_events` gibi temel tablolar var. Bunlar tam bir hata izleme, alarm, uptime, performans ve maliyet raporlama ürünü değildir. Sentry benzeri bir production monitoring entegrasyonu bu incelemede doğrulanmadı.

Maliyet kontrolünde sonraki ihtiyaçlar: kullanıcı/özellik bazlı tavan, eşzamanlı çağrı rezervasyonu, retry dahil gerçek tüketim, sağlayıcı faturasıyla uzlaştırma, prompt/yanıt boyutu sınırları ve tazelik işlerinin ortak veri üzerinde batch çalışması.

---

## 23. Test ve doğrulama: Bu raporda gerçekten ne çalıştırıldı?

### 23.1. Yerel çalışma klasörü

`npm run lint`: exit 0.
`npm run typecheck`: exit 0.
`npm run test`: 167 dosya; 166 başarılı, 1 başarısız. 2.476 test başarılı, 3 başarısız.

Üç failure aynı kökten: `data/research/university-requirements/retrieved_at_backfill_2026-08-23.sql` dosyası JSONL corpus dizininde bulunuyor. `classifyCorpusFiles` tanımadığı dosyayı sessizce atlamak yerine ingestion'ı durduruyor. Dosya rapor öncesinde zaten untracked idi; bu çalışma tarafından oluşturulmadı.

**Bu testleri yeşile çevirmek için dosya silinmedi, taşınmadı veya test kuralı gevşetilmedi.** Kullanıcı rapor istediği için gerçek durum kaydedildi.

### 23.2. Temiz kaynak kontrolü

Aynı main commit'inden `/tmp` altında ayrı yerel git klonu oluşturuldu; mevcut node_modules kullanılarak testler çalıştırıldı. Sonuç: **167 dosya, 2.479 test, tamamı başarılı.**

Bu, mevcut failure'ın commit edilmiş kaynaktan değil çalışma ağacındaki ek corpus dosyasından kaynaklandığını ayırıyor. Bağımlılıklar yeniden `npm ci` ile kurulmadı; temiz source doğrulaması, temiz dependency install deneyi değildir.

Test çıktılarında bazı expected git/jsdom stderr mesajları var; sıfır test failure olması “hiç console mesajı yok” anlamına gelmez. UI'daki üretim console durumu ayrıca browser testi ister.

### 23.3. Production build

İlk `npm run build`, Google Fonts erişimi yüzünden Fraunces, Geist Mono ve Manrope fontlarını indiremedi. Yetkili ağ erişimiyle tekrar denendiğinde bu kez Turbopack CSS işleme alt sürecinin port açması `Operation not permitted` ile engellendi. Ek izin gerekçesiyle sonraki deneme de aynı ortam engeline takıldı.

**Sonuç: Yerel build bu oturumda doğrulanamadı.** Bu çıktı tek başına uygulama kodunda derleme hatası olduğunu kanıtlamıyor; ama “bugün yerelde build geçti” denemez. Farklı bundler'a geçilip onun sonucu asıl Turbopack build'i geçmiş gibi gösterilmedi.

### 23.4. GitHub CI

Aynı `f7af914` commit'inin GitHub Actions CI çalışması başarılı. Run ID `32774560018`, oluşturulma 24 Ağustos 20:33:29 UTC. Workflow; `npm ci`, lint, typecheck, test ve build içeriyor. Gerçek dış sağlayıcı kontrollerini CI secrets olmadan bu job'a dahil etmiyor.

Kaynak: [ilgili GitHub Actions çalışması](https://github.com/akirik28/ORYN/actions/runs/32774560018).

### 23.5. Gerçek entegrasyon kontrolü

Mevcut `npm run check:integrations` script'i gerekli izinle çalıştırıldı. Sonuç: Supabase, secret client, Anthropic, OpenAlex OK; Tavily ve College Scorecard credential eksik. Script küçük API çağrıları yapar; UI veya tam ürün kalitesi testi değildir.

### 23.6. Önceki canlı testler

- 22 Ağustos MVP checklist audit'i 16 maddeyi yürümüş; o tarihte 14/16 sonucu raporlanmış.
- 23 Ağustos ilk gerçek Counselor artifact'i ve plan/sohbet/time-budget gözlemleri var.
- 24 Ağustos Gate 2, danışman için PASS veriyor; iki gerçek kusur düzeltilmiş ve tekrar gözlenmiş.
- Gate 2'nin bazı journey alt adımları SQL veya farklı persona üzerinden kontrol edilmiş; her şey tek hesapta ve her ekran tıklanarak tamamlanmış değil. Rapor bunu açıkça belirtiyor.

Bu rapor yeni bir authenticated browser E2E, mobil screenshot seti veya penetrasyon testi gerçekleştirmedi. Önceki testleri güncelmiş gibi tekrar etiketlemedi.

---

## 24. Git, açık PR'lar ve çalışma alanının gerçek durumu

### 24.1. Main temizliği ile çalışma klasörü temizliği aynı şey değil

Yerel main ve GitHub main aynı commit'te. Bununla birlikte bu raporun çalışması başlamadan önce 51 izlenmeyen dosya ve değiştirilmiş `next-env.d.ts` vardı. İzlenmeyen dosyaların büyük bölümü araştırma çıktıları, veri uygulama/teşhis script'leri ve handoff belgeleriydi. Bunlar otomatik olarak güvenilmez veya gereksiz değildir; fakat commit edilmiş, CI tarafından değerlendirilmiş ve ana ürünün parçası olmuş sayılmazlar.

`next-env.d.ts` değişikliği Next'in ürettiği tip import yolunun `.next/types/...` yerine `.next/dev/types/...` olmasıyla ilişkiliydi. Rapor hazırlanırken kullanıcıya ait bu değişiklik geri alınmadı.

Özellikle `data/research/university-requirements/retrieved_at_backfill_2026-08-23.sql`, araştırma corpus dizinindeki dosya sözleşmesine uymadığı için üç testi kırıyor. Bunun çözümü raporlama görevi kapsamında yapılmadı. Sonraki geliştirici dosyanın sahibini, içeriğini ve doğru yaşam döngüsünü anlayarak karar vermeli; sırf test geçsin diye corpus denetimini gevşetmemeli.

### 24.2. Açık üç PR

| PR | Kapsam | Henüz yapmadığı şey |
|---|---|---|
| [#150](https://github.com/akirik28/ORYN/pull/150) | Fırsat yeniden doğrulama tasarımının ikinci revizyonu; zaman damgası semantiği, scheduler'dan bağımsız sözleşme, lease yaklaşımı | Çalışan scheduler kurmaz; migration uygulamaz; fırsatları yeniden doğrulamaz |
| [#155](https://github.com/akirik28/ORYN/pull/155) | Para birimi şema paketi; `cost_currency` için ISO 4217 biçimi ve kanıta dayalı backfill yaklaşımı | Canlıya currency kolonu eklemez; mevcut maliyetleri dönüştürmez; UI düzeltmesini teslim etmez |
| [#157](https://github.com/akirik28/ORYN/pull/157) | `publication_venue` kategorisi ve altı dergi kaydı için yeniden sınıflama dry-run'ı | Enum'u canlıya eklemez; altı kaydı gerçekten taşımaz; tamamlanmış araştırması olmayan öğrenci için uygunluğu çözmez |

Üçü de **tasarım/şema paketi niteliğinde**. “PR var” ile “ürün artık yapıyor” birbirine karıştırılmamalı.

Özellikle para birimi için ülkeden tahminle toplu backfill yapılmaması önemli. Bir fırsat Türkiye'de düzenlenip USD, Avrupa'da düzenlenip GBP cinsinden fiyatlanabilir. Üniversite istatistikleri ve program verisinde bazı currency alanlarının bulunması, fırsat şemasındaki eksikliği veya bunları kullanmayan renderer'ları çözmez.

### 24.3. Paralel çalışma geçmişi ve entegrasyon borcu

Depoda lane kayıtları, organizasyon yapıları, workstream tanımları ve çok sayıda agent handoff'u var. Bunlar projenin geçmişte yoğun paralel çalışmayla ilerlediğini gösteriyor. Ancak belgelerde yazan “aktif agent”, “lane sahibi” veya “onay bekleniyor” ifadeleri bugün çalışan süreç olduğunu kanıtlamaz.

İncelenen erişilebilir git geçmişinde toplam 1.338 commit sayıldı. Merge edilmiş dalların geçmişini de içeren bu sayı; 1.338 bağımsız ürün özelliği, çalışma oturumu veya insan katkısı anlamına gelmez.

Bugün 26 yerel branch ve 23 worktree görüldü. Eski bir rapordaki 80 branch / 85 worktree sayısı güncel değil. Dosya sahipliği çakışmaları ve farklı agent'ların aynı veri kümesine dokunması geçmiş handoff'larda anılıyor. Gelecekte paralel çalışma yapılacaksa kaynak kodu sahipliği kadar **canlı veri yazma sahipliği** de açık tanımlanmalı.

Bu rapor kapsamında branch birleştirme, PR kapatma, worktree silme, commit, push veya canlı veri değişikliği yapılmadı.

---

## 25. İkinci planda kalan ama devralanın bilmesi gereken özellikler

### 25.1. Aylık gelişim ve profil geçmişi

`/profile/history` ve `lib/scoring/monthly-review.ts` mevcut. Sistem son 30 günlük pencere için eski snapshot ile güncel dimension skorlarını karşılaştırıyor. Bu hesap AI çağrısı gerektirmiyor.

Eski bir baseline yoksa geçmiş varmış gibi trend üretilmiyor. Genel skor önce/sonra değerleri iç modelde kalıyor; öğrenciye gösterilen nitel sinyal yaklaşımıyla aynı şekilde ele alınmalı.

İki ölçümün anlamı sınırlı: “yakın zamanda tamamlanan proje” ve “yakın zamanda başvurulan uygulama” sayıları kesin completion/submission event zamanına değil, ilgili durumdaki kaydın `updated_at` değerine dayanıyor. Dolayısıyla eski bir tamamlanmış projenin bugün düzenlenmesi bu pencereye girebilir. Bu, gerçek bir olay geçmişi değildir. İleride ilerleme analitiği yapılacaksa ayrı olay zamanları veya event log gerekir.

### 25.2. Peer benchmarking

`lib/benchmarking/` ve Journey üzerindeki `PeerBenchmark` mevcut. Percentile hesabı deterministik; eşit skorları yarım ağırlıkla sayıyor ve öğrencinin kendi kaydını peer örnekleminden çıkarıyor. Gösterim için minimum karşılaştırılabilir örneklem **100**.

Canlıda toplam 11 profil olduğundan, bu altyapı bugün anlamlı bir gerçek kullanıcı percentile ürünü üretmiş sayılamaz. Kohort filtresi uygulandıktan sonra örneklem daha da küçülür. Doğru sonuç “yeterli karşılaştırılabilir Oryn öğrencisi yok” durumudur; demo percentile göstermek değildir.

Gelecekte veri büyüdüğünde de örneklem büyüklüğü tek başına temsil gücü sağlamaz. Öğrencilerin kendi bildirimleri, eksik profil oranları ve platforma katılım seçilimi ayrıca değerlendirilmelidir.

### 25.3. Hedefler, zaman bütçesi ve yoğun dönemler

`career_goals` için Journey içinde ekleme, düzenleme ve silme akışları var. Haftalık zaman bütçesi danışman/plan bağlamına katılıyor. Settings'te `busy_mode` ve `busy_mode_until` üzerinden yoğun dönem bildirimi mevcut.

Bu altyapı öğrencinin sınav döneminde aynı öneri temposuna zorlanmamasını hedefliyor. Yine de bu rapor yoğun dönem seçeneğinin bütün öneri üretim yollarında aynı şekilde uygulandığını baştan sona test etmedi. Yeni bir ranking veya AI yolu yazılırken “eski bağlam bunu zaten yapıyordu” varsayımıyla atlanmamalı.

### 25.4. Global search, bildirimler ve admin

Global search için `/search`, command palette ve ayrı arama/ranking modülleri bulunuyor. Profil, üniversite ve fırsat araması ürünün farklı yerlerinde kullanılan kimlik/alias aramasından ayrılmalı: global search ile canonical entity typeahead aynı iş değildir.

In-app notification bell ve okundu işaretleme aksiyonları mevcut. Email notification servisiyle aynı şey değildir. Deadline reminder endpoint'inin çalışması; email gönderildiğini, bütün öğrencilerin bilgilendirildiğini veya kaynak deadline'ın tekrar doğrulandığını göstermez.

Admin yüzeyi provider/job ve veri sorunlarını inceleme, bazı yenilemeleri tetikleme ve moderasyon kontrollerini içeriyor. Bu araçların kapsamı öğrencinin gördüğü ürün ekranlarından farklı; admin yetkisi ve canlı `is_admin` koruması kritik.

### 25.5. Ürün analitiği

`lib/analytics/log.ts`, `product_events` tablosuna server-side admin client üzerinden yapısal olaylar yazıyor. Öğrenci dokümanının içeriğini event'e aktarmamak açık tasarım niyeti. Logging hatası kullanıcı işlemini bozmasın diye hatayı yakalıyor.

Bu yardımcı fonksiyonun bulunması, bütün istenen olayların eksiksiz instrument edildiğini veya bir retention dashboard'u bulunduğunu kanıtlamaz. `metadata` genel bir kayıt nesnesi kabul ediyor; içerik minimizasyonu çağrı yerlerinde de korunmalı. Log yazımı başarısızlıklarının yutulması ürün kullanılabilirliği için iyi olabilir, fakat olay kaybını ayrıca görünür kılmak gerekir.

---

## 26. İş modeli, pilot ve lansman açısından durum

### 26.1. Henüz kanıtlanmayan ticari taraf

İncelenen kaynaklar; ürün vizyonunu, geliştirme ve veri faaliyetlerini güçlü biçimde belgeliyor. Buna karşılık doğrulanmış fiyatlandırma, ödeme alan abonelik akışı, MRR, gelir, ücretli müşteri sayısı, CAC, retention veya okul anlaşması kanıtı bu incelemede bulunmadı.

Bu “hiçbir ticari görüşme yapılmadı” anlamına gelmez; mevcut teknik kayıtların bunları göstermediği anlamına gelir. Canlıdaki 11 profil ve 8 tamamlanmış onboarding, kullanıcı edinimi metriği olarak sunulmamalı. Test/QA hesapları ayrılmadan aktivasyon oranı hesaplamak yanıltıcı olur.

### 26.2. İlk pilotun amacı

Kurucu karar belgelerinde yaklaşık 10 kişilik pilot yaklaşımı var. Bunun en yararlı amacı ürünün genişliğini sergilemek değil, tek bir öğrenci döngüsünü doğrulamak:

1. Öğrenci profilini yeterince doğru içeri alabiliyor mu?
2. Oryn öğrencinin durumunu doğru özetliyor mu?
3. Önerilen ilk üç iş gerçekten uygun, güncel ve yapılabilir mi?
4. Öğrenci bunlardan en az birini seçip ilerletebiliyor mu?
5. Sonuç sisteme dönünce sonraki tavsiye değişiyor mu?
6. Öğrenci neden o işin önerildiğini anlayabiliyor mu?

Bu altı sorunun cevabı, on binlerce katalog kaydından daha güçlü bir erken ürün göstergesidir.

### 26.3. Reşit olmayan kullanıcılar ve profesyonel inceleme

14–18 yaş hedef kitlesi nedeniyle veri minimizasyonu, özel profil, belge gizliliği, hesap silme ve dışa aktarma çekirdek gerekliliklerdir. Bunların teknik akışlarının bulunması tek başına hukuki uygunluk veya güvenli kamu lansmanı kanıtı değildir.

Pilot öncesinde kullanıcı yaşı/ülkesi, gerekli izin/aydınlatma metinleri, veri işleyen sağlayıcılar, saklama ve silme politikası, sınır ötesi veri işleme ve sosyal özelliklerin kapsamı profesyonel incelemeye götürülmeli. Bu rapor bir hukuki değerlendirme veya belirli ülke mevzuatına uygunluk beyanı değildir.

Drive'da bir legal/privacy working register bulundu; bu incelemede tam içeriği analiz edilmedi. Dolayısıyla “hukuk işi yok” da “hukuk tamam” da denemez.

### 26.4. Pilot başarısı nasıl ölçülmeli? — öneri

Gelecekteki pilot için ölçülebilir bir çerçeve önerisi:

- İlk oturumda doğru ve yeterli profil oluşturma oranı; terk edilen alanlar ve süre.
- CV'den yanlış eklenen, atlanan ve kullanıcı tarafından düzeltilen kayıt sayısı.
- İlk üç tavsiyenin öğrenci ve insan danışman tarafından değerlendirilmesi: uygunluk, doğruluk, açıklama, zaman bütçesi.
- Son tarihi geçmiş, ülke/yaş açısından uygun olmayan veya kaynakla desteklenmeyen öneri sayısı.
- Öneriyi planına ekleme ve sonraki oturumda sonucu bildirme davranışı.
- İkinci ziyarette aynı tavsiyenin körlemesine tekrar edilip edilmediği.
- Ana akış başına gerçek latency ve AI maliyeti.

Bunlar ölçülmüş sonuçlar değil, önerilen pilot metrikleri. Gelecek raporlar “önerilen ölçüm” ile “elde edilen sonuç” sütunlarını ayırmalı.

---

## 27. Önceliklendirilmiş açık işler ve risk kaydı

Bu tablo yeni bir onaylanmış sprint planı değil; incelenen kanıtlara dayanarak önerilen sıralamadır. **P0**, halka açılmadan önce çözülmesi/doğrulanması gereken güven ve güvenlik riskini; **P1**, pilotun temel değerini etkileyen eksiği; **P2**, kontrollü genişlemeyi ifade eder.

| Öncelik | Konu | Bugünkü kanıt | Kapatma ölçütü |
|---|---|---|---|
| P0 | İstemcinin hesaplanmış/korunmuş veriyi yazabilmesi | 0063–0065 korumaları canlı metadata'da eksik; owner ALL policy'ler sürüyor | Migration + server write-path uyumu + iki kullanıcı/anon/owner/admin testleri; meşru akışların da çalışması |
| P0 | Raporlama hedefi ve moderasyon yetkileri | Report INSERT policy yalnızca reporter sahipliğini kontrol ediyor | Hedef ilişkisinin ve görünürlüğünün doğrulanması; kötü niyetli/yanlış hedef testleri |
| P0 | Sayısal kabul tahmini | Basit heuristic formül, gerçek UI yolu ve dört kayıt; kalibrasyon kanıtı yok | Pilot öncesi gösterim kararı; doğrulanmış model olmadan olasılık iddiasını kaldırma veya kapatma; açıklama ve regresyon testi |
| P0 | Gerçek üretim ortamı bilinmiyor | Erişilebilir Vercel hesabında Oryn bulunamadı | Hedef host/proje/domain/env sahibi, deploy SHA, HTTPS ve canlı smoke sonucu belgeli |
| P0 | Reşit olmayan kullanıcılar ve görünürlük | Private data tasarımı var; sosyal route'lar hâlâ var; profesyonel review kanıtı tamamlanmadı | Pilot kapsamı, izin/metinler, veri saklama/silme ve sosyal yüzey kararının yazılı onayı |
| P1 | Kaynak tazeliği operasyonu | pg_cron yok; çalışan genel re-verification kanıtı yok; #150 tasarım | Gerçek fetch/extract/validate/write job'u, lease/retry/idempotency ve stale geri dönüş testi |
| P1 | Para birimi ve ücretli program filtresi | Fırsatta cost_currency yok; maliyet eşiği currency-blind | Şema, kaynaklı backfill, UI ve matching filtresinin birlikte doğrulanması |
| P1 | CV güncelleme/senkronizasyonu | Append var; merge/diff ve tam server validation eksik | Reviewable diff, duplicate politikası, runtime doğrulama, tekrar denemede idempotency, partial failure planı |
| P1 | Profil sinyallerini yazabilme | Birth year normal UI yolu ve bazı yapılandırılmış girdiler eksik | Minimum veriyle yaş/uygunluk sinyali; profil düzenleme; advisor'ın yeni sinyali kullanması |
| P1 | Program bazlı şart/tarih ilişkilendirmesi | Şartların 88'i program-linked, deadline'ların 0'ı | Öncelikli pilot hedeflerinde program bazlı scope, kaynak ve yıl doğruluğu |
| P1 | Bilinmeyen uygunluğun sunumu | Unknown bazı önerilerde uyarıyla geçebiliyor | Bilinmeyenin nedenini açıklama; gerekli profil sorusu; kesin uygunluk gibi gösterilmeme |
| P1 | Sağlayıcı anahtarları | Tavily ve Scorecard mevcut ortamda yok | Amaçlanan ortamda anahtarlar, kota/limit, gerçek entegrasyon ve fail-state testi |
| P1 | Migration drift | Dosya sayısı, ledger ve fiili korumalar farklı | Her fark için açıklanmış eşleme ve temiz DB kurulum testi; kör toplu apply yapılmaması |
| P1 | Tam güncel öğrenci yolculuğu | Tarihsel kısmi testler; bugün fresh E2E yok | 16 MVP adımının aynı gün, gerçek sağlayıcılar ve kanıtlarla tekrar yürünmesi |
| P1 | Güvenlik gözlemleri | Password protection kapalı ve advisor uyarıları | Her finding için kabul/fix gerekçesi; endpoint/SQL yetki testleri; gözlemlenebilirlik |
| P2 | Yerelleştirme | Büyük ölçüde İngilizce UI, dağınık string/date/currency | Metin kataloğu, locale formatları, fallback ve veri dili ayrımı |
| P2 | İçerik taksonomisi | Online program facet açığı; publication venue paketi tasarım | Kategori/enum/DB/UI/matching parity; altı yayın kaydı için güvenli dönüşüm |
| P2 | Analytics ve gerçek ürün kanıtı | Olay logging altyapısı var; doğrulanmış retention yok | QA hesap filtresi, tam event coverage, karar vermeyi sağlayan küçük dashboard |
| P2 | Performans ve maliyet | Tarihsel latency var; güncel production ölçümü yok; retry usage riski | Gerçek trafik p50/p95, bütün denemeleri içeren usage, ölçülmüş bütçeler |
| P2 | Çalışma alanı hijyeni | Untracked SQL üç test kırıyor; birden çok worktree | Sahipleriyle sınıflama, güvenli entegrasyon/arşivleme; test corpus sözleşmesini koruma |

### 27.1. Yanlış sıralama örnekleri

Yeni bir ana sayfa animasyonu, 1.000 yeni kurum veya sosyal feed; korunmamış computed field'ların, kalibre edilmemiş kabul yüzdesinin ve stale önerinin önüne geçmemeli. Bu, o özelliklerin hiçbir zaman yapılmayacağı anlamına gelmez; ürünün bugünkü darboğazını tanımlar.

Ters yönde de hata yapılmamalı: bütün dünya verisini kusursuz tamamlamayı beklemek pilotu gereksiz yere geciktirebilir. Güvenli ve açıkça sınırlandırılmış pilot kapsamındaki kurum/fırsatları derinleştirmek, “89 ülke var” demekten daha yararlıdır.

---

## 28. Gelecek yol haritası: Şimdi, sonra ve daha sonra

Bu bölüm geleceğe dönük öneridir. Tarih, teslim sözü veya uygulanmış iş değildir. Fazlar takvimden çok çıkış ölçütüyle tanımlanmıştır.

### Aşama A — Güvenilir başlangıç noktası

Önce deploy/DB kimliği kesinleştirilmeli; main, migration ledger ve fiili şema eşlenmeli. 0063–0065 güvenlik işlerinin yalnızca SQL'i değil ilgili server aksiyonları da tamamlanmalı. Güvenlik düzeltmesi meşru öğrenci akışlarını kilitlerse tamamlanmış sayılmaz.

Kabul tahmininin sayısal gösterimi için açık ürün kararı alınmalı. Mevcut formül kalibre edilmiş bir olasılık değildir. Profil gelişim puanlarının yorumları da kanıt düzeyiyle uyumlu olmalı.

**Çıkış ölçütü:** Ana akışların çalıştığı, özel verinin ve computed state'in korunabildiği, taze kurulum yapılabildiği ve deploy'un hangi commit olduğu bilinen bir temel.

### Aşama B — İlk öğrencinin gerçek döngüsü

CV import güvenilirleştirilmeli; ikinci yüklemenin ne yapacağı açıklanmalı. Kullanıcı ilgilerini ve uygunluk için gerekli sınırlı bilgileri güncelleyebilmeli. Program/ülke hedefiyle danışman bağlamı tutarlı olmalı.

Pilot kapsamındaki hedef üniversitelerde şartlar ve tarihler derinleştirilmeli. Fırsatlar gerçek uygunluk ve maliyet açısından gözden geçirilmeli. “İlk üç öneri” sadece güzel bir metin değil, kaydedilebilen ve sonucu geri bildirilebilen iş olmalı.

**Çıkış ölçütü:** Bir öğrenci kaydolup profilini oluşturabiliyor; üç gerekçeli adım alıyor; birini tamamlayıp sonucunu sisteme dönüyor; sonraki tavsiye buna göre değişiyor.

### Aşama C — Kontrollü pilot ve bakım döngüsü

Yaklaşık 10 kişilik pilot, insan danışman değerlendirmesiyle yürütülebilir. Hatalı öneriler örnek bazında sınıflanmalı: kaynak hatası mı, veri modelleme hatası mı, profil eksikliği mi, ranking mi, AI ifade hatası mı?

Fırsat/şart tazeliği job'ları gerçek zaman damgasıyla çalışmalı. Sağlayıcı hatası eski iyi veriyi bozmayacak biçimde ele alınmalı. Operatör aynı kaydı iki kez işleyen job veya yarım kalmış batch'i görebilmeli.

**Çıkış ölçütü:** Tekrarlanabilir ürün değeri; yanlış öneriler için çalışan düzeltme döngüsü; hata/maliyet/latency görünürlüğü; kullanıcı verisine saygılı pilot operasyonu.

### Aşama D — Veri kalitesine dayalı genişleme

Ülke sayısını artırmadan önce bir “kapsam matrisi” işletilmeli: kurum, undergraduate program, başvuru mekanizması, öğrenci tipi, yıl, şart, tarih, ücret/para birimi ve kaynak. Bir okulun sadece adı/logosu varsa bunun admissions coverage gibi sayılmaması gerekir.

Canonical entity omurgası opportunity organizer'lara ve öğrenci girdilerine daha fazla bağlanabilir. Bugün `organization_entity_id` doluluğunun sıfır olması bu tarafta açık alan bırakıyor. Taksonomi ve eşanlamlılar kontrollü biçimde ilerlemeli.

**Çıkış ölçütü:** Yeni ülke veya veri paketi eklenince UI, counselor ve eligibility davranışı bozulmadan, kaynakları izlenerek çalışıyor.

### Aşama E — Uzun vadeli ürün genişlemesi

Master spec; üniversite öğrencileri ve profesyoneller, danışman/mentor/okul kullanımı, interview hazırlığı, recommendation yönetimi, daha ileri export, public portfolio, burs/staj eşleştirme, mobil uygulama ve doğrulanmış kimlik/başarı altyapısı için geleceğe açık mimari istiyor.

Bunlar bugün teslim edilmiş özellikler olarak sunulmamalı. Bazılarının küçük parçaları mevcut: Story Bank essay planlamasına, print CV export'a, opportunity kategorileri burs/staja başlangıç sağlıyor. Ancak parça altyapı, uçtan uca ayrı ürün değildir.

Peer benchmarking ancak yeterli ve temsil gücü değerlendirilen örneklemde anlam kazanır. Outcome verisinden admission modeli öğrenmek ise açık izin, uygun temsil ve yeterli veri gerektirir. Şu an böyle bir eğitilmiş/kalibre edilmiş modelin bulunduğu iddia edilmemeli.

---

## 29. Orijinal 80 fazın güncel karşılığı

Bu tablo **resmî tamamlanma onayı değildir**. Her satır kod, veri ve bilinen doğrulama düzeyini kısa biçimde eşler. “Mevcut” ifadesi yeni browser testi anlamına gelmez. UI'nin sonraki kararlarla değiştiği yerlerde eski tasarımın birebir uygulanmaması otomatik hata sayılmamıştır; bağlayıcı talimatla çelişen kapsam değişiklikleri açıkça işaretlenmiştir.

| Faz | Başlık | Güncel karşılık ve sınır |
|---|---|---|
| 1 | Foundation | Next/TS/Tailwind/Supabase ve temel dokümanlar mevcut; kurulu sürümün yerel Next belgeleri esas alınmalı |
| 2 | Authentication | Signup/login/logout/reset/session/protected routes var; bugün fresh auth E2E yapılmadı |
| 3 | Onboarding | Progressive akış var; ülke/okul/curriculum/interests/geography/import bağlantısı mevcut |
| 4 | Master profile | Geniş yapılandırılmış CRUD var; bazı sinyallerde normal UI write-path eksik |
| 5 | Smart achievement | Gerçek AI refinement mevcut; metrik uydurmama ve kullanıcı onayı ilkesi korunmalı |
| 6 | Profile analysis | Dokuz deterministik dimension ve versioning var; kalibre edilmiş başarı ölçümü değil |
| 7 | Dashboard | Home öncelikleri ve profil/gap/opportunity/university yüzeyleri var; büyük genel score tasarımı değişmiş |
| 8 | AI Advisor | Gerçek Anthropic sohbeti + deterministik Counselor; tarihsel Gate 2 PASS |
| 9 | Weekly review | AI haftalık plan ve üç aksiyon kayıtları var; genel otomatik haftalık scheduler doğrulanmadı |
| 10 | Reflection | Aksiyon sonucu ve notu bağlama girebiliyor; tam uzun dönem öğrenme etkisi ölçülmedi |
| 11 | Opportunity engine | 421 kayıt, ingestion/normalization/lifecycle altyapısı var |
| 12 | Opportunity matching | Çok faktörlü matching/eligibility var; unknown, currency ve source quality sınırları var |
| 13 | Research generator | OpenAlex + AI akışı var; bugün kaynak API sağlıklı, yeni tam UI üretimi denenmedi |
| 14 | University explorer | Map/list/search/filter/detail/compare var; veri derinliği kurumlar arasında çok farklı |
| 15 | Target universities | Kaydetme/hedef program/statü altyapısı var |
| 16 | Admission outlook | Açıklamalı heuristic var; kalibre edilmemiş sayısal range yolu kritik risk |
| 17 | Admission model v1 | Versioned deterministik model var; kabul mekanizması suppression'ları mevcut |
| 18 | Future admission model | Gelecek outcome/veri mimarisi niyeti var; eğitilmiş veya doğrulanmış model yok |
| 19 | Benchmarking | Minimum 100 kohort kapısı var; canlı örneklem yetersiz |
| 20 | Portfolio | Kategorili/chronological profil sunumu mevcut; çoklu şablon ürünü değil |
| 21 | Evidence | Private file/URL ilişkilendirme var; upload bağımsız doğrulama değil |
| 22 | Application tracker | Liste/detail/checklist/notes/status/deadline akışları mevcut |
| 23 | Deadline engine | Merkezi öncelik/surface ve reminder yolu var; kaynak tarihin doğrulanması ayrı iş |
| 24 | Notifications | In-app altyapı var; email notification teslimatı doğrulanmadı |
| 25 | Search | Global search ve command palette mevcut |
| 26 | Structured outputs | Zod + tool/schema tabanlı AI parse/retry var; bütün mutation sınırları eşit güçlü değil |
| 27 | AI cost control | Context trimming/usage/rate controls var; retry toplamı ve production maliyet görünürlüğü geliştirilmeli |
| 28 | AI safety | Grounding/no-fabrication kuralları ve testleri var; tavsiyenin doğruluğu veriye bağımlı |
| 29 | Freshness | Metadata/lifecycle mantığı var; sürekli re-verification henüz tasarım/operasyon açığı |
| 30 | Background jobs | Job endpoint/script altyapısı var; bütün A–E süreçlerinin zamanlanmış çalışması kanıtlanmadı |
| 31 | Database security | 87 public tabloda RLS açık; policy yazma sınırları bakımından açıklar var |
| 32 | Secrets | Env örneği/server-only yollar var; gerçek credential'lar rapora kopyalanmadı |
| 33 | API health | Health tablosu ve kontrol script'i var; saklı health satırı güncel sağlıkla aynı değil |
| 34 | Fallback | Provider error/unavailable ayrımı var; gerçek API eksikliği fixture ile kapatılmamalı |
| 35 | University normalization | Ayrı university/program/requirement/statistic/deadline/source tabloları var |
| 36 | Traceability | Source UI ve evidence metadata var; tüm kayıtların kaynağı eşit güçlü değil |
| 37 | Data confidence | Confidence/status modeli var; verified etiketi bu raporun yeni doğrulaması sayılmamalı |
| 38 | Home prioritization | Counselor ranking deterministik, açıklanabilir ve testli |
| 39 | Don't do this | Do/consider/deprioritize/avoid yaklaşımı ve opportunity-cost mantığı var |
| 40 | Monthly review | 30 günlük snapshot karşılaştırması var; completion sayıları updated_at proxy'si |
| 41 | Profile history | Snapshot/version altyapısı var; canlı write protection açığı ayrıca çözülmeli |
| 42 | Navigation | Yeni topbar/kompakt mobil navigasyon; eski sidebar spec'inden tasarım evrimi |
| 43 | Empty states | Çok sayıda eylem yönlendiren boş durum mevcut; tüm ekranlar bugün tek tek denenmedi |
| 44 | Loading | Loading/skeleton/pending yüzeyleri mevcut; gerçek AI latency hâlâ ürün konusu |
| 45 | Errors | Kontrollü hata/fallback UI var; Gate 2'de gerçek başarısız AI çağrısı sonrası retry düzeltildi |
| 46 | Accessibility | Component/focus/label çalışmaları var; tam bağımsız erişilebilirlik audit'i yok |
| 47 | Responsive | Desktop/mobile farklı layout'lar var; tarihsel mobil kontrol, bugün yeni cihaz matrisi yok |
| 48 | Performance | Server Components/pure modules/bounded context var; güncel production performans kanıtı yok |
| 49 | Test data | Test/dev fixture'ları var; production'a sessiz veri kaynağı olmamalı |
| 50 | Testing | Temiz kaynakta 2.479 test yeşil; fresh tam browser E2E ayrı ihtiyaç |
| 51 | Admin | Yönetim/health/job/moderation yüzeyi var; security policy'leriyle birlikte değerlendirilmeli |
| 52 | Analytics | Yapısal event logger var; gerçek funnel/retention sonucu kanıtlanmadı |
| 53 | MVP | 16 adımın çoğunun kod yolu var; en son bütünsel tarihsel audit 14/16, bugünkü tam PASS değil |
| 54 | Do not build yet | Sosyal bağlantı/mesaj kodu yapılmış; menüden kaldırılmış; feed kapalı. Kapsam sapması açık |
| 55 | Future architecture | Genişleme için domain ayrımı var; okul/mentor/payment/mobile ürünleri tamam sayılmaz |
| 56 | Product language | Kısa İngilizce ürün dili ve sonraki copy kararları var |
| 57 | AI copy | Analitik, öncelik veren mentor prompt'ları var; canlı tutarlılık veri/bağlamla test edilmeli |
| 58 | Database design | Geniş normalize şema mevcut; 87 public tablo ve private storage |
| 59 | Migration discipline | 66 migration dosyası, 45 live history girdisi; fiili şema drift'i var |
| 60 | CV extraction | Altı kategori extraction/review/save var; spec'in skills/languages/unclassified kapsamı tam karşılanmıyor |
| 61 | Parsing failure | Hata/retry/manual entry yaklaşımı var; bütün bozuk/encrypted/scanned dosya varyantları bugün denenmedi |
| 62 | Explainability | Gerekçeler, kaynaklar, gap/strength ve confidence yüzeyleri var |
| 63 | Recommendation history | Stored plans/actions/messages/feedback mevcut; bağlama giren geçmiş sınırlı |
| 64 | Time budget | Profil zamanı danışman/plan bağlamına giriyor |
| 65 | Busy periods | Settings busy_mode/busy_mode_until var; bütün yolların ortak davranışı ayrıca test edilmeli |
| 66 | Goals | Career goal CRUD ve bağlam kullanımı mevcut |
| 67 | Completeness | Skor gücünden ayrı completeness hesabı var; evidence rejection farkı dikkate alınmalı |
| 68 | Confidence system | Veri kapsamı ve score/advisor confidence kavramları var; tek evrensel güven puanı değil |
| 69 | Requirement check | Beş durumlu evaluasyon var; alternatifler ve program scope kapsamı eksik |
| 70 | Application readiness | Checklist/readiness mantığı var; eksik dış gereklilik verisini kendiliğinden tamamlayamaz |
| 71 | Source UI | Ortak kaynak/tazelik gösterimleri mevcut |
| 72 | Development mode | Dev preview/fixture mekanizmaları var; bunları gerçek kullanıcı davranışı sanmamak gerekir |
| 73 | API documentation | Setup/provider belgeleri var; credential durumları eski belgelerde yanlış kalabilir |
| 74 | Integration command | check:integrations bugün çalıştırıldı; dört bağlantı OK, iki credential eksik |
| 75 | Provider contracts | Provider/parse/normalize test kapsamı var; canlı API sözleşmesi sürekliliği ayrıca izlenmeli |
| 76 | Observability | Usage/provider/job/event kayıtları var; production alerting ve dashboard olgunluğu doğrulanmadı |
| 77 | README | Mevcut; tek başına güncel durum kaynağı değil |
| 78 | Final QA | Çok sayıda tarihsel QA var; bugün tam yeni final QA yapılmadı |
| 79 | Product audit | Birden çok audit ve bu durum raporu var; açıklar nedeniyle koşulsuz launch onayı yok |
| 80 | Completion report | Durum belgeleri var; bütün 80 fazın eksiksiz tamamlandığı sonucu çıkmıyor |

---

## 30. Yeni bir AI projeyi nasıl devralmalı?

### 30.1. İlk okuma sırası

1. Kullanıcının o anki isteği ve kökteki `AGENTS.md`.
2. Bu raporun özet, güvenlik, test, açık iş ve yol haritası bölümleri.
3. İlgili domain'in gerçek kodu ve testleri.
4. Son tarihli ilgili Gate/handoff ve kurucu karar kaydı.
5. İş SQL veya deployment gerektiriyorsa canlı şema/ledger ve deploy kimliği.
6. Next kodu değişecekse ilgili `node_modules/next/dist/docs/` rehberi.

Eski status dosyasını baştan sona okuyup “proje bitmiş” veya “her şey eksik” hükmüne varma. İlgili iddiayı karşılayan kod yolu, canlı yapı ve test kanıtı ara.

### 30.2. Çalışmaya başlamadan önce kaydet

Commit/branch, `git status`, pre-existing değişiklikler, aktif iş kapsamı, kullanılacak ortam ve mevcut baseline test sonucu. Canlı DB'yi `qa-scratch` adına bakıp disposable kabul etme. Gerçek profil ve kullanıcı verisi var; toplu silme veya reset sıradan geliştirme adımı değildir.

Bir API anahtarını görmek gerekmiyorsa değerini okuma veya ekrana basma; yalnızca varlık ve entegrasyon sonucunu raporla. Admin/service credential'ları browser'a, log'a veya örnek dosyaya taşıma.

### 30.3. Kod değişikliğinde beklenen disiplin

Dar bir kullanıcı sonucu seç. İlgili local Next docs ve domain rehberini oku. Mevcut testlere anlamlı davranış kapsamı ekle; yalnızca implementation detayını tekrar eden testler yazma. Lint, typecheck, ilgili testler ve gereken gerçek akışı doğrula. Şema değişiyorsa migration, types, server actions, RLS ve test kullanıcıları birlikte ele alınmalı.

Bir migration'ın depoda bulunması uygulanması için otomatik yetki değildir. Önce fiili şemayı ve zaten manuel/başka isimle uygulanmış davranışı kontrol et. Sonuç kaydında “kodlandı”, “merge edildi”, “migration uygulandı”, “deploy edildi” ve “canlı denendi” alanlarını ayır.

### 30.4. Veri işinde beklenen disiplin

Kaynağı, retrieval zamanını, ilgili döngüyü/yılı ve scope'u kaydet. Kurum geneli ile program, domestic ile international, undergraduate ile graduate, application deadline ile scholarship deadline ayrımını koru.

403, anti-bot veya login duvarını kaynak doğrulanmış gibi geçme. Erişim kısıtlarını aşmaya çalışma. Resmî alternatif sayfa veya izinli API kullan; bulunamazsa blocked/unavailable olarak kaydet.

Bir satırın `verified_current` olmasıyla yeni bir doğrulama yapmış sayılma. Geçmiş `retrieved_at` değerini bugünün `source_verified_at` değeri gibi kullanma. İlk kez bulunma, son kontrol, son başarılı doğrulama ve son değişiklik ayrı olaylardır.

### 30.5. Özellikle tekrar edilmemesi gereken yanlışlar

- “AI hiç çalışmıyor” deme: bugünkü Anthropic kontrolü ve Gate 2 kanıtı var.
- “Kabul yüzdesi yok” deme: mevcut formül ve render yolu var.
- “RLS açık, güvenlik bitti” deme: owner policy yazma kapsamı ayrıca kritik.
- “0061/62 listede yok, korumalar yok” deme: fiili davranış mevcut.
- “0063/64/65 dosyaları var, güvenlik düzeldi” deme: canlı metadata bunu desteklemiyor.
- “421 fırsat önerilebilir” deme: katalog, active, verified, lifecycle ve kişisel eligibility ayrı.
- “17.046 program bütün üniversiteleri kapsıyor” deme: yalnızca 150 kuruma ait.
- “CV import var, CV sync tamam” deme: append ile diff/merge aynı şey değil.
- “Mesaj menüde yok, mesajlaşma kapalı” deme: route ve aksiyonlar hâlâ var.
- “Vercel projesi yok” diye evrensel hüküm verme: yalnızca erişilebilir hesabı biliyoruz.
- “Testler kırık, main bozuk” deme: temiz kaynakta 2.479 test geçiyor.
- “CI yeşil, canlı güvenli ve güncel” deme: CI gerçek DB/provider smoke yerine geçmiyor.
- “11 kullanıcı var” diyerek ticari traction sunma: test hesapları ayrılmadı.
- Önceki kullanıcının değişikliklerini veya araştırma dosyalarını temizlik adına silme.

---

## 31. Kaynak rehberi ve kanıtların nerede olduğu

### 31.1. Yerel temel belgeler

| Kaynak | Ne için okunmalı? |
|---|---|
| [AGENTS.md](../AGENTS.md) | Bağlayıcı talimatlar ve 80 fazlı orijinal ürün spesifikasyonu |
| [PRODUCT_SPEC.md](../PRODUCT_SPEC.md) | Kısa ürün yönelimi; AGENTS ile çelişirse AGENTS öncelikli |
| [README.md](../README.md) | Kurulum, komutlar ve genel repository anlatımı |
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Mimari ve domain düzeni |
| [DATABASE.md](../DATABASE.md) | Veri modeli açıklaması; live schema ile karşılaştırılmalı |
| [API_SETUP.md](../API_SETUP.md) | Sağlayıcı/environment kurulumu |
| [SECURITY.md](../SECURITY.md) | Güvenlik niyeti, sınırlar ve kontrol alanları |
| [PHASE_STATUS.md](../PHASE_STATUS.md) | Tarihsel faz ilerleyişi; tüm girişler güncel değil |
| [MASTER-EXECUTION-STRATEGY.md](MASTER-EXECUTION-STRATEGY.md) | Geliştirme stratejisi ve öncelik geçmişi |
| [product-decisions.md](product-decisions.md) | Ürün kararları ve evrim |
| [current-state.md](current-state.md) | 22 Ağustos ağırlıklı durum; bu raporla düzelen eski iddialar içeriyor |
| [current-product-capability-map.md](current-product-capability-map.md) | Yeteneklerin eski haritası; güncel doğrulama yerine kullanma |
| [known-issues.md](known-issues.md) | Hata/backlog geçmişi; kapananları tekrar doğrula |
| [founder-blocked-backlog.md](founder-blocked-backlog.md) | Kurucu kararı/erişimi bekleyen işler; durumları tekrar kontrol et |
| [design-system.md](design-system.md) | Editorial Intelligence ve tasarım kuralları; eski parçalarla karışık |
| [i18n-readiness.md](i18n-readiness.md) | Uluslararasılaştırma teknik borcu |
| [counselor-core.md](counselor-core.md) | Deterministik danışman yaklaşımı; koddaki son parametreler esas |

### 31.2. Kritik tarihli kanıtlar

- [22 Ağustos launch strategy](ORYN-LAUNCH-STRATEGY-2026-08-22.md): O günkü lansman risklerini anlamak için; güncel AI/security durumu yerine kullanılmamalı.
- [22 Ağustos 16 maddelik MVP audit](handoffs/feat2-mvp-checklist-audit-2026-08-22.md): 14/16 sonucu ve test sınırları.
- [23 Ağustos Gate 1 Counselor artifact](handoffs/gate1-first-counselor-artifact-2026-08-23.md): İlk gerçek öğrenci/danışman gözlemleri.
- [24 Ağustos Gate 2 Counselor raporu](handoffs/gate2-ai-counselor-report-2026-08-24.md): Gerçek AI, iki düzeltme, tekrar denemeler ve sınırlar.
- [Insert-forgery inventory](research/verification/insert-forgery-inventory-2026-08-22.md): Güvenlik açıklarının tarihsel kapsamı.
- [RLS live verification](research/verification/rls-live-verification-2026-08-22.md): Önceki live policy incelemesi.
- [Insert-forgery tasarım önerisi](handoffs/insert-forgery-design-proposal-2026-08-22.md): Korunmuş alanlar ve write ownership tasarımı.
- [Fırsat re-verification tasarımı](opportunity-reverification-job-design-2026-08-23.md): Zaman damgası ve job tasarımı; açık PR'ın revizyonuyla birlikte okunmalı.
- [Bu raporun makinece okunabilir kanıt eki](reports/2026-08-28-oryn-evidence.json): 28 Ağustos sayımları ve metadata.

### 31.3. Drive ve GitHub

- [Product & MVP Decision Register](https://docs.google.com/document/d/1t0zA_E9pVjvs-kDobYMWUh2F8RN3r3dsE1fNuhmsT6U/edit): İçeriği okundu. Ürün kararları, CV sync/diff beklentisi, pilot ve veri kalitesi önceliği. Sonraki app kodunun bunu ne ölçüde uyguladığı ayrı değerlendirilmiştir.
- [Lane registry](https://docs.google.com/document/d/1_A4xYjI5BZTS1OQ42X0NHkH4Bni3RO4aBDAgDCITwO8/edit): İçeriği okundu. Dosya metadata'sındaki 27 Ağustos değişiklik tarihi, içindeki 21 Ağustos ölçümlerini güncel yapmıyor.
- [Legal/privacy working register](https://docs.google.com/document/d/1RpWegZ57Y-lHilkoWah_s4A5J9kNyn8JlQoaXERgqMA/edit): Bulundu; bu incelemede tam içerik analizi yapılmadı.
- [Canonical Data Pack](https://docs.google.com/spreadsheets/d/1tpQVG12JKdqGXFs1LW8g3_K0VBGORLbrTTQJJ36dkuc/edit): Bulundu; bütün hücreleri ve sayfaları denetlenmedi.
- [İncelenen main commit](https://github.com/akirik28/ORYN/commit/f7af9140f1255b2436217f1bf8d8fa5a80abd037): Kodun sabit referansı.
- [Aynı commit'in CI sonucu](https://github.com/akirik28/ORYN/actions/runs/32774560018): Kaynak üzerinde başarılı build/lint/typecheck/test kanıtı.

### 31.4. Kaynak kodda başlangıç noktaları

`app/` route ve server actions; `features/` domain ekranları; `components/` ortak UI; `lib/ai/` model entegrasyonu ve context; `lib/counselor/` karar motoru; `lib/scoring/` deterministik profil değerlendirmesi; `lib/opportunities/` eligibility/readiness/lifecycle; `lib/universities/`, `lib/programs/`, `lib/requirements/` ve `lib/admissions/` üniversite/program/şart/kabul mantığı; `lib/providers/` dış kaynak sözleşmeleri; `lib/security/` auth/admin/rate kontrolleri; `supabase/migrations/` şema geçmişi; `scripts/` veri/operasyon komutları; `__tests__/` davranış sözleşmeleri.

Bir klasörün adı, ilgili bütün davranışın yalnızca orada olduğu anlamına gelmez. Server actions ve UI renderer'ları da incelenmeli. Örneğin formülün doğru olması, renderer'ın doğru para birimini veya doğru confidence etiketini gösterdiği anlamına gelmez.

---

## 32. Başka bir AI'ya doğrudan verilebilecek devir metni

Aşağıdaki metin kısa başlangıç bağlamıdır. Tek başına bu raporun teknik ayrıntılarının yerini tutmaz; rapor ve kanıt ekiyle birlikte verilmelidir.

> Oryn, yaklaşık 14–18 yaş öğrenciler için kişisel kariyer işletim sistemidir. Temel işi profil depolamak değil, öğrencinin yapılandırılmış gerçekleri ile kaynaklı üniversite/program/fırsat verilerini birleştirerek “Şimdi en yüksek değerli neyi yapmalıyım?” sorusunu cevaplamaktır. Çok etkinlik yerine derinlik ve fırsat maliyeti esastır. Gerektiğinde yeni bir işi yapmamasını söylemelidir.
>
> 28 Ağustos 2026 itibarıyla incelenen main commit f7af914'tür. Stack Next.js 16.3.1, React 19.2.8, strict TypeScript, Tailwind 4, Supabase/Postgres ve server-side Anthropic'tir. Bu Next sürümünü eski eğitim bilgisiyle kullanma; kod yazmadan yerel Next docs'u oku. Bağlayıcı ürün talimatları AGENTS.md'dedir.
>
> Çalışan kod; auth/onboarding, geniş profil CRUD, CV extraction/review/append, evidence, nitel profil sinyalleri, dokuz boyutlu deterministik iç skor, Counselor ranking, gerçek AI sohbeti, haftalık plan/aksiyon/reflection, fırsat ve üniversite keşfi, program/requirements/outlook, hedefler, applications, portfolio/CV/Story Bank, search/notifications/admin içerir. Genel ürün tamamlandı veya halka açılmaya hazır varsayma.
>
> Canlı Supabase projesi oryn-qa-scratch'tır; adına bakıp boş sanma. 1.019 üniversite, 1.010 canonical kurum, 17.046 program, 1.280 requirement, 438 deadline ve 421 opportunity vardır. Programlar yalnızca 150 kurum/14 ülkeye aittir. Active fırsat 276; active + verified_current 204; ek lifecycle/tarih filtresiyle 132 kayıt kalır, fakat bu kişiselleştirilmiş uygunluk sayısı değildir. 11 profil QA dahil sayımdır, traction değildir.
>
> Temiz git kaynak klonunda 2.479 testin tamamı geçti. Ana çalışma klasöründe untracked araştırma SQL'i üç testi kırıyor; kullanıcı dosyasını silme veya corpus testini gevşetme. Lint/typecheck geçti. Aynı main commit CI'da build dahil yeşil, fakat bu rapor oturumunun yerel build'i font ağı/Turbopack port izni engeline takıldı. Bugün yeni tam browser E2E yapılmadı.
>
> En kritik açıklar: computed/system field write güvenliği, report policy kapsamı, migration drift, kalibre edilmemiş sayısal admission range, re-verification scheduler eksikliği, currency-blind opportunity cost mantığı, CV diff/merge eksikliği, profil write-path ve program scope boşlukları, minor privacy/pilot ve üretim deploy doğrulaması. 0061/0062 amaçlanan korumalar canlıda var fakat ledger isimleri yok; 0063–0065'in temel korumaları canlı metadata'da görünmüyor. RLS açık olması güvenli bütün yazma politikaları olduğu anlamına gelmez.
>
> Anthropic, Supabase ve OpenAlex bağlantıları bugün çalıştı. Tavily ve Scorecard credential'ları mevcut ortamda eksik. Erişilebilir Vercel hesabında Oryn bulunamadı; başka account/host yok demek için kanıt yok. GitHub deposu public; güvenlik raporlarını/anahtarları/kullanıcı verisini otomatik push etme.
>
> Sonraki işi küçük, doğrulanabilir bir kullanıcı sonucuyla tanımla. Kodlandı, test edildi, merge edildi, migration uygulandı, deploy edildi ve canlı doğrulandı durumlarını ayrı raporla. Sahte üretim verisi, sahte percentile, uydurma deadline/şart/kabul olasılığı üretme. Mevcut kullanıcı değişikliklerini koru. Ürünün bir sonraki önemli başarısı daha çok özellik değil; gerçek öğrencinin güvenli, kaynaklı, uygun ve zamanına değen bir sonraki adımı alıp sonucunu sisteme geri döndürmesidir.

---

## 33. Son değerlendirme

Oryn'in en güçlü yanı artık yalnızca fikir değil: yapılandırılmış profil, geniş bir veri omurgası ve davranışı test edilebilen karar motoru bir araya gelmiş durumda. Gerçek AI'nın bu motora bağlanabildiğine ilişkin kanıt da var. Bu temel korunmaya değer.

En büyük risk, ürünün genişliğini olgunlukla karıştırmak. Binlerce veri satırı, çok sayıda route, yüzlerce commit veya binlerce test; tek başına doğru tavsiye, güvenli veri erişimi, güncel kaynak veya başarılı öğrenci deneyimi demek değildir.

**28 Ağustos 2026 için doğru konumlandırma:** Çalışan ve ciddi biçimde geliştirilmiş bir pre-launch ürün; güvenlik/operasyon/temel kullanıcı döngüsü tamamlanıp kontrollü pilotla doğrulanması gereken aşamada. Yeni AI'nın görevi bu gerçeği koruyarak ilerlemek; eski belgelerin iyimserliğini veya kötümserliğini tekrar üretmek değildir.
