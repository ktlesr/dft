import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * `Ali ERTÜRK` → `ali.erturk`  · `Şeyma YILMAZ KUŞÇUOĞLU` → `seyma.kuscuoglu`
 * · `Mehmet Can ÇAKAR` → `mehmet.cakar`
 *
 * Kurallar:
 *  - Türkçe karakterler ASCII karşılıklarına döner (ş→s, ı→i, ç→c, …)
 *  - Tüm harfler küçültülür
 *  - Birden çok ardışık ad arasında ilk + son kelime alınır
 *  - `[a-z0-9]` dışındaki her karakter atılır; iki bölüm `.` ile birleştirilir
 *  - 50 karakterle sınırlandırılır
 */
export function slugifyName(rawName: string): string {
  const translit: Record<string, string> = {
    ş: "s",
    Ş: "s",
    ı: "i",
    I: "i",
    İ: "i",
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ö: "o",
    Ö: "o",
    ü: "u",
    Ü: "u",
  };
  // Karakter dönüşümü + lowercase
  const ascii = rawName
    .split("")
    .map((ch) => translit[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // birleşik aksanları kaldır
    .toLowerCase();

  const cleaned = ascii.replace(/[^a-z0-9\s]+/g, " ").trim();
  if (!cleaned) return "";

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0]!.slice(0, 50);

  const first = words[0]!;
  const last = words[words.length - 1]!;
  return `${first}.${last}`.slice(0, 50);
}

/**
 * Çakışmasız `ad.soyad` benzeri kullanıcı adı döndürür. Aynı slug varsa
 * `.2`, `.3` … eklenir. Toplu içe aktarmada ardışık çağrılar arasında da
 * çakışmayı önlemek için `reserved` set'i kullanılabilir.
 */
export async function generateUniqueUsername(
  rawName: string,
  opts: { reserved?: Set<string> } = {},
): Promise<string | null> {
  const base = slugifyName(rawName);
  if (!base) return null;

  const reserved = opts.reserved ?? new Set<string>();

  let candidate = base;
  let n = 1;
  // 50 deneme yeterli — aynı ad/soyad çiftine 50'den fazla kişi pek olası değil.
  while (n < 50) {
    if (!reserved.has(candidate)) {
      const exists = await prisma.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      });
      if (!exists) {
        reserved.add(candidate);
        return candidate;
      }
    }
    n += 1;
    candidate = `${base}.${n}`;
  }
  return null;
}
