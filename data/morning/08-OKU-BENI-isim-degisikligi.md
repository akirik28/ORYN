# İsim değişikliği — veritabanı metni, 3 Eylül akşamı

**Tek dosya, tek çalıştırma: `08-isim-degisikligi-veri-2026-09-03.sql`.**
Supabase SQL Editor'e yapıştır, çalıştır. Hepsi tek işlem içinde — biri hata verirse hiçbiri
uygulanmaz, veritabanı olduğu gibi kalır.

## Önce iki soru — sadece sen kapatabilirsin

**1. Ayrı bir production Supabase projesi var mı? — KAPANDI, ama sonucu bilmen gerekiyor.**
oryn-45 kendi hesabındaki üç projeyi de kontrol etti: `stem & buds` (aktif, senin başka bir
ürünün), `menter-chatbot` (pasif, alakasız), `oryn-qa-scratch` (aktif, bu gece her şeyin
üzerinde çalıştığı proje). **Ayrı bir "gerçek" ORYN veritabanı yok, hiç olmadı** — bu dosyanın
düzelttiği satırlar, var olan satırların tamamı.

Bunun asıl anlamı isim değişikliğiyle ilgili değil: **ürünün gerçekten çalıştığı veritabanının
adı "qa-scratch."** Gerçek auth kullanıcıları, gerçek yüklenmiş kanıt dosyaları taşıyor
(`DATA_RIGHTS_AUDIT.md`, sahipsiz bir dosyanın `evidence` bucket'ında durduğunu kaydediyor) —
isminin dışında her şeyiyle production. "Scratch" diyen bir isim, birinin onu tek kullanımlık
sanmasına davetiye çıkarıyor — sabah paketi zaten "panelde ORYN yazmıyor, doğru sekmede
olduğundan emin ol" diye uyarıyor, çünkü yanlış sekmeye SQL yapıştırmak kolay; aynı belirsizlik
yanlışlıkla silmeyi de kolaylaştırıyor. Gerçek deploy geldiğinde bu proje yeni bir adla
production mu olacak, yoksa taze bir proje mi açılıp veri oraya mı taşınacak — bu senin kararın,
bizim değil, ama kimse isimlendirmediği için kendiliğinden olan bir şey olmamalı.

**2. `oryn.app` domain'i sana mı ait? — AÇIK, sadece sen kapatabilirsin.**
Birkaç script'te (`scripts/acquire-university-facts.ts` ve benzerleri) dış API'lere giden
User-Agent metninde ve bir `mailto=` parametresinde geçiyor. Gerçekten sahip olduğun bir alan
adıysa, `proxola.com`'un yanına eklenmesi gereken ayrı bir altyapı parçası — repo'dan bunu
bilmemiz mümkün değil.

## Ne var içinde

Öğrenciye görünen, geçmişte AI tarafından üretilip veritabanına yazılmış 6 kategori — kod
tarafındaki prompt düzeltmesi bunları geriye dönük düzeltmiyor, onlar zaten yazıldı:

| Tablo | Satır | Kendiliğinden düzelir mi |
|---|---|---|
| `student_requirement_evaluations.reasoning` | 112 (tek kalıp cümle) | Hayır — doğal yenilenme yok |
| `weekly_actions.reason` | 6 | Evet, birkaç gün içinde (haftalık plan döngüsü) — yine de dosyada |
| `notifications.body` | 2 | Evet, aynı döngü |
| `weekly_plans.summary` | 2 | Evet, aynı döngü |
| `ai_recommendations.reason` | 2 | Genel bir garanti yok — güvenli tarafta |
| `opportunities.description` | 4 (sadece marka adı) | Hayır — fırsat yeniden araştırılmadıkça |

`replace()` kullanıldı, tam metni yeniden yazmak değil — yanlışlıkla iki kez çalıştırılırsa
ikinci çalıştırma hiçbir şeye dokunmaz (satırı bozmaz).

**Ayrıca çalıştırıp doğruladım**: dosyadaki 6 UPDATE'in birebir aynısını canlıda BEGIN/ROLLBACK
içinde gerçekten çalıştırdım (kalıcı hiçbir şey yazılmadı) — sonuçlar bu sayfadaki tabloyla
birebir eşleşti.

## Ne bilerek dışarıda bırakıldı

- ~750 satırlık araştırma-doğrulama iç metni ("ORYN 4 kaydıyla karşılaştırıldı" türünden) —
  bunlar tarihli bir audit dosyasının veritabanı karşılığı, öğrenci hiç görmüyor.
- `ORYN-PRG-NNNN` kayıt numarası şeması — başka tablolarla eşleşme anahtarı olabilir,
  doğrulanmadı.
- `oryn_global_id` ve `oryn_public` — gerçek şema nesneleri (kolon/kısıt/enum), ayrı bir
  migration kararı gerektiriyor, bu dosyanın işi değil.
- Test/QA sabit verileri ve filo oturum kod adları (`oryn-d0` gibi) — ürün markası değil.

Tam liste ve gerekçeler SQL dosyasının kendi sonunda.

## Sıra

`docs/rename-inventory-proxola-2026-09-03.md`'deki dört kovaya göre beş şerit çalışıyor — bu
dosya beşincisinin (veritabanı) sonucu. Diğer dördü kod tarafını kapsıyor; bu dosya sadece
kodun göremediği, veritabanına zaten yazılmış metni.
