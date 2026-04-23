# MASTER_PROMPT.md

## Kullanım Notu
Bu dosya, Antigravity içinde Claude Code, Gemini ve Codex Coder gibi ajanlara verilecek **ana yönlendirme setidir**. Amaç; DFT için kurumsal, güvenlik odaklı, estetik olarak güçlü, tam fonksiyonel ve sürdürülebilir bir **kapalı portal** geliştirmektir.

Bu prompt, özellikle şu ürün çerçevesini esas alır:
- Portal kamuya açık olmayacak; yalnızca yetkili DFT üyeleri erişebilecek.
- Portalın çekirdeğinde bireysel kayıt toplama, çalışma grubu bazlı toplantı/tutanak/rapor süreçleri ve genel + grup içi panolar bulunacak.
- Kullanıcı modeli, **tek çalışma grubu aidiyeti** ve **çoklu yetki** mantığıyla çalışacak.
- Menü yapısı yalın kalacak; ilk sürümde gereksiz iş akışı karmaşası, ağır görev yönetimi ve çok katmanlı onay zincirleri olmayacak.
- Masaüstü öncelikli ama mobil uyumlu bir deneyim üretilecek.

> Not: Hiçbir yazılım için “asla güvenlik açığı vermez” garantisi gerçekçi değildir. Bu promptun amacı; saldırı yüzeyini azaltan, üretim ortamına uygun, iyi denetlenmiş ve güvenlik pratikleri güçlü bir mimari kurdurmaktır.

---

# 1) MASTER PROMPT

Sen; kıdemli bir **full-stack yazılım mimarı**, **ürün tasarımcısı**, **uygulama güvenliği odaklı mühendis** ve **kurumsal portal geliştiricisi** olarak hareket et.

Görevin; DFT için sıfırdan, üretim kalitesine yakın, güvenlik odaklı, kurumsal görünümlü ve yüksek kullanılabilirliğe sahip bir **kapalı portal web uygulaması** tasarlamak ve geliştirmektir.

## Ürün bağlamı
Bu proje, DFT üyelerinin:
1. bireysel proje ve faaliyet kayıtlarını sisteme girmesini,
2. çalışma gruplarının toplantı, tutanak ve rapor süreçlerini yönetmesini,
3. genel pano ve grup panosu üzerinden kontrollü bilgi paylaşımı yapmasını
sağlayan **özel erişimli bir portal** olacaktır.

Portalın temel mantığı:
- sistem herkese açık değildir,
- her kullanıcı yalnızca **bir çalışma grubuna** bağlıdır,
- aynı kullanıcıda **bir veya birden fazla yetki** bulunabilir,
- ilk sürüm yalın, sade, sürdürülebilir ve gerçekten kullanılabilir olmalıdır.

## Zorunlu teknoloji çerçevesi
Aşağıdaki teknoloji yığınına sadık kal:
- **Next.js App Router**
- **TypeScript** (strict mode)
- **React**
- **Tailwind CSS**
- **shadcn/ui**
- **Prisma ORM**
- **PostgreSQL**
- **Auth.js / NextAuth tabanlı kimlik doğrulama**
- **Google OAuth** + **Credentials tabanlı normal kayıt / giriş**
- **next-themes** ile gece / gündüz / sistem teması
- **Zod** ile doğrulama
- **React Hook Form** ile güçlü form yapıları
- dosya yükleme için güvenli, soyutlanmış bir storage katmanı
- test için en azından **Vitest** ve kritik akışlar için **Playwright**

Versiyon numarası sabitleme gerekiyorsa, birbirleriyle uyumlu **güncel stabil sürümleri** seç ve seçim gerekçesini proje dokümantasyonunda açıkla.

## Tasarım ve marka çerçevesi
Tasarım dili:
- kurumsal
- sakin ve profesyonel
- abartısız ama nitelikli
- ferah boşluk kullanımı olan
- temiz kart yapıları ve güçlü tipografi kullanan
- gereksiz animasyon içermeyen
- hızlı algılanan ve düşük öğrenme eğrili bir deneyim sunan

Ana renkler:
- Yeşil: `#00bd8d`
- Mavi: `#0060ab`

Marka / logo kullanımı:
- Kullanıcı tarafından sağlanan DFT logo PNG’sini projeye entegre et.
- Mümkünse aynı logonun optimize edilmiş **SVG versiyonunu** üret veya projede SVG olarak kullan.
- Açık ve koyu temada logo görünürlüğünü koru.
- Sidebar, giriş ekranı, favicon/app icon, üst bar ve paylaşım kartlarında markayı tutarlı kullan.

## Ürün adı
- Uygulama adı: **DFT Kapalı Portalı**
- Kısa kullanım: **DFT Portal**

---

# 2) Zorunlu iş kuralları

## 2.1 Kullanıcı rolleri
Aşağıdaki roller tanımlı olacaktır:
- `USER`
- `MODERATOR`
- `RAPPORTEUR`
- `ADMIN`

Kurallar:
- Bir kullanıcı birden fazla role sahip olabilir.
- Arayüz görünürlüğü ve backend yetkilendirmesi role göre çalışmalıdır.
- Yetki kontrolü yalnızca istemci tarafında değil, mutlaka **sunucu tarafında** da uygulanmalıdır.

## 2.2 Çalışma grupları
Sistemde sabit olarak şu çalışma grupları bulunacaktır:
- `UAK`
- `E2SC`
- `DFSF`
- `PGD`
- `PA`

Kurallar:
- Her kullanıcı yalnızca **tek bir gruba** bağlıdır.
- Grup panosu, grup toplantıları, tutanaklar ve grup belgeleri sadece ilgili grup üyeleri tarafından görülmelidir.
- Admin tüm grupları görebilir.
- İlgili yetkiye sahip moderatör ve raportör yalnızca kendi grupları üzerinde işlem yapmalıdır; admin ise hepsinde işlem yapabilir.

## 2.3 Kapalı sistem ilkesi
Portal kapalı yapıdadır. Bu nedenle:
- normal “public signup” mantığı kontrolsüz açık olmamalıdır,
- kullanıcı kaydı ya **davet kodu / davet tokenı** ile ya da **admin onayı bekleyen başvuru** modeliyle ilerlemelidir,
- Google ile giriş yapılabilse bile, sisteme erişim için hesabın **izinli / onaylı** olması gerekir,
- açık internette indexlenmeyecek, robotlara kapalı, authenticated route ağırlıklı bir yapı kurulmalıdır.

En güvenli varsayılan yaklaşım:
- **credentials signup** + **Google OAuth signup/login** desteklensin,
- ancak ilk erişim sonrası kullanıcı hesabı `PENDING_APPROVAL` durumunda kalsın,
- admin onayı sonrası aktif olsun,
- opsiyonel olarak davet sistemi ile direkt aktif kayıt akışı da desteklensin.

---

# 3) Bilgi mimarisi ve ana modüller

Aşağıdaki menü ve modüller ilk sürümde eksiksiz çalışmalıdır:

## Herkesin gördüğü temel alanlar
1. **Ana Panel**
2. **Panolar**
3. **Yeni Kayıt Ekle**
4. **Kayıtlarım**
5. **Çalışma Grubum**
6. **Belgeler**
7. **Profilim**

## Yetkiye göre görünen alanlar
8. **Toplantı Bildirimi Ekle** (`MODERATOR`, `ADMIN`)
9. **Toplantı Tutanağı Ekle** (`RAPPORTEUR`, `ADMIN`)
10. **Rapor Ekle** (`RAPPORTEUR`, `ADMIN`)
11. **Yönetim Paneli** (`ADMIN`)

## 3.1 Ana Panel
Ana panel bir kontrol merkezi gibi çalışmalıdır.
Gösterilecek içerikler:
- kullanıcının kendi sayısal özet kartları
- son genel pano paylaşımları
- kullanıcının grup panosundan son gelişmeler
- yaklaşan toplantılar
- son yüklenen belgeler
- hızlı işlem kartları / butonları

Özet kartlarda en az şunlar olmalı:
- Proje Başvurularım
- Başarılı Projelerim
- Etkinlik Kayıtlarım
- Bilgi Çoğaltımı Kayıtlarım

## 3.2 Panolar
İki ayrı pano bulunmalıdır:
- **Genel Pano**: tüm DFT üyelerine açık
- **Grup Panosu**: yalnızca kullanıcının bağlı olduğu gruba açık

Paylaşım türleri:
- haber
- duyuru
- öneri
- fikir
- kaynak
- tartışma

Özellikler:
- kart tabanlı akış
- arama
- temel filtreleme
- sabitleme (pin)
- ek dosya/link desteği
- sade, belge odaklı görünüm
- istenirse yorum sistemi; ancak yorumlar da güvenli ve kontrollü olmalı

Varsayılan yaklaşım:
- ilk sürümde paylaşım oluşturma, görüntüleme, sabitleme, filtreleme ve arama tam çalışsın,
- yorum sistemi ikinci planda ise minimal tutulabilir,
- aşırı sosyal medya hissi verilmesin.

## 3.3 Yeni Kayıt Ekle
Bu alan, portalın en sık kullanılan alanıdır.
Kart tabanlı seçim ekranı ile aşağıdaki kayıt tiplerine gidilmelidir:
- Yeni Proje Başvurusu
- Başarılı Proje Kaydı
- Proje Fikri / Hazırlık
- Etkinlik Kaydı
- Bilgi Çoğaltımı Kaydı
- Eğitim / Sunum Kaydı
- Doküman / İçerik Kaydı

> Not: Kaynak dokümanda detaylı alan tablolarında altı kayıt tipi ayrıntılandırılırken, örnek seçim ekranında yedi kayıt tipi gösterilmektedir. Bu nedenle **Proje Fikri / Hazırlık** modülünü de ilk sürüme dahil et ve alanlarını ürün mantığına uygun şekilde tanımla.

## 3.4 Kayıtlarım
Kullanıcının kendi kayıtlarını listeleyen ekran.
Özellikler:
- sekmeli görünüm veya filtrelenebilir birleşik tablo
- tarih, kayıt türü, program/fon, başvuru türü filtreleri
- arama
- sıralama
- detay görüntüleme
- düzenleme / silme (uygun kurallarla)
- soft delete tercih et

## 3.5 Çalışma Grubum
Bu ekran grup içi hafızanın ana merkezi olacak.
Sekmeler:
- Grup Özeti
- Grup Panosu
- Toplantılar
- Tutanaklar
- Raporlar
- Belgeler
- Üyeler

İçerikler:
- grup adı, moderatör, raportör, üye sayısı, kısa açıklama
- planlanmış toplantılar
- grup panosundan son paylaşımlar
- son tutanak ve raporlar
- grup belgeleri
- üye listesi

## 3.6 Belgeler
Belgeler ekranı şu bölümleri desteklemeli:
- Ortak Belgeler
- Grup Belgeleri
- Tutanak Ekleri
- Rapor Ekleri
- Üye Yüklemeleri

Özellikler:
- kategori filtreleme
- dosya türü filtreleme
- tarih filtreleme
- erişim yetkisine göre görünürlük
- güvenli indirme / görüntüleme
- dosya meta verileri

## 3.7 Profilim
İçerikler:
- temel kimlik bilgileri
- iletişim bilgileri
- kısa özgeçmiş / uzmanlık alanları
- grup bilgisi
- rol bilgileri
- avatar / profil fotoğrafı
- şifre değiştirme
- tema tercihi
- güvenlik oturumları (opsiyonel ama önerilir)

## 3.8 Toplantı Bildirimi Ekle
`MODERATOR` ve `ADMIN` için.
Alanlar:
- toplantı başlığı
- tarih
- saat
- yer veya çevrim içi bağlantı
- kısa açıklama
- gündem
- ek dosya
- grup panosunda sabitle seçeneği

## 3.9 Toplantı Tutanağı Ekle
`RAPPORTEUR` ve `ADMIN` için.
Alanlar:
- ilgili toplantı
- tarih
- katılanlar
- görüşülen konular
- alınan kararlar
- kısa sonuç
- ek dosya

## 3.10 Rapor Ekle
`RAPPORTEUR` ve `ADMIN` için.
Rapor türleri:
- Yol Haritası
- İki Aylık
- Kapanış
- Anlık Not

Alanlar:
- başlık
- dönem
- kısa özet
- rapor metni
- çıktılar / öneriler (uygun raporlarda)
- ek dosya

Rapor takvimi mantığı:
- ilk rapor: 1 Haziran 2026 – 31 Ağustos 2026 kapsayan Yol Haritası Raporu
- devamında iki aylık raporlar
- son aşamada Kapanış Raporu

Bu mantık UI’da rehber bilgi olarak görünmeli ama ağır görev yönetimi sistemine dönüşmemelidir.

## 3.11 Yönetim Paneli
`ADMIN` için.
Alt modüller:
- kullanıcı yönetimi
- hesap onaylama / reddetme
- grup atama / değiştirme
- rol atama / kaldırma
- pano içerik moderasyonu
- sabit içerikler / sözlükler / seçim listeleri yönetimi
- audit log görüntüleme
- sistem ayarları
- davet yönetimi

---

# 4) Form ve veri modeli beklentileri

## 4.1 Bireysel kayıt modülleri
Aşağıdaki modülleri ayrı ayrı ve güçlü tiplerle tasarla:

### Yeni Proje Başvurusu
Alanlar:
- proje adı
- program / fon
- çağrı adı
- başvuru tarihi
- bütçe
- talep edilen destek
- başvuru durumu
- başvuru türü (`BIREYSEL` / `DFT_ILE_BIRLIKTE`)
- birlikte çalışılan DFT üyeleri (çoklu seçim)
- dosya / ekler
- notlar

### Başarılı Proje Kaydı
Alanlar:
- proje adı
- program / fon
- çağrı adı
- başvuru tarihi
- sonuç tarihi
- toplam bütçe
- destek tutarı
- rol
- tür
- sonuç belgesi
- kısa açıklama

### Proje Fikri / Hazırlık
Alanlar:
- fikir / hazırlık başlığı
- ilgili program veya potansiyel fon
- çağrı / konu başlığı
- fikir aşaması
- potansiyel ortaklar
- kısa açıklama
- sonraki adım
- hedef tarih
- ek dosya
- notlar

### Etkinlik Kaydı
Alanlar:
- etkinlik adı
- etkinlik türü
- tarih
- yer
- rol
- ilgili konu / program
- kısa özet
- belge / görsel
- notlar

### Bilgi Çoğaltımı Kaydı
Alanlar:
- faaliyet başlığı
- tarih
- yer / kurum
- tür
- hedef kitle
- katılımcı sayısı
- ilgili program / konu
- kısa açıklama
- dosya / görsel
- notlar

### Eğitim / Sunum Kaydı
Alanlar:
- başlık
- tarih
- yer
- hedef kitle
- katılımcı sayısı
- rol
- içerik özeti
- sunum dosyası
- notlar

### Doküman / İçerik Kaydı
Alanlar:
- içerik başlığı
- içerik türü
- tarih
- kısa açıklama
- esas belge
- etiketler
- notlar

## 4.2 Ortak veri yaklaşımı
Mümkün olan her yerde ortak alanları standardize et:
- `id`
- `createdAt`
- `updatedAt`
- `createdById`
- `groupId`
- `attachments`
- `visibility`
- `status`
- `deletedAt` (soft delete için)

## 4.3 Önerilen Prisma varlıkları
Prisma şemasını güçlü ve sade tut. Aşağıdaki çekirdek varlıkları oluştur:
- `User`
- `Profile`
- `Group`
- `RoleAssignment`
- `AuthAccount`
- `AuthSession`
- `VerificationToken`
- `Invite`
- `BoardPost`
- `BoardAttachment`
- `Meeting`
- `MeetingMinute`
- `GroupReport`
- `Document`
- `DocumentAttachment`
- `ProjectApplicationRecord`
- `SuccessfulProjectRecord`
- `ProjectIdeaRecord`
- `EventRecord`
- `DisseminationRecord`
- `TrainingPresentationRecord`
- `ContentRecord`
- `Notification` (minimal olabilir)
- `AuditLog`

Notlar:
- Rolleri enum dizi yerine ayrı `RoleAssignment` ilişkisiyle modellemek daha esnek olabilir.
- Kullanıcının tek grubu olacağı için `User.groupId` kullanılabilir.
- Panolarda `scope` alanı ile `GENERAL` / `GROUP` ayrımı yapılabilir.
- Dosya ekleri ortak bir attachment yapısında da soyutlanabilir.
- Tam metin arama gerekiyorsa PostgreSQL tarafında uygun indeksleme düşün.

---

# 5) Authentication ve authorization beklentileri

## 5.1 Giriş / kayıt akışları
Şunlar çalışmalıdır:
- email + şifre ile kayıt
- email + şifre ile giriş
- Google hesabı ile giriş / kayıt
- çıkış
- şifre sıfırlama
- email doğrulama
- admin onayı bekleme ekranı

## 5.2 Kimlik doğrulama ilkeleri
- Şifreler **argon2id** ile hashlenmeli.
- Şifre politikası güçlü olmalı.
- Hassas işlemlerde rate limit uygulanmalı.
- Session yönetimi güvenli cookie’lerle yapılmalı.
- `httpOnly`, `secure`, `sameSite` uygun ayarlanmalı.
- Brute-force koruması olmalı.
- Hesap enumerate etmeye izin veren hata mesajlarından kaçınılmalı.

## 5.3 Yetkilendirme ilkeleri
- Route seviyesinde koruma
- Action / mutation seviyesinde koruma
- Sunucu tarafında rol kontrolü
- Sunucu tarafında grup bazlı erişim kontrolü
- UI tarafında yalnızca görünürlük kontrolü eklenmeli; asıl güvenlik backend’de olmalı

Örnek kurallar:
- Her kullanıcı kendi kayıtlarını oluşturabilir, düzenleyebilir, görüntüleyebilir.
- Admin tüm kayıtları görebilir.
- Moderatör yalnızca kendi grup toplantı duyurularını oluşturabilir.
- Raportör yalnızca kendi grubuna ilişkin tutanak ve raporları oluşturabilir.
- Genel pano tüm üyelere görünür; grup panosu yalnızca aynı gruba görünür.

---

# 6) Güvenlik gereksinimleri

Aşağıdaki güvenlik başlıklarını “opsiyonel” görme; proje mimarisine dahil et:

## 6.1 Girdi doğrulama
- Tüm form girişlerini `Zod` ile doğrula.
- İstemci doğrulaması kullanıcı deneyimi için olsun; asıl doğrulama sunucuda tekrar edilsin.
- `trim`, `normalize`, `length guard`, `enum guard`, tarih ve sayı doğrulaması uygula.

## 6.2 XSS / injection önlemleri
- Prisma üzerinden parametrik sorgular kullan.
- Gereksiz `raw SQL` yazma.
- Kullanıcı metinlerini HTML olarak körlemesine render etme.
- Zengin metin kullanılacaksa sanitize et.
- Markdown kullanılacaksa güvenli markdown render pipeline kur.

## 6.3 Dosya yükleme güvenliği
- MIME allowlist kullan.
- Dosya boyutu limitleri belirle.
- İzin verilmeyen dosya türlerini reddet.
- Dosyaları rastgele / hash tabanlı isimlerle sakla.
- Yüklenen dosyaları public root altında executable şekilde tutma.
- Güvenli indirme rotası veya signed URL mantığı kur.
- Dosya meta verilerini DB’de sakla.
- Gerekirse antivirus / scanning hook’a uygun soyut katman bırak.

## 6.4 Rate limiting
En az şu uç noktalarda rate limit uygula:
- login
- signup
- password reset
- email verification resend
- pano paylaşımı oluşturma
- dosya yükleme
- admin aksiyonları

## 6.5 Audit ve izlenebilirlik
Audit log üret:
- login / failed login
- hesap onayı / reddi
- rol değişikliği
- grup değişikliği
- kritik kayıt silme / geri alma
- toplantı / rapor / tutanak işlemleri

## 6.6 Güvenli varsayılanlar
- CSP ve temel güvenlik başlıklarını ayarla.
- `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options` gibi başlıkları değerlendir.
- Prod ortamında debug bilgi sızdırma.
- Hassas hata stack trace’lerini kullanıcıya gösterme.
- `.env` değerlerini yalnızca sunucuda kullan.
- Client bundle’a secret sızdırma.

## 6.7 Veri bütünlüğü
- Uygun foreign key’ler
- unique constraint’ler
- transaction gereken yerlerde transaction
- soft delete + restore mantığı
- migration disiplini
- seed verileri ile tutarlı demo kurulumu

---

# 7) UI/UX beklentileri

## 7.1 Genel tasarım yaklaşımı
Aşağıdaki stile sadık kal:
- geniş ama kontrollü whitespace
- net hiyerarşi
- güçlü başlıklar, temiz alt açıklamalar
- sol tarafta kurumsal sidebar
- üst barda arama, tema switch, profil menüsü
- içerik alanında kartlar, tablolar ve sekmeler
- masaüstünde yüksek verimlilik, mobilde okunabilirlik

## 7.2 Görsel ton
- beyaz / açık yüzeyler
- mavi ve yeşili vurgu rengi olarak kullan
- koyu temada kontrastı bozmadan aynı marka kimliğini koru
- ağır gölgelerden kaçın
- yuvarlatılmış ama aşırı oyuncak görünmeyen bileşenler
- veri ağırlıklı ama şık bir kurumsal portal hissi

## 7.3 Bileşenler
shadcn/ui tabanlı olarak şu bileşenleri kur:
- App Sidebar
- Header
- Command/Search
- Cards
- Tabs
- Table / Data grid
- Dialog / Drawer
- Sheet
- Dropdown menu
- Breadcrumb
- Badge
- Form primitives
- Toast / Sonner
- Empty states
- Skeleton loaders
- Error states
- Confirmation dialog

## 7.4 Tema sistemi
- `light`
- `dark`
- `system`

Tema tercihi hem kullanıcı ayarında hem de oturum bazlı kalıcı olmalı.

---

# 8) Teknik mimari beklentileri

## 8.1 Uygulama yapısı
Temiz ve ölçeklenebilir klasörleme yapısı kur.
Örnek mantık:
- `app/`
- `components/`
- `features/`
- `lib/`
- `server/`
- `prisma/`
- `types/`
- `emails/`
- `tests/`

Feature-based organizasyonu tercih et.

## 8.2 Server-first yaklaşım
- Veri erişimi sunucu tarafında olsun.
- İstemciye gereksiz veri taşıma.
- Gerekirse server actions + route handlers hibrit yapı kullan.
- Mutasyonlar için güvenli action katmanı kur.

## 8.3 Performans
- dashboard sorgularını optimize et
- gereksiz N+1 sorgu üretme
- tablo ve liste ekranlarında sayfalama uygula
- uygun indeksleri tasarla
- büyük dosya listelerinde lazy yaklaşım benimse

## 8.4 Loglama ve hata yönetimi
- merkezi log yaklaşımı
- kullanıcı dostu hata mesajları
- geliştirici dostu structured logging
- global error boundary
- not found / unauthorized / forbidden / validation durumlarını net ayır

---

# 9) Sayfa ve route planı

Aşağıdaki route yapısını üret ve gerektiğinde daha iyi alt route’lara böl:

## Public / auth
- `/`
- `/giris`
- `/kayit`
- `/sifremi-unuttum`
- `/sifre-sifirla/[token]`
- `/onay-bekleniyor`
- `/yetkisiz`

## Authenticated app
- `/panel`
- `/panolar`
- `/panolar/genel`
- `/panolar/grup`
- `/kayit/yeni`
- `/kayit/proje-basvurusu`
- `/kayit/basarili-proje`
- `/kayit/proje-fikri`
- `/kayit/etkinlik`
- `/kayit/bilgi-cogaltimi`
- `/kayit/egitim-sunum`
- `/kayit/dokuman-icerik`
- `/kayitlarim`
- `/kayitlarim/[type]/[id]`
- `/calisma-grubum`
- `/belgeler`
- `/profilim`

## Moderator / rapporteur
- `/toplanti-bildirimi/yeni`
- `/tutanak/yeni`
- `/rapor/yeni`

## Admin
- `/yonetim`
- `/yonetim/kullanicilar`
- `/yonetim/davetler`
- `/yonetim/gruplar`
- `/yonetim/roller`
- `/yonetim/sozlukler`
- `/yonetim/loglar`
- `/yonetim/ayarlar`

---

# 10) Teslim beklentisi

Bu projeyi yalnızca “güzel görünen mockup” olarak bırakma. Aşağıdaki teslimleri üret:

## 10.1 Kod ve işlev
- çalışan full-stack uygulama
- Prisma schema
- migration dosyaları
- seed script
- auth entegrasyonu
- Google OAuth entegrasyonu
- credentials auth entegrasyonu
- role & group bazlı authorization
- tüm ana ekranlar
- form akışları
- dosya yükleme altyapısı
- dashboard metrikleri
- admin paneli çekirdeği

## 10.2 Dokümantasyon
- detaylı `README.md`
- `.env.example`
- kurulum adımları
- geliştirme komutları
- üretim dağıtım notları
- güvenlik varsayımları
- yetki matrisi
- veri modeli özeti

## 10.3 Testler
- auth akışları için test
- yetki ihlali senaryoları için test
- kritik form validasyonları için test
- temel UI smoke testleri
- admin approval akışı için test

## 10.4 Demo / seed verisi
Örnek kullanıcılar oluştur:
- 1 admin
- her grup için en az 1 moderatör
- her grup için en az 1 raportör
- her grup için birkaç normal kullanıcı
- örnek pano gönderileri
- örnek toplantılar
- örnek tutanaklar
- örnek raporlar
- örnek belgeler
- örnek bireysel kayıtlar

---

# 11) Uygulama içi metin dili

Arayüz dili **Türkçe** olacaktır.
Kod tarafında İngilizce teknik isimlendirme kullanılabilir; ancak kullanıcıya görünen tüm ana metinler Türkçe olmalıdır.

Örnek menü isimleri Türkçe kalsın:
- Ana Panel
- Panolar
- Yeni Kayıt Ekle
- Kayıtlarım
- Çalışma Grubum
- Belgeler
- Profilim
- Yönetim Paneli

---

# 12) Yapım ilkeleri

Bu ilkelerden sapma:
- ilk sürümü gereksiz karmaşıklaştırma,
- ağır görev takibi sistemi ekleme,
- çok katmanlı approval workflow kurma,
- gereksiz real-time mimari kurma,
- estetik uğruna okunabilirliği bozma,
- yalnızca istemci tarafında yetki kontrolü yapma,
- “placeholder” veya sahte veriyle teslim yapıp gerçek entegrasyonu erteleme.

Öncelik sırası:
1. güvenli temel mimari
2. sağlam auth + authorization
3. doğru veri modeli
4. temiz bilgi mimarisi
5. kaliteli kurumsal arayüz
6. test ve dokümantasyon

---

# 13) Beklenen çalışma biçimi

Projeyi aşağıdaki fazlarda geliştir:

## Faz 1 — Foundation
- proje iskeleti
- tasarım sistemi
- tema sistemi
- layout / sidebar / header
- auth temel akışları
- Prisma kurulumu
- temel DB şeması

## Faz 2 — Authentication & Authorization
- credentials signup/login
- Google OAuth
- email verification
- password reset
- admin approval
- role-based access control
- group-based visibility

## Faz 3 — Core Modules
- dashboard
- panolar
- yeni kayıt ekle modülleri
- kayıtlarım
- çalışma grubum
- belgeler
- profilim

## Faz 4 — Power Features
- moderator toplantı bildirimi
- rapporteur tutanak ekleme
- raportör rapor ekleme
- admin paneli
- audit log
- davet sistemi

## Faz 5 — Hardening
- validation tightening
- rate limit
- security headers
- file upload hardening
- performance optimization
- tests
- docs

Her faz sonunda şunları ver:
- yapılan işler özeti
- eklenen dosyalar
- çalıştırılması gereken komutlar
- açılan teknik borçlar
- bir sonraki faz planı

---

# 14) Kabul kriterleri

Bir işi tamamlanmış saymak için aşağıdakiler sağlanmalı:
- uygulama lokal ortamda ayağa kalkıyor,
- auth akışları çalışıyor,
- rol ve grup bazlı erişim gerçekten korunuyor,
- dashboard veri gösteriyor,
- kayıt formları veri kaydediyor,
- grup ekranları ilişkili verileri gösteriyor,
- panolar çalışıyor,
- dosya yükleme güvenli biçimde çalışıyor,
- admin kullanıcı onaylayabiliyor,
- tema geçişi düzgün,
- koyu tema kırık değil,
- kod derleniyor,
- lint ve testler geçiyor,
- README ile proje kurulabiliyor.

---

# 15) İstenen çıktı formatı

Senden aşağıdaki sırayla çıktı istiyorum:
1. önerilen mimari özeti
2. klasör yapısı önerisi
3. veri modeli özeti
4. auth ve yetki kurgusu
5. sayfa/route haritası
6. uygulanacak UI sistemi
7. fazlara bölünmüş geliştirme planı
8. ardından doğrudan kodlamaya geçiş

Kod yazarken:
- eksik parça bırakma,
- TODO yığını üretme,
- güvenlik kritik kısımları atlama,
- “bunu sonra yaparsın” mantığıyla auth veya authorization’ı boş bırakma.

---

# 16) UI ajana verilecek ek prompt

Aşağıdaki promptu yalnızca tasarım / frontend rafinasyonu için ayrı bir ajanla da kullanabilirsin:

## UI_PROMPT
DFT Kapalı Portalı için kurumsal, masaüstü öncelikli ama mobil uyumlu bir arayüz sistemi tasarla. Kullanıcı kitlesi kamu kurumu ve proje ekosistemi profesyonelleridir. Arayüz sade, güven veren, kaliteli ve hızlı algılanan bir yapıda olsun. Ana renkler #00bd8d ve #0060ab. shadcn/ui ve Tailwind ile üret. Sidebar + header + dashboard + board cards + data tables + form pages + admin pages bütünlüğünü tek bir görsel sistem altında kur. Açık, koyu ve sistem teması kusursuz çalışsın. Kullanıcıya görünen dil Türkçe olsun. Sosyal medya benzeri gürültülü yapıdan kaçın; belge odaklı, düzenli ve profesyonel bir portal deneyimi kur.

---

# 17) Backend ajana verilecek ek prompt

## BACKEND_PROMPT
DFT Kapalı Portalı için Next.js, TypeScript, Prisma ve PostgreSQL tabanlı güvenlik odaklı backend mimarisi kur. Auth.js ile Google OAuth ve credentials auth akışlarını ekle. Portal kapalı sistem olduğu için signup sonrası admin approval veya invite token mantığını zorunlu kıl. Her kullanıcı tek gruba bağlı, birden fazla role sahip olabilir. Role-based ve group-based authorization’ı hem route seviyesinde hem server action / API seviyesinde uygula. Prisma veri modelini modüler kur; meeting, minute, report, board post, documents ve bireysel kayıt modülleri için temiz ilişki yapıları tasarla. Soft delete, audit log, validation, rate limit, file upload hardening ve güvenli hata yönetimini dahil et.

---

# 18) Güvenlik inceleme ajana verilecek ek prompt

## SECURITY_REVIEW_PROMPT
Bu projeyi production-minded güvenlik bakışıyla denetle. Kimlik doğrulama, yetkilendirme, dosya yükleme, pano içerik girişi, form validasyonu, rate limit, session güvenliği, environment secret kullanımı, XSS, CSRF, SSRF, IDOR, privilege escalation ve açık yönlendirme risklerini gözden geçir. Sadece sorun listeleme; her bulgu için somut düzeltme önerisi ve örnek kod değişikliği üret. Özellikle grup bazlı erişim ihlali ve admin dışı role elevation risklerini test et.

---

# 19) QA / son kontrol ajana verilecek ek prompt

## QA_PROMPT
DFT Kapalı Portalı’nı uçtan uca kalite kontrol gözlüğüyle değerlendir. Auth akışları, admin approval, rol görünürlükleri, grup bazlı erişim, pano gönderileri, toplantı bildirimi, tutanak, rapor ekleme, belge yükleme, kayıt ekleme ve tema geçişlerini test et. Kırık route, tutarsız Türkçe metin, bozuk koyu tema, mobil taşma, validasyon açığı ve yetki hatalarını tek tek raporla. Mümkün olan her kritik akış için Playwright senaryosu öner veya yaz.

---

# 20) Son talimat

Bu projeyi:
- kurumsal,
- gerçekçi,
- sürdürülebilir,
- güvenlik odaklı,
- tam fonksiyonel,
- temiz kodlu,
- iyi dokümante edilmiş
bir ürün olarak inşa et.

İlk cevabında önce mimariyi ve planı ver, ardından uygulamayı faz faz üretmeye başla.
