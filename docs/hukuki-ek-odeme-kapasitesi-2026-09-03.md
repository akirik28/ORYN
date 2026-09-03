# Ek — Dördüncü Sorunun Kapsamı: Veli Onayı, Yalnızca Veri Değil Ödeme de

**Bu belge, bu sabah gönderilen `ORYN — Hukuki İnceleme Dosyası`'ndaki dördüncü soruya
(küçüklerin rızası) bir ektir — yeni, dokuzuncu bir soru değil.** Amaç: mevcut dördüncü
sorunun sadece veri işleme bağlamında değil, ürünün ticari (ücretli abonelik) tarafında da
aynı şekilde geçerli olduğunu göstermek. Tek soru iki sonuç doğuruyorsa, bunu tek soru
olarak sormak, iki ayrı ve dar cevap almaktan daha doğru bir yol.

Yazılış tarihi: 2026-09-03. Kaynak, `LEGAL_REVIEW.md`'nin §3 madde 4 ve §6'sının kendisi —
burada tekrar edilmiyor, üzerine ekleniyor.

---

## Ürünün bugün ne yaptığı — önce bu, dosyanın geri kalanıyla aynı disiplinle

Oryn, Ultra adlı ücretli bir plan tanımlamış durumda (399,99 TL/ay), ama bunu satın almak
**bugün mümkün değil.** Planlar sayfasının kendi metni bunu açıkça söylüyor: *"Ultra henüz
kayıtlara açık değil."* Kod tarafında doğrudan kontrol edildi:

- **Fiyatlandırma gerçek ve yönetici panelinden düzenlenebilir.** Aylık ücret ve kur ayarı
  zaten var, canlı sistemde.
- **Tahsilat altyapısı hiç yok.** Hiçbir ödeme sağlayıcısı (iyzico, PayTR, Stripe veya
  başka biri) koda entegre edilmemiş — kod tabanında doğrudan arandı, bulunamadı.
- **"İlgileniyorum" butonu yalnızca ilgiyi kaydediyor.** Bir öğrenci tıkladığında bu, o
  öğrencinin kimliğine bağlı gerçek bir kayıt oluşturuyor ve yönetici panelinde görülebiliyor
  — ama bu bir ödeme yükümlülüğü ya da sözleşme değil, sadece "haber ver" isteği.

Yani bugün itibarıyla hiçbir öğrenciden — reşit olsun olmasın — herhangi bir ödeme
alınmıyor veya alınabilecek bir mekanizma yok. Bu ekin sorduğu soru, bu mekanizma
kurulduğunda ortaya çıkacak bir soru.

## Bulgu — kendi okumamız, hukuki görüş değil

Ödeme altyapısını araştırırken şu soruyla karşılaşıldı: **dördüncü sorunun cevabı (küçüğün
kendi verisinin işlenmesine rıza gösterebileceği yaş ve mekanizma), küçüğün aylık bir
ücrete kendi başına taahhüt verip veremeyeceği sorusuyla aynı mı, yoksa ayrı mı?**

Kamuya açık hukuki kaynaklara dayanarak yapılan okumamız — **bu bir hukuki görüş değildir,
sadece bulunan kaynakların ne söylediğinin özetidir** — şöyle:

KVKK'nın kendi içinde küçüklerin rızasına ilişkin GDPR'ın 8. maddesine benzer, ayrı ve
özel bir hüküm bulunmuyor. İncelenen birden fazla bağımsız kaynak, bu boşluk nedeniyle
küçüğün rıza kapasitesinin Türk Medeni Kanunu'nun (TMK) genel fiil ehliyeti hükümlerine
dayandığı görüşünde birleşiyor — yani veriye rıza sorusu ile sözleşmeye taraf olma
sorusu, Türk hukukunda GDPR'daki gibi iki ayrı rejim değil, aynı kök hükme dayanıyor
görünüyor.

TMK'nın 16. maddesi (bir hukuk bürosunun kendi analiz sayfasından alıntılanmıştır, bu ek
kanun metnini resmi kaynaktan tekrar doğrulamamıştır):

> *"Ayırt etme gücüne sahip küçükler ve kısıtlılar, yasal temsilcilerinin rızası
> olmadıkça, kendi işlemleriyle borç altına giremezler. Karşılıksız kazanmada ve kişiye
> sıkı sıkıya bağlı hakları kullanmada bu rıza gerekli değildir."*

Bulunan kaynaklarda, bu kuralın yalnızca iki istisnası adlandırılıyor: karşılıksız kazanma
ve kişiye sıkı sıkıya bağlı haklar. **Aylık tekrarlayan bir abonelik ücreti, düz okumayla,
bu istisnalardan hiçbirine girmiyor gibi görünüyor** — bu bir borç altına girme
işlemidir. Yaşına uygun küçük/günlük işlemler için bir istisna aranmış, bu geçişte
bulunamamıştır — bulunamamış olması, böyle bir istisnanın kesinlikle var olmadığı
anlamına gelmez, sadece bu araştırmanın onu tespit edemediği anlamına gelir.

## Sorulması önerilen — dördüncü sorunun genişletilmiş hâli

Dördüncü sorunun mevcut hâli korunmalı; buna şu ek boyut eklenmesi öneriliyor:

> Küçüğün kendi verisinin işlenmesine rıza gösterebilmesi için gereken mekanizma
> (yaş eşiği, veli onayı şekli, doğrulama gerekip gerekmediği) ile küçüğün Oryn'ın
> ücretli (Ultra) planına kendi başına, aylık tekrarlayan bir ödeme yükümlülüğü altına
> girecek şekilde abone olabilmesi için gereken mekanizma **aynı mekanizma mıdır, yoksa
> ayrı mı kurulmalıdır?** TMK m. 16 ışığında, bu iki onayın (veri işleme rızası ve ödeme
> yükümlülüğüne rıza) tek bir veli onayı akışı içinde mi toplanabileceği, yoksa ürünün
> ayrı ayrı iki farklı onay anı mı tasarlaması gerektiği.

Bu sorunun cevabı, ürünün hangi mekanizmayı ne zaman kuracağını doğrudan etkiliyor —
tek bir veli-doğrulama akışı hem veri hem ödeme için yeterliyse, tek bir mühendislik
işi; ayrıysa, iki ayrı iştir. Bu ayrım bugün belirsiz, ve şu an inşa edilmeye
başlanmamış (§6, `LEGAL_REVIEW.md`) mekanizmanın kapsamını doğrudan etkiliyor.

## Kurucuya ait bir soru, hukuk danışmanına değil

**Her araştırılan ödeme sağlayıcısı (iyzico, PayTR, Stripe), başvuru öncesinde tescilli
bir Türk şirketi (en yaygın olarak bir Limited Şirket) ve buna bağlı belgeleri (vergi
levhası, imza sirküleri, ticaret sicil gazetesi, faaliyet belgesi) istiyor.** Bu belgenin
kendisi bir hukuki soru değil, bir gerçek sorusu: **Oryn için tescilli bir şirket bugün
zaten var mı?** Kod tabanındaki `LEGAL_REVIEW.md` kendi şirket kimliği alanlarını (unvan,
adres, VERBİS kaydı) hâlâ doldurulmamış olarak işaretliyor — ama bu, şirketin var olup
olmadığını kanıtlamıyor, sadece bu belgeye henüz girilmediğini gösteriyor. Bu, hukuk
danışmanına sorulacak bir soru değil; kurucunun kendisinin bildiği ya da netleştirmesi
gereken bir girdi — hangi ödeme sağlayıcısının, ne zaman değerlendirilebileceğini
belirliyor.

---

**Bu ek, bir tavsiye içermiyor.** Hangi onay mekanizmasının seçileceği, tek akış mı ayrı
akışlar mı olacağı ve hangi ödeme sağlayıcısının seçileceği — üçü de kurucu ve hukuk
danışmanının birlikte vereceği kararlar. Bu belgenin amacı yalnızca, dördüncü sorunun
cevabının bu ek boyutu da kapsayacak şekilde sorulmasını sağlamak — böylece cevap yalnızca
veri işleme temelinde gelmiyor, ürünün ticari kullanımını da baştan kapsıyor.
