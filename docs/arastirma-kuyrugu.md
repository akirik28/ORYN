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
| 1 | **Fırsat görselleri** | Neredeyse tamamı eksik; sütun/kova/önceki denemeler bilinmiyor | SAHİPLİ — oryn-bd |
| 2 | **Doğrulanmamış fırsatlar** | 283 aktifin 75'i `cycle_status='unverified'`; hiçbiri kapıdan elenmiyor çünkü hepsinde soy-zinciri damgası var | boş |
| 3 | **Son tarihi olmayan "açık" kayıtlar** | 25 aktif kayıt "şu an açık" diyor, son tarihi yok — öğrencinin planlayacağı hiçbir şey yok | boş |
| 4 | **Türkiye'yi dışlayan kayıtlar** | 20 kayıt `eligible_countries`'ten Türkiye'yi çıkarıyor, gerekçe metni yok. İkisi (AI Scholars, SEAP) meşru şekilde ABD-only çıktı — kalan 18 okunmadı | boş |
| 5 | **`under_review` havuzu** | 107 kayıt; hiçbir kod yolu bunları `active`'e geçirmiyor — tek yönlü kapı. Bir gün açılırsa aynı doğrulama sorunu ~3 katı ölçekte döner | boş |
| 6 | **Yeni ülke / kurum genişletmesi** | Founder'ın kendi listesinde: "Yeni ülke ekleme: 40 kurum" | boş |
| 7 | **Ülke bazlı kabul sistemleri** | Şartname 8 ülke sayıyor (ABD, UK, Fransa, Hollanda, Almanya, İtalya, İsviçre, Türkiye). Hangileri gerçekten kurulu, bilinmiyor | boş |
| 8 | **Üniversite gereksinim kapsamı** | `university_requirements` kaç programı gerçekten kapsıyor, ve `is_exclusion` düzeltmesinden sonra kaç kural geri geldi | boş |
| 9 | **Program–gereksinim eşleşmesi** | `program_id` tam eşleşme boru hattı kuruldu; kapsamı ölçülmedi | boş |
| 10 | **Fırsat kategorisi dengesi** | `summer_program` katalogun %49'u. Yarışma, araştırma, burs, staj tarafları ince | boş |

## Her bölge için geçerli kurallar

**Canlıya yazma yok** — bulguları rapor et, SQL'i hazırla, uygulamayı founder'a bırak.
Bu gece 35 satırlık bir düzeltme tam olarak böyle bekledi ve doğru olan buydu.

**Kaynak ve tarih olmadan kayıt olmaz.** Resmî kurum sayfası > resmî veri seti > tanınmış
kaynak. Arama sonucu tek başına kaynak değildir.

**Bulamadıysan "bulamadım" de.** Bu üründe uydurulmuş bir son tarih, eksik bir son tarihten
çok daha pahalıdır — öğrenci ona göre plan yapar.

**Sayı verirken çalıştırdığın sorguyu ver.** Bu gece "hiç çalıştırmadığın bir sayıyı söyleme"
kuralı birden fazla kez işe yaradı.
