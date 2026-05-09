# DFT Portal — Statik Güvenlik İncelemesi

**Tarih:** 2026-05-09
**Kapsam:** `app/`, `features/`, `lib/`, `prisma/`, `proxy.ts`, `next.config.ts`
**Yöntem:** Tüm güvenlik açısından kritik dosyalar tek tek okundu; auth, RBAC, dosya yükleme/indirme, tüm `"use server"` action'lar, tüm API route'ları, render katmanı, schema doğrulamaları ve middleware/CSP zinciri çapraz kontrol edildi.

## Özet

**HIGH / MEDIUM bulgu yok.** Bu, kapsam içindeki sayım. Aşağıda hem korumaların doğrulandığı yerleri (yeşil ışıklar), hem de hardening önerisi düzeyindeki LOW notları listeliyorum.

---

## Doğrulanan korumalar (yeşil ışıklar)

| Alan | Durum | Konum |
|------|-------|-------|
| Şifreleme | Argon2id, OWASP "second" profili (`memoryCost=19_456`, `timeCost=2`) | [lib/password.ts:7-11](lib/password.ts#L7-L11) |
| Hesap kilitleme | 8 yanlış denemede 15 dk kilit | [lib/auth.ts:49-51](lib/auth.ts#L49-L51), [lib/auth.ts:108-121](lib/auth.ts#L108-L121) |
| Token güvenliği | `randomBytes(32)` + SHA-256 hash + `safeEqual` (constant-time) | [lib/tokens.ts:7-25](lib/tokens.ts#L7-L25) |
| Şifre sıfırlama | Hash-on-DB; tek kullanım; 60 dk geçerlilik; aynı email için diğer aktif token'lar invalide | [features/auth/actions.ts:135-159](features/auth/actions.ts#L135-L159) |
| User enumeration | "Forgot" her zaman OK döndürüyor; login generic mesaj | [features/auth/actions.ts:114-118](features/auth/actions.ts#L114-L118) |
| Session cookie | `httpOnly`, `sameSite=lax`, prod'da `__Secure-` prefix + `secure` | [lib/auth.ts:68-81](lib/auth.ts#L68-L81) |
| CSP | Per-request nonce + `strict-dynamic`, `unsafe-inline` script'te yok, `frame-ancestors 'none'`, `object-src 'none'` | [proxy.ts:66-92](proxy.ts#L66-L92) |
| Güvenlik header'ları | XFO=DENY, nosniff, Referrer-Policy, Permissions-Policy, prod'da HSTS | [proxy.ts:94-101,134-136](proxy.ts#L94-L101) |
| Path traversal | Storage anahtarı ROOT'a normalize edilip prefix kontrol | [lib/storage/local-disk.ts:74-81](lib/storage/local-disk.ts#L74-L81) |
| Dosya isimleri | Yüklenirken `sha256(content)+rand` ile yeniden adlandırılıyor — kullanıcı adı asla disk'e yazılmıyor | [lib/storage/local-disk.ts:25-45](lib/storage/local-disk.ts#L25-L45) |
| MIME spoofing | Allow-list + `file-type` magic-byte sniff ("PHP gizli PNG" senaryosu reddediliyor) | [lib/upload.ts:65-91,126-135](lib/upload.ts#L65-L91) |
| SQL injection | Tüm sorgular Prisma ORM; `$queryRawUnsafe`/`$executeRawUnsafe` sadece [docker-entrypoint.sh](docker-entrypoint.sh) içinde, sabit string'ler, kullanıcı girdisi yok |
| XSS — body | `dangerouslySetInnerHTML` kod tabanında **0** kullanım; tüm metin alanları (`body`, `assessment`, `summary`, vb.) JSX expression ile React tarafından otomatik escape | [features/board/post-card.tsx:75-83](features/board/post-card.tsx#L75-L83) |
| XSS — `<a href>` | Tüm `externalUrl`/`onlineUrl` schema'ları `^https?://...` regex zorunlu kılıyor; `javascript:` ve `data:` reddediliyor | [features/board/schemas.ts:14-24](features/board/schemas.ts#L14-L24), [features/meeting/schemas.ts:11-21](features/meeting/schemas.ts#L11-L21), [features/records/schemas.ts:119-130](features/records/schemas.ts#L119-L130) |
| `target=_blank` | Tüm dış bağlantılarda `rel="noopener noreferrer"` (tabnabbing kapalı) | [features/board/post-card.tsx:87-97](features/board/post-card.tsx#L87-L97), [app/(portal)/toplanti/[id]/page.tsx:103-107](<app/(portal)/toplanti/[id]/page.tsx#L103-L107>) |
| IDOR — attachment | `/api/dosya/[id]` admin/uploader/grup/genel ayrımıyla satır-satır authz; soft-delete kontrolü dahil | [app/api/dosya/[id]/route.ts:55-111](<app/api/dosya/[id]/route.ts#L55-L111>) |
| IDOR — kayıt sil | `mustOwnOr403` her record türünde owner check + redirect("/yetkisiz") | [features/records/actions.ts:72-86](features/records/actions.ts#L72-L86) |
| IDOR — profil yükleme | Self veya ADMIN; `resolveUploadTarget` server tarafında kontrol | [features/profile/actions.ts:196-205](features/profile/actions.ts#L196-L205) |
| CV gizliliği | Sadece sahibi veya ADMIN indirebiliyor (avatar'dan ayrılmış) | [app/api/profil/cv/[userId]/route.ts:24-28](<app/api/profil/cv/[userId]/route.ts#L24-L28>) |
| RBAC sınır | `requireActiveUser` her server action'ın başında; PENDING/SUSPENDED otomatik kapı dışı | [lib/current-user.ts:61-72](lib/current-user.ts#L61-L72) |
| Defense-in-depth | Edge proxy session-cookie kontrolü + portal layout'da `requireActiveUser()` çift kapı | [proxy.ts:103-117](proxy.ts#L103-L117), [app/(portal)/layout.tsx:8-12](<app/(portal)/layout.tsx#L8-L12>) |
| Auth gating | Layout-level redirect; portal route'larının hiçbiri kendi başına auth kontrolü yapmak zorunda değil |
| Bulk import — admin | `requireAdmin()`, magic-byte sniff, 5 MB / 1000 satır cap, all-or-nothing | [features/board/bulk-import.ts:184-213](features/board/bulk-import.ts#L184-L213) |
| Robotlar | `X-Robots-Tag: noindex,nofollow,noarchive,nosnippet` (kapalı portal) | [proxy.ts:100](proxy.ts#L100) |
| Son admin | `removeRole` ADMIN azalmasına izin vermiyor (count<=1 silently noop) | [features/admin/user-actions.ts:255-261](features/admin/user-actions.ts#L255-L261) |

---

## LOW — hardening notları (vuln değil, fırsat)

Bunlar `>80% confidence exploitable` eşiğinin altında — security review prompt'u bunları rapor dışı bırakıyor. Yine de iyileştirme listesi olarak burada bırakıyorum:

1. **`features/profile/actions.ts:259,337,366`** — `audit({...})` çağrılarında `actorId` set edilmemiş. Audit logda kim yaptığı boş kalıyor (current.id mevcut, kolayca eklenebilir). *Compliance/forensics, vuln değil.*

2. **`features/notifications/actions.ts:9`** — `markAllRead` `requireUser()` kullanıyor (`requireActiveUser` değil). PENDING/SUSPENDED kullanıcı kendi bildirimlerini okuyabilir. Veri sızıntısı yok (kendi bildirimleri); tutarlılık fırsatı.

3. **`features/board/schemas.ts`** — `externalUrl` için uzunluk sınırı yok. `bulk-import.ts:121` doğru şekilde `.max(2048)` koymuş, ancak ana board oluşturma endpoint'inde aynı sınır yok. *DoS kategorisinde olduğundan exclusions altında.*

4. **`lib/auth.ts:103-105`** — Kilit süresi (15 dk) sona erdiğinde `failedLoginCount` sıfırlanmıyor; sayaç hala eşikteyse tek hatalı denemede tekrar kilitleniyor. *DoS kategorisinde, kullanıcı self-DoS, exclusions altında.*

5. **`features/auth/actions.ts:71-78`** — `loginAction` parsedData.email'i audit metadata'ya yazıyor. Login hatasında bile yazılıyor, ancak tipik PII (email) ve login akışı için beklenen davranış. *Log spoofing exclusions altında.*

6. **`/api/profil/foto/[userId]`** — Aktif tüm üyeler birbirinin avatarına erişebiliyor. Yorum "intentionally" diyor (board card'larda görünmesi gerekiyor). Veri minimizasyonu açısından tipik beklenen davranış; CV ayrı endpoint'te zaten korunmuş.

---

## Sonuç

Kod tabanı güvenlik anlamında olgun. Auth, RBAC, dosya akışı, render ve middleware katmanlarında tutarlı bir defense-in-depth uygulanmış. Bu pas'ta gerçek anlamda exploit edilebilir bir HIGH/MEDIUM bulgu çıkmadı.

**Sonraki adımlar:**
- Adım 2: Sanitization/validation birim testleri (Zod negative tests, MIME spoof, polyglot, oversized input).
- Adım 3: Playwright E2E pentest senaryoları (auth bypass, IDOR, privilege escalation, brute force).
