# DFT Projesi Portalı - Kapsamlı Kullanım Kılavuzu

Hoş geldiniz! Bu kılavuz, DFT (Dijital Fabrika Dönüşüm) Projesi Portalı'nın tüm modüllerini, kullanıcı rollerini, hangi rolün hangi menüleri görebildiğini ve yapabileceği işlemleri detaylıca açıklamak amacıyla hazırlanmıştır. 

---

## 1. Menü ve Yetki Matrisi

Aşağıdaki tablo, sistemdeki sol menüde yer alan sekmeleri kimlerin görebildiğini ve bu menülerde hangi işlemleri yapabildiklerini özetlemektedir:

| Menü Grubu & Bağlantı | Görebilen Roller | Açıklama ve Yetkiler |
| :--- | :--- | :--- |
| **Ana Menü** | | |
| Ana Panel | Tüm Roller | Panolar, duyurular ve genel özetin bulunduğu karşılama ekranıdır. |
| DFT Hakkında | Tüm Roller | Proje ve portal hakkında genel bilgilendirme sayfasıdır. |
| Yeni Kayıt Ekle | Tüm Roller | Tüm rollere açık hızlı içerik oluşturma formudur. |
| Paylaşımlar | Tüm Roller | Kişinin portal genelinde yaptığı geçmiş paylaşımları listeler. |
| **Grup İşlemleri** | | |
| Çalışma Grubum | Tüm Roller | Kullanıcının dahil olduğu gruba ait forum, toplantı, KPI, not ve üyelerin yer aldığı alandır. |
| Konu Başlat | Tüm Roller | Gruptaki foruma yeni tartışma/konu açmak için kullanılır. |
| Bildirim Ekle | Admin, Moderatör | Gruba veya genel sisteme özel resmi duyuru ve bildirimleri yayınlama menüsüdür. |
| Rapor Ekle | Admin, Raportör | Grubun dönemsel veya özel toplantı raporlarını sisteme yükleme ve oluşturma formudur. |
| Danışman Notu Ekle | Admin, Danışman | İlgili gruba yönelik "Danışman Notu" oluşturulmasını ve sisteme girilmesini sağlar. |
| KS Notu Ekle | Admin, Kalite Sor. (KS) | İlgili gruba yönelik kalite süreçlerini değerlendiren "Kalite Sorumlusu Notu" girilir. |
| KPI Ekle | Admin, Moderatör | Gruba özel manuel (Custom) KPI hedefleri belirlemek ve oluşturmak için kullanılır. |
| **Ayarlar** | | |
| Profilim | Tüm Roller | Kullanıcının kendi şahsi iletişim ve uzmanlık bilgilerini güncellediği sayfadır. |
| **Yönetim** | | |
| Yönetim Paneli | Sadece Admin | Kullanıcı davet etme, grupları oluşturma ve sistem genel ayarlarını yapma ekranıdır. |

---

## 2. Rollerin Yapabildikleri ve Detaylı Yetki Kapsamları

### 2.1. Sistem Yöneticisi (Admin)
Portalın tüm menülerine, gruplarına ve verilerine sınırsız erişimi olan en üst düzey roldür.
- **Görebildiği Menüler:** Tüm Menüler. (Örn: Yönetim Paneli, Tüm Not formları, Bildirim, KPI vb.)
- **Yetkileri:** 
  - Yönetim paneli üzerinden yeni çalışma grupları açabilir, üyeleri davet edip silebilir.
  - Rol atamalarını yönetir.
  - Özel KPI'ların referans değeri olan "Baseline (Başlangıç)" verilerini sadece Admin güncelleyebilir/silebilir.
  - Tüm genel pano ve grup panolarında duyuru (Bildirim) oluşturabilir.

### 2.2. Grup Moderatörü (Moderator)
Atandığı çalışma grubunun yönetimi ve performans hedeflerinin lideridir.
- **Ek Olarak Görebildiği Menüler:** Bildirim Ekle, KPI Ekle
- **Yetkileri:** 
  - Kendi grubuna özel duyurular (Bildirimler) yayınlayabilir.
  - Kendi grubu için "Özel KPI" hedefleri belirleyebilir. 
  - Grup üyelerinin bu KPI'lara girdiği kanıtlı (actual) değerleri inceleyip onaylayabilir veya reddedebilir.
  - Grup içi forumu modere eder, konuları takip eder.

### 2.3. Raportör (Rapporteur)
Grubun veri girişlerinden ve resmi raporlamasından sorumlu olan rolüdür.
- **Ek Olarak Görebildiği Menüler:** Rapor Ekle
- **Yetkileri:** 
  - Toplantı sonrası veya dönemsel olarak "Rapor Ekle" ekranı aracılığıyla gruba ait resmi faaliyet raporlarını, toplantı tutanaklarını ve ekleri (dosyaları) sisteme yükler.

### 2.4. Danışman (Advisor)
Gruplara akademik veya sektörel bilgi birikimiyle yön veren uzman kişidir.
- **Ek Olarak Görebildiği Menüler:** Danışman Notu Ekle
- **Yetkileri:** 
  - Grubun (Özet, KPI, Forum, Raporlar) tüm çalışmalarını inceleyebilir.
  - Çalışmalar hakkında tavsiye, eksiklik veya tebrik içeren geri bildirimleri "Danışman Notu" olarak oluşturup grubun panosuna işler.

### 2.5. Kalite Sorumlusu (KS)
Projenin ve grubun çıktılarının hedeflenen kalite standartlarına uygunluğunu denetler.
- **Ek Olarak Görebildiği Menüler:** Kalite Sorumlusu Notu Ekle
- **Yetkileri:** 
  - Tıpkı danışman gibi gruptaki gelişmeleri denetler.
  - Özel form üzerinden "KS Notu" girerek grubun kalite endekslerine ve KPI hedeflerine ilişkin uyarılar ve değerlendirmeler yapar.

### 2.6. Grup Üyesi
Çalışma grubunun temel yapı taşıdır. Yukarıdaki ek yetki gerektiren hiçbir (Bildirim Ekle, Rapor Ekle, Not Ekle vb.) menüyü göremez, sadece ortak panelleri kullanabilir.
- **Yetkileri:** 
  - Forumda soru sorabilir, yeni konu başlatabilir.
  - Moderatör tarafından oluşturulan Özel KPI hedeflerini tamamladığında, sistem üzerinden "Kanıt Yükle / Gerçekleşme Bildir" formunu doldurarak onay sürecini başlatabilir.
  - Gruba ait toplantıları, raporları, KS ve danışman notlarını "Çalışma Grubum" sekmesi üzerinden detaylıca okuyup inceleyebilir.

---

## 3. Çalışma Grubum (Grup Merkezi) ve Formlar

"Çalışma Grubum" ana menüsü altında yer alan sekmeler, grup üyelerinin veriye izole olarak ulaştıkları sekmelerdir:

1. **Özet:** Üye sayıları, moderatör, son etkinlikler (4 konu, 4 toplantı).
2. **Forum:** Gruba özel iç forum. "Konu Başlat" diyerek kanıtlar ve dosyalarla (PDF, Görsel) konular açılabilir.
3. **Bildirimler:** Sadece Moderatör veya Admin'in yükleyebildiği haber akışını okuma ekranıdır.
4. **Toplantılar:** Takvim entegrasyonlu, lokasyonlu ve dosyalı olarak girilen toplantı arşivleridir. (Herkes kayıt ekleyemez, sadece admin ve ilgili yetkililer yetkilidir).
5. **Raporlar:** Raporlar sekmesinden raportör tarafından eklenen dönem raporları okunur.
6. **KPI Sekmesi:**
   - **Sabit KPI'lar:** Tüm sistem için aynı olan 7 metrik. Hiçbir hedef girilmez. Eklenen form verilerinden otomatik olarak grafik/puanlama oluşturur.
   - **Özel KPI'lar:** Moderatörün girdiği, grup üyelerinin kanıt yüklediği KPI tablolarıdır. Onay-bekleyen-reddedilen şeklinde 3 farklı durumu barındırır.
7. **Danışman / KS Notları:** Notların tasniflenerek okunabildiği sekmedir.
8. **Üyeler:** İletişim bilgileri şeffaf olarak gösterilen üye kartlarıdır.

---

> **Yardım ve Destek:** Sistemsel bir yetki eksikliği yaşadığınızda veya menüleri göremediğiniz durumlarda, öncelikle "Profilim" sekmesinden yetkilerinizi kontrol ediniz. Rol güncellemeleri yalnızca Sistem Yöneticisi (Admin) tarafından yapılabilmektedir.
