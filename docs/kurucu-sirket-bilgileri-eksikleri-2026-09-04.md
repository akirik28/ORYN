# Web sitesinde eksik olan şirket bilgileri

Ekran görüntüsünde gördüğün `[Registered name]` yazısı düzeltildi — artık "tescil
bekleniyor" gibi normal bir ifade gösteriyor, köşeli parantez yok. Ama asıl eksik hâlâ
duruyor: Gizlilik ve Kullanım Şartları sayfalarında şirketin gerçek bilgileri henüz
girilmedi, çünkü bu bilgiler sen olmadan girilemez.

## Senin tamamlayabileceğin 4 madde (tek oturuşta bitebilir)

1. **Ticaret unvanı** — Şirketi resmî olarak kurup tescil ettirdiğinde netleşecek.
2. **Ticaret sicil numarası** — Kuruluş sırasında verilir, tescil belgelerinde yazar.
3. **Kayıtlı adres** — Yine kuruluş sürecinde belirlenir (muhtemelen aynı süreçte, bir
   mali müşavir veya avukat aracılığıyla).
4. **Gizlilik e-postası** (`privacy@proxola.com`) — Ayrı bir kuruluş gerektirmiyor;
   `hello@proxola.com` gibi bu adresi de kurup mevcut kutuna yönlendirmen yeterli.

İlk üçü aynı adımdan geliyor: şirket resmen kurulup tescillendiğinde hepsi birden
netleşir. Dördüncüsü ayrı ve daha küçük bir iş — sadece bir e-posta yönlendirme kuralı.

## Senin değil, hukuk danışmanının kararı — bilgin olsun diye, senden bir şey beklemiyor

- **VERBİS kaydı** — Şirketin büyüklüğüne göre gerekip gerekmediğine avukat karar
  vermeli.
- **Veri Sorumlusu Temsilcisi** — Bu rolün gerekip gerekmediği (GDPR Madde 37) yine
  hukuki bir değerlendirme.
- **Geçerli hukuk / yetkili yargı alanı** — Hangi ülke hukukunun geçerli olacağı avukat
  tarafından belirlenmeli.

## Bu bilgileri nereye gireceksin

Tek bir yer: `lib/legal/content.ts` dosyasındaki `COMPANY` sabiti. Oraya girdiğinde,
aynı bilgi otomatik olarak hem site altbilgisinde hem üç hukuki belgede (Gizlilik,
Kullanım Şartları, KVKK) aynı anda görünür — ayrı ayrı güncellemen gerekmez.
