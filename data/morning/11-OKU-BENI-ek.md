# Ek paket — 09'dan SONRA

**Sıra önemli:** önce `09-migrations-2026-09-04.sql`, sonra bu.

Bu dosya, 09'un oluşturduğu `parent_links` tablosuna bir sütun ekliyor.
**09 çalışmadıysa bu dosya kendini durduruyor** ve hiçbir şey uygulamıyor —
zararsız, ama sırayı takip et.

Neden ayrı dosya: **09'u sana zaten gönderdim.** Aynı dosyanın üçüncü bir
sürümünü göndermek, yanlış olanı çalıştırma riski demek. Ek olarak veriyorum.

---

> **Bu dosyayı iki kez güncelledim.** Sonuncusu önemli: içindeki koruma
> mekanizması eksikti. Sadece **en son gönderdiğimi** çalıştır. İlk gönderdiğimde içinde sadece 0118 vardı;
> 0117 birkaç dakika sonra hazır oldu ve ikisini tek pakete koydum.
> **Eskisini çalıştırdıysan sorun yok** — bu dosya iki kez çalıştırılmaya dayanıklı,
> denedim. Sadece bunu çalıştır, eskisini sil.

---

## İçinde ne var

**Migration 0117** — veli e-postası pop-up'ının **kendi** kapatma sayacı (4 sütun).

Neden ayrı sayaç: mevcut "Ultra'ya geç" pop-up'ıyla aynı sütunları kullansaydı,
öğrenci danışman sohbetinde o pop-up'ı kapattığında **ilgisiz olan veli e-postası
pop-up'ı da sessizce susardı.** Ve bunu kimse fark etmezdi — görünmeyen bir pop-up'ın
hata durumu yoktur.

**Migration 0118** — tek sütun (`parent_links.last_commentary_sent_at`) **ve onu koruyan
mekanizmanın güncellenmesi.**

Sütunu eklemek yeterli değildi: tabloyu koruyan mekanizma **dört saat önce yazılmıştı** ve
yeni sütunu tanımıyordu. Yani veli, kendi meşru "erişimi kaldır" işleminin içine
o sütuna bir değişiklik sıkıştırabilirdi. Aynı türden bir açık gece yarısı zaten
kapatılmıştı; sonradan gelen bir migration onu sessizce geri açtı.

**Kapatıldı, ve iki yönden de denendi:** veli değiştiremiyor, sistemin kendi işi hâlâ
yazabiliyor. İkisini birden doğrulamak şart — herkesi engelleyen bir koruma güvenli
görünür ama başka bir hatadır.

Veliye gidecek haftalık AI yorumunun *"o hafta ne oldu"* penceresini tutuyor.
Senin cümlen: *"aiın her hafta çocuklarının gelişimini yorumlaması."*

**Neden bu sütun `parent_links`'te, `profiles`'ta değil:** bir öğrenci tek özet
alır, ama **bir veli her çocuğu için ayrı bir saat ister.** İki çocuğu olan bir veli
ikinci çocuğuna hafta ortasında bağlanırsa, birinci çocuğun penceresini miras alıp
bir aylık birikmiş şeyi *"bu hafta yeni"* diye okumamalı.

---

## Gönderim hâlâ kapalı

**Bu migration hiçbir şey göndermiyor ve hiçbir iş zamanlamıyor.** Mekanizma kurulu,
incelenebilir, kapalı.

Sebebi tek değil, iki: e-posta gönderim altyapısı bu projede hiç yok, **ve** bu içerik
reşit olmayan biri **hakkında**, velisine yazılmış. Baban'ın vereceği hukuki cevabın
kapsamı burada bir adım daha genişliyor.

**Bu, senin kararın — varsayılan olarak açılmıyor.**

---

## Doğrulama

Dosya kendini iki yönden de kontrol ediyor, ve ben ikisini de yerel bir Postgres'te
denedim:

- **09 uygulanmamışken:** durdu, hata verdi, hiçbir şey uygulamadı ✓
- **09 uygulanmışken:** temiz geçti, iki migration da yerine oturdu ✓
- **İkinci kez çalıştırınca:** sıfır hata — tekrar çalıştırmak zararsız ✓
- **Koruma gerçekten çalışıyor mu:** veli yazamadı, sistem yazabildi ✓

Bu son kontrolde **kendi test aracımın bozuk olduğunu buldum** — koruma değil, aracım.
Düzeltip tekrar çalıştırdım. Aracın bozuk olmasıyla korumanın bozuk olması ekranda
aynı görünüyordu.

İkinci sonucu görmeden önce birincisini görmüş olmam önemli — **hiçbir zaman
kırmızıya dönmeyen bir kontrol, kontrol değildir.**
