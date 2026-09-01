# Yeni bot promptları — 2026-09-02

Aşağıdaki blokları yeni bir Claude Code oturumuna **olduğu gibi yapıştır**. Her biri kendi
kendine yeter; oturumun bu konuşmadan hiçbir şey bilmesine gerek yok.

Sıra önerisi: **önce Bot 3.** Diğer ikisinin cevabı bir tasarımı değiştirir; Bot 3'ün cevabı
planın kurulabilir olup olmadığını değiştirir.

---

## ORTAK ÖNSÖZ

Bu metin üç promptun da başında var. Ayrıca yapıştırmana gerek yok — aşağıdaki her blok
zaten içeriyor.

---

## BOT 1 — Gençlik ve eğitim ürünlerinde freemium mekaniği

```
Sen ORYN adlı bir ürünün araştırma oturumusun. ORYN, 14-18 yaş öğrenciler için bir
"kişisel kariyer işletim sistemi" — notlar, aktiviteler, ödüller, projeler, üniversite
hedefleri tek yerde toplanıyor ve bir YZ danışman öğrenciye "şimdi ne yapmalıyım"
sorusunu cevaplıyor. Türkiye, ABD, İngiltere ve Avrupa'yı hedefliyor. Ürün çalışıyor,
gerçek öğrencileri var, yayına hazırlanıyor.

Repo: /Users/adasarpkirik/Desktop/Founder/ORYN
Ürünün tam şartnamesi AGENTS.md üzerinden otomatik yükleniyor — okuman gereken bir
şey varsa oradan başla.

Şu an aynı repo üzerinde çalışan başka Claude oturumları var. Sen KOD YAZMIYORSUN.
Senin çıktın bir araştırma belgesi.

GÖREVİN:
Ergenlere ve öğrencilere satan ürünlerin freemium mekaniğini çıkar. Genel SaaS
fiyatlama yazısı DEĞİL — özellikle bu yaş grubuna satan ürünler, çünkü dinamik farklı.

İncele (en az bunlar, daha fazlasını sen ekle): Duolingo, Quizlet, Photomath,
Brilliant, Khan Academy, Chegg, Scribbr, Grammarly, Notion (öğrenci planı).

Her ürün için cevapla:
1. Ücretsiz katmanda tam olarak NE kalıyor? (özellik listesi, sınır sayıları)
2. Duvarın arkasında ne var?
3. Duvar HANGİ ANDA gösteriliyor? (kayıt sırasında mı, ilk değerli anda mı, sınıra
   gelince mi, gün sonunda mı) — bu en önemli soru, en çok atlanan da bu.
4. Yükseltme çağrısı nasıl görünüyor? Kesintili mi (modal), yerinde mi (satır içi
   rozet), yoksa periyodik mi?
5. Fiyat ne? Yıllık indirim oranı? Öğrenci indirimi ayrı mı?
6. Reşit olmayan kullanıcı için farklı bir akış var mı? (veli onayı, veli hesabı,
   okul lisansı)

Sonra ORYN için somut bir öneri yaz: duvar nereye kurulmalı ve NEDEN. ORYN'de ücretsiz
kalması planlanan şeyler: profil, portföy, üniversiteler, fırsatlar, tarihler,
başvurular ve haftalık plan. Ödeme duvarının danışman sohbetinin derinliğine ve
sınırına kurulması düşünülüyor. Bu doğru yer mi, bulgularına göre söyle.

KURALLAR:
- Her iddia kaynaklı olacak: URL + eriştiğin tarih. Kaynağı olmayan sayı yazma.
- Fiyat ve sınır rakamlarını ürünün KENDİ sayfasından al, üçüncü taraf blog
  yazısından değil. İkincil kaynak kullanacaksan bunu açıkça işaretle.
- Emin olmadığında "bulunamadı" yaz. Tahmin edip yazma — bu üründe uydurulmuş bir
  sayı, eksik bir sayıdan daha zararlı.
- WebFetch özetleri ipucudur, kaynak değildir. Önemli bir rakamı yazmadan önce
  sayfayı gerçekten aç ve doğrula.
- Bir şeyin ekran görüntüsüne ihtiyacın varsa tarayıcı araçlarını kullan. Hiçbir
  yere kayıt olma, hiçbir forma bilgi girme, hiçbir şey satın alma.

ÇIKTI:
docs/research/freemium-genclik-urunleri-2026-09-02.md
Branch aç, commit'le, push'la. main'e MERGE ETME.
Bitince kısa bir özet ver: en çarpıcı üç bulgu ve ORYN için tek cümlelik önerin.
```

---

## BOT 2 — YZ ürünlerinde kota ve sınır tasarımı

```
Sen ORYN adlı bir ürünün araştırma oturumusun. ORYN, 14-18 yaş öğrenciler için bir
"kişisel kariyer işletim sistemi" — bir YZ danışman öğrenciye "şimdi ne yapmalıyım"
sorusunu cevaplıyor. Ürün çalışıyor, gerçek öğrencileri var, yayına hazırlanıyor.

Repo: /Users/adasarpkirik/Desktop/Founder/ORYN
Ürün şartnamesi AGENTS.md üzerinden otomatik yükleniyor.

Aynı repo üzerinde çalışan başka Claude oturumları var. Sen KOD YAZMIYORSUN.
Senin çıktın bir araştırma belgesi.

BAĞLAM — ölçülmüş gerçek rakamlarımız:
- Bir danışman mesajı bize ~0,035 $'a mal oluyor (~1.600 girdi + ~2.000 çıktı token,
  claude-sonnet-5, 3$/15$ per milyon). Maliyetin %86'sı ÇIKTI uzunluğu.
- Haftalık plan 0,014 $, gerekçe açıklaması 0,007 $, CV okuma 0,062 $.
- Kurucunun hedefi: öğrenci başına aylık 0,50 $ hedef, 1,00 $ tavan.
- Bir kullanıcı tek haftada 3,04 $ harcadı — sadece "yeniden oluştur" düğmesine
  defalarca basarak. Şu an hiçbir sınır yok.

GÖREVİN:
YZ ürünleri kullanım sınırlarını nasıl tasarlıyor, çıkar.

İncele (en az bunlar): Cursor, Perplexity, Notion AI, ChatGPT, Claude, GitHub Copilot,
Replit. Varsa öğrencilere satan YZ ürünlerini de ekle.

Her ürün için cevapla:
1. Sınırı NEYLE ölçüyorlar? Mesaj sayısı mı, token mı, "hızlı istek" mi, kredi mi,
   yoksa saatlik/günlük pencere mi? Neden o birimi seçmiş olabilirler?
2. Sınıra gelince NE OLUYOR? Kesiliyor mu, yavaşlıyor mu, daha ucuz modele mi
   düşüyor, sıraya mı giriyor? Kullanıcıya ne deniyor?
3. Kalan kotayı kullanıcıya nasıl gösteriyorlar? Sürekli görünür mü, sadece
   yaklaşınca mı, hiç mi?
4. Sınır sıfırlanma penceresi ne? (ay, gün, 5 saat, kayan pencere)
5. Sınırı aşmanın ücretli yolu var mı? (kredi satın alma, üst pakete geçme)

ORYN'in verdiği karar şu: ASLA sert duvar olmayacak. Kullanıcı bütçesini
doldurunca danışman sessizce daha ucuz modele (Haiku) düşecek ve çalışmaya devam
edecek. Gerekçe: 16 yaşında biri sorusunun ortasında duvara çarparsa geri gelmez.
Bulguların bu kararı destekliyor mu, yoksa bunu yapan ürünlerde gördüğün bir sorun
var mı? Dürüst ol — kararı doğrulamak için değil, sınamak için araştırıyorsun.

Ayrıca: kullanıcıya "daha ucuz modele düştün" demek mi doğru, sessizce yapmak mı?
Bunu yapan ürünler ne yapıyor?

KURALLAR:
- Her iddia kaynaklı olacak: URL + eriştiğin tarih.
- Sınır rakamlarını ürünün KENDİ fiyat/dokümantasyon sayfasından al. Bu rakamlar
  sık değişiyor — kaynağın tarihini mutlaka yaz.
- Emin olmadığında "bulunamadı" yaz. Tahmin etme.
- WebFetch özetleri ipucudur, kaynak değildir. Önemli bir rakamı yazmadan önce
  sayfayı gerçekten aç.
- Hiçbir yere kayıt olma, hiçbir forma bilgi girme, hiçbir şey satın alma.

ÇIKTI:
docs/research/yz-kota-tasarimi-2026-09-02.md
Branch aç, commit'le, push'la. main'e MERGE ETME.
Bitince kısa bir özet ver: sınır birimi olarak ne öneriyorsun ve neden.
```

---

## BOT 3 — Reşit olmayanlara ödeme: hukuk ve mağaza kuralları

**Bunu ilk başlat.** Diğer ikisi bir tasarımı değiştirir; bu, planın kurulabilir olup
olmadığını değiştirir.

```
Sen ORYN adlı bir ürünün araştırma oturumusun. ORYN, 14-18 yaş öğrenciler için bir
"kişisel kariyer işletim sistemi". Türkiye, ABD, İngiltere ve Avrupa'yı hedefliyor.
Kullanıcılarının çoğu REŞİT DEĞİL. Ürün çalışıyor ve yayına hazırlanıyor.

Repo: /Users/adasarpkirik/Desktop/Founder/ORYN
Ürün şartnamesi AGENTS.md üzerinden otomatik yükleniyor.

Aynı repo üzerinde çalışan başka Claude oturumları var. Sen KOD YAZMIYORSUN.
Senin çıktın bir araştırma belgesi — ve bu belge bir avukat görüşmesine girecek
dosyanın temeli olacak.

BAĞLAM:
Kurucu ürünü herkese ücretsiz tutmak, bazı özellikleri premium yapmak istiyor.
Ayrıca kendi premium'unu tanıtan yükseltme çağrıları (pop-up) göstermek istiyor —
üçüncü taraf reklam ağı DEĞİL, kendi ürününün tanıtımı.

GÖREVİN:
Reşit olmayanlara abonelik satmanın ve onlara ürün içi tanıtım göstermenin hukuki
çerçevesini çıkar. Şu dört yargı alanı için ayrı ayrı: TÜRKİYE, AVRUPA BİRLİĞİ,
BİRLEŞİK KRALLIK, ABD.

Her yargı alanı için cevapla:
1. Reşit olmayan biri geçerli bir abonelik sözleşmesi kurabilir mi? Yaş eşiği ne?
   Veli onayı gerekiyorsa hangi biçimde (yazılı, doğrulanabilir, örtük)?
2. Veli onayı olmadan alınan ödeme geri istenebilir mi? Süre sınırı var mı?
3. Cayma hakkı nasıl işliyor? Dijital hizmette farklı mı?
4. Veri işleme onayı için yaş eşiği ne? (GDPR'ın çocuk hükmü, KVKK, COPPA)
   ORYN 14 yaşındakinden veri topluyor — hangi eşiklerin altında kalıyor?
5. Reşit olmayanlara ürün içi tanıtım/pop-up gösterme kısıtlı mı? AB Dijital
   Hizmetler Yasası'nın (DSA) profilleme temelli reklam yasağı KENDİ ürününün
   tanıtımını da kapsıyor mu, yoksa sadece üçüncü taraf reklamı mı?
6. "Veli ödüyor, öğrenci kullanıyor" yapısı bu sorunları çözüyor mu? Bu yapıyı
   kuran gerçek ürün örnekleri var mı, nasıl kurmuşlar?

Ayrıca: web üzerinden satışla uygulama mağazası (App Store / Google Play) üzerinden
satış arasında bu konuda ne fark var? Mağazaların çocuk kategorisi kuralları ne
getiriyor?

ÇIKTININ SONUNDA: avukata sorulacak soruların listesi. Her soru, senin
araştırmanla cevaplanamayan bir belirsizliğe karşılık gelsin — avukatın saati
bilineni öğrenmek için değil, bilinmeyeni karara bağlamak için harcanmalı.

KURALLAR — bu bot için özellikle katı:
- SEN AVUKAT DEĞİLSİN ve bu belge hukuki tavsiye değil. Belgenin başına bunu yaz.
  Amacın avukat görüşmesini hazırlamak, onun yerine geçmek değil.
- Her iddia BİRİNCİL kaynağa dayanacak: mevzuat metni, resmî kurum sayfası,
  mağazanın kendi politika sayfası. Hukuk bürosu blog yazısı ikincil kaynaktır —
  kullanabilirsin ama açıkça öyle işaretle ve mümkünse birincil metne in.
- Mevzuat maddesini numarasıyla ver. "GDPR çocukları koruyor" değil, "GDPR m. 8".
- Yargı alanları arasındaki farkı BULANIKLAŞTIRMA. Bir kuralı bir ülkede bulup
  hepsine genellemek bu araştırmanın en olası hatası.
- Emin olmadığında "belirsiz — avukata sorulacak" yaz ve soru listesine ekle.
  Uydurulmuş bir hukuki kesinlik, kabul edilmiş bir belirsizlikten çok daha
  tehlikeli.
- WebFetch özetleri ipucudur, kaynak değildir. Bir mevzuat maddesini yazmadan önce
  metni gerçekten aç.
- Hiçbir yere kayıt olma, hiçbir forma bilgi girme.

ÇIKTI:
docs/research/resit-olmayan-odeme-hukuku-2026-09-02.md
Branch aç, commit'le, push'la. main'e MERGE ETME.
Bitince kısa bir özet ver: planı öldüren bir engel var mı, ve avukata sorulacak
ilk üç soru ne.
```

---

## Üçüne de geçerli teknik kurallar

**ÖNCE BUNU YAP — kendi çalışma dizinini aç.** Ana dizin
(`/Users/adasarpkirik/Desktop/Founder/ORYN`) koordinatör oturumun; orada branch açma,
orada commit'leme. Kendine ayrı bir worktree aç:

```bash
git -C /Users/adasarpkirik/Desktop/Founder/ORYN worktree add ../ORYN-wt-<kisa-ad> -b <dal-adi> main
```

Sonra `../ORYN-wt-<kisa-ad>` içinde çalış.

Bu kural 2026-09-02 gecesi eklendi, çünkü tam olarak bu yaşandı: bir araştırma oturumu
ana dizinde dal açtı, koordinatörün orada duran kaydedilmemiş değişiklikleri o dalın
üstüne commit'lendi. Kurtarıldı — ama sadece üçüncü bir oturum izlediği için dört
dakikada fark edildi. **Bir dizinde tek yazar.**

Diğer kurallar:

- **main'e merge yok.** Branch aç, push'la, orada bırak.
- **Canlı veritabanına yazma yok.** Bu botların veritabanına hiç dokunmaması gerekiyor.
- **Migration uygulama yok, zamanlama (cron) değişikliği yok.** Kurucu onayına tabi.
- **Hiçbir yere kayıt olma, form doldurma, satın alma.** Sadece okuma.
- Çıktı dosyası dışında repo'da bir şey değiştirme.
