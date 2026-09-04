# Ek paket — 09'dan SONRA

**Sıra önemli:** önce `09-migrations-2026-09-04.sql`, sonra bu.

Bu dosya, 09'un oluşturduğu `parent_links` tablosuna bir sütun ekliyor.
**09 çalışmadıysa bu dosya kendini durduruyor** ve hiçbir şey uygulamıyor —
zararsız, ama sırayı takip et.

Neden ayrı dosya: **09'u sana zaten gönderdim.** Aynı dosyanın üçüncü bir
sürümünü göndermek, yanlış olanı çalıştırma riski demek. Ek olarak veriyorum.

---

## İçinde ne var

**Migration 0118** — tek sütun: `parent_links.last_commentary_sent_at`.

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
- **09 uygulanmışken:** temiz geçti, sütun `timestamptz` olarak oluştu ✓

İkinci sonucu görmeden önce birincisini görmüş olmam önemli — **hiçbir zaman
kırmızıya dönmeyen bir kontrol, kontrol değildir.**
