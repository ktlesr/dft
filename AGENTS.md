# Project Instructions for Codex

## Project Overview
Bu proje Next.js / TypeScript / Tailwind / shadcn yapısında geliştirilmiştir. Kod değişikliği yapmadan önce mevcut mimariyi, dosya yapısını ve kullanılan bileşenleri incele.

## Working Rules
- Önce mevcut yapıyı anla, sonra değişiklik öner.
- Mevcut tasarımı ve çalışan fonksiyonları bozmadan ilerle.
- Gereksiz refactor yapma.
- Büyük değişikliklerden önce plan çıkar.
- Yeni paket eklemeden önce gerekçesini açıkla.
- Veritabanı, auth, API route, environment değişikliklerinde özellikle dikkatli ol.
- Kod değişikliği yaptıktan sonra hangi dosyaların değiştiğini ve neden değiştiğini açıkla.
- **DİKKAT:** .env dosyasında **gizli anahtarlar/sırlar** bulunuyor. Kesinlikle bu dosyaları kopyalama, commit etme veya güvenli olmayan yerlerde paylaşma.
- **DİKKAT:** Çalışma ortamında **.env** ve **.env.example** dosyalarını karıştırma. .env sadece local ortamda bulunur, üzerinde gizli veriler içerir.
- **DİKKAT:** Yapılacak değişikliklerin **.env** dosyasına yansıtılması gerekiyorsa, önce **.env.example** dosyasında ilgili satırı ekle veya güncelle, sonra local ortamda **.env** dosyasını elle düzenle.
- Çalışan hiç birşeyi bozmadan sadece istenilen işi cerrahi müdahale ile yap
- Cerrah hassasiyetiyle çalışırken atomik müdahalelerle ilerle.
- Güvenlik, performans ve kod kalitesini önceliklendir
- Premium bir yaklaşım sergile, aceleci davranma
- 


## Tech Stack
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma / PostgreSQL veya Supabase kullanılıyorsa ilgili mevcut yapıya sadık kal.

## Output Style
- Önce kısa analiz yap.
- Sonra uygulanacak adımları sırala.
- Değişiklik yapmadan önce riskleri belirt.