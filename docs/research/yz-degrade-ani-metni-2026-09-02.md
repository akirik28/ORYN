# Düşüş anında ürün ne diyor? (2026-09-02)

**Soru (oryn-a7):** Karşılaştırdığım ürünler, kalitenin düştüğü ANDA, ekranda kelimesi
kelimesine ne yazıyor — fiyatlandırma sayfası değil, ürünün içindeki gerçek metin? Kaç
tanesi düşüşten çıkma (opt-out) hakkı veriyor, sadece bilgilendirmiyor? Ve kimse bunu
satış diline kaçmadan, sakin bir şekilde yapabiliyor mu?

**Bu, `docs/research/yz-kota-tasarimi-2026-09-02.md`'nin devamı, aynı ürün seti — ama bu
sefer POLİTİKA değil, o politikanın ekrana çıktığı TEK CÜMLE.** Kural aynı: sourced or
null, sayfayı/gönderiyi kendim açtım, WebSearch özetine güvenmedim.

**En baştan söylenmesi gereken bulgu:** bu soru, ilk araştırmadakinden çok daha zor
cevaplanıyor, ve bunun kendisi bir sonuç. Fiyatlandırma sayfaları herkeste var ve resmi.
Ekrandaki gerçek toast/uyarı metni ise hiçbir üründe resmi dokümantasyonda birebir
alıntılanmıyor — bulabildiğim her örnek, ya kullanıcının kendi şikayet/hata raporunda
tırnak içine aldığı metin, ya da gazetecinin bizzat o duvara çarpıp yazdığı ilk elden
deneyim. Yani bu belge, ilk belgeden farklı bir kaynak türüne dayanıyor: resmi sayfa
değil, gerçek kullanıcı tanıklığı — her birinde bunu açıkça işaretliyorum.

---

## Bulunan dört farklı gerçek örnek

### 1. ChatGPT, 2023 (tarihsel) — açık seçenek sunan tek örnek
[OpenAI Developer Community, konu başlığı kelimesi kelimesine alıntı, Kasım
2023](https://community.openai.com/t/youve-reached-the-current-usage-cap-for-gpt-4-you-can-continue-with-the-default-model-now-or-try-again-after-xx-xx-am-pm/514923) —
doğrudan açıldı. Bu dönemin gerçek ekran metni (topluluk başlıkları bu tür hata
mesajlarını genelde birebir kopyalar):

> *"You've reached the current usage cap for GPT-4. You can continue with the default
> model now, or try again after xx:xx AM/PM"*

**Bu, düşüşten çıkma hakkını AÇIKÇA sunan tek örnek buldum:** kullanıcı "şimdi daha zayıf
modelle devam et" ya da "bekle, güçlü modeli geri al" arasında seçim yapıyor — otomatik
değil, dayatılmış değil. **Ama bu 2023, GPT-4/varsayılan model döneminden** — ürün o
zamandan beri (GPT-4o, GPT-5, şimdi Luna/Sol/Terra adlandırması) tamamen değişti; bunun
hâlâ güncel davranış olduğunu iddia etmiyorum, sadece **bu örüntünün bir yerde gerçekten
var olduğunu** gösteriyorum.

### 2. Claude, 2026 (güncel) — sadece duvar, düşüş yok
[Tom's Guide, Amanda Caswell, 5 Nisan 2026, birinci ağızdan
deneyim](https://www.tomsguide.com/ai/i-hit-claudes-new-usage-limits-and-it-changed-how-i-use-ai-forever) —
doğrudan açıldı, gazeteci bizzat Pro hesabıyla bu duvara çarpmış:

> *"You have reached your message limit until 4 PM."*

Kendi tepkisi, doğrudan alıntı: *"It's a jarring moment that turns a seamless workflow
into a complete standstill."* **Burada düşüş yok, çıkma hakkı sorusu bile gündeme
gelmiyor** — çünkü Claude'un kendi politikası (ilk belgemin §5'i) otomatik düşüş yapmıyor,
sadece durduruyor (kredi açık değilse). Bu mesaj bunu doğruluyor: net bir saat, net bir
duvar, hiçbir "daha zayıf modelle devam et" seçeneği metinde yok.

### 3. GitHub Copilot, tarih belirsiz (muhtemelen Haziran 2026 öncesi "premium request"
dönemi) — otomatik + duyurulmuş + parayla kaçılabilir
[GitHub Community Discussion #165480, kullanıcının kendi hata raporunda tırnak içinde
alıntıladığı metin](https://github.com/orgs/community/discussions/165480) — doğrudan
açıldı:

> *"You have exceeded your premium request allowance. We have automatically switched you
> to GPT-4.1 which is included with your plan. Enable additional paid premium requests to
> continue using premium models."*

**Bu, ORYN'in planına en yakın örnek:** otomatik geçiş oldu (kullanıcı hiçbir şey
yapmadı), AMA aynı anda net bir cümleyle duyuruldu ("we have automatically switched
you"), ve bir çıkış yolu var — ama o çıkış yolu **ücretli** ("enable additional paid
premium requests"), ücretsiz bir "hayır, bekleyeyim" seçeneği metinde yok. **Bu ifadenin
"premium request" diliyle yazılmış olması** (ilk belgemdeki bulgu: bu sistem Haziran
2026'da "AI Credits"e geçti) bunun muhtemelen eski sistemden kaldığını gösteriyor —
güncelliğini iddia etmiyorum, ama örüntü olarak (otomatik + anında duyuru + ücretli
kaçış) gerçek ve doğrulanmış.

### 4. ChatGPT güvenlik router'ı, Eylül-Ekim 2025 (güncel-yakın) — proaktif değil, sorunca söylüyor
OpenAI'ın ChatGPT VP'si Nick Turley'nin kendi
[X/Twitter açıklaması](https://x.com/nickaturley/status/1972031686318895253) (metnin
kendisini bu oturumda tam açıp okumadım, arama sonucunun alıntıladığı kısmı kullanıyorum
— bu yüzden bu satırı düşük güvenle işaretliyorum): sistem hassas konularda "mid-chat"
olarak bir "reasoning model"e geçiyor, ve **"ChatGPT will tell you which model is active
when asked"** — yani proaktif bir banner YOK, kullanıcı sorarsa söylüyor. Bu, önceki üç
örnekten farklı bir dördüncü desen: **ne sessizlik, ne duyuru — talep üzerine açıklama.**
Bu, tam olarak §10'daki (ilk belgem) TechRadar vakasının öfkelendirdiği şey — kullanıcılar
bunu "secret safety routers" diye tanımlamıştı çünkü sormadan kimse söylemiyor.

---

## Doğrudan cevaplar

**1) Ekranda kelimesi kelimesine ne yazıyor?** Dört farklı gerçek cümle bulundu, dördü de
farklı bir deseni temsil ediyor (yukarıda). Hiçbiri resmi dokümantasyonda birebir
yayınlanmamış — hepsi kullanıcı tanıklığından. **Perplexity, Notion, Cursor için** aynı
titizlikte arama yapıldı ama gerçek bir ekran alıntısı **bulunamadı** — bu ürünlerin
resmi sayfaları (ilk belgemde de görüldüğü gibi) zaten kasıtlı olarak belirsiz, ve
kamuya açık bir ekran görüntüsü/birebir alıntı bu oturumda bulunamadı. Tahmin
yapmıyorum.

**2) Kaçı düşüşten çıkma hakkı veriyor?** Dört örnekten:
- ChatGPT 2023: **evet, ücretsiz** ("şimdi zayıf modelle devam et" VEYA "bekle")
- GitHub Copilot: **evet ama ücretli** (para öde, kaç)
- Claude: **uygulanamaz** (düşüş yok, sadece duvar)
- ChatGPT güvenlik router'ı: **hayır** (geçiş dayatılıyor, sadece hangi modelde
  olduğunu SORUNCA öğreniyorsun)

Yani net cevap: **düşüşten tamamen ücretsiz çıkma hakkı** sadece bir örnekte var, ve o
örnek 2023'ten, muhtemelen artık geçerli değil.

**3) Kimse bunu satış diline kaçmadan, sakin biçimde yapabiliyor mu?** Evet ama önemsiz
bir şekilde — dördü de satış dili KULLANMIYOR (hiçbiri "harika haber!" ya da abartılı bir
ton taşımıyor), ama bunun nedeni özenli bir tasarım kararı değil, hepsinin standart
sistem/hata mesajı kayıtsızlığında yazılmış olması ("you have exceeded", "you have
reached" — düz, teknik, kişiliksiz). **Hiçbiri 14 yaşında birine göre yazılmamış** —
hepsi yetişkin/profesyonel kullanıcı varsayıyor. Phase 57'nin istediği "sakin, analitik,
övgü şişirmesi yok" tonu bu dört örnekte teknik olarak "sağlanıyor" (övgü yok, panik yok)
ama bu bir tesadüf — kimse bunu özellikle bir gence hitap etsin diye yazmamış. **Bu,
ORYN'in kopyalayabileceği hazır bir şablon olmadığı anlamına geliyor** — sakin ton
istemek doğru, ama "sakin + gence hitap eden + neden olduğunu açıklayan" kombinasyonunu
gösteren gerçek bir emsal bulamadım. ORYN burada gerçekten öncü olacak, taklit edecek bir
şey yok.

---

## ORYN için çıkarım (karar değil, gözlem)

Dört örneğin toplamı, üç farklı tasarım deseni gösteriyor: **açık seçenek** (ChatGPT
2023), **otomatik + duyurulmuş + parayla kaçılabilir** (Copilot), **talep üzerine
açıklama** (ChatGPT güvenlik router'ı, ve en çok şikayet çeken de bu). `docs/oryn-premium-karar-seti-2026-09-02.md`
Karar 4'ün önerdiği "görünür bar + cevabın üzerinde küçük etiket" bu üçünün hiçbiri değil
— dördüncü, kendi tasarladığımız bir desen. En yakın emsal Copilot'ınki (otomatik +
anında duyuru) ama ORYN'in ücretsiz-bekleyerek-geri-dönüş kararı (Karar 7, kilitli)
Copilot'ın "öde ve kaç" seçeneğini zaten dışlıyor. **Somut öneri, eğer metin yazılacaksa:**
Copilot'ın cümle yapısını (özne + ne oldu + neden + ne yapılabilir, dört kısa parça)
iskelet olarak alıp, "ödeyerek kaç" yerine "bekleyerek geri dön" ile değiştirmek —
denenmiş bir yapıyı, denenmemiş bir içerikle doldurmak, sıfırdan yazmaktan daha güvenli.

---

## Kaynaklar (erişim tarihi: 2026-09-02)

- [OpenAI Developer Community #514923](https://community.openai.com/t/youve-reached-the-current-usage-cap-for-gpt-4-you-can-continue-with-the-default-model-now-or-try-again-after-xx-xx-am-pm/514923) — Kasım 2023 tarihli, doğrudan açıldı
- [Tom's Guide, Amanda Caswell, 2026-04-05](https://www.tomsguide.com/ai/i-hit-claudes-new-usage-limits-and-it-changed-how-i-use-ai-forever) — doğrudan açıldı
- [GitHub Community Discussion #165480](https://github.com/orgs/community/discussions/165480) — doğrudan açıldı, tarih sayfada görünmedi
- Nick Turley (OpenAI VP of ChatGPT), [X/Twitter, Ekim 2025](https://x.com/nickaturley/status/1972031686318895253) — **doğrudan açılmadı, arama sonucu alıntısına dayanıyor, düşük güven**
- Perplexity/Notion/Cursor'ın gerçek ekran metni: **bulunamadı**, tahmin edilmedi

**Not:** `docs/research/yz-kota-tasarimi-2026-09-02.md`'de zaten kaynaklı olan Perplexity
(Mayıs 2026 sessiz kota daraltması) ve ChatGPT'nin iki router vakası (Ağustos/Eylül 2025)
burada tekrar edilmedi — bu belge sadece o belgenin bulmadığı, EKRANDAKİ BİREBİR METNİ
kapatmak için yazıldı.
