# Araştırma kuyruğu — sıradaki iş

**Kurulum: 2026-09-02.** Founder'ın talimatı: *"her iş biterse daha fazla büyüt, üni ve
opportunity şeylerini araştır — yani iş var, 'iş bitti' deyip durma."*

## Nasıl kullanılır

**Bu kuyruk entegratörün (oryn-a7) dağıtım listesidir. Lane kendi kendine bölge almaz.**

Bir paket bittiğinde: entegratöre bildir ve **sıradaki işi ondan iste.** Buradan kendin
seçme — founder'ın açık talimatı bu yönde: *"sana sorsunlar, organizasyondan açık
vermeyelim."*

Sebebi somut: iki lane aynı bölgeye girdiğinde çakışma çıkıyor. Bu gece migration
numarasında iki kez yaşandı ve ikisi de "sıradakini aldım" varsayımından çıktı. Tek bir yerden
dağıtılmadığında kimin neyi aldığı da, ne kadarının bittiği de kimsede toplu durmuyor.

Entegratör bir bölge verdiğinde o satırı `SAHİPLİ — <lane>` olarak işaretler. Bir bölgeye
başlamadan önce **o bölgede daha önce ne yapıldığını oku** — bu gece dört oturum, hafızada
zaten yazılı bir bilgiyi yeniden keşfetti.

## Ölçülmüş boşluklar — hepsi bu gece canlı veriden doğrulandı

| # | Bölge | Bilinen gerçek | Durum |
|---|---|---|---|
| 1 | **Fırsat görselleri** | Neredeyse tamamı eksik; sütun/kova/önceki denemeler bilinmiyor. **Lisans sorusu founder'a gidecek, commit'e değil.** | SAHİPLİ — oryn-d0 (2026-09-03) |
| 2 | **Doğrulanmamış fırsatlar** | 283 aktifin 75'i `cycle_status='unverified'`; hiçbiri kapıdan elenmiyor çünkü hepsinde soy-zinciri damgası var | SAHİPLİ — oryn-4e (2026-09-03) |
| 3 | **Son tarihi olmayan "açık" kayıtlar** | **BİTTİ (oryn-bd).** 25 kayıt tek bir boşluk değil, dört ayrı bulgu: 9'u zaten doğru (rolling), 4'ü şema kararı istiyor, 7'si organizatörce yayınlanmamış, 5'i crawler'ı reddeden host. Sıfır SQL — uydurulacak tarih yoktu. `docs/opportunity-deadline-gaps-2026-09-02.md` | kapandı |
| 4 | **Türkiye'yi dışlayan kayıtlar** | 20 kayıt `eligible_countries`'ten Türkiye'yi çıkarıyor, gerekçe metni yok. İkisi (AI Scholars, SEAP) meşru şekilde ABD-only çıktı — kalan 18 okunmadı | boş |
| 5 | **`under_review` havuzu** | 107 kayıt; hiçbir kod yolu bunları `active`'e geçirmiyor — tek yönlü kapı. Bir gün açılırsa aynı doğrulama sorunu ~3 katı ölçekte döner | boş |
| 6 | **Yeni ülke / kurum genişletmesi** | Founder'ın kendi listesinde: "Yeni ülke ekleme: 40 kurum" | boş |
| 7 | **Ülke bazlı kabul sistemleri** | Şartname 8 ülke sayıyor (ABD, UK, Fransa, Hollanda, Almanya, İtalya, İsviçre, Türkiye). Hangileri gerçekten kurulu, bilinmiyor | SAHİPLİ — oryn-3f (2026-09-03) |
| 8 | **Üniversite gereksinim kapsamı** | `university_requirements` kaç programı gerçekten kapsıyor, ve `is_exclusion` düzeltmesinden sonra kaç kural geri geldi | boş |
| 9 | **Program–gereksinim eşleşmesi** | `program_id` tam eşleşme boru hattı kuruldu; kapsamı ölçülmedi | boş |
| 10 | **Fırsat kategorisi dengesi** | `summer_program` katalogun %49'u. Yarışma, araştırma, burs, staj tarafları ince | SAHİPLİ — oryn-bd (2026-09-03) |

## Her bölge için geçerli kurallar

**Canlıya yazma yok** — bulguları rapor et, SQL'i hazırla, uygulamayı founder'a bırak.
Bu gece 35 satırlık bir düzeltme tam olarak böyle bekledi ve doğru olan buydu.

**Kaynak ve tarih olmadan kayıt olmaz.** Resmî kurum sayfası > resmî veri seti > tanınmış
kaynak. Arama sonucu tek başına kaynak değildir.

**Bulamadıysan "bulamadım" de.** Bu üründe uydurulmuş bir son tarih, eksik bir son tarihten
çok daha pahalıdır — öğrenci ona göre plan yapar.

**Sayı verirken çalıştırdığın sorguyu ver.** Bu gece "hiç çalıştırmadığın bir sayıyı söyleme"
kuralı birden fazla kez işe yaradı.

## Bölge dağıtımı — 2026-09-03 gecesi

Founder'ın tekrar ettiği talimat: *"iş bitince araştırmaya geç, 8 lane'le."* Yani bir lane
inşa paketini bitirdiğinde durmaz — entegratöre döner, araştırma bölgesi alır.

| Lane | Şu anki iş | Sonrası |
|---|---|---|
| oryn-4e | Araştırma — satır 2 (75 `unverified` kayıt) | — |
| oryn-bd | Araştırma — satır 10 (kategori dengesi, ince kategorileri büyütme) | — |
| oryn-3f | Araştırma — satır 7 (8 ülkenin kabul sağlayıcıları gerçekten kurulu mu) | — |
| oryn-d0 | Araştırma — satır 1 (fırsat görselleri; lisans sorusu founder'a) | — |
| oryn-b9 | İnşa — `vercel.json` iş zamanlaması (9 rotanın 4'ü armed) | araştırmaya döner |
| oryn-31 | İnşa — katalog temizliği arayüzü + tek zaman çizelgesi | araştırmaya döner |
| oryn-f5 | İnşa — iş bütçeleri 0099, hibe defteri 0096, fiyat tablosu | araştırmaya döner |
| oryn-60 | İnşa — büyüme bölümü | araştırmaya döner |

**Çakışmayı önleyen ayrım:** 4e `cycle_status`'ta, bd `category` ve yeni kayıtlarda, d0
`image_url`'de, 3f üniversite tarafında. Aynı sütuna iki lane girmiyor. Satır 5
(`under_review`, 107 kayıt) bilerek boş bırakıldı — `cycle_status`'a dokunuyor ve 4e orada.
