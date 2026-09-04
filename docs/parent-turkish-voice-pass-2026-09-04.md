# Veli Türkçesi — tek belge olarak okuma (4 Eylül 2026)

CEO'nun isteği: yedi şerit gece boyunca bağımsız Türkçe metin yazdı, hiçbiri diğerlerinin
yanında okunmadı. Bu belge okuma sürecinin kendisi — hangi ekran, hangi okur, ne bulundu, ne
düzeltildi, ne CEO'ya bırakıldı.

**Yöntem:** her yüzeyin okuyucusunu önce belirledim (öğrenci mi, veli mi), sonra o okuyucu
için doğru register'ın (sen/siz) ne olduğunu üç bağımsız şeritten (P2 giriş sayfası, panel,
P7 yükseltme pop-up'ı — üçü de zaten "siz" kullanıyordu) doğruladım, sonra kendi P4 metnimi
buna karşı kontrol ettim.

---

## Neyin okuru kim — kurulan çerçeve

| Yüzey | Okur | Doğru register |
|---|---|---|
| Ayarlar "Veli hesabı" bölümü | Öğrenci | sen |
| Kayıt formu veli e-postası alanı | Öğrenci | sen |
| Dashboard "veli e-postası ekle" pop-up'ı | Öğrenci | sen |
| Davet e-postası içeriği | **Veli** | **siz** |
| Kabul sayfası (accept-invite) | **Veli** | **siz** |
| Veli girişi sayfası | **Veli** | **siz** |
| Bekleme ekranları (pending/revoked/no_link) | **Veli** | **siz** |
| Veli paneli | **Veli** | **siz** |
| P7 yükseltme pop-up'ı | **Veli** | **siz** |
| Haftalık AI yorumu | **Veli** | 3. şahıs, "siz" bile değil — aşağıda |

---

## Ne tuttu — üç şerit doğru kurmuş

`app/parent/login/page.tsx` (P2), `features/parent/parent-panel-view.tsx` (P3),
`lib/parent/upgrade-prompt.ts`'in ürettiği `parent.upgradePrompt` metni (P7) — üçü de
baştan sona "siz" kullanıyor: "Çocuğunuzun gelişimini görün", "Yalnızca
gözlemleyebilirsiniz", "çocuğunuzun kendi hesabında". Bu üç şerit bağımsız olarak aynı
kararı verdi — kurulan çerçevenin kaynağı bu, benim kendi tercihim değil.

`features/parent/parent-pending-screen.tsx` (11'in düzeltmesi) — üç durumun hepsi zaten
doğru siz: "isteyin", "size doğru gelmiyorsa". **"Revoked" mesajını CEO'nun isteği üzerine
taze okudum:** öğrencinin bağlantıyı bilerek kaldırması ile e-posta düzeltmesinin yan etkisi
olarak kaldırılması iki ayrı, nötr ihtimal olarak sunuluyor, hiçbiri suçlamıyor. **Gerçekten
oturuyor** — tek bir küçük, kesin olmayan öneri: iki ihtimal şu sırada ("doğrudan
kaldırması... ya da... yan etki") — daha yumuşak olan ihtimali önce söylemek okuyanın ilk
tepkisini biraz yumuşatabilir. Bu bir zevk meselesi, CEO'ya bırakıyorum, kendim
değiştirmedim.

---

## Ne düzeltildi

### A. `parentInvite` namespace'inin veli-okur yarısı — 13 string, sen→siz

Kendi P4 çalışmam. Ayarlar bölümü (öğrenciye) doğru sen kullanıyordu; **davet e-postası ve
kabul sayfası (veliye) yanlışlıkla aynı sen register'ını miras almıştı** — muhtemelen
uygulamanın genel (öğrenci-odaklı) sen konvansiyonunu, o iki ekranın okuru öğrenci
olmadığını fark etmeden tekrarladım.

Düzeltilen 13 key (`messages/tr.json`): `emailSubject`, `emailBodyWhatYouSee`,
`emailBodyWhatYouCannotSee`, `emailBodyPremiumNote`, `emailBodyCta`, `acceptPageTitle`,
`acceptPageDescription`, `acceptInvalidDescription`, `acceptExpiredDescription`,
`acceptFormNameLabel`, `acceptFormSubmit`, `acceptSuccessDescription`,
`acceptWhatYouCanSeeTitle`. Örnek: "Proxola'ya davet edildin" → "Proxola'ya davet
edildiniz"; "Şifreni mi unuttun" tarzı "Adın" → "Adınız".

### B. `LoginForm` — sen içeriği veli girişine sızıyordu (yeni bulgu, kod değişikliği)

`app/(auth)/_components/login-form.tsx`, `/login` (öğrenci) VE `/parent/login` (veli)
tarafından **aynı bileşen olarak** kullanılıyor. `auth.login` namespace'i tamamen sen:
"Şifreni mi unuttun?". Veli giriş sayfasının kendi başlığı ("Veli girişi... Çocuğunuzun")
doğru siz iken, **içine gömülü form aynı ekranda sen'e düşüyordu** — CEO'nun tam olarak
sorduğu "bir ekran diğerinden sıcak, bir ekran sistem bildirimi gibi okunuyor mu" durumunun
aynı sayfa İÇİNDE gerçekleşen hâli.

Düzeltme: `UpgradePromptOverlay`'in kendi `namespace` prop deseniyle aynı — `LoginForm` artık
opsiyonel bir `namespace` prop alıyor (varsayılan `auth.login`, öğrenci için davranış
değişmedi), `/parent/login` artık `namespace="parent.login"` geçiyor. Yeni `parent.login`
key'leri (email/şifre etiketleri, "Giriş yapın") çoğunlukla `auth.login` ile aynı metin
(nötr olduğu için), tek gerçek fark `forgotPassword`: "Şifrenizi mi unuttunuz?" (siz).

**Düzeltilmeyen, bilerek bırakılan parça:** `signIn()` Server Action'ının (`app/(auth)/
actions.ts`) kendi hata mesajları (`incorrectCredentials`, `emailInvalid`,
`passwordRequired`) hâlâ koşulsuz `auth.login`'den okunuyor — bir veli şifresini yanlış
yazarsa "Şifreni gir." (sen) görür. Bunu düzeltmek paylaşılan, güvenlik açısından hassas
auth action'ına bir "kim çağırıyor" ayrımı eklemek demek — bu gece bir kopya-metin
turundan daha büyük bir yapısal değişiklik, CEO'ya bırakıyorum.

### C. Haftalık AI yorumu — gerçek bir hata, register değil, referans hatası

Bu en ciddi bulgu. `lib/digest/parent-commentary.ts`'in AI-olmayan iki yedek yolu
(`assembleFactsWithoutAI` VE AI modeline verilen fact-sentence'ın kendisi) paylaşılan
`describeProfileChange` (`lib/scoring/change.ts`) fonksiyonunu **doğrudan** çağırıyordu. O
fonksiyon **öğrenciye** yazılmış: "Son incelemenden bu yana..." (SENİN son incelemen). Ama
bu cümle **veliye** gönderiliyordu — ve velinin hiç "incelemesi" yok. Bu sen/siz meselesinden
öte: **anlam olarak yanlış bir referans.**

Düzeltme: `lib/scoring/change.ts`'e yeni bir fonksiyon (`describeProfileChangeForParent`) —
aynı seçim mantığı (en çok ilerleyen alan, vb.), ama 3. şahıs, öğrenciyi adıyla anan, hiç
"sen/siz" demeyen metin — `lib/ai/parent-commentary-prompt.ts`'in AI'a verdiği talimatla
birebir aynı ilke ("3. şahıs, asla 'siz' tekrarlamayın"). Öğrenci adı **hiçbir zaman iyelik
ekiyle çekimlenmiyor** ("Ada'nın" gibi) — ad rastgele, veritabanından gelen metin, doğru ünlü
uyumunu derleme zamanında bilemeyiz; bugün canlı veritabanında 10 satırı bozan tam olarak bu
hata sınıfı. "{ad} için" (postposition, hiç değişmez) bunu tamamen atlıyor — aynı dosyanın
kendi `honestNoActivityNarrative` fonksiyonu zaten bu deseni kullanıyordu.

19 yeni test: `describeProfileChangeForParent`'ın kendisi (İngilizce+Türkçe, altı farklı isim
sınıfıyla iyelik eki testi dahil) + `LoginForm`'un namespace prop'u.

---

## CEO'ya bırakılan, kendim karar vermediğim

1. **"Revoked" mesajının cümle sırası** — §"Ne tuttu" bölümüne bakın, öneri var, karar yok.
2. **`signIn()`'in hata mesajları** — §B'nin sonu, kapsam dışı bırakıldı, gerekçesiyle.

---

## Kontrol notu

Tüm `parent`/`veli` ile ilgili kaynak dosyaları (`app/parent/`, `features/parent/`,
`app/(parent-invite)/`, `lib/digest/parent-commentary*.ts`, `lib/ai/parent-commentary-
prompt.ts`, `lib/parent/*.ts`) tek tek `tr ?` desenleri için tarandı, katalogdaki her
`parent`/`parentInvite` anahtarı okundu. `types/database.ts`'e veya migration'lara
dokunulmadı — bu tamamen bir kopya + iki paylaşılan-fonksiyon bulgusu.
