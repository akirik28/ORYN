# Özelleşme — özellik şartnamesi

**Kurucunun 3 Eylül 2026 tarihli kararları.** Bu belge kararların kaydı; tartışma değil.
Uygulama sırasında bir şey burada yazandan farklı çıkarsa, önce burayı düzelt.

---

## Ne satın alınıyor

| | Standart | Ultra |
|---|---|---|
| Sohbet sayısı | **Tek sohbet.** Her konu aynı yerde | **Sınırsız oturum** |
| "Yeni oturum" düğmesi | **Görünür ama kilitli** — tıklayınca yükseltme kutusu | Çalışır |
| Geçmiş | **24 saat dokunulmazsa özetlenir, ham metin silinir** | **Silinmez** |
| Talimatlar | Var, **500 karakter** | Var, **2.000 karakter** |
| Eşzamanlı üretim | 1 | **1** (ikisi de aynı) |

**Eşzamanlı üretim ikisinde de bir tane.** Ultra daha çok oturum açabilir ama aynı anda
yalnız birinde cevap üretilir. Kota aylık harcamayı sınırlar; bu ise anlık paralelliği.

---

## 1. Talimatlar

Öğrencinin danışmana kalıcı talimatı: *"kısa yaz"*, *"tıp önerme"*, *"sadece Avrupa"*.
Her sohbette, her istemde geçerli.

**Karakter limiti neden 500 / 2.000:** talimat metni her danışman çağrısının sistem
istemine giriyor. 500 karakter ≈ 125 token, tipik bir çağrının (~3.600 giriş token)
%3,5'i. 2.000 karakter ≈ 500 token, %14. Ultra'nın bütçesi iki katı olduğu için ikincisini
taşıyabiliyor. Limit gösterilmeli — öğrenci sınıra dayandığında Ultra'nın dört katı
verdiğini orada görsün.

**Sınır sunucu tarafında zorunlu.** İstemciyi atlayıp doğrudan çağıran biri 20.000
karakter yazamamalı; bu bir maliyet kontrolü, bir arayüz nezaketi değil.

---

## 2. Oturumlar ve premium duvarı

Standart kullanıcı yan panelde **"yeni oturum" düğmesini görür.** Tıklayınca yükseltme
kutusu çıkar.

**Bu kutu, bugün reddedilen kalıptan farklı ve fark önemli:** reddedilen kutu, öğrencinin
okumaya geldiği danışmanlığın **üstüne kendiliğinden** biniyordu. Bu kutu ise
**öğrencinin kendi tıklamasına cevap** — neden çalışmadığını açıklıyor. Modal'ın meşru
kullanımı budur.

**Yine de iki kural:** sağ üstte kapatma (×) her zaman erişilebilir olsun, ve "yükselt"
ile "kapat" görsel ağırlıkta kasten eşitsiz **olmasın**. Reddedilme sebebi animasyon
değildi, bu ikisiydi.

`features/advisor/upgrade-prompt-overlay.tsx` ve `lib/advisor/upgrade-prompt.ts` zaten var
— yeni bir mekanizma yazma, bunu kullan.

---

## 3. Yirmi dört saat kuralı

**Saat mesajın yaşından değil, sohbetin durgunluğundan işler.** Bir sohbete 24 saat
dokunulmazsa: özetlenir, ham mesajlar silinir, özet kalır.

**Neden mesaj yaşı değil:** cumartesi yazıp pazar akşamı dönen öğrenci, kendi sohbetinin
başını kaybederdi — cevaplar havada kalırdı. Model bundan etkilenmez (zaten son 40 mesajla
sınırlı), **öğrenci etkilenir.**

**Bunun gerekçesi maliyet değil, veri minimizasyonu.** Modele giden geçmiş zaten
`MAX_HISTORY_TURNS = 40` ile sınırlı; ham metni silmek token kazandırmaz, depolama
kazandırır. Asıl kazanç şu: kullanıcıların çoğu reşit değil ve `LEGAL_REVIEW.md` §3'te
saklama süresi **cevabı olmayan açık bir soru.** Bu özellik o sorunun cevabı olabilir.

**Ultra'da silme yok.** Bu, satılan şeyin bir parçası.

**Uygulanmadan önce gizlilik metnine yazılmalı.** Veri dışa aktarma da etkileniyor: silme
sonrası aktarım ham sohbet yerine özet içerir. Bu, kullanıcıya söylenmeden yapılamaz.

---

## 4. Sonra gelecek, şimdi değil

**Kişilik/odak seçimi** (sert ↔ destekleyici, alan odağı) kurucunun listesinde var ama
sıralamada sonda. Sebebi: her odak ayrı bir sistem istemi ve ayrı test demek, ve talimat
alanı zaten *"bana sert davran"* yazılmasına izin veriyor. Önce ucuz ve güvenilir olan.

**Sohbetler arası hafıza** — danışmanın geçmiş oturumlardan öğrenmesi — özet katmanının
üstüne kurulacak. Bugün hiç yok: geçmiş yalnız sohbetin kendi içinde, 40 mesajla sınırlı.

---

## Hafıza üç katman

| Katman | Kim yazar | Ömrü | Maliyet |
|---|---|---|---|
| **Talimatlar** | Öğrenci, açıkça | Kalıcı | Sıfır ek çağrı |
| **Özet** | Sistem, çıkarımla | Uzun | Sohbet başına bir çağrı |
| **Ham mesajlar** | — | Sohbet içi, 40 mesaj | Zaten var |

Talimatlar bir ay sonra hâlâ doğru. Özet, yazıldığı anın tahmini. Bu yüzden talimatlar
önce geliyor.
