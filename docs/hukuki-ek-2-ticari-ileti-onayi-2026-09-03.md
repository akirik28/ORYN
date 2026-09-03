# Ek 2 — İkinci Sorunun Kapsamı: Kayıt Ettiğimiz "İlgileniyorum" Tıklaması, Ticari İleti Göndermek İçin Yeterli mi?

**Bu belge, bu sabahki dosyanın ikinci sorusuna (rızanın amaca göre ayrı alınıp
alınmadığı) bir ek — yeni bir soru değil.** `docs/hukuki-ek-odeme-kapasitesi-2026-09-03.md`
(dördüncü soruya ek) ile aynı gün yazıldı ve onunla bağlantılı, ama farklı bir hukuki
rejimi (ticari elektronik ileti mevzuatı) ilgilendirdiği için ayrı bir ek olarak
tutuldu — dördüncü sorunun içine de sıkıştırılmadı, ikinci sorunun kapsamı olarak
genişletildi.

## Önce sayı — bu, kaç kişiyi ilgilendiriyor

**Bugün "İlgileniyorum" butonuna tıklamış olan öğrenci sayısı: 1.** (Canlı veritabanı
sorgusu, 2026-09-03: `product_events`'te `ultra_interest_registered` adında 2 kayıt, ama
ikisi de aynı `user_id`'ye ait — aynı öğrenci iki kez tıklamış.) Bu tek kaydın kendi
profil bilgisi (`display_name: "Ada Sarp KIRIK"`) bu depodaki git commit yazarlığında
tüm gece boyunca kullanılan isimle birebir aynı — **bu, gerçek bir potansiyel müşteriden
çok, geliştirme sırasında kullanılan bir test hesabı olduğunu güçlü şekilde düşündürüyor,
ama bu belge bunu kesin bir gerçek olarak iddia etmiyor; kurucunun doğrudan teyit etmesi
gereken bir gözlem.** Bugünkü liste pratik olarak boş sayılabilir. Aşağıdaki araştırma,
bugünün sayısı için değil, mekanizma büyüdüğünde geçerli olacağı için yapıldı.

## Sorulan soru

**Bugün var olan tek onay — kayıt sırasında alınan, Kullanım Şartları ve Gizlilik
Bildirimi'nin birlikte kabulü — "İlgileniyorum" butonuna tıklamış bir öğrenciye, Ultra
satışa açıldığında "Ultra artık satın alınabilir" içerikli bir e-posta göndermek için
yeterli midir, yoksa bu, ayrı ve kendi başına bir onay mı gerektirir?**

## Bulunan — İYS gerçek ve muhtemelen devreye giriyor

Kamuya açık kaynaklara dayanan araştırma (bu bir hukuki görüş değildir):

**İYS (İleti Yönetim Sistemi), Ticaret Bakanlığı'nın işlettiği, 6563 sayılı Elektronik
Ticaretin Düzenlenmesi Hakkında Kanun'a dayanan, gerçek ve zorunlu bir sistem** —
1 Aralık 2020'den beri yürürlükte. Bulunan kaynaklara göre: *"Tanıtım, indirim, hediye,
kampanya veya reklam içeriği barındıran iletiler, ticari elektronik ileti kapsamına
girer ve belirli bir onay olmaksızın gönderilmesi yasaklanmıştır."* "Ultra artık
satın alınabilir, hemen abone ol" içerikli bir e-posta, bu tanıma açıkça giriyor —
bu bir hizmet bildirimi (ör. şifre sıfırlama) değil, ticari bir iletidir.

**Onayın kendisi de belirli bir şekilde olmak ve sisteme kaydedilmek zorunda** —
hizmet sağlayıcılar aldıkları onayları İYS'ye kaydetmekle yükümlü. Bulunan kaynaklarda,
sitedeki genel bir "haber ver" butonunun bu spesifik onay şeklini kendiliğinden
karşıladığına dair açık bir teyit **bulunamadı** — bu, karşılamadığı anlamına gelmez,
sadece bu araştırmanın bunu doğrulayamadığı anlamına gelir. Muhtemel risk: bugünkü
"İlgileniyorum" tıklaması, KVKK/rıza açısından bir sinyal olsa bile, İYS'nin kendi
şekil şartlarını taşımıyor olabilir — iki ayrı rejim, iki ayrı onay şekli.

## Küçüklerle ilişkisi — dördüncü soruya eklenen bulguyla aynı desen, ama doğrulanmamış

6563 sayılı Kanun'da ya da bulunan uygulama kaynaklarında, **küçüklere (reşit
olmayanlara) ticari ileti gönderiminin onayı konusunda özel bir hüküm bulunamadı** —
tıpkı KVKK'nın kendi içinde küçüklerin rızasına özel bir hüküm barındırmaması gibi. Bu
paralellik, dördüncü soruya yazılan ekteki mantığın burada da geçerli olabileceğini
düşündürüyor — yani bu boşluğun da TMK'nın genel fiil ehliyeti hükümlerine (m. 16)
düşmesi muhtemel. **Ama bu, doğrudan doğrulanmış bir bağlantı değil, önceki bulgunun bu
alana genişletilmiş bir tahmini** — iki ayrı kanun (KVKK ve 6563 sayılı Kanun) aynı
boşluğu aynı şekilde doldurup doldurmadığı, kendi başına ayrı bir hukuki sorudur ve bu
belge bunu varsaymıyor, sadece işaret ediyor.

## Ürün tarafı — "en küçük dürüst iletişim mekanizması" ne olurdu

Tasarlanmadı, sadece şekli:

- **Kimlik verisi bugün ne durumda:** `product_events` tablosu `user_id`'yi tutuyor;
  `profiles.display_name`'e birleştirilebiliyor (yönetici panelinde zaten böyle
  gösteriliyor). **Öğrencinin gerçek hesap e-postası** (`auth.users.email`, Supabase
  Auth'un kendi tablosu) bu sorgularla erişilen `public` şemada değil — ayrı, daha
  yetkili bir erişim gerektiriyor (yönetici panelinden ya da bir hizmet-rolü
  istemcisinden). `contact_info.email` (öğrencinin isteğe bağlı, kendi girdiği,
  görünürlük ayarı olan ayrı bir alan) bu tek kayıt için **boş** — bu satırdan
  ulaşılabilecek bir e-posta yok.
- **En küçük dürüst mekanizma, önceki bulguyla tutarlı olarak:** bir "ilgilenenleri
  e-postala" özelliği inşa etmeden önce, hangi onayın (varsa) hangi kanala göre
  yeterli olduğunun netleşmesi gerekiyor — aksi halde inşa edilecek özellik, henüz
  cevabı olmayan bir soruyu koda gömmüş olur.

## Bu belgenin önerisi yok

Hangi onay metninin, hangi kanaldan, ne zaman alınacağı — kurucu ve hukuk
danışmanının kararı. Bu belgenin amacı yalnızca ikinci sorunun kapsamının ticari
iletişimi de içerdiğini göstermek, ve bugünkü tek kaydın (muhtemel test hesabı) bu
kararı aciliyet açısından değil, doğruluk açısından ilgilendirdiğini netleştirmek.

## Kaynaklar

- ticaret.gov.tr (T.C. Ticaret Bakanlığı), İYS'nin resmi tanıtım ve genel bilgi
  sayfaları — arama özeti ve bir doğrudan sayfa getirme ile 2026-09-03'te
  doğrulandı; 6563 sayılı Kanun'un tam metni bu geçişte doğrudan getirilmedi.
  Bulunamayan noktalar (küçüklere özel hüküm, buton-tipi onayın İYS şeklini
  karşılayıp karşılamadığı) açıkça "bulunamadı" olarak işaretlendi, "yok" olarak değil.
- `product_events`, `profiles`, `contact_info` tabloları — `oryn-qa-scratch` üzerinde
  canlı sorgulandı, tahmin edilmedi.
- `docs/hukuki-ek-odeme-kapasitesi-2026-09-03.md` — TMK m.16/KVKK boşluğu bulgusunun
  kaynağı, burada tekrar edilmedi, üzerine inşa edildi.
