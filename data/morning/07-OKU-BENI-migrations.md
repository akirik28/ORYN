# Bekleyen migrasyonlar — 3 Eylül akşamı

**Tek dosya, tek çalıştırma: `07-migrations-bekleyen-2026-09-03.sql`.**
Supabase SQL Editor'e yapıştır, çalıştır. Hepsi tek işlem içinde — biri hata verirse hiçbiri
uygulanmaz, veritabanı olduğu gibi kalır.

## Ne var içinde

Bugün **yazılan ama uygulanmayan** 8 migrasyon, kendi sıralarıyla:

| # | Ne yapar | Uygulanmazsa ne olur |
|---|---|---|
| 0107 | `page_views` tablosu | Sayfa görüntüleme sayımı çalışmaz — kumanda paneli o sayıyı boş gösterir |
| 0108 | `universities.academic_tier` (+ yerel ad) | Uygulamalı bilimler/üniversite ayrımı veritabanında yok; 277 satırlık koridor verisi yazılamaz |
| 0109 | `curriculum_other_text` (profil + eğitim kaydı) | Listede olmayan müfredatı yazan öğrencinin metni kaybolur |
| 0110 | `advisor_generation_locks` tablosu | "Aynı anda tek ajan" kuralı uygulanamaz — Ultra'nın satılan özelliklerinden biri |
| 0111 | `profiles.advisor_instructions` | Özelleşme'nin 1. parçası: kalıcı talimat kutusu kaydedemez |
| 0112 | `advisor_conversations.summary` + geçmiş tablosu | 24 saatlik sohbet özetleme/silme işi çalışamaz |
| 0113 | `feedback_reports` tablosu | Geri bildirim formu çalışmaz — öğrenci "şu anda kullanılamıyor" görür (sessizce kaybolmaz, orası doğru çalışıyor) |
| 0114 | `profiles.digest_email_enabled`, `last_digest_sent_at` | Periyodik e-posta özeti kime gideceğini bilemez |

## Neyi doğruladım, neyi doğrulamadım

**Doğruladım:** dosyanın oluşturacağı **14 nesnenin hiçbiri şu anda veritabanında yok**
(4 tablo, 9 kolon, 1 enum tipi — `feedback_reports` dahil, akşam ayrıca kontrol edildi) — yani "zaten var" hatası çıkmaz. Dokunacağı 4 ana tablo
(`universities`, `profiles`, `education_records`, `advisor_conversations`) **var** — yani
"tablo yok" hatası da çıkmaz. Dosyada iç içe `begin/commit` kaçağı yok, sadece en dıştaki ikisi.

**Ayrıca çalıştırıp doğruladım — artık "belki sözdizimi hatası vardır" ihtimali de kapandı.**
Bu makinede zaten kurulu olan yerel Postgres 17'de (Supabase ile aynı ana sürüm) sıfırdan bir
veritabanı kurdum, **canlı veritabanının bugünkü hâlini birebir kurdum** (0001-0106 arası 106
migrasyon), sonra **senin yapıştıracağın dosyanın tam olarak kendisini** çalıştırdım.

Sonuç: **hatasız çalıştı**, ve oluşturması gereken 14 nesnenin **14'ü de** oluştu — 4 tablo,
9 kolon, 1 enum tipi. Ayrıca ayrı bir testte 114 migrasyonun tamamı baştan sona temiz uygulandı.

**Canlı veritabanına hiçbir şey yazılmadı** — bunların hepsi bu makinedeki geçici bir
veritabanında oldu.

## Sıra

Bu dosyanın diğerlerine göre yeri: **önce bu, sonra veri dosyaları.** Bugünkü paketin
1-6 numaralı dosyaları zaten uygulandı; bu 7. dosya onların üstüne gelir.
