/**
 * Browser/OS bazı dosyalar için MIME türünü tutarsız bildiriyor:
 *
 *   - Windows Chrome → `.rar` için **boş string** (WinRAR kurulu değilse
 *     registry'de Content Type yok),
 *   - Windows Chrome → `.zip` için legacy `application/x-zip-compressed`
 *     (registry'den geliyor; IANA standardı `application/zip` değil),
 *   - Linux/macOS → genellikle doğru IANA MIME'larını verir,
 *   - Drag-drop ile gelen bazı dosyalar `application/octet-stream`.
 *
 * Allow-list'i hepsini ayrı ayrı taşımak yerine: declared MIME boşsa veya
 * generic octet-stream'se, **uzantıdan kanonik MIME türetiyoruz**. Sadece
 * arşiv uzantılarını kapsıyor çünkü diğer formatların (.pdf, .docx, vs.)
 * tarayıcı raporları genelde sağlam. Genişletmek arzı bypass kapısı açar.
 *
 * Güvenlik notu: bu fonksiyon sadece allow-list eşleşmesi için MIME üretir;
 * **magic-byte doğrulaması (file-type kütüphanesi) yine asıl byte'lara
 * bakar**, uzantı yalanı uploadı geçirmez.
 */
const EXT_TO_MIME: Record<string, string> = {
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
};

export function coerceUploadMime(file: { name: string; type: string }): string {
  const declared = (file.type || "").toLowerCase();
  const dot = file.name.lastIndexOf(".");
  if (dot < 0) return declared || "";
  const ext = file.name.slice(dot + 1).toLowerCase();
  const canonical = EXT_TO_MIME[ext];

  // Browsers/OSes can emit non-standard archive MIME strings
  // (e.g. `application/x-compressed`, `application/rar`) or generic
  // octet-stream. For known archive extensions, force canonical MIME.
  if (!declared || declared === "application/octet-stream") {
    return canonical ?? declared;
  }
  if (canonical && (declared === "application/x-compressed" || declared === "application/rar")) {
    return canonical;
  }
  if (
    canonical &&
    declared.startsWith("application/x-") &&
    (declared.includes("rar") || declared.includes("zip") || declared.includes("7z"))
  ) {
    return canonical;
  }

  return declared;
}
