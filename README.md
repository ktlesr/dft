# DFT Kapalı Portalı (DFT Portal)

DFT üyelerine özel, kurumsal, güvenlik odaklı bir **kapalı portal** uygulaması.
Projenin çerçevesi, kapsamı ve tüm iş kuralları [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) dosyasındadır.

> Portal kamuya açık değildir. Kayıt sonrası admin onayı gerektirir ve tüm
> sayfalar robotlara/indexlemeye kapalıdır.

---

## Teknoloji yığını

| Katman | Teknoloji | Notlar |
| --- | --- | --- |
| Framework | **Next.js 15** (App Router) | Turbopack dev, server-first yaklaşım |
| Dil | **TypeScript** (strict + `noUncheckedIndexedAccess`) | |
| UI | **React 19**, **Tailwind CSS 3.4**, **shadcn/ui** (New York), **lucide-react** | |
| Tema | **next-themes** (light / dark / system) | CSS değişkenleri |
| Doğrulama | **Zod** + **React Hook Form** | |
| Kimlik | **Auth.js v5** (NextAuth) + **Google OAuth** + Credentials | *Faz 2'de aktifleşir* |
| Şifre | **@node-rs/argon2** (argon2id, OWASP 2024 önerisi) | |
| ORM | **Prisma 6** + **PostgreSQL 16** | Docker |
| Test | **Vitest**, **Playwright** | *Faz 5* |

### Sürüm seçimi gerekçesi

- **Next 15 + React 19**: App Router + Server Actions + Partial Prerender olgunlaşmış durumda; kapalı portal için gereken server-first güvenlik modeline en uygun kombinasyon.
- **Tailwind 3.4 + shadcn New York**: Tailwind v4 ile shadcn bileşen dalı henüz stabil değil; 3.4 daha sağlam. Geçiş Faz 5'te değerlendirilebilir.
- **Auth.js v5 beta**: Next 15 App Router ve Edge uyumu için tek stabil yol. Prisma adapter'i ile hem credentials hem OAuth akışlarını desteğiyle.
- **Argon2id**: `bcrypt` yerine tercih edildi; OWASP 2024 Password Storage cheat sheet'inin birinci tercihi.

---

## Hızlı başlangıç

### 1) Gereksinimler

- Node.js **22+**
- pnpm **10+**
- Docker Desktop (Postgres için)

### 2) Bağımlılıkları yükle

```bash
pnpm install
```

### 3) Ortam değişkenleri

```bash
cp .env.example .env
# .env içindeki AUTH_SECRET ve AUTH_GOOGLE_* değerlerini gerçek değerlerle doldurun
```

**Üretim için zorunlu:** `AUTH_SECRET`'i `openssl rand -base64 32` ile üretilmiş bir değere çevirin.

### 4) Veritabanını başlat (Docker)

```bash
pnpm db:up          # docker compose up -d postgres  (host port 5433)
pnpm db:push        # Prisma schema → DB (Faz 1 sırasında)
pnpm db:seed        # başlangıç grupları + admin user
```

> Postgres host portu **5433** olarak ayarlandı (`docker-compose.yml`) — 5432'nin
> başka bir yerel Postgres tarafından tutulması durumunda çakışmayı önlemek için.
> İhtiyaç halinde `docker-compose.yml` + `.env`'deki `DATABASE_URL` ikisini birden güncelleyin.

> Üretimde `pnpm db:migrate deploy` kullanın. `db:push` yalnızca geliştirme içindir.

### 5) Dev sunucusu

```bash
pnpm dev
```

Tarayıcıdan <http://localhost:3000> → landing, `/panel` → portal ana paneli.

---

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `pnpm dev` | Next.js dev sunucusu (Turbopack) |
| `pnpm dev:clean` | `.next` temizle + dev başlat (cache sorunu durumunda) |
| `pnpm build` | Üretim build |
| `pnpm start` | Üretim sunucusu |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:up` / `pnpm db:down` | Postgres dev konteynerini başlat/durdur (docker-compose.dev.yml) |
| `pnpm db:push` | Schema'yı DB'ye uygula (dev) |
| `pnpm db:migrate` | Migration oluştur + uygula (dev) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:seed` | Seed verisini yükle |
| `pnpm docker:build` | Production image'ini derle |
| `pnpm docker:up` | Full production stack (app + postgres) |
| `pnpm docker:down` | Stack'i durdur |
| `pnpm docker:logs` | App loglarını takip et |
| `pnpm test` / `pnpm test:run` | Vitest |
| `pnpm e2e` | Playwright |

---

## Docker ve Dokploy dağıtımı

İki compose dosyası var:

- **`docker-compose.dev.yml`** — yalnızca Postgres (dev için, host 5433'te).
- **`docker-compose.yml`** — full stack (app + postgres), Dokploy'un otomatik algılayacağı dosya.

### Image yapısı (`Dockerfile`)

- Multi-stage: `base` → `deps` → `builder` → `runner`
- Next.js **standalone** output → yaklaşık 300 MB image
- pnpm via corepack · Prisma Client + CLI gömülü
- Debian slim (argon2 native modülü için Alpine/musl sorunları olmadan)
- Non-root `nextjs` kullanıcısı · `tini` init · HEALTHCHECK

### Gerekli environment değişkenleri

Dokploy panelinde (veya sunucuda `.env` olarak) şunları ayarlayın:

```env
APP_URL=https://portal.alan-adiniz.tr
AUTH_URL=https://portal.alan-adiniz.tr
AUTH_SECRET=<openssl rand -base64 32>
AUTH_TRUST_HOST=true
POSTGRES_PASSWORD=<strong-random-password>

# opsiyonel
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
MAX_UPLOAD_BYTES=15728640
```

### Dokploy kurulum adımları

1. **Application** → **Create** → Source = `Git` → Repo URL'i gir.
2. **Compose** türünü seç (Dokploy `docker-compose.yml`'i otomatik okur).
3. **Environment** panelinde yukarıdaki env'leri doldur.
4. **Deploy** → Dokploy önce `postgres`'i sağlıklı hale getirir, sonra `app` container'ını başlatır. `docker-entrypoint.sh` otomatik olarak Prisma şemasını DB'ye uygular.
5. İlk deploy sonrası seed çalıştırmak için:

   ```bash
   docker compose exec app node -e "require('./prisma/seed.js')"
   # Alternatif: dev makineden production DB'ye DATABASE_URL ile bağlanıp:
   #   pnpm db:seed
   ```

### Güncelleme

Dokploy'da "Redeploy" → yeni commit çekilir, image yeniden build edilir, schema otomatik güncellenir.

### Güvenlik notları

- `postgres` host port'a **expose edilmez** — sadece Docker iç ağı. Dış erişim için explicit `ports:` ekleyin.
- `dft_pgdata` ve `dft_uploads` named volume'ları host'ta kalıcı; Dokploy yedekleme politikanıza dahil edin.
- Prod'da her zaman HTTPS üzerinden hizmet verin. Dokploy'un Traefik/Let's Encrypt entegrasyonu bu iş için idealdir.
- `AUTH_SECRET` rotate edildiğinde tüm oturumlar geçersizleşir — planlı bakım gerektirir.

---

## Klasör yapısı

```
app/
├─ (auth)/              Public auth ekranları: giriş, kayıt, şifremi unuttum, onay-bekleniyor, yetkisiz
├─ (portal)/            Authenticated portal: panel, panolar, kayıt, kayıtlarım, grup, belgeler, profil
│  ├─ yonetim/          ADMIN yalnızca
│  ├─ toplanti-bildirimi/ MODERATOR + ADMIN
│  ├─ tutanak/          RAPPORTEUR + ADMIN
│  └─ rapor/            RAPPORTEUR + ADMIN
├─ api/auth/            Auth.js handlers (Faz 2)
├─ layout.tsx           Root layout (ThemeProvider + Toaster)
├─ page.tsx             Landing
├─ not-found.tsx
└─ error.tsx
components/
├─ ui/                  shadcn primitives (button, card, input, label, badge, avatar, dropdown, sheet, tabs, sonner, …)
├─ app/                 portal shell (sidebar, header, page-header, empty-state, phase-placeholder, nav-config)
├─ brand/               marka logo/lockup
├─ theme-provider.tsx
└─ theme-toggle.tsx
lib/
├─ utils.ts             cn, tarih formatlama, initials
├─ prisma.ts            singleton Prisma client
├─ rbac.ts              hasRole, canCreate*, ForbiddenError / UnauthorizedError
├─ current-user.ts      getCurrentUser / requireUser (Faz 1 mock → Faz 2 gerçek)
└─ constants.ts         grup, rol, durum, enum label'ları + upload limitleri
prisma/
├─ schema.prisma        tüm çekirdek varlıklar
└─ seed.ts              gruplar + admin
```

---

## Rol ve grup modeli

- **Roller:** `USER`, `MODERATOR`, `RAPPORTEUR`, `ADMIN` — bir kullanıcıda birden fazla rol bulunabilir (`RoleAssignment` üzerinden).
- **Gruplar:** `UAK`, `E2SC`, `DFSF`, `PGD`, `PA` — her kullanıcı **tek** gruba bağlıdır (`User.groupId`).
- Grup bazlı erişim `lib/rbac.ts` yardımcılarıyla (`canCreateMeeting`, `canSeeGroupResource`, …) **sunucu tarafında** zorlanır.

### Yetki matrisi (özet)

| Eylem | USER | MODERATOR | RAPPORTEUR | ADMIN |
| --- | :-: | :-: | :-: | :-: |
| Kendi kayıtlarını oluştur/düzenle/sil | ✓ | ✓ | ✓ | ✓ |
| Tüm kayıtları gör | | | | ✓ |
| Genel panoya yaz | ✓ | ✓ | ✓ | ✓ |
| Grup panosuna yaz (kendi grubu) | ✓ | ✓ | ✓ | ✓ |
| Toplantı bildirimi oluştur | | ✓ (kendi grubu) | | ✓ |
| Tutanak oluştur | | | ✓ (kendi grubu) | ✓ |
| Rapor oluştur | | | ✓ (kendi grubu) | ✓ |
| Kullanıcı onayla / rol ata | | | | ✓ |
| Davet oluştur | | | | ✓ |
| Audit log görüntüle | | | | ✓ |

---

## Güvenlik duruşu

İlk sürümde uygulanan veya hazır olan önlemler:

- **Kapalı sistem:** public signup varsayılan olarak `PENDING_APPROVAL`, admin onayı sonrası aktif. Davet token'lı akış alternatif.
- **Headers:** CSP, X-Frame-Options=DENY, nosniff, HSTS, Referrer-Policy, `X-Robots-Tag: noindex` tüm rotalarda.
- **Şifre:** argon2id (OWASP 2024 profili), minimum 10 karakter politikası.
- **Oturum:** Auth.js cookie-based, `httpOnly` + `secure` + `sameSite=lax`.
- **Prisma:** yalnızca parametrik sorgular; `raw SQL` yasak.
- **Dosya yükleme:** MIME allowlist + boyut limiti + hash-adlı storage (Faz 2 aktifleşir).
- **Audit log:** kritik eylemler için `AuditLog` tablosu hazır.
- **Soft delete:** ilgili modellerde `deletedAt` alanı.

Faz 5'te sertleştirme başlıkları: rate-limit (in-memory → Redis), CSP nonce, upload AV-hook, security review.

---

## Fazlara bölünmüş yol haritası

| Faz | Durum | İçerik |
| --- | --- | --- |
| **Faz 1 — Foundation** | ✅ *tamamlandı* | Proje iskeleti, Prisma şeması v1, tasarım sistemi, layout (sidebar + header), auth ekranlarının UI iskeletleri, portal route'ları (placeholder), Docker Postgres, seed. |
| **Faz 2 — Auth & RBAC** | ✅ *tamamlandı* | Auth.js v5 (Credentials + Google), argon2id, account lockout, email verification, password reset, admin approval gate, JWT session (8h sliding, 5m refresh), edge middleware, audit log, rate limit, gerçek `getCurrentUser()`. |
| **Faz 3 — Core modules** | ✅ *tamamlandı* | 7 kayıt modülü, Panolar (genel + grup) CRUD, canlı Dashboard, Kayıtlarım tablosu, Çalışma Grubum sekmeli merkezi, Belgeler kütüphanesi, Profil + şifre değiştirme, Storage driver + signed download route, demo seed (admin + 5 grup x 4 üye). |
| **Faz 4 — Power features** | ✅ *tamamlandı* | Meeting / Minute / Report modülleri, Admin paneli (genel + kullanıcılar + rol/grup/status + davetler + audit log + gruplar), Davet sistemi (token'lı direkt aktif kayıt), Notifications (header bell + sayfa + toplantı/rapor/onay tetikleyicileri). |
| **Faz 4 — Power features** | ⏳ | Toplantı/tutanak/rapor modülleri + admin paneli + davet sistemi + audit log okuyucu. |
| **Faz 5 — Hardening** | ⏳ | Rate limit, file upload hardening, CSP nonce, Playwright e2e, Vitest kritik testler, security review. |

---

## Faz 1 kapanış raporu

### Eklenen dosyalar (özet)

- Kök: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `components.json`, `docker-compose.yml`, `.env` / `.env.example`, `.gitignore`, `README.md`
- `prisma/`: `schema.prisma`, `seed.ts`
- `lib/`: `utils.ts`, `prisma.ts`, `rbac.ts`, `current-user.ts`, `constants.ts`
- `components/ui/`: button, card, input, label, badge, separator, avatar, dropdown-menu, sheet, tabs, skeleton, sonner
- `components/`: `theme-provider.tsx`, `theme-toggle.tsx`, `brand/logo.tsx`, `app/sidebar.tsx`, `app/header.tsx`, `app/page-header.tsx`, `app/empty-state.tsx`, `app/phase-placeholder.tsx`, `app/nav-config.ts`
- `app/`: `layout.tsx`, `page.tsx` (landing), `globals.css`, `not-found.tsx`, `error.tsx`
- `app/(auth)/`: `layout.tsx`, `giris`, `kayit`, `sifremi-unuttum`, `onay-bekleniyor`, `yetkisiz`
- `app/(portal)/`: `layout.tsx`, `panel`, `panolar` (+ `genel`, `grup`), `kayit/yeni` (+ 7 kayıt tipi), `kayitlarim`, `calisma-grubum`, `belgeler`, `profilim`, `toplanti-bildirimi/yeni`, `tutanak/yeni`, `rapor/yeni`, `yonetim`

### Çalıştırılması gereken komutlar

```bash
pnpm install
pnpm db:up
pnpm db:push
pnpm db:seed
pnpm dev
```

### Açılan teknik borçlar (Faz 2+ için)

1. **Auth.js entegrasyonu** — `lib/current-user.ts` henüz mock dönüyor; portal layout'un redirect mantığı hazır ama session katmanı bağlanmadı.
2. **Google OAuth** — `AUTH_GOOGLE_ID`/`SECRET` gerçek Cloud Console değerleriyle doldurulmalı.
3. **Email gönderimi** — email verify + password reset için SMTP / Resend entegrasyonu gerekli.
4. **Rate limit** — şu an yok; `/api/auth/*` ve form uç noktalarına Faz 5'te in-memory → Redis fallback.
5. **CSP nonce** — `next.config.ts`'deki CSP `unsafe-inline` izin veriyor (Next inline script'leri için); Faz 5'te `middleware` ile nonce stratejisi.
6. **Dosya upload pipeline** — `Attachment` modeli hazır; storage driver soyutlaması Faz 3'te, AV-hook Faz 5'te.

### Bir sonraki faz planı (Faz 2)

1. `lib/auth.ts` — Auth.js v5 config, Prisma adapter, Google + Credentials providers.
2. `app/api/auth/[...nextauth]/route.ts`
3. Gerçek giriş / kayıt / şifremi unuttum server actions (Zod + argon2id).
4. Admin approval middleware — `status !== ACTIVE` → redirect `/onay-bekleniyor`.
5. `getCurrentUser()` → session okuma.
6. Rol bazlı middleware guard'ı (`middleware.ts`).

---

## Faz 2 kapanış raporu

### Eklenen dosyalar

- `lib/`: `auth.ts`, `password.ts`, `rate-limit.ts`, `mail.ts`, `audit.ts`, `tokens.ts` (+ `current-user.ts` gerçek session ile güncellendi)
- `features/auth/`: `schemas.ts`, `actions.ts`, `login-form.tsx`, `signup-form.tsx`, `forgot-form.tsx`, `reset-form.tsx`, `google-signin-button.tsx`, `field-error.tsx`
- `app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- `app/api/auth/dogrula/route.ts` — e-posta doğrulama tek kullanımlık token
- `app/(auth)/sifre-sifirla/[token]/page.tsx` — şifre sıfırlama sayfası (dynamic route)
- `components/ui/alert.tsx` — Alert + AlertTitle + AlertDescription (4 variant)
- `components/app/sign-out-menu-item.tsx`
- `types/next-auth.d.ts` — session / JWT type augmentation
- `middleware.ts` — edge auth gate (defense-in-depth; cookie-presence check)

### Auth akışı

| Flow | Giriş | Davranış |
| --- | --- | --- |
| **Credentials signup** | `/kayit` | Zod validate → argon2id hash → `status=PENDING_APPROVAL` → VerificationToken + mail → mesaj göster |
| **Credentials login** | `/giris` | Zod validate → rate limit (10/15dk) → `authorize()` → argon2 verify → `failedLoginCount++`, 8x yanlışta 15dk kilit → session |
| **Google OAuth** | `/giris` → Google | `signIn` callback'te user yoksa `PENDING_APPROVAL` yarat → portal layout `/onay-bekleniyor`'a yönlendirir |
| **Password reset** | `/sifremi-unuttum` → mail → `/sifre-sifirla/[token]` | Kullanıcı enumerate yok (her zaman OK), tokenHash DB'de, 60dk geçerli, tek kullanımlık |
| **Email verify** | `/api/auth/dogrula?token=...` | `emailVerified=now()` + token silme |
| **Signout** | Header dropdown → form server action | `signOut()` + audit log |

### Güvenlik özellikleri

- **argon2id** (OWASP 2024, 19 MiB, 2 pass) — login & reset
- **Session**: JWT, 8 saat kayan, 5 dakika refresh (rol/grup/status değişikliği anında etki eder)
- **Cookie**: `dft-portal.session` (prod: `__Secure-` prefix + Secure flag), `httpOnly`, `SameSite=Lax`
- **Rate limit**: login 10/15dk, signup 5/60dk, forgot 6/60dk, reset 10/60dk (in-memory bucket, Faz 5'te Redis'e taşınır)
- **Account lockout**: 8 yanlış şifre → 15dk
- **Kullanıcı enumerate koruması**: signup & forgot her zaman "başarı" döner
- **Audit log**: LOGIN, LOGIN_FAILED, LOGOUT, SIGNUP (IP + UA + metadata)
- **Middleware**: `/panel`, `/panolar`, `/kayit`, `/kayitlarim`, `/calisma-grubum`, `/belgeler`, `/profilim`, `/toplanti-bildirimi`, `/tutanak`, `/rapor`, `/yonetim` → cookie yoksa `/giris?redirect=...`
- **Layout-level guard**: `requireActiveUser()` — `PENDING_APPROVAL` → `/onay-bekleniyor`, `SUSPENDED|REJECTED` → `/yetkisiz`

### Yetki helper'ları (`lib/current-user.ts`)

- `getCurrentUser()` — React `cache`'lı; request başına tek DB okuma
- `requireUser()` — session yoksa `/giris`'e
- `requireActiveUser()` — status'a göre yönlendirir
- `requireRole(...roles)` — rol yoksa `/yetkisiz`
- `requireAdmin()` — shorthand for `requireRole("ADMIN")`

### Uçtan uca doğrulama (Faz 2)

```bash
pnpm typecheck   # ✅ 0 hata
pnpm build       # ✅ 31 route, middleware 32 kB
pnpm dev
# 1) GET /panel (anon)                    → 307 /giris?redirect=%2Fpanel
# 2) POST /api/auth/callback/credentials  → 302 + dft-portal.session cookie
# 3) GET /panel (auth)                    → 200, "Hoş geldiniz, DFT"
```

### Bir sonraki faz planı (Faz 3)

1. `features/records/*` — 7 kayıt modülünün gerçek formları (Zod + RHF + server action)
2. Storage driver soyutlaması (`lib/storage/*`) + ilk lokal disk implementasyonu + signed download route
3. Dashboard canlı veri (count queries + son paylaşımlar + yaklaşan toplantılar)
4. Panolar: CRUD + arama + filtre + sabitleme
5. Kayıtlarım ekranı — sekmeli / filtrelenebilir tablo + detay + düzenle / sil (soft)
6. Çalışma Grubum sekmeli merkezi
7. Belgeler: kategori + filtre + yetki bazlı görünürlük
8. Profil düzenleme (avatar, özgeçmiş, şifre değiştir, tema)

---

## Faz 3 kapanış raporu

### Eklenen dosyalar

- `lib/storage/` — driver interface, local-disk implementation (hash-shared, path-escape korumalı), `lib/upload.ts` MIME allowlist + boyut + sayı guard'lı batch persist, `app/api/dosya/[id]` signed download route.
- `features/records/` — `types.ts` (7 tip slug registry), `schemas.ts` (Zod), `actions.ts` (create + soft-delete 7 tip), `queries.ts` (countsByType + listMyRecords), `form-shell.tsx` + 7 client form.
- `features/board/` — `schemas.ts`, `actions.ts` (create/pin/remove, grup bazlı yetki), `queries.ts`, `new-post-dialog.tsx`, `post-card.tsx`.
- `features/documents/` — `actions.ts` (kategori bazlı yetki), `upload-dialog.tsx`.
- `features/profile/` — `actions.ts` (updateProfile + changePassword), `profile-form.tsx`, `password-form.tsx`.
- `features/shared/` — `form-field.tsx`, `attachment-input.tsx`.
- Yeni UI primitive'leri: `textarea`, `select`, `checkbox`, `dialog`.
- Kayıt sayfaları (7 tip) + `/kayitlarim` birleşik tablo + `/kayitlarim/[type]/[id]` detay + soft-delete.
- `/panolar/genel` + `/panolar/grup` gerçek CRUD ile.
- `/panel` canlı sayısal + son paylaşımlar + yaklaşan toplantılar + son belgeler.
- `/calisma-grubum` 7 sekmeli grup merkezi (özet, pano, toplantılar, tutanaklar, raporlar, belgeler, üyeler).
- `/belgeler` kategori + arama + yükleme.
- `/profilim` kişisel bilgi + şifre değiştir.

### Demo seed

```
admin@dft.local / Admin!2026Dev                        (ADMIN, UAK)
uak.moderator@dft.local / Uye!2026Dev                  (MODERATOR)
uak.raportor@dft.local  / Uye!2026Dev                  (RAPPORTEUR)
uak.uye1@dft.local / uak.uye2@dft.local / Uye!2026Dev  (USER)
# aynı kalıp: e2sc., dfsf., pgd., pa.
```

+ 2 genel pano postu, her gruba 1 sabitli grup postu, admin için 4 örnek kayıt, grup başına 1 grup dokümanı, 1 ortak doküman.

### Yetki matrisi — Faz 3 özeti

| Eylem | USER | MODERATOR | RAPPORTEUR | ADMIN |
| --- | :-: | :-: | :-: | :-: |
| 7 kayıt tipi: kendi kaydını oluştur/göster/sil | ✓ | ✓ | ✓ | ✓ |
| Başkasının kaydını görüntüle | | | | ✓ |
| Genel panoya yaz | ✓ | ✓ | ✓ | ✓ |
| Genel postu sabitle / kaldır | | | | ✓ |
| Grup panosuna yaz (kendi grup) | ✓ | ✓ | ✓ | ✓ |
| Grup postunu sabitle / moderasyonla kaldır | | ✓ | | ✓ |
| Kendi postunu kaldır | ✓ | ✓ | ✓ | ✓ |
| Ortak belge yükle | | | | ✓ |
| Grup belgesi yükle | | ✓ | | ✓ |
| Üye yüklemesi (kendi) | ✓ | ✓ | ✓ | ✓ |
| Attachment indir (yetki bazlı) | ✓ | ✓ | ✓ | ✓ |

### Uçtan uca doğrulama

```bash
pnpm typecheck    # ✅ 0 hata
pnpm build        # ✅ 33 route + middleware 32 kB
pnpm db:push      # ✅
pnpm db:seed      # ✅ demo veri yüklendi
pnpm dev
# /giris → admin → /panel (canlı veri + metrikler)
# /panolar/genel → "DFT Kapalı Portalı yayına alındı" (sabitli) görünür
# /kayitlarim → admin 4 kayıt görür
# /belgeler → Ortak + UAK grup dokümanı görünür
# /calisma-grubum → UAK · 7 sekme dolu
# /profilim → kişisel bilgi + şifre değiştirme
```

### Bir sonraki faz planı (Faz 4)

1. **Meeting modülü** — moderatör toplantı bildirimi ekler (+ grup panosuna sabitleme opsiyonu).
2. **Minute modülü** — raportör tutanak ekler (ilgili toplantıya bağlı).
3. **Report modülü** — raportör dönemsel rapor ekler (Yol Haritası / İki Aylık / Kapanış / Anlık Not).
4. **Admin paneli** — kullanıcılar (onay/rol/grup), davetler, sözlükler, audit log, sistem ayarları.
5. **Davet sistemi** — token'lı davet, direkt aktif kayıt akışı.
6. **Notifications** — portal içi basit bildirim listesi (approval, yeni toplantı, yeni rapor).

---

## Faz 4 kapanış raporu

### Eklenen dosyalar

- `features/meeting/` — schemas.ts, actions.ts (createMeeting, removeMeeting), meeting-form.tsx
- `features/minute/` — schemas.ts, actions.ts, minute-form.tsx
- `features/report/` — schemas.ts, actions.ts, report-form.tsx
- `features/admin/user-actions.ts` — approve / reject / suspend / addRole / removeRole (son-admin koruması) / changeUserGroup
- `features/invites/` — actions.ts (create / revoke / accept), new-invite-form.tsx, accept-form.tsx
- `features/notifications/actions.ts` — markAllRead + markOneRead
- `app/(portal)/toplanti-bildirimi/yeni` — Meeting create form
- `app/(portal)/toplanti/[id]` — Meeting detail + minutes list
- `app/(portal)/tutanak/yeni` — Minute create (meeting select)
- `app/(portal)/rapor/yeni` + `app/(portal)/rapor/[id]` — Report create + detail
- `app/(portal)/yonetim` — admin hub (stats)
- `app/(portal)/yonetim/kullanicilar` + `/[id]` — users list + detail (role/group/status)
- `app/(portal)/yonetim/davetler` — invite create + list + revoke
- `app/(portal)/yonetim/loglar` — audit log viewer with filter
- `app/(portal)/yonetim/gruplar` — group member / activity summary
- `app/(portal)/bildirimler` — notifications list
- `app/(auth)/davet/[token]` — public invite acceptance flow
- `components/app/admin-nav.tsx` + `app/(portal)/yonetim/_layout-nav.tsx` — admin section tab bar
- `components/app/notifications-bell.tsx` (server counter — currently inlined into Header for rendering)

### Yetki & iş kuralları — Faz 4 özeti

| Eylem | USER | MODERATOR | RAPPORTEUR | ADMIN |
| --- | :-: | :-: | :-: | :-: |
| Toplantı oluştur (kendi grup) | | ✓ | | ✓ |
| Tutanak oluştur (ilgili toplantıya, kendi grup) | | | ✓ | ✓ |
| Rapor oluştur (kendi grup) | | | ✓ | ✓ |
| Toplantı / tutanak / rapor **oku** (kendi grup) | ✓ | ✓ | ✓ | ✓ |
| Tüm gruplar | | | | ✓ |
| Kullanıcı onayla / reddet / askıya al | | | | ✓ |
| Rol ekle / kaldır (ADMIN hariç) | | | | ✓ |
| Son ADMIN'i kaldır | | | | ✗ (silent-noop) |
| Davet oluştur / iptal | | | | ✓ |
| Audit log oku | | | | ✓ |

### Notifications pipeline

- Meeting create → grup üyelerine bildirim (`link: /toplanti/:id`)
- Report create → grup üyelerine bildirim (`link: /rapor/:id`)
- User approve → kullanıcıya bildirim (+ e-posta)
- Header bell → unread sayısı (portal layout'ta DB sayımı, layout prop olarak geçiyor)
- `/bildirimler` — mark-one-read + mark-all-read

### Uçtan uca doğrulama (Faz 4)

```bash
pnpm typecheck   # ✅ 0 hata
pnpm build       # ✅ 43 route + middleware 32 kB
pnpm db:seed     # ✅ her gruba 2 toplantı (1 yaklaşan + 1 geçmiş/tutanaklı) + 1 yol haritası raporu
pnpm dev
# Senaryo: admin → /yonetim → üyeler → onay / rol / grup → audit log görünür
# Senaryo: moderator (örn. uak.moderator) → /toplanti-bildirimi/yeni → toplantı ekle → grup üyeleri bildirim alır
# Senaryo: raportor (örn. uak.raportor) → /tutanak/yeni → toplantı seç, tutanak yaz
# Senaryo: raportor → /rapor/yeni → Yol Haritası raporu ekle (1 Haziran 2026 – 31 Ağustos 2026 önceden dolu)
# Senaryo: admin → /yonetim/davetler → davet oluştur → console.log'dan link al → /davet/[token] → hesap tamamla
```

### Bir sonraki faz planı (Faz 5 — Hardening)

1. **Rate-limit** — in-memory → Redis fallback (aynı arayüz).
2. **CSP nonce middleware** — inline-script'leri nonce ile izinli yapma; `unsafe-inline` kaldırma.
3. **Upload hardening** — magic-byte MIME doğrulama, opsiyonel AV-hook abstraction.
4. **Email teslim** — Resend / SMTP driver (`lib/mail.ts` arayüzü aynı kalır).
5. **Testler** — Vitest (auth, rbac guard, Zod şemaları) + Playwright kritik akışlar.
6. **CSP hardening + securityheaders.com sertifikası**.
7. **Performans** — dashboard count'larının cache'lenmesi; kritik tablolarda index audit.
8. **Dokümantasyon** — yetki matrisi + threat model özeti.
