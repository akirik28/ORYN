# Bölüm 2 Düzeltmesi — Anthropic Satırı, Yerleştirmeye Hazır

**Bu, `LEGAL_REVIEW.md`'ye ya da Google Doc'a sessizce yapılacak bir düzenleme değil.**
Aşağıda: (1) yerine konacak metin, (2) görünür bir değişiklik notu, (3) aynı türden diğer
kırılgan cümlelerin bir listesi. Hangisinin bugün babaya gideceğine kurucu karar veriyor —
bu belge sadece metni hazır tutuyor.

`lib/ai/student-context.ts`'deki `formatContextForPrompt` fonksiyonu satır satır okundu —
commit'in kendi açıklamasından değil, bugünkü koddan çalışıldı.

---

## Yerine konacak metin

**Eski (bugüne kadar, 2026-08-31'den beri değişmedi):**

> *Alır: kompakt bir profil özeti — görünen ad, mezuniyet yılı, müfredat, ülke, haftalık
> zaman bütçesi, boyut puanları, ve etkinliklerin, projelerin, araştırmaların, ödüllerin
> ve hedeflerin yalnızca başlıkları — artı öğrencinin danışman mesajları. Öğrencinin okul
> adı gönderilmez.*

**Yeni (önerilen, 2026-09-03 itibarıyla koddan doğrudan okunmuş):**

> Alır: görünen ad, mezuniyet yılı (ve buradan hesaplanan "üniversiteye kaç yıl kaldı"
> ifadesi), müfredat, **okul adı**, ülke, haftalık zaman bütçesi, meşguliyet durumu; genel
> kariyer profili puanı (0-100) ve profil tamamlanma yüzdesi; değerlendirilmiş her boyut
> için puan ve güven düzeyi. **Ayrıca:** eğitim kayıtları (okul adı tekrar, **not
> ortalaması**); dersler (ders adı, seviyesi, **notu**); **standart sınav sonuçları
> (sınav adı, puanı, üst sınırı, ve varsa alt puan kırılımları — ör. SAT'ta matematik/
> okuma-yazma, IELTS'te dört beceri ayrı ayrı)**; etkinliklerin, projelerin,
> araştırmaların ve ödüllerin başlıkları (kanıt durumu etiketiyle: kendi beyanı / kanıt
> eklendi, doğrulanmadı / doğrulama reddedildi); sertifikaların başlığı ve **veren
> kurumu**; gönüllülük ve iş deneyimlerinin başlığı, **kurumu**, iş türü ve ücretli olup
> olmadığı; varsa spor deneyimleri (spor adı, seviyesi, kaptanlık, haftalık saat, **serbest
> metin başarı notları**); hedeflerin başlığı ve kategorisi; **ilgi alanlarının tam
> listesi**; hedef üniversitelerin adı, durumu ve outlook etiketi; yaklaşan son tarihler;
> tamamlanmamış başvuru kalemleri; ve **son haftalık eylemlerin sonucu — tamamlandı/
> atlandı/süresi doldu durumu, artı öğrencinin kendi yazdığı serbest metin yansıtma
> notu, varsa** — artı öğrencinin danışman mesajlarının kendisi. **Öğrencinin okul adı
> gönderilir** (hem bu satırda hem eğitim kayıtlarında ayrı ayrı).

*(Kalın kısımlar: ya önceki metinde hiç yoktu, ya da önceki metnin doğrudan söylediğinin
tersi.)*

## Değişiklik notu — belgeye eklenecek görünür satır

> **2026-09-03 düzeltmesi:** Yukarıdaki paragraf 2026-08-31'de yazılmıştı ve o tarihte
> doğruydu. 2026-09-03 sabahı üründe yapılan bir değişiklik (danışman bağlamına altı yeni
> kategori eklenmesi — eğitim kayıtları, dersler, sınav sonuçları, sertifikalar,
> gönüllülük ve iş deneyimleri, ayrıca okul adı) bu paragrafı yanlış hâle getirdi.
> **Değişen ürün, hukuki değerlendirme değildi** — kod bugün değişti, paragraf o
> değişikliği yansıtacak şekilde güncellendi. Özellikle: "öğrencinin okul adı
> gönderilmez" cümlesi artık doğru değil.

## Aynı türden diğer kırılgan cümleler — Bölüm 2'nin geri kalanı

CEO'nun sorduğu soru: "sadece X gönderilir," "yalnızca başlıklar," "içerik saklanmaz" gibi
bir *sınır* iddiası taşıyan başka cümle var mı? Var — hepsi aynı riski taşıyor (ürün
değişir, cümle değişmez), doğru olsalar bile. Bugün tek tek koddan tekrar kontrol edildi,
sonuç her birinin yanına yazıldı:

- **Tavily** — *"search terms only, and they never describe a student."* Sağlayıcı
  dosyası (`lib/providers/tavily.ts`) bugün değiştirilmemiş (git log ile doğrudan
  kontrol edildi) — **hâlâ doğru görünüyor**, ama bu tür bir cümle olduğu için işaretlendi.
- **OpenAlex** — *"No name, email, or account identifier is attached."* Aynı şekilde,
  dosya bugün değiştirilmemiş — **hâlâ doğru görünüyor**, aynı gerekçeyle işaretlendi.
- **College Scorecard** — *"university identifiers only."* Aynı, dosya değişmemiş —
  **hâlâ doğru görünüyor**.
- **Kapanış cümlesi, "not prompt content"** (AI kullanım günlüğü hakkında) — bu, tam
  olarak kırılan cümleyle aynı sınıftan bir iddia olduğu için özellikle kontrol edildi:
  `lib/ai/usage.ts`'deki gerçek `insert` çağrısı bugün doğrudan okundu — yazılan alanlar
  `user_id, feature, provider, model, input_tokens, output_tokens, estimated_cost,
  degraded, degrade_reason`; hiçbir prompt/mesaj içeriği alanı yok. **Bugün itibarıyla
  doğrulandı, hâlâ doğru.**
- **Supabase** — *"Receives: everything the student enters or uploads."* Bu, tersine bir
  sınır iddiası ("her şey") — daha az kırılgan (eksik kalması, fazladan bir şeyin
  "her şey"in dışında kalması anlamına gelmez), ama yine de bir bütünlük iddiası
  olduğu için buraya not edildi.

**Sonuç: bugün yeniden kontrol edilen dört cümlenin (Tavily, OpenAlex, College Scorecard,
"not prompt content") hepsi hâlâ doğru — sadece Anthropic satırı kırıldı.** Ama hepsi aynı
kırılganlık sınıfında; gelecekte ürün her değiştiğinde tek tek gözden geçirilmesi gereken
liste bu.

## LEGAL_REVIEW.md'nin kendisi için — İngilizce, istenmedi ama hazır

Google Doc'a giden Türkçe metin yukarıda. `LEGAL_REVIEW.md` dosyasının kendisi de aynı
şekilde eskimiş olduğu için (İngilizce), aynı düzeltmenin İngilizcesi, istenmese de hazır
olsun diye buraya bırakıldı — ayrı bir karar, bu belge onu talep etmiyor:

> **Receives (updated 2026-09-03):** display name, graduation year (and a derived "years
> until university" framing), curriculum, **school name**, country, weekly time budget,
> busy-mode status; overall career-profile score (0–100) and profile completeness
> percentage; per-dimension scores and confidence for assessed dimensions. **Also:**
> education records (school name again, **GPA**); courses (name, level, **grade**);
> **standardized test scores (name, score, max score, and per-section subscores where
> present)**; activity/project/research/award titles (each tagged self-reported /
> evidence-added-unverified / verification-rejected); certification titles and **issuing
> organizations**; volunteering and work-experience titles, **organizations**, employment
> type, and paid status; sports experiences where present (sport, level, captain status,
> weekly hours, **free-text achievement notes**); goal titles and categories; **the full
> interests list**; target-university names, status and outlook; upcoming deadlines;
> unfinished application checklist items; and **recent weekly-action outcomes — completed/
> skipped/expired status plus the student's own free-text reflection note, where one was
> written** — plus the student's advisor messages themselves. **The student's school name
> is sent** (both in this line and separately in education records).

## Kaynaklar

`lib/ai/student-context.ts`'in tamamı, özellikle `StudentAdvisorContext` arayüzü (satır
206-336) ve `formatContextForPrompt` fonksiyonu (satır 586-796) — bugün baştan sona
okundu, commit mesajından çalışılmadı. `lib/ai/usage.ts`'deki gerçek `insert` çağrısı,
"not prompt content" iddiasını doğrulamak için ayrıca okundu.
