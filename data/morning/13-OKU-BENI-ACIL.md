# ⚠ ACİL — bunu ilk çalıştır

**Diğer paketlerden bağımsız.** 09, 11, 12 ile ilgisi yok, onları beklemiyor.
Sırayı bozmaz. Ama en acil olan bu.

---

## Ne oldu

**Bir öğrenci kendi kendine Ultra verebiliyor.**

Tarayıcının geliştirici araçlarını açıp kendi profil satırına doğrudan yazan
herkes, dün gece paywall'ını kurduğun **bütün Ultra özelliklerine ücretsiz**
erişebilir. Uygulamayı hiç kullanmadan, tek istekle.

Bu şu an canlıda.

---

## Nasıl oldu

`profiles` tablosunda **hangi sütunların kullanıcıya kapalı olduğunu** belirleyen
bir koruma var. Örneğin `is_admin` orada — kimse kendini yönetici yapamıyor.

**O liste migration 0063'te yazıldı.**
**`plan_tier` ise 3 Eylül'de eklendi**, Ultra ekonomisini kurarken.

Koruma o sütunu hiç tanımadı. Liste bir kez yazıldı ve tablo altından büyüdü.

**Bu, bu gecenin dördüncü kez gördüğümüz aynı deseni.** Aynısını üç yerde daha
bulduk: veli bağlantısında, haftalık yorum sütununda, ve bir korumanın kendi
kopyasında. **Bu sonuncusu para tarafındaydı.**

---

## Ne değişiyor

Koruma artık üç sütunu daha donduruyor: `plan_tier`, `ultra_gift_expires_at`,
`account_role`.

**Senin admin panelinden Ultra vermen etkilenmiyor.** Servis rolü muafiyeti
korundu — sistem yazabiliyor, kullanıcı yazamıyor.

---

## Nasıl doğrulandı

Gerçek bir Postgres'te **120 migration'ın tamamı** uygulandı, sonra **aynı yazma
denemesi iki kez** yapıldı:

| | sonuç |
|---|---|
| korumasız | `plan_tier = ultra` — **açık gerçek** |
| korumayla | `plan_tier = standard` — **kapandı** |

Ayrıca kontrol ettim ki koruma **hedefli**, kaba değil: aynı istekte `display_name`
normal şekilde değişiyor. Öğrenci kendi adını hâlâ değiştirebiliyor, paketini
değiştiremiyor.

Ve düzeltmeyi yazan oturum, korumanın **dört taşıyıcı satırını tek tek bozup**
her birinde ilgili kontrolün kırmızıya döndüğünü gördü.

**Paketin sonundaki doğrulama bloğunun da başarısız olabildiğini ayrıca denedim** —
koruma yokken "GUNCELLENMEDI" diyor, uydurma bir başarı raporu vermiyor.
